const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Client: GeniusClient } = require('genius-lyrics');
const config = require('../../config.json');
const genius = new GeniusClient(config.geniusToken);

module.exports = {
    name: 'şarkı-bilgi',
    description: 'Aratılan şarkının künye bilgilerini getirir.',
    category: 'Genius',
    async execute(message, args, client) {
        const aramaSorgusu = args.join(' ');
        if (!aramaSorgusu) return message.reply('⚠️ Hangi şarkının künyesine bakıyoruz kanka? Örnek: `pixel-şarkı-bilgi Starboy`');

        try {
            const aramalar = await genius.songs.search(aramaSorgusu);
            const sarki = aramalar[0];

            if (!sarki) return message.reply('❌ Şarkı bulunamadı kanka.');

            const embed = new EmbedBuilder()
                .setColor(0xFFFF00)
                .setTitle(`📝 Şarkı Künyesi: ${sarki.title}`)
                .setThumbnail(sarki.thumbnail)
                .addFields(
                    { name: '🎤 Ana Sanatçı', value: sarki.artist.name, inline: true },
                    { name: '🆔 Genius ID', value: `\`${sarki.id}\``, inline: true }
                )
                .setDescription(`Şarkı hakkındaki tüm popüler kültür notlarına, yapımcı kadrosuna ve detaylı analizlere aşağıdaki butondan resmi Genius sayfası üzerinden ulaşabilirsin kanka!`)
                .setTimestamp()
                .setFooter({ text: 'PXD Kültür', iconURL: client.user.displayAvatarURL() });

            const buton = new ButtonBuilder()
                .setLabel('Tüm Detayları Gör 📊')
                .setURL(sarki.url)
                .setStyle(ButtonStyle.Link);

            const row = new ActionRowBuilder().addComponents(buton);

            message.reply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error(error);
            message.reply('❌ Şarkı bilgileri çekilirken bir hata yaşandı.');
        }
    }
};
