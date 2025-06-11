const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const systemAdminController = require('../controllers/systemAdminController');
const authMiddleware = require('../middlewares/authMiddleware');

// All routes here require admin privileges
router.use(authMiddleware.authenticate, authMiddleware.isAdmin);

// @route   GET api/system-admin/staff
// @desc    Get all staff members (teachers, deans, admins)
// @access  Admin
router.get('/staff', systemAdminController.getAllStaff);

// @route   GET api/system-admin/users/:id
// @desc    Get user by ID
// @access  Admin
router.get('/users/:id', systemAdminController.getUserById);

// @route   POST api/system-admin/staff
// @desc    Create a new staff member (teacher, dean, admin)
// @access  Admin
router.post(
  '/staff',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
    check('fullName', 'Full name is required').notEmpty(),
    check('role', 'Role is required').isIn(['teacher', 'dean', 'admin'])
  ],
  systemAdminController.createStaff
);

// @route   PUT api/system-admin/users/:id
// @desc    Update user data
// @access  Admin
router.put(
  '/users/:id',
  [
    check('email', 'Please include a valid email if updating email').optional().isEmail(),
    check('fullName', 'Full name must not be empty if updating').optional().notEmpty(),
    check('role', 'Role must be valid if updating').optional().isIn(['teacher', 'dean', 'admin'])
  ],
  systemAdminController.updateUser
);

// @route   DELETE api/system-admin/users/:id
// @desc    Delete a user
// @access  Admin
router.delete('/users/:id', systemAdminController.deleteUser);

// @route   POST api/system-admin/users/:id/reset-password
// @desc    Reset user password
// @access  Admin
router.post(
  '/users/:id/reset-password',
  [
    check('newPassword', 'New password must be at least 6 characters').isLength({ min: 6 })
  ],
  systemAdminController.resetPassword
);

module.exports = router;
