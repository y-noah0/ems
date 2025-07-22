// controllers/promotionController.js
const mongoose = require('mongoose');
const Enrollment = require('../models/enrollment');
const ReportCard = require('../models/report');
const PromotionLog = require('../models/PromotionLog');
const Class = require('../models/Class');
const Term = require('../models/term');
const User = require('../models/User');
const School = require('../models/school');

// Helper: Get next level for promotion
const getNextLevel = (currentLevel) => {
    const levels = ['L3', 'L4', 'L5'];
    const index = levels.indexOf(currentLevel);
    if (index === -1 || index === levels.length - 1) return null;
    return levels[index + 1];
};

// Helper: Get first term of next academic year
const getFirstTerm = async (school, academicYear, session) => {
    let term = await Term.findOne({ school, academicYear, termNumber: 1, isDeleted: false }).session(session);
    if (!term) {
        const start = new Date(`${academicYear}-09-01`);
        const end = new Date(`${academicYear}-12-15`);
        term = await Term.create([{ termNumber: 1, academicYear, school, startDate: start, endDate: end }], { session })[0];
    }
    return term;
};

// Helper: Get or create next term
const getNextTerm = async (school, academicYear, currentTermNumber, session) => {
    const nextTermNumber = currentTermNumber + 1;
    if (nextTermNumber > 3) {
        throw new Error('No next term available in the same academic year');
    }

    let nextTerm = await Term.findOne({
        school,
        academicYear,
        termNumber: nextTermNumber,
        isDeleted: false
    }).session(session);

    if (!nextTerm) {
        const prevTerm = await Term.findOne({ school, academicYear, termNumber: currentTermNumber }).session(session);
        const startDate = new Date(prevTerm.endDate);
        startDate.setDate(startDate.getDate() + 1);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 3);
        nextTerm = await Term.create([{
            termNumber: nextTermNumber,
            academicYear,
            school,
            startDate,
            endDate
        }], { session })[0];
    }

    return nextTerm;
};

// Helper: Get or create next class for promotion
const getNextClass = async (currentClass, nextLevel, nextAcademicYear, session) => {
    let nextClass = await Class.findOne({
        school: currentClass.school,
        trade: currentClass.trade,
        level: nextLevel,
        year: nextAcademicYear,
        isDeleted: false
    }).session(session);

    if (!nextClass) {
        nextClass = await Class.create([{
            school: currentClass.school,
            trade: currentClass.trade,
            level: nextLevel,
            year: nextAcademicYear,
            capacity: currentClass.capacity,
            subjects: currentClass.subjects
        }], { session })[0];
    }

    const enrollmentCount = await Enrollment.countDocuments({
        class: nextClass._id,
        term: await getFirstTerm(currentClass.school, nextAcademicYear, session),
        isActive: true,
        isDeleted: false
    }).session(session);
    if (enrollmentCount >= nextClass.capacity) {
        throw new Error(`Class ${nextClass.level} for ${nextAcademicYear} is at capacity`);
    }

    return nextClass;
};

// Helper: Business rule for passing
const hasPassed = (reportCard, enrollment, school) => {
    if (!reportCard || !enrollment.isActive || enrollment.isDeleted) return false;
    if (['expelled', 'onLeave', 'withdrawn'].includes(enrollment.promotionStatus)) return false;
    if (!reportCard.isComplete) return false;
    return reportCard.average >= (school.passingThreshold || reportCard.passingThreshold || 50);
};

// Helper: Check if term has been processed
const isTermProcessed = async (schoolId, academicYear, termId, session) => {
    return await PromotionLog.exists({
        school: schoolId,
        academicYear,
        fromTerm: termId,
        status: 'termTransition',
        cronJob: true
    }).session(session);
};

