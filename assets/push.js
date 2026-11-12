/* =========================================================
   Modo Cachimbo · Notificaciones push
   - En el inicio, a quien entró con Google y aún no decidió, le sale
     una tarjeta abajo: «Activar» o «Ahora no» (vuelve a salir en 7 días).
   - Al activar: pide permiso, se suscribe con la llave pública de la
     Edge Function «enviar-push» y guarda el equipo en Supabase
     (supabase/92-notificaciones.sql · push_guardar).
   - Si ya dio permiso, renueva el equipo una vez al día.
   - window.MCPush.activar() / .estado() para otras páginas.
   El envío se hace desde el panel → Web → Notificaciones.
   ========================================================= */
(function () {
  var ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  var K_NO = 'mc_push_no', K_DIA = 'mc_push_dia';
  function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function hoy() { return new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10); }

  function b64aBytes(s) {
    var p = '='.repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/'));
    var u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u;
  }
  function equipo() {
    if (window.matchMedia && matchMedia('(display-mode: standalone)').matches) return 'app';
    return /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ? 'celular' : 'pc';
  }

  function cliente() { return window.MCAuth ? MCAuth.listo : Promise.reject(new Error('sin-auth')); }

  function claveVapid(c) {
    return c.functions.invoke('enviar-push', { body: { accion: 'clave' } }).then(function (r) {
      if (r.error || !r.data || !r.data.clave) throw new Error('sin-clave');
      return r.data.clave;
    });
  }

  // Se suscribe (o reutiliza la suscripción) y la guarda en Supabase
  function suscribir() {
    return Promise.all([cliente(), navigator.serviceWorker.ready]).then(function (a) {
      var c = a[0], reg = a[1];
      return reg.pushManager.getSubscription().then(function (sub) {
        if (sub) return sub;
        return claveVapid(c).then(function (clave) {
          return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64aBytes(clave) });
        });
      }).then(function (sub) {
        var j = sub.toJSON();
        return c.rpc('push_guardar', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_equipo: equipo() })
          .then(function (r) { if (r.error) throw r.error; guardar(K_DIA, hoy()); return true; });
      });
    });
  }

  function activar() {
    if (!ok) return Promise.resolve('no-soportado');
    return Notification.requestPermission().then(function (p) {
      if (p !== 'granted') return p;
      return suscribir().then(function () { return 'activado'; });
    });
  }

  function estado() {
    if (!ok) return 'no-soportado';
    return Notification.permission; // default · granted · denied
  }

  window.MCPush = { activar: activar, estado: estado, soportado: ok };
  if (!ok) return;

  /* ---------- Tarjeta en el inicio ---------- */
  var CAMPANA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
  function estilos() {
    if (document.getElementById('mcpush-css')) return;
    var st = document.createElement('style'); st.id = 'mcpush-css';
    st.textContent = '.mcpush{position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom));transform:translate(-50%,140%);z-index:900;width:min(440px,calc(100vw - 24px));box-sizing:border-box;display:flex;gap:12px;align-items:flex-start;padding:14px 14px 12px;border-radius:18px;background:#16122A;border:2px solid #2F284E;border-bottom-width:5px;box-shadow:0 14px 40px rgba(0,0,0,.5);color:#F2EFFF;font-family:Nunito,system-ui,sans-serif;transition:transform .35s cubic-bezier(.2,.9,.3,1.2)}'
      + '.mcpush.ver{transform:translate(-50%,0)}'
      + '.mcpush-ic{flex:0 0 42px;height:42px;border-radius:12px;background:rgba(198,224,0,.14);color:#C6E000;display:grid;place-items:center}'
      + '.mcpush-ic svg{width:24px;height:24px}'
      + '.mcpush-tx{flex:1;min-width:0}.mcpush-tx b{display:block;font-weight:900;font-size:15.5px}'
      + '.mcpush-tx p{margin:3px 0 10px;font-size:13px;line-height:1.4;color:#B9B2D6}'
      + '.mcpush-bts{display:flex;gap:8px}.mcpush-bts button{font:900 13.5px Nunito,system-ui,sans-serif;border-radius:12px;padding:9px 14px;cursor:pointer;border:0}'
      + '.mcpush-si{background:#C6E000;color:#0B0818;box-shadow:0 3px 0 #8FA800}.mcpush-no{background:transparent;color:#B9B2D6;border:2px solid #2F284E!important}';
    document.head.appendChild(st);
  }

  function tarjeta() {
    estilos();
    var t = document.createElement('div'); t.className = 'mcpush'; t.setAttribute('role', 'dialog');
    t.innerHTML = '<div class="mcpush-ic">' + CAMPANA + '</div><div class="mcpush-tx"><b>Activa las notificaciones</b>'
      + '<p>Te aviso cuando suba temas nuevos, simulacros y para que no pierdas tu racha.</p>'
      + '<div class="mcpush-bts"><button class="mcpush-si" type="button">Activar</button><button class="mcpush-no" type="button">Ahora no</button></div></div>';
    document.body.appendChild(t);
    requestAnimationFrame(function () { requestAnimationFrame(function () { t.classList.add('ver'); }); });
    function cerrar() { t.classList.remove('ver'); setTimeout(function () { t.remove(); }, 400); }
    t.querySelector('.mcpush-no').onclick = function () { guardar(K_NO, String(Date.now())); cerrar(); };
    t.querySelector('.mcpush-si').onclick = function () {
      var b = this; b.disabled = true; b.textContent = 'Activando…';
      activar().then(function (r) {
        if (r === 'activado') { t.querySelector('b').textContent = 'Listo, notificaciones activadas'; t.querySelector('p').textContent = 'Te llegarán aunque tengas la app cerrada.'; t.querySelector('.mcpush-bts').remove(); setTimeout(cerrar, 2600); }
        else { guardar(K_NO, String(Date.now())); cerrar(); }
      }, function () { b.disabled = false; b.textContent = 'Reintentar'; });
    };
  }

  function revisar() {
    if (!window.MCAuth) return;
    MCAuth.listo.then(function () {
      if (!MCAuth.usuario()) return;
      var p = Notification.permission;
      if (p === 'granted') { if (leer(K_DIA) !== hoy()) suscribir().catch(function () {}); return; }
      if (p !== 'default') return;
      var no = +leer(K_NO) || 0;
      if (Date.now() - no < 7 * 864e5) return;
      // Espera a que se cierre el anuncio flotante, si hay uno
      (function esperar(n) {
        if (document.body.classList.contains('mcan-abierto') && n < 60) return setTimeout(function () { esperar(n + 1); }, 1000);
        tarjeta();
      })(0);
    }, function () {});
  }

  if (document.querySelector('script[src*="push.js"][data-tarjeta]')) setTimeout(revisar, 5000);
  else setTimeout(function () { if (window.MCAuth) MCAuth.listo.then(function () { if (MCAuth.usuario() && Notification.permission === 'granted' && leer(K_DIA) !== hoy()) suscribir().catch(function () {}); }, function () {}); }, 4000);
})();
