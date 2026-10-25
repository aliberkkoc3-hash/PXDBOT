
require("dotenv").config();

const express = require("express");
const {
    Client,
    GatewayIntentBits,
    ChannelType
} = require("discord.js");

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const HOST = "127.0.0.1";

const ROOT_DIR = path.join(__dirname, "..");

const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

if (!process.env.BOT_TOKEN || !process.env.ADMIN_TOKEN) {
    console.error("HATA: .env dosyasında BOT_TOKEN ve ADMIN_TOKEN gerekli.");
    process.exit(1);
}

if (process.env.ADMIN_TOKEN.length < 32) {
    console.error("HATA: ADMIN_TOKEN en az 32 karakter olmalı.");
    process.exit(1);
}

fs.mkdirSync(DATA_DIR, { recursive: true });

if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, "{}\n", "utf8");
}

function readSettings() {
    try {
        const content = fs.readFileSync(SETTINGS_FILE, "utf8");
        const parsed = JSON.parse(content);

        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("Geçersiz ayar dosyası.");
        }

        return parsed;
    } catch (error) {
        console.error("Ayar dosyası okunamadı:", error.message);
        throw error;
    }
}

function writeSettings(settings) {
    const temporaryFile = `${SETTINGS_FILE}.tmp`;

    fs.writeFileSync(
        temporaryFile,
        JSON.stringify(settings, null, 2) + "\n",
        "utf8"
    );

    fs.renameSync(temporaryFile, SETTINGS_FILE);
}

function defaultSettings() {
    return {
        prefix: "!",
        mentionEveryone: false,
        antiLinkEnabled: false,
        antiSpamEnabled: false,
        antiBadWordsEnabled: false,
        autoReplyEnabled: false,
        welcomeEnabled: false,
        welcomeChannelId: "",
        logChannelId: ""
    };
}

function getGuildSettings(guildId) {
    const allSettings = readSettings();

    return {
        ...defaultSettings(),
        ...(allSettings[guildId] || {})
    };
}

function isValidAdminToken(candidate) {
    if (typeof candidate !== "string" || !candidate) {
        return false;
    }

    const expected = Buffer.from(process.env.ADMIN_TOKEN, "utf8");
    const supplied = Buffer.from(candidate, "utf8");

    if (expected.length !== supplied.length) {
        return false;
    }

    return crypto.timingSafeEqual(expected, supplied);
}

function requireAdmin(req, res, next) {
    const authorization = req.headers.authorization || "";
    const match = authorization.match(/^Bearer\s+(.+)$/i);

    if (!match || !isValidAdminToken(match[1])) {
        return res.status(401).json({
            error: "Yönetici doğrulaması başarısız."
        });
    }

    next();
}

function requireReadyBot(req, res, next) {
    if (!client.isReady()) {
        return res.status(503).json({
            error: "Discord botu henüz hazır değil. Biraz sonra tekrar dene."
        });
    }

    next();
}

app.disable("x-powered-by");
app.use(express.json({ limit: "20kb" }));

// Web sayfaları ve statik dosyalar.
app.use(express.static(PUBLIC_DIR, {
    dotfiles: "deny",
    index: false
}));

app.get("/", (req, res) => {
    res.redirect("/pages/AdminLogin.html");
});

app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, "dashboard.html"));
});

// API: Botun bulunduğu sunucuları listele.
app.get(
    "/api/dashboard/guilds",
    requireAdmin,
    requireReadyBot,
    (req, res) => {
        const guilds = client.guilds.cache.map(guild => ({
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL({ size: 64 })
        }));

        res.json({ guilds });
    }
);

// API: Belirli bir sunucunun ayarlarını ve metin kanallarını getir.
app.get(
    "/api/dashboard/guilds/:guildId/settings",
    requireAdmin,
    requireReadyBot,
    async (req, res) => {
        try {
            const guild = client.guilds.cache.get(req.params.guildId);

            if (!guild) {
                return res.status(404).json({
                    error: "Sunucu bulunamadı veya bot bu sunucuda değil."
                });
            }

            const fetchedChannels = await guild.channels.fetch();

            const channels = fetchedChannels
                .filter(channel =>
                    channel &&
                    (
                        channel.type === ChannelType.GuildText ||
                        channel.type === ChannelType.GuildAnnouncement
                    )
                )
                .map(channel => ({
                    id: channel.id,
                    name: channel.name
                }))
                .sort((a, b) => a.name.localeCompare(b.name));

            res.json({
                settings: getGuildSettings(guild.id),
                channels
            });
        } catch (error) {
            console.error("Sunucu ayarları yüklenemedi:", error);
            res.status(500).json({
                error: "Sunucu ayarları yüklenirken hata oluştu."
            });
        }
    }
);

