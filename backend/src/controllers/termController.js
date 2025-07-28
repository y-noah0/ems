const Term = require('../models/term');
const { validationResult } = require('express-validator');
const winston = require('winston');

// Logger setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.File({ filename: 'term.log' })]
});

// Create a new term
const createTerm = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation failed in createTerm', { errors: errors.array(), ip: req.ip });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { termNumber, academicYear, school, startDate, endDate } = req.body;

        // Check if the term with same termNumber, academicYear and school exists (unique index might do this but better to check)
        const existingTerm = await Term.findOne({ termNumber, academicYear, school, isDeleted: false });
        if (existingTerm) {
            return res.status(400).json({ success: false, message: 'Term already exists for this school and academic year' });
        }

        const term = new Term({ termNumber, academicYear, school, startDate, endDate });
        await term.save();

        logger.info('Term created', { termId: term._id });
        res.status(201).json({ success: true, term });
    } catch (error) {
        logger.error('Error in createTerm', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Get all terms (only not deleted)
const getTerms = async (req, res) => {
    try {
        const terms = await Term.find({ isDeleted: false }).populate('school', 'name');
        res.json({ success: true, terms });
    } catch (error) {
        logger.error('Error in getTerms', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Get a single term by id
const getTermById = async (req, res) => {
    try {
        const term = await Term.findById(req.params.id).populate('school', 'name');
        if (!term || term.isDeleted) {
            return res.status(404).json({ success: false, message: 'Term not found' });
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

        const term = await Term.findById(req.params.id);
        if (!term || term.isDeleted) {
            return res.status(404).json({ success: false, message: 'Term not found' });
        }

        const { termNumber, academicYear, school, startDate, endDate } = req.body;

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

        logger.info('Term updated', { termId: term._id });
        res.json({ success: true, term });
    } catch (error) {
        logger.error('Error in updateTerm', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Soft delete term by id
const deleteTerm = async (req, res) => {
    try {
        const term = await Term.findById(req.params.id);
        if (!term || term.isDeleted) {
            return res.status(404).json({ success: false, message: 'Term not found' });
        }

        term.isDeleted = true;
        await term.save();

        logger.info('Term soft deleted', { termId: term._id });
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
