/* =========================================================
   Modo Cachimbo · Rayos del Laboratorio (supabase/97-laboratorio-rayos.sql)
   - Los rayos se ganan estudiando (Arcade, racha, simulacro) y abren
     simuladores uno por uno. El código Laboratorio (laboratorio-VIP) abre todos.
   - MCRayos.estado()  → trae saldo y abiertos (y cobra lo ganado). Manda los
     niveles del Arcade guardados en el teléfono (mc_arcade.est).
   - MCRayos.abrir(sim) → gasta rayos. MCRayos.guardado() → lo último, al instante.
   - MCRayos.puede(sim, st) → ¿ya puede entrar a ese simulador?
   ========================================================= */
(function () {
  if (window.MCRayos) return;
  var K = 'mc_lab_rayos';
  function leer() { try { return JSON.parse(localStorage.getItem(K) || 'null'); } catch (e) { return null; } }
  function guardar(v) { try { localStorage.setItem(K, JSON.stringify(v)); } catch (e) {} }
  function niveles() {
    try { var a = JSON.parse(localStorage.getItem('mc_arcade') || '{}'); return a.est || {}; } catch (e) { return {}; }
  }
  function cliente() {
    if (!window.MCAuth) return Promise.resolve(null);
    return MCAuth.listo.then(function (c) { return MCAuth.usuario() ? c : null; }).catch(function () { return null; });
  }
  function llamar(fn, args) {
    return cliente().then(function (c) {
      if (!c) return null;
      return c.rpc(fn, args).then(function (r) {
        if (r.error || !r.data) return r.data && r.data.error ? r.data : null;
        if (!r.data.error) { r.data.t = Date.now(); guardar(r.data); }
        return r.data;
      });
    }).catch(function () { return null; });
  }
  var oyentes = [];
  function avisar(st) { if (st && !st.error) oyentes.forEach(function (f) { try { f(st); } catch (e) {} }); return st; }
  window.MCRayos = {
    guardado: leer,
    estado: function () { return llamar('lab_estado', { niveles: niveles() }).then(avisar); },
    abrir: function (sim) { return llamar('lab_abrir', { p_sim: sim }).then(avisar); },
    alCambiar: function (f) { oyentes.push(f); },
    puede: function (sim, st) {
      st = st || leer(); if (!st) return false;
      var p = (st.precios || {})[sim];
      return !!(st.codigo || st.equipo || (p && p.gratis) || (st.abiertos || []).indexOf(sim) >= 0);
    },
    precio: function (sim, st) { st = st || leer() || {}; var p = (st.precios || {})[sim]; return p ? p.precio : 40; },
    gratis: function (sim, st) { st = st || leer() || {}; var p = (st.precios || {})[sim]; return !!(p && p.gratis); }
  };
})();
