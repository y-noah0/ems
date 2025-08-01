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
  check('schoolId').isMongoId().withMessage('Valid school ID is required'),
  check('examId').isMongoId().withMessage('Valid exam ID is required')
];

const validateSaveAnswers = [
  check('schoolId').isMongoId().withMessage('Valid school ID is required'),
  check('submissionId').isMongoId().withMessage('Valid submission ID is required'),
  check('answers').optional().isArray().withMessage('Answers must be an array'),
  check('answers.*.questionId').optional().isMongoId().withMessage('Invalid question ID format'),
  check('answers.*.answer').optional().isString().withMessage('Answer must be a string'),
  check('answers.*.timeSpent').optional().isInt({ min: 0 }).withMessage('Time spent must be a non-negative integer')
];

const validateSubmitExam = [
  check('schoolId').isMongoId().withMessage('Valid school ID is required'),
  check('submissionId').isMongoId().withMessage('Valid submission ID is required'),
  check('answers').optional().isArray().withMessage('Answers must be an array'),
  check('answers.*.questionId').optional().isMongoId().withMessage('Invalid question ID format'),
  check('answers.*.answer').optional().isString().withMessage('Answer must be a string'),
  check('answers.*.timeSpent').optional().isInt({ min: 0 }).withMessage('Time spent must be a non-negative integer')
];

const validateAutoSubmitExam = [
  check('schoolId').isMongoId().withMessage('Valid school ID is required'),
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
  check('schoolId').isMongoId().withMessage('Valid school ID is required'),
  check('submissionId').isMongoId().withMessage('Valid submission ID is required'),
  check('violationType').notEmpty().withMessage('Violation type is required'),
  check('details').optional().isString().withMessage('Details must be a string')
];

const validateGradeOpenQuestions = [
  check('schoolId').isMongoId().withMessage('Valid school ID is required'),
  check('submissionId').isMongoId().withMessage('Valid submission ID is required'),
  check('grades').isArray({ min: 1 }).withMessage('At least one grade is required'),
  check('grades.*.questionId').isMongoId().withMessage('Invalid question ID format'),
  check('grades.*.score').isInt({ min: 0 }).withMessage('Score must be a non-negative integer'),
  check('grades.*.feedback').optional().isString().withMessage('Feedback must be a string'),
  check('feedback').optional().isString().withMessage('Feedback must be a string')
];

const validateUpdateSubmissionGrades = [
  check('schoolId').isMongoId().withMessage('Valid school ID is required'),
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

// Start exam (create submission)
submissionController.startExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in startExam', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { schoolId, examId } = req.body;

    // Verify user's school matches provided schoolId
    if (req.user.school.toString() !== schoolId) {
      logger.warn('School ID mismatch', { userId: req.user.id, schoolId, userSchool: req.user.school });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to start exams for this school'
      });
    }

    const exam = await validateEntity(Exam, examId, 'Exam', schoolId);
    if (exam.status === 'scheduled' && exam.schedule && new Date(exam.schedule.start) <= new Date()) {
      exam.status = 'active';
      await exam.save();
      req.io.to(`school:${schoolId}:admins`).emit('exam-status-changed', {
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
      req.io.to(`school:${schoolId}:dean`).emit('exam-status-changed', {
        examId: exam._id,
        title: exam.title,
        status: exam.status,
        updatedAt: exam.updatedAt,
      });
      req.io.to(`school:${schoolId}:headmaster`).emit('exam-status-changed', {
        examId: exam._id,
        title: exam.title,
        status: exam.status,
        updatedAt: exam.updatedAt,
      });
    }

    if (exam.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Exam is not active' });
    }

    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      school: schoolId,
      isActive: true,
      isDeleted: false,
    });

    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'No active enrollment found for this school' });
    }

    if (!exam.classes.map(id => id.toString()).includes(enrollment.class.toString())) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this exam\'s class' });
    }

    const existing = await Submission.findOne({
      exam: examId,
      student: req.user.id,
      school: schoolId,
      isDeleted: false,
    });

    if (existing) {
      if (existing.status === 'in-progress') {
        return res.json({
          success: true,
          submission: existing,
          timeRemaining: calculateTimeRemaining(existing, exam),
          message: 'Exam already in progress',
        });
      }
      return res.status(400).json({ success: false, message: 'You have already submitted this exam' });
    }

    const answers = exam.questions.map(q => ({
      questionId: q._id,
      answer: '',
      score: 0,
      timeSpent: 0,
    }));

    const submission = new Submission({
      exam: examId,
      student: req.user.id,
      enrollment: enrollment._id,
      school: schoolId,
      answers,
      startedAt: new Date(),
      status: 'in-progress',
      violations: 0,
      totalScore: 0,
      percentage: 0,
      timeSpent: 0,
    });

    await submission.save();

    const student = await User.findById(req.user.id).select('fullName');
    req.io.to(`exam:${examId}`).emit('submission-started', {
      examId,
      submissionId: submission._id,
      studentId: req.user.id,
      studentName: student.fullName,
      startedAt: submission.startedAt,
    });
    req.io.emit('notify-exam-start', {
      examId,
      submissionId: submission._id,
      studentId: req.user.id,
      studentName: student.fullName,
    });

    res.status(201).json({
      success: true,
      submission,
      timeRemaining: exam.schedule.duration * 60 * 1000,
      message: 'Exam started successfully',
    });
  } catch (error) {
    logger.error('startExam error', { error: error.message, stack: error.stack, userId: req.user?.id });
    res.status(500).json({ success: false, message: 'Server error occurred while starting exam' });
  }
};

