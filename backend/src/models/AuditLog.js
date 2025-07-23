const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AuditLogSchema = new Schema({
  entityType: {
    type: String,
    required: true,
    enum: ['exam', 'submission', 'user', 'class', 'subject']
  },
  entityId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['create', 'update', 'delete', 'grade', 'status_change', 'schedule']
  },
  performedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  previousValues: Schema.Types.Mixed,
  newValues: Schema.Types.Mixed,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Indexes for efficient queries
AuditLogSchema.index({ entityType: 1, entityId: 1 });
AuditLogSchema.index({ performedBy: 1 });
AuditLogSchema.index({ timestamp: 1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);