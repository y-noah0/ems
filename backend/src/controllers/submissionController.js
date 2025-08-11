const Submission = require('../models/Submission');
const Exam = require('../models/Exam');
const Enrollment = require('../models/enrollment');
const User = require('../models/User');
const { check, validationResult } = require('express-validator');
const winston = require('winston');
const { validateEntity } = require('../utils/entityValidator');
const { logAudit } = require('../utils/auditLogger');
const { toUTC } = require('../utils/dateUtils');
const notificationService = require('../utils/notificationService');
const { sendSMS } = require('../services/twilioService');
const { sendEmail } = require('../services/emailService');

// Logger setup
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

// Temporary sanitize function
const sanitize = (value) => String(value || '');

// Validation Rules
const validateStartExam = [
  check('examId').isMongoId().withMessage('Valid exam ID is required')
];

const validateSaveAnswers = [
  check('submissionId').isMongoId().withMessage('Valid submission ID is required'),
  check('answers').optional().isArray().withMessage('Answers must be an array'),
  check('answers.*.questionId').optional().isMongoId().withMessage('Invalid question ID format'),
  check('answers.*.answer').optional().isString().withMessage('Answer must be a string'),
  check('answers.*.timeSpent').optional().isInt({ min: 0 }).withMessage('Time spent must be a non-negative integer')
];

const validateSubmitExam = [
  check('submissionId').isMongoId().withMessage('Valid submission ID is required'),
  check('answers').optional().isArray().withMessage('Answers must be an array'),
  check('answers.*.questionId').optional().isMongoId().withMessage('Invalid question ID format'),
  check('answers.*.answer').optional().isString().withMessage('Answer must be a string'),
  check('answers.*.timeSpent').optional().isInt({ min: 0 }).withMessage('Time spent must be a non-negative integer')
];

const validateAutoSubmitExam = [
  check('submissionId').isMongoId().withMessage('Valid submission ID is required'),
  check('reason').optional().isObject().withMessage('Reason must be an object'),
  check('reason.answers').optional().isArray().withMessage('Reason answers must be an array'),
  check('reason.answers.*.questionId').optional().isMongoId().withMessage('Invalid question ID format'),
  check('reason.answers.*.answer').optional().isString().withMessage('Answer must be a string'),
  check('reason.answers.*.timeSpent').optional().isInt({ min: 0 }).withMessage('Time spent must be a non-negative integer'),
  check('reason.type').optional().isString().withMessage('Violation type must be a string'),
  check('reason.details').optional().isString().withMessage('Violation details must be a string')
];

const validateLogViolation = [
  check('submissionId').isMongoId().withMessage('Valid submission ID is required'),
  check('violationType').notEmpty().withMessage('Violation type is required'),
  check('details').optional().isString().withMessage('Details must be a string')
];

const validateGradeOpenQuestions = [
  check('submissionId').isMongoId().withMessage('Valid submission ID is required'),
  check('grades').isArray({ min: 1 }).withMessage('At least one grade is required'),
  check('grades.*.questionId').isMongoId().withMessage('Invalid question ID format'),
  check('grades.*.score').isInt({ min: 0 }).withMessage('Score must be a non-negative integer'),
  check('grades.*.feedback').optional().isString().withMessage('Feedback must be a string'),
  check('feedback').optional().isString().withMessage('Feedback must be a string')
];

const validateUpdateSubmissionGrades = [
  check('submissionId').isMongoId().withMessage('Valid submission ID is required'),
  check('grades').isArray({ min: 1 }).withMessage('At least one grade is required'),
  check('grades.*.questionId').isMongoId().withMessage('Invalid question ID format'),
  check('grades.*.score').isInt({ min: 0 }).withMessage('Score must be a non-negative integer'),
  check('grades.*.feedback').optional().isString().withMessage('Feedback must be a string')
];

const validateMonitorExam = [
  check('examId').isMongoId().withMessage('Invalid exam ID format')
];

const validateGetSubmissionDetails = [
  check('id').isMongoId().withMessage('Invalid submission ID format')
];

const validateGetResultsByAssessmentType = [
  check('type').isIn(['assessment1', 'assessment2', 'exam', 'homework', 'quiz']).withMessage('Invalid assessment type')
];

const validateGetStudentResultsByAssessmentType = [
  check('studentId').isMongoId().withMessage('Invalid student ID format'),
  check('type').isIn(['assessment1', 'assessment2', 'exam', 'homework', 'quiz']).withMessage('Invalid assessment type')
];

