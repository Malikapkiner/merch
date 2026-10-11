# 06: Ürün görselleri

**What to build:** Admin'in Ürüne görsel yükleyip sıralayabilmesi; görsellerin nesne depolamada (Cloudflare R2) tutulup mağazada optimize edilmiş olarak gösterilmesi. Depolama bir port arkasındadır; testlerde fake kullanılır.

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] Admin Ürüne bir veya daha fazla görsel yükler, sırayı değiştirir, siler
- [ ] Görseller liste ve detay sayfalarında uygun boyutlarda, optimize gösterilir
- [ ] Geçersiz dosya türü ve aşırı büyük dosya reddedilir
- [ ] Depolama portu fake ile test edilmiştir; gerçek R2 adaptörü yapılandırmayla çalışır
