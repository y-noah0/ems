const Submission = require('../models/Submission');
const Exam = require('../models/Exam');
const { validationResult } = require('express-validator');
const winston = require('winston');

// --- Logger Configuration ---
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
// --- End Logger Configuration ---

const submissionController = {};

// Start exam (create submission)
submissionController.startExam = async (req, res) => {
  try {
    const { examId } = req.body;

    // Check if exam exists and is scheduled or active
    const exam = await Exam.findById(examId);
    if (!exam) {
      logger.warn('Exam not found in startExam', { examId, userId: req.user.id });
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const now = new Date();

    // Auto-activate if scheduled and time has come
    if (exam.status === 'scheduled' && exam.schedule && new Date(exam.schedule.start) <= now) {
      exam.status = 'active';
      await exam.save();
      logger.info('Exam auto-activated at scheduled time', { examId: exam._id, userId: req.user.id });
    }

    // Now allow only active exams
    if (exam.status !== 'active') {
      logger.warn('Exam not active or not ready to start', { examId, userId: req.user.id, status: exam.status });
      return res.status(400).json({ success: false, message: 'Exam is not active or not ready to start' });
    }

    // Check if student belongs to the exam class
    if (!exam.classes.map(id => id.toString()).includes(req.user.class.toString())) {
      logger.warn('Student not enrolled in any class for exam', { examId, userId: req.user.id, studentClass: req.user.class, examClasses: exam.classes });
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this class'
      });
    }

    // Check if student already has a submission for this exam
    const existingSubmission = await Submission.findOne({
      exam: examId,
      student: req.user.id
    });

    if (existingSubmission) {
      // If submission already exists but not submitted
      if (existingSubmission.status === 'in-progress') {
        logger.info('Returning existing in-progress submission', { submissionId: existingSubmission._id, userId: req.user.id });
        return res.json({
          success: true,
          submission: existingSubmission,
          timeRemaining: calculateTimeRemaining(existingSubmission, exam)
        });
      } else {
        logger.warn('Student already submitted exam', { examId, userId: req.user.id });
        return res.status(400).json({
          success: false,
          message: 'You have already submitted this exam'
        });
      }
    }

    // Create initial submission with empty answers
    const answers = exam.questions.map(question => ({
      questionId: question._id,
      answer: '',
      score: 0
    }));

    const newSubmission = new Submission({
      exam: examId,
      student: req.user.id,
      answers,
      startedAt: now,
      status: 'in-progress',
      violations: 0
    });

    await newSubmission.save();
    logger.info('Exam started, submission created', { submissionId: newSubmission._id, userId: req.user.id });

    // Calculate time remaining for the exam
    const timeRemaining = exam.schedule.duration * 60 * 1000; // Convert minutes to milliseconds

    res.status(201).json({
      success: true,
      submission: newSubmission,
      timeRemaining
    });
  } catch (error) {
    logger.error('Error in startExam', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Helper function to calculate time remaining
const calculateTimeRemaining = (submission, exam) => {
  const now = new Date();
  const startedAt = new Date(submission.startedAt);
  const duration = exam.schedule.duration * 60 * 1000; // Convert minutes to milliseconds
  const timeElapsed = now - startedAt;
  const timeRemaining = Math.max(0, duration - timeElapsed);
  return timeRemaining;
};

// Save answers (auto-save)
submissionController.saveAnswers = async (req, res) => {
  try {
    const { submissionId, answers } = req.body;

    // Check if submission exists and belongs to the student
    const submission = await Submission.findOne({
      _id: submissionId,
      student: req.user.id
    });

    if (!submission) {
      logger.warn('Submission not found or not owned by student in saveAnswers', { submissionId, userId: req.user.id });
      return res.status(404).json({
        success: false,
        message: 'Submission not found or not yours'
      });
    }

    // Check if submission is still in progress
    if (submission.status !== 'in-progress') {
      logger.warn('Submission not in progress in saveAnswers', { submissionId, userId: req.user.id });
      return res.status(400).json({
        success: false,
        message: 'Exam submission is no longer in progress'
      });
    }

    // Update answers
    if (answers && Array.isArray(answers)) {
      answers.forEach(answer => {
        const answerIndex = submission.answers.findIndex(
          a => a.questionId.toString() === answer.questionId
        );
        if (answerIndex !== -1) {
          submission.answers[answerIndex].answer = answer.answer;
        }
      });
    }

    // Save auto-save timestamp and data
    submission.autoSaves.push({
      timestamp: new Date(),
      data: answers
    });

    await submission.save();
    logger.info('Answers auto-saved', { submissionId, userId: req.user.id });

    res.json({
      success: true,
      message: 'Answers saved',
      lastSaved: new Date()
    });
  } catch (error) {
    logger.error('Error in saveAnswers', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Submit exam
submissionController.submitExam = async (req, res) => {
  try {
    const { submissionId, answers } = req.body;

    // Check if submission exists and belongs to the student
    const submission = await Submission.findOne({
      _id: submissionId,
      student: req.user.id
    });

    if (!submission) {
      logger.warn('Submission not found or not owned by student in submitExam', { submissionId, userId: req.user.id });
      return res.status(404).json({
        success: false,
        message: 'Submission not found or not yours'
      });
    }

    // Check if submission is still in progress
    if (submission.status !== 'in-progress') {
      logger.warn('Submission not in progress in submitExam', { submissionId, userId: req.user.id });
      return res.status(400).json({
        success: false,
        message: 'Exam submission is no longer in progress'
      });
    }

    // Get exam to check questions and calculate score
    const exam = await Exam.findById(submission.exam);
    if (!exam) {
      logger.warn('Exam not found in submitExam', { examId: submission.exam, userId: req.user.id });
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Update answers if provided
    if (answers && Array.isArray(answers)) {
      answers.forEach(answer => {
        const answerIndex = submission.answers.findIndex(
          a => a.questionId.toString() === answer.questionId
        );
        if (answerIndex !== -1) {
          submission.answers[answerIndex].answer = answer.answer;
        }
      });
    }

    // Auto-grade MCQ questions
    submission.answers.forEach((answer, index) => {
      const question = exam.questions.find(
        q => q._id.toString() === answer.questionId.toString()
      );

      if (question && question.type === 'MCQ') {
        if (answer.answer === question.correctAnswer) {
          answer.score = question.maxScore;
          answer.graded = true;
        } else {
          answer.score = 0;
          answer.graded = true;
        }
      }
    });

    // Update submission status and submission time
    submission.status = 'submitted';
    submission.submittedAt = new Date();

    await submission.save();
    logger.info('Exam submitted successfully', { submissionId, userId: req.user.id });

    res.json({
      success: true,
      message: 'Exam submitted successfully',
      submission
    });
  } catch (error) {
    logger.error('Error in submitExam', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Auto-submit exam (due to violations or time expiry)
submissionController.autoSubmitExam = async (req, res) => {
  try {
    const { submissionId, reason } = req.body;

    // Check if submission exists and belongs to the student
    const submission = await Submission.findOne({
      _id: submissionId,
      student: req.user.id
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found or not yours'
      });
    }

    // Check if submission is still in progress
    if (submission.status !== 'in-progress') {
      return res.status(400).json({
        success: false,
        message: 'Exam submission is no longer in progress'
      });
    }

    // Get exam to check questions and calculate score
    const exam = await Exam.findById(submission.exam);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Auto-grade MCQ questions
    submission.answers.forEach((answer, index) => {
      const question = exam.questions.find(
        q => q._id.toString() === answer.questionId.toString()
      );

      if (question && question.type === 'MCQ') {
        if (answer.answer === question.correctAnswer) {
          answer.score = question.maxScore;
          answer.graded = true;
        } else {
          answer.score = 0;
          answer.graded = true;
        }
      }
    });

    // Update submission status and submission time
    submission.status = 'auto-submitted';
    submission.submittedAt = new Date();

    // Add reason to violation logs if provided
    if (reason) {
      submission.violationLogs.push({
        type: reason.type || 'other',
        timestamp: new Date(),
        details: reason.details || 'Auto-submitted'
      });
    }

    await submission.save();
    logger.info('Exam auto-submitted', { submissionId, userId: req.user.id });

    res.json({
      success: true,
      message: 'Exam auto-submitted',
      submission
    });
  } catch (error) {
    logger.error('Error in autoSubmitExam', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Log violation
submissionController.logViolation = async (req, res) => {
  try {
    const { submissionId, violationType, details } = req.body;

    // Check if submission exists and belongs to the student
    const submission = await Submission.findOne({
      _id: submissionId,
      student: req.user.id
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found or not yours'
      });
    }

    // Check if submission is still in progress
    if (submission.status !== 'in-progress') {
      return res.status(400).json({
        success: false,
        message: 'Exam submission is no longer in progress'
      });
    }

    // Increment violation counter
    submission.violations += 1;

    // Add to violation logs
    submission.violationLogs.push({
      type: violationType,
      timestamp: new Date(),
      details: details || ''
    }); await submission.save();

    // Check if violations exceed threshold for auto-submission
    const violationThreshold = 2; // Reduced from 5 to 2 as requested

    if (submission.violations >= violationThreshold) {
      // Auto-submit if violations exceed threshold
      submission.status = 'auto-submitted';
      submission.submittedAt = new Date();

      // Auto-grade MCQ questions
      const exam = await Exam.findById(submission.exam);

      submission.answers.forEach((answer, index) => {
        const question = exam.questions.find(
          q => q._id.toString() === answer.questionId.toString()
        );

        if (question && question.type === 'MCQ') {
          if (answer.answer === question.correctAnswer) {
            answer.score = question.maxScore;
            answer.graded = true;
          } else {
            answer.score = 0;
            answer.graded = true;
          }
        }
      });

      await submission.save();

      logger.info('Violation logged. Threshold exceeded - exam auto-submitted.', { submissionId, userId: req.user.id });

      return res.json({
        success: true,
        message: 'Violation logged. Threshold exceeded - exam auto-submitted.',
        shouldAutoSubmit: true,
        violations: submission.violations
      });
    }

    res.json({
      success: true,
      message: 'Violation logged',
      shouldAutoSubmit: false,
      violations: submission.violations
    });
  } catch (error) {
    logger.error('Error in logViolation', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Get student's submissions (completed exams)
submissionController.getStudentSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({
      student: req.user.id,
      status: { $in: ['submitted', 'auto-submitted', 'graded'] }
    })
      .populate({
        path: 'exam',
        populate: [
          { path: 'subject', select: 'name' },
          { path: 'class', select: 'level trade term year' }
        ],
        select: 'title type subject class totalPoints'
      })
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      submissions
    });
  } catch (error) {
    logger.error('Error in getStudentSubmissions', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Get submissions for an exam (teacher view)
submissionController.getExamSubmissions = async (req, res) => {
  try {
    const examId = req.params.examId;
    // Get exam with totalPoints
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }
    // Check if teacher is authorized to access submissions
    const examTeacher = exam.teacher;
    const teacherId = typeof examTeacher === 'object' ? examTeacher.toString() : examTeacher;

    if (teacherId !== req.user.id && req.user.role !== 'dean') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access submissions for this exam'
      });
    }

    // Ensure exam has totalPoints
    if (!exam.totalPoints || exam.totalPoints === 0) {
      exam.totalPoints = exam.questions.reduce((sum, q) => {
        return sum + (parseInt(q.maxScore) || 0);
      }, 0);
      await exam.save();
    }

    // Get submissions
    const submissions = await Submission.find({
      exam: examId,
      status: { $in: ['submitted', 'auto-submitted', 'graded', 'pending'] }
    })
      .populate('student', 'fullName registrationNumber')
      .sort({ submittedAt: -1 });

    // Process submissions to ensure consistent data
    const enhancedSubmissions = await Promise.all(submissions.map(async (sub) => {
      const subObj = sub.toObject();

      // For graded submissions, ensure score is calculated
      if (subObj.status === 'graded') {
        // If no score or score is zero, recalculate
        if (!subObj.score || subObj.score === 0) {
          const calculatedScore = sub.calculateScore();
          // Update in database
          if (calculatedScore !== subObj.score) {
            sub.score = calculatedScore;
            await sub.save();
            subObj.score = calculatedScore;
          }
        }
        // Ensure totalPoints is set
        if (!subObj.totalPoints) {
          sub.totalPoints = exam.totalPoints;
          await sub.save();
          subObj.totalPoints = exam.totalPoints;
        }
        // Calculate percentage
        subObj.percentage = Math.round((subObj.score / subObj.totalPoints) * 100);
      } else {
        subObj.percentage = 0;
      }

      return subObj;
    }));

    res.json({
      success: true,
      submissions: enhancedSubmissions
    });
  } catch (error) {
    logger.error('Error in getExamSubmissions', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Grade open questions
submissionController.gradeOpenQuestions = async (req, res) => {
  try {
    const submissionId = req.params.id;
    const { grades } = req.body;
    // Find submission with exam data
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }
    // Get exam to ensure we have totalPoints
    const exam = await Exam.findById(submission.exam);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }
    // Verify teacher authorization
    const examTeacher = exam.teacher;
    const teacherId = typeof examTeacher === 'object' ? examTeacher.toString() : examTeacher;

    if (teacherId !== req.user.id && req.user.role !== 'dean') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to grade this submission'
      });
    }
    // Ensure exam has totalPoints calculated
    if (!exam.totalPoints || exam.totalPoints === 0) {
      exam.totalPoints = exam.questions.reduce((sum, q) => {
        return sum + (parseInt(q.maxScore) || 0);
      }, 0);
      await exam.save();
    }
    // Apply grades
    let modified = false;
    grades.forEach(grade => {
      const answerIndex = submission.answers.findIndex(
        answer => answer.questionId.toString() === grade.questionId
      );
      if (answerIndex !== -1) {
        const scoreValue = parseInt(grade.score) || 0;
        submission.answers[answerIndex].score = scoreValue;
        submission.answers[answerIndex].feedback = grade.feedback || '';
        submission.answers[answerIndex].graded = true;
        modified = true;
      }
    });

    if (modified) {
      // Calculate total score
      const totalScore = submission.calculateScore();

      // Update submission
      submission.score = totalScore;
      submission.totalPoints = exam.totalPoints;
      submission.status = 'graded';
      submission.gradedBy = req.user.id;
      submission.gradedAt = new Date();

      await submission.save();
    }

    res.json({
      success: true,
      message: 'Submission graded successfully',
      submission: {
        ...submission.toObject(),
        score: submission.score,
        totalPoints: submission.totalPoints
      }
    });
  } catch (error) {
    logger.error('Error in gradeOpenQuestions', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Get student's exam results by term
submissionController.getStudentResultsByTerm = async (req, res) => {
  try {
    const { year, term } = req.query;

    // Get student's class based on year and term
    let classQuery = { term };
    if (year) classQuery.year = year;

    const classes = await Class.find(classQuery);
    const classIds = classes.map(c => c._id);

    // Find all exams for these classes
    const exams = await Exam.find({
      class: { $in: classIds },
      status: 'completed'
    })
      .populate('subject', 'name')
      .select('title type subject totalScore');

    const examIds = exams.map(e => e._id);
    // Find student's submissions for these exams
    const submissions = await Submission.find({
      student: req.user.id,
      exam: { $in: examIds },
      status: { $in: ['graded'] } // Only include graded submissions for results
    })
      .populate({
        path: 'exam',
        populate: { path: 'subject', select: 'name' },
        select: 'title type subject totalPoints totalScore'
      });

    // Group results by subject
    const results = {};

    submissions.forEach(submission => {
      const subjectId = submission.exam.subject._id.toString();
      const subjectName = submission.exam.subject.name;

      if (!results[subjectId]) {
        results[subjectId] = {
          subject: subjectName,
          exams: []
        };
      }
      // Use score or fallback to totalScore, and ensure we have appropriate maxScore values
      const score = submission.score || submission.totalScore || 0;
      const maxScore = submission.totalPoints || submission.exam.totalPoints || 100;
      const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

      results[subjectId].exams.push({
        examId: submission.exam._id,
        title: submission.exam.title,
        type: submission.exam.type,
        score: score,
        maxScore: maxScore,
        percentage: percentage
      });
    });

    // Calculate average score per subject
    Object.keys(results).forEach(subjectId => {
      const subject = results[subjectId];
      const totalPercentage = subject.exams.reduce((sum, exam) => sum + exam.percentage, 0);
      subject.averagePercentage = Math.round(totalPercentage / subject.exams.length);
    });

    res.json({
      success: true,
      results: Object.values(results)
    });
  } catch (error) {
    logger.error('Error in getStudentResultsByTerm', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Get detailed submission (for review)
submissionController.getSubmissionDetails = async (req, res) => {
  try {
    const submissionId = req.params.id;
    // Find submission with populated data
    const submission = await Submission.findById(submissionId)
      .populate({
        path: 'exam',
        populate: [
          { path: 'subject', select: 'name' },
          { path: 'class', select: 'level trade term year' }
        ]
      })
      .populate('student', 'fullName firstName lastName registrationNumber');
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }
    
    // Check permissions
    const isStudent = req.user.role === 'student';
    const isTeacher = req.user.role === 'teacher' || req.user.role === 'dean';

    // ...authorization checks (keep existing code)

    // Get the full exam document
    const exam = await Exam.findById(submission.exam._id);

    // Ensure we have totalPoints
    if (!submission.totalPoints && exam) {
      submission.totalPoints = exam.totalPoints;
      await submission.save();
    }
    // Ensure answers have consistent scores
    if (submission.status === 'graded') {
      let needsUpdate = false;
      submission.answers.forEach((answer, idx) => {
        if (!answer.graded && answer.score > 0) {
          answer.graded = true;
          needsUpdate = true;
        }
      });
      // Calculate score if missing
      if (!submission.score || submission.score === 0) {
        submission.score = submission.calculateScore();
        needsUpdate = true;
      }
      if (needsUpdate) {
        await submission.save();
      }
    }

    // Create a clean response object
    const responseSubmission = submission.toObject();

    // For students, restrict some data
    if (isStudent && submission.status !== 'graded') {
      responseSubmission.answers = responseSubmission.answers.map(a => ({
        questionId: a.questionId,
        answer: a.answer
      }));
    }
    
    res.json({
      success: true,
      submission: responseSubmission
    });
  } catch (error) {
    logger.error('Error in getSubmissionDetails', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Get all submissions for teacher's exams
submissionController.getTeacherSubmissions = async (req, res) => {
  try {
    // Find all exams created by this teacher
    const exams = await Exam.find({ teacher: req.user.id });
    const examIds = exams.map(exam => exam._id);

    // Find all submissions for those exams
    const submissions = await Submission.find({ exam: { $in: examIds } })
      .populate({
        path: 'exam',
        select: 'title subject class',
        populate: [
          { path: 'subject', select: 'name code' },
          { path: 'class', select: 'level trade' }
        ]
      })
      .populate('student', 'firstName lastName registrationNumber')
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      submissions
    });
  } catch (error) {
    logger.error('Error fetching teacher submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

module.exports = submissionController;