const validateGetStudentResultsByTerm = [
  check('termId').isMongoId().withMessage('Invalid term ID format')
];

const validateGetStudentMarksByID = [
  check('studentId').isMongoId().withMessage('Invalid student ID format')
];

const submissionController = {};

// Helper: calculate time remaining
const calculateTimeRemaining = (submission, exam) => {
  const now = new Date();
  const startedAt = toUTC(submission.startedAt);
  const duration = exam.schedule.duration * 60 * 1000;
  const timeElapsed = now - startedAt;
  return Math.max(0, duration - timeElapsed);
};

// Calculate grade letter
function calculateGradeLetter(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 75) return 'B+';
  if (percentage >= 70) return 'B';
  if (percentage >= 65) return 'C+';
  if (percentage >= 60) return 'C';
  if (percentage >= 55) return 'D+';
  if (percentage >= 50) return 'D';
  return 'F';
}

submissionController.startExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in startExam', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { examId } = req.body;

    // Fetch and validate exam
    const exam = await validateEntity(Exam, examId, 'Exam');
    if (!exam) {
      logger.warn('Exam not found', { examId, userId: req.user.id });
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    // Verify user's school matches exam's school
    if (req.user.school.toString() !== exam.school.toString()) {
      logger.warn('School ID mismatch', { userId: req.user.id, examSchool: exam.school, userSchool: req.user.school });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to start exams for this school'
      });
    }

    // Update exam status if scheduled and start time has passed
    if (exam.status === 'scheduled' && exam.schedule && new Date(exam.schedule.start) <= new Date()) {
      exam.status = 'active';
      await exam.save();
      req.io.to(`school:${exam.school}:admins`).emit('exam-status-changed', {
        examId: exam._id,
        title: exam.title,
        status: exam.status,
        updatedAt: exam.updatedAt,
      });
      req.io.to(exam.teacher.toString()).emit('exam-status-changed', {
        examId: exam._id,
        title: exam.title,
        status: exam.status,
        updatedAt: exam.updatedAt,
      });
      req.io.to(`school:${exam.school}:dean`).emit('exam-status-changed', {
        examId: exam._id,
        title: exam.title,
        status: exam.status,
        updatedAt: exam.updatedAt,
      });
      req.io.to(`school:${exam.school}:headmaster`).emit('exam-status-changed', {
        examId: exam._id,
        title: exam.title,
        status: exam.status,
        updatedAt: exam.updatedAt,
      });
    }

    // Check if exam is active
    if (exam.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Exam is not active' });
    }

    // Check if student is enrolled in the class
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      class: { $in: exam.classes },
      school: exam.school
    });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this exam\'s class' });
    }

    // Check if submission already exists
    let submission = await Submission.findOne({
      exam: examId,
      student: req.user.id,
      enrollment: enrollment._id
    });

    if (submission) {
      if (submission.status === 'submitted' || submission.status === 'graded' || submission.status === 'auto-submitted') {
        return res.status(400).json({ success: false, message: 'Exam already submitted' });
      }
      // Resume existing submission
      const timeRemaining = calculateTimeRemaining(submission, exam);
      if (timeRemaining === 0) {
        // Auto-submit if time expired
        await submissionController.autoSubmitExamInternal(submission, exam, 'time_expired');
        return res.status(400).json({ success: false, message: 'Exam time has expired' });
      }
      return res.json({
        success: true,
        submissionId: submission._id,
        timeRemaining,
        answers: submission.answers
      });
    }

    // Create new submission
    submission = new Submission({
      exam: examId,
      student: req.user.id,
      enrollment: enrollment._id,
      startedAt: new Date(),
      status: 'in-progress',
      answers: [],
      violationLogs: []
    });
    await submission.save();

    // Notify teacher
    notificationService.notifyTeacherExamStarted(exam.teacher, req.user.id, examId);

    const timeRemaining = calculateTimeRemaining(submission, exam);

    res.json({
      success: true,
      submissionId: submission._id,
      timeRemaining,
      answers: []
    });
  } catch (error) {
    logger.error('startExam error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while starting exam' });
  }
};

