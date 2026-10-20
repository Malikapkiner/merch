# 11: Admin Sipariş yönetimi

**What to build:** Admin'in Siparişleri görüp işleyebilmesi: durumlara göre liste, detay (Müşteri, adres, fatura bilgisi, onaylanan belge sürümü), durum geçişleri (Hazırlanıyor, Kargoda takip numarasıyla, Teslim Edildi), İptal ve İade (not ile). Kargoya verildi durumunda Müşteriye e-posta gider. Para iadesi iyzico panelinden elle yapılır; sistem yalnızca durumu ve notu tutar.

**Blocked by:** 05, 08

**Status:** ready-for-agent

- [x] Admin Sipariş listesini duruma göre süzer
- [x] Detay sayfası Sipariş içeriğini, adres, fatura bilgisi ve belge sürümlerini gösterir
- [x] Admin geçerli durum geçişlerini yapar; geçersiz geçişler reddedilir
- [x] Kargoda'ya geçerken takip numarası zorunludur ve Müşteriye e-posta gider
- [x] Admin Siparişi İptal veya İade yapar ve not girer
- [x] Durum geçişleri modül arayüzü üzerinden test edilmiştir

## Comments

- 2026-10-20 (agent): `orders` modülüne `listOrders({ status? })` (yeniden eskiye, `OrderSummary`), `nextStatuses(from)` ve `changeStatus(orderNumber, to, { trackingNumber?, note? })` eklendi. Kargoda için takip numarası zorunlu (`MissingTrackingNumberError`), geçişten sonra Müşteriye kargo e-postası gider; İptal/İade notu `admin_note` alanında tutulur (migration `drizzle/0006_bored_bruce_banner.sql`). Para iadesi ve stok düzeltmesi elle yapılır: İptal/İade Stoğu otomatik geri yüklemez. UI: `/admin/siparisler` (duruma göre süzme) ve `/admin/siparisler/[orderNumber]` (içerik, adres, fatura bilgisi, onaylanan belge sürümleri, geçerli geçiş butonları, takip numarası ve not alanları). Ödeme Bekliyor Siparişler listelenir ve iptal edilebilir; Ödendi'ye yalnızca ödeme onayıyla (havale onayı ticket 12) geçilir. Testler `orders.test.ts` içinde modül arayüzünden; 139 test yeşil, typecheck ve lint temiz.
