const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const authMiddleware = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(authMiddleware.authenticate);

// @route   POST /api/exams
// @desc    Create new exam
// @access  Teachers
router.post(
  '/',
  authMiddleware.isTeacher,
  examController.validateCreateExam,
  examController.createExam
);

// @route   GET /api/exams/teacher
// @desc    Get all exams created by teacher
// @access  Teachers
router.get(
  '/teacher',
  authMiddleware.isTeacher,
  examController.getTeacherExams
);

// @route   GET /api/exams/subjects/teacher
// @desc    Get all subjects assigned to teacher
// @access  Teachers
router.get(
  '/subjects/teacher',
  authMiddleware.isTeacher,
  examController.validateGetTeacherSubjects,
  examController.getTeacherSubjects
);

// @route   GET /api/exams/classes
// @desc    Get all classes taught by teacher
// @access  Teachers
router.get(
  '/classes',
  authMiddleware.isTeacher,
  examController.validateGetTeacherClasses,
  examController.getClassesForTeacher
);

// IMPORTANT: Place specific/static routes BEFORE parameterized '/:examId' routes to avoid path collisions.

// @route   GET /api/exams/school
// @desc    Get all exams for a school
// @access  Deans, Headmasters
router.get(
  '/school',
  (req, res, next) => {
    if (!['dean', 'headmaster'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Dean or Headmaster role required.'
      });
    }
    next();
  },
  examController.validateGetSchoolExams,
  examController.getSchoolExams
);

// Student specific routes
router.get(
  '/student/upcoming',
  authMiddleware.isStudent,
  examController.getUpcomingExamsForStudent
);

router.get(
  '/student/class',
  authMiddleware.isStudent,
  examController.getStudentClassExams
);

router.get(
  '/student/past',
  authMiddleware.isStudent,
  examController.validateGetPastExams,
  examController.getPastExamsForStudent
);

// Parameterized exam routes (placed after static prefixes)
router.get(
  '/:examId',
  examController.validateExamIdParam,
  examController.getExamById
);

router.put(
  '/:examId',
  authMiddleware.isTeacher,
  examController.validateUpdateExam,
  examController.updateExam
);

router.delete(
  '/:examId',
  authMiddleware.isTeacherOrDeanOrAdmin,
  examController.validateExamIdParam,
  examController.deleteExam
);

router.put(
  '/:examId/activate',
  authMiddleware.isTeacher,
  examController.validateExamIdParam,
  examController.activateExam
);

router.put(
  '/:examId/complete',
  authMiddleware.isTeacher,
  examController.validateExamIdParam,
  examController.completeExam
);

router.put(
  '/:examId/schedule',
  authMiddleware.isTeacher,
  examController.validateExamIdParam,
  examController.validateScheduleExam,
  examController.scheduleExam
);

module.exports = router;