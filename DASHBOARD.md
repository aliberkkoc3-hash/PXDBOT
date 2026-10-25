# PXDBot Yönetim Paneli

## Kurulum

1. Node.js LTS kurulu olmalı.
2. Proje klasöründe `npm install` çalıştır.
3. `.env.example` dosyasını `.env` olarak kopyala; `TOKEN` değerini kendi Discord bot token'ınla doldur. Mevcut `.env` dosyan varsa üzerine yazma, sadece eksik değişkenleri ekle.
4. Yönetim paneli için ayrı ve güçlü bir `DASHBOARD_TOKEN` üret. Örneğin CMD'de `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` komutunu çalıştırıp çıktıyı `.env` içine koy. Bu değeri kimseyle paylaşma.
5. Daha önce `config.json` içinde kaynak koda yazılmış Genius token'ı bulunduğundan, o token'ı sağlayıcı panelinden yenile/iptal et. Yeni değeri yalnızca `.env` içindeki `GENIUS_TOKEN` değişkenine koy. `.env` dosyasını açıp paylaşmana gerek yok.
6. `npm start` çalıştır. Panel `http://localhost:3000/dashboard` adresinde açılır.
7. Panelde `DASHBOARD_TOKEN` değerini gir. Botun bulunduğu sunucuyu seçip ayarları değiştir.

## Paneldeki ayarlar

- Sunucuya özel komut prefix'i
- Karşılama sistemi ve kanal seçimi
- Log kanalı
- Link koruması, anti-spam ve küfür filtresi aç/kapat
- Otomatik cevapları aç/kapat
- Otomatik sistemler için `@everyone` izni

Ayarlar `data/guild-settings.json` dosyasına kaydedilir; bu dosya `.gitignore` içindedir. Yeni ayarlar mevcut bot süreci içinde uygulanır.

## Güvenlik notları

- `DASHBOARD_TOKEN` değerini Discord bot token'ı ile aynı yapma.
- Paneli herkese açık bir sunucuda barındırıyorsan HTTPS kullan ve güçlü token'ı gizli tut.
- `.env` ve `data/guild-settings.json` dosyalarını Git'e ekleme.
- Bu panel, global yönetici token'ı ile korunan bir kontrol panelidir; Discord OAuth tabanlı kullanıcı/rol yetkilendirmesi değildir. Token yalnızca güvendiğin yöneticiye verilmelidir.
