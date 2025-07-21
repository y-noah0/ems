const Exam = require('../models/Exam');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const User = require('../models/User');
const Submission = require('../models/Submission'); // Added for auto-submission
const { check, validationResult, param } = require('express-validator');
const winston = require('winston');
const mongoose = require('mongoose');
const schedule = require('node-schedule'); // Added for scheduling

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
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Validation Rules
const allowedExamTypes = ['assessment1', 'assessment2', 'exam', 'homework', 'quiz'];

const validateCreateExam = [
  check('title').notEmpty().withMessage('Title is required'),
  check('type').isIn(allowedExamTypes).withMessage('Invalid exam type'),
  check('classIds').isArray({ min: 1 }).withMessage('At least one class ID is required'),
  check('classIds.*').isMongoId().withMessage('Invalid class ID'),
  check('subjectId').isMongoId().withMessage('Invalid subject ID'),
  check('teacherId').isMongoId().withMessage('Invalid teacher ID'),
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
  check('classIds.*').optional().isMongoId().withMessage('Invalid class ID'),
  check('subjectId').optional().isMongoId().withMessage('Invalid subject ID'),
  check('schedule.start').optional().isISO8601().toDate().withMessage('Invalid schedule start date'),
  check('schedule.duration').optional().isInt({ min: 5 }).withMessage('Duration must be at least 5 minutes'),
  check('questions').optional().isArray(),
  check('questions.*.type').optional().isIn(['multiple-choice', 'true-false', 'short-answer', 'essay']).withMessage('Invalid question type'),
  check('questions.*.text').optional().notEmpty().withMessage('Question text cannot be empty'),
  check('questions.*.maxScore').optional().isInt({ min: 1 }).withMessage('Question maxScore must be at least 1')
];

const validateExamIdParam = [
  param('examId').isMongoId().withMessage('Invalid exam ID')
];

const validateScheduleExam = [
  check('start').isISO8601().toDate().withMessage('Invalid start date'),
  check('duration').isInt({ min: 5 }).withMessage('Duration must be at least 5 minutes')
];

