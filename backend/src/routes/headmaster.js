const express = require('express');
const { check } = require('express-validator');
const router = express.Router();

const {
    headmasterValidation,
    getHeadmasters,
    updateHeadmaster,
    deleteHeadmaster
} = require('../controllers/headmasterController');

const { authenticate, isAdmin } = require('../middlewares/authMiddleware');

// @route   GET /headmasters
// @desc    Get all headmasters, optionally filtered by schoolId
// @access  Private (admin only)
router.get('/', authenticate, isAdmin, getHeadmasters);

// @route   PUT /headmasters/:id
// @desc    Update a headmaster's details
// @access  Private (admin only)
router.put('/:id', authenticate, isAdmin, headmasterValidation, updateHeadmaster);

// @route   DELETE /headmasters/:id
// @desc    Soft delete a headmaster
// @access  Private (admin only)
router.delete('/:id', authenticate, isAdmin, deleteHeadmaster);

module.exports = router;