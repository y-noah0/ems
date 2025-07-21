const Submission = require('../models/Submission');
const Exam = require('../models/Exam');
const Enrollment = require('../models/enrollment');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const winston = require('winston');

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

const submissionController = {};

// Helper: calculate time remaining
const calculateTimeRemaining = (submission, exam) => {
  const now = new Date();
  const startedAt = new Date(submission.startedAt);
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
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { examId } = req.body;
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }
    if (exam.status === 'scheduled' && exam.schedule && new Date(exam.schedule.start) <= new Date()) {
      exam.status = 'active';
      await exam.save();
      req.io.to('admins').emit('exam-status-changed', {
        examId: exam._id,
        title: exam.title,
        status: exam.status,
        updatedAt: exam.updatedAt,
      });
      // Notify teacher, deans, headmasters of status change
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
    if (exam.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Exam is not active' });
    }
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      isActive: true,
      isDeleted: false,
    });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'No active enrollment found' });
    }
    if (!exam.classes.map(id => id.toString()).includes(enrollment.class.toString())) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this exam\'s class' });
    }
    const existing = await Submission.findOne({
      exam: examId,
      student: req.user.id,
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
      answers,
      startedAt: new Date(),
      status: 'in-progress',
      violations: 0,
      totalScore: 0,
      percentage: 0,
      timeSpent: 0,
    });
    await submission.save();

    // Emit Socket.IO event to admins and notify teacher, deans, headmasters
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
    logger.error('startExam error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while starting the exam' });
  }
};

// Save answers (auto-save)
submissionController.saveAnswers = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { submissionId, answers } = req.body;
    const submission = await Submission.findOne({
      _id: submissionId,
      student: req.user.id,
      isDeleted: false,
    });
    if (!submission || submission.status !== 'in-progress') {
      return res.status(400).json({ success: false, message: 'Submission not found or exam is not in progress' });
    }
    if (answers && Array.isArray(answers)) {
      answers.forEach(answer => {
        const idx = submission.answers.findIndex(a => a.questionId.toString() === answer.questionId);
        if (idx !== -1) {
          submission.answers[idx].answer = answer.answer || '';
          submission.answers[idx].timeSpent = parseInt(answer.timeSpent) || 0;
        }
      });
    }
    submission.autoSaves.push({ timestamp: new Date(), data: answers });
    await submission.save();

    // Emit Socket.IO event to admins
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
    logger.error('saveAnswers error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while saving answers' });
  }
};

// Submit exam
submissionController.submitExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { submissionId, answers } = req.body;
    const submission = await Submission.findOne({
      _id: submissionId,
      student: req.user.id,
      isDeleted: false,
    });
    if (!submission || submission.status !== 'in-progress') {
      return res.status(400).json({ success: false, message: 'Submission not found or exam is not in progress' });
    }
    if (answers && Array.isArray(answers)) {
      answers.forEach(answer => {
        const idx = submission.answers.findIndex(a => a.questionId.toString() === answer.questionId);
        if (idx !== -1) {
          submission.answers[idx].answer = answer.answer || '';
          submission.answers[idx].timeSpent = parseInt(answer.timeSpent) || 0;
        }
      });
    }
    submission.status = 'submitted';
    submission.submittedAt = new Date();
    await submission.save();

    // Emit Socket.IO event to admins and notify teacher, deans, headmasters
    const student = await User.findById(req.user.id).select('fullName');
    req.io.to(`exam:${submission.exam}`).emit('submission-completed', {
      examId: submission.exam,
      submissionId: submission._id,
      studentId: req.user.id,
      studentName: student.fullName,
      submittedAt: submission.submittedAt,
    });
    req.io.emit('notify-submission', {
      examId: submission.exam,
      submissionId: submission._id,
      studentId: req.user.id,
      studentName: student.fullName,
      status: 'submitted',
    });

    res.json({ success: true, message: 'Exam submitted successfully', submission });
  } catch (error) {
    logger.error('submitExam error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while submitting the exam' });
  }
};

