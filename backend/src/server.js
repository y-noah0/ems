const dotenv = require('dotenv');
// Load environment variables
dotenv.config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { Server } = require('socket.io');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Initialize Express and HTTP server
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 5000;

// ===== Middleware =====
app.use(cors());
app.use(helmet());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev')); // HTTP request logger
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per window
}));

// Attach io instance to each request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ===== Socket.IO Events =====
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined socket room`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// ===== MongoDB Connection =====
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/school-exam-system', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('✅ MongoDB connected');

    // Start scheduled jobs (e.g., promotion scheduler)
    try {
      require('./jobs/promotionScheduler');
    } catch (error) {
      console.error('Error loading promotion scheduler:', error.message, error.stack);
    }

    // Start the server after DB is ready
    server.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message, err.stack);
    process.exit(1);
  });

// ===== API Routes =====
// Dynamically mount all route files in the routes folder
const routesPath = path.join(__dirname, 'routes');
fs.readdirSync(routesPath).forEach(file => {
  if (file.endsWith('.js')) {
    const routeName = file.replace('.js', '');
    try {
      const route = require(`./routes/${routeName}`);
      app.use(`/api/${routeName}`, route);
    } catch (error) {
      console.error(`Error loading route ${routeName}:`, error.message, error.stack);
    }
  }
});

// ===== 404 Fallback =====
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
  });
});

// ===== Error Handler =====
app.use((err, req, res, next) => {
  console.error('Server error:', {
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