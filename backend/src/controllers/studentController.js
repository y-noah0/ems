const User = require('../models/User');
const Enrollment = require('../models/enrollment');
const { check, validationResult } = require('express-validator');
const winston = require('winston');
const { validateEntity } = require('../utils/entityValidator');
const { logAudit } = require('../utils/auditLogger');

// Logger setup
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
    ],
});
if (process.env.NODE_ENV !== 'production') {
    logger.add(
        new winston.transports.Console({
            format: winston.format.simple(),
        })
    );
}

// Temporary sanitize function
const sanitize = (value) => String(value || '');

// Validation Rules
const validateGetStudentsByClass = [
    check('schoolId').isMongoId().withMessage('Valid school ID is required'),
    check('classId').isMongoId().withMessage('Valid class ID is required'),
];

const validateGetStudentById = [
    check('schoolId').isMongoId().withMessage('Valid school ID is required'),
    check('studentId').isMongoId().withMessage('Valid student ID is required'),
];

const validateGetStudentsByTerm = [
    check('schoolId').isMongoId().withMessage('Valid school ID is required'),
    check('termId').isMongoId().withMessage('Valid term ID is required'),
];

const validateGetStudentsByPromotionStatus = [
    check('schoolId').isMongoId().withMessage('Valid school ID is required'),
    check('classId').optional().isMongoId().withMessage('Valid class ID is required if provided'),
    check('promotionStatus')
        .isIn(['eligible', 'repeat', 'expelled', 'onLeave', 'withdrawn'])
        .withMessage('Invalid promotion status'),
];

const validateUpdateStudentPromotionStatus = [
    check('schoolId').isMongoId().withMessage('Valid school ID is required'),
    check('studentId').isMongoId().withMessage('Valid student ID is required'),
    check('classId').isMongoId().withMessage('Valid class ID is required'),
    check('termId').isMongoId().withMessage('Valid term ID is required'),
    check('promotionStatus')
        .isIn(['eligible', 'repeat', 'expelled', 'onLeave', 'withdrawn'])
        .withMessage('Invalid promotion status'),
];

// Get all students in a specific class
async function getStudentsByClass(req, res) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation errors in getStudentsByClass', { errors: errors.array(), userId: req.user.id });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { schoolId, classId } = req.query;

        if (req.user.school.toString() !== schoolId) {
            logger.warn('School ID mismatch', { userId: req.user.id, schoolId, userSchool: req.user.school });
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to view students for this school',
            });
        }

        if (!['admin', 'dean', 'headmaster', 'teacher'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to view students',
            });
        }

        await validateEntity(Enrollment, null, 'Enrollment', schoolId, { class: classId, isActive: true, isDeleted: false });

        const enrollments = await Enrollment.find({
            class: classId,
            school: schoolId,
            isActive: true,
            isDeleted: false,
        })
            .populate({
                path: 'student term',
                match: { role: 'student', isDeleted: false },
                select: 'fullName email registrationNumber phoneNumber profilePicture preferences parentFullName parentPhoneNumber name',
            })
            .lean();

        const students = enrollments
            .filter((enrollment) => enrollment.student)
            .map((enrollment) => ({
                _id: enrollment.student._id,
                fullName: enrollment.student.fullName,
                email: enrollment.student.email,
                registrationNumber: enrollment.student.registrationNumber,
                phoneNumber: enrollment.student.phoneNumber,
                profilePicture: enrollment.student.profilePicture,
                preferences: enrollment.student.preferences,
                parentFullName: enrollment.student.parentFullName,
                parentPhoneNumber: enrollment.student.parentPhoneNumber,
                promotionStatus: enrollment.promotionStatus,
                termId: enrollment.term._id,
                termName: enrollment.term.name,
                enrollmentId: enrollment._id,
            }));

        await logAudit(
            'student',
            null,
            'list-by-class',
            req.user.id,
            { classId, schoolId },
            { count: students.length }
        );

        req.io.to(`school:${schoolId}:admins`).emit('students-retrieved', {
            classId,
            count: students.length,
            retrievedAt: new Date(),
        });

        res.json({
            success: true,
            students,
            message: 'Students retrieved successfully',
        });
    } catch (error) {
        logger.error('getStudentsByClass error', { error: error.message, stack: error.stack, userId: req.user.id });
        res.status(500).json({ success: false, message: 'Server error occurred while retrieving students' });
    }
}

