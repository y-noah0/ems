const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const School = require('./school');
const Trade = require('./trade');
const Subject = require('./Subject');
const Term = require('./term');
const User = require('./User');
const Class = require('./Class');
const Enrollment = require('./enrollment');
const Notification = require('./Notification');
const Submission = require('./Submission');

// Define minimal Exam schema
const ExamSchema = new mongoose.Schema({
    title: { type: String, required: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    totalScore: { type: Number, required: true },
    questions: [{
        _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
        type: { type: String, enum: ['multiple-choice', 'true-false', 'short-answer', 'essay'], required: true },
        correctAnswer: { type: String },
        maxScore: { type: Number, required: true }
    }],
    isDeleted: { type: Boolean, default: false }
});
const Exam = mongoose.model('Exam', ExamSchema);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/school-exam-system', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
    });

// Sample data
const schoolsData = [
    {
        name: 'Sunrise TVET Academy',
        address: '123 Kigali Road, Kigali',
        contactEmail: 'admin@sunrise.ac.rw',
        contactPhone: '+250788123456',
        category: 'TVET',
        logo: '/uploads/sunrise_logo.png',
        isDeleted: false
    },
    {
        name: 'Green Hills TVET School',
        address: '456 Gisenyi Street, Gisenyi',
        contactEmail: 'admin@greenhills.ac.rw',
        contactPhone: '+250788654321',
        category: 'TVET',
        logo: '/uploads/greenhills_logo.png',
        isDeleted: false
    },
    {
        name: 'Bright Future TVET Institute',
        address: '789 Butare Avenue, Butare',
        contactEmail: 'admin@brightfuture.ac.rw',
        contactPhone: '+250788987654',
        category: 'TVET',
        logo: '/Uploads/brightfuture_logo.png',
        isDeleted: false
    }
];

const tradesData = [
    { code: 'CS', name: 'Computer Science', description: 'Study of computing technologies', category: 'TVET', isDeleted: false },
    { code: 'ENG', name: 'Engineering', description: 'Applied engineering principles', category: 'TVET', isDeleted: false },
    { code: 'AUTO', name: 'Automotive Technology', description: 'Vehicle repair and maintenance', category: 'TVET', isDeleted: false }
];

const subjectsData = [
    { name: 'Mathematics', description: 'Core math for technical studies', credits: 3 },
    { name: 'Physics', description: 'Applied physics for engineering', credits: 2 },
    { name: 'Programming', description: 'Introduction to coding', credits: 3 },
    { name: 'Electronics', description: 'Basics of electronic circuits', credits: 2 },
    { name: 'Mechanics', description: 'Mechanical systems and principles', credits: 2 },
    { name: 'English', description: 'Technical communication skills', credits: 1 }
];

const termsData = [
    { termNumber: 1, academicYear: 2025, startDate: new Date('2025-01-15'), endDate: new Date('2025-04-15'), isDeleted: false },
    { termNumber: 2, academicYear: 2025, startDate: new Date('2025-05-01'), endDate: new Date('2025-08-15'), isDeleted: false },
    { termNumber: 3, academicYear: 2025, startDate: new Date('2025-09-01'), endDate: new Date('2025-12-15'), isDeleted: false }
];

