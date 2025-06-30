// const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs');
// const dotenv = require('dotenv');
// const Class = require('./models/Class');
// const User = require('./models/User');
// const Subject = require('./models/Subject');
// const Exam = require('./models/Exam');
// const Submission = require('./models/Submission');
// const School = require('./models/school');
// const Trade = require('./models/trade');
// const Term = require('./models/term');
// const Enrollment = require('./models/enrollment');
// const ReportCard = require('./models/report');
// const PromotionLog = require('./models/promotionLog');

// dotenv.config();

// // Configure Mongoose
// mongoose.set('useFindAndModify', false);
// mongoose.set('useCreateIndex', true);

// const connectDB = async () => {
//     try {
//         await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/school-exam-system', {
//             useNewUrlParser: true,
//             useUnifiedTopology: true,
//         });
//         console.log('MongoDB connected for seeding...');
//     } catch (err) {
//         console.error('Database connection error:', err.message);
//         process.exit(1);
//     }
// };

// const createUser = async (userData) => {
//     try {
//         const userWithHashedPassword = {
//             ...userData,
//             passwordHash: bcrypt.hashSync(userData.passwordHash, 10),
//             createdAt: new Date(),
//             updatedAt: new Date(),
//             preferences: {
//                 notifications: {
//                     email: !!userData.email,
//                     sms: !!userData.phoneNumber,
//                 },
//             },
//         };
//         const user = await User.create(userWithHashedPassword);
//         return user;
//     } catch (err) {
//         console.error(`Error creating user ${userData.fullName}:`, err.message);
//         throw err;
//     }
// };

// const generateReport = async () => {
//     const students = await User.find({ role: 'student' });
//     for (const student of students) {
//         const submissions = await Submission.find({ student: student._id, status: 'graded' })
//             .populate('exam')
//             .populate('student');
//         if (submissions.length > 0) {
//             const totalScore = submissions.reduce((sum, sub) => sum + sub.totalScore, 0);
//             const average = totalScore / submissions.length;
//             const status = average >= 70 ? 'Competent' : 'Not Yet Competent';
//             console.log(`Report for ${student.fullName}: Average Score = ${average.toFixed(2)}, Status = ${status}, Submissions: ${submissions.length}`);
//         } else {
//             console.log(`No submissions found for ${student.fullName}`);
//         }
//     }
// };

// const seedDatabase = async () => {
//     try {
//         // Clear existing data
//         await Promise.all([
//             Class.deleteMany({}),
//             User.deleteMany({}),
//             Subject.deleteMany({}),
//             Exam.deleteMany({}),
//             Submission.deleteMany({}),
//             School.deleteMany({}),
//             Trade.deleteMany({}),
//             Term.deleteMany({}),
//             Enrollment.deleteMany({}),
//             ReportCard.deleteMany({}),
//             PromotionLog.deleteMany({}),
//         ]);
//         console.log('Previous data cleared');

//         // Create Trades
//         const trades = await Trade.insertMany([
//             { code: 'SD1', name: 'Software Development', description: 'Training in software engineering', isDeleted: false },
//             { code: 'NIT', name: 'Network and IT', description: 'Training in networking', isDeleted: false },
//             { code: 'MMP', name: 'Training in multimedia', isDeleted: false },
//         ]);
//         console.log('Trades created');

//         // Create Headmasters
//         const headmasterDocs = [
//             {
//                 fullName: 'Dr. Emily Carter',
//                 email: 'emily.carter@example.com',
//                 phoneNumber: '+12025550101',
//                 passwordHash: 'Headmaster123',
//                 role: 'headmaster',
//             },
//             {
//                 fullName: 'Prof. Michael Lee',
//                 email: 'michael.lee@example.com',
//                 phoneNumber: '+12025550102',
//                 passwordHash: 'Headmaster123',
//                 role: 'headmaster',
//             },
//             {
//                 fullName: 'Dr. Susan Patel',
//                 email: 'susan.patel@example.com',
//                 phoneNumber: '+12025550103',
//                 passwordHash: 'Headmaster123',
//                 role: 'headmaster',
//             },
//         ];
//         const headmasters = [];
//         for (const headmasterDoc of headmasterDocs) {
//             const headmaster = await createUser(headmasterDoc);
//             headmasters.push(headmaster);
//         }
//         console.log('Headmasters created');

