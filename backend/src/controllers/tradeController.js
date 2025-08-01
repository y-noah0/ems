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

        const { code, name, description, category } = req.body;

        const existing = await Trade.findOne({ code, category });
        if (existing) {
            logger.warn('Trade with this code and category already exists', { code, category, ip: req.ip });
            return res.status(400).json({ success: false, message: 'Trade with this code and category already exists' });
        }

        const trade = new Trade({ code, name, description, category });
        await trade.save();

        logger.info('Trade created', { tradeId: trade._id, code, category, ip: req.ip });
        res.status(201).json({ success: true, trade });
    } catch (error) {
        logger.error('Error in createTrade', { error: error.message, stack: error.stack, ip: req.ip });
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get all trades
const getTrades = async (req, res) => {
    try {
        const { category } = req.query;
        const query = { isDeleted: false };

        if (category) {
            if (!['REB', 'TVET', 'PRIMARY'].includes(category)) {
                logger.warn('Invalid category in getTrades', { category, ip: req.ip });
                return res.status(400).json({ success: false, message: 'Invalid category' });
            }
            query.category = category;
        }

        const trades = await Trade.find(query);
        logger.info('Trades fetched', { category: category || 'all', count: trades.length, ip: req.ip });
        res.json({ success: true, trades });
    } catch (error) {
        logger.error('Error in getTrades', { error: error.message, stack: error.stack, ip: req.ip });
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get trade by ID
const getTradeById = async (req, res) => {
    try {
        const trade = await Trade.findById(req.params.id);
        if (!trade || trade.isDeleted) {
            logger.warn('Trade not found or deleted', { tradeId: req.params.id, ip: req.ip });
            return res.status(404).json({ success: false, message: 'Trade not found' });
        }
        logger.info('Trade fetched by ID', { tradeId: trade._id, ip: req.ip });
        res.json({ success: true, trade });
    } catch (error) {
        logger.error('Error in getTradeById', { error: error.message, stack: error.stack, ip: req.ip });
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
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

        const { code, name, description, category } = req.body;
        const trade = await Trade.findById(req.params.id);

        if (!trade || trade.isDeleted) {
            logger.warn('Trade not found or deleted', { tradeId: req.params.id, ip: req.ip });
            return res.status(404).json({ success: false, message: 'Trade not found' });
        }

        const duplicate = await Trade.findOne({ code, category, _id: { $ne: trade._id } });
        if (duplicate) {
            logger.warn('Another trade with this code and category exists', { code, category, tradeId: trade._id, ip: req.ip });
            return res.status(400).json({ success: false, message: 'Another trade with this code and category exists' });
        }

        trade.code = code;
        trade.name = name;
        trade.description = description;
        trade.category = category;
        await trade.save();

        logger.info('Trade updated', { tradeId: trade._id, code, category, ip: req.ip });
        res.json({ success: true, trade });
    } catch (error) {
        logger.error('Error in updateTrade', { error: error.message, stack: error.stack, ip: req.ip });
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Soft delete trade
const deleteTrade = async (req, res) => {
    try {
        const trade = await Trade.findById(req.params.id);
        if (!trade || trade.isDeleted) {
            logger.warn('Trade not found or already deleted', { tradeId: req.params.id, ip: req.ip });
            return res.status(404).json({ success: false, message: 'Trade not found' });
        }

        trade.isDeleted = true;
        await trade.save();

        logger.info('Trade soft deleted', { tradeId: trade._id, ip: req.ip });
        res.json({ success: true, message: 'Trade deleted' });
    } catch (error) {
        logger.error('Error in deleteTrade', { error: error.message, stack: error.stack, ip: req.ip });
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    createTrade,
    getTrades,
    getTradeById,
    updateTrade,
    deleteTrade
};