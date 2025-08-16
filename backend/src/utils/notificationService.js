// src/utils/notificationService.js
const Notification = require('../models/Notification');
const winston = require('winston');

// Logger setup - use your existing logger 
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Send notification and save to database
exports.sendNotification = async (io, userId, data) => {
  try {
    // Create notification in DB
    const notification = new Notification({
      user: userId,
      type: data.type,
      title: data.title,
      message: data.message,
      relatedModel: data.relatedModel,
      relatedId: data.relatedId
    });
    
    await notification.save();
    
    // Send real-time notification (support both legacy room id and new namespaced pattern user:{id})
    const payload = {
      id: notification._id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      createdAt: notification.createdAt
    };
    // Namespaced room (used by SocketNotificationService)
    io.to(`user:${userId}`).emit('notification', payload);
    // Legacy direct room (in case some clients joined plain id)
    io.to(userId.toString()).emit('notification', payload);
    
    return notification;
  } catch (error) {
    logger.error('Error sending notification:', { error: error.message, userId });
    return null;
  }
};

// Send grade notification
exports.sendGradeNotification = async (io, studentId, submission) => {
  return this.sendNotification(io, studentId, {
    type: 'grade',
    title: 'Exam Graded',
    message: `Your ${(submission.exam && submission.exam.title) || 'exam'} exam has been graded.`,
    relatedModel: 'Submission',
    relatedId: submission._id
  });
};

// Send exam scheduled notification
exports.sendExamScheduledNotification = async (io, studentId, exam) => {
  return this.sendNotification(io, studentId, {
    type: 'exam',
    title: 'New Exam Scheduled',
    message: `${exam.title} has been scheduled for ${new Date(exam.schedule.start).toLocaleString()}.`,
    relatedModel: 'Exam',
    relatedId: exam._id
  });
};