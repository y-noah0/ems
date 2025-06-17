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

// @route   GET api/submissions/teacher
// @desc    Get all submissions for teacher's exams
// @access  Teachers
router.get('/teacher', authMiddleware.isTeacher, submissionController.getTeacherSubmissions);

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

// Add these routes to support the new functionality

// @route   GET api/submissions/results/homework
// @desc    Get homework results
// @access  All authenticated users
router.get(
  '/results/homework',
  submissionController.getHomeworkResults
);

// @route   GET api/submissions/results/quiz
// @desc    Get quiz results
// @access  All authenticated users
router.get(
  '/results/quiz',
  submissionController.getQuizResults
);

// @route   GET api/submissions/results/by-type
// @desc    Get results by assessment type with role-based filtering
// @access  All authenticated users
router.get(
  '/results/by-type',
  submissionController.getResultsByAssessmentType
);

// @route   GET api/submissions/results/detailed
// @desc    Get detailed performance report across all assessment types
// @access  All authenticated users
router.get(
  '/results/detailed',
  submissionController.getCombinedDetailedResults
);

// Update existing assessment routes to be accessible by all authenticated users
// (Remove the authMiddleware.isStudent restriction)

// @route   GET api/submissions/results/assessment1
// @desc    Get Assessment 1 results
// @access  All authenticated users (previously only students)
router.get(
  '/results/assessment1',
  submissionController.getAssessment1Results
);

// @route   GET api/submissions/results/assessment2
// @desc    Get Assessment 2 results
// @access  All authenticated users (previously only students)
router.get(
  '/results/assessment2',
  submissionController.getAssessment2Results
);

// @route   GET api/submissions/results/exam
// @desc    Get Exam results
// @access  All authenticated users (previously only students)
router.get(
  '/results/exam',
  submissionController.getExamResults
);

// @route   GET api/submissions/results/combined
// @desc    Get combined results report
// @access  All authenticated users (previously only students)
router.get(
  '/results/combined',
  submissionController.getCombinedResults
);

// @route   GET api/submissions/student/assessment-results
// @desc    Get a specific student's results by assessment type (for teachers)
// @access  Teachers
router.get(
  '/student/assessment-results',
  authMiddleware.isTeacher,
  submissionController.getStudentResultsByAssessmentType
);

// @route   GET api/submissions/student/marks
// @desc    Get marks for a specific student by ID
// @access  Teachers, Deans, Admins
router.get(
  '/student/marks',
  authMiddleware.isTeacherOrDeanOrAdmin,
  submissionController.getStudentMarksByID
);

router.post(
  '/:submissionId/update-grades',
  authMiddleware.isTeacherOrDeanOrAdmin,
  [check('grades', 'Grades should be an array').isArray()],
  submissionController.updateSubmissionGrades
);


// @route   GET api/submissions/my-marks
// @desc    Get marks for the currently logged in student
// @access  Students
router.get(
  '/my-marks',
  authMiddleware.isStudent,
  submissionController.getMyMarks
);

module.exports = router;
