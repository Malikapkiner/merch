# Uygulama VPS'te, veritabanı Neon'da

Uygulama Docker ile bir VPS'te (Hetzner benzeri, Coolify/Dokploy ile deploy, Cloudflare önünde) çalışır; PostgreSQL ise yönetilen Neon (Frankfurt) üzerindedir. Vercel Hobby ticari kullanıma izin vermez ve Pro daha pahalıdır, bu yüzden VPS seçildi. Veritabanını VPS'te kendimiz işletmek replika, tutarlılık ve bakım yükü getireceği için reddedildi. VPS Neon'a yakın bir bölgede seçilmelidir; uygulama Docker'da kaldığı sürece başka bir ortama taşınabilir.
