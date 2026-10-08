/* =========================================================
   Modo Cachimbo · App instalable
   - Registra sw.js (guarda lo visto para usarlo sin internet)
   - En el inicio: aviso "Instala Modo Cachimbo" (#appInstalar)
     Android/PC: botón que abre el instalador del navegador
     iPhone (Safari): explica Compartir → Agregar a inicio
   ========================================================= */
(function () {
  var script = document.currentScript;
  var BASE = script && script.src ? script.src.replace(/assets\/app\.js(\?.*)?$/, '') : './';
  var CERRADO = 'mc_app_cerrado', DIAS = 14;

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register(BASE + 'sw.js', { scope: BASE }).catch(function () {});
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
