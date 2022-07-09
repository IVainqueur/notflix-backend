
/* 
* The following function takes in an array of needed keys and an object and returns
* a new object from the given one that only contains the needed keys

*/
function _pick(needed, theObj) {
    let newObj = {}
    Object.keys(theObj).forEach((key, i) => {
        if (needed.includes(key)) {
            newObj[key] = theObj[key]
        }
    })
    return newObj
}

/* 
* The following function takes in an array of unneeded keys and an object and returns
* a new object from the given one that doesn't contain the unneeded keys

*/

function _remove(unneeded, theObj) {
    let newObj = {}
    Object.keys(theObj).forEach((key, i) => {
        if (!unneeded.includes(key)) {
            newObj[key] = theObj[key]
        }
    })
    return newObj
}

/* 
* The following function takes in an array of unneeded keys and an object and returns
* a new object from the given one that doesn't contain the unneeded keys

*/

function arr_remove(needed, theObj) {
    let newObj = []
    theObj.forEach((value, i) => {
        if (!needed.includes(value)) {
            newObj.push(value)
        }
    })
    return newObj
}


function addToLogs(data) {
    const fs = require('fs')
    fs.appendFile('./logs.txt', data, (err) => {
        if (err) return console.log("\x1B[1m\x1B[31m[ERROR] Error Appending To LOGS\x1B[0m");

    })
}

module.exports._pick = _pick
module.exports._remove = _remove
module.exports.arr_remove = arr_remove
module.exports.addToLogs = addToLogs