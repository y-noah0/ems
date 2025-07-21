require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const Class = require('./models/Class');
const User = require('./models/User');
const Subject = require('./models/Subject');
const Exam = require('./models/Exam');
const Submission = require('./models/Submission');
const School = require('./models/school');
const Trade = require('./models/trade');
const Term = require('./models/term');
const Enrollment = require('./models/enrollment');
const ReportCard = require('./models/report');
const PromotionLog = require('./models/promotionLog');

// Generate unique registration number for students (e.g., STU2025002)
const generateRegistrationNumber = async () => {
  const year = new Date().getFullYear();
  let isUnique = false;
  let registrationNumber;
  const maxAttempts = 100;
  let attempts = 0;

  while (!isUnique && attempts < maxAttempts) {
    const randomNum = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
    registrationNumber = `STU${year}${randomNum}`;
    const existingUser = await User.findOne({ registrationNumber });
    if (!existingUser) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    throw new Error('Unable to generate unique registration number after maximum attempts');
  }
  return registrationNumber;
};

(async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/schoolExams';
  console.log(`🔌 Connecting to MongoDB at ${uri}...`);

  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connection established');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }

  // 1. Clear all collections
  try {
    await Promise.all([
      School.deleteMany({}),
      User.deleteMany({}),
      Trade.deleteMany({}),
      Class.deleteMany({}),
      Term.deleteMany({}),
      Subject.deleteMany({}),
      Exam.deleteMany({}),
      Enrollment.deleteMany({}),
      Submission.deleteMany({}),
      ReportCard.deleteMany({}),
      PromotionLog.deleteMany({})
    ]);
    console.log('✅ All collections cleared');
  } catch (err) {
    console.error('❌ Error clearing collections:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }

  // Predefine ObjectIds
  const schoolId = new mongoose.Types.ObjectId();
  const tradeId1 = new mongoose.Types.ObjectId();
  const tradeId2 = new mongoose.Types.ObjectId();
  const classId1 = new mongoose.Types.ObjectId();
  const classId2 = new mongoose.Types.ObjectId();
  const termId = new mongoose.Types.ObjectId();
  const headmasterId = new mongoose.Types.ObjectId();
  const teacherId = new mongoose.Types.ObjectId();
  const studentId = new mongoose.Types.ObjectId();
  const subjectId = new mongoose.Types.ObjectId();
  const examId = new mongoose.Types.ObjectId();
  const enrollmentId = new mongoose.Types.ObjectId();

  // 2. Create Headmaster
  let headmasterDoc;
  try {
    headmasterDoc = await User.create({
      _id: headmasterId,
      fullName: 'Dr. Emily Carter',
      email: 'emily.carter@example.com',
      passwordHash: 'Headmaster123!',
      role: 'headmaster',
      phoneNumber: '+12025550101',
      preferences: { notifications: { email: true, sms: true }, theme: 'light' },
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✅ Headmaster seeded');
  } catch (err) {
    console.error('❌ Headmaster error:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }

  // 3. Create School
  let schoolDoc;
  try {
    schoolDoc = await School.create({
      _id: schoolId,
      name: 'Springfield High',
      address: '123 Main St, Springfield',
      contactEmail: 'school@example.com',
      contactPhone: '+12025550100',
      logo: 'https://example.com/logo.png',
      headmaster: headmasterId,
      tradesOffered: [],
      isDeleted: false,
    });
    console.log('✅ School seeded');
  } catch (err) {
    console.error('❌ School error:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }

  // 4. Create Trades
  let trades;
  try {
    trades = await Trade.insertMany([
      { _id: tradeId1, code: 'SD1', name: 'Software Development', description: 'Software engineering and programming', isDeleted: false },
      { _id: tradeId2, code: 'MMP', name: 'Multimedia', description: 'Multimedia design and production', isDeleted: false },
    ]);
    schoolDoc.tradesOffered = trades.map(t => t._id);
    await schoolDoc.save();
    console.log('✅ Trades seeded:', trades.map(t => t.name).join(', '));
  } catch (err) {
    console.error('❌ Trade error:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }

  // 5. Create Classes
  let classes;
  try {
    classes = await Class.insertMany([
      {
        _id: classId1,
        level: 'L3',
        trade: tradeId1,
        year: 2025,
        school: schoolId,
        isDeleted: false,
      },
      {
        _id: classId2,
        level: 'L4',
        trade: tradeId1,
        year: 2025,
        school: schoolId,
        isDeleted: false,
      },
    ]);
    console.log('✅ Classes seeded:', classes.map(c => c.level).join(', '));
  } catch (err) {
    console.error('❌ Class error:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }

  // 6. Create Term
  let termDoc;
  try {
    termDoc = await Term.create({
      _id: termId,
      termNumber: 1,
      academicYear: 2025,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-04-30'),
      school: schoolId,
      isDeleted: false,
    });
    console.log('✅ Term seeded');
  } catch (err) {
    console.error('❌ Term error:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }

  // 7. Create Teacher
  let teacherDoc;
  try {
    teacherDoc = await User.create({
      _id: teacherId,
      fullName: 'Mr. John Doe',
      email: 'john.doe@example.com',
      passwordHash: 'Teacher123!',
      role: 'teacher',
      school: schoolId,
      phoneNumber: '+12025550102',
      subjects: [], // Start with empty array as per schema
      preferences: { notifications: { email: true, sms: false }, theme: 'light' },
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✅ Teacher seeded');
  } catch (err) {
    console.error('❌ Teacher error:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }

  // 8. Create Subject
  let subjectDoc;
  try {
    subjectDoc = await Subject.create({
      _id: subjectId,
      name: 'Programming Fundamentals',
      description: 'Introduction to programming concepts',
      school: schoolId,
      classes: [classId1],
      trades: [tradeId1],
      teacher: teacherId,
      credits: 3,
      isDeleted: false,
    });
    console.log('✅ Subject seeded:', subjectDoc.name);
  } catch (err) {
    console.error('❌ Subject error:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }

  // 9. Update Teacher with Subject
  try {
    teacherDoc.subjects = [subjectId];
    await teacherDoc.save();
    console.log('✅ Teacher updated with subject');
  } catch (err) {
    console.error('❌ Teacher update error:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }

  // 10. Verify Class and Term Existence
  try {
    const classDoc = await Class.findById(classId1);
    if (!classDoc) throw new Error('Class L3 not found');
    const termDocVerify = await Term.findById(termId);
    if (!termDocVerify) throw new Error('Term not found');
    console.log('✅ Class and Term verified');
  } catch (err) {
    console.error('❌ Class/Term verification error:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }

  // 11. Create Student
  let studentDoc;
  try {
    const studentRegistrationNumber = await generateRegistrationNumber();
    try {
      // Attempt to create student with classId and termId
      studentDoc = await User.create({
        _id: studentId,
        fullName: 'Alice Student',
        registrationNumber: studentRegistrationNumber,
        passwordHash: 'Student123!',
        role: 'student',
        school: schoolId,
        classId: classId1, // Single ObjectId
        termId: termId,   // Single ObjectId
        phoneNumber: '+12025550103',
        preferences: { notifications: { email: false, sms: true }, theme: 'light' },
        parentFullName: 'Jane Student',
        parentPhoneNumber: '+12025550104',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('✅ Student seeded with classId and termId');
    } catch (err) {
      console.error('⚠️ Initial student creation failed:', err.message);
      // Fallback: Create student without classId and termId, then update
      studentDoc = await User.create({
        _id: studentId,
        fullName: 'Alice Student',
        registrationNumber: studentRegistrationNumber,
        passwordHash: 'Student123!',
        role: 'student',
        school: schoolId,
        phoneNumber: '+12025550103',
        preferences: { notifications: { email: false, sms: true }, theme: 'light' },
        parentFullName: 'Jane Student',
        parentPhoneNumber: '+12025550104',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('✅ Student seeded without classId and termId');
      // Update student with classId and termId
      studentDoc.classId = classId1;
      studentDoc.termId = termId;
      await studentDoc.save();
      console.log('✅ Student updated with classId and termId');
    }
  } catch (err) {
    console.error('❌ Student error:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }

  // 12. Create Exam
  let examDoc;
  try {
    const exams = await Exam.insertMany([
      {
        _id: examId,
        title: 'Midterm Programming Exam',
        subject: subjectId,
        classes: [classId1],
        teacher: teacherId,
        type: 'exam',
        schedule: {
          start: new Date(Date.now() + 86400000), // Tomorrow
          duration: 90, // 90 minutes
        },
        questions: [
          {
            type: 'multiple-choice',
            text: 'What is a variable in programming?',
            options: [
              { text: 'A storage location with a name', isCorrect: true },
              { text: 'A type of loop', isCorrect: false },
              { text: 'A function', isCorrect: false },
              { text: 'A class', isCorrect: false },
            ],
            correctAnswer: 'A storage location with a name',
            maxScore: 10,
          },
          {
            type: 'short-answer',
            text: 'Explain the purpose of a loop.',
            maxScore: 20,
          },
        ],
        status: 'scheduled',
        instructions: 'Answer all questions carefully. No external resources allowed.',
      },
    ]);
    examDoc = exams[0];
    console.log('✅ Exam seeded:', examDoc.title,'Midterm Programming Exam');
  } catch (err) {
    console.error('❌ Exam error:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }

  // 13. Create Enrollment
  let enrollmentDoc;
  try {
    enrollmentDoc = await Enrollment.create({
      _id: enrollmentId,
      student: studentId,
      class: classId1,
      term: termId,
      school: schoolId,
      isActive: true,
      isDeleted: false,
    });
    console.log('✅ Enrollment seeded for', studentDoc.fullName);
  } catch (err) {
    console.error('❌ Enrollment error:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }

  // 14. Create Submission
  try {
    await Submission.create({
      exam: examId,
      student: studentId,
      enrollment: enrollmentId,
      answers: [
        {
          questionId: examDoc.questions[0]._id,
          answer: 'A storage location with a name',
          score: 10,
          graded: true,
        },
        {
          questionId: examDoc.questions[1]._id,
          answer: 'A loop allows repeated execution of code.',
          score: 15,
          graded: true,
          feedback: 'Good, but could elaborate on types of loops.',
        },
      ],
      totalScore: 25,
      percentage: 83.33, // (25 / 30) * 100
      startedAt: new Date(Date.now() - 5400000), // 90 minutes ago
      submittedAt: new Date(),
      status: 'graded',
      gradedBy: teacherId,
      gradedAt: new Date(),
      isDeleted: false,
    });
    console.log('✅ Submission seeded for exam:', examDoc.title);
  } catch (err) {
    console.error('❌ Submission error:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }

  // 15. Create ReportCard
  try {
    await ReportCard.create({
      student: studentId,
      class: classId1,
      academicYear: 2025,
      term: termId,
      school: schoolId,
      results: [
        {
          subject: subjectId,
          scores: {
            assessment1: 12,
            assessment2: 13,
            test: 8,
            exam: 50,
          },
          total: 83,
          percentage: 83,
          decision: 'Competent',
        },
      ],
      totalScore: 83,
      average: 83,
      remarks: 'Excellent performance, keep it up!',
      isDeleted: false,
    });
    console.log('✅ ReportCard seeded for', studentDoc.fullName);
  } catch (err) {
    console.error('❌ ReportCard error:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }

  // 16. Create PromotionLog
  try {
    await PromotionLog.create({
      student: studentId,
      fromClass: classId1,
      toClass: classId2,
      academicYear: 2025,
      status: 'promoted',
      remarks: 'Promoted to L4 based on excellent performance',
      school: schoolId,
      promotionDate: new Date(),
      manual: false,
      isDeleted: false,
    });
    console.log('✅ PromotionLog seeded for', studentDoc.fullName);
  } catch (err) {
    console.error('❌ PromotionLog error:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }

  try {
    await mongoose.disconnect();
    console.log('✅ Database seeding complete and disconnected.');
  } catch (err) {
    console.error('❌ Error disconnecting from MongoDB:', err.message);
    process.exit(1);
  }
})();