const Subject = require('../models/Subject');
const School = require('../models/school');
const Class = require('../models/Class');
const Trade = require('../models/trade');
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

// Utility to validate and ensure referenced entities are active and belong to the school
const ensureActiveEntity = async (Model, id, entityName, schoolId = null) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error(`${entityName} ID is invalid`);
    }
    const entity = await Model.findById(id);
    if (!entity || entity.isDeleted) {
        throw new Error(`${entityName} not found or has been deleted`);
    }
    // If schoolId is provided, validate that the entity belongs to the school
    if (schoolId && entityName === 'Trade') {
        const school = await School.findById(schoolId);
        if (!school || !school.tradesOffered.includes(id)) {
            throw new Error(`${entityName} does not belong to the specified school`);
        }
    }
    if (schoolId && entityName === 'Class') {
        if (entity.school.toString() !== schoolId.toString()) {
            throw new Error(`${entityName} does not belong to the specified school`);
        }
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

        const { name, description, schoolId, classes, trades, teacher, credits } = req.body;

        // Validate school
        // await ensureActiveEntity(School, schoolId, 'School');

        // Validate referenced entities and ensure they belong to the school
        if (classes && classes.length > 0) {
            await Promise.all(classes.map(id => ensureActiveEntity(Class, id, 'Class', schoolId)));
        }
        if (trades && trades.length > 0) {
            await Promise.all(trades.map(id => ensureActiveEntity(Trade, id, 'Trade', schoolId)));
        }
        if (teacher) {
            await ensureActiveEntity(User, teacher, 'Teacher');
            const user = await User.findById(teacher);
            if (user.role !== 'teacher' || (user.school && user.school.toString() !== schoolId.toString())) {
                throw new Error('Teacher does not belong to the specified school or has invalid role');
            }
        }

        // Check for duplicate subject
        const existing = await Subject.findOne({ name, schoolId, isDeleted: false });
        if (existing) {
            logger.warn('Duplicate subject detected', { name, schoolId, ip: req.ip });
            return res.status(400).json({ success: false, message: 'Subject with this name already exists in this school' });
        }

        const subject = new Subject({ name, description, school:schoolId, classes: classes || [], trades: trades || [], teacher, credits });
        await subject.save();

        logger.info('Subject created', { subjectId: subject._id, schoolId, ip: req.ip });
        res.status(201).json({ success: true, subject });
    } catch (error) {
        logger.error('Error in createSubject', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: error.message || 'Server Error' });
    }
};

// Get all subjects for a specific school
const getSubjects = async (req, res) => {
    try {
        const { schoolId } = req.query;
        if (!schoolId || !mongoose.Types.ObjectId.isValid(schoolId)) {
            logger.warn('Invalid or missing schoolId in getSubjects', { schoolId, ip: req.ip });
            return res.status(400).json({ success: false, message: 'Valid schoolId is required' });
        }

        await ensureActiveEntity(School, schoolId, 'School');

        const subjects = await Subject.find({ school: schoolId, isDeleted: false })
            .populate('school', 'name')
            .populate('classes', 'name')
            .populate('trades', 'name code')
            .populate('teacher', 'fullName email');

        logger.info('Subjects fetched for school', { schoolId, count: subjects.length, ip: req.ip });
        res.json({ success: true, subjects });
    } catch (error) {
        logger.error('Error in getSubjects', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: error.message || 'Server Error' });
    }
};

