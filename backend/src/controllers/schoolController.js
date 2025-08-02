const School = require('../models/school');
const User = require('../models/User');
const { validationResult, check } = require('express-validator');
const winston = require('winston');
const fs = require('fs');
const path = require('path');
const { validateEntity, validateEntities } = require('../utils/entityValidator');
const { toUTC } = require('../utils/dateUtils');

// Logger setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.File({ filename: 'school.log' })]
});

// Validation rules
const schoolValidation = [
    check('name').notEmpty().withMessage('School name is required').trim(),
    check('address').notEmpty().withMessage('Address is required').trim(),
    check('contactEmail').isEmail().withMessage('Invalid email').normalizeEmail(),
    check('contactPhone').matches(/^\+?\d{10,15}$/).withMessage('Invalid phone number'),
    check('headmaster').isMongoId().withMessage('Invalid headmaster ID'),
    check('category').isIn(['REB', 'TVET', 'PRIMARY', 'OLEVEL', "CAMBRIDGE", 'UNIVERSITY']).withMessage('Category must be REB, TVET, or PRIMARY'),
    check('tradesOffered').optional().isArray().withMessage('Trades offered must be an array'),
    check('logo').optional().matches(/^https?:\/\/.*\.(?:png|jpg|jpeg|svg|gif)$/i).withMessage('Invalid image URL')
];

