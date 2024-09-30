import nodemailer from 'nodemailer';


const transporter = nodemailer.createTransport({
    service: 'gmail',
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
     transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        return  false;
      }
      console.log(info);
       return true;
    });
  
    return true
  
  }


