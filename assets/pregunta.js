/* =========================================================
   Modo Cachimbo · Cómo se ve el enunciado de una pregunta
   Lo usan las páginas de práctica y el panel. Entiende:
     [IMG:assets/img/…]       imagen en esa línea (centrada)
     [IMG-DER:assets/img/…]   imagen a la derecha de las alternativas
     [IMG-IZQ:assets/img/…]   imagen a la izquierda de las alternativas
     | a | b | c |            tabla (si la 2.ª fila es |---|, la 1.ª es título)
     I. CaO || p) cal viva    columnas sin bordes (separadas por ||)
     **negrita**, *cursiva*, <u>subrayado</u>, $fórmulas$
   En el panel, [IMAGEN], [IMAGEN DERECHA] e [IMAGEN IZQUIERDA] son las marcas que
   escribe el profesor; al publicar se cambian por [IMG:…].
   ========================================================= */
(function () {
  var script = document.currentScript;
  var RAIZ = script ? new URL('../', script.src).href : '/';
  var RUTA = /^assets\/img\/[\w\-./]+\.(webp|jpe?g|png|gif|svg)$/i;

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function formato(s) {
    var e = esc(s);
    e = e.replace(/&lt;u&gt;(.+?)&lt;\/u&gt;/g, '<u>$1</u>');
    e = e.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    e = e.replace(/\*(.+?)\*/g, '<em>$1</em>');
    return e;
  }
  function img(ruta) {
    return '<img class="mc-img" src="' + esc(RAIZ + ruta) + '" alt="Figura de la pregunta" loading="lazy">';
  }

  var RX_IMG = /^\[IMG(-DER|-IZQ)?:\s*([^\]\s]+)\s*\]$/i;
  var RX_MARCA = /^\[IMAGEN(\s+DERECHA|\s+IZQUIERDA)?\]$/i;
  function esTabla(l) { return /^\|.*\|$/.test(l); }
  function esColumnas(l) { return !esTabla(l) && /\s\|\|\s/.test(l); }
  function celdas(l) { return l.replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); }); }

  // texto → { html, derecha, izq }  (derecha = html de la imagen al lado de las alternativas; izq = va a la izquierda)
  // opts.marca(n, derecha) → html para [IMAGEN] sin pegar todavía (solo en el panel)
  function armar(texto, opts) {
    opts = opts || {};
    var lineas = String(texto || '').replace(/\r/g, '').split('\n');
    var partes = [], parrafo = [], derecha = '', izq = false, nMarca = 0;
    function cerrarParrafo() {
      if (!parrafo.length) return;
      partes.push('<span class="mcq-p">' + parrafo.map(formato).join('<br>') + '</span>');
      parrafo = [];
    }
    for (var i = 0; i < lineas.length; i++) {
      var l = lineas[i].trim(), m;
      if ((m = l.match(RX_IMG))) {
        cerrarParrafo();
        if (!RUTA.test(m[2])) continue;
        if (m[1]) { if (!derecha) { derecha = img(m[2]); izq = /izq/i.test(m[1]); } }
        else partes.push('<div class="mcq-img">' + img(m[2]) + '</div>');
        continue;
      }
      if ((m = l.match(RX_MARCA))) {
        cerrarParrafo();
        var h = opts.marca ? opts.marca(nMarca++, !!m[1]) : '';
        if (m[1]) { if (!derecha) { derecha = h; izq = /izq/i.test(m[1]); } } else if (h) partes.push('<div class="mcq-img">' + h + '</div>');
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
          '<tbody>' + cuerpo.map(function (f) { return '<tr>' + celdas(f).map(function (c) { return '<td>' + formato(c) + '</td>'; }).join('') + '</tr>'; }).join('') +
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
      if (!l) { cerrarParrafo(); continue; }
      parrafo.push(l);
    }
    cerrarParrafo();
    return { html: partes.join(''), derecha: derecha, izq: izq };
  }

  // ¿Las alternativas son tan cortas que caben en columnas?
  function cortas(options) {
    if (!options || options.length < 3) return false;
    return options.every(function (o) {
      var t = String(o.text || '');
      if (/\$|\n|<|\[IMG/.test(t)) return t.replace(/\$[^$]*\$/g, 'xxxxx').length <= 12 && !/\n|<|\[IMG/.test(t);
      return t.length <= 14;
    });
  }

  // Pinta la pregunta en una página de práctica.
  // el = { texto, grafico, opciones } (elementos); q = { text, graphic, options }
  function pintar(el, q) {
    var r = armar(q.text);
    el.texto.innerHTML = r.html;
    if (el.grafico) {
      if (q.graphic) { el.grafico.innerHTML = q.graphic; el.grafico.style.display = 'block'; }
      else { el.grafico.innerHTML = ''; el.grafico.style.display = 'none'; }
    }
    return r;
  }
  // Después de crear las alternativas: columnas e imagen al lado (va dentro de la misma lista)
  function alternativas(lista, q, r) {
    var der = !!(r && r.derecha);
    lista.classList.toggle('mcq-cortas', !der && cortas(q.options));
    lista.classList.toggle('mcq-con-der', der);
    lista.classList.toggle('mcq-izq', der && !!r.izq);
    if (der) {
      var fig = document.createElement('div'); fig.className = 'mcq-der'; fig.innerHTML = r.derecha;
      fig.style.gridRow = '1 / span ' + Math.max(1, q.options.length);
      lista.appendChild(fig);
    }
  }

  var st = document.createElement('style');
  st.textContent =
    '.mcq-p{display:block;white-space:normal}.mcq-p+.mcq-p{margin-top:10px}' +
    '.mcq-img{margin:12px 0;display:flex;justify-content:center;background:#fff;border-radius:12px;padding:10px}' +
    '.mcq-img img,.mcq-der img{max-width:100%;height:auto;display:block;border-radius:6px}' +
    '.mcq-tabla{overflow-x:auto;margin:12px 0}.mcq-tabla table{border-collapse:collapse;margin:0 auto;font-size:.95em;font-variant-numeric:tabular-nums}' +
    '.mcq-tabla th,.mcq-tabla td{border:1px solid #3a3a3a;padding:6px 12px;text-align:center;white-space:nowrap}' +
    '.mcq-tabla th{background:rgba(198,224,0,.12);color:#f5ffcc;font-weight:700}' +
    '.mcq-cols{display:grid;gap:6px 28px;margin:10px 0;overflow-x:auto;justify-content:start}.mcq-cols span{white-space:nowrap}' +
    '.mcq-cortas{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))}' +
    '.mcq-con-der{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,42%);column-gap:16px;align-items:start}' +
    '.mcq-con-der>*{grid-column:1}.mcq-con-der>.mcq-der{grid-column:2;align-self:center;background:#fff;border-radius:12px;padding:10px;display:flex;justify-content:center}' +
    '.mcq-con-der.mcq-izq{grid-template-columns:minmax(0,42%) minmax(0,1fr)}.mcq-izq>*{grid-column:2}.mcq-izq>.mcq-der{grid-column:1}' +
    '@media (max-width:600px){.mcq-cortas{grid-template-columns:repeat(2,minmax(0,1fr))}' +
    '.mcq-con-der,.mcq-con-der.mcq-izq{grid-template-columns:minmax(0,1fr)}.mcq-con-der>*{grid-column:1}.mcq-con-der>.mcq-der{grid-column:1;grid-row:auto!important;order:-1}}';
  document.head.appendChild(st);

  window.MCPregunta = { armar: armar, pintar: pintar, alternativas: alternativas, cortas: cortas, formato: formato, raiz: RAIZ };
})();
