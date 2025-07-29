// subjectController.js
const Subject = require('../models/Subject');
const School = require('../models/school');
const Class = require('../models/Class');
const Trade = require('../models/trade');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const winston = require('winston');
const { validateEntity } = require('../utils/entityValidator');
const mongoose = require('mongoose');

// Logger setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.File({ filename: 'subject.log' })],
});

const ensureActiveEntity = async (Model, id, name) => {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error(`${name} ID is invalid`);
    const entity = await Model.findById(id);
    if (!entity || entity.isDeleted) throw new Error(`${name} not found or deleted`);
    return entity;
};

// CREATE
const createSubject = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation failed in createSubject', { errors: errors.array(), ip: req.ip });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { name, description, schoolId, trades = [], teacher, credits } = req.body;

        await ensureActiveEntity(School, schoolId, 'School');
        await Promise.all(trades.map(id => ensureActiveEntity(Trade, id, 'Trade')));
        if (teacher) await ensureActiveEntity(User, teacher, 'Teacher');

        const exists = await Subject.findOne({ name, school: schoolId, isDeleted: false });
        if (exists) {
            return res.status(400).json({ success: false, message: 'Subject already exists in this school' });
        }

        const subject = new Subject({ name, description, school: schoolId, trades, teacher, credits });
        await subject.save();

        logger.info('Subject created', { subjectId: subject._id });
        res.status(201).json({ success: true, subject });
    } catch (error) {
        logger.error('Error in createSubject', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: error.message });
    }
};

// READ ALL
const getSubjects = async (req, res) => {
    try {
        const { schoolId } = req.body;
        // if (!schoolId || !mongoose.Types.ObjectId.isValid(schoolId)) {
        
        //     return res.status(400).json({ success: false, message: 'Valid schoolId is required' });
        // }

        const subjects = await Subject.find({ school: schoolId, isDeleted: false })
            .populate('school', 'name')
            .populate('trades', 'name')
            .populate('teacher', 'fullName email');

        res.json({ success: true, subjects });
    } catch (error) {
        logger.error('Error in getSubjects', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// READ BY ID
const getSubjectById = async (req, res) => {
    try {
        const { schoolId } = req.query;
        const subject = await Subject.findOne({
            _id: req.params.id,
            school: schoolId,
            isDeleted: false,
        })
            .populate('school', 'name')
            .populate('trades', 'name')
            .populate('teacher', 'fullName email');

        if (!subject) {
            return res.status(404).json({ success: false, message: 'Subject not found for this school' });
        }

        res.json({ success: true, subject });
    } catch (error) {
        logger.error('Error in getSubjectById', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// UPDATE
const updateSubject = async (req, res) => {
    try {
        const { name, description, schoolId, trades, teacher, credits } = req.body;

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation failed in updateSubject', { errors: errors.array(), ip: req.ip });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const subject = await Subject.findOne({
            _id: req.params.id,
            school: schoolId,
            isDeleted: false,
        });

        if (!subject) {
            return res.status(404).json({ success: false, message: 'Subject not found in this school' });
        }

        if (teacher) await ensureActiveEntity(User, teacher, 'Teacher');
        if (trades) await Promise.all(trades.map(id => ensureActiveEntity(Trade, id, 'Trade')));

        if (name && name !== subject.name) {
            const duplicate = await Subject.findOne({
                name,
                school: schoolId,
                isDeleted: false,
                _id: { $ne: subject._id },
            });
            if (duplicate) {
                return res.status(400).json({ success: false, message: 'Another subject with this name exists in this school' });
            }
        }

        subject.name = name || subject.name;
        subject.description = description || subject.description;
        subject.trades = trades || subject.trades;
        subject.teacher = teacher || subject.teacher;
        subject.credits = credits !== undefined ? credits : subject.credits;

        await subject.save();

        logger.info('Subject updated', { subjectId: subject._id });
        res.json({ success: true, subject });
    } catch (error) {
        logger.error('Error in updateSubject', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE
const deleteSubject = async (req, res) => {
    try {
        const { schoolId } = req.query;
        const subject = await Subject.findOne({
            _id: req.params.id,
            school: schoolId,
            isDeleted: false,
        });

        if (!subject) {
            return res.status(404).json({ success: false, message: 'Subject not found in this school' });
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
    deleteSubject,
};
