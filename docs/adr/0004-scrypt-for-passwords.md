# Parola özeti için scrypt

Admin (ve ileride Üye) parolaları Node'un yerleşik `crypto.scrypt`'iyle özetlenir; tuz ve KDF parametreleri özet dizgisiyle birlikte saklanır. Spec'te örnek olarak argon2 geçiyordu, ancak `@node-rs/argon2` gibi native bir bağımlılık Alpine tabanlı Next.js standalone imajında ek kırılganlık getirir. scrypt memory-hard, güncel ve önerilen bir KDF'tir ve sıfır bağımlılıkla aynı hedefi karşılar. Algoritma ve parametreler özet dizgisinde taşındığı için ileride argon2'ye geçiş eski parolaları bozmadan yapılabilir.
