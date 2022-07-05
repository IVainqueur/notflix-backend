const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const mongo = require('mongoose')
const { getFanFavourites, search } = require('./routes/pup')

/* Connect to DB */
mongo.connect(process.env.MONGO_URI, (err)=>{
    if(err) return console.log("\x1B[1m\x1B[31m[ERROR]: Failed to connect to DB\x1B[0m")
    console.log("\x1B[1m\x1B[32m[LOG]: Connected to DB\x1B[0m")
    
})
/* Middleware */
require('dotenv').config();
app.use(bodyParser.json());
app.use(cors());

app.use('/user', require('./routes/users'))

app.get('/fan-favorites', async (req, res)=>{
    let result = await getFanFavourites();
    res.json(result);
})

app.get('/find/:search/:all', async (req, res)=>{
    let searchQuery = req.params.search
    let all = req.params.all ? true : false
    res.json(await search(searchQuery, all))
})

app.listen(process.env.PORT | 8080);