// Save answers (auto-save)
submissionController.saveAnswers = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in saveAnswers', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { schoolId, submissionId, answers } = req.body;

    if (req.user.school.toString() !== schoolId) {
      logger.warn('School ID mismatch', { userId: req.user.id, schoolId, userSchool: req.user.school });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to save answers for this school'
      });
    }

    const submission = await validateEntity(Submission, submissionId, 'Submission', schoolId);
    if (submission.status !== 'in-progress') {
      return res.status(400).json({ success: false, message: 'Submission not found or exam is not in progress' });
    }

    if (submission.student.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You are not authorized to save answers for this submission' });
    }

    if (answers && Array.isArray(answers)) {
      answers.forEach(answer => {
        const idx = submission.answers.findIndex(a => a.questionId.toString() === answer.questionId);
        if (idx !== -1) {
          submission.answers[idx].answer = sanitize(answer.answer) || '';
          submission.answers[idx].timeSpent = parseInt(answer.timeSpent) || 0;
        }
      });
    }

    submission.autoSaves.push({ timestamp: new Date(), data: answers });
    await submission.save();

    const student = await User.findById(req.user.id).select('fullName');
    req.io.to(`exam:${submission.exam}`).emit('answers-saved', {
      examId: submission.exam,
      submissionId: submission._id,
      studentId: req.user.id,
      studentName: student.fullName,
      lastSaved: new Date(),
    });

    res.json({ success: true, message: 'Answers saved successfully', lastSaved: new Date() });
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

    const { schoolId, submissionId, answers } = req.body;

    if (req.user.school.toString() !== schoolId) {
      logger.warn('School ID mismatch', { userId: req.user.id, schoolId, userSchool: req.user.school });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to submit exams for this school'
      });
    }

    const submission = await validateEntity(Submission, submissionId, 'Submission', schoolId);
    if (submission.status !== 'in-progress') {
      return res.status(400).json({ success: false, message: 'Submission not found or exam is not in progress' });
    }

    if (submission.student.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You are not authorized to submit this exam' });
    }

    if (answers && Array.isArray(answers)) {
      answers.forEach(answer => {
        const idx = submission.answers.findIndex(a => a.questionId.toString() === answer.questionId);
        if (idx !== -1) {
          submission.answers[idx].answer = sanitize(answer.answer) || '';
          submission.answers[idx].timeSpent = parseInt(answer.timeSpent) || 0;
        }
      });
    }

    submission.submittedAt = new Date();
    await autoGradeObjectiveQuestions(submission, submission.exam);
    await submission.save();

    await logAudit(
      'submission',
      submission._id,
      'submit',
      req.user.id,
      { status: 'in-progress' },
      { status: submission.status, submittedAt: submission.submittedAt, school: schoolId }
    );

    if (submission.status === 'graded') {
      await notificationService.sendGradeNotification(req.io, submission.student, submission);
    }

    try {
      const exam = await Exam.findById(submission.exam).populate('teacher', 'fullName email phone');
      const student = await User.findById(submission.student);

      try {
        if (exam.teacher.phone) {
          await sendSMS(
            exam.teacher.phone,
            `Student ${student.fullName} has submitted the exam "${exam.title}".`
          );
        }
      } catch (smsErr) {
        console.error(`Failed to send SMS to ${exam.teacher.phone}:`, smsErr.message);
      }

      try {
        if (exam.teacher.email) {
          await sendEmail(
            exam.teacher.email,
            'Exam Submission Notification',
            `Dear ${exam.teacher.fullName},\n\nStudent ${student.fullName} has submitted the exam "${exam.title}".`
          );
        }
      } catch (emailErr) {
        console.error(`Failed to send email to ${exam.teacher.email}:`, emailErr.message);
      }

      if (submission.status === 'graded') {
        try {
          if (student.phone) {
            await sendSMS(
              student.phone,
              `Your exam "${exam.title}" has been graded. Check your dashboard for details.`
            );
          }
        } catch (smsErr) {
          console.error(`Failed to send SMS to ${student.phone}:`, smsErr.message);
        }

        try {
          if (student.email) {
            await sendEmail(
              student.email,
              'Exam Graded Notification',
              `Dear ${student.fullName},\n\nYour exam "${exam.title}" has been graded. Please check your dashboard for your results.`
            );
          }
        } catch (emailErr) {
          console.error(`Failed to send email to ${student.email}:`, emailErr.message);
        }
      }
    } catch (notifyErr) {
      console.error('Error sending notifications:', notifyErr.message);
    }

    res.json({
      success: true,
      message: 'Exam submitted',
      submission,
      autoGraded: submission.status === 'graded'
    });
  } catch (error) {
    logger.error('submitExam error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while submitting the exam' });
  }
};

