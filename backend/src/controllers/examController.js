const Exam = require('../models/Exam');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const User = require('../models/User');
const { validationResult } = require('express-validator');

const examController = {};

// Create new exam
examController.createExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      type,
      schedule,
      questions,
      instructions
    } = req.body;
      // Extract IDs using let so they can be reassigned
    let { classId, subjectId } = req.body;
    let subject; // Declare subject variable outside try block for scope
    
    // Clean and validate IDs
    try {
      // Try to clean up the IDs if they have extra quotes
      const sanitizedClassId = classId.toString().replace(/^"+|"+$/g, '');
      const sanitizedSubjectId = subjectId.toString().replace(/^"+|"+$/g, '');
      
      // Check if class exists
      const classExists = await Class.findById(sanitizedClassId);
      if (!classExists) {
        return res.status(404).json({
          success: false,
          message: 'Class not found'
        });
      }

      // Check if subject exists
      subject = await Subject.findById(sanitizedSubjectId);
      if (!subject) {
        return res.status(404).json({
          success: false,
          message: 'Subject not found'
        });
      }
      
      // Update sanitized IDs
      classId = sanitizedClassId;
      subjectId = sanitizedSubjectId;
    } catch (idError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format',
        details: idError.message
      });
    }    // Check if teacher is assigned to this subject
    if (subject && subject.teacher) {
      const subjectTeacherId = typeof subject.teacher === 'object' ? subject.teacher.toString() : subject.teacher;
      if (subjectTeacherId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to create exams for this subject'
        });
      }
    }

    // Create new exam
    const newExam = new Exam({
      title,
      class: classId,
      subject: subjectId,
      teacher: req.user.id,
      type,
      schedule,
      questions,
      instructions,
      status: schedule ? 'scheduled' : 'draft'
    });

    await newExam.save();

    res.status(201).json({
      success: true,
      exam: newExam
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Get all exams created by the teacher
examController.getTeacherExams = async (req, res) => {
  try {
    const exams = await Exam.find({ teacher: req.user.id })
      .populate('class', 'level trade year term')
      .populate('subject', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      exams
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Get exam by ID
examController.getExamById = async (req, res) => {
  try {
    const examId = req.params.id;

    const exam = await Exam.findById(examId)
      .populate('class', 'level trade year term')
      .populate('subject', 'name')
      .populate('teacher', 'fullName email');

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // If totalPoints isn't calculated yet, calculate it
    if (!exam.totalPoints) {
      exam.totalPoints = exam.questions.reduce(
        (total, question) => total + (question.maxScore || 0), 
        0
      );
      await exam.save();
    }

    // If user is a teacher, only allow access to their own exams
    if (req.user.role === 'teacher' && exam.teacher._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access this exam'
      });
    }

    // If user is a student, only allow access to scheduled/active exams for their class
    if (req.user.role === 'student') {
      if (exam.class._id.toString() !== req.user.class.toString() || 
          !(exam.status === 'scheduled' || exam.status === 'active')) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to access this exam'
        });
      }

      // For students, don't return the correct answers
      const examForStudent = exam.toObject();
      examForStudent.questions = examForStudent.questions.map(q => {
        const { correctAnswer, ...rest } = q;
        return rest;
      });

      return res.json({
        success: true,
        exam: examForStudent
      });
    }

    res.json({
      success: true,
      exam
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Update exam
examController.updateExam = async (req, res) => {  try {
    console.log('Update Exam Request Body:', JSON.stringify(req.body));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const examId = req.params.id;
    const {
      title,
      type,
      schedule,
      questions,
      instructions,
      status,
      class: classId, // Extract class field if provided
      subject: subjectId // Extract subject field if provided
    } = req.body;
    
    console.log('Extracted fields from request:');
    console.log('title:', title);
    console.log('type:', type);
    console.log('class:', classId);
    console.log('subject:', subjectId);

    // Check if exam exists
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }    // Check if user is the teacher who created the exam
    const examTeacher = exam.teacher;
    const teacherId = typeof examTeacher === 'object' ? examTeacher.toString() : examTeacher;
    
    if (teacherId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this exam'
      });
    }

    // Only allow updates to drafts or scheduled exams that haven't started yet
    if (exam.status === 'active' || exam.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: `Cannot update exam with status '${exam.status}'`
      });
    }

    // If scheduled, ensure start date is in the future
    if (schedule && schedule.start) {
      const startDate = new Date(schedule.start);
      if (startDate <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Exam start time must be in the future'
        });
      }
    }    // Update exam with validation for type
    exam.title = title || exam.title;
    
    // Ensure we have a valid type
    if (!type) {
      console.log('No type provided in update request. Using existing type:', exam.type);
    } else {
      console.log('Updating exam type to:', type);
      exam.type = type;
    }
    
    // Handle class update if provided
    if (classId) {
      console.log('Updating class to:', classId);
      exam.class = classId;
    }
    
    // Handle subject update if provided
    if (subjectId) {
      console.log('Updating subject to:', subjectId);
      exam.subject = subjectId;
    }
    
    exam.schedule = schedule || exam.schedule;
    exam.instructions = instructions || exam.instructions;
    
    // Handle questions with validation
    if (questions && questions.length > 0) {
      // Validate and sanitize each question
      const validatedQuestions = questions.map(q => {
        // Create a clean question object
        const validQuestion = {
          type: q.type || 'MCQ',
          text: q.text || 'Untitled question',
          maxScore: parseInt(q.maxScore || q.points || 10)
        };
        
        // Handle MCQ specific fields
        if (validQuestion.type === 'MCQ') {
          // Ensure options is an array of strings
          if (q.options) {
            // If it's already an array of strings, use it
            if (Array.isArray(q.options) && typeof q.options[0] === 'string') {
              validQuestion.options = q.options;
            } 
            // If it's an array of objects with text property, extract the text
            else if (Array.isArray(q.options) && q.options[0] && typeof q.options[0] === 'object') {
              validQuestion.options = q.options.map(o => o.text || '');
            }
            // Default empty array if none of the above
            else {
              validQuestion.options = ['Option 1', 'Option 2'];
            }
          } else {
            validQuestion.options = ['Option 1', 'Option 2'];
          }
          
          // Set correct answer
          validQuestion.correctAnswer = q.correctAnswer || validQuestion.options[0];
        }
        // Handle open-ended questions
        else if (validQuestion.type === 'open') {
          validQuestion.correctAnswer = q.correctAnswer || '';
        }
        
        return validQuestion;
      });
      
      console.log('Validated questions:', validatedQuestions);
      exam.questions = validatedQuestions;
    } else {
      exam.questions = questions || exam.questions;
    }
    
    // Update status if provided and valid
    if (status) {
      if (status === 'scheduled' && (!exam.schedule || !exam.schedule.start || !exam.schedule.duration)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot schedule exam without start date and duration'
        });
      }
      exam.status = status;
    }

    await exam.save();

    res.json({
      success: true,
      exam
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Delete exam
examController.deleteExam = async (req, res) => {
  try {
    const examId = req.params.id;

    // Check if exam exists
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }    // Check if user is the teacher who created the exam
    const examTeacher = exam.teacher;
    const teacherId = typeof examTeacher === 'object' ? examTeacher.toString() : examTeacher;
    
    if (teacherId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this exam'
      });
    }

    // Only allow deletion of draft exams
    if (exam.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: `Cannot delete exam with status '${exam.status}'`
      });
    }

    await exam.remove();

    res.json({
      success: true,
      message: 'Exam deleted successfully'
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Get upcoming exams for a student
examController.getUpcomingExamsForStudent = async (req, res) => {
  try {
    // Get student's class
    const student = await User.findById(req.user.id);
    if (!student || !student.class) {
      return res.status(400).json({
        success: false,
        message: 'Student class not found'
      });
    }

    const now = new Date();

    // Find scheduled exams for the student's class
    const exams = await Exam.find({
      class: student.class,
      status: 'scheduled',
      'schedule.start': { $gte: now }
    })
      .populate('subject', 'name')
      .populate('teacher', 'fullName')
      .select('title type schedule subject teacher')
      .sort({ 'schedule.start': 1 });

    res.json({
      success: true,
      exams
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Get all exams for student's class
examController.getStudentClassExams = async (req, res) => {
  try {
    // Get student's class
    const student = await User.findById(req.user.id);
    if (!student || !student.class) {
      return res.status(400).json({
        success: false,
        message: 'Student class not found'
      });
    }

    // Find all exams for the student's class
    const exams = await Exam.find({
      class: student.class
    })
      .populate('subject', 'name')
      .populate('teacher', 'fullName')
      .select('title type schedule status subject teacher')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      exams
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Activate exam (make it active)
examController.activateExam = async (req, res) => {
  try {
    const examId = req.params.id;

    // Check if exam exists
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }    // Check if user is the teacher who created the exam
    const examTeacher = exam.teacher;
    const teacherId = typeof examTeacher === 'object' ? examTeacher.toString() : examTeacher;
    
    if (teacherId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to activate this exam'
      });
    }

    // Check if exam is scheduled
    if (exam.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: `Cannot activate exam with status '${exam.status}'`
      });
    }

    // Update status to active
    exam.status = 'active';
    await exam.save();

    res.json({
      success: true,
      message: 'Exam activated successfully',
      exam
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Complete exam (mark as completed)
examController.completeExam = async (req, res) => {
  try {
    const examId = req.params.id;

    // Check if exam exists
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }    // Check if user is the teacher who created the exam
    const examTeacher = exam.teacher;
    const teacherId = typeof examTeacher === 'object' ? examTeacher.toString() : examTeacher;
    
    if (teacherId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to complete this exam'
      });
    }

    // Check if exam is active
    if (exam.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Cannot complete exam with status '${exam.status}'`
      });
    }

    // Update status to completed
    exam.status = 'completed';
    await exam.save();

    res.json({
      success: true,
      message: 'Exam marked as completed',
      exam
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Get all subjects assigned to teacher
examController.getTeacherSubjects = async (req, res) => {
  try {
    // Find all subjects where the teacher is the current user
    const subjects = await Subject.find({ teacher: req.user.id })
      .populate('class', 'level trade year term')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      subjects
    });
  } catch (error) {
    console.error('Error fetching teacher subjects:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Get classes that a teacher is assigned to teach subjects for
examController.getClassesForTeacher = async (req, res) => {
  try {
    // First find all subjects assigned to this teacher
    const teacherSubjects = await Subject.find({ teacher: req.user.id });
    
    // Extract class IDs from those subjects
    const classIds = [...new Set(teacherSubjects.map(subject => subject.class))];
    
    if (classIds.length === 0) {
      // If teacher has no subjects assigned, return empty array
      return res.json({
        success: true,
        classes: []
      });
    }
    
    // Find classes that match these IDs
    const classes = await Class.find({ _id: { $in: classIds } })
      .sort({ level: 1, trade: 1 });
    
    res.json({
      success: true,
      classes
    });
  } catch (error) {
    console.error('Error fetching classes for teacher:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Schedule an exam
examController.scheduleExam = async (req, res) => {
  try {
    const examId = req.params.id;
    const { start, duration } = req.body;
    
    if (!start || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Start time and duration are required'
      });
    }
    
    // Validate start date is in future
    const startDate = new Date(start);
    if (startDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be in the future'
      });
    }
    
    // Validate duration is at least 5 minutes
    if (duration < 5) {
      return res.status(400).json({
        success: false,
        message: 'Duration must be at least 5 minutes'
      });
    }
    
    // Check if exam exists
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }
    
    // Check if user is the teacher who created the exam
    if (exam.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to schedule this exam'
      });
    }
    
    // Only allow scheduling of draft exams
    if (exam.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: `Cannot schedule exam with status '${exam.status}'`
      });
    }
    
    // Update exam schedule and status
    exam.schedule = {
      start: startDate,
      duration: duration
    };
    exam.status = 'scheduled';
    
    await exam.save();
    
    res.json({
      success: true,
      message: 'Exam scheduled successfully',
      exam
    });
  } catch (error) {
    console.error('Error scheduling exam:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

module.exports = examController;
