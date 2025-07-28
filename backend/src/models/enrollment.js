// models/Enrollment.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EnrollmentSchema = new Schema({
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
    promotionStatus: {
        type: String,
        enum: ['eligible', 'repeat', 'expelled', 'onLeave', 'withdrawn'],
        default: 'eligible'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    // New field for transfer tracking
    transferredFromSchool: {
        type: Schema.Types.ObjectId,
        ref: 'School',
        default: null
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
    if (!term || term.school.toString() !== this.school.toString()) {
        return next(new Error('Invalid term or term does not belong to the school'));
    }

    if (student.school.toString() !== this.school.toString() && !this.transferredFromSchool) {
        return next(new Error('School must match the student’s school or specify transferredFromSchool'));
    }

    // Check class capacity
    const enrollmentCount = await mongoose.model('Enrollment').countDocuments({
        class: this.class,
        term: this.term,
        isActive: true,
        isDeleted: false
    });
    if (enrollmentCount >= classDoc.capacity) {
        return next(new Error('Class capacity limit reached'));
    }

    next();
});

module.exports = mongoose.model('Enrollment', EnrollmentSchema);