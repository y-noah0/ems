const mongoose = require('mongoose');
const User = require('../models/User');
const Term = require('../models/term');
const Enrollment = require('../models/enrollment');
const Subject = require('../models/Subject');
const Submission = require('../models/Submission');
const Class = require('../models/Class');
const ReportCard = require('../models/report');
// const School = require('../models/School');
const Trade = require('../models/trade');

// Function to generate report data for a single student
async function generateStudentReportData(studentId, academicYear, termId, schoolId) {
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
                            academicYear: academicYear,
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
                total: { $add: ['$assessment1', '$assessment2', '$test', '$exam'] },
                percentage: {
                    $cond: [
                        { $gt: [{ $add: ['$assessment1', '$assessment2', '$test', '$exam'] }, 0] },
                        { $round: [{ $multiply: [{ $divide: [{ $add: ['$assessment1', '$assessment2', '$test', '$exam'] }, 100] }, 100] }, 2] },
                        0,
                    ],
                },
                decision: {
                    $cond: [
                        { $gte: [{ $add: ['$assessment1', '$assessment2', '$test', '$exam'] }, 70] },
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

    const result = await Submission.aggregate(pipeline).exec();
    return result.length > 0 ? result[0] : { results: [], totalScore: 0, average: 0 };
}

// Function to generate report data for all students in a class
async function generateClassReportData(classId, academicYear, termId, schoolId) {
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
                'enrollmentDetails.academicYear': academicYear,
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
                assessment1: { $sum: { $cond: [{ $eq: ['$examDetails.type', 'assessment1'] }, '$totalScore', 0] } },
                assessment2: { $sum: { $cond: [{ $eq: ['$examDetails.type', 'assessment2'] }, '$totalScore', 0] } },
                test: { $sum: { $cond: [{ $eq: ['$examDetails.type', 'test'] }, '$totalScore', 0] } },
                exam: { $sum: { $cond: [{ $eq: ['$examDetails.type', 'exam'] }, '$totalScore', 0] } },
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
                total: { $add: ['$assessment1', '$assessment2', '$test', '$exam'] },
                percentage: {
                    $cond: [
                        { $gt: [{ $add: ['$assessment1', '$assessment2', '$test', '$exam'] }, 0] },
                        { $round: [{ $multiply: [{ $divide: [{ $add: ['$assessment1', '$assessment2', '$test', '$exam'] }, 100] }, 100] }, 2] },
                        0,
                    ],
                },
                decision: {
                    $cond: [
                        { $gte: [{ $add: ['$assessment1', '$assessment2', '$test', '$exam'] }, 70] },
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

    const result = await Submission.aggregate(pipeline).exec();
    return result;
}

// Function to generate report data for all students in a term
async function generateTermReportData(academicYear, termId, schoolId) {
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
                'enrollmentDetails.academicYear': academicYear,
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
                assessment1: { $sum: { $cond: [{ $eq: ['$examDetails.type', 'assessment1'] }, '$totalScore', 0] } },
                assessment2: { $sum: { $cond: [{ $eq: ['$examDetails.type', 'assessment2'] }, '$totalScore', 0] } },
                test: { $sum: { $cond: [{ $eq: ['$examDetails.type', 'test'] }, '$totalScore', 0] } },
                exam: { $sum: { $cond: [{ $eq: ['$examDetails.type', 'exam'] }, '$totalScore', 0] } },
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
                total: { $add: ['$assessment1', '$assessment2', '$test', '$exam'] },
                percentage: {
                    $cond: [
                        { $gt: [{ $add: ['$assessment1', '$assessment2', '$test', '$exam'] }, 0] },
                        { $round: [{ $multiply: [{ $divide: [{ $add: ['$assessment1', '$assessment2', '$test', '$exam'] }, 100] }, 100] }, 2] },
                        0,
                    ],
                },
                decision: {
                    $cond: [
                        { $gte: [{ $add: ['$assessment1', '$assessment2', '$test', '$exam'] }, 70] },
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

    const result = await Submission.aggregate(pipeline).exec();
    return result;
}

// Function to generate report data for all students in a school
async function generateSchoolReportData(schoolId, academicYear) {
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
                'enrollmentDetails.academicYear': academicYear,
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
                assessment1: { $sum: { $cond: [{ $eq: ['$examDetails.type', 'assessment1'] }, '$totalScore', 0] } },
                assessment2: { $sum: { $cond: [{ $eq: ['$examDetails.type', 'assessment2'] }, '$totalScore', 0] } },
                test: { $sum: { $cond: [{ $eq: ['$examDetails.type', 'test'] }, '$totalScore', 0] } },
                exam: { $sum: { $cond: [{ $eq: ['$examDetails.type', 'exam'] }, '$totalScore', 0] } },
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
                total: { $add: ['$assessment1', '$assessment2', '$test', '$exam'] },
                percentage: {
                    $cond: [
                        { $gt: [{ $add: ['$assessment1', '$assessment2', '$test', '$exam'] }, 0] },
                        { $round: [{ $multiply: [{ $divide: [{ $add: ['$assessment1', '$assessment2', '$test', '$exam'] }, 100] }, 100] }, 2] },
                        0,
                    ],
                },
                decision: {
                    $cond: [
                        { $gte: [{ $add: ['$assessment1', '$assessment2', '$test', '$exam'] }, 70] },
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

    const result = await Submission.aggregate(pipeline).exec();
    return result;
}

// Function to generate report data for all students in a subject
async function generateSubjectReportData(subjectId, academicYear, termId, schoolId) {
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
                'enrollmentDetails.academicYear': academicYear,
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
                assessment1: { $sum: { $cond: [{ $eq: ['$examDetails.type', 'assessment1'] }, '$totalScore', 0] } },
                assessment2: { $sum: { $cond: [{ $eq: ['$examDetails.type', 'assessment2'] }, '$totalScore', 0] } },
                test: { $sum: { $cond: [{ $eq: ['$examDetails.type', 'test'] }, '$totalScore', 0] } },
                exam: { $sum: { $cond: [{ $eq: ['$examDetails.type', 'exam'] }, '$totalScore', 0] } },
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
                total: { $add: ['$assessment1', '$assessment2', '$test', '$exam'] },
                percentage: {
                    $cond: [
                        { $gt: [{ $add: ['$assessment1', '$assessment2', '$test', '$exam'] }, 0] },
                        { $round: [{ $multiply: [{ $divide: [{ $add: ['$assessment1', '$assessment2', '$test', '$exam'] }, 100] }, 100] }, 2] },
                        0,
                    ],
                },
                decision: {
                    $cond: [
                        { $gte: [{ $add: ['$assessment1', '$assessment2', '$test', '$exam'] }, 70] },
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

    const result = await Submission.aggregate(pipeline).exec();
    return result;
}

// Function to generate report data for all students in a trade
async function generateTradeReportData(tradeId, academicYear, termId, schoolId) {
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
                'enrollmentDetails.academicYear': academicYear,
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
                assessment1: { $sum: { $cond: [{ $eq: ['$examDetails.type', 'assessment1'] }, '$totalScore', 0] } },
                assessment2: { $sum: { $cond: [{ $eq: ['$examDetails.type', 'assessment2'] }, '$totalScore', 0] } },
                test: { $sum: { $cond: [{ $eq: ['$examDetails.type', 'test'] }, '$totalScore', 0] } },
                exam: { $sum: { $cond: [{ $eq: ['$examDetails.type', 'exam'] }, '$totalScore', 0] } },
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
                total: { $add: ['$assessment1', '$assessment2', '$test', '$exam'] },
                percentage: {
                    $cond: [
                        { $gt: [{ $add: ['$assessment1', '$assessment2', '$test', '$exam'] }, 0] },
                        { $round: [{ $multiply: [{ $divide: [{ $add: ['$assessment1', '$assessment2', '$test', '$exam'] }, 100] }, 100] }, 2] },
                        0,
                    ],
                },
                decision: {
                    $cond: [
                        { $gte: [{ $add: ['$assessment1', '$assessment2', '$test', '$exam'] }, 70] },
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

    const result = await Submission.aggregate(pipeline).exec();
    return result;
}

// Function to generate promotion eligibility report
async function generatePromotionEligibilityReport(schoolId, academicYear) {
    const enrollments = await Enrollment.find({
        school: schoolId,
        academicYear: academicYear,
        isActive: true,
        isDeleted: false,
    }).populate('student', 'fullName class');

    const report = enrollments.map(enrollment => ({
        student: enrollment.student._id,
        studentName: enrollment.student.fullName,
        class: enrollment.class.className,
        promotionStatus: enrollment.promotionStatus,
        academicYear: enrollment.academicYear,
        term: enrollment.term,
    }));

    return report;
}

// Function to generate teacher performance report data
async function generateTeacherPerformanceReport(schoolId, academicYear, termId) {
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
                'enrollmentDetails.academicYear': academicYear,
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
                _id: '$subjectDetails.teacher',
                teacherName: { $first: { $arrayElemAt: ['$subjectDetails.teacher.fullName', 0] } },
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

    const result = await Submission.aggregate(pipeline).exec();
    return result;
}

// Function to rank students or teachers
async function rankItems(items, scopeField) {
    try {
        items.sort((a, b) => b.totalScore - a.totalScore || b.averageScore - a.averageScore);

        let currentRank = 0;
        let lastScore = null;
        let sameRankCount = 0;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
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

// Generate report for a single student
async function generateSingleStudentReport(req, res) {
    try {
        const { studentId, academicYear, termId, schoolId } = req.body;

        const school = await School.findById(schoolId).select('name');
        if (!school) {
            return res.status(400).json({ message: 'Invalid school.' });
        }

        const student = await User.findOne({ _id: studentId, school: schoolId, role: 'student' });
        if (!student) {
            return res.status(400).json({ message: 'Invalid student or not associated with the school.' });
        }

        const term = await Term.findOne({ _id: termId, school: schoolId }).select('termNumber academicYear');
        if (!term) {
            return res.status(400).json({ message: 'Invalid term or not associated with the school.' });
        }

        const enrollment = await Enrollment.findOne({
            student: studentId,
            academicYear,
            term: termId,
            school: schoolId,
            isActive: true,
            isDeleted: false,
        }).populate('class');

        if (!enrollment) {
            return res.status(404).json({ message: 'No active enrollment found.' });
        }

        const studentClass = enrollment.class;
        const reportData = await generateStudentReportData(studentId, academicYear, termId, schoolId);

        const reportCardData = {
            student: student._id,
            class: studentClass._id,
            academicYear,
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
            academicYear,
            term: term._id,
            school: schoolId,
            isDeleted: false,
        });

        if (existingReportCard) {
            existingReportCard.set(reportCardData);
            reportCard = await existingReportCard.save();
        } else {
            reportCard = await ReportCard.create(reportCardData);
        }

        await rankItems([reportCard], 'student');

        const finalReportCard = await ReportCard.findById(reportCard._id)
            .populate('class')
            .populate('term')
            .populate('results.subject')
            .populate('student', 'fullName');

        return res.status(200).json({
            message: 'Single student report card generated successfully.',
            reportCard: finalReportCard,
        });
    } catch (error) {
        console.error('Error generating single student report:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Generate report for all students in a class
async function generateClassReport(req, res) {
    try {
        const { classId, academicYear, termId, schoolId } = req.body;

        const school = await School.findById(schoolId).select('name');
        if (!school) {
            return res.status(400).json({ message: 'Invalid school.' });
        }

        const classDoc = await Class.findOne({ _id: classId, school: schoolId }).select('school');
        if (!classDoc) {
            return res.status(400).json({ message: 'Invalid class or not associated with the school.' });
        }

        const term = await Term.findOne({ _id: termId, school: schoolId }).select('termNumber academicYear');
        if (!term) {
            return res.status(400).json({ message: 'Invalid term or not associated with the school.' });
        }

        if (term.academicYear !== Number(academicYear)) {
            return res.status(400).json({ message: 'Term and academic year mismatch.' });
        }

        const reportData = await generateClassReportData(classId, academicYear, termId, schoolId);

        const reportCards = [];
        for (const studentReport of reportData) {
            const reportCardData = {
                student: studentReport.student,
                class: classId,
                academicYear,
                term: termId,
                school: schoolId,
                results: studentReport.results,
                totalScore: studentReport.totalScore,
                average: studentReport.average,
                remarks: 'Generated for class report.',
                isDeleted: false,
            };

            let reportCard = await ReportCard.findOne({
                student: studentReport.student,
                class: classId,
                academicYear,
                term: termId,
                school: schoolId,
                isDeleted: false,
            });

            if (reportCard) {
                reportCard.set(reportCardData);
                await reportCard.save();
            } else {
                reportCard = await ReportCard.create(reportCardData);
            }

            reportCards.push(reportCard);
        }

        await rankItems(reportCards, 'class');

        const finalReportCards = await ReportCard.find({
            class: classId,
            academicYear,
            term: termId,
            school: schoolId,
            isDeleted: false,
        })
            .populate('class')
            .populate('term')
            .populate('results.subject')
            .populate('student', 'fullName');

        return res.status(200).json({
            message: 'Class report cards generated successfully.',
            reportCards: finalReportCards,
        });
    } catch (error) {
        console.error('Error generating class report:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Generate report for all students in a term
async function generateTermReport(req, res) {
    try {
        const { academicYear, termId, schoolId } = req.body;

        const school = await School.findById(schoolId).select('name');
        if (!school) {
            return res.status(400).json({ message: 'Invalid school.' });
        }

        const term = await Term.findOne({ _id: termId, school: schoolId }).select('termNumber academicYear');
        if (!term) {
            return res.status(400).json({ message: 'Invalid term or not associated with the school.' });
        }

        if (term.academicYear !== Number(academicYear)) {
            return res.status(400).json({ message: 'Term and academic year mismatch.' });
        }

        const reportData = await generateTermReportData(academicYear, termId, schoolId);

        const reportCards = [];
        for (const studentReport of reportData) {
            const enrollment = await Enrollment.findOne({
                student: studentReport.student,
                academicYear,
                term: termId,
                school: schoolId,
                isActive: true,
                isDeleted: false,
            }).populate('class');

            if (enrollment) {
                const reportCardData = {
                    student: studentReport.student,
                    class: enrollment.class._id,
                    academicYear,
                    term: termId,
                    school: schoolId,
                    results: studentReport.results,
                    totalScore: studentReport.totalScore,
                    average: studentReport.average,
                    remarks: 'Generated for term report.',
                    isDeleted: false,
                };

                let reportCard = await ReportCard.findOne({
                    student: studentReport.student,
                    class: enrollment.class._id,
                    academicYear,
                    term: termId,
                    school: schoolId,
                    isDeleted: false,
                });

                if (reportCard) {
                    reportCard.set(reportCardData);
                    await reportCard.save();
                } else {
                    reportCard = await ReportCard.create(reportCardData);
                }

                reportCards.push(reportCard);
            }
        }

        await rankItems(reportCards, 'term');

        const finalReportCards = await ReportCard.find({
            academicYear,
            term: termId,
            school: schoolId,
            isDeleted: false,
        })
            .populate('class')
            .populate('term')
            .populate('results.subject')
            .populate('student', 'fullName');

        return res.status(200).json({
            message: 'Term report cards generated successfully.',
            reportCards: finalReportCards,
        });
    } catch (error) {
        console.error('Error generating term report:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Generate report for all students in a school
async function generateSchoolReport(req, res) {
    try {
        const { schoolId, academicYear } = req.body;

        const school = await School.findById(schoolId).select('name');
        if (!school) {
            return res.status(400).json({ message: 'Invalid school.' });
        }

        const reportData = await generateSchoolReportData(schoolId, academicYear);

        const reportCards = [];
        for (const studentReport of reportData) {
            const enrollment = await Enrollment.findOne({
                student: studentReport.student,
                academicYear,
                school: schoolId,
                isActive: true,
                isDeleted: false,
            }).populate('class term');

            if (enrollment) {
                const reportCardData = {
                    student: studentReport.student,
                    class: enrollment.class._id,
                    academicYear,
                    term: enrollment.term._id,
                    school: schoolId,
                    results: studentReport.results,
                    totalScore: studentReport.totalScore,
                    average: studentReport.average,
                    remarks: 'Generated for school report.',
                    isDeleted: false,
                };

                let reportCard = await ReportCard.findOne({
                    student: studentReport.student,
                    class: enrollment.class._id,
                    academicYear,
                    term: enrollment.term._id,
                    school: schoolId,
                    isDeleted: false,
                });

                if (reportCard) {
                    reportCard.set(reportCardData);
                    await reportCard.save();
                } else {
                    reportCard = await ReportCard.create(reportCardData);
                }

                reportCards.push(reportCard);
            }
        }

        await rankItems(reportCards, 'school');

        const finalReportCards = await ReportCard.find({
            school: schoolId,
            academicYear,
            isDeleted: false,
        })
            .populate('class')
            .populate('term')
            .populate('results.subject')
            .populate('student', 'fullName');

        return res.status(200).json({
            message: 'School report cards generated successfully.',
            reportCards: finalReportCards,
        });
    } catch (error) {
        console.error('Error generating school report:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Generate report for all students in a subject
async function generateSubjectReport(req, res) {
    try {
        const { subjectId, academicYear, termId, schoolId } = req.body;

        const school = await School.findById(schoolId).select('name');
        if (!school) {
            return res.status(400).json({ message: 'Invalid school.' });
        }

        const subject = await Subject.findOne({ _id: subjectId, school: schoolId }).select('name');
        if (!subject) {
            return res.status(400).json({ message: 'Invalid subject or not associated with the school.' });
        }

        const term = await Term.findOne({ _id: termId, school: schoolId }).select('termNumber academicYear');
        if (!term || term.academicYear !== Number(academicYear)) {
            return res.status(400).json({ message: 'Invalid term or mismatch with academic year.' });
        }

        const reportData = await generateSubjectReportData(subjectId, academicYear, termId, schoolId);

        const reportCards = [];
        for (const studentReport of reportData) {
            const enrollment = await Enrollment.findOne({
                student: studentReport.student,
                academicYear,
                term: termId,
                school: schoolId,
                isActive: true,
                isDeleted: false,
            }).populate('class');

            if (enrollment) {
                const reportCardData = {
                    student: studentReport.student,
                    class: enrollment.class._id,
                    academicYear,
                    term: termId,
                    school: schoolId,
                    results: studentReport.results,
                    totalScore: studentReport.totalScore,
                    average: studentReport.average,
                    remarks: 'Generated for subject report.',
                    isDeleted: false,
                };

                let reportCard = await ReportCard.findOne({
                    student: studentReport.student,
                    class: enrollment.class._id,
                    academicYear,
                    term: termId,
                    school: schoolId,
                    isDeleted: false,
                });

                if (reportCard) {
                    reportCard.set(reportCardData);
                    await reportCard.save();
                } else {
                    reportCard = await ReportCard.create(reportCardData);
                }

                reportCards.push(reportCard);
            }
        }

        await rankItems(reportCards, 'subject');

        const finalReportCards = await ReportCard.find({
            'results.subject': subjectId,
            academicYear,
            term: termId,
            school: schoolId,
            isDeleted: false,
        })
            .populate('class')
            .populate('term')
            .populate('results.subject')
            .populate('student', 'fullName');

        return res.status(200).json({
            message: 'Subject report cards generated successfully.',
            reportCards: finalReportCards,
        });
    } catch (error) {
        console.error('Error generating subject report:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Generate report for all students in a trade
async function generateTradeReport(req, res) {
    try {
        const { tradeId, academicYear, termId, schoolId } = req.body;

        const school = await School.findById(schoolId).select('name');
        if (!school) {
            return res.status(400).json({ message: 'Invalid school.' });
        }

        const trade = await Trade.findOne({ _id: tradeId, school: schoolId }).select('name');
        if (!trade) {
            return res.status(400).json({ message: 'Invalid trade or not associated with the school.' });
        }

        const term = await Term.findOne({ _id: termId, school: schoolId }).select('termNumber academicYear');
        if (!term || term.academicYear !== Number(academicYear)) {
            return res.status(400).json({ message: 'Invalid term or mismatch with academic year.' });
        }

        const reportData = await generateTradeReportData(tradeId, academicYear, termId, schoolId);

        const reportCards = [];
        for (const studentReport of reportData) {
            const enrollment = await Enrollment.findOne({
                student: studentReport.student,
                academicYear,
                term: termId,
                school: schoolId,
                isActive: true,
                isDeleted: false,
            }).populate('class');

            if (enrollment) {
                const reportCardData = {
                    student: studentReport.student,
                    class: enrollment.class._id,
                    academicYear,
                    term: termId,
                    school: schoolId,
                    results: studentReport.results,
                    totalScore: studentReport.totalScore,
                    average: studentReport.average,
                    remarks: 'Generated for trade report.',
                    isDeleted: false,
                };

                let reportCard = await ReportCard.findOne({
                    student: studentReport.student,
                    class: enrollment.class._id,
                    academicYear,
                    term: termId,
                    school: schoolId,
                    isDeleted: false,
                });

                if (reportCard) {
                    reportCard.set(reportCardData);
                    await reportCard.save();
                } else {
                    reportCard = await ReportCard.create(reportCardData);
                }

                reportCards.push(reportCard);
            }
        }

        await rankItems(reportCards, 'trade');

        const finalReportCards = await ReportCard.find({
            class: { $in: await Class.find({ trade: tradeId, school: schoolId }).distinct('_id') },
            academicYear,
            term: termId,
            school: schoolId,
            isDeleted: false,
        })
            .populate('class')
            .populate('term')
            .populate('results.subject')
            .populate('student', 'fullName');

        return res.status(200).json({
            message: 'Trade report cards generated successfully.',
            reportCards: finalReportCards,
        });
    } catch (error) {
        console.error('Error generating trade report:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Generate promotion eligibility report
async function generatePromotionReport(req, res) {
    try {
        const { schoolId, academicYear } = req.body;

        const school = await School.findById(schoolId).select('name');
        if (!school) {
            return res.status(400).json({ message: 'Invalid school.' });
        }

        const reportData = await generatePromotionEligibilityReport(schoolId, academicYear);

        return res.status(200).json({
            message: 'Promotion eligibility report generated successfully.',
            report: reportData,
        });
    } catch (error) {
        console.error('Error generating promotion report:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Generate teacher performance report
async function generateTeacherReport(req, res) {
    try {
        const { schoolId, academicYear, termId } = req.body;

        const school = await School.findById(schoolId).select('name');
        if (!school) {
            return res.status(400).json({ message: 'Invalid school.' });
        }

        const term = await Term.findOne({ _id: termId, school: schoolId }).select('termNumber academicYear');
        if (!term || term.academicYear !== Number(academicYear)) {
            return res.status(400).json({ message: 'Invalid term or mismatch with academic year.' });
        }

        const reportData = await generateTeacherPerformanceReport(schoolId, academicYear, termId);

        const teacherReports = [];
        for (const teacherReport of reportData) {
            let teacherReportDoc = await User.findOne({
                _id: teacherReport.teacher,
                school: schoolId,
                role: 'teacher',
                isDeleted: false,
            });

            if (teacherReportDoc) {
                teacherReportDoc.averageScore = teacherReport.averageScore;
                teacherReportDoc.competencyRate = teacherReport.competencyRate;
                teacherReportDoc.totalStudents = teacherReport.totalStudents;
                teacherReportDoc.remarks = 'Generated for teacher performance.';
                teacherReportDoc.isDeleted = false;

                await teacherReportDoc.save();
                teacherReports.push(teacherReportDoc);
            }
        }

        await rankItems(teacherReports, 'teacher');

        const finalTeacherReports = await User.find({
            school: schoolId,
            role: 'teacher',
            isDeleted: false,
        }).select('fullName averageScore competencyRate totalStudents rank remarks');

        return res.status(200).json({
            message: 'Teacher performance report generated successfully.',
            report: finalTeacherReports,
        });
    } catch (error) {
        console.error('Error generating teacher report:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Create a new report card record
async function createReportCard(req, res) {
    try {
        const { studentId, classId, academicYear, termId, schoolId, results } = req.body;

        const school = await School.findById(schoolId).select('name');
        if (!school) {
            return res.status(400).json({ message: 'Invalid school.' });
        }

        const student = await User.findOne({ _id: studentId, school: schoolId, role: 'student' });
        if (!student) {
            return res.status(400).json({ message: 'Invalid student or not associated with the school.' });
        }

        const classDoc = await Class.findOne({ _id: classId, school: schoolId });
        if (!classDoc) {
            return res.status(400).json({ message: 'Invalid class or not associated with the school.' });
        }

        const term = await Term.findOne({ _id: termId, school: schoolId });
        if (!term) {
            return res.status(400).json({ message: 'Invalid term or not associated with the school.' });
        }

        // Validate and normalize results
        if (!Array.isArray(results)) {
            return res.status(400).json({ message: 'Results must be an array.' });
        }

        const validatedResults = [];
        let totalScore = 0;
        for (const result of results) {
            const subject = await Subject.findOne({ _id: result.subject, school: schoolId });
            if (!subject) {
                return res.status(400).json({ message: `Invalid subject ${result.subject} or not associated with the school.` });
            }

            const { assessment1 = 0, assessment2 = 0, test = 0, exam = 0 } = result.scores || {};
            const total = assessment1 + assessment2 + test + exam;
            const percentage = Math.round((total / 100) * 100);
            const decision = percentage >= 70 ? 'Competent' : 'Not Yet Competent';

            validatedResults.push({
                subject: result.subject,
                scores: { assessment1, assessment2, test, exam },
                total,
                percentage,
                decision,
            });
            totalScore += total;
        }

        const average = validatedResults.length ? totalScore / validatedResults.length : 0;

        const reportCardData = {
            student: studentId,
            class: classId,
            academicYear,
            term: termId,
            school: schoolId,
            results: validatedResults,
            totalScore,
            average,
            remarks: 'Manually created report card.',
            isDeleted: false,
        };

        const reportCard = await ReportCard.create(reportCardData);

        // Rank the new report card within its class
        const classReportCards = await ReportCard.find({
            class: classId,
            academicYear,
            term: termId,
            school: schoolId,
            isDeleted: false,
        });
        classReportCards.push(reportCard);
        await rankItems(classReportCards, 'class');

        const finalReportCard = await ReportCard.findById(reportCard._id)
            .populate('class')
            .populate('term')
            .populate('results.subject')
            .populate('student', 'fullName');

        return res.status(201).json({
            message: 'Report card created successfully.',
            reportCard: finalReportCard,
        });
    } catch (error) {
        console.error('Error creating report card:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Generate assessment-specific report for dean
async function generateAssessmentReport(req, res) {
    try {
        const { assessmentType, schoolId, classId, studentId, academicYear, termId } = req.body;

        const school = await School.findById(schoolId).select('name');
        if (!school) {
            return res.status(400).json({ message: 'Invalid school.' });
        }

        if (!['assessment1', 'assessment2'].includes(assessmentType)) {
            return res.status(400).json({ message: 'Invalid assessment type. Use "assessment1" or "assessment2".' });
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
                    'enrollmentDetails.academicYear': academicYear,
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

        // Apply filters based on provided parameters
        if (studentId) {
            pipeline.push({ $match: { student: new mongoose.Types.ObjectId(studentId) } });
            const student = await User.findOne({ _id: studentId, school: schoolId, role: 'student' });
            if (!student) {
                return res.status(400).json({ message: 'Invalid student or not associated with the school.' });
            }
        }
        if (classId) {
            pipeline.push({ $match: { 'enrollmentDetails.class': new mongoose.Types.ObjectId(classId) } });
            const classDoc = await Class.findOne({ _id: classId, school: schoolId });
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
                            { $round: [{ $multiply: [{ $divide: ['$score', 15] }, 100] }, 2] }, // Assuming assessment1/2 is out of 15
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

        const result = await Submission.aggregate(pipeline).exec();

        return res.status(200).json({
            message: `${assessmentType} report generated successfully.`,
            report: result,
        });
    } catch (error) {
        console.error('Error generating assessment report:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}


module.exports = {
    createReportCard,
    generateSingleStudentReport,
    generateClassReport,
    generateTermReport,
    generateSchoolReport,
    generateSubjectReport,
    generateTradeReport,
    generatePromotionReport,
    generateTeacherReport,
    generateAssessmentReport,
};