// Auto-submit exam (violations or time expiry)
submissionController.autoSubmitExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { submissionId, reason } = req.body;
    const submission = await Submission.findOne({
      _id: submissionId,
      student: req.user.id,
      isDeleted: false,
    });
    if (!submission || submission.status !== 'in-progress') {
      return res.status(400).json({ success: false, message: 'Submission not found or exam is not in progress' });
    }
    if (reason && reason.answers && Array.isArray(reason.answers)) {
      reason.answers.forEach(answer => {
        const idx = submission.answers.findIndex(a => a.questionId.toString() === answer.questionId);
        if (idx !== -1) {
          submission.answers[idx].answer = answer.answer || '';
          submission.answers[idx].timeSpent = parseInt(answer.timeSpent) || 0;
        }
      });
    }
    submission.status = 'auto-submitted';
    submission.submittedAt = new Date();
    if (reason) {
      submission.violationLogs.push({
        type: reason.type || 'other',
        timestamp: new Date(),
        details: reason.details || 'Auto-submitted due to time expiry or violation',
      });
    }
    await submission.save();

    // Emit Socket.IO event to admins and notify teacher, deans, headmasters
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
    logger.error('autoSubmitExam error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while auto-submitting the exam' });
  }
};

// Log violation
submissionController.logViolation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { submissionId, violationType, details } = req.body;
    const submission = await Submission.findOne({
      _id: submissionId,
      student: req.user.id,
      isDeleted: false,
    });
    if (!submission || submission.status !== 'in-progress') {
      return res.status(400).json({ success: false, message: 'Submission not found or exam is not in progress' });
    }
    submission.violations += 1;
    submission.violationLogs.push({
      type: violationType,
      timestamp: new Date(),
      details: details || 'No additional details provided',
    });
    const violationThreshold = 2;
    let shouldAutoSubmit = false;
    if (submission.violations >= violationThreshold) {
      submission.status = 'auto-submitted';
      submission.submittedAt = new Date();
      shouldAutoSubmit = true;
    }
    await submission.save();

    // Emit Socket.IO events
    const student = await User.findById(req.user.id).select('fullName');
    req.io.to(`exam:${submission.exam}`).emit('violation-logged', {
      examId: submission.exam,
      submissionId: submission._id,
      studentId: req.user.id,
      studentName: student.fullName,
      violationType,
      details,
      violations: submission.violations,
      timestamp: new Date(),
    });
    req.io.emit('notify-violation', {
      examId: submission.exam,
      submissionId: submission._id,
      studentId: req.user.id,
      studentName: student.fullName,
      violationType,
      details,
    });

    if (shouldAutoSubmit) {
      req.io.to(`exam:${submission.exam}`).emit('submission-auto-submitted', {
        examId: submission.exam,
        submissionId: submission._id,
        studentId: req.user.id,
        studentName: student.fullName,
        submittedAt: submission.submittedAt,
        reason: 'Violation threshold exceeded',
      });
      req.io.emit('notify-submission', {
        examId: submission.exam,
        submissionId: submission._id,
        studentId: req.user.id,
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
    logger.error('logViolation error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while logging violation' });
  }
};

// Monitor exam (real-time active submissions)
submissionController.monitorExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { examId } = req.params;
    const exam = await Exam.findById(examId).select('teacher school status');
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }
    // Check authorization
    if (req.user.role === 'teacher' && exam.teacher.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You are not authorized to monitor this exam' });
    }
    if (['dean', 'headmaster'].includes(req.user.role)) {
      const user = await User.findById(req.user.id).select('school');
      if (user.school.toString() !== exam.school.toString()) {
        return res.status(403).json({ success: false, message: 'You are not authorized to monitor exams from this school' });
      }
    }
    if (exam.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Exam is not currently active' });
    }
    const submissions = await Submission.find({
      exam: examId,
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
    logger.error('monitorExam error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while monitoring exam' });
  }
};

// Get student's submissions
submissionController.getStudentSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({
      student: req.user.id,
      isDeleted: false,
    })
      .populate('exam', 'title type')
      .lean();
    res.json({ success: true, submissions, message: 'Submissions retrieved successfully' });
  } catch (error) {
    logger.error('getStudentSubmissions error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving submissions' });
  }
};

