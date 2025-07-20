// const express = require('express');
// const router = express.Router();
// const { check } = require('express-validator');
// const authController = require('../controllers/authController');
// const authMiddleware = require('../middlewares/authMiddleware');

// // @route   POST api/auth/register
// // @desc    Register a user
// // @access  Public (for students) / Admin for others
// router.post(
//   '/register',
//   [
//     check('email', 'Please include a valid email').isEmail(),
//     check('password', 'Password is required and should be at least 6 characters').isLength({ min: 6 }),
//     check('fullName', 'Full name is required').notEmpty()
//   ],
//   authController.register
// );

// // @route   POST api/auth/login
// // @desc    Login user & get token
// // @access  Public
// router.post(
//   '/login',
//   [
//     check('identifier', 'Please include a valid identifier').isEmail(),
//     check('password', 'Password is required').exists()
//   ],
//   authController.login
// );

// // @route   GET api/auth/me
// // @desc    Get current user
// // @access  Private
// router.get('/me', authMiddleware.authenticate, authController.getCurrentUser);

// // @route   PUT api/auth/change-password
// // @desc    Change password
// // @access  Private
// router.put(
//   '/change-password',
//   [
//     authMiddleware.authenticate,
//     check('currentPassword', 'Current password is required').exists(),
//     check('newPassword', 'New password should be at least 6 characters').isLength({ min: 6 })
//   ],
//   authController.changePassword
// );

// module.exports = router;




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
  getCurrentUser
} = require('../controllers/authController');

const {
  authenticate,
  loginValidation,
  registerValidation
} = require('../middlewares/authMiddleware');

// @route   POST /auth/register
// @desc    Register user
// @access  Public
router.post('/register', registerValidation, register);

// @route   POST /auth/verify-email
// @desc    Verify email
// @access  Public
router.post('/verify-email', verifyEmail);

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
router.post('/request-password-reset', requestPasswordReset);

// @route   POST /auth/reset-password
// @desc    Reset password
// @access  Public
router.post('/reset-password', resetPassword);

// @route   POST /auth/enable-2fa
// @desc    Enable 2FA for user
// @access  Private
router.post('/enable-2fa', authenticate, enable2FA);

// @route   PUT /auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticate, [
  check('email').optional().isEmail().withMessage('Invalid email'),
  check('phoneNumber').optional().matches(/^\+?\d{10,15}$/).withMessage('Invalid phone number'),
  check('profilePicture').optional().matches(/^https?:\/\/.*\.(?:png|jpg|jpeg|svg|gif)$/i).withMessage('Invalid image URL'),
  check('preferences.notifications.email').optional().isBoolean(),
  check('preferences.notifications.sms').optional().isBoolean(),
  check('preferences.theme').optional().isIn(['light', 'dark']).withMessage('Invalid theme')
], updateProfile);

// @route   GET /auth/me
// @desc    Get current authenticated user
// @access  Private
router.get('/me', authenticate, getCurrentUser);


module.exports = router;