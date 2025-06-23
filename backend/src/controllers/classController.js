// classController.js
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const winston = require('winston');

// Logger setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.File({ filename: 'class.log' })]
});

// Middleware-based role check (Dean and Admin full access)
const isDeanOrAdmin = (req) => req.user && ['dean', 'admin'].includes(req.user.role);

// Create Class (only dean or admin)
const createClass = async (req, res) => {
    if (!isDeanOrAdmin(req)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation failed in createClass', { errors: errors.array(), ip: req.ip });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { level, trade, year, school, subjects } = req.body;
        const existing = await Class.findOne({ level, trade, year, school });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Class already exists' });
        }

        const newClass = new Class({ level, trade, year, school, subjects });
        await newClass.save();

        logger.info('Class created', { classId: newClass._id });
        res.status(201).json({ success: true, class: newClass });
    } catch (error) {
        logger.error('Error in createClass', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Get all classes
const getClasses = async (req, res) => {
    try {
        const classes = await Class.find({ isDeleted: false })
            .populate('trade', 'code name')
            .populate('school', 'name')
            .populate('subjects', 'name');

        res.json({ success: true, classes });
    } catch (error) {
        logger.error('Error in getClasses', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Get class by ID
const getClassById = async (req, res) => {
    try {
        const classDoc = await Class.findById(req.params.id)
            .populate('trade', 'code name')
            .populate('school', 'name')
            .populate('subjects', 'name');

        if (!classDoc || classDoc.isDeleted) {
            return res.status(404).json({ success: false, message: 'Class not found' });
        }

        res.json({ success: true, class: classDoc });
    } catch (error) {
        logger.error('Error in getClassById', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Update class (only dean or admin)
const updateClass = async (req, res) => {
    if (!isDeanOrAdmin(req)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation failed in updateClass', { errors: errors.array(), ip: req.ip });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const classDoc = await Class.findById(req.params.id);
        if (!classDoc || classDoc.isDeleted) {
            return res.status(404).json({ success: false, message: 'Class not found' });
        }

        const { level, trade, year, school, subjects } = req.body;
        const duplicate = await Class.findOne({
            _id: { $ne: classDoc._id },
            level,
            trade,
            year,
            school,
            isDeleted: false
        });
        if (duplicate) {
            return res.status(400).json({ success: false, message: 'Another class with same attributes exists' });
        }

        classDoc.level = level;
        classDoc.trade = trade;
        classDoc.year = year;
        classDoc.school = school;
        classDoc.subjects = subjects;
        await classDoc.save();

        logger.info('Class updated', { classId: classDoc._id });
        res.json({ success: true, class: classDoc });
    } catch (error) {
        logger.error('Error in updateClass', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Soft delete class (only dean or admin)
const deleteClass = async (req, res) => {
    if (!isDeanOrAdmin(req)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }
    try {
        const classDoc = await Class.findById(req.params.id);
        if (!classDoc || classDoc.isDeleted) {
            return res.status(404).json({ success: false, message: 'Class not found' });
        }

        classDoc.isDeleted = true;
        await classDoc.save();

        logger.info('Class soft deleted', { classId: classDoc._id });
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