const usersData = [
    // Headmasters
    {
        role: 'headmaster',
        fullName: 'John Mugabo',
        email: 'john.mugabo@sunrise.ac.rw',
        registrationNumber: 'HM001',
        passwordHash: 'password123',
        phoneNumber: '+250788111222',
        profilePicture: '/uploads/john_mugabo.jpg',
        preferences: { notifications: { email: true, sms: true }, theme: 'light' },
        isDeleted: false
    },
    {
        role: 'headmaster',
        fullName: 'Alice Uwera',
        email: 'alice.uwera@greenhills.ac.rw',
        registrationNumber: 'HM002',
        passwordHash: 'password123',
        phoneNumber: '+250788333444',
        profilePicture: '/uploads/alice_uwera.jpg',
        preferences: { notifications: { email: true, sms: true }, theme: 'dark' },
        isDeleted: false
    },
    {
        role: 'headmaster',
        fullName: 'Peter Ndizeye',
        email: 'peter.ndizeye@brightfuture.ac.rw',
        registrationNumber: 'HM003',
        passwordHash: 'password123',
        phoneNumber: '+250788555666',
        profilePicture: '/uploads/peter_ndizeye.jpg',
        preferences: { notifications: { email: true, sms: true }, theme: 'light' },
        isDeleted: false
    },
    // Deans
    {
        role: 'dean',
        fullName: 'Mary Kanyange',
        email: 'mary.kanyange@sunrise.ac.rw',
        registrationNumber: 'DN001',
        passwordHash: 'password123',
        phoneNumber: '+250788222111',
        profilePicture: '/uploads/mary_kanyange.jpg',
        preferences: { notifications: { email: true, sms: true }, theme: 'light' },
        isDeleted: false
    },
    {
        role: 'dean',
        fullName: 'James Ntezimana',
        email: 'james.ntezimana@greenhills.ac.rw',
        registrationNumber: 'DN002',
        passwordHash: 'password123',
        phoneNumber: '+250788444222',
        profilePicture: '/uploads/james_ntezimana.jpg',
        preferences: { notifications: { email: true, sms: true }, theme: 'dark' },
        isDeleted: false
    },
    {
        role: 'dean',
        fullName: 'Grace Mukamana',
        email: 'grace.mukamana@brightfuture.ac.rw',
        registrationNumber: 'DN003',
        passwordHash: 'password123',
        phoneNumber: '+250788666333',
        profilePicture: '/uploads/grace_mukamana.jpg',
        preferences: { notifications: { email: true, sms: true }, theme: 'light' },
        isDeleted: false
    },
    // Teachers
    {
        role: 'teacher',
        fullName: 'Emma Niyitegeka',
        email: 'emma.niyitegeka@sunrise.ac.rw',
        registrationNumber: 'TR001',
        passwordHash: 'password123',
        phoneNumber: '+250788777888',
        profilePicture: '/uploads/emma_niyitegeka.jpg',
        preferences: { notifications: { email: true, sms: true }, theme: 'light' },
        isDeleted: false
    },
    {
        role: 'teacher',
        fullName: 'Sarah Mukasa',
        email: 'sarah.mukasa@greenhills.ac.rw',
        registrationNumber: 'TR002',
        passwordHash: 'password123',
        phoneNumber: '+250788999000',
        profilePicture: '/uploads/sarah_mukasa.jpg',
        preferences: { notifications: { email: true, sms: true }, theme: 'dark' },
        isDeleted: false
    },
    {
        role: 'teacher',
        fullName: 'David Rukundo',
        email: 'david.rukundo@brightfuture.ac.rw',
        registrationNumber: 'TR003',
        passwordHash: 'password123',
        phoneNumber: '+250788111333',
        profilePicture: '/uploads/david_rukundo.jpg',
        preferences: { notifications: { email: true, sms: true }, theme: 'light' },
        isDeleted: false
    },
    // Students
    {
        role: 'student',
        fullName: 'Clara Ingabire',
        registrationNumber: 'ST001',
        passwordHash: 'password123',
        phoneNumber: '+250788222333',
        parentFullName: 'Jean Ingabire',
        parentPhoneNumber: '+250788444555',
        profilePicture: '/uploads/clara_ingabire.jpg',
        preferences: { notifications: { email: false, sms: true }, theme: 'light' },
        isDeleted: false
    },
    {
        role: 'student',
        fullName: 'Paul Kayumba',
        registrationNumber: 'ST002',
        passwordHash: 'password123',
        phoneNumber: '+250788666777',
        parentFullName: 'Marie Kayumba',
        parentPhoneNumber: '+250788888999',
        profilePicture: '/uploads/paul_kayumba.jpg',
        preferences: { notifications: { email: false, sms: true }, theme: 'dark' },
        isDeleted: false
    },
    {
        role: 'student',
        fullName: 'Anna Uwimana',
        registrationNumber: 'ST003',
        passwordHash: 'password123',
        phoneNumber: '+250788000111',
        parentFullName: 'Joseph Uwimana',
        parentPhoneNumber: '+250788222444',
        profilePicture: '/uploads/anna_uwimana.jpg',
        preferences: { notifications: { email: false, sms: true }, theme: 'light' },
        isDeleted: false
    },
    {
        role: 'student',
        fullName: 'Mark Nkurunziza',
        registrationNumber: 'ST004',
        passwordHash: 'password123',
        phoneNumber: '+250788333555',
        parentFullName: 'Grace Nkurunziza',
        parentPhoneNumber: '+250788555777',
        profilePicture: '/uploads/mark_nkurunziza.jpg',
        preferences: { notifications: { email: false, sms: true }, theme: 'dark' },
        isDeleted: false
    }
];

