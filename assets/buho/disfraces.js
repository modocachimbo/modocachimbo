/* =========================================================
   Modo Cachimbo · Disfraces del búho por área
   - Necesita assets/buho/buho-datos.js y buho-vivo.js.
   - MCDisfraz.vestir(escena, area): cada búho que aparezca en la escena
     (también al reír, enojarse o cambiar de pose) sale disfrazado.
     Áreas: matematica (Pitágoras), ciencia-tecnologia (Einstein),
     comunicacion (Don Quijote), ciencias-sociales (Inca).
   - Las piezas se ubican sobre la cabeza de cada pose con sus capas
     (cejas y ojos), así acompañan al búho cuando respira o salta.
   ========================================================= */
(function () {
  if (window.MCDisfraz) return;

  // Hojas de laurel a lo largo de una curva (Pitágoras)
  function laurel() {
    var h = '', i, t, x, y, a, lado, f;
    for (lado = -1; lado <= 1; lado += 2) {
      for (i = 0; i < 8; i++) {
        t = i / 7;
        x = 100 + lado * (10 + 84 * t);
        y = 70 - 34 * t * t;
        a = lado * (90 - 50 * t);
        f = i % 2 ? '#7fbf2a' : '#5e9e1a';
        h += '<ellipse cx="' + x.toFixed(1) + '" cy="' + (y - 9).toFixed(1) + '" rx="6.5" ry="14" transform="rotate(' + (a - lado * 55).toFixed(0) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')" fill="' + f + '" stroke="#2f5a0c" stroke-width="2.2"/>';
        h += '<ellipse cx="' + x.toFixed(1) + '" cy="' + (y - 9).toFixed(1) + '" rx="6" ry="13" transform="rotate(' + (a + lado * 35 + 180).toFixed(0) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')" fill="' + (i % 2 ? '#5e9e1a' : '#7fbf2a') + '" stroke="#2f5a0c" stroke-width="2.2"/>';
      }
    }
    return '<svg viewBox="0 0 200 100" aria-hidden="true"><path d="M10 38Q30 76 100 72Q170 76 190 38" fill="none" stroke="#c9a227" stroke-width="6" stroke-linecap="round"/>' + h +
      '<circle cx="100" cy="72" r="8" fill="#f6c21c" stroke="#9c7400" stroke-width="3"/></svg>';
  }

  // Pelo blanco alborotado a los lados de la cabeza (Einstein)
  function mechones(cx, cy, s) {
    var c = [[0, 0, 1], [-.8, -.7, .8], [.7, -.8, .75], [-1, .6, .7], [.9, .5, .7], [0, -1.3, .6], [-.2, 1, .65]];
    return c.map(function (p) {
      return '<circle cx="' + (cx + p[0] * s).toFixed(1) + '" cy="' + (cy + p[1] * s).toFixed(1) + '" r="' + (p[2] * s).toFixed(1) + '"/>';
    }).join('');
  }
  var PELO = '<svg viewBox="0 0 380 200" aria-hidden="true"><g fill="#f4f4f6" stroke="#8d8aa0" stroke-width="5">' +
    mechones(36, 118, 25) + mechones(344, 118, 25) + mechones(52, 62, 21) + mechones(328, 62, 21) + mechones(34, 170, 18) + mechones(346, 170, 18) + mechones(110, 26, 16) + mechones(270, 26, 16) + '</g>' +
    '<g fill="#f4f4f6">' + mechones(36, 118, 21) + mechones(344, 118, 21) + mechones(52, 62, 17) + mechones(328, 62, 17) + mechones(34, 170, 14) + mechones(346, 170, 14) + mechones(110, 26, 12) + mechones(270, 26, 12) + '</g>' +
    '<g fill="none" stroke="#c9c6d6" stroke-width="3" stroke-linecap="round"><path d="M22 108q10-8 22 0"/><path d="M332 112q12-8 22 2"/><path d="M42 56q8-8 18-2"/><path d="M320 52q10-6 18 2"/></g></svg>';
  var BIGOTE = '<svg viewBox="0 0 160 60" aria-hidden="true"><path d="M80 14C70 6 52 6 38 14 24 22 12 22 4 18 8 36 24 48 44 46 60 44 72 36 80 28 88 36 100 44 116 46 136 48 152 36 156 18 148 22 136 22 122 14 108 6 90 6 80 14z" fill="#f4f4f6" stroke="#8d8aa0" stroke-width="4" stroke-linejoin="round"/>' +
    '<g stroke="#c9c6d6" stroke-width="3" stroke-linecap="round" fill="none"><path d="M30 24l-6 12"/><path d="M46 22l-4 16"/><path d="M62 20l-2 14"/><path d="M98 20l2 14"/><path d="M114 22l4 16"/><path d="M130 24l6 12"/></g></svg>';

  // Bacía de barbero como yelmo (Don Quijote)
  var YELMO = '<svg viewBox="0 0 200 110" aria-hidden="true"><defs><linearGradient id="mcd-oro" x1="0" x2="1"><stop offset="0" stop-color="#b8860b"/><stop offset=".35" stop-color="#ffe27a"/><stop offset=".6" stop-color="#f6c21c"/><stop offset="1" stop-color="#9c7400"/></linearGradient></defs>' +
    '<path d="M38 82C38 34 64 8 100 8s62 26 62 74z" fill="url(#mcd-oro)" stroke="#6b4e00" stroke-width="5"/>' +
    '<path d="M60 70C60 40 76 22 96 18" fill="none" stroke="#fff6c8" stroke-width="7" stroke-linecap="round" opacity=".7"/>' +
    '<path d="M4 82h192c0 12-10 20-24 20h-46a26 22 0 0 0-52 0H28C14 102 4 94 4 82z" fill="url(#mcd-oro)" stroke="#6b4e00" stroke-width="5" stroke-linejoin="round"/>' +
    '<circle cx="100" cy="8" r="7" fill="#f6c21c" stroke="#6b4e00" stroke-width="4"/></svg>';

  // Mascaipacha: llautu de colores, borla roja y plumas (Inca)
  var MASCAI = '<svg viewBox="0 0 200 130" aria-hidden="true">' +
    '<g stroke="#1a1626" stroke-width="3"><path d="M84 52C76 30 78 10 88 0c4 18 4 36 0 52z" fill="#fff"/><path d="M116 52c8-22 6-42-4-52-4 18-4 36 0 52z" fill="#fff"/><path d="M93 52c-4-24 0-44 7-52 7 8 11 28 7 52z" fill="#1a1626"/></g>' +
    '<path d="M84 18c2 10 3 22 1 30M116 18c-2 10-3 22-1 30" stroke="#1a1626" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    '<circle cx="100" cy="58" r="13" fill="#f6c21c" stroke="#9c7400" stroke-width="4"/><circle cx="100" cy="58" r="5" fill="#ff9600"/>' +
    '<path d="M6 66Q100 50 194 66v18Q100 68 6 84z" fill="#e0453c" stroke="#7a1d18" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M8 71Q100 56 192 71" stroke="#f6c21c" stroke-width="4" fill="none"/><path d="M8 78Q100 62 192 78" stroke="#1CB0F6" stroke-width="3.5" fill="none" stroke-dasharray="10 8"/>' +
    '<path d="M64 76h72v10H64z" fill="#9c7400"/>' +
    '<g stroke="#c0281e" stroke-width="6" stroke-linecap="round">' +
    [68, 77, 86, 95, 104, 113, 122, 131].map(function (x, i) { return '<path d="M' + x + ' 84v' + (20 + (i % 2) * 4) + '"/>'; }).join('') +
    '</g><g stroke="#ff6b5e" stroke-width="2.5" stroke-linecap="round">' +
    [68, 86, 104, 122].map(function (x) { return '<path d="M' + (x - 1) + ' 86v14"/>'; }).join('') + '</g></svg>';

  // Cada pieza: dónde va respecto a las cejas (centro x, y de abajo) y su ancho, en veces el ancho de las cejas
  var TRAJES = {
    'matematica': [{ svg: laurel(), cx: .5, y: .66, w: 1.12, ar: 2 }],
    'ciencia-tecnologia': [{ svg: PELO, cx: .5, y: 1.5, w: 1.72, ar: 380 / 200 }, { svg: BIGOTE, ojos: true, w: .62, ar: 160 / 60 }],
    'comunicacion': [{ svg: YELMO, cx: .5, y: .34, w: .86, ar: 200 / 110 }],
    'ciencias-sociales': [{ svg: MASCAI, cx: .5, y: 1.02, w: 1.08, ar: 200 / 130 }]
  };

  function capa(d, n) { return d.L.filter(function (l) { return l.n === n; })[0]; }
  function pose(mcb) { var m = /mcb-(\w+)/.exec(String(mcb.className).replace('mcb ', '')); return m && m[1] === 'vivo' ? 'oficial' : m && m[1]; }
  function pct(a, b) { return (a / b * 100).toFixed(3) + '%'; }

  function vestirBuho(mcb, area) {
    var p = pose(mcb), d = p && window.MCBuhoDatos && MCBuhoDatos[p], ce = d && capa(d, 'cejas'), rig = mcb.querySelector('.mcb-r');
    if (!ce || !rig || mcb.querySelector('.mcd')) return;
    (TRAJES[area] || []).forEach(function (t) {
      var w = ce.w * t.w, h = w / t.ar, cx, bottom;
      if (t.ojos) {
        // Bajo el pico: debajo de los ojos (o de las cejas en las poses sin ojos animados)
        var e = d.E && d.E.length ? d.E : null;
        cx = e ? (e[0].x + e[1].x + e[1].w) / 2 : ce.x + ce.w / 2;
        bottom = (e ? e[0].y + e[0].h * 1.32 : ce.y + ce.h * 1.62) + h * .55;
      } else {
        cx = ce.x + ce.w * t.cx;
        bottom = ce.y + ce.h * t.y;
      }
      var el = document.createElement('div');
      el.className = 'mcd';
      el.setAttribute('aria-hidden', 'true');
      el.style.cssText = 'position:absolute;pointer-events:none;left:' + pct(cx - w / 2, d.W) + ';top:' + pct(bottom - h, d.H) + ';width:' + pct(w, d.W) + ';z-index:3';
      el.innerHTML = t.svg;
      el.firstChild.style.cssText = 'display:block;width:100%;height:auto;overflow:visible';
      rig.append(el);
    });
  }

  function vestir(escena, area) {
    if (!escena || !TRAJES[area]) return;
    Array.prototype.forEach.call(escena.querySelectorAll('.mcb'), function (b) { vestirBuho(b, area); });
    new MutationObserver(function () {
      Array.prototype.forEach.call(escena.querySelectorAll('.mcb'), function (b) { vestirBuho(b, area); });
    }).observe(escena, { childList: true });
  }

  window.MCDisfraz = { vestir: vestir, areas: Object.keys(TRAJES) };
})();