// Create school
const createSchool = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation failed on createSchool', { errors: errors.array(), ip: req.ip });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { name, address, contactEmail, code, contactPhone, headmaster, tradesOffered, category } = req.body;
        const logo = req.file ? req.file.path : req.body.logo || null;

        const existing = await School.findOne({ name, category });
        if (existing) {
            logger.warn('School with this name and category already exists', { name, category, ip: req.ip });
            return res.status(400).json({ success: false, message: 'School with this name and category already exists' });
        }

        // Validate headmaster
        const user = await User.findById(headmaster);
        if (!user || user.role !== 'headmaster') {
            logger.warn('Invalid headmaster provided', { headmaster, ip: req.ip });
            return res.status(400).json({ success: false, message: 'Invalid headmaster ID or role' });
        }

        const school = new School({
            name,
            address,
            code,
            contactEmail,
            contactPhone,
            headmaster,
            tradesOffered: tradesOffered || [],
            category,
            logo
        });

        await school.save();

        // Update headmaster's school field
        user.school = school._id;
        await user.save();
        logger.info('Headmaster school updated', { headmasterId: headmaster, schoolId: school._id, ip: req.ip });

        logger.info('School created', { schoolId: school._id, name, category, ip: req.ip });
        res.status(201).json({ success: true, message: 'School created successfully', school });
    } catch (error) {
        logger.error('Error in createSchool', { error: error.message, stack: error.stack, ip: req.ip });
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get all schools
const getSchools = async (req, res) => {
    try {
        const { category } = req.query;
        const query = { isDeleted: false };

        if (category) {
            if (!['REB', 'TVET', 'PRIMARY'].includes(category)) {
                logger.warn('Invalid category in getSchools', { category, ip: req.ip });
                return res.status(400).json({ success: false, message: 'Invalid category' });
            }
            query.category = category;
        }

        const schools = await School.find(query)
            .populate('headmaster', 'fullName email')
            .populate('tradesOffered', 'code name category');
        logger.info('Schools fetched', { category: category || 'all', count: schools.length, ip: req.ip });
        res.json({ success: true, schools });
    } catch (error) {
        logger.error('Error in getSchools', { error: error.message, stack: error.stack, ip: req.ip });
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get school by ID
const getSchoolById = async (req, res) => {
    try {
        const school = await School.findById(req.params.id)
            .populate('headmaster', 'fullName email')
            .populate('tradesOffered', 'code name category');
        if (!school || school.isDeleted) {
            logger.warn('School not found or deleted', { schoolId: req.params.id, ip: req.ip });
            return res.status(404).json({ success: false, message: 'School not found' });
        }
        logger.info('School fetched by ID', { schoolId: school._id, ip: req.ip });
        res.json({ success: true, school });
    } catch (error) {
        logger.error('Error in getSchoolById', { error: error.message, stack: error.stack, ip: req.ip });
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Update school
const updateSchool = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation failed on updateSchool', { errors: errors.array(), ip: req.ip });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { name, address, contactEmail, contactPhone, headmaster, tradesOffered, category } = req.body;
        let school;
        try {
            school = await validateEntity(School, req.params.id, 'School');
        } catch (validationError) {
            logger.warn(`School validation failed: ${validationError.message}`, { id: req.params.id, ip: req.ip });
            return res.status(validationError.statusCode || 400).json({
                success: false,
                message: validationError.message
            });
        }

        if (req.file && school.logo && !school.logo.startsWith('http')) {
            fs.unlink(path.join(__dirname, '..', school.logo), (err) => {
                if (err) logger.warn('Failed to delete old logo', { error: err.message, ip: req.ip });
            });
        }

        // If updating headmaster, update the new headmaster's school field

        if (headmaster && headmaster !== school.headmaster?.toString()) {
            const newHeadmaster = await User.findById(headmaster);
            if (!newHeadmaster || newHeadmaster.role !== 'headmaster') {
                logger.warn('Invalid headmaster provided for update', { headmaster, ip: req.ip });
                return res.status(400).json({ success: false, message: 'Invalid headmaster ID or role' });
            }
            // Assign school and ensure preference flags are booleans
            newHeadmaster.school = school._id;
            newHeadmaster.preferences.notifications.email = !!newHeadmaster.email;
            newHeadmaster.preferences.notifications.sms = !!newHeadmaster.phoneNumber;
            await newHeadmaster.save();

            // Clear the school field for the previous headmaster
            if (school.headmaster) {
                const oldHeadmaster = await User.findById(school.headmaster);
                if (oldHeadmaster) {
                    oldHeadmaster.school = null;
                    await oldHeadmaster.save();
                }
            }
        }

        const duplicate = await School.findOne({ name, category, _id: { $ne: school._id } });
        if (duplicate) {
            logger.warn('Another school with this name and category exists', { name, category, schoolId: school._id, ip: req.ip });
            return res.status(400).json({ success: false, message: 'Another school with this name and category exists' });
        }

        school.name = name;
        school.address = address;
        school.contactEmail = contactEmail;
        school.contactPhone = contactPhone;
        school.headmaster = headmaster;
        school.tradesOffered = tradesOffered || [];
        school.category = category;
        school.logo = req.file ? req.file.path : req.body.logo || school.logo;

        await school.save();
        logger.info('School updated', { schoolId: school._id, name, category, ip: req.ip });
        res.json({ success: true, message: 'School updated successfully', school });
    } catch (error) {
        logger.error('Error in updateSchool', { error: error.message, stack: error.stack, ip: req.ip });
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Soft delete school
const deleteSchool = async (req, res) => {
    try {
        const school = await School.findById(req.params.id);
        if (!school || school.isDeleted) {
            logger.warn('School not found or already deleted', { schoolId: req.params.id, ip: req.ip });
            return res.status(404).json({ success: false, message: 'School not found' });
        }

        // Clear the school field for the associated headmaster
        const headmaster = await User.findById(school.headmaster);
        if (headmaster) {
            headmaster.school = null;
            await headmaster.save();
            logger.info('Headmaster school field cleared', { headmasterId: headmaster._id, schoolId: school._id, ip: req.ip });
        }

        school.isDeleted = true;
        await school.save();
        logger.info('School deleted (soft)', { schoolId: school._id, ip: req.ip });
        res.json({ success: true, message: 'School deleted successfully' });
    } catch (error) {
        logger.error('Error in deleteSchool', { error: error.message, stack: error.stack, ip: req.ip });
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    schoolValidation,
    createSchool,
    getSchools,
    getSchoolById,
    updateSchool,
    deleteSchool
};