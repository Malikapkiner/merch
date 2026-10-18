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

**Ücretsiz Kargo Eşiği** (`FreeShippingThreshold`):
Sepet tutarının üstünde kargo ücretinin alınmadığı tutar.
_Avoid_: Kargo limiti
