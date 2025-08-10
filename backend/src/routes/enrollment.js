const express = require('express');
const { body, param,query } = require('express-validator');
const router = express.Router();

const {
    createEnrollment,
    getEnrollments,
    getEnrollmentById,
    updateEnrollment,
    deleteEnrollment
} = require('../controllers/enrollmentController');
const { authenticate, isDean } = require('../middlewares/authMiddleware');

// Validation rules
const enrollmentValidationRules = [
    body('student').isMongoId().withMessage('Valid student ID required'),
    body('class').isMongoId().withMessage('Valid class ID required'),
    body('term').isMongoId().withMessage('Valid term ID required'),
    body('school').isMongoId().withMessage('Valid school ID required'),
    body('promotionStatus')
        .optional()
        .isIn(['eligible', 'repeat', 'expelled', 'onLeave', 'withdrawn'])
        .withMessage('Invalid promotion status'),
    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean'),
    body('transferredFromSchool')
        .optional()
        .isMongoId()
        .withMessage('Valid transferredFromSchool ID required')
];

// Create enrollment
router.post(
    '/',
    authenticate,
    isDean,
    enrollmentValidationRules,
    createEnrollment
);

// Get all enrollments (with query parameters)
// Get all enrollments with filters
router.get('/',
    query('school').optional().isMongoId().withMessage('Valid school ID required'),
    query('schoolId').optional().isMongoId().withMessage('Valid school ID required'),
    query('class').optional().isMongoId().withMessage('Valid class ID required'),
    query('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
    query('populate').optional().isString().withMessage('Populate must be a string'),
    (req, res, next) => {
        // Ensure at least one school identifier is provided
        if (!req.query.school && !req.query.schoolId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Either school or schoolId parameter is required' 
            });
        }
        next();
    },
    getEnrollments
);

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