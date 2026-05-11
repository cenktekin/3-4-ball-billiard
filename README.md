# 🎱 Carom & 4-Ball Billiards

Client-side carom billiards oyunu — tarayıcıda doğrudan oynanır, kurulum gerektirmez.

## 🎮 Oyun Modları

| Mod | Açıklama |
|-----|----------|
| **3-Ball Carom** | Klasik carom — 3 top, buffer hedefi yok |
| **4-Ball Carom** | 4 top ile puan toplama (kırmızı + sarı) |

## ✨ Özellikler

- Fizik motoru (top çarpışmaları, yastık sekmeleri)
- Yapay zeka rakip
- Spin kontrolü (yana/dik vuruş)
- Vuruş göstergesi ve skor tablosu
- Responsive tasarım

## 🚀 Kullanım

Proje statik HTML/CSS/JS — herhangi bir web sunucusunda çalışır.

### Yöntem 1: GitHub Pages (Önerilen)

Proje [burada](https://cenktekin.github.io/3-4-ball-billiard/) canlı olarak yayınlanır.

### Yöntem 2: Yerel Çalıştırma

```bash
git clone https://github.com/cenktekin/3-4-ball-billiard.git
cd 3-4-ball-billiard
# Python ile
python3 -m http.server 8000
# Veya Node.js ile
npx serve .
```

Tarayıcıda `http://localhost:8000` adresine gidin.

## 🎯 Kontroller

| Tuş | Aksiyon |
|-----|---------|
| **Fare** | Nişan al |
| **Sol Tık** | Vuruş yap |
| **Spin Kontrolü** | Topun üzerine tıklayarak spin ayarla |

## 📁 Proje Yapısı

```
3-4-ball-billiard/
├── index.html          # Ana sayfa
├── css/
│   └── styles.css      # Stiller
└── js/
    ├── physics.js      # Fizik motoru
    ├── ball.js         # Top yönetimi
    ├── table.js        # Masa çizimi
    ├── ui.js           # Arayüz bileşenleri
    ├── game.js         # Oyun mantığı
    ├── mode3ball.js    # 3-ball modu
    ├── mode4ball.js    # 4-ball modu
    ├── ai.js           # Yapay zeka
    └── main.js         # Başlatma
```

## 🛠 Teknolojiler

- **HTML5 Canvas** — Grafikler
- **Vanilla JavaScript** — Fizik ve mantık
- **CSS3** — Stiller

> Framework bağımlılığı yok — saf JavaScript.

## 📄 Lisans

MIT
