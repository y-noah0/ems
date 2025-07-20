const mongoose = require('mongoose');
const bcrypt  = require('bcrypt')
const dotenv = require('dotenv');
const Class = require('./models/Class');
const User = require('./models/User');
const Subject = require('./models/Subject');
const Exam = require('./models/Exam');
const Submission = require('./models/Submission');
const School = require('./models/School');
const Trade = require('./models/Trade');
const Term = require('./models/Term');

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/school-exam-system", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false, // Add this line
      useCreateIndex: true     // Add this line for index warning
    });
    console.log('MongoDB connected for seeding...');
  } catch (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  }
};

const createUserWithoutHook = async (userData) => {
  const collection = mongoose.connection.collection('users');
  // Accept either password or passwordHash field
  const rawPassword = userData.password || userData.passwordHash;
  const userWithHashedPassword = {
    ...userData,
    passwordHash: bcrypt.hashSync(rawPassword, 10),
    emailVerified: userData.email ? true : false, // Set emailVerified to true if user has email
    createdAt: new Date(),
    updatedAt: new Date()
  };
  const result = await collection.insertOne(userWithHashedPassword);
  return User.findById(result.insertedId);
};

const seedDatabase = async () => {
  try {
    // Clear existing data
    await Class.deleteMany({});
    await User.deleteMany({});
    await Subject.deleteMany({});
    await Exam.deleteMany({});
    await Submission.deleteMany({});
    await School.deleteMany({});
    await Trade.deleteMany({});
    await Term.deleteMany({});
    console.log('Previous data cleared');

    // Create trades first
    const trades = await Trade.insertMany([
      { code: 'SOD', name: 'Software Development', description: 'Learn programming and software development' },
      { code: 'NIT', name: 'Network Infrastructure Technology', description: 'Computer networking and infrastructure' },
      { code: 'MMP', name: 'Multimedia Production', description: 'Digital media and multimedia content creation' },
      { code: 'ELT', name: 'Electronics Technology', description: 'Electronics and electrical systems' },
      { code: 'AUT', name: 'Automotive Technology', description: 'Vehicle maintenance and repair' }
    ]);
    console.log('Trades created');

    // Create schools
    const schools = await School.insertMany([
      {
        name: 'Botswana Technical College',
        address: '123 Technical Street, Gaborone, Botswana',
        contactEmail: 'info@btc.ac.bw',
        contactPhone: '+26771234567',
        headmaster: new mongoose.Types.ObjectId(), // Temporary, will update later
        tradesOffered: trades.map(trade => trade._id)
      },
      {
        name: 'Francistown Technical College',
        address: '456 Education Avenue, Francistown, Botswana',
        contactEmail: 'info@ftc.ac.bw',
        contactPhone: '+26771234568',
        headmaster: new mongoose.Types.ObjectId(), // Temporary, will update later
        tradesOffered: [trades[0]._id, trades[1]._id, trades[3]._id]
      }
    ]);
    console.log('Schools created');

    // Create headmasters and update schools
    const headmaster1 = await createUserWithoutHook({
      fullName: 'Dr. John Mogotsi',
      email: 'headmaster@btc.ac.bw',
      passwordHash: 'headmaster123',
      role: 'headmaster',
      school: schools[0]._id,
      phoneNumber: '+26771234567'
    });

    const headmaster2 = await createUserWithoutHook({
      fullName: 'Prof. Mary Kebonang',
      email: 'headmaster@ftc.ac.bw',
      passwordHash: 'headmaster123',
      role: 'headmaster',
      school: schools[1]._id,
      phoneNumber: '+26771234568'
    });

    // Update schools with actual headmaster IDs
    await School.findByIdAndUpdate(schools[0]._id, { headmaster: headmaster1._id });
    await School.findByIdAndUpdate(schools[1]._id, { headmaster: headmaster2._id });
    console.log('Headmasters created and assigned');

    // Create system admin
    const systemAdmin = await createUserWithoutHook({
      fullName: 'System Administrator',
      email: 'admin@example.com',
      passwordHash: 'admin123',
      role: 'admin',
      school: schools[0]._id,
      phoneNumber: '+26771234569'
    });
    console.log('System admin created');

    // Create deans
    const dean1 = await createUserWithoutHook({
      fullName: 'Robert Brown',
      email: 'dean@btc.ac.bw',
      password: 'dean123',
      role: 'dean',
      school: schools[0]._id,
      phoneNumber: '+26771234570'
    });

    const dean2 = await createUserWithoutHook({
      fullName: 'Sarah Mothibi',
      email: 'dean@ftc.ac.bw',
      password: 'dean123',
      role: 'dean',
      school: schools[1]._id,
      phoneNumber: '+26771234571'
    });
    console.log('Deans created');

    // Create terms
    const terms = await Term.insertMany([
      {
        termNumber: 1,
        academicYear: 2025,
        school: schools[0]._id,
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-04-15')
      },
      {
        termNumber: 2,
        academicYear: 2025,
        school: schools[0]._id,
        startDate: new Date('2025-05-01'),
        endDate: new Date('2025-08-01')
      },
      {
        termNumber: 3,
        academicYear: 2025,
        school: schools[0]._id,
        startDate: new Date('2025-08-15'),
        endDate: new Date('2025-11-15')
      },
      {
        termNumber: 1,
        academicYear: 2025,
        school: schools[1]._id,
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-04-15')
      },
      {
        termNumber: 2,
        academicYear: 2025,
        school: schools[1]._id,
        startDate: new Date('2025-05-01'),
        endDate: new Date('2025-08-01')
      }
    ]);
    console.log('Terms created');

    // Create classes
    const classes = await Class.insertMany([
      { level: 'L3', trade: trades[0]._id, year: 2025, school: schools[0]._id }, // L3 SOD
      { level: 'L4', trade: trades[1]._id, year: 2025, school: schools[0]._id }, // L4 NIT
      { level: 'L5', trade: trades[2]._id, year: 2025, school: schools[0]._id }, // L5 MMP
      { level: 'L3', trade: trades[0]._id, year: 2025, school: schools[1]._id }, // L3 SOD (Francistown)
      { level: 'L4', trade: trades[3]._id, year: 2025, school: schools[1]._id }  // L4 ELT (Francistown)
    ]);
    console.log('Classes created');

    // Create teachers
    const teachersDocs = [
      {
        fullName: 'David Johnson',
        email: 'david@btc.ac.bw',
        passwordHash: 'teacher123',
        role: 'teacher',
        school: schools[0]._id,
        phoneNumber: '+26771234572',
        subjects: []
      },
      {
        fullName: 'Sarah Williams',
        email: 'sarah@btc.ac.bw',
        passwordHash: 'teacher123',
        role: 'teacher',
        school: schools[0]._id,
        phoneNumber: '+26771234573',
        subjects: []
      },
      {
        fullName: 'Michael Setlhako',
        email: 'michael@btc.ac.bw',
        passwordHash: 'teacher123',
        role: 'teacher',
        school: schools[0]._id,
        phoneNumber: '+26771234574',
        subjects: []
      },
      {
        fullName: 'Grace Mmolawa',
        email: 'grace@ftc.ac.bw',
        passwordHash: 'teacher123',
        role: 'teacher',
        school: schools[1]._id,
        phoneNumber: '+26771234575',
        subjects: []
      }
    ];

    const teachers = [];
    for (const teacherDoc of teachersDocs) {
      const teacher = await createUserWithoutHook(teacherDoc);
      teachers.push(teacher);
    }
    console.log('Teachers created');

    // Create subjects
    const subjects = await Subject.insertMany([
      {
        name: 'Introduction to Programming',
        description: 'Fundamentals of programming concepts',
        school: schools[0]._id,
        classes: [classes[0]._id],
        trades: [trades[0]._id],
        teacher: teachers[0]._id,
        credits: 3
      },
      {
        name: 'Web Development',
        description: 'HTML, CSS and JavaScript basics',
        school: schools[0]._id,
        classes: [classes[0]._id],
        trades: [trades[0]._id],
        teacher: teachers[1]._id,
        credits: 4
      },
      {
        name: 'Database Management',
        description: 'SQL and database design principles',
        school: schools[0]._id,
        classes: [classes[1]._id],
        trades: [trades[1]._id],
        teacher: teachers[0]._id,
        credits: 3
      },
      {
        name: 'Advanced Software Development',
        description: 'Advanced concepts in software engineering',
        school: schools[0]._id,
        classes: [classes[2]._id],
        trades: [trades[2]._id],
        teacher: teachers[2]._id,
        credits: 5
      },
      {
        name: 'Network Security',
        description: 'Cybersecurity and network protection',
        school: schools[0]._id,
        classes: [classes[1]._id],
        trades: [trades[1]._id],
        teacher: teachers[1]._id,
        credits: 4
      },
      {
        name: 'Programming Fundamentals',
        description: 'Basic programming concepts',
        school: schools[1]._id,
        classes: [classes[3]._id],
        trades: [trades[0]._id],
        teacher: teachers[3]._id,
        credits: 3
      }
    ]);
  console.log('Subjects created for first school');
  // Also seed core subjects for second school (FTC)
  const ftcSubjects = await Subject.insertMany([
    {
      name: 'Introduction to Programming (FTC)',
      description: 'Fundamentals of programming concepts',
      school: schools[1]._id,
      classes: [classes[3]._id],
      trades: [trades[0]._id],
      teacher: teachers[3]._id,
      credits: 3
    },
    {
      name: 'Web Development (FTC)',
      description: 'HTML, CSS and JavaScript basics',
      school: schools[1]._id,
      classes: [classes[3]._id],
      trades: [trades[0]._id],
      teacher: teachers[3]._id,
      credits: 4
    },
    {
      name: 'Database Management (FTC)',
      description: 'SQL and database design principles',
      school: schools[1]._id,
      classes: [classes[4]._id],
      trades: [trades[1]._id],
      teacher: teachers[3]._id,
      credits: 3
    },
    {
      name: 'Network Security (FTC)',
      description: 'Cybersecurity and network protection',
      school: schools[1]._id,
      classes: [classes[4]._id],
      trades: [trades[1]._id],
      teacher: teachers[3]._id,
      credits: 4
    }
  ]);
  console.log('Additional FTC subjects created');
  // Update second-school teacher with FTC subjects
  await User.findByIdAndUpdate(teachers[3]._id, { subjects: ftcSubjects.map(s => s._id) });
    console.log('Subjects created');

    // Update teachers with their subjects
    await User.findByIdAndUpdate(teachers[0]._id, {
      subjects: [subjects[0]._id, subjects[2]._id]
    });
    await User.findByIdAndUpdate(teachers[1]._id, {
      subjects: [subjects[1]._id, subjects[4]._id]
    });
    await User.findByIdAndUpdate(teachers[2]._id, {
      subjects: [subjects[3]._id]
    });
    await User.findByIdAndUpdate(teachers[3]._id, {
      subjects: [subjects[5]._id]
    });
    console.log('Teachers updated with subjects');

    // Create students
    const collection = mongoose.connection.collection('users');
    const studentsToInsert = [];

    // Students for BTC L3 SOD
    for (let i = 1; i <= 8; i++) {
      studentsToInsert.push({
        fullName: `Student ${i} L3SOD`,
        registrationNumber: `L3SOD${String(i).padStart(3, '0')}`,
        passwordHash: bcrypt.hashSync('student123', 10),
        role: 'student',
        school: schools[0]._id,
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: false,
        tokenVersion: 0
      });
    }

    // Students for BTC L4 NIT
    for (let i = 1; i <= 6; i++) {
      studentsToInsert.push({
        fullName: `Student ${i} L4NIT`,
        registrationNumber: `L4NIT${String(i).padStart(3, '0')}`,
        passwordHash: bcrypt.hashSync('student123', 10),
        role: 'student',
        school: schools[0]._id,
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: false,
        tokenVersion: 0
      });
    }

    // Students for BTC L5 MMP
    for (let i = 1; i <= 5; i++) {
      studentsToInsert.push({
        fullName: `Student ${i} L5MMP`,
        registrationNumber: `L5MMP${String(i).padStart(3, '0')}`,
        passwordHash: bcrypt.hashSync('student123', 10),
        role: 'student',
        school: schools[0]._id,
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: false,
        tokenVersion: 0
      });
    }

    // Students for FTC L3 SOD
    for (let i = 1; i <= 6; i++) {
      studentsToInsert.push({
        fullName: `FTC Student ${i} L3SOD`,
        registrationNumber: `FTC-L3SOD${String(i).padStart(3, '0')}`,
        passwordHash: bcrypt.hashSync('student123', 10),
        role: 'student',
        school: schools[1]._id,
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: false,
        tokenVersion: 0
      });
    }

    // Students for FTC L4 ELT
    for (let i = 1; i <= 7; i++) {
      studentsToInsert.push({
        fullName: `FTC Student ${i} L4ELT`,
        registrationNumber: `FTC-L4ELT${String(i).padStart(3, '0')}`,
        passwordHash: bcrypt.hashSync('student123', 10),
        role: 'student',
        school: schools[1]._id,
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: false,
        tokenVersion: 0
      });
    }

    await collection.insertMany(studentsToInsert);
    console.log('Students created');

    console.log('\n=== SEEDING COMPLETED SUCCESSFULLY ===');
    console.log('\nLogin Credentials:');
    console.log('System Admin: admin@example.com / admin123');
    console.log('Headmaster (BTC): headmaster@btc.ac.bw / headmaster123');
    console.log('Headmaster (FTC): headmaster@ftc.ac.bw / headmaster123');
    console.log('Dean (BTC): dean@btc.ac.bw / dean123');
    console.log('Dean (FTC): dean@ftc.ac.bw / dean123');
    console.log('Teachers: david@btc.ac.bw, sarah@btc.ac.bw, michael@btc.ac.bw, grace@ftc.ac.bw / teacher123');
    console.log('Students: Use registration numbers (e.g., L3SOD001, L4NIT001, etc.) / student123');
    console.log('\nSchools created:');
    console.log('- Botswana Technical College (BTC)');
    console.log('- Francistown Technical College (FTC)');
    console.log('\nTrades created: SOD, NIT, MMP, ELT, AUT');
    console.log(`Total students created: ${studentsToInsert.length}`);

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
