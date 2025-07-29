const mongoose = require('mongoose');
const User = require('../models/User');
const Term = require('../models/term');
const Enrollment = require('../models/enrollment');
const Subject = require('../models/Subject');
const Submission = require('../models/Submission');
const Class = require('../models/Class');
const ReportCard = require('../models/report');
const School = require('../models/school');
const Trade = require('../models/trade');

// Helper function to generate report data for a single student
async function generateStudentReportData(studentId, academicYear, termId, schoolId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const pipeline = [
            {
                $match: {
                    student: new mongoose.Types.ObjectId(studentId),
                    status: 'graded',
                    isDeleted: false,
                },
            },
            {
                $lookup: {
                    from: 'enrollments',
                    let: { studentId: '$student' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$student', '$$studentId'] },
                                academicYear: Number(academicYear),
                                term: new mongoose.Types.ObjectId(termId),
                                school: new mongoose.Types.ObjectId(schoolId),
                                isActive: true,
                                isDeleted: false,
                            },
                        },
                        {
                            $project: { class: 1, school: 1 },
                        },
                    ],
                    as: 'enrollment',
                },
            },
            {
                $unwind: '$enrollment',
            },
            {
                $match: {
                    'enrollment.school': new mongoose.Types.ObjectId(schoolId),
                },
            },
            {
                $lookup: {
                    from: 'exams',
                    localField: 'exam',
                    foreignField: '_id',
                    as: 'examDetails',
                    pipeline: [{ $project: { maxScore: 1, type: 1, subject: 1, school: 1 } }],
                },
            },
            {
                $unwind: '$examDetails',
            },
            {
                $lookup: {
                    from: 'subjects',
                    localField: 'examDetails.subject',
                    foreignField: '_id',
                    as: 'subjectDetails',
                },
            },
            {
                $unwind: '$subjectDetails',
            },
            {
                $match: {
                    'examDetails.school': new mongoose.Types.ObjectId(schoolId),
                },
            },
            {
                $group: {
                    _id: '$subjectDetails._id',
                    subjectName: { $first: '$subjectDetails.name' },
                    assessment1: { $sum: { $cond: [{ $eq: ['$examDetails.type', 'assessment1'] }, '$totalScore', 0] } },
                    assessment2: { $sum: { $cond: [{ $eq: ['$examDetails.type', 'assessment2'] }, '$totalScore', 0] } },
                    test: { $sum: { $cond: [{ $eq: ['$examDetails.type', 'test'] }, '$totalScore', 0] } },
                    exam: { $sum: { $cond: [{ $eq: ['$examDetails.type', 'exam'] }, '$totalScore', 0] } },
                    maxAssessment1: { $max: { $cond: [{ $eq: ['$examDetails.type', 'assessment1'] }, '$examDetails.maxScore', 0] } },
                    maxAssessment2: { $max: { $cond: [{ $eq: ['$examDetails.type', 'assessment2'] }, '$examDetails.maxScore', 0] } },
                    maxTest: { $max: { $cond: [{ $eq: ['$examDetails.type', 'test'] }, '$examDetails.maxScore', 0] } },
                    maxExam: { $max: { $cond: [{ $eq: ['$examDetails.type', 'exam'] }, '$examDetails.maxScore', 0] } },
                },
            },
            {
                $project: {
                    subject: '$_id',
                    subjectName: 1,
                    scores: {
                        assessment1: '$assessment1',
                        assessment2: '$assessment2',
                        test: '$test',
                        exam: '$exam',
                    },
                    maxScores: {
                        assessment1: '$maxAssessment1',
                        assessment2: '$maxAssessment2',
                        test: '$maxTest',
                        exam: '$maxExam',
                    },
                    total: { $add: ['$assessment1', '$assessment2', '$test', '$exam'] },
                    percentage: {
                        $cond: [
                            { $gt: [{ $add: ['$assessment1', '$assessment2', '$test', '$exam'] }, 0] },
                            { $round: [{ $multiply: [{ $divide: [{ $add: ['$assessment1', '$assessment2', '$test', '$exam'] }, { $add: ['$maxAssessment1', '$maxAssessment2', '$maxTest', '$maxExam'] }] }, 100] }, 2] },
                            0,
                        ],
                    },
                    decision: {
                        $cond: [
                            { $gte: ['$percentage', 70] },
                            'Competent',
                            'Not Yet Competent',
                        ],
                    },
                },
            },
            {
                $group: {
                    _id: null,
                    results: { $push: '$$ROOT' },
                    totalScoreSum: { $sum: '$total' },
                },
            },
            {
                $project: {
                    _id: 0,
                    results: 1,
                    totalScore: '$totalScoreSum',
                    average: { $cond: [{ $eq: [{ $size: '$results' }, 0] }, 0, { $round: [{ $divide: ['$totalScoreSum', { $size: '$results' }] }, 2] }] },
                },
            },
        ];

        const result = await Submission.aggregate(pipeline).session(session).exec();
        if (result.length === 0) {
            console.warn(`No submissions found for student ${studentId} in term ${termId}, school ${schoolId}`);
        }
        await session.commitTransaction();
        return result.length > 0 ? result[0] : { results: [], totalScore: 0, average: 0 };
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}