// Internal auto-submit function
submissionController.autoSubmitExamInternal = async (submission, exam, reasonType, details = '') => {
  submission.status = 'auto-submitted';
  submission.submittedAt = new Date();
  submission.violationLogs.push({
    type: reasonType,
    details,
    timestamp: new Date()
  });

  // Auto-grade multiple-choice questions
  let totalScore = 0;
  submission.answers = submission.answers.map(answer => {
    const question = exam.questions.id(answer.questionId);
    if (question && ['multiple-choice', 'true-false'].includes(question.type)) {
      const isCorrect = answer.answer === question.correctAnswer;
      answer.score = isCorrect ? question.maxScore : 0;
      answer.graded = isCorrect;
      totalScore += answer.score;
    }
    return answer;
  });

  submission.totalScore = totalScore;
  submission.percentage = exam.totalPoints ? (totalScore / exam.totalPoints) * 100 : 0;
  submission.gradeLetter = calculateGradeLetter(submission.percentage);

  await submission.save();

  // Notify student and teacher
  notificationService.notifyStudentExamAutoSubmitted(submission.student, exam._id, reasonType);
  notificationService.notifyTeacherSubmissionReceived(exam.teacher, submission.student, exam._id);
};

// Save answers
submissionController.saveAnswers = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in saveAnswers', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { submissionId, answers } = req.body;

    const submission = await Submission.findOne({
      _id: submissionId,
      student: req.user.id,
      status: 'in-progress'
    }).populate('exam', 'questions schedule totalPoints school');

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found or not in progress' });
    }

    const exam = submission.exam;
    if (req.user.school.toString() !== exam.school.toString()) {
      return res.status(403).json({ success: false, message: 'You are not authorized to save answers for this exam' });
    }

    const timeRemaining = calculateTimeRemaining(submission, exam);
    if (timeRemaining === 0) {
      await submissionController.autoSubmitExamInternal(submission, exam, 'time_expired');
      return res.status(400).json({ success: false, message: 'Exam time has expired' });
    }

    answers.forEach(answer => {
      const question = exam.questions.id(answer.questionId);
      if (!question) return;

      const existingAnswer = submission.answers.find(a => a.questionId.toString() === answer.questionId.toString());
      if (existingAnswer) {
        existingAnswer.answer = sanitize(answer.answer);
        existingAnswer.timeSpent = answer.timeSpent || existingAnswer.timeSpent || 0;
      } else {
        submission.answers.push({
          questionId: answer.questionId,
          answer: sanitize(answer.answer),
          timeSpent: answer.timeSpent || 0
        });
      }
    });

    submission.autoSaves.push({ timestamp: new Date(), data: answers });
    await submission.save();
    res.json({ success: true, message: 'Answers saved successfully' });
  } catch (error) {
    logger.error('saveAnswers error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while saving answers' });
  }
};

// Submit exam
submissionController.submitExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in submitExam', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { submissionId, answers } = req.body;

    const submission = await Submission.findOne({
      _id: submissionId,
      student: req.user.id,
      status: 'in-progress'
    }).populate('exam', 'questions schedule totalPoints school teacher');

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found or not in progress' });
    }

    const exam = submission.exam;
    if (req.user.school.toString() !== exam.school.toString()) {
      return res.status(403).json({ success: false, message: 'You are not authorized to submit this exam' });
    }

    const timeRemaining = calculateTimeRemaining(submission, exam);
    if (timeRemaining === 0) {
      await submissionController.autoSubmitExamInternal(submission, exam, 'time_expired');
      return res.status(400).json({ success: false, message: 'Exam time has expired' });
    }

    if (answers && answers.length > 0) {
      answers.forEach(answer => {
        const question = exam.questions.id(answer.questionId);
        if (!question) return;

        const existingAnswer = submission.answers.find(a => a.questionId.toString() === answer.questionId.toString());
        if (existingAnswer) {
          existingAnswer.answer = sanitize(answer.answer);
          existingAnswer.timeSpent = answer.timeSpent || existingAnswer.timeSpent || 0;
        } else {
          submission.answers.push({
            questionId: answer.questionId,
            answer: sanitize(answer.answer),
            timeSpent: answer.timeSpent || 0
          });
        }
      });
    }

    // Auto-grade multiple-choice questions
    let totalScore = 0;
    submission.answers = submission.answers.map(answer => {
      const question = exam.questions.id(answer.questionId);
      if (question && ['multiple-choice', 'true-false'].includes(question.type)) {
        const isCorrect = answer.answer === question.correctAnswer;
        answer.score = isCorrect ? question.maxScore : 0;
        answer.graded = isCorrect;
        totalScore += answer.score;
      }
      return answer;
    });

    submission.status = 'submitted';
    submission.submittedAt = new Date();
    submission.totalScore = totalScore;
    submission.percentage = exam.totalPoints ? (totalScore / exam.totalPoints) * 100 : 0;
    submission.gradeLetter = calculateGradeLetter(submission.percentage);

    await submission.save();

    // Notify student and teacher
    notificationService.notifyStudentExamSubmitted(submission.student, exam._id);
    notificationService.notifyTeacherSubmissionReceived(exam.teacher, submission.student, exam._id);

    res.json({ success: true, message: 'Exam submitted successfully' });
  } catch (error) {
    logger.error('submitExam error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while submitting exam' });
  }
};

