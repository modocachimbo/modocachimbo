/* =========================================================
   Modo Cachimbo · Arcade en beta (supabase/80-arcade-beta.sql)
   Solo admin + influencers ven el Arcade mientras está en prueba.
   - Pone la clase "arcade-si" en <html> si tienes acceso: el CSS de cada
     página muestra u oculta los botones con eso.
   - La respuesta se guarda 6 horas en el teléfono (casi no gasta consultas).
   - En arcade.html, sin acceso, se muestra un aviso y no se puede jugar.
   ========================================================= */
(function () {
  var K = 'mc_arcade_ok', CADA = 6 * 3600000, raiz = document.documentElement;
  function leer() { try { return JSON.parse(localStorage.getItem(K) || 'null'); } catch (e) { return null; } }
  function guardar(v) { try { localStorage.setItem(K, JSON.stringify(v)); } catch (e) {} }
  function poner(ok) { raiz.classList.toggle('arcade-si', !!ok); raiz.classList.toggle('arcade-no', !ok); document.dispatchEvent(new CustomEvent('mc-arcade', { detail: !!ok })); }

  // Al instante con lo guardado (sin parpadeo); luego se confirma con el servidor
  var g = leer();
  if (g) poner(g.ok);

  function revisar() {
    if (!window.MCAuth) { if (!g) poner(false); return; }
    MCAuth.listo.then(function (c) {
      var u = MCAuth.usuario();
      if (!u) { poner(false); return; }
      if (g && g.u === u.id && Date.now() - g.t < CADA) { poner(g.ok); return; }
      return c.rpc('arcade_acceso').then(function (r) {
        var ok = !r.error && r.data === true;
        g = { u: u.id, ok: ok, t: Date.now() }; guardar(g); poner(ok);
      });
    }).catch(function () { if (!g) poner(false); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', revisar); else revisar();
  if (window.MCAuth && MCAuth.alCambiar) try { MCAuth.alCambiar(function (u) { if (!u || !g || g.u !== u.id) { g = null; try { localStorage.removeItem(K); } catch (e) {} } revisar(); }); } catch (e) {}
})();
