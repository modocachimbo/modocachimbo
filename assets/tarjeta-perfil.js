/* =========================================================
   Modo Cachimbo · Tarjeta de jugador (estilo juego)
   - Convierte el botón de la cuenta (assets/auth.js) en la tarjeta delgada
     del inicio: foto con marco dorado, nivel y pin; nombre, rango de la
     semana e ID, sobre un paisaje hecho con tu fondo (Mi colección).
   - Se activa en el elemento con data-mc-auth que también tenga
     data-mc-tarjeta (otro data-mc-tarjeta solo toma los estilos: así lo usa
     la vista previa de Mi colección con lo que estás probando). Con data-mc-tarjeta="sola" no salen corazones,
     racha ni XP al lado.
   - El rango sale del XP de la semana de assets/corazones.js. El ID, el XP
     total (para el nivel) y el pin de verificado salen de mi_tarjeta()
     (supabase/36-tarjeta-jugador.sql).
   - La tarjeta grande de perfil.html usa lo mismo: MCTarjeta.arte, .icono,
     .nivel, .pin, .jugador y .alJugador.
   ========================================================= */
(function () {
  if (window.MCTarjeta) return;
  // Color del texto de cada rango (el mismo de assets/rango.js)
  var RC = ['#5FDAFF', '#5FF59A', '#D79BFF', '#FF6E84', '#FFC800'];
  var miXp = null, yo = null, oyentes = [];
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // Nivel de jugador: sale de todo tu XP, sin tope. Cada nivel pide más XP
  // que el anterior (nivel 2 con 100 XP, 11 con 10 000, 101 con un millón).
  function nivel(xp) { return 1 + Math.floor(Math.sqrt(Math.max(0, +xp || 0) / 100)); }

  // Mezcla dos colores #rrggbb (p = cuánto del segundo)
  function mezcla(a, b, p) {
    var x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16), r = '#';
    [16, 8, 0].forEach(function (s) { var v = Math.round(((x >> s) & 255) * (1 - p) + ((y >> s) & 255) * p); r += (v < 16 ? '0' : '') + v.toString(16); });
    return r;
  }
  // Paisaje de la tarjeta con los 4 colores de tu fondo: cielo, sol, estrellas, cerros y rayos de luz
  var nArte = 0;
  function arte(t) {
    var id = 'mcta' + (++nArte), sol = mezcla(t[0], '#ffffff', .55);
    return '<svg class="mct-arte" viewBox="0 0 800 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>' +
      '<linearGradient id="' + id + 'c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + mezcla(t[3], '#000000', .55) + '"/><stop offset=".55" stop-color="' + mezcla(t[1], '#000000', .15) + '"/><stop offset="1" stop-color="' + t[0] + '"/></linearGradient>' +
      '<radialGradient id="' + id + 's" cx=".82" cy=".62" r=".38"><stop offset="0" stop-color="' + sol + '"/><stop offset=".35" stop-color="' + t[0] + '" stop-opacity=".7"/><stop offset="1" stop-color="' + t[0] + '" stop-opacity="0"/></radialGradient></defs>' +
      '<rect width="800" height="200" fill="url(#' + id + 'c)"/><rect width="800" height="200" fill="url(#' + id + 's)"/><circle cx="660" cy="128" r="34" fill="' + sol + '"/>' +
      '<g fill="#fff" opacity=".8"><circle cx="60" cy="24" r="1.4"/><circle cx="140" cy="60" r="1"/><circle cx="230" cy="18" r="1.6"/><circle cx="320" cy="44" r="1"/><circle cx="410" cy="16" r="1.3"/><circle cx="500" cy="38" r="1"/><circle cx="560" cy="70" r="1.2"/></g>' +
      '<path d="M0 150 L90 98 L150 128 L240 70 L330 132 L420 92 L520 140 L600 104 L700 150 L800 112 V200 H0Z" fill="' + mezcla(t[3], '#000000', .3) + '" opacity=".85"/>' +
      '<path d="M0 172 L120 128 L210 160 L300 118 L380 158 L470 126 L560 166 L650 134 L740 170 L800 150 V200 H0Z" fill="' + mezcla(t[3], '#000000', .62) + '"/>' +
      '<g stroke="' + sol + '" stroke-width="2" opacity=".3"><path d="M0 200 L260 0"/><path d="M60 200 L320 0"/></g>' +
      '<rect width="800" height="200" fill="url(#mct-sombra)"/></svg>';
  }

  // Degradados e íconos propios (racha, XP, mejor, colección y el pin de verificado)
  var DEFS = '<svg width="0" height="0" aria-hidden="true"><defs>' +
    '<linearGradient id="mct-sombra" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".38"/><stop offset=".6" stop-color="#000" stop-opacity="0"/></linearGradient>' +
    '<linearGradient id="mct-oro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF3A6"/><stop offset=".45" stop-color="#FFC800"/><stop offset="1" stop-color="#B86E00"/></linearGradient>' +
    '<linearGradient id="mct-vino" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B3261E"/><stop offset="1" stop-color="#4A0A0A"/></linearGradient>' +
    '<linearGradient id="mct-fue" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#E0300B"/><stop offset=".6" stop-color="#FF8A1A"/><stop offset="1" stop-color="#FFD24D"/></linearGradient>' +
    '<linearGradient id="mct-ray" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF6B0"/><stop offset=".5" stop-color="#FFC800"/><stop offset="1" stop-color="#E08600"/></linearGradient>' +
    '<linearGradient id="mct-mor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F0D2FF"/><stop offset=".5" stop-color="#B46CFF"/><stop offset="1" stop-color="#6A24C8"/></linearGradient>' +
    '<linearGradient id="mct-lim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EEFF7A"/><stop offset=".55" stop-color="#C6E000"/><stop offset="1" stop-color="#6E8400"/></linearGradient>' +
    '<symbol id="mct-ver" viewBox="0 0 48 48"><path d="M24 2 43 13v22L24 46 5 35V13z" fill="url(#mct-oro)" stroke="#5a2a00" stroke-width="1.5"/><path d="M24 7 39 15.5v17L24 41 9 32.5v-17z" fill="url(#mct-vino)"/><path d="M14 15h6.5L24 28l3.5-13H34l-7 19h-6z" fill="url(#mct-oro)" stroke="#5a2a00" stroke-width="1"/></symbol>' +
    '<symbol id="mct-racha" viewBox="0 0 32 32"><path d="M16 2c2 6 10 9.5 10 18.5a10 10 0 0 1-20 0c0-5.2 3.2-8 5.4-10 .3 3.4 1.8 5.2 3.6 5.8C14 11 14.6 6.5 16 2z" fill="url(#mct-fue)" stroke="#5a1400" stroke-width="1.3"/><path d="M16.4 16c.8 3 5 4.8 5 9a5.4 5.4 0 0 1-10.8 0c0-2.3 1.2-3.7 2.3-4.8.2 1.6.9 2.5 1.8 2.8-.4-2.6.2-5 1.7-7z" fill="#FFF0A0"/></symbol>' +
    '<symbol id="mct-xp" viewBox="0 0 32 32"><path d="M18.5 2 6 18h8l-2.5 12L26 13h-8.5z" fill="url(#mct-ray)" stroke="#6b3a00" stroke-width="1.4" stroke-linejoin="round"/><path d="M17 6 10 15h4" stroke="#fff" stroke-width="1.6" fill="none" opacity=".7" stroke-linecap="round"/></symbol>' +
    '<symbol id="mct-mejor" viewBox="0 0 32 32"><path d="M9 4h14v6a7 7 0 0 1-14 0z" fill="url(#mct-mor)" stroke="#3a0f6e" stroke-width="1.4"/><path d="M9 6H4c0 4 2.5 6 5.5 6M23 6h5c0 4-2.5 6-5.5 6" fill="none" stroke="url(#mct-mor)" stroke-width="2.2"/><path d="M14 17h4v4h-4z" fill="#8a46e0"/><path d="M10 21h12l1.5 6h-15z" fill="url(#mct-mor)" stroke="#3a0f6e" stroke-width="1.4"/><path d="M12 7v4" stroke="#fff" stroke-width="1.6" opacity=".7" stroke-linecap="round"/></symbol>' +
    '<symbol id="mct-cofre" viewBox="0 0 32 32"><path d="M4 13h24v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" fill="url(#mct-lim)" stroke="#2f3a00" stroke-width="1.4"/><path d="M4 13c0-5 4-8 12-8s12 3 12 8z" fill="#9db800" stroke="#2f3a00" stroke-width="1.4"/><rect x="13" y="11" width="6" height="8" rx="1.5" fill="#FFC800" stroke="#5a3a00" stroke-width="1.2"/><path d="M4 18h24" stroke="#2f3a00" stroke-width="1.2" opacity=".5"/></symbol>' +
    '</defs></svg>';
  function defs() {
    if (document.getElementById('mct-defs') || !document.body) return;
    var d = document.createElement('div'); d.id = 'mct-defs'; d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    d.innerHTML = DEFS; document.body.appendChild(d);
  }
  function icono(id) { defs(); return '<svg aria-hidden="true"><use href="#mct-' + id + '"/></svg>'; }

  // Tu pin personal: el verificado si eres del equipo; si no, el primero de tu vitrina
  function pin() {
    var C = window.MCColeccion;
    if (yo && yo.admin) return { html: icono('ver'), nom: 'Verificado', como: 'Solo lo llevan los administradores de Modo Cachimbo.' };
    var id = C && C.puesto('pines')[0], x = id && C.item(id);
    return x ? { html: C.pin(x), nom: x.nom, como: C.como(x) } : null;
  }

  // ID, XP total y verificado: se guardan para que la tarjeta salga al toque la próxima vez
  var KJ = 'mc_jugador';
  function avisarJ() { oyentes.forEach(function (f) { try { f(yo); } catch (e) {} }); pintar(); }
  function cargarJugador(u) {
    if (!u || !window.MCAuth) return;
    if (!yo) { try { var c = JSON.parse(localStorage.getItem(KJ)); if (c && c.u === u.id) { yo = c.d; avisarJ(); } } catch (e) {} }
    MCAuth.listo.then(function (sb) { return sb.rpc('mi_tarjeta'); }).then(function (r) {
      if (!r || r.error || !r.data) return;
      yo = r.data;
      try { localStorage.setItem(KJ, JSON.stringify({ u: u.id, d: yo })); } catch (e) {}
      avisarJ();
    }).catch(function () {});
  }

  var T = '[data-mc-tarjeta] ';
  var CSS =
    '[data-mc-tarjeta]{display:flex;min-width:0}' +
    T + '.mcu-user{display:flex;align-items:center;gap:8px}' +
    '[data-mc-tarjeta="sola"] .mcz-pill,[data-mc-tarjeta="sola"] .mcu-racha{display:none!important}' +
    T + '.mcu-chip.mct{order:4;position:relative;overflow:hidden;display:flex;align-items:center;gap:12px;min-width:0;max-width:none;height:76px;margin:0;padding:0 54px 0 8px;border:0;border-radius:0;color:#fff;font:inherit;cursor:pointer;background:#140a33;' +
      'clip-path:polygon(0 0,100% 0,calc(100% - 30px) 100%,0 100%)}' +
    T + '.mcu-chip.mct::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;background:linear-gradient(90deg,#FFC800,var(--rc,#FFC800) 60%,transparent)}' +
    T + '.mcu-chip.mct:hover{filter:brightness(1.08)}' +
    T + '.mcu-chip.mct:active{transform:translateY(1px);border-bottom-width:0;margin-bottom:0}' +
    T + '.mct-arte{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none}' +
    T + '.mct-caja{position:relative;z-index:1;flex:none;width:60px;height:60px}' +
    T + '.mct-marco{position:absolute;inset:0;padding:3px;background:var(--m,linear-gradient(135deg,#FFE58A,#FFC800 40%,#B07800));clip-path:polygon(0 0,100% 0,100% 82%,82% 100%,0 100%)}' +
    T + '.mct .mcu-av{width:100%;height:100%;border-radius:0;overflow:hidden;background:radial-gradient(120% 120% at 80% 0%,var(--f1,#5b34b8),var(--f2,#1a0f40) 70%,#0d0820);color:#fff;font:900 26px/1 var(--cuerpo,Nunito,sans-serif);display:grid;place-items:center;clip-path:polygon(0 0,100% 0,100% 82%,82% 100%,0 100%)}' +
    T + '.mct .mcu-av img{width:100%;height:100%;display:block;object-fit:cover}' +
    T + '.mct .mcu-av.mct-buho{background:radial-gradient(120% 120% at 80% 0%,var(--f1,#5b34b8),var(--f2,#1a0f40) 70%,#0d0820)}' +
    T + '.mct-nv{position:absolute;left:-2px;bottom:-4px;display:flex;align-items:baseline;gap:2px;padding:2px 8px 1px 5px;background:linear-gradient(90deg,#FFE14D,#FFC800);color:#2a1d00;font:900 italic 10px/1 var(--display,"Barlow Condensed","Arial Narrow",sans-serif);text-transform:uppercase;clip-path:polygon(0 0,100% 0,88% 100%,0 100%)}' +
    T + '.mct-nv b{font-size:15px}' +
    T + '.mct-nv:empty,' + T + '.mct-pin:empty{display:none}' +
    T + '.mct-pin{position:absolute;top:-4px;right:-8px;width:24px;height:24px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.6))}' +
    T + '.mct-pin svg{width:100%;height:100%;display:block}' +
    T + '.mct-pin .mcc-pin{width:100%;border-width:2px;box-shadow:none}' + T + '.mct-pin .mcc-pin span{font-size:12px}' +
    T + '.mct-tx{position:relative;z-index:1;display:grid;gap:5px;min-width:0;text-align:left}' +
    T + '.mct .mcu-nom{display:block;flex:none;text-align:left;font:italic 900 28px/.95 var(--display,"Barlow Condensed","Arial Narrow",sans-serif);letter-spacing:.02em;text-transform:uppercase;color:#fff;' +
      'text-shadow:0 2px 0 rgba(0,0,0,.55),0 0 12px rgba(0,0,0,.55);max-width:9em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    T + '.mct-rg{display:flex;align-items:center;gap:6px;font:800 15px/1 var(--display,"Barlow Condensed","Arial Narrow",sans-serif);letter-spacing:.07em;text-transform:uppercase;color:rgba(255,255,255,.8);' +
      'text-shadow:0 2px 0 rgba(0,0,0,.6),0 0 8px rgba(0,0,0,.55);white-space:nowrap}' +
    T + '.mct-rg:empty{display:none}' +
    T + '.mct-rg b{color:var(--rc,#cfc8e6)}' +
    T + '.mct-rg i{width:22px;display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}' +
    T + '.mct-rg i svg{width:100%;display:block}' +
    '@media (max-width:900px){' +
      T + '.mcu-chip.mct{height:60px;padding:0 30px 0 6px;gap:9px;clip-path:polygon(0 0,100% 0,calc(100% - 18px) 100%,0 100%)}' +
      T + '.mct-caja{width:46px;height:46px}' + T + '.mct-marco{padding:2px}' +
      T + '.mct .mcu-av{font-size:20px}' +
      T + '.mct-nv{padding:1px 6px 0 4px;font-size:8px}' + T + '.mct-nv b{font-size:12px}' +
      T + '.mct-pin{width:19px;height:19px;right:-6px}' +
      T + '.mct .mcu-nom{font-size:21px;max-width:6.5em}' +
      T + '.mct-rg{font-size:12px;gap:4px}' + T + '.mct-rg i{width:16px}' +
    '}' +
    '@media (max-width:400px){' + T + '.mct .mcu-nom{font-size:18px;max-width:5.5em}' + T + '.mct-rg{font-size:11px;letter-spacing:.04em}}';

  function css() {
    if (document.getElementById('mct-css')) return;
    var st = document.createElement('style'); st.id = 'mct-css'; st.textContent = CSS;
    document.head.appendChild(st);
  }

  // «RUBÍ · ID 99999» (el ID sale cuando ya lo tienes)
  function rangoHtml(xp) {
    var n = window.MCRango && xp != null ? MCRango.nivel(xp) : -1;
    var r = xp == null || !window.MCRango ? '' : n < 0 ? '<b>Sin rango</b>' : '<i>' + MCRango.svg(n, { mini: true, quieto: true }) + '</i><b>' + esc(MCRango.nombre(n)) + '</b>';
    var id = yo && yo.codigo ? '<span>' + (r ? '· ' : '') + 'ID ' + esc(yo.codigo) + '</span>' : '';
    return r + id;
  }

  // Arma la tarjeta y la pinta con lo que llevas puesto. Solo toca lo que cambió:
  // el observador vuelve a llamar aquí con cada cambio de la barra.
  function pintar() {
    css();
    var C = window.MCColeccion;
    var marco = C ? C.marco() : '', tema = C ? C.tema() : ['#5b34b8', '#241452', '#4a2a9a', '#1a0f40'];
    Array.prototype.forEach.call(document.querySelectorAll('[data-mc-auth][data-mc-tarjeta] .mcu-chip'), function (chip) {
      if (!chip.querySelector('.mct-tx')) {
        chip.classList.add('mct');
        var av = chip.querySelector('.mcu-av'), nom = chip.querySelector('.mcu-nom');
        var caja = document.createElement('span'); caja.className = 'mct-caja';
        caja.innerHTML = '<span class="mct-marco"></span><span class="mct-nv"></span><span class="mct-pin"></span>';
        if (av) { chip.insertBefore(caja, av); caja.firstChild.appendChild(av); }
        var tx = document.createElement('span'); tx.className = 'mct-tx';
        if (nom) tx.appendChild(nom);
        var rg = document.createElement('small'); rg.className = 'mct-rg';
        tx.appendChild(rg); chip.appendChild(tx);
      }
      // Paisaje con tu fondo
      if (chip.getAttribute('data-t') !== tema[0]) {
        chip.setAttribute('data-t', tema[0]);
        var viejo = chip.querySelector('.mct-arte'); if (viejo) viejo.remove();
        chip.insertAdjacentHTML('afterbegin', arte(tema));
      }
      // Foto de perfil: el búho (o un disfraz) sobre tu fondo, o tu foto de Google / inicial
      var av = chip.querySelector('.mcu-av');
      if (av) {
        if (av.getAttribute('data-orig') == null) {
          av.setAttribute('data-orig', av.innerHTML);
          var im = av.querySelector('img');
          if (C) C.fijarFoto(im ? im.src : '', av.textContent, (chip.querySelector('.mcu-nom') || {}).textContent);
        }
        var src = C ? C.avatar() : '', ka = src + '|' + tema[0];
        if (av.getAttribute('data-a') !== ka) {
          av.setAttribute('data-a', ka);
          av.innerHTML = src ? '<img src="' + esc(src) + '" alt="">' : av.getAttribute('data-orig');
          av.classList.toggle('mct-buho', !!src);
          av.style.setProperty('--f1', tema[0]); av.style.setProperty('--f2', tema[3]);
        }
      }
      var m = chip.querySelector('.mct-marco'), mv = marco || '';
      if (m.getAttribute('data-m') !== mv) {
        m.setAttribute('data-m', mv);
        if (mv) m.style.setProperty('--m', mv); else m.style.removeProperty('--m');
      }
      // Nivel y pin personal
      var nv = chip.querySelector('.mct-nv'), hn = yo ? 'Nvl <b>' + nivel(yo.xp_total) + '</b>' : '';
      if (nv.innerHTML !== hn) nv.innerHTML = hn;
      var p = pin(), ph = p ? p.html : '', pe = chip.querySelector('.mct-pin');
      if (pe.getAttribute('data-p') !== ph) { pe.setAttribute('data-p', ph); pe.innerHTML = ph; pe.title = p ? p.nom : ''; }
      // Rango de la semana e ID
      var r = chip.querySelector('.mct-rg'), n = miXp == null || !window.MCRango ? -1 : MCRango.nivel(miXp);
      var k = (miXp == null ? 'x' : String(n)) + '|' + (yo ? yo.codigo : ''), c = n < 0 ? '#cfc8e6' : RC[n];
      if (r.getAttribute('data-n') !== k) { r.setAttribute('data-n', k); r.innerHTML = rangoHtml(miXp); }
      if (chip.style.getPropertyValue('--rc') !== c) chip.style.setProperty('--rc', c);
    });
  }

  function iniciar() {
    defs();
    Array.prototype.forEach.call(document.querySelectorAll('[data-mc-auth][data-mc-tarjeta]'), function (caja) {
      new MutationObserver(pintar).observe(caja, { childList: true, subtree: true });
      // Tocar tu tarjeta te lleva directo a tu perfil (en tu perfil sigue abriendo el menú)
      caja.addEventListener('click', function (e) {
        var chip = e.target.closest('.mcu-chip'), a = caja.querySelector('.mcu-menu a[href*="perfil.html"]');
        if (!chip || !a || /perfil\.html$/.test(location.pathname)) return;
        e.stopPropagation(); e.preventDefault(); location.href = a.href;
      }, true);
    });
    pintar();
    if (window.MCColeccion) MCColeccion.alCambiar(pintar);
    if (window.MCAuth) MCAuth.alCambiar(function (u) {
      if (u) { if (window.MCColeccion) MCColeccion.cargar(); cargarJugador(u); }
      else { yo = null; avisarJ(); }
    });
    // El XP de la semana llega con assets/corazones.js (lo carga auth.js al haber sesión)
    (function esperar(i) {
      if (window.MCCorazones) MCCorazones.alCambiar(function (e) { if (e) { miXp = +e.xp_semana || 0; pintar(); } });
      else if (i < 100) setTimeout(function () { esperar(i + 1); }, 200);
    })(0);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();

  window.MCTarjeta = {
    pintar: pintar, arte: arte, icono: icono, nivel: nivel, pin: pin, colores: RC,
    jugador: function () { return yo; },
    alJugador: function (fn) { oyentes.push(fn); if (yo) fn(yo); }
  };
})();
