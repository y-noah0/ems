const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const adminRoutes = require('./admin');
const examRoutes = require('./exam');
const submissionRoutes = require('./submission');
const systemAdminRoutes = require('./systemAdmin');
const notificationRoutes = require('./notification');
const subjectRoutes = require('./subject');
const promotionRoutes = require('./promotion');
const termsRoutes = require('./terms');
const tradesRoutes = require('./trade');
const classesRoutes = require('./class');
const schoolsRoutes = require('./school');
const enrollmentRoutes = require('./enrollment')
const reportRoutes = require('./report');
const teacher = require('./teacher')
const student  = require('./student')

// Mount routes
router.use('/teachers', teacher)
router.use('/students' , student)
router.use('/reports', reportRoutes);
router.use('/promotions', promotionRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/exams', examRoutes);
router.use('/submissions', submissionRoutes);
router.use('/system-admin', systemAdminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/subjects', subjectRoutes);
router.use('/terms', termsRoutes);
router.use('/trades', tradesRoutes);
router.use('/classes', classesRoutes);
router.use('/schools', schoolsRoutes);
// Special case for subjects under exams controller
const examController = require('../controllers/examController');
const authMiddleware = require('../middlewares/authMiddleware');
router.get('/subjects/teacher', authMiddleware.authenticate, authMiddleware.isTeacher, examController.getTeacherSubjects);

module.exports = router;
