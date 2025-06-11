const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({ 
  dest: 'temp/uploads/',
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// All routes here require dean privileges
router.use(authMiddleware.authenticate, authMiddleware.isDean);

// @route   GET api/admin/classes
// @desc    Get all classes
// @access  Dean
router.get('/classes', adminController.getAllClasses);

// @route   POST api/admin/classes
// @desc    Create a new class
// @access  Dean
router.post(
  '/classes',
  [
    check('level', 'Level is required (L3, L4, L5)').isIn(['L3', 'L4', 'L5']),
    check('trade', 'Trade is required (SOD, NIT, MMP)').isIn(['SOD', 'NIT', 'MMP']),
    check('year', 'Year is required').isNumeric(),
    check('term', 'Term is required (1-3)').isInt({ min: 1, max: 3 })
  ],
  adminController.createClass
);

// @route   PUT api/admin/classes/:id
// @desc    Update a class
// @access  Dean
router.put(
  '/classes/:id',
  [
    check('level', 'Level is required (L3, L4, L5)').isIn(['L3', 'L4', 'L5']),
    check('trade', 'Trade is required (SOD, NIT, MMP)').isIn(['SOD', 'NIT', 'MMP']),
    check('year', 'Year is required').isNumeric(),
    check('term', 'Term is required (1-3)').isInt({ min: 1, max: 3 })
  ],
  adminController.updateClass
);

// @route   DELETE api/admin/classes/:id
// @desc    Delete a class
// @access  Dean
router.delete('/classes/:id', adminController.deleteClass);

// @route   GET api/admin/classes/:classId/subjects
// @desc    Get subjects for a class
// @access  Dean
router.get('/classes/:classId/subjects', adminController.getSubjectsByClass);

// @route   POST api/admin/subjects
// @desc    Create a new subject
// @access  Dean
router.post(
  '/subjects',
  [
    check('name', 'Subject name is required').notEmpty(),
    check('classId', 'Class ID is required').notEmpty()
  ],
  adminController.createSubject
);

// @route   PUT api/admin/subjects/:id/assign-teacher
// @desc    Assign teacher to subject or remove assignment
// @access  Dean
router.put(
  '/subjects/:id/assign-teacher',
  [
    // teacherId can be empty to remove assignment
    check('teacherId').optional()
  ],
  adminController.assignTeacherToSubject
);

// @route   GET api/admin/teachers
// @desc    Get all teachers
// @access  Dean
router.get('/teachers', adminController.getAllTeachers);

// @route   GET api/admin/classes/:classId/students
// @desc    Get students by class
// @access  Dean
router.get('/classes/:classId/students', adminController.getStudentsByClass);

// @route   POST api/admin/import-students
// @desc    Import students from CSV
// @access  Dean
router.post(
  '/import-students',
  upload.single('file'),
  [
    check('classId', 'Class ID is required').notEmpty()
  ],
  adminController.importStudentsFromCSV
);

// @route   POST api/admin/students
// @desc    Create a new student
// @access  Dean
router.post(
  '/students',
  [
    check('fullName', 'Full name is required').notEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('registrationNumber', 'Registration number is required').notEmpty(),
    check('classId', 'Class ID is required').notEmpty()
  ],
  adminController.createStudent
);

// @route   GET api/admin/students/:id
// @desc    Get student by ID
// @access  Dean
router.get('/students/:id', adminController.getStudentById);

// @route   GET api/admin/students/:id/results
// @desc    Get student results by ID
// @access  Dean
router.get('/students/:id/results', adminController.getStudentResults);

module.exports = router;
