const { Client, GatewayIntentBits, Collection, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
    ]
});

client.commands = new Collection();

// Event Yükleyici
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        const event = require(path.join(eventsPath, file));
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
    }
}

// Komut Yükleyici
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFolders = fs.readdirSync(commandsPath);
    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        if (fs.lstatSync(folderPath).isDirectory()) {
            const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                const filePath = path.join(folderPath, file);
                const command = require(filePath);
                command.category = folder;
                client.commands.set(command.name, command);
            }
        }
    }
}

// Web Sunucusu & API
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

function getFormattedUptime() {
    const totalSeconds = Math.floor(process.uptime());
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}

app.get('/', (req, res) => {
    res.send('💚 PXDBOT aktif ve canavar gibi çalışıyor!');
});

app.get('/api/status', (req, res) => {
    res.json({
        bot: 'PXDBOT',
        status: client.ws.ping ? 'online' : 'starting',
        ping: client.ws.ping || 0,
        uptime: getFormattedUptime(),
        timestamp: new Date().toISOString()
    });
});

// Web Sitesinden Gelen Başvuruları Alan API Endpoint
app.post('/api/apply', async (req, res) => {
    try {
        const { discord, age, activeTime, experience, whyYou } = req.body;

        if (!discord || !age || !activeTime || !experience || !whyYou) {
            return res.status(400).json({ success: false, message: 'Eksik alan!' });
        }

        const channelId = process.env.BASVURU_KANAL_ID;
        const channel = await client.channels.fetch(channelId);

        if (!channel) {
            return res.status(500).json({ success: false, message: 'Başvuru kanalı bulunamadı!' });
        }

        const embed = new EmbedBuilder()
            .setTitle("🚀 Yeni Yetkili Başvurusu")
            .setColor(6577905)
            .addFields(
                { name: "👤 Discord Kullanıcı", value: discord, inline: true },
                { name: "🎂 Yaş", value: age, inline: true },
                { name: "⏰ Günlük Aktiflik", value: activeTime, inline: false },
                { name: "💼 Önceki Deneyimler", value: experience, inline: false },
                { name: "⭐ Neden Seni Seçmeliyiz?", value: whyYou, inline: false }
            )
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('basvuru_onayla')
                    .setLabel('Onayla')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('basvuru_reddet')
                    .setLabel('Reddet')
                    .setStyle(ButtonStyle.Danger)
            );

        await channel.send({ embeds: [embed], components: [row] });

        res.json({ success: true, message: 'Başvuru başarıyla Discord kanalına iletildi.' });
    } catch (error) {
        console.error('Başvuru API Hatası:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

app.listen(PORT, () => {
    console.log(`🌐 Web sunucusu ${PORT} portunda aktif.`);
});

client.login(process.env.TOKEN);

const stopBot = () => {
    console.log('\n🛑 PXDBOT kapatılıyor...');
    client.destroy();
    process.exit(0);
};
process.on('SIGINT', stopBot);
process.on('SIGTERM', stopBot);
