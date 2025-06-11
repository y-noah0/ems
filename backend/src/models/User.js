const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcryptjs');

const UserSchema = new Schema({  role: {
    type: String,
    required: true,
    enum: ['student', 'teacher', 'dean', 'admin'],
    default: 'student'
  },
  fullName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  registrationNumber: {
    type: String,
    unique: true,
    required: function() {
      return this.role === 'student';
    }
  },
  passwordHash: {
    type: String,
    required: true
  },
  class: {
    type: Schema.Types.ObjectId,
    ref: 'Class',
    required: function() {
      return this.role === 'student';
    }
  },
  subjects: [{
    type: Schema.Types.ObjectId,
    ref: 'Subject',
    required: function() {
      return this.role === 'teacher';
    }
  }]
}, {
  timestamps: true
});

// Method to compare password
UserSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.passwordHash);
};

// Pre-save hook to hash password
UserSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('User', UserSchema);
