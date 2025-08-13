const { getIO } = require('../socketServer');
const winston = require('winston');

// Logger configuration
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/notification.log' }),
        new winston.transports.Console()
    ]
});

/**
 * Centralized Socket.IO notification emitter utility
 * Handles all real-time notifications across the EMS system
 */
class SocketNotificationService {
    
    /**
     * Emit notification to a specific user
     * @param {string} userId - Target user ID
     * @param {string} event - Event name
     * @param {object} data - Notification data
     */
    static emitToUser(userId, event, data) {
        try {
            const io = getIO();
            const payload = {
                ...data,
                id: require('crypto').randomUUID(),
                timestamp: new Date(),
                recipient: 'user'
            };
            
            io.to(`user:${userId}`).emit(event, payload);
            
            logger.info('Notification sent to user', {
                userId,
                event,
                notificationId: payload.id
            });
        } catch (error) {
            logger.error('Failed to emit notification to user', {
                userId,
                event,
                error: error.message
            });
        }
    }

    /**
     * Emit notification to users with specific role
     * @param {string} role - Target role (student, teacher, admin, etc.)
     * @param {string} event - Event name
     * @param {object} data - Notification data
     */
    static emitToRole(role, event, data) {
        try {
            const io = getIO();
            const payload = {
                ...data,
                id: require('crypto').randomUUID(),
                timestamp: new Date(),
                recipient: 'role'
            };
            
            io.to(`role:${role}`).emit(event, payload);
            
            logger.info('Notification sent to role', {
                role,
                event,
                notificationId: payload.id
            });
        } catch (error) {
            logger.error('Failed to emit notification to role', {
                role,
                event,
                error: error.message
            });
        }
    }

    /**
     * Emit notification to a specific class
     * @param {string} classId - Target class ID
     * @param {string} event - Event name
     * @param {object} data - Notification data
     */
    static emitToClass(classId, event, data) {
        try {
            const io = getIO();
            const payload = {
                ...data,
                id: require('crypto').randomUUID(),
                timestamp: new Date(),
                recipient: 'class'
            };
            
            io.to(`class:${classId}`).emit(event, payload);
            
            logger.info('Notification sent to class', {
                classId,
                event,
                notificationId: payload.id
            });
        } catch (error) {
            logger.error('Failed to emit notification to class', {
                classId,
                event,
                error: error.message
            });
        }
    }

    /**
     * Emit notification to a specific exam room
     * @param {string} examId - Target exam ID
     * @param {string} event - Event name
     * @param {object} data - Notification data
     */
    static emitToExam(examId, event, data) {
        try {
            const io = getIO();
            const payload = {
                ...data,
                id: require('crypto').randomUUID(),
                timestamp: new Date(),
                recipient: 'exam'
            };
            
            io.to(`exam:${examId}`).emit(event, payload);
            
            logger.info('Notification sent to exam', {
                examId,
                event,
                notificationId: payload.id
            });
        } catch (error) {
            logger.error('Failed to emit notification to exam', {
                examId,
                event,
                error: error.message
            });
        }
    }

    /**
     * Emit notification to a specific school
     * @param {string} schoolId - Target school ID
     * @param {string} event - Event name
     * @param {object} data - Notification data
     */
    static emitToSchool(schoolId, event, data) {
        try {
            const io = getIO();
            const payload = {
                ...data,
                id: require('crypto').randomUUID(),
                timestamp: new Date(),
                recipient: 'school'
            };
            
            io.to(`school:${schoolId}`).emit(event, payload);
            
            logger.info('Notification sent to school', {
                schoolId,
                event,
                notificationId: payload.id
            });
        } catch (error) {
            logger.error('Failed to emit notification to school', {
                schoolId,
                event,
                error: error.message
            });
        }
    }

    /**
     * Broadcast notification to all connected users
     * @param {string} event - Event name
     * @param {object} data - Notification data
     */
    static broadcast(event, data) {
        try {
            const io = getIO();
            const payload = {
                ...data,
                id: require('crypto').randomUUID(),
                timestamp: new Date(),
                recipient: 'broadcast'
            };
            
            io.emit(event, payload);
            
            logger.info('Notification broadcasted', {
                event,
                notificationId: payload.id
            });
        } catch (error) {
            logger.error('Failed to broadcast notification', {
                event,
                error: error.message
            });
        }
    }

