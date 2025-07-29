const School = require('../models/school');
const User = require('../models/User');
const { validationResult, check } = require('express-validator');
const winston = require('winston');
const fs = require('fs');
const path = require('path');
const { validateEntity, validateEntities } = require('../utils/entityValidator');
const { toUTC } = require('../utils/dateUtils');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.File({ filename: 'school.log' })]
});

// Validation rules
const schoolValidation = [
    check('name').notEmpty().withMessage('School name is required'),
    check('address').notEmpty().withMessage('Address is required'),
    check('contactEmail').isEmail().withMessage('Invalid email'),
    check('contactPhone').matches(/^\+?\d{10,15}$/).withMessage('Invalid phone number'),
    check('headmaster').isMongoId().withMessage('Invalid headmaster ID')
];

// Create school
const createSchool = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation failed on createSchool', { errors: errors.array(), ip: req.ip });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { name, address, contactEmail, contactPhone, headmaster, tradesOffered } = req.body;
        const logo = req.file ? req.file.path : null;

        const existing = await School.findOne({ name });
        if (existing) {
            logger.warn('School already exists', { name });
            return res.status(400).json({ success: false, message: 'School already exists' });
        }

        // Validate headmaster
        const user = await User.findById(headmaster);
        if (!user || user.role !== 'headmaster') {
            logger.warn('Invalid headmaster provided', { headmaster });
            return res.status(400).json({ success: false, message: 'Invalid headmaster ID or role' });
        }

        const school = new School({
            name,
            address,
            contactEmail,
            contactPhone,
            headmaster,
            tradesOffered,
            logo
        });

        await school.save();

        // Update headmaster's school field
        user.school = school._id;
        await user.save();
        logger.info('Headmaster school updated', { headmasterId: headmaster, schoolId: school._id });

        logger.info('School created', { schoolId: school._id });
        res.status(201).json({ success: true, message: 'School created successfully', school });
    } catch (error) {
        logger.error('Error in createSchool', { error: error.message });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Get all schools
const getSchools = async (req, res) => {
    try {
        const schools = await School.find({ isDeleted: false }).populate('headmaster', 'fullName email');
        res.json({ success: true, schools });
    } catch (error) {
        logger.error('Error in getSchools', { error: error.message });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Get school by ID
const getSchoolById = async (req, res) => {
    try {
        const school = await School.findById(req.params.id).populate('headmaster', 'fullName email');
        if (!school || school.isDeleted) {
            logger.warn('School not found', { id: req.params.id });
            return res.status(404).json({ success: false, message: 'School not found' });
        }
        res.json({ success: true, school });
    } catch (error) {
        logger.error('Error in getSchoolById', { error: error.message });
        res.status(500).json({ success: false, message: 'Server Error' });
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

        const { name, address, contactEmail, contactPhone, headmaster, tradesOffered } = req.body;
        let school;
        try {
            school = await validateEntity(School, req.params.id, 'School');
        } catch (validationError) {
            logger.warn(`School validation failed: ${validationError.message}`, { id: req.params.id });
            return res.status(validationError.statusCode || 400).json({ 
                success: false, 
                message: validationError.message 
            });
        }

        if (req.file && school.logo) {
            fs.unlink(path.join(__dirname, '..', school.logo), (err) => {
                if (err) logger.warn('Failed to delete old logo', { error: err.message });
            });
        }

        // If updating headmaster, update the new headmaster's school field
        if (headmaster && headmaster !== school.headmaster?.toString()) {
            const newHeadmaster = await User.findById(headmaster);
            if (!newHeadmaster || newHeadmaster.role !== 'headmaster') {
                logger.warn('Invalid headmaster provided for update', { headmaster });
                return res.status(400).json({ success: false, message: 'Invalid headmaster ID or role' });
            }
            newHeadmaster.school = school._id;
            await newHeadmaster.save();

            // If there was a previous headmaster, clear their school field
            if (school.headmaster) {
                const oldHeadmaster = await User.findById(school.headmaster);
                if (oldHeadmaster) {
                    oldHeadmaster.school = null;
                    await oldHeadmaster.save();
                }
            }
        }

        school.name = name;
        school.address = address;
        school.contactEmail = contactEmail;
        school.contactPhone = contactPhone;
        school.headmaster = headmaster;
        school.tradesOffered = tradesOffered;
        if (req.file) school.logo = req.file.path;

        await school.save();
        logger.info('School updated', { schoolId: school._id });
        res.json({ success: true, message: 'School updated successfully', school });
    } catch (error) {
        logger.error('Error in updateSchool', { error: error.message });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Soft delete school
const deleteSchool = async (req, res) => {
    try {
        const school = await School.findById(req.params.id);
        if (!school || school.isDeleted) {
            logger.warn('School not found for delete', { id: req.params.id });
            return res.status(404).json({ success: false, message: 'School not found' });
        }

        // Clear the school field for the associated headmaster
        const headmaster = await User.findById(school.headmaster);
        if (headmaster) {
            headmaster.school = null;
            await headmaster.save();
        }

        school.isDeleted = true;
        await school.save();
        logger.info('School deleted (soft)', { schoolId: school._id });
        res.json({ success: true, message: 'School deleted successfully' });
    } catch (error) {
        logger.error('Error in deleteSchool', { error: error.message });
        res.status(500).json({ success: false, message: 'Server Error' });
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