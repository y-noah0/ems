const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const nodemailer = require('nodemailer');
const { validationResult } = require('express-validator');
const winston = require('winston');
const User = require('../models/User');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.File({ filename: 'auth.log' })]
});

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in register', { errors: errors.array(), ip: req.ip });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      email,
      password,
      fullName,
      role,
      registrationNumber,
      schoolId,
      phoneNumber,
      subjects,
      profilePicture,
      classId,
      termId
    } = req.body;

    const School = require('../models/school');
    const school = await School.findById(schoolId);
    if (!school) {
      logger.warn('Invalid school ID', { schoolId, ip: req.ip });
      return res.status(400).json({ success: false, message: 'Invalid school ID' });
    }

    let user;
    if (email && role !== 'student') {
      user = await User.findOne({ email });
      if (user) {
        logger.warn('Email already exists', { email, ip: req.ip });
        return res.status(400).json({ success: false, message: 'Email already exists' });
      }
    } else if (role === 'student' && registrationNumber) {
      user = await User.findOne({ registrationNumber });
      if (user) {
        logger.warn('Registration number already exists', { registrationNumber, ip: req.ip });
        return res.status(400).json({ success: false, message: 'Registration number already exists' });
      }
    }

    if (role === 'student' && subjects?.length) {
      return res.status(400).json({ success: false, message: 'Students cannot have subjects' });
    }
    if (role === 'teacher') {
      if (!subjects?.length) {
        return res.status(400).json({ success: false, message: 'Teachers require subjects' });
      }
      // Validate that all subjects belong to the specified school
      const SubjectModel = require('../models/Subject');
      const count = await SubjectModel.countDocuments({ _id: { $in: subjects }, school: schoolId });
      if (count !== subjects.length) {
        logger.warn('Subject-school mismatch during registration', { subjects, schoolId, ip: req.ip });
        return res.status(400).json({ success: false, message: 'All subjects must belong to the user’s school' });
      }
    }
    if (['dean', 'admin', 'headmaster'].includes(role) && (subjects?.length || registrationNumber)) {
      return res.status(400).json({ success: false, message: 'Invalid fields for this role' });
    }

    // Simple password validation - just 8 characters minimum
    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
    }

    const verificationToken = speakeasy.generateSecret({ length: 20 }).base32;
    user = new User({
      fullName,
      passwordHash: password, // The User model will hash this automatically
      role: role || 'student',
      school: schoolId,
      registrationNumber: role === 'student' ? registrationNumber : undefined,
      email: role !== 'student' ? email : email || undefined,
      phoneNumber,
      subjects: role === 'teacher' ? subjects : [],
      profilePicture,
      preferences: { notifications: { email: !!email, sms: !!phoneNumber }, theme: 'light' },
      emailVerificationToken: role !== 'student' ? verificationToken : undefined
    });

    // Store classId for student user document if provided
    if (role === 'student' && classId) {
      user.class = classId;
    }

    await user.save();

    // Assign headmaster to school record
    if (role === 'headmaster') {
      const SchoolModel = require('../models/School');
      await SchoolModel.findByIdAndUpdate(schoolId, { headmaster: user._id });
    }

    // AUTOMATIC ENROLLMENT CREATION for students
    if (role === 'student') {
      if (!classId || !termId) {
        logger.warn('Missing classId or termId for student enrollment', { userId: user.id, ip: req.ip });
        return res.status(400).json({
          success: false,
          message: 'classId and termId are required for student enrollment'
        });
      }

      try {
        const Enrollment = require('../models/enrollment');
        const Class = require('../models/Class');
        const Term = require('../models/term');

        // Validate class
        const classDoc = await Class.findById(classId);
        if (!classDoc) {
          logger.warn('Invalid class ID for enrollment', { classId, userId: user.id, ip: req.ip });
          return res.status(400).json({ success: false, message: 'Invalid class ID' });
        }
        // Validate term
        const termDoc = await Term.findById(termId);
        if (!termDoc) {
          logger.warn('Invalid term ID for enrollment', { termId, userId: user.id, ip: req.ip });
          return res.status(400).json({ success: false, message: 'Invalid term ID' });
        }
        // Check that class belongs to the same school
        if (classDoc.school.toString() !== schoolId) {
          logger.warn('Class school mismatch during enrollment', { classId, schoolId, userId: user.id, ip: req.ip });
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

        logger.info('Enrollment created automatically for new student', { enrollmentId: enrollment._id, userId: user.id });
      } catch (err) {
        logger.error('Failed to create enrollment during student registration', { error: err.message, userId: user.id, ip: req.ip });
        return res.status(500).json({ success: false, message: 'Failed to create enrollment' });
      }
    }

    if (role !== 'student' && email) {
      // Attempt to send verification email if SMTP credentials are configured
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        try {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Verify Your Email',
            html: `<p>Please verify your email by clicking <a href="${process.env.APP_URL}/verify-email?token=${verificationToken}">here</a>.</p>`
          });
          req.io.to(user.id).emit('notification', { message: 'Verification email sent' });
        } catch (emailErr) {
          logger.error('Failed to send verification email', { error: emailErr.message, userId: user.id, ip: req.ip });
        }
      } else {
        logger.warn('Email credentials not configured, skipping verification email', { ip: req.ip });
      }
    }

    logger.info('User registered', { userId: user.id, email, registrationNumber });
    res.status(201).json({ success: true, message: 'User registered. Verify email if applicable.', userId: user.id });
  } catch (error) {
    logger.error('Error in register', { error: error.message, ip: req.ip });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findOne({ emailVerificationToken: token });
    if (!user) {
      logger.warn('Invalid verification token', { token, ip: req.ip });
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    user.emailVerificationToken = null;
    user.emailVerified = true;
    await user.save();

    const payload = { id: user.id, role: user.role, tokenVersion: user.tokenVersion };
    const tokenJwt = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    req.io.to(user.id).emit('notification', { message: 'Email verified successfully' });
    logger.info('Email verified', { userId: user.id });
    res.json({ success: true, token: tokenJwt, refreshToken });
  } catch (error) {
    logger.error('Error in verifyEmail', { error: error.message, ip: req.ip });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in login', { errors: errors.array(), ip: req.ip });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { identifier, password, twoFactorCode } = req.body;

    const user = await User.findOne({
      $or: [
        { email: identifier },
        { registrationNumber: identifier },
        { fullName: identifier }
      ],
      isDeleted: false
    });

    if (!user) {
      logger.warn('Invalid credentials', { identifier, ip: req.ip });
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.emailVerified && user.role !== 'student') {
      logger.warn('Email not verified', { userId: user.id, ip: req.ip });
      return res.status(400).json({ success: false, message: 'Email not verified' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.warn('Invalid password', { userId: user.id, ip: req.ip });
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.twoFactorEnabled) {
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

    logger.info('User logged in', { userId: user.id });
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
    logger.error('Error in login', { error: error.message, ip: req.ip });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const logout = async (req, res) => {
  try {
    await req.user.invalidateTokens();
    req.io.to(req.user.id).emit('notification', { message: 'Logged out successfully' });
    logger.info('User logged out', { userId: req.user.id });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Error in logout', { error: error.message, ip: req.ip });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

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

    logger.info('Token refreshed', { userId: user.id });
    res.json({ success: true, token: newToken });
  } catch (error) {
    logger.error('Error in refreshToken', { error: error.message, ip: req.ip });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

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

    logger.info('Password reset requested', { userId: user.id });
    res.json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    logger.error('Error in requestPasswordReset', { error: error.message, ip: req.ip });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const user = await User.findOne({ emailVerificationToken: token });
    if (!user) {
      logger.warn('Invalid password reset token', { token, ip: req.ip });
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.passwordHash = hashedPassword;
    user.emailVerificationToken = null;
    await user.save();

    logger.info('Password reset successful', { userId: user.id });
    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    logger.error('Error in resetPassword', { error: error.message, ip: req.ip });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const enable2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.twoFactorEnabled) {
      return res.status(400).json({ success: false, message: '2FA already enabled' });
    }

    const secret = speakeasy.generateSecret();
    user.twoFactorSecret = secret.base32;
    user.twoFactorEnabled = true;
    await user.save();

    logger.info('2FA enabled', { userId: user.id });
    res.json({ success: true, message: '2FA enabled', secret: secret.otpauth_url });
  } catch (error) {
    logger.error('Error in enable2FA', { error: error.message, ip: req.ip });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      logger.warn('User not found for profile update', { userId: req.user.id, ip: req.ip });
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const updates = req.body;

    // Prevent sensitive fields update
    delete updates.passwordHash;
    delete updates.role;
    delete updates.emailVerificationToken;
    delete updates.tokenVersion;

    Object.assign(user, updates);
    await user.save();

    logger.info('Profile updated', { userId: user.id });
    res.json({ success: true, message: 'Profile updated', user });
  } catch (error) {
    logger.error('Error in updateProfile', { error: error.message, ip: req.ip });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get current authenticated user
const getCurrentUser = async (req, res) => {
  // req.user is set by authenticate middleware
  res.json({ success: true, user: req.user });
};

module.exports = {
  register,
  verifyEmail,
  login,
  logout,
  refreshToken,
  requestPasswordReset,
  resetPassword,
  enable2FA,
  updateProfile,
  getCurrentUser
};
