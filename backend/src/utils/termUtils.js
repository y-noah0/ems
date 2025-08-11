const Term = require('../models/term');

// Get current term for a school
exports.getCurrentTerm = async (schoolId) => {
    const now = new Date();
    return await Term.findOne({
        school: schoolId,
        startDate: { $lte: now },
        endDate: { $gte: now },
        isDeleted: false
    }).sort('-startDate');
};

const Enrollment = require('../models/enrollment');

// Get student's active classes (optionally filtered by term)
exports.getStudentClasses = async (studentId, schoolId, termId = null) => {
    const query = {
        student: studentId,
        school: schoolId,
        isActive: true,
        isDeleted: false
    };
    if (termId) query.term = termId;
    const enrollments = await Enrollment.find(query).select('class');
    return enrollments.map(enrollment => enrollment.class);
};