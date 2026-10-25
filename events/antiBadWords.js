const { PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');
const { sendLog } = require('../utils/logger'); // Log sistemini çağırıyoruz
const { getGuildSettings } = require('../utils/guildSettings');

const badWordsPath = path.join(__dirname, '../data/badWord.json');

const charMap = {
    '1': 'i', 'i': 'i', 'ı': 'i', 'î': 'i',
    '3': 'e', 'ê': 'e',
    '4': 'a', '@': 'a', 'â': 'a',
    '0': 'o', 'ö': 'o', 'ô': 'o',
    'u': 'u', 'ü': 'u', 'û': 'u',
    '5': 's', '$': 's', 'ş': 's',
    'c': 'c', 'ç': 'c',
    'g': 'g', 'ğ': 'g'
};

function normalizeText(text) {
    let clean = text.toLowerCase();
    clean = clean.split('').map(char => charMap[char] || char).join('');
    clean = clean.replace(/[^a-z]/g, '');
    clean = clean.replace(/([a-z])\1+/g, '$1');
    return clean;
}

module.exports = {
    name: 'messageCreate',
    once: false,
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;
        if (!getGuildSettings(message.guild.id).antiBadWordsEnabled) return;

        if (message.author.id === config.botOwner || message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return;
        }

        if (fs.existsSync(badWordsPath)) {
            try {
                const { bannedWords } = JSON.parse(fs.readFileSync(badWordsPath, 'utf-8'));
                const messageContent = message.content.toLowerCase();

                const hasDirectBadWord = bannedWords.some(word => {
                    const regex = new RegExp(`\\b${word.toLowerCase()}\\b`, 'i');
                    return regex.test(messageContent);
                });

                const normalizedMessage = normalizeText(messageContent);
                const hasHiddenBadWord = bannedWords.some(word => {
                    const normalizedWord = normalizeText(word);
                    return normalizedMessage.includes(normalizedWord);
                });

                if (hasDirectBadWord || hasHiddenBadWord) {
                    await message.delete();
                    
                    // Kullanıcıya uyarı mesajı
                    const warnMsg = await message.channel.send(`⚠️ <@${message.author.id}>, lütfen kelimelerimize dikkat edelim kankam! (Küfür/Argo yasaktır)`);
                    setTimeout(() => warnMsg.delete().catch(() => {}), 5000);

                    // 🚨 YETKİLİ LOGU GÖNDERİLİYOR
                    await sendLog(
                        client, 
                        'Küfür/Argo Engellendi', 
                        `**Kanal:** <#${message.channel.id}>\n**Kullanıcı:** <@${message.author.id}>\n**Yazılan Mesaj:**\n\`\`\`${message.content}\`\`\``, 
                        0xFF5555, // Kırmızı renk
                        message.author,
                        message.guild.id
                    );
                }
            } catch (error) {
                console.error('[Anti-BadWords/Error]:', error);
            }
        }
    }
};