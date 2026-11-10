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
  /* ---------- Adornos peruanos (dibujados con SVG; base en y=0, hacia arriba y<0) ---------- */
  function G(x, y, t, flip, inner) { return '<g transform="translate(' + x + ' ' + y + ') scale(' + (t * (flip ? -1 : 1)) + ' ' + t + ')">' + inner + '</g>'; }
  var SOMBRA = function (w) { return '<ellipse cx="0" cy="1" rx="' + w + '" ry="' + (w * .3) + '" fill="#1E6E14" opacity=".45"/>'; };
  var P = {
    llama: function () { return SOMBRA(13) +
      '<g stroke="#5A4630" stroke-width="2.4" stroke-linecap="round"><path d="M-8 -6v6M-4 -6v6M5 -6v6M9 -6v6"/></g>' +
      '<ellipse cx="0" cy="-10" rx="12" ry="7" fill="#F4E6CC"/><path d="M-10 -12q-4 2 -3 6" stroke="#F4E6CC" stroke-width="4" stroke-linecap="round" fill="none"/>' +
      '<rect x="-5" y="-16" width="11" height="6" rx="2" fill="#D7263D"/><rect x="-5" y="-14" width="11" height="2" fill="#FFC800"/><path d="M-5 -10h11" stroke="#1E86BE" stroke-width="1.5"/>' +
      '<g class="a-cabeza"><path d="M7 -12q2 -12 1 -20" stroke="#F4E6CC" stroke-width="6" stroke-linecap="round" fill="none"/>' +
      '<ellipse cx="10" cy="-32" rx="5" ry="4" fill="#F4E6CC"/><path d="M6 -35l-1 -6l3 4M9 -36l1 -6l2 5" fill="#E8D4B0" stroke="#E8D4B0" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<circle cx="11" cy="-33" r="1.2" fill="#2A1A10"/><circle cx="14.5" cy="-31" r=".9" fill="#7A5A40"/></g>'; },
    cactus: function () { return SOMBRA(9) +
      '<path d="M-3 0v-34a3.5 3.5 0 0 1 7 0v34z" fill="#3E9A4A"/><path d="M4 -14h4v-10a3 3 0 0 1 6 0v10a6 6 0 0 1 -6 6h-4z" fill="#3E9A4A"/><path d="M-3 -10h-4v-8a3 3 0 0 0 -6 0v8a6 6 0 0 0 6 6h4z" fill="#46AA52"/>' +
      '<path d="M0.5 -36v34M11 -26v12M-10 -20v10" stroke="#2A7A36" stroke-width="1.2"/><circle cx="0.5" cy="-37" r="2.2" fill="#FFF2F6"/>'; },
    ichu: function () { return '<g class="a-ichu"><g stroke="#E9C46A" stroke-width="1.8" stroke-linecap="round" fill="none"><path d="M0 0q-6 -6 -9 -14M0 0q-2 -8 -3 -17M0 0q2 -9 3 -16M0 0q5 -6 9 -12"/></g><g stroke="#C89A3A" stroke-width="1.4" stroke-linecap="round"><path d="M0 0q-4 -4 -6 -10M0 0q3 -5 6 -9"/></g></g>'; },
    huaco: function () { return SOMBRA(11) +
      '<path d="M-11 -12a11 11 0 0 0 22 0q0 -9 -11 -11q-11 2 -11 11z" fill="#C8643A"/><path d="M-10.5 -14h21" stroke="#F4E3C3" stroke-width="5"/>' +
      '<path d="M-7 -14l3 -2l3 2l3 -2l3 2l3 -2" stroke="#7A2E14" stroke-width="1.3" fill="none"/>' +
      '<path d="M-6 -22q0 -10 6 -10t6 10" stroke="#C8643A" stroke-width="3.5" fill="none"/><rect x="-1.8" y="-40" width="3.6" height="9" rx="1.2" fill="#C8643A"/>' +
      '<path d="M-8 -8a9 9 0 0 0 6 6" stroke="#fff" stroke-width="2" opacity=".35" fill="none" stroke-linecap="round"/><path class="a-destello" d="M9 -26l1 3l3 1l-3 1l-1 3l-1 -3l-3 -1l3 -1z" fill="#fff"/>'; },
    clava: function () { return SOMBRA(13) +
      '<rect x="-4" y="-6" width="8" height="7" fill="#7E7A6E"/><path d="M-12 -8q0 -18 12 -20q12 2 12 20q-2 4 -12 4q-10 0 -12 -4z" fill="#A9A492"/>' +
      '<path d="M-12 -8q0 -18 12 -20q-6 6 -6 24q-4 0 -6 -4z" fill="#C4BFAE"/>' +
      '<circle cx="-5" cy="-18" r="3.2" fill="#fff"/><circle cx="5" cy="-18" r="3.2" fill="#fff"/><circle cx="-5" cy="-18" r="1.6" fill="#2A2A2A"/><circle cx="5" cy="-18" r="1.6" fill="#2A2A2A"/>' +
      '<path d="M-6 -10h12" stroke="#5A5648" stroke-width="2"/><path d="M-4 -10l1.5 4l1.5 -4M1 -10l1.5 4l1.5 -4" fill="#fff"/><path d="M-2 -15h4" stroke="#5A5648" stroke-width="1.6"/>'; },
    puerta: function () { return SOMBRA(18) +
      '<path d="M-18 0v-26h36v26h-11v-16h-14v16z" fill="#9A9488"/><path d="M-18 -26h36v-5h-36z" fill="#B6B0A2"/>' +
      '<path d="M-16 -21h32" stroke="#6E6A5E" stroke-width="1.4" stroke-dasharray="3 2"/><circle class="a-brilla" cx="0" cy="-23" r="3" fill="#FFD23F"/>' +
      '<path d="M-7 0v-16h14v16" fill="#3A3A44" opacity=".55"/>'; },
    chanchan: function () { return SOMBRA(20) +
      '<path d="M-20 0v-20l4 -3h32l4 3v20z" fill="#D9B27C"/><path d="M-20 -20h40" stroke="#B88E58" stroke-width="2"/>' +
      '<g stroke="#A97E48" stroke-width="1.4" fill="none"><path d="M-16 -5l4 -4l4 4l4 -4l4 4l4 -4l4 4l4 -4l4 4"/><path d="M-16 -12l4 -4l4 4l4 -4l4 4l4 -4l4 4l4 -4l4 4"/></g>'; },
    muroInca: function () { return SOMBRA(20) +
      '<path d="M-20 0v-22l2 -2h36l2 2v22h-14v-12l-2 -4h-6l-2 4v12z" fill="#8F8A7A"/>' +
      '<g stroke="#5E5A4C" stroke-width="1.3" fill="none" stroke-linejoin="round"><path d="M-20 -8l6 1l2 -6l-6 -2l-2 -7M-14 -7v7M-12 -13l7 1l1 -9M-4 -12l-1 -12M6 -12l1 -12M7 -12l6 -1l1 -8M13 -13l7 2M13 -13v13"/></g>' +
      '<path d="M-8 0v-12l2 -4h6l2 4v12" fill="#3A3A44" opacity=".6"/>'; },
    andenes: function () { return '<g><path d="M-26 0h52v-6h-46z" fill="#7A6A4A"/><path d="M-20 -6h46v-2h-44z" fill="#5CC846"/><path d="M-20 -8h44v-6h-38z" fill="#7A6A4A"/><path d="M-14 -14h38v-2h-36z" fill="#5CC846"/><path d="M-14 -16h36v-6h-30z" fill="#7A6A4A"/><path d="M-8 -22h30v-2h-28z" fill="#5CC846"/></g>'; },
    choza: function () { return SOMBRA(14) +
      '<path d="M-12 0v-10h24v10z" fill="#9A8A70"/><path d="M-16 -9l16 -14l16 14z" fill="#E0B44E"/><path d="M-16 -9l16 -14l-4 14z" fill="#C8902E"/><rect x="-3" y="-8" width="6" height="8" fill="#3A2A1A"/>'; },
    fogata: function () { return '<path d="M-8 0l16 -5M-8 -5l16 5" stroke="#6E4622" stroke-width="3" stroke-linecap="round"/><path class="llama-f" d="M0 -3q-7 -6 -2 -14q1 5 4 4q-1 -4 2 -8q5 8 1 18z" fill="#FF8A1E"/><path d="M0 -4q-3 -4 0 -8q1 3 2 3q2 3 -2 5z" fill="#FFE27A"/><circle class="a-humo" cx="1" cy="-20" r="3.5" fill="#D8D4E8"/><circle class="a-humo d2" cx="1" cy="-20" r="3" fill="#D8D4E8"/><circle class="a-chispa" cx="-2" cy="-16" r="1" fill="#FFE27A"/><circle class="a-chispa d2" cx="3" cy="-14" r="1" fill="#FFB23F"/>'; },
    iglesia: function () { return SOMBRA(20) +
      '<rect x="-14" y="-18" width="28" height="18" fill="#F4EEE2"/><path d="M-14 -18l14 -8l14 8z" fill="#C8643A"/>' +
      '<rect x="-22" y="-30" width="9" height="30" fill="#FFFFFF"/><rect x="13" y="-30" width="9" height="30" fill="#FFFFFF"/><path d="M-22 -30l4.5 -6l4.5 6zM13 -30l4.5 -6l4.5 6z" fill="#C8643A"/>' +
      '<rect x="-19.5" y="-26" width="4" height="5" rx="2" fill="#5A4630"/><rect x="15.5" y="-26" width="4" height="5" rx="2" fill="#5A4630"/><path class="a-campana" d="M-19 -25.5a1.6 1.6 0 0 1 3 0v3h-3z" fill="#E0B44E"/><path class="a-campana d2" d="M16 -25.5a1.6 1.6 0 0 1 3 0v3h-3z" fill="#E0B44E"/>' +
      '<path d="M-5 0v-8a5 5 0 0 1 10 0v8z" fill="#7A4A22"/><path d="M0 -26v-7M-2.5 -30.5h5" stroke="#C9A23A" stroke-width="1.6"/>'; },
    bandera: function () { return '<rect x="-1.5" y="-44" width="3" height="44" fill="#E8E2D2"/><circle cx="0" cy="-45" r="2.5" fill="#C9A23A"/>' +
      '<path class="ondea" d="M1.5 -42q8 -3 16 0t16 0v18q-8 3 -16 0t-16 0z" fill="#fff"/><path d="M1.5 -42q4 -1.5 10.6 -1v18q-6.6 -.5 -10.6 1z" fill="#D7263D"/><path d="M22.9 -42.4q5 1 10.6 .4v18q-5.6 .6 -10.6 -.4z" fill="#D7263D"/>'; },
    canon: function () { return SOMBRA(14) + '<path d="M-14 -8l24 -8l2 6l-24 8z" fill="#3A3A44"/><circle cx="12" cy="-13" r="3" fill="#2A2A30"/><circle class="a-tiro" cx="16" cy="-15" r="4" fill="#E8E4F0"/><circle cx="-4" cy="-3" r="6" fill="#7A4A22" stroke="#4A2C12" stroke-width="2"/><circle cx="-4" cy="-3" r="1.5" fill="#4A2C12"/>'; },
    cruz: function () { return SOMBRA(6) + '<rect x="-2" y="-30" width="4" height="30" fill="#7A4A22"/><rect x="-9" y="-24" width="18" height="4" fill="#7A4A22"/>'; },
    machu: function () { return '<path d="M-6 -40l12 -26l16 26z" fill="#3E8E4E"/><path d="M6 -66l3 7l-6 3z" fill="#2C6E3C"/><path d="M-40 -40l18 -18l14 18z" fill="#5FAF6A"/>' + P.andenes() +
      '<g transform="translate(-26 -2)"><rect x="-6" y="-8" width="12" height="8" fill="#B9AF97"/><path d="M-8 -8l8 -6l8 6z" fill="#E0B44E"/></g><g transform="translate(-14 -10)"><rect x="-5" y="-7" width="10" height="7" fill="#B9AF97"/><path d="M-7 -7l7 -5l7 5z" fill="#E0B44E"/></g>'; },
    chakana: function () { return '<path d="M-3 -18h6v4h4v4h4v6h-4v4h-4v4h-6v-4h-4v-4h-4v-6h4v-4h4z" fill="#C9A23A" transform="translate(0 0)"/><circle class="a-brilla" cx="0" cy="-7" r="2.4" fill="#FFE27A"/>'; }
  };
  // Qué lleva cada isla: [pieza, x, y, escala, voltear]
  var DECOS = {
    fogata: [['choza', 44, 60, 1], ['fogata', 176, 70, 1], ['ichu', 186, 84, 1], ['ichu', 30, 80, .9], ['llama', 160, 92, .7, 1]],
    clava: [['clava', 46, 62, 1.1], ['cactus', 176, 66, 1], ['ichu', 186, 86, 1], ['ichu', 34, 84, .9]],
    huaco: [['huaco', 46, 64, 1.1], ['cactus', 180, 64, .9], ['ichu', 30, 84, 1], ['huaco', 168, 90, .6]],
    puerta: [['puerta', 48, 60, 1.05], ['llama', 176, 74, .95, 1], ['ichu', 32, 84, 1]],
    chanchan: [['chanchan', 46, 60, 1], ['cactus', 182, 66, .8], ['ichu', 176, 88, 1], ['ichu', 30, 82, .9]],
    incas: [['muroInca', 46, 60, 1], ['llama', 178, 72, 1, 1], ['ichu', 30, 84, 1], ['chakana', 160, 92, .8]],
    andenes: [['andenes', 46, 62, 1], ['llama', 176, 72, .95, 1], ['muroInca', 172, 56, .6], ['ichu', 34, 86, 1]],
    conquista: [['canon', 46, 64, 1.1], ['cruz', 178, 64, 1], ['ichu', 34, 84, 1], ['ichu', 186, 84, .9]],
    virreinato: [['iglesia', 48, 60, 1], ['llama', 176, 74, .8, 1], ['ichu', 186, 88, .9]],
    emancipacion: [['bandera', 36, 64, 1], ['canon', 176, 70, .9, 1], ['ichu', 64, 84, .9], ['ichu', 186, 86, .9]],
    machu: [['machu', 60, 66, 1.05], ['llama', 182, 74, .9, 1], ['ichu', 186, 90, .9]]
  };
  function decorar(clave) { return (DECOS[clave] || []).map(function (d) { return G(d[1], d[2], d[3], d[4], P[d[0]]()); }).join(''); }
  var CORONA = '<path d="M-14 6l-3 -16l9 7l8 -12l8 12l9 -7l-3 16z" fill="#FFD23F" stroke="#7A4A00" stroke-width="2" stroke-linejoin="round"/><circle cx="0" cy="-2" r="2.6" fill="#D7263D"/>';

  function islaSVG (seed, est, num, jefe, tema) {
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
    if (tema && DECOS[tema]) {
      deco += arbol(lado ? 186 : 34, 48, .55) + roca(lado ? 30 : 190, 78, .7);
      deco += decorar(tema);
      deco += mata(84, 92) + mata(140, 90) + flor(72, 84, '#FF6FA8') + flor(148, 82, '#FFD23F') + flor(124, 94, '#FF6FA8');
    } else {
      deco += arbol(lado ? 36 : 182, 64, .95) + arbol(lado ? 58 : 162, 50, .7);
      deco += roca(lado ? 176 : 44, 74, 1) + roca(lado ? 160 : 60, 84, .7);
      deco += mata(84, 92) + mata(140, 90) + mata(lado ? 186 : 34, 80);
      deco += flor(72, 84, '#FF6FA8') + flor(148, 82, '#FFD23F') + flor(lado ? 150 : 70, 46, '#B88BFF') + flor(124, 94, '#FF6FA8');
    }
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
    var cont = jefe && est !== 'lock' ? '<g transform="translate(' + px + ' ' + (py + 2) + ') scale(1.05 .85)">' + CORONA + '</g>' : est === 'lock' ? '<g transform="translate(' + px + ' ' + (py - 2) + ') scale(1 .85)"><rect x="-9" y="-3" width="18" height="13" rx="3" fill="#4A525C"/><path d="M-5 -3v-4a5 5 0 0 1 10 0v4" stroke="#4A525C" stroke-width="3" fill="none"/></g>'
      : '<text x="' + px + '" y="' + (py + 9) + '" text-anchor="middle" transform="translate(0 ' + (py * .15) + ') scale(1 .85)" font-family="Lilita One" font-size="' + (jefe ? 22 : 28) + '" fill="' + (est === 'ya' ? '#1C2600' : jefe ? '#5A0A3A' : '#3A424C') + '" stroke="' + (est === 'ya' ? '#F8FFB0' : '#fff') + '" stroke-width="1" paint-order="stroke">' + num + '</text>';
    s += cont + '</svg>';
    return s;
  }

  var ESTRELLA = function (on) { return '<svg class="' + (on ? '' : 'off') + '" viewBox="0 0 100 100"><use href="#i-estrella3d"/></svg>'; };
  // Islas chicas de los niveles extra (manantial con cascada, lápida del cronista, portal del tiempo)
  function extraSVG(tipo) {
    var base = '<svg viewBox="0 0 120 130" class="exv"><defs><linearGradient id="exA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9BE8FF"/><stop offset="1" stop-color="#2FA8E0"/></linearGradient></defs>' +
      '<path d="M8 52q52 -10 104 0l-14 30l-20 22l-14 24l-12 -22l-22 -20z" fill="#7A4E26"/><path d="M8 52q52 -10 104 0l-6 10q-46 8 -92 0z" fill="#5A3618" opacity=".6"/>' +
      '<ellipse cx="60" cy="50" rx="54" ry="18" fill="#2A8A1E"/><ellipse cx="60" cy="46" rx="54" ry="17" fill="#5CC846"/><ellipse cx="54" cy="42" rx="40" ry="10" fill="#fff" opacity=".1"/>';
    if (tipo === 'manantial') return base +
      '<ellipse cx="62" cy="47" rx="28" ry="9" fill="#1E86BE"/><ellipse cx="62" cy="46" rx="25" ry="7.5" fill="url(#exA)"/><ellipse class="brilloA" cx="55" cy="44" rx="8" ry="2" fill="#fff" opacity=".7"/>' +
      '<path d="M38 44q-4 -10 2 -16q6 6 2 16z" fill="#8F8A7A"/><path d="M82 44q6 -12 -2 -18q-6 8 2 18z" fill="#8F8A7A"/>' +
      '<rect class="cascadaA" x="84" y="52" width="12" height="60" rx="5" fill="url(#exA)"/><path d="M84 54h12" stroke="#E8FBFF" stroke-width="3"/><ellipse cx="90" cy="112" rx="10" ry="3" fill="#E8FBFF" opacity=".8"/>' +
      '<path d="M20 44q-3 -8 1 -14M24 44q1 -8 4 -12" stroke="#E9C46A" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>';
    if (tipo === 'lapida') return base +
      '<path d="M44 48v-30a16 16 0 0 1 32 0v30z" fill="#A9A492"/><path d="M44 48v-30a16 16 0 0 1 16 -16v46z" fill="#C4BFAE"/>' +
      '<g stroke="#5E5A4C" stroke-width="2" stroke-linecap="round"><path d="M52 22h16M50 30h20M50 37h14"/></g><circle cx="60" cy="13" r="3" fill="#C9A23A"/>' +
      '<path d="M26 46q-3 -8 1 -14M90 46q3 -8 -1 -14" stroke="#E9C46A" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>';
    return base +
      '<path d="M36 48v-26a24 24 0 0 1 48 0v26h-9v-26a15 15 0 0 0 -30 0v26z" fill="#8F8A7A"/><path d="M36 48v-26a24 24 0 0 1 12 -20l3 8a15 15 0 0 0 -6 12v26z" fill="#B6B0A2"/>' +
      '<ellipse class="giroP" cx="60" cy="32" rx="14" ry="16" fill="#B35CFF" opacity=".85"/><path class="giroP" d="M60 22a10 10 0 1 1 -8 16" stroke="#F0D0FF" stroke-width="2.5" fill="none"/></svg>';
  }

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
    var IW = pc ? Math.max(190, Math.min(300, innerHeight * .36)) : Math.min(210, ancho * .54), PASO = IW * 1.42;
    var XS = [0, .2, -.02, -.22, 0, .2, 0, -.2, .02, .2, 0, -.2];
    var etapas = o.etapas || {}, netapas = Object.keys(etapas).length;
    var abajo = pc ? 120 : 250, H = (pc ? 250 : 280) + PASO * (n - 1) + netapas * 80 + abajo + IW * .45, y = H - abajo - IW * .2, pts = [], h = '';
    for (var i = 0; i < n; i++) {
      if (etapas[i] && i) { y -= 80; h += '<div class="nv-etapa" style="top:' + (y + IW * .66 + 34).toFixed(0) + 'px">' + etapas[i][0] + '<small>' + etapas[i][1] + '</small></div>'; }
      if (etapas[i] && !i) h += '<div class="nv-etapa" style="top:' + (y + IW * .62) + 'px">' + etapas[i][0] + '<small>' + etapas[i][1] + '</small></div>';
      var s = est[i], jefe = i === n - 1, iw = jefe ? IW * 1.3 : IW, x = ancho / 2 + XS[i % XS.length] * ancho;
      var cls = s.hecho ? 'ok' : i === ACT ? 'ya' : s.abierto ? 'ok' : 'lock';
      if (i === ACT && !s.hecho) cls = 'ya';
      pts.push([x, y, iw]);
      h += '<button type="button" class="ni ' + cls + (jefe ? ' jefe' : '') + (i === ACT && !s.hecho ? ' ahora' : '') + '" data-i="' + i + '" style="left:' + x.toFixed(0) + 'px;top:' + (y - iw * .3).toFixed(0) + 'px;width:' + iw.toFixed(0) + 'px;margin-left:' + (-iw / 2).toFixed(0) + 'px;--d:-' + (i * .9).toFixed(1) + 's" aria-label="' + (jefe ? 'Jefe' : 'Nivel ' + (i + 1)) + ': ' + N[i].n + '">' +
        (i === ACT && !s.hecho ? '<span class="haz"></span><span class="bur">¡JUEGA!</span>' : '') +
        (s.hecho ? '<span class="st">' + [1, 2, 3].map(function (k) { return ESTRELLA(k <= s.tres); }).join('') + '</span>' : '') +
        '<span class="cuerpo">' + islaSVG(i + 3, cls === 'ya' ? 'ya' : cls, i + 1, jefe, N[i].d) + '</span>' +
        (cls === 'lock' ? '' : '<span class="nm">' + N[i].n + '</span>') + (i % 3 === 1 ? '<i class="nb" style="--x:' + (i % 2 ? -20 : 30) + '%"></i>' : '') + '</button>';
      y -= PASO;
    }
    // Camino: piedritas flotantes entre isla e isla
    var lin = '';
    for (var k = 1; k < pts.length; k++) {
      var lo = pts[k - 1], up = pts[k], yTop = lo[1] - lo[2] * .42, yTip = up[1] - up[2] * .3 + up[2] * .93, on = est[k - 1].hecho;
      var mx = (lo[0] + up[0]) / 2 + (k % 2 ? 30 : -30);
      [.25, .5, .75].forEach(function (t, j) {
        var u = 1 - t, xx = u * u * lo[0] + 2 * u * t * mx + t * t * up[0], yy = u * u * yTop + 2 * u * t * ((yTop + yTip) / 2) + t * t * yTip;
        h += '<i class="pd' + (on ? ' on' : '') + '" style="left:' + xx.toFixed(0) + 'px;top:' + yy.toFixed(0) + 'px;--d:-' + ((k + j) * .6).toFixed(1) + 's"></i>';
      });
    }
    // Niveles extra: isla chica a un costado, unida a su isla por un puente colgante
    var ext = o.extras || [], estExt = ext.map(function (x) { return { abierto: !!(est[x.tras] && est[x.tras].hecho) }; });
    var EW = Math.round(IW * .58);
    ext.forEach(function (x, j) {
      var p = pts[x.tras]; if (!p) return;
      var izq = p[0] >= ancho / 2, ex = izq ? Math.max(EW / 2 + 4, p[0] - p[2] * .5 - EW * .62) : Math.min(ancho - EW / 2 - 4, p[0] + p[2] * .5 + EW * .62);
      var yPasto = p[1] - p[2] * .3 + p[2] * 66 / 210, top = yPasto - EW * 46 / 130 + 14;
      var x1 = p[0] + (izq ? -1 : 1) * p[2] * .4, y1 = yPasto + p[2] * .06, x2 = ex + (izq ? 1 : -1) * EW * .4, y2 = top + EW * .4;
      var cx = (x1 + x2) / 2, cy = Math.max(y1, y2) + 18, tablas = '';
      for (var q = 1; q < 9; q++) { var t = q / 9, u = 1 - t, bx = u * u * x1 + 2 * u * t * cx + t * t * x2, by = u * u * y1 + 2 * u * t * cy + t * t * y2; tablas += '<rect x="' + (bx - 3).toFixed(1) + '" y="' + (by - 2).toFixed(1) + '" width="6" height="7" rx="1" fill="#A0703C" stroke="#5A3A1A" stroke-width="1"/>'; }
      lin += '<g class="puente' + (estExt[j].abierto ? '' : ' off') + '"><path d="M' + x1.toFixed(0) + ' ' + (y1 - 8).toFixed(0) + 'Q' + cx.toFixed(0) + ' ' + (cy - 8).toFixed(0) + ' ' + x2.toFixed(0) + ' ' + (y2 - 8).toFixed(0) + '" stroke="#6E4622" stroke-width="2" fill="none"/><path d="M' + x1.toFixed(0) + ' ' + y1.toFixed(0) + 'Q' + cx.toFixed(0) + ' ' + cy.toFixed(0) + ' ' + x2.toFixed(0) + ' ' + y2.toFixed(0) + '" stroke="#6E4622" stroke-width="2.5" fill="none"/>' + tablas + '</g>';
      h += '<button type="button" class="nv-ext' + (estExt[j].abierto ? '' : ' lock') + '" data-x="' + j + '" style="left:' + ex.toFixed(0) + 'px;top:' + top.toFixed(0) + 'px;width:' + EW + 'px;margin-left:' + (-EW / 2) + 'px" aria-label="Nivel extra: ' + x.n + '">' + extraSVG(x.tipo) + '<em>' + (estExt[j].abierto ? x.n : 'Extra') + '</em></button>';
    });
    h = '<svg class="nv-lineas" width="' + ancho + '" height="' + H.toFixed(0) + '">' + lin + '</svg>' + h;
    capa.innerHTML = '<div class="nv-ruta" style="height:' + H.toFixed(0) + 'px;width:' + ancho + 'px">' + h + '</div>';
    capa.querySelectorAll('.ni').forEach(function (b) { b.onclick = function () { var i = +b.dataset.i; o.tocar(i, N[i], est[i]); }; });
    capa.querySelectorAll('.nv-ext').forEach(function (b) { b.onclick = function () { var j = +b.dataset.x; o.tocarExtra(ext[j], estExt[j]); }; });
    var foco = pts[Math.max(0, ACT)];
    requestAnimationFrame(function () { capa.scrollTop = foco[1] - innerHeight * (pc ? .5 : .55); });
    return { actual: ACT, estado: est, hechos: est.filter(function (s) { return s.hecho; }).length, total: n };
  }

  window.MCIslas = { abrir: abrir, isla: islaSVG, extra: extraSVG };
})();