// Get all submissions for teacher's exams
submissionController.getTeacherSubmissions = async (req, res) => {
  try {
    const exams = await Exam.find({ teacher: req.user.id }).select('_id');
    const submissions = await Submission.find({
      exam: { $in: exams.map(e => e._id) },
      isDeleted: false,
    })
      .populate('exam', 'title type')
      .populate('student', 'fullName')
      .lean();
    res.json({ success: true, submissions, message: 'Teacher submissions retrieved successfully' });
  } catch (error) {
    logger.error('getTeacherSubmissions error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving teacher submissions' });
  }
};

// Get submissions for an exam (teacher view)
submissionController.getExamSubmissions = async (req, res) => {
  try {
    const { examId } = req.params;
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }
    if (exam.teacher.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You are not authorized to view submissions for this exam' });
    }
    const submissions = await Submission.find({
      exam: examId,
      isDeleted: false,
    })
      .populate('student', 'fullName')
      .lean();
    res.json({ success: true, submissions, message: 'Exam submissions retrieved successfully' });
  } catch (error) {
    logger.error('getExamSubmissions error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving exam submissions' });
  }
};

// Grade open questions
submissionController.gradeOpenQuestions = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { submissionId } = req.params;
    const { grades } = req.body;
    const submission = await Submission.findById(submissionId).populate('exam');
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }
    if (submission.exam.teacher.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You are not authorized to grade this submission' });
    }
    let totalScore = 0;
    grades.forEach(grade => {
      const idx = submission.answers.findIndex(a => a.questionId.toString() === grade.questionId);
      if (idx !== -1) {
        submission.answers[idx].score = parseInt(grade.score) || 0;
        totalScore += submission.answers[idx].score;
      }
    });
    const maxScore = submission.exam.questions.reduce((sum, q) => sum + q.maxScore, 0);
    submission.totalScore = totalScore;
    submission.percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    submission.gradeLetter = calculateGradeLetter(submission.percentage);
    await submission.save();

    // Emit Socket.IO event to admins
    req.io.to(`exam:${submission.exam._id}`).emit('submission-graded', {
      examId: submission.exam._id,
      submissionId: submission._id,
      studentId: submission.student,
      totalScore: submission.totalScore,
      percentage: submission.percentage,
      gradeLetter: submission.gradeLetter,
      gradedAt: new Date(),
    });

    res.json({ success: true, submission, message: 'Submission graded successfully' });
  } catch (error) {
    logger.error('gradeOpenQuestions error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while grading submission' });
  }
};

// Get student's exam results by term
submissionController.getStudentResultsByTerm = async (req, res) => {
  try {
    const { termId } = req.query;
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      term: termId,
      isActive: true,
      isDeleted: false,
    });
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'No active enrollment found for the specified term' });
    }
    const submissions = await Submission.find({
      student: req.user.id,
      enrollment: enrollment._id,
      isDeleted: false,
    })
      .populate('exam', 'title type subject')
      .lean();
    res.json({ success: true, results: submissions, message: 'Results retrieved successfully' });
  } catch (error) {
    logger.error('getStudentResultsByTerm error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving results' });
  }
};

// Get submission details
submissionController.getSubmissionDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const submission = await Submission.findById(id)
      .populate('exam', 'title type questions')
      .populate('student', 'fullName')
      .lean();
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
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
    logger.error('getSubmissionDetails error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving submission details' });
  }
};

// Get homework results
submissionController.getHomeworkResults = async (req, res) => {
  try {
    let query = { 'exam.type': 'homework', isDeleted: false };
    if (req.user.role === 'student') {
      query.student = req.user.id;
    } else if (req.user.role === 'teacher') {
      const exams = await Exam.find({ teacher: req.user.id, type: 'homework' }).select('_id');
      query.exam = { $in: exams.map(e => e._id) };
    }
    const submissions = await Submission.find(query)
      .populate('exam', 'title subject')
      .populate('student', 'fullName')
      .lean();
    res.json({ success: true, results: submissions, message: 'Homework results retrieved successfully' });
  } catch (error) {
    logger.error('getHomeworkResults error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving homework results' });
  }
};

