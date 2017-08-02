const fs = require('fs');
const Discord = require('discord.js');
const client = new Discord.Client();

client.login(process.env.DISCORD_TOKEN);

let sddMessages = {};
let fetchedCount = 0;

client.on('ready', () => {
    console.log('Connected');
    if (fs.existsSync('./sddMessages.json')) {
        console.log('loading existing messages from sddMessages.json');
        sddMessages = JSON.parse(fs.readFileSync('./sddMessages.json'));
    }
    /** @type {Discord.Guild} */
    const sdd = client.guilds.filter(e => e.name === 'Salon des développeurs').first();
    /* @type {Discord.Collection} */
    const chans = sdd.channels.filter(e => e instanceof Discord.TextChannel && e.name !== 'bots' && e.id !== '214888058862960651');
    chans.map(chan => fetchAfter(chan, sddMessages[chan.name], messages => {
        sddMessages[chan.name] = messages;
        fetchedCount++;
        console.log('\r' + chan.name, 'fetched');
        process.stdout.write(fetchedCount + '/' + chans.size);
        if (fetchedCount === chans.size) {
            process.stdout.write('\nWriting file...');
            fs.writeFileSync('./sddMessages.json', JSON.stringify(sddMessages));
            console.log(' DONE');
            process.exit(0);
        }
    }));
});

/**
 * Callback for fetching functions
 *
 * @callback fetchResultCallback
 * @param {Object[]} messages
 */

/**
 * Fetch every message after a given one
 *
 * @param {Discord.TextChannel} channel the channel to fetch the messages on
 * @param {Object[]} knownMessages list of known messages, as objects
 * @param {fetchResultCallback} callback
 */
const fetchAfter = (channel, knownMessages, callback) => {
    if (!knownMessages && !knownMessages.length) {
        console.log(channel.name, 'has never been fetched before. Doing a complete fetch');
        fetchAllMessages(channel, callback);
        return;
    }
    let allMessages = knownMessages;
    const fetchCallback = messages => {
        allMessages = allMessages.concat(messages.map(m => {
            return {
                id: m.id,
                content: m.content,
                author: m.author.id,
                date: m.createdTimestamp
            };
        }));
        // console.log(messages.size, allMessages.length);
        if (messages.size === 100) channel.fetchMessages({
            limit: 100,
            after: messages.first().id
        }).then(fetchCallback);
        else callback(allMessages);
    };
    channel.fetchMessages({
        limit: 100,
        after: allMessages[0].id
    }).then(fetchCallback);
};

/**
 * Fetches all the messages from a given channel
 *
 * @param {Discord.TextChannel} channel
 * @param {fetchResultCallback} callback
 */
const fetchAllMessages = (channel, callback) => {
    /* @type {Discord.Collection} */
    let fullList = new Discord.Collection();
    const fetchCallback = messages => {
        fullList = fullList.concat(messages);
        if (messages.size === 100) channel.fetchMessages({
            limit: 100,
            before: messages.last().id
        }).then(fetchCallback);
        // If size is less than 100, we fetched all the messages
        else callback(fullList.array().map(m => {
            return {
                id: m.id,
                content: m.content,
                author: m.author.id,
                date: m.createdTimestamp
            };
        }));
    };
    channel.fetchMessages({
        limit: 100
    }).then(fetchCallback);
};
