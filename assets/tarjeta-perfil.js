/* =========================================================
   Modo Cachimbo · Tarjeta del perfil de la barra de arriba
   - Convierte el botón de la cuenta (assets/auth.js) en la tarjeta del
     inicio: tu foto de perfil (el búho o la tuya) con el marco que llevas,
     nombre y rango de la semana, sobre tu fondo (Mi colección, assets/coleccion.js).
   - Se activa en el elemento con data-mc-auth que también tenga
     data-mc-tarjeta. Con data-mc-tarjeta="sola" no salen corazones,
     racha ni XP al lado.
   - El rango sale del XP de la semana de assets/corazones.js.
   ========================================================= */
(function () {
  if (window.MCTarjeta) return;
  // Color del texto de cada rango (el mismo de assets/rango.js)
  var RC = ['#5FDAFF', '#5FF59A', '#D79BFF', '#FF6E84', '#FFC800'];
  var miXp = null;
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var T = '[data-mc-tarjeta] ';
  var CSS =
    '[data-mc-tarjeta]{display:flex;min-width:0}' +
    T + '.mcu-user{display:flex;align-items:center;gap:8px}' +
    '[data-mc-tarjeta="sola"] .mcz-pill,[data-mc-tarjeta="sola"] .mcu-racha{display:none!important}' +
    T + '.mcu-chip.mct{order:4;position:relative;display:flex;align-items:center;gap:12px;min-width:0;max-width:none;margin:0;padding:7px 46px 7px 8px;border:0;border-radius:0;color:#fff;font:inherit;cursor:pointer;' +
      'clip-path:polygon(0 0,100% 0,90% 100%,0 100%);' +
      'background:linear-gradient(90deg,rgba(11,8,24,.78),rgba(11,8,24,.4) 65%,rgba(11,8,24,.05)),' +
      'radial-gradient(1.5px 1.5px at 20% 30%,#fff 50%,transparent),radial-gradient(1px 1px at 62% 20%,#fff 50%,transparent),' +
      'radial-gradient(1.5px 1.5px at 80% 70%,#fff 50%,transparent),radial-gradient(1px 1px at 45% 80%,#fff 50%,transparent),' +
      'radial-gradient(120% 140% at 85% 0%,var(--f1,#5b34b8),var(--f2,#241452) 55%,#0d0820)}' +
    T + '.mcu-chip.mct:hover{filter:brightness(1.08)}' +
    T + '.mcu-chip.mct:active{transform:translateY(1px);border-bottom-width:0;margin-bottom:0}' +
    T + '.mct-marco{position:relative;display:grid;place-items:center;flex:none;width:58px;height:58px;padding:3px;border-radius:13px;background:var(--m,rgba(255,255,255,.16))}' +
    T + '.mct-marco.con{filter:drop-shadow(0 0 6px rgba(255,255,255,.25))}' +
    T + '.mct .mcu-av{width:100%;height:100%;border-radius:10px;overflow:hidden;background:var(--lima,#C6E000);color:var(--sobre-lima,#151A03);font:900 26px/1 var(--cuerpo,Nunito,sans-serif);display:grid;place-items:center}' +
    T + '.mct .mcu-av img{width:100%;height:100%;display:block;object-fit:cover}' +
    T + '.mct .mcu-av.mct-buho{background:radial-gradient(120% 120% at 80% 0%,var(--f1,#5b34b8),var(--f2,#1a0f40) 70%,#0d0820)}' +
    T + '.mct-tx{display:grid;gap:4px;min-width:0;text-align:left}' +
    T + '.mct .mcu-nom{display:block;flex:none;text-align:left;font:800 26px/1 var(--display,"Barlow Condensed","Arial Narrow",sans-serif);letter-spacing:.04em;text-transform:uppercase;color:#fff;' +
      'text-shadow:0 2px 0 rgba(0,0,0,.55),0 0 10px rgba(0,0,0,.6);max-width:9em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    T + '.mct-rg{display:flex;align-items:center;gap:5px;font:800 17px/1 var(--display,"Barlow Condensed","Arial Narrow",sans-serif);letter-spacing:.06em;text-transform:uppercase;color:var(--rc,#cfc8e6);' +
      'text-shadow:0 2px 0 rgba(0,0,0,.6),0 0 8px rgba(0,0,0,.55);white-space:nowrap}' +
    T + '.mct-rg:empty{display:none}' +
    T + '.mct-rg i{width:22px;display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}' +
    T + '.mct-rg i svg{width:100%;display:block}' +
    '@media (max-width:900px){' +
      T + '.mcu-chip.mct{padding:5px 26px 5px 5px;gap:8px}' +
      T + '.mct-marco{width:46px;height:46px}' +
      T + '.mct .mcu-av{font-size:20px}' +
      T + '.mct .mcu-nom{font-size:19px;max-width:6.5em}' +
      T + '.mct-rg{font-size:13px}' + T + '.mct-rg i{width:16px}' +
    '}' +
    '@media (max-width:400px){' + T + '.mct .mcu-nom{font-size:17px;max-width:5.5em}}';

  function css() {
    if (document.getElementById('mct-css')) return;
    var st = document.createElement('style'); st.id = 'mct-css'; st.textContent = CSS;
    document.head.appendChild(st);
  }

  function rangoHtml(xp) {
    if (!window.MCRango || xp == null) return '';
    var n = MCRango.nivel(xp);
    return n < 0 ? 'Sin rango' : '<i>' + MCRango.svg(n, { mini: true, quieto: true }) + '</i>' + esc(MCRango.nombre(n));
  }

  // Arma la tarjeta y la pinta con lo que llevas puesto. Solo toca lo que cambió:
  // el observador vuelve a llamar aquí con cada cambio de la barra.
  function pintar() {
    css();
    var C = window.MCColeccion;
    var marco = C ? C.marco() : '', tema = C ? C.tema() : null;
    Array.prototype.forEach.call(document.querySelectorAll('[data-mc-tarjeta] .mcu-chip'), function (chip) {
      if (!chip.querySelector('.mct-tx')) {
        chip.classList.add('mct');
        var av = chip.querySelector('.mcu-av'), nom = chip.querySelector('.mcu-nom');
        var m = document.createElement('span'); m.className = 'mct-marco';
        if (av) { chip.insertBefore(m, av); m.appendChild(av); }
        var tx = document.createElement('span'); tx.className = 'mct-tx';
        if (nom) tx.appendChild(nom);
        var rg = document.createElement('small'); rg.className = 'mct-rg';
        tx.appendChild(rg); chip.appendChild(tx);
      }
      // Foto de perfil: el búho (o un disfraz) sobre tu fondo, o tu foto de Google / inicial
      var av = chip.querySelector('.mcu-av');
      if (av) {
        if (av.getAttribute('data-orig') == null) {
          av.setAttribute('data-orig', av.innerHTML);
          var im = av.querySelector('img');
          if (C) C.fijarFoto(im ? im.src : '', av.textContent, (chip.querySelector('.mcu-nom') || {}).textContent);
        }
        var src = C ? C.avatar() : '', ka = src + '|' + (tema ? tema[0] : '');
        if (av.getAttribute('data-a') !== ka) {
          av.setAttribute('data-a', ka);
          av.innerHTML = src ? '<img src="' + esc(src) + '" alt="">' : av.getAttribute('data-orig');
          av.classList.toggle('mct-buho', !!src);
          if (tema) { av.style.setProperty('--f1', tema[0]); av.style.setProperty('--f2', tema[3]); }
        }
      }
      var caja = chip.querySelector('.mct-marco'), mv = marco || '';
      if (caja.getAttribute('data-m') !== mv) {
        caja.setAttribute('data-m', mv);
        if (mv) caja.style.setProperty('--m', mv); else caja.style.removeProperty('--m');
        caja.classList.toggle('con', !!mv);
      }
      if (tema && chip.style.getPropertyValue('--f1') !== tema[0]) { chip.style.setProperty('--f1', tema[0]); chip.style.setProperty('--f2', tema[3]); }
      var r = chip.querySelector('.mct-rg'), n = miXp == null || !window.MCRango ? -1 : MCRango.nivel(miXp);
      var k = miXp == null ? 'x' : String(n), c = n < 0 ? '#cfc8e6' : RC[n];
      if (r.getAttribute('data-n') !== k) { r.setAttribute('data-n', k); r.innerHTML = rangoHtml(miXp); }
      if (r.style.getPropertyValue('--rc') !== c) r.style.setProperty('--rc', c);
    });
  }

  function iniciar() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-mc-tarjeta]'), function (caja) {
      new MutationObserver(pintar).observe(caja, { childList: true, subtree: true });
    });
    pintar();
    if (window.MCColeccion) {
      MCColeccion.alCambiar(pintar);
      if (window.MCAuth) MCAuth.alCambiar(function (u) { if (u) MCColeccion.cargar(); });
    }
    // El XP de la semana llega con assets/corazones.js (lo carga auth.js al haber sesión)
    (function esperar(i) {
      if (window.MCCorazones) MCCorazones.alCambiar(function (e) { if (e) { miXp = +e.xp_semana || 0; pintar(); } });
      else if (i < 100) setTimeout(function () { esperar(i + 1); }, 200);
    })(0);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();

  window.MCTarjeta = { pintar: pintar };
})();