// Helper function to generate report data for all students in a class
async function generateClassReportData(classId, academicYear, termId, schoolId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const pipeline = [
            {
                $match: {
                    status: 'graded',
                    isDeleted: false,
                },
            },
            {
                $lookup: {
                    from: 'enrollments',
                    localField: 'enrollment',
                    foreignField: '_id',
                    as: 'enrollmentDetails',
                },
            },
            {
                $unwind: '$enrollmentDetails',
            },
            {
                $match: {
                    'enrollmentDetails.class': new mongoose.Types.ObjectId(classId),
                    'enrollmentDetails.academicYear': Number(academicYear),
                    'enrollmentDetails.term': new mongoose.Types.ObjectId(termId),
                    'enrollmentDetails.school': new mongoose.Types.ObjectId(schoolId),
                    'enrollmentDetails.isActive': true,
                    'enrollmentDetails.isDeleted': false,
                },
            },
            {
                $lookup: {
                    from: 'exams',
                    localField: 'exam',
                    foreignField: '_id',
                    as: 'examDetails',
                    pipeline: [{ $project: { maxScore: 1, type: 1, subject: 1, school: 1 } }],
                },
            },
            {
                $unwind: '$examDetails',
            },
            {
                $lookup: {
                    from: 'subjects',
                    localField: 'examDetails.subject',
                    foreignField: '_id',
                    as: 'subjectDetails',
                },
            },
            {
                $unwind: '$subjectDetails',
            },
            {
                $match: {
                    'examDetails.school': new mongoose.Types.ObjectId(schoolId),
                },
            },
            {
                $group: {
                    _id: {
                        student: '$student',
                        subject: '$subjectDetails._id',
                    },
                    studentName: { $first: { $arrayElemAt: ['$enrollmentDetails.student.fullName', 0] } },
                    subjectName: { $first: '$subjectDetails.name' },
                    assessment1: { $max: { $cond: [{ $eq: ['$examDetails.type', 'assessment1'] }, '$totalScore', 0] } },
                    assessment2: { $max: { $cond: [{ $eq: ['$examDetails.type', 'assessment2'] }, '$totalScore', 0] } },
                    test: { $max: { $cond: [{ $eq: ['$examDetails.type', 'test'] }, '$totalScore', 0] } },
                    exam: { $max: { $cond: [{ $eq: ['$examDetails.type', 'exam'] }, '$totalScore', 0] } },
                    maxAssessment1: { $max: { $cond: [{ $eq: ['$examDetails.type', 'assessment1'] }, '$examDetails.maxScore', 0] } },
                    maxAssessment2: { $max: { $cond: [{ $eq: ['$examDetails.type', 'assessment2'] }, '$examDetails.maxScore', 0] } },
                    maxTest: { $max: { $cond: [{ $eq: ['$examDetails.type', 'test'] }, '$examDetails.maxScore', 0] } },
                    maxExam: { $max: { $cond: [{ $eq: ['$examDetails.type', 'exam'] }, '$examDetails.maxScore', 0] } },
                },
            },
            {
                $project: {
                    student: '$_id.student',
                    studentName: 1,
                    subject: '$_id.subject',
                    subjectName: 1,
                    scores: {
                        assessment1: '$assessment1',
                        assessment2: '$assessment2',
                        test: '$test',
                        exam: '$exam',
                    },
                    maxScores: {
                        assessment1: '$maxAssessment1',
                        assessment2: '$maxAssessment2',
                        test: '$maxTest',
                        exam: '$maxExam',
                    },
                    total: { $add: ['$assessment1', '$assessment2', '$test', '$exam'] },
                    percentage: {
                        $cond: [
                            { $gt: [{ $add: ['$assessment1', '$assessment2', '$test', '$exam'] }, 0] },
                            { $round: [{ $multiply: [{ $divide: [{ $add: ['$assessment1', '$assessment2', '$test', '$exam'] }, { $add: ['$maxAssessment1', '$maxAssessment2', '$maxTest', '$maxExam'] }] }, 100] }, 2] },
                            0,
                        ],
                    },
                    decision: {
                        $cond: [
                            { $gte: ['$percentage', 70] },
                            'Competent',
                            'Not Yet Competent',
                        ],
                    },
                },
            },
            {
                $group: {
                    _id: '$student',
                    studentName: { $first: '$studentName' },
                    results: { $push: { subject: '$subject', subjectName: '$subjectName', scores: '$scores', total: '$total', percentage: '$percentage', decision: '$decision' } },
                    totalScore: { $sum: '$total' },
                },
            },
            {
                $project: {
                    _id: 0,
                    student: '$_id',
                    studentName: 1,
                    results: 1,
                    totalScore: 1,
                    average: { $cond: [{ $eq: [{ $size: '$results' }, 0] }, 0, { $round: [{ $divide: ['$totalScore', { $size: '$results' }] }, 2] }] },
                },
            },
        ];

        const result = await Submission.aggregate(pipeline).session(session).exec();
        await session.commitTransaction();
        return result;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}

// Helper function to generate report data for all students in a term
async function generateTermReportData(academicYear, termId, schoolId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const pipeline = [
            {
                $match: {
                    status: 'graded',
                    isDeleted: false,
                },
            },
            {
                $lookup: {
                    from: 'enrollments',
                    localField: 'enrollment',
                    foreignField: '_id',
                    as: 'enrollmentDetails',
                },
            },
            {
                $unwind: '$enrollmentDetails',
            },
            {
                $match: {
                    'enrollmentDetails.academicYear': Number(academicYear),
                    'enrollmentDetails.term': new mongoose.Types.ObjectId(term greenId),
                    'enrollmentDetails.school': new mongoose.Types.ObjectId(schoolId),
                    'enrollmentDetails.isActive': true,
                    'enrollmentDetails.isDeleted': false,
                },
            },
            {
                $lookup: {
                    from: 'exams',
                    localField: 'exam',
                    foreignField: '_id',
                    as: 'examDetails',
                    pipeline: [{ $project: { maxScore: 1, type: 1, subject: 1, school: 1 } }],
                },
            },
            {
                $unwind: '$examDetails',
            },
            {
                $lookup: {
                    from: 'subjects',
                    localField: 'examDetails.subject',
                    foreignField: '_id',
                    as: 'subjectDetails',
                },
            },
            {
                $unwind: '$subjectDetails',
            },
            {
                $match: {
                    'examDetails.school': new mongoose.Types.ObjectId(schoolId),
                    share
                },
            },
            {
                $group: {
                    _id: {
                        student: '$student',
                        subject: '$subjectDetails._id',
                    },
                    studentName: { $first: { $arrayElemAt: ['$enrollmentDetails.student.fullName', 0] } },
                    subjectName: { $first: '$subjectDetails.name' },
                    assessment1: { $max: { $cond: [{ $eq: ['$examDetails.type', 'assessment1'] }, '$totalScore', 0] } },
                    assessment2: { $max: { $cond: [{ $eq: ['$examDetails.type', 'assessment2'] }, '$totalScore', 0] } },
                    test: { $max: { $cond: [{ $eq: ['$examDetails.type', 'test'] }, '$totalScore', 0] } },
                    exam: { $max: { $cond: [{ $eq: ['$examDetails.type', 'exam'] }, '$totalScore', 0] } },
                    maxAssessment1: { $max: { $cond: [{ $eq: ['$examDetails.type', 'assessment1'] }, '$examDetails.maxScore', 0] } },
                    maxAssessment2: { $max: { $cond: [{ $eq: ['$examDetails.type', 'assessment2'] }, '$examDetails.maxScore', 0] } },
                    maxTest: { $max: { $cond: [{ $eq: ['$examDetails.type', 'test'] }, '$examDetails.maxScore', 0] } },
                    maxExam: { $max: { $cond: [{ $eq: ['$examDetails.type', 'exam'] }, '$examDetails.maxScore', 0] } },
                },
            },
            {
                $project: {
                    student: '$_id.student',
                    studentName: 1,
                    subject: '$_id.subject',
                    subjectName: 1,
                    scores: {
                        assessment1: '$assessment1',
                        assessment2: '$assessment2',
                        test: '$test',
                        exam: '$exam',
                    },
                    maxScores: {
                        assessment1: '$maxAssessment1',
                        assessment2: '$maxAssessment2',
                        test: '$maxTest',
                        exam: '$maxExam',
                    },
                    total: { $add: ['$assessment1', '$assessment2', '$test', '$exam'] },
                    percentage: {
                        $cond: [
                            { $gt: [{ $add: ['$assessment1', '$assessment2', '$test', '$exam'] }, 0] },
                            { $round: [{ $multiply: [{ $divide: [{ $add: ['$assessment1', '$assessment2', '$test', '$exam'] }, { $add: ['$maxAssessment1', '$maxAssessment2', '$maxTest', '$maxExam'] }] }, 100] }, 2] },
                            0,
                        ],
                    },
                    decision: {
                        $cond: [
                            { $gte: ['$percentage', 70] },
                            'Competent',
                            'Not Yet Competent',
                        ],
                    },
                },
            },
            {
                $group: {
                    _id: '$student',
                    studentName: { $first: '$studentName' },
                    results: { $push: { subject: '$subject', subjectName: '$subjectName', scores: '$scores', total: '$total', percentage: '$percentage', decision: '$decision' } },
                    totalScore: { $sum: '$total' },
                },
            },
            {
                $project: {
                    _id: 0,
                    student: '$_id',
                    studentName: 1,
                    results: 1,
                    totalScore: 1,
                    average: { $cond: [{ $eq: [{ $size: '$results' }, 0] }, 0, { $round: [{ $divide: ['$totalScore', { $size: '$results' }] }, 2] }] },
                },
            },
        ];

        const result = await Submission.aggregate(pipeline).session(session).exec();
        await session.commitTransaction();
        return result;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}

