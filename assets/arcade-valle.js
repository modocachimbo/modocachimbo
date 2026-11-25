/* =========================================================
   Modo Cachimbo · Arcade · Mapa de niveles sobre un fondo pintado ("valle")
   Los niveles son bloques (hielo = abierto/ganado, roca con candado = bloqueado,
   roca grande = jefe) puestos sobre el camino del dibujo; los niveles extra son
   torres a los costados. El fondo cambia entre celular (vertical) y PC (horizontal):
   cada uno tiene sus propias posiciones, en % de la imagen.
   Uso: MCValle.abrir(capa, { valle: 'hielo', niveles, extras, estrellas(t), max(t),
        completo(t), tocar(i, nivel, estado), tocarExtra(extra, estado) })
   Devuelve lo mismo que MCIslas.abrir (actual, estado, hechos, total).
   ========================================================= */
(function () {
  if (window.MCValle) return;
  var R = 'assets/arcade/valle/';
  /* Posiciones: n = [x%, y%] de cada nivel (de abajo hacia arriba; el último es el jefe),
     t = [x%, y%] de cada torre extra, en el mismo orden que "extras" del curso.
     w = ancho del bloque y tw = ancho de la torre, en % del ancho de la imagen. */
  var VALLES = {
    hielo: {
      cel: { img: 'hielo-cel.webp', ar: 1080 / 1935, w: 13, tw: 18,
        n: [[50, 77.5], [35, 72.1], [62, 66.7], [42, 61.3], [66, 55.9], [46, 50.5], [66, 45.1], [44, 39.7], [64, 34.3], [44, 28.9], [56, 23.5]],
        t: [[25, 55.5], [77, 41], [25, 33]] },
      pc: { img: 'hielo-pc.webp', ar: 1920 / 1072, w: 5.2, tw: 8.5,
        n: [[52, 72], [60, 63.5], [47, 57.5], [57.5, 51], [46, 44.5], [56, 38.5], [45.5, 32.5], [55, 26.5], [46, 20.5], [54.5, 15], [49.5, 9.5]],
        t: [[20, 62], [86, 50], [31, 45]] }
    }
  };
  var TORRE = { manantial: 'torre-manantial', lapida: 'torre-lapida', portal: 'torre-portal' };
  var CAND = '<svg class="vl-cand" viewBox="0 0 40 44"><path d="M11 19v-6a9 9 0 0 1 18 0v6" fill="none" stroke="#1A2040" stroke-width="9"/><path d="M11 19v-6a9 9 0 0 1 18 0v6" fill="none" stroke="#D8DEF0" stroke-width="5"/><rect x="5" y="18" width="30" height="23" rx="6" fill="#F2B21E" stroke="#1A2040" stroke-width="3.5"/><circle cx="20" cy="28" r="3.5" fill="#1A2040"/><path d="M20 30v5" stroke="#1A2040" stroke-width="3"/></svg>';
  var CAND_MINI = '<svg viewBox="0 0 40 44"><path d="M11 19v-6a9 9 0 0 1 18 0v6" fill="none" stroke="currentColor" stroke-width="6"/><rect x="5" y="18" width="30" height="23" rx="6" fill="currentColor"/></svg>';
  var ESTRELLA = function (on) { return '<svg class="' + (on ? '' : 'off') + '" viewBox="0 0 100 100"><use href="#i-estrella3d"/></svg>'; };

  function abrir(capa, o) {
    var V = VALLES[o.valle] || VALLES.hielo;
    var W = capa.clientWidth || innerWidth, H = capa.clientHeight || innerHeight, modo = W / H >= 1 ? 'pc' : 'cel', P = V[modo];
    // El dibujo cubre toda la pantalla sin deformarse (se recorta un poco por los lados o arriba/abajo)
    var LW = Math.max(W, H * P.ar), LH = LW / P.ar;
    var E = MCIslas.estados(o), est = E.est, ACT = E.actual, N = o.niveles, n = N.length;
    var h = '', pts = [];
    for (var i = 0; i < n && i < P.n.length; i++) {
      var s = est[i], jefe = i === n - 1, p = P.n[i], ahora = i === ACT && !s.hecho, abierto = s.hecho || s.abierto;
      var w = LW * P.w / 100 * (jefe ? 1.45 : 1);
      pts.push(p);
      h += '<button type="button" class="vl-n' + (s.hecho ? ' hecho' : '') + (ahora ? ' act' : '') + (abierto ? '' : ' bloq') + (jefe ? ' jefe' : '') + '" data-i="' + i + '"' +
        ' style="left:' + p[0] + '%;top:' + p[1] + '%;--w:' + w.toFixed(1) + 'px;--d:-' + (i * .7).toFixed(1) + 's" aria-label="' + (jefe ? 'Jefe' : 'Nivel ' + (i + 1)) + ': ' + N[i].n + '">' +
        '<img src="' + R + (abierto ? 'bloque-hielo' : jefe ? 'bloque-jefe' : 'bloque-roca') + '.webp" alt="" draggable="false">' +
        (abierto ? '<span class="num">' + (jefe ? '<svg viewBox="0 0 100 100"><use href="#i-corona"/></svg>' : i + 1) + '</span>' : CAND) +
        (s.hecho ? '<span class="st">' + [1, 2, 3].map(function (k) { return ESTRELLA(k <= s.tres); }).join('') + '</span>' : '') +
        (ahora ? '<span class="bur">¡JUEGA!</span><span class="nm">' + N[i].n + '</span>' : '') +
        (jefe ? '<span class="cinta">JEFE</span>' : '') + '</button>';
    }
    // Torres de los niveles extra
    var ext = o.extras || [], estExt = ext.map(function (x) { return { abierto: !!(est[x.tras] && est[x.tras].hecho) }; });
    ext.forEach(function (x, j) {
      var p = P.t[j]; if (!p) return;
      h += '<button type="button" class="vl-t' + (estExt[j].abierto ? ' abierta' : ' bloq') + '" data-x="' + j + '" style="left:' + p[0] + '%;top:' + p[1] + '%;--w:' + (LW * P.tw / 100).toFixed(1) + 'px" aria-label="Nivel extra: ' + x.n + '">' +
        '<img src="' + R + (TORRE[x.tipo] || 'torre-portal') + '.webp" alt="" draggable="false"><span class="eti">' + (estExt[j].abierto ? '' : CAND_MINI) + x.n + '</span></button>';
    });
    // Huellas del camino: lima hasta el nivel que toca, blancas después
    var d1 = '', d2 = '', hasta = Math.max(0, ACT);
    pts.forEach(function (p, k) { var c = p[0] + ' ' + p[1]; if (k <= hasta) d1 += (k ? 'L' : 'M') + c; if (k >= hasta) d2 += (k === hasta ? 'M' : 'L') + c; });
    var VE = ' vector-effect="non-scaling-stroke" fill="none" stroke-linecap="round"';
    var ruta = '<svg class="vl-ruta" viewBox="0 0 100 100" preserveAspectRatio="none">' +
      '<path d="' + d2 + '"' + VE + ' stroke="rgba(255,255,255,.85)" stroke-width="5" stroke-dasharray="1 12"/>' +
      (d1.indexOf('L') > 0 ? '<path d="' + d1 + '"' + VE + ' stroke="#1F2600" stroke-width="9" stroke-dasharray="1 12"/><path d="' + d1 + '"' + VE + ' stroke="#C6E000" stroke-width="6" stroke-dasharray="1 12"/>' : '') + '</svg>';
    // Copos de nieve cayendo (solo adorno)
    var copos = '';
    for (var c = 0; c < 26; c++) copos += '<i style="left:' + (c * 37 % 100) + '%;--t:' + (7 + c % 6) + 's;--d:-' + (c * 1.3 % 9).toFixed(1) + 's;--s:' + (3 + c % 4) + 'px"></i>';
    capa.innerHTML = '<div class="vl" style="width:' + LW.toFixed(0) + 'px;height:' + LH.toFixed(0) + 'px;background-image:url(' + R + P.img + ')">' + ruta + h + '</div><div class="vl-nieve">' + copos + '</div>';
    capa.classList.add('valle');
    capa.querySelectorAll('.vl-n').forEach(function (b) { b.onclick = function () { var i = +b.dataset.i; o.tocar(i, N[i], est[i]); }; });
    capa.querySelectorAll('.vl-t').forEach(function (b) { b.onclick = function () { var j = +b.dataset.x; o.tocarExtra(ext[j], estExt[j]); }; });
    return { actual: ACT, estado: est, hechos: est.filter(function (s) { return s.hecho; }).length, total: n };
  }

  window.MCValle = { abrir: abrir, valles: VALLES };
})();
