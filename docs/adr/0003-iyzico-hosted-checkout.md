# Ödemede iyzico hosted checkout formu

Kart ödemesi iyzico'nun barındırdığı ödeme formuyla alınır; kart verisi hiçbir zaman sunucumuza gelmez. Bu, PCI kapsamını ve güvenlik yükünü minimize eder. Özel kart formu daha esnek bir tasarım sunardı, ama sorumluluk ve uyum maliyeti tek kişilik proje için fazlaydı. Sipariş ödeme onayı iyzico webhook'u/doğrulaması ile verilir; stok kontrolü bu onayda atomik yapılır.
