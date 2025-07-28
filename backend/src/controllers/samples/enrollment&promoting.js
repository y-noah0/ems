const { enrollStudent, promoteStudent } = require('../services/enrollmentService');

exports.promoteStudentHandler = async (req, res) => {
    try {
        const { studentId, currentClassId, year } = req.body;
        const enrollment = await promoteStudent(studentId, currentClassId, year);
        res.status(201).json({ message: 'Student promoted successfully', enrollment });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.enrollStudentHandler = async (req, res) => {
    try {
        const { studentId, classId, year } = req.body;
        const enrollment = await enrollStudent(studentId, classId, year);
        res.status(201).json({ message: 'Student enrolled successfully', enrollment });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};
