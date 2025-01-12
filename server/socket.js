const socketIO = require('socket.io');
const Message = require('./models/Message');
const jwt = require('jsonwebtoken');

function initializeSocket(server) {
    const io = socketIO(server, {
        cors: {
            origin: process.env.CLIENT_URL || "http://localhost:5173",
            methods: ["GET", "POST"],
            credentials: true
        },
        path: '/socket.io'
    });

    // Store active users
    const activeUsers = new Map();

    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error'));
        }
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return next(new Error('Authentication error'));
            }
            socket.user = decoded;
            next();
        });
    });

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        // User joins a chat room
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

        // Handle new messages
        socket.on('send_message', async (data) => {
            try {
                const { appointmentId, content, senderId } = data;
                console.log('Received message:', data);
                
                // Save message to database
                const message = new Message({
                    appointmentId,
                    sender: senderId,
                    content
                });
                await message.save();
                
                // Populate the sender information before broadcasting
                await message.populate('sender', 'name role');
                console.log('Broadcasting message:', message);

                // Broadcast message to ALL clients in the room with senderId
                io.to(`appointment_${appointmentId}`).emit('receive_message', {
                    _id: message._id,
                    senderId: message.sender._id.toString(),
                    senderName: message.sender.name,
                    senderRole: message.sender.role,
                    content: message.content,
                    timestamp: message.timestamp
                });
            } catch (error) {
                console.error('Error handling message:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // Handle typing status
        socket.on('typing', ({ appointmentId, userId }) => {
            socket.to(`appointment_${appointmentId}`).emit('user_typing', { userId });
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            const userData = activeUsers.get(socket.id);
            if (userData) {
                io.to(`appointment_${userData.appointmentId}`).emit('user_left', { userId: userData.userId });
                activeUsers.delete(socket.id);
            }
        });
    });

    return io;
}

module.exports = initializeSocket; 