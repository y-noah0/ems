const Exam = require('../models/Exam');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const User = require('../models/User');
const mongoose = require('mongoose');
const { check, validationResult, param } = require('express-validator');
const sanitize = require('mongo-sanitize');
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

// --- Validation Rules ---
const validateCreateExam = [
  check('title').notEmpty().withMessage('Title is required'),
  check('type').isIn(['ass1', 'ass2', 'hw', 'exam', 'midterm', 'final', 'quiz', 'practice']).withMessage('Invalid exam type'),
  check('classIds').isArray({ min: 1 }).withMessage('At least one class ID is required'),
  check('classIds.*').isMongoId().withMessage('Invalid class ID'),
  check('subjectId').isMongoId().withMessage('Invalid subject ID')
];

const validateUpdateExam = [
  check('title').optional().notEmpty().withMessage('Title cannot be empty'),
  check('type').optional().isIn(['ass1', 'ass2', 'hw', 'exam', 'midterm', 'final', 'quiz', 'practice']).withMessage('Invalid exam type'),
  check('classIds').optional().isArray({ min: 1 }).withMessage('At least one class ID is required'),
  check('classIds.*').optional().isMongoId().withMessage('Invalid class ID'),
  check('subjectId').optional().isMongoId().withMessage('Invalid subject ID'),
  check('schedule.start')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Invalid schedule start date format (YYYY-MM-DDTHH:MM:SSZ)'),
  check('schedule.duration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer'),
  check('questions')
    .optional()
    .isArray()
    .withMessage('Questions must be an array'),
  check('questions.*.text')
    .optional()
    .notEmpty()
    .withMessage('Question text cannot be empty'),
  check('questions.*.type')
    .optional()
    .isIn(['multiple-choice', 'true-false', 'short-answer', 'essay'])
    .withMessage('Invalid question type'),
  check('questions.*.maxScore')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Question score must be a positive integer'),
];

const validateScheduleExam = [
  check('start').isISO8601().toDate().withMessage('Start time is required and must be a valid date'),
  check('duration').isInt({ min: 5 }).withMessage('Duration must be at least 5 minutes')
];