//         // Create Schools with headmaster references
//         const schools = await School.insertMany([
//             {
//                 name: 'Springfield High School',
//                 address: '123 Main St, Springfield, IL, USA, 62701',
//                 contactEmail: 'contact@springfieldhs.edu',
//                 contactPhone: '555-0123',
//                 headmaster: headmasters[0]._id,
//                 tradesOffered: [trades[0]._id],
//                 logo: 'https://example.com/springfield_logo.png',
//                 isDeleted: false,
//             },
//             {
//                 name: 'Riverside Academy',
//                 address: '456 River Rd, Riverside, CA, USA, 92501',
//                 contactEmail: 'contact@riversideacademy.edu',
//                 contactPhone: '555-0456',
//                 headmaster: headmasters[1]._id,
//                 tradesOffered: [trades[1]._id],
//                 logo: 'https://example.com/riverside_logo.png',
//                 isDeleted: false,
//             },
//             {
//                 name: 'Maple Grove Institute',
//                 address: '789 Oak Ave, Maple Grove, NY, USA, 11375',
//                 contactEmail: 'contact@maplegrove.edu',
//                 contactPhone: '555-0789',
//                 headmaster: headmasters[2]._id,
//                 tradesOffered: [trades[2]._id],
//                 logo: 'https://example.com/maplegrove_logo.png',
//                 isDeleted: false,
//             },
//         ]);
//         console.log('Schools created');

//         // Update headmasters with school references
//         await Promise.all([
//             User.findOneAndUpdate({ _id: headmasters[0]._id }, { school: schools[0]._id }, { new: true }),
//             User.findOneAndUpdate({ _id: headmasters[1]._id }, { school: schools[1]._id }, { new: true }),
//             User.findOneAndUpdate({ _id: headmasters[2]._id }, { school: schools[2]._id }, { new: true }),
//         ]);
//         console.log('Headmasters updated with school references');

//         // Create Terms
//         const Now = new Date();
//         const term1Start = new Date(Now.getFullYear(), 0, 1); // January 1, 2025
//         const term1End = new Date(Now.getFullYear(), 5, 30); // June 30, 2025
//         const term2Start = new Date(Now.getFullYear(), 6, 1); // July 1, 2025
//         const term2End = new Date(Now.getFullYear(), 11, 31); // December 31, 2025

//         const terms = await Term.insertMany([
//             {
//                 termNumber: 1,
//                 academicYear: 2025,
//                 startDate: term1Start,
//                 endDate: term1End,
//                 school: schools[0]._id,
//                 isDeleted: false,
//             },
//             {
//                 termNumber: 2,
//                 academicYear: 2025,
//                 startDate: term2Start,
//                 endDate: term2End,
//                 school: schools[0]._id,
//                 isDeleted: false,
//             },
//         ]);
//         console.log('Terms created');

//         // Create Classes
//         const classes = await Class.insertMany([
//             {
//                 level: 'L3',
//                 trade: trades[0]._id,
//                 year: 2025,
//                 school: schools[0]._id,
//                 isDeleted: false,
//             },
//             {
//                 level: 'L4',
//                 trade: trades[0]._id,
//                 year: 2025,
//                 school: schools[0]._id,
//                 isDeleted: false,
//             },
//             {
//                 level: 'L5',
//                 trade: trades[0]._id,
//                 year: 2025,
//                 school: schools[0]._id,
//                 isDeleted: false,
//             },
//         ]);
//         console.log('Classes created');

//         // Create Subjects
//         const subjects = await Subject.insertMany([
//             {
//                 name: 'Programming Fundamentals',
//                 description: 'Introduction to programming concepts',
//                 school: schools[0]._id,
//                 classes: [classes[0]._id],
//                 trades: [trades[0]._id],
//                 credits: 3,
//                 isDeleted: false,
//             },
//             {
//                 name: 'Database Systems',
//                 description: 'Fundamentals of database design and management',
//                 school: schools[0]._id,
//                 classes: [classes[0]._id],
//                 trades: [trades[0]._id],
//                 credits: 3,
//                 isDeleted: false,
//             },
//         ]);
//         console.log('Subjects created');

