/* =========================================================
   Modo Cachimbo · El búho de las pantallas de inicio y final
   (repaso, practicar tema y repaso mixto). Va con escena.css.
   - Necesita assets/buho/buho-datos.js y buho-vivo.js antes.
   - MCEscena.inicio({ escena, globo, area, frases }): pone el búho
     disfrazado del área con su globo. frases = [[pose, emoción, html], ...];
     sale una al azar y otra cada vez que lo tocan. 3 toques: cosquillas;
     7 seguidos: llora y se sacude.
   - MCEscena.fin(escena, area, { vidas, pct }): el búho reacciona al resultado.
   - Áreas: matematica (al-Juarismi), ciencia-tecnologia (Einstein),
     comunicacion (Don Quijote), ciencias-sociales (Inca). Cada una con
     4 emociones en disfraces/<area>-<emoción>.webp.
   ========================================================= */
(function () {
  if (window.MCEscena) return;
  var BASE = (document.currentScript && document.currentScript.src || '').replace(/[^/]*$/, '');
  var AREAS = {
    'biologia': 'ciencia-tecnologia', 'anatomia': 'ciencia-tecnologia', 'quimica': 'ciencia-tecnologia', 'fisica': 'ciencia-tecnologia',
    'algebra': 'matematica', 'aritmetica': 'matematica', 'geometria': 'matematica', 'trigonometria': 'matematica', 'estadistica': 'matematica',
    'raz-verbal': 'comunicacion', 'literatura': 'comunicacion', 'lenguaje': 'comunicacion',
    'historia-peru': 'ciencias-sociales', 'historia-universal': 'ciencias-sociales', 'geografia': 'ciencias-sociales', 'economia': 'ciencias-sociales',
    'ciudadania': 'ciencias-sociales', 'psicologia': 'ciencias-sociales', 'filosofia': 'ciencias-sociales'
  };
  var EMOS = ['feliz', 'asombrado', 'pensativo', 'triste'];
  // Efectos sobre la cabeza: destellos, signos o gotitas (svg o texto, y cuántos)
  var FX = {
    feliz: ['<svg viewBox="0 0 20 20"><path d="M10 0l2.4 7.6L20 10l-7.6 2.4L10 20l-2.4-7.6L0 10l7.6-2.4z"/></svg>', 3],
    asombrado: ['<b>!</b>', 2],
    pensativo: ['<b>?</b>', 3],
    triste: ['<svg viewBox="0 0 14 20"><path d="M7 0C5 6 0 10 0 13.4a7 7 0 0 0 14 0C14 10 9 6 7 0z"/></svg>', 2]
  };

  // Área del curso (por su carpeta) o la que trae la página en <html data-area>
  function area(id) {
    if (id && AREAS[id]) return AREAS[id];
    var a = document.documentElement.getAttribute('data-area');
    return a && /^(matematica|ciencia-tecnologia|comunicacion|ciencias-sociales)$/.test(a) ? a : null;
  }

  function efecto(escena, emo) {
    var caja = escena.parentNode, fx = FX[emo];
    Array.prototype.forEach.call(caja.querySelectorAll('.rp-fx'), function (e) { e.remove(); });
    for (var k = 0; k < fx[1]; k++) {
      var e = document.createElement('i');
      e.className = 'rp-fx rp-fx-' + emo; e.setAttribute('aria-hidden', 'true');
      e.innerHTML = fx[0]; e.style.setProperty('--k', k);
      caja.append(e);
      setTimeout(e.remove.bind(e), 1900);
    }
  }

  function imagen(escena, ar, emo, extra) {
    var i = new Image();
    i.className = 'mcb mcb-disfraz rp-e-' + emo + (extra ? ' ' + extra : '');
    i.src = BASE + 'disfraces/' + ar + '-' + emo + '.webp';
    i.alt = 'Búho de Modo Cachimbo ' + emo; i.draggable = false;
    setTimeout(function () { efecto(escena, emo); }, 120);
    return i;
  }

  function vestir(escena, ar) {
    if (!ar) return;
    document.documentElement.classList.add('rp-' + ar);
    escena.parentNode.classList.add('rp-disf');
  }

  function inicio(o) {
    var escena = o.escena, globo = o.globo, ar = o.area, frases = o.frases;
    var i = Math.floor(Math.random() * frases.length), t, ocupado = false;
    function frase() { globo.innerHTML = '<span>' + frases[i][2] + '</span>'; }
    function decir(txt, tono, ms) {
      ocupado = true; globo.innerHTML = '<span></span>'; globo.firstChild.textContent = txt;
      clearTimeout(t); t = setTimeout(function () { ocupado = false; frase(); }, ms || 2800);
    }
    // 'frase' es la emoción de la frase actual; 'logro' y 'enojado' llegan con las cosquillas o si lo molestan
    function pose() { return ar ? 'frase' : frases[i][0]; }
    function crear(p) {
      if (!ar) return MCBuhoVivo.crear(p);
      if (p === 'enojado') return imagen(escena, ar, 'triste', 'rp-molesto');
      return imagen(escena, ar, p === 'logro' ? 'feliz' : frases[i][1]);
    }
    function otra() {
      if (ocupado) return;
      i = (i + 1) % frases.length; frase();
      var v = escena.querySelector('.mcb'); if (v) v.remove();
      escena.append(crear(pose()));
    }
    vestir(escena, ar);
    // Precarga las 4 emociones para que no parpadee al cambiar
    if (ar) EMOS.forEach(function (e) { new Image().src = BASE + 'disfraces/' + ar + '-' + e + '.webp'; });
    frase();
    if (window.MCBuhoVivo) MCBuhoVivo.toques(escena, { pose: pose, sonido: !window.MCSonido || MCSonido.activo, decir: decir, alTocar: otra, crear: crear });
  }

  // Final: llora si se quedó sin vidas, se asombra con 80 % o más, feliz con 50 % y pensativo si no
  function fin(escena, ar, r) {
    escena.innerHTML = '';
    vestir(escena, ar);
    var emo = r.vidas <= 0 ? 'triste' : r.pct >= .8 ? 'asombrado' : r.pct >= .5 ? 'feliz' : 'pensativo';
    if (ar) escena.append(imagen(escena, ar, emo));
    else if (window.MCBuhoVivo) escena.append(MCBuhoVivo.crear({ triste: 'triste', asombrado: 'logro', feliz: 'saludando', pensativo: 'estudiando' }[emo]));
  }

  window.MCEscena = { area: area, inicio: inicio, fin: fin };
})();
