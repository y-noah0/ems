// routes/classRoutes.js
const express = require('express');
const { check } = require('express-validator');
const {
    createClass,
    getClasses,
    getClassById,
    updateClass,
    deleteClass
} = require('../controllers/classController');
const {
    authenticate,
    requireRoles
} = require('../middlewares/authMiddleware');

const router = express.Router();

// Roles
const deanOrAdmin = requireRoles(['dean', 'admin']);

// Read-only for all authenticated users
router.get('/', getClasses);
router.get('/:id', authenticate, getClassById);

// Only dean and admin can create
router.post(
    '/',
    [
        check('level').isIn(['L3', 'L4', 'L5']).withMessage('Invalid class level'),
        check('trade').isMongoId().withMessage('Valid trade ID is required'),
        check('year').isInt({ min: 2000 }).withMessage('Valid year is required'),
        check('schoolId').isMongoId().withMessage('Valid school ID is required'),
    ],
    createClass
);

// Only dean and admin can update
router.put(
    '/:id',
    authenticate,
    deanOrAdmin,
    [
        check('level').isIn(['L3', 'L4', 'L5']).withMessage('Invalid class level'),
        check('trade').isMongoId().withMessage('Valid trade ID is required'),
        check('year').isInt({ min: 2000 }).withMessage('Valid year is required'),
        check('school').isMongoId().withMessage('Valid school ID is required'),
        check('subjects').optional().isArray().withMessage('Subjects must be an array')
    ],
    updateClass
);

// Only dean and admin can delete
router.delete('/:id', authenticate, deanOrAdmin, deleteClass);

module.exports = router;
