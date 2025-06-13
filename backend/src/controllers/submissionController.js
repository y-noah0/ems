const Submission = require('../models/Submission');
const Exam = require('../models/Exam');
const { validationResult } = require('express-validator');

const submissionController = {};

// Start exam (create submission)
submissionController.startExam = async (req, res) => {
  try {
    const { examId } = req.body;

    // Check if exam exists and is active
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Verify exam is active or scheduled and start time has passed
    const now = new Date();
    if (exam.status !== 'active' && 
        !(exam.status === 'scheduled' && new Date(exam.schedule.start) <= now)) {
      return res.status(400).json({
        success: false,
        message: 'Exam is not active or scheduled to start'
      });
    }

    // Check if student belongs to the exam class
    if (exam.class.toString() !== req.user.class.toString()) {
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
        return res.json({
          success: true,
          submission: existingSubmission,
          timeRemaining: calculateTimeRemaining(existingSubmission, exam)
        });
      } else {
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

    // Calculate time remaining for the exam
    const timeRemaining = exam.schedule.duration * 60 * 1000; // Convert minutes to milliseconds

    res.status(201).json({
      success: true,
      submission: newSubmission,
      timeRemaining
    });
  } catch (error) {
    console.error(error.message);
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

    res.json({
      success: true,
      message: 'Answers saved',
      lastSaved: new Date()
    });
  } catch (error) {
    console.error(error.message);
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

    res.json({
      success: true,
      message: 'Exam submitted successfully',
      submission
    });
  } catch (error) {
    console.error(error.message);
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

    res.json({
      success: true,
      message: 'Exam auto-submitted',
      submission
    });
  } catch (error) {
    console.error(error.message);
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
    });    await submission.save();

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
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Get student's submissions (completed exams)
submissionController.getStudentSubmissions = async (req, res) => {
  try {    const submissions = await Submission.find({
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
    console.error(error.message);
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

    // Check if exam exists and belongs to the teacher
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }    // Check if teacher is authorized to access submissions
    const examTeacher = exam.teacher;
    const teacherId = typeof examTeacher === 'object' ? examTeacher.toString() : examTeacher;
    
    if (teacherId !== req.user.id && req.user.role !== 'dean') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access submissions for this exam'
      });
    }    const submissions = await Submission.find({
      exam: examId,
      status: { $in: ['submitted', 'auto-submitted', 'graded', 'pending'] }
    })
      .populate('student', 'firstName lastName registrationNumber')
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      submissions
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Grade open questions
submissionController.gradeOpenQuestions = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }    const { submissionId } = req.params;
    const { grades, submission: submissionData } = req.body;
    
    // Handle both direct grade updates and full submission updates
    let gradesArray = grades;
    
    // If we get a full submission object (from frontend), extract grades from it
    if (!grades && submissionData && submissionData.answers) {
      gradesArray = submissionData.answers.map(answer => ({
        questionId: answer.questionId,
        score: parseInt(answer.points || answer.score) || 0,
        feedback: answer.feedback || ''
      }));
    }

    // Check if submission exists
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check if exam exists and belongs to the teacher
    const exam = await Exam.findById(submission.exam);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }    // Check if teacher is authorized to grade this submission
    const examTeacher = exam.teacher;
    const teacherId = typeof examTeacher === 'object' ? examTeacher.toString() : examTeacher;
    
    if (teacherId !== req.user.id && req.user.role !== 'dean') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to grade this submission'
      });
    }    // Update scores for open questions
    if (gradesArray && Array.isArray(gradesArray)) {
      gradesArray.forEach((grade, index) => {
        // Try to find answer by questionId or by array index as fallback
        const answerIndex = grade.questionId ? 
          submission.answers.findIndex(a => 
            a.questionId && a.questionId.toString() === grade.questionId.toString()) :
          index;
        
        if (answerIndex !== -1) {
          const question = exam.questions.find(
            q => q._id.toString() === grade.questionId
          );
            // Allow grading of any question type, not just 'open'
          if (question) {
            // Ensure score doesn't exceed max score
            const maxScore = question.maxScore || question.points || 100;
            const score = Math.min(grade.score, maxScore);
            
            submission.answers[answerIndex].score = score;
            submission.answers[answerIndex].feedback = grade.feedback;
            submission.answers[answerIndex].graded = true;
          }
        }
      });
    }    // Always mark submission as graded when using this endpoint
    submission.status = 'graded';
    submission.gradedBy = req.user.id;
    submission.gradedAt = new Date();
    
    // Recalculate total score
    const calculatedScore = submission.answers.reduce((sum, answer) => sum + (answer.score || 0), 0);
    
    // Set both score and totalScore to ensure consistency across the application
    submission.score = calculatedScore;
    submission.totalScore = calculatedScore;
    
    // Set totalPoints from exam if available
    if (exam && exam.totalPoints) {
      submission.totalPoints = exam.totalPoints;
    } else if (!submission.totalPoints) {
      // Calculate total possible points from questions
      submission.totalPoints = exam.questions.reduce((sum, q) => sum + (q.maxScore || q.points || 0), 0);
    }

    await submission.save();

    res.json({
      success: true,
      message: 'Submission graded successfully',
      submission
    });
  } catch (error) {
    console.error(error.message);
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
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Get detailed submission (for review)
submissionController.getSubmissionDetails = async (req, res) => {
  try {
    const submissionId = req.params.id;    // Find the submission
    const submission = await Submission.findById(submissionId)
      .populate({
        path: 'exam',
        populate: [
          { path: 'subject', select: 'name' },
          { path: 'class', select: 'level trade term year' }
        ]
      })
      .populate('student', 'firstName lastName registrationNumber');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check permissions
    const isStudent = req.user.role === 'student';
    const isTeacher = req.user.role === 'teacher' || req.user.role === 'dean';
    
    if (isStudent && submission.student.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this submission'
      });
    }    // Check if teacher is authorized to view this submission
    if (isTeacher) {
      const examTeacher = submission.exam.teacher;
      const teacherId = typeof examTeacher === 'object' ? examTeacher.toString() : examTeacher;
      
      if (teacherId !== req.user.id && req.user.role !== 'dean') {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to view this submission'
        });
      }
    }

    // For students, don't show feedback for ungraded submissions
    if (isStudent && submission.status !== 'graded') {
      const submissionForStudent = submission.toObject();
      submissionForStudent.answers = submissionForStudent.answers.map(answer => {
        return {
          questionId: answer.questionId,
          answer: answer.answer,
          score: answer.graded ? answer.score : null,
          graded: answer.graded
        };
      });
      
      return res.json({
        success: true,
        submission: submissionForStudent
      });
    }

    res.json({
      success: true,
      submission
    });
  } catch (error) {
    console.error(error.message);
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
    console.error('Error fetching teacher submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

module.exports = submissionController;
