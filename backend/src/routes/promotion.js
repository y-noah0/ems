const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');

// Route to promote students after Term 3
router.post('/promote', async (req, res) => {
    const { schoolId, academicYear } = req.body;

    // Validate required fields
    if (!schoolId || !academicYear) {
        return res.status(400).json({ message: 'schoolId and academicYear are required' });
    }

    // Call promoteStudents with validated body
    await promotionController.promoteStudents({ body: { schoolId, academicYear, cronJob: false } }, res);
});

// Route to transition students to the next term
router.post('/transition', async (req, res) => {
    const { schoolId, academicYear, currentTermNumber } = req.body;

    // Validate required fields
    if (!schoolId || !academicYear || !currentTermNumber) {
        return res.status(400).json({ message: 'schoolId, academicYear, and currentTermNumber are required' });
    }

    // Validate currentTermNumber
    if (![1, 2, 3].includes(Number(currentTermNumber))) {
        return res.status(400).json({ message: 'currentTermNumber must be 1, 2, or 3' });
    }

    // Call transitionStudentsToNextTerm with validated body
    await promotionController.transitionStudentsToNextTerm({ body: { schoolId, academicYear, currentTermNumber, cronJob: false } }, res);
});

module.exports = router;