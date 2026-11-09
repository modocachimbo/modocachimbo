/* =========================================================
   Modo Cachimbo · Descarga en PDF (con marca de agua y N.º único)
   ---------------------------------------------------------
   Cada página que permite descargar llama a MCDescarga.registrar({...})
   o se reconoce sola (tema.html de Libros/Seminarios/Banqueo y ver.html
   de Exámenes). Las demás avisan con un evento cuando tienen sus datos:
     window.MC_SET = { tipo: 'fijas' | 'falladas', ... } + evento 'mc:set-listo'
     window.MC_SIM = { nombre, tipo, minutos, preguntas }  + evento 'mc:sim-listo'
     window.MC_TARJETAS = { titulo, sub, cartas }           + evento 'mc:tarjetas-listo'
   El botón solo aparece si el panel tiene las descargas prendidas y ese tipo
   permitido (ajustes 'descargas', supabase/53-descargas-pdf.sql). Si el alumno
   no tiene el paquete descarga-VIP, sale con candado y al tocarlo pide el código.
   Al descargar:
     1) pedir_descarga revisa sesión, código, bloqueo y límite, y da el N.º.
     2) El PDF se arma aquí mismo: cada hoja es una página A4 armada a mano
        (dos columnas, preguntas que no se parten, alternativas que pasan a
        menos columnas si no caben en una línea), se pasa a imagen con
        html2canvas y se junta con jsPDF. Al ser imagen, la marca de agua
        no se puede borrar editando el PDF.
   Los colores y tamaños del PDF están juntos en ESTILO (abajo): cambiar el
   formato más adelante es tocar solo ese bloque.
   Todos los PDF (simulacro, exámenes, temas, fijas, falladas, vocabulario y flashcards):
   el alumno elige el formato al descargar (MODELOS):
     Formato 1 · portada clara con lomo y una área por columna
     Formato 2 · portada oscura y preguntas en cápsulas
   La portada lleva un búho al azar (assets/buho/simulacro) y el N.º del simulacro.
   ========================================================= */
