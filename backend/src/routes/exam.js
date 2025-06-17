const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const examController = require('../controllers/examController');
const authMiddleware = require('../middlewares/authMiddleware');

// All routes here require authentication
router.use(authMiddleware.authenticate);

// @route   POST api/exams
// @desc    Create new exam
// @access  Teachers
router.post(
  '/',
  authMiddleware.isTeacher, [
  check('classIds').isArray({ min: 1 }).withMessage('At least one class ID is required'),
  check('classIds.*').isMongoId().withMessage('Invalid class ID'),
  check('title', 'Exam title is required').notEmpty(),
  check('subjectId', 'Subject ID is required').notEmpty(),
  check('type', 'Exam type is required').isIn(['ass1', 'ass2', 'hw', 'exam', 'midterm', 'final', 'quiz', 'practice'])
],
  examController.createExam
);

// @route   GET api/exams/teacher
// @desc    Get all exams created by teacher
// @access  Teachers
router.get('/teacher', authMiddleware.isTeacher, examController.getTeacherExams);

// @route   GET api/subjects/teacher
// @desc    Get all subjects assigned to teacher
// @access  Teachers
router.get('/subjects/teacher', authMiddleware.isTeacher, examController.getTeacherSubjects);

// @route   GET api/exams/classes
// @desc    Get all classes (teacher access)
// @access  Teachers
router.get('/classes', authMiddleware.isTeacher, examController.getClassesForTeacher);

// @route   GET api/exams/:id
// @desc    Get exam by ID
// @access  Teachers & Students (with restrictions)
router.get('/:examId', examController.getExamById);

// @route   PUT api/exams/:id
// @desc    Update exam
// @access  Teachers
router.put(
  '/:examId',
  authMiddleware.isTeacher, [
  check('title', 'Exam title is required').notEmpty(),
  check('type', 'Exam type is required').isIn(['ass1', 'ass2', 'hw', 'exam', 'midterm', 'final', 'quiz', 'practice'])
],
  examController.updateExam
);

// @route   DELETE api/exams/:id
// @desc    Delete exam
// @access  Teachers
router.delete('/:examId', authMiddleware.isTeacher, examController.deleteExam);

// @route   GET api/exams/student/upcoming
// @desc    Get upcoming exams for student
// @access  Students
router.get('/student/upcoming', authMiddleware.isStudent, examController.getUpcomingExamsForStudent);

// @route   GET api/exams/student/class
// @desc    Get all exams for student's class
// @access  Students
router.get('/student/class', authMiddleware.isStudent, examController.getStudentClassExams);

// @route   PUT api/exams/:id/activate
// @desc    Activate exam (make it active)
// @access  Teachers
router.put('/:examId/activate', authMiddleware.isTeacher, examController.activateExam);

// @route   PUT api/exams/:id/complete
// @desc    Complete exam
// @access  Teachers
router.put('/:examId/complete', authMiddleware.isTeacher, examController.completeExam);

// @route   PUT api/exams/:id/schedule
// @desc    Schedule an exam
// @access  Teachers
router.put('/:examId/schedule', authMiddleware.isTeacher, examController.scheduleExam);

module.exports = router;
