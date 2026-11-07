/* «Poder» de estudio: la estrella de 5 puntas (0 a 100 cada una).
   Los mismos ejes y fórmulas que «Tu poder» de perfil.html; aquí se usa para comparar
   con un amigo (amigos.html?id=…, datos de poder_amigo en supabase/79-poder-amigo.sql). */
(function () {
  var EJES = [
    ['constancia', 'Constancia', '#FF9600', 'Días que estudió este mes'],
    ['precision', 'Precisión', '#1CB0F6', 'Promedio de aciertos'],
    ['practica', 'Práctica', '#C6E000', 'Preguntas de esta semana frente a su meta'],
    ['simulacro', 'Simulacro', '#CE82FF', 'Mejor simulacro o examen'],
    ['cursos', 'Cursos', '#FF4B4B', 'Cursos que ya practicó']
  ];
  var ICO = {
    constancia: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12.3 1.8c.6 3.2 3.4 4.8 5.2 7.6 2.7 4.2.6 11.8-5.5 11.8S3.6 16.6 5.6 12c.8-1.9 2.3-3 3.2-4.4.3 1.6 1 2.6 2 3.2-.4-3.2.3-6.4 1.5-9z"/></svg>',
    precision: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>',
    practica: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
    simulacro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6v3H9z"/><path d="M7 4.5H5V21h14V4.5h-2"/><path d="m9 13 2 2 4-4"/></svg>',
    cursos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/></svg>'
  };
  var YO = '#C6E000', EL = '#FF6E84';

  function lim(v) { return Math.max(0, Math.min(100, Math.round(+v || 0))); }
  // Datos crudos (poder_datos) → 5 puntos de 0 a 100
  function valores(d, nCursos) {
    d = d || {};
    return {
      constancia: lim((+d.dias_mes || 0) / Math.max(1, +d.dia || 1) * 100),
      precision: lim(d.precision),
      practica: lim((+d.semana || 0) / ((+d.meta || 20) * 7) * 100),
      simulacro: lim(d.simulacro),
      cursos: lim((+d.cursos || 0) / Math.max(1, nCursos || 19) * 100)
    };
  }
  function total(v) { return Math.round(EJES.reduce(function (s, e) { return s + v[e[0]]; }, 0) / EJES.length); }
  function nivel(t) { return t >= 80 ? ['Élite', '#FFC800'] : t >= 60 ? ['Pro', '#C6E000'] : t >= 40 ? ['Competidor', '#1CB0F6'] : t >= 20 ? ['Aprendiz', '#CE82FF'] : ['Novato', '#A99FC8']; }

  // Estrella con las dos figuras: la del amigo (rosado) y la tuya encima (lima)
  function radarVS(vYo, vEl) {
    var C = 190, CY = 172, R = 138, n = EJES.length, id = 'pv' + Math.floor(Math.random() * 1e6);
    var pt = function (i, x) { var a = -Math.PI / 2 + i * 2 * Math.PI / n, rr = R * x / 100; return [C + rr * Math.cos(a), CY + rr * Math.sin(a)]; };
    var pts = function (f) { return EJES.map(function (e, i) { return pt(i, f(e)).map(function (z) { return z.toFixed(1); }).join(','); }).join(' '); };
    var g = '<defs><radialGradient id="' + id + 'y" r="60%"><stop offset="0" stop-color="' + YO + '" stop-opacity=".08"/><stop offset="1" stop-color="' + YO + '" stop-opacity=".38"/></radialGradient>' +
      '<radialGradient id="' + id + 'e" r="60%"><stop offset="0" stop-color="' + EL + '" stop-opacity=".1"/><stop offset="1" stop-color="' + EL + '" stop-opacity=".42"/></radialGradient></defs>';
    [100, 75, 50, 25].forEach(function (k, j) { g += '<polygon class="an' + (j % 2 ? ' par' : '') + '" points="' + pts(function () { return k; }) + '"/>'; });
    EJES.forEach(function (e, i) { var p = pt(i, 100); g += '<line class="ej" x1="' + C + '" y1="' + CY + '" x2="' + p[0].toFixed(1) + '" y2="' + p[1].toFixed(1) + '"/>'; });
    g += '<polygon class="el" fill="url(#' + id + 'e)" points="' + pts(function (e) { return Math.max(6, vEl[e[0]]); }) + '"/>';
    g += '<polygon class="yo" fill="url(#' + id + 'y)" points="' + pts(function (e) { return Math.max(6, vYo[e[0]]); }) + '"/>';
    EJES.forEach(function (e, i) {
      var a = pt(i, Math.max(6, vEl[e[0]])), b = pt(i, Math.max(6, vYo[e[0]]));
      g += '<circle class="pt" cx="' + a[0].toFixed(1) + '" cy="' + a[1].toFixed(1) + '" r="5.5" fill="' + EL + '"/><circle class="pt" cx="' + b[0].toFixed(1) + '" cy="' + b[1].toFixed(1) + '" r="5.5" fill="' + YO + '"/>';
    });
    EJES.forEach(function (e, i) {
      var p = pt(i, 116), anc = Math.abs(p[0] - C) < 8 ? 'middle' : p[0] > C ? 'start' : 'end', y = p[1] < CY - 40 ? p[1] - 26 : p[1] + 2;
      g += '<text class="nm" x="' + p[0].toFixed(1) + '" y="' + y.toFixed(1) + '" text-anchor="' + anc + '">' + e[1] + '</text>' +
           '<text class="vl" x="' + p[0].toFixed(1) + '" y="' + (y + 20).toFixed(1) + '" text-anchor="' + anc + '"><tspan fill="' + YO + '">' + vYo[e[0]] + '</tspan><tspan fill="#6F6690"> · </tspan><tspan fill="' + EL + '">' + vEl[e[0]] + '</tspan></text>';
    });
    return '<svg viewBox="-40 -12 460 360" role="img" aria-label="Poder de estudio: tú y tu amigo en 5 puntas">' + g + '</svg>';
  }

  window.MCPoder = { EJES: EJES, ICO: ICO, YO: YO, EL: EL, valores: valores, total: total, nivel: nivel, radarVS: radarVS };
})();
