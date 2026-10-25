const {
  Client,
  GatewayIntentBits,
  Collection,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const {
  FILE_SCHEMAS,
  readJsonFile,
  writeJsonFile,
} = require("./utils/jsonPanelFiles");

const {
  getGuildSettings,
  updateGuildSettings,
} = require("./utils/guildSettings");

require("dotenv").config();

// ==================================================
// DISCORD CLIENT
// ==================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
});

client.commands = new Collection();

// ==================================================
// EVENT LOADER
// ==================================================

const eventsPath = path.join(__dirname, "events");

if (fs.existsSync(eventsPath)) {
  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith(".js"));

  for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));

    if (!event.name || typeof event.execute !== "function") {
      console.warn(`[EVENT] Geçersiz event dosyası: ${file}`);
      continue;
    }

    if (event.once) {
      client.once(event.name, (...args) => {
        event.execute(...args, client);
      });
    } else {
      client.on(event.name, (...args) => {
        event.execute(...args, client);
      });
    }
  }
}

// ==================================================
// COMMAND LOADER
// ==================================================

const commandsPath = path.join(__dirname, "commands");

if (fs.existsSync(commandsPath)) {
  const commandFolders = fs.readdirSync(commandsPath);

  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);

    if (!fs.lstatSync(folderPath).isDirectory()) {
      continue;
    }

    const commandFiles = fs
      .readdirSync(folderPath)
      .filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file);

      try {
        const command = require(filePath);

        if (!command.name || typeof command.execute !== "function") {
          console.warn(`[COMMAND] Geçersiz komut: ${filePath}`);
          continue;
        }

        command.category = folder;
        client.commands.set(command.name, command);
      } catch (error) {
        console.error(`[COMMAND] ${filePath} yüklenemedi:`, error);
      }
    }
  }
}

// ==================================================
// EXPRESS SERVER
// ==================================================

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "32kb" }));
app.use(express.static(path.join(__dirname, "public")));

// ==================================================
// DASHBOARD AUTHENTICATION
// ==================================================

function requireDashboardToken(req, res, next) {
  const expected = process.env.DASHBOARD_TOKEN;

  if (!expected) {
    return res.status(503).json({
      success: false,
      error: "DASHBOARD_TOKEN yapılandırılmamış. .env dosyanı kontrol et.",
    });
  }

  const header = req.get("authorization") || "";
  const supplied = header.startsWith("Bearer ") ? header.slice(7) : "";

  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);

  if (
    !supplied ||
    suppliedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    return res.status(401).json({
      success: false,
      error: "Yönetim tokeni geçersiz.",
    });
  }

  next();
}

// ==================================================
// DASHBOARD PAGE
// ==================================================

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// ==================================================
// GUILD LIST
// ==================================================

app.get("/api/dashboard/guilds", requireDashboardToken, (req, res) => {
  const guilds = [...client.guilds.cache.values()].map((guild) => ({
    id: guild.id,
    name: guild.name,
    memberCount: guild.memberCount,
  }));

  res.json({ guilds });
});

// ==================================================
// GUILD SETTINGS - GET
// ==================================================

