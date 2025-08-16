// src/models/Notification.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotificationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  school: {
    type: Schema.Types.ObjectId,
    ref: 'School',
    required: false,
    index: true
  },
  type: {
    type: String,
    // Added 'review_request' for student -> teacher review notifications
    enum: ['grade', 'exam', 'system', 'message', 'review_request'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  relatedModel: {
    type: String, // 'Exam', 'Submission', 'Message', etc.
    required: false
  },
  relatedId: {
    type: Schema.Types.ObjectId,
    required: false
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);