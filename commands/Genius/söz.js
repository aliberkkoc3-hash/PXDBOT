const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Client: GeniusClient } = require('genius-lyrics');
const config = require('../../config.json');
const genius = new GeniusClient(config.geniusToken);

module.exports = {
    name: 'söz',
    description: 'Aratılan şarkının sözlerine giden bağlantıyı getirir.',
    async execute(message, args, client) {
        const aramaSorgusu = args.join(' ');
        if (!aramaSorgusu) return message.reply('⚠️ Kanka hangi şarkıyı aratıyoruz? Örnek: `pixel-söz Blinding Lights`');

        try {
            const aramalar = await genius.songs.search(aramaSorgusu);
            const sarki = aramalar[0];

            if (!sarki) return message.reply('❌ Aradığın şarkıyı Genius kayıtlarında bulamadım kanka.');

            const embed = new EmbedBuilder()
                .setColor(0xFFFF00) // Genius Sarısı
                .setTitle(`🎵 ${sarki.title}`)
                .setAuthor({ name: sarki.artist.name, iconURL: sarki.artist.image })
                .setDescription(`Cloudflare engellerini aştık kanka! **${sarki.title}** şarkısının tüm orijinal sözlerine aşağıdaki butona tıklayarak Genius üzerinden ışık hızıyla ulaşabilirsin. 🚀`)
                .setThumbnail(sarki.thumbnail)
                .setTimestamp()
                .setFooter({ text: 'PXD Müzik', iconURL: client.user.displayAvatarURL() });

            // Şarkı sözü sayfasına gitmesi için şık bir buton ekliyoruz
            const buton = new ButtonBuilder()
                .setLabel('Şarkı Sözlerini Oku 🎤')
                .setURL(sarki.url)
                .setStyle(ButtonStyle.Link);

            const row = new ActionRowBuilder().addComponents(buton);

            message.reply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error(error);
            message.reply('❌ Şarkı aranırken sistemsel bir hata oluştu kanka.');
        }
    }
};
