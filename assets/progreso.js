/* =========================================================
   Modo Cachimbo · Progreso del estudiante
   - Lo carga assets/auth.js cuando hay un alumno con sesión.
   - Las páginas de preguntas marcan de dónde sale cada pregunta
     (q._ref = 'archivo#tema#número', q._tit = nombre del tema) para
     poder volver a mostrarla en "Repasar mis falladas" (falladas.html).
   - Al terminar una práctica avisan con:
       window.MCProgreso ? MCProgreso.terminar(datos) : (window.mcProgresoPend = (window.mcProgresoPend || []).concat([datos]));
   - Se guarda en Supabase: supabase/04-progreso.sql
   ========================================================= */
(function () {
  function huella(q) { return String((q && q.text) || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 30); }

  if (window.MCProgreso || !window.MCAuth || !MCAuth.usuario) return;

  function rpc(nombre, args) {
    return MCAuth.listo.then(function (c) { return c.rpc(nombre, args || {}); }).then(function (r) {
      if (r.error) throw r.error;
      return r.data;
    });
  }

  // datos = { tipo, carpeta, anio, tema, titulo, preguntas: [...], respuestas: [índices] }
  function armar(d) {
    var correctas = 0, total = 0, falladas = [], acertadas = [];
    (d.preguntas || []).forEach(function (q, i) {
      var r = (d.respuestas || [])[i];
      if (r === undefined || r === null || !q) return;
      total++;
      if (r === q.correct) { correctas++; if (q._ref) acertadas.push(q._ref); }
      else if (q._ref) falladas.push({ ref: q._ref, huella: huella(q), carpeta: d.carpeta || '', titulo: q._tit || d.titulo || '' });
    });
    var clave = d.clave || [d.tipo, d.carpeta, d.anio, d.tema || 'todos'].join('|');
    return { clave: clave, tipo: d.tipo, carpeta: d.carpeta, anio: d.anio, tema: d.tema || null, titulo: d.titulo,
             correctas: correctas, total: total, falladas: falladas.slice(0, 100), acertadas: acertadas.slice(0, 500) };
  }

  function terminar(d) {
    var p = armar(d);
    if (!p.total || !MCAuth.usuario()) return Promise.resolve(null);
    return rpc('guardar_practica', { p: p }).then(function () { return p; }, function () { return null; });
  }

  // Lo que se ve en "Mi progreso"
  function cargar() {
    var u = MCAuth.usuario();
    if (!u) return Promise.resolve({ practicas: [], falladas: [] });
    return MCAuth.listo.then(function (c) {
      return Promise.all([
        c.from('progreso').select('clave,tipo,carpeta,anio,tema,titulo,intentos,mejor,ultimo,correctas,total,actualizado').order('actualizado', { ascending: false }),
        c.from('falladas').select('ref,huella,carpeta,titulo,veces,ultima').order('ultima', { ascending: false }).limit(300)
      ]);
    }).then(function (rs) {
      if (rs[0].error) throw rs[0].error;
      return { practicas: rs[0].data || [], falladas: (rs[1] && rs[1].data) || [] };
    });
  }

  // Errores de hoy: las falladas desde las 00:00 de Perú (UTC-5, sin horario de verano)
  function inicioHoy() {
    var h = 5 * 3600000, d = new Date(Date.now() - h);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) + h);
  }
  function deHoy(lista) {
    var t = inicioHoy().getTime();
    return (lista || []).filter(function (f) { return f.ultima && new Date(f.ultima).getTime() >= t; });
  }
  function errores() {
    var u = MCAuth.usuario();
    if (!u) return Promise.resolve([]);
    return MCAuth.listo.then(function (c) {
      return c.from('falladas').select('ref,huella,carpeta,titulo,veces,ultima').gte('ultima', inicioHoy().toISOString()).order('ultima', { ascending: false }).limit(300);
    }).then(function (r) { if (r.error) throw r.error; return r.data || []; });
  }
  // Repaso de hoy (assets/repaso-dia.js y falladas.html?dia=1): los 3 temas con más falladas
  // y hasta 10 de sus preguntas. Con la misma lista sale lo mismo todo el día.
  function repasoDia(lista, max) {
    max = max || 10;
    var g = {}, orden = [];
    (lista || []).forEach(function (f) {
      var k = (f.carpeta || '') + '|' + (f.titulo || '');
      if (!g[k]) { g[k] = { carpeta: f.carpeta || '', titulo: f.titulo || '', falladas: [], peso: 0 }; orden.push(k); }
      g[k].falladas.push(f); g[k].peso += 1 + (f.veces || 1);
    });
    var temas = orden.map(function (k) { return g[k]; }).sort(function (a, b) { return b.peso - a.peso; }).slice(0, 3);
    // Mezcla fija del día: misma semilla de 00:00 a 23:59 (hora de Perú)
    var semilla = Math.floor(inicioHoy().getTime() / 86400000);
    function azar() { semilla = (semilla * 9301 + 49297) % 233280; return semilla / 233280; }
    temas.forEach(function (t) {
      t.falladas.sort(function (a, b) { return (b.veces || 1) - (a.veces || 1) || azar() - .5; });
      t.n = t.falladas.length;
    });
    var refs = [], i = 0;
    while (refs.length < max && temas.some(function (t) { return t.falladas[i]; })) {
      temas.forEach(function (t) { if (t.falladas[i] && refs.length < max) refs.push(t.falladas[i].ref); });
      i++;
    }
    return { temas: temas.map(function (t) { return { carpeta: t.carpeta, titulo: t.titulo, n: t.n }; }), refs: refs };
  }
  // De dónde salió la pregunta, según su archivo
  function origen(ref) {
    var a = String(ref || '').split('#')[0];
    if (/\/seminarios\//.test(a)) return 'Seminario';
    if (/\/banqueo\//.test(a)) return 'Banqueo';
    if (/-fijas\.json$/.test(a)) return 'Fijas';
    if (/\/libros\//.test(a)) return 'Práctica';
    return 'Examen';
  }

  // Avisar a quien muestre el número de errores (assets/errores.js, Mi perfil)
  var terminarBase = terminar;
  terminar = function (d) {
    return terminarBase(d).then(function (p) {
      try { document.dispatchEvent(new CustomEvent('mc:errores')); } catch (e) {}
      return p;
    });
  };

  window.MCProgreso = { terminar: terminar, cargar: cargar, armar: armar, huella: huella,
                        inicioHoy: inicioHoy, deHoy: deHoy, errores: errores, origen: origen, repasoDia: repasoDia };

  // Prácticas que terminaron antes de que cargara este archivo
  var pend = window.mcProgresoPend || [];
  window.mcProgresoPend = [];
  pend.forEach(terminar);
})();