    /**
     * Send user registration notification
     * @param {object} user - Newly registered user
     */
    static notifyUserRegistered(user) {
        this.emitToRole('systemAdmin', 'user:registered', {
            type: 'user_registered',
            message: `New ${user.role} account created: ${user.fullName}`,
            title: 'New User Registration',
            data: {
                userId: user._id,
                userRole: user.role,
                userName: user.fullName,
                userEmail: user.email
            }
        });

        if (user.school) {
            this.emitToRole('headmaster', 'user:registered', {
                type: 'user_registered',
                message: `New ${user.role} registered in your school: ${user.fullName}`,
                title: 'New User Registration',
                data: {
                    userId: user._id,
                    userRole: user.role,
                    userName: user.fullName,
                    schoolId: user.school
                }
            });
        }
    }

    /**
     * Send exam scheduled notification
     * @param {object} exam - Created exam
     * @param {Array} classIds - Array of class IDs
     */
    static notifyExamScheduled(exam, classIds) {
        classIds.forEach(classId => {
            this.emitToClass(classId, 'exam:scheduled', {
                type: 'exam_scheduled',
                message: `New exam scheduled: ${exam.title} on ${new Date(exam.schedule.start).toLocaleDateString()}`,
                title: 'New Exam Scheduled',
                data: {
                    examId: exam._id,
                    examTitle: exam.title,
                    scheduledAt: exam.schedule.start,
                    duration: exam.schedule.duration,
                    classId: classId
                }
            });
        });

        // Notify exam teacher
        this.emitToUser(exam.teacher, 'exam:scheduled', {
            type: 'exam_scheduled_teacher',
            message: `You have scheduled a new exam: ${exam.title}`,
            title: 'Exam Scheduled',
            data: {
                examId: exam._id,
                examTitle: exam.title,
                scheduledAt: exam.schedule.start,
                classCount: classIds.length
            }
        });
    }

    /**
     * Send exam updated notification
     * @param {object} exam - Updated exam
     * @param {object} changes - Changed fields
     */
    static notifyExamUpdated(exam, changes) {
        this.emitToExam(exam._id, 'exam:updated', {
            type: 'exam_updated',
            message: `Exam "${exam.title}" has been updated`,
            title: 'Exam Updated',
            data: {
                examId: exam._id,
                examTitle: exam.title,
                changes: changes,
                updatedAt: new Date()
            }
        });
    }

    /**
     * Send exam cancelled notification
     * @param {object} exam - Cancelled exam
     * @param {string} reason - Cancellation reason
     */
    static notifyExamCancelled(exam, reason = '') {
        this.emitToExam(exam._id, 'exam:cancelled', {
            type: 'exam_cancelled',
            message: `Exam "${exam.title}" has been cancelled${reason ? ': ' + reason : ''}`,
            title: 'Exam Cancelled',
            priority: 'high',
            data: {
                examId: exam._id,
                examTitle: exam.title,
                reason: reason,
                cancelledAt: new Date()
            }
        });
    }

    /**
     * Send submission received notification
     * @param {object} submission - Exam submission
     * @param {object} student - Student who submitted
     * @param {object} exam - Related exam
     */
    static notifySubmissionReceived(submission, student, exam) {
        // Notify teacher
        this.emitToUser(exam.teacher, 'submission:received', {
            type: 'submission_received',
            message: `${student.fullName} submitted ${exam.title}`,
            title: 'New Submission Received',
            data: {
                submissionId: submission._id,
                studentId: student._id,
                studentName: student.fullName,
                examId: exam._id,
                examTitle: exam.title,
                submittedAt: submission.submittedAt
            }
        });
    }

    /**
     * Send submission graded notification
     * @param {object} submission - Graded submission
     * @param {object} exam - Related exam
     */
    static notifySubmissionGraded(submission, exam) {
        // Notify student
        this.emitToUser(submission.student, 'submission:graded', {
            type: 'submission_graded',
            message: `Your exam "${exam.title}" has been graded: ${submission.totalScore}/${exam.totalMarks}`,
            title: 'Exam Graded',
            data: {
                submissionId: submission._id,
                examId: exam._id,
                examTitle: exam.title,
                score: submission.totalScore,
                totalMarks: exam.totalMarks,
                percentage: submission.percentage,
                gradeLetter: submission.gradeLetter,
                gradedAt: submission.gradedAt
            }
        });
    }

