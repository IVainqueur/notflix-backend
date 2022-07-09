const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const mongo = require('mongoose')
const { getFanFavourites, imdb_search, goojara_search, goojara_getmovie } = require('./routes/pup')
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const URL_Whitelist = ['/user/login', '/user/logout', '/user/signup', '/', '/getLogs'];
const Daily = require('./models/ml-daily');

const fs = require('fs')


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
    res.header('Access-Control-Allow-Headers', 'Content-Type,Set-Cookie')

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

app.get('/', (req, res)=>{
    res.send("Up and Running")
})

app.get('/getLogs', (req, res)=>{
    res.sendFile(__dirname + '/logs.txt')
})

app.get('/fan-favorites', async (req, res) => {
    let closed = false;
    req.on('close', ()=>{
        console.log('\x1B[31m\x1B[1m[WARNING]: Request closed\x1B[0m')
    })
    let today = Date.parse((new Date()).toLocaleDateString('en-UK', {timeZone: 'Africa/Harare'}))

    let todaysResults = await Daily.findOne({day: {'$eq': today}})
    if(todaysResults) return res.json({code: "#Success", data: todaysResults.fanFavs});

    let results = await getFanFavourites();
    if(results.code === "#Error") {
        console.log("Error occured")
        closed = true
        return res.json({...results})
    }

    
    res.json({code: "#Success", data: results});
    
    let addToday =  Daily({day: today, fanFavs: results});
    todaysResults = await Daily.findOne({day: {'$eq': today}})
    if(!closed & !todaysResults) {
        console.log("Adding to DB");
        await addToday.save()
    };


})

app.get('/find/:search/:all', async (req, res) => {
    let searchQuery = req.params.search;
    let all = req.params.all === 'true' ? true : false;
    let goojaraResults = await goojara_search(searchQuery);
    let imdbResults = await imdb_search(searchQuery, all);

    console.log((Array.isArray(imdbResults) ? imdbResults.length : ''), (Array.isArray(goojaraResults) ? goojaraResults.length : ''))

    if([imdbResults.code, goojaraResults.code].includes("#Error")) return res.json({code: "#Error", message: imdbResults.code ? imdbResults.message : goojaraResults.message})

    let toLog = ((new Date()).toLocaleString('en-UK', {timeZone: 'Africa/Harare'}))
    toLog += '\n SearchResults\n=================\nGOOJARA:\n'
    toLog += typeof goojaraResults === 'object' ? JSON.stringify(goojaraResults, null, 4) : goojaraResults
    toLog += '\n IMDB: \n'
    toLog += typeof imdbResults === 'object' ? JSON.stringify(imdbResults, null, 4) : imdbResults
    toLog += '\n=============\n=============\n'
    addToLogs(toLog)

    res.json({code: "#Success", data: [...imdbResults, ...goojaraResults]})
})

app.get('/watch/:service/:link', async (req,res)=>{
    let {service, link} = req.params
    link = `https://ww1.goojara.to/${link}`
    let result = await goojara_getmovie(link);
    if(result.code === "#Error") return res.json({...result})
    res.json({code: "#Success", data: result})
})

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
    console.log(`\x1B[1m\x1B[33m[LOG]: Server running at PORT ${PORT}\x1B[0m`)
});

function addToLogs (data){
    fs.appendFile('./logs.txt', data, (err)=>{
        if(err) return console.log("\x1B[1m\x1B[31m[ERROR] Error Appending To LOGS\x1B[0m");

    })
}