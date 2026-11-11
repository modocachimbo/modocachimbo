/* =========================================================
   Modo Cachimbo · Clanes: escudos dibujados en código y llamadas
   (lo usan clanes.html y el inicio; SQL en supabase/88-clanes.sql)
   ========================================================= */
(function () {
  if (window.MCClanes) return;

  var FORMAS = {
    punta: 'M50 4 92 16v38c0 26-18 44-42 54C26 98 8 80 8 54V16z',
    redondo: 'M50 4c18 0 32 4 42 10v40c0 28-20 46-42 54C28 100 8 82 8 54V14C18 8 32 4 50 4z',
    corona: 'M8 22 22 6l14 10L50 2l14 14L78 6l14 16v32c0 26-18 44-42 54C26 98 8 80 8 54z',
    alas: 'M50 8 80 18v34c0 24-14 40-30 50C34 92 20 76 20 52V18z'
  };
  var L = 'stroke="rgba(0,0,0,.35)" stroke-width="2" stroke-linejoin="round"';
  var SIMB = {
    rayo: '<path d="M56 26 34 60h14l-6 26 24-38H52z" fill="#fff" ' + L + '/>',
    libro: '<path d="M28 36q11-5 22 1 11-6 22-1v40q-11-5-22 1-11-6-22-1z" fill="#fff" ' + L + '/><path d="M50 37v40" stroke="rgba(0,0,0,.35)" stroke-width="2"/>',
    buho: '<path d="M30 40l8-10 12 6 12-6 8 10v18c0 14-9 24-20 24S30 72 30 58z" fill="#fff" ' + L + '/><circle cx="42" cy="50" r="6" fill="#222"/><circle cx="58" cy="50" r="6" fill="#222"/><circle cx="43.5" cy="48.5" r="2" fill="#fff"/><circle cx="59.5" cy="48.5" r="2" fill="#fff"/><path d="M46 60l4 5 4-5z" fill="#FF9600"/>',
    llama: '<path d="M50 24c3 10 18 16 18 34a18 18 0 0 1-36 0c0-9 6-15 9-18 0 6 3 9 6 9 0-9-3-17 3-25z" fill="#fff" ' + L + '/>',
    estrella: '<path d="M50 26l7 15 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2z" fill="#fff" ' + L + '/>',
    montana: '<path d="M24 76 42 44l8 12 8-18 18 38z" fill="#fff" ' + L + '/>',
    atomo: '<g fill="none" stroke="#fff" stroke-width="4"><ellipse cx="50" cy="54" rx="22" ry="9"/><ellipse cx="50" cy="54" rx="22" ry="9" transform="rotate(60 50 54)"/><ellipse cx="50" cy="54" rx="22" ry="9" transform="rotate(-60 50 54)"/></g><circle cx="50" cy="54" r="5" fill="#fff"/>'
  };
  var COLORES = ['#C6E000', '#FF9600', '#1CB0F6', '#CE82FF', '#FF4B4B', '#58CC02', '#FFC800'];
  var NOMBRES_FORMA = { punta: 'Clásico', redondo: 'Redondo', corona: 'Corona', alas: 'Con alas' };

  function osc(c, f) {
    var n = parseInt(String(c || '#C6E000').slice(1), 16);
    return 'rgb(' + Math.round((n >> 16) * f) + ',' + Math.round((n >> 8 & 255) * f) + ',' + Math.round((n & 255) * f) + ')';
  }
  var uid = 0;
  // El escudo del clan: c = { forma, simbolo, color }
  function escudo(c) {
    c = c || {};
    var f = FORMAS[c.forma] ? c.forma : 'punta', col = /^#[0-9a-f]{6}$/i.test(c.color || '') ? c.color : '#C6E000', p = FORMAS[f], id = 'mcclg' + (uid++);
    var alas = f === 'alas' ? '<path d="M20 26C8 30 2 44 4 60c6-4 10-4 16-2zM80 26c12 4 18 18 16 34-6-4-10-4-16-2z" fill="' + osc(col, .75) + '" stroke="rgba(0,0,0,.4)" stroke-width="2"/>' : '';
    return '<svg viewBox="0 0 100 112" width="100%" height="100%" aria-hidden="true"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + col + '"/><stop offset="1" stop-color="' + osc(col, .55) + '"/></linearGradient></defs>' + alas +
      '<path d="' + p + '" fill="#14101f" transform="translate(0,4)" opacity=".6"/><path d="' + p + '" fill="url(#' + id + ')" stroke="' + osc(col, .4) + '" stroke-width="3"/>' +
      '<path d="' + p + '" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2" transform="translate(50 56) scale(.84) translate(-50 -56)"/><path d="M14 20 50 9l36 11v10H14z" fill="rgba(255,255,255,.18)"/>' +
      (SIMB[c.simbolo] || '') + '</svg>';
  }
  // Solo el símbolo, para el selector
  function simbolo(s, color) {
    return '<svg viewBox="18 18 64 72" aria-hidden="true">' + (SIMB[s] || '').replace(/#fff/g, color || '#C6E000').replace(/rgba\(0,0,0,\.35\)/g, osc(color || '#C6E000', .45)) + '</svg>';
  }

  function rpc(nombre, args) {
    if (!window.MCAuth) return Promise.reject(new Error('sin-auth'));
    return MCAuth.listo.then(function (c) { return c.rpc(nombre, args || {}); }).then(function (r) {
      if (r.error) throw r.error;
      return r.data;
    });
  }
  // El top se guarda 5 minutos para no pedirlo en cada vuelta al inicio
  function clave() { var u = window.MCAuth && MCAuth.usuario && MCAuth.usuario(); return u ? 'mc_clanes_top_' + u.id : ''; }
  function ranking(forzar) {
    if (!forzar) { try { var x = JSON.parse(localStorage.getItem(clave()) || 'null'); if (x && Date.now() - x.t < 5 * 60e3) return Promise.resolve(x.d); } catch (e) {} }
    return rpc('ranking_clanes').then(function (d) { d = d || { top: [] }; try { if (clave()) localStorage.setItem(clave(), JSON.stringify({ t: Date.now(), d: d })); } catch (e) {} return d; });
  }
  function olvidar() { try { if (clave()) localStorage.removeItem(clave()); } catch (e) {} }
  function sinSql(e) { return e && /clan|function .* does not exist|Could not find the function/i.test(String(e.message || e)); }

  var ERRORES = {
    ya_en_clan: 'Ya estás en un clan. Sal de él primero.',
    espera: 'Saliste de un clan hace poco. Espera 24 horas para entrar a otro.',
    no_existe: 'No hay ningún clan con ese código. Revisa las 4 letras.',
    lleno: 'Ese clan ya tiene 20 miembros, el máximo.',
    nombre_usado: 'Ya hay un clan con ese nombre. Prueba otro.',
    nombre_feo: 'Ese nombre no está permitido. Elige uno sin groserías.',
    nombre_largo: 'El nombre debe tener entre 3 y 24 letras.',
    tag_mal: 'La sigla debe tener de 2 a 5 letras o números, sin espacios.',
    no_lider: 'Solo el líder puede hacer eso.',
    max_sub: 'El clan ya tiene 2 sublíderes, el máximo.',
    no_miembro: 'Ese alumno ya no está en el clan.'
  };
  function error(e) {
    var m = String(e && (e.message || e) || '');
    for (var k in ERRORES) if (m.indexOf(k) >= 0) return ERRORES[k];
    return 'No se pudo. Revisa tu internet e intenta otra vez.';
  }

  window.MCClanes = {
    FORMAS: FORMAS, SIMB: SIMB, COLORES: COLORES, NOMBRES_FORMA: NOMBRES_FORMA,
    escudo: escudo, simbolo: simbolo, rpc: rpc, ranking: ranking, olvidar: olvidar, sinSql: sinSql, error: error
  };
})();