// Auto-submit exam (violations or time expiry)
submissionController.autoSubmitExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in autoSubmitExam', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { schoolId, submissionId, reason } = req.body;

    if (req.user.school.toString() !== schoolId) {
      logger.warn('School ID mismatch', { userId: req.user.id, schoolId, userSchool: req.user.school });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to auto-submit exams for this school'
      });
    }

    const submission = await validateEntity(Submission, submissionId, 'Submission', schoolId);
    if (submission.status !== 'in-progress') {
      return res.status(400).json({ success: false, message: 'Submission not found or exam is not in progress' });
    }

    if (submission.student.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You are not authorized to auto-submit this exam' });
    }

    if (reason && reason.answers && Array.isArray(reason.answers)) {
      reason.answers.forEach(answer => {
        const idx = submission.answers.findIndex(a => a.questionId.toString() === answer.questionId);
        if (idx !== -1) {
          submission.answers[idx].answer = sanitize(answer.answer) || '';
          submission.answers[idx].timeSpent = parseInt(answer.timeSpent) || 0;
        }
      });
    }

    submission.submittedAt = new Date();

    if (reason) {
      submission.violationLogs.push({
        type: reason.type || 'other',
        timestamp: new Date(),
        details: sanitize(reason.details) || 'Auto-submitted due to time expiry or violation',
      });
    }

    await autoGradeObjectiveQuestions(submission, submission.exam);
    if (submission.status !== 'graded') {
      submission.status = 'auto-submitted';
    }

    await submission.save();

    const student = await User.findById(req.user.id).select('fullName');
    req.io.to(`exam:${submission.exam}`).emit('submission-auto-submitted', {
      examId: submission.exam,
      submissionId: submission._id,
      studentId: req.user.id,
      studentName: student.fullName,
      submittedAt: submission.submittedAt,
      reason: reason?.details || 'Auto-submitted',
    });
    req.io.emit('notify-submission', {
      examId: submission.exam,
      submissionId: submission._id,
      studentId: req.user.id,
      studentName: student.fullName,
      status: 'auto-submitted',
    });

    res.json({ success: true, message: 'Exam auto-submitted successfully', submission });
  } catch (error) {
    logger.error('autoSubmitExam error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while auto-submitting the exam' });
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

    const { schoolId, submissionId, violationType, details } = req.body;

    if (req.user.school.toString() !== schoolId) {
      logger.warn('School ID mismatch', { userId: req.user.id, schoolId, userSchool: req.user.school });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to log violations for this school'
      });
    }

    const submission = await validateEntity(Submission, submissionId, 'Submission', schoolId);
    if (submission.status !== 'in-progress') {
      return res.status(400).json({ success: false, message: 'Submission not found or exam is not in progress' });
    }

    submission.violations += 1;
    submission.violationLogs.push({
      type: sanitize(violationType),
      timestamp: new Date(),
      details: sanitize(details) || 'No additional details provided',
    });

    const violationThreshold = 2;
    let shouldAutoSubmit = false;
    if (submission.violations >= violationThreshold) {
      submission.status = 'auto-submitted';
      submission.submittedAt = new Date();
      shouldAutoSubmit = true;
    }

    await submission.save();

    const student = await User.findById(submission.student).select('fullName');
    req.io.to(`exam:${submission.exam}`).emit('violation-logged', {
      examId: submission.exam,
      submissionId: submission._id,
      studentId: submission.student,
      studentName: student.fullName,
      violationType,
      details,
      violations: submission.violations,
      timestamp: new Date(),
    });
    req.io.emit('notify-violation', {
      examId: submission.exam,
      submissionId: submission._id,
      studentId: submission.student,
      studentName: student.fullName,
      violationType,
      details,
    });

    if (shouldAutoSubmit) {
      req.io.to(`exam:${submission.exam}`).emit('submission-auto-submitted', {
        examId: submission.exam,
        submissionId: submission._id,
        studentId: submission.student,
        studentName: student.fullName,
        submittedAt: submission.submittedAt,
        reason: 'Violation threshold exceeded',
      });
      req.io.emit('notify-submission', {
        examId: submission.exam,
        submissionId: submission._id,
        studentId: submission.student,
        studentName: student.fullName,
        status: 'auto-submitted',
      });
    }

    res.json({
      success: true,
      message: shouldAutoSubmit ? 'Violation threshold exceeded - exam auto-submitted' : 'Violation logged successfully',
      shouldAutoSubmit,
      violations: submission.violations,
    });
  } catch (error) {
    logger.error('logViolation error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while logging violation' });
  }
};

