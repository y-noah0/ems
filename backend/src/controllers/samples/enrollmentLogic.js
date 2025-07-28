const Enrollment = require('../models/Enrollment');
const Student = require('../models/User');
const Class = require('../models/Class');

async function enrollStudent(studentId, classId, year) {
    // Validate student and class exist
    const [student, classObj] = await Promise.all([
        Student.findById(studentId),
        Class.findById(classId),
    ]);

    if (!student) throw new Error('Student not found');
    if (!classObj) throw new Error('Class not found');

    // Check if enrollment already exists for this student, class, and year
    const existing = await Enrollment.findOne({ student: studentId, class: classId, year });
    if (existing) {
        throw new Error('Student is already enrolled in this class for the specified year');
    }

    // Create enrollment
    const enrollment = await Enrollment.create({
        student: studentId,
        class: classId,
        year,
    });

    return enrollment;
}
