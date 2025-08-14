const Class = require('../models/Class');
const Subject = require('../models/Subject');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const winston = require('winston');
const mongoose = require('mongoose');
const SocketNotificationService = require('../utils/socketNotificationService');

// Logger setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.File({ filename: 'class.log' })]
});

// Middleware-based role check (Dean and Admin full access, others restricted to their school)
const isDeanOrAdmin = (req) => req.user && ['dean', 'admin'].includes(req.user.role);
const isAuthorizedForSchool = (req, schoolId) => {
    if (isDeanOrAdmin(req)) return true;
    return req.user && req.user.school && req.user.school.toString() === schoolId;
};

// Create Class (only dean or admin, restricted to school)
const createClass = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation failed in createClass', { errors: errors.array(), ip: req.ip });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { level, trade, year, schoolId, capacity, subjects } = req.body;

    if (!schoolId || !mongoose.isValidObjectId(schoolId)) {
      return res.status(400).json({ success: false, message: 'Valid schoolId is required' });
    }
    if (!mongoose.isValidObjectId(trade)) {
      return res.status(400).json({ success: false, message: 'Valid trade ID is required' });
    }
    if (!Array.isArray(subjects)) {
      return res.status(400).json({ success: false, message: 'Subjects must be an array' });
    }
    if (!subjects.every(id => mongoose.isValidObjectId(id))) {
      return res.status(400).json({ success: false, message: 'One or more subject IDs are invalid' });
    }

    if (!isAuthorizedForSchool(req, schoolId)) {
      return res.status(403).json({ success: false, message: 'Access denied for this school' });
    }

    // Normalize and cast inputs properly
    const normalizedLevel = level.trim().toUpperCase();
    const normalizedYear = Number(year);
    if (isNaN(normalizedYear)) {
      return res.status(400).json({ success: false, message: 'Year must be a number' });
    }
    const subjectIds = subjects.map(id => mongoose.Types.ObjectId(id));

    // Helper to compare subject arrays (assumes both arrays of ObjectId or strings)
    const sameSubjects = (arr1, arr2) => {
      if (arr1.length !== arr2.length) return false;
      const sorted1 = arr1.map(String).sort();
      const sorted2 = arr2.map(String).sort();
      return sorted1.every((val, idx) => val === sorted2[idx]);
    };

    // Check if a class with same level, year, school exists with exact same subjects
    const existingClasses = await Class.find({
      level: normalizedLevel,
      year: normalizedYear,
      school: schoolId,
      isDeleted: false
    });

    const duplicate = existingClasses.find(c => sameSubjects(c.subjects, subjectIds));

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: 'Class with same level, year, school, and subjects already exists'
      });
    }

    // Additionally check DB unique index on level+trade+year+school to catch duplicates by trade
    const existingByTrade = await Class.findOne({
      level: normalizedLevel,
      trade: mongoose.Types.ObjectId(trade),
      year: normalizedYear,
      school: schoolId,
      isDeleted: false
    });
    if (existingByTrade) {
      return res.status(400).json({
        success: false,
        message: 'Class with same level, trade, year, and school already exists'
      });
    }

    const newClass = new Class({
      level: normalizedLevel,
      trade,
      year: normalizedYear,
      school: schoolId,
      capacity,
      subjects: subjectIds
    });

    const validationError = newClass.validateSync();
    if (validationError) {
      logger.warn('Validation error on newClass', { error: validationError });
      return res.status(400).json({ success: false, message: validationError.message });
    }

    await newClass.save();

    // Send real-time notifications for class creation
    try {
      await SocketNotificationService.emitToRole('teacher', `school_${schoolId}`, {
        type: 'class_created',
        title: 'New Class Created',
        message: `A new ${normalizedLevel} class has been created`,
        data: {
          classId: newClass._id,
          level: normalizedLevel,
          trade,
          year: normalizedYear,
          capacity,
          timestamp: new Date()
        },
        priority: 'medium'
      });

      await SocketNotificationService.emitToRole('headmaster', `school_${schoolId}`, {
        type: 'class_created',
        title: 'New Class Created',
        message: `A new ${normalizedLevel} class has been created`,
        data: {
          classId: newClass._id,
          level: normalizedLevel,
          trade,
          year: normalizedYear,
          capacity,
          timestamp: new Date()
        },
        priority: 'medium'
      });
    } catch (notificationError) {
      console.error('Error sending class creation notifications:', notificationError);
    }

    res.status(201).json({ success: true, class: newClass });

    try {
      logger.info('Class created', { classId: newClass._id, school: schoolId });
    } catch (logErr) {
      console.error('Logging failed:', logErr);
    }

  } catch (error) {
    logger.error('Error in createClass', {
      message: error.message,
      stack: error.stack,
      ip: req.ip,
      body: req.body,
    });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};





