# Canlıya alma kontrol listesi

Kod tarafı hazırdır (uçtan uca test, `/api/health`, hata logu). Aşağıdaki adımlar hesap, alan adı ve gerçek para gerektirdiği için elle yapılır; her biri bitince işaretleyin.

## Otomatik güvence

- `pnpm test:e2e`: üretim (standalone) build'ini sahte ödeme sağlayıcısıyla (`PAYMENT_PROVIDER=fake`) başlatır; ürün → sepet → checkout → ödeme → sipariş onayı akışını gerçek Chrome'da doğrular. Test Postgres'i gerekir (`pnpm db:test:up`). CI her push'ta çalıştırır.
- `PAYMENT_PROVIDER=fake` yalnızca E2E içindir; **canlıda asla tanımlanmaz**.

## 1. Üretim ortamı (Coolify + Cloudflare)

- [ ] VPS, Neon'a yakın bölgede (Frankfurt) açıldı; Coolify kuruldu (ADR 0002)
- [ ] Coolify uygulaması bu depodaki `Dockerfile` ile build ediyor; sağlık kontrolü Dockerfile'daki `HEALTHCHECK` (`/api/health`)
- [ ] Alan adı Cloudflare'de; DNS kaydı VPS'e yönlendirilmiş, proxy açık; SSL modu **Full (strict)**, Coolify'da geçerli sertifika
- [ ] Ortam değişkenleri Coolify'da (gizli olanlar "secret" olarak), `.env.example` ile karşılaştırıldı:
  - `DATABASE_URL` (Neon pooled), `SITE_URL` (`https://…`)
  - `R2_*` beşi birlikte, `RESEND_API_KEY` + `EMAIL_FROM` (Resend'de alan adı doğrulanmış)
  - `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`, `IYZICO_BASE_URL=https://api.iyzipay.com`
  - `PAYMENT_PROVIDER` **tanımsız**
- [ ] Migration: `pnpm db:migrate` üretim `DATABASE_URL` ile çalıştırıldı; yönetici hesabı `pnpm db:seed` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`) ile oluşturuldu. Örnek kataloğu istemiyorsanız seed'i çalıştırmadan önce `scripts/seed.ts` içindeki ürünleri çıkarın veya sonra Admin panelinden silin
- [ ] iyzico panelinde merchant bildirim URL'si `https://<alan-adı>/odeme/bildirim`

## 2. Neon yedekleme ve geri yükleme

Neon, her projede geçmiş penceresi (point-in-time restore) tutar; pencerenin süresi plana bağlıdır, Neon Console > Settings > Storage'dan kontrol edin ve en az 7 gün olacak planı seçin.

- [ ] Geri yükleme provası: Neon Console > Branches > `main` > **Restore** ile geçmiş bir ana "yeni branch" olarak geri yükleyin (üretimi ezmeden)
- [ ] Prova branch'inin bağlantı dizesiyle `psql` açıp `SELECT count(*) FROM orders;` kontrolü yapıldı, sonra branch silindi
- [ ] Gerçek felaket durumu: yukarıdaki adımın aynısı, ardından Coolify'da `DATABASE_URL` yeni branch'e çevrilir ve yeniden deploy edilir
- [ ] Ek güvence (haftalık, elle veya cron): `pg_dump "$DATABASE_URL" -Fc -f merch-$(date +%F).dump` ve dosyanın VPS dışında saklanması
- Provanın tarihi ve sonucu: _(buraya yazın)_

## 3. Hata izleme ve sağlık kontrolü

- Sunucu hataları `src/instrumentation.ts` ile stderr'e tek satır JSON (`"level":"error"`) olarak yazılır; Coolify > Logs'ta görünür.
- [ ] Uptime izleme (ör. UptimeRobot, ücretsiz): `https://<alan-adı>/api/health` her 5 dakikada; 200 ve `{"status":"ok"}` beklenir, 503 veritabanı erişilemiyor demektir. Bildirim e-posta/telefona gider
- [ ] İsteğe bağlı: hata toplama için Sentry'yi `instrumentation.ts` içindeki `onRequestError`'a bağlayın (şu an yalnızca log)

## 4. iyzico ile gerçek ödeme ve iade

- [ ] Canlı anahtarlar Coolify'da, deploy edildi
- [ ] En ucuz ürünle gerçek kartla küçük bir sipariş verildi → Sipariş Ödendi, Stok düştü, onay e-postası geldi
- [ ] Aynı sipariş Admin panelinden iptal/iade edildi; iyzico panelinde iade göründü, kart hesabına döndü
- [ ] Test siparişi ve test Stoğu Admin panelinden düzeltildi

## 5. Hukuki metinler ve banka bilgileri

- [ ] Beş metin (`src/modules/legal/documents/*`) `placeholderSection` yerine gerçek içerikle dolduruldu ve **sürümleri artırıldı**: Mesafeli Satış Sözleşmesi, Ön Bilgilendirme Formu, İptal ve İade Koşulları, KVKK Aydınlatma Metni, Gizlilik ve Çerez Politikası (hukuk danışmanı onayıyla)
- [ ] `src/config/site.ts` içindeki `bankAccount` gerçek banka, hesap sahibi ve IBAN ile değiştirildi (şu an örnek değerler)
- [ ] Marka adı ("Merch" çalışma adı) `siteConfig` içinde nihai ad ile güncellendi