// Promote students after three terms
exports.promoteStudents = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { schoolId, academicYear } = req.body;
        const isCron = req.body.cronJob || false;

        const school = await School.findById(schoolId).session(session);
        if (!school || school.isDeleted) {
            return res.status(400).json({ message: 'Invalid or deleted school.' });
        }

        const terms = await Term.find({ school: schoolId, academicYear, isDeleted: false }).session(session);
        if (terms.length < 3) {
            return res.status(400).json({ message: 'Cannot promote: incomplete academic year terms.' });
        }

        // Check if promotion already processed for Term 3
        const term3 = terms.find(t => t.termNumber === 3);
        if (isCron && await PromotionLog.exists({
            school: schoolId,
            academicYear,
            status: { $in: ['promoted', 'graduated', 'repeated', 'expelled'] },
            cronJob: true
        }).session(session)) {
            return res.status(200).json({ message: 'Promotion already processed for this academic year.' });
        }

        const enrollments = await Enrollment.find({
            school: schoolId,
            term: term3._id,
            isActive: true,
            isDeleted: false
        }).populate('student class').session(session);

        const studentEnrollments = {};
        for (const enrollment of enrollments) {
            const studentId = enrollment.student._id.toString();
            if (!studentEnrollments[studentId] || enrollment.createdAt > studentEnrollments[studentId].createdAt) {
                studentEnrollments[studentId] = enrollment;
            }
        }

        const bulkOps = [];
        for (const enrollment of Object.values(studentEnrollments)) {
            const student = enrollment.student;
            const currentClass = enrollment.class;

            if (!student || student.role !== 'student') {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: enrollment._id },
                        update: { isActive: false, remarks: 'Invalid student or role' }
                    }
                });
                continue;
            }
            if (student.graduated || ['onLeave', 'withdrawn'].includes(enrollment.promotionStatus)) {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: enrollment._id },
                        update: { isActive: false, remarks: `Student ${enrollment.promotionStatus}` }
                    }
                });
                bulkOps.push({
                    insertOne: {
                        document: {
                            student: student._id,
                            fromClass: currentClass._id,
                            toClass: null,
                            academicYear,
                            status: enrollment.promotionStatus,
                            remarks: `Student ${enrollment.promotionStatus}`,
                            school: currentClass.school,
                            promotionDate: new Date(),
                            manual: !isCron,
                            cronJob: isCron,
                            passingThreshold: school.passingThreshold || 50
                        }
                    }
                });
                continue;
            }

            const alreadyPromoted = await PromotionLog.exists({
                student: student._id,
                academicYear,
                school: currentClass.school,
                status: { $in: ['promoted', 'graduated'] }
            }).session(session);
            if (alreadyPromoted) {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: enrollment._id },
                        update: { isActive: false, remarks: 'Already promoted or graduated' }
                    }
                });
                continue;
            }

            const reportCard = await ReportCard.findOne({
                student: student._id,
                class: currentClass._id,
                academicYear,
                school: schoolId,
                term: term3._id
            }).session(session);

            const passed = hasPassed(reportCard, enrollment, school);
            let status = enrollment.promotionStatus === 'expelled' ? 'expelled' : 'repeated';
            let nextClass = currentClass;
            let remarks = '';

            if (passed) {
                const nextLevel = getNextLevel(currentClass.level);
                if (!nextLevel) {
                    student.graduated = true;
                    student.graduationDate = new Date();
                    student.status = 'graduated';
                    status = 'graduated';
                    remarks = 'Student graduated';
                    bulkOps.push({
                        updateOne: {
                            filter: { _id: student._id },
                            update: { graduated: true, graduationDate: new Date(), status: 'graduated' }
                        }
                    });
                } else {
                    const targetClass = await getNextClass(currentClass, nextLevel, academicYear + 1, session);
                    if (targetClass.trade.toString() !== currentClass.trade.toString()) {
                        remarks = `Blocked cross-trade promotion for student ${student.fullName || student._id}`;
                        console.warn(remarks);
                        bulkOps.push({
                            insertOne: {
                                document: {
                                    student: student._id,
                                    fromClass: currentClass._id,
                                    toClass: null,
                                    academicYear,
                                    status: 'repeated',
                                    remarks,
                                    school: currentClass.school,
                                    promotionDate: new Date(),
                                    manual: !isCron,
                                    cronJob: isCron,
                                    passingThreshold: school.passingThreshold || reportCard?.passingThreshold || 50
                                }
                            }
                        });
                        continue;
                    }
                    nextClass = targetClass;
                    status = 'promoted';
                    remarks = 'Student promoted to next level';
                    bulkOps.push({
                        insertOne: {
                            document: {
                                student: student._id,
                                class: nextClass._id,
                                term: (await getFirstTerm(currentClass.school, academicYear + 1, session))._id,
                                school: currentClass.school,
                                isActive: true,
                                promotionStatus: enrollment.promotionStatus,
                                transferredFromSchool: student.school.toString() !== schoolId.toString() ? student.school : null
                            }
                        }
                    });
                }
            } else if (status === 'repeated' && reportCard?.isComplete) {
                remarks = 'Student repeating due to insufficient performance';
                bulkOps.push({
                    insertOne: {
                        document: {
                            student: student._id,
                            class: currentClass._id,
                            term: (await getFirstTerm(currentClass.school, academicYear + 1, session))._id,
                            school: currentClass.school,
                            isActive: true,
                            promotionStatus: enrollment.promotionStatus,
                            transferredFromSchool: student.school.toString() !== schoolId.toString() ? student.school : null
                        }
                    }
                });
            } else if (status === 'expelled') {
                remarks = 'Student expelled';
            } else {
                remarks = reportCard ? 'Incomplete report card' : 'No report card found';
            }

            bulkOps.push({
                updateOne: {
                    filter: { _id: enrollment._id },
                    update: { isActive: false, remarks }
                }
            });

            bulkOps.push({
                insertOne: {
                    document: {
                        student: student._id,
                        fromClass: currentClass._id,
                        toClass: status === 'promoted' ? nextClass._id : null,
                        academicYear,
                        status,
                        remarks,
                        school: currentClass.school,
                        promotionDate: new Date(),
                        manual: !isCron,
                        cronJob: isCron,
                        passingThreshold: school.passingThreshold || reportCard?.passingThreshold || 50
                    }
                }
            });
        }

        if (bulkOps.length > 0) {
            await Enrollment.bulkWrite(bulkOps.filter(op => op.insertOne && op.insertOne.document.student || op.updateOne), { session });
            await User.bulkWrite(bulkOps.filter(op => op.updateOne && op.updateOne.filter._id.toString().startsWith('User')), { session });
            await PromotionLog.bulkWrite(bulkOps.filter(op => op.insertOne && op.insertOne.document.fromTerm === undefined), { session });
        }

        await session.commitTransaction();
        return res.status(200).json({ message: 'Promotion process completed successfully.' });
    } catch (error) {
        await session.abortTransaction();
        console.error('Promotion error:', error);
        return res.status(500).json({ message: `Internal server error during promotion: ${error.message}` });
    } finally {
        session.endSession();
    }
};

