const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const subjectController = require('../controllers/subjectController');

// Validation middleware for create and update
const validateSubjectCreateUpdate = [
    body('name').notEmpty().withMessage('Name is required').isString().trim(),
    body('description').optional().isString().trim(),
    body('schoolId').notEmpty().withMessage('School ID is required').isMongoId().withMessage('Invalid school ID'),
    body('classes').optional().isArray().withMessage('Classes must be an array'),
    body('classes.*').isMongoId().withMessage('Invalid class ID'),
    body('trades').optional().isArray().withMessage('Trades must be an array'),
    body('trades.*').isMongoId().withMessage('Invalid trade ID'),
    body('teacher').optional().isMongoId().withMessage('Invalid teacher ID'),
    body('credits').optional().isInt({ min: 1 }).withMessage('Credits must be at least 1'),
];

// Validation middleware for schoolId query parameter
const validateSchoolIdQuery = [
    query('schoolId').notEmpty().withMessage('School ID is required').isMongoId().withMessage('Invalid school ID')
];

// Create a new subject
router.post('/', validateSubjectCreateUpdate, subjectController.createSubject);

// Get all subjects for a school
router.get('/', validateSchoolIdQuery, subjectController.getSubjects);

// Get subject by ID
router.get('/:id',
    param('id').isMongoId().withMessage('Invalid subject ID'),
    validateSchoolIdQuery,
    subjectController.getSubjectById
);

// Update subject by ID
router.put('/:id',
    param('id').isMongoId().withMessage('Invalid subject ID'),
    validateSubjectCreateUpdate,
    subjectController.updateSubject
);

// Soft delete subject by ID
router.delete('/:id',
    param('id').isMongoId().withMessage('Invalid subject ID'),
    validateSchoolIdQuery,
    subjectController.deleteSubject
);

// Get classes studying a specific subject
router.get('/:id/classes',
    param('id').isMongoId().withMessage('Invalid subject ID'),
    validateSchoolIdQuery,
    subjectController.getClassesBySubject
);

module.exports = router;