const validateExamIdParam = [
  param('examId').isMongoId().withMessage('Invalid exam ID')
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
      schedule,
      questions,
      instructions,
      classIds,
      subjectId
    } = req.body;

    // Ensure classIds is provided and is an array
    if (!Array.isArray(classIds) || classIds.length === 0) {
      logger.warn('classIds missing or not an array in createExam', { userId: req.user.id, classIds });
      return res.status(400).json({ success: false, message: 'classIds is required and must be a non-empty array' });
    }

    const sanitizedClassIds = classIds.map(id => sanitize(id));
    const classes = await Class.find({ _id: { $in: sanitizedClassIds } }).lean();
    if (classes.length !== sanitizedClassIds.length) {
      logger.warn('One or more classes not found', { classIds: sanitizedClassIds, userId: req.user.id });
      return res.status(404).json({ success: false, message: 'One or more classes not found' });
    }

    const sanitizedSubjectId = sanitize(subjectId);
    const subject = await Subject.findById(sanitizedSubjectId).lean();
    if (!subject) {
      logger.warn('Subject not found', { subjectId: sanitizedSubjectId, userId: req.user.id });
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    if (subject.teacher.toString() !== req.user.id) {
      logger.warn('Unauthorized attempt to create exam for subject', {
        userId: req.user.id,
        subjectId: sanitizedSubjectId,
        teacherOfSubject: subject.teacher.toString()
      });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to create exams for this subject'
      });
    }

    // Ensure teacher is assigned to all classes (optional, depending on requirements)
    const teacherSubjects = await Subject.find({ teacher: req.user.id, class: { $in: sanitizedClassIds } }).lean();
    const teacherClassIds = teacherSubjects.map(s => s.class.toString());
    const invalidClasses = sanitizedClassIds.filter(id => !teacherClassIds.includes(id));
    if (invalidClasses.length > 0) {
      logger.warn('Teacher not authorized for some classes', { userId: req.user.id, invalidClasses });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to create exams for some of the specified classes'
      });
    }

    let sanitizedQuestions = [];
    if (questions && Array.isArray(questions)) {
      sanitizedQuestions = questions.map(q => {
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

    const newExam = new Exam({
      title: sanitize(title),
      classes: sanitizedClassIds,
      subject: sanitizedSubjectId,
      teacher: req.user.id,
      type: sanitize(type),
      instructions: sanitize(instructions),
      questions: sanitizedQuestions,
      status: 'draft'
    });

    if (schedule && schedule.start && schedule.duration) {
      await Promise.all(validateScheduleExam.map(validator => validator.run(req)));
      const scheduleErrors = validationResult(req);
      const actualScheduleErrors = scheduleErrors.array().filter(err => err.path.startsWith('schedule.'));
      if (actualScheduleErrors.length > 0) {
        logger.warn('Schedule validation errors during exam creation', { errors: actualScheduleErrors, userId: req.user.id });
        return res.status(400).json({ success: false, errors: actualScheduleErrors, message: 'Invalid schedule provided' });
      }

      const startDate = new Date(sanitize(schedule.start));
      if (startDate <= new Date()) {
        logger.warn('Invalid start date: must be in the future for scheduled exam', { userId: req.user.id, startDate });
        return res.status(400).json({
          success: false,
          message: 'Exam start time must be in the future for a scheduled exam'
        });
      }
      newExam.schedule = {
        start: startDate,
        duration: sanitize(schedule.duration)
      };
      newExam.status = 'scheduled';
    }

    await newExam.save();

    logger.info('Exam created successfully', {
      examId: newExam._id,
      teacherId: req.user.id,
      status: newExam.status
    });

    res.status(201).json({ success: true, exam: newExam.toObject() });
  } catch (error) {
    logger.error('Error in createExam', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @route   GET /api/exams/teacher
// @desc    Get all exams created by the teacher
// @access  Private (Teacher)
exports.getTeacherExams = async (req, res) => {
  try {
    const exams = await Exam.find({ teacher: req.user.id })
      .populate('classes', 'level trade year term name')
      .populate('subject', 'name')
      .sort({ createdAt: -1 })
      .lean();

    logger.info('Teacher exams fetched', { userId: req.user.id });
    res.status(200).json({ success: true, exams });
  } catch (error) {
    logger.error('Error in getTeacherExams', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @route   GET /api/exams/:examId
// @desc    Get exam by ID (for Teacher and Student based on authorization)
// @access  Private (Teacher, Student)
exports.getExamById = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in getExamById', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { examId } = req.params;
    const sanitizedExamId = sanitize(examId);

    const exam = await Exam.findById(sanitizedExamId)
      .populate('classes', 'level trade year term name')
      .populate('subject', 'name')
      .populate('teacher', 'fullName email');

    if (!exam) {
      logger.warn('Exam not found', { examId: sanitizedExamId, userId: req.user.id });
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    // Authorization checks
    if (req.user.role === 'teacher') {
      if (exam.teacher._id.toString() !== req.user.id) {
        logger.warn('Unauthorized teacher access to exam', { userId: req.user.id, examId: sanitizedExamId, examTeacherId: exam.teacher._id.toString() });
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to access this exam'
        });
      }
    } else if (req.user.role === 'student') {
      if (!req.user.class) {
        logger.warn('Student class not found in user object for authorization', { userId: req.user.id });
        return res.status(404).json({ success: false, message: 'Your class information is not available.' });
      }

      // Check if student's class is in exam.classes and exam status is 'scheduled' or 'active'
      const classIds = exam.classes.map(c => c._id.toString());
      if (!classIds.includes(req.user.class.toString()) || !['scheduled', 'active'].includes(exam.status)) {
        logger.warn('Unauthorized student access to exam (class mismatch or invalid status)', {
          userId: req.user.id,
          examId: sanitizedExamId,
          studentClass: req.user.class.toString(),
          examClasses: classIds,
          examStatus: exam.status
        });
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to access this exam or it is not yet available.'
        });
      }

      // For students, remove correct answers from questions
      exam.questions = exam.questions.map(q => {
        const questionObj = q.toObject();
        const { correctAnswer, ...rest } = questionObj;
        return rest;
      });
    } else {
      logger.warn('Unauthorized access attempt by unknown role', { userId: req.user.id, role: req.user.role });
      return res.status(403).json({ success: false, message: 'Unauthorized access.' });
    }

    logger.info('Exam fetched by ID', { examId: exam._id, userId: req.user.id });
    res.status(200).json({ success: true, exam: exam.toObject() });
  } catch (error) {
    logger.error('Error in getExamById', { error: error.message, stack: error.stack, userId: req.user.id });
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
    const sanitizedExamId = sanitize(examId);

    const exam = await Exam.findById(sanitizedExamId);
    if (!exam) {
      logger.warn('Exam not found for activation', { examId: sanitizedExamId, userId: req.user.id });
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    if (exam.teacher.toString() !== req.user.id) {
      logger.warn('Unauthorized attempt to activate exam', { userId: req.user.id, examId: sanitizedExamId });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to activate this exam'
      });
    }

    if (exam.status !== 'scheduled') {
      logger.warn('Cannot activate exam with status', { examId: sanitizedExamId, status: exam.status, userId: req.user.id });
      return res.status(400).json({
        success: false,
        message: `Exam status must be 'scheduled' to activate. Current status: '${exam.status}'.`
      });
    }

    if (exam.schedule && new Date(exam.schedule.start) > new Date()) {
      logger.warn('Cannot activate exam before its scheduled start time', { examId: sanitizedExamId, userId: req.user.id, scheduledStart: exam.schedule.start });
      return res.status(400).json({
        success: false,
        message: 'Cannot activate exam before its scheduled start time.'
      });
    }

    exam.status = 'active';
    await exam.save();

    logger.info('Exam activated successfully', { examId: sanitizedExamId, teacherId: req.user.id });
    res.status(200).json({ success: true, message: 'Exam activated successfully', exam: exam.toObject() });
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
    const sanitizedExamId = sanitize(examId);

    const exam = await Exam.findById(sanitizedExamId);
    if (!exam) {
      logger.warn('Exam not found for completion', { examId: sanitizedExamId, userId: req.user.id });
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    if (exam.teacher.toString() !== req.user.id) {
      logger.warn('Unauthorized attempt to complete exam', { userId: req.user.id, examId: sanitizedExamId });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to complete this exam'
      });
    }

    if (exam.status !== 'active') {
      logger.warn('Cannot complete exam with status', { examId: sanitizedExamId, status: exam.status, userId: req.user.id });
      return res.status(400).json({
        success: false,
        message: `Exam status must be 'active' to complete. Current status: '${exam.status}'.`
      });
    }

    exam.status = 'completed';
    await exam.save();

    logger.info('Exam completed successfully', { examId: sanitizedExamId, teacherId: req.user.id });
    res.status(200).json({ success: true, message: 'Exam marked as completed', exam: exam.toObject() });
  } catch (error) {
    logger.error('Error in completeExam', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @route   PUT /api/exams/:examId/schedule
// @desc    Schedule an exam
// @access  Private (Teacher)
exports.scheduleExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in scheduleExam', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { examId } = req.params;
    const { start, duration } = req.body;
    const sanitizedExamId = sanitize(examId);

    const exam = await Exam.findById(sanitizedExamId);
    if (!exam) {
      logger.warn('Exam not found for scheduling', { examId: sanitizedExamId, userId: req.user.id });
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    if (exam.teacher.toString() !== req.user.id) {
      logger.warn('Unauthorized attempt to schedule exam', { userId: req.user.id, examId: sanitizedExamId });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to schedule this exam'
      });
    }

    if (exam.status === 'active' || exam.status === 'completed') {
      logger.warn('Cannot schedule exam that is active or completed', { examId: sanitizedExamId, status: exam.status, userId: req.user.id });
      return res.status(400).json({
        success: false,
        message: `Cannot schedule exam with status '${exam.status}'.`
      });
    }

    const startDate = new Date(sanitize(start));
    if (startDate <= new Date()) {
      logger.warn('Invalid start date: must be in the future for scheduled exam', { userId: req.user.id, startDate });
      return res.status(400).json({
        success: false,
        message: 'Exam start time must be in the future.'
      });
    }

    exam.schedule = {
      start: startDate,
      duration: sanitize(duration)
    };
    exam.status = 'scheduled';

    await exam.save();

    logger.info('Exam scheduled successfully', { examId: sanitizedExamId, teacherId: req.user.id, schedule: exam.schedule });
    res.status(200).json({ success: true, message: 'Exam scheduled successfully', exam: exam.toObject() });
  } catch (error) {
    logger.error('Error in scheduleExam', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @route   GET /api/teacher/subjects
// @desc    Get all subjects assigned to teacher
// @access  Private (Teacher)
exports.getTeacherSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({ teacher: req.user.id })
      .populate('class', 'level trade year term name')
      .sort({ name: 1 })
      .lean();

    logger.info('Teacher subjects fetched', { userId: req.user.id });
    res.status(200).json({ success: true, subjects });
  } catch (error) {
    logger.error('Error in getTeacherSubjects', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @route   GET /api/teacher/classes
// @desc    Get classes associated with subjects taught by teacher
// @access  Private (Teacher)
exports.getClassesForTeacher = async (req, res) => {
  try {
    const teacherSubjects = await Subject.find({ teacher: req.user.id }).lean();
    const classIds = [...new Set(teacherSubjects.map(subject => subject.class.toString()))].map(id => new mongoose.Types.ObjectId(id));

    if (classIds.length === 0) {
      logger.info('No classes found for teacher', { userId: req.user.id });
      return res.status(200).json({ success: true, classes: [] });
    }

    const classes = await Class.find({ _id: { $in: classIds } })
      .sort({ level: 1, trade: 1, year: 1, term: 1 })
      .lean();

    logger.info('Classes fetched for teacher', { userId: req.user.id });
    res.status(200).json({ success: true, classes });
  } catch (error) {
    logger.error('Error in getClassesForTeacher', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Export validation arrays for use in routes
exports.validateCreateExam = validateCreateExam;
exports.validateUpdateExam = validateUpdateExam;
exports.validateExamIdParam = validateExamIdParam;
exports.validateScheduleExam = validateScheduleExam;