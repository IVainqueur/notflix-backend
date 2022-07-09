const express = require('express')
const app = express.Router()
const jwt = require('jsonwebtoken')
const User = require('../models/ml-user')

require('dotenv').config();

console.log(process.env.NODE_ENV)

app.post('/login', async (req, res) => {
    let { username, password } = req.body;
    let foundUser = await User.findOne({ username: username });
    if (!foundUser) return res.json({ code: "#Error", message: "Incorrect username and/or password" })
    /* Compare passwords */
    if (foundUser.password === password) {
        let token = jwt.sign({ userID: foundUser._id, username }, process.env.JWT_SECRET)
        res.cookie('uid', token, {
            maxAge: 2 * 60 * 60 * 1000,
            sameSite: 'lax',
            // secure: true
        });
        res.header('Access-Control-Allow-Credentials', 'true')
        return res.json({ code: "#Success" })
    } else {
        return res.json({ code: "#Error", message: "Incorrect username and/or password" })
    }
})

app.get('/logout', (req, res) => {
    res.cookie('uid', '', { maxAge: 10 })
    res.send({ code: "#LoggedOut" })
})

app.get('/checkaccess', (req, res)=>{
    res.json({code: "#AccessIsAvailable"})
})

app.post('/signup', async (req, res) => {
    let { fullName, username, email, password } = req.body
    let newUser = User({
        fullName, username, email, password,
        profiles: [
            {
                profileName: username,
                favorites: [],
                watched: [],
                watchLater: []
            }
        ]
    })
    try {
        await newUser.save();
        res.json({ code: "#Success" })
    } catch (e) {
        // console.log(e)
        res.json({ code: "#Error", message: e.message })
    }
})

module.exports = app