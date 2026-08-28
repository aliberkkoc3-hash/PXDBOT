const { ActivityType } = require('discord.js');

module.exports = {
    name: 'clientReady',
    once: true, // Sadece bir kez, bot ilk açıldığında çalışsın
    execute(client) {
        console.log(`🤖 ${client.user.tag} başarıyla Discord'a bağlandı!`);

        // Botun durumunu (Oynuyor kısmı) ayarlıyoruz
        client.user.setActivity('PXDBOT Linux', { type: ActivityType.Playing });
    },
};
