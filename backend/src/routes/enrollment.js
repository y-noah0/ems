const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const {
    createEnrollment,
    getEnrollments,
    getEnrollmentById,
    updateEnrollment,
    deleteEnrollment
} = require('../controllers/enrollmentController');
const { authenticate, isDean } = require('../middlewares/authMiddleware');
// Validation rules you can customize:
const enrollmentValidationRules = [
    body('student').isMongoId().withMessage('Valid student ID required'),
    body('class').isMongoId().withMessage('Valid class ID required'),
    body('term').isMongoId().withMessage('Valid term ID required'),
    body('school').isMongoId().withMessage('Valid school ID required'),
];

// Create enrollment
router.post(
    '/',
    authenticate,
    isDean,
    enrollmentValidationRules,
    createEnrollment
);

// Get all enrollments
router.get('/', getEnrollments);

// Get enrollment by ID
router.get(
    '/:id',
    authenticate,
    isDean,
    param('id').isMongoId().withMessage('Valid enrollment ID required'),
    getEnrollmentById
);

// Update enrollment
router.put(
    '/:id',
    authenticate,
    isDean,
    [
        param('id').isMongoId().withMessage('Valid enrollment ID required'),
        ...enrollmentValidationRules
    ],
    updateEnrollment
);

// Delete enrollment (soft delete)
router.delete(
    '/:id',
    authenticate,
    isDean,
    param('id').isMongoId().withMessage('Valid enrollment ID required'),
    deleteEnrollment
);

module.exports = router;