// Helper function to generate report data for all students in a school
async function generateSchoolReportData(schoolId, academicYear) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const pipeline = [
            {
                $match: {
                    status: 'graded',
                    isDeleted: false,
                },
            },
            {
                $lookup: {
                    from: 'enrollments',
                    localField: 'enrollment',
                    foreignField: '_id',
                    as: 'enrollmentDetails',
                },
            },
            {
                $unwind: '$enrollmentDetails',
            },
            {
                $match: {
                    'enrollmentDetails.school': new mongoose.Types.ObjectId(schoolId),
                    'enrollmentDetails.academicYear': Number(academicYear),
                    'enrollmentDetails.isActive': true,
                    'enrollmentDetails.isDeleted': false,
                },
            },
            {
                $lookup: {
                    from: 'exams',
                    localField: 'exam',
                    foreignField: '_id',
                    as: 'examDetails',
                    pipeline: [{ $project: { maxScore: 1, type: 1, subject: 1, school: 1 } }],
                },
            },
            {
                $unwind: '$examDetails',
            },
            {
                $lookup: {
                    from: 'subjects',
                    localField: 'examDetails.subject',
                    foreignField: '_id',
                    as: 'subjectDetails',
                },
            },
            {
                $unwind: '$subjectDetails',
            },
            {
                $match: {
                    'examDetails.school': new mongoose.Types.ObjectId(schoolId),
                },
            },
            {
                $group: {
                    _id: {
                        student: '$student',
                        subject: '$subjectDetails._id',
                    },
                    studentName: { $first: { $arrayElemAt: ['$enrollmentDetails.student.fullName', 0] } },
                    subjectName: { $first: '$subjectDetails.name' },
                    assessment1: { $max: { $cond: [{ $eq: ['$examDetails.type', 'assessment1'] }, '$totalScore', 0] } },
                    assessment2: { $max: { $cond: [{ $eq: ['$examDetails.type', 'assessment2'] }, '$totalScore', 0] } },
                    test: { $max: { $cond: [{ $eq: ['$examDetails.type', 'test'] }, '$totalScore', 0] } },
                    exam: { $max: { $cond: [{ $eq: ['$examDetails.type', 'exam'] }, '$totalScore', 0] } },
                    maxAssessment1: { $max: { $cond: [{ $eq: ['$examDetails.type', 'assessment1'] }, '$examDetails.maxScore', 0] } },
                    maxAssessment2: { $max: { $cond: [{ $eq: ['$examDetails.type', 'assessment2'] }, '$examDetails.maxScore', 0] } },
                    maxTest: { $max: { $cond: [{ $eq: ['$examDetails.type', 'test'] }, '$examDetails.maxScore', 0] } },
                    maxExam: { $max: { $cond: [{ $eq: ['$examDetails.type', 'exam'] }, '$examDetails.maxScore', 0] } },
                },
            },
            {
                $project: {
                    student: '$_id.student',
                    studentName: 1,
                    subject: '$_id.subject',
                    subjectName: 1,
                    scores: {
                        assessment1: '$assessment1',
                        assessment2: '$assessment2',
                        test: '$test',
                        exam: '$exam',
                    },
                    maxScores: {
                        assessment1: '$maxAssessment1',
                        assessment2: '$maxAssessment2',
                        test: '$maxTest',
                        exam: '$maxExam',
                    },
                    total: { $add: ['$assessment1', '$assessment2', '$test', '$exam'] },
                    percentage: {
                        $cond: [
                            { $gt: [{ $add: ['$assessment1', '$assessment2', '$test', '$exam'] }, 0] },
                            { $round: [{ $multiply: [{ $divide: [{ $add: ['$assessment1', '$assessment2', '$test', '$exam'] }, { $add: ['$maxAssessment1', '$maxAssessment2', '$maxTest', '$maxExam'] }] }, 100] }, 2] },
                            0,
                        ],
                    },
                    decision: {
                        $cond: [
                            { $gte: ['$percentage', 70] },
                            'Competent',
                            'Not Yet Competent',
                        ],
                    },
                },
            },
            {
                $group: {
                    _id: '$student',
                    studentName: { $first: '$studentName' },
                    results: { $push: { subject: '$subject', subjectName: '$subjectName', scores: '$scores', total: '$total', percentage: '$percentage', decision: '$decision' } },
                    totalScore: { $sum: '$total' },
                },
            },
            {
                $project: {
                    _id: 0,
                    student: '$_id',
                    studentName: 1,
                    results: 1,
                    totalScore: 1,
                    average: { $cond: [{ $eq: [{ $size: '$results' }, 0] }, 0, { $round: [{ $divide: ['$totalScore', { $size: '$results' }] }, 2] }] },
                },
            },
        ];

        const result = await Submission.aggregate(pipeline).session(session).exec();
        await session.commitTransaction();
        return result;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}

// Helper function to generate report data for all students in a subject
async function generateSubjectReportData(subjectId, academicYear, termId, schoolId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const pipeline = [
            {
                $match: {
                    status: 'graded',
                    isDeleted: false,
                },
            },
            {
                $lookup: {
                    from: 'exams',
                    localField: 'exam',
                    foreignField: '_id',
                    as: 'examDetails',
                    pipeline: [{ $project: { maxScore: 1, type: 1, subject: 1, school: 1 } }],
                },
            },
            {
                $unwind: '$examDetails',
            },
            {
                $match: {
                    'examDetails.subject': new mongoose.Types.ObjectId(subjectId),
                    'examDetails.school': new mongoose.Types.ObjectId(schoolId),
                },
            },
            {
                $lookup: {
                    from: 'enrollments',
                    localField: 'enrollment',
                    foreignField: '_id',
                    as: 'enrollmentDetails',
                },
            },
            {
                $unwind: '$enrollmentDetails',
            },
            {
                $match: {
                    'enrollmentDetails.academicYear': Number(academicYear),
                    'enrollmentDetails.term': new mongoose.Types.ObjectId(termId),
                    'enrollmentDetails.school': new mongoose.Types.ObjectId(schoolId),
                    'enrollmentDetails.isActive': true,
                    'enrollmentDetails.isDeleted': false,
                },
            },
            {
                $lookup: {
                    from: 'subjects',
                    localField: 'examDetails.subject',
                    foreignField: '_id',
                    as: 'subjectDetails',
                },
            },
            {
                $unwind: '$subjectDetails',
            },
            {
                $group: {
                    _id: {
                        student: '$student',
                        subject: '$subjectDetails._id',
                    },
                    studentName: { $first: { $arrayElemAt: ['$enrollmentDetails.student.fullName', 0] } },
                    subjectName: { $first: '$subjectDetails.name' },
                    assessment1: { $max: { $cond: [{ $eq: ['$examDetails.type', 'assessment1'] }, '$totalScore', 0] } },
                    assessment2: { $max: { $cond: [{ $eq: ['$examDetails.type', 'assessment2'] }, '$totalScore', 0] } },
                    test: { $max: { $cond: [{ $eq: ['$examDetails.type', 'test'] }, '$totalScore', 0] } },
                    exam: { $max: { $cond: [{ $eq: ['$examDetails.type', 'exam'] }, '$totalScore', 0] } },
                    maxAssessment1: { $max: { $cond: [{ $eq: ['$examDetails.type', 'assessment1'] }, '$examDetails.maxScore', 0] } },
                    maxAssessment2: { $max: { $cond: [{ $eq: ['$examDetails.type', 'assessment2'] }, '$examDetails.maxScore', 0] } },
                    maxTest: { $max: { $cond: [{ $eq: ['$examDetails.type', 'test'] }, '$examDetails.maxScore', 0] } },
                    maxExam: { $max: { $cond: [{ $eq: ['$examDetails.type', 'exam'] }, '$examDetails.maxScore', 0] } },
                },
            },
            {
                $project: {
                    student: '$_id.student',
                    studentName: 1,
                    subject: '$_id.subject',
                    subjectName: 1,
                    scores: {
                        assessment1: '$assessment1',
                        assessment2: '$assessment2',
                        test: '$test',
                        exam: '$exam',
                    },
                    maxScores: {
                        assessment1: '$maxAssessment1',
                        assessment2: '$maxAssessment2',
                        test: '$maxTest',
                        exam: '$maxExam',
                    },
                    total: { $add: ['$assessment1', '$assessment2', '$test', '$exam'] },
                    percentage: {
                        $cond: [
                            { $gt: [{ $add: ['$assessment1', '$assessment2', '$test', '$exam'] }, 0] },
                            { $round: [{ $multiply: [{ $divide: [{ $add: ['$assessment1', '$assessment2', '$test', '$exam'] }, { $add: ['$maxAssessment1', '$maxAssessment2', '$maxTest', '$maxExam'] }] }, 100] }, 2] },
                            0,
                        ],
                    },
                    decision: {
                        $cond: [
                            { $gte: ['$percentage', 70] },
                            'Competent',
                            'Not Yet Competent',
                        ],
                    },
                },
            },
            {
                $group: {
                    _id: '$student',
                    studentName: { $first: '$studentName' },
                    results: { $push: { subject: '$subject', subjectName: '$subjectName', scores: '$scores', total: '$total', percentage: '$percentage', decision: '$decision' } },
                    totalScore: { $sum: '$total' },
                },
            },
            {
                $project: {
                    _id: 0,
                    student: '$_id',
                    studentName: 1,
                    results: 1,
                    totalScore: 1,
                    average: { $cond: [{ $eq: [{ $size: '$results' }, 0] }, 0, { $round: [{ $divide: ['$totalScore', { $size: '$results' }] }, 2] }] },
                },
            },
        ];

        const result = await Submission.aggregate(pipeline).session(session).exec();
        await session.commitTransaction();
        return result;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}

