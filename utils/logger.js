const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');
const { getGuildSettings } = require('./guildSettings');

/**
 * Belirtilen log kanalına şık bir log mesajı gönderir.
 * @param {import('discord.js').Client} client - Discord Bot Client'ı
 * @param {string} title - Log başlığı
 * @param {string} description - Log açıklaması
 * @param {number} color - Log rengi (hex kod örn: 0xFF0000)
 * @param {object} [author] - Olayı gerçekleştiren kullanıcı bilgisi
 */
async function sendLog(client, title, description, color = 0x5865F2, author = null, guildId = null) {
    // Prefer a server-specific log channel. Legacy fallback is retained for older setup.
    const logChannelId = guildId ? getGuildSettings(guildId).logChannelId : config.logCId;
    if (!logChannelId) return;

    try {
        // Log kanalını buluyoruz
        const channel = await client.channels.fetch(logChannelId).catch(() => null);
        if (!channel) return console.log('[Logger] Log kanalı bulunamadı.');
        // Never send one server's logs into another server's configured channel.
        if (guildId && channel.guild && channel.guild.id !== guildId) return;

        const embed = {
            color: color,
            title: `📋 PXDBOT Log | ${title}`,
            description: description,
            timestamp: new Date(),
            footer: {
                text: 'PXDBOT Güvenlik Sistemi',
                icon_url: client.user.displayAvatarURL()
            }
        };

        if (author) {
            embed.author = {
                name: `${author.tag} (${author.id})`,
                icon_url: author.displayAvatarURL({ dynamic: true })
            };
        }

        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('[Logger/Error]: Log mesajı gönderilemedi.', error);
    }
}

module.exports = { sendLog };
