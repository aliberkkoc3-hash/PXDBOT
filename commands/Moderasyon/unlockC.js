const { PermissionFlagsBits } = require('discord.js');
const config = require('../../config.json');

module.exports = {
    name: 'unlock',
    description: 'Kilitlenmiş olan kanalı tekrar mesaj gönderimine açar.',
    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels) && message.author.id !== config.botOwner) {
            return message.reply('❌ Bu kanalın kilidini açmak için yetkin yetersiz kanka.');
        }

        try {
            await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                SendMessages: null
            });

            const embed = {
                color: 0x57F287, // Yeşil tonu
                title: '🔓 Kanal Kilidi Açıldı',
                description: `Bu kanal <@${message.author.id}> tarafından tekrar muhabbete açılmıştır. Yazın gelsin!`,
                footer: {
                    text: `PXDBOT`,
                    icon_url: message.author.displayAvatarURL({ dynamic: true })
                },
                timestamp: new Date()
            };

            return message.reply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            return message.reply('❌ Kanal kilidini açarken bir hata oluştu. Botun yetkilerini kontrol et kanka.');
        }
    }
};
