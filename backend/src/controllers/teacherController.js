const User = require('../models/User');
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
const validateListTeachers = [
    check('schoolId').isMongoId().withMessage('Valid school ID is required'),
];

const validateUpdateTeacher = [
    check('schoolId').isMongoId().withMessage('Valid school ID is required'),
    check('teacherId').isMongoId().withMessage('Valid teacher ID is required'),
    check('fullName').optional().isString().trim().notEmpty().withMessage('Full name must be a non-empty string'),
    check('email')
        .optional()
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    check('phoneNumber')
        .optional()
        .matches(/^\+?\d{10,15}$/)
        .withMessage('Please provide a valid phone number'),
    check('profilePicture')
        .optional()
        .matches(/^https?:\/\/.*\.(?:png|jpg|jpeg|svg|gif)$/i)
        .withMessage('Please provide a valid image URL'),
    check('preferences.notifications.email')
        .optional()
        .isBoolean()
        .withMessage('Email notification preference must be a boolean'),
    check('preferences.notifications.sms')
        .optional()
        .isBoolean()
        .withMessage('SMS notification preference must be a boolean'),
    check('preferences.theme')
        .optional()
        .isIn(['light', 'dark'])
        .withMessage('Theme must be either "light" or "dark"'),
];

const validateDeleteTeacher = [
    check('schoolId').isMongoId().withMessage('Valid school ID is required'),
    check('teacherId').isMongoId().withMessage('Valid teacher ID is required'),
];

const validateToggleTeacherStatus = [
    check('schoolId').isMongoId().withMessage('Valid school ID is required'),
    check('teacherId').isMongoId().withMessage('Valid teacher ID is required'),
    check('isActive').isBoolean().withMessage('isActive must be a boolean'),
];

// List all teachers for the user's school
async function listTeachers(req, res) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation errors in listTeachers', { errors: errors.array(), userId: req.para.id });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { schoolId } = req.body;

        if (req.user.school.toString() !== schoolId) {
            logger.warn('School ID mismatch', { userId: req.params.id, schoolId, userSchool: req.user.school });
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to view teachers for this school',
            });
        }

        if (!['admin', 'dean', 'headmaster'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to view teachers',
            });
        }

        const teachers = await User.find({
            role: 'teacher',
            school: schoolId,
            isDeleted: false,
        })
            .select('fullName email phoneNumber profilePicture preferences lastLogin')
            .lean();

        res.json({
            success: true,
            teachers,
            message: 'Teachers retrieved successfully',
        });
    } catch (error) {
        logger.error('listTeachers error', { error: error.message, stack: error.stack, userId: req.params.id });
        res.status(500).json({ success: false, message: 'Server error occurred while retrieving teachers' });
    }
}

// Update a teacher's details
async function updateTeacher(req, res) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation errors in updateTeacher', { errors: errors.array(), userId: req.para.id });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { schoolId, teacherId, fullName, email, phoneNumber, profilePicture, preferences } = req.body;

        if (req.user.school.toString() !== schoolId) {
            logger.warn('School ID mismatch', { userId: req.para.id, schoolId, userSchool: req.user.school });
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to update teachers for this school',
            });
        }

        if (!['admin', 'dean', 'headmaster'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to update teachers',
            });
        }

        const teacher = await validateEntity(User, teacherId, 'User', schoolId, { role: 'teacher', isDeleted: false });
        const previousData = JSON.parse(JSON.stringify(teacher));

        // Update fields if provided
        if (fullName) teacher.fullName = sanitize(fullName);
        if (email) {
            // Check for email uniqueness within school
            const existingUser = await User.findOne({ email, school: schoolId, _id: { $ne: teacherId }, isDeleted: false });
            if (existingUser) {
                return res.status(400).json({ success: false, message: 'Email already in use by another user in this school' });
            }
            teacher.email = email.toLowerCase();
        }
        if (phoneNumber) teacher.phoneNumber = sanitize(phoneNumber);
        if (profilePicture) teacher.profilePicture = sanitize(profilePicture);
        if (preferences) {
            if (preferences.notifications) {
                if (typeof preferences.notifications.email === 'boolean') {
                    teacher.preferences.notifications.email = preferences.notifications.email;
                }
                if (typeof preferences.notifications.sms === 'boolean') {
                    teacher.preferences.notifications.sms = preferences.notifications.sms;
                }
            }
            if (preferences.theme) {
                teacher.preferences.theme = preferences.theme;
            }
        }

        await teacher.save();

        await logAudit(
            'user',
            teacher._id,
            'update',
            req.para.id,
            { previous: previousData },
            { updated: { fullName, email, phoneNumber, profilePicture, preferences }, school: schoolId }
        );

        req.io.to(`school:${schoolId}:admins`).emit('teacher-updated', {
            teacherId: teacher._id,
            fullName: teacher.fullName,
            updatedAt: teacher.updatedAt,
        });
        req.io.to(teacher._id.toString()).emit('profile-updated', {
            teacherId: teacher._id,
            fullName: teacher.fullName,
            updatedAt: teacher.updatedAt,
        });

        res.json({
            success: true,
            teacher: {
                _id: teacher._id,
                fullName: teacher.fullName,
                email: teacher.email,
                phoneNumber: teacher.phoneNumber,
                profilePicture: teacher.profilePicture,
                preferences: teacher.preferences,
            },
            message: 'Teacher updated successfully',
        });
    } catch (error) {
        logger.error('updateTeacher error', { error: error.message, stack: error.stack, userId: req.para.id });
        res.status(500).json({ success: false, message: 'Server error occurred while updating teacher' });
    }
}

