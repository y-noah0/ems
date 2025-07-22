// controllers/promotionController.js
const Enrollment = require('../models/Enrollment');
const ReportCard = require('../models/ReportCard');
const PromotionLog = require('../models/PromotionLog');
const Class = require('../models/Class');
const Term = require('../models/Term');
const User = require('../models/User');

// Utility to evaluate passing criteria
const hasPassed = (reportCard, student, enrollment) => {
    const disciplineOkay = enrollment.isActive && !enrollment.isDeleted;
    const gradeOkay = reportCard && reportCard.average >= 50; // Can be customized per school
    return gradeOkay && disciplineOkay;
};

// Utility to get next level
const getNextLevel = (level) => {
    const levels = ['L3', 'L4', 'L5'];
    const index = levels.indexOf(level);
    return index < 0 || index === levels.length - 1 ? null : levels[index + 1];
};

// Get or create first term of the academic year
const getFirstTerm = async (school, year) => {
    let term = await Term.findOne({ school, academicYear: year, termNumber: 1 });
    if (!term) {
        const start = new Date(`${year}-09-01`);
        const end = new Date(`${year}-12-15`);
        term = await Term.create({ termNumber: 1, academicYear: year, school, startDate: start, endDate: end });
    }
    return term;
};

// Get or create class for next level
const getNextClass = async (currentClass, nextLevel, nextYear) => {
    let nextClass = await Class.findOne({
        school: currentClass.school,
        trade: currentClass.trade,
        level: nextLevel,
        year: nextYear,
    });

    if (!nextClass) {
        nextClass = await Class.create({
            school: currentClass.school,
            trade: currentClass.trade,
            level: nextLevel,
            year: nextYear,
        });
    }

    return nextClass;
};

exports.promoteStudents = async (req, res) => {
    try {
        const { schoolId, academicYear } = req.body;

        const terms = await Term.find({ school: schoolId, academicYear });
        if (terms.length < 3) {
            return res.status(400).json({ message: 'Incomplete academic year terms' });
        }

        const enrollments = await Enrollment.find({
            school: schoolId,
            isActive: true,
            isDeleted: false,
        }).populate('student class');

        for (const enrollment of enrollments) {
            const student = enrollment.student;
            const currentClass = enrollment.class;

            if (student.role !== 'student' || student.graduated) continue;

            const reportCard = await ReportCard.findOne({
                student: student._id,
                class: currentClass._id,
                academicYear,
            });

            const passed = hasPassed(reportCard, student, enrollment);
            let status = 'repeated';
            let nextClass = currentClass;

            if (passed) {
                const nextLevel = getNextLevel(currentClass.level);
                if (!nextLevel) {
                    student.graduated = true;
                    student.graduationDate = new Date();
                    student.status = 'graduated';
                    status = 'graduated';
                } else {
                    const targetClass = await getNextClass(currentClass, nextLevel, academicYear + 1);
                    nextClass = targetClass;
                    status = 'promoted';

                    await Enrollment.create({
                        student: student._id,
                        class: nextClass._id,
                        term: await getFirstTerm(currentClass.school, academicYear + 1),
                        school: currentClass.school,
                        isActive: true,
                    });
                }
            }

            enrollment.isActive = false;
            await enrollment.save();
            await student.save();

            await PromotionLog.create({
                student: student._id,
                fromClass: currentClass._id,
                toClass: status === 'promoted' ? nextClass._id : null,
                academicYear,
                status,
                school: currentClass.school,
            });
        }

        res.status(200).json({ message: 'Promotion completed successfully.' });
    } catch (error) {
        console.error('Promotion error:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};
