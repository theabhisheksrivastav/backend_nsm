import nodemailer from 'nodemailer';

// export const sendmail = async (email)=>{

  
  
//     const verificationCode = generateVerificationCode();
//     console.log(email);
    
  
//     if (!email) {
//       return  false;
//     }
  
//     console.log(email);
    
  
//     // Create a verification code using JWT
    
//     otpStorage[email] = {
//       verificationCode,
//       expiresAt: Date.now() + 5 * 60 * 1000 // Expire in 5 minutes
//     };
  
//     const mailOptions = {
//       from: process.env.EMAIL,
//       to: email,
//       subject: 'Your OTP Code - North Star Matrix',
//       html: `
//         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 10px;">
//           <h2 style="text-align: center; color: #0044cc;">North Star Matrix</h2>
//           <p>Hello,</p>
//           <p>We have received a request to verify your identity. Please use the following OTP to complete your verification process:</p>
//           <p style="font-size: 24px; font-weight: bold; color: #0044cc; text-align: center; padding: 10px; border: 1px solid #0044cc; border-radius: 8px; display: inline-block;">
//             ${verificationCode}
//           </p>
//           <p>This code is valid for <strong>5 minutes</strong>.</p>
//           <p>If you did not request this OTP, please contact our support team immediately at <a href="mailto:support@northstarmatrix.com" style="color: #0044cc; text-decoration: none;">support@northstarmatrix.com</a>.</p>
//           <p>Thank you,<br>North Star Matrix Team</p>
//           <hr style="border: none; border-top: 1px solid #ddd;" />
//           <p style="font-size: 12px; color: #888888; text-align: center;">
//             © 2024 North Star Matrix. All rights reserved.
//           </p>
//         </div>
//       `,
//     };
//   console.log("upper error");
//      transporter.sendMail(mailOptions, (error, info) => {
//       if (error) {
        
//         return  false;
//       }
//        return true;
//     });
  
//     return true
  
//   }