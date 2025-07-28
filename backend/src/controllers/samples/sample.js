// controllers/schoolController.js
const School = require('../models/School');

exports.createSchool = async (req, res) => {
    try {
        const { name, address } = req.body;
        const existing = await School.findOne({ name });
        if (existing) return res.status(409).json({ message: 'School already exists' });

        const school = await School.create({ name, address });
        res.status(201).json(school);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.getAllSchools = async (req, res) => {
    try {
        const schools = await School.find();
        res.json(schools);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateSchool = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await School.findByIdAndUpdate(id, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteSchool = async (req, res) => {
    try {
        const { id } = req.params;
        await School.findByIdAndDelete(id);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};


// controllers/tradeController.js
const Trade = require('../models/Trade');

exports.createGlobalTrade = async (req, res) => {
    try {
        const { name } = req.body;
        const exists = await Trade.findOne({ name });
        if (exists) return res.status(409).json({ message: 'Trade already exists globally' });

        const trade = await Trade.create({ name });
        res.status(201).json(trade);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.getAllTrades = async (req, res) => {
    try {
        const trades = await Trade.find();
        res.json(trades);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateTrade = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await Trade.findByIdAndUpdate(id, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteTrade = async (req, res) => {
    try {
        const { id } = req.params;
        await Trade.findByIdAndDelete(id);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};


// controllers/classController.js
const Class = require('../../models/Class');

exports.createClass = async (req, res) => {
    try {
        const { level, trade, year } = req.body;
        const existing = await Class.findOne({ level, trade, year });
        if (existing) return res.status(409).json({ message: 'Class already exists' });

        const newClass = await Class.create({ level, trade, year });
        res.status(201).json(newClass);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.getAllClasses = async (req, res) => {
    try {
        const classes = await Class.find();
        res.json(classes);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateClass = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await Class.findByIdAndUpdate(id, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteClass = async (req, res) => {
    try {
        const { id } = req.params;
        await Class.findByIdAndDelete(id);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};


// controllers/enrollmentController.js
const Enrollment = require('../models/Enrollment');

exports.enrollStudent = async (req, res) => {
    try {
        const { studentId, classId, year } = req.body;
        const exists = await Enrollment.findOne({ student: studentId, class: classId, year });
        if (exists) return res.status(409).json({ message: 'Already enrolled' });

        const enrollment = await Enrollment.create({ student: studentId, class: classId, year });
        res.status(201).json(enrollment);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.getAllEnrollments = async (req, res) => {
    try {
        const list = await Enrollment.find().populate('student class');
        res.json(list);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.promoteStudent = async (req, res) => {
    try {
        const { studentId, newClassId, year } = req.body;
        const exists = await Enrollment.findOne({ student: studentId, class: newClassId, year });
        if (exists) return res.status(409).json({ message: 'Already promoted or enrolled in this class' });

        const enrollment = await Enrollment.create({ student: studentId, class: newClassId, year });
        res.status(201).json(enrollment);
    } catch (err) {
        res.status(500).json({ message: 'Promotion failed', error: err.message });
    }
};


// Additional controllers (subjectController, termController, examController, reportCardController)
// would follow the same full CRUD and logic pattern as above.

// Would you like me to continue generating the full versions of the remaining controllers?
