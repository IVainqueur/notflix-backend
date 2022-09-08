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
let context;

const { fanFavContainer: CONTAINER } = require('./puppeteerConfig');
const { addToLogs } = require('../oneliners');

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
    context = await browser.createIncognitoBrowserContext()
    console.log('[LOG]: Browser up and running')
}

/**
 * Launches a chromium browser
 * @returns {puppeteer.Browser} instance of puppeteer.Browser
 */
async function launchBrowser() {
    return await puppeteer.launch({
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36'
        ]
    });
    return await puppeteer.launch({ headless: false, defaultViewport: null });
}


/**
 * Gets today's fan favorite movies and shows
 * @returns {FanFavs} an Array of today's fan favorite shows and movies from IMDb
 */
const getFanFavourites = async (req = null) => {
    let quit = false
    const page = await browser.newPage()
    try {
        if (req) {
            console.log("ADDING THE LISTENER")
            req.on('close', async () => {
                quit = true;
                await page.close()
            })
        }
        await page.goto('https://imdb.com')
        // await page._client.send('Network.clearBrowserCookies');

        let ls = await page.evaluate(() => {
            const ls = localStorage
            localStorage.clear()
            return ls
        })
        // console.log(useragent)
        // addToLogs(`USERAGENT = ${useragent}`)
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
        await page.close()
        return result
    } catch (e) {
        await page.close()
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
    const page = await browser.newPage();
    try {
        searchQuery = 'q=' + searchQuery.toString() + `${all ? '&s=tt' : ''}`;
        let result = [];

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
        await page.close()

        return result
    } catch (e) {
        await page.close()
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
        // console.log("Searching...\t taking 0s")
        let intervalHandler = setInterval(() => {
            if (foundResult) {
                console.log("Searching took ", Math.floor(time), " seconds")
                return clearInterval(intervalHandler)
            }
            // console.log(`\x1B[A\b\bSearching...\t taking ${Math.floor(time)}s`)
            time += 0.5
        }, 500)
        console.log("NEW PAGE")
        const page = await context.newPage();
        // await page.setUserAgent(`Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36`)
        await page.setCacheEnabled(false)
        console.log("Going to GOOJARA")
        await page.setBypassCSP(true)
        await page.goto('https://goojara.to', {
            waitUntil: "networkidle2",
        });
        console.log("Evaluating...")

        let results = await page.evaluate(async (_searchQuery) => {
            console.log(_searchQuery)
            let query = new FormData()
            query.append('q', _searchQuery)
            let data;
            await fetch('/xhrr.php', {
                method: "POST",
                body: query
            })
                .then(res => res.text())
                .then(res => { data = res })
                .catch(e => {
                    data = { code: "#Error", error: e.stack }
                })
            return data
        }, searchQuery)
        foundResult = true
        console.log("FOund results, ", (typeof results != 'string') ? results : 'string')
        if (results === "No result") {
            console.log("No Results Found")
            results = { code: "#SomeError", message: "No Results" }
        } else if (results.code === "#Error") {
            console.log('some error occured')
            results.code = "#SomeError"
        } else {
            let toLog = `GOOJARA STRING RECEIVED \n`;
            toLog += results;
            addToLogs(toLog);
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
        console.log("Found the GOOJARA Results")
        await page.close();
        return results
    } catch (e) {
        foundResult = true
        console.log("GOOJARA ERROR: ", e)
        await page.close()
        return { code: "#Error", message: e.message }
    }
}


/**
 * Get a movie's fullMovie video_URL, caption/description and posterURL
 * @param {string} movieURL A URL to the movie on the GoojaraSite
 * @returns {Goojara_Movie_Info}
 */
async function goojara_getmovie(movieURL) {
    const page = await browser.newPage();
    try {
        // await page.setUserAgent(`Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36`)
        await page.goto(movieURL);
        // await page.setDefaultNavigationTimeout(200);
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

        await page.close()
        return { videoURL, posterURL, description: text, movieTitle }


    } catch (e) {
        await page.close()
        return { code: "#Error", message: e.message }
    }
}

async function goojara_getseries(seriesURL) {
    const page = await browser.newPage();
    try {
        console.log("Searching for ", seriesURL)
        // await page.setUserAgent(`Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36`)
        await page.goto(seriesURL);
        let result = await page.evaluate(async (URL) => {
            console.log("TEST")
            let seasonBTNs = document.querySelector('.dflex').children;
            let seasons = Array.from(seasonBTNs).map(s => s.textContent);
            let seriesID = document.querySelector('#seon').getAttribute('data-id')
            let posterURL = document.querySelector('.imrl img').src
            let title = document.querySelector('.marl h1').textContent.trim()
            let description = document.querySelector('.marl p').textContent.trim()
            console.log('reached here')
            let episodes = []
            for (let season of seasons) {
                try {
                    let query = new FormData()
                    query.append('s', season)
                    query.append('t', seriesID)
                    let data = await fetch('/xhrc.php', { method: 'POST', body: query })
                    data = await data.text()
                    let div = Object.assign(document.createElement('div'), { innerHTML: data })
                    let results = []
                    for (let child of div.children) {
                        results.push({
                            episodeNumber: child.querySelector('.seep .sea').textContent.trim(),
                            episodeTitle: child.querySelector('.snfo h1').textContent.trim(),
                            episodeDescription: child.querySelector('.snfo p').textContent.trim(),
                            episodeReleaseData: child.querySelector('.snfo .date').textContent.trim(),
                            episodeURL: child.querySelector('.snfo h1 a').href
                        })
                    }
                    episodes.push({
                        season,
                        episodes: results
                    })

                } catch (e) {
                    episodes.push({})
                }

            }
            return {
                title,
                description,
                posterURL,
                seasons: episodes
            }

        }, seriesURL)
        await page.close()
        return result
    } catch (e) {
        await page.close()
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

// function addToLogs (data){

//     console.log("Adding to LOGS", data)
//     fs.appendFile(`${__dirname}/logs.txt`, data, (err)=>{
//         if(err) return console.log("\x1B[1m\x1B[31m[ERROR] Error Appending To LOGS\x1B[0m", err);

//     })
// }

module.exports = {
    getFanFavourites,
    imdb_search,
    goojara_getmovie,
    goojara_getseries,
    goojara_search
}