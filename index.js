const axios = require('axios')
const fs = require('fs')
const nodemailer = require('nodemailer')
const dateFormat = require('dateformat')

require('dotenv').config({ path: __dirname + '/.env' })

const URL_ITEMS = 'https://hacker-news.firebaseio.com/v0/beststories.json?print=pretty'
const URL_DETAILS = 'https://hacker-news.firebaseio.com/v0/item/'
const URL_ITEM = 'https://news.ycombinator.com/item?id='
const FILE_ITEMS = 'items.json'

//------------------------------------------------

main()

async function main() {
    try {
        let items = []
        let new_items = []

        if (!fs.existsSync(FILE_ITEMS)) {
            let data = JSON.stringify(items)
            fs.writeFileSync(FILE_ITEMS, data)
        }

        items = JSON.parse(fs.readFileSync(FILE_ITEMS))

        let response = await axios.get(URL_ITEMS)
        let best_items = response.data
        best_items = best_items.slice(0, 60)
        new_items = best_items.filter((i) => !items.includes(i))

        if (new_items.length == 0) {
            console.log('There are no new items')
            return
        } else {
            console.log('New items found:', new_items.length)
        }

        let items_details = []

        await Promise.all(
            new_items.map(async (item) => {
                const response = await await axios.get(URL_DETAILS + item + '.json?print=pretty')
                items_details.push(response.data)
                console.log(response.data.title, response.data.score)
            })
        )

        items_details.sort(
        	(a, b) => b.score - a.score
        )

        let html = '<div>'
        for (item of items_details) {
            html += `<h2><a href="${item.url}">${item.title}</a></h2>`
            html += `<p>Score: ${item.score}</p>`
            html += `<a href="${URL_ITEM + item.id}">Comments (${
                item.descendants ? item.descendants : 0
            })</a>`
        }
        html += '</div>'

        nodemailer.createTestAccount((err, account) => {
            if (err) {
                console.log(err)
                return
            }

            let transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER, //Gmail username
                    pass: process.env.EMAIL_PWD, // Gmail password
                },
            })

            let mailOptions = {
                from: '"Hackernews Best" <hackernewsbest@svd.com>',
                to: process.env.EMAIL_TO, // Recepient email address. Multiple emails can send separated by commas
                subject: 'Hackernews Best ' + dateFormat(new Date(), 'dd/mm/yyyy'),
                html: html,
            }

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    return console.log(error)
                }
                console.log('Message sent: %s', info.messageId)

                items = items.concat(new_items)
                fs.writeFileSync(FILE_ITEMS, JSON.stringify(items))
            })
        })
    } catch (error) {
        console.log(error)
    }
}