// Monitor exam (real-time active submissions)
submissionController.monitorExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in monitorExam', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { examId } = req.params;
    const exam = await validateEntity(Exam, examId, 'Exam', req.user.school);
    if (req.user.role === 'teacher' && exam.teacher.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You are not authorized to monitor this exam' });
    }
    if (['dean', 'headmaster'].includes(req.user.role) && exam.school.toString() !== req.user.school.toString()) {
      return res.status(403).json({ success: false, message: 'You are not authorized to monitor exams from this school' });
    }
    if (exam.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Exam is not currently active' });
    }

    const submissions = await Submission.find({
      exam: examId,
      school: req.user.school,
      status: 'in-progress',
      isDeleted: false,
    })
      .populate('student', 'fullName')
      .lean();

    const activeSubmissions = submissions.map(s => ({
      submissionId: s._id,
      studentId: s.student._id,
      studentName: s.student.fullName,
      startedAt: s.startedAt,
      timeSpent: s.timeSpent,
      violations: s.violations,
      timeRemaining: calculateTimeRemaining(s, exam),
    }));

    res.json({ success: true, examId, submissions: activeSubmissions, message: 'Active submissions retrieved successfully' });
  } catch (error) {
    logger.error('monitorExam error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while monitoring exam' });
  }
};

// Get student's submissions
submissionController.getStudentSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({
      student: req.user.id,
      school: req.user.school,
      isDeleted: false,
    })
      .populate('exam', 'title type')
      .lean();

    res.json({ success: true, submissions, message: 'Submissions retrieved successfully' });
  } catch (error) {
    logger.error('getStudentSubmissions error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving submissions' });
  }
};

