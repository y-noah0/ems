const Enrollment = require('../models/enrollment');
const { validationResult } = require('express-validator');
const winston = require('winston');
const mongoose = require('mongoose');

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

        const { student, class: classId, term, schoolId, promotionStatus, isActive, transferredFromSchool } = req.body;

        if (!mongoose.Types.ObjectId.isValid(schoolId)) {
            return res.status(400).json({ success: false, message: 'Invalid schoolId' });
        }

        const existing = await Enrollment.findOne({ student, term, school: schoolId, isDeleted: false });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Student already enrolled for this term in this school' });
        }

        const enrollment = new Enrollment({
            student,
            class: classId,
            term,
            school: schoolId,
            promotionStatus,
            isActive,
            transferredFromSchool
        });

        await enrollment.save();

        logger.info('Enrollment created', { enrollmentId: enrollment._id });
        res.status(201).json({ success: true, enrollment });
    } catch (error) {
        logger.error('Error in createEnrollment', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Get all enrollments for a school
const getEnrollments = async (req, res) => {
    try {
        const { schoolId } = req.query;

        if (!mongoose.Types.ObjectId.isValid(schoolId)) {
            return res.status(400).json({ success: false, message: 'Invalid schoolId' });
        }

        const enrollments = await Enrollment.find({ isDeleted: false, school: schoolId })
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

// Get enrollment by ID with school isolation
const getEnrollmentById = async (req, res) => {
    try {
        const { schoolId } = req.query;
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(schoolId)) {
            return res.status(400).json({ success: false, message: 'Invalid schoolId' });
        }

        const enrollment = await Enrollment.findOne({ _id: id, school: schoolId, isDeleted: false })
            .populate('student', 'fullName registrationNumber')
            .populate('class', 'level trade year')
            .populate('term', 'name year')
            .populate('school', 'name');

        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found for this school' });
        }

        res.json({ success: true, enrollment });
    } catch (error) {
        logger.error('Error in getEnrollmentById', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Update enrollment with school isolation
const updateEnrollment = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation failed in updateEnrollment', { errors: errors.array(), ip: req.ip });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { student, class: classId, term, schoolId, promotionStatus, isActive, transferredFromSchool } = req.body;
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(schoolId)) {
            return res.status(400).json({ success: false, message: 'Invalid schoolId' });
        }

        const enrollment = await Enrollment.findOne({ _id: id, school: schoolId, isDeleted: false });

        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found for this school' });
        }

        // Check for duplicate if student/term is changing
        if (student && term &&
            (student !== enrollment.student.toString() || term !== enrollment.term.toString())) {
            const existing = await Enrollment.findOne({
                student,
                term,
                school: schoolId,
                isDeleted: false,
                _id: { $ne: enrollment._id }
            });

            if (existing) {
                return res.status(400).json({ success: false, message: 'Student already enrolled for this term in this school' });
            }
        }

        enrollment.student = student || enrollment.student;
        enrollment.class = classId || enrollment.class;
        enrollment.term = term || enrollment.term;
        enrollment.school = schoolId || enrollment.school;
        enrollment.promotionStatus = promotionStatus || enrollment.promotionStatus;
        enrollment.isActive = isActive !== undefined ? isActive : enrollment.isActive;
        enrollment.transferredFromSchool = transferredFromSchool !== undefined
            ? transferredFromSchool
            : enrollment.transferredFromSchool;

        await enrollment.save();

        logger.info('Enrollment updated', { enrollmentId: enrollment._id });
        res.json({ success: true, enrollment });
    } catch (error) {
        logger.error('Error in updateEnrollment', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Soft delete enrollment with school isolation
const deleteEnrollment = async (req, res) => {
    try {
        const { schoolId } = req.body;
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(schoolId)) {
            return res.status(400).json({ success: false, message: 'Invalid schoolId' });
        }

        const enrollment = await Enrollment.findOne({ _id: id, school: schoolId, isDeleted: false });

        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found for this school' });
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
