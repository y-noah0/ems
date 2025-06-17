// This file contains the fixed getSubmissionDetails function to ensure scores are properly calculated
// Import this in your submissionController.js file or replace the existing function

const getSubmissionDetails = async (req, res) => {
  try {
    const submissionId = req.params.id;
    
    // Find the submission
    const submission = await Submission.findById(submissionId)
      .populate({
        path: 'exam',
        populate: [
          { path: 'subject', select: 'name' },
          { path: 'class', select: 'level trade term year' }
        ]
      })
      .populate('student', 'firstName lastName fullName registrationNumber');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check permissions (existing authorization code)
    const isStudent = req.user.role === 'student';
    const isTeacher = req.user.role === 'teacher' || req.user.role === 'dean';
    
    if (isStudent && submission.student.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this submission'
      });
    }
    
    // Check if teacher is authorized to view this submission
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

    // Get the exam to ensure we have all data
    const exam = await Exam.findById(submission.exam._id);
    
    // Make a copy of submission we can modify
    const submissionObj = submission.toObject();
    
    // Calculate totalPoints from exam if it doesn't exist
    if (!submissionObj.totalPoints && exam) {
      submissionObj.totalPoints = exam.totalPoints || 
        exam.questions.reduce((sum, q) => sum + (q.maxScore || q.points || 0), 0);
      
      // Update the database with this value for future
      await Submission.findByIdAndUpdate(submissionId, { totalPoints: submissionObj.totalPoints });
    }
    
    // Calculate score if it's graded but missing a score
    if (submission.status === 'graded' && (!submissionObj.score || submissionObj.score === 0)) {
      submissionObj.score = submissionObj.answers.reduce((sum, answer) => sum + (parseInt(answer.score || answer.points || 0) || 0), 0);
      
      // Update the database with this value for future
      await Submission.findByIdAndUpdate(submissionId, { score: submissionObj.score });
    }
    
    // For each answer, make sure it has points property (for frontend consistency)
    if (submissionObj.answers) {
      submissionObj.answers = submissionObj.answers.map((answer, index) => {
        // Get corresponding question
        const question = exam?.questions[index];
        const maxScore = question ? (question.maxScore || question.points || 0) : 0;
        
        return {
          ...answer,
          points: answer.score || answer.points || 0,
          score: answer.score || answer.points || 0,
          maxScore: maxScore
        };
      });
    }

    // For students, don't show feedback for ungraded submissions
    if (isStudent && submission.status !== 'graded') {
      submissionObj.answers = submissionObj.answers.map(answer => ({
        questionId: answer.questionId,
        answer: answer.answer,
        score: answer.graded ? answer.score : null,
        points: answer.graded ? answer.points : null,
        graded: answer.graded
      }));
    }

    res.json({
      success: true,
      submission: submissionObj
    });
  } catch (error) {
    console.error('Error in getSubmissionDetails:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

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

module.exports = { getSubmissionDetails };