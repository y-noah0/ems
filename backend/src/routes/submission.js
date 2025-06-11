const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const submissionController = require('../controllers/submissionController');
const authMiddleware = require('../middlewares/authMiddleware');

// All routes here require authentication
router.use(authMiddleware.authenticate);

// @route   POST api/submissions/start
// @desc    Start exam (create submission)
// @access  Students
router.post(
  '/start',
  authMiddleware.isStudent,
  [
    check('examId', 'Exam ID is required').notEmpty()
  ],
  submissionController.startExam
);

// @route   POST api/submissions/save
// @desc    Save answers (auto-save)
// @access  Students
router.post(
  '/save',
  authMiddleware.isStudent,
  [
    check('submissionId', 'Submission ID is required').notEmpty(),
    check('answers', 'Answers should be an array').isArray()
  ],
  submissionController.saveAnswers
);

// @route   POST api/submissions/submit
// @desc    Submit exam
// @access  Students
router.post(
  '/submit',
  authMiddleware.isStudent,
  [
    check('submissionId', 'Submission ID is required').notEmpty()
  ],
  submissionController.submitExam
);

// @route   POST api/submissions/auto-submit
// @desc    Auto-submit exam (due to violations or time expiry)
// @access  Students
router.post(
  '/auto-submit',
  authMiddleware.isStudent,
  [
    check('submissionId', 'Submission ID is required').notEmpty()
  ],
  submissionController.autoSubmitExam
);

// @route   POST api/submissions/log-violation
// @desc    Log a violation
// @access  Students
router.post(
  '/log-violation',
  authMiddleware.isStudent,
  [
    check('submissionId', 'Submission ID is required').notEmpty(),
    check('violationType', 'Violation type is required').notEmpty()
  ],
  submissionController.logViolation
);

// @route   GET api/submissions/student
// @desc    Get student's submissions
// @access  Students
router.get('/student', authMiddleware.isStudent, submissionController.getStudentSubmissions);

// @route   GET api/submissions/exam/:examId
// @desc    Get submissions for an exam (teacher view)
// @access  Teachers
router.get('/exam/:examId', authMiddleware.isTeacher, submissionController.getExamSubmissions);

// @route   POST api/submissions/:submissionId/grade
// @desc    Grade open questions
// @access  Teachers
router.post(
  '/:submissionId/grade',
  authMiddleware.isTeacher,
  [
    check('grades', 'Grades should be an array').isArray()
  ],
  submissionController.gradeOpenQuestions
);

// @route   GET api/submissions/student/results
// @desc    Get student's exam results by term
// @access  Students
router.get('/student/results', authMiddleware.isStudent, submissionController.getStudentResultsByTerm);

// @route   GET api/submissions/:id
// @desc    Get detailed submission (for review)
// @access  Students & Teachers (with restrictions)
router.get('/:id', submissionController.getSubmissionDetails);

module.exports = router;
