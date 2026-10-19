# PROJECT_HEALTH.md — 3-4-ball-billiard

## Sağlık Puanı: 79/100 🟡

### Güçlü Yanlar
- **Saf JS mimarisi** — Framework bağımlılığı yok, 18+4 modüler JS dosyasına ayrılmış (ui.js, ui-effects.js, ui-menus.js ayrıldı)
- **Fizik motoru** — P1–P7'de iyileştirildi: **dt-scaled friction** (rollingFriction × substep dt), **fixed-timestep 240Hz alt-adımlı simülasyon** (framerate-independent), 24 ayarlanabilir sabit (`Physics.CONFIG`), paylaşımlı `runWorldToRest()` integratörü
- **Unit testler** — `tests/physics.test.cjs` (79 test), `tests/ai.test.cjs` (99 test), `tests/ui-guidance.test.cjs` (27 test), `tests/cushion-count.test.cjs` (9 test) — **214/214 PASS** (4 suite, deterministik, byte-identical ×2)
- **3 oyun modu** — 3-Ball, 3-Cushion, 4-Ball — farklı kurallar ve skorlama
- **AI rakip** — `ai.js` (400 satır) ile yapay zeka rakibi, 3 zorluk seviyesi, fizik ile uyumlu (sign convention, parity)
- **i18n** — TR/EN tam destek, 6 yeni UI anahtarı (restCue, restTarget, predictedDistance, cushionCount, firstContact, spinMag)
- **Deploy** — GitHub Pages üzerinde canlı, statik HTML ile zero-config
- **İleri özellikler** — Spin kontrolü, vuruş göstergesi, yörünge tahmini (cache'li), dönüş oku, ses efektleri, konfeti, screen shake, **fizik tabanlı aiming UI** (rest marker'lar, HUD, spin magnitude)
- **Responsive tasarım** — 375px mobil viewport desteği, CSS-first scaling, touch events
- **Git hygiene** — Temiz `.gitignore`, `.github/` mevcut

### Riskler

| Risk | Seviye | Detay |
|------|--------|-------|
| `ui-menus.js` büyük | 🟡 Orta | 527 satır — menü çizimleri + buton getter'ları tek dosyada (i18n bağlandı) |
| `ui.js` büyük | 🟡 Orta | 880 satır — nişan/power/stick çizimleri + HUD + fizik tabanlı guidance |
| `gameloop.js` büyük | 🟡 Orta | 513 satır — state machine + game loop |
| E2E test yok | 🟢 Düşük | Fizik unit testleri mevcut; tarayıcı içi akış testi yok |

### Çözülen Riskler (son bakım)

- ~~`ui.js` 949 satır tek dosya~~ → 3 dosyaya bölündü: `ui.js` (çekirdek çizimler) + `ui-effects.js` (konfeti, tebeşir) + `ui-menus.js` (menüler, butonlar) — `Object.assign(UI, ...)` deseni ile
- ~~`fix_physics*.cjs` kök dizinde~~ → `archive/` klasörüne taşındı (4 dosya)
- ~~Test yok~~ → `tests/physics.test.cjs` eklendi, **24/24 PASS → 79/0** (Todo 2-3-4)
- ~~AI test yok~~ → `tests/ai.test.cjs` eklendi, **99/0** (Todo 5)
- ~~UI guidance contract test yok~~ → `tests/ui-guidance.test.cjs` eklendi, **27/0** (Todo 6)
- ~~3-bant modunda rakip topların bant teması sayılıyordu~~ → `tests/cushion-count.test.cjs` eklendi, sadece isteka topu sayılıyor, **9/0** (`85998d6`)
- ~~İstatistik ekranı hardcoded metin~~ → tüm menü/istatistik/efekt metinleri I18n anahtarlarına bağlandı

### Detaylar

- **Toplam JS**: ~5,700 satır (22 dosya: physics, ball, table, audio, stats, i18n, ui, ui-effects, ui-menus, game, mode4ball, mode3ball, challenge, ai, gameloop, renderer, input, main + 4 test)
- **CSS**: 1 dosya (`styles.css`) — responsive eklendi
- **Büyük dosyalar** (boş satır hariç): `ui.js` (880), `ui-menus.js` (527), `gameloop.js` (513), `physics.js` (445), `input.js` (422), `ai.js` (400)
- **Testler**: 4 test dosyası, 214 toplam assertion, `node tests/*.test.cjs` ile çalışır
- **README**: ✅ Güncellenmiş (fizik sözleşmesi, test komutları, responsive)
- **Lisans**: MIT
- **Son değişiklik**: `85998d6` — 3-bant sayacı düzeltmesi (sadece isteka topu) + cushion-count testi

### Fizik Sözleşmesi (v7)

- **Unit**: px (uzaklık), frame (1/60s) zaman, 0.25 substep dt (240Hz)
- **Roll friction**: `ball.vx *= (1 - rollingFriction * dt)` — **dt-scaled**, not per-frame
- **Spin**: follow/draw (spinY), English (spinX) — **sign convention physical**
- **Collision**: elastic (restitution 0.8), no tunneling (high-speed check)
- **Constants**: 24 via `Physics.CONFIG` — no top-level exports

### Measured Metrics

- **Predictive aiming budget**: cache miss 0.40–1.17ms, cached 0.015–0.049ms (vm harness, 300 iterations)
- **Responsive**: 375px viewport works without horizontal overflow; backing store 900×620×dpr intact
