const getEmailTransporter = require('../utils/getEmailTransporter');
const transporter = getEmailTransporter();

// welcome email 
const sendWelcomeEmail = async (recepientEmail) => {
    const mailOptions = {
            from: `Apex Vendor <${process.env.EMAIL_USER}>`,
            to: recepientEmail,
            subject: 'Welcome Email from Apex Market',
            text: `Your Account has been registered succussfully, kindly login with your credentials.`
        };

        await transporter.sendMail(mailOptions)
}

// Order confirmation email
const sendOrderConfirmationEmail = async(recepientEmail, orderId, amount, deliveryAddress = 'your delivery address') => {
    const mailOptions = {
        from: `Apex Vendor <${process.env.EMAIL_USER}>`,
        to: recepientEmail,
        subject: "Your order has been confirmed!",
        text: `Order ${orderId} with amount of ${amount}$ has been successfully confirmed and will be delivered to ${deliveryAddress}`
    }

    await transporter.sendMail(mailOptions)
}

module.exports = {sendWelcomeEmail, sendOrderConfirmationEmail};