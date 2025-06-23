const express = require('express');
const router = express.Router();
const {
    generateSingleStudentReport,
    generateClassReport,
    generateTermReport,
    generateSchoolReport,
    generateSubjectReport,
    generateTradeReport,
    generatePromotionReport,
    generateTeacherReport,
    createReportCard,
    generateAssessmentReport,
} = require('../controllers/reportController');

// Route to create a new report card
router.post('/create', createReportCard);
// Route to generate assessment report for a student
router.post('/assessment/generate', generateAssessmentReport);
// Route to generate a report for a single student
router.post('/student/generate', generateSingleStudentReport);

// Route to generate reports for all students in a class
router.post('/class/generate', generateClassReport);

// Route to generate reports for all students in a term
router.post('/term/generate', generateTermReport);

// Route to generate reports for all students in a school
router.post('/school/generate', generateSchoolReport);

// Route to generate reports for all students in a subject
router.post('/subject/generate', generateSubjectReport);

// Route to generate reports for all students in a trade
router.post('/trade/generate', generateTradeReport);

// Route to generate promotion eligibility report
router.post('/promotion/generate', generatePromotionReport);

// Route to generate teacher performance report
router.post('/teacher/generate', generateTeacherReport);

module.exports = router;