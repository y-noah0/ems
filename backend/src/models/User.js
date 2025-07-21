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
    required: true
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
    default: null,
    required: function () {
      return ['student', 'teacher', 'dean'].includes(this.role);
    }
  },
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
  classId: {
    type: Schema.Types.ObjectId,
    ref: 'Class',
    validate: {
      validator: function (v) { return this.role === 'student' ? v.length > 0 : v.length === 0; },
      message: 'classIds are required for students and not allowed for other roles'
    }
  },
  termId: {
    type: Schema.Types.ObjectId,
    ref: 'Term',
    validate: {
      validator: function (v) { return this.role === 'student' ? v.length > 0 : v.length === 0; },
      message: 'termids are required for students and not allowed for other roles'
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
  },
  parentFullName: {
    type: String,
    trim: true,
    default: null,
    required: false,
    validate: {
      validator: function (v) {
        if (this.role === 'student' && v != null) return v.length > 0;
        return true;
      },
      message: 'Parent full name must not be empty if provided'
    }
  },
  parentNationalId: {
    type: String,
    trim: true,
    default: null,
    required: false,
    validate: {
      validator: function (v) {
        if (this.role === 'student' && v != null) return v.length > 0;
        return true;
      },
      message: 'Parent national ID must not be empty if provided'
    }
  },
  parentPhoneNumber: {
    type: String,
    trim: true,
    match: [/^\+?\d{10,15}$/, 'Please enter a valid phone number'],
    default: null,
    required: false
  },
  graduated: {
    type: Boolean,
    default: false,
    required: false
  },
  graduationDate: {
    type: Date,
    default: null,
    required: false
  }
}, { timestamps: true });

// Indexes
UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ role: 1, school: 1 });

// Pre-save validations
UserSchema.pre('save', async function (next) {
  if (this.isModified('passwordHash')) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
      this.tokenVersion += 1;
    } catch (error) {
      return next(error);
    }
  }

  if (this.role === 'teacher') {
    if (!this.school) return next(new Error('Teacher must be assigned to a school'));
  }

  if (this.role === 'headmaster' && this.school) {
    const School = mongoose.model('School');
    const school = await School.findOne({ headmaster: this._id });
    if (school && school._id.toString() !== this.school.toString()) {
      return next(new Error('Headmaster is already assigned to another school'));
    }
  }

  next();
});

// Methods
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