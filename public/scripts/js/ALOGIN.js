"use strict";

const loginForm = document.getElementById("loginForm");
const tokenInput = document.getElementById("adminToken");
const togglePassword = document.getElementById("togglePassword");
const loginButton = document.getElementById("loginButton");
const loginError = document.getElementById("loginError");

const API_BASE = "/api/dashboard";

togglePassword.addEventListener("click", () => {
    const hidden = tokenInput.type === "password";

    tokenInput.type = hidden ? "text" : "password";
    togglePassword.innerHTML = hidden
        ? '<i class="fa-regular fa-eye-slash"></i>'
        : '<i class="fa-regular fa-eye"></i>';
});

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const token = tokenInput.value.trim();

    loginError.textContent = "";

    if (!token) {
        loginError.textContent = "Lütfen yönetici tokenini gir.";
        return;
    }

    loginButton.disabled = true;
    loginButton.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i><span>Doğrulanıyor...</span>';

    try {
        // Tokeni backend üzerinde doğrula.
        const response = await fetch(`${API_BASE}/guilds`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json"
            },
            cache: "no-store"
        });

        if (response.status === 401 || response.status === 403) {
            loginError.textContent = "Token geçersiz veya erişim iznin yok.";
            return;
        }

        if (!response.ok) {
            throw new Error(`Sunucu hatası: ${response.status}`);
        }

        // Token yalnızca bu sekmenin oturumu boyunca saklanır.
        sessionStorage.setItem("pxdbot_admin_token", token);

        // Giriş başarılı: Dashboard'a geç.
        window.location.assign("/dashboard");
    } catch (error) {
        console.error("PXDBot giriş hatası:", error);
        loginError.textContent =
            "Sunucuya ulaşılamadı. Botun ve web sunucusunun çalıştığını kontrol et.";
    } finally {
        loginButton.disabled = false;
        loginButton.innerHTML =
            '<span>Giriş Yap</span><i class="fa-solid fa-arrow-right"></i>';
    }
});