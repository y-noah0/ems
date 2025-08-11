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
    default: 0,
    min: 0
  },
  graded: {
    type: Boolean,
    default: false
  },
  feedback: {
    type: String,
    trim: true
  },
  timeSpent: {
    type: Number, // In seconds
    default: 0,
    min: 0
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
  enrollment: {
    type: Schema.Types.ObjectId,
    ref: 'Enrollment',
    required: true
  },
  answers: [AnswerSchema],
  totalScore: {
    type: Number,
    default: 0,
    min: 0
  },
  percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  submittedAt: {
    type: Date
  },
  timeSpent: {
    type: Number, // In seconds
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['in-progress', 'submitted', 'auto-submitted', 'graded'],
    default: 'in-progress'
  },
  violations: {
    type: Number,
    default: 0,
    min: 0
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
    timestamp: { type: Date },
    data: Schema.Types.Mixed
  }],
  gradedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  gradedAt: {
    type: Date
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Enforce uniqueness for non-deleted submissions only
SubmissionSchema.index(
  { exam: 1, student: 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $eq: false } } }
);

// Keep existing indexes
SubmissionSchema.index({ status: 1 });
SubmissionSchema.index({ enrollment: 1 });

SubmissionSchema.methods.calculateScore = function () {
  return this.answers.reduce((total, answer) => total + (answer.score || 0), 0);
};

SubmissionSchema.methods.calculatePercentage = function (examTotalScore) {
  return examTotalScore > 0 ? (this.totalScore / examTotalScore) * 100 : 0;
};

SubmissionSchema.pre('save', async function (next) {
  const Exam = mongoose.model('Exam');
  const User = mongoose.model('User');
  const Enrollment = mongoose.model('Enrollment');

  // Validate student
  const student = await User.findById(this.student);
  if (!student || student.role !== 'student') {
    return next(new Error('Student must be a user with role "student"'));
  }

  // Validate enrollment
  const enrollment = await Enrollment.findById(this.enrollment);
  if (!enrollment || enrollment.student.toString() !== this.student.toString() || !enrollment.isActive) {
    return next(new Error('Invalid or inactive enrollment'));
  }

  // Validate exam
  const exam = await Exam.findById(this.exam);
  if (!exam) {
    return next(new Error('Exam not found'));
  }

  // Validate school consistency
  if (exam.school.toString() !== enrollment.school.toString() || student.school.toString() !== enrollment.school.toString()) {
    return next(new Error('School mismatch between exam, student, and enrollment'));
  }

  // Auto-grade and calculate scores
  if (this.isModified('answers') || this.isModified('status')) {
    if (this.status === 'submitted' || this.status === 'auto-submitted') {
      this.answers.forEach(answer => {
        const question = exam.questions.id(answer.questionId);
        if (!question) return;
        if (['multiple-choice', 'true-false'].includes(question.type) && answer.answer === question.correctAnswer) {
          answer.score = question.maxScore;
          answer.graded = true;
        } else if (['short-answer', 'essay'].includes(question.type) && answer.score > 0) {
          answer.graded = true;
        }
      });
      this.totalScore = this.calculateScore();
      this.percentage = this.calculatePercentage(exam.totalScore);
      if (this.answers.every(a => a.graded)) {
        this.status = 'graded';
        this.gradedAt = new Date();
      }
    } else if (this.status === 'graded') {
      this.totalScore = this.calculateScore();
      this.percentage = this.calculatePercentage(exam.totalScore);
      this.gradedAt = this.gradedAt || new Date();
    }
  }

  // Calculate time spent
  if (this.submittedAt && this.startedAt) {
    this.timeSpent = Math.round((this.submittedAt - this.startedAt) / 1000);
  }

  // Validate gradedBy
  if (this.isModified('gradedBy') && this.gradedBy) {
    const grader = await User.findById(this.gradedBy);
    if (!grader || grader.role !== 'teacher') {
      return next(new Error('GradedBy must be a user with role "teacher"'));
    }
  }

  next();
});

module.exports = mongoose.model('Submission', SubmissionSchema);