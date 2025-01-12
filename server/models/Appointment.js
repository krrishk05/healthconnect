const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
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
    status: {
        type: String,
        enum: ['scheduled', 'completed', 'cancelled_by_doctor', 'cancelled_by_patient', 'no_show'],
        default: 'scheduled'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Appointment', appointmentSchema); 