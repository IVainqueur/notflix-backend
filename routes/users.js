const express = require('express')
const app = express.Router()
const User = require('../models/ml-user')

app.post('/login', async (req, res)=>{
    let {username, password} = req.body;
    let foundUser = await User.findOne({username: username});
    if(!foundUser) return res.json({code: "#NoSuchUser"});
    /* Compare passwords */
    if(foundUser.password === password){
        req.cookie('uid', foundUser._id);
        return res.json({code: "#Success"})
    }else{
        return res.json({code: "#Error"})
    }
})

app.post('/signup',  async(req, res)=>{
    let {fullName, username, email, password} = req.body
    let newUser = User({fullName, username, email, password})
    try{
        await newUser.save();
        res.json({code: "#Success"})
    }catch(e){
        // console.log(e)
        res.json({code: "#Error", message: e.message})
    }
})

module.exports = app