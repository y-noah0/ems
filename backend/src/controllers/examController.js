const Exam = require('../models/Exam');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const User = require('../models/User');
const { check, validationResult, param } = require('express-validator');
const winston = require('winston');
const mongoose = require('mongoose');
const { validateEntity, validateEntities } = require('../utils/entityValidator');
const { checkScheduleConflicts } = require('../utils/scheduleValidator');
const { toUTC } = require('../utils/dateUtils');
const { logAudit } = require('../utils/auditLogger');

// Temporary sanitize function (replace with actual implementation if available)
const sanitize = (value) => String(value || '');

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

// --- Validation Rules ---
const allowedExamTypes = ['assessment1', 'assessment2', 'exam', 'homework', 'quiz'];

// Define validation arrays
const validateCreateExam = [
  check('title').notEmpty().withMessage('Title is required'),
  check('type').isIn(allowedExamTypes).withMessage('Invalid exam type'),
  check('classIds').isArray({ min: 1 }).withMessage('At least one class ID is required'),
  check('classIds.*').isMongoId().withMessage('Invalid class ID format'),
  check('subjectId').isMongoId().withMessage('Invalid subject ID format'),
  check('teacherId').isMongoId().withMessage('Invalid teacher ID format'),
  check('schedule.start').isISO8601().toDate().withMessage('Start time is required and must be a valid date'),
  check('schedule.duration').isInt({ min: 5 }).withMessage('Duration must be at least 5 minutes'),
  check('questions').isArray({ min: 1 }).withMessage('At least one question is required'),
  check('questions.*.type').isIn(['multiple-choice', 'true-false', 'short-answer', 'essay']).withMessage('Invalid question type'),
  check('questions.*.text').notEmpty().withMessage('Question text is required'),
  check('questions.*.maxScore').isInt({ min: 1 }).withMessage('Question maxScore must be at least 1')
];

const validateUpdateExam = [
  check('title').optional().notEmpty().withMessage('Title cannot be empty'),
  check('type').optional().isIn(allowedExamTypes).withMessage('Invalid exam type'),
  check('classIds').optional().isArray({ min: 1 }).withMessage('At least one class ID is required'),
  check('classIds.*').optional().isMongoId().withMessage('Invalid class ID format'),
  check('subjectId').optional().isMongoId().withMessage('Invalid subject ID format'),
  check('schedule.start').optional().isISO8601().toDate().withMessage('Invalid schedule start date'),
  check('schedule.duration').optional().isInt({ min: 5 }).withMessage('Duration must be at least 5 minutes'),
  check('questions').optional().isArray(),
  check('questions.*.type').optional().isIn(['multiple-choice', 'true-false', 'short-answer', 'essay']).withMessage('Invalid question type'),
  check('questions.*.text').optional().notEmpty().withMessage('Question text cannot be empty'),
  check('questions.*.maxScore').optional().isInt({ min: 1 }).withMessage('Question maxScore must be at least 1')
];

const validateExamIdParam = [
  param('examId').isMongoId().withMessage('Invalid exam ID format')
];

const validateScheduleExam = [
  check('start').isISO8601().toDate().withMessage('Invalid start date format'),
  check('duration').isInt({ min: 5 }).withMessage('Duration must be at least 5 minutes')
];
// --- End Validation Rules ---

