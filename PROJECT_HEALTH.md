# PROJECT_HEALTH.md — 3-4-ball-billiard

## Sağlık Puanı: 96/100 🟢

### Güçlü Yanlar
- **Saf JS mimarisi** — Framework bağımlılığı yok, 18+3 modüler JS dosyasına ayrılmış (ui.js, ui-effects.js, ui-menus.js ayrıldı)
- **Fizik motoru** — P1–P7'de iyileştirildi: **dt-scaled friction** (rollingFriction × substep dt), **fixed-timestep 240Hz alt-adımlı simülasyon** (framerate-independent), 24 ayarlanabilir sabit (`Physics.CONFIG`), paylaşımlı `runWorldToRest()` integratörü
- **Unit testler** — `tests/physics.test.cjs` (79 test), `tests/ai.test.cjs` (99 test), `tests/ui-guidance.test.cjs` (27 test) — **205/205 PASS** (3 suite, deterministik, byte-identical ×2)
- **3 oyun modu** — 3-Ball, 3-Cushion, 4-Ball — farklı kurallar ve skorlama
- **AI rakip** — `ai.js` (451 satır) ile yapay zeka rakibi, 3 zorluk seviyesi, fizik ile uyumlu (sign convention, parity)
- **i18n** — TR/EN tam destek, 6 yeni UI anahtarı (restCue, restTarget, predictedDistance, cushionCount, firstContact, spinMag)
- **Deploy** — GitHub Pages üzerinde canlı, statik HTML ile zero-config
- **İleri özellikler** — Spin kontrolü, vuruş göstergesi, yörünge tahmini (cache'li), dönüş oku, ses efektleri, konfeti, screen shake, **fizik tabanlı aiming UI** (rest marker'lar, HUD, spin magnitude)
- **Responsive tasarım** — 375px mobil viewport desteği, CSS-first scaling, touch events
- **Git hygiene** — Temiz `.gitignore`, `.github/` mevcut

### Riskler

| Risk | Seviye | Detay |
|------|--------|-------|
| `ui-menus.js` büyük | 🟡 Orta | 606 satır — menü çizimleri + buton getter'ları tek dosyada (i18n bağlandı) |
| `ui.js` büyük | 🟡 Orta | 889 satır — nişan/power/stick çizimleri + HUD + fizik tabanlı guidance |
| `gameloop.js` büyük | 🟡 Orta | 543 satır — state machine + game loop |
| E2E test yok | 🟢 Düşük | Fizik unit testleri mevcut; tarayıcı içi akış testi yok |

### Çözülen Riskler (son bakım)

- ~~`ui.js` 949 satır tek dosya~~ → 3 dosyaya bölündü: `ui.js` (çekirdek çizimler) + `ui-effects.js` (konfeti, tebeşir) + `ui-menus.js` (menüler, butonlar) — `Object.assign(UI, ...)` deseni ile
- ~~`fix_physics*.cjs` kök dizinde~~ → `archive/` klasörüne taşındı (4 dosya)
- ~~Test yok~~ → `tests/physics.test.cjs` eklendi, **24/24 PASS → 79/0** (Todo 2-3-4)
- ~~AI test yok~~ → `tests/ai.test.cjs` eklendi, **99/0** (Todo 5)
- ~~UI guidance contract test yok~~ → `tests/ui-guidance.test.cjs` eklendi, **27/0** (Todo 6)
- ~~İstatistik ekranı hardcoded metin~~ → tüm menü/istatistik/efekt metinleri I18n anahtarlarına bağlandı

### Detaylar

- **Toplam JS**: ~5,300 satır (21 dosya: physics, ball, table, audio, stats, i18n, ui, ui-effects, ui-menus, game, mode4ball, mode3ball, challenge, ai, gameloop, renderer, input, main + 3 test)
- **CSS**: 1 dosya (`styles.css`) — responsive eklendi
- **Büyük dosyalar**: `ui.js` (889), `ui-menus.js` (606), `gameloop.js` (543), `ai.js` (451), `physics.js` (465), `input.js` (348)
- **Testler**: 3 test dosyası, 205 toplam assertion, `node tests/*.test.cjs` ile çalışır
- **README**: ✅ Güncellenmiş (fizik sözleşmesi, test komutları, responsive)
- **Lisans**: MIT
- **Son değişiklik**: P7 — responsive canvas + physics-derived UI guidance

### Fizik Sözleşmesi (v7)

- **Unit**: px (uzaklık), frame (1/60s) zaman, 0.25 substep dt (240Hz)
- **Roll friction**: `ball.vx *= (1 - rollingFriction * dt)` — **dt-scaled**, not per-frame
- **Spin**: follow/draw (spinY), English (spinX) — **sign convention physical**
- **Collision**: elastic (restitution 0.8), no tunneling (high-speed check)
- **Constants**: 24 via `Physics.CONFIG` — no top-level exports

### Measured Metrics

- **Predictive aiming budget**: cache miss 0.40–1.17ms, cached 0.015–0.049ms (vm harness, 300 iterations)
- **Responsive**: 375px viewport works without horizontal overflow; backing store 900×620×dpr intact
