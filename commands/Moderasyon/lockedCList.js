const { PermissionFlagsBits, ChannelType } = require('discord.js');
const config = require('../../config.json');

module.exports = {
    name: 'lockedlist',
    description: 'Sunucuda şu an kilitli olan tüm yazı kanallarını listeler.',
    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels) && message.author.id !== config.botOwner) {
            return message.reply('❌ Bu listeyi görmek için yetkin yetersiz kanka.');
        }

        const channels = message.guild.channels.cache;

        const lockedChannels = channels.filter(channel => {
            if (channel.type !== ChannelType.GuildText) return false;
            const overwrite = channel.permissionOverwrites.cache.get(message.guild.roles.everyone.id);
            return overwrite && overwrite.deny.has(PermissionFlagsBits.SendMessages);
        });

        const embed = {
            color: 0x5865F2, // PixelCore Mavi tonu
            title: '🔒 Kilitli Kanallar Listesi',
            footer: {
                text: `PXDBOT`,
                icon_url: message.author.displayAvatarURL({ dynamic: true })
            },
            timestamp: new Date()
        };

        if (lockedChannels.size === 0) {
            embed.description = 'Şu anda sunucuda kilitli herhangi bir yazı kanalı bulunmuyor. Her yer açık! 🔓';
        } else {
            const channelList = lockedChannels.map(channel => `• <#${channel.id}>`).join('\n');
            embed.description = `Şu anda aşağıda listelenen **${lockedChannels.size}** kanal mesaj gönderimine kapalı:\n\n${channelList}`;
        }

        return message.reply({ embeds: [embed] });
    }
};
