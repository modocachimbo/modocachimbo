/* =========================================================
   Modo Cachimbo · App instalable (service worker)
   - Páginas, preguntas y scripts del sitio: primero internet;
     sin internet, lo último que se guardó.
   - Scripts/estilos con ?v= e imágenes: lo guardado al toque y se
     revisa por detrás (al cambiar un archivo, sube su ?v=).
   - KaTeX, Supabase y fuentes (versiones fijas): se guardan una vez.
   - Apps Script, Supabase (datos) y todo lo demás: no se toca.
   - "Primero internet" pregunta siempre al servidor (cache: 'no-cache'):
     GitHub Pages pide guardar 10 min cada archivo y sin esto el navegador
     seguía mostrando la versión anterior después de publicar.
   - Notificaciones push (panel → Web → Notificaciones): las muestra
     y al tocarlas abre el link (o el inicio).
   Al cambiar este archivo, sube VERSION para limpiar lo viejo.
   ========================================================= */
const VERSION = 'mc-v4';
const OFFLINE = 'offline.html';
const CDN = /^https:\/\/(cdn\.jsdelivr\.net\/npm\/(katex@|@supabase\/supabase-js@)|fonts\.(googleapis|gstatic)\.com\/)/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll([OFFLINE, 'assets/app/icono-192.png'])).then(() => self.skipWaiting()));
});

// Al cambiar de versión, las pestañas abiertas se recargan solas (menos el panel,
// por si hay un formulario a medias). La primera instalación no recarga nada.
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const viejas = (await caches.keys()).filter(k => k !== VERSION);
    await Promise.all(viejas.map(k => caches.delete(k)));
    await self.clients.claim();
    if (!viejas.length) return;
    const ps = await self.clients.matchAll({ type: 'window' });
    ps.filter(p => !/\/panel\//.test(new URL(p.url).pathname)).forEach(p => p.navigate(p.url).catch(() => {}));
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (CDN.test(req.url)) { e.respondWith(primeroGuardado(req)); return; }
  if (url.origin !== location.origin) return;
  if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  // Scripts y estilos con ?v= e imágenes: salen de lo guardado al toque y se revisan por detrás
  if (req.mode !== 'navigate' && (/[?&]v=/.test(url.search) || /\.(webp|png|jpe?g|svg|gif|woff2?)$/i.test(url.pathname))) {
    e.respondWith(guardadoYRevisa(req, e)); return;
  }
  e.respondWith(primeroInternet(req));
});

// Lo guardado sale al instante; en paralelo se pide al servidor y se guarda para la próxima.
// Si no había nada guardado, espera al servidor como siempre.
async function guardadoYRevisa(req, e) {
  const c = await caches.open(VERSION);
  const hit = await c.match(req);
  const red = fetch(req, { cache: 'no-cache' }).then(r => {
    if (r.ok && r.type === 'basic') c.put(req, r.clone());
    return r;
  });
  if (hit) { e.waitUntil(red.catch(() => {})); return hit; }
  return sinGuardar(await red);
}

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
    // no-cache: revisa con el servidor (si no cambió responde 304, casi sin datos)
    const r = await fetch(req, { cache: 'no-cache' });
    if (r.ok && r.type === 'basic') c.put(req, r.clone());
    return sinGuardar(r);
  } catch (err) {
    const pagina = req.mode === 'navigate';
    // Una página (quiz.html?year=…) es la misma con cualquier ?…: vale la última guardada
    const hit = await c.match(req) || (pagina && await c.match(req, { ignoreSearch: true }));
    if (hit) return hit;
    if (pagina) return (await c.match(OFFLINE)) || Response.error();
    throw err;
  }
}

// El navegador también guarda en memoria los scripts e imágenes de la página
// según Cache-Control (10 min en GitHub Pages): así siempre vuelve a pasar por aquí
function sinGuardar(r) {
  if (r.type !== 'basic') return r;
  const h = new Headers(r.headers);
  h.set('Cache-Control', 'no-cache');
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h });
}

// ---------- Notificaciones push ----------
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { cuerpo: e.data ? e.data.text() : '' }; }
  const base = self.registration.scope;
  e.waitUntil(self.registration.showNotification(d.titulo || 'Modo Cachimbo', {
    body: d.cuerpo || '',
    icon: base + 'assets/app/icono-192.png',
    badge: base + 'assets/app/notif-badge.png',
    data: { link: d.link || '' },
    tag: d.tag || undefined
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const base = self.registration.scope;
  let destino = base;
  try { if (e.notification.data && e.notification.data.link) destino = new URL(e.notification.data.link, base).href; } catch (err) {}
  e.waitUntil((async () => {
    const ps = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const propia = ps.find(p => p.url.startsWith(base));
    if (propia && new URL(destino).origin === location.origin) {
      await propia.focus();
      return propia.navigate(destino).catch(() => self.clients.openWindow(destino));
    }
    return self.clients.openWindow(destino);
  })());
});
