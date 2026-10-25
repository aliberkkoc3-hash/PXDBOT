const { getGuildSettings } = require('../../utils/guildSettings');

module.exports = {
    name: 'help',
    description: 'Botun tüm komutlarını kategorize şekilde listeler.',
    execute(message, args, client) {
        const categories = {};
        const prefix = message.guild ? getGuildSettings(message.guild.id).prefix : 'PXD-';

        // Komutları kategorilerine göre grupla
        client.commands.forEach(command => {
            const category = command.category || 'Diğer';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(command);
        });

        const embed = {
            color: 0x5865F2, // PixelCore Mavisi
            title: `📚 PXD Komut Listesi`,
            description: `Aşağıda botun sahip olduğu tüm aktif komutlar kategorilerine göre listelenmiştir.\nKomutları tetiklemek için prefix: \`${prefix}\``,
            thumbnail: {
                url: client.user.displayAvatarURL({ dynamic: true })
            },
            fields: [],
            // footer alanını senin için daha kurumsal ve detaylı hale getirdim kanka
            footer: {
                text: `PXD • Toplam ${client.commands.size} aktif komut devrede!`,
                icon_url: client.user.displayAvatarURL({ dynamic: true }) // İkon artık botun kendi avatarı
            },
            timestamp: new Date()
        };

        // Kategorileri alanlara (fields) böl
        for (const [categoryName, commands] of Object.entries(categories)) {
            const commandList = commands
                .map(cmd => `\`${prefix}${cmd.name}\` - *${cmd.description || 'Açıklama yok.'}*`)
                .join('\n');

            embed.fields.push({
                name: `📁 ${categoryName}`,
                value: commandList,
                inline: false
            });
        }

        return message.reply({ embeds: [embed] });
    }
};
