# 16: Uçtan uca test ve canlıya alma

**What to build:** Çekirdek satış akışının tek bir tarayıcı testiyle güvence altına alınması ve üretim ortamının hazırlanması: ürün → sepet → ödeme → sipariş onayı. Üretimde Coolify ile deploy, Cloudflare ve Neon yedekleme/izleme kontrolü.

**Blocked by:** 09, 10, 12

**Status:** ready-for-agent

- [ ] Tek bir uçtan uca tarayıcı testi, sahte ödeme sağlayıcısıyla ürün seçimi, sepet, checkout ve onay sayfasını doğrular
- [ ] Üretim ortamı yapılandırılmıştır: alan adı, SSL, Cloudflare, ortam değişkenleri ve gizli anahtarlar
- [ ] Neon yedekleme ve geri yükleme prosedürü doğrulanmış ve belgelenmiştir
- [ ] Hata izleme ve uygulama sağlık kontrolü kurulmuştur
- [ ] iyzico canlı anahtarlarla küçük bir gerçek ödeme ve iade ile elle doğrulanmıştır
- [ ] Gerçek hukuki metinler ve banka bilgileri yerleştirilmiştir
