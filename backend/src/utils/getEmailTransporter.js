const nodemailer = require('nodemailer')

const getEmailTransporter = () => {
    const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
   
    return transporter
}

module.exports = getEmailTransporter;


