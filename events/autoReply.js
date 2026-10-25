const fs = require('fs');
const path = require('path');
const { getGuildSettings } = require('../utils/guildSettings');

// JSON dosyamızın yolunu belirtiyoruz
const repliesPath = path.join(__dirname, '../data/autoreplies.json');

module.exports = {
    name: 'messageCreate', // Bu dosya da mesajları dinleyecek
    once: false,
    async execute(message, client) {
        // Mesaj bir bottan geliyorsa hiçbir şey yapma
        if (message.author.bot || !message.guild) return;
        if (!getGuildSettings(message.guild.id).autoReplyEnabled) return;

        // JSON dosyamız var mı kontrol et
        if (fs.existsSync(repliesPath)) {
            try {
                // Anlık olarak JSON'u oku (botu yeniden başlatmadan güncellemeleri alır)
                const autoReplies = JSON.parse(fs.readFileSync(repliesPath, 'utf-8'));
                
                // Kullanıcının yazdığı mesajı küçük harfe çevirip sağdaki soldaki boşlukları siliyoruz
                const cleanedMessage = message.content.toLowerCase().trim();

                // Eğer JSON'da bu kelimeye karşılık gelen bir cevap varsa fırlat
                if (autoReplies[cleanedMessage]) {
                    return message.reply(autoReplies[cleanedMessage]);
                }
            } catch (error) {
                console.error("[AutoReply/Error]: Dosya okunurken bir sorun çıktı:", error);
            }
        }
    }
};