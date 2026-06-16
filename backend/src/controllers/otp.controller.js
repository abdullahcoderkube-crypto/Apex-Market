const {User, Otp} = require('../models')
const getTransporter = require('../utils/getEmailTransporter')
const crypto = require('crypto');

const requestOtp = async (req, res) => {
    const {email, role} = req.body;

    try {

    // Quick check, for preventing duplicate role registeration
    const doesExist = await User.findOne({ where: {email} })

    if(doesExist && doesExist.role.includes(role)) {
        return res.status(409).json({ error: "Account already registered with this Email."})
    }
    
    // generate random otp code
    const otp = crypto.randomInt(100000, 1000000).toString();
        
        // Save OTP to PostgreSQL (Upsert/overwrite existing OTP for this email if it exists)
        await Otp.upsert({
            email: email,
            otp_code: otp,
            expires_at: new Date(Date.now() + 5 * 60 * 1000) 
        });

        // Define email options
        const mailOptions = {
            from: `Apex Vendor <${process.env.EMAIL_USER}>`,
            to: req.body.email,
            subject: 'Your Verification Code',
            text: `Your OTP code is ${otp}. It is valid for 5 minutes.`,
            html: `<b>Your OTP code is ${otp}</b>.<br>It is valid for 5 minutes.`
        };

        // send mail
        await getTransporter().sendMail(mailOptions)

        return res.status(200).json({ message: "OTP sent successfully to your email." });

        } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal Server Error!" });
    }
}

module.exports = requestOtp