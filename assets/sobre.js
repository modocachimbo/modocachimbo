/* =========================================================
   Modo Cachimbo · El sobre de regalo
   - Lo abre assets/corazones.js cuando llegan regalos (Panel → Regalos
     o Panel → Recursos): un sobre morado con el lacre del búho. Al
     tocarlo se rompe el sello, se abre la tapa, sale la carta con el
     mensaje y quién lo manda, y adentro los regalos.
   - window.MCSobre.abrir({ regalos, de, nota, iconos })
       regalos: [{ tipo: 'item', id } | { tipo: 'corazones'|'xp'|'infinito', cantidad }]
       iconos:  { corazon, xp } (svg de corazones.js)
     Devuelve una promesa que se cumple al cerrar.
   - Los ítems de Mi colección se dibujan con window.MCColeccion
     (si la página no la tiene, se carga sola).
   ========================================================= */
(function () {
  if (window.MCSobre) return;
  var script = document.currentScript;
  var BASE = script && script.src ? script.src.replace(/assets\/sobre\.js(\?.*)?$/, '') : './';
  var BUHO = BASE + 'assets/buho/avatar/clasico.webp';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var quieto = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function css() {
    if (document.getElementById('mcs-css')) return;
    var st = document.createElement('style'); st.id = 'mcs-css';
    st.textContent =
      '.mcs{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:16px;font-family:Nunito,sans-serif;color:#EEEAF7;-webkit-tap-highlight-color:transparent;overflow:hidden}' +
      '.mcs-fondo{position:absolute;inset:0;background:rgba(8,6,18,.86);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);opacity:0;transition:opacity .35s}' +
      '.mcs.ver .mcs-fondo{opacity:1}' +
      '.mcs-luz{position:absolute;left:50%;top:50%;width:620px;height:620px;margin:-310px 0 0 -310px;border-radius:50%;background:radial-gradient(circle,rgba(123,79,224,.42),rgba(198,224,0,.08) 45%,transparent 68%);opacity:0;transition:opacity .6s .2s;pointer-events:none}' +
      '.mcs.ver .mcs-luz{opacity:1}' +
      // Cerrado: título, sobre y botón
      '.mcs-cerrado{position:relative;display:flex;flex-direction:column;align-items:center;gap:clamp(34px,7vh,64px);transition:opacity .35s,transform .35s}' +
      '.mcs-tit{text-align:center;animation:mcsBaja .5s cubic-bezier(.2,1.2,.4,1) .15s both}' +
      '.mcs-tit small{display:block;font:1000 12px Nunito,sans-serif;letter-spacing:3px;color:#FFC800;text-transform:uppercase}' +
      '.mcs-tit h2{margin:6px 0 0;font:italic 900 clamp(38px,11vw,58px)/1 "Barlow Condensed",Nunito,sans-serif;text-transform:uppercase;letter-spacing:.01em;color:#fff;text-shadow:0 4px 0 rgba(0,0,0,.4)}' +
      '.mcs-tit h2 b{color:#C6E000}' +
      '.mcs-pie{display:flex;flex-direction:column;align-items:center;gap:12px;animation:mcsSube .4s ease-out .9s both}' +
      '.mcs-pie p{margin:0;font:900 14px Nunito,sans-serif;color:#A99FC8;letter-spacing:.3px}.mcs-pie p b{color:#fff}' +
      '.mcs-btn{font:1000 15px Nunito,sans-serif;text-transform:uppercase;letter-spacing:.6px;border-radius:16px;padding:14px 30px;border:2px solid;border-bottom-width:6px;cursor:pointer;white-space:nowrap;transition:transform .12s,border-bottom-width .12s}' +
      '.mcs-btn:active{transform:translateY(3px);border-bottom-width:3px}' +
      '.mcs-btn:focus{outline:none}.mcs-btn:focus-visible,.mcs-sobre:focus-visible{outline:3px solid #fff;outline-offset:3px}.mcs-sobre:focus{outline:none}' +
      '.mcs-btn.si{background:#C6E000;color:#1a1f00;border-color:#8fa300}' +
      // El sobre (todo dentro de su caja: nada se corta)
      '.mcs-sobre{position:relative;width:min(300px,78vw);aspect-ratio:300/220;cursor:pointer;animation:mcsLlega .8s cubic-bezier(.2,1.3,.4,1) both}' +
      '.mcs-sobre-in{position:absolute;inset:0;animation:mcsSacude 2.6s ease-in-out 1.2s infinite;transform-origin:50% 90%;perspective:900px}' +
      '.mcs-sobre:hover .mcs-sobre-in{animation-play-state:paused}' +
      '.mcs-atras{position:absolute;inset:0;border-radius:16px;z-index:1;background:#4a2a9a;box-shadow:0 22px 40px rgba(0,0,0,.55)}' +
      '.mcs-hoja{position:absolute;left:7%;right:7%;top:5%;height:72%;border-radius:12px;z-index:0;background:#F6F1FF;padding:12px 14px;color:#3b2a6e;font:900 12.5px Nunito,sans-serif;box-shadow:0 4px 0 rgba(0,0,0,.12);transition:transform .6s cubic-bezier(.3,1.25,.5,1),opacity .3s}' +
      '.mcs-para{position:absolute;left:6%;bottom:7%;z-index:4;font:900 12px Nunito,sans-serif;letter-spacing:1px;text-transform:uppercase;color:#E6DAFF;transition:opacity .2s}.mcs-para b{color:#C6E000}.mcs.abre .mcs-para{opacity:0}' +
      '.mcs-hoja i{display:block;height:8px;border-radius:4px;background:#e3d9fb;margin-top:8px}' +
      '.mcs-frente{position:absolute;inset:0;border-radius:16px;z-index:3;clip-path:polygon(0 30%,50% 64%,100% 30%,100% 100%,0 100%);background:linear-gradient(180deg,#7b4fe0,#4a2a9a)}' +
      '.mcs-borde{position:absolute;inset:0;border-radius:16px;border:3px solid #CE82FF;border-bottom-width:7px;border-bottom-color:#2e1a6b;pointer-events:none;z-index:3}' +
      '.mcs-tapa{position:absolute;left:0;right:0;top:0;height:64%;transform-origin:50% 0;z-index:4;transition:transform .5s cubic-bezier(.4,0,.2,1)}' +
      '.mcs-tapa:before{content:"";position:absolute;inset:0;clip-path:polygon(0 0,100% 0,50% 100%);background:linear-gradient(180deg,#8d63ee,#6a3fd0);border-radius:16px 16px 0 0}' +
      '.mcs-lacre{position:absolute;left:50%;top:64%;width:28%;aspect-ratio:1;transform:translate(-50%,-50%);z-index:5;border-radius:44% 56% 48% 52%;background:radial-gradient(circle at 35% 30%,#e6ff4d,#C6E000 45%,#8fa300);box-shadow:0 5px 0 #5f6d00;display:grid;place-items:center;animation:mcsBrilla 1.6s ease-in-out infinite}' +
      '.mcs-lacre img{width:78%;pointer-events:none}' +
      '.mcs-cinta{position:absolute;right:-8px;top:8%;z-index:7;background:#FF4B4B;color:#fff;font:1000 11px Nunito,sans-serif;letter-spacing:1px;padding:5px 10px;border-radius:8px;transform:rotate(8deg);box-shadow:0 3px 0 #a12424;transition:opacity .2s}' +
      '.mcs-chispa{position:absolute;left:50%;top:64%;width:8px;height:8px;margin:-4px;border-radius:50%;z-index:6;pointer-events:none}' +
      // Abriendo: se rompe el sello, la tapa gira, la hoja sube
      '.mcs.abre .mcs-sobre-in{animation:none}' +
      '.mcs.abre .mcs-lacre{animation:mcsRompe .35s ease-in forwards}' +
      '.mcs.abre .mcs-cinta{opacity:0}.mcs.abre .mcs-borde{border-top-color:transparent}' +
      '.mcs.abre .mcs-chispa{animation:mcsChispa .6s ease-out forwards}' +
      '.mcs.abre .mcs-tapa{transform:rotateX(180deg);transition-delay:.2s}' +
      '.mcs.abre .mcs-tapa{animation:mcsAtras .7s steps(1) forwards}' +
      '.mcs.abre .mcs-hoja{transform:translateY(-58%);transition-delay:.5s;animation:mcsHojaZ .45s steps(1) forwards}' +
      '.mcs.abre .mcs-tit{animation:mcsSeVa .35s ease-in forwards}' +
      '.mcs.abre .mcs-pie{animation:mcsSeVa .3s ease-in forwards}' +
      '.mcs.carta .mcs-cerrado{opacity:0;transform:translateY(60px) scale(.92);pointer-events:none}' +
      // La carta abierta
      '.mcs-carta{position:absolute;width:min(360px,calc(100vw - 32px));max-height:calc(100% - 32px);display:flex;flex-direction:column;border-radius:22px;overflow:hidden;background:#F6F1FF;color:#2b1f52;border-bottom:7px solid #c7b6f2;box-shadow:0 24px 60px rgba(0,0,0,.6);opacity:0;transform:translateY(70px) scale(.55);pointer-events:none}' +
      '.mcs.carta .mcs-carta{opacity:1;transform:none;pointer-events:auto;transition:transform .55s cubic-bezier(.2,1.25,.4,1),opacity .25s}' +
      '.mcs-cab{flex:none;display:flex;align-items:center;gap:10px;padding:12px 16px;background:linear-gradient(90deg,#5b34b8,#7b4fe0);color:#fff}' +
      '.mcs-cab b{font:italic 900 22px/1 "Barlow Condensed",Nunito,sans-serif;text-transform:uppercase;letter-spacing:.5px}' +
      '.mcs-cab span{margin-left:auto;font:1000 10px Nunito,sans-serif;letter-spacing:1.5px;background:#C6E000;color:#2b3300;border-radius:8px;padding:4px 8px}' +
      '.mcs-cuerpo{display:flex;flex-direction:column;min-height:0;flex:1}' +
      '.mcs-izq{flex:none}' +
      '.mcs-de{display:flex;align-items:center;gap:10px;padding:14px 16px 6px}' +
      '.mcs-de img{width:44px;height:44px;border-radius:12px;background:#5b34b8;border:2px solid #C6E000;flex:none}' +
      '.mcs-de small{display:block;font:900 11px Nunito,sans-serif;color:#8a7bb8;letter-spacing:1px;text-transform:uppercase}' +
      '.mcs-de b{font:1000 16px/1.2 Nunito,sans-serif}' +
      '.mcs-msj{margin:0 16px;padding:4px 0 12px;font:800 15px/1.45 Nunito,sans-serif;color:#3b2a6e;border-bottom:2px dashed #ddd2f7;overflow-wrap:anywhere}' +
      '.mcs-reg{display:flex;flex-direction:column;min-height:0;flex:1;padding:14px 16px 16px;background:linear-gradient(180deg,#efe7ff,#e4d8ff)}' +
      '.mcs-reg>small{font:1000 11px Nunito,sans-serif;letter-spacing:2px;color:#6a3fd0;text-transform:uppercase}' +
      '.mcs-fila{display:grid;grid-template-columns:repeat(auto-fit,minmax(92px,1fr));gap:10px;margin:10px 0 14px;overflow-y:auto;min-height:0;padding:6px 2px 4px;margin-left:-2px;margin-right:-2px}' +
      '.mcs-ft{position:relative;border-radius:14px;background:#1D1834;padding:10px 6px 8px;display:grid;justify-items:center;align-content:start;gap:5px;border-bottom:5px solid rgb(var(--c));opacity:0;transform:scale(.3) rotate(-8deg)}' +
      '.mcs.carta .mcs-ft{animation:mcsPop .5s cubic-bezier(.2,1.6,.4,1) both;animation-delay:calc(.45s + var(--i) * .09s)}' +
      '.mcs-ft:before{content:"";position:absolute;inset:0;border-radius:inherit;background:radial-gradient(circle at 50% 38%,rgba(var(--c),.4),transparent 62%);pointer-events:none}' +
      '.mcs-ft .mcs-d{position:relative;width:64px;height:64px;display:grid;place-items:center;overflow:hidden;border-radius:10px}' +
      '.mcs-ft .mcs-d>*{max-width:100%;max-height:100%}' +
      '.mcs-ft .mcs-d .mcc-dib{width:64px}' +
      '.mcs-ft .mcs-d svg{width:56px;height:56px}' +
      '.mcs-ft.ancho{grid-column:1/-1}.mcs .mcs-ft.ancho .mcs-d{width:100%;max-width:340px;height:auto;aspect-ratio:4/1}' +
      '.mcs-banner{display:block;width:100%;height:100%;border-radius:10px;box-shadow:inset 0 0 0 2px rgba(255,255,255,.12)}' +
      '.mcs-ft b{position:relative;font:900 11.5px/1.15 Nunito,sans-serif;color:#fff;text-align:center;overflow-wrap:anywhere}' +
      '.mcs-ft em{position:relative;font:1000 9.5px Nunito,sans-serif;font-style:normal;letter-spacing:1px;text-transform:uppercase;color:rgb(var(--c))}' +
      '.mcs-bts{flex:none;display:grid;gap:10px}' +
      '.mcs-bts .mcs-btn{width:100%}' +
      '.mcs-link{background:none;border:0;font:900 13px Nunito,sans-serif;color:#6a3fd0;text-decoration:underline;text-underline-offset:3px;cursor:pointer;padding:2px}' +
      '.mcs-conf{position:absolute;inset:0;pointer-events:none;overflow:hidden}' +
      '.mcs-conf i{position:absolute;top:-16px;width:8px;height:14px;border-radius:2px;animation:mcsCae 2.4s cubic-bezier(.3,.6,.6,1) both}' +
      // Al recibir: los regalos suben y se va todo
      '.mcs.fin .mcs-ft{animation:mcsVuela .5s ease-in forwards;animation-delay:calc(var(--i) * .06s)}' +
      '.mcs.fin .mcs-carta{opacity:0;transform:translateY(-30px) scale(.94);transition:transform .35s ease-in .25s,opacity .3s .3s}' +
      '.mcs.fin .mcs-fondo,.mcs.fin .mcs-luz{opacity:0;transition:opacity .35s .45s}' +
      // Celular bajito y PC
      '@media (max-height:700px){.mcs-cerrado{gap:22px}.mcs-sobre{width:min(250px,70vw)}.mcs-fila{grid-template-columns:repeat(auto-fit,minmax(80px,1fr));gap:8px}.mcs-ft .mcs-d,.mcs-ft .mcs-d .mcc-dib{width:50px;height:50px}.mcs-msj{font-size:14px}}' +
      '@media (min-width:760px){' +
        '.mcs-sobre{width:380px}.mcs-carta{width:min(760px,calc(100vw - 48px))}' +
        '.mcs-cuerpo{flex-direction:row}.mcs-izq{flex:1;padding-bottom:16px}.mcs-msj{border-bottom:0}' +
        '.mcs-reg{flex:1.1;border-left:2px dashed #ddd2f7}.mcs-ft .mcs-d,.mcs-ft .mcs-d .mcc-dib{width:76px;height:76px}}' +
      '@keyframes mcsLlega{0%{transform:translateY(-70vh) rotate(-14deg) scale(.7);opacity:0}60%{opacity:1}100%{transform:none}}' +
      '@keyframes mcsSacude{0%,72%,100%{transform:none}76%{transform:rotate(-5deg)}80%{transform:rotate(5deg)}84%{transform:rotate(-3deg)}88%{transform:rotate(2deg)}}' +
      '@keyframes mcsBrilla{0%,100%{box-shadow:0 5px 0 #5f6d00,0 0 0 0 rgba(198,224,0,.55)}50%{box-shadow:0 5px 0 #5f6d00,0 0 0 12px rgba(198,224,0,0)}}' +
      '@keyframes mcsRompe{40%{transform:translate(-50%,-50%) scale(1.25) rotate(-8deg)}100%{transform:translate(-50%,-50%) scale(0) rotate(40deg);opacity:0}}' +
      '@keyframes mcsChispa{0%{transform:none;opacity:1}100%{transform:translate(var(--x),var(--y)) scale(.3);opacity:0}}' +
      '@keyframes mcsAtras{0%{z-index:4}50%,100%{z-index:1}}' +
      '@keyframes mcsHojaZ{0%{z-index:0}100%{z-index:2}}' +
      '@keyframes mcsBaja{from{transform:translateY(-20px);opacity:0}to{transform:none;opacity:1}}' +
      '@keyframes mcsSube{from{transform:translateY(14px);opacity:0}to{transform:none;opacity:1}}' +
      '@keyframes mcsSeVa{to{transform:translateY(-10px);opacity:0}}' +
      '@keyframes mcsPop{from{opacity:0;transform:scale(.3) rotate(-8deg)}to{opacity:1;transform:none}}' +
      '@keyframes mcsVuela{to{opacity:0;transform:translateY(-60px) scale(.6)}}' +
      '@keyframes mcsCae{0%{transform:translateY(0) rotate(var(--r));opacity:1}100%{transform:translateY(105vh) rotate(calc(var(--r) + 540deg));opacity:.2}}' +
      '@media (prefers-reduced-motion:reduce){.mcs *,.mcs *:before{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;transition-delay:0s!important}.mcs-conf{display:none}}';
    document.head.appendChild(st);
  }

  // Cada regalo como una fichita: dibujo, nombre y rareza
  function ficha(g, i, iconos) {
    var C = window.MCColeccion, d = '', nom = '', sub = '', c = '198,224,0', ancho = false;
    if (g.tipo === 'item') {
      var x = C && C.item(g.id);
      if (!x) return '';
      var R = (C.rareza || {})[x.rareza] || { nom: '', c: '169,159,200' };
      // Banner: se ve entero y ancho (no la mini tarjeta, que en chiquito sale cortada)
      if (x.espacio === 'racha') { var t = x.tema || ['#2a1d5c', '', '', '#120d24']; ancho = true;
        d = '<span class="mcs-banner" style="background:' + (x.img ? 'url(&quot;' + esc(x.img) + '&quot;) center/cover,' : '') + 'linear-gradient(90deg,' + t[0] + ',' + t[3] + ')"></span>'; }
      else d = '<span class="mcc-dib">' + C.dibujo(x) + '</span>';
      nom = x.nom; sub = R.nom + (x.espacio === 'racha' ? ' · Banner' : ''); c = R.c;
    } else if (g.tipo === 'xp') {
      d = iconos.xp || '⚡'; nom = '+' + g.cantidad + ' XP'; sub = 'XP'; c = '255,200,0';
    } else if (g.tipo === 'infinito') {
      var h = +g.cantidad || 0;
      d = iconos.corazon || '❤'; nom = 'Corazones ∞'; sub = h % 24 ? h + (h === 1 ? ' hora' : ' horas') : h / 24 + (h === 24 ? ' día' : ' días'); c = '255,75,75';
    } else {
      d = iconos.corazon || '❤'; nom = '+' + g.cantidad + (g.cantidad === 1 ? ' corazón' : ' corazones'); sub = 'Vidas'; c = '255,75,75';
    }
    return '<div class="mcs-ft' + (ancho ? ' ancho' : '') + '" style="--c:' + c + ';--i:' + i + '"><span class="mcs-d">' + d + '</span><b>' + esc(nom) + '</b>' + (sub ? '<em>' + esc(sub) + '</em>' : '') + '</div>';
  }

  function confeti() {
    var col = ['#C6E000', '#FF9600', '#1CB0F6', '#CE82FF', '#FFC800'], h = '';
    for (var i = 0; i < 34; i++) h += '<i style="left:' + ((i * 29 + 7) % 100) + '%;background:' + col[i % 5] + ';--r:' + (i * 47) + 'deg;animation-delay:' + (i % 9) * 70 + 'ms"></i>';
    return h;
  }

  function abrir(o) {
    o = o || {};
    css(); if (window.MCColeccion && MCColeccion.css) MCColeccion.css();
    var regalos = o.regalos || [], iconos = o.iconos || {};
    var fichas = regalos.map(function (g, i) { return ficha(g, i, iconos); }).filter(Boolean);
    if (!fichas.length) return Promise.resolve();
    var nombre = '';
    try { var u = window.MCAuth && MCAuth.usuario(), m = (u && u.user_metadata) || {}; nombre = (m.full_name || m.name || '').split(' ')[0]; } catch (e) {}
    var de = o.de || 'Modo Cachimbo', hayItem = regalos.some(function (g) { return g.tipo === 'item'; });
    var msj = o.nota || (nombre ? '¡Hola ' + nombre + '! ' : '¡Hola! ') + 'Esto es para ti. Sigue practicando, vas muy bien.';
    var chispas = '', col = ['#C6E000', '#FFC800', '#CE82FF', '#fff'];
    for (var i = 0; i < 12; i++) { var a = i / 12 * Math.PI * 2, r = 70 + (i % 3) * 18; chispas += '<i class="mcs-chispa" style="background:' + col[i % 4] + ';--x:' + Math.round(Math.cos(a) * r) + 'px;--y:' + Math.round(Math.sin(a) * r) + 'px"></i>'; }

    var d = document.createElement('div');
    d.className = 'mcs'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', 'Te llegó un regalo');
    d.innerHTML = '<div class="mcs-fondo"></div><div class="mcs-luz"></div>' +
      '<div class="mcs-cerrado">' +
        '<div class="mcs-tit"><small>Correo del búho</small><h2>Tienes <b>1 sobre</b></h2></div>' +
        '<div class="mcs-sobre" role="button" tabindex="0" aria-label="Abrir el sobre"><div class="mcs-sobre-in">' +
          '<div class="mcs-atras"></div>' +
          '<div class="mcs-hoja">' + (nombre ? 'Para: ' + esc(nombre) : 'Para ti') + '<i></i><i style="width:70%"></i><i style="width:45%"></i></div>' +
          '<div class="mcs-frente"></div><div class="mcs-borde"></div>' +
          '<div class="mcs-para">Para: <b>' + esc(nombre || 'ti') + '</b></div>' +
          '<div class="mcs-tapa"></div>' +
          '<div class="mcs-lacre"><img src="' + esc(BUHO) + '" alt=""></div>' + chispas +
          '<div class="mcs-cinta">¡NUEVO!</div>' +
        '</div></div>' +
        '<div class="mcs-pie"><button type="button" class="mcs-btn si mcs-abrir">Abrir</button><p><b>Toca el sello</b> para romperlo</p></div>' +
      '</div>' +
      '<div class="mcs-conf"></div>' +
      '<div class="mcs-carta" aria-live="polite">' +
        '<div class="mcs-cab"><b>Un regalo para ti</b><span>REGALO</span></div>' +
        '<div class="mcs-cuerpo">' +
          '<div class="mcs-izq"><div class="mcs-de"><img src="' + esc(BUHO) + '" alt=""><div><small>De</small><b>' + esc(de) + '</b></div></div>' +
          '<p class="mcs-msj">' + esc(msj) + '</p></div>' +
          '<div class="mcs-reg"><small>Dentro del sobre</small><div class="mcs-fila">' + fichas.join('') + '</div>' +
          '<div class="mcs-bts"><button type="button" class="mcs-btn si mcs-recibir">' + (fichas.length > 1 ? 'Recibir todo' : 'Recibir') + '</button>' +
          (hayItem && !/coleccion\.html/.test(location.pathname) ? '<button type="button" class="mcs-link mcs-ver">Verlo en mi colección</button>' : '') + '</div></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(d);
    var antes = document.activeElement;
    requestAnimationFrame(function () { requestAnimationFrame(function () { d.classList.add('ver'); }); });
    try { if (window.MCSonido && MCSonido.racha) setTimeout(function () { MCSonido.racha(); }, 350); } catch (e) {}
    var sobre = d.querySelector('.mcs-sobre');

    var abierto = false, listo;
    var fin = new Promise(function (r) { listo = r; });
    function abrirSobre() {
      if (abierto) return; abierto = true;
      d.classList.add('abre');
      try { if (window.MCSonido && MCSonido.racha) MCSonido.racha(); } catch (e) {}
      if (navigator.vibrate) try { navigator.vibrate(30); } catch (e) {}
      setTimeout(function () {
        d.classList.add('carta');
        d.querySelector('.mcs-conf').innerHTML = quieto ? '' : confeti();
      }, quieto ? 0 : 1150);
    }
    function cerrar(ir) {
      if (d.classList.contains('fin')) return;
      d.classList.add('fin');
      document.removeEventListener('keydown', tecla);
      setTimeout(function () {
        d.remove();
        try { if (antes && antes.focus) antes.focus({ preventScroll: true }); } catch (e) {}
        listo();
        if (ir) location.href = BASE + 'coleccion.html';
      }, quieto ? 0 : 850);
    }
    function tecla(e) {
      if (e.key === 'Escape') { if (abierto) cerrar(); else abrirSobre(); }
      else if ((e.key === 'Enter' || e.key === ' ') && document.activeElement === sobre) { e.preventDefault(); abrirSobre(); }
    }
    document.addEventListener('keydown', tecla);
    sobre.addEventListener('click', abrirSobre);
    d.querySelector('.mcs-abrir').addEventListener('click', abrirSobre);
    d.querySelector('.mcs-recibir').addEventListener('click', function () { cerrar(); });
    var ver = d.querySelector('.mcs-ver'); if (ver) ver.addEventListener('click', function () { cerrar(true); });
    return fin;
  }

  window.MCSobre = { abrir: abrir };
})();
