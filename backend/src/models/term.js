const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TermSchema = new Schema({
    termNumber: {
        type: Number,
        enum: [1, 2, 3],
        required: true
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

TermSchema.index({ termNumber: 1, academicYear: 1, school: 1 }, { unique: true });

TermSchema.pre('save', function (next) {
    if (this.startDate >= this.endDate) {
        return next(new Error('End date must be after start date'));
    }
    next();
});

module.exports = mongoose.model('Term', TermSchema);