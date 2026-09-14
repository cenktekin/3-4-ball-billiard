# 🎱 Carom Billiards

Client-side carom billiards oyunu — tarayıcıda doğrudan oynanır, kurulum gerektirmez.

## 🎮 Oyun Modları

| Mod | Açıklama |
|-----|----------|
| **3-Ball** | 3 top ile klasik sayı oyunu |
| **3-Cushion (3 Bant)** | Sayı için en az 3 bant + hedef toplara temas |
| **4-Ball** | 4 top ile puan toplama |

## ✨ Özellikler

- **Fizik motoru** — Top-top çarpışmalar, bant sekmeleri, spin (follow/draw + English), **dt-scaled friction** (rollingFriction × substep dt), **fixed-timestep 240Hz simülasyon** (framerate-independent), 24 ayarlanabilir sabit (`Physics.CONFIG`)
- **Paylaşımlı simülasyon** — Tüm UI yüzeyleri (yörünge tahmini, rest marker'lar) tek bir ortak API'den (`Physics.simulateTrajectory`) beslenir, elle çizim yok
- **Yapay zeka rakip** — 3 zorluk seviyesi (kolay/orta/zor), cushion-first shot stratejisi
- **Spin kontrolü** — İngilizce (sağ/sol) + follow/draw (ileri/geri), vuruş yönüne göre hesaplanan 3×3 görsel indikatör
- **Yörünge tahmini** — Yeşil çizgi topun bant'lardan sekerek gideceği yolu gösterir
- **Ghost ball** — Vuruş noktası göstergesi (hedef topun arkasında)
- **Power ring** — Glow efektli, 25/50/75% kritik eşik çizgileri
- **Spin rotation marker** — Hareket halindeki topun dönüş yönü oku
- **Vuruş göstergesi ve skor tablosu**
- **Predictive aiming UI (Todo 6)** — Hedeflenen top, ilk temas noktası, bant sırası, topun duracağı nokta (cue rest), hedef topun duracağı nokta (target rest), tahmini mesafe — tümü fizik simülasyonundan hesaplanır, elle çizim yok
- **Practice & Time Attack modları**
- **Responsive tasarım (Todo 7)** — 375px mobil viewport desteği, CSS-first scaling, touch events

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
| **Sağ Tık** | Spin ayarla |
| **Space** | Tebeşir (chalk) |
| **R** | Topları sıfırla / Spin sıfırla (Shift+R = replay) |
| **G** | Yörünge tahmini aç/kapat |
| **C** | Practice modu aç/kapat |
| **H** | AI önerisi uygula (practice modunda) |
| **↑/→** | Güç artır |
| **↓/←** | Güç azalt |

## 📁 Proje Yapısı

```
3-4-ball-billiard/
├── index.html          # Ana sayfa (script yükleme sırası kritik)
├── css/
│   └── styles.css      # Stiller (responsive: max-width: 100%; height: auto)
├── tests/
│   ├── physics.test.cjs # Fizik motoru unit testleri (79 assertion)
│   ├── ai.test.cjs      # AI davranış testleri (99 assertion)
│   └── ui-guidance.test.cjs # UI guidance contract testleri (27 assertion)
├── archive/            # Eski fix_physics*.cjs kalıntıları
└── js/
    ├── physics.js      # Fizik motoru (Physics.CONFIG: 24 sabit, roll/drag/friction, dt-scaled integration)
    ├── ball.js         # Top yönetimi (spin objesi, trail gradient, dönüş oku)
    ├── table.js        # Masa çizimi (900×620 logical, CSS responsive)
    ├── audio.js        # Ses efektleri (vuruş, bant, top-top)
    ├── stats.js        # Kariyer istatistikleri (localStorage)
    ├── i18n.js         # Çoklu dil desteği (TR/EN) — 6 yeni anahtar: restCue, restTarget, predictedDistance, cushionCount, firstContact, spinMag
    ├── ui.js           # Arayüz çekirdeği (UI.getShotGuidance: fizik tabanlı rehberlik, rest marker'lar, HUD)
    ├── ui-effects.js   # Görsel efektler (konfeti, tebeşir)
    ├── ui-menus.js     # Menüler ve butonlar (ana menü, istatistik, challenge)
    ├── game.js         # Oyun state sınıfı
    ├── mode4ball.js    # 4-ball modu
    ├── mode3ball.js    # 3-ball + 3-bant modu
    ├── challenge.js    # Challenge modu
    ├── ai.js           # Yapay zeka (analitik, fizik ile uyumlu)
    ├── gameloop.js     # Update/state machine (fixed-timestep 240Hz)
    ├── renderer.js     # Render pipeline (backing store: 900×620×dpr)
    ├── input.js        # Mouse/touch input (sağ tık spin, sol tık vuruş, rect-relative mapping)
    └── main.js         # Başlatma (init + module wiring)
```

## 🛠 Teknolojiler

- **HTML5 Canvas** — Grafikler
- **Vanilla JavaScript** — Fizik ve mantık
- **CSS3** — Stiller (responsive)

> Framework bağımlılığı yok — saf JavaScript.

## 🧪 Testler

```bash
node tests/physics.test.cjs    # 79 assertions
node tests/ai.test.cjs          # 99 assertions
node tests/ui-guidance.test.cjs # 27 assertions
```

Toplam: **205 assertion** (3 test dosyası).

## 📄 Lisans

MIT