// Auto-submit exam
submissionController.autoSubmitExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in autoSubmitExam', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { submissionId, reason } = req.body;

    const submission = await Submission.findOne({
      _id: submissionId,
      student: req.user.id,
      status: 'in-progress'
    }).populate('exam', 'questions schedule totalPoints school teacher');

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found or not in progress' });
    }

    const exam = submission.exam;
    if (req.user.school.toString() !== exam.school.toString()) {
      return res.status(403).json({ success: false, message: 'You are not authorized to auto-submit this exam' });
    }

    await submissionController.autoSubmitExamInternal(submission, exam, reason.type || 'auto_submit', reason.details || '');

    if (reason.answers && reason.answers.length > 0) {
      reason.answers.forEach(answer => {
        const question = exam.questions.id(answer.questionId);
        if (!question) return;

        const existingAnswer = submission.answers.find(a => a.questionId.toString() === answer.questionId.toString());
        if (existingAnswer) {
          existingAnswer.answer = sanitize(answer.answer);
          existingAnswer.timeSpent = answer.timeSpent || existingAnswer.timeSpent || 0;
        } else {
          submission.answers.push({
            questionId: answer.questionId,
            answer: sanitize(answer.answer),
            timeSpent: answer.timeSpent || 0
          });
        }
      });
      await submission.save();
    }

    res.json({ success: true, message: 'Exam auto-submitted successfully' });
  } catch (error) {
    logger.error('autoSubmitExam error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while auto-submitting exam' });
  }
};

// Log violation
submissionController.logViolation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in logViolation', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { submissionId, violationType, details } = req.body;

    const submission = await Submission.findOne({
      _id: submissionId,
      student: req.user.id
    }).populate('exam', 'teacher school');

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    if (req.user.school.toString() !== submission.exam.school.toString()) {
      return res.status(403).json({ success: false, message: 'You are not authorized to log violations for this submission' });
    }

    submission.violationLogs.push({
      type: violationType,
      details: sanitize(details || ''),
      timestamp: new Date()
    });
    submission.violations += 1;

    await submission.save();

    // Notify teacher
    notificationService.notifyTeacherViolationLogged(submission.exam.teacher, req.user.id, submissionId, violationType);

    res.json({ success: true, message: 'Violation logged successfully' });
  } catch (error) {
    logger.error('logViolation error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while logging violation' });
  }
};

// Get student submissions
submissionController.getStudentSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({
      student: req.user.id,
      isDeleted: false
    })
      .populate('exam', 'title type subject classes totalPoints school')
      .populate('student', 'fullName registrationNumber')
      .populate('enrollment', 'class school')
      .sort({ submittedAt: -1 })
      .lean();

    // Filter submissions to ensure exam.school matches user.school
    const filteredSubmissions = submissions.filter(sub => sub.exam && sub.exam.school.toString() === req.user.school.toString());

    logger.info('Student submissions retrieved', { userId: req.user.id, count: filteredSubmissions.length });
    res.json({ success: true, submissions: filteredSubmissions });
  } catch (error) {
    logger.error('getStudentSubmissions error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving student submissions' });
  }
};

// Get teacher submissions
submissionController.getTeacherSubmissions = async (req, res) => {
  try {
    const exams = await Exam.find({ teacher: req.user.id, school: req.user.school }).select('_id title');
    logger.info('Exams found for teacher', { teacherId: req.user.id, schoolId: req.user.school, examCount: exams.length, examIds: exams.map(e => e._id.toString()) });

    const submissions = await Submission.find({
      exam: { $in: exams.map(e => e._id) },
      isDeleted: false
    })
      .populate('exam', 'title type subject classes totalPoints school')
      .populate('student', 'fullName registrationNumber')
      .populate('enrollment', 'class school')
      .sort({ submittedAt: -1 })
      .lean();

    logger.info('Teacher submissions retrieved', { teacherId: req.user.id, submissionCount: submissions.length });
    res.json({ success: true, submissions });
  } catch (error) {
    logger.error('getTeacherSubmissions error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving teacher submissions' });
  }
};

