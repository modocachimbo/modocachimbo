/* =========================================================
   Modo Cachimbo · Banco de Vocabulario guardado en el teléfono
   Las ~5 000 palabras pesan mucho y casi nunca cambian, así que se
   descargan una sola vez y se guardan en el teléfono. Cada vez solo se
   pregunta una "versión" (un texto corto, supabase/51-menos-trafico.sql →
   vocabulario_version) y se vuelve a descargar todo solo si cambió.
   La versión se pregunta como máximo una vez cada 30 minutos.
   - MCVocab.banco(): promesa con las filas { palabra, sin, ant, def, ej, extra }.
   - MCVocab.local(): lo guardado (o null), para abrir al instante.
   Lo usan vocabulario.html y simulacro.html.
   ========================================================= */
(function () {
  if (window.MCVocab) return;
  var K_BANCO = 'mc_voc_banco', K_VER = 'mc_voc_ver', K_VISTO = 'mc_voc_ver_visto', CADA = 30 * 60000;
  var pedido = null;

  function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function local() { try { var l = JSON.parse(leer(K_BANCO) || 'null'); return Array.isArray(l) && l.length ? l : null; } catch (e) { return null; } }

  function descargar(c, ver) {
    return c.from('vocabulario').select('palabra, sin, ant, def, ej, extra').order('orden').limit(5000).then(function (r) {
      if (!r || r.error) throw new Error((r && r.error && r.error.message) || 'error');
      var l = r.data || [];
      guardar(K_BANCO, JSON.stringify(l));
      if (ver) guardar(K_VER, ver);
      guardar(K_VISTO, String(Date.now()));
      return l;
    });
  }

  function banco() {
    if (pedido) return pedido;
    if (!window.MCAuth) return Promise.reject(new Error('sin conexión'));
    var l = local();
    // Revisado hace poco: no se pregunta nada al servidor
    if (l && leer(K_VER) && Date.now() - (+leer(K_VISTO) || 0) < CADA) return (pedido = Promise.resolve(l));
    pedido = MCAuth.listo.then(function (c) {
      return c.rpc('vocabulario_version').then(function (r) {
        // Sin el SQL 51 todavía: se descarga como antes
        if (!r || r.error || !r.data) return descargar(c, null);
        if (l && leer(K_VER) === r.data) { guardar(K_VISTO, String(Date.now())); return l; }
        return descargar(c, r.data);
      }, function () { return descargar(c, null); });
    });
    pedido.catch(function () { pedido = null; });
    return pedido;
  }

  window.MCVocab = { banco: banco, local: local };
})();
