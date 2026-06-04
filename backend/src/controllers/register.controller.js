const jwt = require('jsonwebtoken');
const sequelize = require('../db/dbConfig');
const { User, Vendor } = require('../models');
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })


const registerUser = async (req, res) => {
    const { name, email, password, role, storeName, businessAddress, phoneNumber } = req.body;
    let newUser = {}
    try {
        const doesExist = await User.findOne({
            where: {
                email: email
            }
        });

        // if a user want to create mulitiple accounts with the same email
        if (doesExist) {
            if (doesExist.toJSON().role.includes(role)) {
                return res.status(409).json({
                    error: "Account already registered with this role"
                })
            }

            // verify password
            const isMatch = await bcrypt.compare(password, doesExist.toJSON().passwordHash)

            if (isMatch) {
                // update the user's role 
                doesExist.role = [...doesExist.role, role];
                // save the user
                await doesExist.save();
                return res.status(200).json({
                    message: "You have been successfully registered!",
                    user: doesExist.toJSON()
                })
            } else {
                return res.status(401).json({
                    error: "Invalid Credentials!"
                })
            }
        }

        const passwordHash = await bcrypt.hash(password, 10);

        if (role === 'customer') {
            newUser = await User.create({
                name: name,
                email: email,
                passwordHash: passwordHash
            })

            res.status(201).json({
                message: "User successfully registered!",
                user: newUser
            })
        } else {
            newUser = await User.create({
                name: name,
                email: email,
                passwordHash: passwordHash,
                role: [role]
            })

            const newVendor = await Vendor.create({
                userId: newUser.toJSON().id,
                storeName: storeName,
                storeAddress: businessAddress,
                phone: phoneNumber
            })

            const vendor = Object.assign(newUser, newVendor);
            res.status(201).json({
                message: "Your Business has been successfully registered! ",
                details: vendor
            })
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: "Internal server error!!"
        })
    }
}

module.exports = registerUser