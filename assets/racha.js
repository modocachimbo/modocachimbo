/* =========================================================
   Modo Cachimbo · Racha de estudio
   - Lo carga assets/auth.js cuando hay un alumno con sesión.
   - Las páginas de preguntas avisan cada respuesta con:
       window.MCRacha ? MCRacha.respondio() : (window.mcRachaPend = (window.mcRachaPend || 0) + 1);
   - Las reglas (meta del día 20, 30 o 50 preguntas; 1 descanso por semana)
     viven en Supabase: supabase/02-racha.sql
   - window.MCRacha.alCambiar(fn) avisa cada vez que cambia.
   ========================================================= */
(function () {
  if (window.MCRacha || !window.MCAuth) return;
  var CFG = window.MC_CONFIG || {};
  // Llama de dos capas: la de afuera y la de adentro titilan a distinto ritmo
  var ICONO = '<svg class="mcl" viewBox="0 0 24 24" aria-hidden="true"><path class="mcl-ext" fill="currentColor" d="M12.3 1.8c.6 3.2 3.4 4.8 5.2 7.7 1.6 2.6 1.9 5.4.8 8-1.2 2.9-3.9 4.7-6.6 4.7-3.2 0-6.1-2.2-6.8-5.5-.5-2.2.1-4.4 1.4-6.1.2 1.5.9 2.6 2 3.1-.5-4.4 1.4-8.6 4-11.9z"/><path class="mcl-int" fill="#FFD84D" d="M12.2 11.2c.4 1.7 2.2 2.6 2.7 4.5.6 2.4-1 4.6-3.1 4.6-2 0-3.4-1.6-3.2-3.5.1-1 .6-1.8 1.3-2.4.1.8.5 1.3 1 1.5-.2-1.7.4-3.3 1.3-4.7z"/></svg>';

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
      '.mcu-racha svg{width:22px;height:22px}' +
      '.mcu-racha:not(.on) .mcl-int{fill:#3a3a3a}' +
      '.mcu-racha.on{color:#FF9600;border-color:rgba(255,150,0,.35)}' +
      '.mcu-racha:hover{border-color:var(--accent,#C6E000)}' +
      // Estilo grueso: borde inferior que se hunde al tocarlo
      '.mcu-racha{border:2px solid #2e2e2e;border-bottom-width:4px;border-radius:14px;height:42px;background:#141414;font-family:Nunito,Sora,Inter,sans-serif;font-weight:900;transition:transform .08s ease;-webkit-tap-highlight-color:transparent}' +
      '.mcu-racha.on{border-color:rgba(255,150,0,.5);border-bottom-color:#b86b00;background:rgba(255,150,0,.08)}' +
      '.mcu-racha:active{transform:translateY(2px);border-bottom-width:2px;margin-bottom:2px}' +
      '.mcr-toast{position:fixed;left:50%;bottom:calc(96px + env(safe-area-inset-bottom,0px));transform:translate(-50%,20px);opacity:0;z-index:300;display:flex;align-items:center;gap:12px;' +
      'background:#111;border:1px solid rgba(198,224,0,.45);color:#f2f2f2;border-radius:18px;padding:12px 18px 12px 14px;box-shadow:0 18px 40px rgba(0,0,0,.6),0 0 30px rgba(198,224,0,.15);' +
      'font:500 13.5px Inter,sans-serif;transition:transform .35s ease,opacity .35s ease;max-width:calc(100vw - 32px)}' +
      '.mcr-toast.show{transform:translate(-50%,0);opacity:1}' +
      '.mcr-toast svg{width:32px;height:32px;color:#C6E000;flex-shrink:0;animation:mcrLlama 1s ease-in-out infinite alternate}' +
      '.mcr-toast b{display:block;font:800 16px Sora,Inter,sans-serif;color:#C6E000}' +
      '@keyframes mcrLlama{from{transform:scale(1)}to{transform:scale(1.12)}}' +
      // Fuego encendido (meta del día cumplida): la llama se mueve y brilla
      '.mcu-racha.on svg,.sal-racha.on .num svg,.racha-dato.on b svg{filter:drop-shadow(0 0 6px rgba(255,150,0,.55))}' +
      '.mcu-racha.on .mcl-ext,.sal-racha.on .mcl-ext,.racha-dato.on .mcl-ext,.mcr-toast .mcl-ext{transform-box:fill-box;transform-origin:50% 95%;animation:mclExt 1.9s ease-in-out infinite}' +
      '.mcu-racha.on .mcl-int,.sal-racha.on .mcl-int,.racha-dato.on .mcl-int,.mcr-toast .mcl-int{transform-box:fill-box;transform-origin:50% 95%;animation:mclInt 1.3s ease-in-out infinite}' +
      '@keyframes mclExt{0%,100%{transform:scale(1,1) skewX(0)}30%{transform:scale(.97,1.05) skewX(-2deg)}60%{transform:scale(1.02,.97) skewX(2deg)}}' +
      '@keyframes mclInt{0%,100%{transform:scale(1,1) translateY(0)}40%{transform:scale(.92,1.1) translateY(-1px)}70%{transform:scale(1.05,.94)}}' +
      '@media (prefers-reduced-motion:reduce){.mcr-toast{transition:none}.mcr-toast svg,.mcl-ext,.mcl-int{animation:none!important}}' +
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
      el.title = (r.actual || 0) + (r.actual === 1 ? ' día' : ' días') + ' de racha · Hoy ' + Math.min(r.hoy || 0, r.meta || 20) + '/' + (r.meta || 20) + ' preguntas';
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
    fijar: cambiar,   // la usa el perfil al elegir otra meta
    alCambiar: function (fn) { oyentes.push(fn); if (estado) { try { fn(estado); } catch (e) {} } },
    icono: ICONO
  };

  pintar();
  cargar();
})();
