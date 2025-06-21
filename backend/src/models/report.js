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
        ref: 'Term'
    },
    school: {
        type: Schema.Types.ObjectId,
        ref: 'School',
        required: true
    },
    results: [{
        submission: {
            type: Schema.Types.ObjectId,
            ref: 'Submission'
        },
        subject: {
            type: Schema.Types.ObjectId,
            ref: 'Subject'
        },
        score: Number,
        outOf: Number,
        grade: String
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
    if (this.isModified('results')) {
        this.totalScore = this.results.reduce((sum, r) => sum + (r.score || 0), 0);
        this.average = this.results.length ? this.totalScore / this.results.length : 0;
    }
    const User = mongoose.model('User');
    const user = await User.findById(this.student);
    if (!user || user.role !== 'student') {
        return next(new Error('Student must be a user with role "student"'));
    }
    next();
});

module.exports = mongoose.model('ReportCard', ReportCardSchema);