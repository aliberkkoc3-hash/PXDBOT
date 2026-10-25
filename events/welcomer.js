const { getGuildSettings } = require('../utils/guildSettings');

module.exports = {
    name: 'guildMemberAdd',
    once: false,
    async execute(member, client) {
        const settings = getGuildSettings(member.guild.id);
        if (!settings.welcomeEnabled) return;
        const welcomeChannelId = settings.welcomeChannelId;
        if (!welcomeChannelId) return;

        const channel = member.guild.channels.cache.get(welcomeChannelId);
        if (!channel) return console.log(`[Welcomer] config'deki welcomerCId bulunamadı.`);

        // Kullanıcının profil resmini ve sunucu banner'ını çekiyoruz
        const userAvatar = member.user.displayAvatarURL({ dynamic: true, size: 512 });
        const guildIcon = member.guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL();

        const embed = {
            color: 0x5865F2, // PixelCore Mavisi
            title: `🚀 Aramıza Yeni Bir Kan Katıldı!`,
            description: `Selam <@${member.id}>, **${member.guild.name}** dünyasına hoş geldin kankam! Seninle birlikte burası daha da neşeli bir yer olacak. 🎉`,

            // Sağ üst köşeye sunucunun ikonunu koyuyoruz
            thumbnail: {
                url: guildIcon
            },

            // Embed'in tam ortasına kocaman kullanıcının profil fotoğrafını yerleştiriyoruz
            image: {
                url: userAvatar
            },

            fields: [
                {
                    name: '🆔 Kullanıcı Bilgisi',
                    value: `• **Kullanıcı adı:** ${member.user.tag}\n• **ID:** ${member.id}`,
                    inline: true
                },
                {
                    name: '📅 Hesap Kuruluş Tarihi',
                    value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, // Kaç gün/yıl önce açıldığını Discord otomatik gösterir
                    inline: true
                },
                {
                    name: '📊 Toplam Üye Sayısı',
                    value: `Seninle birlikte tam **${member.guild.memberCount}** kişiyiz! 📈`,
                    inline: false
                }
            ],

            footer: {
                text: `PXDBOT Karşılama Sistemi • Keyifli Vakit Geçirmeni Dileriz!`,
                icon_url: client.user.displayAvatarURL({ dynamic: true })
            },
            timestamp: new Date()
        };

        try {
            await channel.send({ content: `🏰 Hoş geldin <@${member.id}>!`, embeds: [embed] });
        } catch (error) {
            console.error(`[Welcomer Hata]: Mesaj gönderilemedi.`, error);
        }
    },
};
