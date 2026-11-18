/* =========================================================
   Modo Cachimbo · Web en mantenimiento o actualización
   El administrador la prende en Panel → Web → Mantenimiento.
   1) Los alumnos que están dentro ven un aviso con cuenta regresiva
      (2 minutos por defecto) para que terminen lo que hacen.
   2) Al llegar a cero sale la pantalla completa "En mantenimiento"
      y no se puede tocar nada. Cuando el panel la apaga, la web
      vuelve sola.
   Datos: Supabase, tabla ajustes, clave 'mantenimiento' (sin SQL nuevo):
     { activo, tipo: 'mantenimiento'|'actualizacion', aviso: segundos,
       desde: ISO (cuándo sale la pantalla), vuelve: ISO|null, mensaje,
       parche: { id, titulo, notas: [..], fecha } }
   3) Al apagarla, sale "Parche completado" con lo que se agregó. Los que
      no estaban conectados lo ven una vez al entrar (hasta 3 días después).
   Lo carga auth.js en todas las páginas menos el panel.
   Vista previa sin tocar nada: cualquier página con ?mant=aviso, ?mant=pantalla o ?mant=parche
   ========================================================= */
(function () {
  if (window.MCMant) return;
  window.MCMant = true;

  var BASE = (window.MCAuth && MCAuth.base) || (function () {
    var s = document.currentScript;
    return s && s.src ? s.src.replace(/assets\/mantenimiento\.js(\?.*)?$/, '') : './';
  })();
  var K = 'mc_mant';
  var CADA = 2 * 60e3;        // se revisa cada 2 min mientras la página está abierta
  var CADA_BLOQ = 30e3;       // con la pantalla puesta, cada 30 s para volver rápido
  var cfg = null, timerAviso = null, timerPoll = null, adminPasa = false;
  var demo = (location.search.match(/[?&]mant=(aviso|pantalla|parche)/) || [])[1];

  /* ---------- datos ---------- */
  function guardado() {
    try { var v = JSON.parse(sessionStorage.getItem(K) || 'null'); return v && Date.now() - v.t < 60e3 ? v : null; } catch (e) { return null; }
  }
  function traer(forzar) {
    var g = !forzar && guardado();
    if (g) return Promise.resolve(g.d);
    if (!window.MCAuth) return Promise.resolve(null);
    return MCAuth.listo.then(function (c) {
      return c.from('ajustes').select('valor').eq('clave', 'mantenimiento').maybeSingle();
    }).then(function (r) {
      if (r.error) return cfg;          // error de red: se queda como estaba
      var d = r.data && r.data.valor || null;
      try { sessionStorage.setItem(K, JSON.stringify({ t: Date.now(), d: d })); } catch (e) {}
      return d;
    }, function () { return cfg; });
  }

  // Cuándo sale la pantalla en ESTE celular. Quien se entera tarde del aviso (revisa cada 2 min)
  // igual tiene al menos 30 s para terminar, si no pasó más de 1 min desde la hora del panel.
  var fin = 0, finDe = null;
  function calcularFin() {
    if (!cfg || !cfg.desde) { fin = 0; finDe = null; return; }
    if (finDe === cfg.desde) return;
    finDe = cfg.desde;
    var d = new Date(cfg.desde).getTime(), ahora = Date.now(), aviso = (Number(cfg.aviso) || 0) * 1000;
    if (!aviso || isNaN(d)) { fin = 0; return; }
    // Reloj del celular adelantado o atrasado: nunca más que el aviso que puso el panel
    d = Math.min(d, ahora + aviso);
    fin = ahora < d + 60e3 ? Math.max(d, ahora + 30e3) : d;
  }
  function restante() { return Math.max(0, fin - Date.now()); }
  function esActualizacion() { return cfg && cfg.tipo === 'actualizacion'; }
  function mmss(ms) { var s = Math.ceil(ms / 1000), m = Math.floor(s / 60); s = s % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
  function hora(iso) { try { return new Date(iso).toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- estilos ---------- */
  function estilos() {
    if (document.getElementById('mcMantCss')) return;
    var st = document.createElement('style');
    st.id = 'mcMantCss';
    st.textContent = [
      '@keyframes mcmGiro{to{transform:rotate(360deg)}}',
      '@keyframes mcmGiroR{to{transform:rotate(-360deg)}}',
      '@keyframes mcmFlota{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}',
      '@keyframes mcmBarra{0%{left:-40%}100%{left:100%}}',
      '@keyframes mcmEntra{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}',
      '@keyframes mcmLatido{0%,100%{box-shadow:0 0 0 0 rgba(198,224,0,.45)}50%{box-shadow:0 0 0 8px rgba(198,224,0,0)}}',
      '@keyframes mcmPunto{0%,80%,100%{opacity:.25}40%{opacity:1}}',
      /* aviso con cuenta regresiva */
      '#mcMantAviso{position:fixed;left:50%;top:calc(12px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:2147482990;width:min(460px,calc(100% - 24px));font-family:Nunito,Inter,system-ui,sans-serif;color:#EEEAF7;animation:mcmEntra .35s ease-out}',
      '#mcMantAviso .mcm-a{display:flex;align-items:center;gap:14px;background:#151127;border:2px solid #C6E000;border-bottom-width:5px;border-radius:20px;padding:14px 16px;box-shadow:0 14px 40px rgba(0,0,0,.55)}',
      '#mcMantAviso .mcm-ico{flex:0 0 46px;height:46px;border-radius:14px;display:grid;place-items:center;background:rgba(198,224,0,.12);color:#C6E000}',
      '#mcMantAviso .mcm-ico svg{width:28px;height:28px;animation:mcmGiro 4s linear infinite}',
      '#mcMantAviso .mcm-tx{flex:1;min-width:0}',
      '#mcMantAviso b{display:block;font:900 15px/1.25 Nunito,sans-serif}',
      '#mcMantAviso small{display:block;font-size:12.5px;color:#A99FC8;line-height:1.4;margin-top:2px}',
      '#mcMantAviso .mcm-reloj{flex:0 0 auto;font:900 24px/1 Nunito,sans-serif;color:#151A03;background:#C6E000;border-radius:12px;padding:9px 11px;min-width:72px;text-align:center;font-variant-numeric:tabular-nums;animation:mcmLatido 1s infinite}',
      '#mcMantAviso .mcm-barra{height:5px;border-radius:9px;background:#2A2346;margin-top:8px;overflow:hidden}',
      '#mcMantAviso .mcm-barra i{display:block;height:100%;background:#C6E000;border-radius:9px;transition:width 1s linear}',
      /* pantalla completa */
      '#mcMant{position:fixed;inset:0;z-index:2147483000;background:radial-gradient(120% 80% at 50% 0%,#1d1640 0%,#0B0818 60%);display:flex;align-items:center;justify-content:center;padding:24px 18px;font-family:Nunito,Inter,system-ui,sans-serif;color:#EEEAF7;overflow:auto;touch-action:none;user-select:none;-webkit-user-select:none}',
      '#mcMant .mcm-c{max-width:440px;width:100%;text-align:center;animation:mcmEntra .45s ease-out}',
      '#mcMant .mcm-logo{display:block;width:64px;height:auto;margin:0 auto 22px;opacity:.95}',
      '#mcMant .mcm-esc{position:relative;width:184px;height:184px;margin:0 auto 22px}',
      '#mcMant .mcm-g1{position:absolute;inset:0;color:#C6E000;animation:mcmGiro 9s linear infinite}',
      '#mcMant .mcm-g2{position:absolute;width:62px;height:62px;right:-8px;bottom:6px;color:#7C6CF0;animation:mcmGiroR 5s linear infinite}',
      '#mcMant .mcm-g3{position:absolute;width:44px;height:44px;left:-2px;top:10px;color:#FF7AC6;animation:mcmGiro 4s linear infinite}',
      '#mcMant .mcm-buho{position:absolute;left:50%;top:50%;width:112px;height:112px;margin:-56px 0 0 -56px;border-radius:50%;overflow:hidden;border:4px solid #151127;background:#5DA233;animation:mcmFlota 2.6s ease-in-out infinite;box-shadow:0 10px 30px rgba(0,0,0,.45)}',
      '#mcMant .mcm-buho img{width:100%;height:100%;display:block}',
      '#mcMant .mcm-eti{display:inline-flex;align-items:center;gap:8px;font:900 12px Nunito,sans-serif;letter-spacing:3px;text-transform:uppercase;color:#C6E000;background:rgba(198,224,0,.1);border:1px solid rgba(198,224,0,.3);padding:6px 14px;border-radius:99px;margin-bottom:12px}',
      '#mcMant .mcm-eti i{width:8px;height:8px;border-radius:50%;background:currentColor;animation:mcmPunto 1.4s infinite}',
      '#mcMant h2{font:900 28px/1.15 Nunito,sans-serif;margin:0 0 10px}',
      '#mcMant p{color:#A99FC8;font-size:15px;line-height:1.6;margin:0 0 22px}',
      '#mcMant p b{color:#EEEAF7}',
      '#mcMant .mcm-carga{background:#151127;border:2px solid #2A2346;border-bottom-width:5px;border-radius:18px;padding:14px 16px;text-align:left}',
      '#mcMant .mcm-paso{display:flex;align-items:center;gap:10px;font:800 14px Nunito,sans-serif;min-height:20px}',
      '#mcMant .mcm-paso svg{flex:0 0 18px;width:18px;height:18px;color:#C6E000;animation:mcmGiro 1s linear infinite}',
      '#mcMant .mcm-paso span .d{animation:mcmPunto 1.4s infinite}',
      '#mcMant .mcm-paso span .d:nth-child(2){animation-delay:.2s}#mcMant .mcm-paso span .d:nth-child(3){animation-delay:.4s}',
      '#mcMant .mcm-pista{position:relative;height:10px;border-radius:9px;background:#2A2346;margin-top:12px;overflow:hidden}',
      '#mcMant .mcm-pista i{position:absolute;top:0;bottom:0;width:40%;border-radius:9px;background:linear-gradient(90deg,#9db800,#C6E000,#e2f56b);animation:mcmBarra 1.6s ease-in-out infinite}',
      '#mcMant .mcm-vuelve{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:16px;font:800 13.5px Nunito,sans-serif;color:#A99FC8}',
      '#mcMant .mcm-vuelve svg{width:18px;height:18px;color:#C6E000}',
      '#mcMant .mcm-vuelve b{color:#EEEAF7}',
      '#mcMant .mcm-btn{display:block;width:100%;border:0;border-radius:14px;padding:14px;margin-top:18px;background:#C6E000;color:#151A03;font:900 15px Nunito,sans-serif;text-transform:uppercase;letter-spacing:.5px;box-shadow:0 4px 0 #8fa300;cursor:pointer}',
      '#mcMant .mcm-btn:active{transform:translateY(3px);box-shadow:0 1px 0 #8fa300}',
      '#mcMant .mcm-adm{display:inline-block;margin-top:14px;background:none;border:1px dashed #3a3160;color:#A99FC8;border-radius:10px;padding:8px 12px;font:800 12px Nunito,sans-serif;cursor:pointer}',
      '@keyframes mcmSello{0%{transform:scale(.3) rotate(-25deg);opacity:0}60%{transform:scale(1.12) rotate(6deg);opacity:1}100%{transform:none}}',
      '#mcMant .mcm-sello{width:96px;height:96px;margin:0 auto 18px;border-radius:30px;display:grid;place-items:center;background:#C6E000;color:#151A03;box-shadow:0 6px 0 #8fa300,0 0 0 10px rgba(198,224,0,.12);animation:mcmSello .6s cubic-bezier(.3,1.6,.5,1) both}',
      '#mcMant .mcm-sello svg{width:56px;height:56px}',
      '#mcMant .mcm-notas{background:#151127;border:2px solid #2A2346;border-bottom-width:5px;border-radius:18px;padding:14px 16px;text-align:left;max-height:46vh;overflow:auto;touch-action:pan-y}',
      '#mcMant .mcm-nt{font:900 11.5px Nunito,sans-serif;letter-spacing:2px;text-transform:uppercase;color:#A99FC8;margin-bottom:8px}',
      '#mcMant .mcm-notas ul{list-style:none;margin:0;padding:0}',
      '#mcMant .mcm-notas li{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid #241E3E;font:700 14.5px/1.4 Nunito,sans-serif;color:#EEEAF7;animation:mcmEntra .4s ease-out both}',
      '#mcMant .mcm-notas li:first-child{border-top:0}',
      '#mcMant .mcm-notas li:nth-child(2){animation-delay:.08s}#mcMant .mcm-notas li:nth-child(3){animation-delay:.16s}#mcMant .mcm-notas li:nth-child(4){animation-delay:.24s}#mcMant .mcm-notas li:nth-child(n+5){animation-delay:.32s}',
      '#mcMant .mcm-notas li svg{flex:0 0 20px;width:20px;height:20px;padding:3px;border-radius:7px;background:rgba(198,224,0,.15);color:#C6E000;margin-top:1px}',
      '#mcMant .mcm-fecha{margin-top:12px;font:800 12.5px Nunito,sans-serif;color:#7d739f}',
      '#mcMant.listo .mcm-g1,#mcMant.listo .mcm-g2,#mcMant.listo .mcm-g3{animation-duration:30s}',
      '@media (max-height:640px){#mcMant .mcm-esc{width:140px;height:140px;margin-bottom:14px}#mcMant .mcm-buho{width:86px;height:86px;margin:-43px 0 0 -43px}#mcMant .mcm-logo{margin-bottom:12px;width:50px}#mcMant h2{font-size:24px}}',
      '@media (prefers-reduced-motion:reduce){#mcMant *,#mcMantAviso *{animation-duration:20s!important}}'
    ].join('');
    document.head.appendChild(st);
  }

  // Engranaje dibujado en código (sin emojis)
  function engranaje(dientes, r1, r2, hueco) {
    var d = '', n = dientes * 2;
    for (var i = 0; i < n; i++) {
      var a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, r = i % 2 ? r1 : r2;
      var x0 = 50 + r * Math.cos(a0), y0 = 50 + r * Math.sin(a0), x1 = 50 + r * Math.cos(a1), y1 = 50 + r * Math.sin(a1);
      d += (i ? 'L' : 'M') + x0.toFixed(1) + ' ' + y0.toFixed(1) + 'L' + x1.toFixed(1) + ' ' + y1.toFixed(1);
    }
    return '<svg viewBox="0 0 100 100" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="' + d + 'Z' +
      'M' + (50 + hueco) + ' 50a' + hueco + ' ' + hueco + ' 0 1 0 -' + (hueco * 2) + ' 0a' + hueco + ' ' + hueco + ' 0 1 0 ' + (hueco * 2) + ' 0Z"/></svg>';
  }
  var ICO_LLAVE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
  var ICO_GIRA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9"/></svg>';
  var ICO_RELOJ = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  var ICO_PUNTO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  var ICO_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="animation:none"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

  /* ---------- 1) aviso con cuenta regresiva ---------- */
  function ponerAviso() {
    if (document.getElementById('mcMant')) return;
    estilos();
    var a = document.getElementById('mcMantAviso');
    if (!a) {
      a = document.createElement('div');
      a.id = 'mcMantAviso';
      a.setAttribute('role', 'status');
      a.setAttribute('aria-live', 'polite');
      document.body.appendChild(a);
    }
    var total = Math.max(restante(), (Number(cfg.aviso) || 120) * 1000);
    var que = esActualizacion() ? 'se va a actualizar' : 'entra en mantenimiento';
    a.innerHTML = '<div class="mcm-a"><div class="mcm-ico">' + ICO_LLAVE + '</div><div class="mcm-tx">' +
      '<b>La web ' + que + '</b><small>Termina y guarda lo que estás haciendo. Tu progreso no se pierde.</small>' +
      '<div class="mcm-barra"><i></i></div></div><div class="mcm-reloj">0:00</div></div>';
    var reloj = a.querySelector('.mcm-reloj'), barra = a.querySelector('.mcm-barra i');
    function tic() {
      var ms = restante();
      reloj.textContent = mmss(ms);
      barra.style.width = Math.max(0, Math.min(100, ms / total * 100)) + '%';
      if (ms <= 0) { clearInterval(timerAviso); timerAviso = null; quitarAviso(); ponerPantalla(); }
    }
    clearInterval(timerAviso);
    tic();
    timerAviso = setInterval(tic, 1000);
  }
  function quitarAviso() {
    clearInterval(timerAviso); timerAviso = null;
    var a = document.getElementById('mcMantAviso'); if (a) a.remove();
  }

  /* ---------- 2) pantalla completa ---------- */
  var PASOS_M = ['Revisando el servidor', 'Ajustando las preguntas', 'Guardando todo en orden', 'Haciendo pruebas finales'];
  var PASOS_A = ['Descargando lo nuevo', 'Instalando mejoras', 'Preparando tus cursos', 'Dando los últimos toques'];
  var timerPaso = null;
  function bloquearTeclas(e) {
    if (!document.getElementById('mcMant') || adminPasa) return;
    var t = e.target;
    if (t && t.closest && t.closest('#mcMant')) return;
    e.preventDefault(); e.stopPropagation();
  }
  function ponerPantalla() {
    quitarAviso();
    if (adminPasa) return;
    estilos();
    var o = document.getElementById('mcMant');
    var nuevo = !o;
    if (nuevo) {
      o = document.createElement('div');
      o.id = 'mcMant';
      o.setAttribute('role', 'alertdialog');
      o.setAttribute('aria-modal', 'true');
      document.body.appendChild(o);
      document.documentElement.style.overflow = 'hidden';
      try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) {}
      document.addEventListener('keydown', bloquearTeclas, true);
      // Lo que esté abajo (videos, sonidos del Arcade) se pausa
      try { document.querySelectorAll('audio,video').forEach(function (m) { m.pause(); }); } catch (e) {}
      // Las pantallas del sitio pueden escucharlo para guardar lo que tengan a medias
      try { window.dispatchEvent(new CustomEvent('mc:mantenimiento')); } catch (e) {}
    }
    var act = esActualizacion();
    var msg = cfg && cfg.mensaje ? esc(cfg.mensaje) : act
      ? 'Estamos subiendo mejoras a Modo Cachimbo. En unos minutos vuelves a estudiar con todo lo nuevo.'
      : 'Estamos arreglando y mejorando la web para que funcione más rápido. Tu progreso está guardado.';
    var vuelve = cfg && cfg.vuelve && new Date(cfg.vuelve) > Date.now()
      ? '<div class="mcm-vuelve">' + ICO_RELOJ + '<span>Volvemos aprox. a las <b>' + esc(hora(cfg.vuelve)) + '</b></span></div>' : '';
    o.className = '';
    o.innerHTML = '<div class="mcm-c">' +
      '<img class="mcm-logo" src="' + BASE + 'assets/img/logo-modo-cachimbo.svg" alt="Modo Cachimbo">' +
      '<div class="mcm-esc"><div class="mcm-g1">' + engranaje(14, 47, 40, 31) + '</div><div class="mcm-g3">' + engranaje(8, 48, 36, 16) + '</div>' +
      '<div class="mcm-g2">' + engranaje(10, 48, 38, 18) + '</div>' +
      '<div class="mcm-buho"><img src="' + BASE + 'assets/buho/avatar/clasico.webp" alt=""></div></div>' +
      '<div class="mcm-eti"><i></i>' + (act ? 'Actualizando' : 'En mantenimiento') + '</div>' +
      '<h2>' + (act ? 'Estamos actualizando la web' : 'Volvemos en un ratito') + '</h2>' +
      '<p>' + msg + '</p>' +
      '<div class="mcm-carga"><div class="mcm-paso">' + ICO_GIRA + '<span><em class="mcm-txt"></em><span class="d">.</span><span class="d">.</span><span class="d">.</span></span></div><div class="mcm-pista"><i></i></div></div>' +
      vuelve +
      (cfg && cfg.admin ? '<button type="button" class="mcm-adm" id="mcMantAdm">Eres administrador: entrar igual</button>' : '') +
      '</div>';
    var pasos = act ? PASOS_A : PASOS_M, i = 0, txt = o.querySelector('.mcm-txt');
    clearInterval(timerPaso);
    txt.textContent = pasos[0];
    timerPaso = setInterval(function () { i = (i + 1) % pasos.length; txt.textContent = pasos[i]; }, 3200);
    var adm = document.getElementById('mcMantAdm');
    if (adm) adm.addEventListener('click', function () { adminPasa = true; quitarPantalla(); });
    programar(CADA_BLOQ);
  }
  function quitarPantalla() {
    clearInterval(timerPaso); timerPaso = null;
    var o = document.getElementById('mcMant'); if (o) o.remove();
    document.documentElement.style.overflow = '';
    document.removeEventListener('keydown', bloquearTeclas, true);
  }
  // El panel la apagó: "Parche completado" con lo nuevo, y se recarga para traerlo
  var VISTO = 'mc_parche_visto';
  function parcheVisto(id) { try { return localStorage.getItem(VISTO) === String(id); } catch (e) { return false; } }
  function marcarVisto(id) { try { localStorage.setItem(VISTO, String(id)); } catch (e) {} }
  function htmlParche(p, recargar) {
    var notas = (p && p.notas || []).filter(Boolean).slice(0, 12);
    return '<div class="mcm-c mcm-parche">' +
      '<img class="mcm-logo" src="' + BASE + 'assets/img/logo-modo-cachimbo.svg" alt="Modo Cachimbo">' +
      '<div class="mcm-sello">' + ICO_OK + '</div>' +
      '<div class="mcm-eti"><i style="animation:none"></i>Parche completado</div>' +
      '<h2>' + esc(p && p.titulo || '¡Ya volvimos con novedades!') + '</h2>' +
      (notas.length ? '<div class="mcm-notas"><div class="mcm-nt">Lo nuevo en Modo Cachimbo</div><ul>' +
        notas.map(function (n) { return '<li>' + ICO_PUNTO + '<span>' + esc(n) + '</span></li>'; }).join('') + '</ul></div>'
        : '<p>Todo quedó listo. Ya puedes volver a estudiar.</p>') +
      (p && p.fecha ? '<div class="mcm-fecha">' + esc(fechaCorta(p.fecha)) + '</div>' : '') +
      '<button type="button" class="mcm-btn" id="mcMantVolver">' + (recargar ? 'Entrar a Modo Cachimbo' : '¡Genial!') + '</button></div>';
  }
  function mostrarParche(p, recargar) {
    estilos();
    clearInterval(timerPaso); timerPaso = null;
    var o = document.getElementById('mcMant');
    if (!o) {
      o = document.createElement('div');
      o.id = 'mcMant';
      o.setAttribute('role', 'dialog');
      o.setAttribute('aria-modal', 'true');
      document.body.appendChild(o);
      document.documentElement.style.overflow = 'hidden';
    }
    o.className = 'listo';
    o.innerHTML = htmlParche(p, recargar);
    if (p && p.id) marcarVisto(p.id);
    document.getElementById('mcMantVolver').addEventListener('click', function () {
      if (recargar) location.reload(); else quitarPantalla();
    });
  }
  function yaVolvimos(p) {
    if (!document.getElementById('mcMant')) return;
    mostrarParche(p, true);
  }
  function fechaCorta(iso) { try { return new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' }); } catch (e) { return ''; } }

  /* ---------- ciclo ---------- */
  function aplicar(d, admin) {
    var antes = cfg;
    cfg = d && d.activo ? d : null;
    if (cfg && admin) cfg.admin = true;
    if (!cfg) {
      quitarAviso();
      var p = d && d.parche;
      var reciente = p && p.id && p.fecha && Date.now() - new Date(p.fecha) < 3 * 864e5;
      if (antes && document.getElementById('mcMant')) yaVolvimos(p);
      else if (reciente && !parcheVisto(p.id) && !document.getElementById('mcMant')) mostrarParche(p, false);
      programar(CADA);
      return;
    }
    calcularFin();
    if (restante() > 0) { ponerAviso(); programar(CADA); }
    else ponerPantalla();
  }
  var esAdmin = null;
  function revisarAdmin() {
    if (esAdmin !== null) return Promise.resolve(esAdmin);
    if (!window.MCAuth || !MCAuth.usuario()) return Promise.resolve(false);
    return MCAuth.listo.then(function (c) { return c.rpc('es_admin'); })
      .then(function (r) { esAdmin = !!(r && r.data); return esAdmin; }, function () { return false; });
  }
  function revisar(forzar) {
    if (demo) return;
    traer(forzar).then(function (d) {
      if (!d || !d.activo) return aplicar(d);
      revisarAdmin().then(function (a) { aplicar(d, a); });
    });
  }
  function programar(ms) {
    clearTimeout(timerPoll);
    timerPoll = setTimeout(function () { if (!document.hidden) revisar(true); else programar(ms); }, ms);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) revisar(false); });

  function iniciar() {
    if (demo === 'parche') {
      mostrarParche({ id: 'demo', fecha: new Date().toISOString(), titulo: 'Parche de noviembre', notas: ['Nuevo minijuego en el Arcade: Elige la imagen', 'Simulacro más rápido en celulares', 'Arreglamos las fórmulas largas que se salían de la pantalla'] }, false);
      return;
    }
    if (demo) {
      var t = (location.search.match(/[?&]tipo=(actualizacion)/) || [])[1] || 'mantenimiento';
      cfg = { activo: true, tipo: t, aviso: demo === 'aviso' ? 120 : 0, desde: new Date(Date.now() + (demo === 'aviso' ? 120e3 : -1)).toISOString(), vuelve: new Date(Date.now() + 30 * 60e3).toISOString() };
      calcularFin();
      if (demo === 'aviso') ponerAviso(); else ponerPantalla();
      return;
    }
    revisar(false);
  }
  window.MCMantenimiento = { revisar: function () { revisar(true); } };
  if (document.body) iniciar(); else document.addEventListener('DOMContentLoaded', iniciar);
})();
