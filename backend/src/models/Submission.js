const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AnswerSchema = new Schema({
  questionId: {
    type: Schema.Types.ObjectId, 
    required: true
  },
  answer: {
    type: String
  },
  score: {
    type: Number,
    default: 0
  },
  graded: {
    type: Boolean,
    default: false
  },
  feedback: {
    type: String
  }
});

const SubmissionSchema = new Schema({
  exam: {
    type: Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  student: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  answers: [AnswerSchema],
  totalScore: {
    type: Number,
    default: 0
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  submittedAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['in-progress', 'submitted', 'auto-submitted', 'graded'],
    default: 'in-progress'
  },
  violations: {
    type: Number,
    default: 0
  },
  violationLogs: [{
    type: {
      type: String,
      enum: ['tab-switch', 'hidden-tab', 'copy-attempt', 'other']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: String
  }],
  autoSaves: [{
    timestamp: {
      type: Date
    },
    data: Schema.Types.Mixed
  }],
  gradedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  gradedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Create a compound index to ensure a student can only have one submission per exam
SubmissionSchema.index({ exam: 1, student: 1 }, { unique: true });

// Calculate total score when answers array changes
SubmissionSchema.pre('save', function(next) {
  if (this.isModified('answers')) {
    this.totalScore = this.answers.reduce((sum, answer) => sum + answer.score, 0);
  }
  next();
});

module.exports = mongoose.model('Submission', SubmissionSchema);
