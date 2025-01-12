const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');
const { isTimeSlotPassed } = require('../utils/dateUtils');

// Register route
router.post('/register', [
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
  check('name', 'Name is required').not().isEmpty(),
  check('role', 'Role must be either patient or doctor').isIn(['patient', 'doctor'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  try {
    const { email, password, name, role } = req.body;
    let user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    user = new User({
      email,
      password,
      name,
      role
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' }, (err, token) => {
      if (err) throw err;
      const userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      };
      res.json({ token, user: userData });
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login route
router.post('/login', [
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password is required').exists()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' }, (err, token) => {
      if (err) throw err;
      const userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      };
      res.json({ token, user: userData });
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

// Get authenticated user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

// Get all doctors
router.get('/doctors', auth, async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor' })
      .select('-password -availability')
      .lean();

    res.json(doctors);
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get specific doctor
router.get('/doctors/:id', auth, async (req, res) => {
  try {
    const doctor = await User.findById(req.params.id)
      .select('-password -availability')
      .lean();

    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.json(doctor);
  } catch (error) {
    console.error('Error fetching doctor:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add availability
router.post('/availability', auth, async (req, res) => {
  try {
    const { date, startTime, endTime, doctorId } = req.body;

    // Validate user is a doctor
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(400).json({ message: 'Invalid doctor ID' });
    }

    // Create new availability slot
    const newSlot = {
      date,
      startTime,
      endTime,
      isBooked: false,
      status: 'available'
    };

    // Add to availability array
    if (!doctor.availability) {
      doctor.availability = [];
    }
    doctor.availability.push(newSlot);
    await doctor.save();

    // Return filtered available slots
    const availableSlots = doctor.availability
      .filter(slot => !isTimeSlotPassed(slot.date, slot.endTime) && !slot.isBooked)
      .sort((a, b) => {
        const dateA = new Date(a.date + 'T' + a.startTime);
        const dateB = new Date(b.date + 'T' + b.startTime);
        return dateA - dateB;
      });

    res.json(availableSlots);
  } catch (error) {
    console.error('Error adding availability:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get doctor's availability
router.get('/availability/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params;
    
    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID is required' });
    }

    // Validate if doctorId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ message: 'Invalid doctor ID format' });
    }

    const doctor = await User.findById(doctorId);
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    if (doctor.role !== 'doctor') {
      return res.status(400).json({ message: 'User is not a doctor' });
    }

    // Filter out expired slots and booked slots
    const availableSlots = [];

    if (!doctor.availability) {
      doctor.availability = [];
    }

    doctor.availability.forEach(slot => {
      // Only include slots that:
      // 1. Haven't passed
      // 2. Aren't booked
      // 3. Aren't cancelled
      if (!isTimeSlotPassed(slot.date, slot.endTime) && 
          !slot.isBooked && 
          slot.status !== 'cancelled_by_patient') {
        availableSlots.push({
          _id: slot._id,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          doctorId: doctor._id
        });
      }
    });

    // Sort slots by date and time
    availableSlots.sort((a, b) => {
      const dateA = new Date(a.date + 'T' + a.startTime);
      const dateB = new Date(b.date + 'T' + b.startTime);
      return dateA - dateB;
    });

    res.json(availableSlots);
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Delete availability
router.delete('/availability/:availabilityId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'doctor') {
      return res.status(403).json({ message: 'Only doctors can delete availability' });
    }

    user.availability = user.availability.filter(
      a => a._id.toString() !== req.params.availabilityId
    );

    await user.save();
    res.json(user.availability);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 