const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

console.log("Loaded Token:", process.env.BOT_TOKEN ? "✅ Exists" : "❌ Not Found");
const TOKEN = process.env.BOT_TOKEN;

let GUILD_ID;
let CHANNEL_ID;
let MESSAGE_ID;
let ROLE_ID;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
    ],
});

client.once('ready', () => console.log(`Logged in as ${client.user.tag}`));

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const args = message.content.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    const command = args.shift().toLowerCase();

    if (command === '!setreactstorole') {
        if (args.length < 2 || args.length > 3) {
            return message.reply("Usage: `!setreactstorole <message_id> <role_id> [channel_id]`");
        }

        const messageId = args[0];
        const roleName = args[1].replace(/"/g, '');
        const channelName = args[2] || message.channel.name; // Use provided channel name or default to current channel

        // Find the role by name
        const role = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
        if (!role) {
            return message.reply(`❌ Role "${roleName}" not found.`);
        }

        // Find the channel by name (if specified)
        let targetChannel = message.channel;
        if (channelName !== message.channel.name) {
            targetChannel = message.guild.channels.cache.find(c => c.name.toLowerCase() === channelName.toLowerCase() && c.isTextBased());
            if (!targetChannel) {
                return message.reply(`❌ Channel "${channelName}" not found.`);
            }
        }

        GUILD_ID = message.guild.id; // Automatically get guild ID
        CHANNEL_ID = targetChannel.id;
        MESSAGE_ID = messageId;
        ROLE_ID = role.id;

        const statusMessage = await message.reply("⏳ Assigning roles to reacting users...");
        await assignRoles();
        statusMessage.edit("✅ Role assignment complete!");
    }
});

async function assignRoles() {
    if (!GUILD_ID || !CHANNEL_ID || !MESSAGE_ID || !ROLE_ID) {
        console.log("❌ Missing variables. Try again or contact support.");
        return;
    }

    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        const channel = await guild.channels.fetch(CHANNEL_ID);
        const message = await channel.messages.fetch(MESSAGE_ID);

        console.log(`📨 Fetching reactions from message: "${message.content}"`);

        for (const reaction of message.reactions.cache.values()) {
            const users = await reaction.users.fetch();

            for (const user of users.values()) {
                if (user.bot) continue;

                const member = await guild.members.fetch(user.id).catch(() => null);
                if (member) {
                    await member.roles.add(ROLE_ID).catch(console.error);
                    console.log(`✅ Assigned role to ${member.user.tag}`);
                }
            }
        }

        console.log("🎉 Role assignment complete!");
    } catch (error) {
        console.error("❌ Error fetching message or assigning roles:", error);
    }
}

client.login(TOKEN);