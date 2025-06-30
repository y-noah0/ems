const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const http = require('http');
const routes = require('./routes');

dotenv.config();

const app = express();
const server = http.createServer(app);

// ⚡ Attach Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// 🔒 Security & Middleware
app.use(cors());
app.use(helmet());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  })
);
app.use((req, res, next) => {
  req.io = io;
  next();
});

// 🎧 Socket.IO events
io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined socket room`);
  });
});

// 🛣️ Routes
app.use('/api', routes);

// 💥 Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 🔌 MongoDB Connection (skip in test)
if (process.env.NODE_ENV !== 'test') {
  mongoose
    .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/school-exam-system', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log('MongoDB connected');
      const PORT = process.env.PORT || 5000;
      server.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err);
      process.exit(1);
    });
}

module.exports = app; // 🧪 For Jest + Supertest
