const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const cohere = require('../config/cohere');

// Medical Assistant chat route (no appointment needed)
router.post('/assistant', auth, async (req, res) => {
    try {
        const { message, chatHistory = [] } = req.body;

        // Verify user is a patient
        if (req.user.role !== 'patient') {
            return res.status(403).json({ message: 'Only patients can use the medical assistant' });
        }

        console.log(`Processing medical assistant chat for patient: ${req.user.name}`);

        // Convert chat history to Cohere format
        const conversationHistory = chatHistory.map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        const response = await cohere.chat({
            message: message,
            model: 'command',  // Using a more capable model
            temperature: 0.3,  // Lower temperature for more focused responses
            connectors: [{ id: "web-search" }], // Enable web search for up-to-date info
            messages: [
                {
                    role: 'system',
                    content: `You are a knowledgeable and professional medical assistant AI. Your role is to:
                    - Provide accurate, evidence-based medical information
                    - Always maintain a professional and empathetic tone
                    - Include relevant medical disclaimers when appropriate
                    - Encourage users to seek professional medical help when needed
                    - Avoid making specific diagnoses or treatment recommendations
                    - Focus on general health education and guidance
                    - Be clear and concise in your responses
                    - Use simple language that patients can understand
                    
                    Current patient name: ${req.user.name}
                    Current time: ${new Date().toLocaleString()}`
                },
                ...conversationHistory,
                {
                    role: 'user',
                    content: message
                }
            ],
            preamble: `You are a medical assistant chatbot helping patient ${req.user.name}. Always maintain a professional tone and include appropriate medical disclaimers. Remember that your role is to provide general health information, not to diagnose or prescribe treatments.`
        });

        res.json({
            content: response.text || 'I apologize, but I am unable to provide a response at the moment. Please try again or consult with a healthcare professional.'
        });
    } catch (error) {
        console.error('Error in medical assistant chat:', error.message);
        res.status(500).json({ message: 'Error processing chat request with AI service' });
    }
});

// Appointment-specific chat route
router.post('/:appointmentId', auth, async (req, res) => {
    try {
        const { message, chatHistory = [] } = req.body;
        const { appointmentId } = req.params;

        const appointment = await Appointment.findById(appointmentId)
            .populate('doctor', 'name specialization')
            .populate('patient', 'name');

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Check if user is authorized
        if (appointment.patient._id.toString() !== req.user.id &&
            appointment.doctor._id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Check if appointment is scheduled
        if (appointment.status !== 'scheduled') {
            return res.status(400).json({ message: 'Can only chat for scheduled appointments' });
        }

        // Convert chat history to Cohere format
        const conversationHistory = chatHistory.map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        const response = await cohere.chat({
            message: message,
            model: 'command',  // Using a more capable model
            temperature: 0.3,  // Lower temperature for more focused responses
            messages: [
                {
                    role: 'system',
                    content: `You are assisting with a medical appointment between Dr. ${appointment.doctor.name} (${appointment.doctor.specialization}) and patient ${appointment.patient.name}. 
                    
                    Appointment Details:
                    - Date: ${appointment.date}
                    - Time: ${appointment.startTime} - ${appointment.endTime}
                    - Status: ${appointment.status}
                    
                    Your role is to:
                    - Help with appointment-related questions
                    - Provide relevant medical information
                    - Maintain a professional and helpful tone
                    - Include appropriate medical disclaimers
                    - Direct specific medical questions to the doctor
                    - Focus on appointment logistics and general information`
                },
                ...conversationHistory,
                {
                    role: 'user',
                    content: message
                }
            ],
            preamble: `You are a medical assistant chatbot helping with an appointment between Dr. ${appointment.doctor.name} and patient ${appointment.patient.name}. Focus on appointment-related information and general medical guidance. Direct specific medical questions to the doctor.`
        });

        res.json({
            content: response.text || 'I apologize, but I am unable to provide a response at the moment. Please try again or consult with your doctor.'
        });
    } catch (error) {
        console.error('Error in appointment chat:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 