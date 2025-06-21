const Submission = require('../models/Submission');
const Exam = require('../models/Exam');
const Enrollment = require('../models/enrollment');
const Class = require('../models/Class');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const winston = require('winston');
const { validateEntity } = require('../utils/entityValidator');
const { logAudit } = require('../utils/auditLogger');
const { toUTC } = require('../utils/dateUtils');

// Logger setup
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

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
    }
    if (exam.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Exam is not active' });
    }
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      isActive: true,
      isDeleted: false
    });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'No active enrollment found' });
    }
    if (!exam.classes.map(id => id.toString()).includes(enrollment.class.toString())) {
      return res.status(403).json({ success: false, message: 'Not enrolled in this class' });
    }
    const existing = await Submission.findOne({
      exam: examId,
      student: req.user.id,
      isDeleted: false
    });
    if (existing) {
      if (existing.status === 'in-progress') {
        return res.json({
          success: true,
          submission: existing,
          timeRemaining: calculateTimeRemaining(existing, exam)
        });
      }
      return res.status(400).json({ success: false, message: 'Already submitted' });
    }
    const answers = exam.questions.map(q => ({
      questionId: q._id,
      answer: '',
      score: 0,
      timeSpent: 0
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
      timeSpent: 0
    });
    await submission.save();
    res.status(201).json({
      success: true,
      submission,
      timeRemaining: exam.schedule.duration * 60 * 1000
    });
  } catch (error) {
    logger.error('startExam error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
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
      isDeleted: false
    });
    if (!submission || submission.status !== 'in-progress') {
      return res.status(400).json({ success: false, message: 'Submission not found or not in progress' });
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
    res.json({ success: true, message: 'Answers saved', lastSaved: new Date() });
  } catch (error) {
    logger.error('saveAnswers error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
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
      isDeleted: false
    });
    if (!submission || submission.status !== 'in-progress') {
      return res.status(400).json({ success: false, message: 'Submission not found or not in progress' });
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
    res.json({ success: true, message: 'Exam submitted', submission });
  } catch (error) {
    logger.error('submitExam error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
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
      isDeleted: false
    });
    if (!submission || submission.status !== 'in-progress') {
      return res.status(400).json({ success: false, message: 'Submission not found or not in progress' });
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
        details: reason.details || 'Auto-submitted'
      });
    }
    await submission.save();
    res.json({ success: true, message: 'Exam auto-submitted', submission });
  } catch (error) {
    logger.error('autoSubmitExam error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
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
      isDeleted: false
    });
    if (!submission || submission.status !== 'in-progress') {
      return res.status(400).json({ success: false, message: 'Submission not found or not in progress' });
    }
    submission.violations += 1;
    submission.violationLogs.push({
      type: violationType,
      timestamp: new Date(),
      details: details || ''
    });
    const violationThreshold = 2;
    if (submission.violations >= violationThreshold) {
      submission.status = 'auto-submitted';
      submission.submittedAt = new Date();
      await submission.save();
      return res.json({
        success: true,
        message: 'Violation threshold exceeded - exam auto-submitted.',
        shouldAutoSubmit: true,
        violations: submission.violations
      });
    }
    await submission.save();
    res.json({
      success: true,
      message: 'Violation logged',
      shouldAutoSubmit: false,
      violations: submission.violations
    });
  } catch (error) {
    logger.error('logViolation error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get student's submissions
submissionController.getStudentSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({
      student: req.user.id,
      isDeleted: false
    })
      .populate('exam', 'title type')
      .lean();
    res.json({ success: true, submissions });
  } catch (error) {
    logger.error('getStudentSubmissions error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get all submissions for teacher's exams
submissionController.getTeacherSubmissions = async (req, res) => {
  try {
    const exams = await Exam.find({ teacher: req.user.id }).select('_id');
    const submissions = await Submission.find({
      exam: { $in: exams.map(e => e._id) },
      isDeleted: false
    })
      .populate('exam', 'title type')
      .populate('student', 'fullName')
      .lean();
    res.json({ success: true, submissions });
  } catch (error) {
    logger.error('getTeacherSubmissions error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
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
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    const submissions = await Submission.find({
      exam: examId,
      isDeleted: false
    })
      .populate('student', 'fullName')
      .lean();
    res.json({ success: true, submissions });
  } catch (error) {
    logger.error('getExamSubmissions error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
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
    const { grades, feedback } = req.body;
    
    try {
      const submission = await validateEntity(Submission, submissionId, 'Submission');
      const exam = await validateEntity(Exam, submission.exam, 'Exam');
      
      if (exam.teacher.toString() !== req.user.id && !['dean', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ 
          success: false, 
          message: 'You are not authorized to grade this submission' 
        });
      }
      
      // Create a copy of current answers for audit
      const previousAnswers = JSON.parse(JSON.stringify(submission.answers));
      
      let totalScore = 0;
      let modified = false;
      
      grades.forEach(grade => {
        const idx = submission.answers.findIndex(a => a.questionId.toString() === grade.questionId);
        if (idx !== -1) {
          submission.answers[idx].score = parseInt(grade.score) || 0;
          submission.answers[idx].graded = true;
          submission.answers[idx].feedback = grade.feedback || submission.answers[idx].feedback || '';
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
      
      // Log the grading action
      await logAudit(
        'submission',
        submission._id,
        'grade',
        req.user.id,
        { answers: previousAnswers, status: submission.status !== 'graded' ? 'partially_graded' : null },
        { totalScore, percentage: submission.percentage, status: 'graded' }
      );
      
      res.json({ success: true, submission });
    } catch (validationError) {
      return res.status(validationError.statusCode || 400).json({ 
        success: false, 
        message: validationError.message 
      });
    }
  } catch (error) {
    logger.error('gradeOpenQuestions error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
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
    
    try {
      const submission = await validateEntity(Submission, submissionId, 'Submission');
      const exam = await validateEntity(Exam, submission.exam, 'Exam');
      
      if (exam.teacher.toString() !== req.user.id && !['dean', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ 
          success: false, 
          message: 'You are not authorized to update grades for this submission' 
        });
      }
      
      // Create a copy of current answers for audit
      const previousAnswers = JSON.parse(JSON.stringify(submission.answers));
      
      let totalScore = 0;
      let modified = false;
      
      grades.forEach(grade => {
        const idx = submission.answers.findIndex(a => a.questionId.toString() === grade.questionId);
        if (idx !== -1) {
          submission.answers[idx].score = parseInt(grade.score) || 0;
          submission.answers[idx].graded = true;
          submission.answers[idx].feedback = grade.feedback || submission.answers[idx].feedback || '';
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
      
      // Log the update grading action
      await logAudit(
        'submission',
        submission._id,
        'grade',
        req.user.id,
        { answers: previousAnswers },
        { totalScore, percentage: submission.percentage }
      );
      
      res.json({ success: true, submission });
    } catch (validationError) {
      return res.status(validationError.statusCode || 400).json({ 
        success: false, 
        message: validationError.message 
      });
    }
  } catch (error) {
    logger.error('updateSubmissionGrades error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
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
      isDeleted: false
    });
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }
    const submissions = await Submission.find({
      student: req.user.id,
      enrollment: enrollment._id,
      isDeleted: false
    })
      .populate('exam', 'title type subject')
      .lean();
    res.json({ success: true, results: submissions });
  } catch (error) {
    logger.error('getStudentResultsByTerm error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
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
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    if (req.user.role === 'teacher') {
      const exam = await Exam.findById(submission.exam._id);
      if (exam.teacher.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    }
    if (req.user.role === 'student') {
      submission.exam.questions = submission.exam.questions.map(q => {
        const { correctAnswer, ...rest } = q;
        return rest;
      });
    }
    res.json({ success: true, submission });
  } catch (error) {
    logger.error('getSubmissionDetails error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
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
    res.json({ success: true, results: submissions });
  } catch (error) {
    logger.error('getHomeworkResults error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
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
    res.json({ success: true, results: submissions });
  } catch (error) {
    logger.error('getQuizResults error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
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
    res.json({ success: true, results: submissions });
  } catch (error) {
    logger.error('getResultsByAssessmentType error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
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
        gradeLetter: sub.gradeLetter
      });
      return acc;
    }, {});
    res.json({ success: true, results });
  } catch (error) {
    logger.error('getCombinedDetailedResults error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
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
    res.json({ success: true, results: submissions });
  } catch (error) {
    logger.error('getAssessment1Results error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
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
    res.json({ success: true, results: submissions });
  } catch (error) {
    logger.error('getAssessment2Results error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
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
    res.json({ success: true, results: submissions });
  } catch (error) {
    logger.error('getExamResults error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
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
    res.json({ success: true, results: submissions });
  } catch (error) {
    logger.error('getCombinedResults error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
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
      isDeleted: false
    })
      .populate('exam', 'title subject')
      .populate('student', 'fullName')
      .lean();
    res.json({ success: true, results: submissions });
  } catch (error) {
    logger.error('getStudentResultsByAssessmentType error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
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
      isDeleted: false
    })
      .populate('exam', 'title type subject')
      .lean();
    res.json({ success: true, results: submissions });
  } catch (error) {
    logger.error('getStudentMarksByID error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
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
    
    try {
      const submission = await validateEntity(Submission, submissionId, 'Submission');
      const exam = await validateEntity(Exam, submission.exam, 'Exam');
      
      if (exam.teacher.toString() !== req.user.id && !['dean', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ 
          success: false, 
          message: 'You are not authorized to update grades for this submission' 
        });
      }
      
      // Create a copy of current answers for audit
      const previousAnswers = JSON.parse(JSON.stringify(submission.answers));
      
      let totalScore = 0;
      let modified = false;
      
      grades.forEach(grade => {
        const idx = submission.answers.findIndex(a => a.questionId.toString() === grade.questionId);
        if (idx !== -1) {
          submission.answers[idx].score = parseInt(grade.score) || 0;
          submission.answers[idx].graded = true;
          submission.answers[idx].feedback = grade.feedback || submission.answers[idx].feedback || '';
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
      
      // Log the update grading action
      await logAudit(
        'submission',
        submission._id,
        'grade',
        req.user.id,
        { answers: previousAnswers },
        { totalScore, percentage: submission.percentage }
      );
      
      res.json({ success: true, submission });
    } catch (validationError) {
      return res.status(validationError.statusCode || 400).json({ 
        success: false, 
        message: validationError.message 
      });
    }
  } catch (error) {
    logger.error('updateSubmissionGrades error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get marks for the currently logged-in student
submissionController.getMyMarks = async (req, res) => {
  try {
    const submissions = await Submission.find({
      student: req.user.id,
      isDeleted: false
    })
      .populate('exam', 'title type subject')
      .lean();
    res.json({ success: true, results: submissions });
  } catch (error) {
    logger.error('getMyMarks error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = submissionController;