const { validationResult } = require('express-validator');
const winston = require('winston');
const User = require('../models/User');
const School = require('../models/school');
const { sendNotification } = require('../services/notificationService');

// Logger setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.File({ filename: 'headmaster.log' })]
});

// Validation rules
const headmasterValidation = [
    check('fullName').optional().notEmpty().withMessage('Full name is required').trim(),
    check('email').optional().isEmail().withMessage('Invalid email').normalizeEmail(),
    check('phoneNumber').optional().matches(/^\+?\d{10,15}$/).withMessage('Invalid phone number'),
    check('profilePicture').optional().matches(/^https?:\/\/.*\.(?:png|jpg|jpeg|svg|gif)$/i).withMessage('Invalid image URL'),
    check('preferences.notifications.email').optional().isBoolean().withMessage('Email notification preference must be a boolean'),
    check('preferences.notifications.sms').optional().isBoolean().withMessage('SMS notification preference must be a boolean'),
    check('preferences.theme').optional().isIn(['light', 'dark']).withMessage('Invalid theme')
];

// Get all headmasters
const getHeadmasters = async (req, res) => {
    try {
        const { schoolId } = req.query;
        const query = { role: 'headmaster', isDeleted: false };

        if (schoolId) {
            const school = await School.findById(schoolId);
            if (!school) {
                logger.warn('Invalid school ID in getHeadmasters', { schoolId, ip: req.ip });
                return res.status(400).json({ success: false, message: 'Invalid school ID' });
            }
            query.school = schoolId;
        }

        const headmasters = await User.find(query)
            .select('fullName email phoneNumber school profilePicture preferences')
            .populate('school', 'name category');
        logger.info('Headmasters fetched', { schoolId: schoolId || 'all', count: headmasters.length, ip: req.ip });
        res.json({ success: true, headmasters });
    } catch (error) {
        logger.error('Error in getHeadmasters', { error: error.message, stack: error.stack, ip: req.ip });
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Update headmaster
const updateHeadmaster = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation failed in updateHeadmaster', { errors: errors.array(), ip: req.ip });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const headmaster = await User.findOne({ _id: req.params.id, role: 'headmaster', isDeleted: false });
        if (!headmaster) {
            logger.warn('Headmaster not found or deleted', { headmasterId: req.params.id, ip: req.ip });
            return res.status(404).json({ success: false, message: 'Headmaster not found' });
        }

        const { fullName, email, phoneNumber, profilePicture, preferences } = req.body;

        if (email && email !== headmaster.email) {
            const existingUser = await User.findOne({ email, _id: { $ne: headmaster._id } });
            if (existingUser) {
                logger.warn('Email already in use', { email, headmasterId: headmaster._id, ip: req.ip });
                return res.status(400).json({ success: false, message: 'Email already in use' });
            }
        }

        headmaster.fullName = fullName || headmaster.fullName;
        headmaster.email = email || headmaster.email;
        headmaster.phoneNumber = phoneNumber || headmaster.phoneNumber;
        headmaster.profilePicture = profilePicture || headmaster.profilePicture;
        headmaster.preferences = preferences ? { ...headmaster.preferences, ...preferences } : headmaster.preferences;

        await headmaster.save();

        await sendNotification(
            headmaster,
            'Your profile has been successfully updated in the EMS system.',
            'EMS Headmaster Profile Update',
            req
        );
        logger.info('Headmaster updated', { headmasterId: headmaster._id, ip: req.ip });
        res.json({
            success: true,
            message: 'Headmaster updated successfully',
            headmaster: {
                id: headmaster._id,
                fullName: headmaster.fullName,
                email: headmaster.email,
                phoneNumber: headmaster.phoneNumber,
                school: headmaster.school,
                profilePicture: headmaster.profilePicture,
                preferences: headmaster.preferences
            }
        });
    } catch (error) {
        logger.error('Error in updateHeadmaster', { error: error.message, stack: error.stack, ip: req.ip });
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Soft delete headmaster
const deleteHeadmaster = async (req, res) => {
    try {
        const headmaster = await User.findOne({ _id: req.params.id, role: 'headmaster', isDeleted: false });
        if (!headmaster) {
            logger.warn('Headmaster not found or already deleted', { headmasterId: req.params.id, ip: req.ip });
            return res.status(404).json({ success: false, message: 'Headmaster not found' });
        }

        // Check if headmaster is assigned to a school
        if (headmaster.school) {
            const school = await School.findById(headmaster.school);
            if (school && school.headmaster.toString() === headmaster._id.toString()) {
                logger.warn('Headmaster is assigned to a school', { headmasterId: headmaster._id, schoolId: school._id, ip: req.ip });
                return res.status(400).json({ success: false, message: 'Cannot delete headmaster assigned to a school. Reassign the school first.' });
            }
        }

        headmaster.isDeleted = true;
        await headmaster.save();

        await sendNotification(
            headmaster,
            'Your account has been deactivated in the EMS system.',
            'EMS Headmaster Account Deactivation',
            req
        );
        logger.info('Headmaster soft deleted', { headmasterId: headmaster._id, ip: req.ip });
        res.json({ success: true, message: 'Headmaster deleted successfully' });
    } catch (error) {
        logger.error('Error in deleteHeadmaster', { error: error.message, stack: error.stack, ip: req.ip });
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    headmasterValidation,
    getHeadmasters,
    updateHeadmaster,
    deleteHeadmaster
};