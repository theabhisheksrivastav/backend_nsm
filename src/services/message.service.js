import twilio from 'twilio';


const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);


// sends otp to the user
// to is the user's phone number, message is the Text(otp)
export const sendMessage = async (to, message) => {
    try {
        const response = await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to
        });
        console.log(response);// we dont have twilio setup so we will test for response later and then remove console.log
        return response;
    } catch (error) {
        console.error('Error sending message:', error);
    }
};