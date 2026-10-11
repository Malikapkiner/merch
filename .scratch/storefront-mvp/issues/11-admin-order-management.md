# 11: Admin Sipariş yönetimi

**What to build:** Admin'in Siparişleri görüp işleyebilmesi: durumlara göre liste, detay (Müşteri, adres, fatura bilgisi, onaylanan belge sürümü), durum geçişleri (Hazırlanıyor, Kargoda takip numarasıyla, Teslim Edildi), İptal ve İade (not ile). Kargoya verildi durumunda Müşteriye e-posta gider. Para iadesi iyzico panelinden elle yapılır; sistem yalnızca durumu ve notu tutar.

**Blocked by:** 05, 08

**Status:** ready-for-agent

- [ ] Admin Sipariş listesini duruma göre süzer
- [ ] Detay sayfası Sipariş içeriğini, adres, fatura bilgisi ve belge sürümlerini gösterir
- [ ] Admin geçerli durum geçişlerini yapar; geçersiz geçişler reddedilir
- [ ] Kargoda'ya geçerken takip numarası zorunludur ve Müşteriye e-posta gider
- [ ] Admin Siparişi İptal veya İade yapar ve not girer
- [ ] Durum geçişleri modül arayüzü üzerinden test edilmiştir
