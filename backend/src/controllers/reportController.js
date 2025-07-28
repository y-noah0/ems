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

// Helper function to generate student report data
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
                            { $gt: [{ $add: ['$maxAssessment1', '$maxAssessment2', '$maxTest', '$maxExam'] }, 0] },
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

// Helper function to generate class report data
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
                $lookup: {
                    from: 'users',
                    localField: 'student',
                    foreignField: '_id',
                    as: 'studentDetails',
                },
            },
            {
                $unwind: '$studentDetails',
            },
            {
                $group: {
                    _id: {
                        student: '$student',
                        subject: '$subjectDetails._id',
                    },
                    studentName: { $first: '$studentDetails.fullName' },
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
                            { $gt: [{ $add: ['$maxAssessment1', '$maxAssessment2', '$maxTest', '$maxExam'] }, 0] },
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

// Helper function to generate term report data
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
                $lookup: {
                    from: 'users',
                    localField: 'student',
                    foreignField: '_id',
                    as: 'studentDetails',
                },
            },
            {
                $unwind: '$studentDetails',
            },
            {
                $group: {
                    _id: {
                        student: '$student',
                        subject: '$subjectDetails._id',
                    },
                    studentName: { $first: '$studentDetails.fullName' },
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
                            { $gt: [{ $add: ['$maxAssessment1', '$maxAssessment2', '$maxTest', '$maxExam'] }, 0] },
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

// Helper function to generate school report data
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
                $lookup: {
                    from: 'users',
                    localField: 'student',
                    foreignField: '_id',
                    as: 'studentDetails',
                },
            },
            {
                $unwind: '$studentDetails',
            },
            {
                $group: {
                    _id: {
                        student: '$student',
                        subject: '$subjectDetails._id',
                    },
                    studentName: { $first: '$studentDetails.fullName' },
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
                            { $gt: [{ $add: ['$maxAssessment1', '$maxAssessment2', '$maxTest', '$maxExam'] }, 0] },
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

// Helper function to generate subject report data
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
                $lookup: {
                    from: 'users',
                    localField: 'student',
                    foreignField: '_id',
                    as: 'studentDetails',
                },
            },
            {
                $unwind: '$studentDetails',
            },
            {
                $group: {
                    _id: {
                        student: '$student',
                        subject: '$subjectDetails._id',
                    },
                    studentName: { $first: '$studentDetails.fullName' },
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
                            { $gt: [{ $add: ['$maxAssessment1', '$maxAssessment2', '$maxTest', '$maxExam'] }, 0] },
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

// Helper function to generate trade report data
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
                $lookup: {
                    from: 'users',
                    localField: 'student',
                    foreignField: '_id',
                    as: 'studentDetails',
                },
            },
            {
                $unwind: '$studentDetails',
            },
            {
                $group: {
                    _id: {
                        student: '$student',
                        subject: '$subjectDetails._id',
                    },
                    studentName: { $first: '$studentDetails.fullName' },
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
                            { $gt: [{ $add: ['$maxAssessment1', '$maxAssessment2', '$maxTest', '$maxExam'] }, 0] },
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

// Helper function to generate assessment report data
async function generateAssessmentReportData(classId, academicYear, termId, schoolId, assessmentType) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        if (!['assessment1', 'assessment2'].includes(assessmentType)) {
            throw new Error('Invalid assessment type. Must be "assessment1" or "assessment2".');
        }

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
            {
                $lookup: {
                    from: 'users',
                    localField: 'student',
                    foreignField: '_id',
                    as: 'studentDetails',
                },
            },
            {
                $unwind: '$studentDetails',
            },
            {
                $group: {
                    _id: {
                        student: '$student',
                        subject: '$subjectDetails._id',
                    },
                    studentName: { $first: '$studentDetails.fullName' },
                    subjectName: { $first: '$subjectDetails.name' },
                    score: { $max: '$totalScore' },
                    maxScore: { $max: '$examDetails.maxScore' },
                },
            },
            {
                $project: {
                    student: '$_id.student',
                    studentName: 1,
                    subject: '$_id.subject',
                    subjectName: 1,
                    scores: { [assessmentType]: '$score' },
                    total: '$score',
                    maxScore: '$maxScore',
                    percentage: {
                        $cond: [
                            { $gt: ['$maxScore', 0] },
                            { $round: [{ $multiply: [{ $divide: ['$score', '$maxScore'] }, 100] }, 2] },
                            0,
                        ],
                    },
                    decision: {
                        $cond: [
                            { $gte: [{ $round: [{ $multiply: [{ $divide: ['$score', '$maxScore'] }, 100] }, 2] }, 70] },
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

// Helper function to generate promotion eligibility report data
async function generatePromotionEligibilityReport(schoolId, academicYear) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const enrollments = await Enrollment.find({
            school: schoolId,
            academicYear: Number(academicYear),
            isActive: true,
            isDeleted: false,
        })
            .populate('student', 'fullName')
            .populate('class', 'className')
            .session(session);

        const report = await Promise.all(enrollments.map(async (enrollment) => {
            const reportCard = await ReportCard.findOne({
                student: enrollment.student._id,
                class: enrollment.class._id,
                academicYear: Number(academicYear),
                school: schoolId,
                isDeleted: false,
            }).session(session);
            const promotionStatus = reportCard && reportCard.average >= reportCard.passingThreshold ? 'Eligible' : 'Not Eligible';
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
                $lookup: {
                    from: 'users',
                    localField: 'subjectDetails.teacher',
                    foreignField: '_id',
                    as: 'teacherDetails',
                },
            },
            {
                $unwind: {
                    path: '$teacherDetails',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $group: {
                    _id: { $ifNull: ['$subjectDetails.teacher', new mongoose.Types.ObjectId()] },
                    teacherName: { $first: { $ifNull: ['$teacherDetails.fullName', 'Unassigned'] } },
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
                    competencyRate: {
                        $cond: [
                            { $gt: ['$totalStudents', 0] },
                            { $round: [{ $multiply: [{ $divide: ['$competentCount', '$totalStudents'] }, 100] }, 2] },
                            0,
                        ],
                    },
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

// Helper function to generate class performance report data
async function generateClassPerformanceReportData(schoolId, academicYear, termId) {
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
                    'enrollmentDetails.term': new mongoose.Types.ObjectId(termId),
                    'enrollmentDetails.isActive': true,
                    'enrollmentDetails.isDeleted': false,
                },
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
                    _id: '$classDetails._id',
                    className: { $first: '$classDetails.className' },
                    totalScore: { $sum: '$totalScore' },
                    studentCount: { $addToSet: '$student' },
                },
            },
            {
                $project: {
                    _id: 0,
                    class: '$_id',
                    className: 1,
                    totalScore: 1,
                    studentCount: { $size: '$studentCount' },
                    averageScore: {
                        $cond: [
                            { $gt: [{ $size: '$studentCount' }, 0] },
                            { $round: [{ $divide: ['$totalScore', { $size: '$studentCount' }] }, 2] },
                            0,
                        ],
                    },
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

// Helper function to rank students, teachers, or classes
async function rankItems(items, scopeField) {
    try {
        // Filter out items with invalid scores
        const validItems = items.filter(item => {
            const score = item.totalScore ?? item.averageScore ?? item.average;
            return score !== undefined && score !== null;
        });

        if (validItems.length === 0) {
            validItems.forEach(item => {
                item.rank = 0;
                if (item.save) return item.save();
            });
            return validItems;
        }

        // Sort items by score in descending order (higher score = lower rank number)
        validItems.sort((a, b) => {
            const aScore = a.totalScore ?? a.averageScore ?? a.average;
            const bScore = b.totalScore ?? b.averageScore ?? b.average;
            return bScore - aScore;
        });

        if (scopeField === 'student') {
            // Rank students within a class
            const classId = validItems[0]?.class?._id ?? validItems[0]?.class;
            if (!classId) {
                validItems.forEach(item => {
                    item.rank = 0;
                    if (item.save) return item.save();
                });
                return validItems;
            }

            const totalInClass = await ReportCard.countDocuments({
                class: classId,
                isDeleted: false,
            }).exec();

            if (totalInClass > 0) {
                await Promise.all(validItems.map(async (item, index) => {
                    const position = index + 1; // 1-based position
                    item.rank = Number((position / totalInClass).toFixed(4)); // Fractional rank
                    if (item.save) await item.save();
                }));
            } else {
                await Promise.all(validItems.map(async item => {
                    item.rank = 0;
                    if (item.save) await item.save();
                }));
            }
        } else if (scopeField === 'teacher') {
            // Rank teachers within a school
            const schoolId = validItems[0]?.school?._id ?? validItems[0]?.school;
            if (!schoolId) {
                validItems.forEach(item => {
                    item.rank = 0;
                    if (item.save) return item.save();
                });
                return validItems;
            }

            const totalTeachers = await User.countDocuments({
                school: schoolId,
                role: 'teacher',
                isDeleted: false,
            }).exec();

            if (totalTeachers > 0) {
                await Promise.all(validItems.map(async (item, index) => {
                    const position = index + 1; // 1-based position
                    item.rank = Number((position / totalTeachers).toFixed(4)); // Fractional rank
                    if (item.save) await item.save();
                }));
            } else {
                await Promise.all(validItems.map(async item => {
                    item.rank = 0;
                    if (item.save) await item.save();
                }));
            }
        } else if (scopeField === 'class') {
            // Rank classes within a school
            const schoolId = validItems[0]?.school?._id ?? validItems[0]?.school;
            if (!schoolId) {
                validItems.forEach(item => {
                    item.rank = 0;
                });
                return validItems;
            }

            const totalClasses = await Class.countDocuments({
                school: schoolId,
                isDeleted: false,
            }).exec();

            if (totalClasses > 0) {
                validItems.forEach((item, index) => {
                    const position = index + 1; // 1-based position
                    item.rank = Number((position / totalClasses).toFixed(4)); // Fractional rank
                });
            } else {
                validItems.forEach(item => {
                    item.rank = 0;
                });
            }
        } else {
            // Default ranking for other scopes (e.g., term, school, trade, subject)
            let currentRank = 0;
            let lastScore = null;
            let sameRankCount = 0;

            await Promise.all(validItems.map(async (item, index) => {
                const score = item.totalScore ?? item.averageScore ?? item.average;
                if (score !== lastScore) {
                    currentRank = index + 1;
                    lastScore = score;
                    sameRankCount = 1;
                } else {
                    sameRankCount++;
                }
                item.rank = currentRank;
                if (item.save) await item.save();
            }));
        }
        return validItems;
    } catch (error) {
        console.error(`Error ranking ${scopeField}:`, error);
        throw error;
    }
}

// Function to create a report card
async function createReportCard(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { studentId, classId, academicYear, termId, schoolId, results, remarks, passingThreshold } = req.body;

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

        const term = await Term.findOne({ _id: termId, school: schoolId }).select('termNumber academicYear startDate endDate').session(session);
        if (!term) {
            return res.status(400).json({ message: 'Invalid term or not associated with the school.' });
        }
        const currentDate = new Date('2025-07-22T10:13:00Z');
        if (Number(academicYear) !== term.academicYear || currentDate < term.startDate || currentDate > term.endDate) {
            return res.status(400).json({ message: 'Term and academic year mismatch or invalid date range.' });
        }

        const enrollment = await Enrollment.findOne({
            student: studentId,
            class: classId,
            academicYear: Number(academicYear),
            term: termId,
            school: schoolId,
            isActive: true,
            isDeleted: false,
        }).session(session);

        if (!enrollment) {
            return res.status(404).json({ message: 'No active enrollment found.' });
        }

        const reportCardData = {
            student: studentId,
            class: classId,
            academicYear: Number(academicYear),
            term: termId,
            school: schoolId,
            results: results.map(result => ({
                subject: result.subject,
                scores: {
                    assessment1: result.scores?.assessment1 || 0,
                    assessment2: result.scores?.assessment2 || 0,
                    test: result.scores?.test || 0,
                    exam: result.scores?.exam || 0,
                },
                total: result.total || 0,
                percentage: result.percentage || 0,
                decision: result.decision || 'Not Yet Competent',
            })),
            totalScore: results.reduce((sum, result) => sum + (result.total || 0), 0),
            average: results.length ? results.reduce((sum, result) => sum + (result.total || 0), 0) / results.length : 0,
            remarks: remarks || 'Manually created report card.',
            passingThreshold: passingThreshold || 50,
            isDeleted: false,
        };

        let reportCard;
        const existingReportCard = await ReportCard.findOne({
            student: studentId,
            class: classId,
            academicYear: Number(academicYear),
            term: termId,
            school: schoolId,
            isDeleted: false,
        }).session(session);

        if (existingReportCard) {
            existingReportCard.set(reportCardData);
            reportCard = await existingReportCard.save({ session });
        } else {
            reportCard = await ReportCard.create([reportCardData], { session });
            reportCard = reportCard[0];
        }

        await rankItems([reportCard], 'student');

        const finalReportCard = await ReportCard.findById(reportCard._id)
            .populate('class', 'className')
            .populate('term', 'termNumber')
            .populate('results.subject', 'name')
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

// Function to generate single student report
async function generateSingleStudentReport(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { studentId, academicYear, termId, schoolId, passingThreshold } = req.body;

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
        const currentDate = new Date('2025-07-22T10:13:00Z');
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
            passingThreshold: passingThreshold || 50,
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
            reportCard = reportCard[0];
        }

        await rankItems([reportCard], 'student');

        const finalReportCard = await ReportCard.findById(reportCard._id)
            .populate('class', 'className')
            .populate('term', 'termNumber')
            .populate('results.subject', 'name')
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

// Function to generate class report
async function generateClassReport(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { classId, academicYear, termId, schoolId, passingThreshold } = req.body;

        const school = await School.findById(schoolId).select('name').session(session);
        if (!school) {
            return res.status(400).json({ message: 'Invalid school.' });
        }

        const classDoc = await Class.findOne({ _id: classId, school: schoolId }).select('school className').session(session);
        if (!classDoc) {
            return res.status(400).json({ message: 'Invalid class or not associated with the school.' });
        }

        const term = await Term.findOne({ _id: termId, school: schoolId }).select('termNumber academicYear startDate endDate').session(session);
        if (!term) {
            return res.status(400).json({ message: 'Invalid term or not associated with the school.' });
        }
        const currentDate = new Date('2025-07-22T10:13:00Z');
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
                passingThreshold: passingThreshold || 50,
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

        const rankedReportCards = await rankItems(reportCards, 'student');

        // Generate class performance data for ranking classes within the school
        const classPerformanceData = await generateClassPerformanceReportData(schoolId, academicYear, termId);
        const rankedClasses = await rankItems(classPerformanceData.map(cls => ({
            ...cls,
            school: schoolId,
        })), 'class');

        // Find the rank of the requested class
        const currentClassRank = rankedClasses.find(cls => cls.class.toString() === classId.toString())?.rank || 0;

        const finalReportCards = await ReportCard.find({
            class: classId,
            academicYear: Number(academicYear),
            term: termId,
            school: schoolId,
            isDeleted: false,
        })
            .populate('class', 'className')
            .populate('term', 'termNumber')
            .populate('results.subject', 'name')
            .populate('student', 'fullName')
            .session(session);

        await session.commitTransaction();
        return res.status(200).json({
            message: 'Class report cards generated successfully.',
            reportCards: finalReportCards,
            classRank: {
                classId,
                className: classDoc.className,
                rank: currentClassRank,
                totalClasses: rankedClasses.length,
            },
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Error generating class report:', error);
        return res.status(500).json({ message: 'Internal server error' });
    } finally {
        session.endSession();
    }
}

// Function to generate term report
async function generateTermReport(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { academicYear, termId, schoolId, passingThreshold } = req.body;

        const school = await School.findById(schoolId).select('name').session(session);
        if (!school) {
            return res.status(400).json({ message: 'Invalid school.' });
        }

        const term = await Term.findOne({ _id: termId, school: schoolId }).select('termNumber academicYear startDate endDate').session(session);
        if (!term) {
            return res.status(400).json({ message: 'Invalid term or not associated with the school.' });
        }
        const currentDate = new Date('2025-07-22T10:13:00Z');
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

            if (!enrollment) continue;

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
                passingThreshold: passingThreshold || 50,
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

        if (bulkOps.length > 0) {
            await ReportCard.bulkWrite(bulkOps, { session });
        }

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
            .populate('class', 'className')
            .populate('term', 'termNumber')
            .populate('results.subject', 'name')
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

// Function to generate school report
async function generateSchoolReport(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { academicYear, schoolId, passingThreshold } = req.body;

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
            }).populate('class').session(session);

            if (!enrollment) continue;

            const reportCardData = {
                student: studentReport.student,
                class: enrollment.class._id,
                academicYear: Number(academicYear),
                term: enrollment.term,
                school: schoolId,
                results: studentReport.results,
                totalScore: studentReport.totalScore,
                average: studentReport.average,
                remarks: 'Generated for school report.',
                passingThreshold: passingThreshold || 50,
                isDeleted: false,
            };

            bulkOps.push({
                updateOne: {
                    filter: {
                        student: studentReport.student,
                        class: enrollment.class._id,
                        academicYear: Number(academicYear),
                        term: enrollment.term,
                        school: schoolId,
                        isDeleted: false,
                    },
                    update: { $set: reportCardData },
                    upsert: true,
                },
            });
        }

        if (bulkOps.length > 0) {
            await ReportCard.bulkWrite(bulkOps, { session });
        }

        const reportCards = await ReportCard.find({
            academicYear: Number(academicYear),
            school: schoolId,
            isDeleted: false,
        }).session(session);

        await rankItems(reportCards, 'school');

        const finalReportCards = await ReportCard.find({
            academicYear: Number(academicYear),
            school: schoolId,
            isDeleted: false,
        })
            .populate('class', 'className')
            .populate('term', 'termNumber')
            .populate('results.subject', 'name')
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

// Function to generate subject report
async function generateSubjectReport(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { subjectId, academicYear, termId, schoolId, passingThreshold } = req.body;

        const school = await School.findById(schoolId).select('name').session(session);
        if (!school) {
            return res.status(400).json({ message: 'Invalid school.' });
        }

        const subject = await Subject.findOne({ _id: subjectId, school: schoolId }).session(session);
        if (!subject) {
            return res.status(400).json({ message: 'Invalid subject or not associated with the school.' });
        }

        const term = await Term.findOne({ _id: termId, school: schoolId }).select('termNumber academicYear startDate endDate').session(session);
        if (!term) {
            return res.status(400).json({ message: 'Invalid term or not associated with the school.' });
        }
        const currentDate = new Date('2025-07-22T10:13:00Z');
        if (Number(academicYear) !== term.academicYear || currentDate < term.startDate || currentDate > term.endDate) {
            return res.status(400).json({ message: 'Term and academic year mismatch or invalid date range.' });
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

            if (!enrollment) continue;

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
                passingThreshold: passingThreshold || 50,
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

        if (bulkOps.length > 0) {
            await ReportCard.bulkWrite(bulkOps, { session });
        }

        const reportCards = await ReportCard.find({
            academicYear: Number(academicYear),
            term: termId,
            school: schoolId,
            isDeleted: false,
            'results.subject': subjectId,
        }).session(session);

        await rankItems(reportCards, 'subject');

        const finalReportCards = await ReportCard.find({
            academicYear: Number(academicYear),
            term: termId,
            school: schoolId,
            isDeleted: false,
            'results.subject': subjectId,
        })
            .populate('class', 'className')
            .populate('term', 'termNumber')
            .populate('results.subject', 'name')
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

// Function to generate trade report
async function generateTradeReport(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { tradeId, academicYear, termId, schoolId, passingThreshold } = req.body;

        const school = await School.findById(schoolId).select('name').session(session);
        if (!school) {
            return res.status(400).json({ message: 'Invalid school.' });
        }

        const trade = await Trade.findOne({ _id: tradeId, school: schoolId }).session(session);
        if (!trade) {
            return res.status(400).json({ message: 'Invalid trade or not associated with the school.' });
        }

        const term = await Term.findOne({ _id: termId, school: schoolId }).select('termNumber academicYear startDate endDate').session(session);
        if (!term) {
            return res.status(400).json({ message: 'Invalid term or not associated with the school.' });
        }
        const currentDate = new Date('2025-07-22T10:13:00Z');
        if (Number(academicYear) !== term.academicYear || currentDate < term.startDate || currentDate > term.endDate) {
            return res.status(400).json({ message: 'Term and academic year mismatch or invalid date range.' });
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

            if (!enrollment) continue;

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
                passingThreshold: passingThreshold || 50,
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

        if (bulkOps.length > 0) {
            await ReportCard.bulkWrite(bulkOps, { session });
        }

        const reportCards = await ReportCard.find({
            academicYear: Number(academicYear),
            term: termId,
            school: schoolId,
            isDeleted: false,
        }).populate('class').session(session);

        const filteredReportCards = reportCards.filter(report => {
            return report.class.trade && report.class.trade.toString() === tradeId;
        });

        await rankItems(filteredReportCards, 'trade');

        const finalReportCards = await ReportCard.find({
            academicYear: Number(academicYear),
            term: termId,
            school: schoolId,
            isDeleted: false,
        })
            .populate({
                path: 'class',
                match: { trade: tradeId },
                select: 'className',
            })
            .populate('term', 'termNumber')
            .populate('results.subject', 'name')
            .populate('student', 'fullName')
            .session(session);

        const validReportCards = finalReportCards.filter(report => report.class !== null);

        await session.commitTransaction();
        return res.status(200).json({
            message: 'Trade report cards generated successfully.',
            reportCards: validReportCards,
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Error generating trade report:', error);
        return res.status(500).json({ message: 'Internal server error' });
    } finally {
        session.endSession();
    }
}

// Function to generate assessment report
async function generateAssessmentReport(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { classId, academicYear, termId, schoolId, assessmentType } = req.body;

        if (!['assessment1', 'assessment2'].includes(assessmentType)) {
            return res.status(400).json({ message: 'Invalid assessment type. Must be "assessment1" or "assessment2".' });
        }

        const school = await School.findById(schoolId).select('name').session(session);
        if (!school) {
            return res.status(400).json({ message: 'Invalid school.' });
        }

        const classDoc = await Class.findOne({ _id: classId, school: schoolId }).select('school className').session(session);
        if (!classDoc) {
            return res.status(400).json({ message: 'Invalid class or not associated with the school.' });
        }

        const term = await Term.findOne({ _id: termId, school: schoolId }).select('termNumber academicYear startDate endDate').session(session);
        if (!term) {
            return res.status(400).json({ message: 'Invalid term or not associated with the school.' });
        }
        const currentDate = new Date('2025-07-22T10:13:00Z');
        if (Number(academicYear) !== term.academicYear || currentDate < term.startDate || currentDate > term.endDate) {
            return res.status(400).json({ message: 'Term and academic year mismatch or invalid date range.' });
        }

        const reportData = await generateAssessmentReportData(classId, academicYear, termId, schoolId, assessmentType);

        const bulkOps = reportData.map(studentReport => {
            const reportCardData = {
                student: studentReport.student,
                class: classId,
                academicYear: Number(academicYear),
                term: termId,
                school: schoolId,
                results: studentReport.results.map(result => ({
                    subject: result.subject,
                    scores: { [assessmentType]: result.scores[assessmentType] },
                    total: result.total,
                    percentage: result.percentage,
                    decision: result.decision,
                })),
                totalScore: studentReport.totalScore,
                average: studentReport.average,
                remarks: `Generated for ${assessmentType} report.`,
                passingThreshold: 50, // Default value, can be adjusted
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
            .populate('class', 'className')
            .populate('term', 'termNumber')
            .populate('results.subject', 'name')
            .populate('student', 'fullName')
            .session(session);

        await session.commitTransaction();
        return res.status(200).json({
            message: `${assessmentType} report cards generated successfully.`,
            reportCards: finalReportCards,
        });
    } catch (error) {
        await session.abortTransaction();
        console.error(`Error generating ${assessmentType} report:`, error);
        return res.status(500).json({ message: 'Internal server error' });
    } finally {
        session.endSession();
    }
}

// Function to generate promotion eligibility report
async function generatePromotionReport(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { schoolId, academicYear } = req.body;

        const school = await School.findById(schoolId).select('name').session(session);
        if (!school) {
            return res.status(400).json({ message: 'Invalid school.' });
        }

        const report = await generatePromotionEligibilityReport(schoolId, academicYear);

        await session.commitTransaction();
        return res.status(200).json({
            message: 'Promotion eligibility report generated successfully.',
            report,
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Error generating promotion report:', error);
        return res.status(500).json({ message: 'Internal server error' });
    } finally {
        session.endSession();
    }
}

// Function to generate teacher performance report
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
        if (!term) {
            return res.status(400).json({ message: 'Invalid term or not associated with the school.' });
        }
        const currentDate = new Date('2025-07-22T10:13:00Z');
        if (Number(academicYear) !== term.academicYear || currentDate < term.startDate || currentDate > term.endDate) {
            return res.status(400).json({ message: 'Term and academic year mismatch or invalid date range.' });
        }

        const reportData = await generateTeacherPerformanceReport(schoolId, academicYear, termId);

        await rankItems(reportData, 'teacher');

        await session.commitTransaction();
        return res.status(200).json({
            message: 'Teacher performance report generated successfully.',
            report: reportData,
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Error generating teacher report:', error);
        return res.status(500).json({ message: 'Internal server error' });
    } finally {
        session.endSession();
    }
}

// Export all functions
module.exports = {
    createReportCard,
    generateSingleStudentReport,
    generateClassReport,
    generateTermReport,
    generateSchoolReport,
    generateSubjectReport,
    generateTradeReport,
    generateAssessmentReport,
    generatePromotionReport,
    generateTeacherReport,
};