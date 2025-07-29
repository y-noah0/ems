// models/Term.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TermSchema = new Schema({
    termNumber: {
        type: Number,
        required: true,
        enum: [1, 2, 3]
    },
    academicYear: {
        type: Number,
        required: true
    },
    school: {
        type: Schema.Types.ObjectId,
        ref: 'School',
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

TermSchema.index({ school: 1, academicYear: 1, termNumber: 1 }, { unique: true });

TermSchema.pre('save', async function (next) {
    if (this.startDate >= this.endDate) {
        return next(new Error('Start date must be before end date'));
    }
    const School = mongoose.model('School');
    const school = await School.findById(this.school);
    if (!school || school.isDeleted) {
        return next(new Error('Invalid or deleted school'));
    }
    next();
});

module.exports = mongoose.model('Term', TermSchema);