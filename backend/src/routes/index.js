const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const adminRoutes = require('./admin');
const examRoutes = require('./exam');
const submissionRoutes = require('./submission');
const systemAdminRoutes = require('./systemAdmin');
const notificationRoutes = require('./notification');
const tradeRoutes = require('./trade');
const subjectRoutes = require('./subject');
const teacher = require('./teacher');
const student = require('./student');
const reportRoutes = require('./report');
const promotionRoutes = require('./promotion');
const enrollmentRoutes = require('./enrollment');
const classes = require('./class');
const headmasterRoutes = require('./headmaster');

// Mount 
router.use('/headmasters', headmasterRoutes);
router.use('/class', classes);
router.use('/schools', require('./school'));
router.use('/teachers', teacher)
router.use('/students', student)
router.use('/reports', reportRoutes);
router.use('/promotions', promotionRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/exams', examRoutes);
router.use('/submissions', submissionRoutes);
router.use('/system-admin', systemAdminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/trade', tradeRoutes);
router.use('/subjects', subjectRoutes);
router.use('/trade', tradeRoutes);
router.use('/subjects', subjectRoutes);

// Special case for subjects under exams controller
const examController = require('../controllers/examController');
const authMiddleware = require('../middlewares/authMiddleware');
router.get('/subjects/teacher', authMiddleware.authenticate, authMiddleware.isTeacher, examController.getTeacherSubjects);

module.exports = router;
