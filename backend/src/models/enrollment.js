const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EnrollmentSchema = new Schema({
    student: {
        type: Schema.Types.ObjectId, // Fixed from Schema.Fields.ObjectId
        ref: 'User',
        required: true
    },
    class: {
        type: Schema.Types.ObjectId, // Fixed from Schema.Fields.ObjectId
        ref: 'Class',
        required: true
    },
    term: {
        type: Schema.Types.ObjectId, // Fixed from Schema.Fields.ObjectId
        ref: 'Term',
        required: true
    },
    school: {
        type: Schema.Types.ObjectId, // Fixed from Schema.Fields.ObjectId
        ref: 'School',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

EnrollmentSchema.index({ student: 1, term: 1 }, { unique: true });
EnrollmentSchema.index({ class: 1, term: 1 });

EnrollmentSchema.pre('save', async function (next) {
    const User = mongoose.model('User');
    const Class = mongoose.model('Class');
    const Term = mongoose.model('Term');

    const student = await User.findById(this.student);
    if (!student || student.role !== 'student') {
        return next(new Error('Student must be a user with role "student"'));
    }

    const classDoc = await Class.findById(this.class);
    if (!classDoc || classDoc.school.toString() !== this.school.toString()) {
        return next(new Error('Class must belong to the specified school'));
    }

    const term = await Term.findById(this.term);
    if (!term) {
        return next(new Error('Invalid term'));
    }

    if (student.school.toString() !== this.school.toString()) {
        return next(new Error('School must match the student’s school'));
    }

    next();
});

module.exports = mongoose.model('Enrollment', EnrollmentSchema);