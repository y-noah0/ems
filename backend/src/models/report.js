// models/ReportCard.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReportCardSchema = new Schema({
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    class: {
        type: Schema.Types.ObjectId,
        ref: 'Class',
        required: true
    },
    academicYear: {
        type: Number,
        required: true
    },
    term: {
        type: Schema.Types.ObjectId,
        ref: 'Term',
        required: true
    },
    school: {
        type: Schema.Types.ObjectId,
        ref: 'School',
        required: true
    },
    results: [{
        subject: {
            type: Schema.Types.ObjectId,
            ref: 'Subject',
            required: true
        },
        scores: {
            assessment1: { type: Number, default: 0 }, // /15
            assessment2: { type: Number, default: 0 }, // /15
            test: { type: Number, default: 0 }, // /10
            exam: { type: Number, default: 0 }, // /60
        },
        total: { type: Number, default: 0 },        // /100
        percentage: { type: Number, default: 0 },   // %
        decision: {
            type: String,
            enum: ['Competent', 'Not Yet Competent'],
            default: 'Not Yet Competent'
        }
    }],
    totalScore: {
        type: Number,
        default: 0
    },
    average: {
        type: Number,
        default: 0
    },
    rank: {
        type: Number
    },
    remarks: {
        type: String,
        trim: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

ReportCardSchema.index({ student: 1, class: 1, academicYear: 1, term: 1, school: 1 }, { unique: true });

ReportCardSchema.pre('save', async function (next) {
    this.totalScore = 0;
    this.results.forEach(result => {
        const { assessment1, assessment2, test, exam } = result.scores;
        const total = (assessment1 || 0) + (assessment2 || 0) + (test || 0) + (exam || 0);
        result.total = total;
        result.percentage = Math.round((total / 100) * 100);
        result.decision = result.percentage >= 70 ? 'Competent' : 'Not Yet Competent';
        this.totalScore += total;
    });

    this.average = this.results.length ? this.totalScore / this.results.length : 0;

    const User = mongoose.model('User');
    const user = await User.findById(this.student);
    if (!user || user.role !== 'student') {
        return next(new Error('Student must be a user with role "student"'));
    }

    next();
});

module.exports = mongoose.model('ReportCard', ReportCardSchema);