// Get a single student by ID
async function getStudentById(req, res) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation errors in getStudentById', { errors: errors.array(), userId: req.user.id });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { schoolId, studentId } = req.query;

        if (req.user.school.toString() !== schoolId) {
            logger.warn('School ID mismatch', { userId: req.user.id, schoolId, userSchool: req.user.school });
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to view this student',
            });
        }

        if (!['admin', 'dean', 'headmaster', 'teacher'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to view students',
            });
        }

        const student = await validateEntity(User, studentId, 'User', schoolId, { role: 'student', isDeleted: false });

        const enrollments = await Enrollment.find({
            student: studentId,
            school: schoolId,
            isActive: true,
            isDeleted: false,
        })
            .populate('class term')
            .lean();

        await logAudit(
            'student',
            studentId,
            'get-by-id',
            req.user.id,
            { studentId, schoolId },
            { fullName: student.fullName }
        );

        req.io.to(`school:${schoolId}:admins`).emit('student-retrieved', {
            studentId,
            fullName: student.fullName,
            retrievedAt: new Date(),
        });

        res.json({
            success: true,
            student: {
                _id: student._id,
                fullName: student.fullName,
                email: student.email,
                registrationNumber: student.registrationNumber,
                phoneNumber: student.phoneNumber,
                profilePicture: student.profilePicture,
                preferences: student.preferences,
                parentFullName: student.parentFullName,
                parentPhoneNumber: student.parentPhoneNumber,
                enrollments: enrollments.map((enrollment) => ({
                    classId: enrollment.class._id,
                    className: enrollment.class.name,
                    termId: enrollment.term._id,
                    termName: enrollment.term.name,
                    promotionStatus: enrollment.promotionStatus,
                    enrollmentId: enrollment._id,
                })),
            },
            message: 'Student retrieved successfully',
        });
    } catch (error) {
        logger.error('getStudentById error', { error: error.message, stack: error.stack, userId: req.user.id });
        res.status(500).json({ success: false, message: 'Server error occurred while retrieving student' });
    }
}

// Get all students in a specific term
async function getStudentsByTerm(req, res) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation errors in getStudentsByTerm', { errors: errors.array(), userId: req.user.id });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { schoolId, termId } = req.query;

        if (req.user.school.toString() !== schoolId) {
            logger.warn('School ID mismatch', { userId: req.user.id, schoolId, userSchool: req.user.school });
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to view students for this school',
            });
        }

        if (!['admin', 'dean', 'headmaster', 'teacher'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to view students',
            });
        }

        await validateEntity(Enrollment, null, 'Enrollment', schoolId, { term: termId, isActive: true, isDeleted: false });

        const enrollments = await Enrollment.find({
            term: termId,
            school: schoolId,
            isActive: true,
            isDeleted: false,
        })
            .populate({
                path: 'student class term',
                match: { role: 'student', isDeleted: false },
                select: 'fullName email registrationNumber phoneNumber profilePicture preferences parentFullName parentPhoneNumber name',
            })
            .lean();

        const students = enrollments
            .filter((enrollment) => enrollment.student)
            .map((enrollment) => ({
                _id: enrollment.student._id,
                fullName: enrollment.student.fullName,
                email: enrollment.student.email,
                registrationNumber: enrollment.student.registrationNumber,
                phoneNumber: enrollment.student.phoneNumber,
                profilePicture: enrollment.student.profilePicture,
                preferences: enrollment.student.preferences,
                parentFullName: enrollment.student.parentFullName,
                parentPhoneNumber: enrollment.student.parentPhoneNumber,
                classId: enrollment.class._id,
                className: enrollment.class.name,
                termId: enrollment.term._id,
                termName: enrollment.term.name,
                promotionStatus: enrollment.promotionStatus,
                enrollmentId: enrollment._id,
            }));

        await logAudit(
            'student',
            null,
            'list-by-term',
            req.user.id,
            { termId, schoolId },
            { count: students.length }
        );

        req.io.to(`school:${schoolId}:admins`).emit('students-retrieved', {
            termId,
            count: students.length,
            retrievedAt: new Date(),
        });

        res.json({
            success: true,
            students,
            message: 'Students retrieved successfully',
        });
    } catch (error) {
        logger.error('getStudentsByTerm error', { error: error.message, stack: error.stack, userId: req.user.id });
        res.status(500).json({ success: false, message: 'Server error occurred while retrieving students' });
    }
}