// Delete (soft delete) a teacher
async function deleteTeacher(req, res) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation errors in deleteTeacher', { errors: errors.array(), userId: req.para.id });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { schoolId, teacherId } = req.body;

        if (req.user.school.toString() !== schoolId) {
            logger.warn('School ID mismatch', { userId: req.para.id, schoolId, userSchool: req.user.school });
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to delete teachers for this school',
            });
        }

        if (!['admin', 'headmaster'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Only admins or headmasters can delete teachers',
            });
        }

        const teacher = await validateEntity(User, teacherId, 'User', schoolId, { role: 'teacher', isDeleted: false });

        teacher.isDeleted = true;
        await teacher.save();

        await logAudit(
            'user',
            teacher._id,
            'delete',
            req.para.id,
            { isDeleted: false },
            { isDeleted: true, school: schoolId }
        );

        req.io.to(`school:${schoolId}:admins`).emit('teacher-deleted', {
            teacherId: teacher._id,
            fullName: teacher.fullName,
            deletedAt: teacher.updatedAt,
        });
        req.io.to(teacher._id.toString()).emit('account-deleted', {
            teacherId: teacher._id,
            message: 'Your account has been deactivated',
        });

        res.json({
            success: true,
            message: 'Teacher deactivated successfully',
        });
    } catch (error) {
        logger.error('deleteTeacher error', { error: error.message, stack: error.stack, userId: req.para.id });
        res.status(500).json({ success: false, message: 'Server error occurred while deactivating teacher' });
    }
}

// Restore a deleted teacher
async function restoreTeacher(req, res) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation errors in restoreTeacher', { errors: errors.array(), userId: req.para.id });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { schoolId, teacherId } = req.body;

        if (req.user.school.toString() !== schoolId) {
            logger.warn('School ID mismatch', { userId: req.para.id, schoolId, userSchool: req.user.school });
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to restore teachers for this school',
            });
        }

        if (!['admin', 'headmaster'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Only admins or headmasters can restore teachers',
            });
        }

        const teacher = await validateEntity(User, teacherId, 'User', schoolId, { role: 'teacher', isDeleted: true });

        teacher.isDeleted = false;
        await teacher.save();

        await logAudit(
            'user',
            teacher._id,
            'restore',
            req.para.id,
            { isDeleted: true },
            { isDeleted: false, school: schoolId }
        );

        req.io.to(`school:${schoolId}:admins`).emit('teacher-restored', {
            teacherId: teacher._id,
            fullName: teacher.fullName,
            restoredAt: teacher.updatedAt,
        });
        req.io.to(teacher._id.toString()).emit('account-restored', {
            teacherId: teacher._id,
            message: 'Your account has been reactivated',
        });

        res.json({
            success: true,
            message: 'Teacher reactivated successfully',
        });
    } catch (error) {
        logger.error('restoreTeacher error', { error: error.message, stack: error.stack, userId: req.para.id });
        res.status(500).json({ success: false, message: 'Server error occurred while reactivating teacher' });
    }
}

// Toggle teacher status (activate/deactivate)
async function toggleTeacherStatus(req, res) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation errors in toggleTeacherStatus', { errors: errors.array(), userId: req.para.id });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { schoolId, teacherId, isActive } = req.body;

        if (req.user.school.toString() !== schoolId) {
            logger.warn('School ID mismatch', { userId: req.para.id, schoolId, userSchool: req.user.school });
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to modify teacher status for this school',
            });
        }

        if (!['admin', 'headmaster'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Only admins or headmasters can modify teacher status',
            });
        }

        const teacher = await validateEntity(User, teacherId, 'User', schoolId, { role: 'teacher' });

        const previousStatus = teacher.isDeleted;
        teacher.isDeleted = !isActive; // isActive: true -> isDeleted: false, isActive: false -> isDeleted: true
        await teacher.save();

        await logAudit(
            'user',
            teacher._id,
            'toggle-status',
            req.para.id,
            { isDeleted: previousStatus },
            { isDeleted: teacher.isDeleted, school: schoolId }
        );

        const event = isActive ? 'teacher-activated' : 'teacher-deactivated';
        const message = isActive ? 'Teacher activated successfully' : 'Teacher deactivated successfully';
        req.io.to(`school:${schoolId}:admins`).emit(event, {
            teacherId: teacher._id,
            fullName: teacher.fullName,
            updatedAt: teacher.updatedAt,
            isActive,
        });
        req.io.to(teacher._id.toString()).emit(`account-${isActive ? 'restored' : 'deleted'}`, {
            teacherId: teacher._id,
            message: `Your account has been ${isActive ? 'reactivated' : 'deactivated'}`,
        });

        res.json({
            success: true,
            message,
        });
    } catch (error) {
        logger.error('toggleTeacherStatus error', { error: error.message, stack: error.stack, userId: req.para.id });
        res.status(500).json({ success: false, message: 'Server error occurred while modifying teacher status' });
    }
}

module.exports = {
    listTeachers,
    updateTeacher,
    deleteTeacher,
    restoreTeacher,
    toggleTeacherStatus,
    validateListTeachers,
    validateUpdateTeacher,
    validateDeleteTeacher,
    validateToggleTeacherStatus
};