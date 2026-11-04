/* =========================================================
   Modo Cachimbo · App instalable
   - Registra sw.js (guarda lo visto para usarlo sin internet)
   - En el inicio: aviso "Instala Modo Cachimbo" (#appInstalar)
     Android/PC: botón que abre el instalador del navegador
     iPhone (Safari): explica Compartir → Agregar a inicio
   - Versión nueva: al volver a la app revisa si hay un sw.js nuevo (sw.js
     recarga las pestañas), y en cualquier página tras 10 min fuera revisa si se
     publicó algo nuevo de esa página o de sus scripts (sin usar Supabase)
   ========================================================= */
(function () {
  var script = document.currentScript;
  var BASE = script && script.src ? script.src.replace(/assets\/app\.js(\?.*)?$/, '') : './';
  var CERRADO = 'mc_app_cerrado', DIAS = 14;

  // Temáticas por fechas (Halloween, …): se ven en todas las páginas menos el panel
  if (!/\/panel\//.test(location.pathname) && !document.getElementById('mcTemaJs')) {
    var tema = document.createElement('script'); tema.id = 'mcTemaJs'; tema.src = BASE + 'assets/tema.js';
    document.head.appendChild(tema);
  }

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register(BASE + 'sw.js', { scope: BASE }).then(function (reg) {
        document.addEventListener('visibilitychange', function () { if (!document.hidden) reg.update().catch(function () {}); });
      }).catch(function () {});
    });
  }

  // App abierta por días (celular): una página que se queda abierta sigue con el código viejo.
  // Al volver tras 10 min fuera se pregunta al servidor (no a Supabase) si cambió la página
  // o alguno de sus scripts y estilos: son pedidos HEAD, solo cabeceras, casi sin datos.
  // Si cambió: recarga sola; si hay un ejercicio a medias, avisa con un botón para actualizar.
  if (!/\/panel\//.test(location.pathname) && window.fetch) {
    var versiones = null, oculta = 0, revisando = false;
    var archivos = function () {
      var u = [location.pathname];
      Array.prototype.forEach.call(document.querySelectorAll('script[src],link[rel=stylesheet][href]'), function (el) {
        var x = new URL(el.src || el.href, location.href);
        if (x.origin === location.origin && x.href.indexOf(BASE) === 0 && u.indexOf(x.pathname) < 0) u.push(x.pathname);
      });
      return u;
    };
    var leerVersiones = function () {
      return Promise.all(archivos().map(function (p) {
        return fetch(p, { method: 'HEAD', cache: 'no-cache' }).then(function (r) {
          return r.ok ? p + '=' + (r.headers.get('etag') || r.headers.get('last-modified') || '') : '';
        }).catch(function () { return null; });
      })).then(function (l) { return l.indexOf(null) >= 0 ? null : l.join('|'); });
    };
    // ¿Hay un ejercicio, flashcards o duelo a medias? (recargar haría perder lo avanzado)
    var aMedias = function () {
      if (/duelo\.html$/.test(location.pathname)) return true;
      return ['quizBody', 'juego'].some(function (id) { var e = document.getElementById(id); return e && !e.hidden && e.offsetParent !== null; });
    };
    var avisar = function () {
      if (document.getElementById('mcVersionNueva')) return;
      var b = document.createElement('button'); b.id = 'mcVersionNueva'; b.type = 'button';
      b.textContent = 'Hay una versión nueva · Actualizar';
      b.style.cssText = 'position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:400;border:0;border-radius:99px;padding:11px 18px;background:#C6E000;color:#141a00;font:900 14px Nunito,sans-serif;box-shadow:0 4px 0 #8fa300,0 8px 22px rgba(0,0,0,.35);cursor:pointer';
      b.addEventListener('click', function () { location.reload(); });
      document.body.appendChild(b);
    };
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        oculta = Date.now();
        // La primera vez que se sale de la página se anota qué versión tiene cada archivo
        if (!versiones && !revisando) { revisando = true; leerVersiones().then(function (v) { versiones = v; revisando = false; }); }
        return;
      }
      if (!oculta || Date.now() - oculta < 600000 || !versiones || revisando) return;
      revisando = true;
      leerVersiones().then(function (v) {
        revisando = false;
        if (!v || v === versiones) return;
        if (aMedias()) avisar(); else location.reload();
      });
    });
  }

  function instalada() {
    return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  }
  function cerradoHace() {
    try { var t = +localStorage.getItem(CERRADO) || 0; return (Date.now() - t) / 864e5; } catch (e) { return 1e9; }
  }
  var iphone = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  var safari = iphone && !/crios|fxios|edgios/i.test(navigator.userAgent);
  var aviso = null, evento = null;

  function mostrar(modo) {
    aviso = aviso || document.getElementById('appInstalar');
    if (!aviso || instalada() || cerradoHace() < DIAS) return;
    aviso.dataset.modo = modo;
    aviso.hidden = false;
  }
  function cerrar() {
    if (aviso) aviso.hidden = true;
    try { localStorage.setItem(CERRADO, String(Date.now())); } catch (e) {}
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    evento = e;
    mostrar('boton');
  });
  window.addEventListener('appinstalled', function () { if (aviso) aviso.hidden = true; });

  document.addEventListener('DOMContentLoaded', function () {
    aviso = document.getElementById('appInstalar');
    if (!aviso) return;
    aviso.addEventListener('click', function (e) {
      if (e.target.closest('[data-app-cerrar]')) { cerrar(); return; }
      if (e.target.closest('[data-app-instalar]')) {
        if (evento) {
          evento.prompt();
          evento.userChoice.then(function (r) { if (r && r.outcome === 'accepted') aviso.hidden = true; evento = null; });
        } else aviso.classList.add('ver-pasos');
      }
    });
    if (safari) mostrar('iphone');
  });

  window.MCApp = { instalada: instalada };
})();
