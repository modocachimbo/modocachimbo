/* =========================================================
   Modo Cachimbo · Ranking semanal del Simulacro
   - MCMedalla(puesto): medalla de oro, plata o bronce (SVG) para 1, 2 y 3.
   - En el inicio (lo carga assets/auth.js): tarjeta "Top de la semana"
     con el podio, el puesto del alumno y el top 10 completo.
   Datos: supabase/09-simulacros.sql (ranking_simulacro).
   ========================================================= */
(function () {
  var COLORES = { 1: ['#f5c542', '#b8860b'], 2: ['#d9dee5', '#8a94a3'], 3: ['#e0995e', '#9a5a2a'] };
  var uid = 0;
  function estiloMedalla() {
    if (document.getElementById('mc-medalla-css')) return;
    var st = document.createElement('style'); st.id = 'mc-medalla-css';
    // Destello que cruza la medalla cada pocos segundos
    st.textContent = '.mc-medalla .brillo{animation:mcBrillo 3.6s ease-in-out infinite}' +
      '@keyframes mcBrillo{0%,65%{transform:translateX(0)}100%{transform:translateX(42px)}}' +
      '@media (prefers-reduced-motion:reduce){.mc-medalla .brillo{animation:none;opacity:0}}';
    document.head.appendChild(st);
  }
  function medalla(n, tam) {
    var c = COLORES[n];
    if (!c) return '';
    tam = tam || 26;
    estiloMedalla();
    var id = 'mcm' + (++uid);
    return '<svg class="mc-medalla" width="' + tam + '" height="' + Math.round(tam * 28 / 24) + '" viewBox="0 0 24 28" aria-label="Puesto ' + n + '" role="img">' +
      '<path d="M5 0h6l3.2 9.5H8.2z" fill="#C6E000"/><path d="M19 0h-6l-3.2 9.5h6z" fill="#8fa300"/>' +
      '<circle cx="12" cy="18.5" r="8.5" fill="' + c[0] + '" stroke="' + c[1] + '" stroke-width="1.6"/>' +
      '<circle cx="12" cy="18.5" r="5.6" fill="none" stroke="' + c[1] + '" stroke-width=".9" opacity=".55"/>' +
      '<clipPath id="' + id + '"><circle cx="12" cy="18.5" r="8.5"/></clipPath>' +
      '<g clip-path="url(#' + id + ')"><g transform="skewX(-20)"><rect class="brillo" x="-8" y="6" width="5" height="26" fill="#fff" opacity=".6" style="animation-delay:' + (n * 0.4) + 's"/></g></g>' +
      '<text x="12" y="22.2" text-anchor="middle" font-family="Sora,Inter,Arial,sans-serif" font-size="10" font-weight="800" fill="#1a1a1a">' + n + '</text></svg>';
  }
  window.MCMedalla = medalla;

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function dec(n) { return (Math.round((+n || 0) * 10) / 10).toFixed(1).replace('.', ','); }

  /* ---------- Tarjeta del inicio ---------- */
  if (window.MCRankingInicio || !window.MCAuth) return;
  function iniciar() {
    var ancla = document.getElementById('cursos');
    if (!ancla || !document.querySelector('.saludo') || !MCAuth.usuario()) return;
    window.MCRankingInicio = true;
    var BASE = new URL(MCAuth.base || './', location.href).href;
    MCAuth.listo.then(function (c) { return c.rpc('ranking_simulacro'); }).then(function (r) {
      if (r.error) return; // aún no existe la tabla del simulacro
      pintar(r.data || [], BASE, ancla);
    }).catch(function () {});
  }

  function css() {
    var st = document.createElement('style');
    st.textContent =
      '.mcr{margin:26px 0 4px;border:1px solid rgba(255,255,255,.08);background:var(--surface,#0e0e0e);border-radius:22px;padding:20px}' +
      '.mcr-cab{display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:16px}' +
      '.mcr-cab h2{font:800 16px Sora,Inter,sans-serif;margin:0;color:var(--text,#f2f2f2)}' +
      '.mcr-cab small{font:600 12px Inter,sans-serif;color:var(--text-dim,#9a9a9a)}' +
      '.mcr-podio{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;align-items:end}' +
      '.mcr-p{display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;background:#141414;border:1px solid #232323;border-radius:16px;padding:14px 8px;min-width:0}' +
      '.mcr-p.n1{padding-top:22px;border-color:rgba(245,197,66,.45);background:linear-gradient(180deg,rgba(245,197,66,.1),#141414 70%)}' +
      '.mcr-p.yo{box-shadow:inset 0 0 0 1px rgba(198,224,0,.6)}' +
      '.mcr-p b{font:700 14px Inter,sans-serif;color:var(--text,#f2f2f2);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.mcr-p span{font:800 15px Sora,Inter,sans-serif;color:var(--accent,#C6E000);font-variant-numeric:tabular-nums}' +
      '.mcr-p.vac b{color:#5f5f5f}.mcr-p.vac .mc-medalla{opacity:.35}' +
      // Podio: las medallas caen al aparecer y se balancean colgadas de la cinta
      '.mcr-p .mc-medalla{transform-origin:50% 0;animation:mcrCae .7s cubic-bezier(.3,1.6,.5,1) both,mcrBalanceo 3.2s ease-in-out .7s infinite}' +
      '.mcr-p.n1 .mc-medalla{animation-delay:.15s,.85s}.mcr-p.n3 .mc-medalla{animation-delay:.3s,1s}' +
      '.mcr-p.vac .mc-medalla{animation:none}' +
      '@keyframes mcrCae{from{transform:translateY(-14px) rotate(-12deg);opacity:0}to{transform:none;opacity:1}}' +
      '@keyframes mcrBalanceo{0%,100%{transform:rotate(0)}25%{transform:rotate(5deg)}75%{transform:rotate(-5deg)}}' +
      '@media (prefers-reduced-motion:reduce){.mcr-p .mc-medalla{animation:none}}' +
      '.mcr-pie{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:16px;font-size:13.5px;color:var(--text-dim,#9a9a9a)}' +
      '.mcr-pie b{color:var(--text,#f2f2f2)}' +
      '.mcr-bts{display:flex;gap:8px;flex-wrap:wrap}' +
      '.mcr-bt{border:1px solid #232323;background:#141414;color:var(--text,#f2f2f2);border-radius:100px;padding:8px 16px;font:700 13px Inter,sans-serif;cursor:pointer;text-decoration:none}' +
      '.mcr-bt.on{background:var(--accent,#C6E000);border-color:var(--accent,#C6E000);color:#0e0e0e}' +
      '.mcr-lista{list-style:none;margin:14px 0 0;padding:0;display:grid;gap:6px}' +
      '.mcr-lista li{display:flex;align-items:center;gap:10px;background:#141414;border-radius:12px;padding:8px 12px;font-variant-numeric:tabular-nums}' +
      '.mcr-lista .p{width:26px;display:grid;place-items:center;font:800 13px Sora,Inter,sans-serif;color:#5f5f5f;flex-shrink:0}' +
      '.mcr-lista .n{flex:1;min-width:0;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.mcr-lista li.yo{background:rgba(198,224,0,.1);border:1px solid rgba(198,224,0,.3)}' +
      '@media (max-width:520px){.mcr{padding:16px}.mcr-p{padding:12px 4px}.mcr-p b{font-size:12.5px}}' +
      // Estilo grueso tipo Duolingo
      '.mcr{border:2px solid #262626;border-bottom-width:5px;background:linear-gradient(180deg,rgba(245,197,66,.06),#0f0f0f 55%)}' +
      '.mcr-cab h2{font-weight:900;font-size:17px}' +
      '.mcr-p{border:2px solid #2a2a2a;border-bottom-width:4px}.mcr-p.n1{border-color:rgba(245,197,66,.55);border-bottom-color:#a07c1c}' +
      '.mcr-p.yo{box-shadow:none;border-color:rgba(198,224,0,.6);border-bottom-color:#8fa300}.mcr-p b{font-weight:800}.mcr-p span{font-weight:900}' +
      '.mcr-bt{border:2px solid #2e2e2e;border-bottom-width:4px;border-radius:14px;font-weight:900;transition:transform .08s ease;-webkit-tap-highlight-color:transparent}' +
      '.mcr-bt:active{transform:translateY(2px);border-bottom-width:2px}.mcr-bt.on{border-bottom-color:#8fa300;color:#2b3300}' +
      '.mcr-lista[hidden]{display:none}.mcr-lista li{border:2px solid #232323;border-radius:14px}.mcr-lista li.yo{border:2px solid rgba(198,224,0,.4)}.mcr-lista .n{font-weight:800}';
    document.head.appendChild(st);
  }

  function pintar(L, BASE, ancla) {
    css();
    var caja = document.createElement('section');
    caja.id = 'mcRanking'; caja.className = 'mcr';
    caja.setAttribute('aria-label', 'Top de la semana del simulacro');
    var por = {}; L.forEach(function (x) { por[x.puesto] = x; });
    var yo = L.filter(function (x) { return x.yo; })[0];
    var podio = [2, 1, 3].map(function (n) {
      var x = por[n];
      return '<div class="mcr-p n' + n + (x ? '' : ' vac') + (x && x.yo ? ' yo' : '') + '">' + medalla(n, n === 1 ? 46 : 38) +
        '<b>' + (x ? esc(x.apodo) + (x.yo ? ' (tú)' : '') : 'Libre') + '</b><span>' + (x ? dec(x.puntaje) : '—') + '</span></div>';
    }).join('');
    var pie = yo ? 'Vas en el puesto <b>' + yo.puesto + '.º</b> con <b>' + dec(yo.puntaje) + '</b> puntos.'
      : L.length ? 'Aún no das un simulacro esta semana.' : 'Nadie ha dado el simulacro esta semana. ¡Sé el primero!';
    caja.innerHTML = '<div class="mcr-cab"><h2>Top de la semana · Simulacro</h2><small>Se reinicia cada lunes</small></div>' +
      '<div class="mcr-podio">' + podio + '</div>' +
      '<div class="mcr-pie"><span>' + pie + '</span><div class="mcr-bts">' +
      (L.length > 3 ? '<button type="button" class="mcr-bt" id="mcrVer">Ver top 10</button>' : '') +
      '<a class="mcr-bt on" href="' + esc(BASE + 'simulacro.html') + '">Dar simulacro</a></div></div>' +
      '<ol class="mcr-lista" id="mcrLista" hidden>' + L.map(function (x) {
        return '<li class="' + (x.yo ? 'yo' : '') + '"><span class="p">' + (medalla(x.puesto, 18) || x.puesto) + '</span><span class="n">' + esc(x.apodo) + (x.yo ? ' (tú)' : '') + '</span><b>' + dec(x.puntaje) + '</b></li>';
      }).join('') + '</ol>';
    ancla.parentNode.insertBefore(caja, document.getElementById('mcPopulares') || ancla);
    var ver = document.getElementById('mcrVer');
    if (ver) ver.addEventListener('click', function () {
      var l = document.getElementById('mcrLista'); l.hidden = !l.hidden;
      ver.textContent = l.hidden ? 'Ver top 10' : 'Ocultar';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