app.get(
  "/api/dashboard/guilds/:guildId/settings",
  requireDashboardToken,
  (req, res) => {
    const guild = client.guilds.cache.get(req.params.guildId);

    if (!guild) {
      return res.status(404).json({
        error: "Sunucu bulunamadı veya bot bu sunucuda değil.",
      });
    }

    const channels = guild.channels.cache
      .filter(
        (channel) =>
          channel.isTextBased() && typeof channel.send === "function",
      )
      .map((channel) => ({
        id: channel.id,
        name: channel.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "tr"));

    const settings = getGuildSettings(guild.id);
    const channelIds = new Set(channels.map((channel) => channel.id));

    if (
      settings.welcomeChannelId &&
      !channelIds.has(settings.welcomeChannelId)
    ) {
      settings.welcomeChannelId = "";
    }

    if (settings.logChannelId && !channelIds.has(settings.logChannelId)) {
      settings.logChannelId = "";
    }

    res.json({ settings, channels });
  },
);

// ==================================================
// GUILD SETTINGS - UPDATE
// ==================================================

app.put(
  "/api/dashboard/guilds/:guildId/settings",
  requireDashboardToken,
  (req, res) => {
    const guild = client.guilds.cache.get(req.params.guildId);

    if (!guild) {
      return res.status(404).json({
        error: "Sunucu bulunamadı veya bot bu sunucuda değil.",
      });
    }

    try {
      const patch = req.body || {};

      for (const key of ["welcomeChannelId", "logChannelId"]) {
        if (!Object.hasOwn(patch, key) || !patch[key]) {
          continue;
        }

        if (typeof patch[key] !== "string") {
          return res.status(400).json({
            error: `${key} metin biçiminde olmalı.`,
          });
        }

        const channel = guild.channels.cache.get(patch[key]);

        if (
          !channel ||
          !channel.isTextBased() ||
          typeof channel.send !== "function"
        ) {
          return res.status(400).json({
            error: `${key}, botun erişebildiği bir metin kanalı olmalı.`,
          });
        }
      }

      const settings = updateGuildSettings(guild.id, patch);

      res.json({
        success: true,
        settings,
      });
    } catch (error) {
      res.status(400).json({
        error: error.message || "Ayarlar kaydedilemedi.",
      });
    }
  },
);

// ==================================================
// JSON FILE PANEL
// ==================================================

// Yalnızca bu dosyaların panelden düzenlenmesine izin verilir.
const ALLOWED_DATA_FILES = [
  "autoreplies.json",
  "badWords.json",
  "blackList.json",
  "whiteList.json",
];

// JSON içeriğini dosya adına göre kontrol eder.
function validatePanelJson(filename, data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return "JSON içeriği bir nesne olmalı.";
  }

  switch (filename) {
    case "autoreplies.json": {
      for (const [trigger, reply] of Object.entries(data)) {
        if (!trigger.trim()) {
          return "Otomatik yanıt tetikleyicisi boş olamaz.";
        }

        if (typeof reply !== "string") {
          return `"${trigger}" yanıtı metin olmalı.`;
        }

        if (trigger.length > 100 || reply.length > 2000) {
          return `"${trigger}" için karakter sınırı aşıldı.`;
        }
      }

      return null;
    }

    case "badWords.json": {
      if (
        !Array.isArray(data.bannedWords) ||
        !data.bannedWords.every((item) => typeof item === "string")
      ) {
        return "bannedWords bir metin dizisi olmalı.";
      }

      if (Object.keys(data).some((key) => key !== "bannedWords")) {
        return "badWords.json yalnızca bannedWords alanını içerebilir.";
      }

      return null;
    }

    case "blackList.json": {
      if (
        !Array.isArray(data.bannedWords) ||
        !data.bannedWords.every((item) => typeof item === "string")
      ) {
        return "bannedWords bir metin dizisi olmalı.";
      }

      if (
        !Array.isArray(data.bannedDomains) ||
        !data.bannedDomains.every((item) => typeof item === "string")
      ) {
        return "bannedDomains bir metin dizisi olmalı.";
      }

      if (
        Object.keys(data).some(
          (key) => !["bannedWords", "bannedDomains"].includes(key),
        )
      ) {
        return "blackList.json beklenmeyen alan içeriyor.";
      }

      return null;
    }

    case "whiteList.json": {
      if (
        !Array.isArray(data.allowedDomains) ||
        !data.allowedDomains.every((item) => typeof item === "string")
      ) {
        return "allowedDomains bir metin dizisi olmalı.";
      }

      if (Object.keys(data).some((key) => key !== "allowedDomains")) {
        return "whiteList.json yalnızca allowedDomains alanını içerebilir.";
      }

      return null;
    }

    default:
      return "Bu dosyanın düzenlenmesine izin verilmiyor.";
  }
}

// Dosya adını hem allowlist hem de yardımcı modülün şemasıyla kontrol et.
function isAllowedDataFile(filename) {
  return (
    typeof filename === "string" &&
    ALLOWED_DATA_FILES.includes(filename) &&
    Object.hasOwn(FILE_SCHEMAS, filename)
  );
}

// Panelde düzenlenebilecek dosyaları listele.
app.get("/api/dashboard/data-files", requireDashboardToken, (req, res) => {
  res.json({
    success: true,
    files: ALLOWED_DATA_FILES.filter(isAllowedDataFile),
  });
});

// Tek bir JSON dosyasını oku.
app.get(
  "/api/dashboard/data-files/:filename",
  requireDashboardToken,
  async (req, res) => {
    const { filename } = req.params;

    if (!isAllowedDataFile(filename)) {
      return res.status(404).json({
        success: false,
        error: "Dosya bulunamadı veya erişime izin verilmiyor.",
      });
    }

    try {
      const data = await readJsonFile(filename);

      return res.json({
        success: true,
        filename,
        data,
      });
    } catch (error) {
      console.error(`[JSON PANEL] ${filename} okunamadı:`, error);

      return res.status(500).json({
        success: false,
        error: "JSON dosyası okunamadı.",
      });
    }
  },
);

// Bir JSON dosyasını doğrulayarak kaydet.

