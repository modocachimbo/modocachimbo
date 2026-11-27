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
  function borrar(id) {
    try { localStorage.removeItem(PRE + id); localStorage.setItem(BORRADA + id, String(Date.now())); } catch (e) {}
    delete sucias[id];
    nube('partida_borrar', { p_pagina: id });
  }
  function guardar(id, preguntas, estado) {
    try {
      localStorage.setItem(PRE + id, JSON.stringify({
        t: Date.now(),
        q: (preguntas || []).map(function (q) { return [clave(q), q && q._orden ? q._orden : 0]; }),
        e: estado
      }));
      localStorage.removeItem(BORRADA + id);
      sucias[id] = 1;   // se sube a la cuenta al salir o al pasar a segundo plano
    } catch (e) {}
  }

  /* ---------- En la cuenta (supabase/148-partida-en-cuenta.sql) ----------
     La del teléfono se sube a la cuenta al salir de la página o al pasar la app a segundo
     plano (no en cada respuesta: pocos pedidos). Al abrir una práctica se traen las de la
     cuenta y, si una es más nueva que la del teléfono (la jugó en otro dispositivo), la
     reemplaza y avisa a la página ('mc:partida-nube') para que ofrezca «Seguir donde quedé». */
  var BORRADA = 'mc_partida_x:', sucias = {};
  function conSesion() { return window.MCAuth && MCAuth.usuario && MCAuth.usuario() && MCAuth.listo; }
  function nube(fn, args) {
    if (!conSesion() || navigator.onLine === false) return Promise.resolve(null);
    return MCAuth.listo.then(function (c) { return c.rpc(fn, args); }).then(function (r) { return r && !r.error ? r.data : null; }, function () { return null; });
  }
  function subir(keep) {
    Object.keys(sucias).forEach(function (id) {
      var d; try { d = JSON.parse(localStorage.getItem(PRE + id) || 'null'); } catch (e) {}
      if (!d) { delete sucias[id]; return; }
      var CFG = window.MC_CONFIG || {}, tk = window.MCAuth && MCAuth.token && MCAuth.token();
      if (keep) {
        // La página se está cerrando: fetch con keepalive (sigue aunque la página ya no exista)
        if (!tk || !CFG.SUPABASE_URL || navigator.onLine === false) return;
        try {
          fetch(CFG.SUPABASE_URL + '/rest/v1/rpc/partida_guardar', {
            method: 'POST', keepalive: true,
            headers: { apikey: CFG.SUPABASE_KEY, Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' },
            body: JSON.stringify({ p_pagina: id, p_datos: d })
          });
          delete sucias[id];
        } catch (e) {}
      } else {
        nube('partida_guardar', { p_pagina: id, p_datos: d }).then(function (r) { if (r) delete sucias[id]; });
      }
    });
  }
  addEventListener('pagehide', function () { subir(true); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') subir(false); });
  // Al abrir: trae las de la cuenta
  function traer() {
    nube('partida_mias', {}).then(function (lista) {
      (Array.isArray(lista) ? lista : []).forEach(function (x) {
        var id = x && x.pagina, d = x && x.datos;
        if (!id || !d || !Array.isArray(d.q) || !d.e) return;
        var loc = null, bor = 0;
        try { loc = JSON.parse(localStorage.getItem(PRE + id) || 'null'); bor = +localStorage.getItem(BORRADA + id) || 0; } catch (e) {}
        if ((+d.t || 0) <= bor) return;                       // ya la terminó o borró en este teléfono
        if (loc && (+loc.t || 0) >= (+d.t || 0)) return;       // la del teléfono es igual o más nueva
        if (Date.now() - (+d.t || 0) > DIAS * 864e5) return;
        try { localStorage.setItem(PRE + id, JSON.stringify({ t: +d.t, q: d.q, e: d.e })); } catch (e) { return; }
        document.dispatchEvent(new CustomEvent('mc:partida-nube', { detail: id }));
      });
    }, function () {});
  }
  function leer(id) {
    try {
      var s = JSON.parse(localStorage.getItem(PRE + id) || 'null');
      if (!s || !Array.isArray(s.q) || !s.q.length || !s.e || Date.now() - (s.t || 0) > DIAS * 864e5) { try { localStorage.removeItem(PRE + id); } catch (e) {} return null; }
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
  window.MCPartida = { guardar: guardar, leer: leer, borrar: borrar, armar: armar, clave: clave, subir: subir };
  // auth.js se carga después de este archivo: se espera a que haya alumno con sesión (una vez)
  var traida = false;
  function intentar(u) { if (traida || !u) return; traida = true; traer(); }
  function enganchar() {
    if (!window.MCAuth) return;
    if (MCAuth.alCambiar) MCAuth.alCambiar(intentar);
    if (MCAuth.usuario) intentar(MCAuth.usuario());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enganchar); else enganchar();
})();
