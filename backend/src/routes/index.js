const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const schoolRoutes = require('./school');
const adminRoutes = require('./admin');
const systemAdminRoutes = require('./systemAdmin');
const headmasterRoutes = require('./headmaster');
const teacherRoutes = require('./teacher');
const studentRoutes = require('./student');
const classRoutes = require('./class');
const subjectRoutes = require('./subject');
const termRoutes = require('./terms');
const tradeRoutes = require('./trade');
const examRoutes = require('./exam');
const submissionRoutes = require('./submission');
const enrollmentRoutes = require('./enrollment');
const promotionRoutes = require('./promotion');
const reportRoutes = require('./report');
const notificationRoutes = require('./notification');
const uploadRoutes = require('./uploads');

// TEST ONLY - Remove before production deployment
const testRoutes = require('./test');

// Use routes
router.use('/auth', authRoutes);
router.use('/schools', schoolRoutes);
router.use('/admin', adminRoutes);
router.use('/system-admin', systemAdminRoutes);
router.use('/headmaster', headmasterRoutes);
router.use('/teacher', teacherRoutes);
router.use('/student', studentRoutes);
router.use('/classes', classRoutes);
router.use('/subjects', subjectRoutes);
router.use('/terms', termRoutes);
router.use('/trades', tradeRoutes);
router.use('/exams', examRoutes);
router.use('/submissions', submissionRoutes);
router.use('/enrollment', enrollmentRoutes);
router.use('/promotion', promotionRoutes);
router.use('/reports', reportRoutes);
router.use('/notifications', notificationRoutes);
router.use('/uploads', uploadRoutes);

// TEST ONLY - Remove before production deployment
router.use('/test', testRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;
