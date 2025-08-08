const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Serve uploaded files with proper CORS headers
router.get('/schools/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '..', '..', 'uploads', 'schools', filename);
  
  // Set CORS headers
  res.header('Access-Control-Allow-Origin', process.env.CLIENT_URL || 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File not found' });
  }
  
  // Get file extension to set correct content type
  const ext = path.extname(filename).toLowerCase();
  const contentType = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml'
  }[ext] || 'image/jpeg';
  
  res.contentType(contentType);
  res.sendFile(filePath);
});

module.exports = router;
