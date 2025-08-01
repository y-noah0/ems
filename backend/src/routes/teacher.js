const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { authenticate, isAdmin, isDean, isTeacherOrDeanOrHeadmaster, limiter, mongoSanitize } = require('../middlewares/authMiddleware');

router.use(limiter);

// Routes for teacher management
router.post(
    '/',
    teacherController.validateListTeachers,
    teacherController.listTeachers
);

router.put(
    '/',
    isTeacherOrDeanOrHeadmaster, // Allows dean, headmaster, admin
    teacherController.validateUpdateTeacher,
    teacherController.updateTeacher
);

router.delete(
    '/',
    isAdmin, // Restrict to admin, headmaster (since isAdmin includes headmaster)
    teacherController.validateDeleteTeacher,
    teacherController.deleteTeacher
);

router.post(
    '/restore',
    isAdmin, // Restrict to admin, headmaster
    teacherController.validateDeleteTeacher, // Reuses same validation as delete
    teacherController.restoreTeacher
);

router.patch(
    '/status',
    isAdmin, // Restrict to admin, headmaster
    teacherController.validateToggleTeacherStatus,
    teacherController.toggleTeacherStatus
);

module.exports = router;