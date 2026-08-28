const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'tkm',
    description: 'Bot ile taş-kağıt-makas oynarsınız. Kullanım: pixel-tkm [taş/kağıt/makas]',
    async execute(message, args, client) {
        const secenekler = ['taş', 'kağıt', 'makas'];
        const emojis = { taş: '🪨 Taş', kağıt: '📄 Kağıt', makas: '✂️ Makas' };

        const secim = args[0]?.toLowerCase();

        if (!secim || !secenekler.includes(secim)) {
            return message.reply('⚠️ Lütfen geçerli bir hamle yap kanka! Örnek: `pixel-tkm taş`, `pixel-tkm kağıt` veya `pixel-tkm makas`.');
        }

        const botSecim = secenekler[Math.floor(Math.random() * secenekler.length)];
        let durum = '';

        if (secim === botSecim) {
            durum = '🤝 Berabere kaldık kankam!';
        } else if (
            (secim === 'taş' && botSecim === 'makas') ||
            (secim === 'kağıt' && botSecim === 'taş') ||
            (secim === 'makas' && botSecim === 'kağıt')
        ) {
            durum = '🎉 Tebrikler, sen kazandın kanka!';
        } else {
            durum = '😜 Ben kazandım! Bir dahaki sefere artık...';
        }

        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle('🪨 📄 ✂️ Taş - Kağıt - Makas')
            .setDescription(`**Senin Seçimin:** ${emojis[secim]}\n**Benim Seçimim:** ${emojis[botSecim]}\n\n**Sonuç:** ${durum}`)
            .setTimestamp()
            .setFooter({ text: 'PXD Eğlence', iconURL: client.user.displayAvatarURL() });

        message.reply({ embeds: [embed] });
    }
};
