# TypeScript monolit: Next.js tek uygulama, backend mantığı derin modüllerde

Backend ve frontend tek bir Next.js (TypeScript) uygulamasında, tek repoda yaşar. Go API + React SPA düşünüldü; ancak e-ticarette SEO için SSR zaten gerekir, bu da iki dil ve iki deploy demek olur. Tek kişilik ekip ve tek satıcılı mağaza yükü için bu maliyete değmez. İş mantığı (katalog, sepet, sipariş, stok, ödeme) ayrı derin modüllerde tutulur; böylece ileride API'yi ayırmak (ör. Go) mümkün kalır.
