/* =========================================================
   Modo Cachimbo · Ciclos académicos visibles
   El panel (Panel → Ciclos) guarda en Supabase, tabla ajustes, clave 'ciclos':
     { areas: { matematica: { ocultos: ['2026-III'], nombres: { '2027-I': '2027-I' } } } }
   Libros, Seminarios y Banqueo muestran solo los ciclos de su manifest que no estén
   ocultos, del más reciente al más antiguo, con el nombre que puso el panel.
   ========================================================= */
(function () {
  if (window.MCCiclos) return;
  var CLAVE = 'mc_ciclos';
  var ROM = { I: 1, II: 2, III: 3 };

  function orden(id) { var x = String(id).match(/^(\d{4})-(III|II|I)$/); return x ? +x[1] * 10 + ROM[x[2]] : 0; }
  function leer() { try { return JSON.parse(localStorage.getItem(CLAVE) || 'null'); } catch (e) { return null; } }

  // Ajustes de Supabase; si tarda o falla, se usa lo último guardado en el equipo
  var pedido = null;
  function ajustes() {
    if (pedido) return pedido;
    var guardado = leer();
    var red = !window.MCAuth ? Promise.resolve(null) : MCAuth.listo
      .then(function (c) { return c.from('ajustes').select('valor').eq('clave', 'ciclos').maybeSingle(); })
      .then(function (r) {
        if (!r || r.error) return null;
        var v = (r.data && r.data.valor) || {};
        try { localStorage.setItem(CLAVE, JSON.stringify(v)); } catch (e) {}
        return v;
      }, function () { return null; });
    var espera = new Promise(function (res) { setTimeout(function () { res(null); }, guardado ? 800 : 3000); });
    pedido = Promise.race([red, espera]).then(function (v) { return v || guardado || {}; });
    return pedido;
  }

  // Ciclos del manifest que se ven: sin los ocultos, con su nombre y del más reciente al más antiguo
  function filtrar(manifest, area) {
    area = area || document.documentElement.getAttribute('data-area') || '';
    return ajustes().then(function (cfg) {
      var a = (cfg.areas && cfg.areas[area]) || {};
      var ocultos = a.ocultos || [], nombres = a.nombres || {};
      return (manifest || []).filter(function (m) { return ocultos.indexOf(m.id) < 0; })
        .map(function (m) { var n = Object.assign({}, m); if (nombres[m.id]) n.label = nombres[m.id]; return n; })
        .sort(function (x, y) { return orden(y.id) - orden(x.id); });
    });
  }

  window.MCCiclos = { filtrar: filtrar, ajustes: ajustes, orden: orden };
})();
