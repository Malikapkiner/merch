Status: ready-for-agent

# Storefront MVP

## Problem Statement

Marka sahibi, kendi doğal ürünlerini (zeytinyağı, salça vb.) Türkiye'deki tüketicilere doğrudan satmak istiyor, ancak elinde bir Mağaza yok. Hazır platformlar tasarım ve entegrasyon üzerinde yeterli kontrol vermiyor. Müşteriler ise premium hissettiren, güvenilir ve hızlı bir alışveriş deneyimi bekliyor; üyelik zorunluluğu olmadan sipariş verebilmek, KDV dahil net fiyat görmek ve siparişlerinin durumunu takip etmek istiyor.

## Solution

Tek marka, tek satıcılı, sadece Türkiye'ye yönelik, Türkçe bir e-ticaret Mağazası. Müşteri Ürünleri gezer, Varyant seçip sepete ekler, Misafir veya Üye olarak ödeme yapar (kredi kartı veya havale) ve Siparişinin durumunu takip eder. Admin, bir yönetim panelinden Ürün, Stok ve Siparişleri yönetir. Görünüm Kozoliv gibi sade ve ürün odaklıdır; diğer sitelerden beğenilen özellikler sonraki sürümlerde eklenir.

## User Stories

### Gezinme ve katalog
1. As a Müşteri, I want to see all Ürünler in a clean listing, so that I can browse what the Mağaza sells
2. As a Müşteri, I want to filter or group Ürünler by category (e.g. zeytinyağı, zeytin, salça), so that I can find what I need quickly
3. As a Müşteri, I want a Ürün detail page with photos, description and Varyant choices, so that I can decide what to buy
4. As a Müşteri, I want to choose a Varyant (e.g. 500 ml, 2 L, 5 L) and see its price instantly, so that I know exactly what I pay
5. As a Müşteri, I want prices shown in TRY with KDV included, so that there are no surprises at checkout
6. As a Müşteri, I want to see "Tükendi" on a Varyant that has no Stok, so that I do not try to buy something unavailable
7. As a Müşteri, I want pages to load fast and look premium on mobile, so that I trust the Mağaza
8. As a search engine, I want server-rendered pages with proper titles and descriptions, so that Ürünler can be discovered organically
9. As a Müşteri, I want the legal pages (Mesafeli Satış Sözleşmesi, Ön Bilgilendirme Formu, İptal ve İade Koşulları, KVKK Aydınlatma Metni, Gizlilik ve Çerez Politikası) reachable from the footer, so that I can read the terms

### Sepet
10. As a Müşteri, I want to add a Varyant to my cart, so that I can buy several items together
11. As a Müşteri, I want to change quantities or remove items, so that I control my order
12. As a Müşteri, I want my cart to persist across page reloads, so that I do not lose my choices
13. As a Müşteri, I want to see the subtotal, shipping fee and total in the cart, so that I know what I will pay
14. As a Müşteri, I want to see how much more I need to spend for free shipping, so that I can decide whether to add more
15. As a Müşteri, I want to be told if the quantity I want exceeds available Stok, so that I can adjust it

### Hesap
16. As a Müşteri, I want to check out as a Misafir, so that I can buy without creating an account
17. As a Müşteri, I want to register with e-posta and şifre, so that I can save my addresses and see my past Siparişler
18. As a Üye, I want to log in with e-posta and şifre, so that I access my account
19. As a Üye, I want to reset my password through an e-posta link, so that I can recover my account
20. As a Üye, I want to save and edit delivery addresses, so that checkout is faster
21. As a Üye, I want to see my Sipariş history and current Sipariş Durumu, so that I can follow my purchases
22. As a Misafir, I want to look up my Sipariş using the Sipariş number and e-posta, so that I can track it without an account

