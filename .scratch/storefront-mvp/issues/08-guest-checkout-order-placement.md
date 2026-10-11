# 08: Misafir checkout ve Sipariş oluşturma (sahte ödeme sağlayıcısıyla)

**What to build:** Misafirin sepetten ödemeye ve Sipariş onayına kadar gidebildiği tam akış. Teslimat adresi (il ve ilçe listeden, mahalle ve açık adres serbest metin, telefon zorunlu), fatura bilgisi (ad, adres, isteğe bağlı vergi no), sözleşme onayı. Ödeme sağlayıcısı bir port arkasındadır; bu ticket'ta fake uygulama ile çalışır. Ödeme onayında Stok atomik düşer ve Sipariş Ödendi olur. Sipariş; adres, fatura bilgisi, satır fiyatları, KDV oranları ve onaylanan belge sürümlerinin kopyasını saklar.

**Blocked by:** 03, 07

**Status:** ready-for-agent

- [ ] Müşteri adres, telefon ve fatura bilgisini girer; il ve ilçe listeden seçilir
- [ ] Müşteri sözleşme ve ön bilgilendirmeyi onaylamadan ödeme başlatılamaz
- [ ] Ödeme onayı gelince Sipariş Ödendi olur, Stok düşer, sepet temizlenir ve onay sayfası görünür
- [ ] Son birim için eşzamanlı iki ödeme onayında yalnızca biri başarılı olur; diğeri anlaşılır bir mesaj alır
- [ ] Ödeme başarısız olursa sepet korunur ve Müşteri yeniden deneyebilir
- [ ] Sipariş fiyat, KDV, adres, fatura bilgisi ve onaylanan belge sürümlerini anlık görüntü olarak saklar
- [ ] Sipariş durum geçişleri geçersiz atlamaları reddeder
- [ ] Davranışlar modül arayüzü ve fake ödeme sağlayıcısı ile test edilmiştir