// Classes data with unique term assignments
const classesData = [
    { level: 'L3', tradeCode: 'CS', year: 2025, termNumber: 1, capacity: 30, subjectNames: ['Mathematics', 'Programming', 'English'] },
    { level: 'L4', tradeCode: 'CS', year: 2025, termNumber: 1, capacity: 25, subjectNames: ['Mathematics', 'Programming', 'Electronics'] },
    { level: 'L5', tradeCode: 'CS', year: 2025, termNumber: 1, capacity: 20, subjectNames: ['Programming', 'English'] },
    { level: 'L3', tradeCode: 'ENG', year: 2025, termNumber: 1, capacity: 35, subjectNames: ['Mathematics', 'Physics', 'Mechanics'] },
    { level: 'L4', tradeCode: 'ENG', year: 2025, termNumber: 1, capacity: 30, subjectNames: ['Physics', 'Mechanics', 'English'] },
    { level: 'L3', tradeCode: 'AUTO', year: 2025, termNumber: 1, capacity: 28, subjectNames: ['Mechanics', 'Electronics', 'English'] },
    // Add term 2 classes to ensure variety
    { level: 'L3', tradeCode: 'CS', year: 2025, termNumber: 2, capacity: 30, subjectNames: ['Mathematics', 'Programming', 'English'] },
    { level: 'L4', tradeCode: 'CS', year: 2025, termNumber: 2, capacity: 25, subjectNames: ['Mathematics', 'Programming', 'Electronics'] }
];

const enrollmentsData = [
    { studentReg: 'ST001', classLevel: 'L3', tradeCode: 'CS', termNumber: 1, year: 2025 },
    { studentReg: 'ST002', classLevel: 'L3', tradeCode: 'CS', termNumber: 1, year: 2025 },
    { studentReg: 'ST003', classLevel: 'L4', tradeCode: 'CS', termNumber: 1, year: 2025 },
    { studentReg: 'ST004', classLevel: 'L3', tradeCode: 'ENG', termNumber: 1, year: 2025 }
];

const examsData = [
    { title: 'Programming Midterm', totalScore: 100, questions: [{ type: 'multiple-choice', correctAnswer: 'A', maxScore: 10 }], isDeleted: false },
    { title: 'Mathematics Final', totalScore: 100, questions: [{ type: 'short-answer', correctAnswer: '42', maxScore: 20 }], isDeleted: false }
];

const submissionsData = [
    {
        studentReg: 'ST001',
        examTitle: 'Programming Midterm',
        answers: [{ questionId: null, answer: 'A', score: 10, graded: true }],
        totalScore: 10,
        percentage: 10,
        status: 'graded',
        isDeleted: false
    },
    {
        studentReg: 'ST002',
        examTitle: 'Programming Midterm',
        answers: [{ questionId: null, answer: 'B', score: 0, graded: true }],
        totalScore: 0,
        percentage: 0,
        status: 'graded',
        isDeleted: false
    }
];

