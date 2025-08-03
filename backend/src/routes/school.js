const express = require('express');
const router = express.Router();
const schoolController = require('../controllers/schoolController');
const upload = require('../middlewares/upload');
const { authenticate, isAdmin } = require('../middlewares/authMiddleware');

// All actions require authentication
router.post('/', upload.single("logo"), isAdmin, schoolController.createSchool);
router.get('/', authenticate, schoolController.getSchools);
router.get('/:id', authenticate, isAdmin, schoolController.getSchoolById);
router.get('/:id/trades', authenticate, schoolController.getTradesOfferedBySchool);
router.put('/:id', authenticate, isAdmin, upload.single('logo'), schoolController.updateSchool);
router.delete('/:id', authenticate, isAdmin, schoolController.deleteSchool);

module.exports = router;