// Simple standalone email test script for Nodemailer + Gmail
// Run with: node testEmail.js

require('dotenv').config();
const nodemailer = require('nodemailer');

(async () => {
  const { EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.error('Missing EMAIL_USER or EMAIL_PASS in environment variables.');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });

  try {
    const info = await transporter.sendMail({
      from: `"EMS Test" <${EMAIL_USER}>`,
      to: EMAIL_USER,
      subject: 'Nodemailer Test',
      text: 'This is a test email from EMS',
      html: '<p>This is a <strong>test email</strong> from EMS</p>'
    });
    console.log('Email sent:', info.messageId || info.response);
  } catch (err) {
    console.error('Error sending test email:', err.message);
    process.exitCode = 1;
  }
})();
