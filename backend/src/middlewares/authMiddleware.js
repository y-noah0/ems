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
const isAdmin = requireRoles(['admin']);
const isDean = requireRoles(['dean', 'admin', 'headmaster']);
const isTeacher = requireRoles(['teacher', 'admin']);
const isStudent = requireRoles(['student', 'admin']);
const isStudentOrTeacher = requireRoles(['student', 'teacher', 'admin']);
const isTeacherOrDeanOrAdmin = requireRoles(['teacher', 'dean', 'admin', 'headmaster']);
const isTeacherOrDeanOrHeadmaster = requireRoles(['teacher', 'dean', 'headmaster', 'admin']);

// Login validation
const loginValidation = [
  check('identifier').notEmpty().withMessage('Identifier is required'),
  check('password').notEmpty().withMessage('Password is required'),
  check('twoFactorCode').optional().isLength({ min: 6, max: 6 }).withMessage('2FA code must be 6 digits')
];

// Registration validation
const registerValidation = [
  check('fullName').notEmpty().withMessage('Full name is required').trim(),
  check('role').notEmpty().isIn(['student', 'teacher', 'dean', 'admin', 'headmaster']).withMessage('Invalid role'),
  check('email')
    .if((value, { req }) => req.body.role === 'admin')
    .isEmail().withMessage('Invalid email')
    .notEmpty().withMessage('Email is required for admin role')
    .normalizeEmail(),
  check('email')
    .if((value, { req }) => req.body.role !== 'admin' && value)
    .optional()
    .isEmail().withMessage('Invalid email')
    .normalizeEmail(),
  check('password')
    .if((value, { req }) => req.body.role === 'admin')
    .notEmpty().withMessage('Password is required for admin role')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters for admin role'),
  check('schoolId')
    .if((value, { req }) => ['student', 'teacher', 'dean', 'headmaster'].includes(req.body.role))
    .notEmpty().withMessage('School ID is required for student, teacher, dean, or headmaster')
    .isMongoId().withMessage('Invalid school ID'),
  check('registrationNumber')
    .if((value, { req }) => req.body.role === 'student')
    .notEmpty().withMessage('Registration number is required for students'),
  check('classId')
    .if((value, { req }) => req.body.role === 'student')
    .notEmpty().withMessage('Class ID is required for students')
    .isMongoId().withMessage('Invalid class ID'),
  check('termId')
    .if((value, { req }) => req.body.role === 'student')
    .notEmpty().withMessage('Term ID is required for students')
    .isMongoId().withMessage('Invalid term ID'),
  check('phoneNumber')
    .optional()
    .matches(/^\+?\d{10,15}$/)
    .withMessage('Invalid phone number'),
  check('parentFullName')
    .if((value, { req }) => req.body.role === 'student' && value)
    .notEmpty().withMessage('Parent full name must not be empty if provided'),
  check('parentNationalId')
    .if((value, { req }) => req.body.role === 'student' && value)
    .notEmpty().withMessage('Parent national ID must not be empty if provided'),
  check('parentPhoneNumber')
    .if((value, { req }) => req.body.role === 'student' && value)
    .optional()
    .matches(/^\+?\d{10,15}$/)
    .withMessage('Invalid parent phone number'),
  check('profilePicture')
    .optional()
    .matches(/^https?:\/\/.*\.(?:png|jpg|jpeg|svg|gif)$/i)
    .withMessage('Invalid image URL')
];

// Rate limiter middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later.'
});

module.exports = {
  authenticate,
  requireRoles,
  isAdmin,
  isDean,
  isTeacher,
  isStudent,
  isStudentOrTeacher,
  isTeacherOrDeanOrAdmin,
  isTeacherOrDeanOrHeadmaster,
  loginValidation,
  registerValidation,
  limiter
};