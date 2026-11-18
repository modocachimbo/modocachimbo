/* =========================================================
   Modo Cachimbo · Arcade en beta (supabase/80-arcade-beta.sql)
   Solo admin + influencers ven el Arcade mientras está en prueba.
   - Pone la clase "arcade-si" en <html> si tienes acceso: el CSS de cada
     página muestra u oculta los botones con eso.
   - La respuesta se guarda 6 horas en el teléfono (casi no gasta consultas);
     un «no» solo 10 minutos, y si la consulta falla no se guarda nada.
   - En arcade.html, sin acceso, se muestra un aviso y no se puede jugar.
   ========================================================= */
(function () {
  try { localStorage.removeItem('mc_arcade_ok'); } catch (e) {}
  var K = 'mc_arcade_ok2', CADA = 6 * 3600000, CADA_NO = 10 * 60000, raiz = document.documentElement;
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
      if (g && g.u === u.id && Date.now() - g.t < (g.ok ? CADA : CADA_NO)) { poner(g.ok); return; }
      return c.rpc('arcade_acceso').then(function (r) {
        if (r.error) { if (!g) poner(false); return; }   // falló la consulta: se vuelve a intentar la próxima vez
        var ok = r.data === true;
        g = { u: u.id, ok: ok, t: Date.now() }; guardar(g); poner(ok);
      });
    }).catch(function () { if (!g) poner(false); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', revisar); else revisar();
  if (window.MCAuth && MCAuth.alCambiar) try { MCAuth.alCambiar(function (u) { if (!u || !g || g.u !== u.id) { g = null; try { localStorage.removeItem(K); } catch (e) {} } revisar(); }); } catch (e) {}
})();