### Checkout ve ödeme
23. As a Müşteri, I want to enter delivery address with il and ilçe chosen from lists and free-text mahalle and açık adres, so that my order reaches me
24. As a Müşteri, I want to enter a phone number, so that the courier can reach me
25. As a Müşteri, I want to provide billing details (name, address, optional vergi no), so that I receive a correct invoice
26. As a Müşteri, I want to accept the Mesafeli Satış Sözleşmesi and Ön Bilgilendirme Formu before paying, so that the purchase is legally valid
27. As a Müşteri, I want to pay by credit card on a secure hosted form, so that my card data is safe
28. As a Müşteri, I want to choose havale/EFT and see bank account details, so that I can pay by transfer
29. As a Müşteri, I want to see a confirmation page and receive a confirmation e-posta after ordering, so that I know the Sipariş went through
30. As a Müşteri, I want a clear message if card payment fails, so that I can retry without losing my cart
31. As a Müşteri, I want to be told if an item sold out during checkout, so that I am not charged for something unavailable

### Sipariş takibi
32. As a Müşteri, I want to receive an e-posta when my Sipariş is shipped with the tracking number, so that I can follow the cargo
33. As a Müşteri, I want to request cancellation or return, so that I can exercise my rights
34. As a Müşteri, I want to see my Sipariş Durumu (Ödeme Bekliyor, Ödendi, Hazırlanıyor, Kargoda, Teslim Edildi, İptal, İade), so that I know where it stands

### Admin
35. As an Admin, I want to log in with e-posta and şifre to a protected admin area, so that only I manage the Mağaza
36. As an Admin, I want to create, edit and unpublish Ürünler, so that the catalog stays current
37. As an Admin, I want to manage Varyantlar of a Ürün with price, KDV rate and Stok, so that sales data is accurate
38. As an Admin, I want to upload and reorder Ürün images, so that the Mağaza looks premium
39. As an Admin, I want to adjust Stok manually, so that corrections and restocks are reflected
40. As an Admin, I want to see a list of Siparişler filtered by Sipariş Durumu, so that I can process them
41. As an Admin, I want to see Sipariş details including customer, address, billing info and accepted contract version, so that I can fulfil and invoice it
42. As an Admin, I want to mark a Havale Siparişi as Ödendi after confirming the transfer, so that fulfilment can begin
43. As an Admin, I want to move a Sipariş through Hazırlanıyor, Kargoda (with tracking number) and Teslim Edildi, so that the Müşteri is informed
44. As an Admin, I want to cancel a Sipariş or mark it İade with a note, so that returns are recorded (refunds are done manually in the iyzico panel)
45. As an Admin, I want to configure shipping fee and Ücretsiz Kargo Eşiği, so that I can change them without a deploy
46. As an Admin, I want an unpaid Havale Siparişi not to reduce sellable Stok until confirmed, so that Stok reflects reality

### Güvenilirlik
47. As the Mağaza owner, I want the last unit of a Varyant never to be sold twice, so that I never oversell
48. As the Mağaza owner, I want payment confirmation to be idempotent when iyzico retries, so that a Sipariş is never paid or processed twice
49. As the Mağaza owner, I want card data never to touch my server, so that security and compliance burden stays low

## Implementation Decisions

