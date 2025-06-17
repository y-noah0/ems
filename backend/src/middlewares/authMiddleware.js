const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = {};

// Middleware to check if user is authenticated
authMiddleware.authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token, access denied'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.id).select('-passwordHash');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid'
      });
    }

    // Set user in request
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token is not valid'
    });
  }
};

// Middleware to check if user is admin
authMiddleware.isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access denied: System administrator privileges required'
    });
  }
};

// Middleware to check if user is admin/dean
authMiddleware.isDean = (req, res, next) => {
  if (req.user && (req.user.role === 'dean' || req.user.role === 'admin')) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Dean privileges required'
    });
  }
};

// Middleware to check if user is teacher
authMiddleware.isTeacher = (req, res, next) => {
  if (req.user && (req.user.role === 'teacher' || req.user.role === 'dean')) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Teacher privileges required'
    });
  }
};

// Middleware to check if user is student
authMiddleware.isStudent = (req, res, next) => {
  if (req.user && req.user.role === 'student') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Student privileges required'
    });
  }
};

// Middleware to check if user is either student or teacher
authMiddleware.isStudentOrTeacher = (req, res, next) => {
  if (req.user && (req.user.role === 'student' || req.user.role === 'teacher')) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Student or teacher privileges required'
    });
  }
};

// Check if user is a teacher, dean, or admin
authMiddleware.isTeacherOrDeanOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  if (req.user.role === 'teacher' || req.user.role === 'dean' || req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }
};

module.exports = authMiddleware;
