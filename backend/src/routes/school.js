const express = require('express');
const router = express.Router();
const schoolController = require('../controllers/schoolController');
const upload = require('../middlewares/upload');
const { authenticate, requireRoles } = require('../middlewares/authMiddleware');

// All actions require authentication
router.post('/', upload.single("logo"), schoolController.createSchool);
router.get('/', schoolController.getSchools);
router.get('/:id', authenticate, schoolController.getSchoolById);
router.get('/:id/trades', authenticate, schoolController.getTradesOfferedBySchool);

router.post('/:id/trades/:tradeId', authenticate, requireRoles(['headmaster', 'admin']), schoolController.addTradeToSchool);
// Remove a trade from school's offerings
router.delete('/:id/trades/:tradeId', authenticate, requireRoles(['headmaster', 'admin']), schoolController.removeTradeFromSchool);
router.patch('/:id', authenticate, upload.single('logo'), schoolController.updateSchool);
router.delete('/:id', authenticate, schoolController.deleteSchool);

module.exports = router;