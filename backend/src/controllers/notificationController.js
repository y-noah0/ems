// src/controllers/notificationController.js
const Notification = require('../models/Notification');
const { validationResult } = require('express-validator');
const winston = require('winston');

// Use your existing logger setup

const notificationController = {};

// Get user's notifications
notificationController.getUserNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      user: req.user.id,
      isDeleted: false
    }).sort({ createdAt: -1 });
    
    res.json({ success: true, notifications });
  } catch (error) {
    logger.error('getUserNotifications error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Mark notification as read
notificationController.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await Notification.findOne({
      _id: notificationId,
      user: req.user.id,
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

// Mark all notifications as read
notificationController.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, isRead: false, isDeleted: false },
      { isRead: true }
    );
    
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    logger.error('markAllAsRead error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Delete notification
notificationController.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await Notification.findOne({
      _id: notificationId,
      user: req.user.id
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