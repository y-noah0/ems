const winston = require('winston');

// Logger configuration
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

// Socket.IO event handler
module.exports = (io) => {
    io.on('connection', (socket) => {
        const user = socket.user;
        logger.info('Socket connected', {
            socketId: socket.id,
            userId: user.id,
            role: user.role,
            school: user.school ? user.school.toString() : 'N/A'
        });

        // Join user-specific and role-based rooms
        socket.join(user.id);
        if (user.role === 'admin') {
            socket.join('admins');
        } else if (['dean', 'headmaster'].includes(user.role)) {
            socket.join(`school:${user.school}:${user.role}`);
        } else if (user.role === 'teacher') {
            socket.join(`school:${user.school}:teacher`);
            socket.join(user.id);
        } else if (user.role === 'student') {
            socket.join(`school:${user.school}:student`);
            socket.join(user.id);
        }

        // Handle custom join event
        socket.on('join', (room) => {
            if (
                room === user.id ||
                room === 'admins' && user.role === 'admin' ||
                room === `school:${user.school}:dean` && user.role === 'dean' ||
                room === `school:${user.school}:headmaster` && user.role === 'headmaster' ||
                room === `school:${user.school}:teacher` && user.role === 'teacher' ||
                room === `school:${user.school}:student` && user.role === 'student'
            ) {
                socket.join(room);
                logger.info('User joined room', {
                    socketId: socket.id,
                    userId: user.id,
                    room
                });
            } else {
                logger.warn('Unauthorized room join attempt', {
                    socketId: socket.id,
                    userId: user.id,
                    room
                });
                socket.emit('error', { message: 'Unauthorized room access' });
            }
        });

        // Handle exam auto-submission event
        socket.on('exam-auto-submitted', (data) => {
            logger.info('Exam auto-submitted event received', {
                socketId: socket.id,
                userId: user.id,
                examId: data.examId,
                submissionId: data.submissionId
            });
            // Re-emit to ensure clients in relevant rooms receive it
            io.to(user.id).emit('exam-auto-submitted', data);
            if (user.role === 'teacher') {
                io.to(`school:${user.school}:teacher`).emit('exam-auto-submitted', data);
            }
        });

        // Handle submission started event
        socket.on('submission-started', (data) => {
            logger.info('Submission started event received', {
                socketId: socket.id,
                userId: user.id,
                examId: data.examId,
                submissionId: data.submissionId
            });
            io.to(user.id).emit('submission-started', data);
        });

        // Handle manual submission event
        socket.on('exam-submitted', (data) => {
            logger.info('Exam submitted event received', {
                socketId: socket.id,
                userId: user.id,
                examId: data.examId,
                submissionId: data.submissionId
            });
            io.to(user.id).emit('exam-submitted', data);
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            logger.info('Socket disconnected', {
                socketId: socket.id,
                userId: user.id,
                role: user.role
            });
        });

        // Handle ping for testing
        socket.on('ping', (callback) => {
            logger.debug('Ping received', { socketId: socket.id, userId: user.id });
            callback({ status: 'pong', userId: user.id });
        });
    });
};