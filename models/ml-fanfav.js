const mongo = require('mongoose')

const fanFavModel = mongo.Schema({
    thumbnail: String,
    rating: Number,
    title: String,
    trailerLink: String
})


module.exports = mongo.model('fanfav', fanFavModel)