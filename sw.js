/* =========================================================
   Modo Cachimbo · App instalable (service worker)
   - Páginas, preguntas y scripts del sitio: primero internet;
     sin internet, lo último que se guardó.
   - KaTeX, Supabase y fuentes (versiones fijas): se guardan una vez.
   - Apps Script, Supabase (datos) y todo lo demás: no se toca.
   Al cambiar este archivo, sube VERSION para limpiar lo viejo.
   ========================================================= */
const VERSION = 'mc-v1';
const OFFLINE = 'offline.html';
const CDN = /^https:\/\/(cdn\.jsdelivr\.net\/npm\/(katex@|@supabase\/supabase-js@)|fonts\.(googleapis|gstatic)\.com\/)/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll([OFFLINE, 'assets/app/icono-192.png'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (CDN.test(req.url)) { e.respondWith(primeroGuardado(req)); return; }
  if (url.origin !== location.origin) return;
  if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  e.respondWith(primeroInternet(req));
});

async function primeroGuardado(req) {
  const c = await caches.open(VERSION);
  const hit = await c.match(req);
  if (hit) return hit;
  const r = await fetch(req);
  if (r.ok || r.type === 'opaque') c.put(req, r.clone());
  return r;
}

async function primeroInternet(req) {
  const c = await caches.open(VERSION);
  try {
    const r = await fetch(req);
    if (r.ok && r.type === 'basic') c.put(req, r.clone());
    return r;
  } catch (err) {
    const pagina = req.mode === 'navigate';
    // Una página (quiz.html?year=…) es la misma con cualquier ?…: vale la última guardada
    const hit = await c.match(req) || (pagina && await c.match(req, { ignoreSearch: true }));
    if (hit) return hit;
    if (pagina) return (await c.match(OFFLINE)) || Response.error();
    throw err;
  }
}