app.put(
  "/api/dashboard/data-files/:filename",
  requireDashboardToken,
  async (req, res) => {
    const { filename } = req.params;

    if (!isAllowedDataFile(filename)) {
      return res.status(404).json({
        success: false,
        error: "Dosya bulunamadı veya erişime izin verilmiyor.",
      });
    }

    const validationError = validatePanelJson(filename, req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError,
      });
    }

    try {
      await writeJsonFile(filename, req.body);

      return res.json({
        success: true,
        message: `${filename} başarıyla kaydedildi.`,
        filename,
      });
    } catch (error) {
      console.error(`[JSON PANEL] ${filename} kaydedilemedi:`, error);

      return res.status(500).json({
        success: false,
        error: "Dosya kaydedilemedi. Sunucu günlüklerini kontrol et.",
      });
    }
  },
);

// ==================================================
// UPTIME
// ==================================================

function getFormattedUptime() {
  const totalSeconds = Math.floor(process.uptime());

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;

  return `${seconds}s`;
}

// ==================================================
// HOME PAGE
// ==================================================

app.get("/", (req, res) => {
  res.send("💚 PXDBOT aktif ve canavar gibi çalışıyor!");
});

// ==================================================
// BOT STATUS API
// ==================================================

app.get("/api/status", (req, res) => {
  res.json({
    bot: "PXDBOT",
    status: client.isReady() ? "online" : "starting",
    ping: client.ws.ping || 0,
    uptime: getFormattedUptime(),
    timestamp: new Date().toISOString(),
  });
});

// ==================================================
// APPLICATION API
// ==================================================

app.post("/api/apply", async (req, res) => {
  try {
    const { discord, age, activeTime, experience, whyYou } = req.body || {};

    const fields = {
      discord,
      age,
      activeTime,
      experience,
      whyYou,
    };

    for (const [key, value] of Object.entries(fields)) {
      if (typeof value !== "string" || !value.trim()) {
        return res.status(400).json({
          success: false,
          message: "Tüm alanları doğru şekilde doldur.",
        });
      }

      if (value.length > 1000) {
        return res.status(400).json({
          success: false,
          message: "Bir veya daha fazla alan çok uzun.",
        });
      }
    }

    const channelId = process.env.BASVURU_KANAL_ID;

    if (!channelId) {
      return res.status(500).json({
        success: false,
        message: "Başvuru kanalı yapılandırılmamış.",
      });
    }

    const channel = await client.channels.fetch(channelId);

    if (
      !channel ||
      !channel.isTextBased() ||
      typeof channel.send !== "function"
    ) {
      return res.status(500).json({
        success: false,
        message: "Başvuru kanalı bulunamadı.",
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("🚀 Yeni Yetkili Başvurusu")
      .setColor(6577905)
      .addFields(
        {
          name: "👤 Discord Kullanıcı",
          value: discord,
          inline: true,
        },
        {
          name: "🎂 Yaş",
          value: age,
          inline: true,
        },
        {
          name: "⏰ Günlük Aktiflik",
          value: activeTime,
          inline: false,
        },
        {
          name: "💼 Önceki Deneyimler",
          value: experience,
          inline: false,
        },
        {
          name: "⭐ Neden Seni Seçmeliyiz?",
          value: whyYou,
          inline: false,
        },
      )
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("basvuru_onayla")
        .setLabel("Onayla")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("basvuru_reddet")
        .setLabel("Reddet")
        .setStyle(ButtonStyle.Danger),
    );

    await channel.send({
      embeds: [embed],
      components: [row],
    });

    res.json({
      success: true,
      message: "Başvuru başarıyla Discord kanalına iletildi.",
    });
  } catch (error) {
    console.error("[BAŞVURU API]", error);

    res.status(500).json({
      success: false,
      message: "Sunucu hatası oluştu.",
    });
  }
});

// ==================================================
// SERVER START
// ==================================================

const server = app.listen(PORT, () => {
  console.log(`🌐 Web sunucusu ${PORT} portunda aktif.`);
});

// ==================================================
// GRACEFUL SHUTDOWN
// ==================================================

let isShuttingDown = false;

const stopBot = () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log("\n🛑 PXDBOT kapatılıyor...");

  server.close(() => {
    console.log("🌐 Web sunucusu kapatıldı.");
  });

  client.destroy();
};

process.on("SIGINT", stopBot);
process.on("SIGTERM", stopBot);

// ==================================================
// LOGIN
// ==================================================

if (!process.env.TOKEN) {
  console.error("❌ .env dosyasında TOKEN bulunamadı.");
  process.exit(1);
}

client.login(process.env.TOKEN).catch((error) => {
  console.error("❌ Discord giriş hatası:", error);
  process.exitCode = 1;
});
