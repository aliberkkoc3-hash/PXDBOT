
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getGuildSettings } = require('../utils/guildSettings');

// ─────────────────────────────────────────────
// PixelCore Kick Canlı Yayın Bildirim Sistemi
// Resmî Kick API + OAuth Client Credentials
// ─────────────────────────────────────────────

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

const KICK_TOKEN_URL = 'https://id.kick.com/oauth/token';
const KICK_API_BASE = 'https://api.kick.com/public/v1';

let cachedAccessToken = null;
let tokenExpiresAt = 0;

// ─────────────────────────────────────────────
// Yapılandırma
// ─────────────────────────────────────────────

function loadConfig() {
    try {
        return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    } catch (error) {
        console.error(
            '[Kick Tracker] config.json okunamadı:',
            error.message
        );

        return {};
    }
}

// ─────────────────────────────────────────────
// Yardımcı fonksiyonlar
// ─────────────────────────────────────────────

function formatNumber(number) {
    if (
        number === null ||
        number === undefined ||
        !Number.isFinite(Number(number))
    ) {
        return '0';
    }

    return Number(number).toLocaleString('tr-TR');
}

function formatDuration(startedAt) {
    if (!startedAt) return 'Bilinmiyor';

    const start = new Date(startedAt);

    if (
        Number.isNaN(start.getTime()) ||
        start.getUTCFullYear() < 2000
    ) {
        return 'Bilinmiyor';
    }

    const totalSeconds = Math.floor(
        Math.max(0, Date.now() - start.getTime()) / 1000
    );

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];

    if (hours > 0) parts.push(`${hours} sa`);
    if (minutes > 0) parts.push(`${minutes} dk`);

    if (seconds > 0 || parts.length === 0) {
        parts.push(`${seconds} sn`);
    }

    return parts.join(' ');
}

async function readResponse(response) {
    const text = await response.text();

    try {
        return JSON.parse(text);
    } catch {
        return { raw: text.slice(0, 500) };
    }
}

// ─────────────────────────────────────────────
// OAuth erişim belirteci
// ─────────────────────────────────────────────

async function getKickAccessToken() {
    if (
        cachedAccessToken &&
        Date.now() < tokenExpiresAt - 60_000
    ) {
        return cachedAccessToken;
    }

    const clientId = process.env.KICK_CLIENT_ID;
    const clientSecret = process.env.KICK_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error(
            '.env içinde KICK_CLIENT_ID veya KICK_CLIENT_SECRET eksik.'
        );
    }

    const response = await fetch(KICK_TOKEN_URL, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret
        })
    });

    const result = await readResponse(response);

    if (!response.ok) {
        throw new Error(
            `OAuth token alınamadı (${response.status}): ` +
            `${result.error_description || result.message || result.raw || 'Bilinmeyen hata'}`
        );
    }

    if (!result.access_token) {
        throw new Error(
            'Kick OAuth yanıtında access_token bulunamadı.'
        );
    }

    cachedAccessToken = result.access_token;

    const expiresIn = Number(result.expires_in) || 3600;

    tokenExpiresAt = Date.now() + expiresIn * 1000;

    console.log('[Kick Tracker] OAuth erişim belirteci alındı.');

    return cachedAccessToken;
}

// ─────────────────────────────────────────────
// Resmî Kick Channels API
// ─────────────────────────────────────────────

