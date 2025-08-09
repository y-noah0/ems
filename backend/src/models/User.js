const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Schema = mongoose.Schema;

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
    required: function () { return this.role !== 'student'; }, // Email optional for students
    sparse: true, // Allows multiple null/undefined emails for students
    unique: true
  },
  registrationNumber: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    trim: true,
    match: [/^\+?\d{10,15}$/, 'Please enter a valid phone number'],
    required: function () {
      return ['admin', 'headmaster', 'teacher', 'dean'].includes(this.role);
    }
  },
  school: {
    type: Schema.Types.ObjectId,
    ref: 'School',
    default: null,
    required: function () {
      return ['student', 'teacher', 'dean'].includes(this.role); // Required for student, teacher, dean
    }
  },
  profilePicture: {
    type: String,
    trim: true,
    default: null, // Explicitly optional for all users
    required: false,
    validate: {
      validator: function (v) {
        if (v === null) return true; // Null is valid for all roles
        return /^https?:\/\/.*\.(png|jpg|jpeg|svg|gif)$/i.test(v) ||
          /^\/Uploads\/.*\.(png|jpg|jpeg|svg|gif)$/i.test(v);
      },
      message: 'Please enter a valid image URL or local upload path'
    }
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
  },
  parentFullName: {
    type: String,
    trim: true,
    default: null,
    required: false, // Optional for students
    validate: {
      validator: function (v) {
        if (this.role !== 'student') return v === null; // Must be null for non-students
        return v === null || v.length > 0; // Optional for students, non-empty if provided
      },
      message: 'Parent full name is only allowed for students and must not be empty if provided'
    }
  },
  parentNationalId: {
    type: String,
    trim: true,
    default: null,
    required: false, // Optional for students
    validate: {
      validator: function (v) {
        if (this.role !== 'student') return v === null; // Must be null for non-students
        return v === null || v.length > 0; // Optional for students, non-empty if provided
      },
      message: 'Parent national ID is only allowed for students and must not be empty if provided'
    }
  },
  parentPhoneNumber: {
    type: String,
    trim: true,
    match: [/^\+?\d{10,15}$/, 'Please enter a valid phone number'],
    default: null, // Optional for students
    required: false,
    validate: {
      validator: function (v) {
        if (this.role !== 'student') return v === null; // Must be null for non-students
        return true; // Optional for students, validated by match if provided
      },
      message: 'Parent phone number is only allowed for students'
    }
  },
  graduated: {
    type: Boolean,
    default: false
  },
  graduationDate: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Indexes
UserSchema.index({ email: 1 }, { unique: true, sparse: true }); // Sparse allows null emails for students
UserSchema.index({ role: 1, school: 1 }); // For efficient queries by role and school

// Pre-save validations
UserSchema.pre('save', async function (next) {
  // Hash password if modified
  if (this.isModified('passwordHash')) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
      this.tokenVersion += 1;
    } catch (error) {
      return next(error);
    }
  }

  // Ensure teacher has a school
  if (this.role === 'teacher' && !this.school) {
    return next(new Error('Teacher must be assigned to a school'));
  }

  // Validate headmaster school assignment
  if (this.role === 'headmaster' && this.school) {
    const School = mongoose.model('School');
    const school = await School.findOne({ headmaster: this._id });
    if (school && school._id.toString() !== this.school.toString()) {
      return next(new Error('Headmaster is already assigned to another school'));
    }
  }

  // Ensure admin and headmaster don’t have parent-related fields
  if (['admin', 'headmaster', 'teacher', 'dean'].includes(this.role)) {
    if (this.parentFullName || this.parentNationalId || this.parentPhoneNumber) {
      return next(new Error('Parent-related fields are only allowed for students'));
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