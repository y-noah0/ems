const Subject = require('../models/Subject');
const School = require('../models/School');
const Class = require('../models/Class');
const Trade = require('../models/Trade');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const winston = require('winston');
const { validateEntity, validateEntities } = require('../utils/entityValidator');
const { toUTC } = require('../utils/dateUtils');
const mongoose = require('mongoose');

// Logger setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.File({ filename: 'subject.log' })]
});

// Utility to validate and ensure referenced entities are active
const ensureActiveEntity = async (Model, id, entityName) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error(`${entityName} ID is invalid`);
    }
    const entity = await Model.findById(id);
    if (!entity || entity.isDeleted) {
        throw new Error(`${entityName} not found or has been deleted`);
    }
    return entity;
};

// Create a new Subject
const createSubject = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation failed in createSubject', { errors: errors.array(), ip: req.ip });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { name, description, school, classes = [], trades = [], teacher, credits } = req.body;

        // Validate referenced entities
        await ensureActiveEntity(School, school, 'School');
        await Promise.all(classes.map(id => ensureActiveEntity(Class, id, 'Class')));
        await Promise.all(trades.map(id => ensureActiveEntity(Trade, id, 'Trade')));
        if (teacher) await ensureActiveEntity(User, teacher, 'Teacher');

        // Check for duplicate subject
        const existing = await Subject.findOne({ name, school, isDeleted: false });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Subject with this name already exists in this school' });
        }

        const subject = new Subject({ name, description, school, classes, trades, teacher, credits });
        await subject.save();

        logger.info('Subject created', { subjectId: subject._id });
        res.status(201).json({ success: true, subject });
    } catch (error) {
        logger.error('Error in createSubject', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: error.message || 'Server Error' });
    }
};

// Get all subjects
const getSubjects = async (req, res) => {
    try {
        const subjects = await Subject.find({ isDeleted: false })
            .populate('school', 'name')
            .populate('classes', 'level trade year')
            .populate('trades', 'name')
            .populate('teacher', 'fullName email');

        res.json({ success: true, subjects });
    } catch (error) {
        logger.error('Error in getSubjects', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Get subject by ID
const getSubjectById = async (req, res) => {
    try {
        const subject = await validateEntity(Subject, req.params.id, 'Subject');
        await subject
            .populate('school', 'name')
            .populate('classes', 'level trade year')
            .populate('trades', 'name')
            .populate('teacher', 'fullName email');

        res.json({ success: true, subject });
    } catch (validationError) {
        return res.status(validationError.statusCode || 400).json({
            success: false,
            message: validationError.message
        });
    } catch (error) {
        logger.error('Error in getSubjectById', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Update subject by ID
const updateSubject = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation failed in updateSubject', { errors: errors.array(), ip: req.ip });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const subject = await Subject.findById(req.params.id);
        if (!subject || subject.isDeleted) {
            return res.status(404).json({ success: false, message: 'Subject not found' });
        }

        const { name, description, school, classes, trades, teacher, credits } = req.body;

        if (school) await ensureActiveEntity(School, school, 'School');
        if (classes) await Promise.all(classes.map(id => ensureActiveEntity(Class, id, 'Class')));
        if (trades) await Promise.all(trades.map(id => ensureActiveEntity(Trade, id, 'Trade')));
        if (teacher) await ensureActiveEntity(User, teacher, 'Teacher');

        if (name && name !== subject.name) {
            const existing = await Subject.findOne({ name, school: school || subject.school, isDeleted: false, _id: { $ne: subject._id } });
            if (existing) {
                return res.status(400).json({ success: false, message: 'Another subject with this name already exists in the school' });
            }
        }

        subject.name = name || subject.name;
        subject.description = description || subject.description;
        subject.school = school || subject.school;
        subject.classes = classes || subject.classes;
        subject.trades = trades || subject.trades;
        subject.teacher = teacher || subject.teacher;
        subject.credits = credits !== undefined ? credits : subject.credits;

        await subject.save();

        logger.info('Subject updated', { subjectId: subject._id });
        res.json({ success: true, subject });
    } catch (error) {
        logger.error('Error in updateSubject', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: error.message || 'Server Error' });
    }
};

// Soft delete subject by ID
const deleteSubject = async (req, res) => {
    try {
        const subject = await Subject.findById(req.params.id);
        if (!subject || subject.isDeleted) {
            return res.status(404).json({ success: false, message: 'Subject not found' });
        }

        subject.isDeleted = true;
        await subject.save();

        logger.info('Subject deleted', { subjectId: subject._id });
        res.json({ success: true, message: 'Subject deleted' });
    } catch (error) {
        logger.error('Error in deleteSubject', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = {
    createSubject,
    getSubjects,
    getSubjectById,
    updateSubject,
    deleteSubject
};
