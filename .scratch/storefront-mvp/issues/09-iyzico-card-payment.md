# 09: iyzico kart ödemesi

**What to build:** Gerçek kart ödemesi: Müşteri iyzico'nun barındırdığı ödeme formuna yönlenir, kart verisi sunucuya hiç gelmez (ADR 0003). Ödeme sonucu sunucu tarafında doğrulanır. iyzico aynı bildirimi tekrar gönderse de Sipariş bir kez işlenir.

**Blocked by:** 08

**Status:** ready-for-agent

- [ ] Checkout kart ödemesinde iyzico hosted formunu başlatır
- [ ] Ödeme sonucu iyzico'dan sunucuda doğrulanarak Sipariş Ödendi yapılır
- [ ] Aynı ödeme bildirimi tekrar gelirse Sipariş ve Stok yeniden işlenmez
- [ ] Başarısız veya iptal edilen ödemede Müşteri sepetine ve anlaşılır bir mesaja döner
- [ ] Kart verisi uygulamada saklanmaz ve loglanmaz
- [ ] Adaptör iyzico sandbox ile elle doğrulanmıştır; davranışlar fake ile test edilmiştir
