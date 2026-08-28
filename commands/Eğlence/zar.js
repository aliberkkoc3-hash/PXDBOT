const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'zar',
    description: 'Zar atar.',
    async execute(message, args, client) {
        const zar = Math.floor(Math.random() * 6) + 1;

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🎲 Zar Atıldı!')
            .setDescription(`**${message.author.username}** zarı fırlattı ve gelen sayı: **${zar}**!`)
            .setTimestamp()
            .setFooter({ text: 'PXD Eğlence', iconURL: client.user.displayAvatarURL() });

        message.reply({ embeds: [embed] });
    }
};
