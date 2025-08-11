const mongoose = require('mongoose');
const NotificationQueue = require('../models/notificationQueue');
const User = require('../models/User');
const { sendEmail } = require('../services/emailService');
const { sendSMS } = require('../services/twilioService');
const winston = require('winston');

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

const notificationService = {
    // Queue a notification
    async queueNotification(type, examId, recipientIds, message, channel) {
        try {
            const notification = new NotificationQueue({
                type,
                examId,
                recipientIds,
                message,
                channel,
            });
            await notification.save();
            logger.info(`Notification queued: ${type} for exam ${examId}`);
        } catch (error) {
            logger.error(`Error queuing notification for ${type}`, { error: error.message, examId });
        }
    },

    // Process notification queue
    async processQueue() {
        try {
            const notifications = await NotificationQueue.find({ status: 'pending' })
                .populate('recipientIds', 'email phoneNumber preferences')
                .populate('examId', 'title');

            for (const notification of notifications) {
                try {
                    for (const user of notification.recipientIds) {
                        if (
                            notification.channel === 'email' &&
                            user.preferences?.notifications?.email &&
                            user.email
                        ) {
                            await sendEmail(
                                user.email,
                                `${notification.type.replace('_', ' ')}: ${notification.examId.title}`,
                                notification.message
                            );
                        } else if (
                            notification.channel === 'sms' &&
                            user.preferences?.notifications?.sms &&
                            user.phoneNumber
                        ) {
                            await sendSMS(user.phoneNumber, notification.message);
                        }
                    }
                    notification.status = 'sent';
                    notification.sentAt = new Date();
                    await notification.save();
                    logger.info(`Notification sent: ${notification.type} for exam ${notification.examId._id}`);
                } catch (error) {
                    notification.status = 'failed';
                    notification.error = error.message;
                    await notification.save();
                    logger.error(`Failed to send notification ${notification._id}`, {
                        error: error.message,
                        examId: notification.examId._id,
                    });
                }
            }
        } catch (error) {
            logger.error('Error processing notification queue', { error: error.message });
        }
    },
};

module.exports = notificationService;