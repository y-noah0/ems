const express = require('express');
const router = express.Router();
const schoolController = require('../controllers/schoolController');
const upload = require('../middlewares/upload');
const { authenticate, isAdminorHeadmaster} = require('../middlewares/authMiddleware');

// All actions require authentication
router.post('/', upload.single("logo"), isAdmin, schoolController.createSchool);
// All actions require authentication
router.post('/', upload.single("logo"), isAdminorHeadmaster, schoolController.createSchool);
router.get('/', authenticate, schoolController.getSchools);
router.get('/:id', authenticate, schoolController.getSchoolById);
router.get('/:id/trades', authenticate, schoolController.getTradesOfferedBySchool);
// Add a trade to school's offerings (headmaster or admin)
const { requireRoles } = require('../middlewares/authMiddleware');
router.post('/:id/trades/:tradeId', authenticate, requireRoles(['headmaster','admin']), schoolController.addTradeToSchool);
// Remove a trade from school's offerings
router.delete('/:id/trades/:tradeId', authenticate, requireRoles(['headmaster','admin']), schoolController.removeTradeFromSchool);
router.patch('/:id', authenticate, isAdminorHeadmaster, upload.single('logo'), schoolController.updateSchool);
router.delete('/:id', authenticate, isAdminorHeadmaster, schoolController.deleteSchool);

module.exports = router;