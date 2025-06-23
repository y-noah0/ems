// tradeController.js
const Trade = require('../models/trade');
const { validationResult } = require('express-validator');
const winston = require('winston');

// Logger setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.File({ filename: 'trade.log' })]
});

// Create Trade
const createTrade = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation failed in createTrade', { errors: errors.array(), ip: req.ip });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { code, name, description } = req.body;

        const existing = await Trade.findOne({ code });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Trade with this code already exists' });
        }

        const trade = new Trade({ code, name, description });
        await trade.save();

        logger.info('Trade created', { tradeId: trade._id });
        res.status(201).json({ success: true, trade });
    } catch (error) {
        logger.error('Error in createTrade', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Get all trades
const getTrades = async (req, res) => {
    try {
        const trades = await Trade.find({ isDeleted: false });
        res.json({ success: true, trades });
    } catch (error) {
        logger.error('Error in getTrades', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Get trade by ID
const getTradeById = async (req, res) => {
    try {
        const trade = await Trade.findById(req.params.id);
        if (!trade || trade.isDeleted) {
            return res.status(404).json({ success: false, message: 'Trade not found' });
        }
        res.json({ success: true, trade });
    } catch (error) {
        logger.error('Error in getTradeById', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Update trade by ID
const updateTrade = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Validation failed in updateTrade', { errors: errors.array(), ip: req.ip });
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { code, name, description } = req.body;
        const trade = await Trade.findById(req.params.id);

        if (!trade || trade.isDeleted) {
            return res.status(404).json({ success: false, message: 'Trade not found' });
        }

        const duplicate = await Trade.findOne({ code, _id: { $ne: trade._id } });
        if (duplicate) {
            return res.status(400).json({ success: false, message: 'Another trade with this code exists' });
        }

        trade.code = code;
        trade.name = name;
        trade.description = description;
        await trade.save();

        logger.info('Trade updated', { tradeId: trade._id });
        res.json({ success: true, trade });
    } catch (error) {
        logger.error('Error in updateTrade', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Soft delete trade
const deleteTrade = async (req, res) => {
    try {
        const trade = await Trade.findById(req.params.id);
        if (!trade || trade.isDeleted) {
            return res.status(404).json({ success: false, message: 'Trade not found' });
        }

        trade.isDeleted = true;
        await trade.save();

        logger.info('Trade soft deleted', { tradeId: trade._id });
        res.json({ success: true, message: 'Trade deleted' });
    } catch (error) {
        logger.error('Error in deleteTrade', { error: error.message, ip: req.ip });
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = {
    createTrade,
    getTrades,
    getTradeById,
    updateTrade,
    deleteTrade
};
