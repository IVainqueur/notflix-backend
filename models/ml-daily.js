const mongo = require('mongoose')

const dailySchema = mongo.Schema({
    day:{
        type: Number,
        default: Date.parse((new Date()).toLocaleDateString('en-UK', {timeZone: 'Africa/Harare'}))
    },
    fanFavs: {
        type: Array
    }

})

module.exports = mongo.model('daily', dailySchema)