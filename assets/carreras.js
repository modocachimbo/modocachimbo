/* =========================================================
   Modo Cachimbo · Carreras de la UNJFSC por bloque
   Fuente: afiche "Carreras profesionales" de la UNJFSC.
   puntos = puntos por pregunta correcta en el examen según el
   bloque (Comunicación, Matemática, Ciencia y Tecnología,
   Ciencias Sociales). Lo usará también el simulacro.
   Esta lista es la de reserva: desde el panel (Contenido → Perfil
   del alumno) se puede cambiar, y se guarda en Supabase
   (supabase/05-perfil-config.sql, tabla ajustes, clave 'perfil')
   junto con las preguntas extra del perfil. MCCarreras.cargar() la trae.
   ========================================================= */
(function () {
  var BLOQUES = [
    { id: 'A', nombre: 'Ingenierías', puntos: { com: 2, mat: 4, cta: 3, ccss: 1 }, carreras: [
      'Ingeniería civil', 'Ingeniería ambiental', 'Ingeniería de sistemas', 'Ingeniería industrial',
      'Ingeniería informática', 'Ingeniería agronómica', 'Ingeniería electrónica',
      'Ingeniería en industrias alimentarias', 'Ingeniería metalúrgica', 'Ingeniería pesquera',
      'Ingeniería zootécnica', 'Ingeniería química', 'Ingeniería acuícola', 'Matemática aplicada',
      'Estadística e informática'] },
    { id: 'B', nombre: 'Ciencias de la salud', puntos: { com: 2, mat: 3, cta: 4, ccss: 1 }, carreras: [
      'Medicina humana', 'Enfermería', 'Bromatología y nutrición', 'Educación física y deportes',
      'Biología con mención en biotecnología'] },
    { id: 'C', nombre: 'Humanidades y educación', puntos: { com: 4, mat: 2, cta: 1, ccss: 3 }, carreras: [
      'Derecho y ciencias políticas', 'Trabajo social', 'Ciencias de la comunicación', 'Sociología',
      'Educación inicial y arte', 'Educación primaria y problemas del aprendizaje',
      'Biología, química y tecnología de los alimentos', 'Ciencias sociales y turismo',
      'Lengua, comunicación e idioma inglés', 'Matemática, física e informática', 'Construcciones metálicas'] },
    { id: 'D', nombre: 'Ciencias económicas', puntos: { com: 3, mat: 2, cta: 1, ccss: 4 }, carreras: [
      'Administración', 'Ciencias contables y financieras', 'Economía y finanzas',
      'Gestión en turismo y hotelería', 'Negocios internacionales'] }
  ];

  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, ''); }

  // Bloque de una carrera (acepta mayúsculas y tildes distintas), o null
  function bloqueDe(carrera) {
    var n = norm(carrera);
    if (!n) return null;
    for (var i = 0; i < BLOQUES.length; i++) {
      for (var j = 0; j < BLOQUES[i].carreras.length; j++) if (norm(BLOQUES[i].carreras[j]) === n) return BLOQUES[i];
    }
    return null;
  }

  // Nombre oficial de la lista, si la carrera escrita coincide
  function oficial(carrera) {
    var b = bloqueDe(carrera), n = norm(carrera);
    if (!b) return null;
    for (var j = 0; j < b.carreras.length; j++) if (norm(b.carreras[j]) === n) return b.carreras[j];
    return null;
  }

  // Preguntas extra del perfil: [{ id, etiqueta, tipo: texto|opciones|numero|sino, opciones, obligatoria }]
  var EXTRAS = [];
  var CACHE = 'mc_perfil_cfg';

  function valida(v) {
    return v && Array.isArray(v.bloques) && v.bloques.length && v.bloques.every(function (b) {
      return b && typeof b.id === 'string' && b.id && Array.isArray(b.carreras) && b.puntos && typeof b.puntos === 'object';
    });
  }
  // Se cambian las listas en su lugar, así MCCarreras.bloques sigue siendo la misma
  function aplicar(v) {
    if (!valida(v)) return false;
    BLOQUES.splice.apply(BLOQUES, [0, BLOQUES.length].concat(v.bloques));
    EXTRAS.splice.apply(EXTRAS, [0, EXTRAS.length].concat(Array.isArray(v.extras) ? v.extras.filter(function (x) { return x && x.id && x.etiqueta; }) : []));
    return true;
  }
  try { aplicar(JSON.parse(localStorage.getItem(CACHE))); } catch (e) { /* sin copia guardada */ }

  // Trae la versión del panel. Si falla, quedan la copia guardada o la lista de arriba.
  var cargando = null;
  function cargar() {
    if (!window.MCAuth) return Promise.resolve(window.MCCarreras);
    if (!cargando) cargando = MCAuth.listo.then(function (c) {
      return c.from('ajustes').select('valor').eq('clave', 'perfil').maybeSingle();
    }).then(function (r) {
      if (r && !r.error && r.data && aplicar(r.data.valor)) {
        try { localStorage.setItem(CACHE, JSON.stringify(r.data.valor)); } catch (e) { /* lleno o bloqueado */ }
      }
      return window.MCCarreras;
    }, function () { return window.MCCarreras; });
    return cargando;
  }

  window.MCCarreras = { bloques: BLOQUES, extras: EXTRAS, bloqueDe: bloqueDe, oficial: oficial, cargar: cargar, aplicar: aplicar, norm: norm };
})();
