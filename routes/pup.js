/* Clear the console */
console.clear()
/* Configure dotenv */
require('dotenv').config()


const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
let browser;

const { fanFavContainer: CONTAINER, streamingContainer } = require('./puppeteerConfig');

try {
    start();
} catch (e) {
    console.log('ERROR')
}

async function start() {
    browser = await launchBrowser();
    console.log('[LOG]: Browser up and running')
    // browser.on('disconnected', launchBrowser)
    // setTimeout(()=>{browser.disconnect()}, 3000)
    // getFanFavourites()
    // (async () => await browser.close())();
}

async function launchBrowser() {
    return await puppeteer.launch();
    // return await puppeteer.launch({headless: false, defaultViewport: null});
}

const getFanFavourites = async () => {
    const page = await browser.newPage()
    await page.goto('https://imdb.com')

    await page.waitForSelector(CONTAINER)
    // await page.waitForSelector(streamingContainer)
    console.log('Found it');
    let result = [];
    try {
        // [CONTAINER].map(async (con) => {
        // console.log(streamingContainer)
        let div = await page.$(':root')
        let children = await (await div.getProperty('innerHTML')).jsonValue()
        let _document = cheerio.load(children)
        _document(CONTAINER).children().each(function (i, el) {
            let thumbnail = _document(this).children().eq(0).children().eq(1).children().eq(0).attr('src')
            // console.log(_document(this).children().eq(0).children('img'))
            let rating = _document(this).children().eq(1).text()
            let title = _document(this).children().eq(2).text()
            let trailerLink = _document(this).children().eq(3).children().eq(1).children().eq(0).attr('href')
            result.push({ thumbnail, rating, title, trailerLink })
            // })
        })
    } catch (e) {
        console.log(`[ERROR]: `, e)
    }
    console.log(result)
    page.close()
    return result
}

const search = async (searchQuery, all = false) => {
    searchQuery = 'q=' + searchQuery.toString() + `${all ? '&s=tt' : ''}`;
    let result = [];

    const page = await browser.newPage();
    await page.goto(`https://imdb.com/find?${searchQuery}`);

    await page.waitForSelector('.findList');
    let root = await page.$(':root');
    root = await (await root.getProperty('innerHTML')).jsonValue();
    let $ = cheerio.load(root);
    $('.findList tbody').children().each(function (i, el) {
        let thumbnail = $(this).children('.primary_photo').children().eq(0).children('img').attr('src')
        let title = $(this).children('.result_text').eq(0).children().eq(0).text()
        let url = $(this).children('.result_text').eq(0).children().eq(0).attr('href')
        // let year = $(this).children('.result_text')[0].childNodes[2]
        result.push({ thumbnail, title, url })
    })

    return result


}

module.exports = {
    getFanFavourites,
    search
}