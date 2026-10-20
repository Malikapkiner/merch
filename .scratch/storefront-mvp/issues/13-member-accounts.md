# 13: Üyelik

**What to build:** Müşterinin e-posta ve şifreyle Üye olması, giriş yapması, şifresini e-postayla sıfırlaması, adreslerini kaydetmesi, Sipariş geçmişini görmesi ve Üye olarak daha hızlı checkout yapması.

**Blocked by:** 08, 10

**Status:** ready-for-agent

- [x] Müşteri e-posta ve şifreyle kayıt olur ve giriş yapar
- [x] Şifre sıfırlama e-posta bağlantısıyla çalışır; bağlantı süreli ve tek kullanımlıktır
- [x] Parolalar modern bir algoritmayla saklanır; giriş ve sıfırlama denemelerine hız sınırı vardır
- [x] Üye adreslerini kaydeder, düzenler, siler ve checkout'ta seçer
- [x] Üye geçmiş Siparişlerini ve Sipariş Durumunu görür
- [x] Giriş yapmış Üye checkout'ta e-posta ve adres bilgisi hazır gelir
- [x] Kurallar modül arayüzü üzerinden test edilmiştir

## Comments

- 2026-10-20 (agent): `accounts` modülüne `createMembers` eklendi (`register`, `login`, `verifySession`, `logout`, `requestPasswordReset`, `resetPassword`, adres CRUD: `listAddresses`/`saveAddress`/`deleteAddress`). Parola scrypt (ADR 0004); giriş denemeleri e-posta başına 5/15 dk (Admin ile aynı tablo, `member:` önekli); sıfırlama bağlantısı 1 saat, tek kullanımlık, hash'li saklanır, şifre değişince tüm oturumlar kapanır; sıfırlama isteği e-posta başına saatte 3. `orders` modülüne `CheckoutInput.memberId` (oturumdan, formdan değil) ve `listOrdersForMember` eklendi (tamamlanmamış kart denemeleri gizlenir). UI: `/hesap` (giriş, kayıt, şifre sıfırlama, adresler, sipariş geçmişi/detayı), checkout'ta e-posta ve kayıtlı adres seçimi hazır gelir. Migration `drizzle/0008_next_kang.sql`. **Production'da `SITE_URL` zorunlu** (sıfırlama bağlantısı için). Bilinen sınırlar: IP başına hız sınırı yok; kayıt için hız sınırı yok; süresi dolan oturum/token temizliği yok.
