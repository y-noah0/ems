const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const Class = require('./models/Class');
const User = require('./models/User');
const Subject = require('./models/Subject');
const Exam = require('./models/Exam');
const Submission = require('./models/Submission');

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/school-exam-system", {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected for seeding...');
  } catch (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  }
};

const seedDatabase = async () => {
  try {
    await Class.deleteMany({});
    await User.deleteMany({});
    await Subject.deleteMany({});
    await Exam.deleteMany({});
    await Submission.deleteMany({});
    console.log('Previous data cleared');

    // Create system admin
    const systemAdmin = await User.create({
      fullName: 'System Administrator',
      email: 'admin@example.com',
      passwordHash: 'admin123',
      role: 'admin',
      registrationNumber: 'ADMIN001'
    });
    console.log('System admin created');

    const classes = await Class.insertMany([
      { level: 'L3', trade: 'SOD', year: 2025, term: 1 },
      { level: 'L4', trade: 'NIT', year: 2025, term: 1 },
      { level: 'L5', trade: 'MMP', year: 2025, term: 2 }
    ]);
    console.log('Classes created');

    const teachersDocs = [
      {
        fullName: 'David Johnson',
        email: 'david@example.com',
        passwordHash: 'teacher123',
        role: 'teacher',
        registrationNumber: 'TCHR001',
        subjects: []
      },
      {
        fullName: 'Sarah Williams',
        email: 'sarah@example.com',
        passwordHash: 'teacher123',
        role: 'teacher',
        registrationNumber: 'TCHR002',
        subjects: []
      }
    ];
    const teachers = [];
    for (const teacherDoc of teachersDocs) {
      const teacher = await User.create(teacherDoc);
      teachers.push(teacher);
    }
    console.log('Teachers created');

    const dean = await User.create({
      fullName: 'Robert Brown',
      email: 'dean@example.com',
      passwordHash: 'dean123',
      role: 'dean',
      registrationNumber: 'DEAN001'
    });
    console.log('Dean created');

    const subjects = await Subject.insertMany([
      {
        name: 'Introduction to Programming',
        class: [classes[0]._id],
        teacher: teachers[0]._id,
        description: 'Fundamentals of programming concepts',
        credits: 3
      },
      {
        name: 'Web Development',
        class: [classes[0]._id],
        teacher: teachers[1]._id,
        description: 'HTML, CSS and JavaScript basics',
        credits: 4
      },
      {
        name: 'Database Management',
        class: [classes[1]._id],
        teacher: teachers[0]._id,
        description: 'SQL and database design principles',
        credits: 3
      },
      {
        name: 'Advanced Software Development',
        class: [classes[2]._id],
        teacher: teachers[1]._id,
        description: 'Advanced concepts in software engineering',
        credits: 5
      }
    ]);
    console.log('Subjects created');

    await User.findByIdAndUpdate(teachers[0]._id, {
      subjects: [subjects[0]._id, subjects[2]._id]
    });
    await User.findByIdAndUpdate(teachers[1]._id, {
      subjects: [subjects[1]._id, subjects[3]._id]
    });
    console.log('Teachers updated with subjects');

    // Create students using User.create to use the pre-save hook
    const studentsToCreate = [];
    for (let i = 1; i <= 5; i++) {
      studentsToCreate.push({
        fullName: `Student ${i} L3SOD`,
        email: `student${i}l3@example.com`,
        registrationNumber: `L3SOD${String(i).padStart(3, '0')}`,
        passwordHash: 'student123',
        role: 'student',
        class: classes[0]._id
      });
    }
    for (let i = 1; i <= 5; i++) {
      studentsToCreate.push({
        fullName: `Student ${i} L4NIT`,
        email: `student${i}l4@example.com`,
        registrationNumber: `L4NIT${String(i).padStart(3, '0')}`,
        passwordHash: 'student123',
        role: 'student',
        class: classes[1]._id
      });
    }
    for (let i = 1; i <= 5; i++) {
      studentsToCreate.push({
        fullName: `Student ${i} L5MMP`,
        email: `student${i}l5@example.com`,
        registrationNumber: `L5MMP${String(i).padStart(3, '0')}`,
        passwordHash: 'student123',
        role: 'student',
        class: classes[2]._id
      });
    }
    
    // Create students one by one to ensure pre-save hooks work
    const createdStudents = [];
    for (const studentData of studentsToCreate) {
      const student = await User.create(studentData);
      createdStudents.push(student);
    }
    console.log('Students created');

    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const fourMonthsAgo = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const exams = await Exam.insertMany([
      // Assessment 1 exams
      {
        title: 'Programming Assessment 1',
        classes: [classes[0]._id],
        subject: subjects[0]._id,
        teacher: teachers[0]._id,
        type: 'assessment1',
        status: 'completed',
        schedule: {
          start: sixMonthsAgo,
          duration: 60
        },
        instructions: 'This is Assessment 1 for Introduction to Programming.',
        questions: [
          {
            type: 'multiple-choice',
            text: 'Which of the following is not a programming language?',
            options: [
              { text: 'Java', isCorrect: false },
              { text: 'HTML', isCorrect: true },
              { text: 'Python', isCorrect: false },
              { text: 'C++', isCorrect: false }
            ],
            correctAnswer: 'HTML',
            maxScore: 5
          },
          {
            type: 'multiple-choice',
            text: 'What is the main function of a compiler?',
            options: [
              { text: 'To execute code', isCorrect: false },
              { text: 'To translate high-level code to machine code', isCorrect: true },
              { text: 'To check for runtime errors', isCorrect: false },
              { text: 'To design user interfaces', isCorrect: false }
            ],
            correctAnswer: 'To translate high-level code to machine code',
            maxScore: 5
          },
          {
            type: 'short-answer',
            text: 'Explain the concept of variables in programming.',
            maxScore: 10
          }
        ],
        totalPoints: 20
      },
      {
        title: 'Web Development Assessment 1',
        classes: [classes[0]._id],
        subject: subjects[1]._id,
        teacher: teachers[1]._id,
        type: 'assessment1',
        status: 'completed',
        schedule: {
          start: sixMonthsAgo,
          duration: 60
        },
        instructions: 'This is Assessment 1 for Web Development.',
        questions: [
          {
            type: 'multiple-choice',
            text: 'Which tag is used to create a hyperlink in HTML?',
            options: [
              { text: '<link>', isCorrect: false },
              { text: '<a>', isCorrect: true },
              { text: '<href>', isCorrect: false },
              { text: '<url>', isCorrect: false }
            ],
            correctAnswer: '<a>',
            maxScore: 5
          },
          {
            type: 'multiple-choice',
            text: 'Which property is used to change the background color in CSS?',
            options: [
              { text: 'bgcolor', isCorrect: false },
              { text: 'background-color', isCorrect: true },
              { text: 'color', isCorrect: false },
              { text: 'background', isCorrect: false }
            ],
            correctAnswer: 'background-color',
            maxScore: 5
          },
          {
            type: 'short-answer',
            text: 'Explain the box model in CSS.',
            maxScore: 10
          }
        ],
        totalPoints: 20
      },
      // Assessment 2 exams
      {
        title: 'Programming Assessment 2',
        classes: [classes[0]._id],
        subject: subjects[0]._id,
        teacher: teachers[0]._id,
        type: 'assessment2',
        status: 'completed',
        schedule: {
          start: fourMonthsAgo,
          duration: 60
        },
        instructions: 'This is Assessment 2 for Introduction to Programming.',
        questions: [
          {
            type: 'multiple-choice',
            text: 'What is the correct syntax for a for loop in JavaScript?',
            options: [
              { text: 'for (i = 0; i <= 5)', isCorrect: false },
              { text: 'for i = 1 to 5', isCorrect: false },
              { text: 'for (i = 0; i <= 5; i++)', isCorrect: true },
              { text: 'for (i <= 5; i++)', isCorrect: false }
            ],
            correctAnswer: 'for (i = 0; i <= 5; i++)',
            maxScore: 5
          },
          {
            type: 'multiple-choice',
            text: 'What does the break statement do?',
            options: [
              { text: 'Exits a loop or switch statement', isCorrect: true },
              { text: 'Pauses the program execution', isCorrect: false },
              { text: 'Jumps to the next iteration', isCorrect: false },
              { text: 'Terminates the program', isCorrect: false }
            ],
            correctAnswer: 'Exits a loop or switch statement',
            maxScore: 5
          },
          {
            type: 'short-answer',
            text: 'Write a function to check if a number is prime.',
            maxScore: 10
          }
        ],
        totalPoints: 20
      },
      {
        title: 'Web Development Assessment 2',
        classes: [classes[0]._id],
        subject: subjects[1]._id,
        teacher: teachers[1]._id,
        type: 'assessment2',
        status: 'completed',
        schedule: {
          start: fourMonthsAgo,
          duration: 60
        },
        instructions: 'This is Assessment 2 for Web Development.',
        questions: [
          {
            type: 'multiple-choice',
            text: 'Which method is used to add an element at the end of an array in JavaScript?',
            options: [
              { text: 'push()', isCorrect: true },
              { text: 'append()', isCorrect: false },
              { text: 'add()', isCorrect: false },
              { text: 'insert()', isCorrect: false }
            ],
            correctAnswer: 'push()',
            maxScore: 5
          },
          {
            type: 'multiple-choice',
            text: 'What does DOM stand for?',
            options: [
              { text: 'Document Object Model', isCorrect: true },
              { text: 'Display Object Management', isCorrect: false },
              { text: 'Digital Ordinance Model', isCorrect: false },
              { text: 'Document Order Model', isCorrect: false }
            ],
            correctAnswer: 'Document Object Model',
            maxScore: 5
          },
          {
            type: 'short-answer',
            text: 'Explain event bubbling in JavaScript.',
            maxScore: 10
          }
        ],
        totalPoints: 20
      },
      // Final Exams
      {
        title: 'Programming Final Exam',
        classes: [classes[0]._id],
        subject: subjects[0]._id,
        teacher: teachers[0]._id,
        type: 'exam',
        status: 'completed',
        schedule: {
          start: twoMonthsAgo,
          duration: 90
        },
        instructions: 'This is the final exam for Introduction to Programming.',
        questions: [
          {
            type: 'multiple-choice',
            text: 'Which data structure uses LIFO principle?',
            options: [
              { text: 'Queue', isCorrect: false },
              { text: 'Stack', isCorrect: true },
              { text: 'List', isCorrect: false },
              { text: 'Tree', isCorrect: false }
            ],
            correctAnswer: 'Stack',
            maxScore: 5
          },
          {
            type: 'multiple-choice',
            text: 'What is recursion in programming?',
            options: [
              { text: 'A loop that never ends', isCorrect: false },
              { text: 'A function that calls itself', isCorrect: true },
              { text: 'A method of sorting data', isCorrect: false },
              { text: 'An error in code', isCorrect: false }
            ],
            correctAnswer: 'A function that calls itself',
            maxScore: 5
          },
          {
            type: 'short-answer',
            text: 'Write a program to find the factorial of a number using recursion.',
            maxScore: 15
          },
          {
            type: 'short-answer',
            text: 'Explain the concept of Object-Oriented Programming.',
            maxScore: 15
          }
        ],
        totalPoints: 40
      },
      {
        title: 'Web Development Final Exam',
        classes: [classes[0]._id],
        subject: subjects[1]._id,
        teacher: teachers[1]._id,
        type: 'exam',
        status: 'completed',
        schedule: {
          start: twoMonthsAgo,
          duration: 90
        },
        instructions: 'This is the final exam for Web Development.',
        questions: [
          {
            type: 'multiple-choice',
            text: 'Which of the following is not a JavaScript framework/library?',
            options: [
              { text: 'Angular', isCorrect: false },
              { text: 'React', isCorrect: false },
              { text: 'Vue', isCorrect: false },
              { text: 'Django', isCorrect: true }
            ],
            correctAnswer: 'Django',
            maxScore: 5
          },
          {
            type: 'multiple-choice',
            text: 'What does API stand for?',
            options: [
              { text: 'Application Programming Interface', isCorrect: true },
              { text: 'Advanced Programming Integration', isCorrect: false },
              { text: 'Application Protocol Interface', isCorrect: false },
              { text: 'Advanced Process Interaction', isCorrect: false }
            ],
            correctAnswer: 'Application Programming Interface',
            maxScore: 5
          },
          {
            type: 'short-answer',
            text: 'Explain how AJAX works and provide an example.',
            maxScore: 15
          },
          {
            type: 'short-answer',
            text: 'Describe the differences between server-side and client-side rendering.',
            maxScore: 15
          }
        ],
        totalPoints: 40
      },
      // Additional exams for other classes
      {
        title: 'Database Management Assessment 1',
        classes: [classes[1]._id],
        subject: subjects[2]._id,
        teacher: teachers[0]._id,
        type: 'assessment1',
        status: 'completed',
        schedule: {
          start: sixMonthsAgo,
          duration: 60
        },
        instructions: 'This is Assessment 1 for Database Management.',
        questions: [
          {
            type: 'multiple-choice',
            text: 'Which of the following is not a type of SQL join?',
            options: [
              { text: 'INNER JOIN', isCorrect: false },
              { text: 'OUTER JOIN', isCorrect: false },
              { text: 'FULL JOIN', isCorrect: false },
              { text: 'PARTIAL JOIN', isCorrect: true }
            ],
            correctAnswer: 'PARTIAL JOIN',
            maxScore: 5
          },
          {
            type: 'multiple-choice',
            text: 'What does SQL stand for?',
            options: [
              { text: 'Structured Query Language', isCorrect: true },
              { text: 'Simple Query Language', isCorrect: false },
              { text: 'Standard Query Language', isCorrect: false },
              { text: 'Sequential Query Language', isCorrect: false }
            ],
            correctAnswer: 'Structured Query Language',
            maxScore: 5
          },
          {
            type: 'short-answer',
            text: 'Explain the concept of database normalization.',
            maxScore: 10
          }
        ],
        totalPoints: 20
      },
      {
        title: 'Advanced Software Assessment 1',
        classes: [classes[2]._id],
        subject: subjects[3]._id,
        teacher: teachers[1]._id,
        type: 'assessment1',
        status: 'completed',
        schedule: {
          start: sixMonthsAgo,
          duration: 60
        },
        instructions: 'This is Assessment 1 for Advanced Software Development.',
        questions: [
          {
            type: 'multiple-choice',
            text: 'Which design pattern is used to create objects without specifying their concrete classes?',
            options: [
              { text: 'Factory', isCorrect: true },
              { text: 'Singleton', isCorrect: false },
              { text: 'Observer', isCorrect: false },
              { text: 'Decorator', isCorrect: false }
            ],
            correctAnswer: 'Factory',
            maxScore: 5
          },
          {
            type: 'multiple-choice',
            text: 'What is a microservice architecture?',
            options: [
              { text: 'A single monolithic application', isCorrect: false },
              { text: 'A collection of small, independent services', isCorrect: true },
              { text: 'A database structure', isCorrect: false },
              { text: 'A UI framework', isCorrect: false }
            ],
            correctAnswer: 'A collection of small, independent services',
            maxScore: 5
          },
          {
            type: 'short-answer',
            text: 'Explain the SOLID principles in software design.',
            maxScore: 10
          }
        ],
        totalPoints: 20
      }
    ]);
    console.log('Exams created');

    // Generate one submission per student for every exam
    for (const exam of exams) {
      for (const student of createdStudents) {
        const answers = exam.questions.map(q => ({
          questionId: q._id,
          answer: q.type === 'multiple-choice' ? q.correctAnswer : 'Sample answer',
          score: q.maxScore,
          graded: true
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
          totalPoints: exam.totalPoints
        });
      }
    }
    console.log('Submissions created for all students and all exams');

    for (const exam of exams) {
      const totalPoints = exam.questions.reduce((total, q) => total + (q.maxScore || 0), 0);
      await Exam.findByIdAndUpdate(exam._id, { totalPoints });
    }
    console.log('Exam totalPoints updated');

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

const runSeeder = async () => {
  await connectDB();
  await seedDatabase();
  console.log('Seeding complete. Disconnecting...');
  await mongoose.disconnect();
  process.exit(0);
};

runSeeder();