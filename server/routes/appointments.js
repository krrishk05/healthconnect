const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { isTimeSlotPassed } = require('../utils/dateUtils');

// Book an appointment
router.post('/', auth, async (req, res) => {
  try {
    const { doctorId, date, startTime, endTime } = req.body;
    const patientId = req.user.id;

    // Verify doctor exists
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Check if slot is available
    const availableSlot = doctor.availability.find(
      slot => 
        slot.date === date && 
        slot.startTime === startTime && 
        slot.endTime === endTime && 
        !slot.isBooked
    );

    if (!availableSlot) {
      return res.status(400).json({ message: 'Time slot is not available' });
    }

    // Create appointment
    const appointment = new Appointment({
      doctor: doctorId,
      patient: patientId,
      date,
      startTime,
      endTime,
      status: 'scheduled'
    });

    await appointment.save();

    // Update doctor's availability
    availableSlot.isBooked = true;
    await doctor.save();

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Error booking appointment:', error);
    res.status(500).json({ message: 'Error booking appointment' });
  }
});

// Get user's appointments
router.get('/', auth, async (req, res) => {
  try {
    let appointments;
    const query = { 
      status: { $ne: 'cancelled' } // Exclude cancelled appointments
    };

    if (req.user.role === 'patient') {
      query.patient = req.user.id;
      appointments = await Appointment.find(query)
        .populate('doctor', 'name email')
        .sort({ date: 1, startTime: 1 });
    } else {
      // For doctors, clean up expired availability first
      const doctor = await User.findById(req.user.id);
      if (doctor) {
        const expiredSlots = doctor.availability.filter(slot => 
          isTimeSlotPassed(slot.date, slot.endTime)
        ).map(slot => slot._id);

        if (expiredSlots.length > 0) {
          doctor.availability = doctor.availability.filter(
            slot => !expiredSlots.includes(slot._id)
          );
          await doctor.save();
        }
      }

      query.doctor = req.user.id;
      appointments = await Appointment.find(query)
        .populate('patient', 'name email')
        .sort({ date: 1, startTime: 1 });
    }

    res.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Optional: Add a new route to get all appointments including cancelled ones
router.get('/all', auth, async (req, res) => {
  try {
    let appointments;
    if (req.user.role === 'patient') {
      appointments = await Appointment.find({ patient: req.user.id })
        .populate('doctor', 'name email')
        .sort({ date: 1, startTime: 1 });
    } else {
      appointments = await Appointment.find({ doctor: req.user.id })
        .populate('patient', 'name email')
        .sort({ date: 1, startTime: 1 });
    }
    res.json(appointments);
  } catch (error) {
    console.error('Error fetching all appointments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel appointment
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user is authorized to cancel
    if (appointment.patient.toString() !== req.user.id && 
        appointment.doctor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Find doctor and update availability
    const doctor = await User.findById(appointment.doctor);
    const availability = doctor.availability.id(appointment.availabilityId);
    if (availability) {
      // If cancelled by patient, mark as cancelled instead of available
      if (req.user.id === appointment.patient.toString()) {
        availability.status = 'cancelled_by_patient';
      } else {
        // If cancelled by doctor, make it available again
        availability.isBooked = false;
      }
      await doctor.save();
    }

    appointment.status = 'cancelled';
    await appointment.save();

    res.json(appointment);
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single appointment
router.get('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('doctor', 'name email')
      .populate('patient', 'name email');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user is authorized to view this appointment
    if (appointment.patient._id.toString() !== req.user.id && 
        appointment.doctor._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view this appointment' });
    }

    res.json(appointment);
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update appointment status
router.patch('/:appointmentId/status', auth, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    // Validate status
    const validStatuses = ['scheduled', 'completed', 'cancelled_by_doctor', 'cancelled_by_patient', 'no_show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const appointment = await Appointment.findById(appointmentId)
      .populate('doctor')
      .populate('patient');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Verify user is authorized to update status
    const isDoctor = appointment.doctor._id.toString() === userId;
    const isPatient = appointment.patient._id.toString() === userId;

    if (!isDoctor && !isPatient) {
      return res.status(403).json({ message: 'Not authorized to update this appointment' });
    }

    // Validate status change permissions
    if (status.includes('cancelled_by_doctor') && !isDoctor) {
      return res.status(403).json({ message: 'Only doctors can cancel as doctor' });
    }

    if (status.includes('cancelled_by_patient') && !isPatient) {
      return res.status(403).json({ message: 'Only patients can cancel as patient' });
    }

    if (status === 'completed' && !isDoctor) {
      return res.status(403).json({ message: 'Only doctors can mark appointments as completed' });
    }

    if (status === 'no_show' && !isDoctor) {
      return res.status(403).json({ message: 'Only doctors can mark appointments as no-show' });
    }

    // Update appointment status
    appointment.status = status;
    await appointment.save();

    // If appointment is cancelled, update doctor's availability
    if (status.includes('cancelled')) {
      const doctor = await User.findById(appointment.doctor._id);
      const availabilitySlot = doctor.availability.find(slot => 
        slot.date === appointment.date && 
        slot.startTime === appointment.startTime &&
        slot.endTime === appointment.endTime
      );

      if (availabilitySlot) {
        availabilitySlot.isBooked = false;
        availabilitySlot.status = 'available';
        await doctor.save();
      }
    }

    res.json(appointment);
  } catch (error) {
    console.error('Error updating appointment status:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create appointment
router.post('/', auth, async (req, res) => {
  try {
    const { doctorId, date, startTime, endTime } = req.body;
    const patientId = req.user.id;

    // Create appointment with initial status
    const appointment = new Appointment({
      doctor: doctorId,
      patient: patientId,
      date,
      startTime,
      endTime,
      status: 'scheduled'
    });

    await appointment.save();

    // Update doctor's availability
    const doctor = await User.findById(doctorId);
    const availabilitySlot = doctor.availability.find(slot => 
      slot.date === date && 
      slot.startTime === startTime &&
      slot.endTime === endTime
    );

    if (availabilitySlot) {
      availabilitySlot.isBooked = true;
      availabilitySlot.status = 'booked';
      await doctor.save();
    }

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get appointment by ID
router.get('/:appointmentId', auth, async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const userId = req.user.id.toString();

        console.log(`User ${userId} requesting appointment ${appointmentId}`);

        // Find the appointment and populate doctor and patient details
        const appointment = await Appointment.findById(appointmentId)
            .populate('doctor', 'name specialization')
            .populate('patient', 'name');

        if (!appointment) {
            console.log(`Appointment ${appointmentId} not found`);
            return res.status(404).json({ message: 'Appointment not found' });
        }

        const patientId = appointment.patient._id.toString();
        const doctorId = appointment.doctor._id.toString();

        // Check if the requesting user is either the patient or the doctor
        if (userId !== patientId && userId !== doctorId) {
            console.log(`User ${userId} is not authorized for appointment ${appointmentId}`);
            return res.status(403).json({ message: 'Not authorized to view this appointment' });
        }

        res.json(appointment);
    } catch (error) {
        console.error(`Error fetching appointment ${req.params.appointmentId}:`, error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 