//         // Create Teachers
//         const teacherDocs = [
//             {
//                 fullName: 'Mr. John Smith',
//                 email: 'john.smith@example.com',
//                 phoneNumber: '+12025550104',
//                 passwordHash: 'Teacher123',
//                 role: 'teacher',
//                 school: schools[0]._id,
//                 subjects: [subjects[0]._id],
//             },
//             {
//                 fullName: 'Ms. Laura Brown',
//                 email: 'laura.brown@example.com',
//                 phoneNumber: '+12025550105',
//                 passwordHash: 'Teacher123',
//                 role: 'teacher',
//                 school: schools[0]._id,
//                 subjects: [subjects[1]._id],
//             },
//         ];
//         const teachers = [];
//         for (const teacherDoc of teacherDocs) {
//             const teacher = await createUser(teacherDoc);
//             teachers.push(teacher);
//         }
//         console.log('Teachers created');

//         // Update subjects with teacher references
//         await Promise.all([
//             Subject.findOneAndUpdate({ _id: subjects[0]._id }, { teacher: teachers[0]._id }, { new: true }),
//             Subject.findOneAndUpdate({ _id: subjects[1]._id }, { teacher: teachers[1]._id }, { new: true }),
//         ]);
//         console.log('Subjects updated with teacher references');

//         // Create Dean
//         const dean = await createUser({
//             fullName: 'Dr. Robert Wilson',
//             email: 'robert.wilson@example.com',
//             phoneNumber: '+12025550106',
//             passwordHash: 'Dean123',
//             role: 'dean',
//             school: schools[0]._id,
//         });
//         console.log('Dean created');

//         // Create Admin
//         const admin = await createUser({
//             fullName: 'Ms. Sarah Davis',
//             email: 'sarah.davis@example.com',
//             phoneNumber: '+12025550107',
//             passwordHash: 'Admin123',
//             role: 'admin',
//             school: schools[0]._id,
//         });
//         console.log('Admin created');

