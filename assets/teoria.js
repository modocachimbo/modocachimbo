/* =========================================================
   Modo Cachimbo · Teoría interactiva: formato de texto → partes
   Lo usan teoria.html (para mostrarla) y el panel (Panel → Teoría,
   para revisar errores y contar las partes antes de guardar).

   Cómo se escribe (una marca al inicio de la línea; lo que sigue
   hasta la próxima marca es su contenido):

   [PARTE] Título de la parte
   [ENGANCHE] Pregunta curiosa para antes de leer
   A) opción  B) opción  C) opción   (una por línea)
   CLAVE: B
   POR QUÉ: explicación que se muestra al final de la parte
   [CONCEPTO] Título          → párrafos; **negrita**, ==resaltado==, $fórmula$
   [FÓRMULA] $E = \rho g V$   → la línea de abajo es la nota
   [TARJETAS] Título          → una por línea: Nombre | detalle
   [ÁRBOL] Raíz               → una rama por línea: Nombre | detalle
   [PASOS] Título             → un paso por línea
   [OJO] texto que cae en el examen
   [DATO] ¿Sabías que…?
   [GRÁFICO: tipo] … [/GRÁFICO]  (mismos gráficos que en las preguntas)
   [IMAGEN] https://…         → la línea de abajo es el pie
   [FIGURA] glucosa           → figuras animadas: glucosa, enlace, trigliceridos
   [LABORATORIO] lab-celula   → botón al simulador; abajo, el texto
   [ENTENDISTE] pregunta + A) B) C) + CLAVE + POR QUÉ
   ========================================================= */
