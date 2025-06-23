const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');

router.post('/promote', promotionController.promoteStudents);

module.exports = router;
