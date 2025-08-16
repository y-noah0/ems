const Exam = require('../models/Exam');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const User = require('../models/User');
const Term = require('../models/term');
const { check, validationResult, param } = require('express-validator');
const winston = require('winston');
const mongoose = require('mongoose');
const { validateEntity, validateEntities } = require('../utils/entityValidator');
const { checkScheduleConflicts } = require('../utils/scheduleValidator');
const { toUTC } = require('../utils/dateUtils');
const { logAudit } = require('../utils/auditLogger');
// Two notification mechanisms:
// 1. Real-time immediate (notificationService) for socket + direct Notification doc
// 2. Queued (notificationServices) for email/SMS batching
const notificationService = require('../utils/notificationService'); // real-time
const notificationQueueService = require('../utils/notificationServices'); // queue processor
const { sendSMS } = require('../services/twilioService');
const { sendEmail } = require('../services/emailService');
const SocketNotificationService = require('../utils/socketNotificationService');
// Use a distinct name for the scheduler to avoid shadowing with request body field "schedule"
const jobScheduler = require('node-schedule');
const enrollment = require('../models/enrollment');
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
// Reduced & renamed question types
const allowedQuestionTypes = ['true-false', 'multiple-choice', 'short-answer', 'essay'];

// Define validation arrays
const validateCreateExam = [
  check('schoolId').isMongoId().withMessage('Valid school ID is required'),
  check('termId').isMongoId().withMessage('Valid term ID is required'),
  check('title').notEmpty().withMessage('Title is required').isLength({ max: 100 }).withMessage('Title cannot exceed 100 characters'),
  check('type').isIn(allowedExamTypes).withMessage('Invalid exam type'),
  check('classIds').isArray({ min: 1, max: 10 }).withMessage('At least one and at most 10 class IDs are required'),
  check('classIds.*').isMongoId().withMessage('Invalid class ID format'),
  check('subjectId').isMongoId().withMessage('Invalid subject ID format'),
  check('teacherId').isMongoId().withMessage('Invalid teacher ID format'),
  check('schedule.start').isISO8601().toDate().withMessage('Start time is required and must be a valid date'),
  check('schedule.duration').isInt({ min: 5 }).withMessage('Duration must be at least 5 minutes'),
  check('questions').isArray({ max: 50 }).withMessage('Cannot have more than 50 questions'),
  check('questions.*.type').isIn(allowedQuestionTypes).withMessage('Invalid question type'),
  check('questions.*.text').notEmpty().withMessage('Question text is required').isLength({ max: 500 }).withMessage('Question text cannot exceed 500 characters'),
  check('questions.*.maxScore').isInt({ min: 1 }).withMessage('Question maxScore must be at least 1'),
  check('questions.*.options').custom((options, { req, path }) => {
    const questionIndex = parseInt(path.match(/\[(\d+)\]/)[1]);
    const questionType = req.body.questions[questionIndex].type;
    if (questionType === 'multiple-choice') {
      if (!Array.isArray(options) || options.length < 2 || options.length > 10) {
        throw new Error(`Question ${questionIndex + 1} must have 2-10 options`);
      }
      if (options.some(opt => !opt.text || !opt.text.trim())) {
        throw new Error(`Question ${questionIndex + 1} options must have non-empty text`);
      }
    } else if (questionType === 'true-false') {
      if (!Array.isArray(options) || options.length !== 2 || options[0].text !== 'True' || options[1].text !== 'False') {
        throw new Error(`Question ${questionIndex + 1} must have exactly two options: True and False`);
      }
    } else if (options && options.length > 0) {
      throw new Error(`Question ${questionIndex + 1} should not have options`);
    }
    return true;
  }),
  check('questions.*.correctAnswer').custom((correctAnswer, { req, path }) => {
    const questionIndex = parseInt(path.match(/\[(\d+)\]/)[1]);
    const questionType = req.body.questions[questionIndex].type;
    const options = req.body.questions[questionIndex].options || [];
    if (questionType === 'multiple-choice') {
      if (!Array.isArray(correctAnswer) || correctAnswer.length === 0) {
        throw new Error(`Question ${questionIndex + 1} must have at least one correct answer`);
      }
      if (correctAnswer.some(text => !text.trim())) {
        throw new Error(`Question ${questionIndex + 1} correct answers must have non-empty text`);
      }
      if (!correctAnswer.every(text => options.some(opt => opt.text === text && opt.isCorrect))) {
        throw new Error(`Question ${questionIndex + 1} correct answers must match option texts marked as correct`);
      }
    } else if (questionType === 'true-false') {
      if (typeof correctAnswer !== 'string' || !['True','False'].includes(correctAnswer)) {
        throw new Error(`Question ${questionIndex + 1} correctAnswer must be 'True' or 'False'`);
      }
      if (!options.some(opt => opt.text === correctAnswer && opt.isCorrect)) {
        throw new Error(`Question ${questionIndex + 1} correct answer must match an option marked as correct`);
      }
    } else if (questionType === 'short-answer') {
      if (correctAnswer) {
        if (typeof correctAnswer !== 'string') {
          throw new Error(`Question ${questionIndex + 1} correct answer must be a string`);
        }
        if (correctAnswer.length > 200) {
          throw new Error(`Question ${questionIndex + 1} correct answer cannot exceed 200 characters`);
        }
      }
    } else if (questionType === 'essay') {
      if (correctAnswer && typeof correctAnswer !== 'string') {
        throw new Error(`Question ${questionIndex + 1} expected answer must be a string`);
      }
      if (correctAnswer && correctAnswer.length > 2000) {
        throw new Error(`Question ${questionIndex + 1} expected answer cannot exceed 2000 characters`);
      }
    }
    return true;
  })
];

