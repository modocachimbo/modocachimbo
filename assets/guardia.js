/* =========================================================
   Modo Cachimbo · Páginas solo para alumnos con sesión
   Va como PRIMER script del <head>. Si en este navegador no hay
   sesión guardada, manda a la bienvenida (index.html) antes de
   que se dibuje la página. auth.js confirma después con Supabase.
   ========================================================= */
(function () {
  // Modo claro u oscuro elegido en el inicio (mc-modo), antes de que se dibuje la página
  try {
    var m = new URLSearchParams(location.search).get('modo') || localStorage.getItem('mc-modo');
    if (m === 'claro' || m === 'oscuro') document.documentElement.setAttribute('data-modo', m);
    // Los colores del modo claro viven en assets/claro.css; se piden aquí para que no parpadee en oscuro
    // Por ahora solo en las secciones de cursos (áreas, cursos, libros, repasos, fijas y flashcards)
    var g = document.currentScript, raiz = g && g.src ? g.src.replace(/assets\/guardia\.js(\?.*)?$/, '') : '';
    var pag = location.href.indexOf(raiz) === 0 ? location.href.slice(raiz.length).split(/[?#]/)[0] : '';
    var cursos = /\//.test(pag) || /^(tarjetas|falladas)\.html$/.test(pag);
    if (m === 'claro' && raiz && cursos) document.write('<link rel="stylesheet" href="' + g.src.replace(/guardia\.js(\?.*)?$/, 'claro.css') + '">');
  } catch (e) {}
})();
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
