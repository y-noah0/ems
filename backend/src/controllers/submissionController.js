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

// Modify the getResultsByAssessmentType function to handle undefined values properly
submissionController.getResultsByAssessmentType = async (req, res) => {
  try {
    const { year, term, assessmentType, studentId } = req.query;
    const userRole = req.user.role;
    
    // Determine which student's results to fetch based on user role and request
    let targetStudentId;
    
    if (userRole === 'student') {
      // Students can only access their own results
      targetStudentId = req.user.id;
    } else if (['teacher', 'dean', 'admin'].includes(userRole)) {
      // Teachers, deans and admins can specify a student or view aggregated results
      targetStudentId = studentId || null;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to results'
      });
    }
    
    // Get valid assessment types
    const validTypes = ['assessment1', 'assessment2', 'exam', 'homework', 'quiz'];
    
    if (assessmentType && !validTypes.includes(assessmentType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assessment type',
        validTypes: validTypes
      });
    }
    
    // Find exams of specified type (or all types if not specified)
    const examQuery = { status: 'completed' };
    if (assessmentType) {
      examQuery.type = assessmentType;
    }
    
    const exams = await Exam.find(examQuery)
      .populate('subject', 'name')
      .populate('class', 'level trade year term')
      .populate('teacher', 'fullName');
    
    // Filter by year and term if provided
    const filteredExams = exams.filter(exam => {
      // Check if exam.class exists before accessing properties
      if (!exam.class) return false;
      
      if (year && term) {
        return exam.class.year === year && exam.class.term === term;
      }
      if (year) {
        return exam.class.year === year;
      }
      if (term) {
        return exam.class.term === term;
      }
      return true;
    });
    
    const examIds = filteredExams.map(exam => exam._id);
    
    // Find submissions - either for a specific student or all students
    const submissionQuery = {
      exam: { $in: examIds },
      status: 'graded'
    };
    
    if (targetStudentId) {
      submissionQuery.student = targetStudentId;
    }
    
    const submissions = await Submission.find(submissionQuery)
      .populate({
        path: 'exam',
        populate: [
          { path: 'subject', select: 'name' },
          { path: 'class', select: 'level trade year term' },
          { path: 'teacher', select: 'fullName' }
        ]
      })
      .populate('student', 'fullName registrationNumber');
    
    // Different result processing based on whether viewing individual student or aggregated data
    if (targetStudentId) {
      // Individual student results - organize by subject
      const resultsBySubject = {};
      
      submissions.forEach(submission => {
        // Check if submission.exam and submission.exam.subject exist
        if (!submission.exam || !submission.exam.subject) return;
        
        const subjectId = submission.exam.subject._id ? submission.exam.subject._id.toString() : 'unknown';
        const subjectName = submission.exam.subject.name || 'Unknown Subject';
        
        if (!resultsBySubject[subjectId]) {
          resultsBySubject[subjectId] = {
            subject: subjectName,
            results: []
          };
        }
        
        const score = submission.score || 0;
        const totalPoints = submission.totalPoints || (submission.exam ? submission.exam.totalPoints || 100 : 100);
        const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
        
        // Add result only if we have a valid class
        if (submission.exam && submission.exam.class) {
          resultsBySubject[subjectId].results.push({
            examId: submission.exam._id,
            title: submission.exam.title,
            type: submission.exam.type,
            score: score,
            maxScore: totalPoints,
            percentage: percentage
          });
        }
      });
      
      // Calculate average for each subject
      Object.values(resultsBySubject).forEach(subject => {
        if (subject.results.length > 0) {
          const totalPercentage = subject.results.reduce((sum, result) => sum + result.percentage, 0);
          subject.averagePercentage = Math.round(totalPercentage / subject.results.length);
        } else {
          subject.averagePercentage = 0;
        }
      });
      
      // Get student info if not a student viewing own results
      let student = null;
      if (userRole !== 'student' && targetStudentId) {
        const User = require('../models/User');
        student = await User.findById(targetStudentId, 'fullName registrationNumber');
      }
      
      res.json({
        success: true,
        assessmentType: assessmentType || 'all',
        student: student,
        results: Object.values(resultsBySubject)
      });
    } else {
      // For admins, deans, and teachers viewing aggregated results
      // Group by class and subject
      const aggregatedResults = {};
      
      submissions.forEach(submission => {
        // Check if necessary properties exist
        if (!submission.exam || !submission.exam.class || !submission.exam.subject || !submission.student) return;
        
        const classId = submission.exam.class._id ? submission.exam.class._id.toString() : 'unknown';
        const subjectId = submission.exam.subject._id ? submission.exam.subject._id.toString() : 'unknown';
        const classKey = `${classId}-${subjectId}`;
        
        if (!aggregatedResults[classKey]) {
          aggregatedResults[classKey] = {
            class: {
              id: classId,
              level: submission.exam.class.level || 'Unknown',
              trade: submission.exam.class.trade || 'Unknown',
              year: submission.exam.class.year || 'Unknown',
              term: submission.exam.class.term || 'Unknown'
            },
            subject: {
              id: subjectId,
              name: submission.exam.subject.name || 'Unknown'
            },
            teacher: submission.exam.teacher ? submission.exam.teacher.fullName : 'Unknown',
            examCount: 0,
            studentCount: 0,
            averageScore: 0,
            examTypes: {},
            students: {}
          };
        }
        
        // Count unique students
        if (submission.student._id) {
          aggregatedResults[classKey].students[submission.student._id.toString()] = true;
        }
        
        // Track exam types
        const examType = submission.exam.type || 'unknown';
        if (!aggregatedResults[classKey].examTypes[examType]) {
          aggregatedResults[classKey].examTypes[examType] = 0;
        }
        aggregatedResults[classKey].examTypes[examType]++;
        
        // Update average calculation
        const score = submission.score || 0;
        const totalPoints = submission.totalPoints || (submission.exam ? submission.exam.totalPoints || 100 : 100);
        const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;
        
        const currentTotal = aggregatedResults[classKey].averageScore * aggregatedResults[classKey].examCount;
        aggregatedResults[classKey].examCount++;
        aggregatedResults[classKey].averageScore = (currentTotal + percentage) / aggregatedResults[classKey].examCount;
      });
      
      // Convert students object to count and finalize
      Object.values(aggregatedResults).forEach(item => {
        item.studentCount = Object.keys(item.students).length;
        item.averageScore = Math.round(item.averageScore);
        delete item.students; // Remove the temporary tracking object
      });
      
      res.json({
        success: true,
        assessmentType: assessmentType || 'all',
        aggregatedResults: Object.values(aggregatedResults)
      });
    }
  } catch (error) {
    console.error('Error fetching results:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Get combined results for student performance across all assessment types
submissionController.getCombinedDetailedResults = async (req, res) => {
  try {
    const { year, term, studentId } = req.query;
    const userRole = req.user.role;
    
    // Determine which student's results to fetch based on user role and request
    let targetStudentId;
    
    if (userRole === 'student') {
      // Students can only access their own results
      targetStudentId = req.user.id;
    } else if (['teacher', 'dean', 'admin'].includes(userRole) && studentId) {
      // Teachers, deans and admins must specify a student for detailed view
      targetStudentId = studentId;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required for detailed view'
      });
    }
    
    // Find all completed exams
    const exams = await Exam.find({
      status: 'completed'
    })
    .populate('subject', 'name')
    .populate('class', 'level trade year term')
    .populate('teacher', 'fullName');
    
    // Filter by year and term if provided
    const filteredExams = exams.filter(exam => {
      if (year && term) {
        return exam.class.year === year && exam.class.term === term;
      }
      if (year) {
        return exam.class.year === year;
      }
      if (term) {
        return exam.class.term === term;
      }
      return true;
    });
    
    const examIds = filteredExams.map(exam => exam._id);
    
    // Find student's submissions
    const submissions = await Submission.find({
      student: targetStudentId,
      exam: { $in: examIds },
      status: 'graded'
    })
    .populate({
      path: 'exam',
      populate: [
        { path: 'subject', select: 'name' },
        { path: 'class', select: 'level trade year term' },
        { path: 'teacher', select: 'fullName' }
      ]
    })
    .populate('student', 'fullName registrationNumber');
    
    // Organize results by subject with separated assessment types
    const resultsBySubject = {};
    const validTypes = ['assessment1', 'assessment2', 'exam', 'homework', 'quiz'];
    
    submissions.forEach(submission => {
      const subjectId = submission.exam.subject._id.toString();
      const subjectName = submission.exam.subject.name;
      const examType = submission.exam.type;
      
      if (!resultsBySubject[subjectId]) {
        // Initialize all assessment type arrays
        const subjectResult = {
          subject: subjectName,
          teacher: submission.exam.teacher ? submission.exam.teacher.fullName : 'Unknown',
          other: [] // For any non-standard types
        };
        
        // Initialize arrays for all valid assessment types
        validTypes.forEach(type => {
          subjectResult[type] = [];
        });
        
        resultsBySubject[subjectId] = subjectResult;
      }
      
      const score = submission.score || 0;
      const totalPoints = submission.totalPoints || submission.exam.totalPoints || 100;
      const percentage = Math.round((score / totalPoints) * 100);
      
      const resultObject = {
        examId: submission.exam._id,
        title: submission.exam.title,
        score,
        totalPoints,
        percentage,
        submittedAt: submission.submittedAt,
        class: {
          level: submission.exam.class.level,
          trade: submission.exam.class.trade,
          year: submission.exam.class.year,
          term: submission.exam.class.term
        }
      };
      
      // Add to the appropriate assessment type array
      if (validTypes.includes(examType)) {
        resultsBySubject[subjectId][examType].push(resultObject);
      } else {
        resultsBySubject[subjectId].other.push(resultObject);
      }
    });
    
    // Calculate averages for each assessment type and final combined average
    Object.values(resultsBySubject).forEach(subject => {
      // Calculate average for each assessment type
      let totalWeightedScore = 0;
      let totalWeight = 0;
      
      // Define weights for different assessment types
      const weights = {
        assessment1: 0.25,
        assessment2: 0.25,
        exam: 0.4,
        homework: 0.05,
        quiz: 0.05
      };
      
      // Calculate averages for each type
      validTypes.forEach(type => {
        if (subject[type] && subject[type].length > 0) {
          const totalPercentage = subject[type].reduce((sum, result) => sum + result.percentage, 0);
          const average = Math.round(totalPercentage / subject[type].length);
          subject[`${type}Average`] = average;
          
          if (weights[type]) {
            totalWeightedScore += average * weights[type];
            totalWeight += weights[type];
          }
        } else {
          subject[`${type}Average`] = 0;
        }
      });
      
      // Calculate overall average for 'other' type if present
      if (subject.other.length > 0) {
        const otherTotal = subject.other.reduce((sum, result) => sum + result.percentage, 0);
        subject.otherAverage = Math.round(otherTotal / subject.other.length);
      } else {
        subject.otherAverage = 0;
      }
      
      // Normalize final grade calculation if some components are missing
      if (totalWeight > 0) {
        subject.finalGrade = Math.round(totalWeightedScore / totalWeight);
      } else {
        subject.finalGrade = 0;
      }
      
      // Add grade letter
      subject.gradeLetter = calculateGradeLetter(subject.finalGrade);
    });
    
    // Get student details for the response
    const student = await User.findById(targetStudentId, 'fullName registrationNumber class');
    let studentClass = null;
    if (student && student.class) {
      studentClass = await Class.findById(student.class, 'level trade year term');
    }
    
    res.json({
      success: true,
      student: student ? {
        id: student._id,
        fullName: student.fullName,
        registrationNumber: student.registrationNumber,
        class: studentClass
      } : null,
      results: Object.values(resultsBySubject)
    });
  } catch (error) {
    console.error('Error fetching combined results:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Update the existing single-type assessment functions to use the new general function
submissionController.getAssessment1Results = async (req, res) => {
  req.query.assessmentType = 'assessment1';
  return submissionController.getResultsByAssessmentType(req, res);
};

submissionController.getAssessment2Results = async (req, res) => {
  req.query.assessmentType = 'assessment2';
  return submissionController.getResultsByAssessmentType(req, res);
};

submissionController.getExamResults = async (req, res) => {
  req.query.assessmentType = 'exam';
  return submissionController.getResultsByAssessmentType(req, res);
};

submissionController.getHomeworkResults = async (req, res) => {
  req.query.assessmentType = 'homework';
  return submissionController.getResultsByAssessmentType(req, res);
};

submissionController.getQuizResults = async (req, res) => {
  req.query.assessmentType = 'quiz';
  return submissionController.getResultsByAssessmentType(req, res);
};

// Replace the combined results function to use the new implementation
submissionController.getCombinedResults = async (req, res) => {
  return submissionController.getCombinedDetailedResults(req, res);
};

// Update the teacher-specific function to use the general function
submissionController.getStudentResultsByAssessmentType = async (req, res) => {
  return submissionController.getResultsByAssessmentType(req, res);
};

// Get marks for a specific student by ID (for teachers, deans, admins)
submissionController.getStudentMarksByID = async (req, res) => {
  try {
    const { studentId, assessmentType, year, term } = req.query;
    
    // Validate student ID is provided
    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required'
      });
    }
    
    // Only allow teachers, deans, and admins to access this endpoint
    if (!['teacher', 'dean', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to student marks'
      });
    }
    
    // Verify the student exists
    const User = require('../models/User');
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // If a specific assessment type is requested, use that specific endpoint
    if (assessmentType) {
      // Modify the request to use the existing functions
      req.query.studentId = studentId;
      
      // Route to the appropriate handler based on assessment type
      switch (assessmentType) {
        case 'assessment1':
          return submissionController.getAssessment1Results(req, res);
        case 'assessment2':
          return submissionController.getAssessment2Results(req, res);
        case 'exam':
          return submissionController.getExamResults(req, res);
        case 'homework':
          return submissionController.getHomeworkResults(req, res);
        case 'quiz':
          return submissionController.getQuizResults(req, res);
        case 'combined':
          return submissionController.getCombinedResults(req, res);
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid assessment type',
            validTypes: ['assessment1', 'assessment2', 'exam', 'homework', 'quiz', 'combined']
          });
      }
    }
    
    // If no assessment type is specified, fetch all types of results
    // Set up base queries
    const Class = require('../models/Class');
    
    // Find relevant class if year and term are provided
    let classQuery = {};
    if (year) classQuery.year = year;
    if (term) classQuery.term = term;
    
    // Get the student's class information - either current or from specified year/term
    let studentClasses = [];
    if (Object.keys(classQuery).length > 0) {
      studentClasses = await Class.find(classQuery);
    } else if (student.class) {
      const currentClass = await Class.findById(student.class);
      if (currentClass) studentClasses = [currentClass];
    }
    
    const classIds = studentClasses.map(c => c._id);
    
    // Find all completed exams relevant to this student
    const examQuery = { 
      status: 'completed'
    };
    
    // Add class filter if we have class information
    if (classIds.length > 0) {
      examQuery.class = { $in: classIds };
    }
    
    const exams = await Exam.find(examQuery)
      .populate('subject', 'name')
      .populate('class', 'level trade year term')
      .populate('teacher', 'fullName');
    
    const examIds = exams.map(exam => exam._id);
    
    // Find student's submissions
    const submissions = await Submission.find({
      student: studentId,
      exam: { $in: examIds },
      status: 'graded'
    })
    .populate({
      path: 'exam',
      populate: [
        { path: 'subject', select: 'name' },
        { path: 'class', select: 'level trade year term' },
        { path: 'teacher', select: 'fullName' }
      ]
    });
    
    // Format the results by assessment type
    const validTypes = ['assessment1', 'assessment2', 'exam', 'homework', 'quiz'];
    const resultsByType = {
      student: {
        id: student._id,
        fullName: student.fullName,
        registrationNumber: student.registrationNumber
      }
    };
    
    // Initialize results structure
    validTypes.forEach(type => {
      resultsByType[type] = [];
    });
    
    // Categorize submissions by assessment type
    submissions.forEach(submission => {
      if (!submission.exam) return;
      
      const examType = submission.exam.type;
      if (!validTypes.includes(examType)) return;
      
      const score = submission.score || 0;
      const totalPoints = submission.totalPoints || submission.exam.totalPoints || 100;
      const percentage = Math.round((score / totalPoints) * 100);
      
      resultsByType[examType].push({
        examId: submission.exam._id,
        title: submission.exam.title || 'Untitled',
        subject: submission.exam.subject ? submission.exam.subject.name : 'Unknown',
        score,
        totalPoints,
        percentage,
        submittedAt: submission.submittedAt,
        class: submission.exam.class ? {
          level: submission.exam.class.level || 'Unknown',
          trade: submission.exam.class.trade || 'Unknown',
          year: submission.exam.class.year || 'Unknown',
          term: submission.exam.class.term || 'Unknown'
        } : 'Unknown',
        teacher: submission.exam.teacher ? submission.exam.teacher.fullName : 'Unknown'
      });
    });
    
    // Calculate averages for each assessment type
    validTypes.forEach(type => {
      if (resultsByType[type].length > 0) {
        const totalPercentage = resultsByType[type].reduce((sum, item) => sum + item.percentage, 0);
        resultsByType[`${type}Average`] = Math.round(totalPercentage / resultsByType[type].length);
      } else {
        resultsByType[`${type}Average`] = 0;
      }
    });
    
    // Calculate combined weighted average
    const weights = {
      assessment1: 0.25,
      assessment2: 0.25,
      exam: 0.4,
      homework: 0.05,
      quiz: 0.05
    };
    
    let totalWeightedScore = 0;
    let totalWeight = 0;
    
    validTypes.forEach(type => {
      if (resultsByType[`${type}Average`] > 0) {
        totalWeightedScore += resultsByType[`${type}Average`] * weights[type];
        totalWeight += weights[type];
      }
    });
    
    if (totalWeight > 0) {
      resultsByType.finalGrade = Math.round(totalWeightedScore / totalWeight);
      resultsByType.gradeLetter = calculateGradeLetter(resultsByType.finalGrade);
    } else {
      resultsByType.finalGrade = 0;
      resultsByType.gradeLetter = 'N/A';
    }
    
    // Group by subject for a more organized view
    const resultsBySubject = {};
    
    validTypes.forEach(type => {
      resultsByType[type].forEach(result => {
        const subject = result.subject;
        
        if (!resultsBySubject[subject]) {
          resultsBySubject[subject] = {
            subject,
            assessment1: [],
            assessment2: [],
            exam: [],
            homework: [],
            quiz: []
          };
        }
        
        resultsBySubject[subject][type].push(result);
      });
    });
    
    // Calculate subject-specific averages
    Object.values(resultsBySubject).forEach(subjectData => {
      let subjectTotalWeightedScore = 0;
      let subjectTotalWeight = 0;
      
      validTypes.forEach(type => {
        if (subjectData[type].length > 0) {
          const totalPercentage = subjectData[type].reduce((sum, item) => sum + item.percentage, 0);
          subjectData[`${type}Average`] = Math.round(totalPercentage / subjectData[type].length);
          
          if (weights[type]) {
            subjectTotalWeightedScore += subjectData[`${type}Average`] * weights[type];
            subjectTotalWeight += weights[type];
          }
        } else {
          subjectData[`${type}Average`] = 0;
        }
      });
      
      if (subjectTotalWeight > 0) {
        subjectData.finalGrade = Math.round(subjectTotalWeightedScore / subjectTotalWeight);
        subjectData.gradeLetter = calculateGradeLetter(subjectData.finalGrade);
      } else {
        subjectData.finalGrade = 0;
        subjectData.gradeLetter = 'N/A';
      }
    });
    
    res.json({
      success: true,
      student: resultsByType.student,
      summary: {
        assessment1Average: resultsByType.assessment1Average,
        assessment2Average: resultsByType.assessment2Average,
        examAverage: resultsByType.examAverage,
        homeworkAverage: resultsByType.homeworkAverage,
        quizAverage: resultsByType.quizAverage,
        finalGrade: resultsByType.finalGrade,
        gradeLetter: resultsByType.gradeLetter
      },
      byAssessmentType: {
        assessment1: resultsByType.assessment1,
        assessment2: resultsByType.assessment2,
        exam: resultsByType.exam,
        homework: resultsByType.homework,
        quiz: resultsByType.quiz
      },
      bySubject: Object.values(resultsBySubject)
    });
    
  } catch (error) {
    console.error('Error fetching student marks by ID:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Get the currently logged-in student's marks
submissionController.getMyMarks = async (req, res) => {
  try {
    // Use the existing function but with the student's own ID
    req.query.studentId = req.user.id;
    return submissionController.getStudentMarksByID(req, res);
  } catch (error) {
    console.error('Error fetching student marks:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// If calculateGradeLetter function doesn't exist, add it
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

module.exports = submissionController;
