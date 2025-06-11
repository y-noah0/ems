const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ClassSchema = new Schema({
  level: {
    type: String,
    required: true,
    enum: ['L3', 'L4', 'L5']
  },
  trade: {
    type: String,
    required: true,
    enum: ['SOD', 'NIT', 'MMP']
  },
  year: {
    type: Number,
    required: true
  },
  term: {
    type: Number,
    required: true,
    min: 1,
    max: 3
  },
  subjects: [{
    type: Schema.Types.ObjectId,
    ref: 'Subject'
  }]
}, {
  timestamps: true
});

// Create a compound index to ensure uniqueness of level, trade, year, term combination
ClassSchema.index({ level: 1, trade: 1, year: 1, term: 1 }, { unique: true });

// Virtual property to get the class name (e.g., L3SOD)
ClassSchema.virtual('className').get(function() {
  return `${this.level}${this.trade}`;
});

module.exports = mongoose.model('Class', ClassSchema);
