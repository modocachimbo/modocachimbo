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
  var BASE = document.currentScript && document.currentScript.src ? document.currentScript.src.replace(/assets\/tarjeta-perfil\.js(\?.*)?$/, '') : '';
  // Color del texto de cada rango (el mismo de assets/rango.js)
  var RC = ['#5FDAFF', '#5FF59A', '#D79BFF', '#FF6E84', '#FFC800'];
  var miXp = null, yo = null, oyentes = [];
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // Nivel de jugador: sale de todo tu XP, sin tope. Cada nivel pide más XP
  // que el anterior (nivel 2 con 100 XP, 11 con 10 000, 101 con un millón).
  function nivel(xp) { return 1 + Math.floor(Math.sqrt(Math.max(0, +xp || 0) / 100)); }
  // Cuánto llevas del nivel actual (0 a 1): el nivel n va de 100·(n-1)² a 100·n² XP
  function avance(xp) { var n = nivel(xp), a = 100 * (n - 1) * (n - 1), b = 100 * n * n; return (Math.max(0, +xp || 0) - a) / (b - a); }

  // Mezcla dos colores #rrggbb (p = cuánto del segundo)
  function mezcla(a, b, p) {
    var x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16), r = '#';
    [16, 8, 0].forEach(function (s) { var v = Math.round(((x >> s) & 255) * (1 - p) + ((y >> s) & 255) * p); r += (v < 16 ? '0' : '') + v.toString(16); });
    return r;
  }
  // Paisaje de la tarjeta con los 4 colores de tu fondo: cielo, sol, estrellas, cerros y rayos de luz
  var nArte = 0;
  function arte(t, img) {
    // Fondo con imagen (recursos del panel): la foto con la misma sombra a la izquierda
    if (img) return '<span class="mct-arte" aria-hidden="true" style="background:linear-gradient(90deg,rgba(0,0,0,.38),rgba(0,0,0,0) 60%),url(&quot;' + esc(img) + '&quot;) center/cover no-repeat"></span>';
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
    '<linearGradient id="mct-hfue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF9A2E"/><stop offset="1" stop-color="#B3200B"/></linearGradient><linearGradient id="mct-hray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD24D"/><stop offset="1" stop-color="#C26A00"/></linearGradient><linearGradient id="mct-hmor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B983FF"/><stop offset="1" stop-color="#4A1A96"/></linearGradient><linearGradient id="mct-hlim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B8D400"/><stop offset="1" stop-color="#3F5200"/></linearGradient>' +
    '<symbol id="mct-racha" viewBox="0 0 32 32"><path d="M16 1.5 29 9v14L16 30.5 3 23V9z" fill="url(#mct-hfue)" stroke="#fff" stroke-opacity=".6" stroke-width="1.3"/><path d="M16 4.5 26.5 10.5" stroke="#fff" stroke-opacity=".35" stroke-width="1.2" fill="none"/><g fill="#fff"><path d="M16.5 6.5c.8 3.4 5.8 5.4 5.8 10.6a6.3 6.3 0 0 1-12.6 0c0-3 1.8-4.6 3.1-5.7.2 2 1 3 2.1 3.3-.6-3.2.1-6 1.6-8.2z"/><path d="M16.3 17.2c.4 1.6 2.6 2.5 2.6 4.6a2.9 2.9 0 0 1-5.8 0c0-1.2.6-1.9 1.2-2.4.1.8.5 1.2 1 1.4-.2-1.3 0-2.5 1-3.6z" fill="#C2360E"/></g></symbol>' +
    '<symbol id="mct-xp" viewBox="0 0 32 32"><path d="M16 1.5 29 9v14L16 30.5 3 23V9z" fill="url(#mct-hray)" stroke="#fff" stroke-opacity=".6" stroke-width="1.3"/><path d="M16 4.5 26.5 10.5" stroke="#fff" stroke-opacity=".35" stroke-width="1.2" fill="none"/><g fill="#fff"><path d="M18 6 9.8 17.4h5.4L13.6 26 22.2 14.3h-5.5z"/></g></symbol>' +
    '<symbol id="mct-mejor" viewBox="0 0 32 32"><path d="M16 1.5 29 9v14L16 30.5 3 23V9z" fill="url(#mct-hmor)" stroke="#fff" stroke-opacity=".6" stroke-width="1.3"/><path d="M16 4.5 26.5 10.5" stroke="#fff" stroke-opacity=".35" stroke-width="1.2" fill="none"/><g fill="#fff"><path d="M11 8h10v4.6a5 5 0 0 1-10 0z"/><path d="M11 9.6H8.6c0 2.7 1.5 3.9 3.2 3.9M21 9.6h2.4c0 2.7-1.5 3.9-3.2 3.9" fill="none" stroke="#fff" stroke-width="1.7"/><path d="M15 17.4h2v3.2h-2zM11.4 21h9.2v3.4h-9.2z"/></g></symbol>' +
    '<symbol id="mct-cofre" viewBox="0 0 32 32"><path d="M16 1.5 29 9v14L16 30.5 3 23V9z" fill="url(#mct-hlim)" stroke="#fff" stroke-opacity=".6" stroke-width="1.3"/><path d="M16 4.5 26.5 10.5" stroke="#fff" stroke-opacity=".35" stroke-width="1.2" fill="none"/><g fill="#fff"><path d="M8.5 15.2h15v7.6a1.2 1.2 0 0 1-1.2 1.2H9.7a1.2 1.2 0 0 1-1.2-1.2zM8.5 14c0-3.6 3-5.6 7.5-5.6s7.5 2 7.5 5.6z"/><path d="M14.5 12.6h3v4.6h-3z" fill="#4F6600"/></g></symbol>' +
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
    // Abajo, la barra de XP que falta para el siguiente nivel: sale del borde derecho de la foto (no tapa el nivel)
    T + '.mcu-chip.mct{--bi:68px}' +
    T + '.mcu-chip.mct::after{content:"";position:absolute;left:var(--bi);right:0;bottom:0;height:4px;background:rgba(0,0,0,.45)}' +
    T + '.mcu-chip.mct::before{content:"";position:absolute;z-index:2;left:var(--bi);bottom:0;height:4px;width:calc((100% - var(--bi)) * var(--pv,0));background:linear-gradient(90deg,#FFE14D,#FFC800);box-shadow:0 0 8px rgba(255,200,0,.7);transition:width .6s}' +
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
      'text-shadow:0 1px 0 #000,0 0 3px #000,0 0 8px rgba(0,0,0,.7);white-space:nowrap}' +
    T + '.mct-rg:empty{display:none}' +
    T + '.mct-rg b{color:var(--rc,#cfc8e6)}' +
    T + '.mct-rg i{width:22px;display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}' +
    T + '.mct-rg i svg, .mct-rg i .mc-rgo-em{width:100%;display:block}' +
    '@media (max-width:900px){' +
      T + '.mcu-chip.mct{height:60px;padding:0 30px 0 6px;gap:9px;clip-path:polygon(0 0,100% 0,calc(100% - 18px) 100%,0 100%)}' +
      T + '.mcu-chip.mct{--bi:52px}' + T + '.mct-caja{width:46px;height:46px}' + T + '.mct-marco{padding:2px}' +
      T + '.mct .mcu-av{font-size:20px}' +
      T + '.mct-nv{padding:1px 6px 0 4px;font-size:8px}' + T + '.mct-nv b{font-size:12px}' +
      T + '.mct-pin{width:19px;height:19px;right:-6px}' +
      T + '.mct .mcu-nom{font-size:21px;max-width:6.5em}' +
      T + '.mct-rg{font-size:12px;gap:4px}' + T + '.mct-rg i{width:16px}' +
    '}' +
    '@media (max-width:400px){' + T + '.mct .mcu-nom{font-size:18px;max-width:5.5em}' + T + '.mct-rg{font-size:11px;letter-spacing:.04em}}' +
    // Celular: corazones, racha y XP solo con el ícono, para que la tarjeta se vea completa.
    // Al tocar uno se abre su número; el segundo toque hace lo de siempre.
    '@media (max-width:360px){' +
      T + '.mcz-pill,' + T + '.mcu-racha{gap:0!important;padding:0 8px!important}' +
      T + '.mcz-pill>span,' + T + '.mcu-racha>span{display:inline-block;max-width:0;overflow:hidden;opacity:0;transition:max-width .25s ease,opacity .2s ease,margin .25s ease}' +
      T + '.mc-ver>span{max-width:4.5em;opacity:1;margin-left:5px}' +
    '}';
  var SOLO_ICONO = window.matchMedia ? window.matchMedia('(max-width:360px)') : { matches: false };
  var tVer = null;
  document.addEventListener('click', function (e) {
    if (!SOLO_ICONO.matches) return;
    var p = e.target.closest && e.target.closest('[data-mc-tarjeta] .mcz-pill, [data-mc-tarjeta] .mcu-racha');
    if (!p || p.classList.contains('mc-ver')) return;
    e.preventDefault(); e.stopPropagation();
    Array.prototype.forEach.call(document.querySelectorAll('[data-mc-tarjeta] .mc-ver'), function (x) { x.classList.remove('mc-ver'); });
    p.classList.add('mc-ver');
    clearTimeout(tVer); tVer = setTimeout(function () { p.classList.remove('mc-ver'); }, 3000);
  }, true);

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
    var marco = C ? C.marco() : '', tema = C ? C.tema() : ['#5b34b8', '#241452', '#4a2a9a', '#1a0f40'], fondo = C && C.fondo ? C.fondo() : '';
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
      if (chip.getAttribute('data-t') !== tema[0] + fondo) {
        chip.setAttribute('data-t', tema[0] + fondo);
        var viejo = chip.querySelector('.mct-arte'); if (viejo) viejo.remove();
        chip.insertAdjacentHTML('afterbegin', arte(tema, fondo));
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
      var pv = yo ? avance(yo.xp_total).toFixed(3) : '0';
      if (chip.style.getPropertyValue('--pv') !== pv) chip.style.setProperty('--pv', pv);
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

  /* ---------- Fotos de otros alumnos (tops, simulacro, perfil) y su tarjeta ---------- */
  // Los estilos de la tarjeta grande y de las fotos: assets/tarjeta-jugador.css
  function hoja() {
    if (document.querySelector('link[href*="tarjeta-jugador.css"]')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = BASE + 'assets/tarjeta-jugador.css?v=3';
    document.head.appendChild(l);
  }
  var GALAXIA = ['#5b34b8', '#241452', '#4a2a9a', '#1a0f40'];
  // Lo que lleva puesto un alumno: de los tops ({avatar, marco, fondo}) o de ver_jugador ({puesto: {...}})
  function vista(x) {
    var C = window.MCColeccion, img = x.foto || '', marco = '', tema = GALAXIA, fondo = '';
    if (C && x.yo) {
      marco = C.marco(); tema = C.tema(); fondo = C.fondo ? C.fondo() : '';
      var mia = document.querySelector('[data-mc-tarjeta] .mcu-av img');
      img = C.avatar() || (mia ? mia.src : img);
    } else if (C) {
      var p = x.puesto && typeof x.puesto === 'object' ? x.puesto : { avatar: x.avatar, marco: x.marco, racha: x.fondo };
      // Sin nada puesto lleva lo predeterminado: la cara del búho sobre Galaxia
      var at = C.item(p.avatar) || C.item(C.defecto.avatar), fo = p.racha && C.item(p.racha);
      if (p.marco && C.item(p.marco)) marco = C.marco(p.marco);
      tema = C.tema(fo ? p.racha : C.defecto.racha);
      fondo = fo && C.fondo ? C.fondo(p.racha) : '';
      if (at && (at.av || at.img)) img = C.avatar(at.id);
    }
    return { img: /^https:\/\//.test(img) || /assets\/buho\/avatar\//.test(img) ? img : '', marco: marco, tema: tema, fondo: fondo };
  }
  function inicial(nom) { return esc((String(nom || '?').trim()[0] || '?').toUpperCase()); }
  // Foto con marco y nivel; cls son las clases de cada página (le dan el tamaño).
  // Con ID se puede tocar para ver su tarjeta.
  function foto(x, cls) {
    hoja();
    var v = vista(x), xt = x.xp_total != null ? x.xp_total : x.yo && yo ? yo.xp_total : null;
    var cod = x.codigo || (x.yo && yo ? yo.codigo : ''), nom = x.yo ? 'tu perfil' : 'el perfil de ' + (x.apodo || 'este alumno');
    return '<span class="' + (cls || '') + ' mcj-f"' + (cod ? ' data-jug="' + esc(cod) + '" role="button" tabindex="0" aria-label="Ver ' + esc(nom) + '"' : '') +
      ' style="--f1:' + v.tema[0] + ';--f2:' + v.tema[3] + (v.marco ? ';--m:' + v.marco : '') + '"><i class="mcj-fr"><i class="mcj-av">' +
      (v.img ? '<img src="' + esc(v.img) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : inicial(x.apodo)) + '</i></i>' +
      (xt != null ? '<i class="mcj-nv">' + nivel(xt) + '</i>' : '') + '</span>';
  }

  // La tarjeta grande de otro alumno (lo que devuelve ver_jugador en supabase/38-ver-jugador.sql)
  function tarjetaHtml(d) {
    var C = window.MCColeccion, v = vista(d), p = d.puesto || {};
    var tit = C && (C.item(p.titulo) || C.item('titulo-cachimbo')), pin = null;
    if (d.admin) pin = { html: icono('ver'), nom: 'Verificado' };
    else if (C && p.pines && p.pines[0] && C.item(p.pines[0])) { var px = C.item(p.pines[0]); pin = { html: C.pin(px), nom: px.nom }; }
    var n = window.MCRango ? MCRango.nivel(d.xp_semana) : -1;
    var st = function (ic, val, lab) { return '<span class="pj-st">' + icono(ic) + '<b>' + val + '</b><small>' + lab + '</small></span>'; };
    var total = C ? C.contar().total : '';
    return '<section class="pj" style="--rc:' + (n < 0 ? '#cfc8e6' : RC[n]) + '"><div class="pj-card" style="--f1:' + v.tema[0] + ';--f2:' + v.tema[3] + '">' + arte(v.tema, v.fondo) +
      '<div class="pj-av"><span class="pj-fr"' + (v.marco ? ' style="--m:' + v.marco + '"' : '') + '><span class="pj-foto">' +
        (v.img ? '<img src="' + esc(v.img) + '" alt="" referrerpolicy="no-referrer">' : inicial(d.apodo)) + '</span></span>' +
        '<span class="pj-nv">Nvl <b>' + nivel(d.xp_total) + '</b></span>' +
        (pin ? '<span class="pj-pin" title="' + esc(pin.nom) + '">' + pin.html + '</span>' : '') + '</div>' +
      '<div class="pj-mid pj-sh"><div class="pj-nom">' + esc(d.apodo || 'Cachimbo') + '</div>' +
        (tit ? '<span class="pj-tit' + (tit.svg ? ' con-svg' : '') + '">' + C.titulo(tit) + '</span>' : '') +
        '<div class="pj-stats">' + st('racha', d.racha || 0, 'racha') + st('xp', (+d.xp_semana || 0).toLocaleString('es-PE'), 'XP') + st('mejor', d.mejor || 0, 'mejor') +
          st('cofre', (d.coleccion || 0) + (total ? '/' + total : ''), 'colección') + '</div></div>' +
      '<span class="pj-rk pj-sh' + (n < 0 ? ' sin' : '') + '"><span>' + (window.MCRango ? MCRango.svg(Math.max(n, 0), { quieto: true }) : '') + '</span><b>' + (n < 0 ? 'Sin rango' : MCRango.nombre(n)) + '</b><small>Rango semanal</small></span>' +
      '<span class="pj-uid pj-sh">ID <b>' + esc(d.codigo) + '</b></span></div></section>';
  }
  function ver(cod) {
    hoja(); css(); defs(); if (window.MCColeccion) MCColeccion.css();
    var ov = document.createElement('div'); ov.className = 'mcj-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    ov.innerHTML = '<div class="mcj-caja"><button type="button" class="mcj-x" aria-label="Cerrar">×</button><div class="mcj-in"><p class="mcj-msg">Cargando su tarjeta…</p></div></div>';
    function cerrar() { ov.classList.remove('ver'); document.removeEventListener('keydown', tecla); setTimeout(function () { ov.remove(); }, 250); }
    function tecla(e) { if (e.key === 'Escape') cerrar(); }
    ov.addEventListener('click', function (e) { if (e.target === ov || e.target.closest('.mcj-x')) cerrar(); });
    document.addEventListener('keydown', tecla);
    document.body.appendChild(ov);
    requestAnimationFrame(function () { requestAnimationFrame(function () { ov.classList.add('ver'); }); });
    var caja = ov.querySelector('.mcj-in');
    if (!window.MCAuth) { caja.innerHTML = '<p class="mcj-msg">Ingresa para ver su tarjeta.</p>'; return; }
    MCAuth.listo.then(function (sb) { return sb.rpc('ver_jugador', { p_codigo: +cod }); }).then(function (r) {
      if (!r || r.error || !r.data) throw new Error('sin datos');
      var d = r.data;
      caja.innerHTML = tarjetaHtml(d) + '<div class="mcj-acc">' + (d.yo
        ? '<a class="si" href="' + BASE + 'perfil.html"><span>Ir a mi perfil</span></a>'
        : '<button type="button" class="no" disabled><span>Agregar amigo <small>· muy pronto</small></span></button>') + '</div>';
    }).catch(function () { caja.innerHTML = '<p class="mcj-msg">No se pudo cargar su tarjeta. Intenta otra vez.</p>'; });
  }
  // Tocar (o Enter) cualquier foto con data-jug abre su tarjeta
  document.addEventListener('click', function (e) {
    var f = e.target.closest && e.target.closest('[data-jug]');
    if (!f) return;
    e.preventDefault(); e.stopPropagation(); ver(f.getAttribute('data-jug'));
  }, true);
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.getAttribute && e.target.getAttribute('data-jug')) { e.preventDefault(); ver(e.target.getAttribute('data-jug')); }
  });

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
    pintar: pintar, arte: arte, icono: icono, nivel: nivel, avance: avance, foto: foto, ver: ver, pin: pin, colores: RC,
    jugador: function () { return yo; },
    alJugador: function (fn) { oyentes.push(fn); if (yo) fn(yo); }
  };
})();
