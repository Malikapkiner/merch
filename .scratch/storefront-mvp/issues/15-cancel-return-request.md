# 15: İptal ve iade talebi

**What to build:** Müşterinin Siparişi için iptal veya iade talebi oluşturması ve Admin'in talebi görüp Sipariş durumunu İptal veya İade yapması. Para iadesi elle yapılır.

**Blocked by:** 11

**Status:** ready-for-agent

- [x] Müşteri, uygun durumdaki Siparişi için gerekçesiyle talep oluşturur (Üye hesabından veya Misafir sorgulamasından)
- [x] Admin talepleri listede görür ve talebi Sipariş detayında inceler
- [x] Admin talebi sonuçlandırır: Sipariş İptal veya İade olur, not kaydedilir
- [x] Teslim edilmemiş ve edilmiş Siparişler için geçerli talep türleri ayrıdır
- [x] Kurallar modül arayüzü üzerinden test edilmiştir

## Comments

- 2026-10-20 (agent): `orders` modülüne `submitRequest`, `getRequest`, `listOpenRequests` ve `resolveRequest` eklendi (tablo `order_requests`, migration `drizzle/0010_nebulous_sandman.sql`; Sipariş başına en fazla bir açık talep, kısmi unique index). Talep türü Sipariş Durumu'ndan çıkar (`requestKindFor`): Ödeme Bekliyor/Ödendi/Hazırlanıyor için İptal, Kargoda/Teslim Edildi için İade (Kargoda'dan İptal geçişi olmadığı için). Talep yalnızca Siparişi veren Üye veya Siparişteki e-posta ile açılır; başkasına "not-found" döner. Admin onaylarsa (`resolveRequest`) Sipariş İptal/İade olur ve not `admin_note`a yazılır; reddederse Sipariş aynı kalır ve Müşteri yeniden talep edebilir. Admin Siparişi doğrudan İptal/İade yaparsa açık talep onaylanmış sayılır. Kapsam eklemesi: talebi reddetme. UI: Üye sipariş detayı, `/siparis-sorgula` sonucu, `/admin/siparisler` (bekleyen talepler) ve Admin sipariş detayı. Testler `orders.test.ts` içinde modül arayüzünden; 188 test yeşil, typecheck ve lint temiz.
