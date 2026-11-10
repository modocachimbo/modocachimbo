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
      correct: q.correct, topic: topic, asignatura: q.asignatura, tema: q.tema, num: q.num, _imgs: {}
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
    var ex = SUB.modo === 'examen', ta2 = document.getElementById('subTexto');
    var num = (document.getElementById('subNum') || {}).value || ((ta2 && ta2.value.match(/^\s*TEMA\s*:\s*(\d+)/mi)) || [])[1] || '';
    var ciclo = ex ? (document.getElementById('exCiclo') || {}).value : (document.getElementById('subCiclo') || {}).value;
    var titulo = ex ? nombreCurso() + (ciclo ? ' ' + ciclo : '') : nombreTema();
    var badge = ex ? 'Examen' + (ciclo ? ' · ' + ciclo : '') : nombreCurso() + (ciclo ? ' · ' + ciclo : '');
    if (frame.contentWindow) frame.contentWindow.postMessage({ tipo: 'mc-vista', preguntas: st.preguntas, i: st.i, modo: ex ? 'examen' : 'tema', titulo: titulo, badge: badge, num: num ? String(num).padStart(2, '0') : '' }, '*');
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
  // La vista es una ventana flotante: el botón "Ver como alumno" sale después de "Revisar preguntas"
  var caja = document.getElementById('vistaAlu'), abrir = document.getElementById('vaAbrir'), pant = document.getElementById('vaPantalla');
  var abierta = false; try { abierta = localStorage.getItem('mc_panel_vista_abierta') === '1'; } catch (e) {}
  function verVista() {
    var on = !document.getElementById('subPaso2').hidden && !document.getElementById('tab-subir').hidden;
    caja.hidden = !(on && abierta); abrir.hidden = !on || abierta;
    if (on && abierta) { escalar(); pronto(); }
  }
  function ponerAbierta(v) { abierta = v; try { localStorage.setItem('mc_panel_vista_abierta', v ? '1' : '0'); } catch (e) {} verVista(); }
  abrir.onclick = function () { ponerAbierta(true); };
  document.getElementById('vaCerrar').onclick = function () { ponerAbierta(false); };
  new MutationObserver(verVista).observe(document.getElementById('subPaso2'), { attributes: true, attributeFilter: ['hidden'] });
  new MutationObserver(verVista).observe(document.getElementById('tab-subir'), { attributes: true, attributeFilter: ['hidden'] });
  // Tamaño real de la pantalla y escala para caber en la ventana
  var TAM = { cel: [390, 844], pc: [1366, 768] };
  function escalar() {
    var w = marco.classList.contains('pc') ? 'pc' : 'cel', t = TAM[w], borde = w === 'cel' ? 20 : 6, arriba = w === 'cel' ? 20 : 29;
    var ancho = t[0] + borde, alto = t[1] + arriba, sc = Math.min(marco.clientWidth / ancho, marco.clientHeight / alto, 1);
    pant.style.width = ancho + 'px'; pant.style.height = alto + 'px';
    pant.style.transform = 'translateX(-50%) scale(' + sc + ')';
  }
  if (window.ResizeObserver) new ResizeObserver(escalar).observe(marco);
  // Mover la ventana arrastrando la barra de arriba
  (function () {
    var cab = document.getElementById('vaCab'), x0, y0, r0;
    cab.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      r0 = caja.getBoundingClientRect(); x0 = e.clientX; y0 = e.clientY; cab.setPointerCapture(e.pointerId);
    });
    cab.addEventListener('pointermove', function (e) {
      if (!r0) return;
      var l = Math.max(0, Math.min(innerWidth - 80, r0.left + e.clientX - x0)), t = Math.max(0, Math.min(innerHeight - 60, r0.top + e.clientY - y0));
      caja.style.left = l + 'px'; caja.style.top = t + 'px'; caja.style.right = 'auto'; caja.style.bottom = 'auto';
    });
    cab.addEventListener('pointerup', function () { r0 = null; });
  })();
  verVista();

  // Controles
  document.getElementById('vaAnt').onclick = function () { if (st.i > 0) { st.i--; enviar(); } };
  document.getElementById('vaSig').onclick = function () { if (st.i < st.preguntas.length - 1) { st.i++; enviar(); } };
  document.querySelectorAll('.va-tabs button').forEach(function (b) {
    b.onclick = function () {
      document.querySelectorAll('.va-tabs button').forEach(function (x) { x.classList.toggle('on', x === b); });
      marco.className = 'va-marco ' + b.dataset.w; caja.classList.toggle('pc', b.dataset.w === 'pc'); escalar();
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
