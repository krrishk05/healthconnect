const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../middleware/auth');

// Get messages for an appointment
router.get('/:appointmentId', auth, async (req, res) => {
    try {
        const messages = await Message.find({ 
            appointmentId: req.params.appointmentId 
        })
        .populate('sender', '_id')
        .sort({ timestamp: 1 });

        const formattedMessages = messages.map(message => ({
            _id: message._id,
            content: message.content,
            timestamp: message.timestamp,
            sender: message.sender._id,
            senderId: message.sender._id
        }));

        res.json(formattedMessages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 