(function () {
  if (window.MCDescarga) return;

  /* ---------- Dónde está el sitio (para cargar candado.js y las imágenes) ---------- */
  var SRC = (document.currentScript && document.currentScript.src) || '';
  var RAIZ = SRC ? SRC.replace(/assets\/[^\/]*$/, '') : new URL('./', location.href).href;

  var CDN = {
    jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    h2c: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    katexCss: 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css',
    katex: 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js',
    auto: 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js',
    fuentes: 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;0,900;1,900&family=Nunito:wght@400;700;800;900&display=swap'
  };

  var TIPOS = { libro: 'Libros', seminario: 'Seminarios', banqueo: 'Banqueo', fijas: 'Fijas', falladas: 'Mis falladas', simulacro: 'Simulacro', examen: 'Exámenes', vocabulario: 'Vocabulario', tarjetas: 'Flashcards' };
  var AREAS = {
    comunicacion: { nom: 'Comunicación', cursos: ['lenguaje', 'literatura', 'raz-verbal'] },
    matematica: { nom: 'Matemática', cursos: ['algebra', 'aritmetica', 'geometria', 'trigonometria', 'estadistica'] },
    'ciencia-tecnologia': { nom: 'Ciencia y Tecnología', cursos: ['biologia', 'quimica', 'fisica', 'anatomia'] },
    'ciencias-sociales': { nom: 'Ciencias Sociales', cursos: ['historia-universal', 'historia-peru', 'geografia', 'psicologia', 'filosofia', 'economia', 'ciudadania'] }
  };
  var ORDEN_AREAS = ['comunicacion', 'matematica', 'ciencia-tecnologia', 'ciencias-sociales'];
  var AREA_DE = {}; ORDEN_AREAS.forEach(function (a) { AREAS[a].cursos.forEach(function (c) { AREA_DE[c] = a; }); });
  var NOM_CURSO = { lenguaje: 'Lenguaje', literatura: 'Literatura', 'raz-verbal': 'Razonamiento Verbal', algebra: 'Álgebra', aritmetica: 'Aritmética', geometria: 'Geometría', trigonometria: 'Trigonometría', estadistica: 'Estadística',
    biologia: 'Biología', quimica: 'Química', fisica: 'Física', anatomia: 'Anatomía', 'historia-universal': 'Historia Universal', 'historia-peru': 'Historia del Perú', geografia: 'Espacio Geográfico', psicologia: 'Psicología', filosofia: 'Filosofía', economia: 'Economía', ciudadania: 'Ciudadanía' };

  /* ==========================================================
     ESTILO DEL PDF: colores por área (versiones oscuras que se leen
     impresas en blanco y negro) y medidas. Todo el formato está aquí.
     ========================================================== */
  var ESTILO = {
    tinta: '#1B2A4A',
    marca: 'rgba(27,42,74,.065)',
    area: {
      comunicacion: { c: '#7B3FC4', o: '#5E2A9E', s: '#F2EAFB', l: '#7B3FC4' },
      matematica: { c: '#0B6BCB', o: '#0A4F94', s: '#E8F1FB', l: '#6E9400' },
      'ciencia-tecnologia': { c: '#4F7A00', o: '#3D5E00', s: '#EFF6DC', l: '#4F7A00' },
      'ciencias-sociales': { c: '#C25400', o: '#9A4300', s: '#FDF0E3', l: '#C25400' },
      general: { c: '#0B6BCB', o: '#0A4F94', s: '#E8F1FB', l: '#6E9400' }
    },
    // Colores de la ventana (pantalla oscura del sitio)
    pantalla: { comunicacion: '#CE82FF', matematica: '#1CB0F6', 'ciencia-tecnologia': '#C6E000', 'ciencias-sociales': '#FF9600', general: '#1CB0F6' },
    letra: 13.4,          // px del texto de las preguntas (a 96 ppp ≈ 10 pt)
    hoja: { w: 794, h: 1123, arriba: 91, abajo: 68, lado: 53, sep: 34, gap: 16 },  // A4 vertical en px (96 ppp)
    imgAlto: 160,         // alto máximo de un gráfico (px a 96 ppp ≈ 4,2 cm); se achica hasta imgMin si así entra en el hueco
    imgMin: 90,
    escala: 2             // nitidez de la imagen (2 ≈ 192 ppp)
  };
  var PX_MM = 794 / 210;
  var FUENTES = ['800 20px "Barlow Condensed"', '600 20px "Barlow Condensed"', '700 20px "Barlow Condensed"', '900 20px "Barlow Condensed"', 'italic 900 20px "Barlow Condensed"', '400 14px Nunito', '700 14px Nunito', '800 14px Nunito', '900 14px Nunito'];

  /* ---------- Formatos del simulacro (el alumno elige uno al descargar) ---------- */
  // Fuentes de KaTeX: se piden antes de dibujar (si no, la primera descarga sacaba las letras de las fórmulas movidas)
  var FUENTES_KATEX = ['20px KaTeX_Main', 'italic 20px KaTeX_Main', 'bold 20px KaTeX_Main', 'italic 20px KaTeX_Math', 'bold italic 20px KaTeX_Math', '20px KaTeX_AMS', '20px KaTeX_Size1', '20px KaTeX_Size2', '20px KaTeX_Size3', '20px KaTeX_Size4'];
  var MODELOS = {
    1: { nombre: 'Formato 1', desc: 'Portada clara · una área por columna' },
    2: { nombre: 'Formato 2', desc: 'Portada oscura · preguntas en cápsulas' }
  };
  var K_MODELO = 'mc_pdf_modelo';
  // Búhos de la portada (assets/buho/simulacro/<nombre>.webp): sale uno al azar en cada descarga.
  // grande: la imagen es ancha (el búho ocupa poco) y se dibuja más grande para que el búho mida lo mismo
  var BUHOS = [{ n: 'nota20' }, { n: 'postulante' }, { n: 'portapapeles' }, { n: 'feliz20' }, { n: 'escalera', grande: 1.32 }];

  /* ---------- Utilidades ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function cargarJs(src) {
    return new Promise(function (ok, mal) {
      if (document.querySelector('script[data-mcd="' + src + '"]')) { var s0 = document.querySelector('script[data-mcd="' + src + '"]'); if (s0.dataset.listo) return ok(); s0.addEventListener('load', function () { ok(); }); s0.addEventListener('error', mal); return; }
      var s = document.createElement('script'); s.src = src; s.async = true; s.dataset.mcd = src;
      s.onload = function () { s.dataset.listo = '1'; ok(); }; s.onerror = function () { mal(new Error('No se pudo cargar ' + src)); };
      document.head.appendChild(s);
    });
  }
  function cargarCss(href) {
    if (document.querySelector('link[href="' + href + '"]')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l);
  }
  function rpc(nombre, args) {
    if (!window.MCAuth) return Promise.reject(new Error('sin conexión'));
    return MCAuth.listo.then(function (c) { return c.rpc(nombre, args || {}); }).then(function (r) { if (r.error) throw r.error; return r.data; });
  }
  function areaDePagina() { return document.documentElement.getAttribute('data-area') || ''; }
  function slug(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'PDF'; }
  function normal(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
  function areaPorNombre(n) {
    n = normal(n);
    if (/comunic/.test(n)) return 'comunicacion';
    if (/matem/.test(n)) return 'matematica';
    if (/ciencia y tec|tecnolog|cta/.test(n)) return 'ciencia-tecnologia';
    if (/social|ccss|humanid/.test(n)) return 'ciencias-sociales';
    return '';
  }
  function cursoPorNombre(n) {
    n = normal(n); var k;
    for (k in NOM_CURSO) if (normal(NOM_CURSO[k]) === n || k === n) return k;
    if (/geograf/.test(n)) return 'geografia';
    if (/verbal/.test(n)) return 'raz-verbal';
    if (/historia.*peru/.test(n)) return 'historia-peru';
    if (/historia/.test(n)) return 'historia-universal';
    return '';
  }

  /* ---------- Ajustes del panel (se leen como mucho cada 10 min) ---------- */
  var K_CFG = 'mc_desc_cfg';
  var DEF = { activo: false, abierto: false, ficha: true, limite_dia: 10, limite_mes: 0, tipos: {} };
  var pedidoCfg = null;
  function cfg() {
    if (pedidoCfg) return pedidoCfg;
    var g = null; try { g = JSON.parse(leer(K_CFG) || 'null'); } catch (e) {}
    if (g && Date.now() - g.t < 10 * 60000) return (pedidoCfg = Promise.resolve(Object.assign({}, DEF, g.v)));
    pedidoCfg = !window.MCAuth ? Promise.resolve(Object.assign({}, DEF, g && g.v)) : MCAuth.listo
      .then(function (c) { return c.from('ajustes').select('valor').eq('clave', 'descargas').maybeSingle(); })
      .then(function (r) {
        var v = (r && !r.error && r.data && r.data.valor) || {};
        guardar(K_CFG, JSON.stringify({ t: Date.now(), v: v }));
        return Object.assign({}, DEF, v);
      }, function () { return Object.assign({}, DEF, g && g.v); });
    return pedidoCfg;
  }
  // El equipo (quien abrió Panel → Descargas) ve el botón aunque esté apagado, para probarlo
  function esEquipo() { return leer('mc_desc_equipo') === '1'; }

  /* ---------- Contenido: texto de preguntas con imágenes, tablas y fórmulas ---------- */
  // Fórmulas largas con «y» en medio se parten en dos líneas en vez de achicarse
  function partirFormulas(t) {
    var SEP = /^(\\q?quad\s*\\text\{\s*(?:y|e|o)\s*\}\s*\\q?quad|\\qquad)/;
    return String(t || '').replace(/\$\$([\s\S]+?)\$\$/g, function (m, f) {
      // {\large\displaystyle …}: se quita la llave de afuera (y el tamaño, que en la columna no cabe) para poder partirla
      var pre = '', env = /^\{\s*((?:\\(?:tiny|small|normalsize|large|Large|LARGE|huge|Huge|displaystyle|textstyle)\s*)+)([\s\S]*)\}$/.exec(f.trim());
      if (env && llavesCierran(env[2])) { f = env[2]; pre = (/\\displaystyle/.test(env[1]) ? '\\displaystyle ' : ''); } else env = null;
      var partes = [], ini = 0, prof = 0;
      for (var i = 0; i < f.length; i++) {
        var ch = f.charAt(i);
        if (ch === '\\' && (f.charAt(i + 1) === '{' || f.charAt(i + 1) === '}')) { i++; continue; }
        if (ch === '{') prof++; else if (ch === '}') prof--;
        else if (prof === 0 && ch === '\\') { var x = SEP.exec(f.slice(i)); if (x) { partes.push(f.slice(ini, i)); i += x[0].length - 1; ini = i + 1; } }
      }
      partes.push(f.slice(ini));
      partes = partes.map(function (x) { return x.trim(); }).filter(Boolean);
      if (partes.length < 2 && !env) return m;
      if (partes.length < 2) return '$$' + pre + partes.join('') + '$$';
      // Una debajo de otra y pegadas (en un solo bloque centrado)
      return '$$\\begin{gathered}' + partes.join(' \\\\[3pt] ') + '\\end{gathered}$$';
    });
  }
  // ¿Las llaves de t están balanceadas sin cerrarse antes de tiempo? (para saber si la llave de afuera envuelve todo)
  function llavesCierran(t) {
    var p = 0;
    for (var i = 0; i < t.length; i++) {
      var ch = t.charAt(i);
      if (ch === '\\') { i++; continue; }
      if (ch === '{') p++; else if (ch === '}' && --p < 0) return false;
    }
    return p === 0;
  }
  function formatoSimple(s) {
    var e = esc(s);
    for (var k = 0; k < 3; k++) e = e.replace(/&lt;(u|i|b|em|strong|sub|sup)&gt;([\s\S]*?)&lt;\/\1&gt;/gi, function (x, t, d) { return '<' + t.toLowerCase() + '>' + d + '</' + t.toLowerCase() + '>'; });
    return e.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/\n/g, '<br>');
  }
  function textoHtml(q) {
    var t = partirFormulas(q._sinLectura != null ? q._sinLectura : q.text);
    if (window.MCPregunta && MCPregunta.armar) {
      var r = MCPregunta.armar(t, { lecPos: q.lecPos, lecSigue: false });
      return r.html + (q.graphic ? '<div class="g">' + q.graphic + '</div>' : '') + (r.derecha ? '<div class="g">' + r.derecha + '</div>' : '');
    }
    return formatoSimple(t) + (q.graphic ? '<div class="g">' + q.graphic + '</div>' : '');
  }
  // Lectura compartida ([TEXTO 1] … [/TEXTO]): se separa del enunciado para ponerla una sola vez
  var RX_LEC = /^\[((?:TEXTO|LECTURA)[^\]]{0,20})\]$/i, RX_LEC_FIN = /^\[\/(?:TEXTO|LECTURA)\]$/i;
  function separarLectura(texto) {
    var l = String(texto || '').replace(/\r/g, '').split('\n'), ini = -1, fin = -1;
    for (var i = 0; i < l.length; i++) { if (ini < 0 && RX_LEC.test(l[i].trim())) ini = i; else if (ini >= 0 && RX_LEC_FIN.test(l[i].trim())) { fin = i; break; } }
    if (ini < 0) return null;
    if (fin < 0) fin = l.length - 1;
    return { lectura: l.slice(ini, fin + 1).join('\n'), titulo: l[ini].trim().replace(/^\[|\]$/g, ''), resto: l.slice(0, ini).concat(l.slice(fin + 1)).join('\n').trim() };
  }
  function lecturaHtml(lec, pos) {
    var t = partirFormulas(lec.lectura);
    if (window.MCPregunta && MCPregunta.armar) return '<div class="lect">' + MCPregunta.armar(t, { lecPos: pos, lecSigue: false }).html + '</div>';
    return '<div class="lect"><details open><summary>' + esc(lec.titulo.toUpperCase()) + ' · ' + esc(pos) + '</summary><p>' + formatoSimple(t.split('\n').slice(1, -1).join(' ')) + '</p></details></div>';
  }
  function opcionHtml(o) { return formatoSimple(partirFormulas(o && o.text != null ? o.text : o)); }
  function esAbierta(q) { return !!(q && (q.abierta || !Array.isArray(q.options) || !q.options.length)); }
  function respAbierta(q) {
    if (window.MCPregunta && MCPregunta.solucion) { try { var d = document.createElement('div'); d.innerHTML = MCPregunta.solucion(q); return d.textContent.trim(); } catch (e) {} }
    return (q.respuestas || []).join(' / ');
  }
  function claveDe(q) { return esAbierta(q) ? '-' : 'ABCDE'.charAt(q.correct) || '-'; }
  function matematicas(el) {
    if (window.renderMathInElement) {
      try { renderMathInElement(el, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false }); } catch (e) {}
    }
    Array.prototype.forEach.call(el.querySelectorAll('details'), function (d) { d.open = true; });
  }

  /* ---------- Lienzo: un iframe propio, para que los estilos de la página no se metan en el PDF ---------- */
  var LZ = null;
  function lienzo() {
    if (LZ && LZ.f.isConnected) return LZ;
    var f = document.createElement('iframe');
    f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
    f.style.cssText = 'position:fixed;left:-20000px;top:0;width:1300px;height:2400px;border:0;pointer-events:none';
    document.body.appendChild(f);
    var d = f.contentDocument;
    d.open();
    d.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><base href="' + esc(location.href) + '"><link rel="stylesheet" href="' + CDN.fuentes + '"><link rel="stylesheet" href="' + CDN.katexCss + '"></head><body style="margin:0;background:#fff"></body></html>');
    d.close();
    // Los estilos de tablas, analogías y lecturas de assets/pregunta.js (sin los colores del tema oscuro)
    Array.prototype.forEach.call(document.querySelectorAll('style'), function (st) {
      if (st.textContent.indexOf('.mcq-p{display:block') >= 0) { var c = d.createElement('style'); c.textContent = st.textContent; d.head.appendChild(c); }
    });
    var css = d.createElement('style'); css.textContent = textoCssPdf(); d.head.appendChild(css);
    // Se mide recién cuando llegaron las fuentes y el CSS de KaTeX (si no, la primera descarga salía mal)
    var listo = Promise.all(Array.prototype.map.call(d.querySelectorAll('link[rel=stylesheet]'), function (l) {
      return new Promise(function (ok) { if (l.sheet) return ok(); l.addEventListener('load', ok); l.addEventListener('error', ok); setTimeout(ok, 10000); });
    }));
    LZ = { f: f, d: d, listo: listo };
    return LZ;
  }

  /* ---------- Hoja A4 y estilos del PDF ---------- */
  function textoCssPdf() {
    var H = ESTILO.hoja, t = ESTILO.tinta;
    return '' +
      '.mcpdf,.mcpdf *{box-sizing:border-box}' +
      '.mcpdf{position:relative;width:' + H.w + 'px;height:' + H.h + 'px;overflow:hidden;background:#fff;color:' + t + ';font:400 ' + ESTILO.letra + 'px/1.48 Nunito,Arial,sans-serif;text-align:left;letter-spacing:0;margin:0 0 20px}' +
      '.mcpdf.h{width:' + H.h + 'px;height:' + H.w + 'px}' +
      '.mcpdf .wm{position:absolute;inset:-30% -45%;transform:rotate(-30deg);z-index:0;pointer-events:none}' +
      '.mcpdf .wm div{position:absolute;left:0;white-space:pre;font:400 15px Nunito,Arial,sans-serif;color:' + ESTILO.marca + '}' +
      '.mcpdf .cab{position:absolute;left:' + H.lado + 'px;right:' + H.lado + 'px;top:30px;height:44px;display:flex;align-items:center;border-bottom:2px solid var(--c);z-index:2}' +
      '.mcpdf .cab svg{height:24px;width:auto}' +
      '.mcpdf .cab .t{margin-left:auto;text-align:right;line-height:1.05}.mcpdf .cab .t small{display:block;font:900 8.5px Nunito,Arial;letter-spacing:.22em;color:var(--c);text-transform:uppercase}' +
      '.mcpdf .cab .t b{font:900 15px Nunito,Arial;text-transform:uppercase;letter-spacing:.01em;color:' + t + '}' +
      '.mcpdf .pie{position:absolute;left:' + H.lado + 'px;right:' + H.lado + 'px;bottom:26px;border-top:1px solid #c9cfda;padding-top:5px;display:flex;justify-content:space-between;font:400 9.6px Nunito,Arial;color:#555;z-index:2}' +
      '.mcpdf .area-c{position:absolute;left:' + H.lado + 'px;top:' + H.arriba + 'px;width:' + (H.w - 2 * H.lado) + 'px;height:' + (H.h - H.arriba - H.abajo) + 'px;z-index:1}' +
      '.mcpdf.h .area-c{width:' + (H.h - 2 * H.lado) + 'px;height:' + (H.w - H.arriba - H.abajo) + 'px}' +
      '.mcpdf .regla{position:absolute;top:0;bottom:0;width:0;border-left:1px solid #dde2ea}' +
      '.mcpdf .bl{position:absolute}' +
      /* Preguntas */
      '.mcpdf .qn{font:800 15px Barlow Condensed,Arial Narrow,sans-serif;letter-spacing:.04em;color:var(--c);text-transform:uppercase;margin-bottom:2px}' +
      '.mcpdf .qn:before{content:"";display:inline-block;width:8px;height:8px;background:' + t + ';margin-right:6px;vertical-align:1px;border-radius:2px}' +
      '.mcpdf .qt{margin:0 0 7px;overflow-wrap:break-word}.mcpdf .qt .mcq-p{display:block}.mcpdf .qt .mcq-p+.mcq-p{margin-top:6px}' +
      '.mcpdf .qt img,.mcpdf .g img{max-width:100%;height:auto;display:block;margin:6px auto}.mcpdf .g{margin:6px 0}.mcpdf .g svg{max-width:100%;height:auto}' +
      '.mcpdf table{border-collapse:collapse;margin:6px auto;font-size:.95em}.mcpdf th,.mcpdf td{border:1px solid #9aa3b5!important;padding:2px 6px!important;background:#fff!important;color:' + t + '!important}' +
      '.mcpdf td.mcpdf-alta,.mcpdf th.mcpdf-alta{padding:6px 7px 10px!important;line-height:1.7}' +
      '.mcpdf details{margin:4px 0 8px;border:1px solid #c9cfda;border-radius:6px;padding:6px 9px;background:#fff!important;color:' + t + '!important}.mcpdf summary{font:800 12px Barlow Condensed,Arial;letter-spacing:.08em;list-style:none;color:var(--o)}.mcpdf summary::-webkit-details-marker{display:none}' +
      '.mcpdf .lect details{margin:0;border:1.4px solid var(--c);border-left-width:5px;border-radius:8px;padding:8px 11px;background:var(--s)!important}.mcpdf .lect summary{font-size:13px;margin-bottom:4px}.mcpdf .lect p{margin:0 0 5px;text-align:justify}.mcpdf .lect .mcq-lec-pos{color:#4a5468;font-weight:700;letter-spacing:.02em;text-transform:none}' +
      '.mcpdf .mcq-etq{position:static;display:inline-block;margin:0 0 4px;background:var(--s)!important;border:1px solid var(--c)!important;color:var(--o)!important;font-size:10.5px;padding:1px 8px;border-radius:99px}.mcpdf .mcq-etq:after{display:none}' +
      // Gráficos escritos como texto: tinta oscura sobre blanco, relleno suave del color del curso (se imprime bien en blanco y negro)
      '.mcpdf .mcq-graf{margin:6px 0;display:flex;justify-content:center;--g-fondo:#fff;--g-eje:' + t + ';--g-tx:' + t + ';--g-tx2:' + t + ';--g-gu:#8A93A6;--g-red:rgba(27,42,74,.08);--g-b:' + t + ';--g-b2:var(--o);--g-rell:var(--s);--g-somb:#AEB7C6;--g-lin:var(--c);' +
      '--g1:#3D5E00;--g2:#0A4F94;--g3:#9A4300;--g4:#5E2A9E;--g5:#A3245E;--g6:#1B6E4A;--g1f:#E4EEC8;--g2f:#DCE8F7;--g3f:#FBE3CC;--g4f:#EADDF8;--g5f:#F7DCE8;--g6f:#D8EFE3}' +
      '.mcpdf .mcq-graf svg{width:100%;max-height:250px;height:auto;font-family:Nunito,Arial,sans-serif;overflow:visible}.mcpdf .mcq-graf-error{display:none}' +
      '.mcpdf .mcq-par .c,.mcpdf .mcq-par .d,.mcpdf .mcq-an .c{color:var(--o)!important}' +
      '.mcpdf .katex{font-size:1.04em}.mcpdf .ops .katex{font-size:1em}.mcpdf .katex-display{margin:.3em 0!important;overflow:visible!important}' +
      '.mcpdf .ops{display:grid;gap:3px 10px}.mcpdf .ops.c3{grid-template-columns:repeat(3,minmax(0,1fr))}.mcpdf .ops.c2{grid-template-columns:repeat(2,minmax(0,1fr))}.mcpdf .ops.c1{grid-template-columns:1fr}' +
      '.mcpdf .ops b{font-weight:900;color:' + t + '}' +
      '.mcpdf .abierta{border-bottom:1.2px solid #9aa3b5;height:22px;margin-top:4px;font-size:10.5px;color:#7d8aa0}' +
      /* Encabezado de tema */
      '.mcpdf .ban{position:relative;overflow:hidden;background:var(--s);border-radius:19px;padding:18px 26px 18px 44px;display:flex;align-items:center;gap:22px}' +
      '.mcpdf .ban:before{content:"";position:absolute;left:0;top:0;bottom:0;width:15px;background:' + t + '}' +
      '.mcpdf .ban:after{content:"";position:absolute;right:-46px;top:-52px;width:166px;height:166px;border-radius:50%;border:26px solid var(--c);opacity:.14}' +
      '.mcpdf .ban .n{font:800 56px/.9 Barlow Condensed,Arial Narrow,sans-serif;color:var(--c);flex:none}.mcpdf .ban .n small{display:block;font:900 10px Nunito,Arial;letter-spacing:.24em;color:' + t + ';margin-bottom:4px}' +
      '.mcpdf .ban h1{margin:0;font:800 31px/1.02 Barlow Condensed,Arial Narrow,sans-serif;letter-spacing:.02em;text-transform:uppercase;color:' + t + '}' +
      '.mcpdf .ban p{margin:5px 0 0;font:600 14.5px Barlow Condensed,Arial Narrow,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#3d4b66}' +
      '.mcpdf .chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.mcpdf .chips span{background:#fff;border:1.4px solid ' + t + ';border-radius:99px;padding:2px 11px;font:900 10px Nunito,Arial;letter-spacing:.06em;text-transform:uppercase}' +
      /* Área (banda) y asignatura */
      '.mcpdf .bandaa{text-align:center}.mcpdf .bandaa span{display:inline-block;background:' + t + ';color:#fff;font:800 19px Barlow Condensed,Arial Narrow,sans-serif;letter-spacing:.14em;text-transform:uppercase;padding:5px 34px;border-radius:99px;border-left:8px solid var(--c);border-right:8px solid var(--c)}' +
      '.mcpdf .asig{text-align:center}.mcpdf .asig span{display:inline-block;font:800 15.5px Barlow Condensed,Arial Narrow,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--o);background:var(--s);border-bottom:2.5px solid var(--l);border-radius:7px 7px 0 0;padding:2px 15px 1px}' +
      /* Portada del simulacro */
      '.mcpdf .port .p-top{position:relative;overflow:hidden;background:var(--s);border-radius:22px;padding:34px 38px 30px 52px}' +
      '.mcpdf .port .p-top:before{content:"";position:absolute;left:0;top:0;bottom:0;width:19px;background:' + t + '}' +
      '.mcpdf .port .p-top:after{content:"";position:absolute;right:-60px;top:-60px;width:234px;height:234px;border-radius:50%;border:34px solid var(--c);opacity:.14}' +
      '.mcpdf .port small.k{font:900 11.5px Nunito,Arial;letter-spacing:.28em;color:var(--c);text-transform:uppercase}' +
      '.mcpdf .port h1{font:800 76px/.92 Barlow Condensed,Arial Narrow,sans-serif;margin:12px 0 8px;color:' + t + ';text-transform:uppercase}.mcpdf .port h1 em{font-style:normal;color:var(--c)}' +
      '.mcpdf .port .p-top p{margin:0;font:600 20px Barlow Condensed,Arial Narrow,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#3d4b66}' +
      '.mcpdf .datos{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin:22px 0 16px}' +
      '.mcpdf .datos div{border:1.4px solid #d6dbe6;border-bottom:4px solid var(--c);border-radius:13px;padding:9px 13px}.mcpdf .datos small{display:block;font:900 9px Nunito,Arial;color:#6b7388;text-transform:uppercase;letter-spacing:.1em}.mcpdf .datos b{font:800 28px/1.1 Barlow Condensed,Arial Narrow,sans-serif}' +
      '.mcpdf h2{font:800 17px Barlow Condensed,Arial Narrow,sans-serif;letter-spacing:.12em;text-transform:uppercase;margin:14px 0 9px;color:' + t + '}' +
      '.mcpdf table.cont{width:100%;border-collapse:collapse;font-size:12px;margin:0}.mcpdf table.cont td{padding:6px 10px;border:0!important;border-bottom:1px solid #e6e9f0!important}.mcpdf table.cont td:nth-child(n+2){text-align:center;width:22%}' +
      '.mcpdf table.cont tr.ar td{background:#f3f5f9!important;font-weight:900}.mcpdf table.cont .an{display:block;font-weight:900;font-size:13px}.mcpdf table.cont .as{color:#4a5468;font-size:11px}' +
      '.mcpdf .ins{display:grid;grid-template-columns:1fr 1fr;gap:9px 22px;margin:0;padding:0;list-style:none;counter-reset:i}' +
      '.mcpdf .ins li{counter-increment:i;font-size:12px;display:flex;gap:9px}.mcpdf .ins li:before{content:counter(i);flex:none;width:19px;height:19px;border-radius:50%;background:' + t + ';color:#fff;font:900 10px/19px Nunito,Arial;text-align:center}' +
      '.mcpdf .alumno{position:absolute;left:0;right:0;bottom:0;display:grid;grid-template-columns:2.2fr 1fr;gap:15px}.mcpdf .alumno div{border:1.4px solid #d6dbe6;border-radius:11px;padding:6px 11px 26px;font:900 9px Nunito,Arial;color:#6b7388;letter-spacing:.1em;text-transform:uppercase}' +
      /* Hoja de respuestas compacta, claves */
      '.mcpdf .tit{font:800 19px Barlow Condensed,Arial Narrow,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:' + t + '}' +
      '.mcpdf .hr{display:flex;align-items:center;gap:8px;height:30px;padding:0 8px;border-radius:7px}.mcpdf .hr.z{background:var(--s)}' +
      '.mcpdf .hr b{width:28px;text-align:right;font:900 13px Nunito,Arial}.mcpdf .hr i{width:22px;height:22px;border:1.2px solid #5a6b80;border-radius:50%;font:700 9.5px/20px Nunito,Arial;font-style:normal;text-align:center;color:#7d8aa0;background:#fff}' +
      '.mcpdf .hr u{flex:1;border-bottom:1.2px solid #9aa3b5;height:14px;text-decoration:none}' +
      '.mcpdf .g10{display:grid;grid-template-columns:repeat(10,1fr);border:1.4px solid #c9cfda;border-radius:11px;overflow:hidden}' +
      '.mcpdf .g10 div{text-align:center;padding:5px 0;border-right:1px solid #e3e7ee}.mcpdf .g10 div:last-child{border-right:0}.mcpdf .g10 small{display:block;font-size:10px;color:#6b7388}.mcpdf .g10 b{font:800 20px Barlow Condensed,Arial Narrow,sans-serif;color:var(--o)}' +
      '.mcpdf .opt{border:1.4px dashed var(--c);border-radius:11px;padding:10px 15px;background:var(--s)}.mcpdf .opt b{font:800 14px Barlow Condensed,Arial;letter-spacing:.1em;color:var(--o);text-transform:uppercase;display:block}' +
      '.mcpdf .opt code{font:700 15px/1.6 Consolas,monospace;letter-spacing:.14em;word-break:break-all;color:' + t + '}.mcpdf .opt p{margin:3px 0 0;font-size:11px;color:#4a5468}' +
      '.mcpdf .abiertas{font-size:12px}.mcpdf .abiertas b{color:var(--o)}' +
      '.mcpdf table.punt{width:100%;border-collapse:collapse;font-size:12px}.mcpdf table.punt th,.mcpdf table.punt td{padding:7px 10px!important}.mcpdf table.punt th{background:#f3f5f9!important;text-align:left}.mcpdf table.punt td:nth-child(n+2),.mcpdf table.punt th:nth-child(n+2){text-align:center;width:16%}' +
      '.mcpdf .nota{font-size:11px;color:#555}' +
      /* Vocabulario */
      '.mcpdf .vf{display:grid;grid-template-columns:150px 1fr 1fr;gap:0 12px;padding:6px 10px;border-bottom:1px solid #e3e7ee;font-size:12px;line-height:1.4}' +
      '.mcpdf .vf.def{grid-template-columns:150px 1fr 1fr 1.6fr}.mcpdf .vf.z{background:var(--s)}' +
      '.mcpdf .vf b{font:800 15px Barlow Condensed,Arial Narrow,sans-serif;letter-spacing:.03em;color:' + t + ';text-transform:uppercase}.mcpdf .vf.cab2{background:' + t + ';color:#fff;border-radius:9px 9px 0 0;font:900 10px Nunito,Arial;letter-spacing:.12em;text-transform:uppercase;border:0}' +
      '.mcpdf .vf em{font-style:normal;color:#4a5468}.mcpdf .vf .ej{display:block;font-style:italic;color:#6b7388;font-size:11px;margin-top:2px}' +
      /* Flashcards */
      '.mcpdf .tj{position:absolute;border:1.4px dashed #9aa3b5;border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;overflow:hidden}' +
      '.mcpdf .tj .k{font:900 9px Nunito,Arial;letter-spacing:.16em;color:var(--c);text-transform:uppercase;margin-bottom:6px}' +
      '.mcpdf .tj .x{flex:1;display:flex;flex-direction:column;justify-content:center;font-size:13px;line-height:1.42;overflow:hidden}' +
      '.mcpdf .tj.rev{background:var(--s);border-style:solid;border-color:var(--c)}.mcpdf .tj.rev .x{text-align:center;font-weight:700}' +
      '.mcpdf .tj .n{position:absolute;right:12px;bottom:8px;font:800 13px Barlow Condensed,Arial;color:#9aa3b5}' +
      /* Ficha óptica */
      '.mcpdf .mk{position:absolute;background:#000}' +
      '.mcpdf .fbox{position:absolute;border:2px solid ' + t + '}.mcpdf .fvl{position:absolute;width:0;border-left:1.4px solid ' + t + '}.mcpdf .fzb{position:absolute}' +
      '.mcpdf .fnm{position:absolute;text-align:right;font:900 10.5px/15px Nunito,Arial}.mcpdf .fnm.off{color:#c2c7d2}' +
      '.mcpdf .fbb{position:absolute;border:1.1px solid #5a6b80;border-radius:50%;font:700 7.4px Nunito,Arial;color:#7d8aa0;display:flex;align-items:center;justify-content:center;background:#fff}.mcpdf .fbb.off{border-color:#d3d8e0;color:#d3d8e0}' +
      '.mcpdf .fiz{position:absolute}.mcpdf .fiz .tt{font:800 20px/1 Barlow Condensed,Arial Narrow,sans-serif;letter-spacing:.06em;text-transform:uppercase;margin:14px 0 11px}' +
      '.mcpdf .fiz .f{border:1.3px solid #b8c0cf;border-radius:8px;padding:4px 9px 21px;margin-bottom:8px;font:900 8.2px Nunito,Arial;color:#6b7388;letter-spacing:.1em;text-transform:uppercase}' +
      '.mcpdf .fiz .fila{display:grid;grid-template-columns:1fr 1fr;gap:8px}.mcpdf .fiz .dni{display:flex;gap:4px;margin-top:4px}.mcpdf .fiz .dni i{flex:1;height:24px;border:1.1px solid #b8c0cf;border-radius:4px}' +
      '.mcpdf .fiz .gr{display:flex;gap:7px;margin-top:5px}.mcpdf .fiz .gr span{width:19px;height:19px;border:1.1px solid #5a6b80;border-radius:50%;font:700 8px/17px Nunito,Arial;text-align:center;color:#7d8aa0;letter-spacing:0}' +
      '.mcpdf .fde{position:absolute}.mcpdf .fde h1{font:800 28px/1 Barlow Condensed,Arial Narrow,sans-serif;letter-spacing:.06em;margin:0;text-transform:uppercase}.mcpdf .fde h1 em{font-style:normal;color:var(--c)}' +
      '.mcpdf .fde .sim{font:600 14px Barlow Condensed,Arial;letter-spacing:.08em;color:#4a5468;text-transform:uppercase;margin-top:4px}' +
      '.mcpdf .badge{position:absolute;right:0;top:4px;display:inline-flex;align-items:center;gap:6px;border:1.3px solid var(--c);color:var(--o);border-radius:99px;padding:3px 11px;font:900 8.8px Nunito,Arial;letter-spacing:.08em;text-transform:uppercase}.mcpdf .badge i{width:9px;height:9px;background:#000}' +
      '.mcpdf .instr{display:grid;grid-template-columns:1.55fr 1fr;gap:11px;margin-top:11px}.mcpdf .instr>div{border:1.3px solid #b8c0cf;border-radius:8px;padding:7px 11px;font-size:10px;line-height:1.4}' +
      '.mcpdf .instr h4{margin:0 0 3px;font:800 12px Barlow Condensed,Arial;letter-spacing:.1em;text-transform:uppercase;color:var(--o)}.mcpdf .instr ul{margin:0;padding-left:14px}' +
      '.mcpdf .ej{display:flex;gap:8px;align-items:center;margin-top:3px}.mcpdf .ej i{width:17px;height:17px;border-radius:50%;border:1.1px solid #5a6b80;display:inline-block}.mcpdf .ej i.ok{background:#000;border-color:#000}.mcpdf .ej small{font-size:9px;color:#6b7388}' +
      '.mcpdf :is(strong,b,em,i,u,sup,sub){color:inherit}.mcpdf .mcq-p :is(strong,b){color:inherit;font-weight:900}' +
      cssModelos();
  }
  // Formato 1 (m1) y Formato 2 (m2): preguntas, cabecera de área en la columna y portadas
  function cssModelos() {
    var t = ESTILO.tinta, BC = '"Barlow Condensed",Arial Narrow,sans-serif';
    return '' +

      /* Vocabulario · Formato 1 (tabla con número en bloque) */
      '.mcpdf .vh1{display:grid;grid-template-columns:34px 132px 1fr 1fr;gap:0 12px;align-items:center;background:#1B2A4A;color:#fff;border-radius:11px 11px 0 0;padding:8px 10px;font:900 9.5px Nunito,Arial;letter-spacing:.14em;text-transform:uppercase;border-bottom:4px solid #A8D81E}' +
      '.mcpdf .vh1.def,.mcpdf .vr1.def{grid-template-columns:34px 132px 1fr 1fr 1.6fr}' +
      '.mcpdf .vr1{display:grid;grid-template-columns:34px 132px 1fr 1fr;gap:0 12px;align-items:start;padding:7px 10px;border-bottom:1px solid #e3e7ee;font-size:12px;line-height:1.4}.mcpdf .vr1.z{background:#F7F9FC}' +
      '.mcpdf .vr1 .n{font:800 13px/1.05 ' + BC + ';color:#fff;background:var(--c);border-radius:6px;padding:2px 0 3px;text-align:center;margin-top:1px}' +
      '.mcpdf .vr1 b{font:800 15.5px/1.15 ' + BC + ';letter-spacing:.03em;color:#1B2A4A;text-transform:uppercase}' +
      '.mcpdf .vr1 em{font-style:normal;color:#4a5468}.mcpdf .vr1 em.a{color:var(--o)}.mcpdf .vr1 .ej{display:block;font-style:italic;color:#6b7388;font-size:11px;margin-top:2px}' +
      '.mcpdf .vl1{display:flex;align-items:center;gap:10px;padding:10px 0 6px}.mcpdf .vl1:before,.mcpdf .vl1:after{content:"";flex:1;height:2px;background:var(--c);opacity:.3}' +
      '.mcpdf .vl1 span{font:800 22px/1 ' + BC + ';color:#fff;background:#1B2A4A;border-radius:8px;padding:3px 14px 5px;box-shadow:0 3px 0 #A8D81E}' +
      /* Vocabulario · Formato 2 (cápsulas a dos columnas) */
      '.mcpdf .vc2{display:flex;gap:9px;border:1.2px solid #dfe3ea;border-radius:13px;padding:8px 11px 9px 8px}' +
      '.mcpdf .vc2 .nm{flex:none;width:27px;height:27px;border-radius:50%;background:var(--s);border:1.3px solid var(--c);color:var(--o);font:800 14px/22.5px ' + BC + ';text-align:center}' +
      '.mcpdf .vc2 .cu{flex:1;min-width:0;font-size:11.8px;line-height:1.4}.mcpdf .vc2 h3{margin:1px 0 4px;font:800 17px/1.05 ' + BC + ';letter-spacing:.03em;text-transform:uppercase;color:#0E1A31}' +
      '.mcpdf .vc2 .ln{display:flex;gap:6px;align-items:flex-start;margin-top:2px}.mcpdf .vc2 .ln i{flex:none;font:900 8px/14px Nunito,Arial;font-style:normal;letter-spacing:.1em;border-radius:99px;padding:0 6px;margin-top:1px}' +
      '.mcpdf .vc2 .ln i.s{background:var(--c);color:#fff}.mcpdf .vc2 .ln i.a{border:1.2px solid var(--c);color:var(--o);line-height:11.6px}.mcpdf .vc2 .ln span{color:#3d4b66}' +
      '.mcpdf .vc2 .df{margin-top:5px;color:#1B2A4A}.mcpdf .vc2 .ej{display:block;margin-top:3px;padding-left:7px;border-left:3px solid #C5F209;font-style:italic;color:#6b7388;font-size:11px}' +
      '.mcpdf .vl2{display:flex;align-items:center;gap:9px;background:#0E1A31;border-radius:12px;padding:5px 12px 6px 6px;color:#fff;font:900 9.5px Nunito,Arial;letter-spacing:.2em;text-transform:uppercase}' +
      '.mcpdf .vl2 b{width:30px;height:30px;border-radius:50%;background:#C5F209;color:#0E1A31;font:italic 900 21px/30px ' + BC + ';text-align:center;letter-spacing:0}' +
      /* Flashcards · Formato 1 */
      '.mcpdf .tj.f1{padding:0;border:1.4px dashed #9aa3b5;background:#fff}' +
      '.mcpdf .tj.f1 .hd{display:flex;align-items:center;gap:8px;padding:10px 12px 0}.mcpdf .tj.f1 .hd b{font:800 14px/1.05 ' + BC + ';color:#fff;background:#1B2A4A;border-radius:6px;padding:2px 8px 3px}' +
      '.mcpdf .tj.f1 .hd small{font:900 8.5px Nunito,Arial;letter-spacing:.18em;text-transform:uppercase;color:var(--o)}.mcpdf .tj.f1 .hd em{margin-left:auto;font:800 11px ' + BC + ';font-style:normal;letter-spacing:.08em;text-transform:uppercase;color:#8a93a6;max-width:55%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.mcpdf .tj.f1 .x{padding:6px 14px 14px;border-left:0}.mcpdf .tj.f1:after{content:"";position:absolute;left:0;right:0;bottom:0;height:5px;background:var(--c)}' +
      '.mcpdf .tj.f1.rev{background:linear-gradient(115deg,#fff 25%,#EEF8D2 70%,#DDF1A6);border-color:#9aa3b5}.mcpdf .tj.f1.rev .hd b{background:var(--c)}.mcpdf .tj.f1.rev:after{background:#A8D81E}' +
      '.mcpdf .tj.f1.rev .x{text-align:center;font-weight:800;color:#1B2A4A}' +
      /* Flashcards · Formato 2 */
      '.mcpdf .tj.f2{padding:0;border:1.4px dashed #9aa3b5;background:#fff}' +
      '.mcpdf .tj.f2 .hd{position:relative;display:flex;align-items:center;gap:8px;background:#0E1A31;padding:7px 12px 9px 8px;overflow:hidden}' +
      '.mcpdf .tj.f2 .hd:after{content:"";position:absolute;left:-10px;right:-10px;bottom:-2px;height:4px;background:#C5F209;transform:rotate(-1deg)}' +
      '.mcpdf .tj.f2 .hd b{width:24px;height:24px;border-radius:50%;background:#C5F209;color:#0E1A31;font:italic 900 14px/24px ' + BC + ';text-align:center}' +
      '.mcpdf .tj.f2 .hd small{font:900 8.5px Nunito,Arial;letter-spacing:.2em;text-transform:uppercase;color:#fff}.mcpdf .tj.f2 .hd em{margin-left:auto;font:900 8px Nunito,Arial;font-style:normal;letter-spacing:.14em;text-transform:uppercase;color:#1CB0F6;max-width:55%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.mcpdf .tj.f2 .x{padding:8px 14px 14px}' +
      '.mcpdf .tj.f2.rev .hd{background:#C5F209}.mcpdf .tj.f2.rev .hd:after{background:#0E1A31}.mcpdf .tj.f2.rev .hd b{background:#0E1A31;color:#C5F209}.mcpdf .tj.f2.rev .hd small{color:#0E1A31}.mcpdf .tj.f2.rev .hd em{color:#3d4b66}' +
      '.mcpdf .tj.f2.rev .x{text-align:center;font-weight:800;color:#0E1A31}.mcpdf .tj.f2.rev:before{content:"";position:absolute;right:-40px;bottom:-40px;width:120px;height:120px;border-radius:50%;border:18px solid rgba(197,242,9,.22)}' +
      '.mcpdf .ins1,.mcpdf .ins2{display:flex;align-items:center;gap:14px;height:100%;border-radius:16px;padding:14px 20px;font-size:12px;line-height:1.5}' +
      '.mcpdf .ins1{background:linear-gradient(100deg,#fff 30%,#EEF8D2 72%,#DDF1A6);border:1.5px solid #dde3ee;color:#1B2A4A}.mcpdf .ins2{background:#0E1A31;color:#dfe6f3}' +
      '.mcpdf .ins1 h4,.mcpdf .ins2 h4{margin:0 0 4px;font:800 20px/1 ' + BC + ';letter-spacing:.06em;text-transform:uppercase}.mcpdf .ins2 h4{color:#C5F209}.mcpdf .ins1 ol,.mcpdf .ins2 ol{margin:0;padding-left:18px}' +
      '.mcpdf .ins1 img,.mcpdf .ins2 img{height:150px;width:auto;flex:none}' +
      /* Cabecera de área del ancho de la columna (las áreas siguen en la misma hoja) */
      '.mcpdf .arc1{display:flex;align-items:center;gap:9px;background:var(--c);color:#fff;border-radius:11px;padding:7px 11px 7px 8px;margin:0 0 10px}' +
      '.mcpdf .arc1 .ico{flex:none;width:32px;height:32px;border-radius:9px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center}.mcpdf .arc1 .ico svg{width:21px;height:21px}' +
      '.mcpdf .arc1 small{display:block;font:900 8px Nunito,Arial;letter-spacing:.2em;text-transform:uppercase;opacity:.85}' +
      '.mcpdf .arc1 h2{margin:0;font:800 19px/1 ' + BC + ';letter-spacing:.06em;text-transform:uppercase;color:#fff}' +
      '.mcpdf .arc1 .rg{margin-left:auto;text-align:right;font:800 8px Nunito,Arial;letter-spacing:.14em;text-transform:uppercase;opacity:.92}.mcpdf .arc1 .rg b{display:block;font:800 16px/1 ' + BC + ';letter-spacing:.04em;color:#fff}' +
      '.mcpdf .cur1{display:flex;align-items:center;gap:8px;margin:2px 0 2px;font:800 13px ' + BC + ';letter-spacing:.16em;text-transform:uppercase;color:var(--o)}' +
      '.mcpdf .cur1:after{content:"";flex:1;height:2px;background:var(--c);opacity:.35}.mcpdf .cur1 span{background:var(--s);padding:1px 10px;border-radius:6px}' +
      '.mcpdf .arc2{display:flex;align-items:baseline;justify-content:space-between;border-top:5px solid var(--c);background:linear-gradient(var(--s),#fff);padding:7px 11px;margin:0 0 9px;border-radius:0 0 12px 12px}' +
      '.mcpdf .arc2 h2{margin:0;font:800 21px/1.05 ' + BC + ';letter-spacing:.05em;text-transform:uppercase;color:var(--o)}' +
      '.mcpdf .arc2 span{font:900 9.5px Nunito,Arial;letter-spacing:.12em;color:var(--o);background:#fff;border:1.4px solid var(--c);border-radius:99px;padding:1px 9px}' +
      '.mcpdf .tc1{position:relative;display:flex;align-items:stretch;background:linear-gradient(100deg,#fff 30%,#EEF8D2 72%,#DDF1A6 100%);border:1.5px solid #dde3ee;border-radius:16px;overflow:hidden;min-height:122px;box-shadow:0 4px 0 #1B2A4A}' +
      '.mcpdf .tc1 .nb{flex:none;width:112px;background:#1B2A4A;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center}' +
      '.mcpdf .tc1 .nb small{font:900 9px Nunito,Arial;letter-spacing:.3em;color:#9fb6db}.mcpdf .tc1 .nb b{font:900 60px/1 ' + BC + ';color:#fff;padding-bottom:4px}' +
      '.mcpdf .tc1 .tx{flex:1;min-width:0;padding:16px 150px 16px 22px;border-left:6px solid var(--c);display:flex;flex-direction:column;justify-content:center}' +
      '.mcpdf .tc1 .tx small{font:900 10px Nunito,Arial;letter-spacing:.2em;text-transform:uppercase;color:var(--o)}' +
      '.mcpdf .tc1 h1{margin:4px 0 9px;font:800 34px/1 ' + BC + ';text-transform:uppercase;color:#1B2A4A;letter-spacing:.02em}' +
      '.mcpdf .tc1 .ch span{display:inline-block;font:800 9.5px Nunito,Arial;letter-spacing:.1em;text-transform:uppercase;border:1.3px solid var(--c);color:var(--o);background:var(--s);border-radius:99px;padding:2px 10px 3px;margin-right:6px}' +
      '.mcpdf .tc1 .bu,.mcpdf .tc2 .bu{position:absolute;right:14px;bottom:-4px;height:132px;width:auto;z-index:1}' +
      '.mcpdf .tc1:after{content:"";position:absolute;right:-22px;bottom:-78px;width:210px;height:170px;border-radius:50%;background:#A8D81E;opacity:.9}' +
      '.mcpdf .tc1:before{content:"";position:absolute;right:150px;top:-40px;width:90px;height:90px;border-radius:50%;border:14px solid rgba(122,170,0,.16)}' +
      '.mcpdf .tc2{position:relative;display:flex;align-items:center;gap:20px;background:#0E1A31;color:#fff;border-radius:16px;overflow:hidden;min-height:126px;padding:16px 160px 22px 24px}' +
      '.mcpdf .tc2:before{content:"";position:absolute;left:-20px;right:-20px;bottom:-6px;height:16px;background:#C5F209;transform:rotate(-1.6deg)}' +
      '.mcpdf .tc2:after{content:"";position:absolute;right:-60px;top:-70px;width:220px;height:220px;border-radius:50%;border:26px solid rgba(28,176,246,.12)}' +
      '.mcpdf .tc2 .nb{flex:none;text-align:left}.mcpdf .tc2 .nb small{display:block;font:900 9px Nunito,Arial;letter-spacing:.3em;color:#C5F209;margin-bottom:4px}' +
      '.mcpdf .tc2 .nb b{display:block;font:italic 900 74px/.82 ' + BC + ';color:#C5F209}' +
      '.mcpdf .tc2 .tx{flex:1;min-width:0;position:relative;z-index:1}.mcpdf .tc2 .tx small{font:900 10px Nunito,Arial;letter-spacing:.2em;text-transform:uppercase;color:#1CB0F6}' +
      '.mcpdf .tc2 h1{margin:4px 0 9px;font:800 34px/1 ' + BC + ';text-transform:uppercase;color:#fff;letter-spacing:.02em}' +
      '.mcpdf .tc2 .ch span{display:inline-block;font:800 9.5px Nunito,Arial;letter-spacing:.1em;text-transform:uppercase;border:1.3px solid #C5F209;color:#C5F209;border-radius:99px;padding:2px 10px 3px;margin-right:6px}' +
      '.mcpdf .tc1 .nb .ic,.mcpdf .tc2 .nb .ic{display:block;width:52px;height:52px;margin-top:6px}.mcpdf .tc1 .nb .ic svg,.mcpdf .tc2 .nb .ic svg{width:100%;height:100%}.mcpdf .tc2 .nb .ic svg{fill:#C5F209}.mcpdf .tc2 .nb .ic svg *{fill:#C5F209}' +
      '.mcpdf .tc2 .bu{z-index:1}.mcpdf .tc1.anch .tx{padding-right:215px}.mcpdf .tc2.anch{padding-right:225px}' +
      '.mcpdf .tm1{display:flex;align-items:center;gap:8px;margin:3px 0 1px}.mcpdf .tm1:before,.mcpdf .tm1:after{content:"";flex:1;height:1.2px;background:var(--c);opacity:.35}' +
      '.mcpdf .tm1 span{font:800 12.5px/1.15 ' + BC + ';letter-spacing:.12em;text-transform:uppercase;color:var(--o);border:1.2px solid var(--c);border-radius:99px;padding:1px 12px 2.4px;background:#fff;text-align:center;max-width:82%}' +
      '.mcpdf .tm2{display:flex;align-items:center;gap:7px;margin:3px 0 1px}.mcpdf .tm2:before,.mcpdf .tm2:after{content:"";flex:1;border-top:1.6px dashed var(--c);opacity:.5}' +
      '.mcpdf .tm2 span{font:900 9.5px/1.3 Nunito,Arial;letter-spacing:.16em;text-transform:uppercase;color:var(--o);background:var(--s);border-radius:99px;padding:2px 12px 3px;text-align:center;max-width:82%}' +
      '.mcpdf .cur2{display:flex;align-items:center;gap:7px;font:900 10px Nunito,Arial;letter-spacing:.18em;text-transform:uppercase;color:var(--c);margin:2px 0 2px}.mcpdf .cur2 i{flex:1;border-top:1.6px dashed var(--c);opacity:.5}' +
      /* Formato 1: número en pastilla */
      '.mcpdf .qn1{display:flex;align-items:center;gap:7px;margin-bottom:3px}.mcpdf .qn1 span{font:800 14.5px/1.05 ' + BC + ';color:#fff;background:var(--c);border-radius:6px;padding:1px 7px 2.6px;letter-spacing:.04em}.mcpdf .qn1:after{content:"";flex:1;border-top:1.2px dotted #c3cad7}' +
      '.mcpdf.m1 .ops b,.mcpdf .m1 .ops b{color:var(--o)}' +
      /* Formato 2: número en círculo al costado y alternativas en cápsulas */
      '.mcpdf .q2{display:flex;gap:9px;padding-bottom:9px;border-bottom:1px solid #eef0f4}.mcpdf .q2 .nm{flex:none;width:28px;height:28px;border-radius:50%;background:var(--s);border:1.3px solid var(--c);color:var(--o);font:800 16px/23.4px ' + BC + ';text-align:center;padding-bottom:2px}' +
      '.mcpdf .q2 .cu{flex:1;min-width:0}.mcpdf .q2 .ops{gap:4px 7px}' +
      '.mcpdf .q2 .ops>div{display:flex;align-items:flex-start;gap:5px;border:1.2px solid #dfe3ea;border-radius:9px;padding:1px 8px 1px 3px}' +
      '.mcpdf .q2 .ops>div>b{flex:none;width:18px;height:18px;margin-top:1.5px;border-radius:50%;background:var(--c);color:#fff;font:900 9px/18px Nunito,Arial;text-align:center}' +
      /* Portadas (toda la hoja, en mm) */
      '.mcpdf .pc{position:absolute;left:0;top:0;width:210mm;height:297mm;overflow:hidden;color:' + t + '}' +
      '.mcpdf .pc .bc{font-family:' + BC + '}.mcpdf .pc img.bu{position:absolute;z-index:3}' +
      '.mcpdf .pc .dt{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm}.mcpdf .pc .dt div{border-radius:4mm;padding:3mm 4mm}' +
      '.mcpdf .pc .dt small,.mcpdf .pc .nb small{display:block;font:900 6.5pt Nunito,Arial;letter-spacing:.16em;text-transform:uppercase}' +
      '.mcpdf .pc .dt b{font:800 20pt/1.1 ' + BC + '}' +
      '.mcpdf .pc .ar{display:grid;gap:2.4mm}.mcpdf .pc .ar div{display:flex;align-items:center;gap:2mm;border-radius:3mm;padding:2.2mm 2.6mm;font:800 7.8pt/1.15 Nunito,Arial}' +
      '.mcpdf .pc .ar svg{flex:none;width:5mm;height:5mm}.mcpdf .pc .ar small{display:block;font-weight:700;font-size:6.6pt;opacity:.85}' +
      '.mcpdf .pc .nb{display:grid;grid-template-columns:3fr 1fr;gap:3mm}.mcpdf .pc .nb div{border-radius:4mm;height:16mm;padding:2.4mm 4mm}' +
      /* Portada clara (Formato 1) */
      '.mcpdf .pc1{background:#fff}' +
      '.mcpdf .pc1 .lomo{position:absolute;left:0;top:0;bottom:0;width:30mm;background:' + t + '}' +
      '.mcpdf .pc1 .vert{position:absolute;left:0;top:297mm;width:297mm;height:30mm;transform:rotate(-90deg);transform-origin:0 0;display:flex;align-items:center;justify-content:center;white-space:nowrap;font:italic 900 50pt/1 ' + BC + ';text-transform:uppercase;color:#fff;letter-spacing:.015em;padding-top:1.5mm}.mcpdf .pc1 .vert em{font-style:italic;color:#C5F209}' +
      '.mcpdf .pc1 .zona{position:absolute;left:30mm;right:0;top:0;bottom:0;padding:14mm 15mm 0 13mm}' +
      '.mcpdf .pc1 .top{display:flex;justify-content:space-between;align-items:center}.mcpdf .pc1 .placa{background:' + t + ';border-radius:3.5mm;padding:3mm 5mm;display:inline-flex}.mcpdf .pc1 .placa svg{height:9mm;width:auto}' +
      '.mcpdf .pc1 .top>span:last-child{font:900 7.6pt Nunito,Arial;letter-spacing:.2em;text-transform:uppercase;color:#0B6BCB}' +
      '.mcpdf .pc1 .hero{position:relative;margin-top:10mm;height:124mm;border-radius:7mm;overflow:hidden;background:linear-gradient(150deg,#E8F1FB 0%,#F4F9E2 100%)}' +
      '.mcpdf .pc1 .hero .o1{position:absolute;right:-26mm;top:-26mm;width:96mm;height:96mm;border-radius:50%;border:12mm solid rgba(11,107,203,.10)}' +
      '.mcpdf .pc1 .hero .o2{position:absolute;left:-14mm;bottom:-30mm;width:70mm;height:70mm;border-radius:50%;background:rgba(197,242,9,.35)}' +
      '.mcpdf .pc1 .tx{position:absolute;left:10mm;top:11mm;z-index:2}.mcpdf .pc1 .tx small{font:900 8.5pt Nunito,Arial;letter-spacing:.26em;text-transform:uppercase;color:#0B6BCB}' +
      '.mcpdf .pc1 h1{margin:2mm 0 0;font:900 64pt/.9 ' + BC + ';text-transform:uppercase;color:' + t + '}' +
      '.mcpdf .pc1 .nro{display:inline-flex;align-items:stretch;margin-top:4mm;border-radius:3.5mm;overflow:hidden;box-shadow:0 2mm 0 #0A4F94}' +
      '.mcpdf .pc1 .nro span{background:' + t + ';color:#fff;font:800 15pt/1 ' + BC + ';letter-spacing:.12em;padding:4mm;display:flex;align-items:center}.mcpdf .pc1 .nro b{background:#0B6BCB;color:#fff;font:900 46pt/1 ' + BC + ';padding:0 6mm 1.6mm;display:flex;align-items:center}' +
      '.mcpdf .pc1 .tipo{display:block;margin-top:6mm;font:800 15pt ' + BC + ';letter-spacing:.14em;text-transform:uppercase;color:#3d4b66}' +
      '.mcpdf .pc1 .chip{display:inline-block;margin-top:2.5mm;background:#C5F209;color:' + t + ';font:900 8pt Nunito,Arial;letter-spacing:.14em;text-transform:uppercase;border-radius:99px;padding:5px 14px}' +
      '.mcpdf .pc1 .blq{margin-top:7mm;display:flex;gap:5mm;align-items:center;border:1.4px solid #d5dbe6;border-radius:5mm;padding:4mm 5mm}' +
      '.mcpdf .pc1 .blq .l{flex:none;width:21mm;height:21mm;border-radius:4mm;background:' + t + ';color:#C5F209;display:flex;flex-direction:column;align-items:center;justify-content:center;font:900 34pt/1 ' + BC + '}.mcpdf .pc1 .blq .l small{display:block;font:900 6pt Nunito,Arial;letter-spacing:.2em;color:#fff;margin-bottom:-1mm}' +
      '.mcpdf .pc1 .blq h3{margin:0;font:800 14pt ' + BC + ';letter-spacing:.1em;text-transform:uppercase;color:' + t + '}.mcpdf .pc1 .blq p{margin:1mm 0 0;font-size:8.6pt;color:#56627a;line-height:1.4}.mcpdf .pc1 .blq p b{color:' + t + '}' +
      '.mcpdf .pc1 .dt{margin-top:5mm}.mcpdf .pc1 .dt div{background:#F2F4F8}.mcpdf .pc1 .dt small,.mcpdf .pc1 .nb small{color:#56627a}' +
      '.mcpdf .pc1 .ar{margin-top:5mm}.mcpdf .pc1 .ar div{background:var(--c);color:#fff}' +
      '.mcpdf .pc1 .nb{margin-top:6mm}.mcpdf .pc1 .nb div{border:1.4px solid #c9cfda}' +
      '.mcpdf.pcla .pie{left:43mm;right:15mm}' +
      /* Portada oscura (Formato 2) */
      '.mcpdf .pc2{background:#0E1A31;color:#fff}' +
      '.mcpdf .pc2 .ban1{position:absolute;left:-30mm;top:116mm;width:290mm;height:56mm;background:#C5F209;transform:rotate(-8deg)}' +
      '.mcpdf .pc2 .ban2{position:absolute;left:-30mm;top:176mm;width:290mm;height:4.5mm;background:#1CB0F6;transform:rotate(-8deg)}' +
      '.mcpdf .pc2 .anillo{position:absolute;right:-48mm;top:-40mm;width:150mm;height:150mm;border-radius:50%;border:16mm solid rgba(28,176,246,.10)}' +
      '.mcpdf .pc2 .top{position:absolute;left:16mm;right:16mm;top:15mm;display:flex;justify-content:space-between;align-items:center;z-index:2}.mcpdf .pc2 .top svg{height:11mm;width:auto}' +
      '.mcpdf .pc2 .top span{font:900 8pt Nunito,Arial;letter-spacing:.22em;text-transform:uppercase;color:#C5F209;border:1.3px solid #C5F209;border-radius:99px;padding:5px 13px}' +
      '.mcpdf .pc2 .tit{position:absolute;left:16mm;top:38mm;z-index:2}.mcpdf .pc2 .tit small{font:900 9pt Nunito,Arial;letter-spacing:.3em;text-transform:uppercase;color:#1CB0F6}' +
      '.mcpdf .pc2 h1{margin:2mm 0 0;font:900 84pt/.86 ' + BC + ';text-transform:uppercase;color:#fff;white-space:nowrap}' +
      '.mcpdf .pc2 .num{position:absolute;left:14mm;top:74mm;z-index:1;display:flex;align-items:flex-end;gap:5mm}' +
      '.mcpdf .pc2 .num small{display:block;font:900 9pt Nunito,Arial;letter-spacing:.3em;color:#C5F209;margin-bottom:3mm}' +
      '.mcpdf .pc2 .num b{display:block;font:italic 900 128pt/.8 ' + BC + ';color:#C5F209;letter-spacing:-.02em}' +
      '.mcpdf .pc2 .num em{font:700 17pt ' + BC + ';font-style:normal;letter-spacing:.14em;text-transform:uppercase;color:#B8C4DA;margin-bottom:5mm}' +
      '.mcpdf .pc2 .banda{position:absolute;left:16mm;top:139mm;z-index:2;transform:rotate(-8deg);transform-origin:0 0;color:#0E1A31}' +
      '.mcpdf .pc2 .banda b{display:block;font:italic 900 40pt/1 ' + BC + ';text-transform:uppercase}.mcpdf .pc2 .banda span{font:800 12pt ' + BC + ';letter-spacing:.2em;text-transform:uppercase}' +
      '.mcpdf .pc2 .dt{position:absolute;left:16mm;right:16mm;top:209mm;z-index:2}.mcpdf .pc2 .dt div{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04)}.mcpdf .pc2 .dt small{color:#8FA0BE}.mcpdf .pc2 .dt b.l{color:#C5F209}' +
      '.mcpdf .pc2 .ar{position:absolute;left:16mm;right:16mm;top:234mm;z-index:2}.mcpdf .pc2 .ar div{background:rgba(255,255,255,.06);border-top:2.2px solid var(--c)}.mcpdf .pc2 .ar small{color:#8FA0BE;opacity:1}' +
      '.mcpdf .pc2 .nb{position:absolute;left:16mm;right:16mm;top:251mm;z-index:2}.mcpdf .pc2 .nb div{background:#fff;color:#0E1A31}.mcpdf .pc2 .nb small{color:#56627a}' +
      '.mcpdf.posc .pie{color:#8FA0BE;border-top-color:rgba(255,255,255,.16)}.mcpdf.posc .pie b{color:#fff}.mcpdf.posc .wm div{color:rgba(255,255,255,.045)}' +
      '.mcpdf.pcla .wm,.mcpdf.posc .wm{z-index:2}';
  }

  function logoSvg(color) {
    // Búho y letras del logo horizontal, con el color del área
    return LOGO.replace(/#7A8C00/g, color).replace(/#1A1626/g, ESTILO.tinta);
  }
  var LOGO = '', LOGO_OSC = '', ICONOS = {};
  function cargarLogo() {
    if (LOGO) return Promise.resolve();
    var texto = function (r) { if (!r.ok) throw new Error(); return r.text(); };
    // Las clases del SVG (.cls-1…) se pasan a fill="" para que dos logos en la misma hoja no se pisen los colores
    var limpio = function (t) {
      t = t.replace(/<\?xml[^>]*>/, '');
      var reglas = {}, st = t.match(/<style[^>]*>([\s\S]*?)<\/style>/);
      if (st) st[1].replace(/\.([\w-]+)\s*\{\s*fill\s*:\s*([^;}]+);?\s*\}/g, function (m, c, f) { reglas[c] = f.trim(); });
      return t.replace(/<style[^>]*>[\s\S]*?<\/style>/, '').replace(/class="([\w-]+)"/g, function (m, c) { return reglas[c] ? 'fill="' + reglas[c] + '"' : m; });
    };
    return Promise.all([
      fetch(RAIZ + 'assets/img/logo-modo-cachimbo-horizontal-claro.svg').then(texto)
        .then(function (t) { LOGO = limpio(t); }, function () { LOGO = '<svg viewBox="0 0 200 40"><text x="0" y="28" font-size="26" font-weight="900" fill="#1A1626">MODO CACHIMBO</text></svg>'; }),
      // Logo original (lima y blanco) para las portadas
      fetch(RAIZ + 'assets/img/logo-modo-cachimbo-horizontal.svg').then(texto)
        .then(function (t) { LOGO_OSC = limpio(t); }, function () { LOGO_OSC = '<svg viewBox="0 0 200 40"><text x="0" y="28" font-size="26" font-weight="900" fill="#fff">MODO CACHIMBO</text></svg>'; })
    ].concat(ORDEN_AREAS.map(function (a) {
      return fetch(RAIZ + 'assets/icons/' + a + '.svg').then(texto).then(function (t) { ICONOS[a] = limpio(t).replace('<svg ', '<svg fill="#fff" '); }, function () { ICONOS[a] = ''; });
    })));
  }

  /* ---------- Armado de páginas ---------- */
  function Armador(doc, info, op, tam) {
    this.doc = doc; this.info = info; this.op = op; this.tam = tam || {};
    this.pal = ESTILO.area[doc.area] || ESTILO.area.general;
    this.modelo = MODELOS[doc.modelo] ? +doc.modelo : 0;   // 0 = formato antiguo (si no se eligió ninguno)
    this.paginas = [];
    this.D = lienzo().d;
    this.taller = this.D.createElement('div');
    this.D.body.appendChild(this.taller);
    var H = ESTILO.hoja;
    this.W = H.w - 2 * H.lado; this.Hc = H.h - H.arriba - H.abajo; this.colW = (this.W - H.sep) / 2;
    // Medidor: un bloque fuera de la vista con el mismo estilo que la hoja
    this.med = this.D.createElement('div'); this.med.className = 'mcpdf' + (this.modelo ? ' m' + this.modelo : ''); this.med.style.height = 'auto'; this.med.style.overflow = 'visible';
    this.taller.appendChild(this.med);
    this.vars(this.med, this.pal);
  }
  Armador.prototype.medidas = function (el) {
    var tam = this.tam;
    Array.prototype.forEach.call(el.querySelectorAll('img'), function (im) {
      var src = im.getAttribute('src'), t = tam[src];
      if (t) {
        // Tamaño fijo desde ya (sin esperar a que cargue): ancho hasta 80 % de la columna y alto hasta --imgh
        im.setAttribute('width', t[0]); im.setAttribute('height', t[1]);
        im.style.aspectRatio = t[0] + ' / ' + t[1];
        im.style.width = 'min(var(--imgw, 80%), calc(var(--imgh, ' + ESTILO.imgAlto + 'px) * ' + (t[0] / t[1]).toFixed(4) + '), ' + t[0] + 'px)';
        im.style.height = 'auto';
      }
      if (tam['tinta:' + src]) im.setAttribute('src', tam['tinta:' + src]);
      im.loading = 'eager';
    });
  };
  Armador.prototype.vars = function (el, pal) { el.style.setProperty('--c', pal.c); el.style.setProperty('--o', pal.o); el.style.setProperty('--s', pal.s); el.style.setProperty('--l', pal.l); };
  // Pone el html en el medidor con el ancho dado y devuelve el elemento listo (fórmulas dibujadas, alternativas acomodadas)
  // Dónde se puede cortar un bloque para seguirlo en la otra columna u hoja:
  // entre líneas de texto, nunca en medio de una línea, fórmula, imagen, fila de tabla o grupo de alternativas
  function puntosDeCorte(b) {
    var D = b.ownerDocument, top = b.getBoundingClientRect().top, cajas = [];
    var atom = b.querySelectorAll('img,svg,.katex-display,.katex,tr,summary,.qn,.qn1,.nm,.arc1,.arc2,.tm1,.tm2,.mcq-par,.mcq-an,.mcq-img,.g,.abierta,.mcq-etq,.hr,.vf,.vr1,.vh1');
    Array.prototype.forEach.call(atom, function (e) { var r = e.getBoundingClientRect(); if (r.height) cajas.push([r.top - top, r.bottom - top]); });
    Array.prototype.forEach.call(b.querySelectorAll('.ops'), function (o) {
      var r = o.getBoundingClientRect();
      // Las alternativas se pueden cortar entre filas para aprovechar la hoja, pero la primera fila
      // nunca se separa del enunciado: va pegada a la última línea de arriba (unos 26 px)
      Array.prototype.forEach.call(o.children, function (c) { var q = c.getBoundingClientRect(); cajas.push([q.top - top, q.bottom - top]); });
      // Con gráfico arriba, sí se puede cortar justo antes de las alternativas: el enunciado y el gráfico
      // llenan el final de la columna y las alternativas siguen arriba de la siguiente
      var conGraf = !!b.querySelector('img,.g svg,.mcq-graf');
      // Sin gráfico: las alternativas van con las dos últimas líneas del enunciado (nunca pasa sola una
      // línea suelta como «gas?» a la otra columna)
      var p1 = o.children[0] && o.children[0].getBoundingClientRect(); if (p1 && !conGraf) cajas.push([r.top - top - 46, p1.bottom - top]);
    });
    var tw = D.createTreeWalker(b, NodeFilter.SHOW_TEXT, null), t, rg = D.createRange();
    while ((t = tw.nextNode())) {
      if (!t.nodeValue.trim()) continue;
      rg.selectNodeContents(t);
      Array.prototype.forEach.call(rg.getClientRects(), function (r) { if (r.height) cajas.push([r.top - top, r.bottom - top]); });
    }
    var fines = cajas.map(function (c) { return Math.ceil(c[1]) + 1; }).sort(function (a, c) { return a - c; });
    return fines.filter(function (y, i) {
      if (i && y === fines[i - 1]) return false;
      return !cajas.some(function (c) { return c[0] < y - 1 && c[1] > y + 1; });
    });
  }
  // ¿Algo de adentro se sale por la derecha de el? (sin contar el MathML oculto ni los trazos SVG de KaTeX)
  function sale(el) {
    var der = el.getBoundingClientRect().right + 1;
    return Array.prototype.some.call(el.querySelectorAll('*'), function (e) {
      return !e.closest('.katex-mathml') && !e.closest('svg') && e.getBoundingClientRect().right > der;
    });
  }
  function achicar(ks, caja) {
    var der = caja.getBoundingClientRect().right;
    Array.prototype.forEach.call(ks, function (k) {
      var r = k.getBoundingClientRect(); if (r.right <= der + 1 || !r.width) return;
      var cabe = der - Math.max(r.left, caja.getBoundingClientRect().left);
      k.style.fontSize = Math.round(Math.max(0.75, Math.min(1, cabe / r.width) * 0.97) * 104) + '%';
    });
  }
  Armador.prototype.medir = function (html, ancho, pal) {
    var b = this.D.createElement('div'); b.className = 'bl'; b.style.position = 'relative'; b.style.width = ancho + 'px'; b.innerHTML = html;
    this.medidas(b);
    if (pal) this.vars(b, pal);
    this.med.appendChild(b);
    matematicas(b);
    // Un salto de línea justo después de una fórmula en bloque dejaba una línea en blanco
    Array.prototype.forEach.call(b.querySelectorAll('.katex-display'), function (d) {
      var vacio = function (x) { return x && x.nodeType === 3 && !x.nodeValue.trim(); };
      var p = d, n = null;
      while (p && p !== b) {
        n = p.nextSibling; while (vacio(n)) n = n.nextSibling;
        if (n) break;
        p = p.parentNode;
      }
      if (n && n.nodeName === 'BR') n.remove();
    });
    // Fórmulas en bloque que no caben: se achican (mínimo 70 %)
    Array.prototype.forEach.call(b.querySelectorAll('.katex-display'), function (d) {
      var k = d.querySelector('.katex-html'); if (!k) return;
      var w = Array.prototype.reduce.call(k.children, function (a, c) { return a + c.getBoundingClientRect().width; }, 0);
      var r = d.clientWidth / w; if (r < 1) d.style.fontSize = Math.round(Math.max(0.7, r * 0.97) * 100) + '%';
    });
    // Alternativas: 3 columnas si todas caben en una línea; si alguna se parte, 2; si aún se parte, 1
    Array.prototype.forEach.call(b.querySelectorAll('.ops'), function (ops) {
      var cols = ['c3', 'c2', 'c1'];
      for (var i = 0; i < cols.length; i++) {
        ops.className = 'ops ' + cols[i];
        // Cada alternativa debe entrar en una sola línea (letra incluida): se prueba sin saltos de línea
        var partida = Array.prototype.some.call(ops.children, function (c) {
          c.style.whiteSpace = 'nowrap'; var no = c.scrollWidth > c.clientWidth + 1 || sale(c); c.style.whiteSpace = ''; return no;
        });
        if (!partida) break;
      }
      // En una columna y aún se sale (una fórmula larga en la alternativa): se achica solo esa fórmula
      Array.prototype.forEach.call(ops.children, function (c) { if (sale(c)) achicar(c.querySelectorAll('.katex'), c); });
    });
    // Celdas con fracciones, raíces o sumatorias: la fila queda más alta para que la fórmula no se salga
    // (al pasar la hoja a imagen, las letras de KaTeX pueden dibujarse un poco más abajo que en pantalla)
    Array.prototype.forEach.call(b.querySelectorAll('td,th'), function (c) {
      if (c.querySelector('.mfrac,.sqrt,.op-limits,.delimsizing')) c.classList.add('mcpdf-alta');
    });
    // Fórmulas en el texto y tablas que se salen de la columna: se achican lo justo (mínimo 75 %)
    achicar(Array.prototype.filter.call(b.querySelectorAll('.katex'), function (k) { return !k.closest('.katex-display') && !k.closest('.ops'); }), b);
    Array.prototype.forEach.call(b.querySelectorAll('table'), function (t) {
      var r = b.clientWidth / t.getBoundingClientRect().width; if (r < 1) t.style.fontSize = Math.round(Math.max(0.75, r * 0.97) * 100) + '%';
    });
    var h = b.offsetHeight, cortes = puntosDeCorte(b);
    this.med.removeChild(b);
    return { el: b, h: h, cortes: cortes };
  };
  Armador.prototype.nuevaPagina = function (horizontal) {
    var H = ESTILO.hoja, p = this.D.createElement('div');
    p.className = 'mcpdf' + (horizontal ? ' h' : '') + (this.modelo ? ' m' + this.modelo : '');
    this.vars(p, this.pal);
    var marca = this.info.apodo + ' · ' + this.info.email + '        ';
    var wm = '<div class="wm">' + Array.from({ length: 18 }, function (_, i) { return '<div style="top:' + (i * 6 - 4) + '%">' + esc(marca + marca + marca + marca) + '</div>'; }).join('') + '</div>';
    p.innerHTML = wm + '<div class="area-c"></div>';
    this.taller.appendChild(p);
    var pg = { el: p, c: p.querySelector('.area-c'), y: [0, 0], col: 0, base: 0, filas: {}, h: horizontal ? H.w - H.arriba - H.abajo : this.Hc, horizontal: !!horizontal, sinCab: false };
    this.paginas.push(pg);
    this.pg = pg;
    return pg;
  };
  Armador.prototype.poner = function (pg, el, x, y, w) { el.style.position = 'absolute'; el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.width = w + 'px'; pg.c.appendChild(el); };
  // Bloque a todo el ancho (banda de área, títulos, filas de claves)
  Armador.prototype.ancho = function (html, op) {
    op = op || {}; var G = ESTILO.hoja.gap;
    var m = this.medir(html, this.W, op.pal);
    var pg = this.pg || this.nuevaPagina();
    var y = Math.max(pg.y[0], pg.y[1]);
    if (y + m.h + (op.conSiguiente || 0) > pg.h && y > 0) { pg = this.nuevaPagina(); y = 0; }
    var h = m.h, w = this.W;
    if (h > pg.h - y) { var z = Math.max(0.55, (pg.h - y) / h); w = this.W / z; h = h * z; m.el.style.transformOrigin = '0 0'; m.el.style.transform = 'scale(' + z.toFixed(3) + ')'; }
    this.poner(pg, m.el, 0, y, w);
    pg.y[0] = pg.y[1] = pg.base = y + h + (op.gap != null ? op.gap : G); pg.col = 0;
    return m;
  };
  // Bloque en columna: primero se llena la izquierda, luego la derecha, luego hoja nueva.
  // conSiguiente: alto del bloque que debe ir pegado (la asignatura no queda sola al final)
  Armador.prototype.columna = function (html, op) {
    op = op || {}; var G = ESTILO.hoja.gap, sep = ESTILO.hoja.sep, self = this, MIN = 60;
    var m = op.medido || this.medir(html, this.colW, op.pal);
    var pg = this.pg || this.nuevaPagina();
    function siguiente() { if (pg.col === 0) pg.col = 1; else pg = self.nuevaPagina(); }
    function anotar(y, h) {
      var fila = pg.filas[pg.base] || (pg.filas[pg.base] = { top: pg.base, fin: 0, dos: false });
      fila.fin = Math.max(fila.fin, y + h); if (pg.col === 1) fila.dos = true;
    }
    // Títulos (asignatura) no se quedan solos al final: necesitan algo de lo que sigue
    var junto = Math.min(op.conSiguiente || 0, 140);
    if (op.sigMedido) {
      // Lo mínimo que tiene que entrar de lo que sigue: hasta su primer corte permitido, o entero si es corto
      var sm = op.sigMedido, minS = Math.min(160, Math.max(110, sm.h * 0.34)), pc = sm.h;
      (sm.cortes || []).some(function (cy) { if (cy >= minS && sm.h - cy >= 48) { pc = cy; return true; } return false; });
      junto = Math.min(pc, pg.h * 0.6);
    }
    if ((m.h < 70 || op.titulo) && junto && pg.h - pg.y[pg.col] < m.h + junto && pg.y[pg.col] > pg.base) siguiente();
    var desde = 0, primero = true;
    while (desde < m.h - 1) {
      var libre = pg.h - pg.y[pg.col], resta = m.h - desde, x = pg.col ? this.colW + sep : 0, y = pg.y[pg.col];
      if (resta <= libre) {
        // Entra lo que falta
        var el = primero ? m.el : m.el.cloneNode(true);
        if (primero) this.poner(pg, el, x, y, this.colW);
        else { var c = this.D.createElement('div'); c.style.cssText = 'position:absolute;overflow:hidden;left:' + x + 'px;top:' + y + 'px;width:' + this.colW + 'px;height:' + Math.ceil(resta) + 'px'; el.style.position = 'absolute'; el.style.left = '0'; el.style.top = (-desde) + 'px'; el.style.width = this.colW + 'px'; c.appendChild(el); pg.c.appendChild(c); }
        anotar(y, resta);
        pg.y[pg.col] += resta + (op.gap != null ? op.gap : G);
        return m;
      }
      // No entra: se busca el último corte que quepa y se sigue en la otra columna u hoja
      var corte = 0;
      (m.cortes || []).forEach(function (cy) { if (cy > desde + 1 && cy - desde <= libre && m.h - cy >= 48) corte = cy; });
      // El primer pedazo tiene que ser al menos unas 5 líneas (o un tercio si la pregunta es corta);
      // si solo entraría el título y una o dos líneas, la pregunta entera pasa a la otra columna u hoja
      var minimo = primero ? Math.min(160, Math.max(110, m.h * 0.34)) : MIN;
      if (op.noDividir || !corte || corte - desde < minimo) {
        if (y <= pg.base && libre >= pg.h * 0.9) {
          // Ni en una columna vacía entra hasta el primer corte (imagen enorme): se achica
          var z = Math.max(0.55, libre / resta), e2 = primero ? m.el : m.el.cloneNode(true);
          e2.style.transformOrigin = '0 0'; e2.style.transform = 'scale(' + z.toFixed(3) + ')';
          if (primero) this.poner(pg, e2, x, y, this.colW / z);
          else { var c2 = this.D.createElement('div'); c2.style.cssText = 'position:absolute;overflow:hidden;left:' + x + 'px;top:' + y + 'px;width:' + this.colW + 'px;height:' + Math.ceil(resta * z) + 'px'; e2.style.position = 'absolute'; e2.style.left = '0'; e2.style.top = (-desde * z) + 'px'; e2.style.width = (this.colW / z) + 'px'; c2.appendChild(e2); pg.c.appendChild(c2); }
          anotar(y, resta * z); pg.y[pg.col] += resta * z + G; return m;
        }
        siguiente(); continue;
      }
      var pieza = primero ? m.el : m.el.cloneNode(true), caja = this.D.createElement('div');
      caja.style.cssText = 'position:absolute;overflow:hidden;left:' + x + 'px;top:' + y + 'px;width:' + this.colW + 'px;height:' + Math.ceil(corte - desde) + 'px';
      pieza.style.position = 'absolute'; pieza.style.left = '0'; pieza.style.top = (-desde) + 'px'; pieza.style.width = this.colW + 'px';
      caja.appendChild(pieza); pg.c.appendChild(caja);
      anotar(y, corte - desde);
      pg.y[pg.col] = pg.h;
      desde = corte; primero = false;
      siguiente();
    }
    return m;
  };
  // Línea entre las dos columnas, en cada tramo que usa las dos
  Armador.prototype.reglas = function () {
    var sep = ESTILO.hoja.sep, self = this;
    this.paginas.forEach(function (pg) {
      if (pg.horizontal) return;
      Object.keys(pg.filas).forEach(function (k) {
        var f = pg.filas[k]; if (!f.dos) return;
        var r = self.D.createElement('div'); r.className = 'regla';
        r.style.left = (self.colW + sep / 2) + 'px'; r.style.top = f.top + 'px'; r.style.bottom = 'auto'; r.style.height = (f.fin - f.top) + 'px';
        pg.c.appendChild(r);
      });
    });
  };
  Armador.prototype.cabeceraYPie = function () {
    var H = ESTILO.hoja, total = this.paginas.length, info = this.info, doc = this.doc, self = this;
    var logo = logoSvg(this.pal.c);
    this.paginas.forEach(function (pg, i) {
      if (!pg.sinCab) {
        var cab = self.D.createElement('div'); cab.className = 'cab';
        cab.innerHTML = logo + '<div class="t"><small>' + esc(doc.cabecera1 || '') + '</small><b>' + esc(doc.cabecera2 || doc.titulo || '') + '</b></div>';
        pg.el.appendChild(cab);
      }
      var pie = self.D.createElement('div'); pie.className = 'pie';
      pie.innerHTML = '<span>Descargado por <b>' + esc(info.apodo) + '</b> · <b>' + esc(info.email) + '</b> · ' + esc(info.fecha) + '</span><span>N.º ' + esc(info.num) + ' · pág. ' + (i + 1) + ' de ' + total + '</span>';
      pg.el.appendChild(pie);
    });
  };

  /* ---------- Piezas ---------- */
  function dos(n) { return n < 10 ? '0' + n : String(n); }
  function preguntaHtml(q, n, modelo) {
    var qt = '<div class="qt">' + textoHtml(q) + '</div>', par = modelo ? '' : ')';
    var ops = esAbierta(q) ? '<div class="abierta">Respuesta:</div>'
      : '<div class="ops c3">' + q.options.map(function (o, i) { return '<div><b>' + 'ABCDE'.charAt(i) + par + '</b> <span class="ot">' + opcionHtml(o) + '</span></div>'; }).join('') + '</div>';
    if (modelo === 2) return '<div class="q2"><div class="nm">' + n + '</div><div class="cu">' + qt + ops + '</div></div>';
    if (modelo === 1) return '<div class="qn1"><span>' + dos(n) + '</span></div>' + qt + ops;
    return '<div class="qn">Pregunta N.º ' + n + '</div>' + qt + ops;
  }
  // Cabecera de un área del ancho de la columna (Formato 1 y 2)
  function areaColHtml(modelo, area, i, j) {
    var nom = (AREAS[area] || {}).nom || 'Preguntas';
    if (modelo === 2) return '<div class="arc2"><h2>' + esc(nom) + '</h2><span>P. ' + i + '–' + j + '</span></div>';
    return '<div class="arc1"><div class="ico">' + (ICONOS[area] || '') + '</div><div><small>Área</small><h2>' + esc(nom) + '</h2></div><div class="rg">Preguntas<b>' + dos(i) + ' – ' + dos(j) + '</b></div></div>';
  }
  function cursoColHtml(modelo, titulo) {
    if (!titulo) return '';
    return modelo === 2 ? '<div class="cur2">' + esc(titulo) + '<i></i></div>' : '<div class="cur1"><span>' + esc(titulo) + '</span></div>';
  }
  // Tema de la pregunta (Antonimia, Analogías…): va centrado cuando cambia, para separar las preguntas por tema
  function temaDe(q) {
    var t = String((q && (q.tema || q._tit)) || '').trim();
    if (t.indexOf(' · ') > 0) t = t.split(' · ').pop().trim();
    return /^(seminario|banqueo|simulacro|tema)\b/i.test(t) ? '' : t;
  }
  // Solo en Lenguaje y Razonamiento Verbal
  function conTemas(q, titulo) {
    var c = (q && q._curso) || cursoPorNombre((q && q.asignatura) || titulo || '');
    return c === 'lenguaje' || c === 'raz-verbal';
  }
  function temaColHtml(modelo, t) { return '<div class="tm' + modelo + '"><span>' + esc(t) + '</span></div>'; }
  // Junta las preguntas de un mismo tema (en el orden en que aparece cada tema)
  function juntarTemas(qs) {
    var orden = [], g = {};
    qs.forEach(function (q) { var t = temaDe(q).toLowerCase(); if (!g[t]) { g[t] = []; orden.push(t); } g[t].push(q); });
    return [].concat.apply([], orden.map(function (t) { return g[t]; }));
  }
  function bannerHtml(doc) {
    return '<div class="ban">' + (doc.numero ? '<div class="n"><small>' + esc(doc.etiqueta || 'TEMA') + '</small>' + esc(doc.numero) + '</div>' : '') +
      '<div><h1>' + esc(doc.titulo) + '</h1><p>' + esc(doc.subtitulo || '') + '</p><div class="chips">' + (doc.chips || []).map(function (c) { return '<span>' + esc(c) + '</span>'; }).join('') + '</div></div></div>';
  }

  // Preguntas en secciones: [{ area, titulo (asignatura), preguntas }]; area = '' para un solo curso
  function armarPreguntas(A, secciones, conBandas) {
    var n = 0, areaAct = null, M = A.modelo, enCol = conBandas && M, rg = [], c = 0, nLec = 0;
    // En el simulacro las lecturas vienen de varias fuentes: se numeran de nuevo en orden (Texto 01, 02…)
    var renumerar = A.doc.tipo === 'simulacro';
    // Formato 1 y 2: el área va como cabecera de su columna; se calcula qué preguntas tiene cada tramo de área
    secciones.forEach(function (s, k) {
      var u = rg[rg.length - 1];
      if (!u || u.area !== s.area) rg.push(u = { area: s.area, i: c + 1, j: c });
      c += s.preguntas.length; u.j = c; s._tramo = u; s._primera = !k || secciones[k - 1].area !== s.area;
    });
    secciones.forEach(function (s) {
      var pal = ESTILO.area[s.area] || A.pal;
      if (!enCol && conBandas && s.area !== areaAct) {
        areaAct = s.area;
        var prim0 = s.preguntas[0] ? A.medir(preguntaHtml(s.preguntas[0], n + 1, M), A.colW, pal).h : 0;
        A.ancho('<div class="bandaa"><span>Área de ' + esc((AREAS[s.area] || {}).nom || s.areaNom || 'Preguntas') + '</span></div>', { pal: pal, gap: 12, conSiguiente: Math.min(prim0 + 20, 170) });
      }
      var prim = true, lecAct = null, temAct = null;
      s.preguntas.forEach(function (q, k) {
        n++;
        // ¿Empieza aquí una lectura? Se cuentan las preguntas seguidas que la comparten
        var lec = separarLectura(q.text), cab = null;
        if (lec) {
          q = Object.assign({}, q, { _sinLectura: lec.resto });
          if (lec.lectura !== lecAct) {
            lecAct = lec.lectura;
            var j = k + 1; while (j < s.preguntas.length) { var l2 = separarLectura(s.preguntas[j].text); if (!l2 || l2.lectura !== lecAct) break; j++; }
            var cuantas = j - k, pos = cuantas > 1 ? 'preguntas ' + n + ' a ' + (n + cuantas - 1) : 'pregunta ' + n;
            nLec++;
            var lecV = lec;
            if (renumerar) {
              var tit = (/^lectura/i.test(lec.titulo) ? 'LECTURA ' : 'TEXTO ') + dos(nLec), ls = lec.lectura.split('\n');
              ls[0] = '[' + tit + ']'; lecV = { lectura: ls.join('\n'), titulo: tit, resto: lec.resto };
            }
            cab = A.medir(lecturaHtml(lecV, pos), A.colW, pal);
          }
        } else lecAct = null;
        var m = A.medir(preguntaHtml(q, n, M), A.colW, pal);
        var sig = (cab ? Math.min(cab.h, A.Hc * 0.5) + 10 : 0) + m.h + 10;
        var tm = enCol && conTemas(q, s.titulo) ? temaDe(q) : '', tmH = '';
        if (tm && tm.toLowerCase() !== String(s.titulo || '').toLowerCase() && tm.toLowerCase() !== temAct) tmH = temaColHtml(M, tm);
        if (enCol) temAct = tm.toLowerCase();
        if (prim && enCol && (s._primera || s.titulo)) {
          var t = (s._primera ? areaColHtml(M, s.area, s._tramo.i, s._tramo.j) : '') + cursoColHtml(M, s.titulo) + tmH;
          tmH = '';
          // Formato 1: la cabecera de un área nueva se separa de la última pregunta del área anterior
          if (s._primera && M === 1 && A.pg && A.pg.y[A.pg.col] > A.pg.base) A.pg.y[A.pg.col] += 14;
          if (t) A.columna(t, { pal: pal, gap: 10, titulo: true, conSiguiente: sig, sigMedido: cab || m });
        } else if (prim && s.titulo) {
          A.columna(M ? cursoColHtml(M, s.titulo) : '<div class="asig"><span>' + esc(s.titulo) + '</span></div>', { pal: pal, gap: 10, titulo: true, conSiguiente: sig, sigMedido: cab || m });
        }
        prim = false;
        if (tmH) A.columna(tmH, { pal: pal, gap: 8, titulo: true, conSiguiente: sig, sigMedido: cab || m });
        if (cab) {
          // La lectura va pegada a su primera pregunta; si es más alta que una columna, a todo el ancho
          A.columna(null, { medido: cab, gap: 10 });
        }
        // Con gráfico: si no entra en lo que queda de la columna, se achica el gráfico (hasta imgMin) para llenar el hueco
        if (A.pg && /<img/i.test(m.el.innerHTML)) {
          var libre = A.pg.h - A.pg.y[A.pg.col];
          if (m.h > libre && libre > ESTILO.imgMin + 40) {
            for (var ih = ESTILO.imgAlto - 10; ih >= ESTILO.imgMin; ih -= 10) {
              var m2 = A.medir('<div style="--imgh:' + ih + 'px">' + preguntaHtml(q, n, M) + '</div>', A.colW, pal);
              if (m2.h <= libre) { m = m2; break; }
            }
          }
        }
        A.columna(null, { medido: m });
      });
    });
    return n;
  }
  function todas(secciones) { return [].concat.apply([], secciones.map(function (s) { return s.preguntas; })); }

  function armarHoja(A, qs) {
    A.nuevaPagina();
    A.ancho('<div class="tit">Hoja de respuestas</div>', { gap: 10 });
    qs.forEach(function (q, i) {
      var fila = '<div class="hr' + (Math.floor(i / 1) % 2 ? ' z' : '') + '"><b>' + (i + 1) + '</b>' + (esAbierta(q) ? '<u></u>' : 'ABCDE'.slice(0, q.options.length).split('').map(function (l) { return '<i>' + l + '</i>'; }).join('')) + '</div>';
      A.columna(fila, { gap: 4 });
    });
  }
  function armarClaves(A, qs, op, seguir) {
    var cl = qs.map(claveDe);
    if (!seguir) A.nuevaPagina();
    A.ancho('<div class="tit"' + (seguir ? ' style="margin-top:14px"' : '') + '>Claves</div>', { gap: 10, conSiguiente: seguir ? 150 : 0 });
    for (var i = 0; i < cl.length; i += 10) {
      A.ancho('<div class="g10">' + cl.slice(i, i + 10).map(function (k, j) { return '<div><small>' + (i + j + 1) + '</small><b>' + (k === '-' ? '✎' : k) + '</b></div>'; }).join('') + '</div>', { gap: 8 });
    }
    var ab = qs.map(function (q, i) { return esAbierta(q) ? '<div><b>' + (i + 1) + ')</b> ' + esc(respAbierta(q)) + '</div>' : ''; }).filter(Boolean);
    if (ab.length) A.ancho('<div class="abiertas"><div class="tit" style="font-size:15px">Preguntas abiertas (✎)</div>' + ab.join('') + '</div>', { gap: 12 });
    var txt = cl.join(''), partes = [];
    for (var k = 0; k < txt.length; k += 80) partes.push(txt.slice(k, k + 80));
    A.ancho('<div class="opt"><b>Clave para OptiCheck</b>' + partes.map(function (p, j) {
      return (partes.length > 1 ? '<small style="font-weight:900">Ficha ' + (j + 1) + ':</small> ' : '') + '<code>' + p.replace(/(.{5})/g, '$1 ').trim() + '</code>';
    }).join('<br>') + '<p>Copia el texto en OptiCheck → Clave para calificar la ficha óptica. Un guion (-) es una pregunta que no se califica.</p></div>', { gap: 14 });
    if (op && op.puntaje) {
      var filas = op.puntaje.map(function (r) { return '<tr><td>' + esc(r[0]) + ' <span style="color:#6b7388">(' + r[1] + '–' + r[2] + ')</span></td><td></td><td></td><td></td><td></td></tr>'; }).join('');
      A.ancho('<div class="tit" style="font-size:16px;margin-bottom:6px">Tu puntaje</div><table class="punt"><tr><th>' + esc(op.puntajeCol || 'Área') + '</th><th>Correctas</th><th>Incorrectas</th><th>En blanco</th><th>Puntaje</th></tr>' + filas + '<tr><th>Total</th><th></th><th></th><th></th><th></th></tr></table>', { gap: 10 });
      A.ancho('<p class="nota">Puntaje = correctas × ' + esc(op.ok || '1,00') + ' − incorrectas × ' + esc(op.mal || '0,10') + '. Este material es personal e intransferible: cada descarga lleva un número único que identifica a quien la hizo.</p>');
    } else A.ancho('<p class="nota">Este material es personal e intransferible: cada descarga lleva un número único que identifica a quien la hizo.</p>');
  }

  /* ---------- Ficha óptica (mismas medidas que la plantilla por defecto de OptiCheck) ---------- */
  var OPTI = { cols: 4, rows: 20, opts: 5, x0: 0.0558, dx: 0.0385, dcol: 0.2522, y0: 0.0292, dy: 0.04938, r: 0.0142, aspect: 0.7254, vlines: [0, 0.2413, 0.4916, 0.7441, 1], mk: [0.35769, 0.29886, 0.96538, 0.95131] };
  function armarFichas(A, qs) {
    var P = OPTI, porFicha = P.cols * P.rows, fichas = Math.max(1, Math.ceil(qs.length / porFicha));
    var mm = function (v) { return (v * PX_MM).toFixed(2) + 'px'; };
    var MK = { x0: 14, y0: 14.2, x1: 283, s: 7 }, Wm = MK.x1 - MK.x0, Hm = Wm * (P.aspect * (P.mk[2] - P.mk[0]) / (P.mk[3] - P.mk[1])); MK.y1 = MK.y0 + Hm;
    var BX = { l: MK.x0 + P.mk[0] * Wm, t: MK.y0 + P.mk[1] * Hm, w: (P.mk[2] - P.mk[0]) * Wm, h: (P.mk[3] - P.mk[1]) * Hm };
    var doc = A.doc, logo = logoSvg(A.pal.c);
    for (var f = 0; f < fichas; f++) {
      var pg = A.nuevaPagina(true); pg.sinCab = true;
      var h = '', ini = f * porFicha;
      [[MK.x0, MK.y0], [MK.x1, MK.y0], [MK.x1, MK.y1], [MK.x0, MK.y1]].forEach(function (p) { h += '<div class="mk" style="left:' + mm(p[0] - MK.s / 2) + ';top:' + mm(p[1] - MK.s / 2) + ';width:' + mm(MK.s) + ';height:' + mm(MK.s) + '"></div>'; });
      for (var c = 0; c < P.cols; c++) {
        var cl = BX.l + P.vlines[c] * BX.w, cw = (P.vlines[c + 1] - P.vlines[c]) * BX.w;
        for (var r = 0; r < P.rows; r++) {
          var cy = BX.t + (P.y0 + r * P.dy) * BX.h, qn = ini + c * P.rows + r + 1, q = qs[qn - 1], off = !q || esAbierta(q);
          if (r % 2 === 1) h += '<div class="fzb" style="background:' + A.pal.s + ';left:' + mm(cl) + ';top:' + mm(cy - P.dy * BX.h / 2) + ';width:' + mm(cw) + ';height:' + mm(P.dy * BX.h) + '"></div>';
          var ax = BX.l + (P.x0 + c * P.dcol) * BX.w, rr = P.r * BX.w;
          h += '<div class="fnm' + (off ? ' off' : '') + '" style="left:' + mm(cl + 0.6) + ';width:' + mm(ax - cl - 0.6 - rr - 0.9) + ';top:' + mm(cy - 2) + '">' + qn + '</div>';
          for (var o = 0; o < P.opts; o++) {
            var cx = ax + o * P.dx * BX.w;
            h += '<div class="fbb' + (off ? ' off' : '') + '" style="left:' + mm(cx - rr) + ';top:' + mm(cy - rr) + ';width:' + mm(2 * rr) + ';height:' + mm(2 * rr) + '">' + 'ABCDE'.charAt(o) + '</div>';
          }
        }
      }
      h += '<div class="fbox" style="left:' + mm(BX.l) + ';top:' + mm(BX.t) + ';width:' + mm(BX.w) + ';height:' + mm(BX.h) + '"></div>';
      P.vlines.slice(1, -1).forEach(function (fx) { h += '<div class="fvl" style="left:' + mm(BX.l + fx * BX.w) + ';top:' + mm(BX.t) + ';height:' + mm(BX.h) + '"></div>'; });
      h += '<div class="fiz" style="left:' + mm(22) + ';top:' + mm(12) + ';width:' + mm(80) + '">' + logo.replace('<svg', '<svg style="height:30px;width:auto"') +
        '<div class="tt">Hoja de identificación</div><div class="f">Apellido paterno</div><div class="f">Apellido materno</div><div class="f">Nombres</div>' +
        '<div class="fila"><div class="f">Aula / Grado</div><div class="f">Fecha</div></div>' +
        '<div class="f" style="padding-bottom:6px">DNI o código<div class="dni">' + '<i></i>'.repeat(8) + '</div></div>' +
        '<div class="f">Carrera a la que postula</div><div class="f" style="padding-bottom:6px">Grupo de la carrera<div class="gr"><span>A</span><span>B</span><span>C</span><span>D</span></div></div>' +
        '<div class="f" style="height:' + mm(20) + '">Firma del postulante</div></div>';
      h += '<div class="fde" style="left:' + mm(BX.l) + ';top:' + mm(10.5) + ';width:' + mm(BX.w) + '"><h1>Hoja de <em>respuestas</em></h1><div class="sim">' + esc(doc.titulo) + (fichas > 1 ? ' · Ficha ' + (f + 1) + ' de ' + fichas : '') + '</div>' +
        '<span class="badge"><i></i>Lista para OptiCheck</span>' +
        '<div class="instr"><div><h4>Instrucciones</h4><ul><li>Usa lápiz 2B. Rellena el círculo completo y una sola alternativa por pregunta.</li><li>Si te equivocas, borra bien y vuelve a marcar.</li><li>No dobles la hoja ni marques sobre los 4 cuadros negros.</li></ul></div>' +
        '<div><h4>Así se marca</h4><div class="ej"><i class="ok"></i><small>Correcto</small></div><div class="ej"><i style="border-style:dashed"></i><i style="background:linear-gradient(90deg,#000 50%,#fff 50%)"></i><i style="background:radial-gradient(#000 25%,#fff 30%)"></i><small>Incorrecto</small></div></div></div></div>';
      // La ficha no lleva cabecera ni márgenes: va sobre toda la hoja
      pg.c.style.left = '0'; pg.c.style.top = '0'; pg.c.style.width = '100%'; pg.c.style.height = '100%';
      pg.c.insertAdjacentHTML('beforeend', h);
      // Marca de agua solo en la zona de identificación (no estorba a la lectura de burbujas)
      var wm = pg.el.querySelector('.wm'); wm.style.inset = 'auto'; wm.style.left = mm(-40); wm.style.top = mm(40); wm.style.width = mm(150); wm.style.height = mm(200);
      var clip = A.D.createElement('div'); clip.style.cssText = 'position:absolute;left:' + mm(18) + ';top:' + mm(58) + ';width:' + mm(88) + ';height:' + mm(132) + ';overflow:hidden;z-index:0';
      wm.parentNode.insertBefore(clip, wm); clip.appendChild(wm);
      pg.y = [pg.h, pg.h];
    }
  }

  /* ---------- Formatos ---------- */
  // Cabecera del tema en el Formato 1 (clara) o 2 (oscura), con un búho al azar
  function cabeceraTema(A) {
    var d = A.doc, M = A.modelo, bu = BUHOS[Math.floor(Math.random() * BUHOS.length)];
    var t = String(d.titulo || ''), fs = t.length > 22 ? Math.max(20, 34 * 22 / t.length) : 34;
    // Sin número (Fijas): en su lugar va el ícono del área
    var nb = d.numero ? '<b>' + esc(d.numero) + '</b>' : '<i class="ic">' + (ICONOS[d.area] || '') + '</i>';
    return '<div class="tc' + M + (bu.grande ? ' anch' : '') + '"><div class="nb"><small>' + esc(d.etiqueta || 'TEMA') + '</small>' + nb + '</div>' +
      '<div class="tx"><small>' + esc(d.subtitulo || '') + '</small><h1 style="font-size:' + fs.toFixed(1) + 'px">' + esc(t) + '</h1>' +
      '<div class="ch">' + (d.chips || []).map(function (c) { return '<span>' + esc(c) + '</span>'; }).join('') + '</div></div>' +
      '<img class="bu" src="' + esc(RAIZ + 'assets/buho/simulacro/' + bu.n + '.webp') + '" alt=""' + (bu.grande ? ' style="height:126px;right:6px;bottom:-2px"' : '') + '></div>';
  }
  function hacerTema(A) {
    var d = A.doc, op = A.op, qs = todas(d.secciones);
    if (A.modelo) {
      A.nuevaPagina();
      A.ancho(cabeceraTema(A), { gap: 20 });
      armarPreguntas(A, d.secciones, false);
      if (op.hoja) armarHoja(A, qs);
      if (op.ficha) armarFichas(A, qs);
      // Si hay hoja de respuestas, las claves van en la misma hoja, debajo (si entran)
      if (op.claves) armarClaves(A, qs, null, op.hoja && !op.ficha);
      return;
    }
    A.nuevaPagina();
    A.ancho(bannerHtml(d), { gap: 18 });
    armarPreguntas(A, d.secciones, false);
    if (op.hoja) armarHoja(A, qs);
    if (op.ficha) armarFichas(A, qs);
    if (op.claves) armarClaves(A, qs);
  }
  // Portada del Formato 1 (clara con lomo) o 2 (oscura): ocupa toda la hoja
  function portadaModelo(A, rangos, N, min) {
    var d = A.doc, M = A.modelo, op = A.op;
    var pg = A.nuevaPagina(); pg.sinCab = true;
    pg.el.classList.add(M === 1 ? 'pcla' : 'posc');
    pg.c.style.left = '0'; pg.c.style.top = '0'; pg.c.style.width = '100%'; pg.c.style.height = '100%';
    var bu = BUHOS[Math.floor(Math.random() * BUHOS.length)], g = bu.grande || 1;
    var buho = '<img class="bu" src="' + esc(RAIZ + 'assets/buho/simulacro/' + bu.n + '.webp') + '" alt="" style="' +
      (M === 1 ? 'right:7mm;bottom:-2mm;width:' + (74 * g).toFixed(1) + 'mm' : 'right:8mm;top:' + (104 + (g > 1 ? 14 : 0)) + 'mm;width:' + (80 * g).toFixed(1) + 'mm') + '">';
    var titulo = d.portada1 || 'Simulacro', nro = String(d.nro || ''), etq = d.nroEtq != null ? d.nroEtq : 'N.º';
    var tipo = d.tipoNom || d.subtitulo || '', ciclo = d.ciclo || 'Admisión UNJFSC';
    var ok = '+' + esc(d.ok || '1,00'), mal = '−' + esc(d.mal || '0,10');
    var datos = '<div class="dt"><div><small>Preguntas</small><b>' + N + '</b></div><div><small>Tiempo</small><b>' + min + ' min</b></div><div><small>Correcta</small><b class="l">' + ok + '</b></div><div><small>Incorrecta</small><b>' + mal + '</b></div></div>';
    var areas = '<div class="ar" style="grid-template-columns:repeat(' + Math.max(1, Math.min(rangos.length, 4)) + ',1fr)">' + rangos.slice(0, 4).map(function (r) {
      return '<div style="--c:' + (ESTILO.area[r.area] || A.pal).c + '">' + (ICONOS[r.area] || '') + '<span>' + esc((AREAS[r.area] || {}).nom || 'Preguntas') + '<small>Preg. ' + r.i + '–' + r.j + '</small></span></div>';
    }).join('') + '</div>';
    var nombre = '<div class="nb"><div><small>Apellidos y nombres</small></div><div><small>Fecha</small></div></div>';
    var largo = function (txt, base, porLetra) { var L = String(txt).length; return L <= porLetra ? base : Math.max(base * 0.45, base * porLetra / L); };
    var h;
    if (M === 1) {
      var bl = window.MCCarreras && d.bloque ? (MCCarreras.bloques || []).filter(function (b) { return b.id === d.bloque; })[0] : null;
      var bloque = d.bloque ? '<div class="blq"><div class="l"><small>BLOQUE</small>' + esc(d.bloque) + '</div><div><h3>' + (bl ? esc(bl.nombre) : 'Bloque ' + esc(d.bloque)) + '</h3><p>' +
        (d.carrera ? 'Postulas a <b>' + esc(d.carrera) + '</b>' + (bl ? ' · ' : '') : '') + (bl ? esc(bl.carreras.length + ' carreras: ' + bl.carreras.slice(0, d.carrera ? 4 : 7).join(' · ') + (bl.carreras.length > (d.carrera ? 4 : 7) ? ' y más' : '')) : '') + '</p></div></div>' : '';
      h = '<div class="pc pc1"><div class="lomo"></div><div class="vert"><span>' + esc(d.lomo1 || 'Simulacro de').replace(/ /g, '&nbsp;') + '&nbsp;<em>' + esc(d.lomo2 || 'admisión') + '</em>&nbsp;·&nbsp;UNJFSC</span></div>' +
        '<div class="zona"><div class="top"><span class="placa">' + LOGO_OSC + '</span><span>' + esc(ciclo) + '</span></div>' +
        '<div class="hero"><i class="o1"></i><i class="o2"></i><div class="tx"><small>Modo Cachimbo presenta</small><h1 style="font-size:' + largo(titulo, 64, 9).toFixed(1) + 'pt">' + esc(titulo) + '</h1>' +
        (nro ? '<div class="nro">' + (etq ? '<span>' + esc(etq) + '</span>' : '') + '<b style="font-size:' + largo(nro, 46, 3).toFixed(1) + 'pt">' + esc(nro) + '</b></div>' : '') +
        '<span class="tipo">' + esc(tipo) + '</span><span class="chip">Prueba de conocimientos</span></div>' + buho + '</div>' +
        bloque + datos + areas + nombre + '</div></div>';
    } else {
      h = '<div class="pc pc2"><i class="anillo"></i><i class="ban1"></i><i class="ban2"></i>' +
        '<div class="top">' + LOGO_OSC + '<span>' + esc(ciclo) + '</span></div>' +
        '<div class="tit"><small>Examen de admisión</small><h1 style="font-size:' + largo(titulo, 84, 9).toFixed(1) + 'pt">' + esc(titulo) + '</h1></div>' +
        '<div class="num">' + (nro ? '<div>' + (etq ? '<small>' + esc(etq) + '</small>' : '') + '<b style="font-size:' + largo(nro, 128, 2).toFixed(1) + 'pt">' + esc(nro) + '</b></div>' : '') + '<em>' + esc(tipo) + '</em></div>' +
        '<div class="banda"><b>' + esc(d.bloque ? 'Bloque ' + d.bloque : (d.banda || 'Examen pasado')) + '</b><span>' + esc(d.carrera ? d.carrera : 'Prueba de conocimientos') + '</span></div>' +
        buho + datos + areas + nombre + '</div>';
    }
    pg.c.insertAdjacentHTML('beforeend', h);
    A.medidas(pg.c);
    pg.y = [pg.h, pg.h];
  }
  function hacerSimulacro(A) {
    var d = A.doc, op = A.op, qs = todas(d.secciones), N = qs.length;
    var rangos = [], n = 0, porArea = {};
    d.secciones.forEach(function (s) { var i = n + 1; n += s.preguntas.length; var k = s.area || 'general'; (porArea[k] = porArea[k] || { area: k, i: i, j: n, asig: [] }).j = n; if (s.titulo && porArea[k].asig.indexOf(s.titulo) < 0) porArea[k].asig.push(s.titulo); });
    Object.keys(porArea).forEach(function (k) { rangos.push(porArea[k]); });
    var claves = function () { if (op.claves) armarClaves(A, qs, { puntaje: rangos.map(function (r) { return [(AREAS[r.area] || {}).nom || 'Preguntas', r.i, r.j]; }), ok: d.ok, mal: d.mal }); };
    if (A.modelo) {
      portadaModelo(A, rangos, N, d.minutos || Math.round(N * 1.5));
      A.pg = null;
      A.nuevaPagina();
      armarPreguntas(A, d.secciones, true);
      if (op.hoja) armarHoja(A, qs);
      if (op.ficha) armarFichas(A, qs);
      claves();
      return;
    }
    // Portada
    var pg = A.nuevaPagina();
    var filas = rangos.map(function (r) { return '<tr><td><b class="an" style="color:' + (ESTILO.area[r.area] || A.pal).o + '">' + esc((AREAS[r.area] || {}).nom || 'Preguntas') + '</b><span class="as">' + esc(r.asig.join(' · ')) + '</span></td><td>' + r.i + ' – ' + r.j + '</td><td>' + (r.j - r.i + 1) + '</td></tr>'; }).join('');
    var min = d.minutos || Math.round(N * 1.5);
    var port = '<div class="port" style="position:relative;height:' + (A.Hc - 2) + 'px"><div class="p-top"><small class="k">Modo Cachimbo · ' + esc(d.ciclo || 'Admisión UNJFSC') + '</small>' +
      '<h1>' + esc(d.portada1 || 'Simulacro') + (d.portada2 ? ' <em>' + esc(d.portada2) + '</em>' : '') + '</h1><p>' + esc(d.subtitulo || '') + '</p>' +
      '<div class="chips"><span>' + N + ' preguntas</span><span>' + min + ' minutos</span>' + (op.ficha ? '<span>Ficha óptica incluida</span>' : '') + '</div></div>' +
      '<div class="datos"><div><small>Preguntas</small><b>' + N + '</b></div><div><small>Tiempo</small><b>' + min + ' min</b></div><div><small>Correcta</small><b>+' + esc(d.ok || '1,00') + '</b></div><div><small>Incorrecta</small><b>−' + esc(d.mal || '0,10') + '</b></div></div>' +
      '<h2>Contenido</h2><table class="cont"><tr class="ar"><td>Área y asignaturas</td><td>Preguntas</td><td>Cantidad</td></tr>' + filas + '</table>' +
      '<h2>Instrucciones</h2><ol class="ins"><li><span>Usa lápiz 2B. Rellena el círculo completo, sin salirte.</span></li><li><span>Una sola alternativa por pregunta; en blanco no suma ni resta.</span></li>' +
      '<li><span>Marca tus respuestas en la <b>' + (op.ficha ? 'ficha óptica' : 'hoja de respuestas') + '</b>.</span></li><li><span>Califícate con ' + (op.ficha ? '<b>OptiCheck</b> o ' : '') + 'las claves del final.</span></li></ol>' +
      '<div class="alumno"><div>Apellidos y nombres</div><div>Fecha</div></div></div>';
    A.ancho(port, { gap: 0 });
    A.pg = null;
    A.nuevaPagina();
    armarPreguntas(A, d.secciones, true);
    if (op.hoja) armarHoja(A, qs);
    if (op.ficha) armarFichas(A, qs);
    if (op.claves) armarClaves(A, qs, { puntaje: rangos.map(function (r) { return [(AREAS[r.area] || {}).nom || 'Preguntas', r.i, r.j]; }), ok: d.ok, mal: d.mal });
  }
  // Mis falladas: encabezado de tema y preguntas por área y curso
  function hacerAgrupado(A) {
    var d = A.doc, op = A.op, qs = todas(d.secciones);
    A.nuevaPagina();
    if (A.modelo) {
      A.ancho(cabeceraTema(A), { gap: 20 });
      armarPreguntas(A, d.secciones, true);
      if (op.hoja) armarHoja(A, qs);
      if (op.ficha) armarFichas(A, qs);
      if (op.claves) armarClaves(A, qs, null, op.hoja && !op.ficha);
      return;
    }
    A.ancho(bannerHtml(d), { gap: 18 });
    armarPreguntas(A, d.secciones, true);
    if (op.hoja) armarHoja(A, qs);
    if (op.ficha) armarFichas(A, qs);
    if (op.claves) armarClaves(A, qs);
  }
  function letraDe(p) { return String(p || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').charAt(0).toUpperCase(); }
  function hacerVocabulario(A) {
    var d = A.doc, op = A.op, def = !!op.definicion, ej = !!op.ejemplos;
    A.nuevaPagina();
    if (A.modelo === 1) {
      A.ancho(cabeceraTema(A), { gap: 18 });
      var cab1 = '<div class="vh1' + (def ? ' def' : '') + '"><span>N.º</span><span>Palabra</span><span>Sinónimos</span><span>Antónimos</span>' + (def ? '<span>Definición</span>' : '') + '</div>';
      var pag1 = null, letra1 = '';
      d.palabras.forEach(function (w, i) {
        var L = letraDe(w.palabra), sep = L !== letra1 ? '<div class="vl1"><span>' + esc(L) + '</span></div>' : '';
        letra1 = L;
        var fila = '<div class="vr1' + (def ? ' def' : '') + (i % 2 ? ' z' : '') + '"><span class="n">' + dos(i + 1) + '</span><b>' + esc(w.palabra) + '</b><em>' + esc((w.sin || []).join(', ') || '—') + '</em><em class="a">' + esc((w.ant || []).join(', ') || '—') + '</em>' +
          (def ? '<span>' + esc(w.def || '') + (ej && w.ej && [].concat(w.ej).length ? '<span class="ej">' + esc([].concat(w.ej)[0]) + '</span>' : '') + '</span>' : '') + '</div>';
        var m = A.medir(sep + fila, A.W);
        if (Math.max(A.pg.y[0], A.pg.y[1]) + m.h + 34 > A.pg.h) A.nuevaPagina();
        if (A.pg !== pag1) { pag1 = A.pg; A.ancho(cab1, { gap: 0 }); }
        A.ancho(sep + fila, { gap: 0 });
      });
      return;
    }
    if (A.modelo === 2) {
      A.ancho(cabeceraTema(A), { gap: 18 });
      var letra2 = '';
      d.palabras.forEach(function (w, i) {
        var L = letraDe(w.palabra);
        var cap = '<div class="vc2"><div class="nm">' + (i + 1) + '</div><div class="cu"><h3>' + esc(w.palabra) + '</h3>' +
          '<div class="ln"><i class="s">SIN</i><span>' + esc((w.sin || []).join(', ') || '—') + '</span></div>' +
          '<div class="ln"><i class="a">ANT</i><span>' + esc((w.ant || []).join(', ') || '—') + '</span></div>' +
          (def && w.def ? '<div class="df">' + esc(w.def) + (ej && w.ej && [].concat(w.ej).length ? '<span class="ej">' + esc([].concat(w.ej)[0]) + '</span>' : '') + '</div>' : '') + '</div></div>';
        var m = A.medir(cap, A.colW);
        if (L !== letra2) { letra2 = L; A.columna('<div class="vl2"><b>' + esc(L) + '</b>Palabras con ' + esc(L) + '</div>', { gap: 8, titulo: true, conSiguiente: m.h + 8 }); }
        A.columna(null, { medido: m, gap: 8, noDividir: true });
      });
      return;
    }
    A.ancho(bannerHtml(d), { gap: 18 });
    var cab = '<div class="vf cab2' + (def ? ' def' : '') + '"><span>Palabra</span><span>Sinónimos</span><span>Antónimos</span>' + (def ? '<span>Definición</span>' : '') + '</div>';
    var pagAct = null;
    d.palabras.forEach(function (w, i) {
      var fila = '<div class="vf' + (def ? ' def' : '') + (i % 2 ? ' z' : '') + '"><b>' + esc(w.palabra) + '</b><em>' + esc((w.sin || []).join(', ') || '—') + '</em><em>' + esc((w.ant || []).join(', ') || '—') + '</em>' +
        (def ? '<span>' + esc(w.def || '') + (ej && w.ej && [].concat(w.ej).length ? '<span class="ej">' + esc([].concat(w.ej)[0]) + '</span>' : '') + '</span>' : '') + '</div>';
      var m = A.medir(fila, A.W);
      // Cada hoja empieza con la fila de títulos de la tabla
      if (Math.max(A.pg.y[0], A.pg.y[1]) + m.h + 30 > A.pg.h) A.nuevaPagina();
      if (A.pg !== pagAct) { pagAct = A.pg; A.ancho(cab, { gap: 0 }); }
      A.ancho(fila, { gap: 0 });
    });
  }
  function hacerTarjetas(A) {
    var d = A.doc, cartas = d.cartas, porHoja = 8, cw = (A.W - 14) / 2, ch = (A.Hc - 3 * 14) / 4;
    var frente = function (c) { return c.frente != null ? formatoSimple(c.frente) : textoHtml(c.q) + (c.ops && c.q.options ? '<div class="ops c2" style="margin-top:6px">' + c.q.options.map(function (o, i) { return '<div><b>' + 'ABCDE'.charAt(i) + ')</b> <span class="ot">' + opcionHtml(o) + '</span></div>'; }).join('') + '</div>' : ''); };
    var reverso = function (c) { if (c.reverso != null) return formatoSimple(c.reverso); if (esAbierta(c.q)) return esc(respAbierta(c.q)); var o = c.q.options[c.q.correct]; return (c.ops ? '<b>' + 'ABCDE'.charAt(c.q.correct) + ')</b> ' : '') + opcionHtml(o); };
    var self = A, M = A.modelo;
    function tarjeta(pg, html, k, x, y, rev, num) {
      var t = A.D.createElement('div'); t.className = 'tj' + (rev ? ' rev' : '') + (M ? ' f' + M : '');
      t.style.left = x + 'px'; t.style.top = y + 'px'; t.style.width = cw + 'px'; t.style.height = ch + 'px';
      t.innerHTML = M ? '<div class="hd"><b>' + (M === 1 ? dos(num) : num) + '</b><small>' + (rev ? 'Respuesta' : 'Pregunta') + '</small><em>' + esc(d.titulo) + '</em></div><div class="x">' + html + '</div>'
        : '<div class="k">' + esc(k) + '</div><div class="x">' + html + '</div><span class="n">' + num + '</span>';
      pg.c.appendChild(t); A.medidas(t); matematicas(t);
      // Si el texto no entra, se achica la letra
      var x2 = t.querySelector('.x'), fs = 13;
      while (x2.scrollHeight > x2.clientHeight + 1 && fs > 7.5) { fs -= 0.5; x2.style.fontSize = fs + 'px'; }
    }
    // Formato 1 y 2: la primera hoja lleva la cabecera del tema en la fila de arriba (6 tarjetas) y su reverso, cómo imprimirlas
    var i = 0, primera = !!M;
    while (i < cartas.length) {
      var salto = primera ? 1 : 0, cuantas = porHoja - 2 * salto;
      var lote = cartas.slice(i, i + cuantas), ini = i;
      var pf = A.nuevaPagina();
      if (primera) { var hc = A.medir(cabeceraTema(A), A.W); A.poner(pf, hc.el, 0, Math.max(0, (ch - hc.h) / 2), A.W); }
      lote.forEach(function (c, j) { var col = j % 2, fila = Math.floor(j / 2) + salto; tarjeta(pf, frente(c), d.titulo + ' · Pregunta', col * (cw + 14), fila * (ch + 14), false, ini + j + 1); });
      if (A.op.reverso) {
        var pr = A.nuevaPagina();
        if (primera) {
          var bu = BUHOS[Math.floor(Math.random() * BUHOS.length)];
          var ins = A.medir('<div class="ins' + M + '" style="height:' + ch + 'px"><div style="flex:1"><h4>Cómo imprimirlas</h4><ol><li>Imprime a <b>doble cara</b>, volteando por el <b>borde largo</b>.</li><li>Recorta por la línea punteada: detrás de cada pregunta queda su respuesta.</li><li>Las que ya te sabes, sepáralas; repasa el resto cada día.</li></ol></div><img src="' + esc(RAIZ + 'assets/buho/simulacro/' + bu.n + '.webp') + '" alt=""></div>', A.W);
          A.poner(pr, ins.el, 0, 0, A.W);
        }
        // Al imprimir a doble cara (borde largo), el reverso de cada tarjeta queda detrás de su frente
        lote.forEach(function (c, j) { var col = 1 - (j % 2), fila = Math.floor(j / 2) + salto; tarjeta(pr, reverso(c), 'Respuesta', col * (cw + 14), fila * (ch + 14), true, ini + j + 1); });
      }
      i += cuantas; primera = false;
    }
    if (!A.op.reverso) {
      A.nuevaPagina(); A.ancho('<div class="tit">Respuestas</div>', { gap: 10 });
      cartas.forEach(function (c, i) { A.columna('<div style="font-size:12px"><b style="color:var(--o)">' + (i + 1) + '.</b> ' + reverso(c) + '</div>', { gap: 6 }); });
    }
  }

  /* ---------- Generar el PDF ---------- */
  function prepararLibrerias() {
    cargarCss(CDN.fuentes); cargarCss(CDN.katexCss);
    var k = window.katex ? Promise.resolve() : cargarJs(CDN.katex);
    return Promise.all([
      window.jspdf ? null : cargarJs(CDN.jspdf),
      window.html2canvas ? null : cargarJs(CDN.h2c),
      k.then(function () { return window.renderMathInElement ? null : cargarJs(CDN.auto); }),
      cargarLogo()
    ]).then(function () {
      if (!document.fonts || !document.fonts.load) return;
      return Promise.all(FUENTES.map(function (f) { return document.fonts.load(f).catch(function () {}); }))
        .then(function () { return document.fonts.ready; });
    });
  }
  // Tamaño real de cada imagen de las preguntas (para reservar su lugar al medir)
  // Gráfico en blanco y negro (líneas negras sobre blanco): se pinta con el color del texto del PDF.
  // Si tiene color (una ilustración, una foto), se deja tal cual.
  function entintar(img) {
    var w = img.naturalWidth, h = img.naturalHeight; if (!w || !h) return null;
    var k = Math.min(1, 1400 / Math.max(w, h)), cw = Math.round(w * k), ch = Math.round(h * k);
    var cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    var cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, cw, ch);
    var d = cx.getImageData(0, 0, cw, ch), p = d.data, color = 0, tot = 0, i;
    for (i = 0; i < p.length; i += 4 * 7) { if (p[i + 3] < 30) continue; tot++; var mx = Math.max(p[i], p[i + 1], p[i + 2]), mn = Math.min(p[i], p[i + 1], p[i + 2]); if (mx - mn > 40) color++; }
    if (!tot || color / tot > 0.02) return null;
    var t = ESTILO.tinta.replace('#', ''), R = parseInt(t.slice(0, 2), 16), G = parseInt(t.slice(2, 4), 16), B = parseInt(t.slice(4, 6), 16);
    for (i = 0; i < p.length; i += 4) {
      var L = (p[i] + p[i + 1] + p[i + 2]) / 765, a = p[i + 3] / 255;
      L = 1 - (1 - L) * a;   // lo transparente cuenta como blanco
      p[i] = Math.round(R + (255 - R) * L); p[i + 1] = Math.round(G + (255 - G) * L); p[i + 2] = Math.round(B + (255 - B) * L); p[i + 3] = 255;
    }
    cx.putImageData(d, 0, 0);
    return cv.toDataURL('image/png');
  }
  function precargar(doc) {
    var L = lienzo(), d = L.d, tmp = d.createElement('div'), tam = {};
    var qs = doc.secciones ? todas(doc.secciones) : (doc.cartas || []).map(function (c) { return c.q; }).filter(Boolean);
    tmp.innerHTML = qs.map(function (q) { return textoHtml(q); }).join('');
    var imgs = Array.prototype.slice.call(tmp.querySelectorAll('img'));
    var fuentes = L.listo.then(function () {
      if (!d.fonts || !d.fonts.load) return;
      // KaTeX también usa sus propias fuentes: se dibuja una fórmula de prueba para que las pida
      var k = d.createElement('div'); k.style.cssText = 'position:absolute;left:0;top:0;opacity:0'; k.textContent = '$$\\frac{a^2}{\\sqrt{b}}\\sum x$$ $x_1$'; d.body.appendChild(k); matematicas(k);
      return Promise.all(FUENTES.concat(FUENTES_KATEX).map(function (f) { return d.fonts.load(f).catch(function () {}); }))
        .then(function () { return d.fonts.ready; }).then(function () { k.remove(); });
    });
    return Promise.all([fuentes].concat(imgs.map(function (im) {
      var src = im.getAttribute('src');
      return new Promise(function (ok) {
        var x = new Image(), t = setTimeout(ok, 10000);
        x.onload = function () { clearTimeout(t); tam[src] = [x.naturalWidth, x.naturalHeight]; try { var e = entintar(x); if (e) tam['tinta:' + src] = e; } catch (er) {} ok(); };
        x.onerror = function () { clearTimeout(t); ok(); };
        x.src = new URL(src, location.href).href;
      });
    }))).then(function () { return tam; });
  }
  function generar(doc, op, info, avance) {
    return prepararLibrerias().then(function () { return precargar(doc); }).then(function (tam) {
      if (op && op.modelo) doc = Object.assign({}, doc, { modelo: op.modelo });
      var A = new Armador(doc, info, op, tam);
      try {
        if (doc.formato === 'simulacro') hacerSimulacro(A);
        else if (doc.formato === 'agrupado') hacerAgrupado(A);
        else if (doc.formato === 'vocabulario') hacerVocabulario(A);
        else if (doc.formato === 'tarjetas') hacerTarjetas(A);
        else hacerTema(A);
        A.reglas(); A.cabeceraYPie();
      } catch (e) { A.taller.remove(); throw e; }
      var paginas = A.paginas, PDF = window.jspdf.jsPDF;
      var pdf = new PDF({ unit: 'mm', format: 'a4', orientation: paginas[0].horizontal ? 'l' : 'p', compress: true });
      pdf.setProperties({ title: doc.titulo + ' · Modo Cachimbo', subject: 'N.º ' + info.num, author: 'Modo Cachimbo', keywords: info.email, creator: 'Modo Cachimbo' });
      var i = 0;
      function siguiente() {
        if (i >= paginas.length) { A.taller.remove(); return pdf; }
        var pg = paginas[i];
        if (avance) avance(i + 1, paginas.length);
        if (window.MCPregunta && MCPregunta.grafico) MCPregunta.grafico.fijarColores(pg.el); // gráficos escritos como texto
        return html2canvas(pg.el, { scale: ESTILO.escala, backgroundColor: '#ffffff', useCORS: true, logging: false, windowWidth: 1200 }).then(function (cv) {
          var img = cv.toDataURL('image/jpeg', 0.9);
          if (i > 0) pdf.addPage('a4', pg.horizontal ? 'l' : 'p');
          if (pg.horizontal) pdf.addImage(img, 'JPEG', 0, 0, 297, 210, undefined, 'FAST'); else pdf.addImage(img, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
          cv.width = cv.height = 0;
          i++;
          return new Promise(function (r) { setTimeout(r, 0); }).then(siguiente);
        });
      }
      // La primera imagen salía con letra de reserva (la copia que arma html2canvas aún no tenía las fuentes):
      // antes se pasa a imagen un bloque chico con todas las letras para que ya estén listas
      var prueba = A.D.createElement('div');
      prueba.className = 'mcpdf'; prueba.style.cssText = 'width:300px;height:auto;padding:4px';
      prueba.innerHTML = FUENTES.map(function (f) { return '<div style="font:' + f.replace(/"/g, "'") + '">Aa Ñ 0123 áé</div>'; }).join('') +
        '<div>$$\\frac{a^2}{\\sqrt{b}}\\sum_{i=1}^{n} x_i \\left(\\dfrac{p}{q}\\right) \\mathbb{R}$$ $x^2 + y_1 \\le \\alpha$</div>';
      A.taller.appendChild(prueba); matematicas(prueba);
      return html2canvas(prueba, { scale: 0.5, backgroundColor: '#ffffff', logging: false }).then(function () { prueba.remove(); }, function () { prueba.remove(); }).then(siguiente);
    }).then(function (pdf) {
      return { pdf: pdf, paginas: pdf.getNumberOfPages() };
    });
  }

  /* ---------- Ventana ---------- */
  var IC = {
    pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    escudo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>',
    google: '<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h6a5.1 5.1 0 0 1-2.2 3.4v2.8h3.5c2.1-1.9 3.3-4.7 3.3-8.2z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.8c-1 .7-2.3 1.1-3.8 1.1a6.6 6.6 0 0 1-6.2-4.6H2.2v2.9A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14a6.6 6.6 0 0 1 0-4.2V7H2.2a11 11 0 0 0 0 9.9z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1A11 11 0 0 0 2.2 7l3.6 2.8A6.6 6.6 0 0 1 12 5.4z"/></svg>'
  };
  function cssVentana() {
    if (document.getElementById('mcd-css')) return;
    var s = document.createElement('style'); s.id = 'mcd-css';
    s.textContent =
      '.mcd-btn svg{width:15px;height:15px;vertical-align:-2px;margin-right:4px}' +
      '.mcd-btn[hidden]{display:none!important}' +
      '.mcd-btn.mcd-cerrado{opacity:.75}' +
      '.mcd-solo{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 16px;border-radius:14px;border:2px solid var(--mcd-ac,#1CB0F6);border-bottom-width:4px;background:transparent;color:var(--mcd-ac,#1CB0F6);font:900 14px Nunito,Inter,sans-serif;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;text-decoration:none}' +
      '.mcd-solo svg{width:17px;height:17px;margin:0}.mcd-fila{display:flex;justify-content:center;margin:4px 0 18px}' +
      '.mcd-ov{position:fixed;inset:0;z-index:300;background:rgba(5,3,14,.72);display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;transition:opacity .25s}' +
      '.mcd-ov.ver{opacity:1}' +
      '.mcd{--ac:#1CB0F6;position:relative;width:100%;max-width:460px;max-height:calc(100vh - 40px);overflow:auto;background:#151127;border:1px solid #2A2346;border-bottom:5px solid #2A2346;border-radius:24px;padding:22px 22px 22px;color:#EEEAF7;font-family:Nunito,Inter,sans-serif;text-align:left;transform:translateY(14px);transition:transform .3s cubic-bezier(.2,1.2,.4,1)}' +
      '.mcd-ov.ver .mcd{transform:none}' +
      '.mcd-x{position:absolute;top:14px;right:14px;width:34px;height:34px;border-radius:12px;border:1px solid #2A2346;background:#1D1834;color:#A99FC8;display:grid;place-items:center;cursor:pointer;padding:0}.mcd-x svg{width:16px;height:16px}' +
      '.mcd-top{display:flex;gap:14px;align-items:center;padding-right:36px}' +
      '.mcd-hoja{flex:none;width:62px;height:82px;border-radius:8px;background:#fff;position:relative;overflow:hidden;box-shadow:0 6px 18px rgba(0,0,0,.35)}' +
      '.mcd-hoja i{position:absolute;left:8px;right:8px;height:3px;border-radius:2px;background:#d9dde6}' +
      '.mcd-hoja b{position:absolute;left:7px;top:9px;width:22px;height:14px;border-radius:3px;background:var(--ac)}' +
      '.mcd-hoja u{position:absolute;left:0;top:0;bottom:0;width:4px;background:#1B2A4A}' +
      '.mcd-top small{display:block;font:800 11px Nunito,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--ac)}' +
      '.mcd-top h3{margin:2px 0 3px;font:900 21px/1.15 Nunito,sans-serif;color:#EEEAF7}' +
      '.mcd-top p{margin:0;font-size:13px;color:#A99FC8}' +
      '.mcd-sec{margin:18px 0 8px;font:900 11px Nunito,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#6F6690}' +
      '.mcd-op{display:flex;align-items:center;gap:12px;padding:11px 12px;border:1px solid #2A2346;border-radius:14px;background:#1D1834;margin-bottom:8px;cursor:pointer;user-select:none}' +
      '.mcd-op b{display:block;font-size:14.5px;font-weight:800;color:#EEEAF7}.mcd-op small{display:block;font-size:12px;color:#A99FC8;margin-top:1px}' +
      '.mcd-op .tx{flex:1;min-width:0}' +
      '.mcd-sw{flex:none;width:42px;height:24px;border-radius:99px;background:#2F284E;position:relative;transition:background .2s}' +
      '.mcd-sw:after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#A99FC8;transition:transform .2s,background .2s}' +
      '.mcd-op.on .mcd-sw{background:var(--ac)}.mcd-op.on .mcd-sw:after{transform:translateX(18px);background:#0B0818}' +
      '.mcd-op.fijo{cursor:default}.mcd-op.fijo .mcd-sw{opacity:.55}' +
      '.mcd-fms{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
      '.mcd-fm{display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px 10px 11px;border:2px solid #2A2346;border-bottom-width:4px;border-radius:16px;background:#1D1834;cursor:pointer;color:#EEEAF7;font-family:inherit;text-align:center}' +
      '.mcd-fm.on{border-color:var(--ac);background:rgba(28,176,246,.08)}.mcd-fm b{font-size:14.5px;font-weight:900}.mcd-fm small{display:block;font-size:11.5px;color:#A99FC8;line-height:1.3;margin-top:1px}' +
      '.mcd-mini{position:relative;width:54px;height:72px;border-radius:6px;overflow:hidden;box-shadow:0 5px 14px rgba(0,0,0,.35)}' +
      '.mcd-mini.f1{background:#fff}.mcd-mini.f1:before{content:"";position:absolute;left:0;top:0;bottom:0;width:11px;background:#1B2A4A}.mcd-mini.f1:after{content:"";position:absolute;left:16px;right:5px;top:9px;height:24px;border-radius:4px;background:linear-gradient(150deg,#E8F1FB,#F4F9E2)}' +
      '.mcd-mini.f1 i{position:absolute;left:16px;height:4px;border-radius:2px}.mcd-mini.f2{background:#0E1A31}.mcd-mini.f2:before{content:"";position:absolute;left:-10px;right:-10px;top:30px;height:15px;background:#C5F209;transform:rotate(-8deg)}' +
      '.mcd-mini.f2:after{content:"01";position:absolute;left:6px;top:8px;font:italic 900 17px/1 "Barlow Condensed",Nunito,sans-serif;color:#C5F209}.mcd-mini.f2 i{position:absolute;left:6px;right:6px;height:5px;border-radius:2px;background:rgba(255,255,255,.18)}' +
      '.mcd-tag{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:99px;background:rgba(28,176,246,.14);color:#7fd3fa;font:800 10.5px Nunito,sans-serif;letter-spacing:.04em;vertical-align:1px}' +
      '.mcd-info{display:flex;gap:10px;align-items:flex-start;margin-top:12px;padding:10px 12px;border-radius:14px;background:rgba(198,224,0,.07);border:1px dashed rgba(198,224,0,.35);font-size:12.5px;color:#cfd6a0;line-height:1.45}' +
      '.mcd-info svg{flex:none;width:18px;height:18px;color:#C6E000;margin-top:1px}' +
      '.mcd-cupo{display:flex;align-items:center;gap:8px;margin:12px 0 0;font-size:12.5px;color:#A99FC8;white-space:nowrap}' +
      '.mcd-cupo span{display:flex;gap:3px;flex-wrap:wrap}.mcd-cupo i{width:12px;height:6px;border-radius:3px;background:var(--ac)}.mcd-cupo i.usado{background:#2F284E}' +
      '.mcd-go{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin-top:16px;border:0;border-radius:16px;padding:15px;font:900 16px Nunito,sans-serif;letter-spacing:.04em;background:#C6E000;color:#141a00;box-shadow:0 5px 0 #8fa300;cursor:pointer}' +
      '.mcd-go:disabled{opacity:.6;cursor:wait}.mcd-go svg{width:19px;height:19px}' +
      '.mcd-go small{font:800 12px Nunito,sans-serif;opacity:.7}' +
      '.mcd-go.sec{background:#1D1834;color:#EEEAF7;box-shadow:0 5px 0 #070512;border:1px solid #2A2346}' +
      '.mcd-barra{height:10px;border-radius:6px;background:#2F284E;overflow:hidden;margin-top:16px}.mcd-barra i{display:block;height:100%;width:0;background:var(--ac);transition:width .3s}' +
      '.mcd-est{margin-top:8px;font-size:13px;color:#A99FC8;text-align:center}' +
      '.mcd-err{margin-top:12px;padding:10px 12px;border-radius:12px;background:rgba(255,75,75,.1);border:1px solid rgba(255,75,75,.4);color:#ffb3b3;font-size:13px;line-height:1.45}' +
      '.mcd-ok{margin-top:12px;padding:10px 12px;border-radius:12px;background:rgba(198,224,0,.1);border:1px solid rgba(198,224,0,.4);color:#e4f19a;font-size:13px;line-height:1.45}' +
      '.mcd-lock{text-align:center;padding:6px 4px 2px}' +
      '.mcd-lock .ico{width:64px;height:64px;margin:4px auto 10px;border-radius:20px;background:#1D1834;border:1px solid #2A2346;display:grid;place-items:center;color:var(--ac)}.mcd-lock .ico svg{width:30px;height:30px}' +
      '.mcd-lock h3{margin:0 0 6px;font:900 20px Nunito,sans-serif;color:#EEEAF7}.mcd-lock p{margin:0 auto;max-width:330px;font-size:13.5px;color:#A99FC8;line-height:1.5}' +
      '.mcd-lock .mcd-go{margin-top:18px}' +
      '@media (max-width:560px){.mcd-ov{align-items:flex-end;padding:0}.mcd{max-width:none;max-height:92vh;border-radius:24px 24px 0 0;border-bottom:0;padding:18px 18px calc(18px + env(safe-area-inset-bottom));transform:translateY(40px)}' +
      '.mcd:before{content:"";display:block;width:42px;height:5px;border-radius:3px;background:#2F284E;margin:-6px auto 14px}.mcd-x{top:22px}}';
    document.head.appendChild(s);
  }

  function opcionesPara(doc, e) {
    var qs = doc.secciones ? todas(doc.secciones) : [], hayMcq = qs.some(function (q) { return !esAbierta(q); });
    if (doc.formato === 'vocabulario') return [
      ['palabras', 'Palabras', (doc.palabras || []).length + ' palabras con sinónimos y antónimos', true, true],
      ['definicion', 'Definición', 'Una columna más con el significado', true],
      ['ejemplos', 'Ejemplos', 'Un ejemplo de uso debajo de la definición', false]];
    if (doc.formato === 'tarjetas') return [
      ['cartas', 'Tarjetas', (doc.cartas || []).length + ' tarjetas, 8 por hoja para recortar', true, true],
      ['reverso', 'Reverso detrás', 'La respuesta en la hoja siguiente, para imprimir a doble cara', true]];
    var o = [['preguntas', 'Preguntas', qs.length + ' preguntas a dos columnas', true, true],
      ['hoja', 'Hoja de respuestas', 'Burbujas para marcar a mano', doc.formato !== 'simulacro'],
      ['claves', 'Claves', 'Al final, con la clave para OptiCheck', true]];
    if (hayMcq && e.ficha !== false) o.push(['ficha', 'Ficha óptica <span class="mcd-tag">OptiCheck</span>', qs.length > 80 ? 'Dos hojas horizontales (80 + ' + (qs.length - 80) + ')' : 'Hoja horizontal para calificar con la app', doc.formato === 'simulacro']);
    return o;
  }

  function abrir(reg) {
    cssVentana();
    var ac = ESTILO.pantalla[reg.area || areaDePagina()] || ESTILO.pantalla.general;
    var ov = document.createElement('div');
    ov.className = 'mcd-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Descargar PDF');
    ov.innerHTML = '<div class="mcd" style="--ac:' + ac + '"><button class="mcd-x" type="button" aria-label="Cerrar">' + IC.x + '</button><div class="mcd-c"><div class="mcd-est">Preparando…</div></div></div>';
    var caja = ov.querySelector('.mcd-c'), ocupado = false;
    function cerrar() { if (ocupado) return; ov.classList.remove('ver'); setTimeout(function () { ov.remove(); }, 250); }
    ov.querySelector('.mcd-x').addEventListener('click', cerrar);
    ov.addEventListener('click', function (e) { if (e.target === ov) cerrar(); });
    document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { cerrar(); document.removeEventListener('keydown', k); } });
    document.body.appendChild(ov);
    requestAnimationFrame(function () { requestAnimationFrame(function () { ov.classList.add('ver'); }); });

    var cab = function (doc) {
      return '<div class="mcd-top"><div class="mcd-hoja" aria-hidden="true"><u></u><b></b>' + [30, 38, 44, 50, 56, 62, 68].map(function (y, i) { return '<i style="top:' + y + 'px;' + (i % 3 === 2 ? 'right:22px' : '') + '"></i>'; }).join('') +
        '</div><div><small>Descargar en PDF</small><h3>' + esc(doc.titulo) + '</h3><p>' + esc(doc.subtitulo || TIPOS[reg.tipo] || '') + '</p></div></div>';
    };
    var estado = MCAuth && MCAuth.usuario && MCAuth.usuario() ? rpc('descargas_estado').catch(function () { return null; }) : Promise.resolve({ sesion: false });
    Promise.all([estado, Promise.resolve().then(reg.datos)]).then(function (rs) {
      var e = rs[0], doc = rs[1];
      if (!doc) throw new Error('No hay nada que descargar todavía.');
      if (!e) { caja.innerHTML = cab(doc) + '<div class="mcd-err">No se pudo revisar tu acceso. Revisa tu internet e intenta otra vez.</div>'; return; }
      if (!e.sesion) {
        caja.innerHTML = '<div class="mcd-lock"><div class="ico">' + IC.pdf + '</div><h3>Entra para descargar</h3><p>Las descargas en PDF llevan tu nombre, así que necesitas entrar con tu cuenta de Google.</p><button class="mcd-go" type="button">' + IC.google + 'Entrar con Google</button></div>';
        caja.querySelector('.mcd-go').addEventListener('click', function () { if (MCAuth.entrarGoogle) MCAuth.entrarGoogle(); });
        return;
      }
      if (e.bloqueado) { caja.innerHTML = cab(doc) + '<div class="mcd-err">Tu cuenta no puede descargar PDF por ahora. Si crees que es un error, escríbele a tu profe.</div>'; return; }
      if (!e.acceso) { ov.remove(); hojaCodigo(reg); return; }
      var ops = opcionesPara(doc, e), conModelo = ['simulacro', 'tema', 'agrupado', 'vocabulario', 'tarjetas'].indexOf(doc.formato) >= 0, modelo = +(leer(K_MODELO) || 1);
      if (!MODELOS[modelo]) modelo = 1;
      var fms = !conModelo ? '' : '<div class="mcd-sec">Formato</div><div class="mcd-fms" role="radiogroup" aria-label="Formato del PDF">' + Object.keys(MODELOS).map(function (k) {
        var mini = k === '1' ? '<i style="top:40px;right:7px;background:#e1e6ee"></i><i style="top:48px;right:16px;background:#e1e6ee"></i><i style="top:58px;width:8px;background:#7B3FC4"></i><i style="top:58px;left:27px;width:8px;background:#0B6BCB"></i><i style="top:58px;left:38px;width:8px;background:#4F7A00"></i>'
          : '<i style="top:52px"></i><i style="top:60px"></i>';
        return '<button type="button" class="mcd-fm' + (+k === modelo ? ' on' : '') + '" data-m="' + k + '" role="radio" aria-checked="' + (+k === modelo) + '"><span class="mcd-mini f' + k + '">' + mini + '</span><span><b>' + MODELOS[k].nombre + '</b><small>' + MODELOS[k].desc + '</small></span></button>';
      }).join('') + '</div>';
      var cupo = e.quedan_dia == null ? '' : '<div class="mcd-cupo"><span>' + Array.from({ length: Math.min(e.limite_dia, 20) }, function (_, i) { return '<i' + (i < e.usadas_dia ? ' class="usado"' : '') + '></i>'; }).join('') + '</span>Te quedan ' + e.quedan_dia + ' de ' + e.limite_dia + ' hoy</div>';
      caja.innerHTML = cab(doc) + fms + '<div class="mcd-sec">¿Qué incluye?</div>' +
        ops.map(function (o) { return '<div class="mcd-op' + (o[3] ? ' on' : '') + (o[4] ? ' fijo' : '') + '" data-k="' + o[0] + '" role="switch" aria-checked="' + !!o[3] + '" tabindex="0"><span class="tx"><b>' + o[1] + '</b><small>' + o[2] + '</small></span><span class="mcd-sw"></span></div>'; }).join('') +
        '<div class="mcd-info">' + IC.escudo + '<span>Lleva tu apodo y correo como marca de agua y un N.º único. Es solo para ti: no lo compartas.</span></div>' + cupo +
        '<button class="mcd-go" type="button"' + (e.quedan_dia === 0 ? ' disabled' : '') + '>' + IC.pdf + 'Descargar PDF</button><div class="mcd-msg"></div>';
      Array.prototype.forEach.call(caja.querySelectorAll('.mcd-op:not(.fijo)'), function (o) {
        var t = function () { var on = o.classList.toggle('on'); o.setAttribute('aria-checked', String(on)); };
        o.addEventListener('click', t); o.addEventListener('keydown', function (ev) { if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); t(); } });
      });
      Array.prototype.forEach.call(caja.querySelectorAll('.mcd-fm'), function (b) {
        b.addEventListener('click', function () {
          Array.prototype.forEach.call(caja.querySelectorAll('.mcd-fm'), function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', String(x === b)); });
          guardar(K_MODELO, b.dataset.m);
        });
      });
      if (e.quedan_dia === 0) caja.querySelector('.mcd-msg').innerHTML = '<div class="mcd-err">Ya usaste tus ' + e.limite_dia + ' descargas de hoy. Mañana tienes más.</div>';
      caja.querySelector('.mcd-go').addEventListener('click', function () {
        var op = {}; Array.prototype.forEach.call(caja.querySelectorAll('.mcd-op'), function (o) { op[o.dataset.k] = o.classList.contains('on'); });
        var fm = caja.querySelector('.mcd-fm.on'); if (fm) op.modelo = +fm.dataset.m;
        var btn = this, msg = caja.querySelector('.mcd-msg');
        btn.disabled = true; ocupado = true;
        msg.innerHTML = '<div class="mcd-barra"><i></i></div><div class="mcd-est">Registrando tu descarga…</div>';
        var barra = msg.querySelector('.mcd-barra i'), est = msg.querySelector('.mcd-est');
        var equipoTxt = (function () { var u = navigator.userAgent || ''; return (/Android/i.test(u) ? 'Android' : /iPhone|iPad/i.test(u) ? 'iPhone/iPad' : /Windows/i.test(u) ? 'Windows' : /Mac/i.test(u) ? 'Mac' : 'Otro'); })();
        rpc('pedir_descarga', { p: { tipo: reg.tipo, ref: doc.ref || location.pathname, titulo: doc.titulo, equipo: equipoTxt } }).then(function (r) {
          if (!r || r.error) throw new Error((r && r.error) || 'No se pudo registrar la descarga.');
          est.textContent = 'Armando tu PDF…';
          return generar(doc, op, { apodo: r.apodo || 'Alumno', email: r.email || '', fecha: r.fecha || '', num: r.num }, function (i, n) {
            barra.style.width = Math.round(100 * i / n) + '%'; est.textContent = 'Armando la página ' + i + ' de ' + n + '…';
          }).then(function (res) {
            var nombre = 'ModoCachimbo-' + slug(doc.titulo) + '-' + r.num + '.pdf';
            res.pdf.save(nombre);
            ocupado = false; btn.disabled = false;
            msg.innerHTML = '<div class="mcd-ok">¡Listo! Se descargó <b>' + esc(nombre) + '</b> (' + res.paginas + ' páginas). N.º ' + esc(r.num) + '.' + (r.quedan_dia != null ? ' Te quedan ' + r.quedan_dia + ' hoy.' : '') + '</div>';
          });
        }).catch(function (err) {
          ocupado = false; btn.disabled = false;
          msg.innerHTML = '<div class="mcd-err">' + esc(err && err.message || 'No se pudo descargar.') + '</div>';
        });
      });
    }).catch(function (err) {
      caja.innerHTML = '<div class="mcd-err">' + esc(err && err.message || 'No se pudo preparar la descarga.') + '</div>';
    });
  }
  // Pantalla para activar el código (la misma de los candados del sitio).
  // Al activarlo, el botón pierde el candado y se abre la descarga
  function hojaCodigo(reg) {
    var alAbrir = function () {
      pedidoAcc = null;
      botones.forEach(function (b) { pintarCandado(b[0], b[1]); });
      if (reg) abrir(reg);
    };
    var abrirHoja = function () { if (window.MCCandado && MCCandado.hoja) MCCandado.hoja('descarga', { nombre: 'Descargas PDF', alAbrir: alAbrir }); };
    if (window.MCCandado) return abrirHoja();
    (window.MCAcceso ? Promise.resolve() : cargarJs(RAIZ + 'assets/acceso.js')).then(function () { return cargarJs(RAIZ + 'assets/candado.js'); }).then(abrirHoja, function () {});
  }

  /* ---------- ¿Puede descargar? (para pintar el botón con candado) ----------
     Sin sesión o sin el paquete descarga-VIP el botón sale con candado y, al tocarlo,
     pide el código. Se pregunta una vez por página y otra vez si cambia la sesión. */
  // Resuelve true (puede), false (tiene sesión pero no el código), 'sesion' (sin sesión) o null (sin internet)
  var pedidoAcc = null, botones = [];
  function accesoDescarga() {
    if (pedidoAcc) return pedidoAcc;
    pedidoAcc = !window.MCAuth ? Promise.resolve('sesion') : MCAuth.listo.then(function () {
      if (!MCAuth.usuario()) return 'sesion';
      return rpc('descargas_estado').then(function (e) { return !!(e && e.acceso && !e.bloqueado); });
    }).catch(function () { return null; });
    return pedidoAcc;
  }
  function pintarCandado(a, texto) {
    accesoDescarga().then(function (ok) {
      if (ok === null) return;   // sin internet: se decide al tocarlo
      a.dataset.acc = ok === true ? 'si' : ok === false ? 'no' : 'sesion';
      ok = ok === true;
      a.classList.toggle('mcd-cerrado', !ok);
      a.innerHTML = (ok ? IC.pdf : IC.lock) + texto;
      a.setAttribute('aria-label', ok ? 'Descargar en PDF' : 'Descargar en PDF (necesitas el código de Descargas PDF)');
      a.title = ok ? '' : 'Necesitas el código de Descargas PDF';
    });
  }
  if (window.MCAuth && MCAuth.alCambiar) MCAuth.alCambiar(function () {
    pedidoAcc = null;
    botones.forEach(function (b) { pintarCandado(b[0], b[1]); });
  });

  /* ---------- Registrar un botón ---------- */
  // reg = { tipo, area, lugar: () => { padre, antes, solo }, datos: () => Promise<doc> }
  function registrar(reg) {
    cssVentana();
    cfg().then(function (c) {
      var permitido = (c.activo && (c.tipos || {})[reg.tipo] !== false) || esEquipo();
      if (!permitido) return;
      var l = reg.lugar && reg.lugar(); if (!l || !l.padre || l.padre.querySelector('.mcd-btn')) return;
      var a = document.createElement(l.solo ? 'button' : 'a');
      if (!l.solo) a.href = '#'; else a.type = 'button';
      a.className = (l.clase || 'alt') + ' mcd-btn';
      if (l.solo) a.style.setProperty('--mcd-ac', ESTILO.pantalla[reg.area || areaDePagina()] || ESTILO.pantalla.general);
      a.innerHTML = IC.pdf + (l.texto || 'PDF');
      a.setAttribute('aria-label', 'Descargar en PDF');
      // Con sesión pero sin el código: directo a la pantalla del código (sin ventana previa)
      a.addEventListener('click', function (e) { e.preventDefault(); if (a.dataset.acc === 'no') hojaCodigo(reg); else abrir(reg); });
      botones.push([a, l.texto || 'PDF']); pintarCandado(a, l.texto || 'PDF');
      if (l.envolver) { var f = document.createElement('div'); f.className = 'mcd-fila'; f.appendChild(a); a = f; }
      l.padre.insertBefore(a, l.antes || null);
    });
  }

  /* ---------- Secciones del sitio ---------- */
  function cuando(evento, listo) {
    return new Promise(function (ok) { if (listo()) return ok(); document.addEventListener(evento, function () { ok(); }, { once: true }); });
  }
  var ruta = location.pathname.replace(/\/+$/, '').split('/');
  var archivo = ruta[ruta.length - 1] || 'index.html';
  var SEC = { libros: 'libro', seminarios: 'seminario', banqueo: 'banqueo' };
  var NOM_SEC = { libro: 'Libros', seminario: 'Seminarios', banqueo: 'Banqueo' };

  // Libros, Seminarios y Banqueo: tema.html (los datos los deja la página en window.MC_TEMA)
  if (archivo === 'tema.html' && SEC[ruta[ruta.length - 2]]) {
    var tipoT = SEC[ruta[ruta.length - 2]], cursoT = ruta[ruta.length - 3];
    registrar({
      tipo: tipoT, area: AREA_DE[cursoT],
      lugar: function () { var b = document.querySelector('.quiz-cta .cta-btns'); return b && { padre: b, antes: b.firstChild }; },
      datos: function () {
        return cuando('mc:tema-listo', function () { return !!window.MC_TEMA; }).then(function () {
          var t = window.MC_TEMA, nom = NOM_CURSO[cursoT] || t.curso;
          return { formato: 'tema', tipo: tipoT, area: AREA_DE[cursoT] || 'general', etiqueta: 'TEMA', numero: t.num, titulo: t.name,
            subtitulo: nom + ' · ' + NOM_SEC[tipoT] + ' ' + t.year, chips: [t.questions.length + ' preguntas', 'Claves al final'],
            cabecera1: 'Tema ' + t.num, cabecera2: t.name, ref: cursoT + '/' + ruta[ruta.length - 2] + '/' + t.year + '#' + t.num,
            secciones: [{ area: AREA_DE[cursoT] || 'general', titulo: '', preguntas: t.questions }] };
        });
      }
    });
  }
  // Exámenes pasados: ver.html (window.MC_TEMA con examen: true). Se agrupan por área y asignatura
  if (archivo === 'ver.html' && ruta[ruta.length - 3] === 'examenes') {
    registrar({
      tipo: 'examen', area: 'general',
      lugar: function () { var p = document.getElementById('practicarLink'); return p && { padre: p.parentNode, antes: p }; },
      datos: function () {
        return cuando('mc:tema-listo', function () { return !!window.MC_TEMA; }).then(function () {
          var t = window.MC_TEMA, secs = [], last = null;
          t.questions.forEach(function (q) {
            var a = areaPorNombre(q.area) || AREA_DE[cursoPorNombre(q.asignatura)] || 'general', s = q.asignatura || '';
            if (!last || last.area !== a || last.titulo !== s) { last = { area: a, titulo: s, preguntas: [] }; secs.push(last); }
            last.preguntas.push(q);
          });
          return { formato: 'simulacro', tipo: 'examen', area: 'general', titulo: t.curso + ' ' + t.year, portada1: t.curso.replace(/^Examen\s+/i, 'Examen '), portada2: t.year,
            subtitulo: 'Examen de admisión ' + t.year, ciclo: 'Exámenes pasados', cabecera1: 'Examen', cabecera2: t.curso + ' ' + t.year, ref: t.carpeta + '/' + t.year, secciones: secs,
            // Portadas de los formatos 1 y 2
            nro: t.year, nroEtq: 'Ciclo', tipoNom: 'Examen de admisión', banda: 'Examen pasado', lomo1: 'Examen de', lomo2: 'admisión' };
        });
      }
    });
  }
  // Agrupa preguntas de varios cursos por área y curso (Fijas de varios temas, Falladas, Simulacro)
  function porAreaYCurso(qs, cursoDe, ordenar) {
    var grupos = {};
    qs.forEach(function (q) { var c = cursoDe(q) || 'otros'; (grupos[c] = grupos[c] || []).push(q); });
    var cursos = Object.keys(grupos);
    if (ordenar !== false) cursos.sort(function (a, b) {
      var ia = ORDEN_AREAS.indexOf(AREA_DE[a]), ib = ORDEN_AREAS.indexOf(AREA_DE[b]);
      if (ia !== ib) return (ia < 0 ? 9 : ia) - (ib < 0 ? 9 : ib);
      return (AREAS[AREA_DE[a]] ? AREAS[AREA_DE[a]].cursos.indexOf(a) : 0) - (AREAS[AREA_DE[b]] ? AREAS[AREA_DE[b]].cursos.indexOf(b) : 0);
    });
    return cursos.map(function (c) { return { area: AREA_DE[c] || 'general', titulo: NOM_CURSO[c] || c, preguntas: grupos[c] }; });
  }
  // Fijas y Mis falladas: la página deja window.MC_SET
  function registrarSet() {
    var s = window.MC_SET; if (!s) return;
    if (s.tipo === 'fijas') registrar({
      tipo: 'fijas', area: AREA_DE[s.carpeta],
      lugar: function () { var i = document.querySelector('#startScreen .start-info'); return i && { padre: i.parentNode, antes: i.nextSibling, solo: true, clase: 'mcd-solo', texto: 'Descargar PDF', envolver: true }; },
      datos: function () {
        var x = window.MC_SET, nom = NOM_CURSO[x.carpeta] || x.curso;
        return { formato: 'tema', tipo: 'fijas', area: AREA_DE[x.carpeta] || 'general', etiqueta: 'FIJAS', numero: '', titulo: 'Fijas · ' + nom, subtitulo: nom + ' · Fijas ' + x.year,
          chips: [x.temas.reduce(function (a, t) { return a + t.preguntas.length; }, 0) + ' preguntas', x.temas.length + (x.temas.length === 1 ? ' tema' : ' temas')],
          cabecera1: 'Fijas ' + x.year, cabecera2: nom, ref: x.carpeta + '/fijas/' + x.year,
          secciones: x.temas.map(function (t) { return { area: AREA_DE[x.carpeta] || 'general', titulo: x.temas.length > 1 ? t.nombre : '', preguntas: t.preguntas }; }) };
      }
    });
    if (s.tipo === 'falladas') registrar({
      tipo: 'falladas', area: 'general',
      lugar: function () { var i = document.querySelector('#startScreen .start-info'); return i && { padre: i.parentNode, antes: i.nextSibling, solo: true, clase: 'mcd-solo', texto: 'Descargar PDF', envolver: true }; },
      datos: function () {
        var x = window.MC_SET, secs = porAreaYCurso(x.preguntas, function (q) { return String(q._ref || '').split('/')[0]; });
        return { formato: 'agrupado', tipo: 'falladas', area: 'general', etiqueta: 'FALLADAS', numero: String(x.preguntas.length), titulo: 'Mis falladas', subtitulo: 'Para repasar lo que más te cuesta',
          chips: [x.preguntas.length + ' preguntas', secs.length + (secs.length === 1 ? ' curso' : ' cursos')], cabecera1: 'Repaso', cabecera2: 'Mis falladas', ref: 'falladas', secciones: secs };
      }
    });
  }
  document.addEventListener('mc:set-listo', registrarSet);
  if (window.MC_SET) registrarSet();

  // N.º de cada simulacro del alumno (01, 02…): se guarda en el teléfono; el mismo simulacro conserva su número
  function numeroSim(id) {
    var K = 'mc_sim_numeros', m = {};
    try { m = JSON.parse(leer(K) || '{}') || {}; } catch (e) {}
    id = String(id || 'sin-id');
    if (!m[id]) { var max = 0; Object.keys(m).forEach(function (k) { max = Math.max(max, +m[k] || 0); }); m[id] = max + 1; guardar(K, JSON.stringify(m)); }
    return m[id];
  }
  // Simulacro: al empezar el examen, la página deja window.MC_SIM
  function registrarSim() {
    if (!window.MC_SIM) return;
    registrar({
      tipo: 'simulacro', area: 'general',
      lugar: function () { var b = document.getElementById('btnTerminar'); return b && { padre: b.parentNode, antes: b, solo: true, clase: 'btn sec mini', texto: 'PDF' }; },
      datos: function () {
        var x = window.MC_SIM, NOMT = { rapido: 'Simulacro rápido', personalizado: 'Simulacro personalizado', libre: 'Simulacro libre' };
        var secs = x.tipo === 'personalizado'
          ? porAreaYCurso(x.preguntas, function (q) { return q._curso; })
          : porAreaYCurso(x.preguntas, function (q) { return q._curso; }, false);
        secs.forEach(function (s) { if (s.preguntas[0] && conTemas(s.preguntas[0], s.titulo)) s.preguntas = juntarTemas(s.preguntas); });
        var nro = dos(numeroSim(x.id));
        return { formato: 'simulacro', tipo: 'simulacro', area: 'general', titulo: x.nombre || 'Simulacro', portada1: 'Simulacro', portada2: '',
          subtitulo: (NOMT[x.tipo] || 'Simulacro') + (x.bloque ? ' · Bloque ' + x.bloque : ''), ciclo: 'Admisión UNJFSC', minutos: x.minutos,
          cabecera1: NOMT[x.tipo] || 'Simulacro', cabecera2: 'Simulacro N.º ' + nro, ref: 'simulacro/' + (x.id || ''), secciones: secs,
          // Portadas de los formatos 1 y 2
          nro: nro, tipoNom: NOMT[x.tipo] || 'Simulacro', bloque: x.bloque || '', carrera: x.carrera || '' };
      }
    });
  }
  document.addEventListener('mc:sim-listo', registrarSim);
  if (window.MC_SIM) registrarSim();

  // Vocabulario: el banco guardado en el teléfono (assets/vocab-banco.js)
  if (archivo === 'vocabulario.html') {
    registrar({
      tipo: 'vocabulario', area: 'comunicacion',
      lugar: function () { var t = document.getElementById('titulo'); return t && { padre: t.parentNode, antes: t.nextSibling, solo: true, clase: 'mcd-solo', texto: 'Descargar PDF', envolver: true }; },
      datos: function () {
        if (!window.MCVocab) throw new Error('No se pudieron cargar las palabras.');
        return MCVocab.banco().then(function (l) {
          var p = (l || []).filter(function (w) { return w && w.palabra; });
          return { formato: 'vocabulario', tipo: 'vocabulario', area: 'comunicacion', etiqueta: 'LÉXICO', numero: '', titulo: 'Vocabulario', subtitulo: 'Sinónimos y antónimos · Razonamiento Verbal',
            chips: [p.length + ' palabras'], cabecera1: 'Razonamiento Verbal', cabecera2: 'Vocabulario', ref: 'vocabulario', palabras: p };
        });
      }
    });
  }
  // Flashcards de un tema: la página deja window.MC_TARJETAS
  function registrarTarjetas() {
    if (!window.MC_TARJETAS) return;
    registrar({
      tipo: 'tarjetas',
      lugar: function () { var l = document.getElementById('lead'); return l && { padre: l.parentNode, antes: l.nextSibling, solo: true, clase: 'mcd-solo', texto: 'Descargar PDF', envolver: true }; },
      datos: function () {
        var x = window.MC_TARJETAS;
        return { formato: 'tarjetas', tipo: 'tarjetas', area: AREA_DE[x.curso] || areaDePagina() || 'general', etiqueta: 'TEMA', numero: x.num || '', titulo: x.titulo, subtitulo: x.sub || 'Flashcards',
          chips: [x.cartas.length + ' tarjetas', 'Para recortar'], cabecera1: 'Flashcards', cabecera2: x.titulo, ref: 'tarjetas/' + (x.ref || ''), cartas: x.cartas };
      }
    });
  }
  document.addEventListener('mc:tarjetas-listo', registrarTarjetas);
  if (window.MC_TARJETAS) registrarTarjetas();

  window.MCDescarga = { registrar: registrar, abrir: abrir, generar: generar, cfg: cfg, ESTILO: ESTILO, _porAreaYCurso: porAreaYCurso };
})();
