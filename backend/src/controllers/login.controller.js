const path = require('path')
const bcrypt = require('bcrypt');
const {User, Vendor, RefreshToken} = require('../models');
const { generateAccessToken, generateRefreshToken, hashToken} = require('../utils/tokens');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env')})

const loginUser = async (req, res) => {
    const {email, password} = req.body
    try {
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
        let payload = {};
    
        // check if the user has also Vendor account
        if (isValidUser.role.includes('vendor')){
            const vendor = await Vendor.findOne({
                where: {
                    userId: isValidUser.id
                }
            })
    
            payload = {
            userEmail: email, 
            userId: isValidUser.id,
            userRole: isValidUser.toJSON().role,
            userName: isValidUser.toJSON().name,
            vendorId: vendor.id
            }
        } else {
            payload = {
            userEmail: email, 
            userId: isValidUser.id,
            userRole: isValidUser.toJSON().role,
            userName: isValidUser.toJSON().name,
            }
        }
        
        const accessToken = await generateAccessToken(payload)
        const refreshToken = generateRefreshToken()
        
        await RefreshToken.create({
            user_id: payload.userId, 
            token_hash: hashToken(refreshToken),
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production', // enforce sent over HTTPS in production,
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', 
            path: '/auth', 
            maxAge: 30 * 24 * 60 * 60 * 1000
        })
    
        res.status(200).json({
            message: "You are successfully logged in", 
            accessToken
        })
    } catch (err) {
        console.log(err)
        if (err.type === "JWT_SIGN_ERROR") {
            console.log(err.type)
            return res.status(500).json({ error: "interval server error"})
        }
        res.status(500).json({ error: "interval server error"})
    }
}

module.exports = loginUser