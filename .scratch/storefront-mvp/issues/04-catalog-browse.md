# 04: Katalog: listeleme ve Ürün detayı

**What to build:** Müşterinin Ürünleri gezip Varyant seçerek fiyatı görebilmesi. Ürün, Varyant ve kategori veri modeli, örnek veri, Ürün listeleme (kategoriye göre), Ürün detay sayfası. Fiyatlar kuruş cinsinden saklanır, TRY ve KDV dahil gösterilir; KDV oranı ayrıca tutulur. Stoğu olmayan Varyant "Tükendi" görünür.

**Blocked by:** 02

**Status:** ready-for-agent

- [x] Liste sayfası yayındaki Ürünleri gösterir ve kategoriye göre süzülür
- [x] Detay sayfası açıklama, Varyant seçimi ve seçilen Varyantın fiyatını anında gösterir
- [x] Fiyatlar "KDV dahil" TRY olarak biçimlenir; veride kuruş integer ve KDV oranı ayrı alandır
- [x] Stoğu 0 olan Varyant "Tükendi" gösterilir ve seçilemez
- [x] Yayından kaldırılmış Ürün listede ve detayda görünmez
- [x] Sayfalar sunucuda render edilir; başlık, açıklama ve ürün yapılandırılmış verisi vardır
- [x] Katalog modülü public arayüzü üzerinden gerçek Postgres ile test edilmiştir
