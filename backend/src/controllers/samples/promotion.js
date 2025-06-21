const Class = require('../models/Class');
const Enrollment = require('../models/Enrollment');
const Student = require('../models/User'); // Assuming students are users with role 'student'

// Levels order for promotion
const levelsOrder = ['L1', 'L2', 'L3', 'L4', 'L5']; // Customize to your levels

function getNextLevel(currentLevel) {
    const idx = levelsOrder.indexOf(currentLevel.toUpperCase());
    if (idx === -1 || idx === levelsOrder.length - 1) return null;
    return levelsOrder[idx + 1];
}

async function promoteStudent(studentId, currentClassId, year) {
    // Validate student exists
    const student = await Student.findById(studentId);
    if (!student) throw new Error('Student not found');

    // Get current class
    const currentClass = await Class.findById(currentClassId);
    if (!currentClass) throw new Error('Current class not found');

    // Get next level
    const nextLevel = getNextLevel(currentClass.level);
    if (!nextLevel) throw new Error('Student is already at max level; cannot promote further');

    // Trade must remain same for promotion
    const nextClassName = `${nextLevel}${currentClass.trade}`;

    // Try to find the next class by level + trade
    let nextClass = await Class.findOne({ level: nextLevel, trade: currentClass.trade, year });
    if (!nextClass) {
        // Create the next class automatically
        nextClass = await Class.create({ level: nextLevel, trade: currentClass.trade, year });
    }

    // Check if student is already enrolled in next class for this year
    const existingEnrollment = await Enrollment.findOne({ student: studentId, class: nextClass._id, year });
    if (existingEnrollment) {
        throw new Error('Student already enrolled in the next level class');
    }

    // Enroll student in next class
    const enrollment = await Enrollment.create({
        student: studentId,
        class: nextClass._id,
        year,
    });

    return enrollment;
}
