/* =========================================================
   Modo Cachimbo · Ojo «Navegación rápida» (páginas de área)
   El alumno decide si al final de cada tema del modo estudio sale
   la tarjeta «Siguiente tema» (assets/tema-nav.js). Viene prendida.
   Vale solo para los cursos de ESA área: cada área tiene su ojo.
   Se guarda en este equipo (localStorage 'mc_nav_temas:<área>').
   ========================================================= */
(function () {
  var AREA = (location.pathname.match(/\/areas\/([a-z0-9-]+)\.html/) || [])[1] || '';
  var K = 'mc_nav_temas:' + AREA;
  function activa() { try { return localStorage.getItem(K) !== '0'; } catch (e) { return true; } }
  var OJO_SI = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  var OJO_NO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
  var CSS = '' +
    '.navr{order:2;flex:none;display:inline-flex;align-items:center;gap:8px;margin-left:14px;padding:7px 12px 7px 10px;border-radius:999px;cursor:pointer;' +
      'font:800 13px/1 Nunito,Inter,sans-serif;letter-spacing:0;text-transform:none;font-style:normal;background:#1F1936;color:#A99FC8;border:2px solid #3a3360;border-bottom-width:4px;-webkit-tap-highlight-color:transparent}' +
    '.navr svg{width:19px;height:19px;flex:none}' +
    '.navr b{font-weight:900;color:inherit}' +
    '.navr i{font-style:normal;font-weight:800;font-size:11px;padding:3px 7px;border-radius:99px;background:#2B2448;color:#A99FC8}' +
    '.navr.on{color:var(--accent,#C6E000);border-color:rgba(var(--ac-rgb,198,224,0),.55);background:rgba(var(--ac-rgb,198,224,0),.08)}' +
    '.navr.on i{background:var(--accent,#C6E000);color:#1b2000}' +
    '.navr:active{transform:translateY(2px);border-bottom-width:2px}' +
    '@media (max-width:560px){.navr{margin-left:10px;padding:6px 9px}.navr b{display:none}}';
  function pintar(btn) {
    var on = activa();
    btn.className = 'navr' + (on ? ' on' : '');
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.title = on ? 'Navegación rápida activada en los cursos de esta área: al final de cada tema sale «Siguiente tema». Toca para desactivar.'
                   : 'Navegación rápida desactivada en los cursos de esta área. Toca para activar el botón «Siguiente tema» al final de cada tema.';
    btn.innerHTML = (on ? OJO_SI : OJO_NO) + '<b>Navegación rápida</b><i>' + (on ? 'Sí' : 'No') + '</i>';
  }
  function poner() {
    var t = document.querySelector('.section-title');
    if (!t || !AREA || document.getElementById('navRapida')) return;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var b = document.createElement('button');
    b.type = 'button'; b.id = 'navRapida';
    pintar(b);
    b.addEventListener('click', function () {
      try { localStorage.setItem(K, activa() ? '0' : '1'); } catch (e) {}
      pintar(b);
      if (window.MCSonido && MCSonido.toque) try { MCSonido.toque(); } catch (e) {}
      var nom = (t.firstChild && t.firstChild.nodeType === 3 ? t.firstChild.textContent : '').trim();
      aviso((activa() ? 'Navegación rápida activada' : 'Navegación rápida desactivada') + (nom ? ' en ' + nom : '') + (activa() ? ': verás «Siguiente tema» al final de cada tema' : ''));
    });
    t.appendChild(b);
  }
  function aviso(txt) {
    var a = document.getElementById('navrAviso');
    if (!a) {
      a = document.createElement('div'); a.id = 'navrAviso';
      a.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:9999;max-width:min(420px,calc(100vw - 32px));padding:12px 16px;border-radius:14px;background:#1D1834;color:#EEEAF7;border:2px solid #3B3366;font:800 14px/1.4 Nunito,sans-serif;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.45);transition:opacity .3s';
      document.body.appendChild(a);
    }
    a.textContent = txt; a.style.opacity = '1';
    clearTimeout(aviso.t); aviso.t = setTimeout(function () { a.style.opacity = '0'; }, 2600);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', poner); else poner();
  window.MCNavRapida = { activa: activa, area: AREA };
})();
