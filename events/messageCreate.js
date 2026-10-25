const { getGuildSettings } = require('../utils/guildSettings');

module.exports = {
    name: 'messageCreate',
    once: false, // Her mesaj geldiğinde tetiklensin
    async execute(message, client) {
        // Mesaj botlardan geliyorsa veya prefix ile başlamıyorsa işlem yapma
        if (message.author.bot || !message.guild) return;
        const prefix = getGuildSettings(message.guild.id).prefix;
        if (!message.content.startsWith(prefix)) return;

        // Prefix'i kesip komut adını ve argümanları ayırıyoruz
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        // Komut klasörümüzde bu isimde bir komut var mı kontrol et
        const command = client.commands.get(commandName);
        if (!command) return;

        try {
            // Komutu çalıştır ve mesaj, argümanlar ile client objesini gönder
            await command.execute(message, args, client);
        } catch (error) {
            console.error(`Komut yürütülürken hata oluştu (${commandName}):`, error);
            message.reply('❌ Bu komutu çalıştırırken arkada bir şeyler patladı kanka!');
        }
    },
};