/* =========================================================
   Modo Cachimbo · Temáticas por fechas (Halloween, …)
   - El panel elige la temática y sus fechas (supabase/25-tematicas.sql).
   - Cada página pregunta cuál toca hoy (tema_activo) y la guarda en el
     navegador (mc_tema) para pintarla al instante la próxima vez.
   - Pasada la fecha final, la web vuelve sola al diseño de siempre.
   - Vista previa: cualquier página con ?tematica=halloween (o ?tematica=ninguna
     para salir). Se recuerda en esta pestaña.
   Lo carga assets/app.js en todas las páginas, menos el panel.
   ========================================================= */
(function () {
  if (window.MCTema || /\/panel\//.test(location.pathname)) return;
  var CLAVE = 'mc_tema', VER = 'mc_tema_ver', AMB = 'mc_tema_amb';
  var TEMAS = { halloween: halloween };
  var actual = null, quitar = null;

  function hoyLima() {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date()); }
    catch (e) { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  }
  function vigente(c) { var h = hoyLima(); return c && TEMAS[c.tema] && (!c.inicio || c.inicio <= h) && (!c.fin || c.fin >= h); }
  function leer(k, s) { try { return JSON.parse((s || localStorage).getItem(k) || 'null'); } catch (e) { return null; } }
  function guardar(k, v, s) { try { if (v == null) (s || localStorage).removeItem(k); else (s || localStorage).setItem(k, JSON.stringify(v)); } catch (e) {} }

  // Vista previa desde el panel: ?tematica=halloween · ?tematica=ninguna
  var q = /[?&]tematica=([a-z]+)/.exec(location.search);
  if (q) guardar(VER, q[1] === 'ninguna' ? null : { tema: q[1], fin: null, mensaje: null, sonidos: true }, sessionStorage);
  var vista = leer(VER, sessionStorage);

  function poner(c) {
    var t = c && TEMAS[c.tema] ? c.tema : null;
    if (t === actual) return;
    if (quitar) { quitar(); quitar = null; }
    actual = t;
    document.documentElement.setAttribute('data-tema', t || '');
    if (t) quitar = TEMAS[t](c);
  }

  if (vista) poner(vista);
  else {
    var cache = leer(CLAVE);
    if (vigente(cache)) poner(cache);
    // Lo que diga Supabase manda: así se prende o apaga sin esperar
    var CFG = window.MC_CONFIG || {};
    if (CFG.SUPABASE_URL && window.fetch) {
      fetch(CFG.SUPABASE_URL + '/rest/v1/rpc/tema_activo', {
        method: 'POST', body: '{}',
        headers: { apikey: CFG.SUPABASE_KEY, Authorization: 'Bearer ' + CFG.SUPABASE_KEY, 'Content-Type': 'application/json' }
      }).then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); }).then(function (c) {
        c = c && TEMAS[c.tema] ? c : null;
        guardar(CLAVE, c);
        poner(vigente(c) ? c : null);
      }).catch(function () {});
    }
  }

  window.MCTema = { get actual() { return actual; } };

  /* =======================================================
     Halloween
     ======================================================= */
  function halloween(c) {
    var raiz = document.documentElement, quitar = [];
    var NAR = '#FF8A1F', NAR_D = '#B9470A', MOR = '#9D5CFF', LIMO = '#9BFF3C';

    var CALABAZA = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M33 15c0-6 3-10 8-11-1 3-3 6-3 11z" fill="#5B8C1E"/><path d="M37 9c5-4 11-3 13 1-4-1-8 0-11 3z" fill="#7BC62D"/>' +
      '<ellipse cx="19" cy="38" rx="15" ry="20" fill="#D9590B"/><ellipse cx="45" cy="38" rx="15" ry="20" fill="#D9590B"/><ellipse cx="32" cy="38" rx="15" ry="22" fill="#FF8A1F"/>' +
      '<path d="M21 31l6-6 5 6zM37 31l6-6 5 6z" fill="#3A1300"/><path d="M19 42c6 9 20 9 26 0l-4 2-3-3-3 4-3-4-3 4-3-4-3 3z" fill="#3A1300"/>' +
      '<path d="M22 31l5-5 4 5zM38 31l5-5 4 5z" fill="#FFD27A" opacity=".55"/><ellipse cx="25" cy="24" rx="4" ry="7" fill="#FFC27A" opacity=".45"/></svg>';
    var MURCIELAGO = '<svg viewBox="0 0 64 30" aria-hidden="true"><path d="M32 9c-2-5-4-6-4-6l-1 4C21 1 12 0 0 7c6 1 9 4 10 9 3-3 7-3 10 1 2-3 5-4 8-2 1 3 3 4 4 4s3-1 4-4c3-2 6-1 8 2 3-4 7-4 10-1 1-5 4-8 10-9-12-7-21-6-27 0l-1-4s-2 1-4 6z" fill="#160a24"/><circle cx="30" cy="10" r="1.1" fill="' + NAR + '"/><circle cx="34" cy="10" r="1.1" fill="' + NAR + '"/></svg>';
    var FANTASMA = '<svg viewBox="0 0 48 56" aria-hidden="true"><path d="M24 3C12 3 6 12 6 24v27l6-5 6 5 6-5 6 5 6-5 6 5V24C42 12 36 3 24 3z" fill="#F3EEFF"/><path d="M36 9c3 3 6 8 6 15v27l-6-5V24c0-6-2-11-6-15z" fill="#CFC2F2"/><ellipse cx="17" cy="23" rx="3.2" ry="4.4" fill="#1d0f33"/><ellipse cx="30" cy="23" rx="3.2" ry="4.4" fill="#1d0f33"/><ellipse cx="23.5" cy="33" rx="4" ry="5" fill="#1d0f33"/></svg>';
    var DULCE = function (col) { return '<svg viewBox="0 0 40 20" aria-hidden="true"><path d="M8 10 0 3v14zM32 10l8-7v14z" fill="' + col + '"/><ellipse cx="20" cy="10" rx="12" ry="9" fill="' + col + '"/><path d="M12 6c3 8 13 8 16 0" stroke="#fff" stroke-width="2.4" fill="none" opacity=".6"/></svg>'; };
    var GORRO = '<g class="acc-gorro">' +
      '<ellipse cx="100" cy="56" rx="72" ry="13" fill="#1a0a2c"/>' +
      '<path d="M58 54C68 32 82 6 94-16c6-12 20-22 36-17-12 2-20 10-21 21 2 24 18 45 31 66z" fill="#2c1150"/>' +
      '<path d="M109-12c2 24 18 45 31 66h-17c-10-20-17-40-18-60z" fill="#1a0a2c" opacity=".75"/>' +
      '<path d="M64 38q36 9 72 0l5 13q-41 10-82 0z" fill="' + NAR + '"/>' +
      '<rect x="91" y="39" width="18" height="15" rx="3" fill="#FFC21A"/><rect x="95.5" y="43" width="9" height="7" rx="1.5" fill="#2c1150"/>' +
      '<ellipse cx="100" cy="53" rx="58" ry="5" fill="#45207a" opacity=".85"/>' +
      '<circle cx="80" cy="18" r="2" fill="#FFC21A" class="acc-brillo"/><circle cx="120" cy="30" r="1.6" fill="#FFC21A" class="acc-brillo" style="animation-delay:-1.2s"/></g>';

    raiz.classList.add('tema-halloween');
    quitar.push(function () { raiz.classList.remove('tema-halloween'); });

    /* ---------- estilos ---------- */
    var st = document.createElement('style'); st.id = 'mcTemaCss';
    st.textContent = [
      // Paleta: noche morada, naranja calabaza y un toque de limo
      'html.tema-halloween{--bg:#0a0612;--surface:#140c1f;--surface-2:#170e25;--border:#2b1d3f;--borde-g:#2d1f42;--borde:#2d1f42;' +
        '--accent:' + NAR + ';--accent-soft:rgba(255,138,31,.13);--lima:' + NAR + ';--lima-osc:' + NAR_D + ';--mat:' + NAR + ';--text-dim:#a99bbd;--text-faint:#6c5c80;' +
        'background:radial-gradient(1100px 620px at 88% -8%,rgba(132,56,255,.30),transparent 62%),radial-gradient(900px 520px at -5% 108%,rgba(255,110,20,.17),transparent 60%),linear-gradient(180deg,#0e0719 0%,#08040e 60%,#05030a 100%) fixed #08040e;' +
        'scrollbar-color:#3d2758 #0a0612;accent-color:' + NAR + '}',
      'html.tema-halloween body{background:transparent!important}',
      'html.tema-halloween ::selection{background:rgba(255,138,31,.35);color:#fff}',
      // Todo pasa a colores de Halloween: calabaza en Ciencias y Sociales, morado en Matemática y sangre en Comunicación
      'html.tema-halloween{--ac:' + NAR + ';--ac-rgb:255,138,31;--ac-d:' + NAR_D + ';--cel:' + MOR + ';--cel-d:#6B32C9;--azul:' + MOR + ';--mor:#D58BFF;--verde:' + LIMO + ';--ok:' + NAR + '}',
      'html.tema-halloween[data-area="ciencia-tecnologia"],html.tema-halloween [data-area="ciencia-tecnologia"]{--ac:' + NAR + ';--ac-rgb:255,138,31;--ac-d:' + NAR_D + '}',
      'html.tema-halloween[data-area="matematica"],html.tema-halloween [data-area="matematica"]{--ac:' + MOR + ';--ac-rgb:157,92,255;--ac-d:#6B32C9}',
      'html.tema-halloween[data-area="comunicacion"],html.tema-halloween [data-area="comunicacion"]{--ac:#FF4F7B;--ac-rgb:255,79,123;--ac-d:#B3204A}',
      'html.tema-halloween[data-area="ciencias-sociales"],html.tema-halloween [data-area="ciencias-sociales"]{--ac:' + NAR + ';--ac-rgb:255,138,31;--ac-d:' + NAR_D + '}',
      // Tarjetas de vidrio oscuro: se ve la escena detrás
      'html.tema-halloween .saludo,html.tema-halloween .course,html.tema-halloween .card,html.tema-halloween .year-card,html.tema-halloween .sal-agenda,html.tema-halloween section.panel,html.tema-halloween .mcz-mis,html.tema-halloween .tema-card,html.tema-halloween .stats > div,html.tema-halloween .mcr{background:rgba(24,13,38,.5)!important;border-color:rgba(120,80,180,.35)!important;-webkit-backdrop-filter:blur(7px) saturate(1.2);backdrop-filter:blur(7px) saturate(1.2)}',
      // Logo: el verde pasa a naranja calabaza
      'html.tema-halloween img[src*="logo-modo-cachimbo"]{filter:hue-rotate(-48deg) saturate(1.35) brightness(1.08) drop-shadow(0 0 10px rgba(255,138,31,.35))}',
      // Botón principal: calabaza encendida
      'html.tema-halloween .btn-prin{background:linear-gradient(180deg,#FFA040,' + NAR + ' 55%,#F06A0C);color:#2a0d00;box-shadow:0 5px 0 ' + NAR_D + ',0 0 26px rgba(255,138,31,.35);position:relative;overflow:hidden}',
      'html.tema-halloween .btn-prin::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 35%,rgba(255,255,255,.35) 50%,transparent 65%);transform:translateX(-120%);animation:halBrillo 5s ease-in-out infinite}',
      'html.tema-halloween .btn-prin:active{box-shadow:0 1px 0 ' + NAR_D + '}',
      '@keyframes halBrillo{0%,60%{transform:translateX(-120%)}100%{transform:translateX(120%)}}',
      // Avatar y chips de la cabecera
      'html.tema-halloween .mcu-av{background:' + NAR + '!important;color:#2a0d00!important}',
      // Tarjetas: brillo morado suave
      'html.tema-halloween .saludo{background:radial-gradient(560px 240px at 0% 0%,rgba(255,138,31,.14),transparent 70%),radial-gradient(520px 260px at 100% 100%,rgba(157,92,255,.16),transparent 70%),rgba(22,12,36,.34)!important;border-color:rgba(120,80,180,.45)!important;box-shadow:0 0 0 1px rgba(157,92,255,.08),0 18px 50px -20px rgba(120,40,255,.45)}',
      'html.tema-halloween .course,html.tema-halloween .card,html.tema-halloween .year-card{box-shadow:0 14px 40px -24px rgba(140,60,255,.45)}',
      // La respuesta correcta también va en naranja calabaza, con su sombra
      'html.tema-halloween .option.correct,html.tema-halloween .opt-row.correct{background:rgba(255,138,31,.13)!important;border-color:' + NAR + '!important;border-bottom-color:' + NAR_D + '!important;box-shadow:0 0 18px rgba(255,138,31,.25)!important}',
      'html.tema-halloween .option.correct .letter,html.tema-halloween .opt-row.correct .letter{background:' + NAR + '!important;border-color:' + NAR + '!important;color:#1f0a00!important}',
      'html.tema-halloween .option.correct span.text,html.tema-halloween .opt-row.correct{color:#FFE3C7!important}',
      'html.tema-halloween .icon.ok,html.tema-halloween .option.correct .icon,html.tema-halloween .opt-row.correct svg{color:' + NAR + '!important}',
      'html.tema-halloween .feedback.ok{color:#FFC48A!important;border-color:rgba(255,138,31,.35)!important;background:rgba(255,138,31,.08)!important}',
      // Esquina de las tarjetas de cursos (assets/areas.css): una telaraña
      'html.tema-halloween[data-area] .course.active::after,html.tema-halloween[data-area] .year-card.active::after,html.tema-halloween[data-area] .tema-card::after{width:104px;height:104px;opacity:.5;background:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27 fill=%27none%27 stroke=%27%23e9defc%27 stroke-width=%271.3%27%3E%3Cpath d=%27M100 0 0 100M100 0 30 100M100 0 0 30M100 0 65 100M100 0 0 65%27/%3E%3Cpath d=%27M86 0q2 12 14 14M70 0q4 20 30 30M52 0q6 30 48 48M32 0q8 44 68 68M14 0q10 58 86 86%27/%3E%3C/svg%3E") no-repeat top right/contain}',
      // Cabecera fija de las páginas de cursos
      'html.tema-halloween[data-area] header.top{background:transparent!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;box-shadow:none!important}',
      // Perfil: portada de noche con luna
      'html.tema-halloween .banda{background:radial-gradient(60px 60px at 82% 30%,#FFF1C9 0 38%,rgba(255,220,140,.35) 39%,transparent 62%),linear-gradient(160deg,#2c1152,#1a0a33 55%,#3a1606)!important}',
      // Búho disfrazado
      'html.tema-halloween .mc-buho{overflow:visible}',
      '.acc-brillo{animation:halTw 2.4s ease-in-out infinite}@keyframes halTw{0%,100%{opacity:.2}50%{opacity:1}}',
      // Calabaza en el saludo (en vez de la mano)
      '.hal-cal{display:inline-block;width:.95em;height:.95em;margin-left:.18em;vertical-align:-.12em;transform-origin:50% 90%;animation:halBail 2.6s ease-in-out infinite}',
      '.hal-cal svg{width:100%;height:100%;display:block;filter:drop-shadow(0 0 8px rgba(255,138,31,.55))}',
      '@keyframes halBail{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(7deg)}}',
      '.hal-eyebrow{display:inline-flex;align-items:center;gap:6px;margin-bottom:8px;font:1000 11.5px Nunito,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:' + NAR + ';text-shadow:0 0 12px rgba(255,138,31,.45)}',
      // Decoración de fondo (detrás de todo)
      '.hal-deco{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden}',
      '.hal-estrellas{position:absolute;inset:0;background-image:radial-gradient(1.4px 1.4px at 12% 18%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 28% 8%,#fff 50%,transparent 51%),radial-gradient(1.2px 1.2px at 46% 22%,#e9dcff 50%,transparent 51%),radial-gradient(1px 1px at 63% 12%,#fff 50%,transparent 51%),radial-gradient(1.5px 1.5px at 74% 34%,#ffe9c9 50%,transparent 51%),radial-gradient(1px 1px at 91% 52%,#fff 50%,transparent 51%),radial-gradient(1.2px 1.2px at 6% 46%,#e9dcff 50%,transparent 51%),radial-gradient(1px 1px at 35% 40%,#fff 50%,transparent 51%),radial-gradient(1px 1px at 55% 58%,#fff 50%,transparent 51%),radial-gradient(1.3px 1.3px at 84% 70%,#e9dcff 50%,transparent 51%),radial-gradient(1px 1px at 18% 72%,#fff 50%,transparent 51%);opacity:.55;animation:halCentella 6s ease-in-out infinite}',
      '@keyframes halCentella{0%,100%{opacity:.35}50%{opacity:.7}}',
      '.hal-luna{position:absolute;right:max(4vw,24px);top:96px;width:clamp(90px,11vw,150px);aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 38% 36%,#FFF8E6 0%,#FFE7B0 48%,#F3C878 100%);box-shadow:0 0 40px 10px rgba(255,214,140,.28);opacity:.9}',
      '.hal-luna::before{content:"";position:absolute;inset:-110%;border-radius:50%;background:radial-gradient(circle,rgba(255,170,80,.14),transparent 62%)}',
      '.hal-luna::before,.hal-luna::after{content:"";position:absolute;border-radius:50%;background:rgba(200,150,80,.28)}',
      '.hal-luna::before{width:22%;height:22%;left:56%;top:26%}.hal-luna::after{width:14%;height:14%;left:30%;top:58%;box-shadow:42px -6px 0 -2px rgba(200,150,80,.22)}',
      '.hal-bat{position:absolute;left:0;top:0;width:44px;opacity:.9;animation:halVuela 24s linear infinite}',
      '.hal-bat svg{display:block;width:100%;animation:halAleteo .38s ease-in-out infinite alternate;transform-origin:50% 35%}',
      '@keyframes halAleteo{to{transform:scaleY(.45)}}',
      '@keyframes halVuela{0%{transform:translate(110vw,22vh) scale(.9)}25%{transform:translate(70vw,12vh) scale(1)}50%{transform:translate(40vw,26vh) scale(.85)}75%{transform:translate(12vw,10vh) scale(1)}100%{transform:translate(-20vw,20vh) scale(.9)}}',
      '.hal-tela{position:absolute;left:-4px;top:-4px;width:clamp(110px,14vw,170px);opacity:.22}',
      '.hal-hilo{position:absolute;left:clamp(76px,9.5vw,118px);top:0;width:1.5px;height:90px;background:linear-gradient(rgba(255,255,255,.5),rgba(255,255,255,.18));transform-origin:top;animation:halBaja 7s ease-in-out infinite}',
      '.hal-hilo i{position:absolute;left:-8px;bottom:-14px;width:17px;height:15px;border-radius:50%;background:#12081d;box-shadow:0 0 0 2px #2a1640}',
      '.hal-hilo i::before{content:"";position:absolute;left:3px;top:4px;width:3px;height:3px;border-radius:50%;background:' + NAR + ';box-shadow:7px 0 0 ' + NAR + '}',
      '@keyframes halBaja{0%,100%{height:80px}50%{height:150px}}',
      '.hal-niebla{position:absolute;left:-30%;right:-30%;bottom:-30px;height:34vh;background:radial-gradient(30% 50% at 25% 75%,rgba(190,160,240,.20),transparent 70%),radial-gradient(28% 45% at 60% 85%,rgba(190,160,240,.16),transparent 70%),radial-gradient(25% 40% at 90% 70%,rgba(190,160,240,.14),transparent 70%);filter:blur(10px);animation:halNiebla 34s ease-in-out infinite alternate}',
      '.hal-niebla.dos{bottom:-60px;height:22vh;opacity:.8;animation-duration:22s;animation-direction:alternate-reverse}',
      '@keyframes halNiebla{to{transform:translateX(14%)}}',
      // Escena: iglesia, cementerio, árboles secos y fantasmas que salen de las tumbas
      '.hal-escena{position:absolute;left:0;right:0;bottom:0;height:clamp(200px,44vh,430px)}',
      '.hal-escena svg{position:absolute;left:50%;bottom:0;height:100%;width:auto;min-width:100%;transform:translateX(-50%)}',
      '.hal-escena .vent{animation:halVentana 3.2s ease-in-out infinite}',
      '.hal-escena .vent.b{animation-delay:-1.3s}.hal-escena .vent.c{animation-delay:-2.1s}',
      '@keyframes halVentana{0%,100%{opacity:.95}30%{opacity:.55}45%{opacity:1}70%{opacity:.7}}',
      '.hal-escena .vela{animation:halVela 1.6s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}',
      '.hal-escena .fan{transform-box:fill-box;transform-origin:50% 100%;opacity:0;animation:halFantasma 9s ease-in-out infinite}',
      '.hal-escena .fan.b{animation-delay:-3s}.hal-escena .fan.c{animation-delay:-6s}',
      '@keyframes halFantasma{0%{transform:translate(0,60px) scale(.5);opacity:0}12%{opacity:.85}45%{transform:translate(-14px,-70px) scale(1)}70%{transform:translate(12px,-140px) scale(1.05);opacity:.75}100%{transform:translate(-6px,-230px) scale(1.1);opacity:0}}',
      '.hal-escena .cuervo{transform-box:fill-box;transform-origin:50% 100%;animation:halCuervo 6s ease-in-out infinite}',
      '@keyframes halCuervo{0%,80%,100%{transform:rotate(0)}85%{transform:rotate(-10deg)}90%{transform:rotate(4deg)}}',
      // Relámpago: el cielo se ilumina de golpe y aparece el rayo
      '.hal-rayo{position:absolute;inset:0;background:radial-gradient(80% 60% at 30% 10%,rgba(210,190,255,.55),rgba(150,120,255,.15) 60%,transparent 80%);opacity:0;animation:halRayo 17s linear infinite}',
      '.hal-rayo svg{position:absolute;left:24%;top:0;width:clamp(50px,6vw,90px);filter:drop-shadow(0 0 12px #c9b6ff)}',
      '@keyframes halRayo{0%,90%,100%{opacity:0}90.6%{opacity:.9}91.2%{opacity:.1}91.8%{opacity:1}93.5%{opacity:0}}',
      // Espectro grande que cruza el cielo
      '.hal-espectro{position:absolute;top:18vh;left:0;width:clamp(70px,8vw,110px);opacity:0;animation:halEspectro 46s linear infinite;filter:drop-shadow(0 0 14px rgba(220,200,255,.45))}',
      '.hal-espectro svg{display:block;width:100%;animation:halFlota 3s ease-in-out infinite}',
      '@keyframes halEspectro{0%{transform:translateX(-15vw);opacity:0}5%{opacity:.35}45%{opacity:.35}50%{transform:translateX(110vw);opacity:0}100%{transform:translateX(110vw);opacity:0}}',
      '@keyframes halFlota{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-14px) rotate(4deg)}}',
      // Arañas que caminan por los bordes de la pantalla (encima de todo, sin estorbar)
      '.hal-camina{position:fixed;z-index:60;pointer-events:none;width:26px;height:26px}',
      '.hal-camina svg{display:block;width:100%;height:100%;overflow:visible}',
      '.hal-camina .pa{animation:halPata .32s ease-in-out infinite alternate;transform-box:view-box;transform-origin:50% 50%}',
      '.hal-camina .pb{animation:halPata .32s ease-in-out infinite alternate-reverse;transform-box:view-box;transform-origin:50% 50%}',
      '@keyframes halPata{from{transform:rotate(-7deg)}to{transform:rotate(7deg)}}',
      '.hal-camina.arriba{top:0;left:0;animation:halArriba 48s linear infinite}',
      '@keyframes halArriba{0%{transform:translate(-40px,2px) rotate(90deg)}30%{transform:translate(38vw,2px) rotate(90deg)}36%{transform:translate(38vw,2px) rotate(90deg)}70%{transform:translate(72vw,2px) rotate(90deg)}74%{transform:translate(72vw,2px) rotate(90deg)}100%{transform:translate(105vw,2px) rotate(90deg)}}',
      '.hal-camina.lado{left:2px;top:0;animation:halLado 38s linear infinite;animation-delay:-12s}',
      '@keyframes halLado{0%{transform:translate(0,105vh) rotate(0deg)}40%{transform:translate(0,55vh) rotate(0deg)}46%{transform:translate(0,55vh) rotate(0deg)}100%{transform:translate(0,-40px) rotate(0deg)}}',
      '.hal-chispa{position:absolute;bottom:-10px;width:4px;height:4px;border-radius:50%;background:#FFB15A;box-shadow:0 0 8px 2px rgba(255,138,31,.7);animation:halSube 11s linear infinite;opacity:0}',
      '@keyframes halSube{0%{transform:translate(0,0);opacity:0}10%{opacity:.9}100%{transform:translate(40px,-80vh);opacity:0}}',
      '@media (max-width:560px){.hal-escena{height:30vh}.hal-escena svg{transform:translateX(-64%)}.hal-camina.lado{display:none}}',
      // Aviso de la temática (inicio)
      '.hal-banda{position:relative;display:flex;align-items:center;gap:14px;margin:12px 0 14px;padding:14px 16px;border-radius:22px;overflow:hidden;' +
        'border:2px solid #45276a;border-bottom-width:5px;background:radial-gradient(260px 120px at 0% 50%,rgba(255,138,31,.28),transparent 70%),linear-gradient(100deg,#2a1146,#170b28 60%,#21102f);color:#f6efff;font-family:Nunito,sans-serif}',
      '.hal-banda::before{content:"";position:absolute;inset:0;background:radial-gradient(120px 60px at 0% 50%,rgba(255,170,60,.25),transparent 70%);animation:halVela 2.2s ease-in-out infinite;pointer-events:none}',
      '@keyframes halVela{0%,100%{opacity:.6}40%{opacity:1}60%{opacity:.75}}',
      '.hal-banda .ic{position:relative;width:54px;flex:none;filter:drop-shadow(0 0 14px rgba(255,138,31,.6));animation:halBail 3s ease-in-out infinite;transform-origin:50% 90%}',
      '.hal-banda .ic svg{display:block;width:100%}',
      '.hal-banda .tx{position:relative;flex:1;min-width:0}',
      '.hal-banda small{display:block;font:1000 11px Nunito,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:' + NAR + '}',
      '.hal-banda b{display:block;font:1000 18px/1.2 Nunito,sans-serif;margin-top:2px}',
      '.hal-banda span.m{display:block;font:700 13px/1.4 Nunito,sans-serif;color:#c9b8e2;margin-top:3px}',
      '.hal-amb{position:relative;flex:none;display:inline-flex;align-items:center;gap:7px;padding:9px 12px;border-radius:14px;border:2px solid #5a3588;border-bottom-width:4px;background:#1d0f31;color:#e9dcff;font:1000 12px Nunito,sans-serif;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;-webkit-tap-highlight-color:transparent}',
      '.hal-amb svg{width:18px;height:18px}',
      '.hal-amb.on{border-color:' + NAR + ';color:' + NAR + ';background:rgba(255,138,31,.12);box-shadow:0 0 18px rgba(255,138,31,.25)}',
      '.hal-amb:active{transform:translateY(2px);border-bottom-width:2px}',
      '@media (max-width:560px){.hal-banda{align-items:flex-start;padding:12px 12px 12px 14px;gap:12px}.hal-banda .ic{width:42px;margin-top:4px}.hal-banda b{font-size:15.5px}.hal-banda span.m{font-size:12.5px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.hal-amb{padding:0;width:40px;height:40px;justify-content:center;border-radius:12px}.hal-amb span{display:none}.hal-hilo{display:none}.hal-tela{width:90px}.hal-luna{width:86px;right:-22px;top:150px}}',
      // Efectos al responder
      '.hal-pop{position:fixed;z-index:9999;pointer-events:none;width:38px;left:50%;bottom:90px;animation:halPop 1.3s cubic-bezier(.2,.7,.3,1) forwards}',
      '.hal-pop svg{display:block;width:100%}',
      '@keyframes halPop{0%{transform:translate(-50%,0) scale(.3) rotate(0);opacity:0}15%{opacity:1}100%{transform:translate(calc(-50% + var(--dx)),var(--dy)) scale(1) rotate(var(--r));opacity:0}}',
      '.hal-boo{position:fixed;z-index:9999;pointer-events:none;width:64px;left:calc(50% - 32px);bottom:80px;animation:halBoo 1.6s ease-out forwards;filter:drop-shadow(0 0 16px rgba(220,200,255,.6))}',
      '.hal-boo svg{display:block;width:100%}',
      '@keyframes halBoo{0%{transform:translateY(30px) scale(.6);opacity:0}25%{opacity:.95}100%{transform:translateY(-180px) scale(1.05) rotate(-8deg);opacity:0}}',
      '@media (prefers-reduced-motion:reduce){.hal-deco *,.hal-cal,.hal-banda *,.hal-banda::before,html.tema-halloween .btn-prin::after,.hal-camina,.hal-camina *{animation:none!important}.hal-bat,.hal-camina,.hal-espectro,.hal-rayo{display:none}}',
      // Flashcards: reverso de calabaza sin el brillo limo, y cada cara se oculta a mitad del giro
      // (en iPhone la cara de atrás se veía al revés a través de la otra)
      'html.tema-halloween .carta .reverso{background:radial-gradient(90% 60% at 50% 40%,#FFC46B,transparent 70%),#FF8A1F!important;border-color:#E0700F!important;border-bottom-color:' + NAR_D + '!important;color:#2a1000!important}',
      'html.tema-halloween .carta .reverso{visibility:hidden}html.tema-halloween .carta.vuelta .reverso{visibility:visible}html.tema-halloween .carta.vuelta .frente{visibility:hidden}',
      'html.tema-halloween .carta.ida .frente,html.tema-halloween .carta.regreso .reverso{animation:halSale .8s linear forwards}',
      'html.tema-halloween .carta.ida .reverso,html.tema-halloween .carta.regreso .frente{animation:halEntra .8s linear forwards}',
      '@keyframes halSale{0%,44%{visibility:visible}45%,100%{visibility:hidden}}@keyframes halEntra{0%,44%{visibility:hidden}45%,100%{visibility:visible}}',
      'html.tema-halloween [fill="#C6E000" i]{fill:var(--accent)}html.tema-halloween [stroke="#C6E000" i]{stroke:var(--accent)}',
      'html.tema-halloween .mcr-p,html.tema-halloween .mcr-bt{background:rgba(48,26,76,.45)!important;border-color:rgba(140,96,210,.3)!important}'
    ].join('\n');
    (document.head || raiz).appendChild(st);
    quitar.push(function () { st.remove(); });

    /* ---------- decoración ---------- */
    var deco = document.createElement('div'); deco.className = 'hal-deco'; deco.setAttribute('aria-hidden', 'true');
    var chispas = '';
    for (var i = 0; i < 7; i++) chispas += '<i class="hal-chispa" style="left:' + (8 + i * 13) + '%;animation-delay:-' + (i * 1.6).toFixed(1) + 's;animation-duration:' + (9 + i % 3 * 2) + 's"></i>';
    deco.innerHTML = '<div class="hal-estrellas"></div><div class="hal-luna"></div>' +
      '<svg class="hal-tela" viewBox="0 0 120 120" fill="none" stroke="#fff" stroke-width="1.1"><path d="M0 0 120 120M0 0 60 120M0 0 120 60M0 0 0 120M0 0 120 0M0 0 95 120M0 0 120 95"/>' +
        '<path d="M0 26q11 1 13 13 4-10 13-12-12-2-13-13-2 11-13 12M0 54q22 3 27 27 5-21 27-26-25-4-27-27-4 23-27 26M0 86q33 4 41 41 7-33 41-41-37-5-41-41-6 35-41 41"/></svg>' +
      '<div class="hal-hilo"><i></i></div>' +
      '<div class="hal-bat">' + MURCIELAGO + '</div>' +
      '<div class="hal-bat" style="width:30px;animation-delay:-9s;animation-duration:30s;opacity:.6">' + MURCIELAGO + '</div>' +
      '<div class="hal-bat" style="width:22px;animation-delay:-17s;animation-duration:36s;opacity:.4">' + MURCIELAGO + '</div>' +
      '<div class="hal-bat" style="width:26px;top:22vh;animation-delay:-4s;animation-duration:26s;opacity:.7">' + MURCIELAGO + '</div>' +
      '<div class="hal-bat" style="width:18px;top:26vh;animation-delay:-4.6s;animation-duration:26s;opacity:.55">' + MURCIELAGO + '</div>' +
      '<div class="hal-rayo"><svg viewBox="0 0 60 220" fill="none" stroke="#EDE4FF" stroke-width="3" stroke-linejoin="round"><path d="M34 0 22 70l14 4-20 66 12 4-16 76"/><path d="M22 70 6 104M28 144l14 30" stroke-width="1.6" opacity=".7"/></svg></div>' +
      '<div class="hal-espectro">' + FANTASMA + '</div>' +
      chispas +
      '<div class="hal-escena"><svg viewBox="0 0 1600 420" preserveAspectRatio="xMidYMax slice">' +
        '<defs><radialGradient id="halLuz" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFB347" stop-opacity=".55"/><stop offset="1" stop-color="#FF8A1F" stop-opacity="0"/></radialGradient>' +
        '<radialGradient id="halAura"><stop offset="0" stop-color="#7a52c4" stop-opacity=".35"/><stop offset="1" stop-color="#7a52c4" stop-opacity="0"/></radialGradient><linearGradient id="halFan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4EEFF"/><stop offset="1" stop-color="#C9B6FF" stop-opacity="0"/></linearGradient></defs>' +
        // colinas lejanas
        '<path d="M0 420V290q120-50 260-30t260-20 280 30 240-40 300 20 260-10v180z" fill="#150a22"/>' +
        // iglesia gótica
        '<ellipse cx="1140" cy="270" rx="300" ry="220" fill="url(#halAura)"/>' +
        '<g fill="#1c1131" stroke="#3a2560" stroke-width="1.5">' +
          '<path d="M1010 420V196l34-30 34 30v224z"/><path d="M1044 30l-26 136h52z"/><path d="M1041 6h6v28h-6zM1033 14h22v6h-22z"/>' +
          '<path d="M1078 420V250l92-74 92 74v170z"/><path d="M1240 420V300h60v120z"/><path d="M1240 300l30-26 30 26z"/>' +
        '</g>' +
        '<circle cx="1044" cy="220" r="34" fill="url(#halLuz)"/>' +
        '<circle class="vent" cx="1044" cy="220" r="15" fill="#FF9A2E"/><path d="M1044 205v30M1029 220h30M1034 210l20 20M1054 210l-20 20" stroke="#5a2a08" stroke-width="2"/>' +
        '<path class="vent b" d="M1112 330v-34q0-12 10-12t10 12v34z" fill="#FFB347"/><path class="vent c" d="M1208 330v-34q0-12 10-12t10 12v34z" fill="#FFB347"/>' +
        '<path class="vent" d="M1034 300v-26q0-10 10-10t10 10v26z" fill="#E8761A" opacity=".85"/>' +
        '<path d="M1146 420v-58q0-24 24-24t24 24v58z" fill="#2a1505"/><path class="vent b" d="M1152 420v-54q0-18 18-18t18 18v54z" fill="#C9500A" opacity=".75"/>' +
        '<ellipse cx="1170" cy="406" rx="70" ry="10" fill="#FF8A1F" opacity=".12"/>' +
        // árboles secos
        '<path d="M140 420l10-150q-30-24-62-30 32 0 60 18l-4-62q-22-22-48-26 28 0 46 18l6-52 12 54q16-24 44-30-24 12-36 36l4 64q24-24 58-26-34 12-54 38l10 148z" fill="#0b0613"/>' +
        '<g class="cuervo"><path d="M186 254q10-12 22-6l8-4-4 8q2 10-10 12l-4 8h-4l2-8q-10-2-10-10z" fill="#05030a"/><circle cx="208" cy="251" r="1.6" fill="#FF8A1F"/></g>' +
        '<path d="M1480 420l8-118q-24-18-50-22 26 0 48 14l-2-48q-18-18-38-20 22 0 36 14l6-40 10 42q12-18 34-22-18 10-28 28l2 50q18-18 44-20-26 10-42 30l8 112z" fill="#0b0613"/>' +
        // fantasmas que salen de las tumbas (detrás de las lápidas)
        '<g transform="translate(452 300)"><g class="fan"><path d="M0 0q0-30 26-30t26 30v40l-9-8-8 8-9-8-8 8-9-8-9 8z" fill="url(#halFan)"/><circle cx="17" cy="-6" r="3.4" fill="#2a1840"/><circle cx="35" cy="-6" r="3.4" fill="#2a1840"/><ellipse cx="26" cy="8" rx="4" ry="5" fill="#2a1840"/></g></g>' +
        '<g transform="translate(694 312)"><g class="fan b"><path d="M0 0q0-26 22-26t22 26v34l-7-7-7 7-8-7-7 7-7-7-6 7z" fill="url(#halFan)"/><circle cx="15" cy="-5" r="3" fill="#2a1840"/><circle cx="29" cy="-5" r="3" fill="#2a1840"/><path d="M15 6q7 5 14 0" stroke="#2a1840" stroke-width="2.4" fill="none"/></g></g>' +
        '<g transform="translate(1338 320)"><g class="fan c"><path d="M0 0q0-28 24-28t24 28v38l-8-8-8 8-8-8-8 8-8-8-8 8z" fill="url(#halFan)"/><circle cx="16" cy="-6" r="3.2" fill="#2a1840"/><circle cx="32" cy="-6" r="3.2" fill="#2a1840"/><ellipse cx="24" cy="8" rx="3.5" ry="4.5" fill="#2a1840"/></g></g>' +
        // reja de hierro
        '<g stroke="#160c22" stroke-width="5" stroke-linecap="round"><path d="M290 352H960M290 380H960" stroke-width="4"/>' +
          '<path d="M300 400v-74M330 400v-74M360 400v-74M390 400v-74M420 400v-74M540 400v-74M570 400v-74M600 400v-74M630 400v-74M780 400v-74M810 400v-74M840 400v-74M870 400v-74M900 400v-74M930 400v-74M960 400v-74"/></g>' +
        '<g fill="#160c22"><path d="M295 330l5-12 5 12zM325 330l5-12 5 12zM355 330l5-12 5 12zM385 330l5-12 5 12zM415 330l5-12 5 12zM535 330l5-12 5 12zM565 330l5-12 5 12zM595 330l5-12 5 12zM625 330l5-12 5 12zM775 330l5-12 5 12zM805 330l5-12 5 12zM835 330l5-12 5 12zM865 330l5-12 5 12zM895 330l5-12 5 12zM925 330l5-12 5 12zM955 330l5-12 5 12z"/></g>' +
        // suelo
        '<path d="M0 420V372q140-14 300-8t320-6 300 8 320-10 360 6v58z" fill="#0a0511"/>' +
        // lápidas
        '<g fill="#22163a">' +
          '<path d="M440 392v-54q0-24 30-24t30 24v54z"/><path d="M682 392v-44q0-20 26-20t26 20v44z"/>' +
          '<path d="M1326 396v-48q0-22 28-22t28 22v48z"/>' +
          '<path d="M584 392v-48h-14v-12h14v-14h12v14h14v12h-14v48z"/><path d="M816 392v-40q0-16 20-16t20 16v40z"/>' +
          '<path d="M1416 398v-36q0-14 18-14t18 14v36z"/><path d="M372 394v-30q0-12 16-12t16 12v30z"/>' +
        '</g>' +
        '<g fill="#3a2a58" font-family="Nunito,sans-serif" font-weight="900" text-anchor="middle"><text x="470" y="360" font-size="15">RIP</text><text x="708" y="368" font-size="12">RIP</text><text x="1354" y="372" font-size="13">RIP</text></g>' +
        '<path d="M440 392v-54q0-24 30-24" stroke="#4a3570" stroke-width="2" fill="none" opacity=".6"/><path d="M1326 396v-48q0-22 28-22" stroke="#4a3570" stroke-width="2" fill="none" opacity=".6"/>' +
        // montoncitos de tierra de las tumbas abiertas
        '<path d="M430 398q40-16 80 0zM674 398q34-12 68 0zM1318 402q36-14 72 0z" fill="#170c22"/>' +
        // velas
        '<g><rect x="520" y="378" width="7" height="16" rx="2" fill="#E9DCC0"/><path class="vela" d="M523.5 378q-5-7 0-14 5 7 0 14z" fill="#FFC14D"/><circle cx="523.5" cy="372" r="12" fill="url(#halLuz)"/></g>' +
        '<g><rect x="1398" y="384" width="6" height="14" rx="2" fill="#E9DCC0"/><path class="vela" d="M1401 384q-4-6 0-12 4 6 0 12z" fill="#FFC14D" style="animation-delay:-.7s"/><circle cx="1401" cy="378" r="11" fill="url(#halLuz)"/></g>' +
        // calabazas encendidas
        '<g><circle cx="250" cy="390" r="40" fill="url(#halLuz)"/><ellipse cx="250" cy="394" rx="24" ry="18" fill="#D0560B"/><path d="M247 377q2-9 8-10" stroke="#3b5d12" stroke-width="4" fill="none"/>' +
          '<path class="vent" d="M238 390l5-6 5 6zM253 390l5-6 5 6zM238 399q12 8 24 0l-4 4-4-3-4 3-4-3-4 3z" fill="#FFE08A"/></g>' +
        '<g><circle cx="905" cy="396" r="30" fill="url(#halLuz)"/><ellipse cx="905" cy="399" rx="18" ry="14" fill="#C9500A"/><path class="vent c" d="M897 396l4-5 4 5zM907 396l4-5 4 5zM897 403q8 6 16 0" fill="#FFE08A"/></g>' +
        '<g><circle cx="1290" cy="402" r="26" fill="url(#halLuz)"/><ellipse cx="1290" cy="405" rx="15" ry="11" fill="#C9500A"/><path class="vent b" d="M1284 403l3-4 3 4zM1292 403l3-4 3 4zM1284 408q6 4 12 0" fill="#FFE08A"/></g>' +
      '</svg></div>' +
      '<div class="hal-niebla"></div><div class="hal-niebla dos"></div>';

    var ARANA = '<svg viewBox="0 0 26 26"><g stroke="#1a0f26" stroke-width="1.6" fill="none" stroke-linecap="round">' +
      '<g class="pa"><path d="M11 11 4 5 2 9M11 13H3L1 15M15 15l7 6 1 3M15 13h8l2-2"/></g>' +
      '<g class="pb"><path d="M15 11l7-6 2 4M15 13h8l2 2M11 15l-7 6-1 3M11 13H3L1 11"/></g></g>' +
      '<ellipse cx="13" cy="16" rx="4.6" ry="5.6" fill="#1a0f26"/><circle cx="13" cy="9.6" r="3" fill="#1a0f26"/><circle cx="11.9" cy="9" r=".9" fill="#FF4F7B"/><circle cx="14.1" cy="9" r=".9" fill="#FF4F7B"/><path d="M11.4 15.4h3.2M13 14v3.4" stroke="#FF8A1F" stroke-width="1"/></svg>';
    var aranas = [];
    ['arriba', 'lado'].forEach(function (k) { var a = document.createElement('div'); a.className = 'hal-camina ' + k; a.setAttribute('aria-hidden', 'true'); a.innerHTML = ARANA; aranas.push(a); });
    function ponerDeco() { if (document.body && !deco.parentNode) { document.body.insertBefore(deco, document.body.firstChild); aranas.forEach(function (a) { document.body.appendChild(a); }); } }
    if (document.body) ponerDeco(); else document.addEventListener('DOMContentLoaded', ponerDeco);
    quitar.push(function () { deco.remove(); aranas.forEach(function (a) { a.remove(); }); });

    /* ---------- búho con sombrero de bruja ---------- */
    function gorros() {
      if (!window.MCBuho) return;
      MCBuho.accesorio = GORRO;
      document.querySelectorAll('.mc-buho .b-cuerpo').forEach(function (g) { if (!g.querySelector('.acc-gorro')) g.insertAdjacentHTML('beforeend', GORRO); });
    }

    /* ---------- inicio: saludo, aviso y ambiente ---------- */
    var EN_INICIO = /(^|\/)(index\.html)?$/.test(location.pathname);
    function dias() {
      if (!c.fin) return '';
      var n = Math.round((new Date(c.fin + 'T12:00:00') - new Date(hoyLima() + 'T12:00:00')) / 864e5);
      return n <= 0 ? 'Último día del evento' : 'Termina en ' + n + (n === 1 ? ' día' : ' días');
    }
    function inicio() {
      var h = document.getElementById('salNombre');
      if (h) {
        var mano = h.querySelector('.mi.mano');
        if (mano) { var s = document.createElement('span'); s.className = 'hal-cal'; s.innerHTML = CALABAZA; mano.replaceWith(s); }
        if (!document.querySelector('.hal-eyebrow')) h.insertAdjacentHTML('beforebegin', '<div class="hal-eyebrow">Feliz Halloween</div>');
      }
      var sal = document.getElementById('saludo');
      if (sal && !document.querySelector('.hal-banda')) {
        var b = document.createElement('div'); b.className = 'hal-banda';
        b.innerHTML = '<span class="ic">' + CALABAZA + '</span><span class="tx"><small>Semana de Halloween' + (dias() ? ' · ' + dias() : '') + '</small>' +
          '<b>Que no te asusten las preguntas</b><span class="m"></span></span>' +
          '<button type="button" class="hal-amb" aria-pressed="false" title="Viento, búho, campanas y truenos de fondo mientras estudias"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5z"/></svg><span>Ambiente</span></button>';
        b.querySelector('.m').textContent = c.mensaje || 'Practica de noche o de día: cada acierto te deja un dulce y cada error se va con un fantasma.';
        sal.parentNode.insertBefore(b, sal);
        var bt = b.querySelector('.hal-amb');
        function pintarAmb() { var on = ambiente.on(); bt.classList.toggle('on', on); bt.setAttribute('aria-pressed', on); bt.lastChild.textContent = on ? 'Ambiente on' : 'Ambiente'; }
        bt.addEventListener('click', function () { ambiente.cambiar(); pintarAmb(); });
        pintarAmb();
      }
    }
    /* ---------- el verde limo escrito a mano en cada página pasa a los colores de Halloween ---------- */
    // Muchas páginas traen #C6E000 / #8fa300 fijos (sombras de botones, bordes, íconos). Se cambian al vuelo,
    // así funciona en todas las páginas sin tocarlas.
    // El navegador devuelve los colores como rgb(), así que se buscan en ese formato además del hex
    function rgb(r, g, b) { return 'rgba?\\(\\s*' + r + '\\s*,\\s*' + g + '\\s*,\\s*' + b + '\\s*(?:,\\s*([\\d.]+)\\s*)?\\)'; }
    var OSC = new RegExp('#8fa300|#7a8f00|' + rgb(143, 163, 0) + '|' + rgb(122, 143, 0), 'gi'),
        CLARO = new RegExp('#c6e000|' + rgb(198, 224, 0), 'gi'),
        TEXTO = new RegExp('#2b3300|#1f2600|' + rgb(43, 51, 0) + '|' + rgb(31, 38, 0), 'gi'),
        CREMA = new RegExp('#f5ffcc|' + rgb(245, 255, 204), 'gi'),
        BRILLO = new RegExp('#d6f23a|' + rgb(214, 242, 58), 'gi'),
        LIMA = new RegExp([OSC.source, CLARO.source, TEXTO.source, CREMA.source, BRILLO.source].join('|'), 'i');
    function alfa(a) { return a == null ? 1 : +a; }
    function cambiaColor(v, mezcla) {
      return v.replace(OSC, function (m, a, b) { var x = alfa(a != null ? a : b); return mezcla ? 'color-mix(in srgb,color-mix(in srgb,var(--accent) 62%,#000) ' + Math.round(x * 100) + '%,transparent)' : 'rgba(185,71,10,' + x + ')'; })
        .replace(CLARO, function (m, a) { var x = alfa(a); return mezcla ? 'color-mix(in srgb,var(--accent) ' + Math.round(x * 100) + '%,transparent)' : 'rgba(255,138,31,' + x + ')'; })
        .replace(TEXTO, '#1f0a00')
        .replace(CREMA, '#fff1e0')
        .replace(BRILLO, '#FFB15A');
    }
    // Se cambia el valor dentro de la misma regla (no se copia encima), así el orden de las reglas
    // de cada página se respeta y un estilo que la página ya pisaba no vuelve a aparecer.
    var MEZCLA = !!(window.CSS && CSS.supports && CSS.supports('color', 'color-mix(in srgb, red 50%, transparent)'));
    var cambiados = [], vistas = typeof WeakSet === 'function' ? new WeakSet() : null;
    function cambiaReglas(reglas) {
      for (var i = 0; i < reglas.length; i++) {
        var r = reglas[i];
        if (r.cssRules && (r.media || r.conditionText)) { cambiaReglas(r.cssRules); continue; }
        if (!r.selectorText || !r.style || !LIMA.test(r.style.cssText)) continue;
        var esRaiz = /(^|,)\s*(:root|html)\b/.test(r.selectorText), props = [];
        for (var k = 0; k < r.style.length; k++) props.push(r.style[k]);
        props.forEach(function (n) {
          var v = r.style.getPropertyValue(n), pr = r.style.getPropertyPriority(n);
          if (!LIMA.test(v)) return;
          var esVar = n.indexOf('--') === 0;
          if (esVar && esRaiz) return; // las variables globales ya las define el tema
          cambiados.push([r.style, n, v, pr]);
          r.style.setProperty(n, cambiaColor(v, MEZCLA && !esVar), pr);
        });
      }
    }
    function recolorear() {
      for (var i = 0; i < document.styleSheets.length; i++) {
        var h = document.styleSheets[i];
        if (h.ownerNode === st || (vistas && vistas.has(h))) continue;
        var reglas; try { reglas = h.cssRules; } catch (e) { continue; } // hojas de otro dominio
        if (vistas) vistas.add(h);
        cambiaReglas(reglas);
      }
    }
    quitar.push(function () { cambiados.forEach(function (c) { try { c[0].setProperty(c[1], c[2], c[3]); } catch (e) {} }); cambiados = []; });

    var vigia = null, tColor = null;
    function revisar() {
      gorros(); if (EN_INICIO) inicio();
      clearTimeout(tColor); tColor = setTimeout(recolorear, 60);
    }
    function empezar() {
      revisar();
      vigia = new MutationObserver(function () { revisar(); });
      vigia.observe(document.documentElement, { childList: true, subtree: true });
      window.addEventListener('load', recolorear);
    }
    quitar.push(function () {
      if (vigia) vigia.disconnect();
      if (window.MCBuho) MCBuho.accesorio = '';
      document.querySelectorAll('.acc-gorro,.hal-banda,.hal-eyebrow').forEach(function (e) { e.remove(); });
      document.querySelectorAll('.hal-cal').forEach(function (e) { e.remove(); });
    });

    /* ---------- sonidos de Halloween (mismo botón de silencio de siempre) ---------- */
    var S = window.MCSonido, M = S && S.motor, orig = {};
    function pop(svg, n, clase) {
      for (var k = 0; k < n; k++) {
        var e = document.createElement('div'); e.className = clase; e.innerHTML = svg(k);
        if (clase === 'hal-pop') { e.style.setProperty('--dx', (Math.random() * 220 - 110).toFixed(0) + 'px'); e.style.setProperty('--dy', (-140 - Math.random() * 140).toFixed(0) + 'px'); e.style.setProperty('--r', (Math.random() * 300 - 150).toFixed(0) + 'deg'); e.style.animationDelay = (k * 0.05) + 's'; }
        document.body.appendChild(e);
        setTimeout(e.remove.bind(e), 1800);
      }
    }
    var COLORES = [NAR, MOR, LIMO, '#FF5A8A', '#FFC21A'];
    if (S && M && c.sonidos !== false) {
      var nota = M.nota, soplo = M.soplo, hoot = M.hoot, aire = M.aire;
      // Mi menor con notas de caja de música: suena a misterio pero contento
      var MI4 = 329.63, SOL4 = 392, SI4 = 493.88, MI5 = 659.25, FA5S = 739.99, SOL5 = 783.99, SI5 = 987.77, MI6 = 1318.5, LA3 = 220, RE4 = 293.66, FA4 = 349.23, LA4 = 440;
      function caja(f, t, vol) { nota(f, t, 0.5, 'triangle', vol || 0.14); nota(f * 2, t, 0.25, 'sine', (vol || 0.14) * 0.3); }
      function caldero(desde, hasta, vol, t) { nota(desde, t || 0, 0.14, 'sine', vol || 0.24, hasta); nota(desde * 0.5, (t || 0) + 0.02, 0.12, 'sine', (vol || 0.24) * 0.4, hasta * 0.5); }
      var NUEVO = {
        toque: function () { caldero(170, 520, 0.24); },
        area: function () { caldero(150, 560, 0.26); soplo(0.18, 0.05, 300, 1200, 0.03); },
        curso: function () { caldero(160, 600, 0.24); caja(SI5, 0.07, 0.05); },
        seccion: function () { caldero(200, 520, 0.18); },
        tema: function () { caldero(220, 700, 0.2); },
        volver: function () { nota(560, 0, 0.12, 'sine', 0.2, 170); },
        practicar: function () { caldero(160, 560, 0.24); [MI5, SOL5, SI5].forEach(function (f, i) { caja(f, 0.09 + i * 0.07, 0.1); }); },
        // Acierto: caja de música que sube, con eco
        bien: function () {
          [MI5, SOL5, SI5, MI6].forEach(function (f, i) { caja(f, i * 0.07, 0.13); caja(f, 0.32 + i * 0.07, 0.035); });
          pop(function (k) { return DULCE(COLORES[k % COLORES.length]); }, 6, 'hal-pop');
        },
        // Fallo: un fantasmita que dice "uuuh" (suave, sin castigo)
        mal: function () { hoot(470, 0, 0.75, 0.2, 300); aire(0, 0.7, 0.05, 500); pop(function () { return FANTASMA; }, 1, 'hal-boo'); },
        empezar: function () { soplo(0.5, 0.08, 200, 900); [RE4, FA4, LA4].forEach(function (f) { nota(f, 0.05, 0.9, 'sawtooth', 0.025); nota(f, 0.05, 0.9, 'triangle', 0.08); }); },
        racha: function () { caldero(160, 560); [MI5, SOL5, SI5, MI6].forEach(function (f, i) { caja(f, 0.1 + i * 0.06, 0.08); }); },
        abrir: function () { [SI4, MI5, SOL5, SI5].forEach(function (f, i) { caja(f, i * 0.08, 0.13); }); soplo(0.4, 0.04, 3000, 7000, 0.25); },
        // Fin de ronda: risa de bruja + campanas si te fue bien; campana grave si no
        fin: function (pct) {
          if (pct >= 70) {
            [MI5, SOL5, SI5, MI6].forEach(function (f, i) { caja(f, i * 0.12, 0.15); });
            [0, 1, 2, 3, 4].forEach(function (i) { nota(980 - i * 60, 0.6 + i * 0.09, 0.08, 'sawtooth', 0.035, 760 - i * 60); });
            pop(function (k) { return DULCE(COLORES[k % COLORES.length]); }, 10, 'hal-pop');
          } else { nota(LA3, 0, 1.4, 'sine', 0.2); nota(LA3 * 2.76, 0, 0.9, 'sine', 0.05); nota(MI4, 0.4, 1, 'triangle', 0.1); }
        },
        perder: function () { soplo(1.1, 0.12, 120, 60); hoot(330, 0.1, 1.1, 0.2, 180); },
        tic: function (s) { nota(s > 1 ? 1200 : 1500, 0, 0.04, 'triangle', 0.08); nota(s > 1 ? 300 : 360, 0, 0.06, 'sine', 0.06); }
      };
      Object.keys(NUEVO).forEach(function (k) { orig[k] = S[k]; S[k] = NUEVO[k]; });
      quitar.push(function () { Object.keys(orig).forEach(function (k) { S[k] = orig[k]; }); });
    }

    /* ---------- ambiente: viento, un zumbido grave y sustos lejanos ---------- */
    var ambiente = (function () {
      var on = false, nodos = null, timer = null;
      try { on = localStorage.getItem(AMB) === '1'; } catch (e) {}
      function arrancar() {
        if (nodos || !on || !M || !S.activo) return;
        var a = M.audio(); if (!a || a.state !== 'running') return;
        var out = a.createGain(); out.gain.setValueAtTime(0.0001, a.currentTime); out.gain.exponentialRampToValueAtTime(1, a.currentTime + 2.5); out.connect(M.salida());
        var n = a.sampleRate * 4, b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0), u = 0;
        for (var i = 0; i < n; i++) { u = (u + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = u * 3.5; }
        var ruido = a.createBufferSource(); ruido.buffer = b; ruido.loop = true;
        var fl = a.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 420; fl.Q.value = 6;
        var lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 260; lfo.connect(lg); lg.connect(fl.frequency);
        var vg = a.createGain(); vg.gain.value = 0.09; ruido.connect(fl); fl.connect(vg); vg.connect(out);
        var dr1 = a.createOscillator(), dr2 = a.createOscillator(), dg = a.createGain();
        dr1.frequency.value = 55; dr2.frequency.value = 82.6; dr1.type = dr2.type = 'sine'; dg.gain.value = 0.025;
        dr1.connect(dg); dr2.connect(dg); dg.connect(out);
        [ruido, lfo, dr1, dr2].forEach(function (x) { x.start(); });
        nodos = { out: out, fuentes: [ruido, lfo, dr1, dr2] };
        trueno();
        (function susto() {
          timer = setTimeout(function () {
            if (!nodos) return;
            var r = Math.random();
            if (r < 0.3) { if (S.buho) S.buho('normal'); }            // búho a lo lejos
            else if (r < 0.6) { nota(196, 0, 3, 'sine', 0.06); nota(196 * 2.76, 0, 2, 'sine', 0.015); } // campana lejana
            else { nota(95, 0, 0.6, 'sawtooth', 0.02, 70); soplo(0.6, 0.03, 300, 160); }      // puerta que cruje
            susto();
          }, 14000 + Math.random() * 16000);
        })();
      }
      // El trueno suena con cada relámpago del cielo (el destello va al 90.6% de un ciclo de 17 s)
      var tTrueno = null;
      function trueno() {
        clearTimeout(tTrueno);
        var r = document.querySelector('.hal-rayo'), an = r && r.getAnimations && r.getAnimations()[0];
        if (!an || an.currentTime == null) return;
        var falta = 15402 - an.currentTime % 17000; if (falta < 0) falta += 17000;
        tTrueno = setTimeout(function () {
          if (!nodos) return;
          soplo(0.25, 0.09, 1800, 600);                                   // chasquido del rayo
          setTimeout(function () { if (!nodos) return; soplo(2.8, 0.13, 240, 40); nota(41, 0, 2.4, 'sine', 0.06, 30); }, 350); // retumbo
          trueno();
        }, falta);
      }
      function parar() {
        if (!nodos) return;
        clearTimeout(tTrueno);
        var a = M.audio() || nodos.out.context, n = nodos; nodos = null; clearTimeout(timer);
        try { n.out.gain.cancelScheduledValues(a.currentTime); n.out.gain.setValueAtTime(n.out.gain.value || 1, a.currentTime); n.out.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.6); } catch (e) {}
        setTimeout(function () { n.fuentes.forEach(function (x) { try { x.stop(); } catch (e) {} }); n.out.disconnect(); }, 700);
      }
      // El navegador solo deja sonar después de un toque
      function toque() { setTimeout(arrancar, 30); }
      document.addEventListener('pointerdown', toque, true);
      document.addEventListener('keydown', toque, true);
      // El botón de silencio de siempre también apaga el ambiente
      var mira = setInterval(function () { if (S && !S.activo) parar(); }, 800);
      quitar.push(function () { parar(); clearInterval(mira); document.removeEventListener('pointerdown', toque, true); document.removeEventListener('keydown', toque, true); });
      return {
        on: function () { return on; },
        cambiar: function () {
          on = !on;
          try { localStorage.setItem(AMB, on ? '1' : '0'); } catch (e) {}
          if (on) { if (S && !S.activo) S.cambiar(); arrancar(); } else parar();
        }
      };
    })();

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', empezar); else empezar();

    return function () { quitar.reverse().forEach(function (f) { try { f(); } catch (e) {} }); };
  }
})();
