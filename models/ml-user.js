const mongo = require('mongoose')

const userSchema = mongo.Schema({
    fullName: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    profiles: {
        type: Array,
        default: []
    }

})

module.exports = mongo.model('user', userSchema)