const validateUpdateExam = [
  param('examId').isMongoId().withMessage('Invalid exam ID format'),
  check('schoolId').isMongoId().withMessage('Valid school ID is required'),
  check('termId').optional().isMongoId().withMessage('Valid term ID is required'),
  check('title').optional().notEmpty().withMessage('Title cannot be empty').isLength({ max: 100 }).withMessage('Title cannot exceed 100 characters'),
  check('type').optional().isIn(allowedExamTypes).withMessage('Invalid exam type'),
  check('classIds').optional().isArray({ min: 1, max: 10 }).withMessage('At least one and at most 10 class IDs are required'),
  check('classIds.*').optional().isMongoId().withMessage('Invalid class ID format'),
  check('subjectId').optional().isMongoId().withMessage('Invalid subject ID format'),
  check('schedule.start').optional().isISO8601().toDate().withMessage('Invalid schedule start date'),
  check('schedule.duration').optional().isInt({ min: 5 }).withMessage('Duration must be at least 5 minutes'),
  check('questions').optional().isArray().withMessage('Questions must be an array'),
  check('questions.*.type').optional().isIn(allowedQuestionTypes).withMessage('Invalid question type'),
  check('questions.*.text').optional().notEmpty().withMessage('Question text cannot be empty').isLength({ max: 500 }).withMessage('Question text cannot exceed 500 characters'),
  check('questions.*.maxScore').optional().isInt({ min: 1 }).withMessage('Question maxScore must be at least 1'),
  check('questions.*.options').optional().custom((options, { req, path }) => {
    const questionIndex = parseInt(path.match(/\[(\d+)\]/)[1]);
    const questionType = req.body.questions[questionIndex].type;
    if (questionType === 'multiple-choice') {
      if (!Array.isArray(options) || options.length < 2 || options.length > 10) {
        throw new Error(`Question ${questionIndex + 1} must have 2-10 options`);
      }
      if (options.some(opt => !opt.text || !opt.text.trim())) {
        throw new Error(`Question ${questionIndex + 1} options must have non-empty text`);
      }
    } else if (questionType === 'true-false') {
      if (!Array.isArray(options) || options.length !== 2 || options[0].text !== 'True' || options[1].text !== 'False') {
        throw new Error(`Question ${questionIndex + 1} must have exactly two options: True and False`);
      }
    } else if (options && options.length > 0) {
      throw new Error(`Question ${questionIndex + 1} should not have options`);
    }
    return true;
  }),
  check('questions.*.correctAnswer').optional().custom((correctAnswer, { req, path }) => {
    const questionIndex = parseInt(path.match(/\[(\d+)\]/)[1]);
    const questionType = req.body.questions[questionIndex].type;
    const options = req.body.questions[questionIndex].options || [];
    if (questionType === 'multiple-choice') {
      if (!Array.isArray(correctAnswer) || correctAnswer.length === 0) {
        throw new Error(`Question ${questionIndex + 1} must have at least one correct answer`);
      }
      if (correctAnswer.some(text => !text.trim())) {
        throw new Error(`Question ${questionIndex + 1} correct answers must have non-empty text`);
      }
      if (!correctAnswer.every(text => options.some(opt => opt.text === text && opt.isCorrect))) {
        throw new Error(`Question ${questionIndex + 1} correct answers must match option texts marked as correct`);
      }
    } else if (questionType === 'true-false') {
      if (typeof correctAnswer !== 'string' || !['True','False'].includes(correctAnswer)) {
        throw new Error(`Question ${questionIndex + 1} correctAnswer must be 'True' or 'False'`);
      }
      if (!options.some(opt => opt.text === correctAnswer && opt.isCorrect)) {
        throw new Error(`Question ${questionIndex + 1} correct answer must match an option marked as correct`);
      }
    } else if (questionType === 'short-answer') {
      if (correctAnswer) {
        if (typeof correctAnswer !== 'string') {
          throw new Error(`Question ${questionIndex + 1} correct answer must be a string`);
        }
        if (correctAnswer.length > 200) {
          throw new Error(`Question ${questionIndex + 1} correct answer cannot exceed 200 characters`);
        }
      }
    } else if (questionType === 'essay') {
      if (correctAnswer && typeof correctAnswer !== 'string') {
        throw new Error(`Question ${questionIndex + 1} expected answer must be a string`);
      }
      if (correctAnswer && correctAnswer.length > 2000) {
        throw new Error(`Question ${questionIndex + 1} expected answer cannot exceed 2000 characters`);
      }
    }
    return true;
  })
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

const validateGetPastExams = [
  check('schoolId').isMongoId().withMessage('Valid school ID is required'),
  check('termId').optional().isMongoId().withMessage('Valid term ID is required')
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
      termId,
      title,
      type,
      classIds,
      subjectId,
      teacherId,
      schedule: scheduleData, // rename to avoid clashing with jobScheduler
      questions,
      instructions
    } = req.body;

    // Sanitize inputs
    const sanitizedData = {
      title: sanitize(title),
      type: sanitize(type),
      instructions: sanitize(instructions || ''),
    };

    // Validate school and user access
    if (req.user.school.toString() !== schoolId) {
      logger.warn('School ID mismatch in createExam', { userId: req.user.id, schoolId });
      return res.status(403).json({ success: false, message: 'Unauthorized to create exam for this school' });
    }

    // Validate entities
    const entities = [
      { model: User, id: teacherId, role: 'teacher', error: 'Invalid teacher' },
      { model: Subject, id: subjectId, error: 'Invalid subject' },
      { model: Term, id: termId, error: 'Invalid term' }
    ];
    for (const entity of entities) {
      const result = await validateEntity(entity.model, entity.id, {
        school: schoolId,
        isDeleted: false,
        ...(entity.role && { role: entity.role })
      });
      if (!result) {
        logger.warn(`${entity.error} in createExam`, { userId: req.user.id, id: entity.id });
        return res.status(400).json({ success: false, message: entity.error });
      }
    }

    // Validate classes
    const classes = await validateEntities(Class, classIds, { school: schoolId, isDeleted: false });
    if (!classes) {
      logger.warn('Invalid classes in createExam', { userId: req.user.id, classIds });
      return res.status(400).json({ success: false, message: 'One or more classes are invalid' });
    }

    // Check teacher-subject match
    const subject = await Subject.findById(subjectId);
    if (subject.teacher.toString() !== teacherId) {
      logger.warn('Teacher-subject mismatch', { teacherId, subjectId });
      return res.status(403).json({ success: false, message: 'You are not assigned to teach this subject' });
    }

    // Check subject is in selected classes
    const classesWithSubject = await Class.find({ _id: { $in: classIds }, subjects: subjectId });
    if (classesWithSubject.length !== classIds.length) {
      logger.warn('Subject not assigned to all selected classes', { subjectId, classIds });
      return res.status(400).json({ success: false, message: 'Subject is not assigned to one or more selected classes' });
    }

    // Validate term belongs to school
    const term = await Term.findById(termId);
    if (term.school.toString() !== schoolId) {
      logger.warn('Term-school mismatch', { termId, schoolId });
      return res.status(400).json({ success: false, message: 'Term does not belong to the specified school' });
    }

    // Validate schedule
  const utcSchedule = scheduleData ? { start: toUTC(scheduleData.start), duration: scheduleData.duration } : {};
    if (utcSchedule.start) {
      const startTime = new Date(utcSchedule.start);
      const now = new Date();
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(now.getFullYear() + 1);
      if (startTime <= now) {
        logger.warn('Start time must be in the future', { userId: req.user.id, startTime });
        return res.status(400).json({ success: false, message: 'Start time must be in the future' });
      }
      if (startTime > oneYearFromNow) {
        logger.warn('Start time too far in the future', { userId: req.user.id, startTime });
        return res.status(400).json({ success: false, message: 'Start time cannot be more than one year in the future' });
      }
      const conflict = await checkScheduleConflicts(classIds, utcSchedule.start, utcSchedule.duration, schoolId);
      if (conflict.hasConflict) {
        logger.warn('Schedule conflict detected', { userId: req.user.id, schedule: utcSchedule, exams: conflict.exams });
        return res.status(400).json({ success: false, message: 'Class is already in another Exam', conflicts: conflict.exams });
      }
    }

    // Create exam
    const exam = new Exam({
      title: sanitizedData.title,
      type: sanitizedData.type,
      classes: classIds,
      subject: subjectId,
      teacher: teacherId,
      term: termId,
      schedule: utcSchedule,
      questions,
      instructions: sanitizedData.instructions,
      school: schoolId,
      status: utcSchedule.start ? 'scheduled' : 'draft'
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

      // Real-time notification for exam scheduled
      try {
        SocketNotificationService.notifyExamScheduled(exam, exam.classes);
      } catch (socketError) {
        logger.error('Failed to send socket notification for exam scheduled', {
          examId: exam._id,
          error: socketError.message
        });
      }

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

          try {
            if (student.email) {
              await sendEmail(
                student.email,
                'New Exam Scheduled',
                `Dear ${student.fullName},\n\nA new exam "${exam.title}" has been scheduled. Please check your dashboard for details.`
              );
            }
          } catch (emailErr) {
            console.error(`Failed to send email to ${student.email}:`, emailErr.message);
          }
        }
      } catch (notifyErr) {
        console.error('Error notifying students:', notifyErr.message);
      }
    // Additional audit for scheduling (if scheduled)
    if (exam.status === 'scheduled') {
      await logAudit(
        'exam',
        exam._id,
        'schedule',
        req.user.id,
        null,
        { start: exam.schedule.start, duration: exam.schedule.duration }
      );
    }

    // Schedule auto-completion job if scheduled
    if (utcSchedule.start && utcSchedule.duration) {
      const endTime = new Date(utcSchedule.start.getTime() + utcSchedule.duration * 60 * 1000);
      // Use jobScheduler to schedule auto-completion
      jobScheduler.scheduleJob(endTime, async () => {
        try {
          const updatedExam = await Exam.findById(exam._id);
          if (updatedExam && updatedExam.status === 'active') {
            updatedExam.status = 'completed';
            await updatedExam.save();
            logger.info('Exam auto-completed', { examId: exam._id });
            await logAudit('exam', exam._id, 'status_change', 'system', { previousStatus: 'active' }, { newStatus: 'completed', title: sanitizedData.title });
          }
        } catch (error) {
          logger.error('Error auto-completing exam', { error: error.message, examId: exam._id });
        }
      });
    }

    // Queue notifications
    const studentIds = await mongoose.model('Enrollment').find({
      class: { $in: classIds },
      term: termId,
      isActive: true,
      isDeleted: false
    }).distinct('student');

    // Queue notifications (basic DB + socket + optional email/SMS already handled above)
    if (studentIds.length > 0) {
      try {
        // Reuse existing notification model directly (batch insert)
        const Notification = require('../models/Notification');
        const notifications = studentIds.map(sid => ({
          user: sid,
            type: 'exam',
            title: 'New Exam Scheduled',
            message: `A new ${sanitizedData.type} "${sanitizedData.title}" has been scheduled.`,
            relatedModel: 'Exam',
            relatedId: exam._id
        }));
        await Notification.insertMany(notifications, { ordered: false });
      } catch (notifErr) {
        logger.error('Failed bulk create notifications', { error: notifErr.message });
      }
    }

    logger.info('Exam created successfully', { examId: exam._id, userId: req.user.id });
    res.status(201).json({ success: true, exam, message: 'Exam created successfully' });

  } catch (error) {
    logger.error('Error creating exam', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get exam by ID
exports.getExamById = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in getExamById', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { examId } = req.params;
    // Accept schoolId from either query (legacy) or body (current client interceptor behavior for PUT)
    const schoolId = (req.query && req.query.schoolId) || (req.body && req.body.schoolId);
    if (!schoolId) {
      logger.warn('Missing schoolId in completeExam', { examId, userId: req.user.id });
      return res.status(400).json({ success: false, message: 'schoolId is required' });
    }

    if (req.user.school.toString() !== schoolId) {
      logger.warn('School ID mismatch in getExamById', { userId: req.user.id, schoolId });
      return res.status(403).json({ success: false, message: 'Unauthorized to access this exam' });
    }

    const exam = await Exam.findOne({ _id: examId, school: schoolId, isDeleted: false })
      .populate('teacher', 'fullName')
      .populate('subject', 'name')
      .populate('classes', 'level trade year term')
      .lean();

    if (!exam) {
      logger.warn('Exam not found', { examId, userId: req.user.id });
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    if (req.user.role === 'student') {
      const { getStudentClasses } = require('../utils/termUtils');
      const studentClassIds = await getStudentClasses(req.user.id, schoolId, exam.term);
      if (!studentClassIds.some(id => exam.classes.some(cls => cls._id.toString() === id.toString()))) {
        logger.warn('Student not enrolled in exam classes', { examId, userId: req.user.id });
        return res.status(403).json({ success: false, message: 'You are not enrolled in a class for this exam' });
      }

      // Hide correct answers and isCorrect from options for students unless exam is completed or past
      if (exam.status !== 'completed' && exam.status !== 'past') {
        exam.questions.forEach(q => {
          delete q.correctAnswer;
          if (q.options) {
            q.options = q.options.map(opt => ({ text: opt.text, _id: opt._id }));
          }
        });
      }
    }

    logger.info('Exam retrieved', { examId, userId: req.user.id });
    res.json({ success: true, exam, message: 'Exam retrieved successfully' });
  } catch (error) {
    logger.error('getExamById error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Update exam
exports.updateExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in updateExam', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { examId } = req.params;
    const { schoolId, termId, title, type, classIds, subjectId, schedule, questions, instructions } = req.body;

    if (req.user.school.toString() !== schoolId) {
      logger.warn('School ID mismatch in updateExam', { userId: req.user.id, schoolId });
      return res.status(403).json({ success: false, message: 'Unauthorized to update this exam' });
    }

    const exam = await Exam.findOne({ _id: examId, school: schoolId, isDeleted: false });
    if (!exam) {
      logger.warn('Exam not found in updateExam', { examId, userId: req.user.id });
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    if (exam.teacher.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'dean') {
      logger.warn('Unauthorized exam update attempt', { examId, userId: req.user.id });
      return res.status(403).json({ success: false, message: 'Only the exam creator or admins/deans can update this exam' });
    }

    if (exam.status === 'active' || exam.status === 'completed' || exam.status === 'past') {
      logger.warn('Cannot update active, completed, or past exam', { examId, userId: req.user.id });
      return res.status(400).json({ success: false, message: 'Cannot update an active, completed, or past exam' });
    }

    const sanitizedData = {
      title: title ? sanitize(title) : exam.title,
      type: type ? sanitize(type) : exam.type,
      instructions: instructions ? sanitize(instructions) : exam.instructions,
    };

    if (termId) {
      const term = await Term.findById(termId);
      if (!term || term.isDeleted || term.school.toString() !== schoolId) {
        logger.warn('Invalid term in updateExam', { termId, userId: req.user.id });
        return res.status(400).json({ success: false, message: 'Invalid or deleted term, or term does not belong to the school' });
      }
      exam.term = termId;
    }

    if (classIds) {
      const classes = await validateEntities(Class, classIds, { school: schoolId, isDeleted: false });
      if (!classes) {
        logger.warn('Invalid classes in updateExam', { classIds, userId: req.user.id });
        return res.status(400).json({ success: false, message: 'One or more classes are invalid' });
      }
      exam.classes = classIds;
    }

    if (subjectId) {
      const subject = await validateEntity(Subject, subjectId, { school: schoolId, isDeleted: false });
      if (!subject) {
        logger.warn('Invalid subject in updateExam', { subjectId, userId: req.user.id });
        return res.status(400).json({ success: false, message: 'Invalid subject' });
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

    exam.updatedAt = new Date();
    await exam.save();

    // Real-time notification for exam updated
    try {
      const changes = Object.keys(req.body).filter(key => key !== 'schoolId');
      SocketNotificationService.notifyExamUpdated(exam, changes);
    } catch (socketError) {
      logger.error('Failed to send socket notification for exam updated', {
        examId: exam._id,
        error: socketError.message
      });
    }

    logger.info('Exam updated successfully', { examId, teacherId: req.user.id, schoolId });
    res.status(200).json({ success: true, exam: exam.toObject(), message: 'Exam updated successfully' });
  } catch (error) {
    logger.error('Error updating exam', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Delete exam (soft delete)
exports.deleteExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in deleteExam', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { examId } = req.params;
    const { schoolId } = req.query;

    if (req.user.school.toString() !== schoolId) {
      logger.warn('School ID mismatch in deleteExam', { userId: req.user.id, schoolId });
      return res.status(403).json({ success: false, message: 'Unauthorized to delete exam for this school' });
    }

    const exam = await Exam.findOne({ _id: examId, school: schoolId, isDeleted: false });
    if (!exam) {
      logger.warn('Exam not found in deleteExam', { examId, userId: req.user.id });
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    if (exam.teacher.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'dean') {
      logger.warn('Unauthorized delete attempt', { examId, userId: req.user.id });
      return res.status(403).json({ success: false, message: 'Only the exam creator or admins/deans can delete this exam' });
    }

    if (exam.status === 'active' || exam.status === 'completed' || exam.status === 'past') {
      logger.warn('Cannot delete active, completed, or past exam', { examId, userId: req.user.id });
      return res.status(400).json({ success: false, message: 'Cannot delete an active, completed, or past exam' });
    }

    exam.isDeleted = true;
    await exam.save();

    // Real-time notification for exam cancelled/deleted
    try {
      SocketNotificationService.notifyExamCancelled(exam, 'Exam was deleted by instructor');
    } catch (socketError) {
      logger.error('Failed to send socket notification for exam deleted', {
        examId: exam._id,
        error: socketError.message
      });
    }

    logger.info('Exam deleted successfully', { examId, teacherId: req.user.id, schoolId });
    res.status(200).json({ success: true, message: 'Exam deleted successfully' });
  } catch (error) {
    logger.error('Error deleting exam', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get upcoming exams for student
exports.getUpcomingExamsForStudent = async (req, res) => {
  try {
    const { schoolId } = req.query;

    if (req.user.school.toString() !== schoolId) {
      logger.warn('School ID mismatch in getUpcomingExamsForStudent', { userId: req.user.id, schoolId });
      return res.status(403).json({ success: false, message: 'Unauthorized to access exams for this school' });
    }

    const { getStudentClasses } = require('../utils/termUtils');
    const classIds = await getStudentClasses(req.user.id, schoolId);

    if (classIds.length === 0) {
      logger.info('No classes found for student', { studentId: req.user.id, schoolId });
      return res.json({ success: true, exams: [], message: 'No upcoming exams found' });
    }

    const exams = await Exam.find({
      classes: { $in: classIds },
      status: { $in: ['scheduled', 'active'] },
      isDeleted: false
    })
      .populate('teacher', 'fullName')
      .populate('subject', 'name')
      .sort({ 'schedule.start': 1 })
      .lean();

    logger.info('Upcoming exams for student retrieved', { studentId: req.user.id, examCount: exams.length, schoolId });
    res.json({ success: true, exams, message: 'Upcoming exams retrieved successfully' });
  } catch (error) {
    logger.error('getUpcomingExamsForStudent error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get exams for student's class (simplified: only schoolId and studentId needed)
exports.getStudentClassExams = async (req, res) => {
  try {
    const { schoolId } = req.query;
    const studentId = req.user.id;

    if (req.user.school.toString() !== schoolId) {
      logger.warn('School ID mismatch in getStudentClassExams', { userId: studentId, schoolId });
      return res.status(403).json({ success: false, message: 'Unauthorized to access exams for this school' });
    }

    // Find active enrollment for this student in this school
    const enrollmentDoc = await mongoose.model('Enrollment').findOne({
      student: studentId,
      school: schoolId,
      isActive: true,
      isDeleted: false
    });

    if (!enrollmentDoc) {
      logger.warn('No active enrollment found for student', { studentId, schoolId });
      return res.status(404).json({ success: false, message: 'No active enrollment found for this student in this school' });
    }

    const classId = enrollmentDoc.class;
    const termId = enrollmentDoc.term;

    const now = new Date();

    const exams = await Exam.find({
      classes: classId,
      term: termId,
      isDeleted: false,
      $or: [
        { 'schedule.start': { $gt: now } }, // scheduled
        {
          'schedule.start': { $lte: now },
          $expr: {
            $lt: [
              now,
              {
                $add: [
                  '$schedule.start',
                  { $multiply: ['$schedule.duration', 60000] } // duration in minutes to milliseconds
                ]
              }
            ]
          }
        } // active
      ]
    })
      .populate('teacher', 'fullName email phoneNumber')
      .populate('subject', 'name')
      .sort({ createdAt: -1 })
      .lean();

    logger.info('Student class exams retrieved', { studentId, classId, examCount: exams.length });
    res.json({ success: true, exams, message: 'Class exams retrieved successfully' });
  } catch (error) {
    logger.error('getStudentClassExams error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get past exams for student
exports.getPastExamsForStudent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in getPastExamsForStudent', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { schoolId, termId } = req.query;

    if (req.user.school.toString() !== schoolId) {
      logger.warn('School ID mismatch in getPastExamsForStudent', { userId: req.user.id, schoolId });
      return res.status(403).json({ success: false, message: 'Unauthorized to access exams for this school' });
    }

    const query = {
      status: 'past',
      isDeleted: false,
      school: schoolId
    };
    if (termId) query.term = termId;

    const exams = await Exam.find(query)
      .populate('teacher', 'fullName')
      .populate('subject', 'name')
      .populate('classes', 'level trade year term')
      .sort({ 'schedule.start': -1 })
      .lean();

    // Filter exams where student is enrolled
    const filteredExams = [];
    for (const exam of exams) {
      const enrollment = await mongoose.model('Enrollment').exists({
        student: req.user.id,
        class: { $in: exam.classes.map(c => c._id) },
        term: exam.term,
        isActive: true,
        isDeleted: false
      });
      if (enrollment) filteredExams.push(exam);
    }

    logger.info('Past exams for student retrieved', { studentId: req.user.id, examCount: filteredExams.length, schoolId });
    res.json({ success: true, exams: filteredExams, message: 'Past exams retrieved successfully' });
  } catch (error) {
    logger.error('getPastExamsForStudent error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
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
    const { schoolId } = req.query;

    if (req.user.school.toString() !== schoolId) {
      logger.warn('School ID mismatch in activateExam', { userId: req.user.id, schoolId });
      return res.status(403).json({ success: false, message: 'Unauthorized to activate exam for this school' });
    }

    const exam = await Exam.findOne({ _id: examId, school: schoolId, isDeleted: false });
    if (!exam) {
      logger.warn('Exam not found in activateExam', { examId, userId: req.user.id });
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    if (exam.teacher.toString() !== req.user.id) {
      logger.warn('Unauthorized activate attempt', { examId, userId: req.user.id });
      return res.status(403).json({ success: false, message: 'Only the exam creator can activate it' });
    }

    if (exam.status !== 'scheduled') {
      logger.warn('Cannot activate non-scheduled exam', { examId, userId: req.user.id });
      return res.status(400).json({ success: false, message: 'Only scheduled exams can be activated' });
    }

    const now = new Date();
    if (exam.schedule.start > now) {
      logger.warn('Cannot activate future exam', { examId, userId: req.user.id });
      return res.status(400).json({ success: false, message: 'Exam cannot be activated before its scheduled start time' });
    }

    exam.status = 'active';
    await exam.save();

    // Schedule end-of-exam auto submission job (minimal intrusion)
    try {
      if (exam.schedule && exam.schedule.start && exam.schedule.duration) {
        const endTime = new Date(new Date(exam.schedule.start).getTime() + exam.schedule.duration * 60000);
        if (endTime > new Date()) {
          const jobName = `auto-submit-${exam._id}`;
          // Cancel existing if any to avoid duplicates
          const existing = jobScheduler.scheduledJobs[jobName];
          if (existing) existing.cancel();
          jobScheduler.scheduleJob(jobName, endTime, async () => {
            try {
              const Submission = require('../models/Submission');
              const submissions = await Submission.find({ exam: exam._id, status: 'in-progress', isDeleted: false });
              for (const sub of submissions) {
                sub.status = 'auto-submitted';
                sub.submittedAt = new Date();
                await sub.save();
              }
              // Mark exam completed if still active
              const freshExam = await Exam.findById(exam._id);
              if (freshExam && freshExam.status === 'active') {
                freshExam.status = 'completed';
                await freshExam.save();
              }
            } catch (e) {
              console.error('End-of-exam auto submit job error', e.message);
            }
          });
        }
      }
    } catch (schedErr) {
      logger.error('Failed scheduling end job', { error: schedErr.message, examId });
    }

  await logAudit('exam', examId, 'status_change', req.user.id, { previousStatus: exam.status }, { newStatus: 'active', title: exam.title });

    // Queue notifications
    const studentIds = await mongoose.model('Enrollment').find({
      class: { $in: exam.classes },
      term: exam.term,
      isActive: true,
      isDeleted: false
    }).distinct('student');

    if (studentIds.length > 0) {
  await notificationQueueService.queueNotification(
        'exam_activated',
        exam._id,
        studentIds,
        `The exam "${exam.title}" is now active.`,
        'email'
      );
  await notificationQueueService.queueNotification(
        'exam_activated',
        exam._id,
        studentIds,
        `Exam "${exam.title}" is now active.`,
        'sms'
      );
    }

    logger.info('Exam activated successfully', { examId, userId: req.user.id });
    res.json({ success: true, exam, message: 'Exam activated successfully' });
  } catch (error) {
    logger.error('Error activating exam', { error: error.message, stack: error.stack, userId: req.user.id });
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
    const { schoolId } = req.query;

  if (!req.user.school || req.user.school.toString() !== schoolId) {
      logger.warn('School ID mismatch in completeExam', { userId: req.user.id, schoolId });
      return res.status(403).json({ success: false, message: 'Unauthorized to complete exam for this school' });
    }

    const exam = await Exam.findOne({ _id: examId, school: schoolId, isDeleted: false });
    if (!exam) {
      logger.warn('Exam not found in completeExam', { examId, userId: req.user.id });
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    if (exam.teacher.toString() !== req.user.id) {
      logger.warn('Unauthorized complete attempt', { examId, userId: req.user.id });
      return res.status(403).json({ success: false, message: 'Only the exam creator can complete it' });
    }

    if (exam.status !== 'active') {
      logger.warn('Cannot complete non-active exam', { examId, userId: req.user.id });
      return res.status(400).json({ success: false, message: 'Only active exams can be completed' });
    }

    exam.status = 'completed';
    await exam.save();

  await logAudit('exam', examId, 'status_change', req.user.id, { previousStatus: exam.status }, { newStatus: 'completed', title: exam.title });

    // Queue notifications
    const studentIds = await mongoose.model('Enrollment').find({
      class: { $in: exam.classes },
      term: exam.term,
      isActive: true,
      isDeleted: false
    }).distinct('student');

    if (studentIds.length > 0) {
  await notificationQueueService.queueNotification(
        'exam_completed',
        exam._id,
        studentIds,
        `The exam "${exam.title}" has been completed.`,
        'email'
      );
  await notificationQueueService.queueNotification(
        'exam_completed',
        exam._id,
        studentIds,
        `Exam "${exam.title}" completed.`,
        'sms'
      );
    }

    logger.info('Exam completed successfully', { examId, userId: req.user.id });
    res.json({ success: true, exam, message: 'Exam completed successfully' });
  } catch (error) {
    logger.error('Error completing exam', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get teacher exams
exports.getTeacherExams = async (req, res) => {
  try {
    const { schoolId, termId } = req.query;

    if (req.user.school.toString() !== schoolId) {
      logger.warn('School ID mismatch in getTeacherExams', { userId: req.user.id, schoolId });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access exams for this school'
      });
    }

    const query = {
      teacher: req.user.id,
      school: schoolId,
      isDeleted: false
    };
    if (termId) {
      query.term = termId;
    }

    const exams = await Exam.find(query)
      .populate('subject', 'name')
      .populate('classes', 'level trade year term')
      .lean();

    logger.info('Teacher exams retrieved', { teacherId: req.user.id, examCount: exams.length, schoolId });
    res.json({ success: true, exams, message: 'Teacher exams retrieved successfully' });
  } catch (error) {
    logger.error('getTeacherExams error', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get classes for teacher
exports.getClassesForTeacher = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in getClassesForTeacher', { errors: errors.array(), userId: req.user.id });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { schoolId } = req.query;
    if (req.user.school.toString() !== schoolId) {
      logger.warn('School ID mismatch', { userId: req.user.id, schoolId });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access classes for this school'
      });
    }

    const subjects = await Subject.find({
      teacher: req.user.id,
      school: schoolId,
      isDeleted: false
    }).lean();

    if (!subjects.length) {
      logger.info('No subjects found for teacher', { teacherId: req.user.id, schoolId });
      return res.status(200).json({ success: true, classes: [], message: 'No subjects assigned to teacher' });
    }

    const subjectIds = subjects.map(subject => subject._id);
    const classes = await Class.find({
      subjects: { $in: subjectIds },
      school: schoolId,
      isDeleted: false
    })
      .populate('trade', 'name code')
      .populate('subjects', 'name')
      .lean();

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

    const { schoolId, termId } = req.query;
    if (req.user.school.toString() !== schoolId && req.user.role !== 'headmaster') {
      logger.warn('School ID mismatch', { userId: req.user.id, schoolId, userSchool: req.user.school });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access exams for this school'
      });
    }

    const query = {
      school: schoolId,
      isDeleted: false
    };
    if (termId) {
      query.term = termId;
    }

    const exams = await Exam.find(query)
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
      logger.warn('School ID mismatch in scheduleExam', { userId: req.user.id, schoolId });
      return res.status(403).json({ success: false, message: 'Unauthorized to schedule exam for this school' });
    }

    const exam = await Exam.findOne({ _id: examId, school: schoolId, isDeleted: false });
    if (!exam) {
      logger.warn('Exam not found in scheduleExam', { examId, userId: req.user.id });
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    if (exam.teacher.toString() !== req.user.id) {
      logger.warn('Unauthorized schedule attempt', { examId, userId: req.user.id });
      return res.status(403).json({ success: false, message: 'Only the exam creator can schedule it' });
    }

    if (exam.status !== 'draft') {
      logger.warn('Cannot schedule non-draft exam', { examId, userId: req.user.id });
      return res.status(400).json({ success: false, message: 'Only draft exams can be scheduled' });
    }

    const utcStart = toUTC(start);
    const now = new Date();
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(now.getFullYear() + 1);
    if (utcStart <= now) {
      logger.warn('Start time must be in the future', { userId: req.user.id, startTime: utcStart });
      return res.status(400).json({ success: false, message: 'Start time must be in the future' });
    }
    if (utcStart > oneYearFromNow) {
      logger.warn('Start time too far in the future', { userId: req.user.id, startTime: utcStart });
      return res.status(400).json({ success: false, message: 'Start time cannot be more than one year in the future' });
    }
    const conflict = await checkScheduleConflicts(exam.classes, utcStart, duration, schoolId, examId);
    if (conflict.hasConflict) {
      logger.warn('Schedule conflict in scheduleExam', { examId, userId: req.user.id, exams: conflict.exams, attemptedSchedule: { start: utcStart, duration } });
      return res.status(400).json({ success: false, message: 'Class is already in another Exam', conflicts: conflict.exams });
    }

    exam.schedule = { start: utcStart, duration };
    exam.status = 'scheduled';
    await exam.save();

  const endTime = new Date(utcStart.getTime() + duration * 60 * 1000);
  jobScheduler.scheduleJob(endTime, async () => {
      try {
        const updatedExam = await Exam.findById(examId);
        if (updatedExam && updatedExam.status === 'active') {
          updatedExam.status = 'completed';
          await updatedExam.save();
          logger.info('Exam auto-completed', { examId });
          await logAudit('exam', examId, 'status_change', 'system', { previousStatus: 'active' }, { newStatus: 'completed', title: exam.title });
        }
      } catch (error) {
        logger.error('Error auto-completing exam', { error: error.message, examId });
      }
    });

    await logAudit('exam', examId, 'schedule', req.user.id, null, {
      title: exam.title,
      start,
      duration
    });

    // Queue notifications
    const studentIds = await mongoose.model('Enrollment').find({
      class: { $in: exam.classes },
      term: exam.term,
      isActive: true,
      isDeleted: false
    }).distinct('student');

    if (studentIds.length > 0) {
  await notificationQueueService.queueNotification(
        'exam_scheduled',
        exam._id,
        studentIds,
        `The exam "${exam.title}" has been scheduled for ${start}.`,
        'email'
      );
  await notificationQueueService.queueNotification(
        'exam_scheduled',
        exam._id,
        studentIds,
        `Exam "${exam.title}" scheduled for ${start}.`,
        'sms'
      );
    }

    logger.info('Exam scheduled successfully', { examId, userId: req.user.id });
    res.json({ success: true, exam, message: 'Exam scheduled successfully' });
  } catch (error) {
    logger.error('Error scheduling exam', { error: error.message, stack: error.stack, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Schedule job to mark exams as past (run daily at midnight)
jobScheduler.scheduleJob('0 0 * * *', async () => {
  try {
    await Exam.markExamsAsPast();
    logger.info('Daily job to mark past exams completed');
  } catch (error) {
    logger.error('Error in daily past exams job', { error: error.message });
  }
});

// Export all functions and validation arrays
module.exports = {
  createExam: exports.createExam,
  getExamById: exports.getExamById,
  updateExam: exports.updateExam,
  scheduleExam: exports.scheduleExam,
  deleteExam: exports.deleteExam,
  getUpcomingExamsForStudent: exports.getUpcomingExamsForStudent,
  getStudentClassExams: exports.getStudentClassExams,
  getPastExamsForStudent: exports.getPastExamsForStudent,
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
  validateGetSchoolExams,
  validateGetPastExams
};
