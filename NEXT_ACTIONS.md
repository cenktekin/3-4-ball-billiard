# NEXT_ACTIONS — 3-4-ball-billiard

> **Amaç (dönüş çapası):** Yeni bir oturumda Sisyphus'a sadece şunu söyle:
> **"D:\projects\3-4-ball-billiard\NEXT_ACTIONS.md oku ve uygula."** — gerisini bu dosya anlatır.

- **Son denetim:** 2026-10-16 · mod: ince / orta
- **Denetim takibi kapandı:** 2026-10-19
- **Sağlık:** 79/100 ▲ (önceki 72)
- **Referanslar:**
  - Ledger: `D:\projects\MASTER_PROJECT_LEDGER.md` → bölüm "19 Ekim 2026"
  - Joplin: "3-4-ball-billiard — Denetim Raporu (2026-10-16)" · id `1be319f66e84413ba17b142420c56527` (Notes/Teknik Notlar)
  - TickTick: "🔎 KONTROL: 3-4-ball-billiard denetim takibi" · vade 2026-10-30 (👨‍💻Teknik İşler)

## ▶️ Sıradaki komut

```text
/proje-denetim @3-4-ball-billiard tam orta
```

## ✅ TAMAMLANDI (2026-10-19)

| # | Kalem | Durum |
|---|-------|-------|
| 1 | Push `85998d6` (cushion fix) | ✅ push edildi |
| 2 | `PROJECT_HEALTH.md` güncelle | ✅ 214/214 assertion, "18+4" dosya, 4 test suite, satır sayıları boş-satır-hariç, sağlık 79/100, cushion-count riski kapandı |
| 3 | CI workflow ekle | ⏳ `.github/workflows/test.yml` hazır ama **push edilemedi** — OAuth token'da `workflow` scope yok; web UI'dan eklenmeli |
| 4 | Boş `catch {}` düzelt | ✅ `js/input.js:221` + `js/stats.js:47` → `console.warn` |
| 5 | `README.md` test bölümü | ✅ 4 suite / 214 assertion + proje ağacı |
| 6 | Kök gürültüsü temizle | ✅ `.commandcode/` + Joplin export `.md` → `.gitignore`; `NEXT_ACTIONS.md` takibe alındı |

## ⏸️ ERTELENEN (uzun vade, ayrı oturum)

- `ui.js` (880) + `ui-menus.js` (527) → modüllere böl
- Uzun fonksiyonlar: `ui-menus.drawMenu`(185), `input.handleMenuClick`(124), `physics.integrateBall`(121)
- `Physics.simulateTrajectory` / `simulateFullShot` kod tekrarını birleştir
- E2E (tarayıcı içi akış) testi

## ⛔ REDDEDİLEN

- Online leaderboard / hesap sistemi (backend gerekir, statik mimariyi bozar)
- PWA / offline süs (zaten tarayıcıda çalışıyor)
