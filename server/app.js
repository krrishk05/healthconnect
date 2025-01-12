const express = require('express');
const http = require('http');
const initializeSocket = require('./socket');
const messagesRouter = require('./routes/messages');
const appointmentsRouter = require('./routes/appointments');
// ... other imports

const app = express();
const server = http.createServer(app);
const io = initializeSocket(server);

// ... rest of your express setup ...

app.use('/api/messages', messagesRouter);
app.use('/api/appointments', appointmentsRouter);

// Export both app and server
module.exports = { app, server }; 