// Create new exam
exports.createExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
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

    // Validate referenced documents
    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({ success: false, message: 'Teacher not found or invalid' });
    }

    const classes = await Class.find({ _id: { $in: classIds } });
    if (classes.length !== classIds.length) {
      return res.status(404).json({ success: false, message: 'One or more classes not found' });
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
      school: teacher.school,
      schedule: {
        start: schedule.start,
        duration: schedule.duration
      },
      questions: preparedQuestions,
      instructions: instructions || undefined,
      status: 'scheduled',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await exam.save();

    // Emit Socket.IO event to admins and notify deans, headmasters
    req.io.to('admins').emit('exam-created', {
      examId: exam._id,
      title: exam.title,
      type: exam.type,
      status: exam.status,
      createdAt: exam.createdAt,
    });
    req.io.to(`school:${exam.school}:dean`).emit('exam-created', {
      examId: exam._id,
      title: exam.title,
      type: exam.type,
      status: exam.status,
      createdAt: exam.createdAt,
    });
    req.io.to(`school:${exam.school}:headmaster`).emit('exam-created', {
      examId: exam._id,
      title: exam.title,
      type: exam.type,
      status: exam.status,
      createdAt: exam.createdAt,
    });

    res.status(201).json({ success: true, exam, message: 'Exam created successfully' });
  } catch (error) {
    logger.error('createExam error', { error: error.message, userId: req.user.id });
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
    const { examId } = req.params;
    const exam = await Exam.findById(examId)
      .populate('classes', 'level trade year term')
      .populate('subject', 'name')
      .populate('teacher', 'fullName');
    if (!exam || exam.isDeleted) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }
    if (req.user.role === 'student') {
      const enrollment = await Enrollment.findOne({
        student: req.user.id,
        class: { $in: exam.classes },
        isActive: true,
        isDeleted: false,
      });
      if (!enrollment) {
        return res.status(403).json({ success: false, message: 'You are not enrolled in this exam\'s class' });
      }
    } else if (req.user.role === 'teacher' && exam.teacher.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You are not authorized to view this exam' });
    } else if (['dean', 'headmaster'].includes(req.user.role)) {
      const user = await User.findById(req.user.id).select('school');
      if (user.school.toString() !== exam.school.toString()) {
        return res.status(403).json({ success: false, message: 'You are not authorized to view exams from this school' });
      }
    }
    // Remove correctAnswer from questions for students
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
    if (!exam || exam.isDeleted) {
      logger.warn('Exam not found for update', { examId: sanitizedExamId, userId: req.user.id });
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    if (exam.teacher.toString() !== req.user.id && !['admin', 'dean'].includes(req.user.role)) {
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
        const classes = await Class.find({ _id: { $in: sanitizedClassIds }, school: exam.school }).lean();
        if (classes.length !== sanitizedClassIds.length) {
          logger.warn('One or more classes not found for update', { classIds: sanitizedClassIds, userId: req.user.id });
          return res.status(404).json({ success: false, message: 'One or more classes not found or not in your school' });
        }
        exam.classes = sanitizedClassIds;
      }

      if (subjectId) {
        const subject = await Subject.findById(sanitize(subjectId)).lean();
        if (!subject) {
          logger.warn('Subject not found for update', { subjectId, userId: req.user.id });
          return res.status(404).json({ success: false, message: 'Subject not found' });
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

    // Emit Socket.IO event to admins and notify teacher, deans, headmasters
    req.io.to('admins').emit('exam-updated', {
      examId: exam._id,
      title: exam.title,
      type: exam.type,
      status: exam.status,
      updatedAt: exam.updatedAt,
    });
    req.io.to(exam.teacher.toString()).emit('exam-updated', {
      examId: exam._id,
      title: exam.title,
      type: exam.type,
      status: exam.status,
      updatedAt: exam.updatedAt,
    });
    req.io.to(`school:${exam.school}:dean`).emit('exam-updated', {
      examId: exam._id,
      title: exam.title,
      type: exam.type,
      status: exam.status,
      updatedAt: exam.updatedAt,
    });
    req.io.to(`school:${exam.school}:headmaster`).emit('exam-updated', {
      examId: exam._id,
      title: exam.title,
      type: exam.type,
      status: exam.status,
      updatedAt: exam.updatedAt,
    });

    logger.info('Exam updated successfully', { examId: sanitizedExamId, teacherId: req.user.id });
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

    const { examId } = req.params;
    const sanitizedExamId = sanitize(examId);

    const exam = await Exam.findById(sanitizedExamId);
    if (!exam || exam.isDeleted) {
      logger.warn('Exam not found for deletion', { examId: sanitizedExamId, userId: req.user.id });
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    if (exam.teacher.toString() !== req.user.id && !['admin', 'dean'].includes(req.user.role)) {
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

    exam.isDeleted = true;
    exam.updatedAt = new Date();
    await exam.save();

    // Emit Socket.IO event to admins and notify teacher, deans, headmasters
    req.io.to('admins').emit('exam-deleted', {
      examId: exam._id,
      title: exam.title,
      updatedAt: exam.updatedAt,
    });
    req.io.to(exam.teacher.toString()).emit('exam-deleted', {
      examId: exam._id,
      title: exam.title,
      updatedAt: exam.updatedAt,
    });
    req.io.to(`school:${exam.school}:dean`).emit('exam-deleted', {
      examId: exam._id,
      title: exam.title,
      updatedAt: exam.updatedAt,
    });
    req.io.to(`school:${exam.school}:headmaster`).emit('exam-deleted', {
      examId: exam._id,
      title: exam.title,
      updatedAt: exam.updatedAt,
    });

    logger.info('Exam deleted successfully', { examId: sanitizedExamId, teacherId: req.user.id });
    res.status(200).json({ success: true, message: 'Exam deleted successfully' });
  } catch (error) {
    logger.error('Error in deleteExam', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get upcoming exams for a student
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
      'schedule.start': { $gte: now },
      isDeleted: false,
    })
      .populate('subject', 'name')
      .populate('teacher', 'fullName')
      .select('title type schedule subject teacher')
      .sort({ 'schedule.start': 1 })
      .lean();

    // Hide correct answers
    const filteredExams = exams.map(exam => ({
      ...exam,
      questions: exam.questions.map(q => {
        const { correctAnswer, ...rest } = q;
        return rest;
      }),
    }));

    logger.info('Upcoming exams fetched for student', { userId: req.user.id, classId: student.class });
    res.status(200).json({ success: true, exams: filteredExams, message: 'Upcoming exams retrieved successfully' });
  } catch (error) {
    logger.error('Error in getUpcomingExamsForStudent', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get all exams for student's class
exports.getStudentClassExams = async (req, res) => {
  try {
    const student = await User.findById(req.user.id).select('class');
    if (!student || !student.class) {
      logger.warn('Student class not found', { userId: req.user.id });
      return res.status(400).json({ success: false, message: 'Student class not found' });
    }
    const exams = await Exam.find({
      classes: student.class,
      status: { $in: ['scheduled', 'active'] },
      isDeleted: false,
    })
      .populate('subject', 'name')
      .populate('teacher', 'fullName')
      .populate('classes', 'level trade year term')
      .lean();

    // Hide correct answers
    const filteredExams = exams.map(exam => ({
      ...exam,
      questions: exam.questions.map(q => {
        const { correctAnswer, ...rest } = q;
        return rest;
      }),
    }));

    logger.info('Class exams fetched for student', {
      classId: student.class,
      userId: req.user.id,
      examCount: exams.length,
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

    const { examId } = req.params;
    const sanitizedExamId = sanitize(examId);

    const exam = await Exam.findById(sanitizedExamId);
    if (!exam || exam.isDeleted) {
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
    exam.updatedAt = new Date();
    await exam.save();

    // Schedule auto-submission job
    if (exam.schedule && exam.schedule.start && exam.schedule.duration) {
      const endTime = new Date(new Date(exam.schedule.start).getTime() + exam.schedule.duration * 60000);
      schedule.scheduleJob(`auto-submit-${exam._id}`, endTime, async () => {
        try {
          const submissions = await Submission.find({
            exam: exam._id,
            status: 'in-progress',
            isDeleted: false,
          });
          for (const submission of submissions) {
            submission.status = 'submitted';
            submission.submittedAt = new Date();
            await submission.save();
            // Notify student and teacher
            req.io.to(submission.student.toString()).emit('exam-auto-submitted', {
              examId: exam._id,
              submissionId: submission._id,
              title: exam.title,
              submittedAt: submission.submittedAt,
            });
            req.io.to(exam.teacher.toString()).emit('exam-auto-submitted', {
              examId: exam._id,
              submissionId: submission._id,
              studentId: submission.student,
              title: exam.title,
              submittedAt: submission.submittedAt,
            });
            logger.info('Auto-submitted submission', {
              examId: exam._id,
              submissionId: submission._id,
              studentId: submission.student,
            });
          }
          logger.info('Auto-submission job completed', { examId: exam._id });
        } catch (error) {
          logger.error('Error in auto-submission job', {
            examId: exam._id,
            error: error.message,
            stack: error.stack,
          });
        }
      });
      logger.info('Auto-submission job scheduled', {
        examId: exam._id,
        endTime,
      });
    }

    // Emit Socket.IO event to admins and notify teacher, deans, headmasters
    req.io.to('admins').emit('exam-status-changed', {
      examId: exam._id,
      title: exam.title,
      status: exam.status,
      updatedAt: exam.updatedAt,
    });
    req.io.to(exam.teacher.toString()).emit('exam-status-changed', {
      examId: exam._id,
      title: exam.title,
      status: exam.status,
      updatedAt: exam.updatedAt,
    });
    req.io.to(`school:${exam.school}:dean`).emit('exam-status-changed', {
      examId: exam._id,
      title: exam.title,
      status: exam.status,
      updatedAt: exam.updatedAt,
    });
    req.io.to(`school:${exam.school}:headmaster`).emit('exam-status-changed', {
      examId: exam._id,
      title: exam.title,
      status: exam.status,
      updatedAt: exam.updatedAt,
    });

    logger.info('Exam activated successfully', { examId: sanitizedExamId, teacherId: req.user.id });
    res.status(200).json({ success: true, message: 'Exam activated successfully', exam: exam.toObject() });
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

    const { examId } = req.params;
    const sanitizedExamId = sanitize(examId);

    const exam = await Exam.findById(sanitizedExamId);
    if (!exam || exam.isDeleted) {
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

    // Cancel auto-submission job if it exists
    const job = schedule.scheduledJobs[`auto-submit-${exam._id}`];
    if (job) {
      job.cancel();
      logger.info('Auto-submission job cancelled', { examId: exam._id });
    }

    exam.status = 'completed';
    exam.updatedAt = new Date();
    await exam.save();

    // Auto-submit any remaining in-progress submissions
    const submissions = await Submission.find({
      exam: exam._id,
      status: 'in-progress',
      isDeleted: false,
    });
    for (const submission of submissions) {
      submission.status = 'submitted';
      submission.submittedAt = new Date();
      await submission.save();
      // Notify student and teacher
      req.io.to(submission.student.toString()).emit('exam-auto-submitted', {
        examId: exam._id,
        submissionId: submission._id,
        title: exam.title,
        submittedAt: submission.submittedAt,
      });
      req.io.to(exam.teacher.toString()).emit('exam-auto-submitted', {
        examId: exam._id,
        submissionId: submission._id,
        studentId: submission.student,
        title: exam.title,
        submittedAt: submission.submittedAt,
      });
      logger.info('Auto-submitted submission on exam completion', {
        examId: exam._id,
        submissionId: submission._id,
        studentId: submission.student,
      });
    }

    // Emit Socket.IO event to admins and notify teacher, deans, headmasters
    req.io.to('admins').emit('exam-status-changed', {
      examId: exam._id,
      title: exam.title,
      status: exam.status,
      updatedAt: exam.updatedAt,
    });
    req.io.to(exam.teacher.toString()).emit('exam-status-changed', {
      examId: exam._id,
      title: exam.title,
      status: exam.status,
      updatedAt: exam.updatedAt,
    });
    req.io.to(`school:${exam.school}:dean`).emit('exam-status-changed', {
      examId: exam._id,
      title: exam.title,
      status: exam.status,
      updatedAt: exam.updatedAt,
    });
    req.io.to(`school:${exam.school}:headmaster`).emit('exam-status-changed', {
      examId: exam._id,
      title: exam.title,
      status: exam.status,
      updatedAt: exam.updatedAt,
    });

    logger.info('Exam completed successfully', { examId: sanitizedExamId, teacherId: req.user.id });
    res.status(200).json({ success: true, message: 'Exam marked as completed', exam: exam.toObject() });
  } catch (error) {
    logger.error('Error in completeExam', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Schedule an exam
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
    if (!exam || exam.isDeleted) {
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
    exam.updatedAt = new Date();
    await exam.save();

    // Emit Socket.IO event to admins and notify teacher, deans, headmasters
    req.io.to('admins').emit('exam-scheduled', {
      examId: exam._id,
      title: exam.title,
      status: exam.status,
      schedule: exam.schedule,
      updatedAt: exam.updatedAt,
    });
    req.io.to(exam.teacher.toString()).emit('exam-scheduled', {
      examId: exam._id,
      title: exam.title,
      status: exam.status,
      schedule: exam.schedule,
      updatedAt: exam.updatedAt,
    });
    req.io.to(`school:${exam.school}:dean`).emit('exam-scheduled', {
      examId: exam._id,
      title: exam.title,
      status: exam.status,
      schedule: exam.schedule,
      updatedAt: exam.updatedAt,
    });
    req.io.to(`school:${exam.school}:headmaster`).emit('exam-scheduled', {
      examId: exam._id,
      title: exam.title,
      status: exam.status,
      schedule: exam.schedule,
      updatedAt: exam.updatedAt,
    });

    logger.info('Exam scheduled successfully', { examId: sanitizedExamId, teacherId: req.user.id, schedule: exam.schedule });
    res.status(200).json({ success: true, message: 'Exam scheduled successfully', exam: exam.toObject() });
  } catch (error) {
    logger.error('Error in scheduleExam', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get all subjects assigned to teacher
exports.getTeacherSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({ teacher: req.user.id })
      .populate('class', 'level trade year term name')
      .sort({ name: 1 })
      .lean();

    logger.info('Teacher subjects fetched', { userId: req.user.id });
    res.status(200).json({ success: true, subjects, message: 'Teacher subjects retrieved successfully' });
  } catch (error) {
    logger.error('Error in getTeacherSubjects', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get classes associated with subjects taught by teacher
exports.getClassesForTeacher = async (req, res) => {
  try {
    const teacherSubjects = await Subject.find({ teacher: req.user.id }).lean();
    const classIds = [...new Set(teacherSubjects.map(subject => subject.class.toString()))].map(id => new mongoose.Types.ObjectId(id));

    if (classIds.length === 0) {
      logger.info('No classes found for teacher', { userId: req.user.id });
      return res.status(200).json({ success: true, classes: [], message: 'No classes found for teacher' });
    }

    const classes = await Class.find({ _id: { $in: classIds } })
      .sort({ level: 1, trade: 1, year: 1, term: 1 })
      .lean();

    logger.info('Classes fetched for teacher', { userId: req.user.id });
    res.status(200).json({ success: true, classes, message: 'Classes retrieved successfully' });
  } catch (error) {
    logger.error('Error in getClassesForTeacher', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get all exams created by teacher
exports.getTeacherExams = async (req, res) => {
  try {
    const exams = await Exam.find({ teacher: req.user.id, isDeleted: false })
      .populate('classes', 'level trade year term')
      .populate('subject', 'name')
      .sort({ createdAt: -1 })
      .lean();

    logger.info('Teacher exams fetched', { userId: req.user.id, examCount: exams.length });
    res.status(200).json({ success: true, exams, message: 'Teacher exams retrieved successfully' });
  } catch (error) {
    logger.error('Error in getTeacherExams', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get all exams for a school (dean/headmaster)
exports.getSchoolExams = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('school');
    const exams = await Exam.find({
      school: user.school,
      isDeleted: false,
    })
      .populate('teacher', 'fullName')
      .populate('subject', 'name')
      .populate('classes', 'level trade year term')
      .lean();
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
  deleteExam: exports.deleteExam,
  getUpcomingExamsForStudent: exports.getUpcomingExamsForStudent,
  getStudentClassExams: exports.getStudentClassExams,
  activateExam: exports.activateExam,
  completeExam: exports.completeExam,
  scheduleExam: exports.scheduleExam,
  getTeacherSubjects: exports.getTeacherSubjects,
  getClassesForTeacher: exports.getClassesForTeacher,
  getTeacherExams: exports.getTeacherExams,
  getSchoolExams: exports.getSchoolExams,
};