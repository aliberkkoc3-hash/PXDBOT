const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'kaç-cm',
    description: 'Malum ölçüyü santimetre cinsinden ölçer (tamamen eğlence amaçlıdır).',
    async execute(message, args, client) {
        // Bahsi geçen kullanıcıyı veya mesajı yazanı hedef alalım
        const target = message.mentions.users.first() || message.author;
        const boy = Math.floor(Math.random() * 50) + 1; // 1 ile 50 cm arası rastgele sayı

        // Boyutlara göre eğlenceli yorumlar ekleyelim
        let yorum = 'Fena değil kanka, idare eder! 😉';
        if (boy < 10) yorum = 'Geçmiş olsun kanka, soğuktan büzüşmüş herhalde... ❄️';
        if (boy > 30) yorum = 'Yavaşşş kanka, ruhsat aldın mı buna? 🦖';

        const embed = new EmbedBuilder()
            .setColor(0xFF55FF)
            .setTitle('📏 Ölçüm Sonucu')
            .setDescription(`**${target.username}** adlı üyenin ölçüm sonucu:\n\nBoyut: **${boy} cm**\n\n_${yorum}_`)
            .setTimestamp()
            .setFooter({ text: 'PXD Eğlence', iconURL: client.user.displayAvatarURL() });

        message.reply({ embeds: [embed] });
    }
};
