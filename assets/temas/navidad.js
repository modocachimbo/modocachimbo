/* =========================================================
   Modo Cachimbo · Temática de Navidad
   La carga assets/tema.js solo cuando Navidad está activa.
   Se queda el verde lima de siempre (es verde navideño) y se suman
   rojo y dorado: nieve ligera (solo CSS), guirnalda de luces, escena
   nevada detrás del búho, gorro navideño y campanitas al acertar.
   Todo dibujado en código: sin imágenes nuevas que descargar.
   ========================================================= */
(function () {
  window.MCTemas = window.MCTemas || {};
  MCTemas.navidad = function (c, h) {
    var hoyLima = h.hoyLima;
    var raiz = document.documentElement, quitar = [];
    var ROJO = '#E8323C', ROJO_D = '#9E1620', ORO = '#FFC83D', LIMA = '#C6E000', HIELO = '#BFE6FF';

    var REGALO = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 20c-6-10-18-12-18-4 0 5 9 6 18 4zM32 20c6-10 18-12 18-4 0 5-9 6-18 4z" fill="' + ORO + '" stroke="#B8860B" stroke-width="2"/>' +
      '<rect x="10" y="20" width="44" height="12" rx="2" fill="' + ROJO + '"/><rect x="13" y="32" width="38" height="26" rx="2" fill="#C41E2A"/>' +
      '<rect x="28" y="20" width="8" height="38" fill="' + ORO + '"/><rect x="10" y="20" width="44" height="4" fill="#fff" opacity=".18"/></svg>';
    var COPO = function (col) { return '<svg viewBox="0 0 40 40" aria-hidden="true"><g stroke="' + (col || '#fff') + '" stroke-width="3" stroke-linecap="round" fill="none"><path d="M20 3v34M5.3 11.5l29.4 17M5.3 28.5l29.4-17"/><path d="M15 6l5 4 5-4M15 34l5-4 5 4M5 17l6 0-2-6M35 23l-6 0 2 6M5 23l6 0-2 6M35 17l-6 0 2-6"/></g></svg>'; };
    var ESTRELLA = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 2l5 12 13 1-10 8 3 13-11-7-11 7 3-13L2 15l13-1z" fill="' + ORO + '" stroke="#B8860B" stroke-width="1.5"/></svg>';
    var CAMPANA = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 5c-7 0-11 5-11 12v8l-4 5h30l-4-5v-8c0-7-4-12-11-12z" fill="' + ORO + '" stroke="#B8860B" stroke-width="1.5"/><circle cx="20" cy="33" r="3.5" fill="#B8860B"/><path d="M14 9q-3 4-3 9" stroke="#fff" stroke-width="2" fill="none" opacity=".55"/><path d="M15 4q5-3 10 0" stroke="' + ROJO + '" stroke-width="3" fill="none"/></svg>';
    // Gorro para el búho dibujado en código (assets/buho.js, viewBox 200x210)
    var GORRO = '<g class="acc-gorro">' +
      '<path d="M54 52C60 22 86 4 116 8c22 3 38 18 44 38-10-8-22-12-30-6 2 6 2 12 0 16z" fill="' + ROJO + '"/>' +
      '<path d="M116 8c22 3 38 18 44 38-6-4-12-7-18-7-6-14-14-24-26-31z" fill="' + ROJO_D + '" opacity=".6"/>' +
      '<circle cx="160" cy="50" r="12" fill="#fff"/><circle cx="156" cy="46" r="4" fill="#E9F4FF"/>' +
      '<rect x="44" y="46" width="112" height="20" rx="10" fill="#fff"/><path d="M52 58q48 6 96 0" stroke="#DCEBF7" stroke-width="4" fill="none"/></g>';
    // Gorro grande encima del búho del inicio (su imagen)
    var GORRO_IMG = '<svg viewBox="0 0 140 100" aria-hidden="true">' +
      '<path d="M18 74C22 36 50 8 86 10c22 1 38 14 46 34-8-4-18-4-24 2 4 8 4 18 0 28z" fill="' + ROJO + '"/>' +
      '<path d="M86 10c22 1 38 14 46 34-6-3-12-4-18-2C106 26 96 16 86 10z" fill="' + ROJO_D + '" opacity=".55"/>' +
      '<path d="M34 40c8-14 22-24 40-26" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".22"/>' +
      '<circle cx="128" cy="48" r="12" fill="#fff"/><circle cx="124" cy="44" r="4" fill="#E9F4FF"/>' +
      '<rect x="6" y="66" width="122" height="24" rx="12" fill="#fff"/><path d="M14 80q53 7 106 0" stroke="#DCEBF7" stroke-width="5" fill="none"/></svg>';
    // Gorrito mini para los botones del costado y los cursos
    var GORRITO = 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 32"><path d="M6 24C8 12 16 4 26 5c6 1 10 5 12 11-3-1-6 0-7 2 1 2 1 4 0 6z" fill="' + ROJO + '"/><circle cx="36" cy="17" r="4" fill="#fff"/><rect x="3" y="22" width="30" height="8" rx="4" fill="#fff"/></svg>') + '")';
    // Nieve acumulada (encima de las tarjetas)
    var NIEVE_TOPE = 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 16" preserveAspectRatio="none"><path d="M0 0H200V7c-6 0-6 6-12 6s-6-4-12-4-8 7-14 7-6-5-12-5-7 4-13 4-6-6-12-6-8 8-15 8-6-5-12-5-6 3-12 3-7-6-13-6-6 5-12 5-7-4-13-4-6 6-12 6-8-5-14-5-6 3-12 3-6-4-12-4V0z" fill="#F4FAFF"/><path d="M0 0h200v2.5H0z" fill="#fff"/></svg>') + '")';

    raiz.classList.add('tema-navidad');
    quitar.push(function () { raiz.classList.remove('tema-navidad'); });

    /* ---------- estilos ---------- */
    var st = document.createElement('style'); st.id = 'mcTemaCss';
    st.textContent = [
      // Noche de invierno: azul muy oscuro; el lima de siempre se queda
      'html.tema-navidad{--bg:#060a16;--surface:#0d1424;--surface-2:#101a2c;--border:#1d2a44;' +
        'background:radial-gradient(1000px 560px at 85% -10%,rgba(60,120,255,.20),transparent 62%),radial-gradient(900px 520px at -5% 108%,rgba(232,50,60,.12),transparent 60%),linear-gradient(180deg,#0a1124 0%,#060a16 60%,#04070f 100%) fixed #060a16;scrollbar-color:#24365a #060a16}',
      'html.tema-navidad body{background:transparent!important}',
      // Saludo con regalo
      '.nav-reg{display:inline-block;width:.95em;height:.95em;margin-left:.18em;vertical-align:-.1em;transform-origin:50% 90%;animation:navBail 2.6s ease-in-out infinite}',
      '.nav-reg svg{width:100%;height:100%;display:block;filter:drop-shadow(0 0 8px rgba(255,200,61,.45))}',
      '@keyframes navBail{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg) translateY(-2px)}}',
      // Guirnalda de luces arriba de la pantalla
      '.nav-luces{position:fixed;left:0;right:0;top:-2px;height:30px;z-index:70;pointer-events:none;overflow:hidden}',
      '.nav-luces svg{display:block;width:100%;height:30px}',
      '.nav-luces .f{animation:navFoco 2.4s ease-in-out infinite}',
      '.nav-luces .f.b{animation-delay:-.8s}.nav-luces .f.c{animation-delay:-1.6s}',
      '@keyframes navFoco{0%,100%{opacity:1}50%{opacity:.35}}',
      // Nieve que cae: 3 capas de puntitos (solo CSS, sin imágenes)
      '.nav-nieve{position:fixed;inset:0;z-index:65;pointer-events:none;opacity:.75}',
      '.nav-nieve i{position:absolute;inset:-100% 0 0;background-repeat:repeat;animation:navCae linear infinite}',
      '.nav-nieve i:nth-child(1){background-image:radial-gradient(2px 2px at 20px 30px,#fff 50%,transparent 51%),radial-gradient(1.6px 1.6px at 120px 90px,#fff 50%,transparent 51%),radial-gradient(2.2px 2.2px at 200px 160px,#fff 50%,transparent 51%);background-size:240px 240px;animation-duration:22s}',
      '.nav-nieve i:nth-child(2){background-image:radial-gradient(3px 3px at 60px 50px,#fff 50%,transparent 51%),radial-gradient(2.4px 2.4px at 250px 210px,#eaf6ff 50%,transparent 51%);background-size:320px 320px;animation-duration:16s;opacity:.85}',
      '.nav-nieve i:nth-child(3){background-image:radial-gradient(4px 4px at 140px 120px,#fff 50%,transparent 51%);background-size:420px 420px;animation-duration:11s;opacity:.6;filter:blur(.6px)}',
      '@keyframes navCae{from{transform:translate3d(0,0,0)}to{transform:translate3d(40px,50%,0)}}',
      // Fondo: estrellas y pinos nevados abajo (detrás de todo)
      '.nav-deco{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden}',
      '.nav-estrellas{position:absolute;inset:0;background-image:radial-gradient(1.4px 1.4px at 12% 18%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 28% 8%,#fff 50%,transparent 51%),radial-gradient(1.2px 1.2px at 46% 22%,#dff0ff 50%,transparent 51%),radial-gradient(1px 1px at 63% 12%,#fff 50%,transparent 51%),radial-gradient(1.5px 1.5px at 74% 34%,#fff3c9 50%,transparent 51%),radial-gradient(1px 1px at 91% 52%,#fff 50%,transparent 51%),radial-gradient(1.2px 1.2px at 6% 46%,#dff0ff 50%,transparent 51%),radial-gradient(1px 1px at 35% 40%,#fff 50%,transparent 51%);opacity:.5;animation:navCentella 6s ease-in-out infinite}',
      '@keyframes navCentella{0%,100%{opacity:.3}50%{opacity:.65}}',
      '.nav-pinos{position:absolute;left:0;right:0;bottom:0;height:clamp(120px,24vh,240px)}',
      '.nav-pinos svg{position:absolute;left:50%;bottom:0;height:100%;width:auto;min-width:100%;transform:translateX(-50%)}',
      // Tarjetas: vidrio azul oscuro con nieve acumulada encima
      'html.tema-navidad .juego,html.tema-navidad .curso,html.tema-navidad .course,html.tema-navidad .card,html.tema-navidad .year-card,html.tema-navidad .tema-card{overflow:visible}',
      'html.tema-navidad .juego::after,html.tema-navidad .course::after,html.tema-navidad .year-card::after{content:"";position:absolute;left:-2px;right:-2px;top:-5px;height:12px;background:' + NIEVE_TOPE + ' 0 0/100% 100% no-repeat;pointer-events:none;z-index:3;filter:drop-shadow(0 2px 2px rgba(0,0,0,.25))}',
      'html.tema-navidad .juego{overflow:hidden;clip-path:none}',
      // Botones del costado y cursos: gorrito navideño
      'html.tema-navidad .acceso::before{content:"";position:absolute;left:-8px;top:-12px;width:30px;height:24px;background:' + GORRITO + ' center/contain no-repeat;rotate:-16deg;pointer-events:none;z-index:2}',
      'html.tema-navidad .curso .ic{position:relative;overflow:visible;clip-path:none!important;border-radius:12px}',
      'html.tema-navidad .curso .ic::after{content:"";position:absolute;left:50%;top:-14px;width:30px;height:24px;translate:-46% 0;rotate:-10deg;background:' + GORRITO + ' center/contain no-repeat}',
      // Botón principal: brillo que pasa, como escarcha
      'html.tema-navidad .btn-prin{position:relative;overflow:hidden}',
      'html.tema-navidad .btn-prin::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 35%,rgba(255,255,255,.45) 50%,transparent 65%);transform:translateX(-120%);animation:navBrillo 5s ease-in-out infinite}',
      '@keyframes navBrillo{0%,60%{transform:translateX(-120%)}100%{transform:translateX(120%)}}',
      // Perfil: portada nevada
      'html.tema-navidad .banda{background:radial-gradient(50px 50px at 84% 30%,#FFF6D8 0 36%,rgba(255,230,160,.3) 37%,transparent 62%),linear-gradient(160deg,#16305c,#0b1830 55%,#3a0d16)!important}',
      'html.tema-navidad .mc-buho{overflow:visible}',
      // Escena del búho: noche nevada con pueblito
      'html.tema-navidad .escena{background:radial-gradient(40% 32% at 50% 58%,rgba(120,190,255,.28),transparent 72%),radial-gradient(1.2px 1.2px at 14% 12%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 33% 22%,#dff0ff 50%,transparent 51%),radial-gradient(1.4px 1.4px at 61% 8%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 78% 30%,#dff0ff 50%,transparent 51%),radial-gradient(1.2px 1.2px at 46% 34%,#fff 50%,transparent 51%),linear-gradient(#081127,#12285a 55%,#1b3d78 72%,#0b1730)!important}',
      'html.tema-navidad .escena .nubes{display:none}',
      'html.tema-navidad .escena::before{opacity:.35;filter:hue-rotate(160deg)}',
      'html.tema-navidad .escena .halo{border:0!important;background:radial-gradient(circle,rgba(255,215,120,.28),transparent 65%)!important;animation:navLatido 3.4s ease-in-out infinite}',
      '@keyframes navLatido{50%{opacity:.6;transform:scale(1.06)}}',
      '.nav-pueblo{position:absolute;inset:0;z-index:-1;pointer-events:none}',
      '.nav-pueblo svg{position:absolute;left:0;bottom:0;width:100%;height:100%}',
      '.nav-pueblo .v{animation:navVentana 3s ease-in-out infinite}.nav-pueblo .v.b{animation-delay:-1.1s}.nav-pueblo .v.c{animation-delay:-2s}',
      '@keyframes navVentana{0%,100%{opacity:1}50%{opacity:.6}}',
      '.nav-pueblo .f{animation:navFoco 1.8s ease-in-out infinite}.nav-pueblo .f.b{animation-delay:-.6s}.nav-pueblo .f.c{animation-delay:-1.2s}',
      '.nav-pueblo .est{transform-box:fill-box;transform-origin:50% 50%;animation:navEst 2.6s ease-in-out infinite}',
      '@keyframes navEst{50%{transform:scale(1.18);opacity:.8}}',
      // Estrella fugaz
      '.nav-fugaz{position:absolute;left:8%;top:10%;width:90px;height:2px;border-radius:2px;background:linear-gradient(90deg,transparent,#fff);opacity:0;rotate:-24deg;animation:navFugaz 9s ease-in infinite}',
      '@keyframes navFugaz{0%,82%{opacity:0;transform:translateX(0)}86%{opacity:1}100%{opacity:0;transform:translateX(300px)}}',
      // Nieve en la plataforma del búho
      'html.tema-navidad .escena{--plat-borde:#CFEFFF;--plat-a:#6FB6EA;--plat-b:#1F4F8F;--plat-brillo:rgba(255,255,255,.55)}',
      // Gorro encima del búho del inicio
      '.nav-gorro{position:absolute;z-index:3;left:25%;top:-12%;width:54%;rotate:-8deg;pointer-events:none;transform-origin:50% 100%;animation:navGorro 3.2s ease-in-out infinite;filter:drop-shadow(0 4px 4px rgba(0,0,0,.35))}',
      '.nav-gorro svg{display:block;width:100%}',
      '@keyframes navGorro{0%,100%{transform:translateY(0)}50%{transform:translateY(-2.5%)}}',
      '.nav-gorro.dj{top:-6%}',
      // Evento en "fechas" del inicio
      '.f-navi{--fc:' + ROJO + '}.f-navi .fi{background:#5c0d14!important;box-shadow:inset 0 0 0 2px ' + ORO + '}',
      '.nav-eyebrow{display:inline-flex;align-items:center;gap:6px;margin-bottom:6px;font:1000 11.5px Nunito,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:' + ORO + ';text-shadow:0 0 12px rgba(255,200,61,.45)}',
      '.nav-eyebrow svg{width:14px;height:14px}',
      // Efectos al responder
      '.nav-pop{position:fixed;z-index:9999;pointer-events:none;width:34px;left:50%;bottom:90px;animation:navPop 1.4s cubic-bezier(.2,.7,.3,1) forwards}',
      '.nav-pop svg{display:block;width:100%}',
      '@keyframes navPop{0%{transform:translate(-50%,0) scale(.3) rotate(0);opacity:0}15%{opacity:1}100%{transform:translate(calc(-50% + var(--dx)),var(--dy)) scale(1) rotate(var(--r));opacity:0}}',
      '.nav-derrite{position:fixed;z-index:9999;pointer-events:none;width:46px;left:calc(50% - 23px);bottom:90px;animation:navDerrite 1.4s ease-in forwards;filter:drop-shadow(0 0 10px rgba(190,230,255,.7))}',
      '.nav-derrite svg{display:block;width:100%}',
      '@keyframes navDerrite{0%{transform:translateY(-20px) scale(.6);opacity:0}25%{opacity:1;transform:translateY(0) scale(1)}100%{transform:translateY(60px) scale(.5,.2);opacity:0}}',
      '@media (max-width:560px){.nav-luces,.nav-luces svg{height:22px}.nav-gorro{top:-16%}.nav-pinos{height:16vh}.nav-pinos svg{transform:translateX(-62%)}.nav-nieve{opacity:.6}html.tema-navidad .acceso::before{width:24px;height:19px;left:-6px;top:-9px}}',
      '@media (prefers-reduced-motion:reduce){.nav-nieve,.nav-fugaz{display:none}.nav-deco *,.nav-luces *,.nav-reg,.nav-gorro,.nav-pueblo *,html.tema-navidad .btn-prin::after{animation:none!important}}'
    ].join('\n');
    (document.head || raiz).appendChild(st);
    quitar.push(function () { st.remove(); });

    /* ---------- luces, nieve y fondo ---------- */
    function guirnalda() {
      var COL = [ROJO, ORO, LIMA, '#4FB8FF'], focos = '', cable = 'M0 6';
      for (var x = 0; x <= 2000; x += 60) {
        cable += ' Q' + (x + 30) + ' 18 ' + (x + 60) + ' 6';
        var k = (x / 60) % 4, cl = ['', ' b', ' c', ' b'][k];
        focos += '<g class="f' + cl + '"><rect x="' + (x + 27) + '" y="12" width="6" height="5" rx="1" fill="#2a3550"/><ellipse cx="' + (x + 30) + '" cy="22" rx="4.5" ry="6" fill="' + COL[k] + '"/><ellipse cx="' + (x + 30) + '" cy="22" rx="9" ry="10" fill="' + COL[k] + '" opacity=".25"/></g>';
      }
      return '<svg viewBox="0 0 2000 30" preserveAspectRatio="xMinYMin slice"><path d="' + cable + '" stroke="#1d2a44" stroke-width="2" fill="none"/>' + focos + '</svg>';
    }
    var luces = document.createElement('div'); luces.className = 'nav-luces'; luces.setAttribute('aria-hidden', 'true'); luces.innerHTML = guirnalda();
    var nieve = document.createElement('div'); nieve.className = 'nav-nieve'; nieve.setAttribute('aria-hidden', 'true'); nieve.innerHTML = '<i></i><i></i><i></i>';
    var PINO = function (x, y, s, f) { return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"><path d="M0-120 34-60H18L46-14H24L56 30H-56L-24-14H-46L-18-60H-34z" fill="' + (f || '#0c2a22') + '"/><path d="M0-120 14-95-10-88zM-18-60l20-8 14 8-10 6zM-24-14l26-9 22 9-14 7z" fill="#EAF4FF" opacity=".85"/><rect x="-7" y="30" width="14" height="16" fill="#2a1a12"/></g>'; };
    var deco = document.createElement('div'); deco.className = 'nav-deco'; deco.setAttribute('aria-hidden', 'true');
    deco.innerHTML = '<div class="nav-estrellas"></div><div class="nav-pinos"><svg viewBox="0 0 1600 240" preserveAspectRatio="xMidYMax slice">' +
      '<path d="M0 240V150q160-40 330-14t330-20 300 26 320-30 320 24v104z" fill="#0b1630"/>' +
      PINO(90, 180, .9) + PINO(170, 196, .6, '#0a241d') + PINO(1460, 176, 1) + PINO(1540, 198, .62, '#0a241d') + PINO(1330, 204, .5, '#0a241d') +
      '<path d="M0 240v-40q200-16 400-6t400-8 400 10 400-6v50z" fill="#DDEBF8"/><path d="M0 240v-28q200-10 400-4t400-6 400 8 400-4v34z" fill="#B8CDE4"/></svg></div>';
    function ponerDeco() {
      if (!document.body || deco.parentNode) return;
      document.body.insertBefore(deco, document.body.firstChild);
      document.body.appendChild(nieve); document.body.appendChild(luces);
    }
    if (document.body) ponerDeco(); else document.addEventListener('DOMContentLoaded', ponerDeco);
    quitar.push(function () { deco.remove(); nieve.remove(); luces.remove(); });

    /* ---------- búho con gorro navideño (todas las páginas) ---------- */
    function gorros() {
      if (!window.MCBuho) return;
      MCBuho.accesorio = GORRO;
      document.querySelectorAll('.mc-buho .b-cuerpo').forEach(function (g) { if (!g.querySelector('.acc-gorro')) g.insertAdjacentHTML('beforeend', GORRO); });
    }

    /* ---------- inicio: saludo, escena nevada y gorro ---------- */
    var EN_INICIO = /(^|\/)(index\.html)?$/.test(location.pathname);
    var PUEBLO = '<svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMax slice">' +
      '<defs><radialGradient id="ncLuz"><stop offset="0" stop-color="#FFD27A" stop-opacity=".75"/><stop offset="1" stop-color="#FFB347" stop-opacity="0"/></radialGradient></defs>' +
      // luna
      '<circle cx="318" cy="70" r="24" fill="#FFF6DD" opacity=".95"/><circle cx="318" cy="70" r="50" fill="#FFF1C0" opacity=".1"/>' +
      // montañas nevadas
      '<path d="M0 290 60 230l40 30 70-80 60 70 50-40 120 90v100H0z" fill="#0c1a3a"/>' +
      '<path d="M0 300 70 200l40 40 60-90 70 100 50-60 110 110v100H0z" fill="#10234a"/>' +
      '<path d="M70 200 56 220l6-4 6 6 8-6 8 6 6-2zM170 150l-20 30 8-5 8 7 10-8 8 7 7-1zM290 190l-17 20 7-4 8 6 9-7 7 6 6-1z" fill="#E6F1FC"/>' +
      // pinos con luces (izquierda)
      '<g transform="translate(48 318)"><path d="M0-96 26-50H13L36-12H18L44 24H-44L-18-12H-36L-13-50H-26z" fill="#0f3a2c"/><path d="M0-96 11-76-8-70zM-13-50l15-6 11 6-8 5zM-18-12l20-7 18 7-11 5z" fill="#EAF4FF" opacity=".9"/>' +
        '<circle class="f" cx="-8" cy="-40" r="3" fill="' + ROJO + '"/><circle class="f b" cx="10" cy="-26" r="3" fill="' + ORO + '"/><circle class="f c" cx="-16" cy="-2" r="3" fill="#4FB8FF"/><circle class="f" cx="16" cy="8" r="3" fill="' + LIMA + '"/><circle class="f b" cx="-2" cy="14" r="3" fill="' + ROJO + '"/>' +
        '<path class="est" d="M0-108l3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z" fill="' + ORO + '"/><rect x="-6" y="24" width="12" height="12" fill="#2a1a12"/></g>' +
      '<g transform="translate(100 330) scale(.62)"><path d="M0-96 26-50H13L36-12H18L44 24H-44L-18-12H-36L-13-50H-26z" fill="#0c3024"/><path d="M0-96 11-76-8-70zM-13-50l15-6 11 6-8 5z" fill="#EAF4FF" opacity=".85"/><rect x="-6" y="24" width="12" height="12" fill="#2a1a12"/></g>' +
      // casitas con ventanas encendidas (derecha)
      '<g><path d="M300 318v-44l30-24 30 24v44z" fill="#3b1d24"/><path d="M294 278l36-30 36 30-6 4-30-24-30 24z" fill="#EAF4FF"/>' +
        '<rect x="312" y="288" width="12" height="12" rx="1" fill="#FFC861" class="v"/><rect x="336" y="288" width="12" height="12" rx="1" fill="#FFC861" class="v b"/><circle cx="330" cy="295" r="22" fill="url(#ncLuz)"/>' +
        '<rect x="344" y="244" width="8" height="18" fill="#2a1418"/><path d="M342 244h12v-4h-12z" fill="#EAF4FF"/></g>' +
      '<g><path d="M360 322v-30l20-16 20 16v30z" fill="#2c1820"/><path d="M356 294l24-20 24 20-4 3-20-16-20 16z" fill="#EAF4FF"/><rect x="374" y="300" width="10" height="10" rx="1" fill="#FFC861" class="v c"/></g>' +
      // guirnalda entre casitas
      '<path d="M300 280q-30 16-60 2" stroke="#24334f" stroke-width="1.2" fill="none"/><circle class="f" cx="290" cy="286" r="2.4" fill="' + ROJO + '"/><circle class="f b" cx="270" cy="290" r="2.4" fill="' + ORO + '"/><circle class="f c" cx="252" cy="287" r="2.4" fill="' + LIMA + '"/>' +
      // muñeco de nieve
      '<g transform="translate(262 318)"><circle cy="-6" r="13" fill="#F2F8FF"/><circle cy="-24" r="9" fill="#F2F8FF"/><circle cx="-3" cy="-26" r="1.3" fill="#1a1a2a"/><circle cx="3" cy="-26" r="1.3" fill="#1a1a2a"/><path d="M0-23l7 2-7 1z" fill="#FF8A1F"/>' +
        '<path d="M-9-17h18v4h-18z" fill="' + ROJO + '"/><path d="M5-15h4v9h-4z" fill="' + ROJO + '"/><rect x="-7" y="-38" width="14" height="6" fill="#1a1a2a"/><rect x="-10" y="-33" width="20" height="3" fill="#1a1a2a"/></g>' +
      // suelo nevado a la altura de la plataforma
      '<path d="M0 318q100-12 200-6t200-8v96H0z" fill="#DCEBFA"/><path d="M0 330q100-10 200-4t200-6v80H0z" fill="#B9CFE6"/><path d="M0 350q120-8 220-2t180-4v56H0z" fill="#8FAACB"/>' +
      // regalos al pie
      '<g transform="translate(96 336)"><rect x="-12" y="-10" width="24" height="18" fill="' + ROJO + '"/><rect x="-2" y="-10" width="4" height="18" fill="' + ORO + '"/><rect x="-13" y="-13" width="26" height="5" fill="#C41E2A"/><path d="M0-13c-4-6-10-6-9-2 1 2 5 2 9 2zM0-13c4-6 10-6 9-2-1 2-5 2-9 2z" fill="' + ORO + '"/></g>' +
      '<g transform="translate(300 340)"><rect x="-9" y="-8" width="18" height="14" fill="#1E7A4C"/><rect x="-1.5" y="-8" width="3" height="14" fill="' + ORO + '"/><rect x="-10" y="-10" width="20" height="4" fill="#166b40"/></g>' +
      '</svg>';

    function inicio() {
      var hN = document.getElementById('salNombre');
      if (hN) {
        var mano = hN.querySelector('.mi.mano');
        if (mano) { var s = document.createElement('span'); s.className = 'nav-reg'; s.innerHTML = REGALO; mano.replaceWith(s); }
      }
      var esc = document.getElementById('escena'), bu = document.getElementById('buho');
      if (esc && !esc.querySelector('.nav-pueblo')) {
        var p = document.createElement('div'); p.className = 'nav-pueblo'; p.setAttribute('aria-hidden', 'true');
        p.innerHTML = PUEBLO + '<i class="nav-fugaz"></i>';
        esc.insertBefore(p, esc.firstChild);
      }
      if (bu && bu.firstElementChild && !bu.querySelector('.nav-gorro')) {
        var g = document.createElement('div'); g.className = 'nav-gorro'; g.innerHTML = GORRO_IMG; g.setAttribute('aria-hidden', 'true');
        bu.appendChild(g);
      }
    }
    quitar.push(function () { document.querySelectorAll('.nav-pueblo,.nav-gorro,.nav-reg,.acc-gorro').forEach(function (e) { e.remove(); }); if (window.MCBuho) MCBuho.accesorio = ''; });

    var vigia = null;
    function revisar() { gorros(); if (EN_INICIO) inicio(); }
    function empezar() {
      revisar();
      vigia = new MutationObserver(function () { revisar(); });
      vigia.observe(document.documentElement, { childList: true, subtree: true });
    }
    quitar.push(function () { if (vigia) vigia.disconnect(); });

    /* ---------- sonidos: campanitas (mismo botón de silencio de siempre) ---------- */
    var S = window.MCSonido, M = S && S.motor, orig = {};
    function pop(svg, n, clase) {
      for (var k = 0; k < n; k++) {
        var e = document.createElement('div'); e.className = clase; e.innerHTML = svg(k);
        if (clase === 'nav-pop') { e.style.setProperty('--dx', (Math.random() * 220 - 110).toFixed(0) + 'px'); e.style.setProperty('--dy', (-140 - Math.random() * 140).toFixed(0) + 'px'); e.style.setProperty('--r', (Math.random() * 300 - 150).toFixed(0) + 'deg'); e.style.animationDelay = (k * 0.05) + 's'; }
        document.body.appendChild(e);
        setTimeout(e.remove.bind(e), 1900);
      }
    }
    var FIGURAS = [function () { return COPO('#fff'); }, function () { return ESTRELLA; }, function () { return COPO(HIELO); }, function () { return CAMPANA; }];
    if (S && M && c.sonidos !== false) {
      var nota = M.nota, soplo = M.soplo;
      var DO5 = 523.25, MI5 = 659.25, SOL5 = 783.99, LA5 = 880, DO6 = 1046.5, MI6 = 1318.5, SOL4 = 392, DO4 = 261.63;
      // campanita: tono puro + armónico inarmónico corto
      function camp(f, t, vol) { nota(f, t, 0.9, 'sine', vol || 0.14); nota(f * 2.76, t, 0.35, 'sine', (vol || 0.14) * 0.25); nota(f * 5.4, t, 0.12, 'sine', (vol || 0.14) * 0.1); }
      function cascabel(t, vol) { soplo(0.12, vol || 0.05, 5000, 9000, t || 0); soplo(0.1, (vol || 0.05) * 0.8, 6000, 10000, (t || 0) + 0.08); }
      var NUEVO = {
        toque: function () { camp(MI6, 0, 0.1); },
        area: function () { camp(DO6, 0, 0.12); cascabel(0.02, 0.03); },
        curso: function () { camp(SOL5, 0, 0.12); camp(DO6, 0.07, 0.08); },
        seccion: function () { camp(MI5, 0, 0.1); },
        tema: function () { camp(SOL5, 0, 0.1); },
        volver: function () { camp(SOL4, 0, 0.1); },
        practicar: function () { [DO5, MI5, SOL5, DO6].forEach(function (f, i) { camp(f, i * 0.07, 0.11); }); cascabel(0.3); },
        bien: function () { [SOL5, DO6, MI6].forEach(function (f, i) { camp(f, i * 0.08, 0.13); }); cascabel(0.05, 0.04); pop(function (k) { return FIGURAS[k % FIGURAS.length](); }, 6, 'nav-pop'); },
        mal: function () { nota(MI5, 0, 0.5, 'sine', 0.12, 330); pop(function () { return COPO(HIELO); }, 1, 'nav-derrite'); },
        empezar: function () { cascabel(0, 0.06); [DO5, MI5, SOL5].forEach(function (f, i) { camp(f, 0.1 + i * 0.09, 0.1); }); },
        racha: function () { [MI5, SOL5, LA5, DO6].forEach(function (f, i) { camp(f, i * 0.06, 0.1); }); },
        abrir: function () { [SOL5, DO6, MI6, SOL5 * 2].forEach(function (f, i) { camp(f, i * 0.08, 0.12); }); cascabel(0.3, 0.05); },
        fin: function (pct) {
          if (pct >= 70) { [DO5, MI5, SOL5, DO6, MI6].forEach(function (f, i) { camp(f, i * 0.1, 0.13); }); cascabel(0.5, 0.06); pop(function (k) { return FIGURAS[k % FIGURAS.length](); }, 10, 'nav-pop'); }
          else { camp(DO4 * 2, 0, 0.14); camp(SOL4, 0.3, 0.1); }
        },
        perder: function () { camp(SOL4, 0, 0.12); camp(DO4, 0.3, 0.12); },
        tic: function (s) { camp(s > 1 ? 1500 : 1800, 0, 0.05); }
      };
      Object.keys(NUEVO).forEach(function (k) { orig[k] = S[k]; S[k] = NUEVO[k]; });
      quitar.push(function () { Object.keys(orig).forEach(function (k) { S[k] = orig[k]; }); });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', empezar); else empezar();
    return function () { quitar.reverse().forEach(function (f) { try { f(); } catch (e) {} }); };
  };
})();
