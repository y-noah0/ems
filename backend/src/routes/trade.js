// routes/tradeRoutes.js
const express = require('express');
const { check } = require('express-validator');
const {
    createTrade,
    getTrades,
    getTradeById,
    updateTrade,
    deleteTrade
} = require('../controllers/tradeController');

const {
    authenticate,
    requireRoles,
} = require('../middlewares/authMiddleware');

const router = express.Router();

// Validation rules
const tradeValidation = [
    check('code')
        .notEmpty().withMessage('Code is required')
        .isLength({ min: 2 }).withMessage('Code must be at least 2 characters'),
    check('name')
        .notEmpty().withMessage('Name is required'),
    check('description')
        .optional()
        .isLength({ max: 500 }).withMessage('Description is too long')
];

// Read-only routes for all authenticated users
router.get('/', authenticate, getTrades);
router.get('/:id', authenticate, getTradeById);

// Write routes restricted to dean, admin, and headmaster
router.post('/', authenticate, tradeValidation, requireRoles(['dean', 'admin', 'headmaster']), createTrade);
router.put('/:id', authenticate, requireRoles(['dean', 'admin', 'headmaster']), tradeValidation, updateTrade);
router.delete('/:id', authenticate, requireRoles(['dean', 'admin', 'headmaster']), deleteTrade);

module.exports = router;
