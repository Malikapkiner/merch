# 12: Havale ile ödeme

**What to build:** Müşterinin checkout'ta havale/EFT seçip banka bilgilerini görmesi ve Siparişin Ödeme Bekliyor durumunda oluşması. Admin ödemeyi doğrulayınca Siparişi Ödendi yapar; Stok bu anda düşer. O anda Stok yetersizse Admin uyarı görür.

**Blocked by:** 11

**Status:** ready-for-agent

- [x] Checkout'ta havale seçeneği banka hesap bilgilerini ve Sipariş numarasını gösterir
- [x] Havale Siparişi Ödeme Bekliyor durumunda oluşur ve Stoğu henüz düşürmez
- [x] Admin Siparişi Ödendi yapınca Stok atomik düşer
- [x] Stok yetersizse Admin açık bir uyarı alır ve Sipariş Ödendi olmaz
- [x] Müşteriye sipariş alındı e-postası gider
- [x] Davranışlar modül arayüzü üzerinden test edilmiştir

## Comments

- 2026-10-20 (agent): `orders` modülüne `placeBankTransferOrder(input)` (Ödeme Bekliyor, Stok düşmez, kart ödemesi başlamaz; `payment_method` kolonu, migration `drizzle/0007_sloppy_scalphunter.sql`) ve `confirmBankTransfer(orderNumber)` eklendi: Stok tek transaction'da atomik düşer ve Sipariş Ödendi olur; Stok yetersizse Sipariş Ödeme Bekliyor kalır, Stok değişmez ve sonuç `insufficient-stock` + Varyant adı döner (Admin detay sayfasında uyarı gösterilir). Kart Siparişi, iptal veya zaten ödenmiş Sipariş `OrderStatusError` ile reddedilir. E-posta: yerleştirmede "siparişiniz alındı" (banka bilgisi, tutar, Sipariş numarası), Admin onayında mevcut ödeme onayı e-postası. UI: checkout'ta Kart/Havale seçimi (banka bilgisi), onay sayfası Ödeme Bekliyor havale Siparişi için ödeme talimatını gösterir, Admin detayında "Havaleyi onayla". **Banka bilgileri `src/config/site.ts` içinde yer tutucudur; ticket 16'dan önce gerçek hesapla değiştirilmeli.** 150 test yeşil, typecheck ve lint temiz.
