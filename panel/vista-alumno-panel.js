/* =========================================================
   Modo Cachimbo · Panel · Vista del alumno al subir temas y exámenes
   A la derecha de "Subir tema" / "Subir examen" se ve la pregunta tal como la
   verá el alumno (panel/vista-alumno.html, con los estilos de la práctica real).
   - Paso 1 (texto): se actualiza mientras escribes y sigue la pregunta donde
     está el cursor.
   - Paso 2 (revisar): muestra la pregunta que tocas o señalas, con las imágenes
     que ya pegaste.
   - Celular / PC, ‹ › para pasar de pregunta y "Mostrar clave".
   Usa SUB, parsearTexto, parsearExamen, NOMBRE, detectarCurso… de subir.js.
   ========================================================= */
(function () {
  var marco = document.getElementById('vaMarco'), frame = document.getElementById('vaFrame');
  if (!marco || !frame) return;
  var st = { i: 0, preguntas: [], clave: false }, tPars = 0;

  // NOMBRE y CURSOS se declaran con let en el panel: se ven desde aquí, pero no como window.NOMBRE
  function nombreCurso() {
    try {
      if (SUB.modo === 'examen') { var t = document.getElementById('exTipo'); return t && t.selectedOptions[0] ? t.selectedOptions[0].textContent : 'Examen'; }
      var ta = document.getElementById('subTexto'), m = ta && ta.value.match(/^\s*CURSO\s*:\s*(.+)$/mi);
      var c = (m && detectarCurso(m[1])) || document.getElementById('subCurso').value;
      return (typeof NOMBRE !== 'undefined' && NOMBRE[c]) || c || 'Libros';
    } catch (e) { return 'Libros'; }
  }
  function nombreTema() {
    var el = document.getElementById('subNombre'), ta = document.getElementById('subTexto');
    if (el && el.value && !document.getElementById('subPaso2').hidden) return el.value;
    var m = ta && ta.value.match(/^\s*TEMA\s*:\s*\d*\s*[-–:.]?\s*(.+)$/mi);
    return m ? m[1].trim() : (el ? el.value : '');
  }
  // Pregunta del panel (ya leída del texto) → pregunta como la recibe la práctica del alumno
  function aAlumno(q, i, conImagenes) {
    var tema = nombreTema();
    var topic = SUB.modo === 'examen' ? [q.asignatura, q.tema].filter(Boolean).join(' · ') : (nombreCurso() + (tema ? ' · ' + tema : ''));
    var out = {
      text: (q.lectura || '') + q.text + (q.etiqueta ? '\n[ETIQUETA: ' + q.etiqueta + ']' : ''),
      options: (q.options || []).map(function (o) { return { letter: o.letter, text: o.text }; }),
      correct: q.correct, topic: topic, _imgs: {}
    };
    if (q.abierta) Object.assign(out, { abierta: true, respuestas: (q.respuestas || []).slice(), options: [], correct: 0 });
    ['tipo', 'huecos', 'afirmaciones', 'pares', 'orden'].forEach(function (k) { if (q[k] != null) out[k] = q[k]; });
    if (conImagenes && SUB.zonas) {
      var k = 0;
      String(q.text).replace(/^\[IMAGEN( DERECHA)?\]$/gm, function () {
        var z = SUB.zonas[i + '|' + k], e = z && z.estado(); if (e && e.cambio === 'nueva') out._imgs[k] = e.img.dataUrl; k++; return '';
      });
      var g = SUB.zonas[i + '|g'], eg = g && g.estado(); if (eg && eg.cambio === 'nueva') out._imgs.g = eg.img.dataUrl;
    }
    return out;
  }
  function leerTexto() {
    var ta = document.getElementById('subTexto'); if (!ta) return [];
    try { var r = SUB.modo === 'examen' ? parsearExamen(ta.value) : parsearTexto(ta.value); return r.preguntas || []; } catch (e) { return []; }
  }
  function enviar() {
    var paso2 = !document.getElementById('subPaso2').hidden;
    var ps = paso2 && SUB.parse ? SUB.parse.preguntas : leerTexto();
    st.preguntas = ps.map(function (q, i) { return aAlumno(q, i, paso2); });
    try { if (window.MCPregunta && MCPregunta.rangos) MCPregunta.rangos(st.preguntas); } catch (e) {}
    st.i = Math.max(0, Math.min(st.preguntas.length - 1, st.i));
    document.getElementById('vaNum').textContent = st.preguntas.length ? (st.i + 1) + ' / ' + st.preguntas.length : '—';
    var titulo = SUB.modo === 'examen' ? 'Examen Admisión' : 'Práctica ' + nombreCurso();
    if (frame.contentWindow) frame.contentWindow.postMessage({ tipo: 'mc-vista', preguntas: st.preguntas, i: st.i, clave: st.clave, titulo: titulo, atras: SUB.modo === 'examen' ? 'Exámenes' : 'Libros CPU' }, '*');
  }
  function pronto() { clearTimeout(tPars); tPars = setTimeout(enviar, 300); }

  // La pregunta donde está el cursor (cuenta los "PREGUNTA n" que hay antes)
  function seguirCursor() {
    var ta = document.getElementById('subTexto'); if (!ta) return;
    var antes = ta.value.slice(0, ta.selectionStart || 0);
    var n = (antes.match(/^[ \t]*(?:\*\*)?PREGUNTA\b/gmi) || []).length;
    var i = Math.max(0, n - 1);
    if (i !== st.i) { st.i = i; pronto(); }
  }
  var ta = document.getElementById('subTexto');
  if (ta) {
    ta.addEventListener('input', function () { seguirCursor(); pronto(); });
    ['click', 'keyup', 'focus'].forEach(function (ev) { ta.addEventListener(ev, seguirCursor); });
  }
  // Paso 2: la tarjeta que tocas o señalas
  var lista = document.getElementById('subLista');
  if (lista) ['mouseover', 'click', 'focusin'].forEach(function (ev) {
    lista.addEventListener(ev, function (e) {
      var c = e.target.closest && e.target.closest('.pcard'); if (!c) return;
      var i = Array.prototype.indexOf.call(lista.querySelectorAll('.pcard'), c);
      if (i >= 0 && i !== st.i) { st.i = i; pronto(); }
    });
  });
  // Al pegar imágenes o cambiar curso/tema/ciclo también se actualiza
  if (typeof validarMeta === 'function') {
    var orig = validarMeta;
    validarMeta = function () { var r = orig.apply(this, arguments); pronto(); return r; };
  }
  ['subCurso', 'subNombre', 'exTipo'].forEach(function (id) { var el = document.getElementById(id); if (el) el.addEventListener('input', pronto); });
  // Cambio de paso (revisar / volver) y de modo (tema / examen)
  // La vista solo sale después de "Revisar preguntas" (paso 2)
  function verVista() {
    var p2 = document.getElementById('subPaso2'), on = !p2.hidden;
    document.getElementById('vistaAlu').hidden = !on;
    document.querySelector('.sub-grid').classList.toggle('sin-vista', !on);
    if (on) pronto();
  }
  new MutationObserver(verVista).observe(document.getElementById('subPaso2'), { attributes: true, attributeFilter: ['hidden'] });
  verVista();

  // Controles
  document.getElementById('vaAnt').onclick = function () { if (st.i > 0) { st.i--; enviar(); } };
  document.getElementById('vaSig').onclick = function () { if (st.i < st.preguntas.length - 1) { st.i++; enviar(); } };
  document.getElementById('vaClave').onchange = function (e) { st.clave = e.target.checked; enviar(); };
  document.querySelectorAll('.va-tabs button').forEach(function (b) {
    b.onclick = function () {
      document.querySelectorAll('.va-tabs button').forEach(function (x) { x.classList.toggle('on', x === b); });
      marco.className = 'va-marco ' + b.dataset.w;
      try { localStorage.setItem('mc_panel_vista', b.dataset.w); } catch (e) {}
    };
  });
  try { var w = localStorage.getItem('mc_panel_vista'); if (w) { var bt = document.querySelector('.va-tabs button[data-w="' + w + '"]'); if (bt) bt.click(); } } catch (e) {}
  window.addEventListener('message', function (e) {
    var m = e.data; if (!m) return;
    if (m.tipo === 'mc-vista-lista') enviar();
    if (m.tipo === 'mc-vista-i') { st.i = m.i; document.getElementById('vaNum').textContent = (st.i + 1) + ' / ' + st.preguntas.length; }
  });
  window.MCVistaAlumno = { refrescar: enviar };
})();
