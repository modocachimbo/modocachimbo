/* =========================================================
   Modo Cachimbo · Cómo se ve el enunciado de una pregunta
   Lo usan las páginas de práctica y el panel. Entiende:
     [IMG:assets/img/…]       imagen en esa línea (centrada)
     [IMG-DER:assets/img/…]   imagen al lado de las alternativas
     | a | b | c |            tabla (si la 2.ª fila es |---|, la 1.ª es título)
     I. CaO || p) cal viva    columnas sin bordes (separadas por ||)
     **negrita**, *cursiva*, <u>subrayado</u>, $fórmulas$
     [TEXTO 03] … [/TEXTO]    lectura que comparten varias preguntas
                              (va al inicio; se ve en un recuadro plegable)
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
    e = e.replace(/&lt;u&gt;(.+?)&lt;\/u&gt;/g, '<u>$1</u>');
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
  function esTabla(l) { return /^\|.*\|$/.test(l); }
  function esColumnas(l) { return !esTabla(l) && /\s\|\|\s/.test(l); }
  function celdas(l) { return l.replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); }); }

  // texto → { html, derecha }  (derecha = html de la imagen al lado de las alternativas)
  // opts.marca(n, derecha) → html para [IMAGEN] sin pegar todavía (solo en el panel)
  function armar(texto, opts) {
    opts = opts || {};
    var lineas = String(texto || '').replace(/\r/g, '').split('\n');
    var partes = [], parrafo = [], derecha = '', nMarca = 0;
    function cerrarParrafo() {
      if (!parrafo.length) return;
      partes.push('<span class="mcq-p">' + parrafo.map(formato).join('<br>') + '</span>');
      parrafo = [];
    }
    for (var i = 0; i < lineas.length; i++) {
      var l = lineas[i].trim(), m;
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
    return { html: partes.join(''), derecha: derecha };
  }

  // Texto sin la lectura compartida (para extractos y mensajes)
  function sinLectura(texto) {
    var lineas = String(texto || '').replace(/\r/g, '').split('\n'), out = [], dentro = false;
    lineas.forEach(function (l) {
      var t = l.trim();
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
  setTimeout(function () {
    if (!window.MCAuth || !MCAuth.listo) return;
    MCAuth.listo.then(function (c) { return c.from('ajustes').select('valor').eq('clave', 'practica').maybeSingle(); })
      .then(function (r) {
        if (!r || r.error) return;
        var v = r.data && r.data.valor;
        try { localStorage.setItem(K_ALT, v && v.mezclar === false ? '0' : '1'); } catch (e) {}
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
    if (!q || !Array.isArray(q.options) || !orden || orden.length !== q.options.length) return q;
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
      var t = String(o.text || '');
      if (/\$|\n|<|\[IMG/.test(t)) return t.replace(/\$[^$]*\$/g, 'xxxxx').length <= 12 && !/\n|<|\[IMG/.test(t);
      return t.length <= 14;
    });
  }

  // Pinta la pregunta en una página de práctica.
  // el = { texto, grafico, opciones } (elementos); q = { text, graphic, options }
  function pintar(el, q) {
    var r = armar(q.text, { lecPos: q.lecPos });
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
    '.katex-display{overflow-x:auto;overflow-y:hidden;max-width:100%}@media (max-width:600px){.mcq-ecs .katex-display{font-size:.85em}}' +
    '.mcq-ecs{display:flex;flex-wrap:wrap;justify-content:center;column-gap:2.5em}.mcq-ecs>span{max-width:100%;min-width:0}' +
    '.mcq-lec{margin:0 0 14px;padding:10px 14px;border-left:3px solid #c6e000;background:rgba(198,224,0,.07);border-radius:10px}' +
    '.mcq-lec summary{cursor:pointer;font-weight:800;letter-spacing:.05em;color:#f5ffcc;font-size:.85em}' +
    '.mcq-lec-pos{font-weight:500;letter-spacing:0;opacity:.75}' +
    '.mcq-lec:not([open]) summary::after{content:" · toca para leer";font-weight:400;letter-spacing:0;opacity:.7}' +
    '.mcq-lec p{margin:8px 0 0;line-height:1.6}' +
    '@media (max-width:600px){.mcq-cortas{grid-template-columns:repeat(2,minmax(0,1fr))}' +
    '.mcq-con-der{grid-template-columns:minmax(0,1fr)}.mcq-con-der>.mcq-der{grid-column:1;grid-row:auto!important;order:-1}}';
  document.head.appendChild(st);

  window.MCPregunta = { armar: armar, pintar: pintar, alternativas: alternativas, cortas: cortas, formato: formato, sinLectura: sinLectura, mezclar: mezclar, rangos: rangos,
    ordenAlt: ordenAlt, conOrden: conOrden, mezclarAlt: mezclarAlt, sePuedeMezclar: sePuedeMezclar, raiz: RAIZ };
})();
