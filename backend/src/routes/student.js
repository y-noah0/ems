const express = require('express');
const router = express.Router();
const {
    getStudentsByClass,
    getStudentById,
    getStudentsByTerm,
    getStudentsByPromotionStatus,
    updateStudentPromotionStatus,
    validateGetStudentsByClass,
    validateGetStudentById,
    validateGetStudentsByTerm,
    validateGetStudentsByPromotionStatus,
    validateUpdateStudentPromotionStatus,
} = require('../controllers/studentController');
const { authenticate, isTeacherOrDeanOrHeadmaster, isDean, limiter, mongoSanitize } = require('../middlewares/authMiddleware');

// Apply authentication, rate limiting, and sanitization to all routes
router.use(authenticate);
router.use(limiter);

// Routes for student management
router.get(
    '/class',
    isTeacherOrDeanOrHeadmaster, // Allows teacher, dean, headmaster, admin
    validateGetStudentsByClass,
    getStudentsByClass
);

router.get(
    '/:studentId',
    isTeacherOrDeanOrHeadmaster, // Allows teacher, dean, headmaster, admin
    validateGetStudentById,
    getStudentById
);

router.get(
    '/term',
    isTeacherOrDeanOrHeadmaster, // Allows teacher, dean, headmaster, admin
    validateGetStudentsByTerm,
    getStudentsByTerm
);

router.get(
    '/promotion',
    isTeacherOrDeanOrHeadmaster, // Allows teacher, dean, headmaster, admin
    validateGetStudentsByPromotionStatus,
    getStudentsByPromotionStatus
);

router.patch(
    '/promotion',
    isDean, // Restrict to dean, admin, headmaster
    validateUpdateStudentPromotionStatus,
    updateStudentPromotionStatus
);

module.exports = router;