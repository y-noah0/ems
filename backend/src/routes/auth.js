const express = require('express');
const { check } = require('express-validator');
const router = express.Router();

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
  check('password', 'Password is required and should be at least 6 characters'),
  check('email', 'Please include a valid email')
    .if((value, { req }) => req.body.role !== 'student')
    .isEmail()
    .normalizeEmail(),
  check('role', 'Invalid role').optional().isIn(['student', 'teacher', 'dean', 'admin', 'headmaster']),
  check('schoolId', 'School ID is required for student, teacher, or dean')
    .if((value, { req }) => ['student', 'teacher', 'dean'].includes(req.body.role))
    .notEmpty(),
  check('classId', 'Class ID is required for students')
    .if((value, { req }) => req.body.role === 'student')
    .notEmpty(),
  check('termId', 'Term ID is required for students')
    .if((value, { req }) => req.body.role === 'student')
    .notEmpty(),
  check('phoneNumber', 'Please enter a valid phone number')
    .optional()
    .matches(/^\+?\d{10,15}$/)
    .withMessage('Invalid phone number'),
  check('profilePicture', 'Please enter a valid image URL')
    .optional()
    .matches(/^https?:\/\/.*\.(?:png|jpg|jpeg|svg|gif)$/i)
    .withMessage('Invalid image URL'),
  check('subjects', 'Subjects are only allowed for teachers')
    .if((value, { req }) => req.body.role !== 'teacher')
    .isEmpty()
    .withMessage('Subjects are only allowed for teachers'),
  check('parentFullName', 'Parent full name must not be empty if provided')
    .if((value, { req }) => req.body.role === 'student' && value != null)
    .notEmpty(),
  check('parentNationalId', 'Parent national ID must not be empty if provided')
    .if((value, { req }) => req.body.role === 'student' && value != null)
    .notEmpty(),
  check('parentPhoneNumber', 'Please enter a valid parent phone number')
    .if((value, { req }) => req.body.role === 'student' && value != null)
    .matches(/^\+?\d{10,15}$/)
    .withMessage('Invalid parent phone number')
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
router.post('/register', registerValidation, register);

// @route   POST /auth/verify-email
// @desc    Verify email
// @access  Public
router.post('/verify-email', [
  check('userId', 'User ID is required').notEmpty(),
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
router.put('/profile', authenticate, [
  check('email').optional().isEmail().withMessage('Invalid email').normalizeEmail(),
  check('phoneNumber').optional().matches(/^\+?\d{10,15}$/).withMessage('Invalid phone number'),
  check('profilePicture').optional().matches(/^https?:\/\/.*\.(?:png|jpg|jpeg|svg|gif)$/i).withMessage('Invalid image URL'),
  check('preferences.notifications.email').optional().isBoolean(),
  check('preferences.notifications.sms').optional().isBoolean(),
  check('preferences.theme').optional().isIn(['light', 'dark']).withMessage('Invalid theme')
], updateProfile);

module.exports = router;