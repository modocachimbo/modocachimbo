/* =========================================================
   Modo Cachimbo · Racha de estudio
   - Lo carga assets/auth.js cuando hay un alumno con sesión.
   - Las páginas de preguntas avisan cada respuesta con:
       window.MCRacha ? MCRacha.respondio() : (window.mcRachaPend = (window.mcRachaPend || 0) + 1);
   - Las reglas (10 preguntas al día, 1 descanso por semana)
     viven en Supabase: supabase/02-racha.sql
   - window.MCRacha.alCambiar(fn) avisa cada vez que cambia.
   ========================================================= */
(function () {
  if (window.MCRacha || !window.MCAuth) return;
  var CFG = window.MC_CONFIG || {};
  var ICONO = '<svg viewBox="0 0 120.29 157.64" aria-hidden="true" fill="currentColor"><path d="M120.18,101.71c-.51,10.3-2.67,20.23-7.85,29.28a52.44,52.44,0,0,1-8.71,11.41c-7.31,7.21-16.52,11.75-27.32,14-.66.14-1.31.31-2,.42a9.32,9.32,0,0,1-1.87.11.91.91,0,0,1,.16-.11,6.26,6.26,0,0,1,2.09-.88c7.59-2.72,13.9-7.07,17.82-14.3,4-7.44,3.73-15.16,1-22.94a52.09,52.09,0,0,0-6.61-12.46c-.67-1-1.08-1.25-2-.16a22.92,22.92,0,0,1-6.33,4.84c-.91.52-1.26.3-1.34-.74-.48-6.5-3.24-12.1-6.85-17.38C68.46,90,66.85,87,66.73,83.48a19.18,19.18,0,0,1,1.2-7.08c.15-.41.59-.9.22-1.28s-1,0-1.37.26c-10.56,5.32-17.41,13.75-21,24.93a61.53,61.53,0,0,0-2.43,14.83c-.15,2.18-1.72,3.07-3.76,2.21a11.55,11.55,0,0,1-4.18-3.55c-.41-.48-.64-1.16-1.43-1.45a39.73,39.73,0,0,0-1.33,7.87c-.42,5.69-.47,11.38,1.21,16.93C37,147.55,43.9,154,54.38,156.8l.08,0,1.85.47s.07.07.18.19a6.9,6.9,0,0,1-3.3-.17l-.11,0C41.33,155.6,30.62,151.75,21.41,145a61.25,61.25,0,0,1-8.48-7.57A46.86,46.86,0,0,1,.31,109.92c-1.19-10.8,1.14-21,5.33-30.86a107.65,107.65,0,0,1,12-20.72c.72-1,1.13-1,1.9-.06,3.73,4.64,8.54,7.94,13.67,10.81.54.31,1.21.9,1.29-.45C35.17,57.71,39,47.89,45,38.81a106.74,106.74,0,0,0,6.67-11.06c3.67-7.36,3.35-14.82.84-22.41A42.33,42.33,0,0,1,50.59,0h.62C77.84,11.93,92.53,33,97.8,61.16A89.26,89.26,0,0,1,99.15,72c.11,1.53.17,3.08.2,4.63.05,3.27,1.78,5.12,4.27,5a6.81,6.81,0,0,0,2.91-.87c3.73-2,6.25-5.25,8.77-8.5.43-.55.72-1.61,1.38-1.49s.66,1.25.81,2A111,111,0,0,1,120.18,101.71Z"/></svg>';

  var estado = null, pendiente = 0, enviando = false, temporizador = null;
  var oyentes = [];
  var uid = (MCAuth.usuario() || {}).id || '';
  var CLAVE = 'mc_racha_' + uid, CLAVE_PEND = 'mc_racha_pend_' + uid;

  function leer(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function guardar(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {} }

  // Lo último que se supo (para pintar sin esperar a Supabase)
  try { estado = JSON.parse(leer(CLAVE) || 'null'); } catch (e) {}
  pendiente = (parseInt(leer(CLAVE_PEND), 10) || 0) + (window.mcRachaPend || 0);
  window.mcRachaPend = 0;

  function css() {
    if (document.getElementById('mcr-css')) return;
    var st = document.createElement('style'); st.id = 'mcr-css';
    st.textContent =
      '.mcu-racha{display:inline-flex;align-items:center;gap:6px;height:44px;padding:0 14px 0 12px;border-radius:100px;border:1px solid var(--border,#232323);background:var(--surface,#0e0e0e);color:var(--text-dim,#9a9a9a);font:800 15px Sora,Inter,sans-serif;text-decoration:none;font-variant-numeric:tabular-nums}' +
      '.mcu-racha[hidden]{display:none}' +
      '.mcu-racha svg{width:15px;height:20px}' +
      '.mcu-racha.on{color:var(--accent,#C6E000);border-color:rgba(198,224,0,.3)}' +
      '.mcu-racha:hover{border-color:var(--accent,#C6E000)}' +
      '.mcr-toast{position:fixed;left:50%;bottom:calc(96px + env(safe-area-inset-bottom,0px));transform:translate(-50%,20px);opacity:0;z-index:300;display:flex;align-items:center;gap:12px;' +
      'background:#111;border:1px solid rgba(198,224,0,.45);color:#f2f2f2;border-radius:18px;padding:12px 18px 12px 14px;box-shadow:0 18px 40px rgba(0,0,0,.6),0 0 30px rgba(198,224,0,.15);' +
      'font:500 13.5px Inter,sans-serif;transition:transform .35s ease,opacity .35s ease;max-width:calc(100vw - 32px)}' +
      '.mcr-toast.show{transform:translate(-50%,0);opacity:1}' +
      '.mcr-toast svg{width:26px;height:34px;color:#C6E000;flex-shrink:0;animation:mcrLlama 1s ease-in-out infinite alternate}' +
      '.mcr-toast b{display:block;font:800 16px Sora,Inter,sans-serif;color:#C6E000}' +
      '@keyframes mcrLlama{from{transform:scale(1)}to{transform:scale(1.12)}}' +
      // Fuego encendido (meta del día cumplida): la llama se mueve y brilla
      '.mcu-racha.on svg,.sal-racha.on .num svg,.racha-dato.on b svg{transform-origin:50% 92%;animation:mcFuego 1.6s ease-in-out infinite;filter:drop-shadow(0 0 6px rgba(198,224,0,.55))}' +
      '@keyframes mcFuego{0%,100%{transform:scale(1,1) skewX(0)}20%{transform:scale(.96,1.08) skewX(-3deg)}40%{transform:scale(1.04,.95) skewX(2deg)}60%{transform:scale(.97,1.1) skewX(3deg)}80%{transform:scale(1.02,.97) skewX(-2deg)}}' +
      '@media (prefers-reduced-motion:reduce){.mcr-toast{transition:none}.mcr-toast svg,.mcu-racha.on svg,.sal-racha.on .num svg,.racha-dato.on b svg{animation:none}}' +
      '@media (max-width:520px){.mcu-racha{height:40px;padding:0 11px 0 9px;font-size:14px}}';
    document.head.appendChild(st);
  }

  function pintar() {
    css();
    var r = estado;
    Array.prototype.forEach.call(document.querySelectorAll('[data-mc-racha]'), function (el) {
      if (!r) { el.hidden = true; return; }
      el.innerHTML = ICONO + '<span>' + (r.actual || 0) + '</span>';
      el.classList.toggle('on', !!r.cumplido_hoy);
      el.title = (r.actual || 0) + (r.actual === 1 ? ' día' : ' días') + ' de racha · Hoy ' + Math.min(r.hoy || 0, r.meta || 10) + '/' + (r.meta || 10) + ' preguntas';
      el.setAttribute('aria-label', el.title);
      el.hidden = false;
    });
  }

  function cambiar(nuevo) {
    var antes = estado;
    estado = nuevo;
    guardar(CLAVE, JSON.stringify(nuevo));
    pintar();
    oyentes.forEach(function (fn) { try { fn(estado); } catch (e) {} });
    if (antes && nuevo && !antes.cumplido_hoy && nuevo.cumplido_hoy) celebrar(nuevo);
  }

  function celebrar(r) {
    css();
    var t = document.createElement('div'); t.className = 'mcr-toast'; t.setAttribute('role', 'status');
    var n = r.actual || 1;
    t.innerHTML = ICONO + '<div><b>¡Racha +1!</b><span></span></div>';
    t.querySelector('span').textContent = n === 1 ? 'Empezaste tu racha. ¡Vuelve mañana!' : n + ' días seguidos estudiando. ¡Sigue así!';
    document.body.appendChild(t);
    try { if (window.MCSonido && MCSonido.racha) MCSonido.racha(); } catch (e) {}
    requestAnimationFrame(function () { requestAnimationFrame(function () { t.classList.add('show'); }); });
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 400); }, 4200);
  }

  function rpc(nombre, args) {
    return MCAuth.listo.then(function (c) { return c.rpc(nombre, args || {}); }).then(function (r) {
      if (r.error) throw r.error;
      return r.data;
    });
  }

  function cargar() {
    if (pendiente > 0) return enviar();
    return rpc('mi_racha').then(function (r) { if (r) cambiar(r); }, function () { pintar(); });
  }

  function enviar() {
    temporizador = null;
    if (enviando || pendiente <= 0 || !MCAuth.usuario()) return Promise.resolve();
    var n = Math.min(pendiente, 50);
    pendiente -= n; guardar(CLAVE_PEND, pendiente || null);
    enviando = true;
    return rpc('sumar_preguntas', { n: n }).then(function (r) {
      enviando = false;
      if (r) cambiar(r);
      if (pendiente > 0) programar();
    }, function () {
      enviando = false;
      pendiente += n; guardar(CLAVE_PEND, pendiente);
    });
  }

  function programar() { if (!temporizador) temporizador = setTimeout(enviar, 700); }

  function respondio() {
    pendiente += 1; guardar(CLAVE_PEND, pendiente);
    // Mientras tanto, el contador de hoy se mueve al instante
    if (estado) {
      var e = {}; for (var k in estado) e[k] = estado[k];
      e.hoy = (e.hoy || 0) + 1;
      estado = e; pintar();
      oyentes.forEach(function (fn) { try { fn(estado); } catch (x) {} });
    }
    programar();
  }

  // Si cierra la página con respuestas sin enviar, se mandan igual
  window.addEventListener('pagehide', function () {
    if (pendiente <= 0 || !MCAuth.token || !MCAuth.token()) return;
    try {
      fetch(CFG.SUPABASE_URL + '/rest/v1/rpc/sumar_preguntas', {
        method: 'POST', keepalive: true,
        headers: { apikey: CFG.SUPABASE_KEY, Authorization: 'Bearer ' + MCAuth.token(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ n: Math.min(pendiente, 50) })
      });
      pendiente = 0; guardar(CLAVE_PEND, null);
    } catch (e) {}
  });

  window.MCRacha = {
    respondio: respondio,
    estado: function () { return estado; },
    pintar: pintar,
    recargar: cargar,
    alCambiar: function (fn) { oyentes.push(fn); if (estado) { try { fn(estado); } catch (e) {} } },
    icono: ICONO
  };

  pintar();
  cargar();
})();
