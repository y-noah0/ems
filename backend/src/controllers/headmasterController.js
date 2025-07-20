const School = require('../models/School');
const Trade = require('../models/trade');
const Subject = require('../models/Subject');
const { validateEntity } = require('../utils/entityValidator');

const headmasterController = {};

// Get trades offered by the headmaster's school
headmasterController.getTradesOffered = async (req, res) => {
  try {
    const schoolId = req.user.school;
    const school = await School.findById(schoolId).populate('tradesOffered', 'name code fullName type level');
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }
    res.json({ success: true, trades: school.tradesOffered });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Add a trade to school's offerings
headmasterController.addTradeOffered = async (req, res) => {
  try {
    const schoolId = req.user.school;
    const tradeId = req.params.tradeId;
    // Validate trade exists
    await validateEntity(Trade, tradeId, 'Trade');
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }
    if (!school.tradesOffered.includes(tradeId)) {
      school.tradesOffered.push(tradeId);
      await school.save();
    }
    const populated = await school.populate('tradesOffered', 'name code fullName type level');
    res.json({ success: true, trades: populated.tradesOffered });
  } catch (error) {
    console.error(error);
    // handle validation error
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Remove a trade from school's offerings
headmasterController.removeTradeOffered = async (req, res) => {
  try {
    const schoolId = req.user.school;
    const tradeId = req.params.tradeId;
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }
    school.tradesOffered = school.tradesOffered.filter(id => id.toString() !== tradeId);
    await school.save();
    const populated = await school.populate('tradesOffered', 'name code fullName type level');
    res.json({ success: true, trades: populated.tradesOffered });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get subject catalog for school's trades
headmasterController.getSubjectsCatalog = async (req, res) => {
  try {
    const schoolId = req.user.school;
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }
    // Subjects that match trades offered
    const subjects = await Subject.find({
      isDeleted: false,
      trades: { $in: school.tradesOffered }
    }).populate('trades', 'name code fullName type level');
    res.json({ success: true, subjects });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Create a new subject scoped to this school
headmasterController.createSubject = async (req, res) => {
  try {
    const { name, description, trades, credits } = req.body;
    const schoolId = req.user.school;
    // Validate trades array
    if (!Array.isArray(trades) || trades.length === 0) {
      return res.status(400).json({ success: false, message: 'Trades are required' });
    }
    // Ensure trades are part of school's offerings
    const school = await School.findById(schoolId);
    const invalid = trades.find(t => !school.tradesOffered.map(id => id.toString()).includes(t));
    if (invalid) {
      return res.status(400).json({ success: false, message: 'One or more trades not offered by school' });
    }
    // Validate entity existence
    await Promise.all(trades.map(t => validateEntity(Trade, t, 'Trade')));
    // Create subject
    const subject = new Subject({ name, description, school: schoolId, trades, credits });
    await subject.save();
    const populated = await subject.populate('trades', 'name code fullName type level');
    res.status(201).json({ success: true, subject: populated });
  } catch (error) {
    console.error(error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = headmasterController;
