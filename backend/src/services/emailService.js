const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async (to, subject, text) => {
    try {
        const msg = {
            to,
            from: process.env.SENDGRID_FROM_EMAIL,
            subject,
            text,
        };

        const response = await sgMail.send(msg);
        console.log('Email sent:', response[0].statusCode);
        return response;
    } catch (error) {
        console.error('Error sending email:', error.message);
        throw error;
    }
};

module.exports = { sendEmail };