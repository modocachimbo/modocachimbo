/* =========================================================
   Modo Cachimbo · Cómo se ve el enunciado de una pregunta
   Lo usan las páginas de práctica y el panel. Entiende:
     [IMG:assets/img/…]       imagen en esa línea (centrada)
     [IMG-DER:assets/img/…]   imagen al lado de las alternativas
     | a | b | c |            tabla (si la 2.ª fila es |---|, la 1.ª es título)
     I. CaO || p) cal viva    columnas sin bordes (separadas por ||)
     **negrita**, *cursiva*, <u>subrayado</u>, $fórmulas$
     (también <i> <b> <em> <strong> <sub> <sup>)
     [TEXTO 03] … [/TEXTO]    lectura que comparten varias preguntas
                              (va al inicio; se ve en un recuadro plegable)
     [GRÁFICO: histograma] … [/GRÁFICO]   gráfico dibujado desde texto (ver Graf);
                              [GRÁFICO DERECHA: …] lo pone al lado de las alternativas
     [ETIQUETA: Sinónimos]    burbuja opcional arriba a la derecha que dice qué
                              tipo de pregunta es (va al final del texto)
   Fracciones: \frac dentro del texto se ve grande (como \dfrac); en
   exponentes y subíndices sigue pequeña. Para una pequeña: \tfrac.
   Preguntas de respuesta abierta (Seminarios y Banqueo):
     { text, abierta: true, respuestas: ['Karl Ritter', 'Ritter'], options: [], correct: 0 }
     El alumno escribe; cuadroAbierto() compara sin tildes ni mayúsculas.
     Acertar se guarda como la respuesta 0 (= correct), fallar como -1.
   En el panel, [IMAGEN] y [IMAGEN DERECHA] son las marcas que
   escribe el profesor; al publicar se cambian por [IMG:…].
   ========================================================= */
