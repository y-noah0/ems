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
  subjects: [{
    type: Schema.Types.ObjectId,
    ref: 'Subject'
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

module.exports = mongoose.model('Class', ClassSchema);