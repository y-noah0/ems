const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SubjectSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  school: {
    type: Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  trades: [{
    type: Schema.Types.ObjectId,
    ref: 'Trade'
  }],
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  credits: {
    type: Number,
    default: 1,
    min: 1
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

SubjectSchema.index({ name: 1, school: 1 }, { unique: true });

SubjectSchema.pre('save', async function (next) {
  if (this.isModified('teacher') && this.teacher) {
    const User = mongoose.model('User');
    const user = await User.findById(this.teacher);
    if (!user || user.role !== 'teacher') {
      return next(new Error('Teacher must be a user with role "teacher"'));
    }
  }
  next();
});

module.exports = mongoose.model('Subject', SubjectSchema);