// API: Ayarları doğrula ve JSON dosyasına kaydet.
app.put(
    "/api/dashboard/guilds/:guildId/settings",
    requireAdmin,
    requireReadyBot,
    async (req, res) => {
        try {
            const guild = client.guilds.cache.get(req.params.guildId);

            if (!guild) {
                return res.status(404).json({
                    error: "Sunucu bulunamadı veya bot bu sunucuda değil."
                });
            }

            // Hem { settings: {...} } hem de doğrudan {...} kabul edilir.
            const body = req.body;
            const input =
                body &&
                typeof body.settings === "object" &&
                body.settings !== null &&
                !Array.isArray(body.settings)
                    ? body.settings
                    : body;

            if (!input || typeof input !== "object" || Array.isArray(input)) {
                return res.status(400).json({
                    error: "Geçersiz ayar verisi."
                });
            }

            const current = getGuildSettings(guild.id);
            const next = { ...current };

            if (Object.hasOwn(input, "prefix")) {
                if (
                    typeof input.prefix !== "string" ||
                    input.prefix.length < 1 ||
                    input.prefix.length > 5 ||
                    !/^[^\s]+$/.test(input.prefix)
                ) {
                    return res.status(400).json({
                        error: "Prefix 1-5 karakter olmalı ve boşluk içermemeli."
                    });
                }

                next.prefix = input.prefix;
            }

            const booleanKeys = [
                "mentionEveryone",
                "antiLinkEnabled",
                "antiSpamEnabled",
                "antiBadWordsEnabled",
                "autoReplyEnabled",
                "welcomeEnabled"
            ];

            for (const key of booleanKeys) {
                if (Object.hasOwn(input, key)) {
                    if (typeof input[key] !== "boolean") {
                        return res.status(400).json({
                            error: `${key} değeri true veya false olmalı.`
                        });
                    }

                    next[key] = input[key];
                }
            }

            const channelKeys = [
                "welcomeChannelId",
                "logChannelId"
            ];

            const fetchedChannels = await guild.channels.fetch();

            for (const key of channelKeys) {
                if (!Object.hasOwn(input, key)) {
                    continue;
                }

                const value = input[key];

                if (typeof value !== "string") {
                    return res.status(400).json({
                        error: `${key} bir metin olmalı.`
                    });
                }

                if (value !== "") {
                    const channel = fetchedChannels.get(value);

                    if (
                        !channel ||
                        (
                            channel.type !== ChannelType.GuildText &&
                            channel.type !== ChannelType.GuildAnnouncement
                        )
                    ) {
                        return res.status(400).json({
                            error: `${key} geçerli bir metin kanalı olmalı.`
                        });
                    }
                }

                next[key] = value;
            }

            const allSettings = readSettings();
            allSettings[guild.id] = next;
            writeSettings(allSettings);

            res.json({
                ok: true,
                settings: next
            });
        } catch (error) {
            console.error("Ayarlar kaydedilemedi:", error);
            res.status(500).json({
                error: "Ayarlar kaydedilirken hata oluştu."
            });
        }
    }
);

// Bilinmeyen API adresleri için JSON 404.
app.use("/api", (req, res) => {
    res.status(404).json({ error: "API endpoint bulunamadı." });
});

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once("clientReady", readyClient => {
    console.log(`Discord bağlantısı hazır: ${readyClient.user.tag}`);
    console.log(`Bot ${readyClient.guilds.cache.size} sunucuda bulunuyor.`);
});

client.on("error", error => {
    console.error("Discord istemcisi hatası:", error);
});

const server = app.listen(PORT, HOST, () => {
    console.log(`PXDBot Dashboard: http://${HOST}:${PORT}`);
    console.log("Giriş: http://localhost:" + PORT + "/pages/AdminLogin.html");
});

client.login(process.env.BOT_TOKEN).catch(error => {
    console.error("Discord giriş hatası:", error.message);
    server.close(() => process.exit(1));
});

process.on("SIGINT", () => {
    server.close();
    client.destroy();
    process.exit(0);
});
