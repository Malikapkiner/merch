# 08: Misafir checkout ve Sipariş oluşturma (sahte ödeme sağlayıcısıyla)

**What to build:** Misafirin sepetten ödemeye ve Sipariş onayına kadar gidebildiği tam akış. Teslimat adresi (il ve ilçe listeden, mahalle ve açık adres serbest metin, telefon zorunlu), fatura bilgisi (ad, adres, isteğe bağlı vergi no), sözleşme onayı. Ödeme sağlayıcısı bir port arkasındadır; bu ticket'ta fake uygulama ile çalışır. Ödeme onayında Stok atomik düşer ve Sipariş Ödendi olur. Sipariş; adres, fatura bilgisi, satır fiyatları, KDV oranları ve onaylanan belge sürümlerinin kopyasını saklar.

**Blocked by:** 03, 07

**Status:** ready-for-agent

- [x] Müşteri adres, telefon ve fatura bilgisini girer; il ve ilçe listeden seçilir
- [x] Müşteri sözleşme ve ön bilgilendirmeyi onaylamadan ödeme başlatılamaz
- [x] Ödeme onayı gelince Sipariş Ödendi olur, Stok düşer, sepet temizlenir ve onay sayfası görünür
- [x] Son birim için eşzamanlı iki ödeme onayında yalnızca biri başarılı olur; diğeri anlaşılır bir mesaj alır
- [x] Ödeme başarısız olursa sepet korunur ve Müşteri yeniden deneyebilir
- [x] Sipariş fiyat, KDV, adres, fatura bilgisi ve onaylanan belge sürümlerini anlık görüntü olarak saklar
- [x] Sipariş durum geçişleri geçersiz atlamaları reddeder
- [x] Davranışlar modül arayüzü ve fake ödeme sağlayıcısı ile test edilmiştir

## Comments

- 2026-10-20 (agent): Yeni modüller: `src/modules/address` (81 il / 973 ilçe sabit listesi, `listProvinces`, `listDistricts`, `isKnownProvince`, `isKnownDistrict`), `src/modules/payment` (ödeme sağlayıcı portu `startPayment` / `retrievePayment` / `cancelPayment` ve bellek içi fake) ve `src/modules/orders` (`createOrders(db, { payments })`: `placeOrder`, `confirmPayment`, `changeStatus`, `getOrder`, `getOrderByAccessToken`; migration `drizzle/0005_wandering_human_cannonball.sql`). `placeOrder` sözleşme onayını, alanları (il/ilçe listeden, telefon +90 E.164'e normalize, VKN/TCKN) ve güncel Stoğu kontrol eder; Siparişi Ödeme Bekliyor olarak adres, fatura, satır fiyatı, KDV ve onaylanan belge sürümlerinin anlık görüntüsüyle oluşturur ve ödemeyi başlatır. `confirmPayment` sonucu sağlayıcıdan sunucuda alır; tutar ve sipariş numarası eşleşmezse reddeder. Sipariş satırını kilitleyip Stoğu koşullu `UPDATE … WHERE stock >= qty` ile savepoint içinde düşürür, sonra Ödendi yapar. Tekrar gelen bildirim ilk sonucu döndürür. Reddedilen ödemede Sipariş İptal olur, bekleyen ödemede açık kalır. Son birim yarışında kaybeden Sipariş İptal (`out-of-stock`) olur ve ödemesi port üzerinden iptal edilir. Durum geçişleri `transitions.ts` tablosuyla uygulanır; Ödendi'ye yalnızca ödeme onayıyla geçilir. Katalog'a `decrementStock` ve `VariantWithProduct.vatRatePercent` eklendi. UI: `/odeme` (il→ilçe bağımlı seçim, fatura adresi teslimatla aynı seçeneği, sözleşme onayı), `/odeme/sahte` test ödeme sayfası (yalnızca production dışında veya `PAYMENT_PROVIDER=fake` ile), `/odeme/sonuc` callback (GET/POST), `/siparis/onay/[token]` onay sayfası; sepet yalnızca ödeme sonrası ilk gelişte temizlenir. Sepet görünümü fiyatlamayı `usePricedCart` hook'una taşıdı ve "Ödemeye geç" butonu ekledi. Testler: `orders.test.ts` (20 test, gerçek Postgres + fake ödeme, eşzamanlı son birim dahil) ve `address.test.ts` (6 test). Toplam 101 test yeşil; typecheck, lint ve build temiz. Akış headless Chrome ile onay ve red yollarında elle doğrulandı.

