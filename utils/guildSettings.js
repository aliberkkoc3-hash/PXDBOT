const fs = require('fs');
const path = require('path');

const settingsPath = path.join(__dirname, '..', 'data', 'guild-settings.json');
const legacyConfig = require('../config.json');

const DEFAULTS = Object.freeze({
    prefix: legacyConfig.prefix || 'PXD-',
    welcomeEnabled: true,
    welcomeChannelId: '',
    logChannelId: '',
    antiLinkEnabled: true,
    antiSpamEnabled: true,
    antiBadWordsEnabled: true,
    autoReplyEnabled: true,
    mentionEveryone: Boolean(legacyConfig.mentionEveryone)
});

function readAll() {
    try {
        if (!fs.existsSync(settingsPath)) return {};
        const parsed = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
        console.error('[GuildSettings] Ayarlar okunamadı:', error.message);
        return {};
    }
}

function writeAll(all) {
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    const tempPath = `${settingsPath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(all, null, 2) + '\n', 'utf8');
    fs.renameSync(tempPath, settingsPath);
}

function getGuildSettings(guildId) {
    const all = readAll();
    const saved = all[guildId] && typeof all[guildId] === 'object' ? all[guildId] : {};
    const legacyWelcome = legacyConfig.welcomerCId || '';
    const legacyLog = legacyConfig.logCId || '';
    return {
        ...DEFAULTS,
        // Preserve existing global channel defaults only for guilds that contain those channels.
        welcomeChannelId: saved.welcomeChannelId ?? legacyWelcome,
        logChannelId: saved.logChannelId ?? legacyLog,
        ...saved
    };
}

function updateGuildSettings(guildId, patch) {
    const allowed = new Set(Object.keys(DEFAULTS));
    const clean = {};
    for (const [key, value] of Object.entries(patch || {})) {
        if (!allowed.has(key)) continue;
        if (key === 'prefix') {
            if (typeof value !== 'string' || value.trim().length < 1 || value.trim().length > 8) {
                throw new Error('Prefix 1-8 karakter arasında olmalı.');
            }
            clean.prefix = value.trim();
        } else if (key.endsWith('ChannelId')) {
            if (typeof value !== 'string' || (value !== '' && !/^\d{17,20}$/.test(value))) {
                throw new Error(`${key} geçerli bir Discord kanal ID'si olmalı veya boş bırakılmalı.`);
            }
            clean[key] = value;
        } else if (typeof value === 'boolean') {
            clean[key] = value;
        } else {
            throw new Error(`${key} için geçersiz değer.`);
        }
    }

    const all = readAll();
    all[guildId] = { ...getGuildSettings(guildId), ...clean, updatedAt: new Date().toISOString() };
    writeAll(all);
    return getGuildSettings(guildId);
}

module.exports = { DEFAULTS, getGuildSettings, updateGuildSettings };
