const fs = require('fs');
const Discord = require('discord.js');
const client = new Discord.Client();

client.login(process.env.DISCORD_TOKEN);

let sddMessages = {};

client.on('ready', () => {
    console.log('Connected');
    /** @type {Discord.Guild} */
    const sdd = client.guilds.filter(e => e.name === 'Salon des développeurs').first();
    const chans = sdd.channels.filter(e => e instanceof Discord.TextChannel && e.name !== 'bots');
    chans.map(chan => fetchAllMessages(chan, messages => {
        sddMessages[chan.name] = messages.map(m => {
            return {
                id: m.id,
                content: m.content,
                author: m.author.id,
                date: m.createdTimestamp
            };
        });
        console.log('\r' + chan.name, 'fetched');
        process.stdout.write(Object.keys(sddMessages).length + '/' + chans.size);
        if (Object.keys(sddMessages).length === chans.length) {
            fs.writeFileSync('./sddMessages.json', JSON.stringify(sddMessages));
            process.stdout.write('\n');
            process.exit(0);
        }
    }));
});

/**
 * Callback for fetchAllMessages
 *
 * @callback fetchAllMessagesCallback
 * @param {Discord.Message[]} messages
 */

/**
 * Fetches all the messages from a given channel
 *
 * @param {Discord.TextChannel} channel
 * @param {fetchAllMessagesCallback} finalCallback
 */
const fetchAllMessages = (channel, finalCallback) => {
    /* @type {Discord.Collection} */
    let fullList = new Discord.Collection();
    const fetchCallback = messages => {
        fullList = fullList.concat(messages);
        if (messages.size === 100) channel.fetchMessages({
            limit: 100,
            before: messages.last().id
        }).then(fetchCallback);
        // If size is less than 100, we fetched all the messages
        else finalCallback(fullList.array());
    };
    channel.fetchMessages({
        limit: 100
    }).then(fetchCallback);
};
