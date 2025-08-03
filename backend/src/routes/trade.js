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

// Write routes restricted to dean and admin
router.post('/', tradeValidation, requireRoles(['dean', 'admin']), createTrade)
router.put('/:id', authenticate, requireRoles(['dean', 'admin']), tradeValidation, updateTrade);
router.delete('/:id', authenticate, requireRoles(['dean', 'admin']), deleteTrade);

module.exports = router;