- Single Next.js (TypeScript) application in a single repo; backend logic lives in deep modules with narrow public interfaces, UI and route handlers are thin shells over them (ADR 0001).
- Deployment: Docker on a VPS near Neon's Frankfurt region, Cloudflare in front; PostgreSQL on Neon (ADR 0002).
- Card payment via iyzico hosted checkout form; card data never reaches the server; payment confirmation is verified server-side and is idempotent (ADR 0003).
- Code is in English, UI in Turkish; terms follow `GLOSSARY.md` (Product, Variant, Stock, Order, OrderStatus, BankTransferOrder, FreeShippingThreshold, Guest, Member, Admin).
- Modules (conceptual): Catalog (Product, Variant, images, categories), Cart, Checkout/Order (placement, status transitions, contract acceptance), Stock (atomic decrement at payment confirmation), Payment (provider port with iyzico adapter and bank-transfer flow), Shipping (flat fee and threshold, tracking number), Accounts (Member auth with e-posta and şifre, Admin auth, addresses), Notifications (e-posta port, Resend adapter), Media (storage port, R2 adapter), Legal (versioned documents).
- Money: integer kuruş, KDV dahil; KDV rate stored per Variant (or Product) separately for invoicing.
- Stock: no reservation on cart; checked and decremented atomically at payment confirmation; for Havale Siparişi, Stock is decremented when the Admin confirms payment, and the Admin sees a warning if Stock is insufficient at that moment.
- Order lifecycle: Ödeme Bekliyor → Ödendi → Hazırlanıyor → Kargoda → Teslim Edildi, plus İptal and İade; transitions are enforced in the Order module, not in UI.
- Orders store a snapshot of addresses, billing info, line prices, KDV rates and the accepted legal document version numbers.
- Shipping: configurable flat fee and Ücretsiz Kargo Eşiği; tracking number entered manually by Admin.
- Invoicing is manual; Order captures billing name, address and optional vergi no.
- Addresses: il and ilçe from a fixed list; mahalle, açık adres free text; phone required.
- Members authenticate with e-posta and şifre using a modern password hash (e.g. argon2), password reset via e-posta, login rate limiting. Admin is a single role with the same mechanism.
- Legal documents are versioned files in the codebase, not editable in the admin; the Order stores the accepted version.
- Images are uploaded by Admin to object storage (Cloudflare R2) and served optimized.
- Brand name comes from a single configuration value ("Merch" as working name).
- Visual direction: Kozoliv-style, clean and product-focused, premium feel; large photography and restrained palette.

## Testing Decisions

- A good test exercises external behavior through a module's public interface and asserts outcomes (Order status, Stock, totals, e-mails sent), not internal calls or table layouts.
- Primary seam: public interfaces of the store modules, run against a real PostgreSQL test database. Cover: price and KDV totals, shipping threshold, atomic Stock decrement (including concurrent last-unit purchase), idempotent payment confirmation, legal version recorded on Order, Order status transitions (valid and invalid), Havale flow, guest Order lookup, auth and password reset.
- External ports (payment provider, e-mail, media storage) are replaced with fakes in tests; the real iyzico sandbox is verified manually.
- A single end-to-end browser test covers product → cart → checkout → Order confirmation using the fake payment provider.
- No separate UI component tests and no separate HTTP/API test layer.
- Prior art: none (greenfield); follow the repo's `tdd` skill guidance.

## Out of Scope

- Bundle discounts ("Çok Al Az Öde", "3 al 2 öde"), coupons and campaigns
- Blog, analysis report and certificate pages, batch traceability ("Hasat İzi")
- Reviews and ratings, favorites/wishlist
- Cash on delivery (kapıda ödeme) and meal-card payments
- Courier API integration, desi/weight-based shipping, automated tracking
- Automated e-arşiv invoicing and accounting integration
- Automated refunds through iyzico
- SMS and WhatsApp notifications
- Social login (Google etc.)
- Multiple admin roles, multi-language, multi-currency, international shipping
- Marketplace features (multiple sellers)

## Further Notes

- Brand name and domain are undecided; "Merch" is a working name.
- Legal texts (satış sözleşmesi, ön bilgilendirme, KVKK, iade koşulları) must be supplied by the owner (lawyer or template); the app only displays and versions them.
- Gıda ürünlerinde cayma hakkı istisnaları olabilir; iade politikası metni buna göre hazırlanmalı.
- KVKK: data stored on Neon may be outside Türkiye; aydınlatma metni should state this.
- Post-MVP candidates inspired by reference sites: bundle pricing and free-shipping campaigns (Kozoliv), analysis reports and batch traceability (Oli Vogue), blog (ZeytinAna), cash on delivery.
