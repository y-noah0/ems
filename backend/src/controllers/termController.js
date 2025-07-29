const Term = require('../models/term');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const winston = require('winston');
const mongoose = require('mongoose');

// Logger setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.File({ filename: 'term.log' })]
});

// Middleware-based role check (Dean and Admin full access, others restricted to their school)
const isDeanOrAdmin = (req) => req.user && ['dean', 'admin'].includes(req.user.role);
const isAuthorizedForSchool = (req, schoolId) => {
    if (isDeanOrAdmin(req)) return true;
    return req.user && req.user.school && req.user.school.toString() === schoolId;
};

// Create a new term
const createTerm = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation failed in createTerm', { errors: errors.array(), ip: req.ip });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { termNumber, academicYear, school, startDate, endDate } = req.body;

        // Validate schoolId
        if (!school || !mongoose.isValidObjectId(school)) {
            return res.status(400).json({ success: false, message: 'Valid schoolId is required' });
        }

        // Check if user is authorized for the school
        if (!isAuthorizedForSchool(req, school)) {
            return res.status(403).json({ success: false, message: 'Access denied for this school' });
        }

        // Check if the term with same termNumber, academicYear and school exists
        const existingTerm = await Term.findOne({ termNumber, academicYear, school, isDeleted: false });
        if (existingTerm) {
            return res.status(400).json({ success: false, message: 'Term already exists for this school and academic year' });
        }

        const term = new Term({ termNumber, academicYear, school, startDate, endDate });
        await term.save();

        logger.info('Term created', { termId: term._id, school });
        res.status(201).json({ success: true, term });
    } catch (error) {
        logger.error('Error in createTerm', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Get all terms (filtered by schoolId in body)
const getTerms = async (req, res) => {
    try {
        const { schoolId } = req.body;

        // Validate schoolId
        if (!schoolId || !mongoose.isValidObjectId(schoolId)) {
            return res.status(400).json({ success: false, message: 'Valid schoolId is required in request body' });
        }

        // Check if user is authorized for the school
        if (!isAuthorizedForSchool(req, schoolId)) {
            return res.status(403).json({ success: false, message: 'Access denied for this school' });
        }

        const terms = await Term.find({ school: schoolId, isDeleted: false }).populate('school', 'name');
        res.json({ success: true, terms });
    } catch (error) {
        logger.error('Error in getTerms', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Get a single term by id (filtered by schoolId in body)
const getTermById = async (req, res) => {
    try {
        const { schoolId } = req.body;

        // Validate schoolId
        if (!schoolId || !mongoose.isValidObjectId(schoolId)) {
            return res.status(400).json({ success: false, message: 'Valid schoolId is required in request body' });
        }

        // Check if user is authorized for the school
        if (!isAuthorizedForSchool(req, schoolId)) {
            return res.status(403).json({ success: false, message: 'Access denied for this school' });
        }

        const term = await Term.findOne({ _id: req.params.id, school: schoolId, isDeleted: false }).populate('school', 'name');
        if (!term) {
            return res.status(404).json({ success: false, message: 'Term not found in this school' });
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

        const { termNumber, academicYear, school, startDate, endDate } = req.body;

        // Validate schoolId
        if (!school || !mongoose.isValidObjectId(school)) {
            return res.status(400).json({ success: false, message: 'Valid schoolId is required' });
        }

        // Check if user is authorized for the school
        if (!isAuthorizedForSchool(req, school)) {
            return res.status(403).json({ success: false, message: 'Access denied for this school' });
        }

        const term = await Term.findOne({ _id: req.params.id, school, isDeleted: false });
        if (!term) {
            return res.status(404).json({ success: false, message: 'Term not found in this school' });
        }

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

        logger.info('Term updated', { termId: term._id, school });
        res.json({ success: true, term });
    } catch (error) {
        logger.error('Error in updateTerm', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Soft delete term by id
const deleteTerm = async (req, res) => {
    try {
        const { schoolId } = req.body;

        // Validate schoolId
        if (!schoolId || !mongoose.isValidObjectId(schoolId)) {
            return res.status(400).json({ success: false, message: 'Valid schoolId is required in request body' });
        }

        // Check if user is authorized for the school
        if (!isAuthorizedForSchool(req, schoolId)) {
            return res.status(403).json({ success: false, message: 'Access denied for this school' });
        }

        const term = await Term.findOne({ _id: req.params.id, school: schoolId, isDeleted: false });
        if (!term) {
            return res.status(404).json({ success: false, message: 'Term not found in this school' });
        }

        term.isDeleted = true;
        await term.save();

        logger.info('Term soft deleted', { termId: term._id, school: schoolId });
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