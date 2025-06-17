const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

// @route   POST api/auth/register
// @desc    Register a user
// @access  Public (for students) / Admin for others
router.post(
  '/register',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required and should be at least 6 characters').isLength({ min: 6 }),
    check('fullName', 'Full name is required').notEmpty()
  ],
  authController.register
);

// @route   POST api/auth/login
// @desc    Login user & get token
// @access  Public
router.post(
  '/login',
  [
    check('identifier', 'Please include a valid identifier').isEmail(),
    check('password', 'Password is required').exists()
  ],
  authController.login
);

// @route   GET api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authMiddleware.authenticate, authController.getCurrentUser);

// @route   PUT api/auth/change-password
// @desc    Change password
// @access  Private
router.put(
  '/change-password',
  [
    authMiddleware.authenticate,
    check('currentPassword', 'Current password is required').exists(),
    check('newPassword', 'New password should be at least 6 characters').isLength({ min: 6 })
  ],
  authController.changePassword
);

module.exports = router;
