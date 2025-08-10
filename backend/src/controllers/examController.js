const Exam = require('../models/Exam');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const User = require('../models/User');
const Submission = require('../models/Submission');
const { check, validationResult, param } = require('express-validator');
const winston = require('winston');
const mongoose = require('mongoose');
const { validateEntity, validateEntities } = require('../utils/entityValidator');
const { checkScheduleConflicts } = require('../utils/scheduleValidator');
const { toUTC } = require('../utils/dateUtils');
const { logAudit } = require('../utils/auditLogger');
const notificationService = require('../utils/notificationService');
const { sendSMS } = require('../services/twilioService');
// SendGrid email service removed.
const schedule = require('node-schedule');
const mongoSanitize = require('express-mongo-sanitize');

// Temporary sanitize function
const sanitize = (value) => String(value || '');

// Logger Configuration
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Validation Rules
const allowedExamTypes = ['assessment1', 'assessment2', 'exam', 'homework', 'quiz'];

// Define validation arrays
const validateCreateExam = [
  check('schoolId').isMongoId().withMessage('Valid school ID is required'),
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
  param('examId').isMongoId().withMessage('Invalid exam ID format'),
  check('schoolId').isMongoId().withMessage('Valid school ID is required'),
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
  param('examId').isMongoId().withMessage('Invalid exam ID format'),
  check('schoolId').isMongoId().withMessage('Valid school ID is required')
];

const validateScheduleExam = [
  param('examId').isMongoId().withMessage('Invalid exam ID format'),
  check('schoolId').isMongoId().withMessage('Valid school ID is required'),
  check('start').isISO8601().toDate().withMessage('Invalid start date format'),
  check('duration').isInt({ min: 5 }).withMessage('Duration must be at least 5 minutes')
];

const validateGetTeacherClasses = [
  check('schoolId').isMongoId().withMessage('Valid school ID is required')
];

const validateGetTeacherSubjects = [
  check('schoolId').isMongoId().withMessage('Valid school ID is required')
];

const validateGetSchoolExams = [
  check('schoolId').isMongoId().withMessage('Valid school ID is required')
];

// Create new exam
exports.createExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in createExam', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      schoolId,
      title,
      type,
      classIds,
      subjectId,
      teacherId,
      schedule,
      questions,
      instructions
    } = req.body;

    // Verify user's school matches provided schoolId
    if (req.user.school.toString() !== schoolId) {
      logger.warn('School ID mismatch', { userId: req.user.id, schoolId, userSchool: req.user.school });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to create exams for this school'
      });
    }

    // Validate referenced documents with school check
    try {
      const subject = await validateEntity(Subject, subjectId, 'Subject', schoolId);
      const teacher = await validateEntity(User, teacherId, 'Teacher', schoolId);
      const classes = await validateEntities(Class, classIds, 'Classes', schoolId);

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
        null,
        classIds,
        scheduleStart,
        schedule.duration,
        schoolId
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
        school: schoolId,
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
          schedule: exam.schedule,
          school: schoolId
        }
      );

      logger.info('Exam created successfully', {
        examId: exam._id,
        teacherId: req.user.id,
        schoolId
      });

      res.status(201).json({ success: true, exam });

      // Notify students about the new exam
      try {
        const students = await User.find({
          class: { $in: exam.classes },
          role: 'student',
          school: schoolId
        });

        for (const student of students) {
          try {
            if (student.phone) {
              await sendSMS(
                student.phone,
                `New exam "${exam.title}" has been scheduled. Check your dashboard for details.`
              );
            }
          } catch (smsErr) {
            console.error(`Failed to send SMS to ${student.phone}:`, smsErr.message);
          }

          // TODO: Add new email notification method here (previous SendGrid exam notification removed).
        }
      } catch (notifyErr) {
        console.error('Error notifying students:', notifyErr.message);
      }
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

