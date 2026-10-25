"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const API = "/api/dashboard";
  const LOGIN_URL = "/pages/AdminLogin.html";

  let token = sessionStorage.getItem("pxdbot_admin_token") || "";
  let guilds = [];
  let channels = [];
  let isDirty = false;
  let isLoading = false;
  let isSaving = false;
  let currentGuildId = "";

  const $ = (id) => document.getElementById(id);

  const elements = {
    workspace: $("workspace"),
    connectionDot: $("connectionDot"),
    connectionLabel: $("connectionLabel"),
    logoutBtn: $("logoutBtn"),

    refreshBtn: $("refreshBtn"),
    guildSelect: $("guildSelect"),

    prefixInput: $("prefixInput"),
    mentionEveryone: $("mentionEveryone"),

    antiLinkEnabled: $("antiLinkEnabled"),
    antiSpamEnabled: $("antiSpamEnabled"),
    antiBadWordsEnabled: $("antiBadWordsEnabled"),

    autoReplyEnabled: $("autoReplyEnabled"),
    welcomeEnabled: $("welcomeEnabled"),

    welcomeChannelId: $("welcomeChannelId"),
    logChannelId: $("logChannelId"),

    saveBtn: $("saveBtn"),
    saveStatus: $("saveStatus"),
    toastRegion: $("toastRegion")
  };

  const settingsFields = [
    "prefixInput",
    "mentionEveryone",
    "antiLinkEnabled",
    "antiSpamEnabled",
    "antiBadWordsEnabled",
    "autoReplyEnabled",
    "welcomeEnabled",
    "welcomeChannelId",
    "logChannelId"
  ];

  // --------------------------------------------------
  // GEREKLİ HTML ELEMANLARINI KONTROL ET
  // --------------------------------------------------

  for (const [name, element] of Object.entries(elements)) {
    if (!element) {
      console.error(`[PXDBot] HTML elemanı bulunamadı: ${name}`);
    }
  }

  if (
    !elements.workspace ||
    !elements.connectionDot ||
    !elements.connectionLabel ||
    !elements.logoutBtn ||
    !elements.guildSelect ||
    !elements.saveBtn ||
    !elements.refreshBtn ||
    !elements.toastRegion
  ) {
    console.error("[PXDBot] Dashboard HTML yapısı eksik.");
    return;
  }

  // --------------------------------------------------
  // BİLDİRİMLER
  // --------------------------------------------------

  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const icon = document.createElement("i");

    icon.className =
      type === "success"
        ? "fa-solid fa-circle-check"
        : type === "error"
          ? "fa-solid fa-circle-exclamation"
          : "fa-solid fa-circle-info";

    icon.setAttribute("aria-hidden", "true");

    const text = document.createElement("span");
    text.textContent = String(message);

    toast.append(icon, text);
    elements.toastRegion.appendChild(toast);

    window.setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(8px)";

      window.setTimeout(() => toast.remove(), 220);
    }, 4200);
  }

  // --------------------------------------------------
  // BAĞLANTI VE KAYDETME DURUMU
  // --------------------------------------------------

  function setConnection(state, label) {
    elements.connectionLabel.textContent = label;
    elements.connectionDot.dataset.state = state;
  }

  function setSaveStatus(message, state = "") {
    elements.saveStatus.textContent = message;

    if (state) {
      elements.saveStatus.dataset.state = state;
    } else {
      delete elements.saveStatus.dataset.state;
    }
  }

  function setDirty(dirty) {
    isDirty = dirty;

    if (dirty) {
      setSaveStatus("Kaydedilmemiş değişiklikler var.", "dirty");
    } else {
      setSaveStatus("Bütün değişiklikler kaydedildi.", "success");
    }
  }

  // --------------------------------------------------
  // API İSTEKLERİ
  // --------------------------------------------------

  async function apiRequest(endpoint, options = {}) {
    if (!token) {
      throw new Error("Yönetici oturumu bulunamadı.");
    }

    const headers = {
      Accept: "application/json",
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    };

    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    let response;

    try {
      response = await fetch(`${API}${endpoint}`, {
        ...options,
        headers,
        cache: "no-store"
      });
    } catch {
      throw new Error(
        "Sunucuya bağlanılamadı. Botun ve web sunucusunun çalıştığını kontrol et."
      );
    }

    const contentType = response.headers.get("content-type") || "";
    let data = null;

    if (contentType.includes("application/json")) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    } else {
      const responseText = await response.text().catch(() => "");

      data = responseText
        ? { message: responseText.slice(0, 200) }
        : null;
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        const error = new Error(
          "Yönetici erişimi reddedildi. Oturumunu yeniden doğrula."
        );

        error.status = response.status;
        throw error;
      }

      if (response.status === 404) {
        const error = new Error(
          "API yolu bulunamadı. Express backend rotalarını kontrol et."
        );

        error.status = 404;
        throw error;
      }

      const error = new Error(
        data?.error ||
        data?.message ||
        `İstek başarısız oldu (HTTP ${response.status}).`
      );

      error.status = response.status;
      throw error;
    }

    return data;
  }

  function handleApiError(error) {
    if (error.status === 401 || error.status === 403) {
      sessionStorage.removeItem("pxdbot_admin_token");
      token = "";

      window.location.replace(LOGIN_URL);
      return true;
    }

    return false;
  }

  // --------------------------------------------------
  // GENEL YARDIMCILAR
  // --------------------------------------------------

  function unwrapList(data, key) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.data)) return data.data;

    return [];
  }

  function getGuildId(guild) {
    return String(guild?.id ?? guild?.guildId ?? "");
  }

  function getGuildName(guild) {
    return String(
      guild?.name ??
      guild?.guildName ??
      guild?.id ??
      "İsimsiz sunucu"
    );
  }

  function normalizeChannel(channel) {
    if (typeof channel === "string") {
      return {
        id: channel,
        name: channel
      };
    }

    return {
      id: String(channel?.id ?? channel?.channelId ?? ""),
      name: String(channel?.name ?? channel?.id ?? "İsimsiz kanal")
    };
  }

  function setButtonLoading(button, loading, originalHTML) {
    button.disabled = loading;

    if (loading) {
      button.dataset.originalHtml = originalHTML || button.innerHTML;

      button.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> İşleniyor...';
    } else {
      button.innerHTML =
        button.dataset.originalHtml || originalHTML || button.innerHTML;

      delete button.dataset.originalHtml;
    }
  }

  // --------------------------------------------------
  // OTURUM VE ÇIKIŞ
  // --------------------------------------------------

  function showWorkspace() {
    elements.workspace.classList.remove("hidden");
    elements.logoutBtn.classList.remove("hidden");
  }

  function redirectToLogin() {
    sessionStorage.removeItem("pxdbot_admin_token");
    window.location.replace(LOGIN_URL);
  }

  function logout() {
    if (isDirty) {
      const confirmed = window.confirm(
        "Kaydedilmemiş değişikliklerin var. Oturumu kapatmak istiyor musun?"
      );

      if (!confirmed) return;
    }

    token = "";
    guilds = [];
    channels = [];
    currentGuildId = "";
    isDirty = false;

    redirectToLogin();
  }

  elements.logoutBtn.addEventListener("click", logout);

  // --------------------------------------------------
  // SUNUCULARI YÜKLE
  // --------------------------------------------------

  async function loadGuilds() {
    setConnection("connecting", "Sunucular yükleniyor");

    const response = await apiRequest("/guilds");
    guilds = unwrapList(response, "guilds");

    const validGuilds = guilds.filter((guild) => getGuildId(guild));

    elements.guildSelect.replaceChildren();

    if (validGuilds.length === 0) {
      const option = document.createElement("option");

      option.value = "";
      option.textContent = "Yönetilebilir sunucu bulunamadı";

      elements.guildSelect.appendChild(option);

      currentGuildId = "";
      channels = [];

      setConnection("connected", "Bağlantı kuruldu");
      setSaveStatus("Yönetilebilir sunucu bulunamadı.");

      return;
    }

    for (const guild of validGuilds) {
      const option = document.createElement("option");

      option.value = getGuildId(guild);
      option.textContent = getGuildName(guild);

      elements.guildSelect.appendChild(option);
    }

    const previousGuildExists = validGuilds.some(
      (guild) => getGuildId(guild) === currentGuildId
    );

    if (previousGuildExists) {
      elements.guildSelect.value = currentGuildId;
    } else {
      elements.guildSelect.selectedIndex = 0;
    }

    currentGuildId = elements.guildSelect.value;

    if (currentGuildId) {
      await loadGuildSettings(currentGuildId);
    }

    setConnection("connected", "Bağlantı kuruldu");
  }

  // --------------------------------------------------
  // KANAL SEÇENEKLERİ
  // --------------------------------------------------

  function populateChannelSelect(select, channelList, selectedId) {
    select.replaceChildren();

    const emptyOption = document.createElement("option");

    emptyOption.value = "";
    emptyOption.textContent = "Kanal seçilmedi";

    select.appendChild(emptyOption);

    for (const rawChannel of channelList) {
      const channel = normalizeChannel(rawChannel);

      if (!channel.id) continue;

      const option = document.createElement("option");

      option.value = channel.id;
      option.textContent = `# ${channel.name}`;

      select.appendChild(option);
    }

    const wantedId = selectedId ? String(selectedId) : "";

    const exists = Array.from(select.options).some(
      (option) => option.value === wantedId
    );

    if (wantedId && !exists) {
      const missingOption = document.createElement("option");

      missingOption.value = wantedId;
      missingOption.textContent = "Seçili kanal (listede yok)";

      select.appendChild(missingOption);
    }

    select.value = wantedId;
  }

  // --------------------------------------------------
  // SUNUCU AYARLARINI YÜKLE
  // --------------------------------------------------

  async function loadGuildSettings(guildId) {
    if (!guildId) return;

    isLoading = true;

    elements.guildSelect.disabled = true;
    elements.refreshBtn.disabled = true;

    setConnection("connecting", "Ayarlar yükleniyor");

    try {
      const response = await apiRequest(
        `/guilds/${encodeURIComponent(guildId)}/settings`
      );

      const settings =
        response?.settings ??
        response?.data?.settings ??
        response?.data ??
        response;

      const serverChannels =
        response?.channels ??
        response?.data?.channels ??
        validChannelsFromGuild(guildId);

      channels = Array.isArray(serverChannels)
        ? serverChannels
        : [];

      elements.prefixInput.value = settings?.prefix ?? "PXD-";

      elements.mentionEveryone.checked =
        Boolean(settings?.mentionEveryone);

      elements.antiLinkEnabled.checked =
        Boolean(settings?.antiLinkEnabled);

      elements.antiSpamEnabled.checked =
        Boolean(settings?.antiSpamEnabled);

      elements.antiBadWordsEnabled.checked =
        Boolean(settings?.antiBadWordsEnabled);

      elements.autoReplyEnabled.checked =
        Boolean(settings?.autoReplyEnabled);

      elements.welcomeEnabled.checked =
        Boolean(settings?.welcomeEnabled);

      populateChannelSelect(
        elements.welcomeChannelId,
        channels,
        settings?.welcomeChannelId
      );

      populateChannelSelect(
        elements.logChannelId,
        channels,
        settings?.logChannelId
      );

      isDirty = false;

      setSaveStatus("Ayarlar sunucudan yüklendi.", "success");
      setConnection("connected", "Bağlantı kuruldu");
    } finally {
      isLoading = false;

      elements.guildSelect.disabled = false;
      elements.refreshBtn.disabled = false;
    }
  }

  function validChannelsFromGuild(guildId) {
    const guild = guilds.find(
      (item) => getGuildId(item) === String(guildId)
    );

    return Array.isArray(guild?.channels) ? guild.channels : [];
  }

  // --------------------------------------------------
  // SUNUCU DEĞİŞTİRME
  // --------------------------------------------------

  elements.guildSelect.addEventListener("change", async () => {
    const nextGuildId = elements.guildSelect.value;

    if (!nextGuildId || nextGuildId === currentGuildId) return;

    if (isDirty) {
      const confirmed = window.confirm(
        "Kaydedilmemiş değişikliklerin var. Başka sunucuya geçmek istiyor musun?"
      );

      if (!confirmed) {
        elements.guildSelect.value = currentGuildId;
        return;
      }
    }

    const previousGuildId = currentGuildId;
    currentGuildId = nextGuildId;

    try {
      await loadGuildSettings(currentGuildId);
    } catch (error) {
      if (handleApiError(error)) return;

      currentGuildId = previousGuildId;
      elements.guildSelect.value = previousGuildId;

      setConnection("error", "Ayarlar yüklenemedi");
      showToast(error.message, "error");
    }
  });

  // --------------------------------------------------
  // DEĞİŞİKLİK TAKİBİ
  // --------------------------------------------------

  for (const id of settingsFields) {
    const field = $(id);

    if (!field) continue;

    const markDirty = () => {
      if (isLoading || isSaving) return;

      setDirty(true);
    };

    field.addEventListener("input", markDirty);
    field.addEventListener("change", markDirty);
  }

  // --------------------------------------------------
  // AYARLARI TOPLA VE DOĞRULA
  // --------------------------------------------------

  function collectSettings() {
    return {
      prefix: elements.prefixInput.value.trim(),

      mentionEveryone: elements.mentionEveryone.checked,

      antiLinkEnabled: elements.antiLinkEnabled.checked,
      antiSpamEnabled: elements.antiSpamEnabled.checked,
      antiBadWordsEnabled: elements.antiBadWordsEnabled.checked,

      autoReplyEnabled: elements.autoReplyEnabled.checked,
      welcomeEnabled: elements.welcomeEnabled.checked,

      welcomeChannelId: elements.welcomeChannelId.value || null,
      logChannelId: elements.logChannelId.value || null
    };
  }

  function validateSettings(settings) {
    if (!settings.prefix) {
      elements.prefixInput.focus();

      throw new Error("Komut prefix'i boş bırakılamaz.");
    }

    if (settings.prefix.length > 8) {
      elements.prefixInput.focus();

      throw new Error(
        "Komut prefix'i en fazla 8 karakter olabilir."
      );
    }

    if (/[\r\n]/.test(settings.prefix)) {
      elements.prefixInput.focus();

      throw new Error(
        "Komut prefix'i satır sonu içeremez."
      );
    }
  }

  // --------------------------------------------------
  // AYARLARI KAYDET
  // --------------------------------------------------

  elements.saveBtn.addEventListener("click", async () => {
    if (isSaving || isLoading) return;

    if (!currentGuildId) {
      showToast("Önce bir sunucu seçmelisin.", "error");
      return;
    }

    const settings = collectSettings();

    try {
      validateSettings(settings);
    } catch (error) {
      showToast(error.message, "error");
      return;
    }

    isSaving = true;

    const originalHTML =
      '<span><i class="fa-solid fa-cloud-arrow-up"></i> Ayarları kaydet</span>' +
      '<i class="fa-solid fa-arrow-right button-arrow"></i>';

    setButtonLoading(elements.saveBtn, true);

    setSaveStatus("Ayarlar sunucuya gönderiliyor...");

    try {
      await apiRequest(
        `/guilds/${encodeURIComponent(currentGuildId)}/settings`,
        {
          method: "PUT",
          body: JSON.stringify(settings)
        }
      );

      isDirty = false;

      setSaveStatus("Ayarlar başarıyla kaydedildi.", "success");
      showToast("Sunucu ayarları kaydedildi.", "success");
    } catch (error) {
      if (handleApiError(error)) return;

      setSaveStatus("Kaydetme başarısız oldu.", "error");
      showToast(error.message, "error");
    } finally {
      isSaving = false;

      setButtonLoading(elements.saveBtn, false, originalHTML);
    }
  });

  // --------------------------------------------------
  // YENİLE
  // --------------------------------------------------

  elements.refreshBtn.addEventListener("click", async () => {
    if (isLoading || isSaving) return;

    if (isDirty) {
      const confirmed = window.confirm(
        "Kaydedilmemiş değişikliklerin var. Yenilemek bunları kaybettirebilir. Devam edilsin mi?"
      );

      if (!confirmed) return;
    }

    const originalHTML =
      '<i class="fa-solid fa-rotate refresh-icon"></i> Yenile';

    setButtonLoading(elements.refreshBtn, true);

    try {
      await loadGuilds();

      showToast(
        "Sunucu ve ayar bilgileri yenilendi.",
        "success"
      );
    } catch (error) {
      if (handleApiError(error)) return;

      setConnection("error", "Yenileme başarısız");
      showToast(error.message, "error");
    } finally {
      setButtonLoading(
        elements.refreshBtn,
        false,
        originalHTML
      );
    }
  });

  // --------------------------------------------------
  // DASHBOARD BAŞLAT
  // --------------------------------------------------

  async function initializeDashboard() {
    if (!token) {
      window.location.replace(LOGIN_URL);
      return;
    }

    setConnection("connecting", "Oturum doğrulanıyor");

    try {
      // İlk istek, tokenin backend tarafından doğrulanmasını sağlar.
      await loadGuilds();

      showWorkspace();

      setConnection("connected", "Bağlantı kuruldu");
    } catch (error) {
      if (handleApiError(error)) return;

      setConnection("error", "Bağlantı başarısız");

      showToast(error.message, "error");
    }
  }

  initializeDashboard();
});