// Get quiz results
submissionController.getQuizResults = async (req, res) => {
  try {
    let query = { 'exam.type': 'quiz', isDeleted: false };
    if (req.user.role === 'student') {
      query.student = req.user.id;
    } else if (req.user.role === 'teacher') {
      const exams = await Exam.find({ teacher: req.user.id, type: 'quiz' }).select('_id');
      query.exam = { $in: exams.map(e => e._id) };
    }
    const submissions = await Submission.find(query)
      .populate('exam', 'title subject')
      .populate('student', 'fullName')
      .lean();
    res.json({ success: true, results: submissions, message: 'Quiz results retrieved successfully' });
  } catch (error) {
    logger.error('getQuizResults error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving quiz results' });
  }
};

// Get results by assessment type
submissionController.getResultsByAssessmentType = async (req, res) => {
  try {
    const { type } = req.query;
    if (!['assessment1', 'assessment2', 'exam', 'homework', 'quiz'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid assessment type' });
    }
    let query = { 'exam.type': type, isDeleted: false };
    if (req.user.role === 'student') {
      query.student = req.user.id;
    } else if (req.user.role === 'teacher') {
      const exams = await Exam.find({ teacher: req.user.id, type }).select('_id');
      query.exam = { $in: exams.map(e => e._id) };
    }
    const submissions = await Submission.find(query)
      .populate('exam', 'title subject')
      .populate('student', 'fullName')
      .lean();
    res.json({ success: true, results: submissions, message: `${type} results retrieved successfully` });
  } catch (error) {
    logger.error('getResultsByAssessmentType error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving results' });
  }
};

// Get combined detailed results
submissionController.getCombinedDetailedResults = async (req, res) => {
  try {
    let query = { isDeleted: false };
    if (req.user.role === 'student') {
      query.student = req.user.id;
    } else if (req.user.role === 'teacher') {
      const exams = await Exam.find({ teacher: req.user.id }).select('_id');
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
    logger.error('getCombinedDetailedResults error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving detailed results' });
  }
};

// Get Assessment 1 results
submissionController.getAssessment1Results = async (req, res) => {
  try {
    let query = { 'exam.type': 'assessment1', isDeleted: false };
    if (req.user.role === 'student') {
      query.student = req.user.id;
    } else if (req.user.role === 'teacher') {
      const exams = await Exam.find({ teacher: req.user.id, type: 'assessment1' }).select('_id');
      query.exam = { $in: exams.map(e => e._id) };
    }
    const submissions = await Submission.find(query)
      .populate('exam', 'title subject')
      .populate('student', 'fullName')
      .lean();
    res.json({ success: true, results: submissions, message: 'Assessment 1 results retrieved successfully' });
  } catch (error) {
    logger.error('getAssessment1Results error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving Assessment 1 results' });
  }
};

// Get Assessment 2 results
submissionController.getAssessment2Results = async (req, res) => {
  try {
    let query = { 'exam.type': 'assessment2', isDeleted: false };
    if (req.user.role === 'student') {
      query.student = req.user.id;
    } else if (req.user.role === 'teacher') {
      const exams = await Exam.find({ teacher: req.user.id, type: 'assessment2' }).select('_id');
      query.exam = { $in: exams.map(e => e._id) };
    }
    const submissions = await Submission.find(query)
      .populate('exam', 'title subject')
      .populate('student', 'fullName')
      .lean();
    res.json({ success: true, results: submissions, message: 'Assessment 2 results retrieved successfully' });
  } catch (error) {
    logger.error('getAssessment2Results error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving Assessment 2 results' });
  }
};

// Get Exam results
submissionController.getExamResults = async (req, res) => {
  try {
    let query = { 'exam.type': 'exam', isDeleted: false };
    if (req.user.role === 'student') {
      query.student = req.user.id;
    } else if (req.user.role === 'teacher') {
      const exams = await Exam.find({ teacher: req.user.id, type: 'exam' }).select('_id');
      query.exam = { $in: exams.map(e => e._id) };
    }
    const submissions = await Submission.find(query)
      .populate('exam', 'title subject')
      .populate('student', 'fullName')
      .lean();
    res.json({ success: true, results: submissions, message: 'Exam results retrieved successfully' });
  } catch (error) {
    logger.error('getExamResults error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving exam results' });
  }
};