// @route   POST /api/exams
// @desc    Create new exam
// @access  Private (Teacher)
exports.createExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in createExam', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    const {
      title,
      type,
      classIds,
      subjectId,
      teacherId,
      schedule,
      questions,
      instructions
    } = req.body;

    // Validate referenced documents with soft-delete check
    try {
      const subject = await validateEntity(Subject, subjectId, 'Subject');
      const teacher = await validateEntity(User, teacherId, 'Teacher');
      const classes = await validateEntities(Class, classIds, 'Classes');

      // Verify teacher is valid
      if (teacher.role !== 'teacher') {
        return res.status(400).json({ 
          success: false, 
          message: `User with ID ${teacherId} is not a teacher but has role: ${teacher.role}`
        });
      }

      // Verify teacher matches the authenticated user
      if (teacher._id.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to create exams for other teachers'
        });
      }

      // Verify teacher is assigned to subject
      if (subject.teacher.toString() !== teacherId) {
        return res.status(403).json({
          success: false,
          message: `Teacher ${teacher.fullName} (ID: ${teacherId}) is not assigned to subject ${subject.name} (ID: ${subjectId})`
        });
      }

      // Convert schedule times to UTC
      const scheduleStart = toUTC(schedule.start);
      
      // Check for scheduling conflicts
      const conflictCheck = await checkScheduleConflicts(
        null, // No examId for new exam
        classIds,
        scheduleStart,
        schedule.duration
      );

      if (conflictCheck.hasConflict) {
        const conflictingExam = conflictCheck.exams[0];
        return res.status(400).json({
          success: false,
          message: `Scheduling conflict with exam "${conflictingExam.title}" at ${new Date(conflictingExam.schedule.start).toISOString()}`,
          conflicts: conflictCheck.exams
        });
      }

      // Prepare questions array
      const preparedQuestions = questions.map(q => ({
        type: q.type,
        text: q.text,
        options: q.options || [],
        correctAnswer: q.correctAnswer || '',
        maxScore: q.maxScore
      }));

      const exam = new Exam({
        title,
        type,
        classes: classIds,
        subject: subjectId,
        teacher: teacherId,
        schedule: {
          start: scheduleStart,
          duration: schedule.duration
        },
        questions: preparedQuestions,
        instructions: instructions || undefined
      });

      await exam.save();
      
      // Add audit log
      await logAudit(
        'exam',
        exam._id,
        'create',
        req.user.id,
        null,
        { 
          title: exam.title, 
          status: exam.status, 
          schedule: exam.schedule 
        }
      );

      logger.info('Exam created successfully', { 
        examId: exam._id, 
        teacherId: req.user.id 
      });
      
      res.status(201).json({ success: true, exam });
    } catch (validationError) {
      return res.status(validationError.statusCode || 400).json({ 
        success: false, 
        message: validationError.message 
      });
    }
  } catch (error) {
    logger.error('createExam error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @route   GET /api/exams/:examId
// @desc    Get exam by ID (for Teacher and Student based on authorization)
// @access  Private (Teacher, Student)
exports.getExamById = async (req, res) => {
  try {
    const { examId } = req.params;
    const exam = await Exam.findById(examId)
      .populate('classes', 'level trade year term')
      .populate('subject', 'name')
      .populate('teacher', 'fullName');
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }
    // Remove correctAnswer from questions for students
    let examObj = exam.toObject();
    if (req.user.role === 'student') {
      examObj.questions = examObj.questions.map(q => {
        const { correctAnswer, ...rest } = q;
        return rest;
      });
    }
    res.json({ success: true, exam: examObj });
  } catch (error) {
    logger.error('getExamById error', { error: error.message });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @route   PUT /api/exams/:examId
// @desc    Update exam details
// @access  Private (Teacher)
exports.updateExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in updateExam', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { examId } = req.params;
    const sanitizedExamId = sanitize(examId);
    const {
      title,
      type,
      schedule,
      questions,
      instructions,
      status,
      classIds,
      subjectId
    } = req.body;

    const exam = await Exam.findById(sanitizedExamId);
    if (!exam) {
      logger.warn('Exam not found for update', { examId: sanitizedExamId, userId: req.user.id });
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    if (exam.teacher.toString() !== req.user.id) {
      logger.warn('Unauthorized attempt to update exam', { userId: req.user.id, examId: sanitizedExamId });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this exam'
      });
    }

    if (exam.status === 'active' || exam.status === 'completed') {
      if (questions || schedule || classIds || subjectId || (status && status !== exam.status)) {
        logger.warn('Attempt to modify active/completed exam fields not allowed', { examId: sanitizedExamId, status: exam.status, userId: req.user.id });
        return res.status(400).json({
          success: false,
          message: `Cannot modify questions, schedule, classes, subject, or change status of exam with status '${exam.status}'.`
        });
      }
      if (instructions) {
        exam.instructions = sanitize(instructions);
      }
    } else {
      exam.title = sanitize(title) || exam.title;
      exam.type = sanitize(type) || exam.type;
      exam.instructions = sanitize(instructions) || exam.instructions;

      if (classIds && Array.isArray(classIds)) {
        const sanitizedClassIds = classIds.map(id => sanitize(id));
        const classes = await Class.find({ _id: { $in: sanitizedClassIds } }).lean();
        if (classes.length !== sanitizedClassIds.length) {
          logger.warn('One or more classes not found for update', { classIds: sanitizedClassIds, userId: req.user.id });
          return res.status(404).json({ success: false, message: 'One or more classes not found' });
        }

        // Ensure teacher is authorized for all classes
        const teacherSubjects = await Subject.find({ teacher: req.user.id, class: { $in: sanitizedClassIds } }).lean();
        const teacherClassIds = teacherSubjects.map(s => s.class.toString());
        const invalidClasses = sanitizedClassIds.filter(id => !teacherClassIds.includes(id));
        if (invalidClasses.length > 0) {
          logger.warn('Teacher not authorized for some classes during update', { userId: req.user.id, invalidClasses });
          return res.status(403).json({
            success: false,
            message: 'You are not authorized to use some of the specified classes'
          });
        }
        exam.classes = sanitizedClassIds;
      }

      if (subjectId) {
        const subject = await Subject.findById(sanitize(subjectId)).lean();
        if (!subject) {
          logger.warn('Subject not found for update', { subjectId, userId: req.user.id });
          return res.status(404).json({ success: false, message: 'Subject not found' });
        }
        if (subject.teacher.toString() !== req.user.id) {
          logger.warn('Unauthorized subject update for exam', { userId: req.user.id, subjectId });
          return res.status(403).json({
            success: false,
            message: 'You are not authorized to use this subject'
          });
        }
        exam.subject = sanitize(subjectId);
      }

      if (schedule) {
        if (schedule.start && schedule.duration) {
          await Promise.all(validateScheduleExam.map(validator => validator.run(req)));
          const scheduleErrors = validationResult(req);
          const actualScheduleErrors = scheduleErrors.array().filter(err => err.path.startsWith('schedule.'));
          if (actualScheduleErrors.length > 0) {
            logger.warn('Schedule validation errors during exam update', { errors: actualScheduleErrors, userId: req.user.id });
            return res.status(400).json({ success: false, errors: actualScheduleErrors, message: 'Invalid schedule provided' });
          }

          const startDate = new Date(sanitize(schedule.start));
          if (status === 'scheduled' || exam.status === 'scheduled') {
            if (startDate <= new Date()) {
              logger.warn('Invalid start date in update: must be in the future', { examId: sanitizedExamId, startDate, userId: req.user.id });
              return res.status(400).json({
                success: false,
                message: 'Exam start time must be in the future'
              });
            }
          }
          exam.schedule = {
            start: startDate,
            duration: sanitize(schedule.duration)
          };
          if (exam.status === 'draft' || exam.status === 'pending') {
            exam.status = 'scheduled';
          }
        } else if (schedule.start === null && schedule.duration === null) {
          exam.schedule = undefined;
          if (exam.status === 'scheduled') {
            exam.status = 'draft';
          }
        } else {
          logger.warn('Partial schedule update attempt, ignored.', { examId: sanitizedExamId, schedule, userId: req.user.id });
        }
      }

      if (questions && questions.length >= 0) {
        exam.questions = questions.map(q => {
          const sanitizedQuestion = {
            type: sanitize(q.type) || 'multiple-choice',
            text: sanitize(q.text) || '',
            maxScore: parseInt(q.maxScore || q.points || 10) || 10,
          };

          if (q.options && Array.isArray(q.options)) {
            sanitizedQuestion.options = q.options.map(o => ({
              text: sanitize(typeof o === 'object' ? o.text : String(o)),
              isCorrect: typeof o === 'object' ? !!o.isCorrect : false
            }));
          } else {
            sanitizedQuestion.options = [];
          }

          if (q.correctAnswer) {
            sanitizedQuestion.correctAnswer = sanitize(String(q.correctAnswer));
          } else if (sanitizedQuestion.type === 'multiple-choice' && sanitizedQuestion.options.length > 0) {
            const correctOption = sanitizedQuestion.options.find(opt => opt.isCorrect);
            sanitizedQuestion.correctAnswer = correctOption ? correctOption.text : '';
          } else {
            sanitizedQuestion.correctAnswer = '';
          }
          return sanitizedQuestion;
        });
      }
    }

    await exam.save();

    logger.info('Exam updated successfully', { examId: sanitizedExamId, teacherId: req.user.id });
    res.status(200).json({ success: true, exam: exam.toObject() });
  } catch (error) {
    logger.error('Error in updateExam', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @route   DELETE /api/exams/:examId
// @desc    Delete exam
// @access  Private (Teacher)
exports.deleteExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in deleteExam', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { examId } = req.params;
    const sanitizedExamId = sanitize(examId);

    const exam = await Exam.findById(sanitizedExamId);
    if (!exam) {
      logger.warn('Exam not found for deletion', { examId: sanitizedExamId, userId: req.user.id });
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    if (exam.teacher.toString() !== req.user.id) {
      logger.warn('Unauthorized attempt to delete exam', { userId: req.user.id, examId: sanitizedExamId });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this exam'
      });
    }

    if (exam.status !== 'draft') {
      logger.warn('Cannot delete exam with status', { examId: sanitizedExamId, status: exam.status, userId: req.user.id });
      return res.status(400).json({
        success: false,
        message: `Cannot delete exam with status '${exam.status}'. Only 'draft' exams can be deleted.`
      });
    }

    await exam.deleteOne();

    logger.info('Exam deleted successfully', { examId: sanitizedExamId, teacherId: req.user.id });
    res.status(200).json({ success: true, message: 'Exam deleted successfully' });
  } catch (error) {
    logger.error('Error in deleteExam', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @route   GET /api/exams/student/upcoming
// @desc    Get upcoming exams for a student
// @access  Private (Student)
exports.getUpcomingExamsForStudent = async (req, res) => {
  try {
    const student = await User.findById(req.user.id).lean();
    if (!student || !student.class) {
      logger.warn('Student class not found for upcoming exams', { userId: req.user.id });
      return res.status(404).json({ success: false, message: 'Student class information is missing.' });
    }

    const now = new Date();
    const exams = await Exam.find({
      classes: student.class,
      status: 'scheduled',
      'schedule.start': { $gte: now }
    })
      .populate('subject', 'name')
      .populate('teacher', 'fullName')
      .select('title type schedule subject teacher')
      .sort({ 'schedule.start': 1 })
      .lean();

    logger.info('Upcoming exams fetched for student', { userId: req.user.id, classId: student.class });
    res.status(200).json({ success: true, exams });
  } catch (error) {
    logger.error('Error in getUpcomingExamsForStudent', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @route   GET /api/exams/student/class
// @desc    Get all exams for student's class (scheduled or active)
// @access  Private (Student)
exports.getStudentClassExams = async (req, res) => {
  try {
    const student = await User.findById(req.user.id).select('class');
    if (!student || !student.class) {
      logger.warn('Student class not found', { userId: req.user.id });
      return res.status(400).json({ success: false, message: 'Student class not found' });
    }
    const exams = await Exam.find({
      classes: student.class,
      status: { $in: ['scheduled', 'active'] }
    })
      .populate('subject', 'name')
      .populate('teacher', 'fullName')
      .populate('classes', 'level trade year term')
      .lean();
    logger.info('Class exams fetched for student', {
      classId: student.class,
      userId: req.user.id,
      examCount: exams.length,
      exams: exams.map(e => ({ id: e._id, title: e.title, status: e.status }))
    });
    console.log('Exams for class:', exams.map(e => ({ id: e._id, title: e.title, status: e.status })));
    res.status(200).json({ success: true, exams });
  } catch (error) {
    logger.error('Error fetching student class exams', {
      error: error.message,
      userId: req.user.id
    });
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   PUT /api/exams/:examId/activate
// @desc    Activate exam (change status from 'scheduled' to 'active')
// @access  Private (Teacher)
exports.activateExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in activateExam', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { examId } = req.params;
    
    try {
      const exam = await validateEntity(Exam, examId, 'Exam');

      if (exam.teacher.toString() !== req.user.id) {
        logger.warn('Unauthorized attempt to activate exam', { userId: req.user.id, examId });
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to activate this exam'
        });
      }

      if (exam.status !== 'scheduled') {
        logger.warn('Cannot activate exam with status', { 
          examId, 
          status: exam.status, 
          userId: req.user.id 
        });
        return res.status(400).json({
          success: false,
          message: `Exam status must be 'scheduled' to activate. Current status: '${exam.status}'.`
        });
      }

      if (exam.schedule && new Date(exam.schedule.start) > new Date()) {
        logger.warn('Cannot activate exam before its scheduled start time', { 
          examId, 
          userId: req.user.id, 
          scheduledStart: exam.schedule.start 
        });
        return res.status(400).json({
          success: false,
          message: 'Cannot activate exam before its scheduled start time.'
        });
      }

      const previousStatus = exam.status;
      exam.status = 'active';
      await exam.save();

      // Add audit log
      await logAudit(
        'exam',
        exam._id,
        'status_change',
        req.user.id,
        { status: previousStatus },
        { status: 'active' }
      );

      logger.info('Exam activated successfully', { examId, teacherId: req.user.id });
      res.status(200).json({ 
        success: true, 
        message: 'Exam activated successfully', 
        exam: exam.toObject() 
      });
    } catch (validationError) {
      return res.status(validationError.statusCode || 400).json({ 
        success: false, 
        message: validationError.message 
      });
    }
  } catch (error) {
    logger.error('Error in activateExam', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @route   PUT /api/exams/:examId/complete
// @desc    Complete exam (change status from 'active' to 'completed')
// @access  Private (Teacher)
exports.completeExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in completeExam', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { examId } = req.params;
    
    try {
      const exam = await validateEntity(Exam, examId, 'Exam');

      if (exam.teacher.toString() !== req.user.id) {
        logger.warn('Unauthorized attempt to complete exam', { userId: req.user.id, examId });
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to complete this exam'
        });
      }

      if (exam.status !== 'active') {
        logger.warn('Cannot complete exam with status', { 
          examId, 
          status: exam.status, 
          userId: req.user.id 
        });
        return res.status(400).json({
          success: false,
          message: `Exam status must be 'active' to complete. Current status: '${exam.status}'.`
        });
      }

      const previousStatus = exam.status;
      exam.status = 'completed';
      await exam.save();

      // Add audit log
      await logAudit(
        'exam',
        exam._id,
        'status_change',
        req.user.id,
        { status: previousStatus },
        { status: 'completed' }
      );

      logger.info('Exam completed successfully', { examId, teacherId: req.user.id });
      res.status(200).json({ 
        success: true, 
        message: 'Exam marked as completed', 
        exam: exam.toObject() 
      });
    } catch (validationError) {
      return res.status(validationError.statusCode || 400).json({ 
        success: false, 
        message: validationError.message 
      });
    }
  } catch (error) {
    logger.error('Error in completeExam', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @route   GET /api/exams/teacher
// @desc    Get all exams created by teacher
// @access  Private (Teacher)
exports.getTeacherExams = async (req, res) => {
  try {
    const exams = await Exam.find({ 
      teacher: req.user.id,
      isDeleted: false 
    })
      .populate('classes', 'level trade year term')
      .populate('subject', 'name')
      .sort({ 'schedule.start': -1 })
      .lean();
    
    logger.info('Teacher exams fetched', { 
      teacherId: req.user.id, 
      examCount: exams.length 
    });
    
    res.status(200).json({ success: true, exams });
  } catch (error) {
    logger.error('Error fetching teacher exams', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user.id 
    });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.scheduleExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in scheduleExam', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { examId } = req.params;
    const { start, duration } = req.body;
    
    try {
      const exam = await validateEntity(Exam, examId, 'Exam');

      if (exam.teacher.toString() !== req.user.id) {
        logger.warn('Unauthorized attempt to schedule exam', { userId: req.user.id, examId });
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to schedule this exam'
        });
      }

      if (exam.status === 'active' || exam.status === 'completed') {
        logger.warn('Cannot schedule exam that is active or completed', { 
          examId, 
          status: exam.status, 
          userId: req.user.id 
        });
        return res.status(400).json({
          success: false,
          message: `Cannot schedule exam with status '${exam.status}'.`
        });
      }

      const startDate = toUTC(start);
      if (startDate <= new Date()) {
        logger.warn('Invalid start date: must be in the future for scheduled exam', { 
          userId: req.user.id, 
          startDate 
        });
        return res.status(400).json({
          success: false,
          message: 'Exam start time must be in the future.'
        });
      }
      
      // Check for scheduling conflicts
      const conflictCheck = await checkScheduleConflicts(
        examId,
        exam.classes,
        startDate,
        duration
      );

      if (conflictCheck.hasConflict) {
        const conflictingExam = conflictCheck.exams[0];
        return res.status(400).json({
          success: false,
          message: `Scheduling conflict with exam "${conflictingExam.title}" at ${new Date(conflictingExam.schedule.start).toISOString()}`,
          conflicts: conflictCheck.exams
        });
      }

      const previousValues = {
        status: exam.status,
        schedule: exam.schedule
      };

      exam.schedule = {
        start: startDate,
        duration
      };
      exam.status = 'scheduled';

      await exam.save();

      // Add audit log
      await logAudit(
        'exam',
        exam._id,
        'schedule',
        req.user.id,
        previousValues,
        { 
          status: exam.status,
          schedule: exam.schedule 
        }
      );

      logger.info('Exam scheduled successfully', { 
        examId, 
        teacherId: req.user.id, 
        schedule: exam.schedule 
      });
      
      res.status(200).json({ 
        success: true, 
        message: 'Exam scheduled successfully', 
        exam: exam.toObject() 
      });
    } catch (validationError) {
      return res.status(validationError.statusCode || 400).json({ 
        success: false, 
        message: validationError.message 
      });
    }
  } catch (error) {
    logger.error('Error in scheduleExam', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @route   GET /api/exams/classes/teacher
// @desc    Get classes for logged in teacher
// @access  Private (Teacher)
exports.getClassesForTeacher = async (req, res) => {
  try {
    const teacher = await User.findById(req.user.id).lean();
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }
    
    // Find subjects this teacher teaches
    const subjects = await Subject.find({ teacher: req.user.id, isDeleted: false })
      .select('classes')
      .lean();
    
    if (!subjects || subjects.length === 0) {
      return res.status(200).json({ success: true, classes: [] });
    }
    
    // Get all class IDs from subjects
    const classIds = [];
    subjects.forEach(subject => {
      if (subject.classes && subject.classes.length > 0) {
        subject.classes.forEach(classId => {
          if (!classIds.includes(classId.toString())) {
            classIds.push(classId.toString());
          }
        });
      }
    });
    
    // Get class details
    const classes = await Class.find({ 
      _id: { $in: classIds },
      isDeleted: false
    })
    .lean();
    
    logger.info('Classes for teacher fetched', { 
      teacherId: req.user.id,
      classCount: classes.length
    });
    
    res.status(200).json({ success: true, classes });
  } catch (error) {
    logger.error('Error fetching classes for teacher', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user.id 
    });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @route   GET /api/subjects/teacher
// @desc    Get all subjects assigned to teacher
// @access  Private (Teacher)
exports.getTeacherSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({ 
      teacher: req.user.id,
      isDeleted: false 
    })
      .populate('classes', 'level trade year term')
      .populate('school', 'name')
      .lean();
    
    logger.info('Teacher subjects fetched', { 
      teacherId: req.user.id, 
      subjectCount: subjects.length 
    });
    
    res.status(200).json({ success: true, subjects });
  } catch (error) {
    logger.error('Error fetching teacher subjects', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user.id 
    });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Export all functions and validation arrays
module.exports = {
  createExam: exports.createExam,
  getExamById: exports.getExamById,
  updateExam: exports.updateExam,
  scheduleExam: exports.scheduleExam, 
  deleteExam: exports.deleteExam,
  getUpcomingExamsForStudent: exports.getUpcomingExamsForStudent,
  getStudentClassExams: exports.getStudentClassExams,
  activateExam: exports.activateExam,
  completeExam: exports.completeExam,
  getTeacherExams: exports.getTeacherExams,
  getTeacherSubjects: exports.getTeacherSubjects,
  getClassesForTeacher: exports.getClassesForTeacher,  // Add this line
  validateCreateExam,
  validateUpdateExam,
  validateExamIdParam,
  validateScheduleExam
};