// Get exam by ID
exports.getExamById = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { examId, schoolId } = req.params;
    if (req.user.school.toString() !== schoolId) {
      logger.warn('School ID mismatch', { userId: req.user.id, schoolId, userSchool: req.user.school });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access exams for this school'
      });
    }

    const exam = await Exam.findOne({
      _id: examId,
      school: schoolId,
      isDeleted: false
    })
      .populate('classes', 'level trade year term')
      .populate('subject', 'name')
      .populate('teacher', 'fullName');

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found or not in your school' });
    }

    // Role-based access control
    if (req.user.role === 'student') {
      const student = await User.findById(req.user.id).select('class school');
      if (!student || student.school.toString() !== schoolId || !exam.classes.some(cls => cls._id.toString() === student.class.toString())) {
        return res.status(403).json({ success: false, message: 'You are not enrolled in this exam\'s class or school' });
      }
    } else if (req.user.role === 'teacher' && exam.teacher._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You are not authorized to view this exam' });
    }

    let examObj = exam.toObject();
    if (req.user.role === 'student') {
      examObj.questions = examObj.questions.map(q => {
        const { correctAnswer, ...rest } = q;
        return rest;
      });
    }

    res.json({ success: true, exam: examObj, message: 'Exam retrieved successfully' });
  } catch (error) {
    logger.error('getExamById error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Update exam details
exports.updateExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in updateExam', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { examId } = req.params;
    const {
      schoolId,
      title,
      type,
      schedule,
      questions,
      instructions,
      status,
      classIds,
      subjectId
    } = req.body;

    // Verify user's school matches provided schoolId
    if (req.user.school.toString() !== schoolId) {
      logger.warn('School ID mismatch', { userId: req.user.id, schoolId, userSchool: req.user.school });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update exams for this school'
      });
    }

    const exam = await Exam.findOne({ _id: examId, school: schoolId, isDeleted: false });
    if (!exam) {
      logger.warn('Exam not found for update', { examId, userId: req.user.id });
      return res.status(404).json({ success: false, message: 'Exam not found or not in your school' });
    }

    if (exam.teacher.toString() !== req.user.id && !['admin', 'dean'].includes(req.user.role)) {
      logger.warn('Unauthorized attempt to update exam', { userId: req.user.id, examId });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this exam'
      });
    }

    if (exam.status === 'active' || exam.status === 'completed') {
      if (questions || schedule || classIds || subjectId || (status && status !== exam.status)) {
        logger.warn('Attempt to modify active/completed exam fields not allowed', { examId, status: exam.status, userId: req.user.id });
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
        const classes = await Class.find({ _id: { $in: classIds }, school: schoolId, isDeleted: false }).lean();
        if (classes.length !== classIds.length) {
          logger.warn('One or more classes not found for update', { classIds, userId: req.user.id });
          return res.status(404).json({ success: false, message: 'One or more classes not found or not in your school' });
        }
        exam.classes = classIds;
      }

      if (subjectId) {
        const subject = await Subject.findOne({ _id: subjectId, school: schoolId, isDeleted: false }).lean();
        if (!subject) {
          logger.warn('Subject not found for update', { subjectId, userId: req.user.id });
          return res.status(404).json({ success: false, message: 'Subject not found or not in your school' });
        }
        exam.subject = subjectId;
      }

      if (schedule) {
        if (schedule.start && schedule.duration) {
          const startDate = toUTC(sanitize(schedule.start));
          if (status === 'scheduled' || exam.status === 'scheduled') {
            if (startDate <= new Date()) {
              logger.warn('Invalid start date in update: must be in the future', { examId, startDate, userId: req.user.id });
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

    exam.updatedAt = new Date();
    await exam.save();

    logger.info('Exam updated successfully', { examId, teacherId: req.user.id, schoolId });
    res.status(200).json({ success: true, exam: exam.toObject(), message: 'Exam updated successfully' });
  } catch (error) {
    logger.error('Error in updateExam', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Delete exam
exports.deleteExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in deleteExam', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { examId, schoolId } = req.params;
    if (req.user.school.toString() !== schoolId) {
      logger.warn('School ID mismatch', { userId: req.user.id, schoolId, userSchool: req.user.school });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete exams for this school'
      });
    }

    const exam = await Exam.findOne({ _id: examId, school: schoolId, isDeleted: false });
    if (!exam) {
      logger.warn('Exam not found for deletion', { examId, userId: req.user.id });
      return res.status(404).json({ success: false, message: 'Exam not found or not in your school' });
    }

    if (exam.teacher.toString() !== req.user.id && !['admin', 'dean'].includes(req.user.role)) {
      logger.warn('Unauthorized attempt to delete exam', { userId: req.user.id, examId });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this exam'
      });
    }

    if (exam.status !== 'draft') {
      logger.warn('Cannot delete exam with status', { examId, status: exam.status, userId: req.user.id });
      return res.status(400).json({
        success: false,
        message: `Cannot delete exam with status '${exam.status}'. Only 'draft' exams can be deleted.`
      });
    }

    exam.isDeleted = true;
    exam.updatedAt = new Date();
    await exam.save();

    logger.info('Exam deleted successfully', { examId, teacherId: req.user.id, schoolId });
    res.status(200).json({ success: true, message: 'Exam deleted successfully' });
  } catch (error) {
    logger.error('Error in deleteExam', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get upcoming exams for a student
exports.getUpcomingExamsForStudent = async (req, res) => {
  try {
    const { schoolId } = req.query;
    if (req.user.school.toString() !== schoolId) {
      logger.warn('School ID mismatch', { userId: req.user.id, schoolId, userSchool: req.user.school });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access exams for this school'
      });
    }

    const student = await User.findById(req.user.id).lean();
    if (!student || !student.class) {
      logger.warn('Student class not found for upcoming exams', { userId: req.user.id });
      return res.status(404).json({ success: false, message: 'Student class information is missing.' });
    }

    const now = new Date();
    const exams = await Exam.find({
      classes: student.class,
      school: schoolId,
      status: 'scheduled',
      'schedule.start': { $gte: now },
      isDeleted: false
    })
      .populate('subject', 'name')
      .populate('teacher', 'fullName')
      .select('title type schedule subject teacher')
      .sort({ 'schedule.start': 1 })
      .lean();

    // Hide correct answers
    const filteredExams = exams.map(exam => ({
      ...exam,
      questions: exam.questions ? exam.questions.map(q => {
        const { correctAnswer, ...rest } = q;
        return rest;
      }) : []
    }));

    logger.info('Upcoming exams fetched for student', { userId: req.user.id, classId: student.class, schoolId });
    res.status(200).json({ success: true, exams: filteredExams, message: 'Upcoming exams retrieved successfully' });
  } catch (error) {
    logger.error('Error in getUpcomingExamsForStudent', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get all exams for student's class
exports.getStudentClassExams = async (req, res) => {
  try {
    const { schoolId } = req.query;
    if (req.user.school.toString() !== schoolId) {
      logger.warn('School ID mismatch', { userId: req.user.id, schoolId, userSchool: req.user.school });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access exams for this school'
      });
    }

    const student = await User.findById(req.user.id).select('class school');
    if (!student || !student.class) {
      logger.warn('Student class not found', { userId: req.user.id });
      return res.status(400).json({ success: false, message: 'Student class not found' });
    }

    const exams = await Exam.find({
      classes: student.class,
      school: schoolId,
      status: { $in: ['scheduled', 'active'] },
      isDeleted: false
    })
      .populate('subject', 'name')
      .populate('teacher', 'fullName')
      .populate('classes', 'level trade year term')
      .lean();

    // Hide correct answers
    const filteredExams = exams.map(exam => ({
      ...exam,
      questions: exam.questions ? exam.questions.map(q => {
        const { correctAnswer, ...rest } = q;
        return rest;
      }) : []
    }));

    logger.info('Class exams fetched for student', {
      classId: student.class,
      userId: req.user.id,
      examCount: exams.length,
      schoolId
    });
    res.status(200).json({ success: true, exams: filteredExams, message: 'Student class exams retrieved successfully' });
  } catch (error) {
    logger.error('Error fetching student class exams', {
      error: error.message,
      userId: req.user.id
    });
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Activate exam
exports.activateExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in activateExam', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { examId, schoolId } = req.params;
    if (req.user.school.toString() !== schoolId) {
      logger.warn('School ID mismatch', { userId: req.user.id, schoolId, userSchool: req.user.school });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to activate exams for this school'
      });
    }

    try {
      const exam = await validateEntity(Exam, examId, 'Exam', schoolId);

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
        { status: 'active', school: schoolId }
      );

      logger.info('Exam activated successfully', { examId, teacherId: req.user.id, schoolId });
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

// Complete exam
exports.completeExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in completeExam', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { examId, schoolId } = req.params;
    if (req.user.school.toString() !== schoolId) {
      logger.warn('School ID mismatch', { userId: req.user.id, schoolId, userSchool: req.user.school });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to complete exams for this school'
      });
    }

    try {
      const exam = await validateEntity(Exam, examId, 'Exam', schoolId);

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
        { status: 'completed', school: schoolId }
      );

      logger.info('Exam completed successfully', { examId, teacherId: req.user.id, schoolId });
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

