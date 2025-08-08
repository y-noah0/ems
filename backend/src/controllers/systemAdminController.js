const User = require('../models/User');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

const systemAdminController = {};

// Get all staff members (teachers and deans)
systemAdminController.getAllStaff = async (req, res) => {
  try {
    const staffMembers = await User.find({ 
      role: { $in: ['teacher', 'dean'] } 
    }).select('-passwordHash').sort({ role: 1, fullName: 1 });

    res.json({
      success: true,
      staff: staffMembers
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Get user by ID
systemAdminController.getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    
    const user = await User.findById(userId).select('-passwordHash');
    
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

// Create new staff member (teacher, dean, admin)
systemAdminController.createStaff = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, fullName, role, subjects, school, phoneNumber } = req.body;

    // Validate role
    if (!['teacher', 'dean', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    // Check if user already exists
    let userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }    // Create new user
    const newUser = new User({
      email,
      passwordHash: password, // Will be hashed in pre-save hook
      fullName,
      role,
      school,
      phoneNumber
    });

    // For non-student roles, make sure registrationNumber is not required
    if (role !== 'student') {
      newUser.registrationNumber = undefined;
      newUser.class = undefined;
    }

    // Add subjects if the user is a teacher
    if (role === 'teacher' && subjects && Array.isArray(subjects) && subjects.length > 0) {
      newUser.subjects = subjects;
    }

    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'Staff member created successfully',
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Update user credentials
systemAdminController.updateUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.params.id;
    const { email, fullName, role, password } = req.body;

    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if email is being updated and is already taken
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email is already in use'
        });
      }
      user.email = email;
    }

    // Update fields if provided
    if (fullName) user.fullName = fullName;
    if (role && ['teacher', 'dean', 'admin'].includes(role)) user.role = role;
    
    // Update password if provided
    if (password) {
      user.passwordHash = password; // Will be hashed in pre-save hook
    }

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Delete user
systemAdminController.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check for dependencies before deletion
    if (user.role === 'teacher' && user.subjects && user.subjects.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete teacher with assigned subjects. Please reassign subjects first.'
      });
    }

    await user.remove();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Reset user password
systemAdminController.resetPassword = async (req, res) => {
  try {
    const userId = req.params.id;
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update password
    user.passwordHash = newPassword; // Will be hashed in pre-save hook
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

module.exports = systemAdminController;
