const express = require('express');
const router = express.Router();
const schoolController = require('../controllers/schoolController');
const upload = require('../middlewares/upload');
const { authenticate, isAdmin } = require('../middlewares/authMiddleware');

// All actions require admin role
router.post('/', upload.single("logo"), schoolController.createSchool);
router.get('/', authenticate, schoolController.getSchools);
router.get('/:id', authenticate, isAdmin, schoolController.getSchoolById);
router.put('/:id', authenticate, isAdmin, upload.single('logo'), schoolController.updateSchool);
router.delete('/:id', authenticate, isAdmin, schoolController.deleteSchool);

module.exports = router;
 