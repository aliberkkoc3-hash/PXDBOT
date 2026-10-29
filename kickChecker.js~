const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getGuildSettings } = require('../utils/guildSettings');

// ─────────────────────────────────────────────
// PixelCore Kick Canlı Yayın Bildirim Sistemi
// ─────────────────────────────────────────────

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

/**
 * config.json dosyasını okur. Dosya yoksa veya bozuksa varsayılan değer döner.
 */
function loadConfig() {
    try {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
        return JSON.parse(raw);
    } catch (err) {
        console.error('[Kick Tracker] config.json okunurken hata oluştu:', err.message);
        return {};
    }
}

/**
 * Sayıları Türkçe formatta gösterir. Örn: 12500 -> 12.500
 */
function formatNumber(num) {
    if (num === null || num === undefined || Number.isNaN(num)) return '0';
    return Number(num).toLocaleString('tr-TR');
}

/**
 * İki tarih arasındaki farkı "X dk X sn" formatında döndürür.
 */
function formatDuration(startedAt) {
    if (!startedAt) return 'Bilinmiyor';
    const start = new Date(startedAt);
    if (Number.isNaN(start.getTime())) return 'Bilinmiyor';

    const diffMs = Date.now() - start.getTime();
    const totalSeconds = Math.floor(Math.max(0, diffMs) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours} sa`);
    if (minutes > 0) parts.push(`${minutes} dk`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds} sn`);

    return parts.join(' ');
}

/**
 * Kick API'den kanal/yayıncı bilgilerini çeker.
 */
async function fetchKickChannel(username) {
    const url = `https://kick.com/api/v2/channels/${encodeURIComponent(username)}`;
    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0'
        }
    });

    if (!response.ok) {
        throw new Error(`Kick API yanıt vermedi. Durum: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

/**
 * Yayın bildirim embed'ini oluşturur.
 */
function buildLiveEmbed(username, data, livestream, client) {
    const config = loadConfig();
    const channelUrl = `https://kick.com/${username}`;
    const category = livestream.categories?.[0];
    const categoryName = category?.name || 'Genel';
    const categoryIcon = category?.icon || null;
    const viewerCount = livestream.viewer_count ?? 0;
    const title = livestream.session_title || '🔴 Canlı yayındaydı kanka, kaçırma!';
    const thumbnailUrl = livestream.thumbnail?.url
        ? `${livestream.thumbnail.url}?t=${Date.now()}`
        : null;
    const startedAt = livestream.start_time;

    const embed = new EmbedBuilder()
        .setColor(0x53fc18) // Kick yeşili
        .setAuthor({
            name: `${username} şu an Kick'te canlı!`,
            url: channelUrl,
            iconURL: 'https://kick.com/favicon.ico'
        })
        .setTitle(title)
        .setURL(channelUrl)
        .setDescription(
            `🚀 **${username}** yayına girdi! Hemen katıl ve kaçırmadan izle.\n` +
            `🔗 **Yayın bağlantısı:** [kick.com/${username}](${channelUrl})`
        )
        .addFields(
            { name: '🎮 Kategori', value: categoryName, inline: true },
            { name: '👥 İzleyici Sayısı', value: `\`${formatNumber(viewerCount)}\``, inline: true },
            { name: '⏱️ Yayın Süresi', value: formatDuration(startedAt), inline: true }
        )
        .setTimestamp();

    if (thumbnailUrl) {
        embed.setImage(thumbnailUrl);
    }

    if (categoryIcon) {
        embed.setThumbnail(categoryIcon);
    }

    embed.setFooter({
        text: config.footerText || 'PXDBOT Kick Bildirim Sistemi',
        iconURL: client.user?.displayAvatarURL({ size: 128 }) || undefined
    });

    return embed;
}

/**
 * Bildirim mesajının içeriğini oluşturur.
 */
function buildNotificationContent(username, config) {
    const channelUrl = `https://kick.com/${username}`;
    const mention = config.mentionEveryone ? '@everyone' : '';
    return `${mention} 🚀 **${username}** canlı yayına girdi! Patlatın krakerleri! ${channelUrl}`.trim();
}

module.exports = {
    name: 'clientReady',
    once: true,

    execute(client) {
        const config = loadConfig();
        const username = config.kickUName;

        if (!username) {
            console.warn('[Kick Tracker] config.json içinde kickUName tanımlı değil. Takip devre dışı.');
            return;
        }

        if (!config.kickC) {
            console.warn('[Kick Tracker] config.json içinde kickC (kanal ID) tanımlı değil. Takip devre dışı.');
            return;
        }

        // Bot başına başına bir kez takip durumu oluştur (global değişken yerine client üzerinde tutulur)
        client.kickTracker = {
            isLive: false,
            lastCheckAt: null,
            lastNotifiedAt: null
        };

        const intervalMs = config.checkIntervalMs || 120_000;

        console.log(`[Kick Tracker] Servis aktif edildi. "${username}" takip ediliyor... (Kontrol aralığı: ${intervalMs / 1000} sn)`);

        setInterval(async () => {
            const currentConfig = loadConfig();
            const currentUsername = currentConfig.kickUName || username;
            const channelId = currentConfig.kickC;

            if (!currentUsername || !channelId) return;

            client.kickTracker.lastCheckAt = new Date();

            try {
                const data = await fetchKickChannel(currentUsername);
                const livestream = data?.livestream;

                // ── Yayın açıldı ve daha önce bildirim atılmadı ──
                if (livestream && !client.kickTracker.isLive) {
                    client.kickTracker.isLive = true;
                    client.kickTracker.lastNotifiedAt = new Date();

                    const channel = await client.channels.fetch(channelId).catch((err) => {
                        console.error('[Kick Tracker] Kanal getirilemedi:', err.message);
                        return null;
                    });

                    if (!channel || !channel.isTextBased()) {
                        console.warn('[Kick Tracker] Belirtilen kanal yazı kanalı değil veya bulunamadı.');
                        return;
                    }

                    const embed = buildLiveEmbed(currentUsername, data, livestream, client);
                    const guildSettings = channel.guild ? getGuildSettings(channel.guild.id) : { mentionEveryone: currentConfig.mentionEveryone };
                    const content = buildNotificationContent(currentUsername, { ...currentConfig, mentionEveryone: guildSettings.mentionEveryone });

                    await channel.send({ content, embeds: [embed] });
                    console.log(`[Kick Tracker] ${currentUsername} için canlı yayın bildirimi gönderildi.`);
                }
                // ── Yayın kapandı, durumu sıfırla ──
                else if (!livestream && client.kickTracker.isLive) {
                    client.kickTracker.isLive = false;
                    console.log(`[Kick Tracker] ${currentUsername} yayını sonlandı. Bir sonraki yayın için bekleniyor...`);
                }
            } catch (error) {
                console.error('[Kick Tracker Hatası]:', error.message || error);
            }
        }, intervalMs);
    }
};
