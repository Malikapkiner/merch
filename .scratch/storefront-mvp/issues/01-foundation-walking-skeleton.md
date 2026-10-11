# 01: Temel iskelet ve deploy hattı

**What to build:** Boş ama canlı çalışan bir mağaza iskeleti. TypeScript Next.js uygulaması Neon PostgreSQL'e bağlanır, gerçek bir Postgres test veritabanıyla test koşturulabilir, backend mantığı için derin modül yapısı hazırdır, marka adı tek bir yapılandırma değerinden okunur ve uygulama Docker imajı olarak VPS'e deploy edilir (ADR 0001, 0002).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Uygulama yerelde ve Docker içinde çalışır; basit bir ana sayfa marka adını yapılandırmadan gösterir
- [x] Neon veritabanına bağlanılır ve şema migrasyonları çalıştırılabilir
- [x] Test komutu gerçek bir Postgres test veritabanı üzerinde en az bir örnek modül testini çalıştırır
- [x] Modül sınırlarını zorlayan yapı kurulmuştur (derin modüller, dar public arayüzler)
- [x] CI testleri ve tip kontrolünü çalıştırır
- [ ] Docker imajı VPS'e deploy edilir ve ana sayfa erişilebilir
