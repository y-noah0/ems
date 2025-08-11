const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotificationQueueSchema = new Schema({
    type: {
        type: String,
        enum: ['exam_created', 'exam_activated', 'exam_completed', 'exam_scheduled'],
        required: true,
    },
    examId: {
        type: Schema.Types.ObjectId,
        ref: 'Exam',
        required: true,
    },
    recipientIds: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    }],
    message: {
        type: String,
        required: true,
    },
    channel: {
        type: String,
        enum: ['email', 'sms'],
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'sent', 'failed'],
        default: 'pending',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    sentAt: {
        type: Date,
    },
    error: {
        type: String,
    },
});

NotificationQueueSchema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.model('NotificationQueue', NotificationQueueSchema);