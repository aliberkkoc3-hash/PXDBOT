const config = require('../../config.json'); // İki klasör geriye çıktık (Genel > commands > config.json)
const os = require('os');

module.exports = {
    name: 'botinfo',
    description: 'Bot hakkında teknik bilgileri gösterir.',
    execute(message, args, client) {
        const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const totalMemory = (os.totalmem() / 1024 / 1024).toFixed(2);

        const embed = {
            color: 0x5865F2,
            title: `🤖 ${client.user.username} Bilgileri`,
            thumbnail: {
                url: client.user.displayAvatarURL({ dynamic: true })
            },
            fields: [
                { name: '👨‍💻 Geliştirici', value: `<@${config.botOwner}>`, inline: true },
                { name: '📚 Kütüphane', value: 'Discord.js v14', inline: true },
                { name: '⏱️ Çalışma Süresi', value: `<t:${Math.floor((Date.now() - client.uptime) / 1000)}:R>`, inline: true },
                { name: '💾 Bellek Kullanımı', value: `${memoryUsage} MB / ${totalMemory} MB`, inline: false },
                { name: '🌐 Sunucular', value: `${client.guilds.cache.size} Sunucu`, inline: true },
                { name: '👥 Kullanıcılar', value: `${client.users.cache.size} Kullanıcı`, inline: true }
            ],
            footer: {
                text: `PXD • Node.js ${process.version}`,
                icon_url: message.author.displayAvatarURL({ dynamic: true })
            },
            timestamp: new Date()
        };

        message.reply({ embeds: [embed] });
    }
};
