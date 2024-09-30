import nodemailer from 'nodemailer';


const transporter = nodemailer.createTransport({
    host: 'smtp.protonmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  });

export const sendmail = async (email, verificationCode, html, subject)=>{
    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: subject,
      html: html,
    };
     await transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        return  false;
      }
      console.log(info);
       return true;
    });
  
    return true
  
  }


