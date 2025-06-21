// sw.js - Görüntü Önbellekleme için Service Worker

const CACHE_NAME = 'skin-explorer-image-cache-v1';
// Sadece bu sunuculardan gelen görüntüleri önbelleğe alacağız
const IMAGE_HOSTS = [
    'raw.communitydragon.org',
    'ddragon.leagueoflegends.com'
];

// Service Worker kurulduğunda çalışır, şimdilik basit tutuyoruz.
self.addEventListener('install', event => {
  // Yeni Service Worker'ın eskiyi beklemeden hemen aktif olmasını sağlar.
  self.skipWaiting();
});

// Web sitesinden yapılan her ağ isteğinde bu olay tetiklenir.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // İstek bir GET isteği mi ve bizim belirlediğimiz sunuculardan mı geliyor?
  if (event.request.method === 'GET' && IMAGE_HOSTS.includes(url.hostname)) {
    // Eğer öyleyse, önbellekleme stratejisini uygula
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        // Önce önbellekte bu isteğe karşılık gelen bir yanıt var mı diye bak
        return cache.match(event.request).then(cachedResponse => {
          // 1. Önbellekte Varsa:
          if (cachedResponse) {
            // console.log('Serving from cache:', event.request.url);
            return cachedResponse; // Doğrudan önbellekten sun, internete gitme.
          }

          // 2. Önbellekte Yoksa:
          // İnternete git ve isteği gerçekleştir.
          return fetch(event.request).then(networkResponse => {
            // Gelen yanıtın bir kopyasını önbelleğe kaydet.
            // Yanıtı klonlamak önemlidir çünkü yanıt bir "stream"dir ve sadece bir kez okunabilir.
            cache.put(event.request, networkResponse.clone());

            // Orijinal yanıtı web sitesine geri gönder.
            return networkResponse;
          });
        });
      })
    );
  }
});