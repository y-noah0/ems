const dotenv = require('dotenv');
// Load environment variables
dotenv.config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { initializeSocket, getIO } = require('./socketServer');
const Exam = require('./models/Exam');
const Submission = require('./models/Submission');
const schedule = require('node-schedule');

const app = express();
const server = http.createServer(app);

// ⚡ Initialize Socket.IO with authentication
const io = initializeSocket(server);

// 🔒 Security & Middleware
app.use(cors());
app.use(helmet());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev')); // HTTP request logger

// --- Serve uploads folder statically for image access ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Attach io instance to each request for controllers to use
app.use((req, res, next) => {
  req.io = getIO();
  next();
});

// 🛣️ Routes
const routes = require('./routes');
app.use('/api', routes);

// Logger setup
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

const PORT = process.env.PORT || 5000;

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/school-exam-system', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    logger.info('✅ MongoDB connected');

    // Start scheduled jobs (e.g., promotion scheduler)
    try {
      require('./jobs/promotionScheduler').startCronJobs();
    } catch (error) {
      logger.error('Error loading promotion scheduler:', error.message, error.stack);
    }

    // Initialize auto-submission jobs for active exams
    const initializeAutoSubmissionJobs = async () => {
      const now = new Date();
      const activeExams = await Exam.find({
        status: 'active',
        isDeleted: false,
        'schedule.start': { $exists: true },
        'schedule.duration': { $exists: true },
      });
      for (const exam of activeExams) {
        const endTime = new Date(new Date(exam.schedule.start).getTime() + exam.schedule.duration * 60000);
        if (endTime > now) {
          schedule.scheduleJob(`auto-submit-${exam._id}`, endTime, async () => {
            try {
              const submissions = await Submission.find({
                exam: exam._id,
                status: 'in-progress',
                isDeleted: false,
              });
              for (const submission of submissions) {
                submission.status = 'submitted';
                submission.submittedAt = new Date();
                await submission.save();
                
                // Real-time notification for auto-submission
                io.to(`user:${submission.student.toString()}`).emit('exam:auto-submitted', {
                  type: 'exam_auto_submitted',
                  examId: exam._id,
                  submissionId: submission._id,
                  title: exam.title,
                  submittedAt: submission.submittedAt,
                  message: `Your exam "${exam.title}" was automatically submitted`
                });
                
                io.to(`user:${exam.teacher.toString()}`).emit('submission:auto-submitted', {
                  type: 'submission_auto_submitted',
                  examId: exam._id,
                  submissionId: submission._id,
                  studentId: submission.student,
                  title: exam.title,
                  submittedAt: submission.submittedAt,
                  message: `Student submission auto-submitted for "${exam.title}"`
                });
                
                logger.info('Auto-submitted submission', {
                  examId: exam._id,
                  submissionId: submission._id,
                  studentId: submission.student,
                });
              }
              logger.info('Auto-submission job completed', { examId: exam._id });
            } catch (error) {
              logger.error('Error in auto-submission job', {
                examId: exam._id,
                error: error.message,
                stack: error.stack,
              });
            }
          });
          logger.info('Auto-submission job scheduled on server start', {
            examId: exam._id,
            endTime,
          });
        }
      }
    };

    initializeAutoSubmissionJobs();

    // Start the server after DB is ready
    server.listen(PORT, () => {
      logger.info(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    logger.error('MongoDB connection error:', err.message, err.stack);
    process.exit(1);
  });

// API Routes (dynamically loaded)
const routesPath = path.join(__dirname, 'routes');
fs.readdirSync(routesPath).forEach(file => {
  if (file.endsWith('.js')) {
    const routeName = file.replace('.js', '');
    try {
      const route = require(`./routes/${routeName}`);
      app.use(`/api/${routeName}`, route);
    } catch (error) {
      logger.error(`Error loading route ${routeName}:`, error.message, error.stack);
    }
  }
});

// 404 Fallback
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
  });
});

// Error Handler
app.use((err, req, res, next) => {
  logger.error('Server error:', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    body: req.body,
    ip: req.ip
  });
  res.status(500).json({
    success: false,
    message: 'Server Error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});
