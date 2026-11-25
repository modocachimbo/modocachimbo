/* =========================================================
   Modo Cachimbo · Partida a medias (Repaso y Fijas)
   Después de cada respuesta se guarda en este celular qué preguntas
   salieron (y en qué orden de alternativas), en cuál iba, los puntos,
   los corazones y lo que respondió. Si sale de la página o se le
   cierra la app, al volver aparece «Seguir donde quedé».
   Las preguntas se reconocen por su contenido, así que si el temario
   cambió y alguna ya no existe, la partida guardada se descarta.
   Dura 3 días.
   ========================================================= */
(function () {
  var PRE = 'mc_partida:', DIAS = 3;
  function hash(s) {
    var a = 5381, b = 52711;
    for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); a = (Math.imul(a, 33) ^ c) >>> 0; b = (Math.imul(b, 31) + c) >>> 0; }
    return a.toString(36) + b.toString(36) + s.length.toString(36);
  }
  // Mismo contenido = misma clave, aunque las alternativas estén mezcladas
  function clave(q) {
    if (!q) return '';
    var o = (q.options || []).map(function (x) { return String(x && x.text || ''); }).sort();
    return hash(String(q.text || '') + '\u0001' + o.join('\u0001') + '\u0001' + String(q.graphic || '') + '\u0001' + String(q.topic || ''));
  }
  function borrar(id) { try { localStorage.removeItem(PRE + id); } catch (e) {} }
  function guardar(id, preguntas, estado) {
    try {
      localStorage.setItem(PRE + id, JSON.stringify({
        t: Date.now(),
        q: (preguntas || []).map(function (q) { return [clave(q), q && q._orden ? q._orden : 0]; }),
        e: estado
      }));
    } catch (e) {}
  }
  function leer(id) {
    try {
      var s = JSON.parse(localStorage.getItem(PRE + id) || 'null');
      if (!s || !Array.isArray(s.q) || !s.q.length || !s.e || Date.now() - (s.t || 0) > DIAS * 864e5) { borrar(id); return null; }
      return s;
    } catch (e) { return null; }
  }
  function tema(q) { return String(q && (q._tit || q.topic) || ''); }
  // Rearma la partida con el temario de HOY:
  //  · las que ya respondió quedan igual (mismo orden de alternativas y su respuesta);
  //    si alguna se borró del temario, se quita;
  //  · lo que falta sale de «nuevo» (la ronda recién mezclada): así entran los temas
  //    nuevos que se subieron y sigue todo mezclado.
  //  · porTema (Fijas: 1 por tema): no repite un tema que ya respondió.
  // Devuelve { preguntas, respuestas, current } o null si no queda nada que seguir.
  function armar(pool, s, nuevo, porTema) {
    var m = {};
    (pool || []).forEach(function (q) { if (q) m[clave(q)] = q; });
    (nuevo || []).forEach(function (q) { if (q && !m[clave(q)]) m[clave(q)] = q; });
    var resp = s.e.answers || [], preg = [], res = [], K = {}, T = {}, ultima = -1;
    for (var i = 0; i < s.q.length; i++) {
      var a = resp[i];
      if (a === null || a === undefined) continue;
      var q = m[s.q[i][0]], o = s.q[i][1];
      if (!q) continue;
      if (o) {
        if (!window.MCPregunta || !Array.isArray(q.options) || o.length !== q.options.length) continue;
        q = MCPregunta.conOrden(q, o);
      }
      K[s.q[i][0]] = 1; T[tema(q)] = 1;
      if (i === (s.e.current | 0)) ultima = preg.length;
      preg.push(q); res.push(a);
    }
    if (!preg.length) return null;
    var resto = (nuevo || []).filter(function (q) { return q && !K[clave(q)] && !(porTema && T[tema(q)]); });
    var todas = preg.concat(resto);
    if (window.MCPregunta && MCPregunta.rangos) MCPregunta.rangos(todas);
    // Si se quedó viendo una ya respondida (sin pasar a la siguiente), vuelve a esa
    var cur = ultima >= 0 ? ultima : preg.length;
    return { preguntas: todas, respuestas: res, current: Math.min(cur, todas.length - 1) };
  }
  // Limpia partidas guardadas que ya vencieron
  try {
    for (var i = localStorage.length - 1; i >= 0; i--) {
      var k = localStorage.key(i);
      if (k && k.indexOf(PRE) === 0) leer(k.slice(PRE.length));
    }
  } catch (e) {}
  window.MCPartida = { guardar: guardar, leer: leer, borrar: borrar, armar: armar, clave: clave };
})();
