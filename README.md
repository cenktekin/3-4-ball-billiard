# 🎱 Carom Billiards

Client-side carom billiards oyunu — tarayıcıda doğrudan oynanır, kurulum gerektirmez.

## 🎮 Oyun Modları

| Mod | Açıklama |
|-----|----------|
| **3-Ball** | 3 top ile klasik sayı oyunu |
| **3-Cushion (3 Bant)** | Sayı için en az 3 bant + hedef toplara temas |
| **4-Ball** | 4 top ile puan toplama |

## ✨ Özellikler

- **Fizik motoru** — top-top çarpışmalar, bant sekmeleri, dt-bağımlı sürtünme
- **Yapay zeka rakip** — 3 zorluk seviyesi (kolay/orta/zor), cushion-first shot stratejisi
- **Spin kontrolü** — İngilizce (sağ/sol) + follow/draw (ileri/geri), vuruş yönüne göre hesaplanan 3×3 görsel indikatör
- **Yörünge tahmini** — yeşil çizgi topun bant'lardan sekerek gideceği yolu gösterir
- **Ghost ball** — vuruş noktası göstergesi (hedef topun arkasında)
- **Power ring** — glow efektli, 25/50/75% kritik eşik çizgileri
- **Spin rotation marker** — hareket halindeki topun dönüş yönü oku
- **Vuruş göstergesi ve skor tablosu**
- **Practice & Time Attack modları**
- **Responsive tasarım**

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
├── index.html          # Ana sayfa (script yükleme sırası kritik)
├── css/
│   └── styles.css      # Stiller
└── js/
    ├── physics.js      # Fizik motoru (dt-bağımlı friction, spin objesi)
    ├── ball.js         # Top yönetimi (spin objesi, trail gradient, dönüş oku)
    ├── table.js        # Masa çizimi
    ├── audio.js        # Ses efektleri (vuruş, bant, top-top)
    ├── stats.js        # Kariyer istatistikleri (localStorage)
    ├── i18n.js         # Çoklu dil desteği (TR/EN)
    ├── ui.js           # Arayüz bileşenleri (menü, spin zone, ghost ball, power ring)
    ├── game.js         # Oyun state sınıfı
    ├── mode4ball.js    # 4-ball modu
    ├── mode3ball.js    # 3-ball + 3-bant modu
    ├── challenge.js    # Challenge modu
    ├── ai.js           # Yapay zeka
    ├── gameloop.js     # Update/state machine
    ├── renderer.js     # Render pipeline
    ├── input.js        # Mouse/touch input (sağ tık spin, sol tık vuruş)
    └── main.js         # Başlatma (init + module wiring)
```

## 🛠 Teknolojiler

- **HTML5 Canvas** — Grafikler
- **Vanilla JavaScript** — Fizik ve mantık
- **CSS3** — Stiller

> Framework bağımlılığı yok — saf JavaScript.

## 📄 Lisans

MIT
