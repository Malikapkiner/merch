# 09: iyzico kart ödemesi

**What to build:** Gerçek kart ödemesi: Müşteri iyzico'nun barındırdığı ödeme formuna yönlenir, kart verisi sunucuya hiç gelmez (ADR 0003). Ödeme sonucu sunucu tarafında doğrulanır. iyzico aynı bildirimi tekrar gönderse de Sipariş bir kez işlenir.

**Blocked by:** 08

**Status:** ready-for-agent

- [x] Checkout kart ödemesinde iyzico hosted formunu başlatır
- [x] Ödeme sonucu iyzico'dan sunucuda doğrulanarak Sipariş Ödendi yapılır
- [x] Aynı ödeme bildirimi tekrar gelirse Sipariş ve Stok yeniden işlenmez
- [x] Başarısız veya iptal edilen ödemede Müşteri sepetine ve anlaşılır bir mesaja döner
- [x] Kart verisi uygulamada saklanmaz ve loglanmaz
- [ ] Adaptör iyzico sandbox ile elle doğrulanmıştır; davranışlar fake ile test edilmiştir

## Comments

- 2026-10-20 (agent): `src/modules/payment/iyzico.ts`: iyzico hosted checkout form adaptörü (`createIyzicoPaymentProvider`, `createIyzicoPaymentProviderFromEnv`; IYZWSv2 imzası, kuruş↔TL, sepet kalemleri + ayrı "Kargo" kalemi, `enabledInstallments: [1]`). `retrievePayment`: `SUCCESS` + `fraudStatus` 1 → ödendi; `FAILURE` veya `fraudStatus` -1 → başarısız; `fraudStatus` 0 / 3DS sürüyor → bekliyor; iyzico yanıt veremezse `IyzicoError` (yalnızca hata kodu/mesajı, kart verisi yok). Port isteği teslimat/fatura adresi, kargo ücreti, TCKN (VKN değil) ve Müşteri IP'si ile genişledi. `confirmPayment` bekleyen ödemede yeni `payment-pending` sonucunu döndürür; stok bitince iptal (void) başarısız olursa Sipariş yine İptal kalır ve hata loglanır (elle iade). `lib/payments.ts`: üç `IYZICO_*` değişkeni varsa iyzico, `PAYMENT_PROVIDER=fake` fake'i zorlar, kısmi yapılandırma hata verir. Yeni `/odeme/bildirim` (iyzico merchant notification): token ile sonucu iyzico'dan yeniden çeker, idempotent `confirmPayment`'a verir, hata olursa 503 (iyzico tekrar dener). `/odeme/sonuc` artık başarısız/bekleyen/stok tükendi sonuçlarında `/sepet?hata=…` ile sepete ve mesaja döner. Testler: `iyzico.test.ts` (14, fake `fetch` ile), `orders.test.ts` (+3). 118 test yeşil; typecheck, lint, build temiz.
  - **Açık:** iyzico sandbox ile elle doğrulama yapılmadı (anahtar yok). Doğrulama için: `.env.local`'e `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`, `IYZICO_BASE_URL=https://sandbox-api.iyzipay.com`; callback HTTPS istediği için tünel (ör. cloudflared) ile `/odeme` → test kartı 5528790000000008 → başarılı, reddedilen ve aynı token'la tekrar `/odeme/bildirim` POST'u denenmeli. Ayrıca dev DB'de (`DATABASE_URL`) 08'in `orders` migration'ı uygulanmamış (`pnpm db:migrate`).
  - **Bilinen sınırlar:** iyzico sayfasından vazgeçen Müşterinin Siparişi Ödeme Bekliyor kalır (sepet tarayıcıda korunur; eski siparişleri kapatma 11'e bırakıldı). `/payment/cancel` yalnızca aynı gün çalışır; ertesi gün fraud incelemesinden çıkan ve stoğu tükenmiş ödeme elle iade edilmeli. Süresi dolmuş token'da Müşteri "bekliyor" mesajı görür (güvenli taraf). iyzico yanıt imzası (`signature`) doğrulanmıyor; sonuç zaten kimlik doğrulamalı TLS ile sunucudan çekiliyor.
