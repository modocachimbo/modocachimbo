/* =========================================================
   Modo Cachimbo · Laboratorio · Plano cartesiano en SVG
   MCPlano(contenedor, {r: 10, alDibujar: fn(P)})
     P.X(x), P.Y(y)   → coordenadas del plano a píxeles
     P.ix(px), P.iy(py) → píxeles a coordenadas
     P.r               → cuántas unidades se ven del centro al borde (lado corto)
     P.cx, P.cy        → centro de la vista
     P.svg(html)       → pone el dibujo encima de la cuadrícula
     P.zoom(f), P.centrar(), P.redibujar()
   Se puede arrastrar para mover y pellizcar o usar la rueda para el zoom.
   ========================================================= */
(function () {
  function fmt(n) {
    var r = Math.round(n * 100) / 100;
    if (Object.is(r, -0)) r = 0;
    return String(r).replace('.', ',').replace('-', '−');
  }
  window.MCfmt = fmt;
  window.MCPlano = function (el, o) {
    o = o || {};
    var P = { r: o.r || 10, cx: o.cx || 0, cy: o.cy || 0, w: 0, h: 0, k: 1 }, capa = '';
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.appendChild(svg);
    P.X = function (x) { return P.w / 2 + (x - P.cx) * P.k; };
    P.Y = function (y) { return P.h / 2 - (y - P.cy) * P.k; };
    P.ix = function (px) { return (px - P.w / 2) / P.k + P.cx; };
    P.iy = function (py) { return -(py - P.h / 2) / P.k + P.cy; };
    function paso() { if (o.paso) return o.paso; var u = 1; [1, 2, 5, 10, 20, 50].some(function (s) { u = s; return s * P.k >= 34; }); return u; }
    function cuadricula() {
      var s = '', u = paso(), x0 = Math.ceil(P.ix(0) / u) * u, x1 = P.ix(P.w), y0 = Math.ceil(P.iy(P.h) / u) * u, y1 = P.iy(0), x, y;
      for (x = x0; x <= x1; x += u) s += '<line class="cuad' + (Math.round(x / u) % 5 === 0 ? ' m5' : '') + '" x1="' + P.X(x) + '" y1="0" x2="' + P.X(x) + '" y2="' + P.h + '"/>';
      for (y = y0; y <= y1; y += u) s += '<line class="cuad' + (Math.round(y / u) % 5 === 0 ? ' m5' : '') + '" x1="0" y1="' + P.Y(y) + '" x2="' + P.w + '" y2="' + P.Y(y) + '"/>';
      var ex = Math.min(P.h - 14, Math.max(14, P.Y(0))), ey = Math.min(P.w - 14, Math.max(14, P.X(0)));
      s += '<line class="eje" x1="0" y1="' + ex + '" x2="' + P.w + '" y2="' + ex + '"/><line class="eje" x1="' + ey + '" y1="0" x2="' + ey + '" y2="' + P.h + '"/>';
      if (o.numeros === false) return s;
      for (x = x0; x <= x1; x += u) if (Math.abs(x) > 1e-9) s += '<text class="num" x="' + P.X(x) + '" y="' + (ex + 14) + '" text-anchor="middle">' + fmt(x) + '</text>';
      for (y = y0; y <= y1; y += u) if (Math.abs(y) > 1e-9) s += '<text class="num" x="' + (ey - 5) + '" y="' + (P.Y(y) + 4) + '" text-anchor="end">' + fmt(y) + '</text>';
      s += '<text class="num" x="' + (ey - 5) + '" y="' + (ex + 14) + '" text-anchor="end">0</text>';
      s += '<text class="num" x="' + (P.w - 8) + '" y="' + (ex - 6) + '" text-anchor="end" style="font-size:13px;fill:#EEEAF7">x</text><text class="num" x="' + (ey + 8) + '" y="14" style="font-size:13px;fill:#EEEAF7">y</text>';
      return s;
    }
    P.redibujar = function () {
      var b = el.getBoundingClientRect(); P.w = b.width; P.h = b.height;
      P.k = Math.min(P.w, P.h) / (2 * P.r);
      svg.setAttribute('viewBox', '0 0 ' + P.w + ' ' + P.h);
      capa = o.alDibujar ? o.alDibujar(P) || '' : '';
      svg.innerHTML = cuadricula() + capa;
    };
    P.zoom = function (f) { P.r = Math.max(1.5, Math.min(60, P.r / f)); P.redibujar(); };
    P.centrar = function () { P.r = o.r || 10; P.cx = o.cx || 0; P.cy = o.cy || 0; P.redibujar(); };
    P.svg = svg;
    // Arrastrar y pellizcar
    var ptrs = {}, d0 = 0, r0 = 0, quieto = !!o.quieto;
    el.addEventListener('pointerdown', function (e) { if (quieto || (o.agarra && o.agarra(e, P))) return; ptrs[e.pointerId] = { x: e.clientX, y: e.clientY }; el.setPointerCapture(e.pointerId); var k = Object.keys(ptrs); if (k.length === 2) { var a = ptrs[k[0]], c = ptrs[k[1]]; d0 = Math.hypot(a.x - c.x, a.y - c.y); r0 = P.r; } });
    el.addEventListener('pointermove', function (e) {
      var p = ptrs[e.pointerId]; if (!p) return;
      var k = Object.keys(ptrs);
      if (k.length === 1) { P.cx -= (e.clientX - p.x) / P.k; P.cy += (e.clientY - p.y) / P.k; p.x = e.clientX; p.y = e.clientY; P.redibujar(); }
      else if (k.length === 2) { p.x = e.clientX; p.y = e.clientY; var a = ptrs[k[0]], c = ptrs[k[1]], d = Math.hypot(a.x - c.x, a.y - c.y); if (d0) { P.r = Math.max(1.5, Math.min(60, r0 * d0 / d)); P.redibujar(); } }
    });
    function soltar(e) { delete ptrs[e.pointerId]; }
    el.addEventListener('pointerup', soltar); el.addEventListener('pointercancel', soltar);
    el.addEventListener('wheel', function (e) { if (quieto) return; e.preventDefault(); P.zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
    if (window.ResizeObserver) new ResizeObserver(function () { P.redibujar(); }).observe(el); else addEventListener('resize', P.redibujar);
    P.redibujar();
    return P;
  };
  // Puerta de un simulador con precio: si no está abierto (energía o código), vuelve al Laboratorio con su ventana
  window.MCLabPuerta = function (sim) {
    var R = window.MCRayos; if (!R || R.puede(sim)) return;
    var h = document.documentElement; h.classList.add('lab-espera');
    R.estado().then(function (st) {
      if (st && !st.error && !R.puede(sim, st)) location.replace('laboratorio.html?abrir=' + encodeURIComponent(sim));
      else h.classList.remove('lab-espera');
    });
  };
  // Sonido + preferencia (assets/lab-sonido.js) y regreso al Laboratorio: lo común de cada simulador
  window.MCLabComun = function (sim) {
    try { localStorage.setItem('mc_lab_ultimo', sim); var v = JSON.parse(localStorage.getItem('mc_lab_vistos') || '{}'); v[sim] = Date.now(); localStorage.setItem('mc_lab_vistos', JSON.stringify(v)); } catch (e) {}
    var bs = document.getElementById('bSon'), SN = window.MCLabSonido;
    if (bs) { if (SN && !SN.activo()) bs.classList.add('off'); bs.onclick = function () { if (SN) bs.classList.toggle('off', !SN.alternar()); }; }
    return function (n) { if (SN) SN.tocar(n); };
  };
})();
