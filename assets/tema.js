/* =========================================================
   Modo Cachimbo · Temáticas por fechas (Halloween, …)
   - El panel elige la temática y sus fechas (supabase/25-tematicas.sql).
   - Cada página pregunta cuál toca hoy (tema_activo) y la guarda en el
     navegador (mc_tema) para pintarla al instante la próxima vez.
   - Pasada la fecha final, la web vuelve sola al diseño de siempre.
   - Vista previa: cualquier página con ?tematica=halloween (o ?tematica=ninguna
     para salir). Se recuerda en esta pestaña.
   Lo carga assets/app.js en todas las páginas, menos el panel.
   El dibujo de cada temática está aparte (assets/temas/<tema>.js) y solo se
   descarga cuando esa temática está activa.
   ========================================================= */
(function () {
  if (window.MCTema || /\/panel\//.test(location.pathname)) return;
  var CLAVE = 'mc_tema', VER = 'mc_tema_ver', AMB = 'mc_tema_amb';
  var TEMAS = { halloween: 1 };
  var BASE = (document.currentScript && document.currentScript.src || 'assets/tema.js').replace(/tema\.js(\?.*)?$/, '');
  window.MCTemas = window.MCTemas || {};
  var actual = null, quitar = null;

  function hoyLima() {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date()); }
    catch (e) { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  }
  function vigente(c) { var h = hoyLima(); return c && TEMAS[c.tema] && (!c.inicio || c.inicio <= h) && (!c.fin || c.fin >= h); }
  function leer(k, s) { try { return JSON.parse((s || localStorage).getItem(k) || 'null'); } catch (e) { return null; } }
  function guardar(k, v, s) { try { if (v == null) (s || localStorage).removeItem(k); else (s || localStorage).setItem(k, JSON.stringify(v)); } catch (e) {} }

  // Vista previa desde el panel: ?tematica=halloween · ?tematica=ninguna
  var q = /[?&]tematica=([a-z]+)/.exec(location.search);
  if (q) guardar(VER, q[1] === 'ninguna' ? null : { tema: q[1], fin: null, mensaje: null, sonidos: true }, sessionStorage);
  var vista = leer(VER, sessionStorage);

  function poner(c) {
    var t = c && TEMAS[c.tema] ? c.tema : null;
    if (t === actual) return;
    if (quitar) { quitar(); quitar = null; }
    actual = t;
    document.documentElement.setAttribute('data-tema', t || '');
    if (t) cargar(t, function (f) { if (actual === t && !quitar) quitar = f(c, { AMB: AMB, hoyLima: hoyLima }); });
  }
  function cargar(t, listo) {
    if (MCTemas[t]) return listo(MCTemas[t]);
    var s = document.createElement('script');
    s.src = BASE + 'temas/' + t + '.js';
    s.onload = function () { if (MCTemas[t]) listo(MCTemas[t]); };
    document.head.appendChild(s);
  }

  if (vista) poner(vista);
  else {
    var cache = leer(CLAVE);
    if (vigente(cache)) poner(cache);
    // Lo que diga Supabase manda: así se prende o apaga sin esperar
    var CFG = window.MC_CONFIG || {};
    if (CFG.SUPABASE_URL && window.fetch) {
      fetch(CFG.SUPABASE_URL + '/rest/v1/rpc/tema_activo', {
        method: 'POST', body: '{}',
        headers: { apikey: CFG.SUPABASE_KEY, Authorization: 'Bearer ' + CFG.SUPABASE_KEY, 'Content-Type': 'application/json' }
      }).then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); }).then(function (c) {
        c = c && TEMAS[c.tema] ? c : null;
        guardar(CLAVE, c);
        poner(vigente(c) ? c : null);
      }).catch(function () {});
    }
  }


  window.MCTema = { get actual() { return actual; } };
})();
