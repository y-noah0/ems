const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const authMiddleware = require('../middlewares/authMiddleware');
const { param } = require('express-validator');

// All routes here require authentication
router.use(authMiddleware.authenticate);

// @route   POST api/exams
// @desc    Create new exam
// @access  Teachers
router.post(
  '/',
  authMiddleware.isTeacher,
  examController.validateCreateExam,
  examController.createExam
);

// @route   GET api/exams/teacher
// @desc    Get all exams created by teacher
// @access  Teachers
router.get('/teacher', authMiddleware.isTeacher, examController.getTeacherExams);

// @route   GET api/exams/:examId
// @desc    Get exam by ID
// @access  Teachers/Students
router.get('/:examId', 
  [param('examId').isMongoId().withMessage('Invalid exam ID format')],
  examController.getExamById
);

// @route   PUT api/exams/:examId
// @desc    Update exam
// @access  Teachers
router.put(
  '/:examId',
  authMiddleware.isTeacher,
  examController.validateExamIdParam,
  examController.validateUpdateExam,
  examController.updateExam
);

// @route   DELETE api/exams/:examId
// @desc    Delete exam
// @access  Teachers
router.delete(
  '/:examId', 
  authMiddleware.isTeacher,
  examController.validateExamIdParam,
  examController.deleteExam
);

// @route   GET api/exams/student/upcoming
// @desc    Get upcoming exams for student
// @access  Students
router.get('/student/upcoming', authMiddleware.isStudent, examController.getUpcomingExamsForStudent);

// @route   GET api/exams/student/class
// @desc    Get all exams for student's class
// @access  Students
router.get('/student/class', authMiddleware.isStudent, examController.getStudentClassExams);

// @route   PUT api/exams/:examId/activate
// @desc    Activate exam (make it active)
// @access  Teachers
router.put(
  '/:examId/activate', 
  authMiddleware.isTeacher,
  examController.validateExamIdParam,
  examController.activateExam
);

// @route   PUT api/exams/:examId/complete
// @desc    Complete exam
// @access  Teachers
router.put(
  '/:examId/complete', 
  authMiddleware.isTeacher,
  examController.validateExamIdParam,
  examController.completeExam
);

// @route   PUT api/exams/:examId/schedule
// @desc    Schedule an exam
// @access  Teachers
router.put(
  '/:examId/schedule',
  authMiddleware.isTeacher,
  examController.validateExamIdParam,
  examController.validateScheduleExam,
  examController.scheduleExam
);

// @route   GET api/exams/classes/teacher
// @desc    Get classes for logged in teacher
// @access  Teachers
router.get('/classes/teacher', authMiddleware.isTeacher, examController.getClassesForTeacher);

module.exports = router;