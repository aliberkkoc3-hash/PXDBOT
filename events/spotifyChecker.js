const { ActivityType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Client: GeniusClient } = require('genius-lyrics');
const geniusToken = process.env.GENIUS_TOKEN;
const genius = geniusToken ? new GeniusClient(geniusToken) : null;

const sonAtilanlar = new Map();

module.exports = {
    name: 'clientReady',
    once: true,
    execute(client) {
        if (!genius) {
            console.warn('[SpotifyChecker] GENIUS_TOKEN tanımlı değil; Spotify/Genius modülü devre dışı.');
            return;
        }
        console.log('🟢 Güvenli (API Destekli) Spotify Takip Sistemi Aktif!');

        const KONTROL_SURESI = 10 * 60 * 1000;

        setInterval(async () => {
            for (const guild of client.guilds.cache.values()) {
                try {
                    const members = await guild.members.fetch({ withPresences: true });

                    for (const member of members.values()) {
                        if (member.user.bot || !member.presence) continue;

                        const spotifyActivity = member.presence.activities.find(
                            act => act.name === 'Spotify' && act.type === ActivityType.Listening
                        );

                        if (spotifyActivity) {
                            const sarkiAdi = spotifyActivity.details;
                            const sanatci = spotifyActivity.state;
                            const userId = member.id;

                            if (sonAtilanlar.get(userId) === sarkiAdi) continue;

                            try {
                                const aramalar = await genius.songs.search(`${sanatci} ${sarkiAdi}`);
                                const sarki = aramalar[0];

                                if (!sarki) continue;

                                const embed = new EmbedBuilder()
                                    .setColor(0x1DB954) // Spotify Yeşili
                                    .setTitle(`🎧 Tarzın Akıyor Kanka!`)
                                    .setDescription(`Baktım Spotify'da **${sanatci} - ${sarkiAdi}** dinliyorsun. Şarkıya eşlik etmek istersen tüm sözleri hemen aşağıya bıraktım, patlat bir nakarat! 🔥`)
                                    .setThumbnail(sarki.thumbnail)
                                    .setFooter({ text: 'PXDBOT Spotify Günlüğü', iconURL: client.user.displayAvatarURL() })
                                    .setTimestamp();

                                const buton = new ButtonBuilder()
                                    .setLabel('Şarkı Sözlerine Git 📝')
                                    .setURL(sarki.url)
                                    .setStyle(ButtonStyle.Link);

                                const row = new ActionRowBuilder().addComponents(buton);

                                await member.send({ embeds: [embed], components: [row] });
                                console.log(`[Genius DM] ${member.user.tag} için güvenli link gönderildi.`);

                                sonAtilanlar.set(userId, sarkiAdi);

                            } catch (geniusError) {
                                console.error(`[Genius API Hatası]:`, geniusError.message);
                            }
                        }
                    }
                } catch (error) {
                    console.error('[Spotify Döngü Hatası]:', error);
                }
            }
        }, KONTROL_SURESI);
    }
};