// Get all submissions for teacher's exams
submissionController.getTeacherSubmissions = async (req, res) => {
  try {
    const exams = await Exam.find({ teacher: req.user.id, school: req.user.school }).select('_id');
    const submissions = await Submission.find({
      exam: { $in: exams.map(e => e._id) },
      school: req.user.school,
      isDeleted: false,
    })
      .populate('exam', 'title type')
      .populate('student', 'fullName')
      .lean();

    res.json({ success: true, submissions, message: 'Teacher submissions retrieved successfully' });
  } catch (error) {
    logger.error('getTeacherSubmissions error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving teacher submissions' });
  }
};

// Get submissions for an exam (teacher view)
submissionController.getExamSubmissions = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in getExamSubmissions', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { examId } = req.params;
    const exam = await validateEntity(Exam, examId, 'Exam', req.user.school);
    if (exam.teacher.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You are not authorized to view submissions for this exam' });
    }

    const submissions = await Submission.find({
      exam: examId,
      school: req.user.school,
      isDeleted: false,
    })
      .populate('student', 'fullName')
      .lean();

    res.json({ success: true, submissions, message: 'Exam submissions retrieved successfully' });
  } catch (error) {
    logger.error('getExamSubmissions error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving exam submissions' });
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

    const { schoolId, submissionId, grades, feedback } = req.body;

    if (req.user.school.toString() !== schoolId) {
      logger.warn('School ID mismatch', { userId: req.user.id, schoolId, userSchool: req.user.school });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to grade submissions for this school'
      });
    }

    const submission = await validateEntity(Submission, submissionId, 'Submission', schoolId);
    const exam = await validateEntity(Exam, submission.exam, 'Exam', schoolId);

    if (exam.teacher.toString() !== req.user.id && !['dean', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to grade this submission'
      });
    }

    const previousAnswers = JSON.parse(JSON.stringify(submission.answers));
    let totalScore = 0;
    let modified = false;

    grades.forEach(grade => {
      const idx = submission.answers.findIndex(a => a.questionId.toString() === grade.questionId);
      if (idx !== -1) {
        submission.answers[idx].score = parseInt(grade.score) || 0;
        submission.answers[idx].graded = true;
        submission.answers[idx].feedback = sanitize(grade.feedback) || submission.answers[idx].feedback || '';
        submission.answers[idx].gradedAt = new Date();
        submission.answers[idx].gradedBy = req.user.id;
        totalScore += submission.answers[idx].score;
        modified = true;
      }
    });

    if (!modified) {
      return res.status(400).json({
        success: false,
        message: 'No valid question grades provided'
      });
    }

    const maxScore = exam.questions.reduce((sum, q) => sum + q.maxScore, 0);
    submission.totalScore = totalScore;
    submission.percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    submission.gradeLetter = calculateGradeLetter(submission.percentage);
    submission.gradedBy = req.user.id;
    submission.ValuatedAt = new Date();

    if (submission.answers.every(a => a.graded)) {
      submission.status = 'graded';
    }

    await submission.save();

    await logAudit(
      'submission',
      submission._id,
      'grade',
      req.user.id,
      { answers: previousAnswers, status: submission.status !== 'graded' ? 'partially_graded' : null },
      { totalScore, percentage: submission.percentage, status: 'graded', school: schoolId }
    );

    if (submission.status === 'graded') {
      await notificationService.sendGradeNotification(req.io, submission.student, submission);

      try {
        const student = await User.findById(submission.student);
        try {
          if (student.phone) {
            await sendSMS(
              student.phone,
              `Your exam "${exam.title}" has been graded. Check your dashboard for details.`
            );
          }
        } catch (smsErr) {
          console.error(`Failed to send SMS to ${student.phone}:`, smsErr.message);
        }

        try {
          if (student.email) {
            await sendEmail(
              student.email,
              'Exam Graded Notification',
              `Dear ${student.fullName},\n\nYour exam "${exam.title}" has been graded. Please check your dashboard for your results.`
            );
          }
        } catch (emailErr) {
          console.error(`Failed to send email to ${student.email}:`, emailErr.message);
        }
      } catch (notifyErr) {
        console.error('Error notifying student:', notifyErr.message);
      }
    }

    res.json({ success: true, submission });
  } catch (error) {
    logger.error('gradeOpenQuestions error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Helper function to auto-grade multiple-choice and true-false questions
const autoGradeObjectiveQuestions = async (submission, examId) => {
  try {
    const exam = await validateEntity(Exam, examId, 'Exam', submission.school);
    let totalScore = 0;
    let autoGradedCount = 0;

    const questionsMap = {};
    exam.questions.forEach(q => {
      questionsMap[q._id.toString()] = q;
    });

    submission.answers.forEach((answer, index) => {
      const questionId = answer.questionId.toString();
      const question = questionsMap[questionId];

      if (question && ['multiple-choice', 'true-false'].includes(question.type)) {
        const studentAnswer = answer.answer;

        if (question.type === 'multiple-choice' && question.options) {
          const correctOption = question.options.find(opt => opt.isCorrect);
          if (correctOption) {
            if (studentAnswer === correctOption.text) {
              submission.answers[index].score = question.maxScore;
              submission.answers[index].graded = true;
              submission.answers[index].gradedAt = new Date();
              submission.answers[index].feedback = 'Auto-graded: Correct';
            } else {
              submission.answers[index].score = 0;
              submission.answers[index].graded = true;
              submission.answers[index].gradedAt = new Date();
              submission.answers[index].feedback = 'Auto-graded: Incorrect';
            }
            autoGradedCount++;
          }
        }

        if (question.type === 'true-false') {
          const correctAnswer = question.correctAnswer?.toString().toLowerCase();
          const studentAnswerLower = studentAnswer?.toString().toLowerCase();

          if (correctAnswer && (correctAnswer === studentAnswerLower)) {
            submission.answers[index].score = question.maxScore;
            submission.answers[index].graded = true;
            submission.answers[index].gradedAt = new Date();
            submission.answers[index].feedback = '應答正確';
          } else {
            submission.answers[index].score = 0;
            submission.answers[index].graded = true;
            submission.answers[index].gradedAt = new Date();
            submission.answers[index].feedback = '應答錯誤';
          }
          autoGradedCount++;
        }

        totalScore += submission.answers[index].score;
      }
    });

    const maxScore = exam.questions.reduce((sum, q) => sum + q.maxScore, 0);
    submission.totalScore = totalScore;
    submission.percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    submission.gradeLetter = calculateGradeLetter(submission.percentage);

    if (autoGradedCount === exam.questions.length) {
      submission.status = 'graded';
      submission.gradedAt = new Date();
    } else {
      submission.status = 'submitted';
    }

    return true;
  } catch (error) {
    logger.error('autoGradeObjectiveQuestions error', { error: error.message, stack: error.stack });
    return false;
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

    const { schoolId, submissionId, grades } = req.body;

    if (req.user.school.toString() !== schoolId) {
      logger.warn('School ID mismatch', { userId: req.user.id, schoolId, userSchool: req.user.school });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update grades for this school'
      });
    }

    const submission = await validateEntity(Submission, submissionId, 'Submission', schoolId);
    const exam = await validateEntity(Exam, submission.exam, 'Exam', schoolId);

    if (exam.teacher.toString() !== req.user.id && !['dean', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update grades for this submission'
      });
    }

    const previousAnswers = JSON.parse(JSON.stringify(submission.answers));
    let totalScore = 0;
    let modified = false;

    grades.forEach(grade => {
      const idx = submission.answers.findIndex(a => a.questionId.toString() === grade.questionId);
      if (idx !== -1) {
        submission.answers[idx].score = parseInt(grade.score) || 0;
        submission.answers[idx].graded = true;
        submission.answers[idx].feedback = sanitize(grade.feedback) || submission.answers[idx].feedback || '';
        submission.answers[idx].gradedAt = new Date();
        submission.answers[idx].gradedBy = req.user.id;
        totalScore += submission.answers[idx].score;
        modified = true;
      }
    });

    if (!modified) {
      return res.status(400).json({
        success: false,
        message: 'No valid question grades provided'
      });
    }

    const maxScore = exam.questions.reduce((sum, q) => sum + q.maxScore, 0);
    submission.totalScore = totalScore;
    submission.percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    submission.gradeLetter = calculateGradeLetter(submission.percentage);
    submission.gradedBy = req.user.id;
    submission.gradedAt = new Date();

    if (submission.answers.every(a => a.graded)) {
      submission.status = 'graded';
    }

    await submission.save();

    await logAudit(
      'submission',
      submission._id,
      'grade',
      req.user.id,
      { answers: previousAnswers },
      { totalScore, percentage: submission.percentage, school: schoolId }
    );

    req.io.to(`exam:${submission.exam}`).emit('submission-graded', {
      examId: submission.exam,
      submissionId: submission._id,
      studentId: submission.student,
      totalScore: submission.totalScore,
      percentage: submission.percentage,
      gradeLetter: submission.gradeLetter,
      gradedAt: new Date(),
    });

    res.json({ success: true, submission });
  } catch (error) {
    logger.error('updateSubmissionGrades error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get student's exam results by term
submissionController.getStudentResultsByTerm = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in getStudentResultsByTerm', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { termId } = req.query;
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      term: termId,
      school: req.user.school,
      isActive: true,
      isDeleted: false,
    });

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'No active enrollment found for the specified term and school' });
    }

    const submissions = await Submission.find({
      student: req.user.id,
      enrollment: enrollment._id,
      school: req.user.school,
      isDeleted: false,
    })
      .populate('exam', 'title type subject')
      .lean();

    res.json({ success: true, results: submissions, message: 'Results retrieved successfully' });
  } catch (error) {
    logger.error('getStudentResultsByTerm error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving results' });
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
      school: req.user.school,
      isDeleted: false
    })
      .populate('exam', 'title type questions')
      .populate('student', 'fullName')
      .lean();

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found or not in your school' });
    }

    if (req.user.role === 'student' && submission.student._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You are not authorized to view this submission' });
    }

    if (req.user.role === 'teacher') {
      const exam = await Exam.findById(submission.exam._id);
      if (exam.teacher.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'You are not authorized to view this submission' });
      }
    }

    if (req.user.role === 'student') {
      submission.exam.questions = submission.exam.questions.map(q => {
        const { correctAnswer, ...rest } = q;
        return rest;
      });
    }

    res.json({ success: true, submission, message: 'Submission details retrieved successfully' });
  } catch (error) {
    logger.error('getSubmissionDetails error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving submission details' });
  }
};

