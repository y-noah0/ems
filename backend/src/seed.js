const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const Class = require('./models/Class');
const User = require('./models/User');
const Subject = require('./models/Subject');
const Exam = require('./models/Exam');
const Submission = require('./models/Submission');
const School = require('./models/School');
const Trade = require('./models/Trade'); // Add Trade model import

dotenv.config();

// Configure Mongoose to suppress deprecation warnings
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/school-exam-system', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected for seeding...');
  } catch (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  }
};

const createUserWithoutHook = async (userData) => {
  try {
    const collection = mongoose.connection.collection('users');
    const userWithHashedPassword = {
      ...userData,
      passwordHash: bcrypt.hashSync(userData.passwordHash, 10),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await collection.insertOne(userWithHashedPassword);
    return await User.findById(result.insertedId);
  } catch (err) {
    console.error('Error creating user:', err.message);
    throw err;
  }
};

const seedDatabase = async () => {
  try {
    // Clear existing data
    await Promise.all([
      Class.deleteMany({}),
      User.deleteMany({}),
      Subject.deleteMany({}),
      Exam.deleteMany({}),
      Submission.deleteMany({}),
      School.deleteMany({}),
      Trade.deleteMany({}), // Clear Trade collection
    ]);
    console.log('Previous data cleared');

    // Create Trades
    const trades = await Trade.insertMany([
      {
        code: 'SOD',
        name: 'Software Development',
        description: 'Training in software engineering and programming',
        isDeleted: false,
      },
      {
        code: 'NIT',
        name: 'Network and IT',
        description: 'Training in networking and IT infrastructure',
        isDeleted: false,
      },
      {
        code: 'MMP',
        name: 'Multimedia Production',
        description: 'Training in multimedia design and production',
        isDeleted: false,
      },
    ]);
    console.log('Trades created');

    // Create Headmasters
    const headmasterDocs = [
      {
        fullName: 'Dr. Emily Carter',
        email: 'emily.carter@example.com',
        passwordHash: 'headmaster123',
        role: 'headmaster',
        registrationNumber: 'HM001',
      },
      {
        fullName: 'Prof. Michael Lee',
        email: 'michael.lee@example.com',
        passwordHash: 'headmaster123',
        role: 'headmaster',
        registrationNumber: 'HM002',
      },
      {
        fullName: 'Dr. Susan Patel',
        email: 'susan.patel@example.com',
        passwordHash: 'headmaster123',
        role: 'headmaster',
        registrationNumber: 'HM003',
      },
    ];
    const headmasters = [];
    for (const headmasterDoc of headmasterDocs) {
      const headmaster = await createUserWithoutHook(headmasterDoc);
      headmasters.push(headmaster);
    }
    console.log('Headmasters created');

    // Create Schools with tradesOffered
    const schools = await School.insertMany([
      {
        name: 'Springfield High School',
        address: '123 Main St, Springfield, IL, USA, 62701',
        contactEmail: 'contact@springfieldhs.edu',
        contactPhone: '555-0123',
        headmaster: headmasters[0]._id,
        tradesOffered: [trades[0]._id], // Assign SOD trade
        logo: 'https://example.com/springfield_logo.png',
        isDeleted: false,
      },
      {
        name: 'Riverside Academy',
        address: '456 River Rd, Riverside, CA, USA, 92501',
        contactEmail: 'contact@riversideacademy.edu',
        contactPhone: '555-0456',
        headmaster: headmasters[1]._id,
        tradesOffered: [trades[1]._id], // Assign NIT trade
        logo: 'https://example.com/riverside_logo.png',
        isDeleted: false,
      },
      {
        name: 'Maple Grove Institute',
        address: '789 Oak Ave, Maple Grove, NY, USA, 11375',
        contactEmail: 'contact@maplegrove.edu',
        contactPhone: '555-0789',
        headmaster: headmasters[2]._id,
        tradesOffered: [trades[2]._id], // Assign MMP trade
        logo: 'https://example.com/maplegrove_logo.png',
        isDeleted: false,
      },
    ]);
    console.log('Schools created');

    // Update headmasters with school references
    await Promise.all([
      User.findOneAndUpdate({ _id: headmasters[0]._id }, { school: schools[0]._id }, { new: true }),
      User.findOneAndUpdate({ _id: headmasters[1]._id }, { school: schools[1]._id }, { new: true }),
      User.findOneAndUpdate({ _id: headmasters[2]._id }, { school: schools[2]._id }, { new: true }),
    ]);
    console.log('Headmasters updated with school references');

    // Create System Admin
    const systemAdmin = await createUserWithoutHook({
      fullName: 'System Administrator',
      email: 'admin@example.com',
      passwordHash: 'admin123',
      role: 'admin',
      registrationNumber: 'ADMIN001',
      school: schools[0]._id,
    });
    console.log('System admin created');

    // Create Classes (remove term field or update ClassSchema)
    const classes = await Class.insertMany([
      { level: 'L3', trade: trades[0]._id, year: 2025, school: schools[0]._id, subjects: [], isDeleted: false },
      { level: 'L4', trade: trades[1]._id, year: 2025, school: schools[1]._id, subjects: [], isDeleted: false },
      { level: 'L5', trade: trades[2]._id, year: 2025, school: schools[2]._id, subjects: [], isDeleted: false },
    ]);
    console.log('Classes created');

    // Create Teachers
    const teachersDocs = [
      {
        fullName: 'David Johnson',
        email: 'david@example.com',
        passwordHash: 'teacher123',
        role: 'teacher',
        registrationNumber: 'TCHR001',
        subjects: [],
        school: schools[0]._id,
      },
      {
        fullName: 'Sarah Williams',
        email: 'sarah@example.com',
        passwordHash: 'teacher123',
        role: 'teacher',
        registrationNumber: 'TCHR002',
        subjects: [],
        school: schools[1]._id,
      },
    ];
    const teachers = [];
    for (const teacherDoc of teachersDocs) {
      const teacher = await createUserWithoutHook(teacherDoc);
      teachers.push(teacher);
    }
    console.log('Teachers created');

    // Create Dean
    const dean = await createUserWithoutHook({
      fullName: 'Robert Brown',
      email: 'dean@example.com',
      passwordHash: 'dean123',
      role: 'dean',
      registrationNumber: 'DEAN001',
      school: schools[0]._id,
    });
    console.log('Dean created');

    // Create Subjects
    const subjects = await Subject.insertMany([
      {
        name: 'Introduction to Programming',
        class: [classes[0]._id],
        teacher: teachers[0]._id,
        description: 'Fundamentals of programming concepts',
        credits: 3,
        school: schools[0]._id,
      },
      {
        name: 'Web Development',
        class: [classes[0]._id],
        teacher: teachers[1]._id,
        description: 'HTML, CSS and JavaScript basics',
        credits: 4,
        school: schools[0]._id,
      },
      {
        name: 'Database Management',
        class: [classes[1]._id],
        teacher: teachers[0]._id,
        description: 'SQL and database design principles',
        credits: 3,
        school: schools[1]._id,
      },
      {
        name: 'Advanced Software Development',
        class: [classes[2]._id],
        teacher: teachers[1]._id,
        description: 'Advanced concepts in software engineering',
        credits: 5,
        school: schools[2]._id,
      },
    ]);
    console.log('Subjects created');

    // Update Teachers with Subjects
    await Promise.all([
      User.findOneAndUpdate({ _id: teachers[0]._id }, { subjects: [subjects[0]._id, subjects[2]._id] }, { new: true }),
      User.findOneAndUpdate({ _id: teachers[1]._id }, { subjects: [subjects[1]._id, subjects[3]._id] }, { new: true }),
    ]);
    console.log('Teachers updated with subjects');

    // Create Students
    const collection = mongoose.connection.collection('users');
    const studentsToInsert = [];
    for (let i = 1; i <= 5; i++) {
      studentsToInsert.push({
        fullName: `Student ${i} L3SOD`,
        email: `student${i}l3@example.com`,
        registrationNumber: `L3SOD${String(i).padStart(3, '0')}`,
        passwordHash: bcrypt.hashSync('student123', 10),
        role: 'student',
        class: classes[0]._id,
        school: schools[0]._id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      studentsToInsert.push({
        fullName: `Student ${i} L4NIT`,
        email: `student${i}l4@example.com`,
        registrationNumber: `L4NIT${String(i).padStart(3, '0')}`,
        passwordHash: bcrypt.hashSync('student123', 10),
        role: 'student',
        class: classes[1]._id,
        school: schools[1]._id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      studentsToInsert.push({
        fullName: `Student ${i} L5MMP`,
        email: `student${i}l5@example.com`,
        registrationNumber: `L5MMP${String(i).padStart(3, '0')}`,
        passwordHash: bcrypt.hashSync('student123', 10),
        role: 'student',
        class: classes[2]._id,
        school: schools[2]._id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    await collection.insertMany(studentsToInsert);
    console.log('Students created');
    const createdStudents = await User.find({ role: 'student' });

    // Create Exams
    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const fourMonthsAgo = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const exams = await Exam.insertMany([
      {
        title: 'Programming Assessment 1',
        classes: [classes[0]._id],
        subject: subjects[0]._id,
        teacher: teachers[0]._id,
        type: 'assessment1',
        status: 'completed',
        schedule: { start: sixMonthsAgo, duration: 60 },
        instructions: 'This is Assessment 1 for Introduction to Programming.',
        questions: [
          {
            type: 'multiple-choice',
            text: 'Which of the following is not a programming language?',
            options: [
              { text: 'Java', isCorrect: false },
              { text: 'HTML', isCorrect: true },
              { text: 'Python', isCorrect: false },
              { text: 'C++', isCorrect: false },
            ],
            correctAnswer: 'HTML',
            maxScore: 5,
          },
          {
            type: 'multiple-choice',
            text: 'What is the main function of a compiler?',
            options: [
              { text: 'To execute code', isCorrect: false },
              { text: 'To translate high-level code to machine code', isCorrect: true },
              { text: 'To check for runtime errors', isCorrect: false },
              { text: 'To design user interfaces', isCorrect: false },
            ],
            correctAnswer: 'To translate high-level code to machine code',
            maxScore: 5,
          },
          {
            type: 'short-answer',
            text: 'Explain the concept of variables in programming.',
            maxScore: 10,
          },
        ],
        totalPoints: 20,
        school: schools[0]._id,
      },
      {
        title: 'Web Development Assessment 1',
        classes: [classes[0]._id],
        subject: subjects[1]._id,
        teacher: teachers[1]._id,
        type: 'assessment1',
        status: 'completed',
        schedule: { start: sixMonthsAgo, duration: 60 },
        instructions: 'This is Assessment 1 for Web Development.',
        questions: [
          {
            type: 'multiple-choice',
            text: 'Which tag is used to create a hyperlink in HTML?',
            options: [
              { text: '<link>', isCorrect: false },
              { text: '<a>', isCorrect: true },
              { text: '<href>', isCorrect: false },
              { text: '<url>', isCorrect: false },
            ],
            correctAnswer: '<a>',
            maxScore: 5,
          },
          {
            type: 'multiple-choice',
            text: 'Which property is used to change the background color in CSS?',
            options: [
              { text: 'bgcolor', isCorrect: false },
              { text: 'background-color', isCorrect: true },
              { text: 'color', isCorrect: false },
              { text: 'background', isCorrect: false },
            ],
            correctAnswer: 'background-color',
            maxScore: 5,
          },
          {
            type: 'short-answer',
            text: 'Explain the box model in CSS.',
            maxScore: 10,
          },
        ],
        totalPoints: 20,
        school: schools[0]._id,
      },
      {
        title: 'Programming Assessment 2',
        classes: [classes[0]._id],
        subject: subjects[0]._id,
        teacher: teachers[0]._id,
        type: 'assessment2',
        status: 'completed',
        schedule: { start: fourMonthsAgo, duration: 60 },
        instructions: 'This is Assessment 2 for Introduction to Programming.',
        questions: [
          {
            type: 'multiple-choice',
            text: 'What is the correct syntax for a for loop in JavaScript?',
            options: [
              { text: 'for (i = 0; i <= 5)', isCorrect: false },
              { text: 'for i = 1 to 5', isCorrect: false },
              { text: 'for (i = 0; i <= 5; i++)', isCorrect: true },
              { text: 'for (i <= 5; i++)', isCorrect: false },
            ],
            correctAnswer: 'for (i = 0; i <= 5; i++)',
            maxScore: 5,
          },
          {
            type: 'multiple-choice',
            text: 'What does the break statement do?',
            options: [
              { text: 'Exits a loop or switch statement', isCorrect: true },
              { text: 'Pauses the program execution', isCorrect: false },
              { text: 'Jumps to the next iteration', isCorrect: false },
              { text: 'Terminates the program', isCorrect: false },
            ],
            correctAnswer: 'Exits a loop or switch statement',
            maxScore: 5,
          },
          {
            type: 'short-answer',
            text: 'Write a function to check if a number is prime.',
            maxScore: 10,
          },
        ],
        totalPoints: 20,
        school: schools[0]._id,
      },
      {
        title: 'Web Development Assessment 2',
        classes: [classes[0]._id],
        subject: subjects[1]._id,
        teacher: teachers[1]._id,
        type: 'assessment2',
        status: 'completed',
        schedule: { start: fourMonthsAgo, duration: 60 },
        instructions: 'This is Assessment 2 for Web Development.',
        questions: [
          {
            type: 'multiple-choice',
            text: 'Which method is used to add an element at the end of an array in JavaScript?',
            options: [
              { text: 'push()', isCorrect: true },
              { text: 'append()', isCorrect: false },
              { text: 'add()', isCorrect: false },
              { text: 'insert()', isCorrect: false },
            ],
            correctAnswer: 'push()',
            maxScore: 5,
          },
          {
            type: 'multiple-choice',
            text: 'What does DOM stand for?',
            options: [
              { text: 'Document Object Model', isCorrect: true },
              { text: 'Display Object Management', isCorrect: false },
              { text: 'Digital Ordinance Model', isCorrect: false },
              { text: 'Document Order Model', isCorrect: false },
            ],
            correctAnswer: 'Document Object Model',
            maxScore: 5,
          },
          {
            type: 'short-answer',
            text: 'Explain event bubbling in JavaScript.',
            maxScore: 10,
          },
        ],
        totalPoints: 20,
        school: schools[0]._id,
      },
      {
        title: 'Programming Final Exam',
        classes: [classes[0]._id],
        subject: subjects[0]._id,
        teacher: teachers[0]._id,
        type: 'exam',
        status: 'completed',
        schedule: { start: twoMonthsAgo, duration: 90 },
        instructions: 'This is the final exam for Introduction to Programming.',
        questions: [
          {
            type: 'multiple-choice',
            text: 'Which data structure uses LIFO principle?',
            options: [
              { text: 'Queue', isCorrect: false },
              { text: 'Stack', isCorrect: true },
              { text: 'List', isCorrect: false },
              { text: 'Tree', isCorrect: false },
            ],
            correctAnswer: 'Stack',
            maxScore: 5,
          },
          {
            type: 'multiple-choice',
            text: 'What is recursion in programming?',
            options: [
              { text: 'A loop that never ends', isCorrect: false },
              { text: 'A function that calls itself', isCorrect: true },
              { text: 'A method of sorting data', isCorrect: false },
              { text: 'An error in code', isCorrect: false },
            ],
            correctAnswer: 'A function that calls itself',
            maxScore: 5,
          },
          {
            type: 'short-answer',
            text: 'Write a program to find the factorial of a number using recursion.',
            maxScore: 15,
          },
          {
            type: 'short-answer',
            text: 'Explain the concept of Object-Oriented Programming.',
            maxScore: 15,
          },
        ],
        totalPoints: 40,
        school: schools[0]._id,
      },
      {
        title: 'Web Development Final Exam',
        classes: [classes[0]._id],
        subject: subjects[1]._id,
        teacher: teachers[1]._id,
        type: 'exam',
        status: 'completed',
        schedule: { start: twoMonthsAgo, duration: 90 },
        instructions: 'This is the final exam for Web Development.',
        questions: [
          {
            type: 'multiple-choice',
            text: 'Which of the following is not a JavaScript framework/library?',
            options: [
              { text: 'Angular', isCorrect: false },
              { text: 'React', isCorrect: false },
              { text: 'Vue', isCorrect: false },
              { text: 'Django', isCorrect: true },
            ],
            correctAnswer: 'Django',
            maxScore: 5,
          },
          {
            type: 'multiple-choice',
            text: 'What does API stand for?',
            options: [
              { text: 'Application Programming Interface', isCorrect: true },
              { text: 'Advanced Programming Integration', isCorrect: false },
              { text: 'Application Protocol Interface', isCorrect: false },
              { text: 'Advanced Process Interaction', isCorrect: false },
            ],
            correctAnswer: 'Application Programming Interface',
            maxScore: 5,
          },
          {
            type: 'short-answer',
            text: 'Explain how AJAX works and provide an example.',
            maxScore: 15,
          },
          {
            type: 'short-answer',
            text: 'Describe the differences between server-side and client-side rendering.',
            maxScore: 15,
          },
        ],
        totalPoints: 40,
        school: schools[0]._id,
      },
      {
        title: 'Database Management Assessment 1',
        classes: [classes[1]._id],
        subject: subjects[2]._id,
        teacher: teachers[0]._id,
        type: 'assessment1',
        status: 'completed',
        schedule: { start: sixMonthsAgo, duration: 60 },
        instructions: 'This is Assessment 1 for Database Management.',
        questions: [
          {
            type: 'multiple-choice',
            text: 'Which of the following is not a type of SQL join?',
            options: [
              { text: 'INNER JOIN', isCorrect: false },
              { text: 'OUTER JOIN', isCorrect: false },
              { text: 'FULL JOIN', isCorrect: false },
              { text: 'PARTIAL JOIN', isCorrect: true },
            ],
            correctAnswer: 'PARTIAL JOIN',
            maxScore: 5,
          },
          {
            type: 'multiple-choice',
            text: 'What does SQL stand for?',
            options: [
              { text: 'Structured Query Language', isCorrect: true },
              { text: 'Simple Query Language', isCorrect: false },
              { text: 'Standard Query Language', isCorrect: false },
              { text: 'Sequential Query Language', isCorrect: false },
            ],
            correctAnswer: 'Structured Query Language',
            maxScore: 5,
          },
          {
            type: 'short-answer',
            text: 'Explain the concept of database normalization.',
            maxScore: 10,
          },
        ],
        totalPoints: 20,
        school: schools[1]._id,
      },
      {
        title: 'Advanced Software Assessment 1',
        classes: [classes[2]._id],
        subject: subjects[3]._id,
        teacher: teachers[1]._id,
        type: 'assessment1',
        status: 'completed',
        schedule: { start: sixMonthsAgo, duration: 60 },
        instructions: 'This is Assessment 1 for Advanced Software Development.',
        questions: [
          {
            type: 'multiple-choice',
            text: 'Which design pattern is used to create objects without specifying their concrete classes?',
            options: [
              { text: 'Factory', isCorrect: true },
              { text: 'Singleton', isCorrect: false },
              { text: 'Observer', isCorrect: false },
              { text: 'Decorator', isCorrect: false },
            ],
            correctAnswer: 'Factory',
            maxScore: 5,
          },
          {
            type: 'multiple-choice',
            text: 'What is a microservice architecture?',
            options: [
              { text: 'A single monolithic application', isCorrect: false },
              { text: 'A collection of small, independent services', isCorrect: true },
              { text: 'A database structure', isCorrect: false },
              { text: 'A UI framework', isCorrect: false },
            ],
            correctAnswer: 'A collection of small, independent services',
            maxScore: 5,
          },
          {
            type: 'short-answer',
            text: 'Explain the SOLID principles in software design.',
            maxScore: 10,
          },
        ],
        totalPoints: 20,
        school: schools[2]._id,
      },
    ]);
    console.log('Exams created');

    // Create Submissions
    for (const exam of exams) {
      for (const student of createdStudents) {
        if (exam.classes.includes(student.class)) {
          const answers = exam.questions.map((q) => ({
            questionId: q._id,
            answer: q.type === 'multiple-choice' ? q.correctAnswer : 'Sample answer',
            score: q.maxScore,
            graded: true,
          }));
          await Submission.create({
            exam: exam._id,
            student: student._id,
            answers,
            totalScore: answers.reduce((sum, a) => sum + a.score, 0),
            startedAt: new Date(exam.schedule.start),
            submittedAt: new Date(exam.schedule.start.getTime() + 30 * 60 * 1000),
            status: 'graded',
            violations: 0,
            score: answers.reduce((sum, a) => sum + a.score, 0),
            totalPoints: exam.totalPoints,
            school: exam.school,
          });
        }
      }
    }
    console.log('Submissions created for all students and all exams');

    // Update Exam Total Points
    for (const exam of exams) {
      const totalPoints = exam.questions.reduce((total, q) => total + (q.maxScore || 0), 0);
      await Exam.findOneAndUpdate({ _id: exam._id }, { totalPoints }, { new: true });
    }
    console.log('Exam totalPoints updated');

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};

const runSeeder = async () => {
  try {
    await connectDB();
    await seedDatabase();
    console.log('Seeding complete. Disconnecting...');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

runSeeder();