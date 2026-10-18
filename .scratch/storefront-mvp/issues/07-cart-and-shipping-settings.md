# 07: Sepet ve kargo ayarları

**What to build:** Müşterinin Varyantları sepete ekleyip miktarı değiştirebilmesi, sepetin yenilemede korunması ve ara toplam, kargo ücreti ile genel toplamın görünmesi. Kargo ücreti ve Ücretsiz Kargo Eşiği Admin panelinden ayarlanır; sepet eşiğe ne kadar kaldığını gösterir. Stok aşımı uyarısı verilir.

**Blocked by:** 04, 05

**Status:** ready-for-agent

- [x] Müşteri Varyantı sepete ekler, miktarı değiştirir, siler
- [x] Sepet sayfa yenilemesinde ve tarayıcı kapanıp açıldığında korunur
- [x] Ara toplam, kargo ücreti ve toplam kuruş doğruluğunda hesaplanır
- [x] Toplam Ücretsiz Kargo Eşiği'ne ulaşınca kargo ücreti sıfırlanır; ulaşmadıysa kalan tutar gösterilir
- [x] Mevcut Stoğu aşan miktar için uyarı gösterilir
- [x] Admin kargo ücretini ve eşiği panelden değiştirir, değişiklik deploy gerektirmeden geçerli olur
- [x] Fiyat, kargo ve eşik kuralları modül arayüzü üzerinden test edilmiştir

## Comments

- 2026-10-18 (agent): `src/modules/shipping` ayrı derin modül olarak kuruldu: `shippingChargeFor(subtotal, settings)` saf kuralı, `createShipping(db)` ile tek satırlık `shipping_settings` tablosunda (migration `drizzle/0004_noisy_luke_cage.sql`) saklanan sabit Kargo Ücreti ve Ücretsiz Kargo Eşiği. Admin panelinde yeni `/admin/kargo` sayfası ve `updateShippingSettingsAction` ile ayarlanır; okuma her istekte DB'den yapıldığı için değişiklik deploy gerektirmez. `src/modules/cart` saf modülü sepet işlemlerini (`addToCart`, `setCartQuantity`, `removeFromCart`, `cartItemCount`) ve `priceCart(items, variants, settings)` ile kuruş doğruluğunda ara toplam/kargo/toplam, ücretsiz kargo için kalan tutar ve stoğu aşan satır uyarısını üretir; kargo kuralını Shipping modülünden kullanır. Katalog modülüne sepet satırlarını çözen `getVariantsByIds` (yayındaki Ürünler) eklendi. Sepet tarayıcıda `localStorage` (`merch:cart:v1`) üzerinde `useSyncExternalStore` ile tutulur; `/api/cart` yalnızca güncel Varyant fiyat/stok verisini ve kargo ayarlarını döndürür, fiyatlama paylaşılan modülle istemcide yapılır. Ürün detaydaki `BuyBox` (eski `variant-picker`) adet + "Sepete ekle" içerir, başlıktaki `CartIndicator` canlı adet gösterir, `/sepet` sayfası miktar değiştirme/silme, stok uyarısı ve toplam özeti sunar. Testler onaylı seam'lerde koşar: `src/modules/shipping/shipping.test.ts` (7 test, gerçek Postgres kalıcılığı dahil) ve `src/modules/cart/cart.test.ts` (14 test, saf fiyat/kargo/eşik/stok kuralları), ayrıca katalog `getVariantsByIds` (3 test). Toplam 75 test yeşil; typecheck, lint ve üretim derlemesi temiz.