// Get all classes (filtered by schoolId in query)
const getClasses = async (req, res) => {
    const {schoolId} = req.query;

    // Validate schoolId
    if (!schoolId || !mongoose.isValidObjectId(schoolId)) {
        return res.status(400).json({ success: false, message: 'Valid schoolId is required in query' });
    }

    try {
        // Check if user is authorized for the school
        if (!isAuthorizedForSchool(req, schoolId)) {
            return res.status(403).json({ success: false, message: 'Access denied for this school' });
        }

        const classes = await Class.find({ school: schoolId, isDeleted: false })
            .populate('trade', 'code name')
            .populate('school', 'name')
            .populate('subjects', 'name');

        res.json({ success: true, classes });
    } catch (error) {
        logger.error('Error in getClasses', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};



// Get class by ID (filtered by schoolId in query)
const getClassById = async (req, res) => {
    const schoolId = req.query.schoolId;

    // Validate schoolId
    if (!schoolId || !mongoose.isValidObjectId(schoolId)) {
        return res.status(400).json({ success: false, message: 'Valid schoolId is required in query' });
    }

    try {
        // Check if user is authorized for the school
        if (!isAuthorizedForSchool(req, schoolId)) {
            return res.status(403).json({ success: false, message: 'Access denied for this school' });
        }

        const classDoc = await Class.findOne({ _id: req.params.id, school: schoolId, isDeleted: false })
            .populate('trade', 'code name')
            .populate('school', 'name')
            .populate('subjects', 'name');

        if (!classDoc) {
            return res.status(404).json({ success: false, message: 'Class not found in this school' });
        }

        res.json({ success: true, class: classDoc });
    } catch (error) {
        logger.error('Error in getClassById', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};


// Update class (only dean or admin, restricted to school)
const updateClass = async (req, res) => {
    if (!isDeanOrAdmin(req)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { schoolId } = req.body;
    if (!schoolId) {
        return res.status(400).json({ success: false, message: 'schoolId is required in request body' });
    }

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation failed in updateClass', { errors: errors.array(), ip: req.ip });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { level, trade, year, schoolId, capacity, subjects } = req.body;

        // Validate schoolId
        if (!schoolId || !mongoose.isValidObjectId(schoolId)) {
            return res.status(400).json({ success: false, message: 'Valid schoolId is required' });
        }

        // Check if user is authorized for the school
        if (!isAuthorizedForSchool(req, school)) {
            return res.status(403).json({ success: false, message: 'Access denied for this school' });
        }

        const classDoc = await Class.findOne({ _id: req.params.id, school, isDeleted: false });
        if (!classDoc) {
            return res.status(404).json({ success: false, message: 'Class not found in this school' });
        }

        const duplicate = await Class.findOne({
            _id: { $ne: classDoc._id },
            level,
            trade,
            year,
            school: schoolId,
            isDeleted: false
        });
        if (duplicate) {
            return res.status(400).json({ success: false, message: 'Another class with same attributes exists in this school' });
            return res.status(400).json({ success: false, message: 'Another class with same attributes exists in this school' });
        }

        classDoc.level = level;
        classDoc.trade = trade;
        classDoc.year = year;
        classDoc.capacity = capacity;
        classDoc.subjects = subjects;
        await classDoc.save();

        // Send real-time notifications for class update
        try {
          await SocketNotificationService.emitToRole('teacher', `school_${schoolId}`, {
            type: 'class_updated',
            title: 'Class Updated',
            message: `Class ${level} details have been updated`,
            data: {
              classId: classDoc._id,
              level,
              trade,
              year,
              capacity,
              timestamp: new Date()
            },
            priority: 'low'
          });

          await SocketNotificationService.emitToClass(classDoc._id, {
            type: 'class_updated',
            title: 'Class Information Updated',
            message: 'Your class information has been updated. Please check for any changes.',
            data: {
              classId: classDoc._id,
              level,
              capacity,
              timestamp: new Date()
            },
            priority: 'medium'
          });
        } catch (notificationError) {
          console.error('Error sending class update notifications:', notificationError);
        }

        logger.info('Class updated', { classId: classDoc._id, school });
        res.json({ success: true, class: classDoc });
    } catch (error) {
        logger.error('Error in updateClass', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Soft delete class (only dean or admin, restricted to school)
const deleteClass = async (req, res) => {
    if (!isDeanOrAdmin(req)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }
    try {
        const { schoolId } = req.body;

        // Validate schoolId
        if (!schoolId || !mongoose.isValidObjectId(schoolId)) {
            return res.status(400).json({ success: false, message: 'Valid schoolId is required in request body' });
        }

        // Check if user is authorized for the school
        if (!isAuthorizedForSchool(req, schoolId)) {
            return res.status(403).json({ success: false, message: 'Access denied for this school' });
        }

        const classDoc = await Class.findOne({ _id: req.params.id, school: schoolId, isDeleted: false });
        if (!classDoc) {
            return res.status(404).json({ success: false, message: 'Class not found in this school' });
        }

        classDoc.isDeleted = true;
        await classDoc.save();

        // Send real-time notifications for class deletion
        try {
          await SocketNotificationService.emitToRole('teacher', `school_${schoolId}`, {
            type: 'class_deleted',
            title: 'Class Deleted',
            message: `Class ${classDoc.level} has been deleted`,
            data: {
              classId: classDoc._id,
              level: classDoc.level,
              trade: classDoc.trade,
              year: classDoc.year,
              timestamp: new Date()
            },
            priority: 'high'
          });

          await SocketNotificationService.emitToClass(classDoc._id, {
            type: 'class_deleted',
            title: 'Class Deleted',
            message: 'Your class has been deleted. Please contact administration for more information.',
            data: {
              classId: classDoc._id,
              level: classDoc.level,
              timestamp: new Date()
            },
            priority: 'high'
          });
        } catch (notificationError) {
          console.error('Error sending class deletion notifications:', notificationError);
        }

        logger.info('Class soft deleted', { classId: classDoc._id, school: schoolId });
        res.json({ success: true, message: 'Class deleted' });
    } catch (error) {
        logger.error('Error in deleteClass', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = {
    createClass,
    getClasses,
    getClassById,
    updateClass,
    deleteClass
};