// Get homework results
submissionController.getHomeworkResults = async (req, res) => {
  try {
    let query = { 'exam.type': 'homework', school: req.user.school, isDeleted: false };
    if (req.user.role === 'student') {
      query.student = req.user.id;
    } else if (req.user.role === 'teacher') {
      const exams = await Exam.find({ teacher: req.user.id, school: req.user.school, type: 'homework' }).select('_id');
      query.exam = { $in: exams.map(e => e._id) };
    }

    const submissions = await Submission.find(query)
      .populate('exam', 'title subject')
      .populate('student', 'fullName')
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
    let query = { 'exam.type': 'quiz', school: req.user.school, isDeleted: false };
    if (req.user.role === 'student') {
      query.student = req.user.id;
    } else if (req.user.role === 'teacher') {
      const exams = await Exam.find({ teacher: req.user.id, school: req.user.school, type: 'quiz' }).select('_id');
      query.exam = { $in: exams.map(e => e._id) };
    }

    const submissions = await Submission.find(query)
      .populate('exam', 'title subject')
      .populate('student', 'fullName')
      .lean();

    res.json({ success: true, results: submissions, message: 'Quiz results retrieved successfully' });
  } catch (error) {
    logger.error('getQuizResults error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving quiz results' });
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
    let query = { 'exam.type': type, school: req.user.school, isDeleted: false };
    if (req.user.role === 'student') {
      query.student = req.user.id;
    } else if (req.user.role === 'teacher') {
      const exams = await Exam.find({ teacher: req.user.id, school: req.user.school, type }).select('_id');
      query.exam = { $in: exams.map(e => e._id) };
    }

    const submissions = await Submission.find(query)
      .populate('exam', 'title subject')
      .populate('student', 'fullName')
      .lean();

    res.json({ success: true, results: submissions, message: `${type} results retrieved successfully` });
  } catch (error) {
    logger.error('getResultsByAssessmentType error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving results' });
  }
};

