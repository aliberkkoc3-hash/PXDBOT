const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Client: GeniusClient } = require('genius-lyrics');
const config = require('../../config.json');
const genius = new GeniusClient(config.geniusToken);

module.exports = {
    name: 'sanatçı',
    description: 'Aratılan sanatçının profilini ve bilgilerini getirir.',
    category: 'Genius',
    async execute(message, args, client) {
        const sanatciAdi = args.join(' ');
        if (!sanatciAdi) return message.reply('⚠️ Hangi sanatçıyı aratıyoruz kanka? Örnek: `pixel-sanatçı Ezhel`');

        try {
            const sanatciAraması = await genius.artists.search(sanatciAdi);
            const sanatci = sanatciAraması[0];

            if (!sanatci) return message.reply('❌ Bahsettiğin sanatçıyı Genius veritabanında bulamadım.');

            const embed = new EmbedBuilder()
                .setColor(0xFFFF00)
                .setTitle(`👤 Sanatçı Profili: ${sanatci.name}`)
                .setDescription(`Sanatçının en popüler şarkılarına, albümlerine ve biyografisine aşağıdaki butona tıklayarak doğrudan resmi Genius profili üzerinden ulaşabilirsin kanka.`)
                .setThumbnail(sanatci.image)
                .setTimestamp()
                .setFooter({ text: 'PXD Sanat', iconURL: client.user.displayAvatarURL() });

            const buton = new ButtonBuilder()
                .setLabel('Genius Profilini İncele 🔗')
                .setURL(sanatci.url)
                .setStyle(ButtonStyle.Link);

            const row = new ActionRowBuilder().addComponents(buton);

            message.reply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error(error);
            message.reply('❌ Sanatçı bilgileri çekilirken bir sorun oluştu.');
        }
    }
};
