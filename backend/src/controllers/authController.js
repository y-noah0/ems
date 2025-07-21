const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const nodemailer = require('nodemailer');
const { validationResult } = require('express-validator');
const mongoSanitize = require('express-mongo-sanitize');
const winston = require('winston');
const User = require('../models/User');
const School = require('../models/school');
const Enrollment = require('../models/enrollment');
const Class = require('../models/Class');
const Term = require('../models/term');

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.File({ filename: 'auth.log' })]
});

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Generate unique registration number for students (e.g., STU2025002)
const generateRegistrationNumber = async () => {
  const year = new Date().getFullYear();
  let isUnique = false;
  let registrationNumber;
  const maxAttempts = 100;
  let attempts = 0;

  while (!isUnique && attempts < maxAttempts) {
    const randomNum = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
    registrationNumber = `STU${year}${randomNum}`;
    const existingUser = await User.findOne({ registrationNumber });
    if (!existingUser) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    throw new Error('Unable to generate unique registration number after maximum attempts');
  }
  return registrationNumber;
};

// Register a new user
const register = async (req, res) => {
  try {
    // Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in register', { errors: errors.array(), ip: req.ip });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Sanitize inputs
    mongoSanitize.sanitize(req.body);

    const {
      email,
      password,
      fullName,
      role = 'student',
      schoolId,
      phoneNumber,
      subjects,
      profilePicture,
      classId,
      termId,
      parentFullName,
      parentNationalId,
      parentPhoneNumber
    } = req.body;

    // Validate schoolId for student, teacher, dean
    if (['student', 'teacher', 'dean'].includes(role)) {
      if (!schoolId) {
        logger.warn('Missing school ID for required role', { role, ip: req.ip });
        return res.status(400).json({ success: false, message: 'School ID is required for this role' });
      }
      const school = await School.findById(schoolId);
      if (!school) {
        logger.warn('Invalid school ID', { schoolId, ip: req.ip });
        return res.status(400).json({ success: false, message: 'Invalid school ID' });
      }
    }

    // Check email uniqueness for non-student roles
    if (email && role !== 'student') {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        logger.warn('Email already exists', { email, ip: req.ip });
        return res.status(400).json({ success: false, message: 'Email already exists' });
      }
    }

    // Generate registration number for students
    let registrationNumber;
    if (role === 'student') {
      registrationNumber = await generateRegistrationNumber();
    } else if (req.body.registrationNumber) {
      logger.warn('Registration number provided for non-student role', { role, ip: req.ip });
      return res.status(400).json({ success: false, message: 'Registration number is only allowed for students' });
    }

    // Validate subjects
    if (role === 'student' && subjects?.length) {
      logger.warn('Subjects provided for student', { role, ip: req.ip });
      return res.status(400).json({ success: false, message: 'Students cannot have subjects' });
    }

    if (['dean', 'admin', 'headmaster'].includes(role) && subjects?.length) {
      logger.warn('Subjects provided for non-teacher role', { role, ip: req.ip });
      return res.status(400).json({ success: false, message: 'Subjects are only allowed for teachers' });
    }

    // Create user
    const user = new User({
      fullName,
      passwordHash: password, // Schema will hash
      role,
      school: ['student', 'teacher', 'dean'].includes(role) ? schoolId : null,
      registrationNumber,
      email: role !== 'student' ? email : email || undefined,
      phoneNumber,
      profilePicture,
      preferences: { notifications: { email: !!email, sms: !!phoneNumber }, theme: 'light' },
      class: role === 'student' && classId ? classId : undefined,
      emailVerificationToken: role !== 'student' ? speakeasy.generateSecret({ length: 20 }).base32 : undefined,
      parentFullName: role === 'student' ? parentFullName : undefined,
      parentNationalId: role === 'student' ? parentNationalId : undefined,
      parentPhoneNumber: role === 'student' ? parentPhoneNumber : undefined
    });

    // Save user
    await user.save();
    logger.info('User registered', { userId: user.id, role, ip: req.ip });

    // Enroll student
    if (role === 'student') {
      if (!classId || !termId) {
        logger.warn('Missing classId or termId for student enrollment', { userId: user.id, ip: req.ip });
        return res.status(400).json({ success: false, message: 'classId and termId are required for student enrollment' });
      }

      const classDoc = await Class.findById(classId);
      if (!classDoc) {
        logger.warn('Invalid class ID', { classId, userId: user.id, ip: req.ip });
        return res.status(400).json({ success: false, message: 'Invalid class ID' });
      }

      const termDoc = await Term.findById(termId);
      if (!termDoc) {
        logger.warn('Invalid term ID', { termId, userId: user.id, ip: req.ip });
        return res.status(400).json({ success: false, message: 'Invalid term ID' });
      }

      if (classDoc.school.toString() !== schoolId) {
        logger.warn('Class does not belong to specified school', { classId, schoolId, userId: user.id, ip: req.ip });
        return res.status(400).json({ success: false, message: 'Class does not belong to the specified school' });
      }

      const enrollment = new Enrollment({
        student: user._id,
        class: classId,
        term: termId,
        school: schoolId,
        isActive: true
      });

      await enrollment.save();
      logger.info('Student enrolled', { enrollmentId: enrollment._id, userId: user.id, ip: req.ip });
    }

    // Send verification email for non-students
    if (role !== 'student' && email) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: 'Verify Your Email',
          html: `<p>Please verify your email by clicking <a href="${process.env.APP_URL}/verify-email?token=${user.emailVerificationToken}">here</a>.</p>`
        });
        req.io.to(user.id).emit('notification', { message: 'Verification email sent' });
        logger.info('Verification email sent', { userId: user.id, email, ip: req.ip });
      } catch (emailError) {
        logger.error('Error sending verification email', { error: emailError.message, userId: user.id, ip: req.ip });
        return res.status(500).json({ success: false, message: 'User registered, but failed to send verification email', userId: user.id });
      }
    }

    res.status(201).json({
      success: true,
      message: 'User registered. Verify email if applicable.',
      userId: user.id,
      registrationNumber: role === 'student' ? registrationNumber : undefined
    });
  } catch (error) {
    logger.error('Error in register', { error: error.message, stack: error.stack, ip: req.ip });
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in login', { errors: errors.array(), ip: req.ip });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { identifier, password, twoFactorCode } = req.body;

    let user = await User.findOne({ email: identifier.toLowerCase(), isDeleted: false });

    if (!user) {
      const candidates = await User.find({ fullName: identifier, isDeleted: false });
      for (const candidate of candidates) {
        const match = await candidate.comparePassword(password);
        if (match) {
          user = candidate;
          break;
        }
      }

      if (!user) {
        logger.warn('Invalid credentials', { identifier, ip: req.ip });
        return res.status(400).json({ success: false, message: 'Invalid credentials' });
      }
    } else {
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        logger.warn('Invalid password', { userId: user.id, ip: req.ip });
        return res.status(400).json({ success: false, message: 'Invalid credentials' });
      }
    }

    if (!user.emailVerified && user.role !== 'student') {
      logger.warn('Email not verified', { userId: user.id, ip: req.ip });
      return res.status(400).json({ success: false, message: 'Email not verified' });
    }

    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        logger.warn('2FA code required', { userId: user.id, ip: req.ip });
        return res.status(400).json({ success: false, message: '2FA code required' });
      }
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorCode
      });
      if (!verified) {
        logger.warn('Invalid 2FA code', { userId: user.id, ip: req.ip });
        return res.status(400).json({ success: false, message: 'Invalid 2FA code' });
      }
    }

    await user.updateLastLogin();

    const payload = { id: user.id, role: user.role, tokenVersion: user.tokenVersion };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    req.io.to(user.id).emit('notification', { message: `Logged in at ${new Date().toISOString()}` });
    logger.info('User logged in', { userId: user.id, ip: req.ip });

    res.json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        registrationNumber: user.registrationNumber,
        school: user.school,
        phoneNumber: user.phoneNumber,
        profilePicture: user.profilePicture,
        preferences: user.preferences
      }
    });
  } catch (error) {
    logger.error('Error in login', { error: error.message, stack: error.stack, ip: req.ip });
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Logout user
const logout = async (req, res) => {
  try {
    await req.user.invalidateTokens();
    req.io.to(req.user.id).emit('notification', { message: 'Logged out successfully' });
    logger.info('User logged out', { userId: req.user.id, ip: req.ip });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Error in logout', { error: error.message, stack: error.stack, ip: req.ip });
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Verify email
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findOne({ emailVerificationToken: token });
    if (!user) {
      logger.warn('Invalid or expired verification token', { ip: req.ip });
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    user.emailVerificationToken = null;
    user.emailVerified = true;
    await user.save();
    logger.info('Email verified', { userId: user.id, ip: req.ip });

    const payload = { id: user.id, role: user.role, tokenVersion: user.tokenVersion };
    const tokenJwt = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    res.json({ success: true, token: tokenJwt, refreshToken });
  } catch (error) {
    logger.error('Error in verifyEmail', { error: error.message, stack: error.stack, ip: req.ip });
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Refresh token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(payload.id);

    if (!user || user.isDeleted || user.tokenVersion !== payload.tokenVersion) {
      logger.warn('Invalid or expired refresh token', { userId: payload.id, ip: req.ip });
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const newToken = jwt.sign(
      { id: user.id, role: user.role, tokenVersion: user.tokenVersion },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );
    logger.info('Token refreshed', { userId: user.id, ip: req.ip });

    res.json({ success: true, token: newToken });
  } catch (error) {
    logger.error('Error in refreshToken', { error: error.message, stack: error.stack, ip: req.ip });
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Request password reset
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn('Email not found for password reset', { email, ip: req.ip });
      return res.status(400).json({ success: false, message: 'Email not found' });
    }

    const resetToken = speakeasy.generateSecret({ length: 20 }).base32;
    user.emailVerificationToken = resetToken;
    user.emailVerified = false;
    await user.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      html: `<p>Reset your password by clicking <a href="${process.env.APP_URL}/reset-password?token=${resetToken}">here</a>. This link expires in 1 hour.</p>`
    });

    req.io.to(user.id).emit('notification', { message: 'Password reset email sent' });
    logger.info('Password reset email sent', { userId: user.id, ip: req.ip });
    res.json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    logger.error('Error in requestPasswordReset', { error: error.message, stack: error.stack, ip: req.ip });
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const user = await User.findOne({ emailVerificationToken: token });
    if (!user) {
      logger.warn('Invalid or expired reset token', { ip: req.ip });
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    user.passwordHash = newPassword; // Schema will hash
    user.emailVerificationToken = null;
    await user.save();
    logger.info('Password reset successful', { userId: user.id, ip: req.ip });

    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    logger.error('Error in resetPassword', { error: error.message, stack: error.stack, ip: req.ip });
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Enable 2FA
const enable2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.twoFactorEnabled) {
      logger.warn('2FA already enabled', { userId: user.id, ip: req.ip });
      return res.status(400).json({ success: false, message: '2FA already enabled' });
    }

    const secret = speakeasy.generateSecret();
    user.twoFactorSecret = secret.base32;
    user.twoFactorEnabled = true;
    await user.save();
    logger.info('2FA enabled', { userId: user.id, ip: req.ip });

    res.json({ success: true, message: '2FA enabled', secret: secret.otpauth_url });
  } catch (error) {
    logger.error('Error in enable2FA', { error: error.message, stack: error.stack, ip: req.ip });
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      logger.warn('User not found', { userId: req.user.id, ip: req.ip });
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const updates = req.body;
    delete updates.passwordHash;
    delete updates.role;
    delete updates.emailVerificationToken;
    delete updates.tokenVersion;

    Object.assign(user, updates);
    await user.save();
    logger.info('Profile updated', { userId: user.id, ip: req.ip });

    res.json({ success: true, message: 'Profile updated', user });
  } catch (error) {
    logger.error('Error in updateProfile', { error: error.message, stack: error.stack, ip: req.ip });
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  verifyEmail,
  refreshToken,
  requestPasswordReset,
  resetPassword,
  enable2FA,
  updateProfile
};