// Get subject by ID
const getSubjectById = async (req, res) => {
    try {
        const { schoolId } = req.query;
        if (!schoolId || !mongoose.Types.ObjectId.isValid(schoolId)) {
            logger.warn('Invalid or missing schoolId in getSubjectById', { schoolId, ip: req.ip });
            return res.status(400).json({ success: false, message: 'Valid schoolId is required' });
        }

        await ensureActiveEntity(School, schoolId, 'School');
        const subject = await validateEntity(Subject, req.params.id, 'Subject');

        if (subject.school.toString() !== schoolId.toString()) {
            logger.warn('Subject does not belong to specified school', { subjectId: req.params.id, schoolId, ip: req.ip });
            return res.status(403).json({ success: false, message: 'Subject does not belong to the specified school' });
        }

        await subject
            .populate('school', 'name')
            .populate('classes', 'name')
            .populate('trades', 'name code')
            .populate('teacher', 'fullName email');

        logger.info('Subject fetched', { subjectId: subject._id, schoolId, ip: req.ip });
        return res.json({ success: true, subject });
    } catch (error) {
        if (error?.statusCode) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        logger.error('Error in getSubjectById', { error: error.message, ip: req.ip });
        return res.status(500).json({ success: false, message: 'Server Error' });
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

        const { schoolId, name, description, school, classes, trades, teacher, credits } = req.body;

        if (!schoolId || !mongoose.Types.ObjectId.isValid(schoolId)) {
            logger.warn('Invalid or missing schoolId in updateSubject', { schoolId, ip: req.ip });
            return res.status(400).json({ success: false, message: 'Valid schoolId is required' });
        }

        await ensureActiveEntity(School, schoolId, 'School');
        const subject = await validateEntity(Subject, req.params.id, 'Subject');

        if (subject.school.toString() !== schoolId.toString()) {
            logger.warn('Subject does not belong to specified school', { subjectId: req.params.id, schoolId, ip: req.ip });
            return res.status(403).json({ success: false, message: 'Subject does not belong to the specified school' });
        }

        // Validate referenced entities and ensure they belong to the school
        const targetSchool = school || subject.school;
        if (school && school.toString() !== schoolId.toString()) {
            await ensureActiveEntity(School, school, 'School');
        }
        if (classes && classes.length > 0) {
            await Promise.all(classes.map(id => ensureActiveEntity(Class, id, 'Class', targetSchool)));
        }
        if (trades && trades.length > 0) {
            await Promise.all(trades.map(id => ensureActiveEntity(Trade, id, 'Trade', targetSchool)));
        }
        if (teacher) {
            await ensureActiveEntity(User, teacher, 'Teacher');
            const user = await User.findById(teacher);
            if (user.role !== 'teacher' || (user.school && user.school.toString() !== targetSchool.toString())) {
                throw new Error('Teacher does not belong to the specified school or has invalid role');
            }
        }

        // Check for duplicate subject
        if (name && name !== subject.name) {
            const existing = await Subject.findOne({ name, school: targetSchool, isDeleted: false, _id: { $ne: subject._id } });
            if (existing) {
                logger.warn('Duplicate subject detected on update', { name, school: targetSchool, ip: req.ip });
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

        logger.info('Subject updated', { subjectId: subject._id, schoolId, ip: req.ip });
        res.json({ success: true, subject });
    } catch (error) {
        logger.error('Error in updateSubject', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: error.message || 'Server Error' });
    }
};

// Soft delete subject by ID
const deleteSubject = async (req, res) => {
    try {
        const { schoolId } = req.query;
        if (!schoolId || !mongoose.Types.ObjectId.isValid(schoolId)) {
            logger.warn('Invalid or missing schoolId in deleteSubject', { schoolId, ip: req.ip });
            return res.status(400).json({ success: false, message: 'Valid schoolId is required' });
        }

        await ensureActiveEntity(School, schoolId, 'School');
        const subject = await validateEntity(Subject, req.params.id, 'Subject');

        if (subject.school.toString() !== schoolId.toString()) {
            logger.warn('Subject does not belong to specified school', { subjectId: req.params.id, schoolId, ip: req.ip });
            return res.status(403).json({ success: false, message: 'Subject does not belong to the specified school' });
        }

        subject.isDeleted = true;
        await subject.save();

        logger.info('Subject deleted', { subjectId: subject._id, schoolId, ip: req.ip });
        res.json({ success: true, message: 'Subject deleted' });
    } catch (error) {
        logger.error('Error in deleteSubject', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: error.message || 'Server Error' });
    }
};

// Get classes studying a specific subject
const getClassesBySubject = async (req, res) => {
    try {
        const { schoolId } = req.query;
        const { id: subjectId } = req.params;

        if (!schoolId || !mongoose.Types.ObjectId.isValid(schoolId)) {
            logger.warn('Invalid or missing schoolId in getClassesBySubject', { schoolId, ip: req.ip });
            return res.status(400).json({ success: false, message: 'Valid schoolId is required' });
        }
        if (!subjectId || !mongoose.Types.ObjectId.isValid(subjectId)) {
            logger.warn('Invalid or missing subjectId in getClassesBySubject', { subjectId, ip: req.ip });
            return res.status(400).json({ success: false, message: 'Valid subjectId is required' });
        }

        // Validate school and subject
        await ensureActiveEntity(School, schoolId, 'School');
        const subject = await validateEntity(Subject, subjectId, 'Subject');

        if (subject.school.toString() !== schoolId.toString()) {
            logger.warn('Subject does not belong to specified school', { subjectId, schoolId, ip: req.ip });
            return res.status(403).json({ success: false, message: 'Subject does not belong to the specified school' });
        }

        // Find classes where the subject is listed and belongs to the school
        const classes = await Class.find({
            subjects: subjectId,
            school: schoolId,
            isDeleted: false
        })
            .populate('trade', 'name code')
            .select('level year trade className');

        logger.info('Classes fetched for subject', { subjectId, schoolId, count: classes.length, ip: req.ip });
        res.json({ success: true, classes });
    } catch (error) {
        if (error?.statusCode) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        logger.error('Error in getClassesBySubject', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: error.message || 'Server Error' });
    }
};

module.exports = {
    createSubject,
    getSubjects,
    getSubjectById,
    updateSubject,
    deleteSubject,
    getClassesBySubject
};