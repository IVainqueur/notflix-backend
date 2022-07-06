const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const mongo = require('mongoose')
const { getFanFavourites, search } = require('./routes/pup')
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const URL_Whitelist = ['/user/login', '/user/logout', '/user/signup'];

/* Connect to DB */
mongo.connect(process.env.MONGO_URI, (err) => {
    if (err) return console.log("\x1B[1m\x1B[31m[ERROR]: Failed to connect to DB\x1B[0m")
    console.log("\x1B[1m\x1B[32m[LOG]: Connected to DB\x1B[0m")

})
/* Middleware */
require('dotenv').config();
app.use(bodyParser.json());
app.use(cookieParser());

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", req.get('origin'))
    res.header('Access-Control-Allow-Credentials', 'true')
    res.header('Access-Control-Allow-Headers', 'Content-Type')

    /* Check if the route needs the token */
    let isOKToContinue = false;
    if (!URL_Whitelist.includes(req.originalUrl)) {
        /* Check if token is available and valid */
        if(!req.cookies.uid) return res.json({code: "#NoTokenNoEntry", message: "Please login to get token"})
        jwt.verify(req.cookies.uid, process.env.JWT_SECRET, (err, data)=>{
            if(err) return res.json({code: "#InvalidToken", message: "The Token you have is invalid. Please login to get a valid one."})
            req.body._userInfo = data
        })
        isOKToContinue = true;
    }else{
        isOKToContinue = true;
    }
    
    if(isOKToContinue) next()
})

app.use('/user', require('./routes/users'))

app.get('/fan-favorites', async (req, res) => {
    let result = await getFanFavourites();
    res.json(result);
})

app.get('/find/:search/:all', async (req, res) => {
    let searchQuery = req.params.search
    let all = req.params.all ? true : false
    res.json(await search(searchQuery, all))
})
const PORT = process.env.PORT | 8080
app.listen(PORT, () => {
    console.log(`\x1B[1m\x1B[33m[LOG]: Server running at PORT ${PORT}\x1B[0m`)
});