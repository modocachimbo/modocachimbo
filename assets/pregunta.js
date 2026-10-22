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
    if (el.grafico) {
      if (q.graphic) { el.grafico.innerHTML = q.graphic; el.grafico.style.display = 'block'; }
      else { el.grafico.innerHTML = ''; el.grafico.style.display = 'none'; }
    }
    return r;
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
  function conFracciones(fn) {
    if (typeof fn !== 'function' || fn._mcFrac) return fn;
    var w = function (el, op) {
      op = Object.assign({}, op);
      var antes = op.preProcess;
      op.preProcess = function (t) { t = fraccionesGrandes(t); return antes ? antes(t) : t; };
      return fn.call(this, el, op);
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
    '.mcq-par{display:grid;grid-template-columns:auto auto auto auto;justify-content:center;gap:4px 10px;margin:10px auto;font-weight:900;letter-spacing:.02em}' +
    '.mcq-par .a{text-align:right}.mcq-par .c,.mcq-an .c{color:#C6E000;font-weight:1000}.mcq-par .d{color:#C6E000;font-weight:1000;min-width:1em}' +
    '.mcq-an{display:inline-flex;align-items:baseline;gap:9px;flex-wrap:nowrap}.mcq-an .a{display:inline-block;text-align:right}' +
    '.mcq-p+.mcq-par,.mcq-par+.mcq-p{margin-top:10px}' +
    '.mcq-img{margin:12px 0;display:flex;justify-content:center;background:#fff;border-radius:12px;padding:10px}' +
    '.mcq-img img,.mcq-der img{max-width:100%;height:auto;display:block;border-radius:6px}' +
    '.mcq-tabla{overflow-x:auto;margin:12px 0}.mcq-tabla table{border-collapse:collapse;margin:0 auto;font-size:.95em;font-variant-numeric:tabular-nums}' +
    '.mcq-tabla th,.mcq-tabla td{border:1px solid #3a3a3a;padding:6px 12px;text-align:center;white-space:nowrap}' +
    '.mcq-tabla th{background:rgba(198,224,0,.12);color:#f5ffcc;font-weight:700}' +
    '.mcq-cols{display:grid;gap:6px 28px;margin:10px 0;overflow-x:auto;justify-content:start}.mcq-cols span{white-space:nowrap}' +
    '.mcq-cortas{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))}' +
    '.mcq-con-der{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,42%);column-gap:16px;align-items:start}' +
    '.mcq-con-der>*{grid-column:1}.mcq-con-der>.mcq-der{grid-column:2;align-self:stretch;background:#fff;border-radius:12px;padding:10px;display:flex;justify-content:center;align-items:center;box-sizing:border-box}' +
    // La imagen derecha toma el alto de las alternativas (no las estira ni las deja pegadas arriba)
    '@media (min-width:601px){.mcq-con-der>.mcq-der{position:relative;min-height:140px;background:none;padding:0}.mcq-con-der>.mcq-der img{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);max-width:100%;max-height:100%;width:auto;height:auto;box-sizing:border-box;background:#fff;padding:10px;border-radius:12px}}' +
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
    '.mcq-ab-in{width:100%;font:800 17px/1.3 Nunito,Inter,sans-serif;color:#f2f2f2;background:#151515;border:2px solid #2a2a2a;border-bottom-width:5px;border-radius:16px;padding:14px 16px;outline:none;-webkit-appearance:none}' +
    '.mcq-ab-in::placeholder{color:#555}' +
    '.mcq-ab-in:focus,.mcq-hueco-in:focus{border-color:#C6E000}' +
    '.mcq-ab-in:disabled,.mcq-hueco-in:disabled{opacity:1;-webkit-text-fill-color:currentColor}' +
    '.mcq-ab-in.bien,.mcq-hueco-in.bien{border-color:#58CC02;border-bottom-color:#3f9a00;background:rgba(88,204,2,.1);color:#E3FFD0}' +
    '.mcq-ab-in.mal,.mcq-hueco-in.mal{border-color:#E03C3C;border-bottom-color:#9e2525;background:rgba(224,60,60,.1);color:#ffd6d6}' +
    '.mcq-ab-fila{display:flex;gap:10px}.mcq-ab-fila[hidden]{display:none}' +
    '.mcq-ab-fila button{font:900 15px Nunito,Inter,sans-serif;border-radius:16px;padding:13px 14px;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    '.mcq-ab-nose{flex:0 0 auto;background:#161616;color:#cfcfcf;border:2px solid #2e2e2e;border-bottom-width:5px}' +
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
    '.mcq-ab-vale{align-self:flex-start;margin-top:4px;font:900 13.5px Nunito,Inter,sans-serif;color:#e6e6e6;background:#161616;border:2px solid #2e2e2e;border-bottom-width:4px;border-radius:12px;padding:9px 12px;cursor:pointer}' +
    '.mcq-ab-vale:active{transform:translateY(2px);border-bottom-width:2px;margin-bottom:2px}' +
    // Completar: espacios dentro del enunciado
    '.mcq-hueco{display:inline-block;min-width:4.5em;border-bottom:2px solid #C6E000;margin:0 2px;line-height:1.2;vertical-align:baseline}' +
    '.mcq-hueco:empty::before{content:"\\00a0"}' +
    '.mcq-hueco.lleno{color:#f5ffcc;font-weight:1000;padding:0 4px;background:rgba(198,224,0,.1);border-radius:4px 4px 0 0}' +
    '.mcq-hueco:has(input){border:0;min-width:0;display:inline;margin:0}' +
    '.mcq-hueco-in{display:inline-block;vertical-align:middle;font:800 max(16px,.9em)/1.2 Nunito,Inter,sans-serif;color:#f2f2f2;background:#151515;border:2px solid #2a2a2a;border-bottom-width:4px;border-radius:10px;padding:5px 8px;margin:2px 0;outline:none;max-width:100%;-webkit-appearance:none}' +
    '.mcq-hueco-sol{margin-left:6px;font-weight:1000;color:#58CC02;white-space:nowrap}' +
    '.mcq-hlista{display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px 10px;align-items:center;font:800 15px Nunito,Inter,sans-serif;color:#9a9a9a}' +
    // V o F
    '.mcq-vf{display:flex;flex-direction:column;gap:9px}' +
    '.mcq-vf-fila{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;background:#151515;border:2px solid #2a2a2a;border-bottom-width:5px;border-radius:16px;padding:10px 10px 10px 12px}' +
    '.mcq-vf-n{font:900 13px Nunito,Inter,sans-serif;color:#C6E000;min-width:1.6em}' +
    '.mcq-vf-t{font:800 15px/1.45 Nunito,Inter,sans-serif;color:#dcdcdc;min-width:0}' +
    '.mcq-vf-bt{display:flex;gap:6px}' +
    '.mcq-vf-bt button{width:42px;height:42px;border-radius:12px;font:1000 16px Nunito,Inter,sans-serif;color:#cfcfcf;background:#1b1b1b;border:2px solid #333;border-bottom-width:4px;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    '.mcq-vf-bt button.on{background:#2c3400;border-color:#C6E000;color:#f5ffcc}' +
    '.mcq-vf-bt button:disabled{cursor:default}' +
    '.mcq-vf-fila.bien{border-color:#58CC02;border-bottom-color:#3f9a00;background:rgba(88,204,2,.08)}' +
    '.mcq-vf-fila.mal{border-color:#E03C3C;border-bottom-color:#9e2525;background:rgba(224,60,60,.08)}' +
    '.mcq-vf-fila.mal button.on{background:#E03C3C;border-color:#E03C3C;color:#fff}' +
    '.mcq-vf-fila.mal button.es{outline:2px dashed #C6E000;outline-offset:2px}' +
    // Relacionar
    '.mcq-rel{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px}' +
    '.mcq-rel-col{display:flex;flex-direction:column;gap:9px}' +
    '.mcq-rel button{display:flex;align-items:center;gap:8px;text-align:left;width:100%;min-height:52px;font:800 14.5px/1.35 Nunito,Inter,sans-serif;color:#dcdcdc;background:#151515;border:2px solid #2a2a2a;border-bottom-width:5px;border-radius:14px;padding:9px 10px;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    '.mcq-rel button:disabled{cursor:default}' +
    '.mcq-rel-n{flex:0 0 auto;width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;font:1000 13px Nunito,Inter,sans-serif;background:#222;color:#888;border:2px solid #333}' +
    '.mcq-rel-d .mcq-rel-n:empty{background:transparent;border-style:dashed}' +
    '.mcq-rel button.sel{border-color:#C6E000;background:#1f2400}' +
    '.mcq-rel button[data-c="0"] .mcq-rel-n{background:#C6E000;border-color:#C6E000;color:#2b3300}' +
    '.mcq-rel button[data-c="1"] .mcq-rel-n{background:#4FC3F7;border-color:#4FC3F7;color:#06303f}' +
    '.mcq-rel button[data-c="2"] .mcq-rel-n{background:#FFB74D;border-color:#FFB74D;color:#3d2400}' +
    '.mcq-rel button[data-c="3"] .mcq-rel-n{background:#CE93D8;border-color:#CE93D8;color:#2e0a36}' +
    '.mcq-rel button[data-c="4"] .mcq-rel-n{background:#80CBC4;border-color:#80CBC4;color:#05302c}' +
    '.mcq-rel button[data-c="5"] .mcq-rel-n{background:#F48FB1;border-color:#F48FB1;color:#3d0618}' +
    '.mcq-rel button.unido{border-color:#3a3a3a}' +
    '.mcq-rel-i.bien{border-color:#58CC02!important;border-bottom-color:#3f9a00!important}' +
    '.mcq-rel-i.mal{border-color:#E03C3C!important;border-bottom-color:#9e2525!important}' +
    // Ordenar
    '.mcq-ord{display:flex;flex-direction:column;gap:9px}' +
    '.mcq-ord-i{display:flex;align-items:center;gap:10px;text-align:left;width:100%;font:800 15px/1.4 Nunito,Inter,sans-serif;color:#dcdcdc;background:#151515;border:2px solid #2a2a2a;border-bottom-width:5px;border-radius:14px;padding:11px 12px;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    '.mcq-ord-i:disabled{cursor:default}' +
    '.mcq-ord-n{flex:0 0 auto;width:28px;height:28px;border-radius:9px;display:flex;align-items:center;justify-content:center;font:1000 14px Nunito,Inter,sans-serif;border:2px dashed #3a3a3a;color:#2b3300}' +
    '.mcq-ord-i.on{border-color:#3d4a00}.mcq-ord-i.on .mcq-ord-n{background:#C6E000;border:2px solid #C6E000}' +
    '.mcq-ord-i.bien{border-color:#58CC02;border-bottom-color:#3f9a00;background:rgba(88,204,2,.08)}' +
    '.mcq-ord-i.mal{border-color:#E03C3C;border-bottom-color:#9e2525;background:rgba(224,60,60,.08)}.mcq-ord-i.mal .mcq-ord-n{background:#E03C3C;border-color:#E03C3C;color:#fff}' +
    // Tocar en la imagen
    '.mcq-tocar{position:relative;background:#fff;border-radius:14px;padding:0;overflow:hidden;cursor:crosshair;line-height:0;align-self:center;max-width:100%}' +
    '.mcq-tocar.cerrado{cursor:default}' +
    '.mcq-tocar img{display:block;max-width:100%;max-height:70vh;width:auto;height:auto;user-select:none;-webkit-user-select:none}' +
    '.mcq-tocar-pin{position:absolute;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;background:#C6E000;border:3px solid #111;box-shadow:0 0 0 3px #C6E000;pointer-events:none}' +
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
    esAbierta: esAbierta, acierta: acierta, normal: normal, numero: numero, cuadroAbierto: cuadroAbierto, solucion: solucion, llenarHuecos: llenarHuecos, nombreTipo: nombreTipo, tipoDe: tipoDe, analogias: analogias, esPar: esPar, armar: armar, pintar: pintar, alternativas: alternativas, cortas: cortas, formato: formato, sinLectura: sinLectura, mezclar: mezclar, rangos: rangos,
    ordenAlt: ordenAlt, conOrden: conOrden, mezclarAlt: mezclarAlt, sePuedeMezclar: sePuedeMezclar, raiz: RAIZ };
})();