// Get students by promotion status
async function getStudentsByPromotionStatus(req, res) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation errors in getStudentsByPromotionStatus', { errors: errors.array(), userId: req.user.id });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { schoolId, classId, promotionStatus } = req.query;

        if (req.user.school.toString() !== schoolId) {
            logger.warn('School ID mismatch', { userId: req.user.id, schoolId, userSchool: req.user.school });
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to view students for this school',
            });
        }

        if (!['admin', 'dean', 'headmaster', 'teacher'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to view students',
            });
        }

        const query = {
            school: schoolId,
            promotionStatus,
            isActive: true,
            isDeleted: false,
        };
        if (classId) {
            query.class = classId;
            await validateEntity(Enrollment, null, 'Enrollment', schoolId, { class: classId, isActive: true, isDeleted: false });
        }

        const enrollments = await Enrollment.find(query)
            .populate({
                path: 'student class term',
                match: { role: 'student', isDeleted: false },
                select: 'fullName email registrationNumber phoneNumber profilePicture preferences parentFullName parentPhoneNumber name',
            })
            .lean();

        const students = enrollments
            .filter((enrollment) => enrollment.student)
            .map((enrollment) => ({
                _id: enrollment.student._id,
                fullName: enrollment.student.fullName,
                email: enrollment.student.email,
                registrationNumber: enrollment.student.registrationNumber,
                phoneNumber: enrollment.student.phoneNumber,
                profilePicture: enrollment.student.profilePicture,
                preferences: enrollment.student.preferences,
                parentFullName: enrollment.student.parentFullName,
                parentPhoneNumber: enrollment.student.parentPhoneNumber,
                classId: enrollment.class ? enrollment.class._id : null,
                className: enrollment.class ? enrollment.class.name : null,
                termId: enrollment.term._id,
                termName: enrollment.term.name,
                promotionStatus: enrollment.promotionStatus,
                enrollmentId: enrollment._id,
            }));

        await logAudit(
            'student',
            null,
            'list-by-promotion-status',
            req.user.id,
            { schoolId, classId, promotionStatus },
            { count: students.length }
        );

        req.io.to(`school:${schoolId}:admins`).emit('students-retrieved', {
            promotionStatus,
            classId: classId || null,
            count: students.length,
            retrievedAt: new Date(),
        });

        res.json({
            success: true,
            students,
            message: `Students with promotion status "${promotionStatus}" retrieved successfully`,
        });
    } catch (error) {
        logger.error('getStudentsByPromotionStatus error', { error: error.message, stack: error.stack, userId: req.user.id });
        res.status(500).json({ success: false, message: 'Server error occurred while retrieving students' });
    }
}

// Update a student's promotion status
async function updateStudentPromotionStatus(req, res) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation errors in updateStudentPromotionStatus', { errors: errors.array(), userId: req.user.id });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { schoolId, studentId, classId, termId, promotionStatus } = req.body;

        if (req.user.school.toString() !== schoolId) {
            logger.warn('School ID mismatch', { userId: req.user.id, schoolId, userSchool: req.user.school });
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to update student promotion status for this school',
            });
        }

        if (!['admin', 'dean', 'headmaster'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Only admins, deans, or headmasters can update promotion status',
            });
        }

        const enrollment = await validateEntity(Enrollment, null, 'Enrollment', schoolId, {
            student: studentId,
            class: classId,
            term: termId,
            isActive: true,
            isDeleted: false,
        });

        const previousStatus = enrollment.promotionStatus;
        enrollment.promotionStatus = sanitize(promotionStatus);
        await enrollment.save();

        const student = await User.findById(studentId).select('fullName').lean();

        await logAudit(
            'enrollment',
            enrollment._id,
            'update-promotion-status',
            req.user.id,
            { previous: { promotionStatus: previousStatus }, studentId, classId, termId, schoolId },
            { updated: { promotionStatus }, studentId, classId, termId, schoolId }
        );

        req.io.to(`school:${schoolId}:admins`).emit('student-promotion-updated', {
            studentId,
            fullName: student.fullName,
            classId,
            termId,
            promotionStatus,
            updatedAt: enrollment.updatedAt,
        });
        req.io.to(studentId.toString()).emit('promotion-status-updated', {
            studentId,
            promotionStatus,
            message: `Your promotion status has been updated to "${promotionStatus}"`,
        });

        res.json({
            success: true,
            student: {
                _id: studentId,
                fullName: student.fullName,
                promotionStatus,
                enrollmentId: enrollment._id,
            },
            message: 'Student promotion status updated successfully',
        });
    } catch (error) {
        logger.error('updateStudentPromotionStatus error', { error: error.message, stack: error.stack, userId: req.user.id });
        res.status(500).json({ success: false, message: 'Server error occurred while updating student promotion status' });
    }
}

module.exports = {
    getStudentsByClass,
    getStudentById,
    getStudentsByTerm,
    getStudentsByPromotionStatus,
    updateStudentPromotionStatus,
    validateGetStudentsByClass,
    validateGetStudentById,
    validateGetStudentsByTerm,
    validateGetStudentsByPromotionStatus,
    validateUpdateStudentPromotionStatus,
};