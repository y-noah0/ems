const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const subjectController = require('../controllers/subjectController');

// Validation middleware
const validateSubjectCreateUpdate = [
    body('name').notEmpty().withMessage('Name is required').isString().trim(),
    body('description').optional().isString().trim(),
    body('school').notEmpty().withMessage('School is required').isMongoId(),
    body('classes').optional().isArray(),
    body('classes.*').isMongoId(),
    body('trades').optional().isArray(),
    body('trades.*').isMongoId(),
    body('teacher').optional().isMongoId(),
    body('credits').optional().isInt({ min: 1 }).withMessage('Credits must be at least 1'),
];

// Create a new subject
router.post('/', validateSubjectCreateUpdate, subjectController.createSubject);

// Get all subjects
router.get('/', subjectController.getSubjects);

// Get subject by ID
router.get('/:id', param('id').isMongoId().withMessage('Invalid subject ID'), subjectController.getSubjectById);

// Update subject by ID
router.put('/:id',
    param('id').isMongoId().withMessage('Invalid subject ID'),
    validateSubjectCreateUpdate,
    subjectController.updateSubject
);

// Soft delete subject by ID
router.delete('/:id', param('id').isMongoId().withMessage('Invalid subject ID'), subjectController.deleteSubject);

module.exports = router;
