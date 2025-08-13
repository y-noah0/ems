const nodemailer = require('nodemailer');

// Reusable transporter (Gmail via Nodemailer)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Send an email notification.
 * Arguments mirror the previous SendGrid helper (html optional).
 */
async function sendEmail(to, subject, text, html) {
  if (!to || !subject) return;
  try {
    const info = await transporter.sendMail({
      from: `"EMS Support" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html: html || undefined
    });
    console.log(`Email sent to ${to}: ${info.messageId || info.response}`);
    return info;
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error.message);
  }
}

module.exports = { sendEmail };