//         // Create Students
//         const studentDocs = [
//             // L3 Students
//             {
//                 fullName: 'Alice Johnson',
//                 email: 'alice.johnson@example.com',
//                 registrationNumber: 'ST001',
//                 passwordHash: 'Student123',
//                 role: 'student',
//                 school: schools[0]._id,
//                 phoneNumber: '+12025550108',
//                 parentPhoneNumber: '+12025550128',
//             },
//             {
//                 fullName: 'Bob Williams',
//                 email: 'bob.williams@example.com',
//                 registrationNumber: 'ST002',
//                 passwordHash: 'Student123',
//                 role: 'student',
//                 school: schools[0]._id,
//                 phoneNumber: '+12025550109',
//                 parentPhoneNumber: '+12025550129',
//             },
//             {
//                 fullName: 'Charlie Brown',
//                 email: 'charlie.brown@example.com',
//                 registrationNumber: 'ST003',
//                 passwordHash: 'Student123',
//                 role: 'student',
//                 school: schools[0]._id,
//                 phoneNumber: '+12025550110',
//                 parentPhoneNumber: '+12025550130',
//             },
//             {
//                 fullName: 'Diana Evans',
//                 email: 'diana.evans@example.com',
//                 registrationNumber: 'ST004',
//                 passwordHash: 'Student123',
//                 role: 'student',
//                 school: schools[0]._id,
//                 phoneNumber: '+12025550111',
//                 parentPhoneNumber: '+12025550131',
//             },
//             {
//                 fullName: 'Ethan Clark',
//                 email: 'ethan.clark@example.com',
//                 registrationNumber: 'ST005',
//                 passwordHash: 'Student123',
//                 role: 'student',
//                 school: schools[0]._id,
//                 phoneNumber: '+12025550112',
//                 parentPhoneNumber: '+12025550132',
//             },
//             // L4 Students
//             {
//                 fullName: 'Fiona Harris',
//                 email: 'fiona.harris@example.com',
//                 registrationNumber: 'ST006',
//                 passwordHash: 'Student123',
//                 role: 'student',
//                 school: schools[0]._id,
//                 phoneNumber: '+12025550113',
//                 parentPhoneNumber: '+12025550133',
//             },
//             {
//                 fullName: 'George Lee',
//                 email: 'george.lee@example.com',
//                 registrationNumber: 'ST007',
//                 passwordHash: 'Student123',
//                 role: 'student',
//                 school: schools[0]._id,
//                 phoneNumber: '+12025550114',
//                 parentPhoneNumber: '+12025550134',
//             },
//             {
//                 fullName: 'Hannah Moore',
//                 email: 'hannah.moore@example.com',
//                 registrationNumber: 'ST008',
//                 passwordHash: 'Student123',
//                 role: 'student',
//                 school: schools[0]._id,
//                 phoneNumber: '+12025550115',
//                 parentPhoneNumber: '+12025550135',
//             },
//             {
//                 fullName: 'Ian Taylor',
//                 email: 'ian.taylor@example.com',
//                 registrationNumber: 'ST009',
//                 passwordHash: 'Student123',
//                 role: 'student',
//                 school: schools[0]._id,
//                 phoneNumber: '+12025550116',
//                 parentPhoneNumber: '+12025550136',
//             },
//             {
//                 fullName: 'Julia White',
//                 email: 'julia.white@example.com',
//                 registrationNumber: 'ST010',
//                 passwordHash: 'Student123',
//                 role: 'student',
//                 school: schools[0]._id,
//                 phoneNumber: '+12025550117',
//                 parentPhoneNumber: '+12025550137',
//             },
//             // L5 Students
//             {
//                 fullName: 'Kevin Adams',
//                 email: 'kevin.adams@example.com',
//                 registrationNumber: 'ST011',
//                 passwordHash: 'Student123',
//                 role: 'student',
//                 school: schools[0]._id,
//                 phoneNumber: '+12025550118',
//                 parentPhoneNumber: '+12025550138',
//             },
//             {
//                 fullName: 'Lily Baker',
//                 email: 'lily.baker@example.com',
//                 registrationNumber: 'ST012',
//                 passwordHash: 'Student123',
//                 role: 'student',
//                 school: schools[0]._id,
//                 phoneNumber: '+12025550119',
//                 parentPhoneNumber: '+12025550139',
//             },
//             {
//                 fullName: 'Mike Carter',
//                 email: 'mike.carter@example.com',
//                 registrationNumber: 'ST013',
//                 passwordHash: 'Student123',
//                 role: 'student',
//                 school: schools[0]._id,
//                 phoneNumber: '+12025550120',
//                 parentPhoneNumber: '+12025550140',
//             },
//             {
//                 fullName: 'Nancy Davis',
//                 email: 'nancy.davis@example.com',
//                 registrationNumber: 'ST014',
//                 passwordHash: 'Student123',
//                 role: 'student',
//                 school: schools[0]._id,
//                 phoneNumber: '+12025550121',
//                 parentPhoneNumber: '+12025550141',
//             },
//             {
//                 fullName: 'Oliver Evans',
//                 email: 'oliver.evans@example.com',
//                 registrationNumber: 'ST015',
//                 passwordHash: 'Student123',
//                 role: 'student',
//                 school: schools[0]._id,
//                 phoneNumber: '+12025550122',
//                 parentPhoneNumber: '+12025550142',
//             },
//         ];
//         const students = [];
//         for (const studentDoc of studentDocs) {
//             const student = await createUser(studentDoc);
//             students.push(student);
//         }
//         console.log('Students created');

//         // Create Enrollments
//         const enrollments = [];
//         for (let i = 0; i < students.length; i++) {
//             const classIndex = Math.floor(i / 5); // 0: L3, 1: L4, 2: L5
//             const enrollment = await Enrollment.create({
//                 student: students[i]._id,
//                 class: classes[classIndex]._id,
//                 term: terms[0]._id,
//                 school: schools[0]._id,
//                 isActive: true,
//                 isDeleted: false,
//             });
//             enrollments.push(enrollment);
//             console.log(`Enrolled ${students[i].fullName} in class ${classes[classIndex].level}`);
//         }
//         console.log('Enrollments created');

