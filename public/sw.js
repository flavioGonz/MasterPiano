/* PianoMaster — service worker
 *
 * Qué cachea y qué no:
 *  - El shell (index.html) va por red primero y cae al caché si no hay señal:
 *    así una versión nueva se ve enseguida cuando hay red, y en el ómnibus
 *    igual abre.
 *  - Los assets con hash en el nombre (/assets/index-a1b2c3.js) van por caché
 *    primero: el nombre cambia en cada build, así que nunca sirven algo viejo.
 *  - /api/ nunca se cachea. Las respuestas del servidor de audio pesan MB y
 *    los estados de los jobs cambian todo el tiempo.
 *  - Las fuentes de Google se cachean aparte, con su propio caché, para que la
 *    app no quede sin tipografía sin red.
 */
const VERSION = 'v1';
const SHELL = `pianomaster-shell-${VERSION}`;
const ASSETS = `pianomaster-assets-${VERSION}`;
const FONTS = `pianomaster-fonts-${VERSION}`;
const MINE = [SHELL, ASSETS, FONTS];

// Lo mínimo para que abra sin red. Los assets con hash se suman solos al usarse.
const PRECACHE = ['/', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL)
      .then(c => c.addAll(PRECACHE))
      .catch(() => {}) // que una URL caída no impida instalar
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n.startsWith('pianomaster-') && !MINE.includes(n))
                           .map(n => caches.delete(n)));
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

// La app pide tomar el control cuando el usuario acepta actualizar
self.addEventListener('message', e => { if (e.data === 'skip-waiting') self.skipWaiting(); });

const isFont = url => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (isFont(url)) {
    event.respondWith(caches.open(FONTS).then(async cache => {
      const hit = await cache.match(request);
      if (hit) return hit;
      const res = await fetch(request);
      if (res.ok || res.type === 'opaque') cache.put(request, res.clone());
      return res;
    }).catch(() => fetch(request)));
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Navegación: red primero, caché si no hay
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse;
        const res = preload || await fetch(request);
        const cache = await caches.open(SHELL);
        cache.put('/', res.clone());
        return res;
      } catch {
        const cache = await caches.open(SHELL);
        return (await cache.match('/')) || new Response(
          '<h1>Sin conexión</h1><p>Abrí PianoMaster una vez con red para poder usarlo sin ella.</p>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 });
      }
    })());
    return;
  }

  // Assets con hash: caché primero
  if (url.pathname.startsWith('/assets/') || /\.(js|css|woff2?|png|svg|jpg|jpeg|webp|ico)$/.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(ASSETS);
      const hit = await cache.match(request);
      if (hit) return hit;
      const res = await fetch(request);
      if (res.ok) cache.put(request, res.clone());
      return res;
    })().catch(() => fetch(request)));
  }
});

/* ------------------------------------------------------------------ *
 *  Recordatorio con la app cerrada (Web Push)
 *
 *  El servidor manda el mensaje a la hora elegida; acá se muestra. Este
 *  handler corre aunque no haya ninguna pestaña abierta: es lo que hace que
 *  el aviso llegue cuando de verdad hace falta acordarse de practicar.
 * ------------------------------------------------------------------ */
self.addEventListener('push', event => {
  let data = { title: 'PianoMaster', body: 'Te esperan tus escalas de hoy.', url: '/' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch { /* texto plano */ }
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'rutina-diaria',
    renotify: false,
    data: { url: data.url || '/' },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    // Si ya hay una ventana abierta se la trae al frente en vez de abrir otra
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of clientsList) {
      if ('focus' in c) { await c.focus(); if ('navigate' in c) { try { await c.navigate(url); } catch { /* ya está donde va */ } } return; }
    }
    if (self.clients.openWindow) await self.clients.openWindow(url);
  })());
});
