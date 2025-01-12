const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema({
    date: {
        type: String,
        required: true
    },
    startTime: {
        type: String,
        required: true
    },
    endTime: {
        type: String,
        required: true
    },
    isBooked: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['available', 'booked', 'cancelled_by_patient', 'cancelled_by_doctor'],
        default: 'available'
    }
});

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['patient', 'doctor'],
        required: true
    },
    specialization: {
        type: String,
        required: false
    },
    availability: [availabilitySchema]
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema); 