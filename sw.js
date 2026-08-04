const CACHE = 'guia-treino-v15';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // dados do Supabase sempre pela rede (nunca cacheia)
  if (url.hostname.includes('supabase')) return;

  // HTML / navegação: REDE PRIMEIRO, para a versão nova sempre chegar.
  // Cache é só reserva quando estiver offline.
  const isDoc = req.mode === 'navigate' || req.destination === 'document'
    || url.pathname.endsWith('/') || url.pathname.endsWith('index.html');
  if (isDoc) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy).catch(() => {}));
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // demais assets (imagens, manifest, ícone): cache primeiro
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy).catch(() => {}));
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
