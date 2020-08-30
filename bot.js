require('dotenv').config()

var Discord = require('discord.js')
const bot = new Discord.Client()
bot.login(process.env.DISCORD_TOKEN)

const Parser = require("steamid-parser")

const parser = new Parser(process.env.STEAM_API_KEY, {
    checkForAccountID: false,
    checkNumberForVanity: false
})

const TWITCH_SUB_ROLE = process.env.TWITCH_SUB_ROLE
const WHITELIST_FILENAME = process.env.WHITELIST_FILENAME
const DH_USER = process.env.DH_USER
const DH_PASS = process.env.DH_PASS
const DH_SERVER_ID = process.env.DH_SERVER_ID
const WHITELIST_CHANNEL_ID = process.env.WHITELIST_CHANNEL_ID
const TWITCH_MOD_ROLE_ID = process.env.TWITCH_MOD_ROLE_ID

const k = require('keyv');

const db_string = "postgresql://" + process.env.DB_USER + ":" + process.env.DB_PASS + "@" + process.env.DB_HOST + ":" + process.env.DB_PORT + "/" + process.env.DB_DATABASE_NAME
const db = new k(db_string)

var fs = require('fs');
const request = require('request-promise');

var currMessage = null

db.on('error', err => console.log('Connection Error', err));

bot.on('ready', function(evt) {
    console.log("bot connected")
    bot.user.setActivity("by rush2sk8", { type: "STREAMING", url: "https://www.twitch.tv/nykan" })
})

bot.on('message', async (message) => {
    print(message.content)
    currMessage = message
    var content = message.content

    if (message.channel.id == WHITELIST_CHANNEL_ID) {

        if (content.match(/http(s)?:\/\/steamcommunity\.com\/(profiles|id)\//g) ||
		content.match(/^STEAM_[0|2-5]:[01]:\d+$/g)) {

	    if(message.content.startsWith("<") && message.content.endsWith(">")) {
		content = content.slice(1,-1)
	    }
	    
            let s_id = await parser.get(content)
            let renderedSteamID = s_id.getSteam2RenderedID(true)

            await db.set(message.author.id, renderedSteamID)
            message.author.send(`Added your steamID: \`${renderedSteamID}\` to the whitelist!`)
            print(`Added ${renderedSteamID}`)
	    await reloadSubs(message)
        
	 } else if (content == "!generate" && message.member.roles.has(TWITCH_MOD_ROLE_ID)) {
            await reloadSubs(message)
            print("reloaded subs")
	    message.author.send("Reloaded server")
        }
    }
})

async function reloadSubs(message) {
    let subs = message.guild.roles.get(TWITCH_SUB_ROLE).members.map(member => [member.id, member.username])
    let result = await db.opts.store.query("SELECT * FROM keyv;")

    let map = new Map()

    if (message !== undefined) {
        message.guild.roles.get(TWITCH_SUB_ROLE).members.map(member => map.set(member.id, member.user.username))
    } else {
        bot.guilds.cache.get(GUILD_ID).roles.get(TWITCH_SUB_ROLE).members.map(member => map.set(member.id, member.user.username))
    }

    var whitelist = ""

    result.forEach((v, k) => {
        let discord_id = String(v["key"]).slice(5)
        let steam_id = JSON.parse(String(v["value"]))["value"]

        if (map.has(discord_id)) {
            whitelist += steam_id + "  \/\/" + map.get(discord_id) + "\n"
        }
    })

    //write string to file
    fs.writeFile(WHITELIST_FILENAME, whitelist, (err) => {
        console.log("done")

        request({
                url: `https://dathost.net/api/0.1/game-servers/${DH_SERVER_ID}/files/addons/sourcemod/configs/${WHITELIST_FILENAME}`,
                method: 'POST',
                auth: {
                    user: DH_USER,
                    password: DH_PASS
                },
                formData: {
                    file: fs.createReadStream(WHITELIST_FILENAME)
                }
            })
            .then(() => {
                console.log(`uploaded ${WHITELIST_FILENAME}`)

                request({
                        url: `https://dathost.net/api/0.1/game-servers/${DH_SERVER_ID}/console`,
                        method: 'POST',
                        auth: {
                            user: DH_USER,
                            password: DH_PASS
                        },
                        formData: {
                            line: "sm_whitelist_reload; sm_say whitelist reloaded"
                        }
                    })
                    .then(() => { console.log("finished reloading") })
                    .catch(console.error)
            })
            .catch(console.error)
    })
}

setInterval(async function() {
    await reloadSubs(currMessage)
    console.log("reloaded")
}, parseInt(process.env.TIME_RELOAD) * 60000)

function print(x) { console.log(x) }

/* sudo apt update
sudo apt install postgresql postgresql-contrib
sudo -i -u postgres
pg_ctlcluster 12 main start
sudo -i -u postgres

sudo -u postgres psql
\password
*/
