const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const adminRoutes = require('./admin');
const examRoutes = require('./exam');
const submissionRoutes = require('./submission');
const systemAdminRoutes = require('./systemAdmin');

// Mount routes
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/exams', examRoutes);
router.use('/submissions', submissionRoutes);
router.use('/system-admin', systemAdminRoutes);

// Special case for subjects under exams controller
const examController = require('../controllers/examController');
const authMiddleware = require('../middlewares/authMiddleware');
router.get('/subjects/teacher', authMiddleware.authenticate, authMiddleware.isTeacher, examController.getTeacherSubjects);

module.exports = router;
