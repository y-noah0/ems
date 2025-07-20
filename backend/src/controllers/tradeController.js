const Trade = require('../models/trade');

const tradeController = {};

// Get all trades
tradeController.getAllTrades = async (req, res) => {
  try {
    const trades = await Trade.find({ isDeleted: false }).sort({ createdAt: -1 });
    res.json({ success: true, trades });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Get trade by ID
tradeController.getTradeById = async (req, res) => {
  try {
    const { id } = req.params;
    const trade = await Trade.findById(id);
    if (!trade || trade.isDeleted) {
      return res.status(404).json({ success: false, message: 'Trade not found' });
    }
    res.json({ success: true, trade });
  } catch (error) {
    console.error(error.message);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ success: false, message: 'Invalid trade ID' });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = tradeController;
