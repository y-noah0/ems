const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Question Schema
const QuestionSchema = new Schema({
  type: {
    type: String,
    enum: ['multiple-choice', 'true-false', 'short-answer', 'essay'],
    required: true,
  },
  text: {
    type: String,
    required: true,
    trim: true,
  },
  options: {
    type: [{ text: String, isCorrect: Boolean }],
    required: function () {
      return this.type === 'multiple-choice';
    },
    validate: {
      validator: function (v) {
        return this.type !== 'multiple-choice' || (v && v.length >= 2);
      },
      message: 'Multiple-choice questions must have at least 2 options',
    },
  },
  correctAnswer: {
    type: String,
    required: function () {
      return this.type === 'multiple-choice' || this.type === 'true-false';
    },
  },
  maxScore: {
    type: Number,
    required: true,
    min: 1,
  },
});

const ExamSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    classes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Class',
        required: true,
      },
    ],
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
    type: String,
    enum: ['assessment1', 'assessment2', 'exam', 'homework', 'quiz'],
    required: true,
    default: 'quiz'
  },
  schedule: {
    start: {
      type: Date,
      required: function() {
        return this.status !== 'draft';
      }
    },
    duration: {
      type: Number, // in minutes
      required: function() {
        return this.status !== 'draft';
      },
      min: 5
    }
  },
  questions: [QuestionSchema],
  totalScore: {
    type: Number,
    default: function() {
      return this.questions.reduce((sum, q) => sum + q.maxScore, 0);
    }
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'active', 'completed'],
    default: 'draft'
  },
  instructions: {
    type: String,
    default: 'Read all questions carefully before answering.'
  }
}, {
  timestamps: true
});

// Calculate total score when questions array changes
ExamSchema.pre('save', function (next) {
  if (this.isModified('questions')) {
    this.totalScore = this.questions.reduce((sum, q) => sum + q.maxScore, 0);
  }
});

// Pre-save hook to calculate totalPoints
ExamSchema.pre('save', function (next) {
  if (this.isModified('questions')) {
    this.totalPoints = this.questions.reduce((sum, question) => sum + (parseInt(question.maxScore) || 0), 0);
  }
  // Ensure classes array is not empty
  if (!this.classes || this.classes.length === 0) {
    return next(new Error('At least one class must be associated with the exam'));
  }
  next();
});

// Static method to recalculate totalPoints
ExamSchema.statics.recalculateTotalPoints = async function (examId) {
  try {
    const exam = await this.findById(examId);
    if (!exam) return null;
    exam.totalPoints = exam.questions.reduce((sum, question) => sum + (parseInt(question.maxScore) || 0), 0);
    await exam.save();
    return exam;
  } catch (error) {
    console.error('Error recalculating exam points:', error);
    return null;
  }
};

// Add indexes for performance
ExamSchema.index({ teacher: 1 });
ExamSchema.index({ classes: 1 });
ExamSchema.index({ subject: 1 });
ExamSchema.index({ status: 1 });

module.exports = mongoose.model('Exam', ExamSchema);
