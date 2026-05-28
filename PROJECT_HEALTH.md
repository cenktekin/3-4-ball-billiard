# PROJECT_HEALTH.md — 3-4-ball-billiard

## Sağlık Puanı: 86/100 🟢

### Güçlü Yanlar
- **Saf JS mimarisi** — Framework bağımlılığı yok, 11 modüler JS dosyasına ayrılmış
- **Fizik motoru** — Çarpışma, spin, sürtünme, sekmeler dahil kapsamlı fizik simülasyonu
- **3 oyun modu** — 3-Ball, 3-Cushion, 4-Ball — farklı kurallar ve skorlama
- **AI rakip** — `ai.js` (445 satır) ile yapay zeka rakibi
- **Dökümantasyon** — Detaylı README (İngilizce), proje yapısı, kontroller, kurulum talimatları
- **Deploy** — GitHub Pages üzerinde canlı, statik HTML ile zero-config
- **İleri özellikler** — Spin kontrolü, vuruş göstergesi, ses efektleri, istatistikler, konfeti, screen shake
- **Responsive tasarım** — Touch events dahil mobil desteği
- **Git hygiene** — Temiz `.gitignore`, `.github/` mevcut

### Riskler

| Risk | Seviye | Detay |
|------|--------|-------|
| `ui.js` çok büyük | 🟡 Orta | 949 satır — DOM/element yönetimi, animasyonlar, efektler tek dosyada |
| `main.js` çok büyük | 🟡 Orta | 703 satır — oyun döngüsü, event handling, menü akışı, replay mekanizması |
| `fix_physics*.cjs` kalıntıları | 🟢 Düşük | Kök dizinde 4 adet fizik düzeltme scripti (kullanılmıyor olabilir) |
| Test yok | 🟢 Düşük | Vanilla JS projesi için unit test eksikliği |

### Öneriler

1. **🔧 `ui.js` ve `main.js` böl** — ui.js'den efekt (konfeti, tebeşir, screen shake) ayrı modüllere çıkarılabilir. main.js'deki game loop ve menü yönetimi ayrıştırılabilir.
2. **🧹 `fix_physics*.cjs` temizle** — Kullanılmıyorsa `archive/` altına taşı veya sil
3. **✅ Basit test ekle** — Özellikle fizik motoru için en azından collision, friction testleri

### Detaylar

- **Toplam JS**: 3,409 satır (11 dosya)
- **CSS**: 1 dosya (`styles.css`)
- **Anahtar dosyalar**: `ui.js` (949 satır), `main.js` (703 satır), `ai.js` (445 satır), `physics.js` (385 satır)
- **Dosya sınırı aşımı**: `ui.js` (949) ve `main.js` (703) → 400 satır sınırının üzerinde
- **README**: ✅ Mevcut, kapsamlı
- **Lisans**: MIT
- **Son değişiklik**: fix_physics iterasyonları (cjs scriptleri) fizik motorunda sorun yaşandığını gösteriyor
