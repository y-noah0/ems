const School = require('../models/School');
const { validationResult, check } = require('express-validator');
const winston = require('winston');
const fs = require('fs');
const path = require('path');

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
        logger.info('School created', { schoolId: school.id });
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
        const school = await School.findById(req.params.id);

        if (!school || school.isDeleted) {
            logger.warn('School not found for update', { id: req.params.id });
            return res.status(404).json({ success: false, message: 'School not found' });
        }

        if (req.file && school.logo) {
            fs.unlink(path.join(__dirname, '..', school.logo), (err) => {
                if (err) logger.warn('Failed to delete old logo', { error: err.message });
            });
        }

        school.name = name;
        school.address = address;
        school.contactEmail = contactEmail;
        school.contactPhone = contactPhone;
        school.headmaster = headmaster;
        school.tradesOffered = tradesOffered;
        if (req.file) school.logo = req.file.path;

        await school.save();
        logger.info('School updated', { schoolId: school.id });
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
        school.isDeleted = true;
        await school.save();
        logger.info('School deleted (soft)', { schoolId: school.id });
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
