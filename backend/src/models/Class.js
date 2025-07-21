const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ClassSchema = new Schema({
  level: {
    type: String,
    required: true,
    enum: ['L3', 'L4', 'L5']
  },
  trade: {
    type: Schema.Types.ObjectId,
    ref: 'Trade',
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  school: {
    type: Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  capacity: {
    type: Number,
    required: true,
    min: [1, 'Class capacity must be at least 1'],
    default: 30
  },
  subjects: [{
    type: Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  }],
  isDeleted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

ClassSchema.index({ level: 1, trade: 1, year: 1, school: 1 }, { unique: true });

ClassSchema.virtual('className').get(function () {
  return `${this.level}${this.trade.code}`;
});

ClassSchema.pre('save', async function (next) {
  if (this.isModified('subjects') && this.subjects.length > 0) {
    const Subject = mongoose.model('Subject');
    const subjects = await Subject.find({ _id: { $in: this.subjects }, school: this.school, isDeleted: false });
    if (subjects.length !== this.subjects.length) {
      return next(new Error('All subjects must belong to the specified school and not be deleted'));
    }
  }
  next();
});

module.exports = mongoose.model('Class', ClassSchema);