    /**
     * Send student enrollment notification
     * @param {object} enrollment - Enrollment record
     * @param {object} student - Enrolled student
     * @param {object} classData - Class information
     */
    static notifyStudentEnrolled(enrollment, student, classData) {
        // Notify student
        this.emitToUser(student._id, 'enrollment:confirmed', {
            type: 'enrollment_confirmed',
            message: `You have been enrolled in ${classData.name}`,
            title: 'Enrollment Confirmed',
            data: {
                enrollmentId: enrollment._id,
                classId: classData._id,
                className: classData.name,
                enrolledAt: enrollment.enrolledAt
            }
        });

        // Notify class participants
        this.emitToClass(classData._id, 'student:joined', {
            type: 'student_joined_class',
            message: `${student.fullName} joined the class`,
            title: 'New Student Joined',
            data: {
                studentId: student._id,
                studentName: student.fullName,
                classId: classData._id,
                className: classData.name
            }
        });

        // Notify class teacher if exists
        if (classData.teacher) {
            this.emitToUser(classData.teacher, 'student:enrolled', {
                type: 'student_enrolled_teacher',
                message: `${student.fullName} enrolled in your class: ${classData.name}`,
                title: 'Student Enrolled',
                data: {
                    studentId: student._id,
                    studentName: student.fullName,
                    classId: classData._id,
                    className: classData.name
                }
            });
        }
    }

    /**
     * Send promotion cycle notifications
     * @param {object} promotionData - Promotion cycle data
     */
    static notifyPromotionStarted(promotionData) {
        this.emitToRole('systemAdmin', 'promotion:started', {
            type: 'promotion_started',
            message: `Promotion cycle initiated for ${promotionData.termName}`,
            title: 'Promotion Cycle Started',
            data: {
                termId: promotionData.termId,
                termName: promotionData.termName,
                startedAt: new Date()
            }
        });

        this.emitToRole('headmaster', 'promotion:started', {
            type: 'promotion_started',
            message: `Promotion cycle initiated for ${promotionData.termName}`,
            title: 'Promotion Cycle Started',
            data: {
                termId: promotionData.termId,
                termName: promotionData.termName,
                startedAt: new Date()
            }
        });
    }

    /**
     * Send promotion result notification
     * @param {object} promotionResult - Individual promotion result
     */
    static notifyPromotionResult(promotionResult) {
        const status = promotionResult.promoted ? 'promoted' : 'retained';
        const message = promotionResult.promoted 
            ? `Congratulations! You have been promoted to ${promotionResult.newClassName}`
            : `You have been retained in ${promotionResult.currentClassName}`;

        this.emitToUser(promotionResult.studentId, 'promotion:result', {
            type: 'promotion_result',
            message: message,
            title: 'Promotion Results',
            priority: 'high',
            data: {
                studentId: promotionResult.studentId,
                promoted: promotionResult.promoted,
                currentClass: promotionResult.currentClassName,
                newClass: promotionResult.newClassName,
                academicYear: promotionResult.academicYear
            }
        });
    }

    /**
     * Send role change notification
     * @param {string} userId - User whose role changed
     * @param {string} oldRole - Previous role
     * @param {string} newRole - New role
     */
    static notifyRoleChanged(userId, oldRole, newRole) {
        this.emitToUser(userId, 'role:updated', {
            type: 'role_updated',
            message: `Your role has been updated from ${oldRole} to ${newRole}`,
            title: 'Role Updated',
            priority: 'high',
            data: {
                userId: userId,
                oldRole: oldRole,
                newRole: newRole,
                updatedAt: new Date()
            }
        });

        // Notify system admins
        this.emitToRole('systemAdmin', 'user:role_changed', {
            type: 'user_role_changed',
            message: `User role changed from ${oldRole} to ${newRole}`,
            title: 'User Role Changed',
            data: {
                userId: userId,
                oldRole: oldRole,
                newRole: newRole,
                updatedAt: new Date()
            }
        });
    }

    /**
     * Send emergency/system alert
     * @param {string} message - Emergency message
     * @param {string} severity - Alert severity (low, medium, high, critical)
     */
    static sendEmergencyAlert(message, severity = 'high') {
        this.broadcast('system:emergency', {
            type: 'emergency_alert',
            message: message,
            title: 'URGENT ALERT',
            priority: 'critical',
            severity: severity,
            data: {
                alertId: require('crypto').randomUUID(),
                issuedAt: new Date(),
                severity: severity
            }
        });
    }
}

module.exports = SocketNotificationService;
