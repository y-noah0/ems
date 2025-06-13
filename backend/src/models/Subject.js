const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SubjectSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  class: [{
    type: Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  }],
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  description: {
    type: String,
    trim: true
  },
  credits: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Create a compound index to ensure uniqueness of name and class combination
SubjectSchema.index({ name: 1, class: 1 }, { unique: true });

module.exports = mongoose.model('Subject', SubjectSchema);
