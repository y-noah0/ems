const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const { validationResult } = require('express-validator');
const mongoSanitize = require('express-mongo-sanitize');
const winston = require('winston');
const User = require('../models/User');
const School = require('../models/school');
const Enrollment = require('../models/enrollment');
const Class = require('../models/Class');
const Term = require('../models/term');
const { sendEmail } = require('../services/emailService');
const { sendSMS } = require('../services/twilioService');

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.File({ filename: 'auth.log' })]
});

// Simple in-memory rate limiter for notifications
const notificationRateLimit = new Map();
const NOTIFICATION_LIMIT = 5; // Max 5 notifications per user in 10 minutes
const NOTIFICATION_WINDOW = 10 * 60 * 1000; // 10 minutes in milliseconds

const checkNotificationRateLimit = (userId) => {
  const now = Date.now();
  const userNotifications = notificationRateLimit.get(userId) || { count: 0, startTime: now };

  if (now - userNotifications.startTime > NOTIFICATION_WINDOW) {
    userNotifications.count = 0;
    userNotifications.startTime = now;
  }

  if (userNotifications.count >= NOTIFICATION_LIMIT) {
    return false;
  }

  userNotifications.count += 1;
  notificationRateLimit.set(userId, userNotifications);
  return true;
};

// HTML email template with blue color scheme
const emailTemplate = (userFullName, message, subject) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f9ff; color: #333333;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f9ff; padding: 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #007bff; padding: 30px 20px; text-align: center; border-top-left-radius: 10px; border-top-right-radius: 10px;">
              <h1 style="color: #ffffff; font-size: 26px; margin: 0; font-weight: 500;">Education Management System</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px; font-size: 16px; line-height: 1.6; color: #333333;">
              <p style="margin: 0 0 15px; font-weight: bold;">Dear ${userFullName},</p>
              <p style="margin: 0 0 20px;">${message}</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666666; font-size: 13px; border-bottom-left-radius: 10px; border-bottom-right-radius: 10px;">
              <p style="margin: 0 0 8px;">Education Management System &copy; ${new Date().getFullYear()}</p>
              <p style="margin: 0;">Need help? Contact us at <a href="mailto:support@ems.com" style="color: #007bff; text-decoration: none; font-weight: bold;">support@ems.com</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Send notification (email, SMS, and socket.io)
const sendNotification = async (user, message, subject, req) => {
  // Only send notifications for deans, headmasters, or teachers
  const notifyRoles = ['dean', 'headmaster', 'teacher'];
  if (!notifyRoles.includes(user.role)) {
    logger.info('Notification skipped: User role not in target roles', { userId: user._id, role: user.role, ip: req.ip });
    return true; // Skip silently but return true to avoid blocking the action
  }

  if (!checkNotificationRateLimit(user._id)) {
    logger.warn('Notification rate limit exceeded', { userId: user._id, ip: req.ip });
    return false;
  }

  const results = { email: false, sms: false, socket: false };
  const { email, sms } = user.preferences.notifications;

  // Convert HTML message to plain text for SMS and email fallback
  const plainTextMessage = message.replace(/<[^>]+>/g, '');

  // Socket.io notification
  try {
    req.io.to(user._id).emit('notification', { message: plainTextMessage });
    results.socket = true;
    logger.info('Socket notification sent', { userId: user._id, message: plainTextMessage, ip: req.ip });
  } catch (error) {
    logger.error('Error sending socket notification', { userId: user._id, error: error.message, ip: req.ip });
  }

  // Email notification
  if (email && user.email) {
    try {
      const htmlContent = emailTemplate(user.fullName, message, subject);
      await sendEmail(user.email, subject, plainTextMessage, htmlContent);
      results.email = true;
      logger.info('Email notification sent', { userId: user._id, email: user.email, subject, ip: req.ip });
    } catch (error) {
      logger.error('Error sending email notification', { userId: user._id, email: user.email, error: error.message, ip: req.ip });
    }
  }

  // SMS notification (fallback if email fails or not enabled)
  if (sms && user.phoneNumber && (!email || !results.email)) {
    try {
      await sendSMS(user.phoneNumber, plainTextMessage);
      results.sms = true;
      logger.info('SMS notification sent', { userId: user._id, phoneNumber: user.phoneNumber, message: plainTextMessage, ip: req.ip });
    } catch (error) {
      logger.error('Error sending SMS notification', { userId: user._id, phoneNumber: user.phoneNumber, error: error.message, ip: req.ip });
    }
  }

  return results.email || results.sms || results.socket;
};