async function fetchKickChannel(username) {
    const url = new URL(`${KICK_API_BASE}/channels`);

    url.searchParams.set('slug', username);

    // 401 durumunda token'ı yenileyip bir kez yeniden dene.
    for (let attempt = 0; attempt < 2; attempt++) {
        const token = await getKickAccessToken();

        const response = await fetch(url, {
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${token}`
            }
        });

        const result = await readResponse(response);

        if (response.status === 401 && attempt === 0) {
            cachedAccessToken = null;
            tokenExpiresAt = 0;
            continue;
        }

        if (!response.ok) {
            const details =
                result.message ||
                result.error_description ||
                result.raw ||
                'Yanıt açıklaması bulunamadı';

            throw new Error(
                `Kick API hatası (${response.status}): ${details}`
            );
        }

        const channels = Array.isArray(result.data)
            ? result.data
            : result.data
                ? [result.data]
                : [];

        const channel = channels.find(
            item =>
                item.slug?.toLowerCase() === username.toLowerCase()
        );

        if (!channel) {
            throw new Error(
                `"${username}" kanalı resmî API yanıtında bulunamadı.`
            );
        }

        return channel;
    }

    throw new Error('Kick API için erişim doğrulaması başarısız.');
}

// ─────────────────────────────────────────────
// Discord embed
// ─────────────────────────────────────────────

function buildLiveEmbed(username, channel, client) {
    const stream = channel.stream || {};
    const category = channel.category || {};

    const channelSlug = channel.slug || username;
    const channelUrl =
        `https://kick.com/${encodeURIComponent(channelSlug)}`;

    const categoryName = category.name || 'Genel';
    const viewerCount = stream.viewer_count ?? 0;
    const title = channel.stream_title || '🔴 Canlı yayın başladı!';
    const thumbnailUrl = stream.thumbnail || null;

    const embed = new EmbedBuilder()
        .setColor(0x53FC18)
        .setAuthor({
            name: `${channelSlug} şu an Kick'te canlı!`,
            url: channelUrl,
            iconURL: 'https://kick.com/favicon.ico'
        })
        .setTitle(title)
        .setURL(channelUrl)
        .setDescription(
            `🚀 **${channelSlug}** yayına girdi! Hemen katıl ve kaçırmadan izle.\n\n` +
            `🔗 **Yayın bağlantısı:** [kick.com/${channelSlug}](${channelUrl})`
        )
        .addFields(
            {
                name: '🎮 Kategori',
                value: categoryName,
                inline: true
            },
            {
                name: '👥 İzleyici Sayısı',
                value: `\`${formatNumber(viewerCount)}\``,
                inline: true
            },
            {
                name: '⏱️ Yayın Süresi',
                value: formatDuration(stream.start_time),
                inline: true
            }
        )
        .setTimestamp()
        .setFooter({
            text: loadConfig().footerText || 'PXDBOT Kick Bildirim Sistemi',
            ...(client.user
                ? {
                    iconURL: client.user.displayAvatarURL({
                        size: 128
                    })
                }
                : {})
        });

    if (thumbnailUrl) {
        embed.setImage(thumbnailUrl);
    }

    if (category.thumbnail) {
        embed.setThumbnail(category.thumbnail);
    }

    return embed;
}

// ─────────────────────────────────────────────
// Bildirim mesajı
// ─────────────────────────────────────────────

function buildNotificationContent(username, mentionEveryone) {
    const channelUrl =
        `https://kick.com/${encodeURIComponent(username)}`;

    const mention = mentionEveryone ? '@everyone ' : '';

    return (
        `${mention}🚀 **${username}** canlı yayına girdi! ` +
        `Patlatın krakerleri! ${channelUrl}`
    ).trim();
}

// ─────────────────────────────────────────────
// Takip döngüsü
// ─────────────────────────────────────────────

module.exports = {
    name: 'clientReady',
    once: true,

    execute(client) {
        const config = loadConfig();
        const username = config.kickUName;

        if (!username) {
            console.warn(
                '[Kick Tracker] config.json içinde kickUName tanımlı değil.'
            );
            return;
        }

        if (!config.kickC) {
            console.warn(
                '[Kick Tracker] config.json içinde kickC (kanal ID) tanımlı değil.'
            );
            return;
        }

        if (
            !process.env.KICK_CLIENT_ID ||
            !process.env.KICK_CLIENT_SECRET
        ) {
            console.error(
                '[Kick Tracker] .env içinde Kick API kimlik bilgileri eksik.'
            );
            return;
        }

        if (client.kickTracker?.timer) {
            clearTimeout(client.kickTracker.timer);
        }

        client.kickTracker = {
            isLive: false,
            lastCheckAt: null,
            lastNotifiedAt: null,
            timer: null
        };

        const configuredInterval = Number(config.checkIntervalMs);

        const intervalMs =
            Number.isFinite(configuredInterval) &&
            configuredInterval >= 15_000
                ? configuredInterval
                : 120_000;

        console.log(
            `[Kick Tracker] Servis aktif. "${username}" takip ediliyor. ` +
            `(Kontrol aralığı: ${intervalMs / 1000} sn)`
        );

        async function checkKick() {
            try {
                const currentConfig = loadConfig();

                const currentUsername =
                    currentConfig.kickUName || username;

                const channelId = currentConfig.kickC;

                if (!currentUsername || !channelId) {
                    return;
                }

                client.kickTracker.lastCheckAt = new Date();

                const channelData =
                    await fetchKickChannel(currentUsername);

                const isLive =
                    channelData.stream?.is_live === true;

                console.log(
                    `[Kick Tracker] ${currentUsername}: ` +
                    (isLive ? 'CANLI' : 'çevrimdışı')
                );

                // Yayın açıldı.
                if (isLive && !client.kickTracker.isLive) {
                    const discordChannel = await client.channels
                        .fetch(channelId)
                        .catch(error => {
                            console.error(
                                '[Kick Tracker] Discord kanalı getirilemedi:',
                                error.message
                            );

                            return null;
                        });

                    if (
                        !discordChannel ||
                        !discordChannel.isTextBased() ||
                        typeof discordChannel.send !== 'function'
                    ) {
                        console.warn(
                            '[Kick Tracker] Bildirim kanalı bulunamadı ' +
                            'veya mesaj gönderilemiyor.'
                        );
                        return;
                    }

                    const guildSettings = discordChannel.guild
                        ? getGuildSettings(discordChannel.guild.id) || {}
                        : {};

                    const mentionEveryone =
                        typeof guildSettings.mentionEveryone === 'boolean'
                            ? guildSettings.mentionEveryone
                            : currentConfig.mentionEveryone === true;

                    const embed = buildLiveEmbed(
                        currentUsername,
                        channelData,
                        client
                    );

                    const content = buildNotificationContent(
                        currentUsername,
                        mentionEveryone
                    );

                    await discordChannel.send({
                        content,
                        embeds: [embed]
                    });

                    // Yalnızca mesaj başarıyla gönderilirse durumu değiştir.
                    client.kickTracker.isLive = true;
                    client.kickTracker.lastNotifiedAt = new Date();

                    console.log(
                        `[Kick Tracker] ${currentUsername} için ` +
                        'canlı yayın bildirimi gönderildi.'
                    );
                }

                // Yayın sona erdi.
                else if (
                    !isLive &&
                    client.kickTracker.isLive
                ) {
                    client.kickTracker.isLive = false;

                    console.log(
                        `[Kick Tracker] ${currentUsername} yayını sona erdi.`
                    );
                }
            } catch (error) {
                // API hatasında mevcut yayın durumunu koru.
                console.error(
                    '[Kick Tracker Hatası]:',
                    error.message || error
                );
            } finally {
                // Bir sonraki kontrol, mevcut kontrol tamamlandıktan sonra.
                client.kickTracker.timer = setTimeout(
                    checkKick,
                    intervalMs
                );
            }
        }

        // İlk kontrol için iki dakika bekleme.
        void checkKick();
    }
};
