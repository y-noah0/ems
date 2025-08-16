const Notification = require('../models/Notification');
const { validationResult } = require('express-validator');
const winston = require('winston');
const mongoose = require('mongoose');

// Use your existing logger setup (make sure logger is defined)
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.File({ filename: 'notification.log' })]
});

const notificationController = {};

// Get user's notifications with school isolation (schoolId from query)
notificationController.getUserNotifications = async (req, res) => {
  try {
    const { schoolId } = req.query;
    const MAX_NOTIFICATIONS = 50;

    if (!schoolId || !mongoose.Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({ success: false, message: 'Valid schoolId is required' });
    }

    // Fetch only needed fields sorted newest first limited to MAX
    let notifications = await Notification.find({
      user: req.user.id,
      school: schoolId,
      isDeleted: false
    })
      .sort({ createdAt: -1 })
      .limit(MAX_NOTIFICATIONS)
      .lean();

    // Backward compatibility: include legacy notifications missing school field if none found
    if (!notifications.length) {
      const legacy = await Notification.find({ user: req.user.id, school: { $exists: false }, isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(MAX_NOTIFICATIONS)
        .lean();
      if (legacy.length) notifications = legacy;
    }

    // Count total to decide pruning
    const totalCount = await Notification.countDocuments({ user: req.user.id, school: schoolId, isDeleted: false });
    if (totalCount > MAX_NOTIFICATIONS) {
      // Find ids to prune (oldest beyond limit)
      const toPrune = await Notification.find({
        user: req.user.id,
        school: schoolId,
        isDeleted: false
      })
        .sort({ createdAt: 1 }) // oldest first
        .skip(0)
        .limit(totalCount - MAX_NOTIFICATIONS)
        .select('_id')
        .lean();
      const pruneIds = toPrune.map(d => d._id);
      if (pruneIds.length) {
        await Notification.updateMany({ _id: { $in: pruneIds } }, { $set: { isDeleted: true } });
      }
    }

    res.json({ success: true, notifications });
  } catch (error) {
    logger.error('getUserNotifications error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Mark notification as read (schoolId from body)
notificationController.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { schoolId } = req.body;

    if (!schoolId || !mongoose.Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({ success: false, message: 'Valid schoolId is required' });
    }

    const notification = await Notification.findOne({
      _id: notificationId,
      user: req.user.id,
      school: schoolId,
      isDeleted: false
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    logger.error('markAsRead error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Mark all notifications as read (schoolId from body)
notificationController.markAllAsRead = async (req, res) => {
  try {
    const { schoolId } = req.body;

    if (!schoolId || !mongoose.Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({ success: false, message: 'Valid schoolId is required' });
    }

    await Notification.updateMany(
      { user: req.user.id, school: schoolId, isRead: false, isDeleted: false },
      { isRead: true }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    logger.error('markAllAsRead error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Delete notification (schoolId from body)
notificationController.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { schoolId } = req.body;

    if (!schoolId || !mongoose.Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({ success: false, message: 'Valid schoolId is required' });
    }

    const notification = await Notification.findOne({
      _id: notificationId,
      user: req.user.id,
      school: schoolId
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    notification.isDeleted = true;
    await notification.save();

    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    logger.error('deleteNotification error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = notificationController;
