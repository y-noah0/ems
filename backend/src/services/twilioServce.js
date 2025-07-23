const twilio = require('twilio');
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

const client = twilio(accountSid, authToken);

const sendSMS = async (to, body) => {
    try {
        const message = await client.messages.create({
            body,
            messagingServiceSid,
            to,
        });
        console.log('SMS sent:', message.sid);
        return message;
    } catch (error) {
        console.error('Failed to send SMS:', error.message);
        throw error;
    }
};

module.exports = { sendSMS };