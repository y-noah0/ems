const jwt = require('jsonwebtoken');
const { check } = require('express-validator');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const winston = require('winston');
const User = require('../models/User');

// Set up logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.File({ filename: 'auth.log' })]
});

// Middleware to authenticate user
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      logger.warn('No token provided', { ip: req.ip });
      return res.status(401).json({ success: false, message: 'No authentication token, access denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user || user.isDeleted) {
      logger.warn('User not found or deleted', { userId: decoded.id, ip: req.ip });
      return res.status(401).json({ success: false, message: 'Token is not valid' });
    }

    if (user.tokenVersion !== decoded.tokenVersion) {
      logger.warn('Invalid token version', { userId: decoded.id, ip: req.ip });
      return res.status(401).json({ success: false, message: 'Token is not valid' });
    }

    mongoSanitize.sanitize(req.body);
    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error', { error: error.message, ip: req.ip });
    return res.status(401).json({ success: false, message: 'Token is not valid' });
  }
};

// Generalized role-based middleware
const requireRoles = (roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied: Requires one of ${roles.join(', ')} roles`
    });
  }
  next();
};

// Specific roles
const isAdmin = requireRoles(['admin', 'headmaster']); // allow headmaster to manage users
const isDean = requireRoles(['dean', 'admin', 'headmaster']); // allow headmaster to access dean routes
const isTeacher = requireRoles(['teacher', 'dean', 'admin']);
const isStudent = requireRoles(['student']);
const isStudentOrTeacher = requireRoles(['student', 'teacher']);
const isTeacherOrDeanOrAdmin = requireRoles(['teacher', 'dean', 'admin']);

// Login validation
const loginValidation = [
  check('identifier').notEmpty().withMessage('Identifier is required'),
  check('password').notEmpty().withMessage('Password is required'),
  check('twoFactorCode').optional().isLength({ min: 6, max: 6 }).withMessage('2FA code must be 6 digits')
];

// Registration validation
const registerValidation = [
  check('fullName').notEmpty().withMessage('Full name is required'),
  check('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  check('role').isIn(['student', 'teacher', 'dean', 'admin', 'headmaster']).withMessage('Invalid role'),
  check('schoolId').isMongoId().withMessage('Invalid school ID'),
  check('email').optional().isEmail().withMessage('Invalid email'),
  check('registrationNumber').optional().notEmpty().withMessage('Registration number is required for students'),
  check('phoneNumber').optional().matches(/^\+?\d{10,15}$/).withMessage('Invalid phone number'),
  check('subjects').optional().isArray().withMessage('Subjects must be an array')
];

// Rate limiter middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later.'
});

// Export individual functions for direct imports
module.exports = {
  authenticate,
  requireRoles,
  isAdmin,
  isDean,
  isTeacher,
  isStudent,
  isStudentOrTeacher,
  isTeacherOrDeanOrAdmin,
  loginValidation,
  registerValidation,
  limiter
};
