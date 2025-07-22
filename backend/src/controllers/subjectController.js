// subjectController.js
const Subject = require('../models/Subject');
const { validationResult } = require('express-validator');
const winston = require('winston');

// Logger setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.File({ filename: 'subject.log' })]
});

// Create a new Subject
const createSubject = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation failed in createSubject', { errors: errors.array(), ip: req.ip });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { name, description, school, trades, teacher, credits } = req.body;

        // Check if subject with same name & school exists (unique index)
        const existing = await Subject.findOne({ name, school, isDeleted: false });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Subject with this name already exists in the school' });
        }

        const subject = new Subject({ name, description, school, trades, teacher, credits });
        await subject.save();

        logger.info('Subject created', { subjectId: subject._id });
        res.status(201).json({ success: true, subject });
    } catch (error) {
        logger.error('Error in createSubject', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Get all subjects
const getSubjects = async (req, res) => {
    try {
        const subjects = await Subject.find({ isDeleted: false })
            .populate('school', 'name')
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
        const subject = await Subject.findById(req.params.id)
            .populate('school', 'name')
            .populate('trades', 'name')
            .populate('teacher', 'fullName email');

        if (!subject || subject.isDeleted) {
            return res.status(404).json({ success: false, message: 'Subject not found' });
        }

        res.json({ success: true, subject });
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

        const { name, description, school, trades, teacher, credits } = req.body;
        const subject = await Subject.findById(req.params.id);

        if (!subject || subject.isDeleted) {
            return res.status(404).json({ success: false, message: 'Subject not found' });
        }

        // Check unique name in school (if changed)
        if (name && name !== subject.name) {
            const existing = await Subject.findOne({ name, school: school || subject.school, isDeleted: false, _id: { $ne: subject._id } });
            if (existing) {
                return res.status(400).json({ success: false, message: 'Another subject with this name already exists in the school' });
            }
        }

        subject.name = name || subject.name;
        subject.description = description || subject.description;
        subject.school = school || subject.school;
        subject.trades = trades || subject.trades;
        subject.teacher = teacher || subject.teacher;
        subject.credits = credits !== undefined ? credits : subject.credits;

        await subject.save();

        logger.info('Subject updated', { subjectId: subject._id });
        res.json({ success: true, subject });
    } catch (error) {
        logger.error('Error in updateSubject', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
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