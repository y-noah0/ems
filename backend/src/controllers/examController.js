const Exam = require('../models/Exam');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const User = require('../models/User');
const { check, validationResult, param } = require('express-validator');
const sanitize = require('mongo-sanitize');
const winston = require('winston');

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

const examController = {};

// Validation rules
const validateCreateExam = [
  check('title').notEmpty().withMessage('Title is required'),
  check('type').isIn(['MCQ', 'open']).withMessage('Invalid exam type'),
  check('classId').isMongoId().withMessage('Invalid class ID'),
  check('subjectId').isMongoId().withMessage('Invalid subject ID')
];

const validateUpdateExam = [
  check('title').optional().notEmpty().withMessage('Title cannot be empty'),
  check('type').optional().isIn(['MCQ', 'open']).withMessage('Invalid exam type'),
  check('classId').optional().isMongoId().withMessage('Invalid class ID'),
  check('subjectId').optional().isMongoId().withMessage('Invalid subject ID')
];

const validateScheduleExam = [
  check('start').notEmpty().withMessage('Start time is required'),
  check('duration').isInt({ min: 5 }).withMessage('Duration must be at least 5 minutes')
];

const validateExamIdParam = [
  param('examId').isMongoId().withMessage('Invalid exam ID')
];

// Create new exam
examController.createExam = async (req, res) => {
  try {
    await Promise.all(validateCreateExam.map(validator => validator.run(req)));
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
      classId,
      subjectId
    } = req.body;

    const sanitizedClassId = sanitize(classId);
    const sanitizedSubjectId = sanitize(subjectId);

    const classExists = await Class.findById(sanitizedClassId).lean();
    if (!classExists) {
      logger.warn('Class not found', { classId: sanitizedClassId, userId: req.user.id });
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    const subject = await Subject.findById(sanitizedSubjectId).lean();
    if (!subject) {
      logger.warn('Subject not found', { subjectId: sanitizedSubjectId, userId: req.user.id });
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    if (subject.teacher.toString() !== req.user.id) {
      logger.warn('Unauthorized attempt to create exam', {
        userId: req.user.id,
        subjectId: sanitizedSubjectId
      });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to create exams for this subject'
      });
    }

    const newExam = new Exam({
      title: sanitize(title),
      class: sanitizedClassId,
      subject: sanitizedSubjectId,
      teacher: req.user.id,
      type: sanitize(type),
      schedule,
      questions: sanitize(questions),
      instructions: sanitize(instructions),
      status: schedule ? 'scheduled' : 'draft'
    });

    await newExam.save();

    logger.info('Exam created successfully', {
      examId: newExam._id,
      teacherId: req.user.id
    });

    res.status(201).json({ success: true, exam: newExam.toObject() });
  } catch (error) {
    logger.error('Error in createExam', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get all exams created by the teacher
examController.getTeacherExams = async (req, res) => {
  try {
    const exams = await Exam.find({ teacher: req.user.id })
      .populate('class', 'level trade year term')
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

// Get exam by ID
examController.getExamById = async (req, res) => {
  try {
    await Promise.all(validateExamIdParam.map(validator => validator.run(req)));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in getExamById', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { examId } = req.params;
    const sanitizedExamId = sanitize(examId);

    const exam = await Exam.findById(sanitizedExamId)
      .populate('class', 'level trade year term')
      .populate('subject', 'name')
      .populate('teacher', 'fullName email')
      .lean();

    if (!exam) {
      logger.warn('Exam not found', { examId: sanitizedExamId, userId: req.user.id });
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    // --- FIX: Add checks before accessing nested properties ---
    if (req.user.role === 'teacher') {
      if (!exam.teacher || !exam.teacher._id) {
        logger.warn('Exam teacher missing', { examId: sanitizedExamId, userId: req.user.id });
        return res.status(404).json({ success: false, message: 'Exam teacher not found' });
      }
      if (exam.teacher._id.toString() !== req.user.id) {
        logger.warn('Unauthorized access to exam', { userId: req.user.id, examId: sanitizedExamId });
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to access this exam'
        });
      }
    }

    if (req.user.role === 'student') {
      if (!exam.class || !exam.class._id) {
        logger.warn('Exam class missing', { examId: sanitizedExamId, userId: req.user.id });
        return res.status(404).json({ success: false, message: 'Exam class not found' });
      }
      if (!req.user.class) {
        logger.warn('Student class missing', { userId: req.user.id });
        return res.status(404).json({ success: false, message: 'Student class not found' });
      }
      if (exam.class._id.toString() !== req.user.class.toString() ||
        !(exam.status === 'scheduled' || exam.status === 'active')) {
        logger.warn('Unauthorized student access to exam', { userId: req.user.id, examId: sanitizedExamId });
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to access this exam'
        });
      }
      exam.questions = exam.questions.map(q => {
        const { correctAnswer, ...rest } = q;
        return rest;
      });
    }

    logger.info('Exam fetched by ID', { examId: exam._id, userId: req.user.id });
    res.status(200).json({ success: true, exam });
  } catch (error) {
    logger.error('Error in getExamById', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
// Update exam
examController.updateExam = async (req, res) => {
  try {
    await Promise.all(validateExamIdParam.concat(validateUpdateExam).map(validator => validator.run(req)));
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
      class: classId,
      subject: subjectId
    } = req.body;

    const exam = await Exam.findById(sanitizedExamId);
    if (!exam) {
      logger.warn('Exam not found', { examId: sanitizedExamId, userId: req.user.id });
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
      logger.warn('Cannot update exam with status', { examId: sanitizedExamId, status: exam.status, userId: req.user.id });
      return res.status(400).json({
        success: false,
        message: `Cannot update exam with status '${exam.status}'`
      });
    }

    if (schedule && schedule.start) {
      const startDate = new Date(schedule.start);
      if (startDate <= new Date()) {
        logger.warn('Invalid start date', { examId: sanitizedExamId, startDate, userId: req.user.id });
        return res.status(400).json({
          success: false,
          message: 'Exam start time must be in the future'
        });
      }
    }

    exam.title = sanitize(title) || exam.title;
    exam.type = sanitize(type) || exam.type;
    exam.schedule = schedule || exam.schedule;
    exam.instructions = sanitize(instructions) || exam.instructions;

    if (classId) {
      const classExists = await Class.findById(sanitize(classId)).lean();
      if (!classExists) {
        logger.warn('Class not found', { classId, userId: req.user.id });
        return res.status(404).json({ success: false, message: 'Class not found' });
      }
      exam.class = sanitize(classId);
    }

    if (subjectId) {
      const subject = await Subject.findById(sanitize(subjectId)).lean();
      if (!subject) {
        logger.warn('Subject not found', { subjectId, userId: req.user.id });
        return res.status(404).json({ success: false, message: 'Subject not found' });
      }
      if (subject.teacher.toString() !== req.user.id) {
        logger.warn('Unauthorized subject update', { userId: req.user.id, subjectId });
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to use this subject'
        });
      }
      exam.subject = sanitize(subjectId);
    }

    if (questions && questions.length > 0) {
      exam.questions = questions.map(q => ({
        type: sanitize(q.type) || 'MCQ',
        text: sanitize(q.text) || 'Untitled question',
        maxScore: parseInt(q.maxScore || q.points || 10),
        options: q.options ? q.options.map(o => sanitize(typeof o === 'object' ? o.text : o)) : ['Option 1', 'Option 2'],
        correctAnswer: sanitize(q.correctAnswer) || (q.type === 'MCQ' ? (q.options && q.options[0] ? q.options[0] : 'Option 1') : '')
      }));
    }

    if (status) {
      if (status === 'scheduled' && (!exam.schedule || !exam.schedule.start || !exam.schedule.duration)) {
        logger.warn('Invalid schedule for status change', { examId: sanitizedExamId, userId: req.user.id });
        return res.status(400).json({
          success: false,
          message: 'Cannot schedule exam without start date and duration'
        });
      }
      exam.status = sanitize(status);
    }

    await exam.save();

    logger.info('Exam updated successfully', { examId: sanitizedExamId, teacherId: req.user.id });

    res.status(200).json({ success: true, exam: exam.toObject() });
  } catch (error) {
    logger.error('Error in updateExam', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Delete exam
examController.deleteExam = async (req, res) => {
  try {
    await Promise.all(validateExamIdParam.map(validator => validator.run(req)));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in deleteExam', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { examId } = req.params;
    const sanitizedExamId = sanitize(examId);

    const exam = await Exam.findById(sanitizedExamId);
    if (!exam) {
      logger.warn('Exam not found', { examId: sanitizedExamId, userId: req.user.id });
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
        message: `Cannot delete exam with status '${exam.status}'`
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

// Get upcoming exams for a student
examController.getUpcomingExamsForStudent = async (req, res) => {
  try {
    const student = await User.findById(req.user.id).lean();
    if (!student || !student.class) {
      logger.warn('Student class not found', { userId: req.user.id });
      return res.status(404).json({ success: false, message: 'Student class not found' });
    }

    const now = new Date();
    const exams = await Exam.find({
      class: student.class,
      status: 'scheduled',
      'schedule.start': { $gte: now }
    })
      .populate('subject', 'name')
      .populate('teacher', 'fullName')
      .select('title type schedule subject teacher')
      .sort({ 'schedule.start': 1 })
      .lean();

    logger.info('Upcoming exams fetched for student', { userId: req.user.id });
    res.status(200).json({ success: true, exams });
  } catch (error) {
    logger.error('Error in getUpcomingExamsForStudent', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get all exams for student's class
examController.getStudentClassExams = async (req, res) => {
  try {
    const student = await User.findById(req.user.id).lean();
    if (!student || !student.class) {
      logger.warn('Student class not found', { userId: req.user.id });
      return res.status(404).json({ success: false, message: 'Student class not found' });
    }

    const exams = await Exam.find({ class: student.class })
      .populate('subject', 'name')
      .populate('teacher', 'fullName')
      .select('title type schedule status subject teacher')
      .sort({ createdAt: -1 })
      .lean();

    logger.info('Class exams fetched for student', { userId: req.user.id });
    res.status(200).json({ success: true, exams });
  } catch (error) {
    logger.error('Error in getStudentClassExams', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Activate exam
examController.activateExam = async (req, res) => {
  try {
    await Promise.all(validateExamIdParam.map(validator => validator.run(req)));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in activateExam', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { examId } = req.params;
    const sanitizedExamId = sanitize(examId);

    const exam = await Exam.findById(sanitizedExamId);
    if (!exam) {
      logger.warn('Exam not found', { examId: sanitizedExamId, userId: req.user.id });
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
        message: `Cannot activate exam with status '${exam.status}'`
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

// Complete exam
examController.completeExam = async (req, res) => {
  try {
    await Promise.all(validateExamIdParam.map(validator => validator.run(req)));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in completeExam', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { examId } = req.params;
    const sanitizedExamId = sanitize(examId);

    const exam = await Exam.findById(sanitizedExamId);
    if (!exam) {
      logger.warn('Exam not found', { examId: sanitizedExamId, userId: req.user.id });
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
        message: `Cannot complete exam with status '${exam.status}'`
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

// Get all subjects assigned to teacher
examController.getTeacherSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({ teacher: req.user.id })
      .populate('class', 'level trade year term')
      .sort({ name: 1 })
      .lean();

    logger.info('Teacher subjects fetched', { userId: req.user.id });
    res.status(200).json({ success: true, subjects });
  } catch (error) {
    logger.error('Error in getTeacherSubjects', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get classes for teacher
examController.getClassesForTeacher = async (req, res) => {
  try {
    const teacherSubjects = await Subject.find({ teacher: req.user.id }).lean();
    const classIds = [...new Set(teacherSubjects.map(subject => subject.class.toString()))];

    if (classIds.length === 0) {
      logger.info('No classes found for teacher', { userId: req.user.id });
      return res.status(200).json({ success: true, classes: [] });
    }

    const classes = await Class.find({ _id: { $in: classIds } })
      .sort({ level: 1, trade: 1 })
      .lean();

    logger.info('Classes fetched for teacher', { userId: req.user.id });
    res.status(200).json({ success: true, classes });
  } catch (error) {
    logger.error('Error in getClassesForTeacher', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Schedule an exam
examController.scheduleExam = async (req, res) => {
  try {
    await Promise.all(validateExamIdParam.concat(validateScheduleExam).map(validator => validator.run(req)));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in scheduleExam', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { examId } = req.params;
    const { start, duration } = req.body;
    const sanitizedExamId = sanitize(examId);

    if (!start || !duration) {
      logger.warn('Missing start or duration', { examId: sanitizedExamId, userId: req.user.id });
      return res.status(400).json({ success: false, message: 'Start time and duration are required' });
    }

    const startDate = new Date(start);
    if (startDate <= new Date()) {
      logger.warn('Invalid start date', { examId: sanitizedExamId, startDate, userId: req.user.id });
      return res.status(400).json({ success: false, message: 'Start date must be in the future' });
    }

    if (duration < 5) {
      logger.warn('Invalid duration', { examId: sanitizedExamId, duration, userId: req.user.id });
      return res.status(400).json({ success: false, message: 'Duration must be at least 5 minutes' });
    }

    const exam = await Exam.findById(sanitizedExamId);
    if (!exam) {
      logger.warn('Exam not found', { examId: sanitizedExamId, userId: req.user.id });
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    if (exam.teacher.toString() !== req.user.id) {
      logger.warn('Unauthorized attempt to schedule exam', { userId: req.user.id, examId: sanitizedExamId });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to schedule this exam'
      });
    }

    if (exam.status !== 'draft') {
      logger.warn('Cannot schedule exam with status', { examId: sanitizedExamId, status: exam.status, userId: req.user.id });
      return res.status(400).json({
        success: false,
        message: `Cannot schedule exam with status '${exam.status}'`
      });
    }

    exam.schedule = {
      start: startDate,
      duration: duration
    };
    exam.status = 'scheduled';

    await exam.save();

    logger.info('Exam scheduled successfully', { examId: sanitizedExamId, teacherId: req.user.id });

    res.status(200).json({ success: true, message: 'Exam scheduled successfully', exam: exam.toObject() });
  } catch (error) {
    logger.error('Error in scheduleExam', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = examController;  