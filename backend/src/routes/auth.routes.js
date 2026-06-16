const express = require('express')
const {registerRequestValidator, loginRequestValidator} = require('../middlewares/validators.middleware')
const requestOtp = require('../controllers/otp.controller')
const registerUser = require('../controllers/register.controller')
const loginUser = require('../controllers/login.controller')
const verifyOtp = require('../middlewares/otpVerification.middleware')

const router = express.Router();

router.post('/request-otp', registerRequestValidator, requestOtp);
router.post('/register', verifyOtp, registerUser);
router.post('/login', loginRequestValidator, loginUser);



module.exports = router;