// Get exam submissions
submissionController.getExamSubmissions = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in getExamSubmissions', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { examId } = req.params;
    const exam = await validateEntity(Exam, examId, 'Exam');
    if (!exam || exam.teacher.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'You are not authorized to view submissions for this exam' });
    }

    if (exam.school.toString() !== req.user.school.toString()) {
      return res.status(403).json({ success: false, message: 'Exam does not belong to your school' });
    }

    const submissions = await Submission.find({
      exam: examId,
      isDeleted: false
    })
      .populate('exam', 'title type subject classes totalPoints school')
      .populate('student', 'fullName registrationNumber')
      .populate('enrollment', 'class school')
      .sort({ submittedAt: -1 })
      .lean();

    logger.info('Exam submissions retrieved', { examId, userId: req.user.id, submissionCount: submissions.length });
    res.json({ success: true, submissions });
  } catch (error) {
    logger.error('getExamSubmissions error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving exam submissions' });
  }
};

// Monitor exam
submissionController.monitorExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in monitorExam', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { examId } = req.params;
    const exam = await validateEntity(Exam, examId, 'Exam');
    if (!exam || (req.user.role === 'teacher' && exam.teacher.toString() !== req.user.id.toString())) {
      return res.status(403).json({ success: false, message: 'You are not authorized to monitor this exam' });
    }

    if (exam.school.toString() !== req.user.school.toString()) {
      return res.status(403).json({ success: false, message: 'Exam does not belong to your school' });
    }

    const submissions = await Submission.find({
      exam: examId,
      status: 'in-progress',
      isDeleted: false
    })
      .populate('exam', 'title schedule school')
      .populate('student', 'fullName registrationNumber')
      .populate('enrollment', 'class school')
      .lean();

    const results = submissions.map(sub => ({
      submissionId: sub._id,
      student: {
        fullName: sub.student.fullName,
        registrationNumber: sub.student.registrationNumber
      },
      startedAt: sub.startedAt,
      timeRemaining: calculateTimeRemaining(sub, exam),
      violations: sub.violations,
      violationLogs: sub.violationLogs
    }));

    res.json({ success: true, submissions: results });
  } catch (error) {
    logger.error('monitorExam error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while monitoring exam' });
  }
};

// Grade open questions
submissionController.gradeOpenQuestions = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in gradeOpenQuestions', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { submissionId, grades, feedback } = req.body;

    const submission = await Submission.findOne({
      _id: submissionId
    }).populate('exam', 'questions totalPoints teacher school');

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    if (submission.exam.teacher.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'You are not authorized to grade this submission' });
    }

    if (submission.exam.school.toString() !== req.user.school.toString()) {
      return res.status(403).json({ success: false, message: 'Submission does not belong to your school' });
    }

    let totalScore = submission.totalScore || 0;
    grades.forEach(grade => {
      const question = submission.exam.questions.id(grade.questionId);
      if (question && !['multiple-choice', 'true-false'].includes(question.type)) {
        const answer = submission.answers.find(a => a.questionId.toString() === grade.questionId.toString());
        if (answer) {
          totalScore -= answer.score || 0;
          answer.score = grade.score;
          answer.feedback = sanitize(grade.feedback || '');
          answer.graded = true;
          totalScore += grade.score;
        }
      }
    });

    submission.feedback = sanitize(feedback || '');
    submission.totalScore = totalScore;
    submission.percentage = submission.exam.totalPoints ? (totalScore / submission.exam.totalPoints) * 100 : 0;
    submission.gradeLetter = calculateGradeLetter(submission.percentage);
    submission.status = 'graded';
    submission.gradedBy = req.user.id;
    submission.gradedAt = new Date();

    await submission.save();

    // Notify student
    notificationService.notifyStudentSubmissionGraded(submission.student, submission.exam._id, submission.totalScore, submission.percentage);

    res.json({ success: true, message: 'Submission graded successfully' });
  } catch (error) {
    logger.error('gradeOpenQuestions error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while grading submission' });
  }
};

