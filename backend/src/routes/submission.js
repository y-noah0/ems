const express = require('express');
const router = express.Router();
const { check, query } = require('express-validator');
const submissionController = require('../controllers/submissionController');
const authMiddleware = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(authMiddleware.authenticate);

// @route   POST api/submissions/start
// @desc    Start an exam (create a submission)
// @access  Students
router.post(
  '/start',
  authMiddleware.isStudent,
  [
    check('schoolId', 'Please provide a valid school ID').isMongoId(),
    check('examId', 'Please provide a valid exam ID').isMongoId()
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
    check('schoolId', 'Please provide a valid school ID').isMongoId(),
    check('submissionId', 'Please provide a valid submission ID').isMongoId(),
    check('answers', 'Answers must be an array').isArray({ min: 0 }),
    check('answers.*.questionId', 'Each answer must have a valid question ID').optional().isMongoId(),
    check('answers.*.answer', 'Answer must be a string').optional().isString(),
    check('answers.*.timeSpent', 'Time spent must be a non-negative number').optional().isInt({ min: 0 }),
  ],
  submissionController.saveAnswers
);

// @route   POST api/submissions/submit
// @desc    Submit an exam
// @access  Students
router.post(
  '/submit',
  authMiddleware.isStudent,
  [
    check('schoolId', 'Please provide a valid school ID').isMongoId(),
    check('submissionId', 'Please provide a valid submission ID').isMongoId(),
    check('answers', 'Answers must be an array').optional().isArray({ min: 0 }),
    check('answers.*.questionId', 'Each answer must have a valid question ID').optional().isMongoId(),
    check('answers.*.answer', 'Answer must be a string').optional().isString(),
    check('answers.*.timeSpent', 'Time spent must be a non-negative number').optional().isInt({ min: 0 }),
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
    check('schoolId', 'Please provide a valid school ID').isMongoId(),
    check('submissionId', 'Please provide a valid submission ID').isMongoId(),
    check('reason', 'Reason must be an object').optional().isObject(),
    check('reason.answers', 'Answers must be an array').optional().isArray({ min: 0 }),
    check('reason.answers.*.questionId', 'Each answer must have a valid question ID').optional().isMongoId(),
    check('reason.answers.*.answer', 'Answer must be a string').optional().isString(),
    check('reason.answers.*.timeSpent', 'Time spent must be a non-negative number').optional().isInt({ min: 0 }),
    check('reason.type', 'Violation type must be a string').optional().isString(),
    check('reason.details', 'Violation details must be a string').optional().isString(),
  ],
  submissionController.autoSubmitExam
);

// @route   POST api/submissions/log-violation
// @desc    Log a violation (e.g., cheating)
// @access  Students
router.post(
  '/log-violation',
  authMiddleware.isStudent,
  [
    check('schoolId', 'Please provide a valid school ID').isMongoId(),
    check('submissionId', 'Please provide a valid submission ID').isMongoId(),
    check('violationType', 'Please specify the type of violation').notEmpty().isString(),
    check('details', 'Violation details must be a string').optional().isString(),
  ],
  submissionController.logViolation
);

// @route   GET api/submissions/student
// @desc    Get all submissions for the logged-in student
// @access  Students
router.get('/student', authMiddleware.isStudent, [
  query('schoolId', 'Please provide a valid school ID').optional().isMongoId()
], submissionController.getStudentSubmissions);

// @route   GET api/submissions/teacher
// @desc    Get all submissions for exams created by the teacher
// @access  Teachers
router.get('/teacher', authMiddleware.isTeacher, [
  query('schoolId', 'Please provide a valid school ID').optional().isMongoId()
], submissionController.getTeacherSubmissions);

// @route   GET api/submissions/exam/:examId
// @desc    Get submissions for a specific exam (teacher view)
// @access  Teachers
router.get(
  '/exam/:examId',
  authMiddleware.isTeacher,
  [
    query('schoolId', 'Please provide a valid school ID').optional().isMongoId(),
    check('examId', 'Please provide a valid exam ID').isMongoId()
  ],
  submissionController.getExamSubmissions
);

// @route   GET api/submissions/monitor/:examId
// @desc    Get active submissions for real-time monitoring
// @access  Teachers, Deans, Headmasters
router.get(
  '/monitor/:examId',
  authMiddleware.isTeacherOrDeanOrHeadmaster,
  [
    query('schoolId', 'Please provide a valid school ID').optional().isMongoId(),
    check('examId', 'Please provide a valid exam ID').isMongoId()
  ],
  submissionController.monitorExam
);

// @route   POST api/submissions/:submissionId/grade
// @desc    Grade open-ended questions
// @access  Teachers
router.post(
  '/:submissionId/grade',
  authMiddleware.isTeacher,
  [
    check('schoolId', 'Please provide a valid school ID').isMongoId(),
    check('submissionId', 'Please provide a valid submission ID').isMongoId(),
    check('grades', 'Grades must be an array').isArray({ min: 1 }),
    check('grades.*.questionId', 'Each grade must have a valid question ID').isMongoId(),
    check('grades.*.score', 'Score must be a non-negative number').isInt({ min: 0 }),
  ],
  submissionController.gradeOpenQuestions
);

// @route   GET api/submissions/student/results
// @desc    Get student's exam results by term
// @access  Students
router.get(
  '/student/results',
  authMiddleware.isStudent,
  [
    query('schoolId', 'Please provide a valid school ID').optional().isMongoId(),
    query('termId', 'Please provide a valid term ID').optional().isMongoId()
  ],
  submissionController.getStudentResultsByTerm
);

