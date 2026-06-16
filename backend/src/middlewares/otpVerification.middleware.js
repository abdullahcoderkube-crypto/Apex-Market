const {Otp} = require('../models')

const verifyOtp = async (req, res, next) => {
    const {email, otpCode} = req.body;

    try {
        if (!otpCode) {
            return res.status(400).json({ error: "OTP code is required." });
        }

        const record = await Otp.findOne({
            where: {
                email
            }
        })

        // scenario A: OTP isn't generated in the first place, user is mocking
        if(!record) {
            return res.status(404).json({ error: "No OTP found for this email. Please request a new one." });
        }

        // scenario B: OTP has expired
        if(new Date() > new Date(record.expires_at)) {
            return res.status(410).json({ error: "OTP has expired. Please request a new one." });
        }

        // scenario C: OTP is wrong
        if(otpCode !== record.otp_code) {
            return res.status(401).json({ error: "Incorrect OTP code. Please try again." });
        }

        await record.destroy();

        next();

    } catch (err) {
        console.log(err)
        res.status(500).json({
            error: "Internal Server Error"
        })
    }
}

module.exports = verifyOtp