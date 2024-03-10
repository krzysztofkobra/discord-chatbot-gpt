const { Client, GatewayIntentBits, ActivityType} = require('discord.js');
const config = require('./config.json');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { OpenAI } = require('openai');

const CHANNELS = ['channels id bot will interact with'];
const IGNORE_PREFIX = 'prefix bot will ignore like !';

const openai = new OpenAI({
    apiKey: config.aitoken,
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity({
            name: "anything u want",
            type: ActivityType.Listening,
            });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!CHANNELS.includes(message.channelId) && !message.mentions.users.has(client.user.id)) return;
    if (message.content.startsWith(IGNORE_PREFIX)) return;

    await message.channel.sendTyping();

    const sendTypingInterval = setInterval(() => {
        message.channel.sendTyping();
    }, 5000);

    let conversation = [];

    conversation.push({
        role: 'system',
        content: 'coss',
    });

    let prevMessages = await message.channel.messages.fetch({ limit: 10 });
    prevMessages.reverse();

    prevMessages.forEach((msg) => {
        if(msg.author.bot && msg.author.id !== client.user.id) return;
        if(msg.content.startsWith(IGNORE_PREFIX)) return;

        const username = msg.author.username.replace(/\s+/g, '_').replace(/[^\w\s]/gi, '');

        if(msg.author.id === client.user.id){
            conversation.push({
                role: 'assistant',
                name: username,
                content: msg.content,
            })
            return;
        }
        conversation.push({
            role: 'user',
            name: username,
            content: msg.content,
        })
    })

    const response = await openai.chat.completions.create({
        model: 'select from the list of models',
        messages: conversation,
          
    }).catch((error) => console.error('OPENAI ERROR: \n', error));

    clearInterval(sendTypingInterval);

    if(!response){
        console.error("There's an issue with the response from OpenAI.");
        message.reply("jest lekki problem");
        return;
    }

    const responseMessage = response.choices[0].message.content;
    const chunkSizeLimit = 2000;

    for(let i = 0; i < responseMessage.length; i += chunkSizeLimit) {
        const chunk = responseMessage.substring(i, i+chunkSizeLimit);
        
        console.log(`Chunk[${i}]:`, chunk);
    
        if (chunk) { 
            try {
                await message.reply(chunk);
                console.log(`Sent chunk[${i}] successfully`);
            } catch (error) {
                console.error(`Error sending chunk[${i}]:`, error.message);
            }
        }
    }

});

client.login(config.token);
