const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Question schema
const QuestionSchema = new Schema({
  type: {
    type: String,
    enum: ['MCQ', 'open'],
    required: true
  },
  text: {
    type: String,
    required: true
  },
  options: {
    type: [String],
    required: function() {
      return this.type === 'MCQ';
    },
    validate: {
      validator: function(v) {
        return this.type !== 'MCQ' || (v && v.length >= 2);
      },
      message: 'MCQ questions must have at least 2 options'
    }
  },
  correctAnswer: {
    type: String,
    required: function() {
      return this.type === 'MCQ';
    }
  },
  maxScore: {
    type: Number,
    required: true,
    min: 1
  }
});

const ExamSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  class: [{
    type: Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  }],
  subject: {
    type: Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
    type: {
    type: String,
    enum: ['ass1', 'ass2', 'hw', 'exam', 'midterm', 'final', 'quiz', 'practice'],
    required: true
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
ExamSchema.pre('save', function(next) {
  if (this.isModified('questions')) {
    this.totalScore = this.questions.reduce((sum, q) => sum + q.maxScore, 0);
  }
  next();
});

// Pre-save hook to calculate totalPoints
ExamSchema.pre('save', async function(next) {
  if (this.isModified('questions')) {
    this.totalPoints = this.questions.reduce((sum, question) => {
      return sum + (parseInt(question.maxScore) || 0);
    }, 0);
  }
  next();
});

// Add static method to recalculate points for an exam
ExamSchema.statics.recalculateTotalPoints = async function(examId) {
  try {
    const exam = await this.findById(examId);
    if (!exam) return null;
    
    exam.totalPoints = exam.questions.reduce(
      (sum, question) => sum + (question.maxScore || question.points || 0), 
      0
    );
    await exam.save();
    return exam;
  } catch (error) {
    console.error("Error recalculating exam points:", error);
    return null;
  }
};

// Add a static method to recalculate points
ExamSchema.statics.recalculatePoints = async function(examId) {
  const exam = await this.findById(examId);
  if (!exam) return null;
  
  exam.totalPoints = exam.questions.reduce((sum, question) => {
    return sum + (parseInt(question.maxScore) || 0);
  }, 0);
  
  await exam.save();
  return exam;
};

module.exports = mongoose.model('Exam', ExamSchema);