//         // Create Exams
//         const now = new Date();
//         const exams = await Exam.insertMany([
//             {
//                 title: 'Programming Midterm',
//                 classes: [classes[0]._id],
//                 subject: subjects[0]._id,
//                 teacher: teachers[0]._id,
//                 type: 'exam',
//                 schedule: { start: new Date(now.getTime() + 86400000), duration: 120 },
//                 questions: [
//                     { type: 'multiple-choice', text: 'What is a variable?', options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }], correctAnswer: 'A', maxScore: 10 },
//                     { type: 'true-false', text: 'JavaScript is case-sensitive', correctAnswer: 'true', maxScore: 5 },
//                 ],
//                 status: 'scheduled',
//                 school: schools[0]._id,
//             },
//             {
//                 title: 'Programming Quiz 1',
//                 classes: [classes[0]._id],
//                 subject: subjects[0]._id,
//                 teacher: teachers[0]._id,
//                 type: 'quiz',
//                 schedule: { start: new Date(now.getTime() + 2 * 86400000), duration: 30 },
//                 questions: [
//                     { type: 'multiple-choice', text: 'What is a loop?', options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }], correctAnswer: 'A', maxScore: 5 },
//                 ],
//                 status: 'scheduled',
//                 school: schools[0]._id,
//             },
//             {
//                 title: 'Database Midterm',
//                 classes: [classes[0]._id],
//                 subject: subjects[1]._id,
//                 teacher: teachers[1]._id,
//                 type: 'exam',
//                 schedule: { start: new Date(now.getTime() + 3 * 86400000), duration: 120 },
//                 questions: [
//                     { type: 'multiple-choice', text: 'What is SQL?', options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }], correctAnswer: 'A', maxScore: 10 },
//                     { type: 'true-false', text: 'NoSQL databases are relational', correctAnswer: 'false', maxScore: 5 },
//                 ],
//                 status: 'scheduled',
//                 school: schools[0]._id,
//             },
//             {
//                 title: 'Database Quiz 1',
//                 classes: [classes[0]._id],
//                 subject: subjects[1]._id,
//                 teacher: teachers[1]._id,
//                 type: 'quiz',
//                 schedule: { start: new Date(now.getTime() + 4 * 86400000), duration: 30 },
//                 questions: [
//                     { type: 'multiple-choice', text: 'What is a primary key?', options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }], correctAnswer: 'A', maxScore: 5 },
//                 ],
//                 status: 'scheduled',
//                 school: schools[0]._id,
//             },
//             {
//                 title: 'Programming Final',
//                 classes: [classes[0]._id],
//                 subject: subjects[0]._id,
//                 teacher: teachers[0]._id,
//                 type: 'exam',
//                 schedule: { start: new Date(now.getTime() + 5 * 86400000), duration: 180 },
//                 questions: [
//                     { type: 'multiple-choice', text: 'What is an array?', options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }], correctAnswer: 'A', maxScore: 20 },
//                 ],
//                 status: 'scheduled',
//                 school: schools[0]._id,
//             },
//             {
//                 title: 'Database Final',
//                 classes: [classes[0]._id],
//                 subject: subjects[1]._id,
//                 teacher: teachers[1]._id,
//                 type: 'exam',
//                 schedule: { start: new Date(now.getTime() + 6 * 86400000), duration: 180 },
//                 questions: [
//                     { type: 'multiple-choice', text: 'What is normalization?', options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }], correctAnswer: 'A', maxScore: 20 },
//                 ],
//                 status: 'scheduled',
//                 school: schools[0]._id,
//             },
//         ]);
//         console.log('Exams created');

