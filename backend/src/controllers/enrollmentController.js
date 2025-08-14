const Enrollment = require('../models/enrollment');
const { validationResult } = require('express-validator');
const winston = require('winston');
const mongoose = require('mongoose');
const SocketNotificationService = require('../utils/socketNotificationService');
const User = require('../models/User');
const Class = require('../models/Class');

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

        // Check for existing enrollment in same term/school
        const existing = await Enrollment.findOne({ student, term, school: schoolId, isDeleted: false });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Student already enrolled for this term in this school' });
        }

        // Ensure no active enrollments elsewhere (forces release first)
        const activeCount = await Enrollment.countDocuments({ student, isActive: true, isDeleted: false });
        if (activeCount > 0) {
            return res.status(400).json({ success: false, message: 'Student has active enrollment elsewhere. Release required first.' });
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

        // Real-time notification for student enrollment
        try {
          const student = await User.findById(enrollment.student);
          const classData = await Class.findById(enrollment.class);
          
          if (student && classData) {
            SocketNotificationService.notifyStudentEnrolled(enrollment, student, classData);
          }
        } catch (socketError) {
          logger.error('Failed to send socket notification for enrollment', {
            enrollmentId: enrollment._id,
            error: socketError.message
          });
        }

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
        const { school, schoolId, class: classId, isActive, populate } = req.query;

        const effectiveSchoolId = schoolId || school;

        if (!mongoose.Types.ObjectId.isValid(effectiveSchoolId)) {
            return res.status(400).json({ success: false, message: 'Invalid school ID' });
        }

        const query = {
            isDeleted: false,
            school: effectiveSchoolId
        };

        if (classId) {
            if (!mongoose.Types.ObjectId.isValid(classId)) {
                return res.status(400).json({ success: false, message: 'Invalid class ID' });
            }
            query.class = classId;
        }

        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        const populateOptions = [];
        if (populate) {
            populate.split(',').forEach(field => {
                populateOptions.push(field.trim());
            });
        }

        const defaultPopulate = ['student', 'class', 'term'];
        const finalPopulate = populateOptions.length > 0 ? populateOptions : defaultPopulate;

        const enrollments = await Enrollment.find(query)
            .populate(finalPopulate.join(' '));

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

// Update promotion status for a single enrollment
const updatePromotionStatus = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation failed in updatePromotionStatus', { errors: errors.array(), ip: req.ip });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { schoolId, enrollmentId, promotionStatus } = req.body;

        if (!mongoose.Types.ObjectId.isValid(schoolId)) {
            return res.status(400).json({ success: false, message: 'Invalid schoolId' });
        }

        if (!mongoose.Types.ObjectId.isValid(enrollmentId)) {
            return res.status(400).json({ success: false, message: 'Invalid enrollmentId' });
        }

        if (!['eligible', 'repeat', 'expelled', 'onLeave', 'withdrawn', 'transferred'].includes(promotionStatus)) {  // Added 'transferred'
            return res.status(400).json({ success: false, message: `Invalid promotion status: ${promotionStatus}` });
        }

        const enrollment = await Enrollment.findOne({
            _id: enrollmentId,
            school: schoolId,
            isDeleted: false
        });

        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found for this school' });
        }

        // Optional: Tie promotionStatus to isActive
        if (['expelled', 'withdrawn', 'onLeave', 'transferred'].includes(promotionStatus)) {  // Added 'transferred'
            enrollment.isActive = false;
        } else if (['eligible', 'repeat'].includes(promotionStatus)) {
            enrollment.isActive = true;
        }

        enrollment.promotionStatus = promotionStatus;
        await enrollment.save();

        logger.info('Promotion status updated', { enrollmentId: enrollment._id, promotionStatus, ip: req.ip });

        res.json({
            success: true,
            enrollment,
            message: 'Promotion status updated successfully'
        });
    } catch (error) {
        logger.error('Error in updatePromotionStatus', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Release enrollment for transfer to a specific school
const releaseEnrollment = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation failed in releaseEnrollment', { errors: errors.array(), ip: req.ip });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { enrollmentId, currentSchoolId, targetSchoolId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(currentSchoolId) || !mongoose.Types.ObjectId.isValid(targetSchoolId)) {
            return res.status(400).json({ success: false, message: 'Invalid school IDs' });
        }

        const enrollment = await Enrollment.findOne({
            _id: enrollmentId,
            school: currentSchoolId,
            isActive: true,
            isDeleted: false
        });

        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Active enrollment not found in current school' });
        }

        enrollment.isActive = false;
        enrollment.promotionStatus = 'transferred';
        enrollment.transferredToSchool = targetSchoolId;
        await enrollment.save();

        logger.info('Enrollment released for transfer', { enrollmentId: enrollment._id, targetSchool: targetSchoolId, ip: req.ip });

        res.json({
            success: true,
            enrollment,
            message: 'Enrollment released for transfer to specified school'
        });
    } catch (error) {
        logger.error('Error in releaseEnrollment', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = {
    createEnrollment,
    getEnrollments,
    getEnrollmentById,
    updateEnrollment,
    deleteEnrollment,
    updatePromotionStatus,
    releaseEnrollment
};