# 16: Uçtan uca test ve canlıya alma

**What to build:** Çekirdek satış akışının tek bir tarayıcı testiyle güvence altına alınması ve üretim ortamının hazırlanması: ürün → sepet → ödeme → sipariş onayı. Üretimde Coolify ile deploy, Cloudflare ve Neon yedekleme/izleme kontrolü.

**Blocked by:** 09, 10, 12

**Status:** ready-for-agent

- [x] Tek bir uçtan uca tarayıcı testi, sahte ödeme sağlayıcısıyla ürün seçimi, sepet, checkout ve onay sayfasını doğrular
- [ ] Üretim ortamı yapılandırılmıştır: alan adı, SSL, Cloudflare, ortam değişkenleri ve gizli anahtarlar
- [ ] Neon yedekleme ve geri yükleme prosedürü doğrulanmış ve belgelenmiştir
- [ ] Hata izleme ve uygulama sağlık kontrolü kurulmuştur (kod hazır: `/api/health`, Dockerfile HEALTHCHECK, JSON hata logu; uptime monitörü elle kurulacak)
- [ ] iyzico canlı anahtarlarla küçük bir gerçek ödeme ve iade ile elle doğrulanmıştır
- [ ] Gerçek hukuki metinler ve banka bilgileri yerleştirilmiştir

## Comments

- 2026-10-20 (agent): Kod tarafı tamam, kalanlar hesap/para/alan adı gerektirdiği için `docs/go-live.md` kontrol listesine yazıldı. Eklenenler: `e2e/checkout.spec.ts` (Playwright, standalone üretim build'i + `PAYMENT_PROVIDER=fake`, `pnpm test:e2e`, CI'a eklendi; yerelde sistem Chrome'u, CI'da chromium), `/api/health` (DB kontrolü, 200/503) + Dockerfile `HEALTHCHECK`, `src/instrumentation.ts` (sunucu hataları tek satır JSON log). Açık maddeler: üretim ortamı, Neon geri yükleme provası, uptime monitörü, canlı iyzico ödeme/iade, gerçek hukuki metinler ve IBAN — hepsi `docs/go-live.md`'de, kullanıcı tarafından yapılmalı.
