# 10: Sipariş e-postaları

**What to build:** Müşterinin Sipariş onayı ve "kargoya verildi" (takip numarası ile) e-postalarını alması. E-posta bir port arkasındadır; Resend adaptörü gerçek gönderimi yapar, testlerde fake kullanılır. Kargoya verildi e-postası Admin durumu Kargoda yapınca (ticket 11) tetiklenir; bu ticket tetiklenebilir bir bildirim arayüzü sağlar.

**Blocked by:** 08

**Status:** ready-for-agent

- [ ] Sipariş Ödendi olduğunda Müşteriye onay e-postası gider (Sipariş numarası, kalemler, toplam, adres)
- [ ] Kargoya verildi bildirimi takip numarasıyla gönderilebilir
- [ ] E-postalar Türkçedir ve marka adını yapılandırmadan alır
- [ ] E-posta gönderim hatası Siparişi bozmaz; hata kaydedilir
- [ ] Gönderimler fake e-posta portu ile test edilmiştir