//         // Create Submissions for L3 Students
//         const l3Enrollments = enrollments.slice(0, 5); // First 5 students are in L3
//         const submissions = [];
//         for (const enrollment of l3Enrollments) {
//             for (const exam of exams) {
//                 const answers = exam.questions.map(q => ({
//                     questionId: q._id,
//                     answer: q.correctAnswer || 'Sample answer',
//                     score: ['multiple-choice', 'true-false'].includes(q.type) ? q.maxScore : 0,
//                     graded: ['multiple-choice', 'true-false'].includes(q.type),
//                 }));
//                 const totalScore = answers.reduce((sum, a) => sum + a.score, 0);
//                 const submission = await Submission.create({
//                     exam: exam._id,
//                     student: enrollment.student,
//                     enrollment: enrollment._id,
//                     answers,
//                     totalScore,
//                     percentage: (totalScore / exam.questions.reduce((sum, q) => sum + q.maxScore, 0)) * 100,
//                     startedAt: new Date(),
//                     submittedAt: new Date(),
//                     status: answers.every(a => a.graded) ? 'graded' : 'submitted',
//                     gradedBy: exam.teacher,
//                     gradedAt: answers.every(a => a.graded) ? new Date() : null,
//                     isDeleted: false,
//                 });
//                 submissions.push(submission);
//                 console.log(`Submission created for student ${enrollment.student} in exam ${exam.title}`);
//             }
//         }
//         console.log(`Submissions created: ${submissions.length}`);

//         // Create Report Cards
//         const reportCards = [];
//         for (const enrollment of l3Enrollments) {
//             const studentSubmissions = submissions.filter(s => s.student.toString() === enrollment.student.toString());
//             const results = subjects.map(subject => {
//                 const subjectSubmissions = studentSubmissions.filter(s => s.exam.subject.toString() === subject._id.toString());
//                 const examScores = subjectSubmissions.reduce((acc, s) => {
//                     if (s.exam.type === 'exam') acc.exam += s.totalScore;
//                     else if (s.exam.type === 'quiz') acc.assessment1 += s.totalScore;
//                     return acc;
//                 }, { assessment1: 0, assessment2: 0, test: 0, exam: 0 });
//                 const total = examScores.assessment1 + examScores.exam;
//                 return {
//                     subject: subject._id,
//                     scores: examScores,
//                     total,
//                     percentage: total > 0 ? (total / 100) * 100 : 0,
//                     decision: total >= 70 ? 'Competent' : 'Not Yet Competent',
//                 };
//             });
//             const reportCard = await ReportCard.create({
//                 student: enrollment.student,
//                 class: enrollment.class,
//                 academicYear: 2025,
//                 term: terms[0]._id,
//                 school: schools[0]._id,
//                 results,
//                 totalScore: results.reduce((sum, r) => sum + r.total, 0),
//                 average: results.length ? results.reduce((sum, r) => sum + r.total, 0) / results.length : 0,
//                 isDeleted: false,
//             });
//             reportCards.push(reportCard);
//             console.log(`Report card created for student ${enrollment.student}`);
//         }
//         console.log('Report cards created');

//         // Create Promotion Logs
//         const promotionLogs = [];
//         for (let i = 0; i < enrollments.length; i++) {
//             const enrollment = enrollments[i];
//             const classIndex = Math.floor(i / 5); // 0: L3, 1: L4, 2: L5
//             let status, toClass, remarks;
//             if (classIndex === 0) { // L3
//                 status = 'promoted';
//                 toClass = classes[1]._id; // L4
//                 remarks = 'Promoted to L4 based on performance';
//             } else if (classIndex === 1) { // L4
//                 status = 'promoted';
//                 toClass = classes[2]._id; // L5
//                 remarks = 'Promoted to L5 based on performance';
//             } else { // L5
//                 status = 'graduated';
//                 toClass = null;
//                 remarks = 'Graduated from program';
//             }
//             const promotionLog = await PromotionLog.create({
//                 student: enrollment.student,
//                 fromClass: enrollment.class,
//                 toClass,
//                 academicYear: 2025,
//                 status,
//                 remarks,
//                 school: schools[0]._id,
//                 promotionDate: new Date(),
//                 manual: false,
//             });
//             promotionLogs.push(promotionLog);
//             console.log(`Promotion log created for student ${enrollment.student}: ${status}`);
//         }
//         console.log(`Promotion logs created: ${promotionLogs.length}`);

//         await generateReport();
//         console.log('Seeding completed successfully');
//     } catch (err) {
//         console.error('Error seeding database:', err);
//         throw err;
//     }
// };

// const runSeeder = async () => {
//     try {
//         await connectDB();
//         await seedDatabase();
//     } catch (err) {
//         console.error('Seeding failed:', err);
//     } finally {
//         await mongoose.connection.close();
//         console.log('Database connection closed');
//     }
// };

// runSeeder();