// Transition students to the next term within the same class
exports.transitionStudentsToNextTerm = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { schoolId, academicYear, currentTermNumber } = req.body;
        const isCron = req.body.cronJob || false;
        const currentDate = new Date();

        const school = await School.findById(schoolId).session(session);
        if (!school || school.isDeleted) {
            return res.status(400).json({ message: 'Invalid or deleted school.' });
        }

        const currentTerm = await Term.findOne({
            school: schoolId,
            academicYear,
            termNumber: currentTermNumber,
            isDeleted: false
        }).session(session);
        if (!currentTerm) {
            return res.status(400).json({ message: `Term ${currentTermNumber} not found for academic year ${academicYear}.` });
        }

        if (currentDate < currentTerm.endDate) {
            return res.status(400).json({ message: `Term ${currentTermNumber} has not yet ended.` });
        }

        if (isCron && await isTermProcessed(schoolId, academicYear, currentTerm._id, session)) {
            return res.status(200).json({ message: `Term ${currentTermNumber} already processed for transition.` });
        }

        const nextTerm = await getNextTerm(schoolId, academicYear, currentTermNumber, session);

        const enrollments = await Enrollment.find({
            school: schoolId,
            term: currentTerm._id,
            isActive: true,
            isDeleted: false
        }).populate('student class').session(session);

        const studentEnrollments = {};
        for (const enrollment of enrollments) {
            const studentId = enrollment.student._id.toString();
            if (!studentEnrollments[studentId] || enrollment.createdAt > studentEnrollments[studentId].createdAt) {
                studentEnrollments[studentId] = enrollment;
            }
        }

        const bulkOps = [];
        for (const enrollment of Object.values(studentEnrollments)) {
            const student = enrollment.student;
            const currentClass = enrollment.class;

            if (!student || student.role !== 'student' || student.graduated) {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: enrollment._id },
                        update: { isActive: false, remarks: 'Invalid student, role, or graduated' }
                    }
                });
                continue;
            }
            if (['expelled', 'onLeave', 'withdrawn'].includes(enrollment.promotionStatus)) {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: enrollment._id },
                        update: { isActive: false, remarks: `Student ${enrollment.promotionStatus}` }
                    }
                });
                bulkOps.push({
                    insertOne: {
                        document: {
                            student: student._id,
                            fromClass: currentClass._id,
                            toClass: currentClass._id,
                            fromTerm: currentTerm._id,
                            toTerm: null,
                            academicYear,
                            status: enrollment.promotionStatus,
                            remarks: `Student ${enrollment.promotionStatus}, not transitioned`,
                            school: currentClass.school,
                            promotionDate: new Date(),
                            manual: !isCron,
                            cronJob: isCron,
                            passingThreshold: school.passingThreshold || 50
                        }
                    }
                });
                continue;
            }

            const existingEnrollment = await Enrollment.exists({
                student: student._id,
                term: nextTerm._id,
                school: schoolId,
                isActive: true,
                isDeleted: false
            }).session(session);
            if (existingEnrollment) {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: enrollment._id },
                        update: { isActive: false, remarks: 'Student already enrolled in next term' }
                    }
                });
                continue;
            }

            const enrollmentCount = await Enrollment.countDocuments({
                class: currentClass._id,
                term: nextTerm._id,
                isActive: true,
                isDeleted: false
            }).session(session);
            if (enrollmentCount >= currentClass.capacity) {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: enrollment._id },
                        update: { isActive: false, remarks: 'Class capacity reached' }
                    }
                });
                bulkOps.push({
                    insertOne: {
                        document: {
                            student: student._id,
                            fromClass: currentClass._id,
                            toClass: currentClass._id,
                            fromTerm: currentTerm._id,
                            toTerm: null,
                            academicYear,
                            status: 'repeated',
                            remarks: 'Class capacity reached, not transitioned',
                            school: currentClass.school,
                            promotionDate: new Date(),
                            manual: !isCron,
                            cronJob: isCron,
                            passingThreshold: school.passingThreshold || 50
                        }
                    }
                });
                continue;
            }

            bulkOps.push({
                insertOne: {
                    document: {
                        student: student._id,
                        class: currentClass._id,
                        term: nextTerm._id,
                        school: currentClass.school,
                        isActive: true,
                        promotionStatus: enrollment.promotionStatus,
                        transferredFromSchool: enrollment.transferredFromSchool
                    }
                }
            });

            bulkOps.push({
                updateOne: {
                    filter: { _id: enrollment._id },
                    update: { isActive: false, remarks: `Transitioned to Term ${nextTerm.termNumber}` }
                }
            });

            bulkOps.push({
                insertOne: {
                    document: {
                        student: student._id,
                        fromClass: currentClass._id,
                        toClass: currentClass._id,
                        fromTerm: currentTerm._id,
                        toTerm: nextTerm._id,
                        academicYear,
                        status: 'termTransition',
                        remarks: `Student transitioned to Term ${nextTerm.termNumber}`,
                        school: currentClass.school,
                        promotionDate: new Date(),
                        manual: !isCron,
                        cronJob: isCron,
                        passingThreshold: school.passingThreshold || 50
                    }
                }
            });
        }

        if (bulkOps.length > 0) {
            await Enrollment.bulkWrite(bulkOps.filter(op => op.insertOne && op.insertOne.document.student || op.updateOne), { session });
            await PromotionLog.bulkWrite(bulkOps.filter(op => op.insertOne && op.insertOne.document.fromTerm), { session });
        }

        await session.commitTransaction();
        return res.status(200).json({ message: `Students successfully transitioned to Term ${currentTermNumber + 1}.` });
    } catch (error) {
        await session.abortTransaction();
        console.error('Term transition error:', error);
        return res.status(500).json({ message: `Internal server error during term transition: ${error.message}` });
    } finally {
        session.endSession();
    }
};