(function () {
  var script = document.currentScript;
  var RAIZ = script ? new URL('../', script.src).href : '/';
  var RUTA = /^assets\/img\/[\w\-./]+\.(webp|jpe?g|png|gif|svg)$/i;

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function formato(s) {
    var e = esc(s);
    // Etiquetas permitidas: <u> <i> <b> <em> <strong> <sub> <sup> (también una dentro de otra)
    for (var k = 0; k < 3; k++) e = e.replace(/&lt;(u|i|b|em|strong|sub|sup)&gt;([\s\S]*?)&lt;\/\1&gt;/gi, function (x, t, d) { t = t.toLowerCase(); return '<' + t + '>' + d + '</' + t + '>'; });
    e = e.replace(/\[\[(\d{1,2})\]\]/g, '<span class="mcq-hueco" data-n="$1"></span>'); // espacio para completar
    e = e.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    e = e.replace(/\*(.+?)\*/g, '<em>$1</em>');
    return ecuaciones(e);
  }
  // $$ A \qquad B $$ → cada fórmula en su bloque: lado a lado si caben, una debajo de otra si no
  function ecuaciones(e) {
    return e.replace(/\$\$([\s\S]+?)\$\$/g, function (todo, f) {
      var pre = '', cuerpo = f.trim();
      var m = cuerpo.match(/^\{\s*((?:\\(?:large|Large|LARGE|small|displaystyle|textstyle)\s*)+)([\s\S]*)\}$/);
      if (m) { pre = m[1]; cuerpo = m[2]; }
      var partes = [], nivel = 0, ini = 0, rx = /\\qquad(?![a-zA-Z])|[{}]/g, x;
      while ((x = rx.exec(cuerpo))) {
        if (x[0] === '{') nivel++;
        else if (x[0] === '}') nivel--;
        else if (!nivel) { partes.push(cuerpo.slice(ini, x.index)); ini = x.index + x[0].length; }
      }
      partes.push(cuerpo.slice(ini));
      partes = partes.map(function (p) { return p.trim(); }).filter(Boolean);
      if (partes.length < 2) return todo;
      return '<span class="mcq-ecs">' + partes.map(function (p) { return '<span>$$' + pre + p + '$$</span>'; }).join('') + '</span>';
    });
  }
  function img(ruta) {
    return '<img class="mc-img" src="' + esc(RAIZ + ruta) + '" alt="Figura de la pregunta" loading="lazy">';
  }

  var RX_IMG = /^\[IMG(-DER)?:\s*([^\]\s]+)\s*\]$/i;
  var RX_MARCA = /^\[IMAGEN(\s+DERECHA)?\]$/i;
  var RX_LEC = /^\[((?:TEXTO|LECTURA)[^\]]{0,20})\]$/i, RX_LEC_FIN = /^\[\/(?:TEXTO|LECTURA)\]$/i;
  var RX_ETQ = /^\[ETIQUETA\s*:\s*([^\]]{0,40})\]$/i;
  function esTabla(l) { return /^\|.*\|$/.test(l); }
  function esColumnas(l) { return !esTabla(l) && /\s\|\|\s/.test(l); }
  // "CORDERO : OVEJA" o "<u>ÁRBOL</u> : BOSQUE ::" (dos puntos con espacios a los lados, una sola vez)
  function esPar(l) {
    var t = String(l || '').replace(/<[^>]*>/g, '').trim();
    if (!t || /\$|\||\[/.test(t) || t.length > 70) return false;
    return /^[^:]{1,32}\s:\s[^:]{1,32}?(\s*::)?$/.test(t);
  }
  function partirPar(l) {
    var m = String(l).trim().match(/^([\s\S]+?)\s+:\s+([\s\S]+?)(\s*::)?$/);
    return m ? [m[1].trim(), m[2].trim(), !!m[3]] : [l, '', false];
  }
  function celdas(l) { return l.replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); }); }
  // Celda de intervalo "[ 6 - >", "[20 - 40>", "<0; +∞]": se dibuja en casillas fijas
  // (corchete · número · guion · número · corchete) para que los espacios vacíos se vean
  // y todas las filas queden alineadas, como en el original.
  var RX_INTERVALO = /^([\[\]<(])\s*(-?[^\s;\-–\[\]<>()]*)\s*[-–;]\s*(-?[^\s;\-–\[\]<>()]*)\s*([\]>)\[])$/;
  function celda(c) {
    var m = c.indexOf('$') < 0 && c.match(RX_INTERVALO);
    if (!m) return formato(c);
    var sep = /;/.test(c) ? ';' : '-';
    return '<span class="mcq-int"><span>' + esc(m[1]) + '</span><span class="mcq-int-n">' + formato(m[2]) + '</span><span>' + sep +
      '</span><span class="mcq-int-n">' + formato(m[3]) + '</span><span>' + esc(m[4]) + '</span></span>';
  }

  /* ---------- Gráficos escritos como texto ----------
     [GRÁFICO: tipo] … [/GRÁFICO]  (o [GRÁFICO DERECHA: tipo] al lado de las alternativas)
     Tipos: histograma, polígono, línea (ojiva), barras, barras horizontales,
     barras agrupadas, barras apiladas, circular, circular 3d, dona, caja,
     dispersión, pictograma, tallo y hojas.
     Listas separadas por coma y espacio (o por ;). "3k=60" se lee 3k y se dibuja en 60.
     Los colores salen de variables CSS (--g-…): oscuro, claro y PDF. */
  var RX_GRAF = /^\[GR[AÁ]FICO(\s+DERECHA)?\s*:\s*([^\]]+)\]$/i, RX_GRAF_FIN = /^\[\/GR[AÁ]FICO\]$/i;
  var Graf = (function () {
    var TIPOS_TXT = 'histograma, polígono, línea, barras, barras horizontales, barras agrupadas, barras apiladas, circular, circular 3d, dona, caja, dispersión, pictograma, tallo y hojas, función, recta numérica, venn, triángulo, vectores, orbitales';
    var uid = 0;
    function r1(v) { return Math.round(v * 10) / 10; }
    function sinTilde(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim(); }
    function lista(s) {
      s = String(s == null ? '' : s).trim(); if (!s) return [];
      var p = /;/.test(s) ? s.split(';') : s.split(/,\s+/);
      if (p.length === 1 && (s.match(/,/g) || []).length > 1) p = s.split(',');
      return p.map(function (x) { return x.trim(); }).filter(Boolean);
    }
    function num(s) { return parseFloat(String(s).replace(/\s/g, '').replace(',', '.')); }
    // "40" → 40 · "3k=60" → se lee 3k, mide 60 · "7a" → 7 · "a" → 1
    function valor(s) {
      s = String(s).trim();
      var m = s.match(/^(.*?)\s*=\s*(-?\d+(?:[.,]\d+)?)\s*[%°]?$/);
      if (m) return { et: m[1].trim() || m[2], v: num(m[2]) };
      var n = num(s);
      if (isNaN(n)) { var c = s.match(/^(\d+(?:[.,]\d+)?)?\s*[a-zA-Z]$/); if (c) n = c[1] ? num(c[1]) : 1; }
      return { et: s, v: n };
    }
    function e(s) { // texto del SVG: f_i → subíndice, u^2 → exponente
      return esc(s).replace(/_\{?([\w%]+)\}?/g, '<tspan dy="3" font-size=".75em">$1</tspan><tspan dy="-3"></tspan>')
        .replace(/\^\{?([\w%]+)\}?/g, '<tspan dy="-5" font-size=".72em">$1</tspan><tspan dy="5"></tspan>');
    }
    function T(x, y, s, o) {
      o = o || {};
      return '<text x="' + r1(x) + '" y="' + r1(y) + '" style="fill:' + (o.c || 'var(--g-tx)') + (o.halo ? ';paint-order:stroke;stroke:var(--g-fondo);stroke-width:4px;stroke-linejoin:round' : '') + '" font-size="' + (o.f || 12) + '" font-weight="' + (o.w || 700) + '" text-anchor="' + (o.a || 'middle') + '"' + (o.i ? ' font-style="italic"' : '') + '>' + e(s) + '</text>';
    }
    function L(x1, y1, x2, y2, c, guia, w) {
      return '<line x1="' + r1(x1) + '" y1="' + r1(y1) + '" x2="' + r1(x2) + '" y2="' + r1(y2) + '" style="stroke:' + c + '" stroke-width="' + (w || 1.5) + '"' + (guia ? ' stroke-dasharray="4 3"' : '') + '/>';
    }
    function R(x, y, w, h, rell, borde, extra) {
      if (w < 0) { x += w; w = -w; } if (h < 0) { y += h; h = -h; }
      return '<rect x="' + r1(x) + '" y="' + r1(y) + '" width="' + r1(w) + '" height="' + r1(h) + '" style="fill:' + rell + ';stroke:' + (borde || 'var(--g-b)') + '" stroke-width="1.8"' + (extra || '') + '/>';
    }
    function C(i) { return 'var(--g' + (i % 6 + 1) + ')'; }
    function svg(W, H, cuerpo) {
      return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="max-width:' + Math.round(W * 1.45) + 'px" role="img" aria-label="Gráfico">' + cuerpo + '</svg>';
    }
    function flecha(x, y, dir) {
      return '<path d="' + (dir === 'x' ? 'M' + x + ' ' + (y - 4) + 'L' + (x + 7) + ' ' + y + 'L' + x + ' ' + (y + 4) : 'M' + (x - 4) + ' ' + y + 'L' + x + ' ' + (y - 7) + 'L' + (x + 4) + ' ' + y) + 'z" style="fill:var(--g-eje)"/>';
    }
    function ejes(o, x0, y0, x1, y1) {
      return L(x0, y0, x1 + 6, y0, 'var(--g-eje)') + flecha(x1 + 6, y0, 'x') + L(x0, y0, x0, y1 - 6, 'var(--g-eje)') + flecha(x0, y1 - 6, 'y') +
        (o['eje y'] ? T(x0 + 7, y1 - 6, o['eje y'], { a: 'start', i: 1, c: 'var(--g-b2)', w: 800 }) : '') +
        (o['eje x'] ? T(x1 + 13, y0 + 30, o['eje x'], { a: 'end', i: 1, c: 'var(--g-b2)', w: 800 }) : '');
    }
    // Etiquetas del eje vertical sin encimarse (se separan al menos 12 px)
    function etiquetasY(arr, x0) {
      var vistas = {}, out = '';
      arr = arr.filter(function (a) { if (vistas[a.t]) return false; vistas[a.t] = 1; return true; }).sort(function (a, b) { return b.y - a.y; });
      for (var k = 1; k < arr.length; k++) if (arr[k - 1].y - arr[k].y < 12) arr[k].y = arr[k - 1].y - 12;
      arr.forEach(function (a) { out += T(x0 - 6, a.y + 4, a.t, { a: 'end' }); });
      return out;
    }
    function leyenda(nombres, W, y, tipo) {
      if (nombres.length < 2) return '';
      var anchos = nombres.map(function (n) { return 22 + String(n).length * 6.6; }), tot = anchos.reduce(function (a, b) { return a + b; }, 0), x = (W - tot) / 2, out = '';
      nombres.forEach(function (n, i) {
        out += (tipo === 'linea' ? L(x, y - 4, x + 14, y - 4, C(i), 0, 2.5) : R(x, y - 10, 12, 12, 'var(--g' + (i % 6 + 1) + 'f)', C(i))) + T(x + 18, y, n, { a: 'start', f: 11 });
        x += anchos[i];
      });
      return out;
    }
    function escala(max) { // marcas "redondas" del eje para gráficos sin guías
      if (!(max > 0)) max = 1;
      var p = Math.pow(10, Math.floor(Math.log10(max / 4))), paso = [1, 2, 2.5, 5, 10].map(function (k) { return k * p; }).filter(function (s) { return max / s <= 6; })[0] || p * 10;
      var r = []; for (var v = 0; v <= max + 1e-9; v += paso) r.push(r1(v * 100) / 100);
      if (r[r.length - 1] < max) r.push(r1((r[r.length - 1] + paso) * 100) / 100);
      return r;
    }
    function fmt(v) { return String(Math.round(v * 100) / 100).replace('.', ','); }

    // ---- histograma y polígono ----
    function histograma(o, pares, err, soloPoligono) {
      var xs = lista(o.x), hs = lista(o.alturas || o.y).map(valor), somb = lista(o.sombrear).map(num), n = hs.length;
      if (!n) return err('Falta la línea alturas: (por ejemplo alturas: 10, 20, 15)');
      if (xs.length !== n + 1 && xs.length !== n) return err('En x: van ' + (n + 1) + ' límites (o ' + n + ' marcas de clase) para ' + n + ' alturas');
      var mal = hs.filter(function (h) { return isNaN(h.v); })[0];
      if (mal) return err('No sé qué tan alta dibujar «' + mal.et + '»: escribe por ejemplo ' + mal.et + '=20');
      var pol = soloPoligono || /^s[ií]/i.test(o['polígono'] || o.poligono || '');
      var W = 320, H = 222, x0 = 40, y0 = 180, x1 = W - 20, y1 = 26;
      var lim = xs.length === n + 1, nums = xs.map(num), numerico = lim && nums.every(function (v) { return !isNaN(v); });
      var bordes = []; for (var i = 0; i <= n; i++) bordes.push(numerico ? nums[i] : i);
      var w0 = bordes[1] - bordes[0], wn = bordes[n] - bordes[n - 1];
      var lo = bordes[0] - (pol ? w0 / 2 : 0), hi = bordes[n] + (pol ? wn / 2 : 0);
      var X = function (v) { return x0 + 10 + (v - lo) / (hi - lo) * (x1 - x0 - 16); };
      var max = Math.max.apply(null, hs.map(function (h) { return h.v; })) * 1.12 || 1;
      var Y = function (v) { return y0 - v / max * (y0 - y1); };
      var out = '', guias = '', ys = [];
      hs.forEach(function (h, i) {
        var a = X(bordes[i]), b = X(bordes[i + 1]), y = Y(h.v);
        guias += L(x0, y, pol && soloPoligono ? (a + b) / 2 : a, y, 'var(--g-gu)', 1, 1);
        ys.push({ y: y, t: h.et });
        if (!soloPoligono) out += R(a, y, b - a, y0 - y, somb.indexOf(i + 1) >= 0 ? 'var(--g-somb)' : 'var(--g-rell)');
      });
      if (lim) xs.forEach(function (lx, i) { out += T(X(bordes[i]), y0 + 15, lx, { f: 11 }); });
      else xs.forEach(function (lx, i) { out += T((X(bordes[i]) + X(bordes[i + 1])) / 2, y0 + 15, lx, { f: 11 }); });
      if (pol) {
        var p = [[X(lo), Y(0)]];
        hs.forEach(function (h, i) { p.push([(X(bordes[i]) + X(bordes[i + 1])) / 2, Y(h.v)]); });
        p.push([X(hi), Y(0)]);
        out += '<polyline points="' + p.map(function (q) { return r1(q[0]) + ',' + r1(q[1]); }).join(' ') + '" style="fill:none;stroke:var(--g-lin)" stroke-width="2.2"/>';
        p.forEach(function (q) { out += '<circle cx="' + r1(q[0]) + '" cy="' + r1(q[1]) + '" r="3" style="fill:var(--g-lin)"/>'; });
      }
      return svg(W, H, ejes(o, x0, y0, x1, y1) + out + guias + etiquetasY(ys, x0));
    }

    // ---- línea / ojiva (una o varias series) ----
    function linea(o, pares, err) {
      var xs = lista(o.x), series = [];
      if (o.y) series.push({ n: '', v: lista(o.y).map(valor) });
      pares.forEach(function (p) { series.push({ n: p[0], v: lista(p[1]).map(valor) }); });
      if (!xs.length || !series.length) return err('Faltan las líneas x: y y: (por ejemplo x: 10, 20, 30 · y: 5, 12, 20)');
      for (var s = 0; s < series.length; s++) {
        if (series[s].v.length !== xs.length) return err('x tiene ' + xs.length + ' valores y ' + (series[s].n || 'y') + ' tiene ' + series[s].v.length);
        var mal = series[s].v.filter(function (h) { return isNaN(h.v); })[0];
        if (mal) return err('No sé a qué altura va «' + mal.et + '»: escribe por ejemplo ' + mal.et + '=20');
      }
      var varias = series.length > 1, W = 320, H = 222, x0 = 40, y0 = 180, x1 = W - 22, y1 = varias ? 40 : 26;
      var nums = xs.map(num), numerico = nums.every(function (v) { return !isNaN(v); });
      var pos = numerico ? nums : xs.map(function (x, i) { return i; }), mn = Math.min.apply(null, pos), mx = Math.max.apply(null, pos);
      var X = function (v) { return x0 + 14 + (mx > mn ? (v - mn) / (mx - mn) : .5) * (x1 - x0 - 28); };
      var todos = []; series.forEach(function (sr) { sr.v.forEach(function (h) { todos.push(h.v); }); });
      var my = Math.max.apply(null, todos) * 1.1 || 1, marcas = varias ? escala(Math.max.apply(null, todos)) : null;
      if (marcas) my = marcas[marcas.length - 1];
      var Y = function (v) { return y0 - v / my * (y0 - y1); };
      var out = '', ys = [];
      pos.forEach(function (v) { out += L(X(v), y0, X(v), y1, 'var(--g-red)', 0, 1); });
      if (marcas) marcas.forEach(function (v) { if (v) { out += L(x0, Y(v), x1, Y(v), 'var(--g-red)', 0, 1); ys.push({ y: Y(v), t: fmt(v) }); } });
      else series[0].v.forEach(function (h, i) { if (h.v) { out += L(x0, Y(h.v), X(pos[i]), Y(h.v), 'var(--g-gu)', 1, 1) + L(X(pos[i]), Y(h.v), X(pos[i]), y0, 'var(--g-gu)', 1, 1); ys.push({ y: Y(h.v), t: h.et }); } });
      out += ejes(o, x0, y0, x1, y1);
      xs.forEach(function (lx, i) { out += T(X(pos[i]), y0 + 15, lx, { f: 11 }); });
      series.forEach(function (sr, k) {
        var col = varias ? C(k) : 'var(--g-b)';
        out += '<polyline points="' + sr.v.map(function (h, i) { return r1(X(pos[i])) + ',' + r1(Y(h.v)); }).join(' ') + '" style="fill:none;stroke:' + col + '" stroke-width="2.4"/>';
        sr.v.forEach(function (h, i) { out += '<circle cx="' + r1(X(pos[i])) + '" cy="' + r1(Y(h.v)) + '" r="3.2" style="fill:' + col + '"/>'; });
      });
      return svg(W, H, out + etiquetasY(ys, x0) + (varias ? leyenda(series.map(function (s) { return s.n; }), W, 14, 'linea') : ''));
    }

    // ---- barras: simples, horizontales, agrupadas, apiladas ----
    function barras(o, pares, err, modo, horizontal) {
      if (!pares.length) return err('Escribe una línea por barra, por ejemplo Lunes: 20');
      var series = lista(o.series), filas = pares.map(function (p) { return { n: p[0], v: lista(p[1]).map(valor) }; });
      var k = Math.max.apply(null, filas.map(function (f) { return f.v.length; }));
      if (modo === 'simple' && k > 1) modo = 'agrupadas';
      for (var i = 0; i < filas.length; i++) {
        var mal = filas[i].v.filter(function (h) { return isNaN(h.v); })[0];
        if (mal) return err('No sé qué tan larga dibujar «' + mal.et + '» (' + filas[i].n + '): escribe por ejemplo ' + mal.et + '=20');
      }
      var apil = modo === 'apiladas', leyN = series.length ? series : (k > 1 ? filas[0].v.map(function (x, j) { return 'Serie ' + (j + 1); }) : []);
      var tot = filas.map(function (f) { return f.v.reduce(function (a, h) { return a + h.v; }, 0); });
      var max = apil ? Math.max.apply(null, tot) : Math.max.apply(null, filas.map(function (f) { return Math.max.apply(null, f.v.map(function (h) { return h.v; })); }));
      var cien = apil && tot.every(function (t) { return Math.abs(t - 100) < .5; });
      var W = 320, conLey = leyN.length > 1, out = '', ys = [];
      if (!horizontal) {
        var H = 222, x0 = 40, y0 = 178, x1 = W - 16, y1 = conLey ? 44 : 28;
        var top = cien ? 100 : max * (apil ? 1.08 : 1.15) || 1, Y = function (v) { return y0 - v / top * (y0 - y1); };
        var paso = (x1 - x0) / filas.length, bw = paso * (modo === 'agrupadas' ? 0.78 : 0.52);
        filas.forEach(function (f, i) {
          var cx = x0 + i * paso + paso / 2, acc = 0;
          f.v.forEach(function (h, j) {
            if (apil) {
              var ya = Y(acc), yb = Y(acc + h.v);
              out += R(cx - bw / 2, yb, bw, ya - yb, k > 1 ? 'var(--g' + (j % 6 + 1) + 'f)' : 'var(--g-rell)', k > 1 ? C(j) : null);
              if (ya - yb > 13) out += T(cx, (ya + yb) / 2 + 4, h.et + (cien && !/%/.test(h.et) ? '%' : ''), { f: 10.5, w: 900 });
              acc += h.v;
            } else {
              var w = modo === 'agrupadas' ? bw / f.v.length : bw, x = cx - bw / 2 + j * w, y = Y(h.v);
              out += R(x, y, w, y0 - y, k > 1 ? 'var(--g' + (j % 6 + 1) + 'f)' : 'var(--g-rell)', k > 1 ? C(j) : null, ' rx="2"');
              if (k > 1) out += T(x + w / 2, y - 4, h.et, { f: 10 });
              else { out = L(x0, y, x, y, 'var(--g-gu)', 1, 1) + out; ys.push({ y: y, t: h.et }); }
            }
          });
          out += T(cx, y0 + 16, f.n, { i: 1, f: filas.length > 5 ? 10 : 12 });
        });
        if (cien) ys.push({ y: Y(100), t: '100%' });
        return svg(W, H, ejes(o, x0, y0, x1, y1) + out + etiquetasY(ys, x0) + (conLey ? leyenda(leyN, W, 14) : ''));
      }
      var largo = Math.max.apply(null, filas.map(function (f) { return String(f.n).length; }));
      var hx0 = Math.min(110, 14 + largo * 6.6), alto = (modo === 'agrupadas' ? 16 * k + 12 : 30), Hh = (conLey ? 30 : 12) + filas.length * alto + 34;
      var bx1 = W - 34, by0 = Hh - 22, by1 = conLey ? 28 : 10, topH = cien ? 100 : max * (apil ? 1.02 : 1.1) || 1;
      var X = function (v) { return hx0 + v / topH * (bx1 - hx0); };
      filas.forEach(function (f, i) {
        var cy = by1 + i * alto + alto / 2, bh = modo === 'agrupadas' ? 14 * k : 18, acc = 0;
        out += T(hx0 - 7, cy + 4, f.n, { a: 'end', i: 1, f: 11.5 });
        f.v.forEach(function (h, j) {
          if (apil) {
            var xa = X(acc), xb = X(acc + h.v);
            out += R(xa, cy - bh / 2, xb - xa, bh, k > 1 ? 'var(--g' + (j % 6 + 1) + 'f)' : 'var(--g-rell)', k > 1 ? C(j) : null);
            if (xb - xa > 24) out += T((xa + xb) / 2, cy + 4, h.et + (cien && !/%/.test(h.et) ? '%' : ''), { f: 10.5, w: 900 });
            acc += h.v;
          } else {
            var hh = modo === 'agrupadas' ? 14 : bh, y = cy - bh / 2 + j * hh;
            out += R(hx0, y, X(h.v) - hx0, hh, k > 1 ? 'var(--g' + (j % 6 + 1) + 'f)' : 'var(--g-rell)', k > 1 ? C(j) : null, ' rx="2"') + T(X(h.v) + 5, y + hh / 2 + 4, h.et, { a: 'start', f: 10.5 });
          }
        });
      });
      out += L(hx0, by0, bx1 + 8, by0, 'var(--g-eje)') + flecha(bx1 + 8, by0, 'x') + L(hx0, by0, hx0, by1 - 4, 'var(--g-eje)');
      if (o['eje x']) out += T(bx1 + 14, by0 + 16, o['eje x'], { a: 'end', i: 1, c: 'var(--g-b2)', w: 800 });
      return svg(W, Hh, out + (conLey ? leyenda(leyN, W, 14) : ''));
    }

    // ---- circular, circular 3d y dona ----
    function circular(o, pares, err, estilo) {
      if (!pares.length) return err('Escribe una línea por sector, por ejemplo A: 120°');
      var resto = -1, usado = 0, plano = 0, sumaPlano = 0, ds = [];
      pares.forEach(function (p, i) {
        var s = p[1].trim(), m = s.match(/^(.*?)\s*=\s*(.+)$/), et = m ? m[1].trim() : s, v = m ? m[2].trim() : s;
        if (/^resto$/i.test(v)) { resto = i; ds.push({ et: m ? et : '', g: 0 }); return; }
        var n = num(v);
        if (isNaN(n)) { ds.push({ et: et, g: NaN }); return; }
        if (/%/.test(v)) ds.push({ et: et, g: n * 3.6 }); else if (/°|º/.test(v)) ds.push({ et: et, g: n }); else { ds.push({ et: et, g: n, plano: 1 }); plano++; sumaPlano += n; }
      });
      var mal = ds.filter(function (d) { return isNaN(d.g); })[0];
      if (mal) return err('No sé de qué tamaño dibujar «' + mal.et + '»: escribe por ejemplo ' + mal.et + '=60°');
      if (plano && plano === ds.length - (resto >= 0 ? 1 : 0) && resto < 0) ds.forEach(function (d) { d.g = d.g / sumaPlano * 360; });
      else if (plano) return err('Usa la misma unidad en todos: grados (60°), porcentajes (25%) o cantidades (12)');
      ds.forEach(function (d, i) { if (i !== resto) usado += d.g; });
      if (resto >= 0) ds[resto].g = Math.max(0, 360 - usado);
      var total = ds.reduce(function (a, d) { return a + d.g; }, 0);
      if (total > 361) return err('Los sectores suman ' + Math.round(total) + '°: no pueden pasar de 360°');
      var d3 = estilo === '3d', dona = estilo === 'dona', dest = sinTilde(o.destacar || o.separar || '');
      var W = 420, cx = 210, r = d3 ? 96 : 74, ry = d3 ? 50 : r, prof = d3 ? 20 : 0, cy = d3 ? 86 : 104, H = d3 ? 196 : 208;
      var rad = Math.PI / 180, a = -90, tapas = '', lados = '', etq = '';
      function P(ang, rr, ox, oy, z) { return [cx + ox + rr * Math.cos(ang * rad), cy + oy + rr * (d3 ? ry / r : 1) * Math.sin(ang * rad) + (z || 0)]; }
      function pt(q) { return r1(q[0]) + ' ' + r1(q[1]); }
      pares.forEach(function (p, i) {
        var g = ds[i].g, a1 = a, a2 = a + g, m = a + g / 2; a = a2;
        if (g <= 0) return;
        var sep = dest && sinTilde(p[0]) === dest ? 12 : 0, ox = sep * Math.cos(m * rad), oy = sep * Math.sin(m * rad) * (d3 ? ry / r : 1);
        var col = C(i), fil = 'var(--g' + (i % 6 + 1) + 'f)', grande = g > 180 ? 1 : 0, rx = r, rY = d3 ? ry : r;
        if (g >= 359.9) a2 = a1 + 359.9;
        if (d3) {
          var s = Math.max(a1, 0), f = Math.min(a2, 180), s2 = Math.max(a1, 360), f2 = Math.min(a2, 540);
          [[s, f], [s2, f2]].forEach(function (q) {
            if (q[0] >= q[1]) return;
            lados += '<path d="M' + pt(P(q[0], r, ox, oy)) + 'A' + rx + ' ' + rY + ' 0 0 1 ' + pt(P(q[1], r, ox, oy)) + 'L' + pt(P(q[1], r, ox, oy, prof)) + 'A' + rx + ' ' + rY + ' 0 0 0 ' + pt(P(q[0], r, ox, oy, prof)) + 'z" style="fill:' + col + ';stroke:' + col + '" fill-opacity=".55" stroke-width="1.2"/>';
          });
        }
        var ri = dona ? r * 0.55 : 0;
        tapas += '<path d="M' + (ri ? pt(P(a1, ri, ox, oy)) : pt([cx + ox, cy + oy])) + 'L' + pt(P(a1, r, ox, oy)) + 'A' + rx + ' ' + rY + ' 0 ' + grande + ' 1 ' + pt(P(a2, r, ox, oy)) +
          (ri ? 'L' + pt(P(a2, ri, ox, oy)) + 'A' + ri + ' ' + ri + ' 0 ' + grande + ' 0 ' + pt(P(a1, ri, ox, oy)) : '') + 'z" style="fill:' + fil + ';stroke:' + col + '" stroke-width="2"/>';
        var cs = Math.cos(m * rad), sn = Math.sin(m * rad), baja = d3 && sn > 0 ? prof : 0;
        var e1 = P(m, r * 0.94, ox, oy, baja), e2 = P(m, r + 12, ox, oy, baja), e3 = P(m, r + 16, ox, oy, baja);
        etq += L(e1[0], e1[1], e2[0], e2[1], col, 0, 1.2) + T(e3[0], e3[1] + 4 + (sn > .3 ? 6 : 0), p[0], { f: 13, w: 900, a: Math.abs(cs) < .25 ? 'middle' : cs > 0 ? 'start' : 'end' });
        if (ds[i].et) { var c = P(m, dona ? r * 0.78 : r * 0.6, ox, oy); etq += T(c[0], c[1] + 4, ds[i].et, { f: g < 30 ? 9.5 : 12, w: 900, c: 'var(--g-tx2)' }); }
      });
      var centro = dona && o.centro ? T(cx, cy + 5, o.centro, { f: 13, w: 900 }) : '';
      return svg(W, H, lados + tapas + etq + centro);
    }

    // ---- diagrama de caja ----
    function caja(o, pares, err) {
      var v = lista(o.valores || o.datos).map(valor);
      if (!v.length) {
        var claves = [['min', 'minimo'], ['q1'], ['mediana', 'me', 'q2'], ['q3'], ['max', 'maximo']];
        var mapa = {}; pares.forEach(function (p) { mapa[sinTilde(p[0])] = p[1]; });
        v = claves.map(function (ks) { for (var j = 0; j < ks.length; j++) if (mapa[ks[j]] != null) return valor(mapa[ks[j]]); return null; });
        if (v.some(function (x) { return !x; })) return err('Escribe mín, Q1, mediana, Q3 y máx (o valores: 10, 20, 25, 30, 40)');
      }
      if (v.length !== 5) return err('Van 5 valores: mínimo, Q1, mediana, Q3 y máximo');
      if (v.some(function (x) { return isNaN(x.v); })) return err('Escribe números (o letra=número, por ejemplo a=20)');
      var W = 320, H = 130, x0 = 28, x1 = W - 28, mn = v[0].v, mx = v[4].v, pad = (mx - mn) * .06 || 1;
      var X = function (z) { return x0 + (z - mn + pad) / (mx - mn + 2 * pad) * (x1 - x0); }, cy = 52, out = '';
      out += L(X(mn), cy, X(v[1].v), cy, 'var(--g-b)', 0, 2) + L(X(v[3].v), cy, X(mx), cy, 'var(--g-b)', 0, 2);
      out += L(X(mn), cy - 12, X(mn), cy + 12, 'var(--g-b)', 0, 2) + L(X(mx), cy - 12, X(mx), cy + 12, 'var(--g-b)', 0, 2);
      out += R(X(v[1].v), cy - 22, X(v[3].v) - X(v[1].v), 44, 'var(--g-rell)') + L(X(v[2].v), cy - 22, X(v[2].v), cy + 22, 'var(--g-b)', 0, 3);
      var y0 = 100; out += L(x0 - 6, y0, x1 + 6, y0, 'var(--g-eje)') + flecha(x1 + 6, y0, 'x');
      v.forEach(function (z) { out += L(X(z.v), cy + 24, X(z.v), y0, 'var(--g-gu)', 1, 1) + L(X(z.v), y0 - 3, X(z.v), y0 + 3, 'var(--g-eje)') + T(X(z.v), y0 + 16, z.et, { f: 11 }); });
      if (o['eje x']) out += T(x1 + 12, y0 + 30, o['eje x'], { a: 'end', i: 1, c: 'var(--g-b2)', w: 800 });
      return svg(W, o['eje x'] ? H + 8 : H, out);
    }

    // ---- dispersión ----
    function dispersion(o, pares, err) {
      var pts = [], rx = /\(([^()]*)\)/g, m;
      while ((m = rx.exec(o.puntos || ''))) {
        var d = /;/.test(m[1]) ? m[1].split(';') : m[1].split(',');
        if (d.length === 2) pts.push([num(d[0]), num(d[1])]);
      }
      if (!pts.length || pts.some(function (q) { return isNaN(q[0]) || isNaN(q[1]); })) return err('Escribe puntos: (1; 2), (2; 4), (3; 5)');
      var W = 320, H = 222, x0 = 40, y0 = 180, x1 = W - 20, y1 = 26;
      var mxx = escala(Math.max.apply(null, pts.map(function (q) { return q[0]; }))), mxy = escala(Math.max.apply(null, pts.map(function (q) { return q[1]; })));
      var tx = mxx[mxx.length - 1], ty = mxy[mxy.length - 1];
      var X = function (v) { return x0 + v / tx * (x1 - x0 - 6); }, Y = function (v) { return y0 - v / ty * (y0 - y1); }, out = '', ys = [];
      mxy.forEach(function (v) { if (v) { out += L(x0, Y(v), x1, Y(v), 'var(--g-red)', 0, 1); ys.push({ y: Y(v), t: fmt(v) }); } });
      mxx.forEach(function (v) { if (v) out += L(X(v), y0, X(v), y1, 'var(--g-red)', 0, 1); out += T(X(v), y0 + 15, fmt(v), { f: 11 }); });
      out += ejes(o, x0, y0, x1, y1);
      if (/^s[ií]/i.test(o.recta || '')) {
        var n = pts.length, sx = 0, sy = 0, sxy = 0, sxx = 0;
        pts.forEach(function (q) { sx += q[0]; sy += q[1]; sxy += q[0] * q[1]; sxx += q[0] * q[0]; });
        var b = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1), a0 = (sy - b * sx) / n;
        var xa = 0, xb = tx;
        out += '<line x1="' + r1(X(xa)) + '" y1="' + r1(Y(a0 + b * xa)) + '" x2="' + r1(X(xb)) + '" y2="' + r1(Y(a0 + b * xb)) + '" style="stroke:var(--g-lin)" stroke-width="2" clip-path="none"/>';
      }
      pts.forEach(function (q) { out += '<circle cx="' + r1(X(q[0])) + '" cy="' + r1(Y(q[1])) + '" r="4" style="fill:var(--g-b)"/>'; });
      return svg(W, H, out + etiquetasY(ys, x0));
    }

    // ---- pictograma ----
    function pictograma(o, pares, err) {
      if (!pares.length) return err('Escribe una línea por fila, por ejemplo Lunes: 30');
      var cada = num(o.cada || 1) || 1, filas = pares.map(function (p) { var v = valor(p[1]); return { n: p[0], v: v.v / cada }; });
      if (filas.some(function (f) { return isNaN(f.v); })) return err('Escribe números (por ejemplo Lunes: 30)');
      var maxI = Math.ceil(Math.max.apply(null, filas.map(function (f) { return f.v; })));
      var largo = Math.max.apply(null, filas.map(function (f) { return String(f.n).length; })), lx = Math.min(110, 14 + largo * 6.6);
      var tam = Math.min(24, (320 - lx - 10) / Math.max(maxI, 1)), W = 320, H = filas.length * (tam + 8) + 36, out = '', id = 'mcgp' + (++uid);
      var icono = function (x, y, s) { return '<circle cx="' + r1(x + s / 2) + '" cy="' + r1(y + s * .26) + '" r="' + r1(s * .2) + '"/><path d="M' + r1(x + s * .18) + ' ' + r1(y + s) + 'Q' + r1(x + s * .18) + ' ' + r1(y + s * .5) + ' ' + r1(x + s / 2) + ' ' + r1(y + s * .5) + 'Q' + r1(x + s * .82) + ' ' + r1(y + s * .5) + ' ' + r1(x + s * .82) + ' ' + r1(y + s) + 'z"/>'; };
      filas.forEach(function (f, i) {
        var y = 8 + i * (tam + 8);
        out += T(lx - 8, y + tam / 2 + 4, f.n, { a: 'end', i: 1, f: 11.5 });
        for (var j = 0; j < Math.ceil(f.v - 1e-9); j++) {
          var parte = Math.min(1, f.v - j), x = lx + j * tam;
          out += '<clipPath id="' + id + '-' + i + '-' + j + '"><rect x="' + r1(x) + '" y="' + r1(y) + '" width="' + r1(tam * parte) + '" height="' + r1(tam) + '"/></clipPath>' +
            '<g clip-path="url(#' + id + '-' + i + '-' + j + ')" style="fill:var(--g-b)">' + icono(x + 1, y, tam - 2) + '</g>';
        }
      });
      out += '<g style="fill:var(--g-b)">' + icono(W / 2 - 40, H - 22, 16) + '</g>' + T(W / 2 - 18, H - 9, '= ' + fmt(cada) + (o.unidad ? ' ' + o.unidad : ''), { a: 'start', f: 12 });
      return svg(W, H, out);
    }

    // ---- tallo y hojas ----
    function tallo(o, pares, lineas, err) {
      var filas = lineas.map(function (l) { var m = l.match(/^(\S+)\s*[|:]\s*(.*)$/); return m && !/^(clave|eje)/i.test(m[1]) ? [m[1], m[2].trim()] : null; }).filter(Boolean);
      if (!filas.length) return err('Escribe una línea por tallo, por ejemplo 1 | 2 4 7');
      var W = 260, alto = 22, H = filas.length * alto + 30 + (o.clave ? 20 : 0), xt = 80, out = '';
      out += T(xt - 12, 14, 'Tallo', { a: 'end', f: 11, c: 'var(--g-b2)', w: 800 }) + T(xt + 12, 14, 'Hojas', { a: 'start', f: 11, c: 'var(--g-b2)', w: 800 });
      out += L(xt, 22, xt, 26 + filas.length * alto, 'var(--g-b)', 0, 2);
      filas.forEach(function (f, i) {
        var y = 40 + i * alto;
        out += T(xt - 12, y, f[0], { a: 'end', f: 14, w: 900 }) + T(xt + 12, y, f[1].split(/[\s,]+/).join('  '), { a: 'start', f: 14 });
      });
      if (o.clave) out += T(W / 2, H - 6, 'Clave: ' + o.clave, { f: 11, c: 'var(--g-eje)' });
      return svg(W, H, out);
    }

    /* ---------- Matemática, Física y Química ---------- */

    // Fórmula → función de x (sin eval): + - * / ^, paréntesis, |x|, 2x, sen cos tan raiz log ln abs, pi, e
    function compilar(expr) {
      var s = String(expr).toLowerCase().replace(/\s+/g, '').replace(/π/g, 'pi').replace(/[·×]/g, '*').replace(/[−–]/g, '-').replace(/√/g, 'raiz').replace(/²/g, '^2').replace(/³/g, '^3').replace(/,/g, '.');
      var i = 0;
      var FN = { sen: Math.sin, sin: Math.sin, cos: Math.cos, tan: Math.tan, tg: Math.tan, raiz: Math.sqrt, sqrt: Math.sqrt, log: Math.log10, ln: Math.log, abs: Math.abs, exp: Math.exp };
      function ver(c) { return s.charAt(i) === c; }
      function suma() { var f = prod(); while (ver('+') || ver('-')) { var op = s.charAt(i++), g = prod(); f = (function (a, b, o) { return o === '+' ? function (x) { return a(x) + b(x); } : function (x) { return a(x) - b(x); }; })(f, g, op); } return f; }
      function prod() {
        var f = unario();
        for (;;) {
          if (ver('*') || ver('/')) { var op = s.charAt(i++), g = unario(); f = (function (a, b, o) { return o === '*' ? function (x) { return a(x) * b(x); } : function (x) { return a(x) / b(x); }; })(f, g, op); }
          else if (i < s.length && /[0-9a-z(.π]/.test(s.charAt(i))) { var h = potencia(); f = (function (a, b) { return function (x) { return a(x) * b(x); }; })(f, h); }
          else return f;
        }
      }
      function unario() { if (ver('-')) { i++; var f = unario(); return function (x) { return -f(x); }; } if (ver('+')) { i++; return unario(); } return potencia(); }
      function potencia() { var b = primario(); if (ver('^')) { i++; var e = unario(); return function (x) { return Math.pow(b(x), e(x)); }; } return b; }
      function primario() {
        var m;
        if (ver('(')) { i++; var f = suma(); if (!ver(')')) throw 0; i++; return f; }
        if (ver('|')) { i++; var g = suma(); if (!ver('|')) throw 0; i++; return function (x) { return Math.abs(g(x)); }; }
        if ((m = s.slice(i).match(/^\d*\.?\d+/))) { i += m[0].length; var n = +m[0]; return function () { return n; }; }
        if ((m = s.slice(i).match(/^(sen|sin|cos|tan|tg|raiz|sqrt|log|ln|abs|exp)/))) {
          i += m[0].length; var fn = FN[m[1]], arg = ver('(') ? primario() : potencia();
          return function (x) { return fn(arg(x)); };
        }
        if (s.slice(i, i + 2) === 'pi') { i += 2; return function () { return Math.PI; }; }
        if (ver('x')) { i++; return function (x) { return x; }; }
        if (ver('e')) { i++; return function () { return Math.E; }; }
        throw 0;
      }
      try { var f = suma(); if (i !== s.length) return null; f(1.234); return f; } catch (e) { return null; }
    }
    function marcasEje(a, b) { // marcas "redondas" entre a y b
      var r = b - a; if (!(r > 0)) return [a];
      var p = Math.pow(10, Math.floor(Math.log10(r / 6))), paso = [1, 2, 2.5, 5, 10].map(function (k) { return k * p; }).filter(function (s) { return r / s <= 10; })[0] || p * 10;
      var out = []; for (var v = Math.ceil(a / paso) * paso; v <= b + 1e-9; v += paso) out.push(Math.round(v * 1e6) / 1e6);
      return out;
    }
    function puntosDe(s) { // "A(2; 0), (0; -4), B(1,5; 2)" → [{n, x, y}]
      var out = [], rx = /([A-Za-zÁÉÍÓÚáéíóúñÑ₀-₉'′]*\d*)\s*\(([^()]*)\)/g, m;
      while ((m = rx.exec(s || ''))) {
        var d = /;/.test(m[2]) ? m[2].split(';') : m[2].split(/,\s+|,(?=\s*-?\d)/);
        if (d.length === 2) { var x = num(d[0]), y = num(d[1]); if (!isNaN(x) && !isNaN(y)) out.push({ n: m[1], x: x, y: y, tx: d[0].trim(), ty: d[1].trim() }); }
      }
      return out;
    }

    // ---- funciones y plano cartesiano ----
    function funcion(o, pares, lineas, err) {
      var curvas = [], polis = [];
      lineas.forEach(function (l) {
        var m = l.match(/^(?:([^:=]{1,20}):\s*)?(y\s*=\s*.+?)\s*(?:\[\s*(-?[\d.,]+)\s*;\s*(-?[\d.,]+)\s*\])?$/i);
        if (m && /^y\s*=/i.test(m[2])) {
          var f = compilar(m[2].replace(/^y\s*=\s*/i, ''));
          curvas.push({ n: m[1] ? m[1].trim() : '', f: f, txt: m[2], a: m[3] != null ? num(m[3]) : null, b: m[4] != null ? num(m[4]) : null });
          return;
        }
        var t = l.match(/^(?:([^:]{1,20}):\s*)?(\(.+\))\s*$/);
        if (t && !/^puntos/i.test(t[1] || '')) polis.push({ n: t[1] ? t[1].trim() : '', p: puntosDe(t[2]) });
      });
      var mal = curvas.filter(function (c) { return !c.f; })[0];
      if (mal) return err('No entiendo la fórmula «' + mal.txt + '». Usa por ejemplo y = x^2 - 4, y = 2x + 1, y = sen(x), y = raiz(x)');
      var pts = puntosDe(o.puntos), segs = lista(o.segmentos);
      if (!curvas.length && !polis.length && !pts.length) return err('Escribe una función (y = x^2 - 4), una línea por puntos ((0; 0), (4; 8)) o puntos: A(2; 3)');
      // rango x
      var xr = lista(o.x).map(num), xs = [];
      polis.forEach(function (p) { p.p.forEach(function (q) { xs.push(q.x); }); }); pts.forEach(function (q) { xs.push(q.x); });
      var x0 = !isNaN(xr[0]) ? xr[0] : (xs.length ? Math.min(0, Math.min.apply(null, xs)) : -5), x1 = !isNaN(xr[1]) ? xr[1] : (xs.length ? Math.max(0, Math.max.apply(null, xs)) : 5);
      if (isNaN(xr[0]) && xs.length) { var px = (x1 - x0) * .08; if (x0 < 0) x0 -= px; x1 += px; }
      // rango y
      var yr = lista(o.y).map(num), ys = [];
      polis.forEach(function (p) { p.p.forEach(function (q) { ys.push(q.y); }); }); pts.forEach(function (q) { ys.push(q.y); });
      curvas.forEach(function (c) { var a = c.a != null ? c.a : x0, b = c.b != null ? c.b : x1; for (var k = 0; k <= 60; k++) { var v = c.f(a + (b - a) * k / 60); if (isFinite(v)) ys.push(v); } });
      ys.sort(function (a, b) { return a - b; });
      var y0 = !isNaN(yr[0]) ? yr[0] : Math.min(0, ys.length ? ys[Math.floor(ys.length * .03)] : -5), y1 = !isNaN(yr[1]) ? yr[1] : Math.max(0, ys.length ? ys[Math.ceil(ys.length * .97) - 1] : 5);
      if (isNaN(yr[0])) { var py = (y1 - y0) * .1 || 1; if (y0 < 0) y0 -= py; y1 += py; }
      var W = 320, H = 240, L0 = 34, R0 = W - 18, T0 = 18, B0 = H - 26;
      var X = function (v) { return L0 + (v - x0) / (x1 - x0) * (R0 - L0); }, Y = function (v) { return B0 - (v - y0) / (y1 - y0) * (B0 - T0); };
      var ax = Math.max(x0, Math.min(x1, 0)), ay = Math.max(y0, Math.min(y1, 0)), out = '', id = 'mcgf' + (++uid);
      var mxs = o['marcas x'] != null ? lista(o['marcas x']).map(valor) : marcasEje(x0, x1).filter(function (v) { return v; }).map(function (v) { return { et: fmt(v), v: v }; });
      var mys = o['marcas y'] != null ? lista(o['marcas y']).map(valor) : marcasEje(y0, y1).filter(function (v) { return v; }).map(function (v) { return { et: fmt(v), v: v }; });
      if (!/^no/i.test(o['cuadrícula'] || o.cuadricula || '')) {
        mxs.forEach(function (m) { out += L(X(m.v), T0, X(m.v), B0, 'var(--g-red)', 0, 1); });
        mys.forEach(function (m) { out += L(L0, Y(m.v), R0, Y(m.v), 'var(--g-red)', 0, 1); });
      }
      out += L(L0 - 4, Y(ay), R0 + 4, Y(ay), 'var(--g-eje)') + flecha(R0 + 4, Y(ay), 'x') + L(X(ax), B0 + 4, X(ax), T0 - 4, 'var(--g-eje)') + flecha(X(ax), T0 - 4, 'y');
      out += T(R0 + 10, Y(ay) + 16, o['eje x'] || 'x', { a: 'end', i: 1, c: 'var(--g-b2)', w: 800 }) + T(X(ax) + 8, T0 - 2, o['eje y'] || 'y', { a: 'start', i: 1, c: 'var(--g-b2)', w: 800 });
      mxs.forEach(function (m) { out += L(X(m.v), Y(ay) - 3, X(m.v), Y(ay) + 3, 'var(--g-eje)') + T(X(m.v), Y(ay) + 15, m.et, { f: 10.5 }); });
      mys.forEach(function (m) { out += L(X(ax) - 3, Y(m.v), X(ax) + 3, Y(m.v), 'var(--g-eje)') + T(X(ax) - 6, Y(m.v) + 4, m.et, { a: 'end', f: 10.5 }); });
      if (ax === 0 && ay === 0) out += T(X(0) - 6, Y(0) + 14, 'O', { a: 'end', f: 10.5 });
      out += '<clipPath id="' + id + '"><rect x="' + L0 + '" y="' + T0 + '" width="' + (R0 - L0) + '" height="' + (B0 - T0) + '"/></clipPath><g clip-path="url(#' + id + ')">';
      var etqs = '', usadas = [];
      function ponEtq(x, y, txt, an, col) { // sin encimarse con otra etiqueta
        for (var n = 0; n < 6 && usadas.some(function (u) { return Math.abs(u[0] - x) < 40 && Math.abs(u[1] - y) < 13; }); n++) y -= 14;
        usadas.push([x, y]);
        return T(x, y, txt, { a: an, f: 12, w: 900, c: col, halo: 1 });
      }
      curvas.forEach(function (c, k) {
        var a = c.a != null ? c.a : x0, b = c.b != null ? c.b : x1, d = '', antes = null, N = 400, ult = null;
        for (var j = 0; j <= N; j++) {
          var x = a + (b - a) * j / N, v = c.f(x), ok = isFinite(v) && Math.abs(v - (y0 + y1) / 2) < (y1 - y0) * 4;
          if (ok && antes != null && Math.abs(v - antes) > (y1 - y0) * 1.5) ok = 'salto';
          if (ok === true) { d += (d && antes != null ? 'L' : 'M') + r1(X(x)) + ' ' + r1(Y(v)); antes = v; if (v >= y0 && v <= y1) ult = [X(x), Y(v)]; }
          else { antes = ok === 'salto' ? v : null; if (ok === 'salto') d += 'M' + r1(X(x)) + ' ' + r1(Y(v)); }
        }
        out += '<path d="' + d + '" style="fill:none;stroke:' + C(k) + '" stroke-width="2.4"/>';
        if (c.n && ult) etqs += ponEtq(Math.min(ult[0], R0 - 4), Math.max(ult[1] - 6, T0 + 10), c.n, 'end', C(k));
      });
      polis.forEach(function (p, k) {
        var col = C(curvas.length + k);
        out += '<polyline points="' + p.p.map(function (q) { return r1(X(q.x)) + ',' + r1(Y(q.y)); }).join(' ') + '" style="fill:none;stroke:' + col + '" stroke-width="2.4"/>';
        if (p.n && p.p.length > 1) { // nombre a mitad del primer tramo, al lado
          var q0 = p.p[0], q1 = p.p[1], mx = (X(q0.x) + X(q1.x)) / 2, my = (Y(q0.y) + Y(q1.y)) / 2, dx = X(q1.x) - X(q0.x), dy = Y(q1.y) - Y(q0.y), dn = Math.hypot(dx, dy) || 1;
          etqs += ponEtq(mx + dy / dn * 12, my - dx / dn * 12 + 4, p.n, 'middle', col);
        }
      });
      out += '</g>';
      var guias = /^s[ií]/i.test(o['guías'] || o.guias || '');
      var porNombre = {}; pts.forEach(function (q) { if (q.n) porNombre[q.n] = q; });
      segs.forEach(function (sg) {
        var m = sg.match(/^([A-Z]'?|O)([A-Z]'?|O)$/); if (!m) return;
        var a = m[1] === 'O' && !porNombre.O ? { x: 0, y: 0 } : porNombre[m[1]], b = m[2] === 'O' && !porNombre.O ? { x: 0, y: 0 } : porNombre[m[2]];
        if (a && b) out += L(X(a.x), Y(a.y), X(b.x), Y(b.y), 'var(--g-b)', 0, 2);
      });
      // ángulo en posición normal: "ángulo: θ, P" (del eje x positivo hasta OP)
      var ang = o['ángulo'] || o.angulo;
      if (ang) {
        var pa = lista(ang), q = porNombre[pa[1]];
        if (q) {
          var t1 = Math.atan2(q.y, q.x); if (t1 < 0) t1 += 2 * Math.PI;
          var rr = 18, path = 'M' + r1(X(0) + rr) + ' ' + r1(Y(0));
          for (var j = 1; j <= 30; j++) { var t = t1 * j / 30; path += 'L' + r1(X(0) + rr * Math.cos(t)) + ' ' + r1(Y(0) - rr * Math.sin(t)); }
          out += L(X(0), Y(0), X(q.x), Y(q.y), 'var(--g-b)', 0, 2) + '<path d="' + path + '" style="fill:none;stroke:var(--g-lin)" stroke-width="1.6"/>';
          var tm = t1 / 2; out += T(X(0) + 30 * Math.cos(tm), Y(0) - 30 * Math.sin(tm) + 4, pa[0], { f: 13, w: 900, c: 'var(--g-lin)' });
        }
      }
      pts.forEach(function (q) {
        if (guias) out += L(X(q.x), Y(q.y), X(q.x), Y(ay), 'var(--g-gu)', 1, 1) + L(X(q.x), Y(q.y), X(ax), Y(q.y), 'var(--g-gu)', 1, 1);
        out += '<circle cx="' + r1(X(q.x)) + '" cy="' + r1(Y(q.y)) + '" r="3.6" style="fill:var(--g-b)"/>';
        if (q.n) out += T(X(q.x) + (q.x < 0 ? -6 : 6), Y(q.y) - 7, /^s[ií]/i.test(o.coordenadas || '') ? q.n + '(' + q.tx + '; ' + q.ty + ')' : q.n, { a: q.x < 0 ? 'end' : 'start', f: 12, w: 900, halo: 1 });
      });
      return svg(W, H, out + etqs);
    }

    // ---- recta numérica con intervalos ----
    function recta(o, pares, lineas, err) {
      var ints = [];
      lineas.forEach(function (l) {
        var m = l.match(/^(?:intervalo|[A-Z]\w{0,3})?\s*:?\s*([\[<(\]])\s*([^;,]+?)\s*[;,]\s*([^\]>)\[]+?)\s*([\]>)\[])\s*$/i);
        if (m) ints.push({ n: (l.match(/^([A-Z]\w{0,3})\s*:/) || [])[1] || '', ca: m[1] === '[', a: m[2].trim(), b: m[3].trim(), cb: m[4] === ']' });
      });
      if (!ints.length) return err('Escribe intervalos como [-3; 2> o <5; +∞>');
      var marcas = lista(o.marcas || o.valores);
      var inf = function (s) { return /∞|inf/i.test(s); };
      ints.forEach(function (it) { [it.a, it.b].forEach(function (v) { if (!inf(v) && marcas.indexOf(v) < 0) marcas.push(v); }); });
      if (!o.marcas) marcas.sort(function (p, q) { return num(p) - num(q); });
      var W = 320, x0 = 30, x1 = W - 30, n = marcas.length, H = 56 + ints.length * 20, ya = H - 26, out = '';
      var X = function (s) { if (inf(s)) return /-/.test(s) ? x0 - 12 : x1 + 12; var k = marcas.indexOf(s); return x0 + 20 + (n > 1 ? k / (n - 1) : .5) * (x1 - x0 - 40); };
      out += L(x0 - 18, ya, x1 + 18, ya, 'var(--g-eje)') + flecha(x1 + 18, ya, 'x') + '<path d="M' + (x0 - 18) + ' ' + (ya - 4) + 'L' + (x0 - 25) + ' ' + ya + 'L' + (x0 - 18) + ' ' + (ya + 4) + 'z" style="fill:var(--g-eje)"/>';
      marcas.forEach(function (m) { out += L(X(m), ya - 4, X(m), ya + 4, 'var(--g-eje)') + T(X(m), ya + 18, m, { f: 12 }); });
      ints.forEach(function (it, k) {
        var y = ya - 14 - k * 20, a = X(it.a), b = X(it.b), col = C(k);
        out += '<rect x="' + r1(Math.min(a, b)) + '" y="' + (y - 3) + '" width="' + r1(Math.abs(b - a)) + '" height="6" rx="3" style="fill:' + col + '" fill-opacity=".5"/>';
        [[it.a, a, it.ca], [it.b, b, it.cb]].forEach(function (e) {
          if (inf(e[0])) return;
          out += L(e[1], y, e[1], ya, 'var(--g-gu)', 1, 1) + '<circle cx="' + r1(e[1]) + '" cy="' + y + '" r="4.5" style="fill:' + (e[2] ? col : 'var(--g-fondo, #151127)') + ';stroke:' + col + '" stroke-width="2"/>';
        });
        if (it.n) out += T(Math.min(a, b) - 8, y + 4, it.n, { a: 'end', f: 12, w: 900, c: col });
      });
      return svg(W, H, out);
    }

    // ---- diagrama de Venn (2 o 3 conjuntos) ----
    function venn(o, pares, lineas, err) {
      var cs = lista(o.conjuntos || 'A, B');
      if (cs.length < 2 || cs.length > 3) return err('Escribe conjuntos: A, B (o A, B, C)');
      var tres = cs.length === 3, W = 320, H = tres ? 236 : 190, id = 'mcgv' + (++uid), out = '';
      var cen = tres ? [[128, 92, 62], [192, 92, 62], [160, 146, 62]] : [[125, 95, 68], [195, 95, 68]];
      var reg = {}; lista(o.regiones || o.valores).forEach(function (r) { var m = r.match(/^(.+?)\s*=\s*(.+)$/); if (m) reg[sinTilde(m[1]).replace(/\s|∩/g, '').toUpperCase()] = m[2]; });
      pares.forEach(function (p) { var k = sinTilde(p[0]).replace(/\s|∩/g, '').toUpperCase(); if (/^[A-Z]{1,3}$|^FUERA$|^SOLO/.test(k)) reg[k.replace(/^SOLO/, '')] = p[1].trim(); });
      function clave(sets) { return sets.map(function (k) { return cs[k].toUpperCase(); }).join(''); }
      var POS = tres ? { 0: [100, 72], 1: [220, 72], 2: [160, 178], '01': [160, 66], '02': [124, 132], '12': [196, 132], '012': [160, 112] } : { 0: [92, 99], 1: [228, 99], '01': [160, 99] };
      var somb = lista(o.sombrear).map(function (s) { return sinTilde(s).replace(/\s|∩/g, '').toUpperCase(); });
      var defs = '';
      cen.forEach(function (c, k) { defs += '<clipPath id="' + id + 'c' + k + '"><circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '"/></clipPath>'; });
      function region(dentro) { // dibuja una región sombreada (dentro = índices)
        var fuera = [0, 1, 2].slice(0, cs.length).filter(function (k) { return dentro.indexOf(k) < 0; });
        var mid = id + 'm' + dentro.join('');
        defs += '<mask id="' + mid + '"><rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#fff"/>' + fuera.map(function (k) { return '<circle cx="' + cen[k][0] + '" cy="' + cen[k][1] + '" r="' + cen[k][2] + '" fill="#000"/>'; }).join('') + '</mask>';
        var g = '<rect x="6" y="6" width="' + (W - 12) + '" height="' + (H - 12) + '" style="fill:var(--g-somb)" mask="url(#' + mid + ')"/>';
        dentro.forEach(function (k) { g = '<g clip-path="url(#' + id + 'c' + k + ')">' + g + '</g>'; });
        return g;
      }
      var combos = tres ? [[0], [1], [2], [0, 1], [0, 2], [1, 2], [0, 1, 2], []] : [[0], [1], [0, 1], []];
      combos.forEach(function (cb) { var k = cb.length ? clave(cb) : 'FUERA'; if (somb.indexOf(k) >= 0) out += region(cb); });
      if (o.universo || reg.FUERA || somb.indexOf('FUERA') >= 0) out += '<rect x="6" y="6" width="' + (W - 12) + '" height="' + (H - 12) + '" rx="6" style="fill:none;stroke:var(--g-eje)" stroke-width="1.6"/>' + T(16, 24, o.universo || 'U', { a: 'start', f: 13, w: 900 });
      cen.forEach(function (c, k) {
        out += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '" style="fill:none;stroke:' + C(k) + '" stroke-width="2.2"/>';
        var lx = c[0] + (k === 2 ? 0 : (k ? 1 : -1) * c[2] * .78), ly = k === 2 ? c[1] + c[2] + 16 : c[1] - c[2] * .78;
        out += T(lx, ly, cs[k], { f: 15, w: 900, c: C(k) });
      });
      combos.forEach(function (cb) {
        var k = cb.length ? clave(cb) : 'FUERA', v = reg[k]; if (v == null) return;
        var p = cb.length ? POS[cb.join('')] : [W - 22, H - 16];
        out += T(p[0], p[1] + 5, v, { f: 14, w: 900 });
      });
      return svg(W, H, '<defs>' + defs + '</defs>' + out);
    }

    // ---- triángulo (rectángulo o cualquiera) ----
    function triangulo(o, pares, lineas, err) {
      var vs = lista(o['vértices'] || o.vertices || 'A, B, C'); if (vs.length !== 3) return err('Escribe vértices: A, B, C');
      var recto = (o.recto || '').trim(), angs = {}, lados = {};
      lista(o['ángulos'] || o.angulos).forEach(function (a) { var m = a.match(/^(\S+)\s*=\s*(.+)$/); if (m) angs[m[1]] = m[2].trim(); });
      lista(o.lados).forEach(function (a) { var m = a.match(/^(\S+)\s*=\s*(.+)$/); if (m) lados[m[1].split('').sort().join('')] = m[2].trim(); });
      var deg = function (s) { var m = String(s || '').match(/^(\d+(?:[.,]\d+)?)\s*°$/); return m ? num(m[1]) : NaN; };
      var P = {}, A = vs[0], B = vs[1], Cc = vs[2];
      if (recto && vs.indexOf(recto) >= 0) {
        // recto abajo a la derecha, un cateto horizontal y otro vertical
        var otros = vs.filter(function (v) { return v !== recto; }), hz = otros[0], vt = otros[1];
        var lh = num(lados[[hz, recto].sort().join('')]), lv = num(lados[[vt, recto].sort().join('')]), ah = deg(angs[hz]), av = deg(angs[vt]);
        var razon = !isNaN(lh) && !isNaN(lv) ? lv / lh : !isNaN(ah) ? Math.tan(ah * Math.PI / 180) : !isNaN(av) ? 1 / Math.tan(av * Math.PI / 180) : .75;
        razon = Math.max(.25, Math.min(2.5, razon));
        P[hz] = [0, 0]; P[recto] = [1, 0]; P[vt] = [1, razon];
      } else {
        var a1 = deg(angs[A]), a3 = deg(angs[Cc]); if (isNaN(a1)) a1 = isNaN(a3) ? 62 : Math.min(70, 180 - a3 - 50); if (isNaN(a3)) a3 = Math.min(70, 180 - a1 - 48);
        var t1 = a1 * Math.PI / 180, t3 = a3 * Math.PI / 180, hgt = Math.sin(t1) * Math.sin(t3) / Math.sin(t1 + t3), bx = hgt / Math.tan(t1);
        if (hgt > .8) { bx = bx * .8 / hgt; hgt = .8; } // figura no a escala: que no quede como aguja
        P[A] = [0, 0]; P[Cc] = [1, 0]; P[B] = [bx, hgt];
      }
      var xsP = vs.map(function (v) { return P[v][0]; }), ysP = vs.map(function (v) { return P[v][1]; });
      var mnx = Math.min.apply(null, xsP), mxx = Math.max.apply(null, xsP), mxy = Math.max.apply(null, ysP);
      var esc = Math.min(230 / (mxx - mnx), 160 / mxy), W = 320, H = Math.round(mxy * esc + 56), ox = (W - (mxx - mnx) * esc) / 2 - mnx * esc;
      var Q = {}; vs.forEach(function (v) { Q[v] = [ox + P[v][0] * esc, H - 28 - P[v][1] * esc]; });
      var g = [(Q[A][0] + Q[B][0] + Q[Cc][0]) / 3, (Q[A][1] + Q[B][1] + Q[Cc][1]) / 3], out = '';
      out += '<polygon points="' + vs.map(function (v) { return r1(Q[v][0]) + ',' + r1(Q[v][1]); }).join(' ') + '" style="fill:var(--g-rell);stroke:var(--g-b)" stroke-width="2.2" stroke-linejoin="round"/>';
      vs.forEach(function (v) { // vértice y su ángulo
        var p = Q[v], dx = p[0] - g[0], dy = p[1] - g[1], d = Math.sqrt(dx * dx + dy * dy) || 1;
        out += T(p[0] + dx / d * 14, p[1] + dy / d * 14 + 5, v, { f: 15, w: 900 });
        var o2 = vs.filter(function (w) { return w !== v; }), u1 = [Q[o2[0]][0] - p[0], Q[o2[0]][1] - p[1]], u2 = [Q[o2[1]][0] - p[0], Q[o2[1]][1] - p[1]];
        var n1 = Math.hypot(u1[0], u1[1]), n2 = Math.hypot(u2[0], u2[1]); u1 = [u1[0] / n1, u1[1] / n1]; u2 = [u2[0] / n2, u2[1] / n2];
        if (v === recto) { var k = 11; out += '<path d="M' + r1(p[0] + u1[0] * k) + ' ' + r1(p[1] + u1[1] * k) + 'L' + r1(p[0] + (u1[0] + u2[0]) * k) + ' ' + r1(p[1] + (u1[1] + u2[1]) * k) + 'L' + r1(p[0] + u2[0] * k) + ' ' + r1(p[1] + u2[1] * k) + '" style="fill:none;stroke:var(--g-b)" stroke-width="1.6"/>'; }
        else if (angs[v]) {
          var rr = 20, cr = u1[0] * u2[1] - u1[1] * u2[0];
          out += '<path d="M' + r1(p[0] + u1[0] * rr) + ' ' + r1(p[1] + u1[1] * rr) + 'A' + rr + ' ' + rr + ' 0 0 ' + (cr > 0 ? 1 : 0) + ' ' + r1(p[0] + u2[0] * rr) + ' ' + r1(p[1] + u2[1] * rr) + '" style="fill:none;stroke:var(--g-lin)" stroke-width="1.8"/>';
          var bis = [u1[0] + u2[0], u1[1] + u2[1]], nb = Math.hypot(bis[0], bis[1]) || 1;
          out += T(p[0] + bis[0] / nb * 34, p[1] + bis[1] / nb * 34 + 5, angs[v], { f: 13, w: 900, c: 'var(--g-lin)' });
        }
      });
      Object.keys(lados).forEach(function (k) { // nombre o medida de cada lado, por fuera
        var a = Q[k[0]], b = Q[k[1]]; if (!a || !b) return;
        var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = mx - g[0], dy = my - g[1], d = Math.hypot(dx, dy) || 1;
        out += T(mx + dx / d * 14, my + dy / d * 14 + 5, lados[k], { f: 13, w: 800, i: !/\d/.test(lados[k]) });
      });
      return svg(W, H, out);
    }

    // ---- configuración electrónica en orbitales ----
    function orbitales(o, pares, lineas, err) {
      var txt = lineas.join(' '), partes = txt.match(/\[[A-Z][a-z]?\]|\d[spdf]\d{1,2}/g);
      if (!partes) return err('Escribe la configuración, por ejemplo 1s2 2s2 2p4 (o [Ne] 3s2 3p3)');
      var cajas = { s: 1, p: 3, d: 5, f: 7 }, x = 8, y = 12, W = 320, out = '', fila = 0, alto = 58;
      partes.forEach(function (p) {
        if (/^\[/.test(p)) { var w0 = 44; if (x + w0 > W - 8) { x = 8; fila++; } out += R(x, y + fila * alto, w0, 24, 'var(--g-rell)', null, ' rx="5"') + T(x + w0 / 2, y + fila * alto + 17, p, { f: 12, w: 900 }); x += w0 + 12; return; }
        var m = p.match(/^(\d)([spdf])(\d+)$/), n = cajas[m[2]], e = Math.min(+m[3], 2 * n), w = n * 24;
        if (x + w > W - 8) { x = 8; fila++; }
        var yy = y + fila * alto;
        for (var k = 0; k < n; k++) {
          var bx = x + k * 24, sube = e > k, baja = e > n + k;
          out += R(bx, yy, 24, 24, 'none', 'var(--g-b)');
          if (sube) out += '<path d="M' + (bx + (baja ? 8 : 12)) + ' ' + (yy + 20) + 'V' + (yy + 5) + 'm-3 4l3-4l3 4" style="fill:none;stroke:var(--g-lin)" stroke-width="1.8"/>';
          if (baja) out += '<path d="M' + (bx + 16) + ' ' + (yy + 4) + 'V' + (yy + 19) + 'm-3-4l3 4l3-4" style="fill:none;stroke:var(--g-lin)" stroke-width="1.8"/>';
        }
        out += T(x + w / 2, yy + 40, m[1] + m[2], { f: 12, w: 900 }) + '<text x="' + (x + w / 2 + 9) + '" y="' + (yy + 34) + '" font-size="9" font-weight="800" style="fill:var(--g-tx)">' + m[3] + '</text>';
        x += w + 12;
      });
      return svg(W, y + (fila + 1) * alto, out);
    }

    // ---- vectores (desde un origen o uno tras otro) ----
    function vectores(o, pares, lineas, err) {
      var vs = [];
      pares.forEach(function (p) {
        var m = p[1].match(/^\s*(-?\d+(?:[.,]\d+)?)?\s*(?:u|N|m|m\/s)?\s*[,;]?\s*(-?\d+(?:[.,]\d+)?)\s*°\s*$/);
        if (m) vs.push({ n: p[0], mod: m[1] != null ? num(m[1]) : NaN, ang: num(m[2]), txt: p[1].trim() });
      });
      if (!vs.length) return err('Escribe un vector por línea: A: 10, 37° (módulo y ángulo con el eje x)');
      var cad = /cadena|poligono|seguido/.test(sinTilde(o.modo || ''));
      var mods = vs.map(function (v) { return isNaN(v.mod) ? 1 : v.mod; }), mx = Math.max.apply(null, mods);
      var pts = [[0, 0]], ends = [];
      vs.forEach(function (v, k) {
        var r = (isNaN(v.mod) ? mx * .8 : v.mod) / mx, t = v.ang * Math.PI / 180, ini = cad ? pts[pts.length - 1] : [0, 0];
        var fin = [ini[0] + r * Math.cos(t), ini[1] + r * Math.sin(t)]; pts.push(fin); ends.push([ini, fin]);
      });
      var all = [[0, 0]].concat(pts), xsA = all.map(function (p) { return p[0]; }), ysA = all.map(function (p) { return p[1]; });
      var mnx = Math.min.apply(null, xsA), mxx = Math.max.apply(null, xsA), mny = Math.min.apply(null, ysA), mxy = Math.max.apply(null, ysA);
      var esc = Math.min(240 / (mxx - mnx || 1), 170 / (mxy - mny || 1)), W = 320, H = Math.round((mxy - mny) * esc + 60);
      var X = function (v) { return (W - (mxx - mnx) * esc) / 2 + (v - mnx) * esc; }, Y = function (v) { return 30 + (mxy - v) * esc; }, out = '', id = 'mcgw' + (++uid);
      var flechaM = function (k, col) { return '<marker id="' + id + k + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:' + col + '"/></marker>'; };
      out += '<defs>' + vs.map(function (v, k) { return flechaM(k, C(k)); }).join('') + flechaM('r', 'var(--g-b)') + '</defs>';
      if (!cad) out += L(X(mnx) - 14, Y(0), X(mxx) + 14, Y(0), 'var(--g-gu)', 1, 1) + T(X(mxx) + 18, Y(0) + 4, 'x', { a: 'start', i: 1, f: 11, c: 'var(--g-eje)' });
      vs.forEach(function (v, k) {
        var e = ends[k], col = C(k), a = e[0], b = e[1];
        out += '<line x1="' + r1(X(a[0])) + '" y1="' + r1(Y(a[1])) + '" x2="' + r1(X(b[0])) + '" y2="' + r1(Y(b[1])) + '" style="stroke:' + col + ';fill:' + col + '" stroke-width="2.4" marker-end="url(#' + id + k + ')"/>';
        var mx2 = (X(a[0]) + X(b[0])) / 2, my2 = (Y(a[1]) + Y(b[1])) / 2, t = v.ang * Math.PI / 180;
        out += T(mx2 - Math.sin(t) * 14, my2 - Math.cos(t) * 14 + 4, v.n, { f: 14, w: 900, c: col, i: 1 });
        if (!cad && v.ang % 180 !== 0) {
          var rr = 22 + k * 7, t0 = 0, p = 'M' + r1(X(0) + rr) + ' ' + r1(Y(0));
          for (var j = 1; j <= 24; j++) { var tt = t0 + (t - t0) * j / 24; p += 'L' + r1(X(0) + rr * Math.cos(tt)) + ' ' + r1(Y(0) - rr * Math.sin(tt)); }
          out += '<path d="' + p + '" style="fill:none;stroke:' + col + '" stroke-width="1.3"/>' + T(X(0) + (rr + 12) * Math.cos(t / 2), Y(0) - (rr + 12) * Math.sin(t / 2) + 4, Math.abs(v.ang) + '°', { f: 10.5, c: col });
        }
      });
      if (/^s[ií]/i.test(o.resultante || '') && cad) {
        var z = pts[pts.length - 1];
        out += '<line x1="' + r1(X(0)) + '" y1="' + r1(Y(0)) + '" x2="' + r1(X(z[0])) + '" y2="' + r1(Y(z[1])) + '" style="stroke:var(--g-b);fill:var(--g-b)" stroke-width="2.4" stroke-dasharray="6 4" marker-end="url(#' + id + 'r)"/>' + T((X(0) + X(z[0])) / 2 + 10, (Y(0) + Y(z[1])) / 2 + 16, 'R', { f: 14, w: 900, i: 1 });
      }
      return svg(W, H, out);
    }

    var GEO = ['x', 'y', 'eje x', 'eje y', 'puntos', 'segmentos', 'ángulo', 'angulo', 'marcas x', 'marcas y', 'guías', 'guias', 'coordenadas', 'cuadrícula', 'cuadricula', 'conjuntos', 'regiones', 'valores', 'universo', 'sombrear', 'vértices', 'vertices', 'recto', 'ángulos', 'angulos', 'lados', 'modo', 'resultante', 'marcas'];
    var CLAVES = ['x', 'y', 'alturas', 'sombrear', 'eje x', 'eje y', 'series', 'polígono', 'poligono', 'destacar', 'separar', 'centro', 'valores', 'datos', 'puntos', 'recta', 'cada', 'unidad', 'clave', 'estilo', 'orientación', 'orientacion'];
    var CAT = ['eje x', 'eje y', 'series', 'destacar', 'separar', 'centro', 'estilo', 'cada', 'unidad', 'orientación', 'orientacion'];
    // tipo + líneas → { html } o { error }
    function dibujar(tipo, lineas) {
      var t = sinTilde(tipo), o = {}, pares = [], error = null;
      function err(msg) { error = msg; return ''; }
      var esCat = /^(barras|circular|dona|pastel|torta|sectores|pictograma|caja)/.test(t);
      var esGeo = /^(funcion|funciones|plano|cartesiano|recta numerica|intervalo|venn|conjuntos|diagrama de venn|triangulo|orbitales|configuracion|vectores|vector)/.test(t);
      lineas.forEach(function (l) {
        var m = l.match(/^([^:|]+?)\s*:\s*(.*)$/); if (!m) return;
        var k = m[1].trim(), kl = k.toLowerCase();
        if ((esGeo ? GEO : esCat ? CAT : CLAVES).indexOf(kl) >= 0) o[kl] = m[2].trim(); else pares.push([k, m[2]]);
      });
      var est = sinTilde(o.estilo || ''), hor = /horizontal/.test(t) || /horizontal/.test(sinTilde(o['orientación'] || o.orientacion || '')), html = '';
      if (/^histograma/.test(t)) html = histograma(o, pares, err, false);
      else if (/^poligono/.test(t)) html = histograma(o, pares, err, true);
      else if (/^(linea|lineas|ojiva)/.test(t)) html = linea(o, pares, err);
      else if (/^barras/.test(t)) html = barras(o, pares, err, /apilad/.test(t) ? 'apiladas' : /(agrupad|doble|comparativ)/.test(t) ? 'agrupadas' : 'simple', hor);
      else if (/^(circular|pastel|torta|sectores)/.test(t)) html = circular(o, pares, err, /3d/.test(t) || est === '3d' ? '3d' : /dona/.test(est) ? 'dona' : '');
      else if (/^dona/.test(t)) html = circular(o, pares, err, 'dona');
      else if (/^(caja|cajas|boxplot)/.test(t)) html = caja(o, pares, err);
      else if (/^(dispersion|puntos)/.test(t)) html = dispersion(o, pares, err);
      else if (/^pictograma/.test(t)) html = pictograma(o, pares, err);
      else if (/^tallo/.test(t)) html = tallo(o, pares, lineas, err);
      else if (/^(funcion|funciones|plano|cartesiano)/.test(t)) html = funcion(o, pares, lineas, err);
      else if (/^(recta numerica|intervalo)/.test(t)) html = recta(o, pares, lineas, err);
      else if (/^(venn|conjuntos|diagrama de venn)/.test(t)) html = venn(o, pares, lineas, err);
      else if (/^triangulo/.test(t)) html = triangulo(o, pares, lineas, err);
      else if (/^(orbitales|configuracion)/.test(t)) html = orbitales(o, pares, lineas, err);
      else if (/^vector/.test(t)) html = vectores(o, pares, lineas, err);
      else error = 'No conozco el gráfico «' + tipo.trim() + '». Puede ser: ' + TIPOS_TXT;
      return error ? { error: error } : { html: '<div class="mcq-graf">' + html + '</div>' };
    }
    // Revisa los gráficos de un texto (para el panel): lista de errores
    function errores(texto) {
      var lineas = String(texto || '').replace(/\r/g, '').split('\n'), out = [];
      for (var i = 0; i < lineas.length; i++) {
        var m = lineas[i].trim().match(RX_GRAF); if (!m) continue;
        var cuerpo = [], j = i + 1;
        while (j < lineas.length && !RX_GRAF_FIN.test(lineas[j].trim())) { if (lineas[j].trim()) cuerpo.push(lineas[j].trim()); j++; }
        if (j >= lineas.length) { out.push('Falta cerrar el gráfico con [/GRÁFICO]'); break; }
        var r = dibujar(m[2], cuerpo); if (r.error) out.push('Gráfico: ' + r.error);
        i = j;
      }
      return out;
    }
    // Para el PDF (html2canvas dibuja el SVG aparte y ahí no llegan las variables CSS):
    // copia en cada figura el color ya calculado
    function fijarColores(raiz) {
      if (!raiz || !raiz.querySelectorAll) return;
      raiz.querySelectorAll('.mcq-graf svg [style], .mcq-graf svg g').forEach(function (el) {
        var cs = (el.ownerDocument.defaultView || window).getComputedStyle(el);
        el.style.fill = cs.fill; el.style.stroke = cs.stroke;
      });
      raiz.querySelectorAll('.mcq-graf svg').forEach(function (sv) {
        var cs = (sv.ownerDocument.defaultView || window).getComputedStyle(sv);
        sv.setAttribute('font-family', cs.fontFamily);
        var r = sv.getBoundingClientRect(); if (r.width) { sv.setAttribute('width', Math.round(r.width)); sv.setAttribute('height', Math.round(r.height)); }
      });
    }
    return { dibujar: dibujar, errores: errores, tipos: TIPOS_TXT, fijarColores: fijarColores };
  })();

  // texto → { html, derecha }  (derecha = html de la imagen al lado de las alternativas)
  // opts.marca(n, derecha) → html para [IMAGEN] sin pegar todavía (solo en el panel)
  function armar(texto, opts) {
    opts = opts || {};
    var lineas = String(texto || '').replace(/\r/g, '').split('\n');
    var partes = [], parrafo = [], derecha = '', nMarca = 0, etiqueta = '';
    function cerrarParrafo() {
      if (!parrafo.length) return;
      partes.push('<span class="mcq-p">' + parrafo.map(formato).join('<br>') + '</span>');
      parrafo = [];
    }
    for (var i = 0; i < lineas.length; i++) {
      var l = lineas[i].trim(), m;
      if ((m = l.match(RX_ETQ))) { etiqueta = m[1].trim(); continue; }
      if ((m = l.match(RX_LEC))) {
        // Lectura: las líneas seguidas forman un párrafo (vienen cortadas del PDF); línea en blanco = párrafo nuevo
        cerrarParrafo();
        var pars = [[]];
        for (i++; i < lineas.length && !RX_LEC_FIN.test(lineas[i].trim()); i++) {
          var t = lineas[i].trim();
          if (t) pars[pars.length - 1].push(t); else if (pars[pars.length - 1].length) pars.push([]);
        }
        partes.push('<details class="mcq-lec"' + (opts.lecSigue ? '' : ' open') + '><summary>' + esc(m[1].trim().toUpperCase()) +
          (opts.lecPos ? '<span class="mcq-lec-pos"> · ' + esc(opts.lecPos) + '</span>' : '') + '</summary>' +
          pars.filter(function (p) { return p.length; }).map(function (p) { return '<p>' + formato(p.join(' ')) + '</p>'; }).join('') + '</details>');
        continue;
      }
      if ((m = l.match(RX_GRAF))) {
        // Gráfico escrito como texto: todas las líneas hasta [/GRÁFICO]
        cerrarParrafo();
        var cuerpo = [];
        for (i++; i < lineas.length && !RX_GRAF_FIN.test(lineas[i].trim()); i++) if (lineas[i].trim()) cuerpo.push(lineas[i].trim());
        var g = Graf.dibujar(m[2], cuerpo), gh = g.html || '<div class="mcq-graf-error">' + esc('Gráfico: ' + g.error) + '</div>';
        if (m[1]) { if (!derecha) derecha = gh; } else partes.push(gh);
        continue;
      }
      if ((m = l.match(RX_IMG))) {
        cerrarParrafo();
        if (!RUTA.test(m[2])) continue;
        if (m[1]) { if (!derecha) derecha = img(m[2]); }
        else partes.push('<div class="mcq-img">' + img(m[2]) + '</div>');
        continue;
      }
      if ((m = l.match(RX_MARCA))) {
        cerrarParrafo();
        var h = opts.marca ? opts.marca(nMarca++, !!m[1]) : '';
        if (m[1]) derecha = derecha || h; else if (h) partes.push('<div class="mcq-img">' + h + '</div>');
        continue;
      }
      if (esTabla(l)) {
        cerrarParrafo();
        var filas = [];
        while (i < lineas.length && esTabla(lineas[i].trim())) { filas.push(lineas[i].trim()); i++; }
        i--;
        var cab = filas.length > 1 && /^\|[\s:|-]+\|$/.test(filas[1]) && /-/.test(filas[1]);
        var cuerpo = cab ? filas.slice(2) : filas;
        partes.push('<div class="mcq-tabla"><table>' +
          (cab ? '<thead><tr>' + celdas(filas[0]).map(function (c) { return '<th>' + formato(c) + '</th>'; }).join('') + '</tr></thead>' : '') +
          '<tbody>' + cuerpo.map(function (f) { return '<tr>' + celdas(f).map(function (c) { return '<td>' + celda(c) + '</td>'; }).join('') + '</tr>'; }).join('') +
          '</tbody></table></div>');
        continue;
      }
      if (esColumnas(l)) {
        cerrarParrafo();
        var rows = [];
        while (i < lineas.length && esColumnas(lineas[i].trim())) { rows.push(lineas[i].trim().split(/\s\|\|\s/).map(function (c) { return c.trim(); })); i++; }
        i--;
        var n = Math.max.apply(null, rows.map(function (r) { return r.length; }));
        partes.push('<div class="mcq-cols" style="grid-template-columns:repeat(' + n + ',auto)">' +
          rows.map(function (r) { var out = ''; for (var k = 0; k < n; k++) out += '<span>' + formato(r[k] || '') + '</span>'; return out; }).join('') + '</div>');
        continue;
      }
      if (esPar(l)) {
        // Analogía: CORDERO : OVEJA :: → los dos puntos uno debajo de otro
        cerrarParrafo();
        var pares = [];
        while (i < lineas.length && esPar(lineas[i].trim())) { pares.push(partirPar(lineas[i].trim())); i++; }
        i--;
        partes.push('<div class="mcq-par">' + pares.map(function (x) {
          return '<span class="a">' + formato(x[0]) + '</span><span class="c">:</span><span class="b">' + formato(x[1]) + '</span><span class="d">' + (x[2] ? '::' : '') + '</span>';
        }).join('') + '</div>');
        continue;
      }
      if (!l) { cerrarParrafo(); continue; }
      parrafo.push(l);
    }
    cerrarParrafo();
    return { html: partes.join(''), derecha: derecha, etiqueta: etiqueta };
  }

  // Texto sin la lectura compartida (para extractos y mensajes)
  function sinLectura(texto) {
    var lineas = String(texto || '').replace(/\r/g, '').split('\n'), out = [], dentro = false, graf = false;
    lineas.forEach(function (l) {
      var t = l.trim();
      if (RX_ETQ.test(t)) return;
      if (graf) { if (RX_GRAF_FIN.test(t)) graf = false; return; }
      if (!dentro && RX_GRAF.test(t)) { graf = true; out.push('[gráfico]'); return; }
      if (!dentro && RX_LEC.test(t)) dentro = true;
      else if (dentro) { if (RX_LEC_FIN.test(t)) dentro = false; }
      else out.push(l);
    });
    return out.join('\n').trim();
  }

  // Preguntas seguidas del mismo TEXTO: marca q.lecPos = 'preguntas 6 a 8' (posiciones en arr)
  // y q.lecSigue en las que no son la primera del grupo.
  function rangos(arr) {
    var i = 0;
    while (i < arr.length) {
      var k = claveLectura(arr[i] && arr[i].text), j = i + 1;
      if (k) while (j < arr.length && claveLectura(arr[j] && arr[j].text) === k) j++;
      for (var n = i; n < j; n++) {
        if (!arr[n] || typeof arr[n] !== 'object') continue;
        arr[n].lecPos = k ? (j - i > 1 ? 'preguntas ' + (i + 1) + ' a ' + j : 'pregunta ' + (i + 1)) : '';
        arr[n].lecSigue = !!k && n > i;
      }
      i = j;
    }
    return arr;
  }
  // Mezcla al azar, pero las preguntas de un mismo TEXTO quedan juntas y en orden.
  function claveLectura(t) {
    var m = String(t || '').match(/^\s*\[((?:TEXTO|LECTURA)[^\]]{0,20})\]\n([\s\S]*?)\n\[\/(?:TEXTO|LECTURA)\]/i);
    return m ? m[1] + '|' + m[2].trim() : '';
  }
  /* ---------- Alternativas mezcladas ----------
     En la práctica (quiz, repaso, fijas, falladas, simulacro, duelos) el
     contenido de las alternativas cambia de lugar en cada intento; las
     letras siguen A, B, C… El admin lo apaga en Panel → Cursos
     (Supabase, tabla ajustes, clave 'practica'). No se mezclan las
     preguntas con alternativas como "A y B" o "Todas las anteriores". */
  var K_ALT = 'mc_mezclar_alt';
  function altActivo() { try { return localStorage.getItem(K_ALT) !== '0'; } catch (e) { return true; } }
  // Se lee el ajuste en segundo plano; vale desde la siguiente página que se abra
  // (como máximo una vez cada 30 min: casi nunca cambia)
  setTimeout(function () {
    if (!window.MCAuth || !MCAuth.listo) return;
    try { if (Date.now() - (+localStorage.getItem(K_ALT + '_t') || 0) < 30 * 60000) return; } catch (e) {}
    MCAuth.listo.then(function (c) { return c.from('ajustes').select('valor').eq('clave', 'practica').maybeSingle(); })
      .then(function (r) {
        if (!r || r.error) return;
        var v = r.data && r.data.valor;
        try { localStorage.setItem(K_ALT, v && v.mezclar === false ? '0' : '1'); localStorage.setItem(K_ALT + '_t', String(Date.now())); } catch (e) {}
      }, function () {});
  }, 1500);
  var SIN_MEZCLA = /anteriores|\b(todas|ninguna|ambas)\b|^\s*(solo\s+)?[a-e]\s*(,|y|e|o|u)\s*[a-e]\b|\b(alternativas?|opci[oó]n(es)?|claves?)\s+[a-e]\b/i;
  function sePuedeMezclar(q) {
    var op = q && q.options;
    if (!Array.isArray(op) || op.length < 3) return false;
    if (typeof q.correct !== 'number' || q.correct < 0 || q.correct >= op.length) return false;
    return !op.some(function (o) { return SIN_MEZCLA.test(String(o && o.text || '').replace(/\$[^$]*\$/g, '')); });
  }
  // Generador con semilla (el mismo orden para la misma semilla)
  function azar(semilla) {
    if (semilla == null) return Math.random;
    var h = 1779033703 ^ String(semilla).length;
    for (var i = 0; i < String(semilla).length; i++) { h = Math.imul(h ^ String(semilla).charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
    return function () {
      h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909);
      var t = (h ^= h >>> 16) >>> 0;
      t = (t + 0x6D2B79F5) | 0; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  // Orden de las alternativas: orden[k] = posición original de la alternativa que se ve en k
  function ordenAlt(q, semilla) {
    var n = (q && q.options || []).length, o = [];
    for (var i = 0; i < n; i++) o.push(i);
    if (!altActivo() || !sePuedeMezclar(q)) return o;
    var r = azar(semilla);
    for (var j = n - 1; j > 0; j--) { var k = Math.floor(r() * (j + 1)), t = o[j]; o[j] = o[k]; o[k] = t; }
    return o;
  }
  // Copia de la pregunta con las alternativas en ese orden (las letras quedan A, B, C…)
  function conOrden(q, orden) {
    if (!q || esAbierta(q) || !Array.isArray(q.options) || !orden || orden.length !== q.options.length) return q;
    var c = Object.assign({}, q);
    c.options = orden.map(function (k, i) { return Object.assign({}, q.options[k], { letter: q.options[i].letter }); });
    c.correct = orden.indexOf(q.correct);
    c._orden = orden.slice();
    return c;
  }
  function mezclarAlt(q, semilla) { return conOrden(q, ordenAlt(q, semilla)); }

  function mezclar(arr, opciones) {
    var alt = !(opciones && opciones.alternativas === false);
    var grupos = [], idx = {};
    (arr || []).forEach(function (q) {
      var k = claveLectura(q && q.text);
      if (k && idx[k] != null) grupos[idx[k]].push(q);
      else { if (k) idx[k] = grupos.length; grupos.push([q]); }
    });
    for (var i = grupos.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = grupos[i]; grupos[i] = grupos[j]; grupos[j] = t; }
    var out = [];
    grupos.forEach(function (g) { g.forEach(function (q) { out.push(alt ? mezclarAlt(q) : q); }); });
    return rangos(out);
  }

  // ¿Las alternativas son tan cortas que caben en columnas?
  function cortas(options) {
    if (!options || options.length < 3) return false;
    return options.every(function (o) {
      var t = String(o.text || '').replace(/<\/?(u|i|b|em|strong|sub|sup)>/gi, '').replace(/\*/g, '');
      if (/\$|\n|<|\[IMG/.test(t)) return t.replace(/\$[^$]*\$/g, 'xxxxx').length <= 12 && !/\n|<|\[IMG/.test(t);
      return t.length <= 14;
    });
  }

  // Pinta la pregunta en una página de práctica.
  // el = { texto, grafico, opciones } (elementos); q = { text, graphic, options }
  function pintar(el, q) {
    var r = armar(q.text, { lecPos: q.lecPos });
    el.texto.innerHTML = r.html;
    burbuja(el.texto.closest('.question') || el.texto.parentNode, r.etiqueta);
    if (el.grafico) {
      if (q.graphic) { el.grafico.innerHTML = q.graphic; el.grafico.style.display = 'block'; }
      else { el.grafico.innerHTML = ''; el.grafico.style.display = 'none'; }
    }
    return r;
  }
  // Burbuja con el tipo de pregunta ([ETIQUETA: Sinónimos]); sin etiqueta no sale nada
  function burbuja(caja, texto) {
    if (!caja) return;
    var b = caja.querySelector(':scope > .mcq-etq');
    if (!texto) { if (b) b.remove(); caja.classList.remove('mcq-con-etq'); return; }
    if (!b) { b = document.createElement('span'); b.className = 'mcq-etq'; caja.insertBefore(b, caja.firstChild); }
    b.textContent = texto;
    caja.classList.add('mcq-con-etq');
  }

  // Después de crear las alternativas: columnas e imagen al lado (va dentro de la misma lista)
  function alternativas(lista, q, r) {
    var der = !!(r && r.derecha);
    analogias(lista, q);
    lista.classList.toggle('mcq-cortas', !der && cortas(q.options));
    lista.classList.toggle('mcq-con-der', der);
    if (der) {
      var fig = document.createElement('div'); fig.className = 'mcq-der'; fig.innerHTML = r.derecha;
      fig.style.gridRow = '1 / span ' + Math.max(1, q.options.length);
      lista.appendChild(fig);
    }
  }

  // Alternativas que son pares (potro : yegua): los dos puntos alineados en todas.
  // Sirve para cualquier lista cuyos hijos tengan .text (práctica, modo estudio).
  function analogias(lista, q) {
    if (!lista) return;
    var ops = q && q.options || [];
    var es = ops.length >= 2 && ops.every(function (o) { return esPar(o && o.text); });
    lista.classList.toggle('mcq-analogia', es);
    if (!es) return;
    var spans = [].slice.call(lista.querySelectorAll('.text, .opt-text')).slice(0, ops.length);
    if (spans.length !== ops.length) return;
    spans.forEach(function (sp, i) {
      var x = partirPar(ops[i].text);
      sp.innerHTML = '<span class="mcq-an"><span class="a">' + formato(x[0]) + '</span><span class="c">:</span><span class="b">' + formato(x[1]) + '</span></span>';
    });
    // El lado izquierdo con el mismo ancho en todas (se mide ya pintado)
    var medir = function () {
      var as = lista.querySelectorAll('.mcq-an .a'), w = 0;
      as.forEach(function (a) { a.style.minWidth = ''; });
      as.forEach(function (a) { w = Math.max(w, a.getBoundingClientRect().width); });
      if (w) as.forEach(function (a) { a.style.minWidth = Math.ceil(w) + 'px'; });
    };
    medir();
    if (window.requestAnimationFrame) requestAnimationFrame(medir);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(medir);
  }

  /* ---------- Fracciones grandes ----------
     KaTeX achica \frac dentro del texto y se lee mal: pasa a \dfrac, salvo
     dentro de un exponente, un subíndice u otra fracción.
     Se engancha a renderMathInElement, que usan todas las páginas. */
  function fraccionesGrandes(tex) {
    var out = '', i = 0;
    // Copia tal cual un argumento: {grupo}, \comando o un carácter
    function argumento() {
      var ini = i;
      while (i < tex.length && /\s/.test(tex[i])) i++;
      if (tex[i] === '{') {
        for (var n = 0; i < tex.length; i++) {
          if (tex[i] === '\\') { i++; continue; }
          if (tex[i] === '{') n++;
          else if (tex[i] === '}' && !--n) { i++; break; }
        }
      } else if (tex[i] === '\\') { var m = tex.slice(i).match(/^\\([a-zA-Z]+|.)/); i += m ? m[0].length : 1; }
      else i++;
      out += tex.slice(ini, i);
    }
    while (i < tex.length) {
      var ch = tex[i];
      if (ch === '\\') {
        var m = tex.slice(i).match(/^\\([a-zA-Z]+|.)/), cmd = m ? m[0] : ch;
        i += cmd.length;
        if (/^\\[dt]?frac$|^\\[dt]?binom$/.test(cmd)) {
          out += cmd === '\\frac' ? '\\dfrac' : cmd;
          argumento(); argumento(); // lo de adentro queda como está
        } else out += cmd;
        continue;
      }
      out += ch; i++;
      if (ch === '^' || ch === '_') argumento(); // exponentes y subíndices no se tocan
    }
    return out;
  }
  /* ---------- Fórmulas largas en celular ----------
     KaTeX solo puede bajar de línea después de un +, −, = … que esté
     "suelto". Dentro de \left( … \right) todo queda pegado en un bloque
     y en celular se sale de la tarjeta. Si lo de adentro es de una sola
     altura (sin fracciones, raíces, sumatorias…), \left y \right no
     hacen falta: se quitan y la fórmula ya puede partirse. */
  var ALTO = /\\(?:[dtc]?frac|over|atop|choose|[dt]?binom|sqrt|sum|prod|coprod|int|iint|iiint|oint|lim|limsup|liminf|max|min|sup|inf|begin|overbrace|underbrace|overset|underset|stackrel|substack|displaystyle|xrightarrow|xleftarrow|bigcup|bigcap)(?![a-zA-Z])|\\\\/;
  var DELIM = /^\s*(\\[a-zA-Z]+|\\.|.)/;
  function sinLeftRight(tex) {
    if (tex.indexOf('\\left') < 0) return tex;
    var re = /\\(left|right)(?![a-zA-Z])/g, m, pila = [], cambios = [];
    while ((m = re.exec(tex))) {
      var d = tex.slice(re.lastIndex).match(DELIM);
      if (!d) return tex;
      var tok = { ini: m.index, fin: re.lastIndex + d[0].length, del: d[1] };
      re.lastIndex = tok.fin;
      if (m[1] === 'left') { pila.push(tok); continue; }
      var a = pila.pop();
      if (!a) return tex; // \right sin pareja: no se toca nada
      if (!ALTO.test(tex.slice(a.fin, tok.ini))) cambios.push(a, tok);
    }
    if (pila.length) return tex;
    cambios.sort(function (x, y) { return y.ini - x.ini; });
    cambios.forEach(function (c) {
      var d = c.del === '.' ? '' : c.del;
      // {} evita que el delimitador se pegue a la letra siguiente (\left\langle x → \langle{}x)
      if (/^\\[a-zA-Z]+$/.test(d)) d += '{}';
      tex = tex.slice(0, c.ini) + d + tex.slice(c.fin);
    });
    return tex;
  }
  // Si aun así un pedazo no entra (por ejemplo una fracción muy ancha),
  // ese pedazo se desliza de lado en vez de salirse de la tarjeta
  function ajustarAnchos(raiz) {
    if (!raiz || !raiz.querySelectorAll) return;
    raiz.querySelectorAll('.katex:not(.katex-display .katex) > .katex-html > .base').forEach(function (b) {
      b.classList.remove('mcq-base-ancha');
      var caja = b.closest('.katex').parentElement;
      while (caja && getComputedStyle(caja).display.indexOf('inline') === 0) caja = caja.parentElement;
      if (caja && caja.clientWidth && b.getBoundingClientRect().width > caja.clientWidth + 1) b.classList.add('mcq-base-ancha');
    });
  }
  var porAjustar = [];
  window.addEventListener('resize', function () {
    clearTimeout(ajustarAnchos.t);
    ajustarAnchos.t = setTimeout(function () {
      porAjustar = porAjustar.filter(function (r) { return r.isConnected; });
      porAjustar.forEach(ajustarAnchos);
    }, 150);
  });
  function conFracciones(fn) {
    if (typeof fn !== 'function' || fn._mcFrac) return fn;
    var w = function (el, op) {
      op = Object.assign({}, op);
      var antes = op.preProcess;
      op.preProcess = function (t) { t = sinLeftRight(fraccionesGrandes(t)); return antes ? antes(t) : t; };
      var r = fn.call(this, el, op);
      try {
        ajustarAnchos(el);
        if (el && porAjustar.indexOf(el) < 0) porAjustar.push(el);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ajustarAnchos(el); });
      } catch (e) {}
      return r;
    };
    w._mcFrac = true;
    return w;
  }
  (function () {
    var actual = conFracciones(window.renderMathInElement);
    try {
      Object.defineProperty(window, 'renderMathInElement', {
        configurable: true, enumerable: true,
        get: function () { return actual; },
        set: function (f) { actual = conFracciones(f); }
      });
    } catch (e) { if (actual) window.renderMathInElement = actual; }
  })();

  var st = document.createElement('style');
  st.textContent =
    '.mcq-p{display:block;white-space:normal}.mcq-p+.mcq-p{margin-top:10px}' +
    '.mcq-con-etq{position:relative}' +
    '.mcq-etq{position:absolute;top:-13px;right:16px;z-index:1;max-width:60%;padding:4px 11px;border-radius:999px;background:#2A2052;border:2px solid #5B47A6;color:#EDE6FF;font:900 11.5px/1.2 Nunito,sans-serif;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:0 3px 0 rgba(0,0,0,.25);pointer-events:none}' +
    '.mcq-etq::after{content:"";position:absolute;left:16px;bottom:-6px;width:8px;height:8px;background:#2A2052;border:solid #5B47A6;border-width:0 2px 2px 0;transform:rotate(45deg)}' +
    'html[data-modo="claro"] .mcq-etq,html[data-modo="claro"] .mcq-etq::after{background:#EFEAFF;border-color:#B9A8F0;color:#3B2A80}' +
    '.mcq-par{display:grid;grid-template-columns:auto auto auto auto;justify-content:center;gap:4px 10px;margin:10px auto;font-weight:900;letter-spacing:.02em}' +
    '.mcq-par .a{text-align:right}.mcq-par .c,.mcq-an .c{color:#C6E000;font-weight:1000}.mcq-par .d{color:#C6E000;font-weight:1000;min-width:1em}' +
    '.mcq-an{display:inline-flex;align-items:baseline;gap:9px;flex-wrap:nowrap}.mcq-an .a{display:inline-block;text-align:right}' +
    '.mcq-p+.mcq-par,.mcq-par+.mcq-p{margin-top:10px}' +
    // Gráficos escritos como texto: colores por variables (oscuro, claro; el PDF pone los suyos)
    '.mcq-graf{margin:12px 0;display:flex;justify-content:center;--g-fondo:#18132B;--g-eje:#A99FC8;--g-tx:#E6E1F5;--g-tx2:#fff;--g-gu:#7A7199;--g-red:rgba(169,159,200,.14);--g-b:#C6E000;--g-b2:#C6E000;--g-rell:rgba(198,224,0,.16);--g-somb:rgba(198,224,0,.55);--g-lin:#7FD4FF;' +
    '--g1:#C6E000;--g2:#7FD4FF;--g3:#FF9F6B;--g4:#C59BFF;--g5:#FF6FAE;--g6:#5EE0A0;--g1f:rgba(198,224,0,.25);--g2f:rgba(127,212,255,.25);--g3f:rgba(255,159,107,.25);--g4f:rgba(197,155,255,.25);--g5f:rgba(255,111,174,.25);--g6f:rgba(94,224,160,.25)}' +
    '.mcq-graf svg{width:100%;height:auto;display:block;font-family:Nunito,Inter,sans-serif;overflow:visible}' +
    'html[data-modo="claro"] .mcq-graf{--g-fondo:#fff;--g-eje:#4A4560;--g-tx:#1E1A2E;--g-tx2:#1E1A2E;--g-gu:#9A94B0;--g-red:rgba(30,26,46,.08);--g-b:#3F4A00;--g-b2:#5B6B00;--g-rell:rgba(150,175,0,.16);--g-somb:rgba(110,130,0,.45);--g-lin:#1F7FB8;' +
    '--g1:#7E9100;--g2:#1F7FB8;--g3:#D2622A;--g4:#7A4FC9;--g5:#C9367A;--g6:#1E9A63;--g1f:rgba(126,145,0,.2);--g2f:rgba(31,127,184,.18);--g3f:rgba(210,98,42,.18);--g4f:rgba(122,79,201,.18);--g5f:rgba(201,54,122,.18);--g6f:rgba(30,154,99,.18)}' +
    '.mcq-der:has(.mcq-graf){background:none!important;padding:0!important}.mcq-der .mcq-graf{margin:0;width:100%}' +
    '.mcq-graf-error{margin:10px 0;padding:8px 12px;border-radius:10px;border:2px dashed #E03C3C;color:#FFB4B4;font-size:.85em;font-weight:700}' +
    '.mcq-img{margin:12px 0;display:flex;justify-content:center;background:#fff;border-radius:12px;padding:10px}' +
    '.mcq-img img,.mcq-der img{max-width:100%;height:auto;display:block;border-radius:6px}' +
    '.mcq-tabla{overflow-x:auto;margin:12px 0}.mcq-tabla table{border-collapse:collapse;margin:0 auto;font-size:.95em;font-variant-numeric:tabular-nums}' +
    '.mcq-tabla th,.mcq-tabla td{border:1px solid #3A3360;padding:6px 12px;text-align:center;white-space:nowrap}' +
    '.mcq-tabla th{background:rgba(198,224,0,.12);color:#f5ffcc;font-weight:700}' +
    '.mcq-int{display:inline-grid;grid-template-columns:auto minmax(1.6em,auto) auto minmax(1.6em,auto) auto;column-gap:.45em;align-items:baseline}.mcq-int-n{text-align:center}' +
    '.mcq-cols{display:grid;gap:6px 28px;margin:10px 0;overflow-x:auto;justify-content:start}.mcq-cols span{white-space:nowrap}' +
    '.mcq-cortas{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))}' +
    '.mcq-con-der{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,42%);column-gap:16px;align-items:start}' +
    '.mcq-con-der>*{grid-column:1}.mcq-con-der>.mcq-der{grid-column:2;align-self:stretch;background:#fff;border-radius:12px;padding:10px;display:flex;justify-content:center;align-items:center;box-sizing:border-box}' +
    // La imagen derecha toma el alto de las alternativas (no las estira ni las deja pegadas arriba)
    '@media (min-width:601px){.mcq-con-der>.mcq-der{position:relative;min-height:140px;background:none;padding:0}.mcq-con-der>.mcq-der img{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);max-width:100%;max-height:100%;width:auto;height:auto;box-sizing:border-box;background:#fff;padding:10px;border-radius:12px}}' +
    '.katex-display{overflow-x:auto;overflow-y:hidden;max-width:100%}.katex .base.mcq-base-ancha{display:block;max-width:100%;overflow-x:auto;overflow-y:hidden;padding-bottom:2px}'+
    '@media (max-width:600px){.mcq-ecs .katex-display{font-size:.85em}}' +
    '.mcq-ecs{display:flex;flex-wrap:wrap;justify-content:center;column-gap:2.5em}.mcq-ecs>span{max-width:100%;min-width:0}' +
    '.mcq-lec{margin:0 0 14px;padding:10px 14px;border-left:3px solid #c6e000;background:rgba(198,224,0,.07);border-radius:10px}' +
    '.mcq-lec summary{cursor:pointer;font-weight:800;letter-spacing:.05em;color:#f5ffcc;font-size:.85em}' +
    '.mcq-lec-pos{font-weight:500;letter-spacing:0;opacity:.75}' +
    '.mcq-lec:not([open]) summary::after{content:" · toca para leer";font-weight:400;letter-spacing:0;opacity:.7}' +
    '.mcq-lec p{margin:8px 0 0;line-height:1.6}' +
    '@media (max-width:600px){.mcq-cortas{grid-template-columns:repeat(2,minmax(0,1fr))}' +
    '.mcq-con-der{grid-template-columns:minmax(0,1fr)}.mcq-con-der>.mcq-der{grid-column:1;grid-row:auto!important;order:-1}}';
  document.head.appendChild(st);

  // Alternativas cortas en columnas: si alguna no cabe (palabra larga, letra grande),
  // pasan a 2 columnas y, si tampoco, a una sola
  var st2 = document.createElement('style');
  // La letra ya es gruesa (800): la negrita usa el peso más grueso de Nunito (1000) y blanco puro para que se note
  st2.textContent = '.qtext :is(strong,b),.question :is(strong,b),.option :is(strong,b),.opt-row :is(strong,b),.mcq-p :is(strong,b),.cara :is(strong,b){font-weight:1000;color:#fff}' +
    '.mcq-cortas.mcq-c2{grid-template-columns:repeat(2,minmax(0,1fr))}.mcq-cortas.mcq-c1{grid-template-columns:minmax(0,1fr)}';
  document.head.appendChild(st2);
  function noCabe(lista) {
    return [].some.call(lista.children, function (h) { return h.scrollWidth > h.clientWidth + 1; });
  }
  function ajustarCols(lista) {
    if (!lista.isConnected || !lista.clientWidth) return;
    lista.classList.remove('mcq-c2', 'mcq-c1');
    var tres = getComputedStyle(lista).gridTemplateColumns.split(' ').length >= 3;
    if (tres && noCabe(lista)) lista.classList.add('mcq-c2');
    if (noCabe(lista)) { lista.classList.remove('mcq-c2'); lista.classList.add('mcq-c1'); }
  }
  var vistas = window.ResizeObserver ? new ResizeObserver(function (es) { es.forEach(function (e) { ajustarCols(e.target); }); }) : null;
  function revisar(raiz) {
    var ls = raiz.classList && raiz.classList.contains('mcq-cortas') ? [raiz] : (raiz.querySelectorAll ? raiz.querySelectorAll('.mcq-cortas') : []);
    [].forEach.call(ls, function (l) { if (l._mcqVista) return; l._mcqVista = true; if (vistas) vistas.observe(l); ajustarCols(l); });
  }
  if (window.MutationObserver) new MutationObserver(function (ms) {
    ms.forEach(function (m) {
      [].forEach.call(m.addedNodes, function (n) { if (n.nodeType === 1) revisar(n); });
      if (m.type === 'attributes' && m.target.classList.contains('mcq-cortas')) revisar(m.target);
    });
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  // Cuando llega la letra Nunito el ancho cambia
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { [].forEach.call(document.querySelectorAll('.mcq-cortas'), ajustarCols); });

  /* ---------- Preguntas sin alternativas (Seminarios y Banqueo) ----------
     Todas llevan abierta: true, options: [], correct: 0 y respuestas
     (la respuesta en texto, para el modo estudio, reportes y el panel).
     tipo:
       (ninguno)    el alumno escribe; respuestas = las que valen. Si la
                    respuesta es un número ("2,5", "5/2", "12 m/s", "2,5 ± 0,1")
                    se compara como número.
       completar    huecos: [['Perú'], ['Lima', 'Lima Metropolitana']]; el
                    enunciado lleva [[1]], [[2]]… donde va cada espacio
       vf           afirmaciones: [{ texto, v: true|false }]
       relacionar   pares: [['Mitosis', 'Células somáticas'], …]
       ordenar      orden: ['primero', 'segundo', …]
       tocar        imagen: 'assets/img/…', zona: { x, y, r } (fracciones del ancho/alto)
     Acertar se guarda como la respuesta 0 (= correct) y fallar como -1. */
  function esAbierta(q) { return !!(q && q.abierta && Array.isArray(q.respuestas) && q.respuestas.length); }
  // Sin tildes, mayúsculas, signos ni espacios de más: "  Eratóstenes." = "eratostenes"
  function normal(s) {
    return String(s == null ? '' : s).replace(/<[^>]*>|\*|\$/g, '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
  // "2,5" · "-3" · "5/2" · "12 m/s" (la unidad no cuenta) → número; si no es un número, null
  function numero(s) {
    var t = String(s == null ? '' : s).replace(/\$/g, '').replace(/\\dfrac|\\frac/g, '').trim();
    var m = t.match(/^([-+−]?)\s*(\d+(?:[.,]\d+)?)(?:\s*\/\s*(\d+(?:[.,]\d+)?)|\s*\{\s*(\d+)\s*\}\s*\{\s*(\d+)\s*\})?\s*(?:[a-zA-Zµ°%²³/·.\s]{0,12})?$/);
    if (!m) return null;
    var a = parseFloat(m[2].replace(',', '.')), b = m[3] ? parseFloat(m[3].replace(',', '.')) : 1;
    if (m[4]) { a = +m[4]; b = +m[5]; }
    if (!b) return null;
    return (m[1] && m[1] !== '+' ? -1 : 1) * a / b;
  }
  // "2,5 ± 0,1" → { n: 2.5, tol: 0.1 } · "12 m/s" → { n: 12, tol: casi 0 } · texto → null
  function numerica(r) {
    var p = String(r).split(/\s*(?:±|\+-|\+\/-)\s*/);
    var n = numero(p[0]);
    if (n == null) return null;
    var tol = p[1] != null ? numero(p[1]) : null;
    return { n: n, tol: tol != null ? Math.abs(tol) : 1e-9 * Math.max(1, Math.abs(n)) };
  }
  function vale1(lista, texto) {
    var t = normal(texto), x = numero(texto);
    return !!t && (lista || []).some(function (r) {
      var nr = numerica(r);
      if (nr && x != null) return Math.abs(x - nr.n) <= nr.tol + 1e-12;
      return normal(String(r).replace(/\s*±.*$/, '')) === t;
    });
  }
  function acierta(q, texto) { return vale1(q.respuestas, texto); }
  // Texto que se muestra de una respuesta ("2,5 ± 0,1" se ve igual)
  function verResp(lista) { return (lista || []).map(formato).join('<span class="mcq-ab-o"> o </span>'); }

  var ICO_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
  var ICO_MAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  var ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  function barajar(n, semilla) {
    var o = [], r = azar(semilla), i;
    for (i = 0; i < n; i++) o.push(i);
    for (var vuelta = 0; vuelta < 5; vuelta++) {
      for (i = n - 1; i > 0; i--) { var k = Math.floor(r() * (i + 1)), t = o[i]; o[i] = o[k]; o[k] = t; }
      if (n < 2 || o.some(function (x, j) { return x !== j; })) break; // que no salga ya ordenado
    }
    return o;
  }
  // El mismo orden mezclado mientras la pregunta esté abierta (al volver atrás no cambia)
  function mezcla(q, n) { if (!q._mez || q._mez.length !== n) q._mez = barajar(n, Math.random()); return q._mez; }

  var TIPOS = {
    abierta: {
      vale: true,
      html: function (q, id) {
        return '<label class="mcq-ab-lbl" for="' + id + '">Escribe tu respuesta</label>' +
          '<input class="mcq-ab-in" id="' + id + '" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done" maxlength="200" placeholder="Tu respuesta"' +
          (q.respuestas.some(function (r) { return numerica(r); }) ? ' inputmode="decimal"' : '') + '>';
      },
      init: function (c) {
        var inp = c.caja.querySelector('.mcq-ab-in');
        inp.addEventListener('input', function () { c.listo(!!inp.value.trim()); });
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); c.enviar(); } });
        c.foco = inp;
      },
      leer: function (c) { return c.caja.querySelector('.mcq-ab-in').value.trim() || null; },
      revisar: function (q, d) { return vale1(q.respuestas, d); },
      bloquear: function (c, e) {
        var inp = c.caja.querySelector('.mcq-ab-in');
        inp.value = e.datos != null ? e.datos : (e.texto || ''); inp.disabled = true;
        inp.classList.toggle('bien', !!(e.ok || e.vale)); inp.classList.toggle('mal', !(e.ok || e.vale) && !e.nose);
      },
      solucion: function (q) { return verResp(q.respuestas); },
      mostrarSol: function (q, e) { return !e.ok || normal(e.datos || e.texto) !== normal(q.respuestas[0]) || q.respuestas.length > 1; }
    },
    completar: {
      vale: true,
      html: function () { return '<div class="mcq-ab-lbl">Completa los espacios del enunciado</div>'; },
      init: function (c) {
        var q = c.q, huecos = [].slice.call(c.raiz.querySelectorAll('.mcq-hueco'));
        // Si el enunciado no está a la mano, los espacios van en una lista
        if (huecos.length !== q.huecos.length) {
          c.caja.insertAdjacentHTML('afterbegin', '<div class="mcq-hlista">' + q.huecos.map(function (h, i) {
            return '<span>' + (i + 1) + '.</span><span class="mcq-hueco" data-n="' + (i + 1) + '"></span>';
          }).join('') + '</div>');
          huecos = [].slice.call(c.caja.querySelectorAll('.mcq-hueco'));
        }
        c.ins = huecos.map(function (h, i) {
          var largo = String(q.huecos[i][0] || '').length;
          var inp = document.createElement('input');
          inp.type = 'text'; inp.className = 'mcq-hueco-in'; inp.autocomplete = 'off'; inp.spellcheck = false;
          inp.setAttribute('autocapitalize', 'off'); inp.setAttribute('autocorrect', 'off'); inp.maxLength = 120;
          inp.setAttribute('aria-label', 'Espacio ' + (i + 1));
          inp.style.width = Math.min(14, Math.max(5, largo + 3)) + 'ch';
          h.textContent = ''; h.appendChild(inp);
          inp.addEventListener('input', function () { c.listo(c.ins.every(function (x) { return x.value.trim(); })); });
          inp.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            var sig = c.ins.filter(function (x) { return !x.value.trim(); })[0];
            if (sig) sig.focus(); else c.enviar();
          });
          return inp;
        });
        c.foco = c.ins[0];
      },
      leer: function (c) {
        var v = c.ins.map(function (x) { return x.value.trim(); });
        return v.every(Boolean) ? v : null;
      },
      revisar: function (q, d) { return q.huecos.every(function (h, i) { return vale1(h, d[i]); }); },
      bloquear: function (c, e) {
        var q = c.q;
        c.ins.forEach(function (inp, i) {
          var bien = !!(e.vale || (e.datos && vale1(q.huecos[i], e.datos[i])));
          inp.value = e.datos ? e.datos[i] : ''; inp.disabled = true;
          inp.classList.toggle('bien', bien); inp.classList.toggle('mal', !bien && !e.nose);
          var sol = inp.parentNode.querySelector('.mcq-hueco-sol');
          if (!bien && !sol) inp.insertAdjacentHTML('afterend', '<span class="mcq-hueco-sol">' + formato(q.huecos[i][0]) + '</span>');
        });
      },
      solucion: function (q) {
        return q.huecos.length === 1 ? verResp(q.huecos[0]) : '<ol class="mcq-ab-ol">' + q.huecos.map(function (h) { return '<li>' + verResp(h) + '</li>'; }).join('') + '</ol>';
      },
      mostrarSol: function (q, e) { return !e.ok; }
    },
    vf: {
      html: function (q) {
        return '<div class="mcq-ab-lbl">Marca V (verdadero) o F (falso) en cada una</div><div class="mcq-vf">' + q.afirmaciones.map(function (a, i) {
          return '<div class="mcq-vf-fila" data-i="' + i + '"><span class="mcq-vf-n">' + ROMANOS[i] + '</span><span class="mcq-vf-t">' + formato(a.texto) + '</span>' +
            '<span class="mcq-vf-bt"><button type="button" data-v="1" aria-label="Verdadero">V</button><button type="button" data-v="0" aria-label="Falso">F</button></span></div>';
        }).join('') + '</div>';
      },
      init: function (c) {
        c.sel = c.q.afirmaciones.map(function () { return null; });
        c.caja.querySelectorAll('.mcq-vf-fila').forEach(function (f) {
          var i = +f.dataset.i;
          f.querySelectorAll('button').forEach(function (b) {
            b.addEventListener('click', function () {
              if (c.cerrado) return;
              c.sel[i] = b.dataset.v === '1';
              f.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
              if (window.MCSonido && MCSonido.toque) try { MCSonido.toque(); } catch (e) {}
              c.listo(c.sel.every(function (x) { return x !== null; }));
            });
          });
        });
      },
      leer: function (c) { return c.sel.every(function (x) { return x !== null; }) ? c.sel.slice() : null; },
      revisar: function (q, d) { return q.afirmaciones.every(function (a, i) { return !!a.v === d[i]; }); },
      bloquear: function (c, e) {
        c.cerrado = true;
        c.caja.querySelectorAll('.mcq-vf-fila').forEach(function (f) {
          var i = +f.dataset.i, a = c.q.afirmaciones[i], d = e.datos ? e.datos[i] : null;
          f.querySelectorAll('button').forEach(function (b) {
            b.disabled = true;
            var v = b.dataset.v === '1';
            b.classList.toggle('on', d === v);
            b.classList.toggle('es', v === !!a.v);
          });
          f.classList.toggle('bien', d === !!a.v);
          f.classList.toggle('mal', d !== null && d !== !!a.v);
        });
      },
      solucion: function (q) { return q.afirmaciones.map(function (a) { return a.v ? 'V' : 'F'; }).join(''); },
      titulo: function (q, e) {
        if (e.ok || e.nose || !e.datos) return null;
        var m = q.afirmaciones.filter(function (a, i) { return !!a.v !== e.datos[i]; }).length;
        return 'Fallaste ' + m + ' de ' + q.afirmaciones.length + '. La respuesta es';
      },
      mostrarSol: function () { return true; }
    },
    relacionar: {
      html: function (q) {
        var orden = mezcla(q, q.pares.length);
        return '<div class="mcq-ab-lbl">Toca uno de la izquierda y luego su pareja</div><div class="mcq-rel">' +
          '<div class="mcq-rel-col">' + q.pares.map(function (p, i) { return '<button type="button" class="mcq-rel-i" data-i="' + i + '"><span class="mcq-rel-n">' + (i + 1) + '</span><span>' + formato(p[0]) + '</span></button>'; }).join('') + '</div>' +
          '<div class="mcq-rel-col">' + orden.map(function (k) { return '<button type="button" class="mcq-rel-d" data-k="' + k + '"><span class="mcq-rel-n"></span><span>' + formato(q.pares[k][1]) + '</span></button>'; }).join('') + '</div></div>';
      },
      init: function (c) {
        var n = c.q.pares.length;
        c.uni = []; for (var i = 0; i < n; i++) c.uni.push(null); // uni[i] = k (derecha elegida para la izquierda i)
        c.act = null;
        var izq = c.caja.querySelectorAll('.mcq-rel-i'), der = c.caja.querySelectorAll('.mcq-rel-d');
        function pintar() {
          izq.forEach(function (b) { var i = +b.dataset.i; b.classList.toggle('sel', c.act === i); b.classList.toggle('unido', c.uni[i] !== null); b.dataset.c = c.uni[i] !== null ? i % 6 : ''; });
          der.forEach(function (b) {
            var k = +b.dataset.k, i = c.uni.indexOf(k);
            b.classList.toggle('unido', i >= 0); b.dataset.c = i >= 0 ? i % 6 : '';
            b.querySelector('.mcq-rel-n').textContent = i >= 0 ? i + 1 : '';
          });
          c.listo(c.uni.every(function (x) { return x !== null; }));
        }
        function toque() { if (window.MCSonido && MCSonido.toque) try { MCSonido.toque(); } catch (e) {} }
        izq.forEach(function (b) {
          b.addEventListener('click', function () {
            if (c.cerrado) return;
            var i = +b.dataset.i;
            if (c.uni[i] !== null) c.uni[i] = null; // tocar uno ya unido lo suelta
            c.act = c.act === i ? null : i;
            toque(); pintar();
          });
        });
        der.forEach(function (b) {
          b.addEventListener('click', function () {
            if (c.cerrado) return;
            var k = +b.dataset.k, ya = c.uni.indexOf(k);
            if (c.act === null) {
              if (ya >= 0) { c.uni[ya] = null; toque(); pintar(); }
              else { // sin elegir a la izquierda: va con la primera libre
                var libre = c.uni.indexOf(null);
                if (libre >= 0) { c.uni[libre] = k; toque(); pintar(); }
              }
              return;
            }
            if (ya >= 0) c.uni[ya] = null;
            c.uni[c.act] = k; c.act = null;
            toque(); pintar();
          });
        });
        c.pintarRel = pintar;
      },
      leer: function (c) { return c.uni.every(function (x) { return x !== null; }) ? c.uni.slice() : null; },
      revisar: function (q, d) { return d.every(function (k, i) { return k === i; }); },
      bloquear: function (c, e) {
        c.cerrado = true;
        if (e.datos) { c.uni = e.datos.slice(); c.act = null; c.pintarRel(); }
        c.caja.querySelectorAll('.mcq-rel-i').forEach(function (b) {
          var i = +b.dataset.i; b.disabled = true;
          b.classList.toggle('bien', !!e.datos && e.datos[i] === i);
          b.classList.toggle('mal', !!e.datos && e.datos[i] !== i);
        });
        c.caja.querySelectorAll('.mcq-rel-d').forEach(function (b) { b.disabled = true; });
      },
      solucion: function (q) {
        return '<div class="mcq-ab-pares">' + q.pares.map(function (p, i) { return '<div>' + (i + 1) + '. ' + formato(p[0]) + ' <span class="mcq-ab-fl">→</span> ' + formato(p[1]) + '</div>'; }).join('') + '</div>';
      },
      titulo: function (q, e) {
        if (e.ok || e.nose || !e.datos) return null;
        var m = e.datos.filter(function (k, i) { return k !== i; }).length;
        return 'Fallaste ' + m + ' de ' + q.pares.length + '. Así van';
      },
      mostrarSol: function () { return true; }
    },
    ordenar: {
      html: function (q) {
        var orden = mezcla(q, q.orden.length);
        return '<div class="mcq-ab-lbl">Tócalos en orden: primero, segundo…</div><div class="mcq-ord">' +
          orden.map(function (k) { return '<button type="button" class="mcq-ord-i" data-k="' + k + '"><span class="mcq-ord-n"></span><span>' + formato(q.orden[k]) + '</span></button>'; }).join('') + '</div>';
      },
      init: function (c) {
        c.sec = [];
        var bs = c.caja.querySelectorAll('.mcq-ord-i');
        function pintar() {
          bs.forEach(function (b) { var p = c.sec.indexOf(+b.dataset.k); b.classList.toggle('on', p >= 0); b.querySelector('.mcq-ord-n').textContent = p >= 0 ? p + 1 : ''; });
          c.listo(c.sec.length === c.q.orden.length);
        }
        bs.forEach(function (b) {
          b.addEventListener('click', function () {
            if (c.cerrado) return;
            var k = +b.dataset.k, p = c.sec.indexOf(k);
            if (p >= 0) c.sec.splice(p, 1); else c.sec.push(k); // tocarlo otra vez lo quita
            if (window.MCSonido && MCSonido.toque) try { MCSonido.toque(); } catch (e) {}
            pintar();
          });
        });
        c.pintarOrd = pintar;
      },
      leer: function (c) { return c.sec.length === c.q.orden.length ? c.sec.slice() : null; },
      revisar: function (q, d) { return d.every(function (k, i) { return k === i; }); },
      bloquear: function (c, e) {
        c.cerrado = true;
        if (e.datos) { c.sec = e.datos.slice(); c.pintarOrd(); }
        c.caja.querySelectorAll('.mcq-ord-i').forEach(function (b) {
          var k = +b.dataset.k, p = e.datos ? e.datos.indexOf(k) : -1;
          b.disabled = true;
          b.classList.toggle('bien', p === k); b.classList.toggle('mal', !!e.datos && p !== k);
        });
      },
      solucion: function (q) { return '<ol class="mcq-ab-ol">' + q.orden.map(function (t) { return '<li>' + formato(t) + '</li>'; }).join('') + '</ol>'; },
      titulo: function (q, e) {
        if (e.ok || e.nose || !e.datos) return null;
        return 'No es ese orden. El correcto es';
      },
      mostrarSol: function () { return true; }
    },
    tocar: {
      html: function (q) {
        return '<div class="mcq-ab-lbl">Toca la imagen donde está la respuesta</div><div class="mcq-tocar"><img src="' + esc(RAIZ + q.imagen) + '" alt="Imagen para tocar" draggable="false">' +
          '<span class="mcq-tocar-zona" hidden></span><span class="mcq-tocar-pin" hidden></span></div>';
      },
      init: function (c) {
        var cont = c.caja.querySelector('.mcq-tocar'), img = cont.querySelector('img'), pin = cont.querySelector('.mcq-tocar-pin');
        c.punto = null;
        cont.addEventListener('click', function (e) {
          if (c.cerrado) return;
          var b = img.getBoundingClientRect();
          if (!b.width) return;
          var x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height;
          if (x < 0 || y < 0 || x > 1 || y > 1) return;
          c.punto = { x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 };
          ponerPin(pin, c.punto); pin.hidden = false;
          if (window.MCSonido && MCSonido.toque) try { MCSonido.toque(); } catch (e2) {}
          c.listo(true);
        });
      },
      leer: function (c) { return c.punto; },
      revisar: function (q, d) { return dentroZona(q, d); },
      bloquear: function (c, e) {
        c.cerrado = true;
        var cont = c.caja.querySelector('.mcq-tocar'), pin = cont.querySelector('.mcq-tocar-pin'), zona = cont.querySelector('.mcq-tocar-zona');
        cont.classList.add('cerrado');
        ponerZona(zona, c.q.zona); zona.hidden = false;
        if (e.datos) { ponerPin(pin, e.datos); pin.hidden = false; pin.classList.toggle('bien', !!e.ok); pin.classList.toggle('mal', !e.ok); }
      },
      solucion: function () { return 'La zona correcta está marcada con el círculo verde.'; },
      titulo: function (q, e) { return e.ok ? '¡Correcto!' : e.nose ? 'La respuesta está aquí' : 'No es ahí. La respuesta'; },
      mostrarSol: function (q, e) { return !e.ok; }
    }
  };
  function ponerPin(pin, p) { pin.style.left = (p.x * 100) + '%'; pin.style.top = (p.y * 100) + '%'; }
  function ponerZona(z, zona) {
    // r es fracción del ancho; el círculo se ajusta a la proporción de la imagen con aspect-ratio
    z.style.left = (zona.x * 100) + '%'; z.style.top = (zona.y * 100) + '%'; z.style.width = (zona.r * 200) + '%';
  }
  function dentroZona(q, p) {
    if (!p || !q.zona) return false;
    var img = q._prop || 1; // alto/ancho de la imagen (se mide al pintarla)
    var dx = p.x - q.zona.x, dy = (p.y - q.zona.y) * img;
    return Math.sqrt(dx * dx + dy * dy) <= q.zona.r;
  }
  function tipoDe(q) { return !esAbierta(q) ? '' : TIPOS[q.tipo] ? q.tipo : 'abierta'; }

  // Pinta la respuesta en lugar de las alternativas (el nombre viene de la primera, la abierta).
  // o.previo = { datos, ok, vale, nose } si ya respondió (se ve bloqueado)
  // o.responder({ datos, ok, nose }) al comprobar · o.vale() si dice que su respuesta también vale
  // r = lo que devolvió pintar() (para la imagen derecha)
  function cuadroAbierto(lista, q, o, r) {
    o = o || {};
    var T = TIPOS[tipoDe(q)] || TIPOS.abierta;
    lista.classList.remove('mcq-cortas', 'mcq-con-der', 'mcq-c1', 'mcq-c2');
    lista.classList.add('mcq-abierta');
    var id = 'mcqAb' + Math.random().toString(36).slice(2, 7);
    lista.innerHTML = (r && r.derecha ? '<div class="mcq-img">' + r.derecha + '</div>' : '') +
      '<div class="mcq-ab mcq-t-' + tipoDe(q) + '">' + T.html(q, id) +
        '<div class="mcq-ab-fila"><button type="button" class="mcq-ab-nose">No la sé</button><button type="button" class="mcq-ab-ok" disabled>Comprobar</button></div>' +
        '<div class="mcq-ab-res" hidden></div>' +
      '</div>';
    var ok = lista.querySelector('.mcq-ab-ok'), nose = lista.querySelector('.mcq-ab-nose');
    var res = lista.querySelector('.mcq-ab-res'), fila = lista.querySelector('.mcq-ab-fila');
    var estado = o.previo ? Object.assign({}, o.previo) : null;
    if (estado && estado.datos === undefined && estado.texto !== undefined) estado.datos = estado.texto;
    var c = { q: q, lista: lista, caja: lista.querySelector('.mcq-ab'), raiz: lista.parentNode || lista,
      listo: function (b) { ok.disabled = !b; }, enviar: function () { enviar(false); } };
    if (q.tipo === 'tocar') { // proporción de la imagen, para que la zona sea un círculo
      var im = c.caja.querySelector('.mcq-tocar img');
      var medir = function () { if (im.naturalWidth) q._prop = im.naturalHeight / im.naturalWidth; };
      if (im.complete) medir(); else im.addEventListener('load', medir);
    }
    T.init(c);
    function render() {
      try { if (window.renderMathInElement) renderMathInElement(res, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false }); } catch (e) {}
    }
    function mostrar() {
      if (!estado) return;
      fila.hidden = true;
      T.bloquear(c, estado);
      var bien = estado.ok || estado.vale;
      var tit = T.titulo && T.titulo(q, estado);
      var h = '<div class="mcq-ab-tit">' + (bien ? ICO_OK : ICO_MAL) +
        (tit || (estado.ok ? '¡Correcto!' : estado.vale ? 'Contada como correcta' : estado.nose ? 'La respuesta es' : 'No coincide. La respuesta es')) + '</div>';
      if (!T.mostrarSol || T.mostrarSol(q, estado)) h += '<div class="mcq-ab-sol">' + (bien && q.tipo !== 'tocar' ? 'Respuesta: ' : '') + '<b>' + T.solucion(q) + '</b></div>';
      if (T.vale && !estado.ok && !estado.vale && !estado.nose) h += '<button type="button" class="mcq-ab-vale">Mi respuesta también vale</button>';
      res.innerHTML = h; res.hidden = false;
      res.className = 'mcq-ab-res ' + (bien ? 'ok' : 'bad');
      var v = res.querySelector('.mcq-ab-vale');
      if (v) v.addEventListener('click', function () {
        estado.vale = true; mostrar();
        if (o.vale) o.vale();
      });
      render();
    }
    function enviar(sinSaber) {
      if (estado) return;
      var d = sinSaber ? null : T.leer(c);
      if (!sinSaber && d == null) { if (c.foco) c.foco.focus(); return; }
      estado = { datos: d, ok: !sinSaber && T.revisar(q, d), nose: !!sinSaber };
      if (typeof d === 'string') estado.texto = d;
      mostrar();
      if (o.responder) o.responder(Object.assign({}, estado));
    }
    ok.addEventListener('click', function () { enviar(false); });
    nose.addEventListener('click', function () { enviar(true); });
    if (estado) mostrar();
    return { foco: function () { if (!estado && c.foco) c.foco.focus(); } };
  }

  // Respuesta para leer (modo estudio, panel): HTML con la solución según el tipo
  function solucion(q) {
    var t = tipoDe(q);
    if (!t) return '';
    if (t === 'vf') return '<div class="mcq-sol mcq-sol-vf">' + q.afirmaciones.map(function (a, i) {
      return '<span class="mcq-vf-n">' + ROMANOS[i] + '</span><span>' + formato(a.texto) + '</span><b class="' + (a.v ? 'v' : 'f') + '">' + (a.v ? 'V' : 'F') + '</b>';
    }).join('') + '</div>';
    if (t === 'relacionar') return '<div class="mcq-sol">' + TIPOS.relacionar.solucion(q) + '</div>';
    if (t === 'ordenar') return '<div class="mcq-sol">' + TIPOS.ordenar.solucion(q) + '</div>';
    if (t === 'completar') return '<div class="mcq-sol">' + TIPOS.completar.solucion(q) + '</div>';
    if (t === 'tocar') return '<div class="mcq-sol"><div class="mcq-tocar cerrado"><img src="' + esc(RAIZ + q.imagen) + '" alt="Imagen con la zona correcta" loading="lazy">' +
      '<span class="mcq-tocar-zona" style="left:' + (q.zona.x * 100) + '%;top:' + (q.zona.y * 100) + '%;width:' + (q.zona.r * 200) + '%"></span></div></div>';
    return '<div class="mcq-sol">' + verResp(q.respuestas) + '</div>';
  }
  // En el modo estudio: escribe la respuesta en cada espacio del enunciado
  function llenarHuecos(el, q) {
    if (!q || q.tipo !== 'completar' || !el) return;
    el.querySelectorAll('.mcq-hueco').forEach(function (h) {
      var x = q.huecos[+h.dataset.n - 1];
      if (x) { h.innerHTML = formato(x[0]); h.classList.add('lleno'); }
    });
  }
  // Nombre del tipo, para el panel
  var NOMBRE_TIPO = { abierta: 'Respuesta abierta', completar: 'Completar espacios', vf: 'Verdadero o falso', relacionar: 'Relacionar', ordenar: 'Ordenar', tocar: 'Tocar en la imagen' };
  function nombreTipo(q) { var t = tipoDe(q); return t === 'abierta' && q.respuestas.some(numerica) ? 'Respuesta numérica' : NOMBRE_TIPO[t] || ''; }

  var st3 = document.createElement('style');
  st3.textContent =
    '.mcq-abierta{display:block!important}' +
    '.mcq-ab{display:flex;flex-direction:column;gap:10px}' +
    '.mcq-ab-lbl{font:900 12px/1.3 Nunito,Inter,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#9a9a9a}' +
    '.mcq-ab-in{width:100%;font:800 17px/1.3 Nunito,Inter,sans-serif;color:#f2f2f2;background:#1E1935;border:2px solid #2F284E;border-bottom-width:5px;border-radius:16px;padding:14px 16px;outline:none;-webkit-appearance:none}' +
    '.mcq-ab-in::placeholder{color:#555}' +
    '.mcq-ab-in:focus,.mcq-hueco-in:focus{border-color:#C6E000}' +
    '.mcq-ab-in:disabled,.mcq-hueco-in:disabled{opacity:1;-webkit-text-fill-color:currentColor}' +
    '.mcq-ab-in.bien,.mcq-hueco-in.bien{border-color:#58CC02;border-bottom-color:#3f9a00;background:rgba(88,204,2,.1);color:#E3FFD0}' +
    '.mcq-ab-in.mal,.mcq-hueco-in.mal{border-color:#E03C3C;border-bottom-color:#9e2525;background:rgba(224,60,60,.1);color:#ffd6d6}' +
    '.mcq-ab-fila{display:flex;gap:10px}.mcq-ab-fila[hidden]{display:none}' +
    '.mcq-ab-fila button{font:900 15px Nunito,Inter,sans-serif;border-radius:16px;padding:13px 14px;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    '.mcq-ab-nose{flex:0 0 auto;background:#1F1936;color:#cfcfcf;border:2px solid #322B52;border-bottom-width:5px}' +
    '.mcq-ab-nose:active{transform:translateY(3px);border-bottom-width:2px;margin-bottom:3px}' +
    '.mcq-ab-ok{flex:1;background:#C6E000;color:#2b3300;border:2px solid #C6E000;box-shadow:0 5px 0 #8fa300;margin-bottom:5px}' +
    '.mcq-ab-ok:active:not(:disabled){transform:translateY(5px);box-shadow:none}' +
    '.mcq-ab-ok:disabled{opacity:.4;cursor:default}' +
    '.mcq-ab-res{border:2px solid transparent;border-radius:14px;padding:12px 14px;font:800 14px/1.5 Nunito,Inter,sans-serif;display:flex;flex-direction:column;gap:6px}' +
    '.mcq-ab-res.ok{background:rgba(88,204,2,.08);border-color:rgba(88,204,2,.35);color:#7EE03A}' +
    '.mcq-ab-res.bad{background:rgba(224,60,60,.08);border-color:rgba(224,60,60,.4);color:#ffb3b3}' +
    '.mcq-ab-tit{display:flex;align-items:center;gap:8px;font-weight:900}.mcq-ab-tit svg{width:18px;height:18px;flex-shrink:0}' +
    '.mcq-ab-sol{color:#f2f2f2;font-size:15px}.mcq-ab-sol b{font-weight:1000;color:#fff}.mcq-ab-o{font-weight:600;color:#9a9a9a}' +
    '.mcq-ab-ol{margin:4px 0 0 1.4em;padding:0;display:flex;flex-direction:column;gap:3px}' +
    '.mcq-ab-pares{display:flex;flex-direction:column;gap:5px;margin-top:2px}.mcq-ab-fl{color:#C6E000}' +
    '.mcq-ab-vale{align-self:flex-start;margin-top:4px;font:900 13.5px Nunito,Inter,sans-serif;color:#e6e6e6;background:#1F1936;border:2px solid #322B52;border-bottom-width:4px;border-radius:12px;padding:9px 12px;cursor:pointer}' +
    '.mcq-ab-vale:active{transform:translateY(2px);border-bottom-width:2px;margin-bottom:2px}' +
    // Completar: espacios dentro del enunciado
    '.mcq-hueco{display:inline-block;min-width:4.5em;border-bottom:2px solid #C6E000;margin:0 2px;line-height:1.2;vertical-align:baseline}' +
    '.mcq-hueco:empty::before{content:"\\00a0"}' +
    '.mcq-hueco.lleno{color:#f5ffcc;font-weight:1000;padding:0 4px;background:rgba(198,224,0,.1);border-radius:4px 4px 0 0}' +
    '.mcq-hueco:has(input){border:0;min-width:0;display:inline;margin:0}' +
    '.mcq-hueco-in{display:inline-block;vertical-align:middle;font:800 max(16px,.9em)/1.2 Nunito,Inter,sans-serif;color:#f2f2f2;background:#1E1935;border:2px solid #2F284E;border-bottom-width:4px;border-radius:10px;padding:5px 8px;margin:2px 0;outline:none;max-width:100%;-webkit-appearance:none}' +
    '.mcq-hueco-sol{margin-left:6px;font-weight:1000;color:#58CC02;white-space:nowrap}' +
    '.mcq-hlista{display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px 10px;align-items:center;font:800 15px Nunito,Inter,sans-serif;color:#9a9a9a}' +
    // V o F
    '.mcq-vf{display:flex;flex-direction:column;gap:9px}' +
    '.mcq-vf-fila{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;background:#1E1935;border:2px solid #2F284E;border-bottom-width:5px;border-radius:16px;padding:10px 10px 10px 12px}' +
    '.mcq-vf-n{font:900 13px Nunito,Inter,sans-serif;color:#C6E000;min-width:1.6em}' +
    '.mcq-vf-t{font:800 15px/1.45 Nunito,Inter,sans-serif;color:#dcdcdc;min-width:0}' +
    '.mcq-vf-bt{display:flex;gap:6px}' +
    '.mcq-vf-bt button{width:42px;height:42px;border-radius:12px;font:1000 16px Nunito,Inter,sans-serif;color:#cfcfcf;background:#231D3C;border:2px solid #352E58;border-bottom-width:4px;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    '.mcq-vf-bt button.on{background:#2c3400;border-color:#C6E000;color:#f5ffcc}' +
    '.mcq-vf-bt button:disabled{cursor:default}' +
    '.mcq-vf-fila.bien{border-color:#58CC02;border-bottom-color:#3f9a00;background:rgba(88,204,2,.08)}' +
    '.mcq-vf-fila.mal{border-color:#E03C3C;border-bottom-color:#9e2525;background:rgba(224,60,60,.08)}' +
    '.mcq-vf-fila.mal button.on{background:#E03C3C;border-color:#E03C3C;color:#fff}' +
    '.mcq-vf-fila.mal button.es{outline:2px dashed #C6E000;outline-offset:2px}' +
    // Relacionar
    '.mcq-rel{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px}' +
    '.mcq-rel-col{display:flex;flex-direction:column;gap:9px}' +
    '.mcq-rel button{display:flex;align-items:center;gap:8px;text-align:left;width:100%;min-height:52px;font:800 14.5px/1.35 Nunito,Inter,sans-serif;color:#dcdcdc;background:#1E1935;border:2px solid #2F284E;border-bottom-width:5px;border-radius:14px;padding:9px 10px;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    '.mcq-rel button:disabled{cursor:default}' +
    '.mcq-rel-n{flex:0 0 auto;width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;font:1000 13px Nunito,Inter,sans-serif;background:#292245;color:#888;border:2px solid #352E58}' +
    '.mcq-rel-d .mcq-rel-n:empty{background:transparent;border-style:dashed}' +
    '.mcq-rel button.sel{border-color:#C6E000;background:#1f2400}' +
    '.mcq-rel button[data-c="0"] .mcq-rel-n{background:#C6E000;border-color:#C6E000;color:#2b3300}' +
    '.mcq-rel button[data-c="1"] .mcq-rel-n{background:#4FC3F7;border-color:#4FC3F7;color:#06303f}' +
    '.mcq-rel button[data-c="2"] .mcq-rel-n{background:#FFB74D;border-color:#FFB74D;color:#3d2400}' +
    '.mcq-rel button[data-c="3"] .mcq-rel-n{background:#CE93D8;border-color:#CE93D8;color:#2e0a36}' +
    '.mcq-rel button[data-c="4"] .mcq-rel-n{background:#80CBC4;border-color:#80CBC4;color:#05302c}' +
    '.mcq-rel button[data-c="5"] .mcq-rel-n{background:#F48FB1;border-color:#F48FB1;color:#3d0618}' +
    '.mcq-rel button.unido{border-color:#3A3360}' +
    '.mcq-rel-i.bien{border-color:#58CC02!important;border-bottom-color:#3f9a00!important}' +
    '.mcq-rel-i.mal{border-color:#E03C3C!important;border-bottom-color:#9e2525!important}' +
    // Ordenar
    '.mcq-ord{display:flex;flex-direction:column;gap:9px}' +
    '.mcq-ord-i{display:flex;align-items:center;gap:10px;text-align:left;width:100%;font:800 15px/1.4 Nunito,Inter,sans-serif;color:#dcdcdc;background:#1E1935;border:2px solid #2F284E;border-bottom-width:5px;border-radius:14px;padding:11px 12px;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    '.mcq-ord-i:disabled{cursor:default}' +
    '.mcq-ord-n{flex:0 0 auto;width:28px;height:28px;border-radius:9px;display:flex;align-items:center;justify-content:center;font:1000 14px Nunito,Inter,sans-serif;border:2px dashed #3A3360;color:#2b3300}' +
    '.mcq-ord-i.on{border-color:#3d4a00}.mcq-ord-i.on .mcq-ord-n{background:#C6E000;border:2px solid #C6E000}' +
    '.mcq-ord-i.bien{border-color:#58CC02;border-bottom-color:#3f9a00;background:rgba(88,204,2,.08)}' +
    '.mcq-ord-i.mal{border-color:#E03C3C;border-bottom-color:#9e2525;background:rgba(224,60,60,.08)}.mcq-ord-i.mal .mcq-ord-n{background:#E03C3C;border-color:#E03C3C;color:#fff}' +
    // Tocar en la imagen
    '.mcq-tocar{position:relative;background:#fff;border-radius:14px;padding:0;overflow:hidden;cursor:crosshair;line-height:0;align-self:center;max-width:100%}' +
    '.mcq-tocar.cerrado{cursor:default}' +
    '.mcq-tocar img{display:block;max-width:100%;max-height:70vh;width:auto;height:auto;user-select:none;-webkit-user-select:none}' +
    '.mcq-tocar-pin{position:absolute;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;background:#C6E000;border:3px solid #19142E;box-shadow:0 0 0 3px #C6E000;pointer-events:none}' +
    '.mcq-tocar-pin.mal{background:#E03C3C;box-shadow:0 0 0 3px #E03C3C}' +
    '.mcq-tocar-zona{position:absolute;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;border:3px solid #2e9e00;background:rgba(198,224,0,.25);pointer-events:none}' +
    // Modo estudio y panel
    '.mcq-sol{font:800 15px/1.5 Nunito,Inter,sans-serif;color:#f5ffcc}' +
    '.mcq-sol-vf{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px 10px;align-items:center}' +
    '.mcq-sol-vf b{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-weight:1000}' +
    '.mcq-sol-vf b.v{background:#C6E000;color:#2b3300}.mcq-sol-vf b.f{background:#E03C3C;color:#fff}' +
    '.mcq-sol .mcq-tocar{display:inline-block}' +
    '@media (max-width:420px){.mcq-rel button{font-size:13.5px;padding:8px}.mcq-vf-bt button{width:38px;height:38px}}';
  document.head.appendChild(st3);

  window.MCPregunta = {
    grafico: Graf,
    esAbierta: esAbierta, acierta: acierta, burbuja: burbuja, normal: normal, numero: numero, cuadroAbierto: cuadroAbierto, solucion: solucion, llenarHuecos: llenarHuecos, nombreTipo: nombreTipo, tipoDe: tipoDe, analogias: analogias, esPar: esPar, armar: armar, pintar: pintar, alternativas: alternativas, cortas: cortas, formato: formato, sinLectura: sinLectura, mezclar: mezclar, rangos: rangos,
    ordenAlt: ordenAlt, conOrden: conOrden, mezclarAlt: mezclarAlt, sePuedeMezclar: sePuedeMezclar, raiz: RAIZ };
})();