const notificationsData = [
    { type: 'system', title: 'Welcome', message: 'Welcome to the system!', isRead: false, isDeleted: false },
    { type: 'grade', title: 'Exam Graded', message: 'Your Programming Midterm has been graded.', isRead: false, isDeleted: false },
    { type: 'message', title: 'Reminder', message: 'Submit your assignments by Friday.', isRead: false, isDeleted: false }
];

async function seedDatabase() {
    try {
        // Drop existing collections
        await Promise.all([
            School.deleteMany({}),
            Trade.deleteMany({}),
            Subject.deleteMany({}),
            Term.deleteMany({}),
            User.deleteMany({}),
            Class.deleteMany({}),
            Enrollment.deleteMany({}),
            Notification.deleteMany({}),
            Submission.deleteMany({}),
            Exam.deleteMany({})
        ]);
        console.log('Cleared existing collections');

        // Hash passwords for users
        for (const user of usersData) {
            const salt = await bcrypt.genSalt(10);
            user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
        }

        // Seed Users (headmasters first, then deans, teachers, and students)
        const users = [];
        const headmasters = usersData.filter(u => u.role === 'headmaster');
        const deans = usersData.filter(u => u.role === 'dean');
        const others = usersData.filter(u => !['headmaster', 'dean'].includes(u.role));

        // Seed Schools and assign headmasters
        const schools = [];
        for (let i = 0; i < schoolsData.length; i++) {
            const headmaster = new User(headmasters[i]);
            await headmaster.save();
            const school = new School({ ...schoolsData[i], headmaster: headmaster._id, tradesOffered: [] });
            await school.save();
            schools.push(school);
            users.push(headmaster);
            console.log(`Seeded school ${school.name} with headmaster ${headmaster.fullName}`);
        }

        // Assign deans to schools
        for (let i = 0; i < deans.length; i++) {
            const dean = new User({ ...deans[i], school: schools[i % schools.length]._id });
            await dean.save();
            users.push(dean);
            console.log(`Seeded dean ${dean.fullName} for school ${schools[i % schools.length].name}`);
        }

        // Seed Trades
        const trades = await Trade.insertMany(tradesData);
        console.log(`Seeded ${trades.length} trades`);

        // Update schools with tradesOffered
        for (const school of schools) {
            school.tradesOffered = trades.map(trade => trade._id);
            await school.save();
        }

        // Map trade codes to their ObjectIds
        const tradeMap = trades.reduce((map, trade) => {
            map[trade.code] = trade._id;
            return map;
        }, {});

        // Seed Teachers and Students
        for (const user of others) {
            const school = schools[Math.floor(Math.random() * schools.length)];
            const userDoc = new User({ ...user, school: school._id });
            await userDoc.save();
            users.push(userDoc);
        }
        console.log(`Seeded ${others.length} users (teachers and students)`);

        // Seed Subjects for each school, assigning teachers
        const subjects = [];
        for (const school of schools) {
            const schoolTeachers = users.filter(u => u.role === 'teacher' && u.school.toString() === school._id.toString());
            let teacherIndex = 0;
            const schoolSubjects = subjectsData.map(subject => {
                const teacher = schoolTeachers[teacherIndex] || null;
                teacherIndex = (teacherIndex + 1) % (schoolTeachers.length || 1);
                return {
                    name: `${subject.name}-${school.name}`, // Ensure unique name
                    description: subject.description,
                    school: school._id,
                    trades: trades.filter(t => subject.name.includes(t.name.split(' ')[0])).map(t => t._id),
                    teacher: teacher ? teacher._id : null,
                    credits: subject.credits,
                    isDeleted: false
                };
            });
            const insertedSubjects = await Subject.insertMany(schoolSubjects);
            subjects.push(...insertedSubjects);
            console.log(`Seeded ${insertedSubjects.length} subjects for school ${school.name}`);
        }

        // Map subject names to their ObjectIds per school
        const subjectMap = subjects.reduce((map, subject) => {
            if (!map[subject.school]) map[subject.school] = {};
            map[subject.school][subject.name.split('-')[0]] = subject._id; // Map original name
            return map;
        }, {});

        // Seed Terms for each school
        const terms = [];
        for (const school of schools) {
            const schoolTerms = termsData.map(term => ({
                ...term,
                school: school._id
            }));
            const insertedTerms = await Term.insertMany(schoolTerms);
            terms.push(...insertedTerms);
            console.log(`Seeded ${insertedTerms.length} terms for school ${school.name}`);
        }

        // Map terms by school, year, and termNumber
        const termMap = terms.reduce((map, term) => {
            if (!map[term.school]) map[term.school] = {};
            map[term.school][`${term.academicYear}-${term.termNumber}`] = term._id;
            return map;
        }, {});

        // Seed Classes (check for duplicates)
        const classes = [];
        for (const school of schools) {
            for (const classItem of classesData) {
                const subjectIds = classItem.subjectNames
                    .map(name => subjectMap[school._id]?.[name])
                    .filter(id => id);
                if (subjectIds.length !== classItem.subjectNames.length) {
                    console.warn(`Skipping class ${classItem.level}${classItem.tradeCode} for school ${school.name}: Missing subjects`);
                    continue;
                }
                const termId = termMap[school._id][`${classItem.year}-${classItem.termNumber}`];
                if (!termId) {
                    console.warn(`Skipping class ${classItem.level}${classItem.tradeCode} for school ${school.name}: Term ${classItem.termNumber} not found`);
                    continue;
                }
                // Check for existing class to avoid duplicate key error
                const existingClass = await Class.findOne({
                    level: classItem.level,
                    trade: tradeMap[classItem.tradeCode],
                    year: classItem.year,
                    school: school._id,
                    term: termId
                });
                if (existingClass) {
                    console.warn(`Class ${classItem.level}${classItem.tradeCode} for school ${school.name}, term ${classItem.termNumber} already exists, using existing class`);
                    classes.push(existingClass);
                    continue;
                }
                const classDoc = new Class({
                    level: classItem.level,
                    trade: tradeMap[classItem.tradeCode],
                    year: classItem.year,
                    school: school._id,
                    term: termId,
                    capacity: classItem.capacity,
                    subjects: subjectIds,
                    isDeleted: false
                });
                await classDoc.save();
                classes.push(classDoc);
                console.log(`Seeded class ${classItem.level}${classItem.tradeCode} for school ${school.name}, term ${classItem.termNumber}`);
            }
        }
        console.log(`Seeded ${classes.length} classes`);

        // Map classes by school, level, trade, and term
        const classMap = classes.reduce((map, classDoc) => {
            if (!map[classDoc.school]) map[classDoc.school] = {};
            map[classDoc.school][`${classDoc.level}-${classDoc.trade}-${classDoc.term}`] = classDoc._id;
            return map;
        }, {});

        // Seed Exams
        const exams = [];
        const examMap = {};
        for (const school of schools) {
            const schoolExams = examsData.map(exam => ({ ...exam, school: school._id }));
            const insertedExams = await Exam.insertMany(schoolExams);
            exams.push(...insertedExams);
            examMap[school._id] = insertedExams.reduce((map, exam) => {
                map[exam.title] = exam._id;
                return map;
            }, {});
        }
        console.log(`Seeded ${exams.length} exams`);

        // Seed Enrollments
        const enrollments = [];
        for (const enrollment of enrollmentsData) {
            const student = users.find(u => u.registrationNumber === enrollment.studentReg);
            if (!student) {
                console.warn(`Skipping enrollment for student ${enrollment.studentReg}: Student not found`);
                continue;
            }
            const school = schools.find(s => s._id.toString() === student.school.toString());
            if (!school) {
                console.warn(`Skipping enrollment for student ${enrollment.studentReg}: School not found`);
                continue;
            }
            const termId = termMap[school._id][`${enrollment.year}-${enrollment.termNumber}`];
            const classId = classMap[school._id][`${enrollment.classLevel}-${tradeMap[enrollment.tradeCode]}-${termId}`];
            if (!classId || !termId) {
                console.warn(`Skipping enrollment for student ${enrollment.studentReg}: Class or term not found`);
                continue;
            }
            // Check for existing enrollment
            const existingEnrollment = await Enrollment.findOne({
                student: student._id,
                term: termId,
                isDeleted: false
            });
            if (existingEnrollment) {
                console.warn(`Enrollment for student ${enrollment.studentReg} in term ${enrollment.termNumber} already exists, skipping`);
                enrollments.push(existingEnrollment);
                continue;
            }
            const enrollmentDoc = new Enrollment({
                student: student._id,
                class: classId,
                term: termId,
                school: school._id,
                promotionStatus: 'eligible',
                isActive: true,
                isDeleted: false,
                transferredFromSchool: null
            });
            await enrollmentDoc.save();
            enrollments.push(enrollmentDoc);
        }
        console.log(`Seeded ${enrollments.length} enrollments`);

        // Seed Submissions
        const submissions = [];
        for (const submission of submissionsData) {
            const student = users.find(u => u.registrationNumber === submission.studentReg);
            if (!student) {
                console.warn(`Skipping submission for student ${submission.studentReg}: Student not found`);
                continue;
            }
            const school = schools.find(s => s._id.toString() === student.school.toString());
            if (!school) {
                console.warn(`Skipping submission for student ${submission.studentReg}: School not found`);
                continue;
            }
            const enrollment = enrollments.find(e => e.student.toString() === student._id.toString() && e.school.toString() === school._id.toString());
            if (!enrollment) {
                console.warn(`Skipping submission for student ${submission.studentReg}: Enrollment not found`);
                continue;
            }
            const examId = examMap[school._id][submission.examTitle];
            if (!examId) {
                console.warn(`Skipping submission for student ${submission.studentReg}: Exam ${submission.examTitle} not found`);
                continue;
            }
            // Check for existing submission
            const existingSubmission = await Submission.findOne({
                exam: examId,
                student: student._id,
                isDeleted: false
            });
            if (existingSubmission) {
                console.warn(`Submission for student ${submission.studentReg} for exam ${submission.examTitle} already exists, skipping`);
                submissions.push(existingSubmission);
                continue;
            }
            const submissionDoc = new Submission({
                exam: examId,
                student: student._id,
                enrollment: enrollment._id,
                answers: submission.answers.map(answer => ({
                    ...answer,
                    questionId: exams.find(e => e._id.toString() === examId.toString()).questions[0]._id
                })),
                totalScore: submission.totalScore,
                percentage: submission.percentage,
                startedAt: new Date(),
                submittedAt: new Date(),
                timeSpent: 3600,
                status: submission.status,
                violations: 0,
                violationLogs: [],
                autoSaves: [],
                gradedBy: users.find(u => u.role === 'teacher' && u.school.toString() === school._id.toString())?._id || null,
                gradedAt: new Date(),
                isDeleted: false
            });
            await submissionDoc.save();
            submissions.push(submissionDoc);
        }
        console.log(`Seeded ${submissions.length} submissions`);

        // Seed Notifications
        const notifications = [];
        for (const user of users.slice(0, 6)) { // Include headmasters and deans
            const userNotifications = notificationsData.map(notification => ({
                ...notification,
                user: user._id,
                relatedModel: notification.type === 'grade' ? 'Submission' : null,
                relatedId: notification.type === 'grade' ? submissions[0]?._id : null
            }));
            const insertedNotifications = await Notification.insertMany(userNotifications);
            notifications.push(...insertedNotifications);
        }
        console.log(`Seeded ${notifications.length} notifications`);

        // Verify className virtual field
        const sampleClass = await Class.findOne().populate('trade');
        console.log(`Sample class name: ${sampleClass.className}`);

    } catch (error) {
        console.error('Seeding error:', error.message);
        console.error('Error details:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

seedDatabase();