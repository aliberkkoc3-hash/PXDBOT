const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'avatar',
    description: 'Bir kullanıcının veya kendinizin avatarını gösterir.',
    async execute(message, args, client) {
        const target = message.mentions.users.first() || message.author;

        // Avatar linkini kaliteli (1024px) ve dinamik (GIF ise gif olarak) alalım
        const avatarUrl = target.displayAvatarURL({ dynamic: true, size: 1024 });

        const embed = new EmbedBuilder()
            .setColor(0x00FFFF)
            .setTitle(`🖼️ ${target.username} adlı kullanıcının avatarı`)
            .setImage(avatarUrl)
            .setDescription(`[Avatar Linki](${avatarUrl})`)
            .setTimestamp()
            .setFooter({ text: 'PXD Eğlence', iconURL: client.user.displayAvatarURL() });

        message.reply({ embeds: [embed] });
    }
};
