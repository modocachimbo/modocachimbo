/* =========================================================
   Modo Cachimbo · Invitaciones a duelos de tus amigos
   Cuando un amigo te invita desde su sala (duelo.html), aquí sale un
   aviso al centro con su foto y el botón para entrar. Mira cada 15 s
   (solo con la pestaña visible). supabase/111-duelos-v3.sql
   ========================================================= */
(function () {
  if (!window.MCAuth) return;
  var vistos = {}, abierto = null, cada = 15000, fallos = 0;
  var ESPADAS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="M13 19l6-6M16 16l4 4M19 21l2-2"/><path d="M14.5 6.5 18 3h3v3l-3.5 3.5"/><path d="M5 14l4 4M7 17l-3 3M3 19l2 2"/></svg>';
  var css = document.createElement('style');
  css.textContent =
    '.mdi-ov{position:fixed;inset:0;z-index:120;display:grid;place-items:center;padding:16px;background:rgba(11,8,24,.78);animation:mdiF .2s ease both;font-family:Nunito,system-ui,sans-serif}' +
    '.mdi{position:relative;width:min(100%,360px);text-align:center;color:#EEEAF7;background:radial-gradient(120% 70% at 50% 0%,rgba(198,224,0,.16),transparent 60%),#151127;border:2px solid #C6E000;border-bottom-width:6px;border-radius:24px;padding:26px 20px 18px;box-shadow:0 24px 60px rgba(0,0,0,.6);animation:mdiP .45s cubic-bezier(.3,1.5,.5,1) both}' +
    '.mdi-tag{position:absolute;top:-14px;left:50%;transform:translateX(-50%);display:inline-flex;align-items:center;gap:6px;background:#C6E000;color:#151a03;font:800 15px/1 "Barlow Condensed",Impact,sans-serif;letter-spacing:.08em;text-transform:uppercase;padding:6px 14px 5px;clip-path:polygon(6% 0,100% 0,94% 100%,0 100%)}' +
    '.mdi-tag svg{width:16px;height:16px}' +
    '.mdi-f{width:78px;height:78px;margin:6px auto 10px;border-radius:22px;display:grid;place-items:center;overflow:hidden;position:relative;background:#1CB0F6;color:#111;font:1000 32px Nunito,sans-serif;box-shadow:0 0 0 3px #C6E000,0 0 26px rgba(198,224,0,.45);animation:mdiL 1.2s ease-in-out infinite}' +
    '.mdi-f img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}' +
    '.mdi h2{font:800 26px/1.05 "Barlow Condensed",Impact,sans-serif;letter-spacing:.03em;text-transform:uppercase;margin:0}' +
    '.mdi h2 span{color:#C6E000}' +
    '.mdi p{margin:8px 0 0;font:700 13.5px/1.4 Nunito,sans-serif;color:#A99FC8}' +
    '.mdi-r{display:inline-block;margin-top:10px;font:900 13px Nunito,sans-serif;color:#FFC800;background:rgba(255,200,0,.12);border-radius:10px;padding:4px 10px}' +
    '.mdi-r.poco{color:#FF4B4B;background:rgba(255,75,75,.14)}' +
    '.mdi-ir{display:flex;align-items:center;justify-content:center;margin-top:14px;width:100%;background:#C6E000;color:#151a03;border:0;border-radius:16px;box-shadow:0 5px 0 #8fa300;padding:13px;font:900 17px/1 "Barlow Condensed",Impact,sans-serif;letter-spacing:.08em;text-transform:uppercase;text-decoration:none}' +
    '.mdi-ir:active{transform:translateY(3px);box-shadow:0 2px 0 #8fa300}' +
    '.mdi-no{margin-top:10px;background:none;border:0;color:#A99FC8;font:800 14px Nunito,sans-serif;cursor:pointer;padding:6px}' +
    '@keyframes mdiF{from{opacity:0}}@keyframes mdiP{from{transform:scale(.7) translateY(20px);opacity:0}}@keyframes mdiL{50%{box-shadow:0 0 0 3px #C6E000,0 0 40px rgba(198,224,0,.7)}}' +
    '@media (prefers-reduced-motion:reduce){.mdi,.mdi-f{animation:none}}';
  document.head.appendChild(css);
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function rpc(n, a) { return MCAuth.listo.then(function (c) { return c.rpc(n, a || {}); }).then(function (r) { if (r.error) throw r.error; return r.data; }); }
  function mmss(ms) { var s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  function son(n) { try { if (window.MCSonido && MCSonido.activo && MCSonido[n]) MCSonido[n](); } catch (e) {} }
  function mostrar(v) {
    // En la misma sala no hace falta el aviso
    if (abierto || new RegExp('[?&]d=' + v.codigo + '\\b').test(location.search)) return;
    vistos[v.id] = 1;
    var des = v.ahora ? new Date(v.ahora) - Date.now() : 0, vence = new Date(v.vence).getTime();
    var ov = document.createElement('div'); ov.className = 'mdi-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'mdiTit');
    var ini = esc((String(v.de || '?').trim()[0] || '?').toUpperCase());
    ov.innerHTML = '<div class="mdi"><span class="mdi-tag">' + ESPADAS + 'Duelo</span><div class="mdi-f">' + ini + (v.foto ? '<img src="' + esc(v.foto) + '" alt="" referrerpolicy="no-referrer" onerror="this.remove()">' : '') + '</div>' +
      '<h2 id="mdiTit"><span>' + esc(v.de) + '</span><br>te reta a un duelo</h2><p>' + esc(v.titulo) + ' · ' + esc(v.n) + ' preguntas</p>' +
      '<span class="mdi-r"></span><a class="mdi-ir" href="duelo.html?d=' + esc(v.codigo) + '">Aceptar el reto</a><button type="button" class="mdi-no">Ahora no</button></div>';
    document.body.appendChild(ov); abierto = ov;
    var r = ov.querySelector('.mdi-r');
    var pintar = function () { var q = vence - (Date.now() + des); if (q <= 0) { cerrar(); return; } r.textContent = 'La sala se cierra en ' + mmss(q); r.classList.toggle('poco', q < 60000); };
    var t = setInterval(pintar, 1000);
    function cerrar() { clearInterval(t); ov.remove(); abierto = null; rpc('invitacion_vista', { p_id: v.id }).catch(function () {}); }
    pintar();
    ov.querySelector('.mdi-no').addEventListener('click', cerrar);
    ov.querySelector('.mdi-ir').addEventListener('click', function () { rpc('invitacion_vista', { p_id: v.id }).catch(function () {}); });
    son('vs');
  }
  function mirar() {
    if (document.hidden || abierto) return;
    // En medio de un duelo no se interrumpe
    var j = document.getElementById('juego'), c = document.getElementById('cuenta');
    if ((j && !j.hidden) || (c && !c.hidden)) return;
    var u = MCAuth.usuario && MCAuth.usuario(); if (!u) return;
    rpc('mis_invitaciones').then(function (L) {
      fallos = 0;
      (L || []).some(function (v) { if (!vistos[v.id]) { mostrar(v); return true; } return false; });
    }).catch(function () { fallos++; });
  }
  MCAuth.listo.then(function () {
    setTimeout(mirar, 2500);
    setInterval(function () { if (fallos < 3) mirar(); }, cada);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) mirar(); });
  }).catch(function () {});
})();
