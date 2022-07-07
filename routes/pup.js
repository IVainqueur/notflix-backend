/**
 * @typedef {Object} Movie
 * @property {String} thumbnail - A link to its thumbnail
 * @property {String} title The movie's full name
 * @property {String} trailerLink Link to its trailer
 * @property {String} url Link to watch it or to a page that will be scraped to find the actual movie
 * @property {String} from Source either IMDb or Goojara
  */

/**
* @typedef {Array.<Movie>} FanFavs
* 
*/

/**
 * @typedef {Object} Goojara_Movie_Info
 * @property {String} videoURL
 * @property {String} posterURL
 * @property {String} description
 */



/* Clear the console */
console.clear()
/* Configure dotenv */
require('dotenv').config()


const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
let browser;

const { fanFavContainer: CONTAINER } = require('./puppeteerConfig');

try {
    start();
} catch (e) {
    console.log('ERROR')
}
/**
 * Start by Launching Browser
 */
async function start() {
    browser = await launchBrowser();
    console.log('[LOG]: Browser up and running')
}

/**
 * Launches a chromium browser
 * @returns {puppeteer.Browser} instance of puppeteer.Browser
 */
async function launchBrowser() {
    return await puppeteer.launch();
    // return await puppeteer.launch({ headless: false, defaultViewport: null });
}


/**
 * Gets today's fan favorite movies and shows
 * @returns {FanFavs} an Array of today's fan favorite shows and movies from IMDb
 */
const getFanFavourites = async () => {
    try {
        const page = await browser.newPage()
        await page.goto('https://imdb.com')

        await page.waitForSelector(CONTAINER)
        console.log('Found it');
        let result = [];
        try {
            let div = await page.$(':root')
            let children = await (await div.getProperty('innerHTML')).jsonValue()
            let _document = cheerio.load(children)
            _document(CONTAINER).children().each(function (i, el) {
                let thumbnail = _document(this).children().eq(0).children().eq(1).children().eq(0).attr('src')
                let othersources = _document(this).children().eq(0).children().eq(1).children().eq(0).attr('srcset')
                let rating = _document(this).children().eq(1).text()
                let title = _document(this).children().eq(2).text()
                let trailerLink = _document(this).children().eq(3).children().eq(1).children().eq(0).attr('href')
                result.push({ thumbnail, othersources, rating, title, trailerLink, from: "IMDB" })
            })
        } catch (e) {
            console.log(`[ERROR]: `, e)
        }
        page.close()
        return result
    } catch (e) {
        return { code: "#Error", message: e.message }
    }
}


/**
 * Search in IMDb's Library
 * @param {String} searchQuery 
 * @param {boolean} all Get all results or not
 * @returns {Array.<Movie>}
 */
const imdb_search = async (searchQuery, all = false) => {
    try {
        searchQuery = 'q=' + searchQuery.toString() + `${all ? '&s=tt' : ''}`;
        let result = [];

        const page = await browser.newPage();
        await page.goto(`https://imdb.com/find?${searchQuery}`);

        await page.waitForSelector('.findList');
        let root = await page.$(':root');
        root = await (await root.getProperty('innerHTML')).jsonValue();
        let $ = cheerio.load(root);
        $('a[name=tt]').parent().next().children().eq(0).children().each(function (i, el) {
            let thumbnail = $(this).children('.primary_photo').children().eq(0).children('img').attr('src')
            let title = $(this).children('.result_text').eq(0).children().text().trim()
            let url = $(this).children('.result_text').eq(0).children().eq(0).attr('href')
            result.push({ thumbnail, title, url: `https://imdb.com${url}`, from: "IMDB" })
        })
        return result
    } catch (e) {
        return { code: "#Error", message: e.message }
    }


}

/**
 * Search in Goojara's Library
 * @param {String} searchQuery 
 * @returns {Array.<Movie>}
 */
