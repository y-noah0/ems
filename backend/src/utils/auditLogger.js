const AuditLog = require('../models/AuditLog');

/**
 * Log an audit event
 * @param {String} entityType - Type of entity (exam, submission, etc.)
 * @param {ObjectId} entityId - ID of the entity
 * @param {String} action - Action performed
 * @param {ObjectId} userId - ID of user who performed the action
 * @param {Object} previousValues - Previous state (optional)
 * @param {Object} newValues - New state (optional)
 */
exports.logAudit = async (entityType, entityId, action, userId, previousValues = null, newValues = null) => {
  try {
    await AuditLog.create({
      entityType,
      entityId,
      action,
      performedBy: userId,
      previousValues,
      newValues,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Non-blocking - we don't fail the request if audit logging fails
  }
};