// Get combined results
submissionController.getCombinedResults = async (req, res) => {
  try {
    let query = { isDeleted: false };
    if (req.user.role === 'student') {
      query.student = req.user.id;
    } else if (req.user.role === 'teacher') {
      const exams = await Exam.find({ teacher: req.user.id }).select('_id');
      query.exam = { $in: exams.map(e => e._id) };
    }
    const submissions = await Submission.find(query)
      .populate('exam', 'title type subject')
      .populate('student', 'fullName')
      .lean();
    res.json({ success: true, results: submissions, message: 'Combined results retrieved successfully' });
  } catch (error) {
    logger.error('getCombinedResults error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving combined results' });
  }
};

// Get a specific student's results by assessment type (for teachers)
submissionController.getStudentResultsByAssessmentType = async (req, res) => {
  try {
    const { studentId, type } = req.query;
    if (!['assessment1', 'assessment2', 'exam', 'homework', 'quiz'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid assessment type' });
    }
    const exams = await Exam.find({ teacher: req.user.id, type }).select('_id');
    const submissions = await Submission.find({
      student: studentId,
      exam: { $in: exams.map(e => e._id) },
      isDeleted: false,
    })
      .populate('exam', 'title subject')
      .populate('student', 'fullName')
      .lean();
    res.json({ success: true, results: submissions, message: `${type} results for student retrieved successfully` });
  } catch (error) {
    logger.error('getStudentResultsByAssessmentType error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving student results' });
  }
};

// Get marks for a specific student by ID
submissionController.getStudentMarksByID = async (req, res) => {
  try {
    const { studentId } = req.query;
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    const submissions = await Submission.find({
      student: studentId,
      isDeleted: false,
    })
      .populate('exam', 'title type subject')
      .lean();
    res.json({ success: true, results: submissions, message: 'Student marks retrieved successfully' });
  } catch (error) {
    logger.error('getStudentMarksByID error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving student marks' });
  }
};

// Update submission grades
submissionController.updateSubmissionGrades = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { submissionId } = req.params;
    const { grades } = req.body;
    const submission = await Submission.findById(submissionId).populate('exam');
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }
    if (submission.exam.teacher.toString() !== req.user.id && !['dean', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'You are not authorized to grade this submission' });
    }
    let totalScore = 0;
    grades.forEach(grade => {
      const idx = submission.answers.findIndex(a => a.questionId.toString() === grade.questionId);
      if (idx !== -1) {
        submission.answers[idx].score = parseInt(grade.score) || 0;
        totalScore += submission.answers[idx].score;
      }
    });
    const maxScore = submission.exam.questions.reduce((sum, q) => sum + q.maxScore, 0);
    submission.totalScore = totalScore;
    submission.percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    submission.gradeLetter = calculateGradeLetter(submission.percentage);
    await submission.save();

    // Emit Socket.IO event to admins
    req.io.to(`exam:${submission.exam._id}`).emit('submission-graded', {
      examId: submission.exam._id,
      submissionId: submission._id,
      studentId: submission.student,
      totalScore: submission.totalScore,
      percentage: submission.percentage,
      gradeLetter: submission.gradeLetter,
      gradedAt: new Date(),
    });

    res.json({ success: true, submission, message: 'Grades updated successfully' });
  } catch (error) {
    logger.error('updateSubmissionGrades error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while updating grades' });
  }
};

// Get marks for the currently logged-in student
submissionController.getMyMarks = async (req, res) => {
  try {
    const submissions = await Submission.find({
      student: req.user.id,
      isDeleted: false,
    })
      .populate('exam', 'title type subject')
      .lean();
    res.json({ success: true, results: submissions, message: 'Your marks retrieved successfully' });
  } catch (error) {
    logger.error('getMyMarks error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving your marks' });
  }
};

module.exports = submissionController;