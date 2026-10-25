const { PermissionFlagsBits } = require('discord.js');
const config = require('../config.json');
const { sendLog } = require('../utils/logger'); // Log sistemini çağırıyoruz
const { getGuildSettings } = require('../utils/guildSettings');

const userData = new Map();
const LIMIT = 4;
const TIME_WINDOW = 3000;

module.exports = {
    name: 'messageCreate',
    once: false,
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;
        if (!getGuildSettings(message.guild.id).antiSpamEnabled) return;

        if (message.author.id === config.botOwner || message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return;
        }

        const userId = message.author.id;
        const trackingKey = `${message.guild.id}:${userId}`;
        const now = Date.now();

        if (!userData.has(trackingKey)) {
            userData.set(trackingKey, {
                timestamps: [now],
                warned: false
            });
            return;
        }

        const userRecord = userData.get(trackingKey);
        userRecord.timestamps = userRecord.timestamps.filter(time => now - time < TIME_WINDOW);
        userRecord.timestamps.push(now);

        if (userRecord.timestamps.length > LIMIT) {
            try {
                await message.delete();

                if (!userRecord.warned) {
                    userRecord.warned = true;
                    
                    const warnMsg = await message.channel.send(`🚨 <@${userId}>, çok hızlı yazıyorsun kanka, biraz yavaşla! (Spam Yasaktır)`);
                    setTimeout(() => warnMsg.delete().catch(() => {}), 5000);

                    // 🚨 YETKİLİ LOGU GÖNDERİLİYOR
                    await sendLog(
                        client,
                        'Spam Algılandı',
                        `**Kanal:** <#${message.channel.id}>\n**Kullanıcı:** <@${userId}>\n**Durum:** Limit aşıldı ve kullanıcının son mesajı temizlendi.`,
                        0xFFFF55, // Sarı renk
                        message.author,
                        message.guild.id
                    );
                }
            } catch (error) {
                console.error('[Anti-Spam/Error]: Spam mesajı silinemedi.', error);
            }
        } else {
            userRecord.warned = false;
        }

        userData.set(trackingKey, userRecord);
    }
};