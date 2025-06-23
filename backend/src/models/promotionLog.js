// models/PromotionLog.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PromotionLogSchema = new Schema({
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    fromClass: {
        type: Schema.Types.ObjectId,
        ref: 'Class',
        required: true,
    },
    toClass: {
        type: Schema.Types.ObjectId,
        ref: 'Class',
        default: null, // null for graduation or expulsion
    },
    academicYear: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['promoted', 'repeated', 'graduated', 'expelled'],
        required: true,
    },
    remarks: {
        type: String,
        trim: true,
        default: '',
    },
    school: {
        type: Schema.Types.ObjectId,
        ref: 'School',
        required: true,
    },
    promotionDate: {
        type: Date,
        default: Date.now,
    },
    manual: {
        type: Boolean,
        default: false, // True if triggered by a dean manually
    }
}, { timestamps: true });

// Prevent duplicate promotions per student per academic year
PromotionLogSchema.index({ student: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('PromotionLog', PromotionLogSchema);
