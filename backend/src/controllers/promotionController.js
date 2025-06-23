const Enrollment = require('../models/enrollment');
const ReportCard = require('../models/report');
const PromotionLog = require('../models/promotionLog');
const Class = require('../models/Class');
const Term = require('../models/term')
const User = require('../models/User');

// Business rule for passing (fixed at 50%)
const hasPassed = (reportCard, enrollment) => {
    const disciplineOkay = enrollment.isActive && !enrollment.isDeleted;
    const gradeOkay = reportCard && reportCard.average >= 50; // fixed passing mark
    return disciplineOkay && gradeOkay;
};

const getNextLevel = (currentLevel) => {
    const levels = ['L3', 'L4', 'L5'];
    const index = levels.indexOf(currentLevel);
    if (index === -1 || index === levels.length - 1) return null;
    return levels[index + 1];
};

const getFirstTerm = async (school, academicYear) => {
    let term = await Term.findOne({ school, academicYear, termNumber: 1 });
    if (!term) {
        const start = new Date(`${academicYear}-09-01`);
        const end = new Date(`${academicYear}-12-15`);
        term = await Term.create({
            termNumber: 1,
            academicYear,
            school,
            startDate: start,
            endDate: end,
        });
    }
    return term;
};

const getNextClass = async (currentClass, nextLevel, nextAcademicYear) => {
    let nextClass = await Class.findOne({
        school: currentClass.school,
        trade: currentClass.trade,
        level: nextLevel,
        year: nextAcademicYear,
    });

    if (!nextClass) {
        nextClass = await Class.create({
            school: currentClass.school,
            trade: currentClass.trade,
            level: nextLevel,
            year: nextAcademicYear,
        });
    }

    return nextClass;
};

exports.promoteStudents = async (req, res) => {
    try {
        const { schoolId, academicYear } = req.body;

        // Check if all 3 terms exist for the year
        const terms = await Term.find({ school: schoolId, academicYear });
        if (terms.length < 3) {
            return res.status(400).json({ message: 'Cannot promote: incomplete academic year terms.' });
        }

        // Get active enrollments for the school
        const enrollments = await Enrollment.find({
            school: schoolId,
            isActive: true,
            isDeleted: false,
        }).populate('student class');

        for (const enrollment of enrollments) {
            const student = enrollment.student;
            const currentClass = enrollment.class;

            // Skip if not student or already graduated
            if (!student || student.role !== 'student' || student.graduated) continue;

            // Avoid duplicate promotion
            const alreadyPromoted = await PromotionLog.exists({
                student: student._id,
                academicYear,
                school: currentClass.school,
                status: { $in: ['promoted', 'graduated'] },
            });
            if (alreadyPromoted) continue;

            // Get student's report card for current class and year
            const reportCard = await ReportCard.findOne({
                student: student._id,
                class: currentClass._id,
                academicYear,
            });

            // Determine promotion outcome
            const passed = hasPassed(reportCard, enrollment);
            let status = 'repeated';
            let nextClass = currentClass;

            if (passed) {
                const nextLevel = getNextLevel(currentClass.level);
                if (!nextLevel) {
                    // Graduate if no next level
                    student.graduated = true;
                    student.graduationDate = new Date();
                    student.status = 'graduated';
                    status = 'graduated';
                } else {
                    // Promote to next level, same trade
                    const targetClass = await getNextClass(currentClass, nextLevel, academicYear + 1);

                    // Safety check - trade must match
                    if (targetClass.trade.toString() !== currentClass.trade.toString()) {
                        console.warn(`Blocked cross-trade promotion for student ${student.fullName}`);
                        continue;
                    }

                    nextClass = targetClass;
                    status = 'promoted';

                    // Enroll student in new class and first term next academic year
                    await Enrollment.create({
                        student: student._id,
                        class: nextClass._id,
                        term: await getFirstTerm(currentClass.school, academicYear + 1),
                        school: currentClass.school,
                        isActive: true,
                    });
                }
            }

            // Deactivate current enrollment
            enrollment.isActive = false;
            await enrollment.save();

            // Save graduation status if needed
            if (status === 'graduated') {
                await student.save();
            }

            // Log the promotion action
            await PromotionLog.create({
                student: student._id,
                fromClass: currentClass._id,
                toClass: status === 'promoted' ? nextClass._id : null,
                academicYear,
                status,
                school: currentClass.school,
            });
        }

        res.status(200).json({ message: 'Promotion process completed successfully.' });
    } catch (error) {
        console.error('Promotion error:', error);
        res.status(500).json({ message: 'Internal server error during promotion.' });
    }
};
