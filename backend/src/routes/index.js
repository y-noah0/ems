const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const adminRoutes = require('./admin');
const examRoutes = require('./exam');
const submissionRoutes = require('./submission');
const systemAdminRoutes = require('./systemAdmin');
const notificationRoutes = require('./notification');

// Mount routes
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/exams', examRoutes);
router.use('/submissions', submissionRoutes);
router.use('/system-admin', systemAdminRoutes);
// Headmaster-specific routes
const headmasterRoutes = require('./headmaster');
const { authenticate, requireRoles } = require('../middlewares/authMiddleware');
// Only headmasters can access these
router.use('/headmaster', authenticate, requireRoles(['headmaster']), headmasterRoutes);
router.use('/notifications', notificationRoutes);
// Mount subject routes for CRUD and retrieval
const subjectRoutes = require('./subject');
router.use('/subjects', subjectRoutes);

// Special case for subjects under exams controller
const examController = require('../controllers/examController');
const authMiddleware = require('../middlewares/authMiddleware');
router.get('/subjects/teacher', authMiddleware.authenticate, authMiddleware.isTeacher, examController.getTeacherSubjects);

module.exports = router;
