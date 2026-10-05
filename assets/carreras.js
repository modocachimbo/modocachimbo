/* =========================================================
   Modo Cachimbo · Carreras de la UNJFSC por bloque
   Fuente: afiche "Carreras profesionales" de la UNJFSC.
   puntos = puntos por pregunta correcta en el examen según el
   bloque (Comunicación, Matemática, Ciencia y Tecnología,
   Ciencias Sociales). Lo usará también el simulacro.
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

  window.MCCarreras = { bloques: BLOQUES, bloqueDe: bloqueDe, oficial: oficial };
})();
