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
   - Paquetes de descarga del Laboratorio (assets/lab-paquetes.js): quedan en
     cachés aparte "mc-pack-…" que no se borran al cambiar VERSION; sin internet
     se buscan ahí también. Si un archivo del paquete se vuelve a bajar con
     internet, el paquete se actualiza solo.
   - Notificaciones push (panel → Web → Notificaciones): las muestra
     y al tocarlas abre el link (o el inicio).
   - Señal mala o datos sin saldo (el operador redirige a su página o la
     conexión se queda colgada): si en 4 s no responde, o responde con
     una redirección a otro sitio o un error 5xx, sale lo guardado.
   - «./» e «index.html» son la misma página (la app abre en «./»).
   Cambiar este archivo NO necesita subir VERSION (el navegador ya trae el sw.js nuevo);
   subirla borra todo lo guardado y deja a los alumnos sin nada hasta que vuelvan a abrir cada página con internet.
   ========================================================= */
const VERSION = 'mc-v5';   // No subirla sin necesidad: al cambiarla se borra lo guardado y sin internet no abriría nada hasta volver a visitarlo
const PAQ = 'mc-pack-';
const OFFLINE = 'offline.html';
const CDN = /^https:\/\/(cdn\.jsdelivr\.net\/npm\/(katex@|@supabase\/supabase-js@)|fonts\.(googleapis|gstatic)\.com\/)/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll([OFFLINE, 'assets/app/icono-192.png'])).then(() => self.skipWaiting()));
});

// Al cambiar de versión, las pestañas abiertas se recargan solas (menos el panel,
// por si hay un formulario a medias). La primera instalación no recarga nada.
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const viejas = (await caches.keys()).filter(k => k !== VERSION && !k.startsWith(PAQ));
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
  const hit = await c.match(req) || await enPaquete(req);
  const red = fetch(req, { cache: 'no-cache' }).then(async r => {
    if (r.ok && r.type === 'basic') { c.put(req, r.clone()); if ((await paquetes()).length) alPaquete(req, r.clone()); }
    return r;
  });
  if (hit) { e.waitUntil(red.catch(() => {})); return hit; }
  return sinGuardar(await red);
}

async function primeroGuardado(req) {
  const c = await caches.open(VERSION);
  const hit = await c.match(req) || await enPaquete(req);
  if (hit) return hit;
  const r = await fetch(req);
  if (r.ok || r.type === 'opaque') c.put(req, r.clone());
  return r;
}

// Lo guardado para esta página: exacta, sin ?…, y «./» ↔ «index.html»
async function guardadaDe(req, c) {
  const pagina = req.mode === 'navigate';
  let hit = await c.match(req) || await enPaquete(req);
  if (hit || !pagina) return hit;
  hit = await c.match(req, { ignoreSearch: true }) || await enPaquete(req, { ignoreSearch: true });
  if (hit) return hit;
  const u = new URL(req.url);
  const otra = u.pathname.endsWith('/') ? u.pathname + 'index.html' : u.pathname.endsWith('/index.html') ? u.pathname.slice(0, -10) : null;
  if (!otra) return undefined;
  const alt = new URL(otra, u.origin).href;
  return await c.match(alt, { ignoreSearch: true }) || await enPaquete(new Request(alt), { ignoreSearch: true });
}

// ¿La respuesta sirve? (no: redirección del operador a otro sitio, error del servidor)
function sirve(r) {
  if (!r || r.type === 'opaqueredirect' || r.type === 'error') return false;
  if (r.status >= 500) return false;
  try { if (r.redirected && new URL(r.url).origin !== location.origin) return false; } catch (e) {}
  return true;
}

// Si la página ya vio que la red está mala, sus archivos salen de lo guardado sin esperar (30 s)
let malaHasta = 0;
async function primeroInternet(req) {
  const c = await caches.open(VERSION);
  const pagina = req.mode === 'navigate';
  if (!pagina && Date.now() < malaHasta) {
    const ya = await guardadaDe(req, c);
    if (ya) { fetch(req, { cache: 'no-cache' }).then(r => { if (r.ok && r.type === 'basic' && !r.redirected) c.put(req, r); }).catch(() => {}); return ya; }
  }
  // Pide al servidor (no-cache: si no cambió responde 304, casi sin datos) y guarda lo bueno
  const red = fetch(req, { cache: 'no-cache' }).then(async r => {
    if (r.ok && r.type === 'basic' && !r.redirected) { c.put(req, r.clone()); if ((await paquetes()).length) alPaquete(req, r.clone()); }
    return r;
  });
  // Sin señal clara: si en 4 s no hay respuesta, sale lo guardado (la descarga sigue por detrás)
  let reloj;
  const espera = new Promise(ok => { reloj = setTimeout(() => ok('lento'), pagina ? 4000 : 3000); });
  let r = null;
  try { r = await Promise.race([red, espera]); } catch (err) { r = null; }
  clearTimeout(reloj);
  if (r && r !== 'lento' && sirve(r)) { malaHasta = 0; return sinGuardar(r); }
  malaHasta = Date.now() + 30000;
  const hit = await guardadaDe(req, c);
  if (hit) { if (r === 'lento') red.catch(() => {}); return hit; }
  // Nada guardado: espera a la red (si estaba lenta) o muestra la página sin internet
  if (r === 'lento') { try { const r2 = await red; if (sirve(r2)) return sinGuardar(r2); } catch (err) {} }
  else if (r && r.type !== 'error') return r.type === 'opaqueredirect' ? r : sinGuardar(r);
  if (pagina) return (await c.match(OFFLINE)) || Response.error();
  return Response.error();
}

// ---------- Paquetes de descarga (cachés mc-pack-…) ----------
async function paquetes() { return (await caches.keys()).filter(k => k.startsWith(PAQ)); }
async function enPaquete(req, op) {
  for (const k of await paquetes()) {
    const hit = await (await caches.open(k)).match(req, op);
    if (hit) return hit;
  }
  return undefined;
}
// Lo que se baja con internet y ya estaba en un paquete, se renueva ahí también
async function alPaquete(req, r) {
  try {
    for (const k of await paquetes()) {
      const c = await caches.open(k);
      if (await c.match(req)) { await c.put(req, r); return; }
    }
  } catch (err) {}
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
