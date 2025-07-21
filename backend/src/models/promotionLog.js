// models/PromotionLog.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PromotionLogSchema = new Schema({
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fromClass: {
        type: Schema.Types.ObjectId,
        ref: 'Class',
        required: true
    },
    toClass: {
        type: Schema.Types.ObjectId,
        ref: 'Class',
        default: null
    },
    fromTerm: {
        type: Schema.Types.ObjectId,
        ref: 'Term',
        default: null
    },
    toTerm: {
        type: Schema.Types.ObjectId,
        ref: 'Term',
        default: null
    },
    academicYear: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['promoted', 'repeated', 'graduated', 'expelled', 'onLeave', 'withdrawn', 'termTransition'],
        required: true
    },
    remarks: {
        type: String,
        trim: true,
        default: ''
    },
    school: {
        type: Schema.Types.ObjectId,
        ref: 'School',
        required: true
    },
    promotionDate: {
        type: Date,
        default: Date.now
    },
    manual: {
        type: Boolean,
        default: false
    },
    cronJob: {
        type: Boolean,
        default: false // True if triggered by cron job
    },
    passingThreshold: {
        type: Number,
        default: 50
    }
}, { timestamps: true });

PromotionLogSchema.index({ student: 1, academicYear: 1, fromTerm: 1 }, { unique: true, partialFilterExpression: { fromTerm: { $exists: true } } });
PromotionLogSchema.index({ student: 1, academicYear: 1 }, { unique: true, partialFilterExpression: { fromTerm: { $exists: false } } });

module.exports = mongoose.model('PromotionLog', PromotionLogSchema);