// Get all exams created by teacher
exports.getTeacherExams = async (req, res) => {
  try {
    const { schoolId } = req.query;
    if (req.user.school.toString() !== schoolId) {
      logger.warn('School ID mismatch', { userId: req.user.id, schoolId, userSchool: req.user.school });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access exams for this school'
      });
    }

    const exams = await Exam.find({
      teacher: req.user.id,
      school: schoolId,
      isDeleted: false
    })
      .populate('classes', 'level trade year term')
      .populate('subject', 'name')
      .sort({ 'schedule.start': -1 })
      .lean();

    logger.info('Teacher exams fetched', {
      teacherId: req.user.id,
      examCount: exams.length,
      schoolId
    });

    res.status(200).json({ success: true, exams, message: 'Teacher exams retrieved successfully' });
  } catch (error) {
    logger.error('Error fetching teacher exams', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Schedule exam
exports.scheduleExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in scheduleExam', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { examId } = req.params;
    const { schoolId, start, duration } = req.body;

    if (req.user.school.toString() !== schoolId) {
      logger.warn('School ID mismatch', { userId: req.user.id, schoolId, userSchool: req.user.school });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to schedule exams for this school'
      });
    }

    try {
      const exam = await validateEntity(Exam, examId, 'Exam', schoolId);

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
        duration,
        schoolId
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
          schedule: exam.schedule,
          school: schoolId
        }
      );

      // Get students in the class
      const students = await User.find({ class: { $in: exam.classes }, role: 'student', school: schoolId });
      // Notify each student
      for (const student of students) {
        await notificationService.sendExamScheduledNotification(req.io, student._id, exam);
      }

      logger.info('Exam scheduled successfully', {
        examId,
        teacherId: req.user.id,
        schedule: exam.schedule,
        schoolId
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

// Get classes for logged-in teacher
exports.getClassesForTeacher = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in getClassesForTeacher', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { schoolId } = req.query;
    if (req.user.school.toString() !== schoolId) {
      logger.warn('School ID mismatch', { userId: req.user.id, schoolId, userSchool: req.user.school });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access classes for this school'
      });
    }

    // Verify teacher exists and has correct role
    const teacher = await User.findById(req.user.id).lean();
    if (!teacher || teacher.role !== 'teacher') {
      logger.warn('Teacher not found or invalid role', { userId: req.user.id });
      return res.status(404).json({ success: false, message: 'Teacher not found or invalid role' });
    }

    // Find subjects taught by the teacher
    const subjects = await Subject.find({
      teacher: req.user.id,
      school: schoolId,
      isDeleted: false
    }).select('_id').lean();

    if (!subjects || subjects.length === 0) {
      logger.info('No subjects found for teacher', { teacherId: req.user.id, schoolId });
      return res.status(200).json({ success: true, classes: [], message: 'No subjects assigned to teacher' });
    }

    // Extract subject IDs
    const subjectIds = subjects.map(subject => subject._id);

    // Find classes that include any of the teacher's subjects
    const classes = await Class.find({
      subjects: { $in: subjectIds },
      school: schoolId,
      isDeleted: false
    })
      .populate('trade', 'name code')
      .populate('subjects', 'name')
      .lean();

    // Format class data
    const formattedClasses = classes.map(cls => ({
      _id: cls._id,
      className: `${cls.level}${cls.trade?.code || ''}`,
      level: cls.level,
      trade: cls.trade,
      year: cls.year,
      capacity: cls.capacity,
      subjects: cls.subjects.map(sub => ({ _id: sub._id, name: sub.name }))
    }));

    logger.info('Classes for teacher fetched', {
      teacherId: req.user.id,
      classCount: classes.length,
      schoolId
    });

    res.status(200).json({
      success: true,
      classes: formattedClasses,
      message: 'Classes retrieved successfully'
    });
  } catch (error) {
    logger.error('Error fetching classes for teacher', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get teacher subjects
exports.getTeacherSubjects = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in getTeacherSubjects', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { schoolId } = req.query;
    if (req.user.school.toString() !== schoolId) {
      logger.warn('School ID mismatch', { userId: req.user.id, schoolId, userSchool: req.user.school });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access subjects for this school'
      });
    }

    const teacher = await User.findById(req.user.id).lean();
    if (!teacher || teacher.role !== 'teacher') {
      logger.warn('Teacher not found or invalid role', { userId: req.user.id });
      return res.status(404).json({ success: false, message: 'Teacher not found or invalid role' });
    }

    const subjects = await Subject.find({
      teacher: req.user.id,
      school: schoolId,
      isDeleted: false
    })
      .populate('school', 'name')
      .lean();

    logger.info('Teacher subjects retrieved', { teacherId: req.user.id, subjectCount: subjects.length, schoolId });
    res.json({ success: true, subjects, message: 'Teacher subjects retrieved successfully' });
  } catch (error) {
    logger.error('getTeacherSubjects error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving teacher subjects' });
  }
};

// Get all exams for a school (dean/headmaster)
exports.getSchoolExams = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in getSchoolExams', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { schoolId } = req.query;
    if (req.user.school.toString() !== schoolId && req.user.role !== 'headmaster') {
      logger.warn('School ID mismatch', { userId: req.user.id, schoolId, userSchool: req.user.school });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access exams for this school'
      });
    }

    const exams = await Exam.find({
      school: schoolId,
      isDeleted: false
    })
      .populate('teacher', 'fullName')
      .populate('subject', 'name')
      .populate('classes', 'level trade year term')
      .lean();

    logger.info('School exams retrieved', { userId: req.user.id, examCount: exams.length, schoolId });
    res.json({ success: true, exams, message: 'School exams retrieved successfully' });
  } catch (error) {
    logger.error('getSchoolExams error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server error occurred while retrieving school exams' });
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
  getClassesForTeacher: exports.getClassesForTeacher,
  getSchoolExams: exports.getSchoolExams,
  validateCreateExam,
  validateUpdateExam,
  validateExamIdParam,
  validateScheduleExam,
  validateGetTeacherClasses,
  validateGetTeacherSubjects,
  validateGetSchoolExams
};