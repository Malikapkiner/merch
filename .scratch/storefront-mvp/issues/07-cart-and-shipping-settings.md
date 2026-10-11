# 07: Sepet ve kargo ayarları

**What to build:** Müşterinin Varyantları sepete ekleyip miktarı değiştirebilmesi, sepetin yenilemede korunması ve ara toplam, kargo ücreti ile genel toplamın görünmesi. Kargo ücreti ve Ücretsiz Kargo Eşiği Admin panelinden ayarlanır; sepet eşiğe ne kadar kaldığını gösterir. Stok aşımı uyarısı verilir.

**Blocked by:** 04, 05

**Status:** ready-for-agent

- [ ] Müşteri Varyantı sepete ekler, miktarı değiştirir, siler
- [ ] Sepet sayfa yenilemesinde ve tarayıcı kapanıp açıldığında korunur
- [ ] Ara toplam, kargo ücreti ve toplam kuruş doğruluğunda hesaplanır
- [ ] Toplam Ücretsiz Kargo Eşiği'ne ulaşınca kargo ücreti sıfırlanır; ulaşmadıysa kalan tutar gösterilir
- [ ] Mevcut Stoğu aşan miktar için uyarı gösterilir
- [ ] Admin kargo ücretini ve eşiği panelden değiştirir, değişiklik deploy gerektirmeden geçerli olur
- [ ] Fiyat, kargo ve eşik kuralları modül arayüzü üzerinden test edilmiştir
