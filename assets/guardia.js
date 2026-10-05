/* =========================================================
   Modo Cachimbo · Páginas solo para alumnos con sesión
   Va como PRIMER script del <head>. Si en este navegador no hay
   sesión guardada, manda a la bienvenida (index.html) antes de
   que se dibuje la página. auth.js confirma después con Supabase.
   ========================================================= */
(function () {
  window.MC_PRIVADA = true;
  var s = document.currentScript;
  var base = s && s.src ? s.src.replace(/assets\/guardia\.js(\?.*)?$/, '') : '';
  window.MC_BIENVENIDA = function () {
    // Ruta de esta página relativa a la raíz del sitio, para volver después de entrar
    var aqui = location.href.indexOf(base) === 0 ? location.href.slice(base.length) : '';
    location.replace(base + 'index.html' + (aqui ? '?volver=' + encodeURIComponent(aqui.split('#')[0]) : ''));
  };
  var hay = false;
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (/^sb-[a-z0-9]+-auth-token$/.test(k)) {
        var t = JSON.parse(localStorage.getItem(k) || 'null');
        if (t && t.refresh_token) { hay = true; break; }
      }
    }
  } catch (e) { hay = true; } // sin acceso a localStorage: que decida auth.js
  if (!hay) window.MC_BIENVENIDA();
})();
