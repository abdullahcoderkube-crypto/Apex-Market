const jwt = require('jsonwebtoken');
const path = require('path')
const bcrypt = require('bcrypt');
const {User} = require('../models');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env')})

const loginUser = async (req, res) => {
    const {email, password} = req.body
    const isValidUser = await User.findOne({
        where: {
            email: email
        }
    })

    if (!isValidUser) {
        return res.status(401).json({
            error: "Invalid Credentials!"
        })
    }
    
    // check the password
    const isMatch = await bcrypt.compare(password, isValidUser.toJSON().passwordHash)

    if (!isMatch) {
        return res.status(401).json({
            error: "Invalid Credentials!"
        })
    }

    // if all correct, then issue a jwt token 
    const payload = {
        userEmail: email, 
        userRole: isValidUser.toJSON().role,
        userName: isValidUser.toJSON().name
    }

    const jwtToken = await jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '15 min'
    })

    res.status(200).json({
        message: "You are successfully logged in", 
        token: jwtToken
    })
}

module.exports = loginUser