const { PermissionFlagsBits } = require('discord.js');
const config = require('../../config.json');

module.exports = {
    name: 'lock',
    description: 'Komutun yazıldığı kanalı mesaj gönderimine kapatır.',
    async execute(message, args, client) {
        // Yetki kontrolü: Kanalları Yönet yetkisi yoksa ve config'deki botOwner değilse engelle
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels) && message.author.id !== config.botOwner) {
            return message.reply('❌ Bu kanalı kilitlemek için yetkin yetersiz kanka.');
        }

        try {
            await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                SendMessages: false
            });

            const embed = {
                color: 0xED4245, // Kırmızı tonu
                title: '🔒 Kanal Kilitlendi',
                description: `Bu kanal <@${message.author.id}> tarafından muhabbete kapatılmıştır.`,
                footer: {
                    text: `PXDBOT`,
                    icon_url: message.author.displayAvatarURL({ dynamic: true })
                },
                timestamp: new Date()
            };

            return message.reply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            return message.reply('❌ Kanalı kilitlerken bir hata oluştu. Botun rol sırasını kontrol et kanka.');
        }
    }
};
