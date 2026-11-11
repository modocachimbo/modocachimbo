/* =========================================================
   Modo Cachimbo · Cuenta suspendida
   Si el administrador suspendió la cuenta (Panel → Alumnos → Ficha →
   Suspender), la web se cierra con un aviso hasta la fecha que puso.
   Datos: supabase/86-ficha-alumno.sql (mi_suspension). Lo carga auth.js.
   ========================================================= */
(function () {
  if (window.MCSuspension || !window.MCAuth || !MCAuth.usuario()) return;
  window.MCSuspension = true;
  var K = 'mc_suspension';
  function leer() { try { var v = JSON.parse(sessionStorage.getItem(K) || 'null'); return v && v.u === MCAuth.usuario().id && Date.now() - v.t < 5 * 60e3 ? v : null; } catch (e) { return null; } }
  function poner(d) { try { sessionStorage.setItem(K, JSON.stringify({ t: Date.now(), u: MCAuth.usuario().id, d: d })); } catch (e) {} }
  function fecha(s) { try { return new Date(s).toLocaleString('es-PE', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }); } catch (e) { return s; } }

  function bloquear(d) {
    if (document.getElementById('mcSusp')) return;
    var o = document.createElement('div');
    o.id = 'mcSusp';
    o.setAttribute('role', 'alertdialog');
    o.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:#0B0818;display:flex;align-items:center;justify-content:center;padding:20px;font-family:Nunito,Inter,system-ui,sans-serif;color:#EEEAF7';
    o.innerHTML = '<div style="max-width:420px;width:100%;text-align:center;background:#151127;border:2px solid #2A2346;border-bottom-width:6px;border-radius:24px;padding:34px 26px">' +
      '<div style="width:78px;height:78px;margin:0 auto 18px;border-radius:22px;display:grid;place-items:center;background:rgba(255,75,75,.12);border:1px solid rgba(255,75,75,.35);color:#FF6B6B">' +
      '<svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="10.5" width="16" height="11" rx="3"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/><circle cx="12" cy="16" r="1.4" fill="currentColor"/></svg></div>' +
      '<div style="font:900 12px Nunito,sans-serif;letter-spacing:3px;text-transform:uppercase;color:#FF6B6B;margin-bottom:8px">Cuenta suspendida</div>' +
      '<h2 style="font:900 24px/1.2 Nunito,sans-serif;margin:0 0 12px">Tu cuenta está pausada</h2>' +
      '<p style="color:#A99FC8;font-size:15px;line-height:1.6;margin:0 0 22px">' +
      (d.hasta ? 'Podrás volver a entrar el <b style="color:#EEEAF7">' + fecha(d.hasta) + '</b>.' : 'El administrador pausó tu cuenta.') +
      ' Si crees que es un error, escríbele al administrador de Modo Cachimbo.</p>' +
      '<button type="button" id="mcSuspSalir" style="width:100%;border:0;border-radius:14px;padding:14px;background:#C6E000;color:#151A03;font:900 15px Nunito,sans-serif;text-transform:uppercase;letter-spacing:.5px;box-shadow:0 4px 0 #8fa300;cursor:pointer">Usar otra cuenta</button></div>';
    document.body.appendChild(o);
    document.documentElement.style.overflow = 'hidden';
    document.getElementById('mcSuspSalir').addEventListener('click', function () {
      try { sessionStorage.removeItem(K); } catch (e) {}
      Promise.resolve(MCAuth.salir()).then(function () { location.href = MCAuth.base || '/'; });
    });
  }

  function revisar() {
    var g = leer();
    if (g) { if (g.d) bloquear(g.d); return; }
    MCAuth.listo.then(function (c) { return c.rpc('mi_suspension'); }).then(function (r) {
      if (r.error) return;            // sin el SQL 86 todavía: no hace nada
      poner(r.data || null);
      if (r.data) bloquear(r.data);
    }, function () {});
  }
  if (document.body) revisar(); else document.addEventListener('DOMContentLoaded', revisar);
})();
