const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');

const termController = require('../controllers/termController');

// Validation rules
const termValidationRules = [
    body('termNumber').isInt({ min: 1, max: 3 }).withMessage('Term number must be 1, 2, or 3'),
    body('academicYear').isInt({ min: 2000 }).withMessage('Academic year must be a valid year'),
    body('school').isMongoId().withMessage('School ID must be valid'),
    body('startDate').isISO8601().toDate().withMessage('Start date must be a valid date'),
    body('endDate').isISO8601().toDate().withMessage('End date must be a valid date')
];

// Create term
router.post('/', termValidationRules, termController.createTerm);

// Get all terms
router.get('/', termController.getTerms);

// Get term by ID
router.get('/:id', param('id').isMongoId().withMessage('Invalid Term ID'), termController.getTermById);

// Update term by ID
router.put('/:id', [
    param('id').isMongoId().withMessage('Invalid Term ID'),
    ...termValidationRules
], termController.updateTerm);

// Delete (soft delete) term by ID
router.delete('/:id', param('id').isMongoId().withMessage('Invalid Term ID'), termController.deleteTerm);

module.exports = router;