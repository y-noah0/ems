// seed.js - Fully working and resilient MongoDB seeder script
require('dotenv').config();
const mongoose = require('mongoose');

// Import your models
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
const PromotionLog = require('./models/PromotionLog');

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
    return;
  }

  let schoolDoc;
  try {
    await School.deleteMany({});
    await User.deleteMany({ role: 'headmaster' });

    const headmaster = await User.create({
      fullName: 'Dr. Emily Carter',
      email: 'emily.carter@example.com',
      passwordHash: 'Headmaster123!',
      role: 'headmaster',
      phoneNumber: '+12025550101',
      school: null,
      preferences: { notifications: { email: true, sms: true }, theme: 'light' },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const createdSchool = await School.create({
      name: 'Springfield High',
      address: '123 Main St',
      contactEmail: 'school@example.com',
      contactPhone: '+12025550100',
      logo: '',
      headmaster: headmaster._id,
      isDeleted: false,
    });

    headmaster.school = createdSchool._id;
    await headmaster.save();
    schoolDoc = createdSchool;
    console.log('✅ Headmaster and School seeded');
  } catch (err) {
    console.error('❌ School/Headmaster error:', err.message);
  }

  if (!schoolDoc) return;

  let trades = [];
  try {
    await Trade.deleteMany({});
    trades = await Trade.insertMany([
      { code: 'SD1', name: 'Software Development', isDeleted: false },
      { code: 'MMP', name: 'Multimedia', isDeleted: false },
    ]);
    console.log('✅ Trades seeded:', trades.map(t => t.name).join(', '));
  } catch (err) {
    console.error('❌ Trade error:', err.message);
  }

  let classes = [];
  try {
    await Class.deleteMany({});
    classes = await Class.insertMany([
      { name: 'L3 A', level: 'L3', trade: trades[0]._id, year: 2025, school: schoolDoc._id, isDeleted: false },
      { name: 'L4 A', level: 'L4', trade: trades[0]._id, year: 2025, school: schoolDoc._id, isDeleted: false },
    ]);
    console.log('✅ Classes seeded:', classes.map(c => c.name).join(', '));
  } catch (err) {
    console.error('❌ Class error:', err.message);
  }

  let termDoc;
  try {
    await Term.deleteMany({});
    const terms = await Term.insertMany([
      {
        termNumber: 1,
        academicYear: 2025,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-06-30'),
        school: schoolDoc._id,
        isDeleted: false,
      },
    ]);
    termDoc = terms[0];
    console.log('✅ Term seeded:', termDoc.termNumber);
  } catch (err) {
    console.error('❌ Term error:', err.message);
  }

  let users = [];
  try {
    await User.deleteMany({ role: { $in: ['teacher', 'student'] } });
    users = await User.insertMany([
      {
        fullName: 'Mr. John Doe',
        email: 'teacher@example.com',
        password: 'Teacher123!',
        role: 'teacher',
        school: schoolDoc._id,
        phoneNumber: '+12025550102',
        preferences: { notifications: { email: true }, theme: 'light' },
      },
      {
        fullName: 'Alice Student',
        email: 'student@example.com',
        password: 'Student123!',
        role: 'student',
        school: schoolDoc._id,
        registrationNumber: 'ST001',
        phoneNumber: '+12025550103',
        preferences: { notifications: { email: true }, theme: 'light' },
      },
    ]);
    console.log('✅ Users seeded:', users.map(u => u.fullName).join(', '));
  } catch (err) {
    console.error('❌ User error:', err.message);
  }

  const teacher = users.find(u => u.role === 'teacher');
  const student = users.find(u => u.role === 'student');

  let subjectDoc;
  try {
    await Subject.deleteMany({});
    const subjects = await Subject.insertMany([
      {
        name: 'Programming Fundamentals',
        school: schoolDoc._id,
        classes: [classes[0]._id],
        trades: [trades[0]._id],
        teacher: teacher._id,
        credits: 3,
        isDeleted: false,
      },
    ]);
    subjectDoc = subjects[0];
    console.log('✅ Subject seeded:', subjectDoc.name);
  } catch (err) {
    console.error('❌ Subject error:', err.message);
  }

  let examDoc;
  try {
    await Exam.deleteMany({});
    const exams = await Exam.insertMany([
      {
        title: 'Midterm Exam',
        subject: subjectDoc._id,
        classes: [classes[0]._id],
        teacher: teacher._id,
        type: 'exam',
        schedule: { start: new Date(Date.now() + 86400000), duration: 90 },
        questions: [
          { type: 'multiple-choice', text: 'What is a variable?', options: [{ text: 'A', isCorrect: true }], correctAnswer: 'A', maxScore: 10 },
        ],
        status: 'scheduled',
      },
    ]);
    examDoc = exams[0];
    console.log('✅ Exam seeded:', examDoc.title);
  } catch (err) {
    console.error('❌ Exam error:', err.message);
  }

  try {
    await Enrollment.deleteMany({});
    await Enrollment.create({
      student: student._id,
      class: classes[0]._id,
      term: termDoc._id,
      school: schoolDoc._id,
      isActive: true,
      isDeleted: false,
    });
    console.log('✅ Enrollment seeded');
  } catch (err) {
    console.error('❌ Enrollment error:', err.message);
  }

  try {
    await Submission.deleteMany({});
    await Submission.create({
      exam: examDoc._id,
      student: student._id,
      answers: [{ questionId: examDoc.questions[0]._id, answer: 'A', score: 10 }],
      totalScore: 10,
      percentage: 100,
      startedAt: new Date(),
      submittedAt: new Date(),
      status: 'graded',
      gradedBy: teacher._id,
      gradedAt: new Date(),
      isDeleted: false,
    });
    console.log('✅ Submission seeded');
  } catch (err) {
    console.error('❌ Submission error:', err.message);
  }

  try {
    await ReportCard.deleteMany({});
    await ReportCard.create({
      student: student._id,
      term: termDoc._id,
      grades: [{ subject: subjectDoc._id, score: 10 }],
    });
    console.log('✅ ReportCard seeded');
  } catch (err) {
    console.error('❌ ReportCard error:', err.message);
  }

  try {
    await PromotionLog.deleteMany({});
    await PromotionLog.create({
      student: student._id,
      fromClass: classes[0]._id,
      toClass: classes[1]._id,
      date: new Date(),
    });
    console.log('✅ PromotionLog seeded');
  } catch (err) {
    console.error('❌ PromotionLog error:', err.message);
  }

  await mongoose.disconnect();
  console.log('✅ Database seeding complete and disconnected.');
})();