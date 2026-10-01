/*const getEmailTransporter = require('../utils/getEmailTransporter');
const transporter = getEmailTransporter();

// welcome email 
const sendWelcomeEmail = async (recepientEmail) => {
    const mailOptions = {
            from: `Apex Market <${process.env.EMAIL_USER}>`,
            to: recepientEmail,
            subject: 'Welcome Email from Apex Market',
            text: `Your Account has been registered succussfully, kindly login with your credentials.`
        };

        await transporter.sendMail(mailOptions)
}

// Order confirmation email
const sendOrderConfirmationEmail = async(recepientEmail, orderId, amount, deliveryAddress = 'your delivery address.') => {
    const mailOptions = {
        from: `Apex Market <${process.env.EMAIL_USER}>`,
        to: recepientEmail,
        subject: "Your order has been confirmed!",
        text: `Order ${orderId} with amount of $${amount} has been successfully confirmed and will be delivered to ${deliveryAddress}`
    }

    await transporter.sendMail(mailOptions)
}

//Order shipped email 
const sendOrderShippedEmail = async(recepientEmail, orderId, customerName, deliveryAddress) => {
    const mailOptions = {
        from: `Apex Market <${process.env.EMAIL_USER}>`,
        to: recepientEmail, 
        subject: "Hooray! Your Order has been shipped!",
        text: `Dear ${customerName || "Customer"}, \n Your Order ${orderId} has been successfully shipped at ${deliveryAddress}. \n Kindly give your honest reviews about the products.`
    }

    await transporter.sendMail(mailOptions)
}

// Order cancelled email 
const sendOrderCancelledEmail = async(recepientEmail, orderId, customerName) => {
    const mailOptions = {
        from: `Apex Market <${process.env.EMAIL_USER}>`,
        to: recepientEmail, 
        subject: "Order has been Cancelled!",
        text: `Dear ${customerName || "Customer"}, \n Your recent Order ${orderId} has been cancelled due to delay in payment. You can find more detail in your order history page. \n Thank You,\nApex Market.`
    }

    await transporter.sendMail(mailOptions)
}

// New order arrived email (only for vendor)
const sendOrderArrivedEmail = async(recepientEmail, vendorName) => {
    const mailOptions = {
        from: `Apex Market <${process.env.EMAIL_USER}>`,
        to: recepientEmail, 
        subject: "Woo-Hoo! New Order Arrived!",
        text: `Dear ${vendorName || "Vendor"},\nYou just got a New Order via Apex Market, you can read order detail in your Orders to Process Dashboard / Vendor Dashboard.\nThank You,\nApex Market.`
    }

    await transporter.sendMail(mailOptions)
}

// Low inventory (below threshold) alert email
const sendLowInventoryEmail = async (recipientEmail, productId, stock, vendorName) => {
    const mailOptions = {
        from: `Apex Market <${process.env.EMAIL_USER}>`,
        to: recipientEmail, 
        subject: "ALERT! INVENTORY BELOW THRESHOLD",
        text: `Dear ${vendorName || "Vendor"},\nYour Product (ID - ${productId}) listed on Apex Market, its stock quantity has decreased below the minimun threshold, kindly view that product in your Vendor Dashboard and replenish it.\n\nThank You,\nApex Market.`
    }

    await transporter.sendMail(mailOptions)
}

module.exports = {sendWelcomeEmail, sendOrderConfirmationEmail, sendOrderShippedEmail, sendOrderCancelledEmail, sendOrderArrivedEmail, sendLowInventoryEmail};*/