// Helper function to generate report data for all students in a trade
async function generateTradeReportData(tradeId, academicYear, termId, schoolId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const pipeline = [
            {
                $match: {
                    status: 'graded',
                    isDeleted: false,
                },
            },
            {
                $lookup: {
                    from: 'enrollments',
                    localField: 'enrollment',
                    foreignField: '_id',
                    as: 'enrollmentDetails',
                },
            },
            {
                $unwind: '$enrollmentDetails',
            },
            {
                $lookup: {
                    from: 'classes',
                    localField: 'enrollmentDetails.class',
                    foreignField: '_id',
                    as: 'classDetails',
                },
            },
            {
                $unwind: '$classDetails',
            },
            {
                $match: {
                    'classDetails.trade': new mongoose.Types.ObjectId(tradeId),
                    'classDetails.school': new mongoose.Types.ObjectId(schoolId),
                    'enrollmentDetails.academicYear': Number(academicYear),
                    'enrollmentDetails.term': new mongoose.Types.ObjectId(termId),
                    'enrollmentDetails.school': new mongoose.Types.ObjectId(schoolId),
                    'enrollmentDetails.isActive': true,
                    'enrollmentDetails.isDeleted': false,
                },
            },
            {
                $lookup: {
                    from: 'exams',
                    localField: 'exam',
                    foreignField: '_id',
                    as: 'examDetails',
                    pipeline: [{ $project: { maxScore: 1, type: 1, subject: 1, school: 1 } }],
                },
            },
            {
                $unwind: '$examDetails',
            },
            {
                $lookup: {
                    from: 'subjects',
                    localField: 'examDetails.subject',
                    foreignField: '_id',
                    as: 'subjectDetails',
                },
            },
            {
                $unwind: '$subjectDetails',
            },
            {
                $match: {
                    'examDetails.school': new mongoose.Types.ObjectId(schoolId),
                },
            },
            {
                $group: {
                    _id: {
                        student: '$student',
                        subject: '$subjectDetails._id',
                    },
                    studentName: { $first: { $arrayElemAt: ['$enrollmentDetails.student.fullName', 0] } },
                    subjectName: { $first: '$subjectDetails.name' },
                    assessment1: { $max: { $cond: [{ $eq: ['$examDetails.type', 'assessment1'] }, '$totalScore', 0] } },
                    assessment2: { $max: { $cond: [{ $eq: ['$examDetails.type', 'assessment2'] }, '$totalScore', 0] } },
                    test: { $max: { $cond: [{ $eq: ['$examDetails.type', 'test'] }, '$totalScore', 0] } },
                    exam: { $max: { $cond: [{ $eq: ['$examDetails.type', 'exam'] }, '$totalScore', 0] } },
                    maxAssessment1: { $max: { $cond: [{ $eq: ['$examDetails.type', 'assessment1'] }, '$examDetails.maxScore', 0] } },
                    maxAssessment2: { $max: { $cond: [{ $eq: ['$examDetails.type', 'assessment2'] }, '$examDetails.maxScore', 0] } },
                    maxTest: { $max: { $cond: [{ $eq: ['$examDetails.type', 'test'] }, '$examDetails.maxScore', 0] } },
                    maxExam: { $max: { $cond: [{ $eq: ['$examDetails.type', 'exam'] }, '$examDetails.maxScore', 0] } },
                },
            },
            {
                $project: {
                    student: '$_id.student',
                    studentName: 1,
                    subject: '$_id.subject',
                    subjectName: 1,
                    scores: {
                        assessment1: '$assessment1',
                        assessment2: '$assessment2',
                        test: '$test',
                        exam: '$exam',
                    },
                    maxScores: {
                        assessment1: '$maxAssessment1',
                        assessment2: '$maxAssessment2',
                        test: '$maxTest',
                        exam: '$maxExam',
                    },
                    total: { $add: ['$assessment1', '$assessment2', '$test', '$exam'] },
                    percentage: {
                        $cond: [
                            { $gt: [{ $add: ['$assessment1', '$assessment2', '$test', '$exam'] }, 0] },
                            { $round: [{ $multiply: [{ $divide: [{ $add: ['$assessment1', '$assessment2', '$test', '$exam'] }, { $add: ['$maxAssessment1', '$maxAssessment2', '$maxTest', '$maxExam'] }] }, 100] }, 2] },
                            0,
                        ],
                    },
                    decision: {
                        $cond: [
                            { $gte: ['$percentage', 70] },
                            'Competent',
                            'Not Yet Competent',
                        ],
                    },
                },
            },
            {
                $group: {
                    _id: '$student',
                    studentName: { $first: '$studentName' },
                    results: { $push: { subject: '$subject', subjectName: '$subjectName', scores: '$scores', total: '$total', percentage: '$percentage', decision: '$decision' } },
                    totalScore: { $sum: '$total' },
                },
            },
            {
                $project: {
                    _id: 0,
                    student: '$_id',
                    studentName: 1,
                    results: 1,
                    totalScore: 1,
                    average: { $cond: [{ $eq: [{ $size: '$results' }, 0] }, 0, { $round: [{ $divide: ['$totalScore', { $size: '$results' }] }, 2] }] },
                },
            },
        ];

        const result = await Submission.aggregate(pipeline).session(session).exec();
        await session.commitTransaction();
        return result;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}

