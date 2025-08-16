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

let io;

// Initialize Socket.IO server
const initializeSocket = (server) => {
    const { Server } = require('socket.io');
    
    io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:3000',
            methods: ['GET', 'POST'],
        },
    });

    // Socket authentication middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication token required'));
            }

            const jwt = require('jsonwebtoken');
            const User = require('./models/User');
            
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).populate('school');
            
            if (!user) {
                return next(new Error('User not found'));
            }

            socket.user = user;
            next();
        } catch (error) {
            logger.error('Socket authentication error:', error.message);
            next(new Error('Authentication failed'));
        }
    });

    // Socket connection handler
    io.on('connection', async (socket) => {
        const user = socket.user;
        logger.info('Socket connected', {
            socketId: socket.id,
            userId: user._id.toString(),
            role: user.role,
            school: user.school ? user.school._id.toString() : 'N/A'
        });

    // Join user-specific rooms (both new namespaced and legacy for backward compatibility)
    socket.join(`user:${user._id}`);
    socket.join(user._id.toString());

        // Join role-based rooms
        socket.join(`role:${user.role}`);

        // Join school-specific rooms if applicable
        if (user.school) {
            socket.join(`school:${user.school._id}`);
        }

        // Dynamically join class rooms
        try {
            if (user.role === 'student') {
                // Fetch active enrollments
                const Enrollment = require('./models/enrollment');
                const enrollments = await Enrollment.find({ student: user._id, isActive: true, isDeleted: false });
                enrollments.forEach(enr => socket.join(`class:${enr.class.toString()}`));
                logger.info('Student joined class rooms', { userId: user._id.toString(), classCount: enrollments.length });
            } else if (user.role === 'teacher') {
                // Determine classes via subjects taught
                const Subject = require('./models/Subject');
                const Class = require('./models/Class');
                const subjects = await Subject.find({ teacher: user._id, isDeleted: false }, { _id: 1 });
                if (subjects.length) {
                    const subjectIds = subjects.map(s => s._id);
                    const classes = await Class.find({ subjects: { $in: subjectIds }, isDeleted: false }, { _id: 1 });
                    classes.forEach(cls => socket.join(`class:${cls._id.toString()}`));
                    logger.info('Teacher joined class rooms', { userId: user._id.toString(), classCount: classes.length });
                }
            }
        } catch (joinErr) {
            logger.error('Error joining dynamic class rooms', { userId: user._id.toString(), error: joinErr.message });
        }

        // Handle manual room joins (with authorization)
        socket.on('join', (room) => {
            // Validate room access based on user role and permissions
            if (validateRoomAccess(user, room)) {
                socket.join(room);
                logger.info('User joined room', {
                    socketId: socket.id,
                    userId: user._id.toString(),
                    room
                });
                socket.emit('room:joined', { room });
            } else {
                logger.warn('Unauthorized room join attempt', {
                    socketId: socket.id,
                    userId: user._id.toString(),
                    room
                });
                socket.emit('error', { message: 'Unauthorized room access' });
            }
        });

        // Handle exam-related events
        socket.on('exam:join', (examId) => {
            // Validate user can access this exam
            socket.join(`exam:${examId}`);
            logger.info('User joined exam room', {
                socketId: socket.id,
                userId: user._id.toString(),
                examId
            });
        });

        // Handle submission events
        socket.on('submission:started', (data) => {
            logger.info('Submission started', {
                socketId: socket.id,
                userId: user._id.toString(),
                examId: data.examId,
                submissionId: data.submissionId
            });
            
            // Notify teacher about submission start
            socket.to(`exam:${data.examId}`).emit('submission:started', {
                type: 'submission_started',
                studentId: user._id,
                studentName: user.fullName,
                examId: data.examId,
                submissionId: data.submissionId,
                timestamp: new Date()
            });
        });

        socket.on('submission:auto-submitted', (data) => {
            logger.info('Auto-submission event', {
                socketId: socket.id,
                userId: user._id.toString(),
                examId: data.examId
            });
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            logger.info('Socket disconnected', {
                socketId: socket.id,
                userId: user._id.toString(),
                role: user.role
            });
        });

        // Health check ping
        socket.on('ping', (callback) => {
            logger.debug('Ping received', { 
                socketId: socket.id, 
                userId: user._id.toString() 
            });
            if (typeof callback === 'function') {
                callback({ 
                    status: 'pong', 
                    userId: user._id.toString(),
                    timestamp: new Date()
                });
            }
        });
    });

    return io;
};

// Room access validation helper
const validateRoomAccess = (user, room) => {
    const roomParts = room.split(':');
    const roomType = roomParts[0];
    const roomId = roomParts[1];

    switch (roomType) {
        case 'user':
            return roomId === user._id.toString();
        case 'role':
            return roomId === user.role;
        case 'school':
            return user.school && roomId === user.school._id.toString();
        case 'class':
            if (user.role === 'student') {
                return user.class && roomId === user.class.toString();
            } else if (user.role === 'teacher') {
                return user.classes && user.classes.includes(roomId);
            }
            return false;
        case 'exam':
            // Additional validation would be needed to check if user is enrolled in exam
            return true; // Simplified for now
        default:
            return false;
    }
};

// Get Socket.IO instance
const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO not initialized. Call initializeSocket() first.');
    }
    return io;
};

module.exports = {
    initializeSocket,
    getIO
};
