# 10: Sipariş e-postaları

**What to build:** Müşterinin Sipariş onayı ve "kargoya verildi" (takip numarası ile) e-postalarını alması. E-posta bir port arkasındadır; Resend adaptörü gerçek gönderimi yapar, testlerde fake kullanılır. Kargoya verildi e-postası Admin durumu Kargoda yapınca (ticket 11) tetiklenir; bu ticket tetiklenebilir bir bildirim arayüzü sağlar.

**Blocked by:** 08

**Status:** ready-for-agent

- [x] Sipariş Ödendi olduğunda Müşteriye onay e-postası gider (Sipariş numarası, kalemler, toplam, adres)
- [x] Kargoya verildi bildirimi takip numarasıyla gönderilebilir
- [x] E-postalar Türkçedir ve marka adını yapılandırmadan alır
- [x] E-posta gönderim hatası Siparişi bozmaz; hata kaydedilir
- [x] Gönderimler fake e-posta portu ile test edilmiştir

## Comments

- Ticket 11 için: kargo bildirimi `createOrderEmails(...).orderShipped(order, trackingNumber)` ile tetiklenir; `createOrders` aynı `OrderEmails` nesnesini `emails` seçeneğiyle alır, `changeStatus` Kargoda'ya geçerken onu çağırabilir. Gönderim hiçbir zaman hata fırlatmaz; hata `console.error` ile kaydedilir.
- Ticket 12 için: Sipariş onayı şimdilik yalnızca kart ödemesinde (`confirmPayment`) gider; Admin bir Havale Siparişini Ödendi yaptığında da `emails.orderConfirmed(order)` çağrılmalı.
- Bilinen sınır: e-posta, Sipariş Ödendi olarak kaydedildikten sonra gönderilir ve başarısızlık yalnızca loglanır; süreç bu arada çökerse onay e-postası yeniden denenmez (outbox yok).
- Gerçek Resend gönderimi elle doğrulanmalı (RESEND_API_KEY, EMAIL_FROM ve doğrulanmış gönderen alan adı gerekir).
