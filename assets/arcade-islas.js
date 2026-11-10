/* =========================================================
   Modo Cachimbo · Arcade · Mapa de niveles en islas flotantes (hecho con código)
   Cada nivel es una isla en el cielo (pasto, roca en capas, raíces, árboles) con
   una piedra tallada encima que lleva el número del nivel. Se sube de abajo hacia
   arriba; entre isla e isla hay piedritas flotantes (lima hasta donde llegaste).
   Uso: MCIslas.abrir(capa, { niveles, extras, etapas, estrellas(t), max(t), completo(t),
        tocar(i, nivel, estado), tocarExtra(extra, estado) })
   ========================================================= */
(function () {
  if (window.MCIslas) return;
  function islaSVG (seed, est, num, jefe) {
    var r = (function (s) { return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })(seed * 97 + 13);
    var id = 'i' + seed, cx = 110, cy = 66, rx = 94, ry = 34, f = function (n) { return n.toFixed(1); };
    var top = [], i, a, k;
    for (i = 0; i < 22; i++) { a = i / 22 * Math.PI * 2; k = .95 + r() * .07; top.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    var poly = function (p) { return p.map(function (q, j) { return (j ? 'L' : 'M') + f(q[0]) + ' ' + f(q[1]); }).join('') + 'Z'; };
    var smooth = function (p) { var d = 'M' + f((p[0][0] + p[p.length - 1][0]) / 2) + ' ' + f((p[0][1] + p[p.length - 1][1]) / 2); for (var j = 0; j < p.length; j++) { var n = p[(j + 1) % p.length]; d += 'Q' + f(p[j][0]) + ' ' + f(p[j][1]) + ' ' + f((p[j][0] + n[0]) / 2) + ' ' + f((p[j][1] + n[1]) / 2); } return d + 'Z'; };
    // cuerpo de roca: mitad de abajo del borde + punta irregular
    var tip = cx - 8 + r() * 16, bot = [[cx - 70, 112], [cx - 52, 134 + r() * 8], [cx - 30, 156], [tip - 10, 182], [tip, 196], [tip + 12, 176], [cx + 36, 150], [cx + 58, 126 + r() * 8], [cx + 76, 104]];
    var bodyD = poly([[cx - rx, cy + 6]].concat(bot).concat([[cx + rx, cy + 6]]));
    var s = '<svg viewBox="0 0 220 210" class="isv">' +
      '<defs><linearGradient id="' + id + 'g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9BF06A"/><stop offset=".6" stop-color="#4CC63A"/><stop offset="1" stop-color="#2F9A24"/></linearGradient>' +
      '<linearGradient id="' + id + 'r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9A6A3A"/><stop offset=".45" stop-color="#7A4E26"/><stop offset="1" stop-color="#4A2C12"/></linearGradient>' +
      '<linearGradient id="' + id + 'p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9EEF2"/><stop offset="1" stop-color="#A9B3BE"/></linearGradient>' +
      '<linearGradient id="' + id + 'y" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F8FFB0"/><stop offset=".6" stop-color="#C6E000"/><stop offset="1" stop-color="#8FA800"/></linearGradient>' +
      '<clipPath id="' + id + 'c"><path d="' + bodyD + '"/></clipPath></defs>';
    // piedritas sueltas debajo
    [[30 + r() * 20, 168 + r() * 14, 9], [176 + r() * 20, 150 + r() * 20, 7], [70 + r() * 10, 198, 5]].forEach(function (p) {
      s += '<g class="frag"><path d="M' + f(p[0] - p[2]) + ' ' + f(p[1]) + 'L' + f(p[0] + p[2]) + ' ' + f(p[1]) + 'L' + f(p[0] + p[2] * .3) + ' ' + f(p[1] + p[2] * 1.4) + 'Z" fill="#6E4622"/><ellipse cx="' + f(p[0]) + '" cy="' + f(p[1]) + '" rx="' + p[2] + '" ry="' + f(p[2] * .4) + '" fill="#5CC846"/></g>';
    });
    // roca
    s += '<path d="' + bodyD + '" fill="url(#' + id + 'r)"/>' +
      '<g clip-path="url(#' + id + 'c)">' +
      '<path d="M0 104 Q55 ' + f(96 + r() * 10) + ' 110 106 T220 102" stroke="#5A3618" stroke-width="5" fill="none" opacity=".55"/>' +
      '<path d="M0 134 Q60 ' + f(126 + r() * 10) + ' 110 136 T220 130" stroke="#4A2C12" stroke-width="5" fill="none" opacity=".55"/>' +
      '<path d="M0 164 Q60 158 110 166 T220 160" stroke="#3A2210" stroke-width="5" fill="none" opacity=".55"/>' +
      '<path d="M0 60 L' + f(cx - 30) + ' 60 L' + f(tip - 6) + ' 210 L0 210Z" fill="#fff" opacity=".1"/>' +
      '<path d="M' + f(cx + 40) + ' 60 L220 60 L220 210 L' + f(tip + 10) + ' 210Z" fill="#000" opacity=".2"/>' +
      [0, 1, 2, 3, 4].map(function () { var x = 30 + r() * 160, y = 100 + r() * 60; return '<path d="M' + f(x) + ' ' + f(y) + 'l6 -4l7 3l-2 6l-8 1z" fill="#B9875A" opacity=".5"/>'; }).join('') +
      '</g>';
    // raíces y lianas
    [[cx - 74, 92, -1], [cx - 40, 102, 1], [cx + 30, 102, -1], [cx + 70, 94, 1]].forEach(function (p, j) {
      var L = 26 + r() * 40;
      s += '<path d="M' + f(p[0]) + ' ' + f(p[1]) + 'q' + f(p[2] * 8) + ' ' + f(L * .5) + ' 0 ' + f(L) + '" stroke="' + (j % 2 ? '#3E9A2C' : '#5A3A1A') + '" stroke-width="' + (j % 2 ? 3 : 2.5) + '" fill="none" stroke-linecap="round"/>' +
        (j % 2 ? '<circle cx="' + f(p[0] + p[2] * 3) + '" cy="' + f(p[1] + L * .45) + '" r="3.5" fill="#5CC846"/><circle cx="' + f(p[0]) + '" cy="' + f(p[1] + L) + '" r="3" fill="#5CC846"/>' : '');
    });
    // borde de pasto y tapa
    s += '<path d="' + smooth(top.map(function (q) { return [q[0], q[1] + 9]; })) + '" fill="#2A8A1E"/>' +
      '<path d="' + smooth(top) + '" fill="url(#' + id + 'g)"/>' +
      '<path d="' + smooth(top.map(function (q) { return [cx + (q[0] - cx) * .82, cy - 3 + (q[1] - cy) * .7]; })) + '" fill="#fff" opacity=".1"/>';
    // pasto colgando del borde
    for (i = 0; i < 9; i++) { var x = cx - 80 + i * 20 + r() * 6; s += '<path d="M' + f(x) + ' ' + f(cy + 30 - Math.abs(x - cx) * .2) + 'l4 ' + f(5 + r() * 6) + 'l4 -' + f(4 + r() * 4) + 'z" fill="#2A8A1E"/>'; }
    // decoración
    var deco = '';
    var arbol = function (x, y, t) { return '<g><ellipse cx="' + x + '" cy="' + (y + 2) + '" rx="' + (12 * t) + '" ry="' + (4 * t) + '" fill="#1E6E14" opacity=".5"/><rect x="' + (x - 2.5 * t) + '" y="' + (y - 14 * t) + '" width="' + (5 * t) + '" height="' + (16 * t) + '" rx="2" fill="#6E4622"/>' +
      '<circle cx="' + x + '" cy="' + (y - 20 * t) + '" r="' + (13 * t) + '" fill="#2E9A3A"/><circle cx="' + (x - 7 * t) + '" cy="' + (y - 16 * t) + '" r="' + (9 * t) + '" fill="#3DB04A"/><circle cx="' + (x + 6 * t) + '" cy="' + (y - 26 * t) + '" r="' + (8 * t) + '" fill="#5CD068"/><circle cx="' + (x + 3 * t) + '" cy="' + (y - 29 * t) + '" r="' + (3 * t) + '" fill="#9BF0A0" opacity=".7"/></g>'; };
    var roca = function (x, y, t) { return '<path d="M' + (x - 10 * t) + ' ' + y + 'l3 -' + (9 * t) + 'l8 -' + (4 * t) + 'l8 ' + (5 * t) + 'l2 ' + (8 * t) + 'z" fill="#A9A28C"/><path d="M' + (x - 7 * t) + ' ' + (y - 9 * t) + 'l8 -' + (4 * t) + 'l1 ' + (6 * t) + 'z" fill="#D8D0BC"/>'; };
    var mata = function (x, y) { return '<path d="M' + x + ' ' + y + 'l-4 -8M' + x + ' ' + y + 'l0 -10M' + x + ' ' + y + 'l4 -8" stroke="#2A8A1E" stroke-width="2" stroke-linecap="round"/>'; };
    var flor = function (x, y, c) { return '<circle cx="' + x + '" cy="' + y + '" r="2.6" fill="' + c + '"/><circle cx="' + x + '" cy="' + y + '" r="1" fill="#FFF3A0"/>'; };
    var lado = seed % 2;
    deco += arbol(lado ? 36 : 182, 64, .95) + arbol(lado ? 58 : 162, 50, .7);
    deco += roca(lado ? 176 : 44, 74, 1) + roca(lado ? 160 : 60, 84, .7);
    deco += mata(84, 92) + mata(140, 90) + mata(lado ? 186 : 34, 80);
    deco += flor(72, 84, '#FF6FA8') + flor(148, 82, '#FFD23F') + flor(lado ? 150 : 70, 46, '#B88BFF') + flor(124, 94, '#FF6FA8');
    s += deco;
    // piedra del nivel
    var px = cx, py = 66, prx = 40, pry = 14, h = 14;
    var tapa = est === 'ya' ? 'url(#' + id + 'y)' : 'url(#' + id + 'p)';
    if (jefe) tapa = '#FF8AC8';
    s += '<ellipse cx="' + px + '" cy="' + (py + h + 5) + '" rx="' + (prx + 4) + '" ry="' + (pry + 2) + '" fill="#1E6E14" opacity=".45"/>' +
      '<path d="M' + (px - prx) + ' ' + py + 'v' + h + 'a' + prx + ' ' + pry + ' 0 0 0 ' + (prx * 2) + ' 0v-' + h + 'z" fill="' + (est === 'ya' ? '#6E8A00' : jefe ? '#8A1A5A' : '#6E7884') + '"/>' +
      '<path d="M' + (px - prx) + ' ' + (py + 6) + 'a' + prx + ' ' + pry + ' 0 0 0 ' + (prx * 2) + ' 0" stroke="rgba(0,0,0,.25)" stroke-width="2" fill="none"/>' +
      '<ellipse cx="' + px + '" cy="' + py + '" rx="' + prx + '" ry="' + pry + '" fill="' + tapa + '" stroke="' + (est === 'ya' ? '#3E4A00' : '#4A525C') + '" stroke-width="2"/>' +
      '<ellipse cx="' + px + '" cy="' + py + '" rx="' + (prx - 8) + '" ry="' + (pry - 4) + '" fill="none" stroke="' + (est === 'ya' ? '#8FA800' : est === 'ok' ? '#5CC846' : '#8A939E') + '" stroke-width="2.5"' + (est === 'ok' ? ' style="filter:drop-shadow(0 0 3px #6FFF4A)"' : '') + '/>' +
      '<path d="M' + (px - 30) + ' ' + (py - 6) + 'l6 2M' + (px + 22) + ' ' + (py + 7) + 'l6 -3" stroke="rgba(0,0,0,.2)" stroke-width="1.5"/>';
    var cont = est === 'lock' ? '<g transform="translate(' + px + ' ' + (py - 2) + ') scale(1 .85)"><rect x="-9" y="-3" width="18" height="13" rx="3" fill="#4A525C"/><path d="M-5 -3v-4a5 5 0 0 1 10 0v4" stroke="#4A525C" stroke-width="3" fill="none"/></g>'
      : '<text x="' + px + '" y="' + (py + 9) + '" text-anchor="middle" transform="translate(0 ' + (py * .15) + ') scale(1 .85)" font-family="Lilita One" font-size="' + (jefe ? 22 : 28) + '" fill="' + (est === 'ya' ? '#1C2600' : jefe ? '#5A0A3A' : '#3A424C') + '" stroke="' + (est === 'ya' ? '#F8FFB0' : '#fff') + '" stroke-width="1" paint-order="stroke">' + num + '</text>';
    s += cont + '</svg>';
    return s;
  }

  var ESTRELLA = function (on) { return '<svg class="' + (on ? '' : 'off') + '" viewBox="0 0 100 100"><use href="#i-estrella3d"/></svg>'; };
  var ICO_EXT = { manantial: '🏺', lapida: '📜', portal: '🌀' };

  function estados(o) {
    var actual = -1, abiertos = true;
    var est = o.niveles.map(function (nv, i) {
      var e = nv.t ? o.estrellas(nv.t) : 0, m = nv.t ? o.max(nv.t) : 0, hecho = m > 0 && o.completo(nv.t);
      var abierto = abiertos && !!nv.t;
      if (abierto && !hecho && actual < 0) actual = i;
      if (!hecho) abiertos = false;
      return { e: e, m: m, hecho: hecho, abierto: abierto || hecho, tres: m && e ? Math.max(1, Math.round(e / m * 3)) : 0 };
    });
    if (actual < 0) { for (var i = est.length - 1; i >= 0; i--) if (est[i].hecho) { actual = i; break; } }
    return { est: est, actual: actual };
  }

  function abrir(capa, o) {
    var E = estados(o), est = E.est, ACT = E.actual, N = o.niveles, n = N.length;
    var pc = innerWidth > 720, ancho = pc ? Math.max(360, Math.min(760, innerWidth - 480)) : Math.min(460, innerWidth);
    var IW = pc ? Math.max(190, Math.min(300, innerHeight * .36)) : Math.min(210, ancho * .54), PASO = IW * 1.22;
    var XS = [0, .2, -.02, -.22, 0, .2, 0, -.2, .02, .2, 0, -.2];
    var etapas = o.etapas || {}, netapas = Object.keys(etapas).length;
    var abajo = pc ? 120 : 250, H = (pc ? 250 : 280) + PASO * (n - 1) + netapas * 80 + abajo + IW, y = H - abajo - IW * .2, pts = [], h = '';
    for (var i = 0; i < n; i++) {
      if (etapas[i] && i) { y -= 40; h += '<div class="nv-etapa" style="top:' + (y + 10) + 'px">' + etapas[i][0] + '<small>' + etapas[i][1] + '</small></div>'; y -= 40; }
      if (etapas[i] && !i) h += '<div class="nv-etapa" style="top:' + (y + IW * .62) + 'px">' + etapas[i][0] + '<small>' + etapas[i][1] + '</small></div>';
      var s = est[i], jefe = i === n - 1, iw = jefe ? IW * 1.3 : IW, x = ancho / 2 + XS[i % XS.length] * ancho;
      var cls = s.hecho ? 'ok' : i === ACT ? 'ya' : s.abierto ? 'ok' : 'lock';
      if (i === ACT && !s.hecho) cls = 'ya';
      pts.push([x, y, iw]);
      h += '<button type="button" class="ni ' + cls + (jefe ? ' jefe' : '') + (i === ACT && !s.hecho ? ' ahora' : '') + '" data-i="' + i + '" style="left:' + x.toFixed(0) + 'px;top:' + (y - iw * .3).toFixed(0) + 'px;width:' + iw.toFixed(0) + 'px;margin-left:' + (-iw / 2).toFixed(0) + 'px;--d:-' + (i * .9).toFixed(1) + 's" aria-label="' + (jefe ? 'Jefe' : 'Nivel ' + (i + 1)) + ': ' + N[i].n + '">' +
        (i === ACT && !s.hecho ? '<span class="haz"></span><span class="bur">¡JUEGA!</span>' : '') +
        (s.hecho ? '<span class="st">' + [1, 2, 3].map(function (k) { return ESTRELLA(k <= s.tres); }).join('') + '</span>' : '') +
        '<span class="cuerpo">' + islaSVG(i + 3, cls === 'ya' ? 'ya' : cls, jefe ? '👑' : i + 1, jefe) + '</span>' +
        '<span class="nm">' + N[i].n + '</span>' + (i % 3 === 1 ? '<i class="nb" style="--x:' + (i % 2 ? -20 : 30) + '%"></i>' : '') + '</button>';
      y -= PASO;
    }
    for (var k = 1; k < pts.length; k++) {
      var lo = pts[k - 1], up = pts[k], yTop = lo[1] - lo[2] * .1, yTip = up[1] - up[2] * .3 + up[2] * .88;
      [.3, .68].forEach(function (t, j) {
        var xx = lo[0] + (up[0] - lo[0]) * (1 - t) + (j ? 14 : -14), yy = yTop + (yTip - yTop) * t;
        h += '<i class="pd' + (est[k - 1].hecho ? ' on' : '') + '" style="left:' + xx.toFixed(0) + 'px;top:' + yy.toFixed(0) + 'px;--d:-' + ((k + j) * .6).toFixed(1) + 's"></i>';
      });
    }
    var ext = o.extras || [], estExt = ext.map(function (x) { return { abierto: !!(est[x.tras] && est[x.tras].hecho) }; });
    ext.forEach(function (x, j) {
      var p = pts[x.tras]; if (!p) return;
      var ex = p[0] < ancho / 2 ? ancho * .84 : ancho * .16;
      h += '<button type="button" class="nv-ext' + (estExt[j].abierto ? '' : ' lock') + '" data-x="' + j + '" style="left:' + ex.toFixed(0) + 'px;top:' + (p[1] - 10).toFixed(0) + 'px" aria-label="Nivel extra: ' + x.n + '"><span class="cf">' + (ICO_EXT[x.tipo] || '🎁') + '</span><em>Extra</em></button>';
    });
    capa.innerHTML = '<div class="nv-ruta" style="height:' + H.toFixed(0) + 'px;width:' + ancho + 'px">' + h + '</div>';
    capa.querySelectorAll('.ni').forEach(function (b) { b.onclick = function () { var i = +b.dataset.i; o.tocar(i, N[i], est[i]); }; });
    capa.querySelectorAll('.nv-ext').forEach(function (b) { b.onclick = function () { var j = +b.dataset.x; o.tocarExtra(ext[j], estExt[j]); }; });
    var foco = pts[Math.max(0, ACT)];
    requestAnimationFrame(function () { capa.scrollTop = foco[1] - innerHeight * (pc ? .5 : .55); });
    return { actual: ACT, estado: est, hechos: est.filter(function (s) { return s.hecho; }).length, total: n };
  }

  window.MCIslas = { abrir: abrir, isla: islaSVG };
})();
