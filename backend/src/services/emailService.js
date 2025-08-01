const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async (to, subject, text, html) => {
    try {
        const msg = {
            to,
            from: {
                email: process.env.SENDGRID_FROM_EMAIL,
                name: 'EMS Support'
            },
            replyTo: 'emssys75@gmail.com',
            subject,
            text,
            html,
            categories: ['EMS_Notification'],
            trackingSettings: {
                clickTracking: { enable: false, enableText: false }
            }
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