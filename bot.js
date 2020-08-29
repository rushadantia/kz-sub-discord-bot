require('dotenv').config()

var Discord = require('discord.js')
const bot = new Discord.Client()
bot.login(process.env.DISCORD_TOKEN)

const k = require('keyv');

const db_string = "postgresql://" + process.env.DB_USER + ":" + process.env.DB_PASS + "@" + process.env.DB_HOST + ":" + process.env.DB_PORT + "/" + process.env.DB_DATABASE_NAME
const db = new k(db_string)

db.on('error', err => console.log('Connection Error', err));

bot.on('ready', function(evt) {
    console.log("bot connected")
    bot.user.setActivity(".help | by rush2sk8", { type: "STREAMING", url: "https://www.twitch.tv/rush2sk8" })
})

bot.on('message', async (message) => {
	print(message.content)

    const content = message.content

    if (message.channel.id == 749366923627593839) {

    	let id = content.match(/^STEAM_[0-5]:[01]:\d+$/g)

        if (id) {
        	print("added " + id[0] + " to db")
        	//await db.set(message.author.id, id[0])
        }
    }

})


function print(x) { console.log(x) }
/* sudo apt update
sudo apt install postgresql postgresql-contrib
sudo -i -u postgres
pg_ctlcluster 12 main start
sudo -i -u postgres

sudo -u postgres psql
\password
*/