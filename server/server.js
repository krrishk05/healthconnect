require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const chatRoutes = require('./routes/chat');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const messageRoutes = require('./routes/messages');
const Message = require('./models/Message');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Socket.io middleware for authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded.user;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// Socket.io connection handling
const activeUsers = new Map(); // Track active users

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_chat', async ({ appointmentId, userId }) => {
    if (socket.user.id !== userId) {
      socket.emit('error', { message: 'Unauthorized user' });
      return;
    }
    console.log(`User ${userId} joining chat for appointment ${appointmentId}`);
    socket.join(`appointment_${appointmentId}`);
    activeUsers.set(socket.id, { appointmentId, userId });
    
    // Notify room about user joining
    io.to(`appointment_${appointmentId}`).emit('user_joined', { userId });
  });

  socket.on('send_message', async (data) => {
    try {
      const { appointmentId, content, senderId } = data;
      console.log('Received message:', data);
      
      // Save message to database
      const message = new Message({
        appointmentId,
        sender: senderId,
        content,
        timestamp: new Date()
      });
      await message.save();
      
      // Broadcast message to the room with consistent format
      const messageToSend = {
        _id: message._id,
        content: message.content,
        timestamp: message.timestamp,
        sender: senderId,
        senderId: senderId
      };
      
      console.log('Broadcasting to room:', `appointment_${appointmentId}`);
      console.log('Message data:', messageToSend);
      
      // Emit to all clients in the room including sender
      io.to(`appointment_${appointmentId}`).emit('receive_message', messageToSend);
    } catch (error) {
      console.error('Error handling message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('disconnect', () => {
    const userData = activeUsers.get(socket.id);
    if (userData) {
      io.to(`appointment_${userData.appointmentId}`).emit('user_left', { 
        userId: userData.userId 
      });
      activeUsers.delete(socket.id);
    }
    console.log('User disconnected:', socket.id);
  });
});

app.use(cors({
    origin: 'http://localhost:5173', // Vite dev server
    credentials: true
}));

app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/messages', messageRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 