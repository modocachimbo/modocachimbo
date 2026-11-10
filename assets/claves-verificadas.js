/* =========================================================
   Sello "Clave verificada" en los exámenes (Ordinario, CPU, Control)
   El equipo marca en el panel (Verificar claves) las claves que un
   profesor confirmó. Aquí solo se pinta el sello; nada más.
   - Modo estudio (ver.html): debajo de las alternativas de cada pregunta verificada.
   - Quiz (quiz.html): debajo del "¡Correcto!" / "Incorrecto…", después de responder.
   Si la clave publicada ya no es la letra que se verificó (alguien la cambió
   después), el sello no sale.
   Datos: supabase/83-claves-verificadas.sql (claves_verificadas).
   ========================================================= */
(function () {
  var SELLO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1.6l2.3 1.7 2.8-.3 1.1 2.6 2.6 1.1-.3 2.8 1.7 2.3-1.7 2.3.3 2.8-2.6 1.1-1.1 2.6-2.8-.3L12 22.4l-2.3-1.7-2.8.3-1.1-2.6-2.6-1.1.3-2.8L1.8 12l1.7-2.3-.3-2.8 2.6-1.1 1.1-2.6 2.8.3z"/><path d="m7.6 12.3 3 3 5.8-6" fill="none" stroke="#0f0d1c" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var st = document.createElement('style');
  st.textContent =
    '.vf-sello{display:flex;align-items:center;gap:10px;margin-top:12px;padding:10px 14px;border-radius:14px;background:rgba(88,204,2,.10);border:2px solid rgba(88,204,2,.45);border-bottom-width:4px;color:#7EE23A;font:900 15px/1.2 Nunito,Inter,system-ui,sans-serif;letter-spacing:.2px}' +
    '.vf-sello svg{width:26px;height:26px;color:#58CC02;flex-shrink:0;filter:drop-shadow(0 0 6px rgba(88,204,2,.35))}' +
    '.feedback .vf-sello{margin-top:10px;padding:7px 12px;font-size:13.5px;border-bottom-width:3px;width:max-content;max-width:100%}' +
    '.feedback .vf-sello svg{width:20px;height:20px}' +
    'html[data-theme="light"] .vf-sello{color:#2f7a00;background:rgba(88,204,2,.12)}';
  document.head.appendChild(st);

  var cache = {};   // "tipo|examen" -> promesa de { n: letra }
  function cargar(tipo, examen) {
    var k = tipo + '|' + examen;
    if (cache[k]) return cache[k];
    cache[k] = (window.MCAuth && MCAuth.listo ? MCAuth.listo : Promise.reject())
      .then(function (c) { return c.rpc('claves_verificadas', { p_tipo: tipo, p_examen: examen }); })
      .then(function (r) {
        var m = {};
        if (r && !r.error && Array.isArray(r.data)) r.data.forEach(function (x) { m[x.n] = x.letra; });
        return m;
      })
      .catch(function () { return {}; });   // sin conexión o sin el SQL 83 todavía: no sale nada
    return cache[k];
  }
  function letraDe(q) { var o = q && q.options && q.options[q.correct]; return o ? String(o.letter || 'ABCDEF'.charAt(q.correct)).toUpperCase() : ''; }
  function ok(mapa, n, q) { var l = mapa[n]; return !!l && l === letraDe(q); }
  function sello() { var d = document.createElement('div'); d.className = 'vf-sello'; d.innerHTML = SELLO + '<span>Clave verificada</span>'; return d; }

  // Modo estudio: cada tarjeta es #q<n> (n = lugar en el examen)
  function enVer(tipo, examen, preguntas) {
    return cargar(tipo, examen).then(function (m) {
      preguntas.forEach(function (q, i) {
        var card = document.getElementById('q' + (i + 1));
        if (!card || card.querySelector('.vf-sello') || !ok(m, i + 1, q)) return;
        var fila = card.querySelector('.rep-row');
        if (fila) card.insertBefore(sello(), fila); else card.appendChild(sello());
      });
    });
  }

  // Quiz: q._ref = "examenes/<tipo>/data/<examen>.json##<índice>"
  function feedback(el, q) {
    var r = /^examenes\/([a-z-]+)\/data\/([^/]+)\.json##(\d+)$/.exec((q && q._ref) || '');
    if (!el || !r) return;
    el.dataset.vf = q._ref;
    cargar(r[1], r[2]).then(function (m) {
      // Si ya pasó a otra pregunta mientras cargaba, no se pinta
      if (el.dataset.vf !== q._ref || !el.classList.contains('show') || el.querySelector('.vf-sello') || !ok(m, +r[3] + 1, q)) return;
      var bt = el.querySelector('.bt-fb');
      if (bt) el.insertBefore(sello(), bt); else el.appendChild(sello());
    });
  }

  window.MCVerif = { cargar: cargar, enVer: enVer, feedback: feedback };
})();