// Get submission details
submissionController.getSubmissionDetails = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in getSubmissionDetails', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const submission = await Submission.findOne({
      _id: id,
      isDeleted: false
    })
      .populate('exam', 'title type subject classes totalPoints questions school teacher')
      .populate('student', 'fullName registrationNumber')
      .populate('enrollment', 'class school')
      .lean();

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    if (
      req.user.role === 'student' && submission.student._id.toString() !== req.user.id.toString() ||
      req.user.role === 'teacher' && submission.exam.teacher.toString() !== req.user.id.toString() &&
      !['dean', 'headmaster'].includes(req.user.role)
    ) {
      return res.status(403).json({ success: false, message: 'You are not authorized to view this submission' });
    }

    if (submission.exam.school.toString() !== req.user.school.toString()) {
      return res.status(403).json({ success: false, message: 'Submission does not belong to your school' });
    }

    res.json({ success: true, submission });
  } catch (error) {
    logger.error('getSubmissionDetails error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving submission details' });
  }
};

// Update submission grades
submissionController.updateSubmissionGrades = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in updateSubmissionGrades', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { submissionId, grades } = req.body;

    const submission = await Submission.findOne({
      _id: submissionId
    }).populate('exam', 'questions totalPoints teacher school');

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    if (submission.exam.teacher.toString() !== req.user.id.toString() && !['dean', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'You are not authorized to update grades for this submission' });
    }

    if (submission.exam.school.toString() !== req.user.school.toString()) {
      return res.status(403).json({ success: false, message: 'Submission does not belong to your school' });
    }

    let totalScore = submission.totalScore || 0;
    grades.forEach(grade => {
      const question = submission.exam.questions.id(grade.questionId);
      if (question) {
        const answer = submission.answers.find(a => a.questionId.toString() === grade.questionId.toString());
        if (answer) {
          totalScore -= answer.score || 0;
          answer.score = grade.score;
          answer.feedback = sanitize(grade.feedback || '');
          answer.graded = true;
          totalScore += grade.score;
        }
      }
    });

    submission.totalScore = totalScore;
    submission.percentage = submission.exam.totalPoints ? (totalScore / submission.exam.totalPoints) * 100 : 0;
    submission.gradeLetter = calculateGradeLetter(submission.percentage);
    submission.status = 'graded';
    submission.gradedBy = req.user.id;
    submission.gradedAt = new Date();

    await submission.save();

    // Notify student
    notificationService.notifyStudentSubmissionGraded(submission.student, submission.exam._id, submission.totalScore, submission.percentage);

    res.json({ success: true, message: 'Grades updated successfully' });
  } catch (error) {
    logger.error('updateSubmissionGrades error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while updating grades' });
  }
};

// Get student results by term
submissionController.getStudentResultsByTerm = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in getStudentResultsByTerm', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { termId } = req.query;
    const submissions = await Submission.find({
      student: req.user.id,
      isDeleted: false
    })
      .populate({
        path: 'exam',
        match: { term: termId, school: req.user.school },
        select: 'title type subject classes totalPoints school'
      })
      .populate('student', 'fullName registrationNumber')
      .populate('enrollment', 'class school')
      .lean();

    // Filter out submissions where exam is null (due to term or school mismatch)
    const filteredSubmissions = submissions.filter(sub => sub.exam);

    res.json({ success: true, results: filteredSubmissions, message: 'Results retrieved successfully' });
  } catch (error) {
    logger.error('getStudentResultsByTerm error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving results' });
  }
};

// Get results by assessment type
submissionController.getResultsByAssessmentType = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in getResultsByAssessmentType', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { type } = req.query;
    let query = { isDeleted: false };
    let examQuery = { type, school: req.user.school };

    if (req.user.role === 'student') {
      query.student = req.user.id;
    } else if (req.user.role === 'teacher') {
      examQuery.teacher = req.user.id;
    }

    const exams = await Exam.find(examQuery).select('_id');
    query.exam = { $in: exams.map(e => e._id) };

    const submissions = await Submission.find(query)
      .populate('exam', 'title type subject classes totalPoints school')
      .populate('student', 'fullName registrationNumber')
      .populate('enrollment', 'class school')
      .lean();

    res.json({ success: true, results: submissions, message: `${type} results retrieved successfully` });
  } catch (error) {
    logger.error('getResultsByAssessmentType error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving results' });
  }
};

