const Discord = require('discord.js');
const client = new Discord.Client();

client.login(process.env.DISCORD_TOKEN);

let sddMessages = {};

client.on('ready', () => {
    /** @type {Discord.Guild} */
    const sdd = client.guilds.filter(e => e.name === 'Salon des développeurs').first();
    const chans = sdd.channels.filter(e => e instanceof Discord.TextChannel);
    chans.map(chan => fetchAllMessages(chan, messages => sddMessages[chan.name] = messages));
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
        // console.log(fullList.size);
        if(messages.size === 100) channel.fetchMessages({
            limit: 100,
            before: messages.last().id}).then(fetchCallback);
        else finalCallback(fullList.array());
    };
    channel.fetchMessages({limit: 100}).then(fetchCallback);
};
