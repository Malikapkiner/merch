# Merch

Tek markanın doğal ürünlerini (zeytinyağı, salça vb.) Türkiye'deki tüketicilere doğrudan satan e-ticaret mağazası. Arayüz ve bu sözlük Türkçe, kod İngilizcedir; her terimin kod karşılığı parantez içinde verilmiştir.

## Language

**Mağaza** (`Store`):
Markanın kendi ürünlerini kendisinin sattığı tek satış noktası. Pazaryeri değildir; tek satıcı vardır.
_Avoid_: Pazaryeri, marketplace, satıcı hesabı

**Müşteri** (`Customer`):
Sipariş veren kişi; üye olabilir veya misafir olabilir.
_Avoid_: Kullanıcı, alıcı

**Misafir** (`Guest`):
Üyelik oluşturmadan sipariş veren Müşteri.
_Avoid_: Anonim kullanıcı

**Üye** (`Member`):
E-posta ve şifreyle hesap oluşturmuş, adres ve sipariş geçmişi kayıtlı Müşteri.
_Avoid_: Kayıtlı kullanıcı

**Admin** (`Admin`):
Mağazayı yöneten kişi; ürün, stok ve siparişleri yönetir. MVP'de tek rol vardır.
_Avoid_: Yönetici, operatör

## Katalog

**Ürün** (`Product`):
Mağazada satılan bir doğal gıda kalemi (ör. erken hasat zeytinyağı).
_Avoid_: Mal, item

**Kategori** (`Category`):
Ürünleri gruplayan ve listelemede süzme için kullanılan ad (ör. zeytinyağı, zeytin, salça).
_Avoid_: Tür, koleksiyon

**Varyant** (`Variant`):
Bir Ürünün satın alınabilir tek biçimi (ör. 500 ml cam şişe, 5 L teneke). Fiyat ve stok Varyant'ta tutulur.
_Avoid_: Seçenek, SKU, boyut

**Ürün Görseli** (`ProductImage`):
Ürüne Admin tarafından yüklenen fotoğraf; bulut nesne depolamada (Media portu) durur, mağazada optimize gösterilir. İlk görsel listeleme kapak görselidir.
_Avoid_: Fotoğraf dosyası, medya öğesi

**Stok** (`Stock`):
Bir Varyantın satılabilir adet sayısı. Sepete eklemek stok ayırmaz; ödeme onayında düşer.
_Avoid_: Envanter

## Sepet

**Sepet** (`Cart`):
Müşterinin satın almadan önce Varyantları topladığı, tarayıcıda saklanan geçici liste. Fiyat ve Stok her zaman güncel Varyant verisinden okunur; sepete eklemek Stok ayırmaz.
_Avoid_: Alışveriş listesi, basket

## Sipariş

**Sipariş** (`Order`):
Bir Müşterinin ödeme yaparak verdiği satın alma talebi.
_Avoid_: Alışveriş, satın alma

**Sipariş Durumu** (`OrderStatus`):
Siparişin yaşam döngüsündeki aşama: Ödeme Bekliyor → Ödendi → Hazırlanıyor → Kargoda → Teslim Edildi. Ayrıca İptal ve İade vardır.
_Avoid_: Statü, aşama

**Havale Siparişi** (`BankTransferOrder`):
Kredi kartı yerine havale/EFT ile ödenen Sipariş; Admin ödemeyi elle onaylayana kadar Ödeme Bekliyor durumunda kalır.
_Avoid_: Manuel sipariş

**Talep** (`OrderRequest`):
Müşterinin bir Sipariş için gerekçesiyle istediği İptal veya İade. Türü Sipariş Durumu'ndan çıkar: Kargoya verilmeden önce İptal, Kargoda veya Teslim Edildi iken İade. Admin onaylarsa Sipariş İptal veya İade olur, reddederse Sipariş aynı kalır; para iadesi elle yapılır.
_Avoid_: İptal formu, iade başvurusu

**Kargo Ücreti** (`ShippingFee`):
Ücretsiz Kargo Eşiği'nin altındaki Sepetlerde alınan sabit teslimat ücreti; Admin panelinden ayarlanır ve deploy gerektirmeden geçerli olur.
_Avoid_: Teslimat ücreti, gönderi bedeli

**Ücretsiz Kargo Eşiği** (`FreeShippingThreshold`):
Sepet tutarının üstünde kargo ücretinin alınmadığı tutar.
_Avoid_: Kargo limiti
