const Class = require('../models/Class');
const Subject = require('../models/Subject');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const winston = require('winston');
const mongoose = require('mongoose');

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

        const { level, trade, year, school, capacity, subjects } = req.body;

        // Validate schoolId
        if (!school || !mongoose.isValidObjectId(school)) {
            return res.status(400).json({ success: false, message: 'Valid schoolId is required' });
        }

        // Check if user is authorized for the school
        if (!isAuthorizedForSchool(req, school)) {
            return res.status(403).json({ success: false, message: 'Access denied for this school' });
        }

        const existing = await Class.findOne({ level, trade, year, school, isDeleted: false });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Class already exists in this school' });
        }

        const newClass = new Class({ level, trade, year, school: schoolId, capacity, subjects });
        await newClass.save();

        logger.info('Class created', { classId: newClass._id, school });
        res.status(201).json({ success: true, class: newClass });
    } catch (error) {
        logger.error('Error in createClass', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Get all classes (filtered by schoolId in body)
const getClasses = async (req, res) => {
    const { schoolId } = req.query;
    if (!schoolId) {
        return res.status(400).json({ success: false, message: 'schoolId is required in query' });
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

// Get class by ID (filtered by schoolId in body)
const getClassById = async (req, res) => {
    const { schoolId } = req.query;
    if (!schoolId) {
        return res.status(400).json({ success: false, message: 'schoolId is required in query' });
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

        const { level, trade, year, school, capacity, subjects } = req.body;

        // Validate schoolId
        if (!school || !mongoose.isValidObjectId(school)) {
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
