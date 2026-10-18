# 06: Ürün görselleri

**What to build:** Admin'in Ürüne görsel yükleyip sıralayabilmesi; görsellerin nesne depolamada (Cloudflare R2) tutulup mağazada optimize edilmiş olarak gösterilmesi. Depolama bir port arkasındadır; testlerde fake kullanılır.

**Blocked by:** 05

**Status:** ready-for-agent

- [x] Admin Ürüne bir veya daha fazla görsel yükler, sırayı değiştirir, siler
- [x] Görseller liste ve detay sayfalarında uygun boyutlarda, optimize gösterilir
- [x] Geçersiz dosya türü ve aşırı büyük dosya reddedilir
- [x] Depolama portu fake ile test edilmiştir; gerçek R2 adaptörü yapılandırmayla çalışır

## Comments

- 2026-10-18 (agent): `src/modules/media` Media portu (`MediaStorage`), in-memory fake ve R2 (S3-uyumlu, `@aws-sdk/client-s3`) adaptörü ile kuruldu; R2 yapılandırması `R2_ACCOUNT_ID / R2_BUCKET / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_PUBLIC_BASE_URL` ortam değişkenlerinden gelir (eksiksiz set → R2 adaptörü; hiçbiri yok → görseller devre dışı; eksik set → bir kez loglanır ve yükleme Türkçe mesajla reddedilir). Katalog modülüne `product_images` tablosu ve `addProductImages` (içerikten tür snook'lama: JPEG/PNG/WebP, 5 MB sınırı), `moveProductImage` (yukarı/aşağı, transaction), `deleteProductImage` (objeyi de siler) eklendi; depolama portu `createCatalog(db, { storage })` ile enjekte edilir. Testler onaylı seam'lerde fake port ile koşar: `src/modules/catalog/images.test.ts` (11 test) ve `src/modules/media/r2.test.ts` (4 test, ağa çıkış yok). Mağazada `next/image` ile listeleme kapak görseli ve detay galerisi optimize gösterilir; `next.config.ts` uzak kalıbı `R2_PUBLIC_BASE_URL`'den üretir. Migration: `drizzle/0003_peaceful_zuras.sql`.
