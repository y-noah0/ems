const Class = require('../models/Class');
const Subject = require('../models/Subject');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const csv = require('csv-parser');
const fs = require('fs');

const adminController = {};

// Get all classes
adminController.getAllClasses = async (req, res) => {
  try {
    const classes = await Class.find().sort({ year: -1, term: 1, level: 1, trade: 1 });
    res.json({
      success: true,
      classes
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Create a new class
adminController.createClass = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { level, trade, year, term } = req.body;

    // Check if class already exists
    const classExists = await Class.findOne({ level, trade, year, term });
    if (classExists) {
      return res.status(400).json({
        success: false,
        message: 'Class already exists'
      });
    }

    // Create new class
    const newClass = new Class({
      level,
      trade,
      year,
      term
    });

    await newClass.save();

    res.status(201).json({
      success: true,
      class: newClass
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Update class
adminController.updateClass = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { level, trade, year, term } = req.body;
    const classId = req.params.id;

    // Check if class exists
    let classToUpdate = await Class.findById(classId);
    if (!classToUpdate) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Check if updated class would conflict with existing one
    if (level !== classToUpdate.level || trade !== classToUpdate.trade || 
        year !== classToUpdate.year || term !== classToUpdate.term) {
      const classExists = await Class.findOne({ level, trade, year, term });
      if (classExists) {
        return res.status(400).json({
          success: false,
          message: 'Another class with these details already exists'
        });
      }
    }

    // Update class
    classToUpdate.level = level;
    classToUpdate.trade = trade;
    classToUpdate.year = year;
    classToUpdate.term = term;

    await classToUpdate.save();

    res.json({
      success: true,
      class: classToUpdate
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Delete class
adminController.deleteClass = async (req, res) => {
  try {
    const classId = req.params.id;

    // Check if class exists
    const classToDelete = await Class.findById(classId);
    if (!classToDelete) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Check if there are students in this class
    const studentsInClass = await User.countDocuments({ class: classId });
    if (studentsInClass > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete class: ${studentsInClass} student(s) are enrolled`
      });
    }

    // Check if there are subjects for this class
    const subjectsInClass = await Subject.countDocuments({ class: classId });
    if (subjectsInClass > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete class: ${subjectsInClass} subject(s) are assigned`
      });
    }

    // Delete class
    await classToDelete.remove();

    res.json({
      success: true,
      message: 'Class deleted successfully'
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Get all subjects for a class
adminController.getSubjectsByClass = async (req, res) => {
  try {
    const classId = req.params.classId;

    // Check if class exists
    const classExists = await Class.findById(classId);
    if (!classExists) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Get subjects
    const subjects = await Subject.find({ class: classId })
      .populate('teacher', 'fullName email')
      .sort({ name: 1 });

    res.json({
      success: true,
      subjects
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Create subject for a class
adminController.createSubject = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, classId, teacherId, description, credits } = req.body;

    // Check if class exists
    const classExists = await Class.findById(classId);
    if (!classExists) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Check if subject already exists for class
    const subjectExists = await Subject.findOne({ name, class: classId });
    if (subjectExists) {
      return res.status(400).json({
        success: false,
        message: 'Subject already exists for this class'
      });
    }

    // Check if teacher exists
    if (teacherId) {
      const teacher = await User.findById(teacherId);
      if (!teacher || teacher.role !== 'teacher') {
        return res.status(404).json({
          success: false,
          message: 'Teacher not found'
        });
      }
    }

    // Create new subject
    const newSubject = new Subject({
      name,
      class: classId,
      teacher: teacherId,
      description,
      credits
    });

    await newSubject.save();

    // Update teacher's subjects if teacher is assigned
    if (teacherId) {
      await User.findByIdAndUpdate(
        teacherId,
        { $addToSet: { subjects: newSubject._id } }
      );
    }

    res.status(201).json({
      success: true,
      subject: newSubject
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Assign teacher to subject
adminController.assignTeacherToSubject = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }    const { teacherId } = req.body;
    const subjectId = req.params.id;

    // Check if subject exists
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    // If teacherId is empty, remove teacher assignment
    if (!teacherId) {
      // If subject has a teacher assigned, remove this subject from teacher's subjects array
      if (subject.teacher) {
        const previousTeacher = await User.findById(subject.teacher);
        if (previousTeacher) {
          // Remove this subject from the teacher's subjects array
          previousTeacher.subjects = previousTeacher.subjects.filter(
            subj => subj.toString() !== subjectId
          );
          await previousTeacher.save();
        }
      }
      
      // Remove teacher from subject
      subject.teacher = undefined;
      await subject.save();
      
      return res.json({
        success: true,
        message: 'Teacher removed from subject successfully',
        subject
      });
    }

    // Check if teacher exists for assignment
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Update subject with teacher
    subject.teacher = teacherId;
    await subject.save();

    // Add subject to teacher's subjects array if not already there
    if (!teacher.subjects.includes(subjectId)) {
      teacher.subjects.push(subjectId);
      await teacher.save();
    }

    res.json({
      success: true,
      message: 'Teacher assigned to subject successfully',
      subject
    });
  } catch (error) {
    console.error('Error assigning teacher to subject:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Upload and import students from CSV
adminController.importStudentsFromCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { classId } = req.body;

    // Check if class exists
    const classExists = await Class.findById(classId);
    if (!classExists) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    const results = [];
    const errors = [];

    // Process CSV file
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', async (data) => {
        try {
          // Expected CSV format: fullName, email, registrationNumber
          const { fullName, email, registrationNumber } = data;
          
          // Check if required fields are present
          if (!fullName || !email || !registrationNumber) {
            errors.push(`Missing required fields for row: ${JSON.stringify(data)}`);
            return;
          }

          // Check if user already exists
          const userExists = await User.findOne({
            $or: [{ email }, { registrationNumber }]
          });

          if (userExists) {
            errors.push(`User with email ${email} or registration number ${registrationNumber} already exists`);
            return;
          }          // Create default password (can be changed later)
          const defaultPassword = registrationNumber;
          const salt = await bcrypt.genSalt(10);
          const passwordHash = await bcrypt.hash(defaultPassword, salt);

          // Create new student
          const newStudent = new User({
            fullName,
            email,
            registrationNumber,
            passwordHash,
            role: 'student',
            class: classId
          });

          await newStudent.save();
          results.push(newStudent);
        } catch (error) {
          errors.push(`Error processing row: ${error.message}`);
        }
      })
      .on('end', () => {
        // Clean up temporary file
        fs.unlinkSync(req.file.path);

        res.json({
          success: true,
          message: `${results.length} students imported successfully`,
          errors: errors.length > 0 ? errors : null
        });
      });
  } catch (error) {
    console.error(error.message);
    // Clean up temporary file if it exists
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Get all teachers
adminController.getAllTeachers = async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher' })
      .select('-passwordHash')
      .sort({ fullName: 1 });

    res.json({
      success: true,
      teachers
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Get all students by class
adminController.getStudentsByClass = async (req, res) => {
  try {
    const classId = req.params.classId;

    // Check if class exists
    const classExists = await Class.findById(classId);
    if (!classExists) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Get students
    const students = await User.find({ role: 'student', class: classId })
      .select('-passwordHash')
      .sort({ fullName: 1 });

    res.json({
      success: true,
      students
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Create a single student
adminController.createStudent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fullName, email, registrationNumber, classId } = req.body;

    // Check if class exists
    const classExists = await Class.findById(classId);
    if (!classExists) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({
      $or: [{ email }, { registrationNumber }]
    });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: `User with email ${email} or registration number ${registrationNumber} already exists`
      });
    }

    // Create default password (set to registration number by default)
    const defaultPassword = registrationNumber;
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(defaultPassword, salt);

    // Create new student
    const newStudent = new User({
      fullName,
      email,
      registrationNumber,
      passwordHash,
      role: 'student',
      class: classId
    });

    await newStudent.save();

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      student: {
        _id: newStudent._id,
        fullName: newStudent.fullName,
        email: newStudent.email,
        registrationNumber: newStudent.registrationNumber,
        role: newStudent.role,
        class: newStudent.class
      }
    });  } catch (error) {
    console.error('Error creating student:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Get student by ID
adminController.getStudentById = async (req, res) => {
  try {
    const student = await User.findById(req.params.id)
      .select('-passwordHash')  // Exclude password
      .populate('class', 'level trade year term'); // Populate class details
    
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    res.json({
      success: true,
      student
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Get student results
adminController.getStudentResults = async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // Find all submissions for this student that are graded
    const Submission = require('../models/Submission');
    const submissions = await Submission.find({ 
      student: req.params.id,
      status: 'graded' 
    }).populate({
      path: 'exam',
      select: 'title subject totalScore schedule type',
      populate: {
        path: 'subject',
        select: 'name'
      }
    });
    
    // Format the results
    const results = submissions.map(submission => ({
      _id: submission._id,
      subject: submission.exam.subject.name,
      title: submission.exam.title,
      type: submission.exam.type,
      score: submission.totalScore,
      maxScore: submission.exam.totalScore,
      date: submission.submittedAt,
      examId: submission.exam._id
    }));
    
    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

module.exports = adminController;
