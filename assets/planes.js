/* =========================================================
   Modo Cachimbo · Planes y precios (página precios.html)
   Lo edita el admin en Panel → Web → Planes y precios, y se guarda en
   Supabase (tabla ajustes, clave 'planes'). Si nunca se guardó, o no hay
   internet, se usa el ejemplo de abajo (BASE).
   Cada plan: { id, nombre, sub, mes, ciclo, si: [...], no: [...] }
   tabla: [[texto, modo, otro]]  → true = Sí, false = No, texto = detalle
   ========================================================= */
(function () {
  if (window.MCPlanes) return;
  var BASE = {
    preventa: { activa: true, ciclo: '2027-I', hasta: '30/11', cupos: 100, precio: 39.90 },
    planes: [
      { id: 'gratis', nombre: 'Gratis', sub: 'Para conocer la app y repasar lo del ciclo pasado.', mes: 0, ciclo: 0,
        si: ['Libros y exámenes pasados', 'Practicar el material de ciclos anteriores', 'Racha, amigos y test vocacional'],
        no: ['Material del ciclo nuevo', 'Repaso, Fijas y Simulacro', 'Descargas PDF'] },
      { id: 'area', nombre: 'Un área', sub: 'Refuerza solo el área que más te cuesta.', mes: 12.90, ciclo: 34.90,
        si: ['Todo lo gratis', 'Material nuevo de los cursos del área', 'Repaso, Fijas y Flashcards del área', 'Búho tutor en sus preguntas'],
        no: ['Simulacro y duelos', 'Descargas PDF'] },
      { id: 'total', nombre: 'Total', sub: 'Las 4 áreas y todo lo que tiene Modo Cachimbo.', mes: 19.90, ciclo: 49.90,
        si: ['Las 4 áreas con todo el material nuevo', 'Repaso, Fijas, Flashcards y Banqueo', 'Simulacro de 80 preguntas con puntaje por bloque', 'Duelos y Top de la semana', 'Seminarios, Vocabulario y Biblioteca', 'Descarga en PDF del material nuevo'],
        no: [] }
    ],
    // Ciclos que se cobran y ciclos que se descargan (assets/acceso.js · cicloAnterior / cicloDescarga)
    ciclos: { modo: 'auto', cobrados: [], descarga: { modo: 'auto', lista: [] } },
    amigos: { activa: true, titulo: 'Trae 2 amigos y te regalamos 1 mes', texto: 'Cuando 2 amigos que agregaste en Modo Cachimbo activen un plan, tu acceso suma 30 días más.' },
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
    if (v.comparar) b.comparar = Object.assign(b.comparar, v.comparar);
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

  window.MCPlanes = { base: function () { return copia(BASE); }, mezclar: mezclar, cargar: cargar };
})();
