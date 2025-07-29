const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const {
    createTerm,
    getTerms,
    getTermById,
    updateTerm,
    deleteTerm
} = require('../controllers/termController');
const {
    authenticate,
    requireRoles
} = require('../middlewares/authMiddleware');

// Roles
const deanOrAdmin = requireRoles(['dean', 'admin']);

// Validation rules
const termValidationRules = [
    body('termNumber').isInt({ min: 1, max: 3 }).withMessage('Term number must be 1, 2, or 3'),
    body('academicYear').isInt({ min: 2000 }).withMessage('Academic year must be a valid year'),
    body('school').isMongoId().withMessage('School ID must be valid'),
    body('startDate').isISO8601().toDate().withMessage('Start date must be a valid date'),
    body('endDate').isISO8601().toDate().withMessage('End date must be a valid date')
];

// Create term (only dean or admin)
router.post('/', authenticate, deanOrAdmin, termValidationRules, createTerm);

// Get all terms (authenticated users)
router.get(
    '/',
    authenticate,
    [body('schoolId').isMongoId().withMessage('Valid schoolId is required in request body')],
    getTerms
);

// Get term by ID (authenticated users)
router.get(
    '/:id',
    authenticate,
    [param('id').isMongoId().withMessage('Invalid Term ID'),
    body('schoolId').isMongoId().withMessage('Valid schoolId is required in request body')],
    getTermById
);

// Update term by ID (only dean or admin)
router.put(
    '/:id',
    authenticate,
    deanOrAdmin,
    [
        param('id').isMongoId().withMessage('Invalid Term ID'),
        ...termValidationRules
    ],
    updateTerm
);

// Delete (soft delete) term by ID (only dean or admin)
router.delete(
    '/:id',
    authenticate,
    deanOrAdmin,
    [
        param('id').isMongoId().withMessage('Invalid Term ID'),
        body('schoolId').isMongoId().withMessage('Valid schoolId is required in request body')
    ],
    deleteTerm
);

module.exports = router;