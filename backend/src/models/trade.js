const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TradeSchema = new Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    fullName: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        trim: true
    },
    level: {
        type: String,
        trim: true
    },
    type: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    duration: {
        type: String,
        trim: true
    },
    subjects: {
        type: [String],
        default: []
    },
    requirements: {
        entry: { type: String, trim: true },
        minimumGrade: { type: String, trim: true }
    },
    careerPaths: {
        type: [String],
        default: []
    },
    certification: {
        type: String,
        trim: true
    },
    accreditation: {
        type: String,
        trim: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

TradeSchema.index({ code: 1 });

module.exports = mongoose.models.Trade || mongoose.model('Trade', TradeSchema);