// enrollmentController.js
const Enrollment = require('../models/enrollment');
const { validationResult } = require('express-validator');
const winston = require('winston');

// Logger setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.File({ filename: 'enrollment.log' })]
});

// Create enrollment
const createEnrollment = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation failed in createEnrollment', { errors: errors.array(), ip: req.ip });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { student, class: classId, term, school } = req.body;

        const existing = await Enrollment.findOne({ student, term });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Student already enrolled for this term' });
        }

        const enrollment = new Enrollment({ student, class: classId, term, school });
        await enrollment.save();

        logger.info('Enrollment created', { enrollmentId: enrollment._id });
        res.status(201).json({ success: true, enrollment });
    } catch (error) {
        logger.error('Error in createEnrollment', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Get all enrollments
const getEnrollments = async (req, res) => {
    try {
        const enrollments = await Enrollment.find({ isDeleted: false })
            .populate('student', 'fullName registrationNumber')
            .populate('class', 'level trade year')
            .populate('term', 'name year')
            .populate('school', 'name');

        res.json({ success: true, enrollments });
    } catch (error) {
        logger.error('Error in getEnrollments', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Get enrollment by ID
const getEnrollmentById = async (req, res) => {
    try {
        const enrollment = await Enrollment.findById(req.params.id)
            .populate('student', 'fullName registrationNumber')
            .populate('class', 'level trade year')
            .populate('term', 'name year')
            .populate('school', 'name');

        if (!enrollment || enrollment.isDeleted) {
            return res.status(404).json({ success: false, message: 'Enrollment not found' });
        }

        res.json({ success: true, enrollment });
    } catch (error) {
        logger.error('Error in getEnrollmentById', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Update enrollment
const updateEnrollment = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation failed in updateEnrollment', { errors: errors.array(), ip: req.ip });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { student, class: classId, term, school } = req.body;
        const enrollment = await Enrollment.findById(req.params.id);

        if (!enrollment || enrollment.isDeleted) {
            return res.status(404).json({ success: false, message: 'Enrollment not found' });
        }

        enrollment.student = student;
        enrollment.class = classId;
        enrollment.term = term;
        enrollment.school = school;
        await enrollment.save();

        logger.info('Enrollment updated', { enrollmentId: enrollment._id });
        res.json({ success: true, enrollment });
    } catch (error) {
        logger.error('Error in updateEnrollment', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Soft delete enrollment
const deleteEnrollment = async (req, res) => {
    try {
        const enrollment = await Enrollment.findById(req.params.id);
        if (!enrollment || enrollment.isDeleted) {
            return res.status(404).json({ success: false, message: 'Enrollment not found' });
        }

        enrollment.isDeleted = true;
        await enrollment.save();

        logger.info('Enrollment deleted', { enrollmentId: enrollment._id });
        res.json({ success: true, message: 'Enrollment deleted' });
    } catch (error) {
        logger.error('Error in deleteEnrollment', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = {
    createEnrollment,
    getEnrollments,
    getEnrollmentById,
    updateEnrollment,
    deleteEnrollment
};
