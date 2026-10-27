/* =========================================================
   Modo Cachimbo · App instalable
   - Registra sw.js (guarda lo visto para usarlo sin internet)
   - En el inicio: aviso "Instala Modo Cachimbo" (#appInstalar)
     Android/PC: botón que abre el instalador del navegador
     iPhone (Safari): explica Compartir → Agregar a inicio
   - Versión nueva: al volver a la app revisa si hay un sw.js nuevo (sw.js
     recarga las pestañas), y en el inicio tras 10 min fuera revisa si se publicó algo
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

  // App abierta por días (celular): al volver al inicio tras 10 min fuera,
  // si el servidor tiene una versión más nueva de la página, recarga
  var esInicio = /\/(index\.html)?$/.test(location.pathname) && !/\/panel\//.test(location.pathname);
  if (esInicio && window.fetch) {
    var publicada = null, oculta = 0;
    var revisar = function () {
      return fetch(location.pathname, { method: 'HEAD', cache: 'no-cache' }).then(function (r) {
        return r.ok ? (r.headers.get('last-modified') || r.headers.get('etag')) : null;
      }).catch(function () { return null; });
    };
    window.addEventListener('load', function () { revisar().then(function (v) { publicada = v; }); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { oculta = Date.now(); return; }
      if (!oculta || Date.now() - oculta < 600000 || !publicada) return;
      revisar().then(function (v) { if (v && v !== publicada) location.reload(); });
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
