const cron = require('node-cron');
const notificationService = require('../utils/notificationServices');
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
        new winston.transports.File({ filename: path.join(logDir, 'combined.log') })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// Schedule cron job to run every 5 minutes
const startNotificationCron = () => {
    cron.schedule('*/5 * * * *', async () => {
        try {
            logger.info('Starting notification queue processing');
            await notificationService.processQueue();
            logger.info('Notification queue processing completed');
        } catch (error) {
            logger.error('Error in notification cron job', { error: error.message });
        }
    });
};

module.exports = { startNotificationCron };