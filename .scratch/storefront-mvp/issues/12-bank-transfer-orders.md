# 12: Havale ile ödeme

**What to build:** Müşterinin checkout'ta havale/EFT seçip banka bilgilerini görmesi ve Siparişin Ödeme Bekliyor durumunda oluşması. Admin ödemeyi doğrulayınca Siparişi Ödendi yapar; Stok bu anda düşer. O anda Stok yetersizse Admin uyarı görür.

**Blocked by:** 11

**Status:** ready-for-agent

- [ ] Checkout'ta havale seçeneği banka hesap bilgilerini ve Sipariş numarasını gösterir
- [ ] Havale Siparişi Ödeme Bekliyor durumunda oluşur ve Stoğu henüz düşürmez
- [ ] Admin Siparişi Ödendi yapınca Stok atomik düşer
- [ ] Stok yetersizse Admin açık bir uyarı alır ve Sipariş Ödendi olmaz
- [ ] Müşteriye sipariş alındı e-postası gider
- [ ] Davranışlar modül arayüzü üzerinden test edilmiştir
