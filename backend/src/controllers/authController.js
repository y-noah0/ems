const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const winston = require('winston');

// Logger configuration
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Register new user
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in register', { errors: errors.array() });
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, fullName, role, registrationNumber, classId } = req.body;

    logger.info('Registration request', {
      email,
      fullName,
      role,
      registrationNumber,
      classId
    });

    let user = await User.findOne({ email });
    if (user) {
      logger.warn('User already exists in register', { email });
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
        logger.warn('Class ID missing for student registration', { email });
        return res.status(400).json({
          success: false,
          message: 'Class ID is required for student accounts'
        });
      }

      try {
        const Class = require('../models/Class');
        const classExists = await Class.findById(classId);
        if (!classExists) {
          logger.warn('Invalid class ID: class not found', { classId });
          return res.status(400).json({
            success: false,
            message: 'Invalid class ID: class not found'
          });
        }
        user.class = classId;
      } catch (err) {
        logger.warn('Invalid class ID format', { classId });
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
        if (err) {
          logger.error('JWT sign error in register', { error: err.message });
          throw err;
        }
        logger.info('User registered successfully', { userId: user.id, email: user.email });
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
    logger.error('Error in register', { error: error.message, stack: error.stack });
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
      logger.warn('Validation errors in login', { errors: errors.array() });
      return res.status(400).json({ errors: errors.array() });
    }

    const { identifier, password } = req.body; // identifier = email or fullName

    logger.info('Login attempt', { identifier });

    const user = await User.findOne({
      $or: [{ email: identifier }, { fullName: identifier }]
    });

    if (!user) {
      logger.warn('Login failed: user not found', { identifier });
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    logger.info('User found for login', { userId: user.id, identifier });

    // Make sure password comparison is correct
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.warn('Login failed: password mismatch', { identifier, userId: user.id });
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    logger.info('Password match for login', { userId: user.id });

    const payload = {
      id: user.id,
      role: user.role
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '12h' },
      (err, token) => {
        if (err) {
          logger.error('JWT sign error in login', { error: err.message });
          throw err;
        }
        logger.info('User logged in successfully', { userId: user.id, email: user.email });
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
    logger.error('Error in login', { error: error.message, stack: error.stack });
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
      logger.warn('User not found in getCurrentUser', { userId: req.user.id });
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    logger.info('Fetched current user', { userId: user.id });
    res.json({
      success: true,
      user
    });
  } catch (error) {
    logger.error('Error in getCurrentUser', { error: error.message, stack: error.stack });
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
      logger.warn('Validation errors in changePassword', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      logger.warn('Current password incorrect in changePassword', { userId: req.user.id });
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.passwordHash = newPassword;
    await user.save();

    logger.info('Password updated successfully', { userId: req.user.id });
    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    logger.error('Error in changePassword', { error: error.message, stack: error.stack, userId: req.user.id });
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
