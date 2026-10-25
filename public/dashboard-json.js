(() => {
  "use strict";

  const API = "/api/dashboard/data-files";
  const LOGIN_URL = "/pages/AdminLogin.html";
  const TOKEN_KEY = "pxdbot_admin_token";

  const FILES = [
    "autoreplies.json",
    "badWords.json",
    "blackList.json",
    "whiteList.json",
  ];

  const $ = (id) => document.getElementById(id);

  const elements = {
    card: $("jsonManagerCard"),
    fileSelect: $("jsonFileSelect"),
    editor: $("jsonEditor"),
    fileName: $("jsonFileName"),
    fileStatus: $("jsonFileStatus"),
    fileDot: $("jsonFileDot"),
    validationMessage: $("jsonValidationMessage"),
    charCount: $("jsonCharCount"),
    reloadBtn: $("jsonReloadBtn"),
    validateBtn: $("jsonValidateBtn"),
    saveBtn: $("jsonSaveBtn"),
  };

  // HTML kartı yoksa mevcut dashboard'u etkileme.
  if (Object.values(elements).some((element) => !element)) {
    console.warn("[JSON PANEL] Editör HTML elemanları bulunamadı.");
    return;
  }

  let selectedFile = elements.fileSelect.value;
  let originalText = "";
  let isLoading = false;
  let isSaving = false;

  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  async function apiRequest(url, options = {}) {
    const token = getToken();

    if (!token) {
      window.location.href = LOGIN_URL;
      throw new Error("Yönetici oturumu bulunamadı.");
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
      cache: "no-store",
    });

    let result;

    try {
      result = await response.json();
    } catch {
      result = {};
    }

    if (response.status === 401 || response.status === 403) {
      sessionStorage.removeItem(TOKEN_KEY);
      window.location.href = LOGIN_URL;
      throw new Error("Oturum sona erdi. Lütfen tekrar giriş yap.");
    }

    if (!response.ok) {
      throw new Error(
        result.error ||
          result.message ||
          `İstek başarısız oldu (HTTP ${response.status}).`,
      );
    }

    return result;
  }

  function setStatus(message, state = "idle") {
    elements.fileStatus.textContent = message;
    elements.fileStatus.dataset.state = state;
    elements.fileDot.dataset.state = state;
  }

  function setValidationMessage(message, state = "idle") {
    elements.validationMessage.textContent = message;
    elements.validationMessage.dataset.state = state;
  }

  function isDirty() {
    return elements.editor.value !== originalText;
  }

  function updateCharacterCount() {
    elements.charCount.textContent = `${elements.editor.value.length.toLocaleString("tr-TR")} karakter`;
  }

  function updateButtons() {
    const locked = isLoading || isSaving;
    const hasFile = Boolean(selectedFile);

    elements.fileSelect.disabled = locked;
    elements.editor.disabled = locked || !hasFile;
    elements.reloadBtn.disabled = locked || !hasFile;
    elements.validateBtn.disabled = locked || !hasFile;
    elements.saveBtn.disabled = locked || !hasFile || !isDirty();

    if (!locked && isDirty()) {
      setStatus("Kaydedilmemiş değişiklikler var.", "dirty");
    }
  }

  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function hasStringArray(value) {
    return (
      Array.isArray(value) &&
      value.every(
        (item) =>
          typeof item === "string" &&
          item.trim().length > 0 &&
          item.length <= 255,
      )
    );
  }

  // Yardımcı modülün FILE_SCHEMAS kurallarını istemcide de kontrol et.
  function validateData(filename, data) {
    if (!isPlainObject(data)) {
      return "JSON kökü bir nesne olmalı; dizi veya null kullanılamaz.";
    }

    switch (filename) {
      case "autoreplies.json": {
        for (const [key, value] of Object.entries(data)) {
          if (!key.trim()) {
            return "Otomatik yanıt tetikleyicisi boş olamaz.";
          }

          if (key.length > 100) {
            return `"${key}" tetikleyicisi 100 karakterden uzun.`;
          }

          if (typeof value !== "string") {
            return `"${key}" yanıtı metin olmalı.`;
          }

          if (value.length > 2000) {
            return `"${key}" yanıtı 2000 karakterden uzun.`;
          }
        }

        return null;
      }

      case "badWords.json": {
        if (!hasStringArray(data.bannedWords)) {
          return "bannedWords boş olmayan metinlerden oluşan bir dizi olmalı (en fazla 255 karakter/item).";
        }

        if (Object.keys(data).length !== 1) {
          return "badWords.json yalnızca bannedWords alanını içerebilir.";
        }

        return null;
      }

      case "blackList.json": {
        if (!hasStringArray(data.bannedWords)) {
          return "bannedWords geçerli bir metin dizisi olmalı.";
        }

        if (!hasStringArray(data.bannedDomains)) {
          return "bannedDomains geçerli bir metin dizisi olmalı.";
        }

        if (
          Object.keys(data).length !== 2 ||
          !Object.hasOwn(data, "bannedWords") ||
          !Object.hasOwn(data, "bannedDomains")
        ) {
          return "blackList.json yalnızca bannedWords ve bannedDomains alanlarını içerebilir.";
        }

        return null;
      }

      case "whiteList.json": {
        if (!hasStringArray(data.allowedDomains)) {
          return "allowedDomains geçerli bir metin dizisi olmalı.";
        }

        if (
          Object.keys(data).length !== 1 ||
          !Object.hasOwn(data, "allowedDomains")
        ) {
          return "whiteList.json yalnızca allowedDomains alanını içerebilir.";
        }

        return null;
      }

      default:
        return "Bu dosyanın düzenlenmesine izin verilmiyor.";
    }
  }

  function parseAndValidate() {
    let data;

    try {
      data = JSON.parse(elements.editor.value);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Bilinmeyen hata";
      setValidationMessage(`JSON sözdizimi hatası: ${detail}`, "error");
      return null;
    }

    const schemaError = validateData(selectedFile, data);

    if (schemaError) {
      setValidationMessage(schemaError, "error");
      return null;
    }

    setValidationMessage("JSON sözdizimi ve dosya şeması geçerli.", "success");

    return data;
  }

  async function loadFile(filename, { force = false } = {}) {
    if (!FILES.includes(filename)) {
      setStatus("Bu dosyaya erişim izni yok.", "error");
      return;
    }

    if (isLoading || isSaving) return;

    if (!force && isDirty()) {
      const confirmed = window.confirm(
        "Kaydedilmemiş değişikliklerin var. Dosyayı değiştirmek istiyor musun? Değişikliklerin kaybolacak.",
      );

      if (!confirmed) {
        elements.fileSelect.value = selectedFile;
        return;
      }
    }

    isLoading = true;
    selectedFile = filename;

    elements.fileSelect.value = filename;
    elements.fileName.textContent = filename;
    elements.editor.disabled = true;
    updateButtons();
    setStatus("Dosya sunucudan yükleniyor…", "loading");
    setValidationMessage("Dosya bekleniyor…", "idle");

    try {
      const result = await apiRequest(`${API}/${encodeURIComponent(filename)}`);

      if (!result.success || result.filename !== filename) {
        throw new Error("Sunucudan beklenen dosya alınamadı.");
      }

      // Sunucudan gelen JSON'u okunaklı biçimde göster.
      originalText = JSON.stringify(result.data, null, 2);
      elements.editor.value = originalText;

      updateCharacterCount();
      setStatus("Dosya yüklendi.", "success");
      parseAndValidate();
    } catch (error) {
      originalText = "";
      elements.editor.value = "";
      updateCharacterCount();

      setStatus("Dosya yüklenemedi.", "error");
      setValidationMessage(
        error instanceof Error ? error.message : "Bilinmeyen hata.",
        "error",
      );

      console.error("[JSON PANEL] Dosya yükleme hatası:", error);
    } finally {
      isLoading = false;
      updateButtons();
    }
  }

  async function saveFile() {
    if (isLoading || isSaving || !isDirty()) return;

    const data = parseAndValidate();

    if (data === null) {
      setStatus("JSON doğrulamasını düzelt.", "error");
      return;
    }

    const confirmed = window.confirm(
      `${selectedFile} dosyasını sunucuya kaydetmek istiyor musun? Mevcut dosyanın yedeği oluşturulacak.`,
    );

    if (!confirmed) return;

    isSaving = true;
    updateButtons();
    setStatus("Dosya kaydediliyor…", "loading");

    try {
      const result = await apiRequest(
        `${API}/${encodeURIComponent(selectedFile)}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        },
      );

      if (!result.success) {
        throw new Error(result.error || "Dosya kaydedilemedi.");
      }

      // Kaydedilen JSON'u sunucunun kabul ettiği biçimde sabitle.
      originalText = JSON.stringify(data, null, 2);
      elements.editor.value = originalText;

      updateCharacterCount();
      setStatus(`${selectedFile} başarıyla kaydedildi.`, "success");
      setValidationMessage(
        "Değişiklikler kaydedildi ve sunucu tarafından kabul edildi.",
        "success",
      );

      notify("JSON dosyası başarıyla kaydedildi.", "success");
    } catch (error) {
      setStatus("Kaydetme başarısız.", "error");
      setValidationMessage(
        error instanceof Error ? error.message : "Bilinmeyen hata.",
        "error",
      );

      notify(
        error instanceof Error ? error.message : "JSON kaydedilemedi.",
        "error",
      );

      console.error("[JSON PANEL] Kaydetme hatası:", error);
    } finally {
      isSaving = false;
      updateButtons();
    }
  }

  function notify(message, type = "info") {
    // dashboard.js içindeki toast helper'ını varsa kullan.
    if (typeof window.showToast === "function") {
      window.showToast(message, type);
      return;
    }

    // Mevcut panelde toast helper global değilse durum mesajı yeterli.
    console.info(`[JSON PANEL] ${message}`);
  }

  elements.fileSelect.addEventListener("change", () => {
    loadFile(elements.fileSelect.value);
  });

  elements.editor.addEventListener("input", () => {
    updateCharacterCount();

    if (isDirty()) {
      setStatus("Kaydedilmemiş değişiklikler var.", "dirty");
      setValidationMessage("Kaydetmeden önce JSON'u doğrula.", "dirty");
    } else {
      setStatus("Dosya değişmedi.", "success");
      setValidationMessage("Değişiklik yok.", "idle");
    }

    updateButtons();
  });

  elements.validateBtn.addEventListener("click", () => {
    if (parseAndValidate()) {
      setStatus(
        isDirty()
          ? "Doğrulandı; değişiklikler henüz kaydedilmedi."
          : "Dosya geçerli.",
        isDirty() ? "dirty" : "success",
      );
    } else {
      setStatus("JSON doğrulaması başarısız.", "error");
    }

    updateButtons();
  });

  elements.reloadBtn.addEventListener("click", () => {
    loadFile(selectedFile);
  });

  elements.saveBtn.addEventListener("click", saveFile);

  // Sayfa yenilenirken kaydedilmemiş düzenlemeler için uyar.
  window.addEventListener("beforeunload", (event) => {
    if (isDirty()) {
      event.preventDefault();
      event.returnValue = "";
    }
  });

  // API listesini alıp izin verilen dosyalarla arayüzü eşleştir.
  async function initialize() {
    elements.fileSelect.disabled = true;
    elements.editor.disabled = true;
    elements.saveBtn.disabled = true;
    setStatus("Dosya listesi kontrol ediliyor…", "loading");

    try {
      const result = await apiRequest(API);

      if (!Array.isArray(result.files)) {
        throw new Error("Sunucudan geçerli dosya listesi alınamadı.");
      }

      const allowedFiles = FILES.filter((filename) =>
        result.files.includes(filename),
      );

      for (const option of elements.fileSelect.options) {
        option.disabled = !allowedFiles.includes(option.value);
      }

      if (allowedFiles.length === 0) {
        throw new Error(
          "Düzenlenebilir dosya bulunamadı. SCHEMAS ve dosya yollarını kontrol et.",
        );
      }

      const firstFile = allowedFiles.includes(selectedFile)
        ? selectedFile
        : allowedFiles[0];

      await loadFile(firstFile, { force: true });
    } catch (error) {
      setStatus("JSON paneli başlatılamadı.", "error");
      setValidationMessage(
        error instanceof Error ? error.message : "Bilinmeyen hata.",
        "error",
      );

      console.error("[JSON PANEL] Başlatma hatası:", error);
    } finally {
      if (!isLoading && !isSaving) {
        elements.fileSelect.disabled = false;
      }
    }
  }

  initialize();
})();
