const Term = require('../models/term');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const winston = require('winston');
const mongoose = require('mongoose');
const SocketNotificationService = require('../utils/socketNotificationService');

// Logger setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.File({ filename: 'term.log' })]
});

// Middleware-based role check (Dean and Admin full access, others restricted to their school)
const isDeanOrAdmin = (req) => req.user && ['dean', 'admin'].includes(req.user.role);
const isAuthorizedForSchool = (req, schoolId) => {
    if (isDeanOrAdmin(req)) return true;
    return req.user && req.user.school && req.user.school.toString() === schoolId;
};

// Create a new term
const createTerm = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation failed in createTerm', { errors: errors.array(), ip: req.ip });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { termNumber, academicYear, school, startDate, endDate } = req.body;

        // Validate schoolId
        if (!school || !mongoose.isValidObjectId(school)) {
            return res.status(400).json({ success: false, message: 'Valid schoolId is required' });
        }

        // Check if user is authorized for the school
        if (!isAuthorizedForSchool(req, school)) {
            return res.status(403).json({ success: false, message: 'Access denied for this school' });
        }

        // Check if the term with same termNumber, academicYear and school exists
        const existingTerm = await Term.findOne({ termNumber, academicYear, school, isDeleted: false });
        if (existingTerm) {
            return res.status(400).json({ success: false, message: 'Term already exists for this school and academic year' });
        }

        const term = new Term({ termNumber, academicYear, school, startDate, endDate });
        await term.save();

        // Send real-time notifications for term creation
        try {
            await SocketNotificationService.emitToRole('teacher', `school_${school}`, {
                type: 'term_created',
                title: 'New Term Created',
                message: `Term ${termNumber} for academic year ${academicYear} has been created`,
                data: {
                    termId: term._id,
                    termNumber,
                    academicYear,
                    startDate,
                    endDate,
                    timestamp: new Date()
                },
                priority: 'medium'
            });

            await SocketNotificationService.emitToRole('headmaster', `school_${school}`, {
                type: 'term_created',
                title: 'New Term Created',
                message: `Term ${termNumber} for academic year ${academicYear} has been created`,
                data: {
                    termId: term._id,
                    termNumber,
                    academicYear,
                    startDate,
                    endDate,
                    timestamp: new Date()
                },
                priority: 'medium'
            });

            await SocketNotificationService.emitToRole('student', `school_${school}`, {
                type: 'term_created',
                title: 'New Academic Term',
                message: `Term ${termNumber} for academic year ${academicYear} has been scheduled`,
                data: {
                    termId: term._id,
                    termNumber,
                    academicYear,
                    startDate,
                    endDate,
                    timestamp: new Date()
                },
                priority: 'medium'
            });
        } catch (notificationError) {
            console.error('Error sending term creation notifications:', notificationError);
        }

        logger.info('Term created', { termId: term._id, school });
        res.status(201).json({ success: true, term });
    } catch (error) {
        logger.error('Error in createTerm', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Get all terms (filtered by schoolId in body)
const getTerms = async (req, res) => {
    try {
        const { schoolId } = req.query;

        // Validate schoolId
        if (!schoolId || !mongoose.isValidObjectId(schoolId)) {
            return res.status(400).json({ success: false, message: 'Valid schoolId is required in request body' });
        }

        // Check if user is authorized for the school
        if (!isAuthorizedForSchool(req, schoolId)) {
            return res.status(403).json({ success: false, message: 'Access denied for this school' });
        }

        const terms = await Term.find({ school: schoolId, isDeleted: false }).populate('school', 'name');
        res.json({ success: true, terms });
    } catch (error) {
        logger.error('Error in getTerms', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Get a single term by id (filtered by schoolId in body)
const getTermById = async (req, res) => {
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

        const term = await Term.findOne({ _id: req.params.id, school: schoolId, isDeleted: false }).populate('school', 'name');
        if (!term) {
            return res.status(404).json({ success: false, message: 'Term not found in this school' });
        }

        res.json({ success: true, term });
    } catch (error) {
        logger.error('Error in getTermById', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Update term by id
const updateTerm = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation failed in updateTerm', { errors: errors.array(), ip: req.ip });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { termNumber, academicYear, school, startDate, endDate } = req.body;

        // Validate schoolId
        if (!school || !mongoose.isValidObjectId(school)) {
            return res.status(400).json({ success: false, message: 'Valid schoolId is required' });
        }

        // Check if user is authorized for the school
        if (!isAuthorizedForSchool(req, school)) {
            return res.status(403).json({ success: false, message: 'Access denied for this school' });
        }

        const term = await Term.findOne({ _id: req.params.id, school, isDeleted: false });
        if (!term) {
            return res.status(404).json({ success: false, message: 'Term not found in this school' });
        }

        // Check unique constraint on update (skip if same ID)
        const existingTerm = await Term.findOne({
            _id: { $ne: term._id },
            termNumber,
            academicYear,
            school,
            isDeleted: false
        });
        if (existingTerm) {
            return res.status(400).json({ success: false, message: 'Another term with the same termNumber, academicYear and school exists' });
        }

        term.termNumber = termNumber;
        term.academicYear = academicYear;
        term.school = school;
        term.startDate = startDate;
        term.endDate = endDate;
        await term.save();

        // Send real-time notifications for term update
        try {
            await SocketNotificationService.emitToRole('teacher', `school_${school}`, {
                type: 'term_updated',
                title: 'Term Updated',
                message: `Term ${termNumber} for academic year ${academicYear} has been updated`,
                data: {
                    termId: term._id,
                    termNumber,
                    academicYear,
                    startDate,
                    endDate,
                    timestamp: new Date()
                },
                priority: 'medium'
            });

            await SocketNotificationService.emitToRole('student', `school_${school}`, {
                type: 'term_updated',
                title: 'Term Schedule Updated',
                message: `The schedule for Term ${termNumber} has been updated. Please check the new dates.`,
                data: {
                    termId: term._id,
                    termNumber,
                    academicYear,
                    startDate,
                    endDate,
                    timestamp: new Date()
                },
                priority: 'medium'
            });
        } catch (notificationError) {
            console.error('Error sending term update notifications:', notificationError);
        }

        logger.info('Term updated', { termId: term._id, school });
        res.json({ success: true, term });
    } catch (error) {
        logger.error('Error in updateTerm', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Soft delete term by id
const deleteTerm = async (req, res) => {
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

        const term = await Term.findOne({ _id: req.params.id, school: schoolId, isDeleted: false });
        if (!term) {
            return res.status(404).json({ success: false, message: 'Term not found in this school' });
        }

        term.isDeleted = true;
        await term.save();

        // Send real-time notifications for term deletion
        try {
            await SocketNotificationService.emitToRole('teacher', `school_${schoolId}`, {
                type: 'term_deleted',
                title: 'Term Deleted',
                message: `Term ${term.termNumber} for academic year ${term.academicYear} has been deleted`,
                data: {
                    termId: term._id,
                    termNumber: term.termNumber,
                    academicYear: term.academicYear,
                    timestamp: new Date()
                },
                priority: 'high'
            });

            await SocketNotificationService.emitToRole('student', `school_${schoolId}`, {
                type: 'term_deleted',
                title: 'Term Canceled',
                message: `Term ${term.termNumber} for academic year ${term.academicYear} has been canceled. Please contact administration.`,
                data: {
                    termId: term._id,
                    termNumber: term.termNumber,
                    academicYear: term.academicYear,
                    timestamp: new Date()
                },
                priority: 'high'
            });
        } catch (notificationError) {
            console.error('Error sending term deletion notifications:', notificationError);
        }

        logger.info('Term soft deleted', { termId: term._id, school: schoolId });
        res.json({ success: true, message: 'Term deleted' });
    } catch (error) {
        logger.error('Error in deleteTerm', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = {
    createTerm,
    getTerms,
    getTermById,
    updateTerm,
    deleteTerm
};