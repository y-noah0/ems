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

// @route   GET /api/exams/:examId
// @desc    Get exam by ID
// @access  Teachers, Deans, Headmasters, Students (with restrictions)
router.get(
  '/:examId',
  examController.validateExamIdParam,
  examController.getExamById
);

// @route   PUT /api/exams/:examId
// @desc    Update exam
// @access  Teachers, Deans, Admins
router.put(
  '/:examId',
  authMiddleware.isTeacher,
  examController.validateUpdateExam,
  examController.updateExam
);

// @route   DELETE /api/exams/:examId
// @desc    Delete exam
// @access  Teachers, Deans, Admins
router.delete(
  '/:examId',
  authMiddleware.isTeacherOrDeanOrAdmin,
  examController.validateExamIdParam,
  examController.deleteExam
);

// @route   GET /api/exams/student/upcoming
// @desc    Get upcoming exams for student
// @access  Students
router.get(
  '/student/upcoming',
  authMiddleware.isStudent,
  examController.getUpcomingExamsForStudent
);

// @route   GET /api/exams/student/class
// @desc    Get all exams for student's class
// @access  Students
router.get(
  '/student/class',
  authMiddleware.isStudent,
  examController.getStudentClassExams
);

// @route   GET /api/exams/student/past
// @desc    Get past exams for student (for revision)
// @access  Students
router.get(
  '/student/past',
  authMiddleware.isStudent,
  examController.validateGetPastExams,
  examController.getPastExamsForStudent
);

// @route   PUT /api/exams/:examId/activate
// @desc    Activate exam (make it active)
// @access  Teachers
router.put(
  '/:examId/activate',
  authMiddleware.isTeacher,
  examController.validateExamIdParam,
  examController.activateExam
);

// @route   PUT /api/exams/:examId/complete
// @desc    Complete exam
// @access  Teachers
router.put(
  '/:examId/complete',
  authMiddleware.isTeacher,
  examController.validateExamIdParam,
  examController.completeExam
);

// @route   PUT /api/exams/:examId/schedule
// @desc    Schedule an exam
// @access  Teachers
router.put(
  '/:examId/schedule',
  authMiddleware.isTeacher,
  examController.validateExamIdParam,
  examController.validateScheduleExam,
  examController.scheduleExam
);

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

module.exports = router;