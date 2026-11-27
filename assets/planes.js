/* =========================================================
   Modo Cachimbo · Planes y precios (página precios.html)
   Lo edita el admin en Panel → Web → Planes y precios, y se guarda en
   Supabase (tabla ajustes, clave 'planes'). Si nunca se guardó, o no hay
   internet, se usa el ejemplo de abajo (BASE).
   Cada plan: { id, rango (nombre grande: Bronce/Amatista/Leyenda), nombre, sub, mes, ciclo, si: [...], no: [...] }
   tabla: [[texto, modo, otro]]  → true = Sí, false = No, texto = detalle
   ========================================================= */
(function () {
  if (window.MCPlanes) return;
  var BASE = {
    // Tienda de descargas (descargas.html): 'vip' = solo VIP Total (TODO-VIP), 'todos' o 'apagado'
    tienda: { modo: 'vip' },
    preventa: { activa: true, ciclo: '2027-I', hasta: '30/11', cupos: 100, precio: 39.90 },
    planes: [
      { id: 'gratis', rango: 'Bronce', nombre: 'Gratis', sub: 'Para conocer la app y repasar lo del ciclo pasado.', mes: 0, ciclo: 0,
        si: ['Leer los Libros y practicar ciclos pasados', 'Exámenes pasados y Temas fijos', 'Ranking, racha, amigos y clanes', 'Laboratorio completo y test vocacional'],
        no: ['Material del ciclo actual', 'Simulacro y duelos', 'Descargas PDF (paquete aparte)'] },
      { id: 'area', rango: 'Amatista', nombre: 'Un área', sub: 'Refuerza solo el área que más te cuesta.', mes: 12.90, ciclo: 34.90,
        si: ['Todo lo gratis', 'Material nuevo de los cursos del área', 'Repaso, Fijas y Flashcards del área', 'Búho tutor en sus preguntas (beta)'],
        no: ['Simulacro y duelos', 'Descargas PDF (paquete aparte)'] },
      { id: 'total', rango: 'Leyenda', nombre: 'Total', sub: 'Las 4 áreas y todo lo que tiene Modo Cachimbo.', mes: 19.90, ciclo: 49.90,
        si: ['Las 4 áreas con todo el material nuevo', 'Repaso, Fijas, Flashcards y Banqueo', 'Simulacro de 80 preguntas con puntaje por bloque', 'Duelos con amigos', 'Seminarios, Vocabulario y Biblioteca', 'Descargas PDF y Descargas sin internet'],
        no: [] }
    ],
    // Extras que se compran aparte en Tienda → Accesos (solo web). producto: lo que abre (assets/acceso.js)
    extras: [
      { id: 'descarga', nombre: 'Descargas PDF', sub: 'Descarga tus temas, Fijas y simulacros en PDF, con claves y ficha óptica.', mes: 5.90, ciclo: 14.90, activa: true }
    ],
    // Descuento para todo lo de Tienda → Accesos (menos la preventa, que ya tiene su precio)
    descuento: { activa: false, pct: 10, texto: 'Oferta por tiempo limitado' },
    // Ciclos que se cobran y ciclos que se descargan (assets/acceso.js · cicloAnterior / cicloDescarga)
    ciclos: { modo: 'auto', cobrados: [], descarga: { modo: 'auto', lista: [] } },
    amigos: { activa: true, titulo: 'Trae 2 amigos y te regalamos 1 mes', texto: 'Cuando 2 amigos que agregaste en Modo Cachimbo activen un plan, tu acceso suma 30 días más.' },
    // Qué incluye cada plan (tabla de abajo). Cada fila: [texto, Bronce, Amatista, Leyenda, 'beta'?]
    // true = sí · false = no · texto = sí, con condición
    detalle: {
      activa: true,
      titulo: 'Qué incluye cada plan',
      sub: 'Lo de ciclos pasados es gratis para todos. Solo se paga el material del ciclo actual.',
      grupos: [
        { nombre: 'Estudiar', filas: [
          ['Leer los Libros', true, true, true],
          ['Practicar el material de ciclos pasados', true, true, true],
          ['Exámenes de admisión pasados', true, true, true],
          ['Temas fijos de admisión', true, true, true],
          ['Material del ciclo actual', false, 'Su área', 'Las 4 áreas'],
          ['Repaso, Fijas y Flashcards', 'Ciclos pasados', 'Su área', 'Las 4 áreas'],
          ['Búho tutor: resolución paso a paso', 'Ciclos pasados', 'Su área', 'Las 4 áreas', 'beta'],
          ['Seminarios y Banqueo', false, false, true],
          ['Vocabulario', false, false, true],
          ['Biblioteca universitaria', false, false, true],
          ['Simulacro de 80 preguntas con puntaje por bloque', false, false, true]
        ] },
        { nombre: 'Competir', filas: [
          ['Ranking y Top de la semana', true, true, true],
          ['Racha, XP y Mi colección', true, true, true],
          ['Amigos y Clanes', true, true, true],
          ['Duelos con amigos', false, false, true]
        ] },
        { nombre: 'Herramientas', filas: [
          ['Laboratorio: todos los simuladores', true, true, true],
          ['Test vocacional', true, true, true],
          ['Descargas sin internet', false, false, true],
          ['Descargas PDF', 'Paquete aparte', 'Paquete aparte', true]
        ] }
      ]
    },
    comparar: {
      activa: true,
      titulo: '¿Por qué no un banco en Quizizz?',
      sub: 'Quizizz sirve para jugar preguntas. Modo Cachimbo es una academia completa para la UNJFSC.',
      otro: 'Banco en Quizizz',
      nota: 'Comparamos con un banco de preguntas armado en Quizizz y vendido a S/ 30 por 3 meses. Quizizz es una marca de sus dueños; no tenemos relación con ellos.',
      tabla: [
        ['Preguntas del ciclo UNJFSC con su clave', true, true],
        ['Resolución explicada paso a paso (Búho tutor)', true, 'Depende de quien lo arma'],
        ['Simulacro con puntaje real por bloque y carrera', true, false],
        ['Repaso de tus preguntas falladas', true, false],
        ['Libros y exámenes pasados por curso', true, false],
        ['Ranking semanal con todos los postulantes', true, 'Solo dentro de cada juego'],
        ['Racha, duelos con amigos y Arcade', true, false],
        ['Descarga del material en PDF', true, false],
        ['Material del ciclo pasado gratis', true, false],
        ['Precio por 3 meses', 'S/ 49.90', 'S/ 30']
      ]
    }
  };
  var CLAVE = 'mc_planes';

  function copia(o) { return JSON.parse(JSON.stringify(o)); }
  // Junta lo guardado con el ejemplo: lo que falte se toma del ejemplo
  function mezclar(v) {
    var b = copia(BASE);
    if (!v || typeof v !== 'object') return b;
    if (v.preventa) b.preventa = Object.assign(b.preventa, v.preventa);
    if (v.ciclos) { b.ciclos = Object.assign(b.ciclos, v.ciclos); b.ciclos.descarga = Object.assign({ modo: 'auto', lista: [] }, v.ciclos.descarga || {}); }
    if (v.amigos) b.amigos = Object.assign(b.amigos, v.amigos);
    if (v.detalle) b.detalle = Object.assign(b.detalle, v.detalle);
    if (v.comparar) b.comparar = Object.assign(b.comparar, v.comparar);
    if (v.tienda) b.tienda = Object.assign(b.tienda, v.tienda);
    if (v.descuento) b.descuento = Object.assign(b.descuento, v.descuento);
    if (Array.isArray(v.extras)) b.extras = b.extras.map(function (p) {
      var g = v.extras.filter(function (x) { return x && x.id === p.id; })[0];
      return g ? Object.assign(p, g) : p;
    });
    if (Array.isArray(v.planes)) b.planes = b.planes.map(function (p) {
      var g = v.planes.filter(function (x) { return x && x.id === p.id; })[0];
      return g ? Object.assign(p, g) : p;
    });
    return b;
  }

  // Lo guardado en Supabase (con lo último guardado en el equipo si tarda o falla)
  function cargar() {
    var guardado = null; try { guardado = JSON.parse(localStorage.getItem(CLAVE) || 'null'); } catch (e) {}
    var red = !window.MCAuth ? Promise.resolve(null) : MCAuth.listo
      .then(function (c) { return c.from('ajustes').select('valor').eq('clave', 'planes').maybeSingle(); })
      .then(function (r) {
        if (!r || r.error) return null;
        var v = (r.data && r.data.valor) || {};
        try { localStorage.setItem(CLAVE, JSON.stringify(v)); } catch (e) {}
        return v;
      }, function () { return null; });
    var espera = new Promise(function (res) { setTimeout(function () { res(null); }, guardado ? 1500 : 4000); });
    return Promise.race([red, espera]).then(function (v) { return mezclar(v || guardado); });
  }

  // Precio que se cobra (igual que supabase/146-yape-planes.sql · yape_plan_precio)
  // → { monto, antes (sin descuento, o null), preventa: bool }
  function precio(cfg, id, periodo) {
    var p = (cfg.planes || []).concat(cfg.extras || []).filter(function (x) { return x.id === id; })[0];
    if (!p) return null;
    var m = +p[periodo] || 0, pv = cfg.preventa || {}, d = cfg.descuento || {};
    if (id === 'total' && periodo === 'ciclo' && pv.activa && +pv.precio > 0) return { monto: +pv.precio, antes: m > +pv.precio ? m : null, preventa: true };
    if (d.activa && +d.pct > 0 && +d.pct < 91 && m > 0) return { monto: Math.round(m * (100 - +d.pct)) / 100, antes: m, preventa: false };
    return { monto: m, antes: null, preventa: false };
  }

  window.MCPlanes = { base: function () { return copia(BASE); }, mezclar: mezclar, cargar: cargar, precio: precio };
})();