// Get detailed results
submissionController.getCombinedDetailedResults = async (req, res) => {
  try {
    let query = { isDeleted: false };
    let examQuery = { school: req.user.school };

    if (req.user.role === 'student') {
      query.student = req.user.id;
    } else if (req.user.role === 'teacher') {
      examQuery.teacher = req.user.id;
    }

    const exams = await Exam.find(examQuery).select('_id');
    query.exam = { $in: exams.map(e => e._id) };

    const submissions = await Submission.find(query)
      .populate('exam', 'title type subject classes totalPoints school')
      .populate('student', 'fullName registrationNumber')
      .populate('enrollment', 'class school')
      .lean();

    const results = submissions.reduce((acc, sub) => {
      const type = sub.exam.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push({
        examTitle: sub.exam.title,
        student: {
          fullName: sub.student.fullName,
          registrationNumber: sub.student.registrationNumber
        },
        totalScore: sub.totalScore,
        percentage: sub.percentage,
        gradeLetter: sub.gradeLetter,
      });
      return acc;
    }, {});

    res.json({ success: true, results, message: 'Detailed results retrieved successfully' });
  } catch (error) {
    logger.error('getCombinedDetailedResults error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving detailed results' });
  }
};

// Get Assessment 1 results
submissionController.getAssessment1Results = async (req, res) => {
  try {
    let query = { isDeleted: false };
    let examQuery = { type: 'assessment1', school: req.user.school };

    if (req.user.role === 'student') {
      query.student = req.user.id;
    } else if (req.user.role === 'teacher') {
      examQuery.teacher = req.user.id;
    }

    const exams = await Exam.find(examQuery).select('_id');
    query.exam = { $in: exams.map(e => e._id) };

    const submissions = await Submission.find(query)
      .populate('exam', 'title type subject classes totalPoints school')
      .populate('student', 'fullName registrationNumber')
      .populate('enrollment', 'class school')
      .lean();

    res.json({ success: true, results: submissions, message: 'Assessment 1 results retrieved successfully' });
  } catch (error) {
    logger.error('getAssessment1Results error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving Assessment 1 results' });
  }
};

// Get Assessment 2 results
submissionController.getAssessment2Results = async (req, res) => {
  try {
    let query = { isDeleted: false };
    let examQuery = { type: 'assessment2', school: req.user.school };

    if (req.user.role === 'student') {
      query.student = req.user.id;
    } else if (req.user.role === 'teacher') {
      examQuery.teacher = req.user.id;
    }

    const exams = await Exam.find(examQuery).select('_id');
    query.exam = { $in: exams.map(e => e._id) };

    const submissions = await Submission.find(query)
      .populate('exam', 'title type subject classes totalPoints school')
      .populate('student', 'fullName registrationNumber')
      .populate('enrollment', 'class school')
      .lean();

    res.json({ success: true, results: submissions, message: 'Assessment 2 results retrieved successfully' });
  } catch (error) {
    logger.error('getAssessment2Results error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving Assessment 2 results' });
  }
};

// Get Exam results
submissionController.getExamResults = async (req, res) => {
  try {
    let query = { isDeleted: false };
    let examQuery = { type: 'exam', school: req.user.school };

    if (req.user.role === 'student') {
      query.student = req.user.id;
    } else if (req.user.role === 'teacher') {
      examQuery.teacher = req.user.id;
    }

    const exams = await Exam.find(examQuery).select('_id');
    query.exam = { $in: exams.map(e => e._id) };

    const submissions = await Submission.find(query)
      .populate('exam', 'title type subject classes totalPoints school')
      .populate('student', 'fullName registrationNumber')
      .populate('enrollment', 'class school')
      .lean();

    res.json({ success: true, results: submissions, message: 'Exam results retrieved successfully' });
  } catch (error) {
    logger.error('getExamResults error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving exam results' });
  }
};

// Get homework results
submissionController.getHomeworkResults = async (req, res) => {
  try {
    let query = { isDeleted: false };
    let examQuery = { type: 'homework', school: req.user.school };

    if (req.user.role === 'student') {
      query.student = req.user.id;
    } else if (req.user.role === 'teacher') {
      examQuery.teacher = req.user.id;
    }

    const exams = await Exam.find(examQuery).select('_id');
    query.exam = { $in: exams.map(e => e._id) };

    const submissions = await Submission.find(query)
      .populate('exam', 'title type subject classes totalPoints school')
      .populate('student', 'fullName registrationNumber')
      .populate('enrollment', 'class school')
      .lean();

    res.json({ success: true, results: submissions, message: 'Homework results retrieved successfully' });
  } catch (error) {
    logger.error('getHomeworkResults error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving homework results' });
  }
};

