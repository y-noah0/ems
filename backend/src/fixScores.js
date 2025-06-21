// backend/src/scripts/fixScores.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Exam = require('./models/Exam');
const Submission = require('./models/Submission');

// Load environment variables
dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/school-exam-system", {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB for score fixing');
  } catch (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  }
};

const fixScores = async () => {
  try {
    // Step 1: Fix all exams to have correct totalPoints
    console.log('Fixing exam totalPoints...');
    const exams = await Exam.find({});
    for (const exam of exams) {
      const calculatedPoints = exam.questions.reduce((sum, q) => {
        return sum + (parseInt(q.maxScore) || 0);
      }, 0);
      
      // Only update if needed
      if (!exam.totalPoints || exam.totalPoints !== calculatedPoints) {
        exam.totalPoints = calculatedPoints;
        await exam.save();
        console.log(`Fixed exam: ${exam._id} - totalPoints: ${calculatedPoints}`);
      }
    }
    
    // Step 2: Fix all graded submissions
    console.log('Fixing submission scores...');
    const submissions = await Submission.find({ status: 'graded' });
    
    for (const submission of submissions) {
      // Calculate correct score
      const calculatedScore = submission.answers.reduce((sum, a) => {
        return sum + (parseInt(a.score) || 0);
      }, 0);
      
      // Get exam for this submission
      const exam = await Exam.findById(submission.exam);
      if (!exam) {
        console.log(`Exam not found for submission ${submission._id}`);
        continue;
      }
      
      let modified = false;
      
      // Fix score if needed
      if (!submission.score || submission.score !== calculatedScore) {
        submission.score = calculatedScore;
        modified = true;
      }
      
      // Fix totalPoints if needed
      if (!submission.totalPoints || submission.totalPoints !== exam.totalPoints) {
        submission.totalPoints = exam.totalPoints;
        modified = true;
      }
      
      // Save if modified
      if (modified) {
        await submission.save();
        console.log(`Fixed submission: ${submission._id} - Score: ${calculatedScore}/${exam.totalPoints}`);
      }
    }
    
    console.log('Score fixing complete!');
  } catch (error) {
    console.error('Error during fix:', error);
  }
};

const runFix = async () => {
  await connectDB();
  await fixScores();
  console.log('Disconnecting...');
  await mongoose.disconnect();
  process.exit(0);
};

runFix();