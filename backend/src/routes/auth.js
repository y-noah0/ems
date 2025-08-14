const express = require('express');
const { check } = require('express-validator');
const router = express.Router();
const upload = require('../middlewares/upload');

const {
  register,
  verifyEmail,
  login,
  logout,
  refreshToken,
  requestPasswordReset,
  resetPassword,
  enable2FA,
  updateProfile,
  resendVerificationCode,
  fetchHeadmasterByEmail
} = require('../controllers/authController');

// Middleware for validation
const registerValidation = [
  check('fullName', 'Full name is required').notEmpty().trim(),
  check('role', 'Invalid role').optional().isIn(['student', 'teacher', 'dean', 'admin', 'headmaster']),
  // Email validation
  check('email', 'Email is required for this role')
    .if((value, { req }) => ['teacher', 'dean', 'admin', 'headmaster'].includes(req.body.role))
    .notEmpty()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  check('email')
    .if((value, { req }) => req.body.role === 'student')
    .optional()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  // Password for admin
  check('password', 'Password is required for admin role')
    .if((value, { req }) => req.body.role === 'admin')
    .notEmpty()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters for admin role'),
  // School ID validation
  check('schoolId', 'School ID is required for this role')
    .if((value, { req }) => ['student', 'teacher', 'dean'].includes(req.body.role))
    .notEmpty()
    .isMongoId()
    .withMessage('Invalid school ID'),
  check('schoolId')
    .if((value, { req }) => ['admin', 'headmaster'].includes(req.body.role))
    .optional()
    .isMongoId()
    .withMessage('Invalid school ID'),
  // Student-specific fields
  check('classId', 'Class ID is required for students')
    .if((value, { req }) => req.body.role === 'student')
    .notEmpty()
    .isMongoId()
    .withMessage('Invalid class ID'),
  check('termId', 'Term ID is required for students')
    .if((value, { req }) => req.body.role === 'student')
    .notEmpty()
    .isMongoId()
    .withMessage('Invalid term ID'),
  // Phone number validation
  check('phoneNumber', 'Invalid phone number')
    .optional()
    .matches(/^\+?\d{10,15}$/)
    .withMessage('Invalid phone number'),
  // Parent fields validation
  check('parentFullName', 'Parent-related fields are only allowed for students')
    .if((value, { req }) => req.body.role !== 'student' && value != null)
    .isEmpty(),
  check('parentFullName', 'Parent full name must not be empty if provided')
    .if((value, { req }) => req.body.role === 'student' && value != null)
    .notEmpty()
    .trim(),
  check('parentNationalId', 'Parent-related fields are only allowed for students')
    .if((value, { req }) => req.body.role !== 'student' && value != null)
    .isEmpty(),
  check('parentNationalId', 'Parent national ID must not be empty if provided')
    .if((value, { req }) => req.body.role === 'student' && value != null)
    .notEmpty()
    .trim(),
  check('parentPhoneNumber', 'Parent-related fields are only allowed for students')
    .if((value, { req }) => req.body.role !== 'student' && value != null)
    .isEmpty(),
  check('parentPhoneNumber', 'Invalid parent phone number')
    .if((value, { req }) => req.body.role === 'student' && value != null)
    .matches(/^\+?\d{10,15}$/)
    .withMessage('Invalid parent phone number'),
  // Profile picture validation
  check('profilePicture', 'Invalid profile picture URL')
    .optional()
    .custom((value, { req }) => {
      if (value === null || value === undefined) return true;
      if (req.file) return true; // Allow file uploads
      return /^https?:\/\/.*\.(png|jpg|jpeg|svg|gif)$/i.test(value) ||
        /^\/Uploads\/.*\.(png|jpg|jpeg|svg|gif)$/i.test(value);
    })
    .withMessage('Invalid profile picture URL')
];

const loginValidation = [
  check('identifier', 'Identifier is required').notEmpty(),
  check('password', 'Password is required').exists(),
  check('twoFactorCode', '2FA code must be a 6-digit number').optional().isNumeric().isLength({ min: 6, max: 6 })
];

const { authenticate } = require('../middlewares/authMiddleware');

// @route   POST /auth/register
// @desc    Register user
// @access  Public
router.post('/register', upload.single('profilePicture'), registerValidation, register);

// @route   POST /auth/verify-email
// @desc    Verify email
// @access  Public
router.post('/verify-email', [
  check('email', 'Email is required').notEmpty().isEmail().normalizeEmail(),
  check('token', 'Verification code is required').notEmpty().isNumeric().isLength({ min: 6, max: 6 })
], verifyEmail);

// @route   POST /auth/resend-verification
// @desc    Resend verification code
// @access  Public
router.post('/resend-verification', [
  check('email', 'Please include a valid email').isEmail().normalizeEmail()
], resendVerificationCode);

// @route   POST /auth/fetch-headmaster
// @desc    Fetch headmaster by email
// @access  Private
router.post('/fetch-headmaster', authenticate, [
  check('email', 'Please include a valid email').isEmail().normalizeEmail()
], fetchHeadmasterByEmail);

// @route   POST /auth/login
// @desc    Log in user
// @access  Public
router.post('/login', loginValidation, login);

// @route   POST /auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', authenticate, logout);

// @route   POST /auth/refresh-token
// @desc    Refresh token
// @access  Public
router.post('/refresh-token', refreshToken);

// @route   POST /auth/request-password-reset
// @desc    Request password reset
// @access  Public
router.post('/request-password-reset', [
  check('email', 'Please include a valid email').isEmail().normalizeEmail()
], requestPasswordReset);

// @route   POST /auth/reset-password
// @desc    Reset password
// @access  Public
router.post('/reset-password', [
  check('token', 'Reset token is required').notEmpty(),
  check('newPassword', 'New password should be at least 6 characters').isLength({ min: 6 })
], resetPassword);

// @route   POST /auth/enable-2fa
// @desc    Enable 2FA for user
// @access  Private
router.post('/enable-2fa', authenticate, enable2FA);

// @route   PUT /auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticate, upload.single('profilePicture'), [
  check('email').optional().isEmail().withMessage('Invalid email').normalizeEmail(),
  check('phoneNumber').optional().matches(/^\+?\d{10,15}$/).withMessage('Invalid phone number'),
  check('preferences.notifications.email').optional().isBoolean(),
  check('preferences.notifications.sms').optional().isBoolean(),
  check('preferences.theme').optional().isIn(['light', 'dark']).withMessage('Invalid theme')
], updateProfile);

module.exports = router;