// Get quiz results
submissionController.getQuizResults = async (req, res) => {
  try {
    let query = { isDeleted: false };
    let examQuery = { type: 'quiz', school: req.user.school };

    if (req.user.role === 'student') {
      query.student = req.user.id;
    } else if (req.user.role === 'teacher') {
      examQuery.teacher = req.user.id;
    }

    const exams = await Exam.find(examQuery).select('_id');
    query.exam = { $in: exams.map(e => e._id) };

    const submissions = await Submission.find(query)
      .populate('exam', 'title type subject classes totalPoints school')
      .populate('student', 'fullName registrationNumber')
      .populate('enrollment', 'class school')
      .lean();

    res.json({ success: true, results: submissions, message: 'Quiz results retrieved successfully' });
  } catch (error) {
    logger.error('getQuizResults error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving quiz results' });
  }
};

// Get combined results
submissionController.getCombinedResults = async (req, res) => {
  try {
    let query = { isDeleted: false };
    let examQuery = { school: req.user.school };

    if (req.user.role === 'student') {
      query.student = req.user.id;
    } else if (req.user.role === 'teacher') {
      examQuery.teacher = req.user.id;
    }

    const exams = await Exam.find(examQuery).select('_id');
    query.exam = { $in: exams.map(e => e._id) };

    const submissions = await Submission.find(query)
      .populate('exam', 'title type subject classes totalPoints school')
      .populate('student', 'fullName registrationNumber')
      .populate('enrollment', 'class school')
      .lean();

    res.json({ success: true, results: submissions, message: 'Combined results retrieved successfully' });
  } catch (error) {
    logger.error('getCombinedResults error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving combined results' });
  }
};

// Get a specific student's results by assessment type (for teachers)
submissionController.getStudentResultsByAssessmentType = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in getStudentResultsByAssessmentType', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { studentId, type } = req.query;
    const student = await User.findOne({ _id: studentId, school: req.user.school });
    if (!student || student.role !== 'student') {
      return res.status(404).json({ success: false, message: 'Student not found in your school' });
    }

    const exams = await Exam.find({ teacher: req.user.id, school: req.user.school, type }).select('_id');
    const submissions = await Submission.find({
      student: studentId,
      exam: { $in: exams.map(e => e._id) },
      isDeleted: false
    })
      .populate('exam', 'title type subject classes totalPoints school')
      .populate('student', 'fullName registrationNumber')
      .populate('enrollment', 'class school')
      .lean();

    res.json({ success: true, results: submissions, message: `${type} results for student retrieved successfully` });
  } catch (error) {
    logger.error('getStudentResultsByAssessmentType error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving student results' });
  }
};

// Get marks for a specific student by ID
submissionController.getStudentMarksByID = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in getStudentMarksByID', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { studentId } = req.query;
    const student = await User.findOne({ _id: studentId, school: req.user.school });
    if (!student || student.role !== 'student') {
      return res.status(404).json({ success: false, message: 'Student not found in your school' });
    }

    const exams = await Exam.find({ teacher: req.user.id, school: req.user.school }).select('_id');
    const submissions = await Submission.find({
      student: studentId,
      exam: { $in: exams.map(e => e._id) },
      isDeleted: false
    })
      .populate('exam', 'title type subject classes totalPoints school')
      .populate('student', 'fullName registrationNumber')
      .populate('enrollment', 'class school')
      .lean();

    res.json({ success: true, results: submissions, message: 'Student marks retrieved successfully' });
  } catch (error) {
    logger.error('getStudentMarksByID error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving student marks' });
  }
};

// Get marks for the currently logged-in student
submissionController.getMyMarks = async (req, res) => {
  try {
    const submissions = await Submission.find({
      student: req.user.id,
      isDeleted: false
    })
      .populate({
        path: 'exam',
        match: { school: req.user.school },
        select: 'title type subject classes totalPoints school'
      })
      .populate('student', 'fullName registrationNumber')
      .populate('enrollment', 'class school')
      .lean();

    // Filter out submissions where exam is null (due to school mismatch)
    const filteredSubmissions = submissions.filter(sub => sub.exam);

    res.json({ success: true, results: filteredSubmissions, message: 'Your marks retrieved successfully' });
  } catch (error) {
    logger.error('getMyMarks error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving your marks' });
  }
};

module.exports = submissionController;