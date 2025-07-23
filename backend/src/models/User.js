const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcryptjs');

const UserSchema = new Schema({
  role: {
    type: String,
    required: true,
    enum: ['student', 'teacher', 'dean', 'admin', 'headmaster'],
    default: 'student'
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    required: function () { return this.role !== 'student'; },
    sparse: true,
    unique: true
  },
  registrationNumber: {
    type: String,
    unique: true,
    sparse: true,
    required: function () { return this.role === 'student'; },
    trim: true,
    validate: {
      validator: function (v) { return this.role !== 'student' ? !v : true; },
      message: 'Registration number is only allowed for students'
    }
  },
  passwordHash: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return v.length >= 8;
      },
      message: 'Password must be at least 8 characters long'
    }
  },
  phoneNumber: {
    type: String,
    trim: true,
    match: [/^\+?\d{10,15}$/, 'Please enter a valid phone number'],
    default: null
  },
  school: {
    type: Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  subjects: [{
    type: Schema.Types.ObjectId,
    ref: 'Subject',
    required: function () { return this.role === 'teacher'; },
    validate: {
      validator: function (v) { return this.role !== 'teacher' ? v.length === 0 : true; },
      message: 'Subjects are only allowed for teachers'
    }
  }],
  profilePicture: {
    type: String,
    trim: true,
    match: [/^https?:\/\/.*\.(?:png|jpg|jpeg|svg|gif)$/i, 'Please enter a valid image URL'],
    default: null
  },
  preferences: {
    notifications: {
      email: { type: Boolean, default: function () { return !!this.parent().email; } },
      sms: { type: Boolean, default: function () { return !!this.parent().phoneNumber; } }
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    }
  },
  lastLogin: {
    type: Date
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    default: null
  },
  emailVerificationToken: {
    type: String,
    default: null
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  tokenVersion: {
    type: Number,
    default: 0
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ role: 1, school: 1 });

UserSchema.pre('save', async function (next) {
  if (this.isModified('passwordHash')) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
      this.tokenVersion += 1; // Increment tokenVersion on password change
    } catch (error) {
      return next(error);
    }
  }

  if (this.role === 'teacher' && this.subjects.length) {
    const Subject = mongoose.model('Subject');
    const subjects = await Subject.find({ _id: { $in: this.subjects }, school: this.school });
    if (subjects.length !== this.subjects.length) {
      return next(new Error('All subjects must belong to the user’s school'));
    }
  }


  next();
});

UserSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.passwordHash);
};

UserSchema.methods.updateLastLogin = async function () {
  this.lastLogin = new Date();
  await this.save();
};

UserSchema.methods.invalidateTokens = async function () {
  this.tokenVersion += 1;
  await this.save();
};

module.exports = mongoose.model('User', UserSchema);