// Get combined detailed results
submissionController.getCombinedDetailedResults = async (req, res) => {
  try {
    let query = { school: req.user.school, isDeleted: false };
    if (req.user.role === 'student') {
      query.student = req.user.id;
    } else if (req.user.role === 'teacher') {
      const exams = await Exam.find({ teacher: req.user.id, school: req.user.school }).select('_id');
      query.exam = { $in: exams.map(e => e._id) };
    }

    const submissions = await Submission.find(query)
      .populate('exam', 'title type subject')
      .populate('student', 'fullName')
      .lean();

    const results = submissions.reduce((acc, sub) => {
      const type = sub.exam.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push({
        examTitle: sub.exam.title,
        student: sub.student.fullName,
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
    let query = { 'exam.type': 'assessment1', school: req.user.school, isDeleted: false };
    if (req.user.role === 'student') {
      query.student = req.user.id;
    } else if (req.user.role === 'teacher') {
      const exams = await Exam.find({ teacher: req.user.id, school: req.user.school, type: 'assessment1' }).select('_id');
      query.exam = { $in: exams.map(e => e._id) };
    }

    const submissions = await Submission.find(query)
      .populate('exam', 'title subject')
      .populate('student', 'fullName')
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
    let query = { 'exam.type': 'assessment2', school: req.user.school, isDeleted: false };
    if (req.user.role === 'student') {
      query.student = req.user.id;
    } else if (req.user.role === 'teacher') {
      const exams = await Exam.find({ teacher: req.user.id, school: req.user.school, type: 'assessment2' }).select('_id');
      query.exam = { $in: exams.map(e => e._id) };
    }

    const submissions = await Submission.find(query)
      .populate('exam', 'title subject')
      .populate('student', 'fullName')
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
    let query = { 'exam.type': 'exam', school: req.user.school, isDeleted: false };
    if (req.user.role === 'student') {
      query.student = req.user.id;
    } else if (req.user.role === 'teacher') {
      const exams = await Exam.find({ teacher: req.user.id, school: req.user.school, type: 'exam' }).select('_id');
      query.exam = { $in: exams.map(e => e._id) };
    }

    const submissions = await Submission.find(query)
      .populate('exam', 'title subject')
      .populate('student', 'fullName')
      .lean();

    res.json({ success: true, results: submissions, message: 'Exam results retrieved successfully' });
  } catch (error) {
    logger.error('getExamResults error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving exam results' });
  }
};

// Get combined results
submissionController.getCombinedResults = async (req, res) => {
  try {
    let query = { school: req.user.school, isDeleted: false };
    if (req.user.role === 'student') {
      query.student = req.user.id;
    } else if (req.user.role === 'teacher') {
      const exams = await Exam.find({ teacher: req.user.id, school: req.user.school }).select('_id');
      query.exam = { $in: exams.map(e => e._id) };
    }

    const submissions = await Submission.find(query)
      .populate('exam', 'title type subject')
      .populate('student', 'fullName')
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
      school: req.user.school,
      isDeleted: false,
    })
      .populate('exam', 'title subject')
      .populate('student', 'fullName')
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

    const submissions = await Submission.find({
      student: studentId,
      school: req.user.school,
      isDeleted: false,
    })
      .populate('exam', 'title type subject')
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
      school: req.user.school,
      isDeleted: false,
    })
      .populate('exam', 'title type subject')
      .lean();

    res.json({ success: true, results: submissions, message: 'Your marks retrieved successfully' });
  } catch (error) {
    logger.error('getMyMarks error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving your marks' });
  }
};

module.exports = submissionController;