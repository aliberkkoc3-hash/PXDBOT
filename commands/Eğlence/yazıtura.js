const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'yazıtura',
    description: 'Parayı havaya fırlatır, yazı mı tura mı görelim!',
    async execute(message, args, client) {
        const sonuclar = ['Yazı 🪙', 'Tura 🪙'];
        const rastgele = sonuclar[Math.floor(Math.random() * sonuclar.length)];

        const embed = new EmbedBuilder()
            .setColor(0xFFAA00)
            .setTitle('🪙 Para Fırlatıldı!')
            .setDescription(`**${message.author.username}** parayı havaya attı...\n\nSonuç: **${rastgele}**`)
            .setTimestamp()
            .setFooter({ text: 'PXD Eğlence', iconURL: client.user.displayAvatarURL() });

        message.reply({ embeds: [embed] });
    }
};
