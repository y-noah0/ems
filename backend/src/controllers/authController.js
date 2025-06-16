const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');

// Register new user
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, fullName, role, registrationNumber, classId } = req.body;

    console.log('Registration request:', {
      email,
      fullName,
      role,
      registrationNumber,
      classId
    });

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    user = new User({
      email,
      passwordHash: password, // Will be hashed in pre-save hook
      fullName,
      role: role || 'student'
    });

    if (registrationNumber) {
      user.registrationNumber = registrationNumber;
    }

    if (!role || role === 'student') {
      if (!classId) {
        return res.status(400).json({
          success: false,
          message: 'Class ID is required for student accounts'
        });
      }

      try {
        const Class = require('../models/Class');
        const classExists = await Class.findById(classId);
        if (!classExists) {
          return res.status(400).json({
            success: false,
            message: 'Invalid class ID: class not found'
          });
        }
        user.class = classId;
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: 'Invalid class ID format'
        });
      }
    }

    await user.save();

    const payload = {
      id: user.id,
      role: user.role
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '12h' },
      (err, token) => {
        if (err) throw err;
        res.status(201).json({
          success: true,
          token,
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            registrationNumber: user.registrationNumber
          }
        });
      }
    );
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Login user (by email or fullName)
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { identifier, password } = req.body; // identifier = email or fullName

    const user = await User.findOne({
      $or: [{ email: identifier }, { fullName: identifier }]
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const payload = {
      id: user.id,
      role: user.role
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '12h' },
      (err, token) => {
        if (err) throw err;
        res.json({
          success: true,
          token,
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            registrationNumber: user.registrationNumber
          }
        });
      }
    );
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-passwordHash')
      .populate('class', 'level trade year term');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.passwordHash = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Export all functions individually
module.exports = {
  register,
  login,
  getCurrentUser,
  changePassword
};