// Helper function to generate promotion eligibility report
async function generatePromotionEligibilityReport(schoolId, academicYear) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const enrollments = await Enrollment.find({
            school: schoolId,
            academicYear: Number(academicYear),
            isActive: true,
            isDeleted: false,
        }).populate('student', 'fullName class').session(session);

        const report = await Promise.all(enrollments.map(async (enrollment) => {
            const reportCard = await ReportCard.findOne({
                student: enrollment.student._id,
                class: enrollment.class._id,
                academicYear: Number(academicYear),
                school: schoolId,
                isDeleted: false,
            }).session(session);
            const promotionStatus = reportCard && reportCard.average >= 50 ? 'Eligible' : 'Not Eligible';
            return {
                student: enrollment.student._id,
                studentName: enrollment.student.fullName,
                class: enrollment.class.className,
                promotionStatus,
                academicYear: enrollment.academicYear,
                term: enrollment.term,
            };
        }));

        await session.commitTransaction();
        return report;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}

// Helper function to generate teacher performance report data
async function generateTeacherPerformanceReport(schoolId, academicYear, termId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const pipeline = [
            {
                $match: {
                    status: 'graded',
                    isDeleted: false,
                },
            },
            {
                $lookup: {
                    from: 'exams',
                    localField: 'exam',
                    foreignField: '_id',
                    as: 'examDetails',
                },
            },
            {
                $unwind: '$examDetails',
            },
            {
                $lookup: {
                    from: 'subjects',
                    localField: 'examDetails.subject',
                    foreignField: '_id',
                    as: 'subjectDetails',
                },
            },
            {
                $unwind: '$subjectDetails',
            },
            {
                $lookup: {
                    from: 'enrollments',
                    localField: 'enrollment',
                    foreignField: '_id',
                    as: 'enrollmentDetails',
                },
            },
            {
                $unwind: '$enrollmentDetails',
            },
            {
                $match: {
                    'enrollmentDetails.school': new mongoose.Types.ObjectId(schoolId),
                    'enrollmentDetails.academicYear': Number(academicYear),
                    'enrollmentDetails.term': new mongoose.Types.ObjectId(termId),
                    'enrollmentDetails.isActive': true,
                    'enrollmentDetails.isDeleted': false,
                },
            },
            {
                $match: {
                    'examDetails.school': new mongoose.Types.ObjectId(schoolId),
                    'subjectDetails.school': new mongoose.Types.ObjectId(schoolId),
                },
            },
            {
                $group: {
                    _id: { $ifNull: ['$subjectDetails.teacher', new mongoose.Types.ObjectId()] },
                    teacherName: { $first: { $ifNull: [{ $arrayElemAt: ['$subjectDetails.teacher.fullName', 0] }, 'Unassigned'] } },
                    totalStudents: { $sum: 1 },
                    averageScore: { $avg: '$totalScore' },
                    competentCount: {
                        $sum: {
                            $cond: [
                                { $gte: ['$totalScore', 70] },
                                1,
                                0,
                            ],
                        },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    teacher: '$_id',
                    teacherName: 1,
                    totalStudents: 1,
                    averageScore: { $round: ['$averageScore', 2] },
                    competencyRate: { $multiply: [{ $divide: ['$competentCount', '$totalStudents'] }, 100] },
                },
            },
        ];

        const result = await Submission.aggregate(pipeline).session(session).exec();
        await session.commitTransaction();
        return result;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}

// Helper function to rank students or teachers
async function rankItems(items, scopeField) {
    try {
        const validItems = items.filter(item => (item.totalScore !== undefined || item.averageScore !== undefined) && (item.totalScore !== null || item.averageScore !== null));
        validItems.sort((a, b) => {
            const aScore = a.totalScore !== undefined ? a.totalScore : a.averageScore;
            const bScore = b.totalScore !== undefined ? b.totalScore : b.averageScore;
            return bScore - aScore;
        });

        let currentRank = 0;
        let lastScore = null;
        let sameRankCount = 0;

        for (let i = 0; i < validItems.length; i++) {
            const item = validItems[i];
            const score = item.totalScore !== undefined ? item.totalScore : item.averageScore;
            if (score !== lastScore) {
                currentRank = i + 1;
                lastScore = score;
                sameRankCount = 1;
            } else {
                sameRankCount++;
            }
            item.rank = currentRank;
            await item.save();
        }
    } catch (error) {
        console.error(`Error ranking ${scopeField}:`, error);
        throw error;
    }
}

// Main function to generate report for a single student
async function generateSingleStudentReport(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { studentId, academicYear, termId, schoolId } = req.body;

        const school = await School.findById(schoolId).select('name').session(session);
        if (!school) {
            return res.status(400).json({ message: 'Invalid school.' });
        }

        const student = await User.findOne({ _id: studentId, school: schoolId, role: 'student' }).session(session);
        if (!student) {
            return res.status(400).json({ message: 'Invalid student or not associated with the school.' });
        }

        const term = await Term.findOne({ _id: termId, school: schoolId }).select('termNumber academicYear startDate endDate').session(session);
        if (!term) {
            return res.status(400).json({ message: 'Invalid term or not associated with the school.' });
        }
        const currentDate = new Date('2025-07-21T16:35:00Z');
        if (Number(academicYear) !== term.academicYear || currentDate < term.startDate || currentDate > term.endDate) {
            return res.status(400).json({ message: 'Term and academic year mismatch or invalid date range.' });
        }

        const enrollment = await Enrollment.findOne({
            student: studentId,
            academicYear: Number(academicYear),
            term: termId,
            school: schoolId,
            isActive: true,
            isDeleted: false,
        }).populate('class').session(session);

        if (!enrollment) {
            return res.status(404).json({ message: 'No active enrollment found.' });
        }

        const studentClass = enrollment.class;
        const reportData = await generateStudentReportData(studentId, academicYear, termId, schoolId);

        const reportCardData = {
            student: student._id,
            class: studentClass._id,
            academicYear: Number(academicYear),
            term: term._id,
            school: schoolId,
            results: reportData.results,
            totalScore: reportData.totalScore,
            average: reportData.average,
            remarks: 'Generated for single student.',
            isDeleted: false,
        };

        let reportCard;
        const existingReportCard = await ReportCard.findOne({
            student: student._id,
            class: studentClass._id,
            academicYear: Number(academicYear),
            term: term._id,
            school: schoolId,
            isDeleted: false,
        }).session(session);

        if (existingReportCard) {
            existingReportCard.set(reportCardData);
            reportCard = await existingReportCard.save({ session });
        } else {
            reportCard = await ReportCard.create([reportCardData], { session });
            reportCard = reportCard[0]; // Get the first (and only) created document
        }

        await rankItems([reportCard], 'student');

        const finalReportCard = await ReportCard.findById(reportCard._id)
            .populate('class')
            .populate('term')
            .populate('results.subject')
            .populate('student', 'fullName')
            .session(session);

        await session.commitTransaction();
        return res.status(200).json({
            message: 'Single student report card generated successfully.',
            reportCard: finalReportCard,
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Error generating single student report:', error);
        return res.status(500).json({ message: 'Internal server error' });
    } finally {
        session.endSession();
    }
}

// Main function to generate report for all students in a class
async function generateClassReport(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { classId, academicYear, termId, schoolId } = req.body;

        const school = await School.findById(schoolId).select('name').session(session);
        if (!school) {
            return res.status(400).json({ message: 'Invalid school.' });
        }

        const classDoc = await Class.findOne({ _id: classId, school: schoolId }).select('school').session(session);
        if (!classDoc) {
            return res.status(400).json({ message: 'Invalid class or not associated with the school.' });
        }

        const term = await Term.findOne({ _id: termId, school: schoolId }).select('termNumber academicYear startDate endDate').session(session);
        if (!term) {
            return res.status(400).json({ message: 'Invalid term or not associated with the school.' });
        }
        const currentDate = new Date('2025-07-21T16:35:00Z');
        if (Number(academicYear) !== term.academicYear || currentDate < term.startDate || currentDate > term.endDate) {
            return res.status(400).json({ message: 'Term and academic year mismatch or invalid date range.' });
        }

        const reportData = await generateClassReportData(classId, academicYear, termId, schoolId);

        const bulkOps = reportData.map(studentReport => {
            const reportCardData = {
                student: studentReport.student,
                class: classId,
                academicYear: Number(academicYear),
                term: termId,
                school: schoolId,
                results: studentReport.results,
                totalScore: studentReport.totalScore,
                average: studentReport.average,
                remarks: 'Generated for class report.',
                isDeleted: false,
            };
            return {
                updateOne: {
                    filter: {
                        student: studentReport.student,
                        class: classId,
                        academicYear: Number(academicYear),
                        term: termId,
                        school: schoolId,
                        isDeleted: false,
                    },
                    update: { $set: reportCardData },
                    upsert: true,
                },
            };
        });

        await ReportCard.bulkWrite(bulkOps, { session });

        const reportCards = await ReportCard.find({
            class: classId,
            academicYear: Number(academicYear),
            term: termId,
            school: schoolId,
            isDeleted: false,
        }).session(session);

        await rankItems(reportCards, 'class');

        const finalReportCards = await ReportCard.find({
            class: classId,
            academicYear: Number(academicYear),
            term: termId,
            school: schoolId,
            isDeleted: false,
        })
            .populate('class')
            .populate('term')
            .populate('results.subject')
            .populate('student', 'fullName')
            .session(session);

        await session.commitTransaction();
        return res.status(200).json({
            message: 'Class report cards generated successfully.',
            reportCards: finalReportCards,
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Error generating class report:', error);
        return res.status(500).json({ message: 'Internal server error' });
    } finally {
        session.endSession();
    }
}

// Main function to generate report for all students in a term
async function generateTermReport(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { academicYear, termId, schoolId } = req.body;

        const school = await School.findById(schoolId).select('name').session(session);
        if (!school) {
            return res.status(400).json({ message: 'Invalid school.' });
        }

        const term = await Term.findOne({ _id: termId, school: schoolId }).select('termNumber academicYear startDate endDate').session(session);
        if (!term) {
            return res.status(400).json({ message: 'Invalid term or not associated with the school.' });
        }
        const currentDate = new Date('2025-07-21T16:35:00Z');
        if (Number(academicYear) !== term.academicYear || currentDate < term.startDate || currentDate > term.endDate) {
            return res.status(400).json({ message: 'Term and academic year mismatch or invalid date range.' });
        }

        const reportData = await generateTermReportData(academicYear, termId, schoolId);

        const bulkOps = [];
        for (const studentReport of reportData) {
            const enrollment = await Enrollment.findOne({
                student: studentReport.student,
                academicYear: Number(academicYear),
                term: termId,
                school: schoolId,
                isActive: true,
                isDeleted: false,
            }).populate('class').session(session);

            if (enrollment) {
                const reportCardData = {
                    student: studentReport.student,
                    class: enrollment.class._id,
                    academicYear: Number(academicYear),
                    term: termId,
                    school: schoolId,
                    results: studentReport.results,
                    totalScore: studentReport.totalScore,
                    average: studentReport.average,
                    remarks: 'Generated for term report.',
                    isDeleted: false,
                };
                bulkOps.push({
                    updateOne: {
                        filter: {
                            student: studentReport.student,
                            class: enrollment.class._id,
                            academicYear: Number(academicYear),
                            term: termId,
                            school: schoolId,
                            isDeleted: false,
                        },
                        update: { $set: reportCardData },
                        upsert: true,
                    },
                });
            }
        }

        await ReportCard.bulkWrite(bulkOps, { session });

        const reportCards = await ReportCard.find({
            academicYear: Number(academicYear),
            term: termId,
            school: schoolId,
            isDeleted: false,
        }).session(session);

        await rankItems(reportCards, 'term');

        const finalReportCards = await ReportCard.find({
            academicYear: Number(academicYear),
            term: termId,
            school: schoolId,
            isDeleted: false,
        })
            .populate('class')
            .populate('term')
            .populate('results.subject')
            .populate('student', 'fullName')
            .session(session);

        await session.commitTransaction();
        return res.status(200).json({
            message: 'Term report cards generated successfully.',
            reportCards: finalReportCards,
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Error generating term report:', error);
        return res.status(500).json({ message: 'Internal server error' });
    } finally {
        session.endSession();
    }
}

// Main function to generate report for all students in a school
async function generateSchoolReport(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { schoolId, academicYear } = req.body;

        const school = await School.findById(schoolId).select('name').session(session);
        if (!school) {
            return res.status(400).json({ message: 'Invalid school.' });
        }

        const reportData = await generateSchoolReportData(schoolId, academicYear);

        const bulkOps = [];
        for (const studentReport of reportData) {
            const enrollment = await Enrollment.findOne({
                student: studentReport.student,
                academicYear: Number(academicYear),
                school: schoolId,
                isActive: true,
                isDeleted: false,
            }).populate('class term').session(session);

            if (enrollment) {
                const reportCardData = {
                    student: studentReport.student,
                    class: enrollment.class._id,
                    academicYear: Number(academicYear),
                    term: enrollment.term._id,
                    school: schoolId,
                    results: studentReport.results,
                    totalScore: studentReport.totalScore,
                    average: studentReport.average,
                    remarks: 'Generated for school report.',
                    isDeleted: false,
                };
                bulkOps.push({
                    updateOne: {
                        filter: {
                            student: studentReport.student,
                            class: enrollment.class._id,
                            academicYear: Number(academicYear),
                            term: enrollment.term._id,
                            school: schoolId,
                            isDeleted: false,
                        },
                        update: { $set: reportCardData },
                        upsert: true,
                    },
                });
            }
        }

        await ReportCard.bulkWrite(bulkOps, { session });

        const reportCards = await ReportCard.find({
            school: schoolId,
            academicYear: Number(academicYear),
            isDeleted: false,
        }).session(session);

        await rankItems(reportCards, 'school');

        const finalReportCards = await ReportCard.find({
            school: schoolId,
            academicYear: Number(academicYear),
            isDeleted: false,
        })
            .populate('class')
            .populate('term')
            .populate('results.subject')
            .populate('student', 'fullName')
            .session(session);

        await session.commitTransaction();
        return res.status(200).json({
            message: 'School report cards generated successfully.',
            reportCards: finalReportCards,
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Error generating school report:', error);
        return res.status(500).json({ message: 'Internal server error' });
    } finally {
        session.endSession();
    }
}

// Main function to generate report for all students in a subject
async function generateSubjectReport(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { subjectId, academicYear, termId, schoolId } = req.body;

        const school = await School.findById(schoolId).select('name').session(session);
        if (!school) {
            return res.status(400).json({ message: 'Invalid school.' });
        }

        const subject = await Subject.findOne({ _id: subjectId, school: schoolId }).select('name').session(session);
        if (!subject) {
            return res.status(400).json({ message: 'Invalid subject or not associated with the school.' });
        }

        const term = await Term.findOne({ _id: termId, school: schoolId }).select('termNumber academicYear startDate endDate').session(session);
        if (!term || Number(academicYear) !== term.academicYear || new Date('2025-07-21T16:35:00Z') < term.startDate || new Date('2025-07-21T16:35:00Z') > term.endDate) {
            return res.status(400).json({ message: 'Invalid term or mismatch with academic year.' });
        }

        const reportData = await generateSubjectReportData(subjectId, academicYear, termId, schoolId);

        const bulkOps = [];
        for (const studentReport of reportData) {
            const enrollment = await Enrollment.findOne({
                student: studentReport.student,
                academicYear: Number(academicYear),
                term: termId,
                school: schoolId,
                isActive: true,
                isDeleted: false,
            }).populate('class').session(session);

            if (enrollment) {
                const reportCardData = {
                    student: studentReport.student,
                    class: enrollment.class._id,
                    academicYear: Number(academicYear),
                    term: termId,
                    school: schoolId,
                    results: studentReport.results,
                    totalScore: studentReport.totalScore,
                    average: studentReport.average,
                    remarks: 'Generated for subject report.',
                    isDeleted: false,
                };
                bulkOps.push({
                    updateOne: {
                        filter: {
                            student: studentReport.student,
                            class: enrollment.class._id,
                            academicYear: Number(academicYear),
                            term: termId,
                            school: schoolId,
                            isDeleted: false,
                        },
                        update: { $set: reportCardData },
                        upsert: true,
                    },
                });
            }
        }

        await ReportCard.bulkWrite(bulkOps, { session });

        const reportCards = await ReportCard.find({
            'results.subject': subjectId,
            academicYear: Number(academicYear),
            term: termId,
            school: schoolId,
            isDeleted: false,
        }).session(session);

        await rankItems(reportCards, 'subject');

        const finalReportCards = await ReportCard.find({
            'results.subject': subjectId,
            academicYear: Number(academicYear),
            term: termId,
            school: schoolId,
            isDeleted: false,
        })
            .populate('class')
            .populate('term')
            .populate('results.subject')
            .populate('student', 'fullName')
            .session(session);

        await session.commitTransaction();
        return res.status(200).json({
            message: 'Subject report cards generated successfully.',
            reportCards: finalReportCards,
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Error generating subject report:', error);
        return res.status(500).json({ message: 'Internal server error' });
    } finally {
        session.endSession();
    }
}

// Main function to generate report for all students in a trade
async function generateTradeReport(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { tradeId, academicYear, termId, schoolId } = req.body;

        const school = await School.findById(schoolId).select('name').session(session);
        if (!school) {
            return res.status(400).json({ message: 'Invalid school.' });
        }

        const trade = await Trade.findOne({ _id: tradeId, school: schoolId }).select('name').session(session);
        if (!trade) {
            return res.status(400).json({ message: 'Invalid trade or not associated with the school.' });
        }

        const term = await Term.findOne({ _id: termId, school: schoolId }).select('termNumber academicYear startDate endDate').session(session);
        if (!term || Number(academicYear) !== term.academicYear || new Date('2025-07-21T16:35:00Z') < term.startDate || new Date('2025-07-21T16:35:00Z') > term.endDate) {
            return res.status(400).json({ message: 'Invalid term or mismatch with academic year.' });
        }

        const reportData = await generateTradeReportData(tradeId, academicYear, termId, schoolId);

        const bulkOps = [];
        for (const studentReport of reportData) {
            const enrollment = await Enrollment.findOne({
                student: studentReport.student,
                academicYear: Number(academicYear),
                term: termId,
                school: schoolId,
                isActive: true,
                isDeleted: false,
            }).populate('class').session(session);

            if (enrollment) {
                const reportCardData = {
                    student: studentReport.student,
                    class: enrollment.class._id,
                    academicYear: Number(academicYear),
                    term: termId,
                    school: schoolId,
                    results: studentReport.results,
                    totalScore: studentReport.totalScore,
                    average: studentReport.average,
                    remarks: 'Generated for trade report.',
                    isDeleted: false,
                };
                bulkOps.push({
                    updateOne: {
                        filter: {
                            student: studentReport.student,
                            class: enrollment.class._id,
                            academicYear: Number(academicYear),
                            term: termId,
                            school: schoolId,
                            isDeleted: false,
                        },
                        update: { $set: reportCardData },
                        upsert: true,
                    },
                });
            }
        }

        await ReportCard.bulkWrite(bulkOps, { session });

        const reportCards = await ReportCard.find({
            class: { $in: await Class.find({ trade: tradeId, school: schoolId }).distinct('_id').session(session) },
            academicYear: Number(academicYear),
            term: termId,
            school: schoolId,
            isDeleted: false,
        }).session(session);

        await rankItems(reportCards, 'trade');

        const finalReportCards = await ReportCard.find({
            class: { $in: await Class.find({ trade: tradeId, school: schoolId }).distinct('_id').session(session) },
            academicYear: Number(academicYear),
            term: termId,
            school: schoolId,
            isDeleted: false,
        })
            .populate('class')
            .populate('term')
            .populate('results.subject')
            .populate('student', 'fullName')
            .session(session);

        await session.commitTransaction();
        return res.status(200).json({
            message: 'Trade report cards generated successfully.',
            reportCards: finalReportCards,
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Error generating trade report:', error);
        return res.status(500).json({ message: 'Internal server error' });
    } finally {
        session.endSession();
    }
}

// Main function to generate promotion eligibility report
async function generatePromotionReport(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { schoolId, academicYear } = req.body;

        const school = await School.findById(schoolId).select('name').session(session);
        if (!school) {
            return res.status(400).json({ message: 'Invalid school.' });
        }

        const reportData = await generatePromotionEligibilityReport(schoolId, academicYear);

        await session.commitTransaction();
        return res.status(200).json({
            message: 'Promotion eligibility report generated successfully.',
            report: reportData,
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Error generating promotion report:', error);
        return res.status(500).json({ message: 'Internal server error' });
    } finally {
        session.endSession();
    }
}

// Main function to generate teacher performance report
async function generateTeacherReport(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { schoolId, academicYear, termId } = req.body;

        const school = await School.findById(schoolId).select('name').session(session);
        if (!school) {
            return res.status(400).json({ message: 'Invalid school.' });
        }

        const term = await Term.findOne({ _id: termId, school: schoolId }).select('termNumber academicYear startDate endDate').session(session);
        if (!term || Number(academicYear) !== term.academicYear || new Date('2025-07-21T16:35:00Z') < term.startDate || new Date('2025-07-21T16:35:00Z') > term.endDate) {
            return res.status(400).json({ message: 'Invalid term or mismatch with academic year.' });
        }

        const reportData = await generateTeacherPerformanceReport(schoolId, academicYear, termId);

        const bulkOps = reportData.map(teacherReport => {
            return {
                updateOne: {
                    filter: {
                        _id: teacherReport.teacher,
                        school: schoolId,
                        role: 'teacher',
                        isDeleted: false,
                    },
                    update: {
                        $set: {
                            averageScore: teacherReport.averageScore,
                            competencyRate: teacherReport.competencyRate,
                            totalStudents: teacherReport.totalStudents,
                            remarks: 'Generated for teacher performance.',
                            isDeleted: false,
                        },
                    },
                    upsert: true,
                },
            };
        });

        await User.bulkWrite(bulkOps, { session });

        const teacherReports = await User.find({
            school: schoolId,
            role: 'teacher',
            isDeleted: false,
        }).session(session);

        await rankItems(teacherReports, 'teacher');

        const finalTeacherReports = await User.find({
            school: schoolId,
            role: 'teacher',
            isDeleted: false,
        }).select('fullName averageScore competencyRate totalStudents rank remarks').session(session);

        await session.commitTransaction();
        return res.status(200).json({
            message: 'Teacher performance report generated successfully.',
            report: finalTeacherReports,
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Error generating teacher report:', error);
        return res.status(500).json({ message: 'Internal server error' });
    } finally {
        session.endSession();
    }
}

// Main function to create a new report card record
async function createReportCard(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { studentId, classId, academicYear, termId, schoolId, results } = req.body;

        const school = await School.findById(schoolId).select('name').session(session);
        if (!school) {
            return res.status(400).json({ message: 'Invalid school.' });
        }

        const student = await User.findOne({ _id: studentId, school: schoolId, role: 'student' }).session(session);
        if (!student) {
            return res.status(400).json({ message: 'Invalid student or not associated with the school.' });
        }

        const classDoc = await Class.findOne({ _id: classId, school: schoolId }).session(session);
        if (!classDoc) {
            return res.status(400).json({ message: 'Invalid class or not associated with the school.' });
        }

        const term = await Term.findOne({ _id: termId, school: schoolId }).session(session);
        if (!term) {
            return res.status(400).json({ message: 'Invalid term or not associated with the school.' });
        }

        if (!Array.isArray(results)) {
            return res.status(400).json({ message: 'Results must be an array.' });
        }

        const validatedResults = [];
        let totalScore = 0;
        for (const result of results) {
            const subject = await Subject.findOne({ _id: result.subject, school: schoolId }).session(session);
            if (!subject) {
                return res.status(400).json({ message: `Invalid subject ${result.subject} or not associated with the school.` });
            }

            const { assessment1 = 0, assessment2 = 0, test = 0, exam = 0 } = result.scores || {};
            const total = assessment1 + assessment2 + test + exam;
            const maxTotal = (result.maxScores?.assessment1 || 100) + (result.maxScores?.assessment2 || 100) + (result.maxScores?.test || 100) + (result.maxScores?.exam || 100);
            const percentage = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
            const decision = percentage >= 70 ? 'Competent' : 'Not Yet Competent';

            validatedResults.push({
                subject: result.subject,
                subjectName: subject.name,
                scores: { assessment1, assessment2, test, exam },
                total,
                percentage,
                decision,
            });
            totalScore += total;
        }

        const average = validatedResults.length ? Math.round(totalScore / validatedResults.length) : 0;

        const reportCardData = {
            student: studentId,
            class: classId,
            academicYear: Number(academicYear),
            term: termId,
            school: schoolId,
            results: validatedResults,
            totalScore,
            average,
            remarks: 'Manually created report card.',
            isDeleted: false,
        };

        const reportCard = await ReportCard.create([reportCardData], { session });

        const classReportCards = await ReportCard.find({
            class: classId,
            academicYear: Number(academicYear),
            term: termId,
            school: schoolId,
            isDeleted: false,
        }).session(session);

        await rankItems([...classReportCards, reportCard[0]], 'class');

        const finalReportCard = await ReportCard.findById(reportCard[0]._id)
            .populate('class')
            .populate('term')
            .populate('results.subject')
            .populate('student', 'fullName')
            .session(session);

        await session.commitTransaction();
        return res.status(201).json({
            message: 'Report card created successfully.',
            reportCard: finalReportCard,
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Error creating report card:', error);
        return res.status(500).json({ message: 'Internal server error' });
    } finally {
        session.endSession();
    }
}

// Main function to generate assessment-specific report for a school, class, and term
async function generateAssessmentReport(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { assessmentType, schoolId, classId, termId } = req.body;

        const school = await School.findById(schoolId).select('name').session(session);
        if (!school) {
            return res.status(400).json({ message: 'Invalid school.' });
        }

        if (!['assessment1', 'assessment2'].includes(assessmentType)) {
            return res.status(400).json({ message: 'Invalid assessment type. Use "assessment1" or "assessment2".' });
        }

        const term = await Term.findOne({ _id: termId, school: schoolId }).select('termNumber academicYear startDate endDate').session(session);
        if (!term || new Date('2025-07-21T16:35:00Z') < term.startDate || new Date('2025-07-21T16:35:00Z') > term.endDate) {
            return res.status(400).json({ message: 'Invalid term or mismatch with date range.' });
        }

        let pipeline = [
            {
                $match: {
                    status: 'graded',
                    isDeleted: false,
                },
            },
            {
                $lookup: {
                    from: 'enrollments',
                    localField: 'enrollment',
                    foreignField: '_id',
                    as: 'enrollmentDetails',
                },
            },
            {
                $unwind: '$enrollmentDetails',
            },
            {
                $match: {
                    'enrollmentDetails.school': new mongoose.Types.ObjectId(schoolId),
                    'enrollmentDetails.term': new mongoose.Types.ObjectId(termId),
                    'enrollmentDetails.isActive': true,
                    'enrollmentDetails.isDeleted': false,
                },
            },
            {
                $lookup: {
                    from: 'exams',
                    localField: 'exam',
                    foreignField: '_id',
                    as: 'examDetails',
                    pipeline: [{ $project: { maxScore: 1, type: 1, subject: 1, school: 1 } }],
                },
            },
            {
                $unwind: '$examDetails',
            },
            {
                $match: {
                    'examDetails.type': assessmentType,
                    'examDetails.school': new mongoose.Types.ObjectId(schoolId),
                },
            },
            {
                $lookup: {
                    from: 'subjects',
                    localField: 'examDetails.subject',
                    foreignField: '_id',
                    as: 'subjectDetails',
                },
            },
            {
                $unwind: '$subjectDetails',
            },
        ];

        if (classId) {
            pipeline.push({ $match: { 'enrollmentDetails.class': new mongoose.Types.ObjectId(classId) } });
            const classDoc = await Class.findOne({ _id: classId, school: schoolId }).session(session);
            if (!classDoc) {
                return res.status(400).json({ message: 'Invalid class or not associated with the school.' });
            }
        }

        pipeline.push(
            {
                $group: {
                    _id: {
                        student: '$student',
                        subject: '$subjectDetails._id',
                    },
                    studentName: { $first: { $arrayElemAt: ['$enrollmentDetails.student.fullName', 0] } },
                    subjectName: { $first: '$subjectDetails.name' },
                    score: { $sum: '$totalScore' },
                    maxScore: { $max: '$examDetails.maxScore' },
                },
            },
            {
                $project: {
                    student: '$_id.student',
                    studentName: 1,
                    subject: '$_id.subject',
                    subjectName: 1,
                    score: 1,
                    percentage: {
                        $cond: [
                            { $gt: ['$score', 0] },
                            { $round: [{ $multiply: [{ $divide: ['$score', '$maxScore'] }, 100] }, 2] },
                            0,
                        ],
                    },
                },
            },
            {
                $group: {
                    _id: '$student',
                    studentName: { $first: '$studentName' },
                    results: { $push: { subject: '$subject', subjectName: '$subjectName', score: '$score', percentage: '$percentage' } },
                    totalScore: { $sum: '$score' },
                },
            },
            {
                $project: {
                    _id: 0,
                    student: '$_id',
                    studentName: 1,
                    results: 1,
                    totalScore: 1,
                    average: { $cond: [{ $eq: [{ $size: '$results' }, 0] }, 0, { $round: [{ $divide: ['$totalScore', { $size: '$results' }] }, 2] }] },
                },
            }
        );

        const result = await Submission.aggregate(pipeline).session(session).exec();

        await session.commitTransaction();
        return res.status(200).json({
            message: `${assessmentType} report for school and class in term generated successfully.`,
            report: result,
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Error generating assessment report:', error);
        return res.status(500).json({ message: 'Internal server error' });
    } finally {
        session.endSession();
    }
}

// Export only the main functions
module.exports = {
    generateSingleStudentReport,
    generateClassReport,
    generateTermReport,
    generateSchoolReport,
    generateSubjectReport,
    generateTradeReport,
    generatePromotionReport,
    generateTeacherReport,
    createReportCard,
    generateAssessmentReport,
};