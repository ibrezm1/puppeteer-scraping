require('dotenv').config()
const puppeteer = require('puppeteer')
const fs = require('fs')
const prompt = require('prompt-sync')();
const screenshot = 'github.png';

(async () => {
    const browser = await puppeteer.launch({ headless: false })
    const page = await browser.newPage()
    await page.goto(process.env.GITHUB_URL)
    await page.type('#form1', process.env.GITHUB_USER)
    await page.click('#proceed-button')
    await page.waitForTimeout(1000)
    //await page.type('#authcode1', process.env.GITHUB_PWD)
    const authcode = prompt("What is your authcode?");
    await page.type('#authcode1', authcode)
    page.waitForSelector('#form-submit')
    await page.click('#form-submit')

    await page.setRequestInterception(true);
    page.on('request', (req) => {
        if (req.resourceType() == 'stylesheet' || req.resourceType() == 'font' || req.resourceType() == 'image') {
            req.abort();
        }
        else {
            req.continue();
        }
    });

    for (let pagenum = 1; pagenum < 150; pagenum++) {
        console.log(`Extracting page ${pagenum}`)
        var pageurl = process.env.GITHUB_EXTRACTOR_URL.concat( `${pagenum}&sort=published_at&timeline_type=user`)
        console.log(pageurl)
        await page.goto(pageurl)
        // Get all contexual master links on that page 
        const result = await page.evaluate(() => {
            try {
                var data = [];
                $('h4 > a').each(function () {
                    const url = $(this).attr('href');
                    const title = $(this).text()
                    data.push({
                        'title': title,
                        'url': process.env.GITHUB_CONCAT_URL.concat(url.replace(/\\\"/g, ""))
                    });
                });
                return data; // Return our data array
            } catch (err) {
                reject(err.toString());
            }
        });

        var data = [];
        // ok, let's log blog titles...
        for (var i = 0; i < result.length; i++) {
            //console.log('Post: ' + result[i].title + ' URL: ' + result[i].url);
            await page.goto(result[i].url)
            element = await page.$('div.iconedBody.js_like_icon_body > h2');
            let header = await page.evaluate(el => el.textContent, element)
            element = await page.$('div.iconedBody.js_like_icon_body > div.kdescription.blog-desc');
            let desc = await page.evaluate(el => el.textContent, element)
            data.push({
                'title': header,
                'url': result[i].url,
                'desc' : desc,
                 'page' :pagenum
            });
        }

        writeToFile(data,'outdata.json')
    }
            // let's close the browser
            await browser.close();
})()

function writeToFile (newdata, path) { 

    var olddata = fs.readFileSync(path)
    var myObject = JSON.parse(olddata);
    //console.log(myObject)
    // Adding the new data to our object
    myObject = myObject.concat(newdata);
    //console.log(myObject)
    // Writing to our JSON file
    var newData2 = JSON.stringify(myObject);
    fs.writeFile(path, newData2, (err) => {
    // Error checking
    if (err) throw err;
    console.log("New data added");
    })
  }