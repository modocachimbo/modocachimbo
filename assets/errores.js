/* =========================================================
   Modo Cachimbo · Botón de errores de hoy
   - Lo carga assets/auth.js cuando hay un alumno con sesión.
   - Va abajo a la izquierda en las páginas que tienen tutorial
     (el tutorial ahora se abre desde el menú de tu foto).
   - Cuenta las preguntas que fallaste desde las 00:00 (hora de Perú)
     en práctica, Repaso, Fijas, Seminario y Banqueo. Al tocarlo
     abre falladas.html?hoy=1: un repaso mezclado de esos errores.
   ========================================================= */
(function () {
  if (window.MCErrores || !window.MCAuth) return;
  var BASE = MCAuth.base || './';
  var aqui = location.href.replace(/[?#].*$/, '');

  var ICONO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M3.5 12a8.5 8.5 0 0 1 14.8-5.7L21 9"/><polyline points="21 3.5 21 9 15.5 9"/>' +
    '<path d="M20.5 12a8.5 8.5 0 0 1-14.8 5.7L3 15"/><polyline points="3 20.5 3 15 8.5 15"/></svg>';
  var css =
    '.mce-btn{position:fixed;left:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:55;width:58px;height:58px;border-radius:50%;background:#141414;' +
    'border:2px solid #3a4a00;border-bottom-width:5px;color:#C6E000;display:grid;place-items:center;cursor:pointer;padding:0;-webkit-tap-highlight-color:transparent;transition:transform .1s}' +
    '.mce-btn:active{transform:translateY(3px);border-bottom-width:2px}' +
    '.mce-btn svg{width:28px;height:28px}' +
    '.mce-btn .n{position:absolute;top:-6px;right:-6px;min-width:24px;height:24px;box-sizing:border-box;padding:0 6px;border-radius:12px;background:#ff4b4b;color:#fff;' +
    'font:900 13px/20px Nunito,Inter,sans-serif;border:2px solid #050505;text-align:center}' +
    '.mce-btn.cero{border-color:#2a2a2a;color:#5f5f5f}' +
    '.mce-btn.cero .n{display:none}' +
    '.mce-tip{position:fixed;left:84px;bottom:calc(28px + env(safe-area-inset-bottom,0px));z-index:55;max-width:calc(100vw - 100px);background:#141414;border:2px solid #2e2e2e;' +
    'border-bottom-width:4px;border-radius:14px;padding:8px 12px;font:800 13px Nunito,Inter,sans-serif;color:#e6e6e6;pointer-events:none;' +
    'opacity:0;transform:translateX(-6px);transition:opacity .25s,transform .25s}' +
    '.mce-tip.show{opacity:1;transform:none}' +
    '.mce-tip b{color:#C6E000}' +
    '.mce-btn[hidden],.mce-tip[hidden]{display:none}' +
    // Mientras respondes una práctica no estorba (vuelve en la pantalla final)
    'body:has(#quizHeader[style*="block"]) .mce-btn,body:has(#quizHeader[style*="block"]) .mce-tip{display:none}';

  var btn, tip, n = null, tTip;

  function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function escribir(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function dia() { return window.MCProgreso && MCProgreso.inicioHoy ? MCProgreso.inicioHoy().toISOString().slice(0, 10) : ''; }

  function dibujar() {
    if (btn) return;
    var s = document.createElement('style'); s.id = 'mce-css'; s.textContent = css; document.head.appendChild(s);
    btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'mce-btn cero'; btn.hidden = true;
    btn.innerHTML = ICONO + '<span class="n"></span>';
    btn.addEventListener('click', function () {
      if (n) { location.href = BASE + 'falladas.html?hoy=1'; return; }
      mostrarTip(2500);
    });
    tip = document.createElement('div'); tip.className = 'mce-tip'; tip.setAttribute('aria-hidden', 'true');
    document.body.appendChild(btn); document.body.appendChild(tip);
  }

  function mostrarTip(ms) {
    tip.innerHTML = n ? 'Repasa tus <b>' + n + ' error' + (n === 1 ? '' : 'es') + '</b> de hoy' : 'Sin errores hoy. ¡Bien!';
    tip.classList.add('show');
    clearTimeout(tTip); tTip = setTimeout(function () { tip.classList.remove('show'); }, ms);
  }

  function pintar(cuantos) {
    dibujar();
    var antes = n; n = cuantos;
    btn.hidden = false;
    btn.classList.toggle('cero', !n);
    btn.querySelector('.n').textContent = n > 99 ? '99+' : n;
    var txt = n ? 'Repasar mis ' + n + ' errores de hoy' : 'Sin errores hoy';
    btn.title = txt; btn.setAttribute('aria-label', txt);
    try { sessionStorage.setItem('mc_err_hoy', dia() + '|' + n); } catch (e) {}
    // El mensaje sale solo la primera vez del día, o cuando sube el número
    if (n && (leer('mc_err_tip') !== dia() || (antes !== null && n > antes))) { escribir('mc_err_tip', dia()); mostrarTip(4000); }
  }

  function actualizar() {
    if (!window.MCProgreso || !MCProgreso.errores) return;
    MCProgreso.errores().then(function (L) { pintar(L.length); }, function () {});
  }

  // Mientras la consulta llega, el último número conocido de hoy
  function arrancar() {
    // Solo donde antes estaba el botón "?" del tutorial; no en el propio repaso de errores
    if (!document.querySelector('script[src*="assets/tutorial.js"]:not([data-solo-lista])') || /\/falladas\.html$/.test(aqui)) return;
    if (!window.MCProgreso) { if ((arrancar.k = (arrancar.k || 0) + 1) < 100) setTimeout(arrancar, 150); return; }
    try {
      var g = (sessionStorage.getItem('mc_err_hoy') || '').split('|');
      if (g[0] === dia()) { n = +g[1] || 0; pintar(n); }
    } catch (e) {}
    actualizar();
  }

  document.addEventListener('mc:errores', function () { if (btn) actualizar(); });
  // Al volver a la pestaña (o pasada la medianoche) se vuelve a contar
  document.addEventListener('visibilitychange', function () { if (!document.hidden && btn) actualizar(); });
  MCAuth.alCambiar(function (u) { if (!u && btn) { btn.hidden = true; tip.classList.remove('show'); } });

  window.MCErrores = { actualizar: actualizar };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar); else arrancar();
})();