(function () {
  if (window.MCTeoria) return;
  var LETRAS = 'ABCDE';
  var NOMBRES = {
    'PARTE': 'parte', 'ENGANCHE': 'enganche', 'CONCEPTO': 'concepto', 'FÓRMULA': 'formula', 'FORMULA': 'formula',
    'TARJETAS': 'tarjetas', 'ÁRBOL': 'arbol', 'ARBOL': 'arbol', 'PASOS': 'pasos', 'OJO': 'ojo', 'DATO': 'dato',
    'GRÁFICO': 'grafico', 'GRAFICO': 'grafico', 'IMAGEN': 'imagen', 'FIGURA': 'figura', 'LABORATORIO': 'laboratorio',
    'ENTENDISTE': 'check', '¿ENTENDISTE?': 'check'
  };
  var FIGURAS = ['glucosa', 'enlace', 'trigliceridos'];
  var RX_MARCA = /^\s*\[\s*(\/?)\s*([¿?A-Za-zÁÉÍÓÚÑáéíóúñ]+)\s*(?::\s*([^\]]*))?\]\s*(.*)$/;
  var RX_OPC = /^\s*([A-Ea-e])\s*[\)\.]\s+(.+)$/;

  function mayus(s) { return String(s || '').toUpperCase(); }
  function limpiar(l) { return String(l || '').replace(/\s+$/, ''); }

  function pregunta(b, n, errores) {
    var preg = [], opciones = [], clave = null, explica = [], modo = 'preg';
    if (b.resto) preg.push(b.resto);
    b.lineas.forEach(function (l) {
      var t = l.trim(), m;
      if (!t) { if (modo === 'explica') explica.push(''); return; }
      if ((m = t.match(/^CLAVE\s*:\s*([A-Ea-e])\b/i))) { clave = LETRAS.indexOf(m[1].toUpperCase()); modo = 'fin'; return; }
      if ((m = t.match(/^POR\s*QU[EÉ]\s*:\s*(.*)$/i))) { if (m[1]) explica.push(m[1]); modo = 'explica'; return; }
      if (modo === 'explica') { explica.push(t); return; }
      if ((m = t.match(RX_OPC)) && modo !== 'fin') { opciones.push(m[2].trim()); modo = 'opc'; return; }
      if (modo === 'preg') preg.push(t);
      else if (modo === 'opc' && opciones.length) opciones[opciones.length - 1] += ' ' + t;
    });
    var nombre = b.tipo === 'enganche' ? 'El enganche' : 'El ¿Entendiste?';
    var donde = ' (línea ' + n + ')';
    if (!preg.join(' ').trim()) errores.push(nombre + ' no tiene pregunta' + donde);
    if (opciones.length < 2) errores.push(nombre + ' necesita al menos 2 opciones (A) … B) …)' + donde);
    if (clave == null || clave < 0) errores.push(nombre + ' no tiene CLAVE: (por ejemplo CLAVE: B)' + donde);
    else if (clave >= opciones.length) errores.push(nombre + ': la CLAVE ' + LETRAS[clave] + ' no está entre las opciones' + donde);
    return { tipo: b.tipo, pregunta: preg.join(' ').trim(), opciones: opciones, correcta: clave, explica: explica.join('\n').trim() };
  }

  function items(lineas) {
    return lineas.map(function (l) { return l.trim().replace(/^[-•*]\s+/, '').replace(/^\d+[\.\)]\s+/, ''); }).filter(Boolean).map(function (l) {
      var k = l.indexOf('|'); if (k < 0) k = l.indexOf(':');
      return k < 0 ? { t: l, d: '' } : { t: l.slice(0, k).trim(), d: l.slice(k + 1).trim() };
    });
  }
  function parrafos(lineas) {
    var out = [], cur = [];
    lineas.forEach(function (l) { if (l.trim()) cur.push(l.trim()); else if (cur.length) { out.push(cur.join(' ')); cur = []; } });
    if (cur.length) out.push(cur.join(' '));
    return out;
  }

  function armar(b, errores) {
    var t = b.tipo, n = b.linea, L = b.lineas;
    if (t === 'enganche' || t === 'check') return pregunta(b, n, errores);
    if (t === 'concepto') {
      var ps = parrafos(L);
      if (!ps.length) errores.push('[CONCEPTO] sin texto (línea ' + n + ')');
      return { tipo: t, titulo: b.resto || 'Concepto clave', parrafos: ps };
    }
    if (t === 'formula') {
      var f = b.resto, resto = L.slice();
      if (!f) { while (resto.length && !resto[0].trim()) resto.shift(); f = (resto.shift() || '').trim(); }
      if (!f) errores.push('[FÓRMULA] vacía (línea ' + n + ')');
      return { tipo: t, f: f, nota: parrafos(resto).join(' ') };
    }
    if (t === 'tarjetas' || t === 'arbol' || t === 'pasos') {
      var it = items(L);
      if (!it.length) errores.push('[' + ({ tarjetas: 'TARJETAS', arbol: 'ÁRBOL', pasos: 'PASOS' })[t] + '] sin elementos (línea ' + n + ')');
      return t === 'arbol' ? { tipo: t, raiz: b.resto || 'Tipos', items: it } : { tipo: t, titulo: b.resto || '', items: it };
    }
    if (t === 'ojo' || t === 'dato') {
      var tx = [b.resto].concat(parrafos(L)).filter(Boolean);
      if (!tx.length) errores.push('[' + mayus(t) + '] vacío (línea ' + n + ')');
      return { tipo: t, parrafos: tx };
    }
    if (t === 'grafico') return { tipo: t, grafico: b.arg || '', lineas: L.filter(function (l) { return l.trim(); }) };
    if (t === 'imagen') {
      var src = b.resto || '', pie = L.slice();
      if (!src) { while (pie.length && !pie[0].trim()) pie.shift(); src = (pie.shift() || '').trim(); }
      if (!/^(https:\/\/|assets\/)/.test(src)) errores.push('[IMAGEN] necesita un enlace https:// o una ruta assets/… (línea ' + n + ')');
      return { tipo: t, src: src, pie: parrafos(pie).join(' ') };
    }
    if (t === 'figura') {
      var nom = (b.resto || '').trim().toLowerCase().replace(/[^a-z]/g, '');
      if (FIGURAS.indexOf(nom) < 0) errores.push('[FIGURA] «' + b.resto + '» no existe. Hay: ' + FIGURAS.join(', ') + ' (línea ' + n + ')');
      return { tipo: t, figura: nom, pie: parrafos(L).join(' ') };
    }
    if (t === 'laboratorio') {
      var sim = (b.resto || '').trim().toLowerCase().replace(/\.html$/, '').replace(/^lab-/, '');
      if (!/^[a-z0-9-]+$/.test(sim)) errores.push('[LABORATORIO] escribe el simulador, por ejemplo lab-celula (línea ' + n + ')');
      return { tipo: t, sim: sim, texto: parrafos(L).join(' ') };
    }
    return null;
  }

  function parsear(texto) {
    var lineas = String(texto || '').replace(/\r/g, '').split('\n');
    var partes = [], errores = [], parte = null, blk = null, graf = false;
    function cerrar() {
      if (!blk) return;
      if (blk.tipo === 'parte') { blk = null; return; }
      var b = armar(blk, errores);
      if (b) {
        if (b.tipo === 'enganche') {
          if (parte.enganche) errores.push('La parte «' + parte.titulo + '» tiene dos [ENGANCHE]; deja solo uno (línea ' + blk.linea + ')');
          parte.enganche = b;
        } else parte.bloques.push(b);
      }
      blk = null;
    }
    lineas.forEach(function (raw, i) {
      var l = limpiar(raw), m = l.match(RX_MARCA), n = i + 1;
      if (graf) {
        if (m && m[1] === '/' && NOMBRES[mayus(m[2])] === 'grafico') { cerrar(); graf = false; return; }
        blk.lineas.push(l); return;
      }
      var tipo = m && !m[1] ? NOMBRES[mayus(m[2])] : null;
      if (!tipo) {
        if (m && m[1]) return; // cierre suelto, se ignora
        if (blk) blk.lineas.push(l);
        else if (l.trim() && !parte) errores.push('Línea ' + n + ': escribe [PARTE] Título antes del texto');
        else if (l.trim()) errores.push('Línea ' + n + ': este texto no está dentro de ninguna marca ([CONCEPTO], [OJO]…)');
        return;
      }
      cerrar();
      if (tipo === 'parte') {
        parte = { titulo: (m[4] || '').trim() || 'Parte ' + (partes.length + 1), enganche: null, bloques: [], linea: n };
        partes.push(parte);
        blk = { tipo: 'parte' };
        return;
      }
      if (!parte) { errores.push('Línea ' + n + ': escribe [PARTE] Título antes de [' + m[2] + ']'); parte = { titulo: 'Parte 1', enganche: null, bloques: [], linea: n }; partes.push(parte); }
      blk = { tipo: tipo, arg: (m[3] || '').trim(), resto: (m[4] || '').trim(), lineas: [], linea: n };
      if (tipo === 'grafico') {
        if (!blk.arg) errores.push('[GRÁFICO] necesita el tipo, por ejemplo [GRÁFICO: barras] (línea ' + n + ')');
        graf = true;
      }
    });
    if (graf) errores.push('Falta cerrar el gráfico con [/GRÁFICO]');
    cerrar();
    if (!partes.length) errores.push('La teoría no tiene ninguna [PARTE]');
    partes.forEach(function (p) {
      if (!p.bloques.length) errores.push('La parte «' + p.titulo + '» (línea ' + p.linea + ') no tiene contenido');
    });
    return { partes: partes, errores: errores };
  }

  // Avance del alumno: { vista: partes vistas, eng: { "0": "B", … }, fin: true }
  function claveAvance(curso, codigo) { return 'mc_teo_' + curso + '_' + codigo; }
  function avance(curso, codigo) { try { return JSON.parse(localStorage.getItem(claveAvance(curso, codigo)) || '{}') || {}; } catch (e) { return {}; } }
  function guardarAvance(curso, codigo, a) { try { localStorage.setItem(claveAvance(curso, codigo), JSON.stringify(a)); } catch (e) {} }

  window.MCTeoria = { parsear: parsear, figuras: FIGURAS, letras: LETRAS, avance: avance, guardarAvance: guardarAvance };
})();
