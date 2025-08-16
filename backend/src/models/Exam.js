const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Question Schema (reduced & renamed types)
const QuestionSchema = new Schema({
  type: {
    type: String,
    enum: ['true-false', 'multiple-choice', 'short-answer', 'essay'],
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  options: {
    type: [{ text: String, isCorrect: Boolean }],
    required: function () {
      // multiple-choice requires options; true-false has fixed options True/False enforced elsewhere
      return this.type === 'multiple-choice' || this.type === 'true-false';
    },
    validate: {
      validator: function (v) {
        if (this.type === 'multiple-choice') {
          return Array.isArray(v) && v.length >= 2 && v.every(o => o.text && o.text.trim() !== '');
        }
        if (this.type === 'true-false') {
          return Array.isArray(v) && v.length === 2 && v[0].text === 'True' && v[1].text === 'False';
        }
        return true;
      },
      message: 'Invalid options for question type'
    }
  },
  correctAnswer: {
    type: Schema.Types.Mixed,
    required: function () {
    return ['true-false', 'multiple-choice'].includes(this.type); // short-answer now optional
    },
    validate: {
      validator: function (v) {
        if (this.type === 'true-false') {
          return typeof v === 'string' && ['True', 'False'].includes(v);
        }
        if (this.type === 'multiple-choice') {
          return Array.isArray(v) && v.length > 0 && v.every(ans => typeof ans === 'string' && ans.trim() !== '');
        }
        if (this.type === 'short-answer') {
      if (v === undefined || v === null || v === '') return true; // optional
      return typeof v === 'string' && v.trim().length <= 200;
        }
        if (this.type === 'essay') {
          return !v || (typeof v === 'string' && v.length <= 2000);
        }
        return true;
      },
      message: 'Correct answer invalid for question type'
    }
  },
  maxScore: {
    type: Number,
    required: true,
    min: 1
  }
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
    term: {
      type: Schema.Types.ObjectId,
      ref: 'Term',
      required: true,
    },
    type: {
      type: String,
      enum: ['assessment1', 'assessment2', 'exam', 'homework', 'quiz'],
      required: true,
      default: 'quiz',
    },
    schedule: {
      start: {
        type: Date,
        required: function () {
          return this.status !== 'draft';
        },
      },
      duration: {
        type: Number, // in minutes
        required: function () {
          return this.status !== 'draft';
        },
        min: 5,
      },
    },
    questions: [QuestionSchema],
    totalScore: {
      type: Number,
      default: function () {
        return this.questions.reduce((sum, q) => sum + q.maxScore, 0);
      },
    },
    totalPoints: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'active', 'completed', 'past'],
      default: 'draft',
    },
    instructions: {
      type: String,
      default: 'Read all questions carefully before answering.',
    },
    school: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate total score when questions array changes
// ExamSchema.pre('save', function (next) {
//   if (this.isModified('questions')) {
//     this.totalScore = this.questions.reduce((sum, q) => sum + q.maxScore, 0);
//   }
// });

// // Pre-save hook to calculate totalPoints and validate term
ExamSchema.pre('save', async function (next) {
  if (this.isModified('questions')) {
    this.totalPoints = this.questions.reduce((sum, question) => sum + (parseInt(question.maxScore) || 0), 0);
  }
  // Ensure classes array is not empty
  if (!this.classes || this.classes.length === 0) {
    return next(new Error('At least one class must be associated with the exam'));
  }
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

// Static method to mark exams as past for ended terms
ExamSchema.statics.markExamsAsPast = async function () {
  try {
    const now = new Date();
    const terms = await mongoose.model('Term').find({
      endDate: { $lt: now },
      isDeleted: false,
    });
    const termIds = terms.map((term) => term._id);
    const result = await this.updateMany(
      {
        term: { $in: termIds },
        status: { $in: ['draft', 'scheduled', 'active', 'completed'] },
        isDeleted: false,
      },
      { $set: { status: 'past' } }
    );
    console.log(`Marked ${result.modifiedCount} exams as past`);
    return result;
  } catch (error) {
    console.error('Error marking exams as past:', error);
    return null;
  }
};

// Add indexes for performance
ExamSchema.index({ teacher: 1 });
ExamSchema.index({ subject: 1 });
ExamSchema.index({ term: 1 });
ExamSchema.index({ status: 1 });
ExamSchema.index({ school: 1 });
ExamSchema.index({ isDeleted: 1 });

module.exports = mongoose.model('Exam', ExamSchema);