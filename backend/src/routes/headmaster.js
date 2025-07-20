const express = require('express');
const router = express.Router();
const headmasterController = require('../controllers/headmasterController');

// Trades offered by school
router.get('/trades', headmasterController.getTradesOffered);
router.post('/trades/:tradeId', headmasterController.addTradeOffered);
router.delete('/trades/:tradeId', headmasterController.removeTradeOffered);

// Subjects in trades offered and add custom subject
router.get('/subjects', headmasterController.getSubjectsCatalog);
router.post('/subjects', headmasterController.createSubject);

module.exports = router;