// @route   GET api/submissions/:id
// @desc    Get detailed submission (for review)
// @access  Students, Teachers, Deans, Headmasters
router.get(
  '/:id',
  [
    query('schoolId', 'Please provide a valid school ID').optional().isMongoId(),
    check('id', 'Please provide a valid submission ID').isMongoId()
  ],
  submissionController.getSubmissionDetails
);

// @route   GET api/submissions/results/homework
// @desc    Get homework results
// @access  Students, Teachers
router.get('/results/homework', authMiddleware.isStudentOrTeacher, [
  query('schoolId', 'Please provide a valid school ID').optional().isMongoId()
], submissionController.getHomeworkResults);

// @route   GET api/submissions/results/quiz
// @desc    Get quiz results
// @access  Students, Teachers
router.get('/results/quiz', authMiddleware.isStudentOrTeacher, [
  query('schoolId', 'Please provide a valid school ID').optional().isMongoId()
], submissionController.getQuizResults);

// @route   GET api/submissions/results/by-type
// @desc    Get results by assessment type
// @access  Students, Teachers
router.get(
  '/results/by-type',
  authMiddleware.isStudentOrTeacher,
  [
    query('schoolId', 'Please provide a valid school ID').optional().isMongoId(),
    query('type', 'Please specify a valid assessment type').isIn([
      'assessment1',
      'assessment2',
      'exam',
      'homework',
      'quiz',
    ]),
  ],
  submissionController.getResultsByAssessmentType
);

// @route   GET api/submissions/results/detailed
// @desc    Get detailed performance report
// @access  Students, Teachers
router.get('/results/detailed', authMiddleware.isStudentOrTeacher, [
  query('schoolId', 'Please provide a valid school ID').optional().isMongoId()
], submissionController.getCombinedDetailedResults);

// @route   GET api/submissions/results/assessment1
// @desc    Get Assessment 1 results
// @access  Students, Teachers
router.get('/results/assessment1', authMiddleware.isStudentOrTeacher, [
  query('schoolId', 'Please provide a valid school ID').optional().isMongoId()
], submissionController.getAssessment1Results);

// @route   GET api/submissions/results/assessment2
// @desc    Get Assessment 2 results
// @access  Students, Teachers
router.get('/results/assessment2', authMiddleware.isStudentOrTeacher, [
  query('schoolId', 'Please provide a valid school ID').optional().isMongoId()
], submissionController.getAssessment2Results);

// @route   GET api/submissions/results/exam
// @desc    Get exam results
// @access  Students, Teachers
router.get('/results/exam', authMiddleware.isStudentOrTeacher, [
  query('schoolId', 'Please provide a valid school ID').optional().isMongoId()
], submissionController.getExamResults);

// @route   GET api/submissions/results/combined
// @desc    Get combined results report
// @access  Students, Teachers
router.get('/results/combined', authMiddleware.isStudentOrTeacher, [
  query('schoolId', 'Please provide a valid school ID').optional().isMongoId()
], submissionController.getCombinedResults);

// @route   GET api/submissions/student/assessment-results
// @desc    Get a specific student's results by assessment type
// @access  Teachers
router.get(
  '/student/assessment-results',
  authMiddleware.isTeacher,
  [
    query('schoolId', 'Please provide a valid school ID').optional().isMongoId(),
    query('studentId', 'Please provide a valid student ID').isMongoId(),
    query('type', 'Please specify a valid assessment type').isIn([
      'assessment1',
      'assessment2',
      'exam',
      'homework',
      'quiz',
    ]),
  ],
  submissionController.getStudentResultsByAssessmentType
);

// @route   GET api/submissions/student/marks
// @desc    Get marks for a specific student by ID
// @access  Teachers, Deans, Admins
router.get(
  '/student/marks',
  authMiddleware.isTeacherOrDeanOrAdmin,
  [
    query('schoolId', 'Please provide a valid school ID').optional().isMongoId(),
    query('studentId', 'Please provide a valid student ID').isMongoId()
  ],
  submissionController.getStudentMarksByID
);

// @route   POST api/submissions/:submissionId/update-grades
// @desc    Update submission grades
// @access  Teachers, Deans, Admins
router.post(
  '/:submissionId/update-grades',
  authMiddleware.isTeacherOrDeanOrAdmin,
  [
    check('schoolId', 'Please provide a valid school ID').isMongoId(),
    check('submissionId', 'Please provide a valid submission ID').isMongoId(),
    check('grades', 'Grades must be an array').isArray({ min: 1 }),
    check('grades.*.questionId', 'Each grade must have a valid question ID').isMongoId(),
    check('grades.*.score', 'Score must be a non-negative number').isInt({ min: 0 }),
  ],
  submissionController.updateSubmissionGrades
);

// @route   POST api/submissions/:submissionId/request-review
// @desc    Student requests review of specific questions
// @access  Students
router.post(
  '/:submissionId/request-review',
  authMiddleware.isStudent,
  [
    check('schoolId', 'Please provide a valid school ID').isMongoId(),
    check('submissionId', 'Please provide a valid submission ID').isMongoId(),
    check('questionIds', 'questionIds must be an array').isArray({ min: 1 })
  ],
  submissionController.requestReview
);

// @route   GET api/submissions/my-marks
// @desc    Get marks for the logged-in student
// @access  Students
router.get('/my-marks', authMiddleware.isStudent, [
  query('schoolId', 'Please provide a valid school ID').optional().isMongoId()
], submissionController.getMyMarks);

module.exports = router;