// Generate unique registration number for students (e.g., STU2025002)
const generateRegistrationNumber = async () => {
  const year = new Date().getFullYear();
  let isUnique = false;
  let registrationNumber;
  const maxAttempts = 100;
  let attempts = 0;

  while (!isUnique && attempts < maxAttempts) {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in register', { errors: errors.array(), ip: req.ip });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

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

    if (email && role !== 'student') {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        logger.warn('Email already exists', { email, ip: req.ip });
        return res.status(400).json({ success: false, message: 'Email already exists' });
      }
    }

    let registrationNumber;
    if (role === 'student') {
      registrationNumber = await generateRegistrationNumber();
    } else if (req.body.registrationNumber) {
      logger.warn('Registration number provided for non-student role', { role, ip: req.ip });
      return res.status(400).json({ success: false, message: 'Registration number is only allowed for students' });
    }

    if (role === 'student' && subjects?.length) {
      logger.warn('Subjects provided for student', { role, ip: req.ip });
      return res.status(400).json({ success: false, message: 'Students cannot have subjects' });
    }

    if (['dean', 'admin', 'headmaster'].includes(role) && subjects?.length) {
      logger.warn('Subjects provided for non-teacher role', { role, ip: req.ip });
      return res.status(400).json({ success: false, message: 'Subjects are only allowed for teachers' });
    }

    const verificationCode = role !== 'student' ? Math.floor(100000 + Math.random() * 900000).toString() : undefined;

    const user = new User({
      fullName,
      passwordHash: password,
      role,
      school: ['student', 'teacher', 'dean'].includes(role) ? schoolId : null,
      registrationNumber,
      email: role !== 'student' ? email : email || undefined,
      phoneNumber,
      profilePicture,
      preferences: { notifications: { email: !!email, sms: !!phoneNumber }, theme: 'light' },
      class: role === 'student' && classId ? classId : undefined,
      emailVerificationToken: verificationCode,
      parentFullName: role === 'student' ? parentFullName : undefined,
      parentNationalId: role === 'student' ? parentNationalId : undefined,
      parentPhoneNumber: role === 'student' ? parentPhoneNumber : undefined
    });

    await user.save();
    logger.info('User registered', { userId: user._id, role, ip: req.ip });

    if (role === 'student') {
      if (!classId || !termId) {
        logger.warn('Missing classId or termId for student enrollment', { userId: user._id, ip: req.ip });
        return res.status(400).json({ success: false, message: 'classId and termId are required for student enrollment' });
      }

      const classDoc = await Class.findById(classId);
      if (!classDoc) {
        logger.warn('Invalid class ID', { classId, userId: user._id, ip: req.ip });
        return res.status(400).json({ success: false, message: 'Invalid class ID' });
      }

      const termDoc = await Term.findById(termId);
      if (!termDoc) {
        logger.warn('Invalid term ID', { termId, userId: user._id, ip: req.ip });
        return res.status(400).json({ success: false, message: 'Invalid term ID' });
      }

      if (classDoc.school.toString() !== schoolId) {
        logger.warn('Class does not belong to specified school', { classId, schoolId, userId: user._id, ip: req.ip });
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
      logger.info('Student enrolled', { enrollmentId: enrollment._id, userId: user._id, ip: req.ip });
    }

    if (role !== 'student' && email) {
      const message = `Welcome to the EMS! Your account has been successfully registered. Your verification code is: <strong>${user.emailVerificationToken}</strong>. Please use this code to verify your email in the EMS application.`;
      const sent = await sendNotification(user, message, 'EMS Account Registration', req);
      if (!sent) {
        logger.error('Failed to send registration notification', { userId: user._id, ip: req.ip });
        return res.status(500).json({ success: false, message: 'User registered, but failed to send registration notification', userId: user._id });
      }
    } else if (role === 'student') {
      const message = `Welcome, ${user.fullName}! Your registration number is ${registrationNumber}.`;
      await sendNotification(user, message, 'Welcome to EMS', req); // Skipped due to role check
    }

    res.status(201).json({
      success: true,
      message: 'User registered. Verify email if applicable.',
      userId: user._id,
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
      logger?.warn?.('Validation errors in login', { errors: errors.array(), ip: req.ip });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { identifier, password, twoFactorCode } = req.body;
    let user = await User.findOne({ email: identifier.toLowerCase(), isDeleted: false });

    if (!user) {
      const candidates = await User.find({ fullName: identifier, isDeleted: false });
      for (const candidate of candidates) {
        if (await candidate.comparePassword(password)) {
          user = candidate;
          break;
        }
      }

      if (!user) {
        logger?.warn?.('Invalid credentials: no match found', { identifier, ip: req.ip });
        return res.status(400).json({ success: false, message: 'Invalid credentials' });
      }
    } else {
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        logger?.warn?.('Invalid password', { userId: user._id, ip: req.ip });
        return res.status(400).json({ success: false, message: 'Invalid credentials' });
      }
    }

    if (!user.emailVerified && user.role !== 'student') {
      logger?.warn?.('Email not verified', { userId: user._id, ip: req.ip });
      return res.status(400).json({ success: false, message: 'Email not verified' });
    }

    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        logger?.warn?.('2FA code required', { userId: user._id, ip: req.ip });
        return res.status(400).json({ success: false, message: '2FA code required' });
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorCode,
      });

      if (!verified) {
        logger?.warn?.('Invalid 2FA code', { userId: user._id, ip: req.ip });
        return res.status(400).json({ success: false, message: 'Invalid 2FA code' });
      }
    }

    // Ensure updateLastLogin doesn't throw
    if (user.updateLastLogin) {
      await user.updateLastLogin();
    }

    const payload = {
      id: user._id,
      role: user.role,
      tokenVersion: user.tokenVersion || 0,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'your_jwt_secret', {
      expiresIn: '12h',
    });

    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'your_refresh_secret', {
      expiresIn: '7d',
    });

    // sendNotification should not break login
    try {
      await sendNotification(user, `You logged in at ${new Date().toISOString()}`, 'EMS Login Notification', req);
    } catch (notifyErr) {
      logger?.warn?.('Notification error during login', { userId: user._id, error: notifyErr.message });
    }

    logger?.info?.('User logged in', { userId: user._id, ip: req.ip });

    return res.json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        registrationNumber: user.registrationNumber,
        school: user.school,
        phoneNumber: user.phoneNumber,
        profilePicture: user.profilePicture,
        preferences: user.preferences,
      },
    });

  } catch (error) {
    logger?.error?.('Error in login', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
    });

    return res.status(500).json({
      success: false,
      message: 'Server iraturitse shn 😓',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Logout user
const logout = async (req, res) => {
  try {
    await req.user.invalidateTokens();
    await sendNotification(req.user, 'You have been logged out successfully', 'EMS Logout Notification', req);
    logger.info('User logged out', { userId: req.user._id, ip: req.ip });
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

    await sendNotification(user, 'Your email has been successfully verified for your EMS account.', 'EMS Email Verification', req);
    logger.info('Email verified', { userId: user._id, ip: req.ip });

    const payload = { id: user._id, role: user.role, tokenVersion: user.tokenVersion };
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
      { id: user._id, role: user.role, tokenVersion: user.tokenVersion },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    await sendNotification(user, 'Your session token has been refreshed', 'EMS Token Refresh Notification', req);
    logger.info('Token refreshed', { userId: user._id, ip: req.ip });

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

    const message = `A password reset request has been made for your EMS account. Use this link to reset your password: <a href="${process.env.APP_URL}/reset-password?token=${resetToken}">Reset Password</a>. This link expires in 1 hour.`;
    const sent = await sendNotification(user, message, 'EMS Password Reset Request', req);
    if (!sent) {
      logger.error('Failed to send password reset notification', { userId: user._id, ip: req.ip });
      return res.status(500).json({ success: false, message: 'Failed to send password reset notification' });
    }

    logger.info('Password reset request processed', { userId: user._id, ip: req.ip });
    res.json({ success: true, message: 'Password reset notification sent' });
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

    user.passwordHash = newPassword;
    user.emailVerificationToken = null;
    await user.save();

    await sendNotification(user, 'Your password has been successfully reset for your EMS account.', 'EMS Password Reset Confirmation', req);
    logger.info('Password reset successful', { userId: user._id, ip: req.ip });

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
    const user = await User.findById(req.user._id);
    if (user.twoFactorEnabled) {
      logger.warn('2FA already enabled', { userId: user._id, ip: req.ip });
      return res.status(400).json({ success: false, message: '2FA already enabled' });
    }

    const secret = speakeasy.generateSecret();
    user.twoFactorSecret = secret.base32;
    user.twoFactorEnabled = true;
    await user.save();

    await sendNotification(user, 'Two-factor authentication has been successfully enabled for your EMS account.', 'EMS 2FA Enabled', req);
    logger.info('2FA enabled', { userId: user._id, ip: req.ip });

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
    const user = await User.findById(req.user._id);
    if (!user) {
      logger.warn('User not found', { userId: req.user._id, ip: req.ip });
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const updates = req.body;
    delete updates.passwordHash;
    delete updates.role;
    delete updates.emailVerificationToken;
    delete updates.tokenVersion;

    Object.assign(user, updates);
    await user.save();

    await sendNotification(user, 'Your profile has been successfully updated for your EMS account.', 'EMS Profile Update', req);
    logger.info('Profile updated', { userId: user._id, ip: req.ip });

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