const goojara_search = async (searchQuery) => {
    let foundResult = false;
    try {
        let time = 0;
        console.log("Searching...\t taking 0s")
        let intervalHandler = setInterval(() => {
            if (foundResult) return clearInterval(intervalHandler)
            console.log(`\x1B[A\b\bSearching...\t taking ${Math.floor(time)}s`)
            time += 0.5
        }, 500)
        const page = await browser.newPage();
        await page.goto('http://goojara.to');
        let results = await page.evaluate(async (_searchQuery) => {
            console.log(_searchQuery)
            let query = new FormData()
            query.append('q', _searchQuery)
            let data;
            await fetch('https://www.goojara.to/xhrr.php', {
                method: "POST",
                body: query
            })
                .then(res => res.text())
                .then(res => { data = res })
                .catch(e => {
                    data = "#Error"
                })
            return data
        }, searchQuery)
        foundResult = true
        if (results === "No result") {
            console.log("No Results Found")
            results = []
        } else if (results === "#Error") {
            return []
        } else {
            let $ = cheerio.load(results);
            results = []
            $(".lxbx ul").children().each(function () {
                let [, link, type,] = $(this).html().match(/href="(.*)"(?=\>\<div class="(..)")/);
                let titleAndYear = $(this).children().eq(0).children().text();
                let title = $(this).children().eq(0).children().eq(0).children().eq(0).text();
                let year = titleAndYear.slice(title.length).trim().slice(1, -1);
                results.push({ thumbnail: null, url: link, title, year, from: "GOOJARA", type: type === 'im' ? 'movie' : 'series' })
            })
        }
        await page.close();
        return results
    } catch (e) {
        foundResult = true
        return { code: "#Error", message: e.message }
    }
}


/**
 * Get a movie's fullMovie video_URL, caption/description and posterURL
 * @param {string} movieURL A URL to the movie on the GoojaraSite
 * @returns {Goojara_Movie_Info}
 */
const goojara_getmovie = async (movieURL) => {
    try {
        const page = await browser.newPage();
        await page.goto(movieURL);
        try {
            await customWaitForSelector(page, '#vidcon iframe', { timeout: 15000 });
        } catch (e) {
            if (e instanceof puppeteer.TimeoutError) {
                console.log("wait timed out")

            }
            return { code: "#Error", message: e.message }
        }
        let { movieTitle, iframeURL, posterURL, text } = await page.evaluate(() => {
            return {
                movieTitle: document.querySelector('.lxbx .marl h1').textContent,
                iframeURL: document.querySelector('#vidcon iframe').src,
                posterURL: document.querySelector('#poster img').src,
                text: document.querySelector('.fimm p').textContent
            }
        })
        // console.log("Going to ", iframeURL)
        await page.goto(iframeURL)
        await customWaitForSelector(page, '#video-container a', {})
        await page.evaluate(() => {
            document.querySelector('#video-container a').click();
        })

        await customWaitForSelector(page, '#video-container video', {})

        let videoURL = await page.evaluate(async () => {
            // console.log(document.querySelector('#video-container video').src)
            await (new Promise((resolve) => setTimeout(() => resolve(), 1000)))
            return document.querySelector('#video-container video').src;
        })

        // console.log("VID_URL: ", videoURL);
        return { videoURL, posterURL, description: text, movieTitle }


    } catch (e) {
        return { code: "#Error", message: e.message }
    }
}


/**
 * Custom implementation of puppeteer.waitForSelector()
 * @param {puppeteer.Page} page
 * @param {String} selector 
 * @param {Object} options 
 */
async function customWaitForSelector(page, selector, options) {
    return new Promise(async (resolve, reject) => {
        try {
            await page.waitForSelector(selector, options)
            resolve(true)
        } catch (e) {
            reject(e)
            console.log("\x1B[41m\x1B[37m", e, "\x1B[0m")
        }
    })
}

module.exports = {
    getFanFavourites,
    imdb_search,
    goojara_getmovie,
    goojara_search
}