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
        console.log('\r\x1b[32m#' + chan.name, '\x1b[0mfetched');
        process.stdout.write(fetchedCount + '/' + chans.size);
        if (fetchedCount === chans.size) {
            console.log('\nRemoving duplicate messages');
            const noDupesMessages = Object.assign(
                ...Object.entries(sddMessages).map(([key, value]) => ({
                    [key]: [...value.reduce((map, value) => map.set(value.id, value), new Map()).values()]
                }))
            );
            process.stdout.write('Writing \x1b[32m./sddMessages.json\x1b[0m\t');
            fs.writeFileSync('./sddMessages.json', JSON.stringify(noDupesMessages));
            console.log('DONE');
            doStats(noDupesMessages);
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
 * Fetch every msg after a given one
 *
 * @param {Discord.TextChannel} channel the channel to fetch the messages on
 * @param {Object[]} knownMessages list of known messages, as objects
 * @param {fetchResultCallback} callback
 */
const fetchAfter = (channel, knownMessages, callback) => {
    if (!knownMessages || !knownMessages.length) {
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
        }).then(fetchCallback).catch(err => console.trace(err));
        else callback(allMessages);
    };
    channel.fetchMessages({
        limit: 100,
        after: allMessages[0].id
    }).then(fetchCallback).catch(err => console.trace(err));
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
        }).then(fetchCallback).catch(err => console.trace(err));
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

/**
 * Generate statistics about the messages fetched
 *
 * @param {Object} channels
 */
const doStats = (channels) => {
    const now = Date.now();
    const messages = Object.keys(channels).map(channel => channels[channel]).reduce((acc, val) => acc.concat(val), []);
    const lastWeekMessages = messages.filter(({date}) => now - date < 7 * 24 * 60 * 60 * 1000);
    const authorActivity = lastWeekMessages.reduce((acc, msg) => ({...acc, [msg.author]: (acc[msg.author] || 0) + 1}), {});
    const authorActivityArray = Object.keys(authorActivity).map(author => ({author, messages: authorActivity[author]}));
    const ranking = authorActivityArray.sort(({messages: a}, {messages: b}) => b - a).slice(0, 10);
    process.stdout.write('Writing \x1b[32m./lastWeekStats.json\x1b[0m\t');
    fs.writeFileSync('./lastWeekStats.json', JSON.stringify(ranking));
    console.log('DONE');
    displayRanking(ranking);
};

/**
 * Display the ranking on the command line
 *
 * @param {Object[]} ranking the ranking as an ordered array of authors and their amount of messages
 */
const displayRanking = ranking => {
    const sddMembers = client.guilds.get('186941943941562369').members;
    const rankingWithUsername = ranking.reduce((acc, {author, messages}) => {
        const member = sddMembers.get(author);
        return [...acc, [member.nickname || member.user.username, messages]];
    }, []);
    const maxLength = Math.max(...rankingWithUsername.map(el=>el[0].length)) + 2;
    const maxAmount = Math.max(...rankingWithUsername.map(el=>el[1]));
    console.log('┌' + '─'.repeat(maxLength) + '┬' + '─'.repeat(maxAmount.toString().length + 2) + '┐');
    const verticalDelimiter = '│';
    rankingWithUsername.forEach(([username, messages]) => {
        console.log(verticalDelimiter
            + ' '.repeat(Math.floor((maxLength-username.length)/2))
            + username
            + ' '.repeat(Math.ceil((maxLength-username.length)/2)) 
            + verticalDelimiter + ' '
            + messages
            + ' '.repeat(maxAmount.toString().length - messages.toString().length + 1)
            + verticalDelimiter);
    });
    console.log('└' + '─'.repeat(maxLength) + '┴' + '─'.repeat(maxAmount.toString().length + 2) + '┘');
};
