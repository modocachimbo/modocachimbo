/* =========================================================
   Modo Cachimbo · El sobre del acceso («¡Acceso activado!»)
   - Llega cuando al alumno le activan algo: por ID desde el panel
     (Ficha del alumno, +30 días, regalo de acceso) o cuando él mismo
     activa un código en el inicio. Un sobre verde con un candado
     abierto en el lacre: al tocarlo se rompe el sello, se abre la
     tapa y sale el pase con lo que se abrió y hasta cuándo.
   - window.MCPase.abrir({ accesos: [{ producto, vence }], codigo, sinSobre })
       producto: 'TODO-VIP', 'general', 'simulacro', 'area-matematica', 'a,b'...
       vence:    'AAAA-MM-DD' o vacío (sin fecha de fin)
       codigo:   si lo activó el alumno con un código (se ve en el pase)
       sinSobre: true salta el sobre y muestra el pase directo
     Devuelve una promesa que se cumple al cerrar.
   - Sin emojis: todos los íconos son SVG.
   ========================================================= */
(function () {
  if (window.MCPase) return;
  var script = document.currentScript;
  var BASE = script && script.src ? script.src.replace(/assets\/pase\.js(\?.*)?$/, '') : './';
  var BUHO = BASE + 'assets/buho/avatar/clasico.webp';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var quieto = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var NOM = { 'TODO-VIP': 'Acceso total', general: 'Acceso general', 'seminario-VIP': 'Seminarios + Banqueo', 'vocabulario-VIP': 'Vocabulario', 'biblioteca-VIP': 'Biblioteca', 'descarga-VIP': 'Descargas PDF', simulacro: 'Simulacro', duelo: 'Duelos', examenes: 'Exámenes',
    'area-matematica': 'Área Matemática', 'area-ciencia-tecnologia': 'Área Ciencia y Tecnología', 'area-comunicacion': 'Área Comunicación', 'area-ciencias-sociales': 'Área Ciencias Sociales' };
  // Lo que abre cada acceso, en palabras del alumno
  var ABRE = {
    'TODO-VIP': ['Practicar dentro de todos los libros', 'Repaso y Fijas de todos los cursos', 'Simulacro, duelos y exámenes', 'Seminarios, banqueo, vocabulario y biblioteca'],
    general: ['Practicar, Repaso y Fijas de todos los cursos', 'Simulacro de 80 preguntas', 'Duelos con tus amigos y exámenes'],
    'seminario-VIP': ['Seminarios de todos los cursos', 'Banqueo de preguntas'],
    'vocabulario-VIP': ['Vocabulario completo'],
    'biblioteca-VIP': ['Toda la biblioteca'],
    'descarga-VIP': ['Descargar los temas en PDF'],
    simulacro: ['Simulacro de 80 preguntas con tu puntaje'],
    duelo: ['Retar a duelo a tus amigos'],
    examenes: ['Exámenes de admisión resueltos'],
    area: ['Practicar, Repaso y Fijas de los cursos del área']
  };
  function partes(p) { return String(p || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean); }
  function nombre(p) { return partes(p).map(function (x) { return NOM[x] || x.replace(/-VIP$/, '').replace(/^(curso|repaso|fijas|tarjetas)-/, ''); }).join(' + '); }
  function abre(lista) {
    var out = [];
    lista.forEach(function (a) { partes(a.producto).forEach(function (x) {
      (ABRE[x] || (/^area-/.test(x) ? ABRE.area : [])).forEach(function (t) { if (out.indexOf(t) < 0) out.push(t); });
    }); });
    return out.slice(0, 4);
  }
  function hoy() { var d = new Date(Date.now() - 5 * 3600 * 1000); return d.toISOString().slice(0, 10); }
  function dias(v) { return Math.round((Date.parse(v + 'T00:00:00Z') - Date.parse(hoy() + 'T00:00:00Z')) / 864e5) + 1; }
  var MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
  function fecha(v) { var p = v.split('-'); return +p[2] + ' de ' + MES[+p[1] - 1] + ' de ' + p[0]; }

  var I = {
    candado: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M15 21v-6a9 9 0 0 1 17.6-2.7" fill="none" stroke="#1a1f00" stroke-width="5" stroke-linecap="round"/><rect x="9" y="21" width="30" height="21" rx="6" fill="#1a1f00"/><circle cx="24" cy="30" r="3.4" fill="#C6E000"/><path d="M24 32v5" stroke="#C6E000" stroke-width="3" stroke-linecap="round"/></svg>',
    candado2: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M15 21v-6a9 9 0 0 1 17.6-2.7" fill="none" stroke="#C6E000" stroke-width="5" stroke-linecap="round"/><rect x="9" y="21" width="30" height="21" rx="6" fill="#C6E000"/><circle cx="24" cy="30" r="3.4" fill="#1a1f00"/><path d="M24 32v5" stroke="#1a1f00" stroke-width="3" stroke-linecap="round"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#C6E000"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#1a1f00" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    equipos: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="13" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M1 18h15" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><rect x="16" y="8" width="7" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>',
    estrella: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z" fill="currentColor"/></svg>',
    flecha: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  function css() {
    if (document.getElementById('mcp-css')) return;
    var st = document.createElement('style'); st.id = 'mcp-css';
    st.textContent =
      '.mcp{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;padding:16px;font-family:Nunito,sans-serif;color:#EEEAF7;-webkit-tap-highlight-color:transparent;overflow:hidden}' +
      '.mcp-fondo{position:absolute;inset:0;background:rgba(8,6,18,.88);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);opacity:0;transition:opacity .35s}' +
      '.mcp.ver .mcp-fondo{opacity:1}' +
      '.mcp-luz{position:absolute;left:50%;top:50%;width:640px;height:640px;margin:-320px 0 0 -320px;border-radius:50%;background:radial-gradient(circle,rgba(198,224,0,.30),rgba(198,224,0,.06) 45%,transparent 68%);opacity:0;transition:opacity .6s .2s;pointer-events:none}' +
      '.mcp.ver .mcp-luz{opacity:1}' +
      '.mcp-rayos{position:absolute;left:50%;top:50%;width:900px;height:900px;margin:-450px 0 0 -450px;background:repeating-conic-gradient(rgba(198,224,0,.07) 0 9deg,transparent 9deg 24deg);-webkit-mask:radial-gradient(circle,#000 20%,transparent 62%);mask:radial-gradient(circle,#000 20%,transparent 62%);opacity:0;pointer-events:none;animation:mcpGira 40s linear infinite}' +
      '.mcp.carta .mcp-rayos{opacity:1;transition:opacity .8s .3s}' +
      // Cerrado
      '.mcp-cerrado{position:relative;display:flex;flex-direction:column;align-items:center;gap:clamp(34px,7vh,64px);transition:opacity .35s,transform .35s}' +
      '.mcp-tit{text-align:center;animation:mcpBaja .5s cubic-bezier(.2,1.2,.4,1) .15s both}' +
      '.mcp-tit small{display:block;font:1000 12px Nunito,sans-serif;letter-spacing:3px;color:#C6E000;text-transform:uppercase}' +
      '.mcp-tit h2{margin:6px 0 0;font:italic 900 clamp(38px,11vw,58px)/1 "Barlow Condensed",Nunito,sans-serif;text-transform:uppercase;letter-spacing:.01em;color:#fff;text-shadow:0 4px 0 rgba(0,0,0,.4)}' +
      '.mcp-tit h2 b{color:#C6E000}' +
      '.mcp-pie{display:flex;flex-direction:column;align-items:center;gap:12px;animation:mcpSube .4s ease-out .9s both}' +
      '.mcp-pie p{margin:0;font:900 14px Nunito,sans-serif;color:#A99FC8}.mcp-pie p b{color:#fff}' +
      '.mcp-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font:1000 15px Nunito,sans-serif;text-transform:uppercase;letter-spacing:.6px;border-radius:16px;padding:14px 30px;border:2px solid;border-bottom-width:6px;cursor:pointer;white-space:nowrap;transition:transform .12s,border-bottom-width .12s}' +
      '.mcp-btn svg{width:18px;height:18px}' +
      '.mcp-btn:active{transform:translateY(3px);border-bottom-width:3px}' +
      '.mcp-btn:focus{outline:none}.mcp-btn:focus-visible,.mcp-sobre:focus-visible{outline:3px solid #fff;outline-offset:3px}.mcp-sobre:focus{outline:none}' +
      '.mcp-btn.si{background:#C6E000;color:#1a1f00;border-color:#8fa300}' +
      // El sobre: oscuro con borde lima (el de regalos es morado)
      '.mcp-sobre{position:relative;width:min(300px,78vw);aspect-ratio:300/210;cursor:pointer;animation:mcpLlega .8s cubic-bezier(.2,1.3,.4,1) both}' +
      '.mcp-sobre-in{position:absolute;inset:0;animation:mcpSacude 2.6s ease-in-out 1.2s infinite;transform-origin:50% 90%;perspective:900px}' +
      '.mcp-sobre:hover .mcp-sobre-in{animation-play-state:paused}' +
      '.mcp-atras{position:absolute;inset:0;border-radius:16px;z-index:1;background:#15112a;box-shadow:0 22px 40px rgba(0,0,0,.55)}' +
      '.mcp-ticket{position:absolute;left:9%;right:9%;top:6%;height:70%;border-radius:12px;z-index:0;background:linear-gradient(135deg,#e9ff6a,#C6E000 55%,#a9c200);padding:12px 14px;color:#1a1f00;font:1000 12px Nunito,sans-serif;letter-spacing:1.5px;text-transform:uppercase;box-shadow:0 4px 0 rgba(0,0,0,.18);transition:transform .6s cubic-bezier(.3,1.25,.5,1),opacity .3s}' +
      '.mcp-ticket i{display:block;height:7px;border-radius:4px;background:rgba(26,31,0,.18);margin-top:8px}' +
      '.mcp-frente{position:absolute;inset:0;border-radius:16px;z-index:3;clip-path:polygon(0 30%,50% 64%,100% 30%,100% 100%,0 100%);background:linear-gradient(180deg,#2c2650,#1D1834)}' +
      '.mcp-borde{position:absolute;inset:0;border-radius:16px;border:3px solid #C6E000;border-bottom-width:7px;border-bottom-color:#6f8000;pointer-events:none;z-index:3}' +
      '.mcp-tapa{position:absolute;left:0;right:0;top:0;height:64%;transform-origin:50% 0;z-index:4;transition:transform .5s cubic-bezier(.4,0,.2,1)}' +
      '.mcp-tapa:before{content:"";position:absolute;inset:0;clip-path:polygon(0 0,100% 0,50% 100%);background:linear-gradient(180deg,#3a3268,#262046);border-radius:16px 16px 0 0}' +
      '.mcp-tapa:after{content:"";position:absolute;inset:0;clip-path:polygon(0 0,100% 0,50% 100%,50% 94%,95% 3%,5% 3%,50% 94%,50% 100%);background:#C6E000;opacity:.35}' +
      '.mcp-para{position:absolute;left:6%;bottom:8%;z-index:4;font:900 12px Nunito,sans-serif;letter-spacing:1px;text-transform:uppercase;color:#A99FC8;transition:opacity .2s}.mcp-para b{color:#C6E000}.mcp.abre .mcp-para{opacity:0}' +
      '.mcp-sello{position:absolute;right:6%;bottom:8%;z-index:4;width:30px;height:30px;color:#C6E000;opacity:.8;transition:opacity .2s}.mcp-sello svg{width:100%;height:100%}.mcp.abre .mcp-sello{opacity:0}' +
      '.mcp-lacre{position:absolute;left:50%;top:64%;width:27%;aspect-ratio:1;transform:translate(-50%,-50%);z-index:5;border-radius:44% 56% 48% 52%;background:radial-gradient(circle at 35% 30%,#efff7a,#C6E000 45%,#8fa300);box-shadow:0 5px 0 #5f6d00;display:grid;place-items:center;animation:mcpBrilla 1.6s ease-in-out infinite}' +
      '.mcp-lacre svg{width:56%;height:56%}' +
      '.mcp-cinta{position:absolute;right:-10px;top:7%;z-index:7;background:#C6E000;color:#1a1f00;font:1000 11px Nunito,sans-serif;letter-spacing:1px;padding:5px 10px;border-radius:8px;transform:rotate(8deg);box-shadow:0 3px 0 #6f8000;transition:opacity .2s}' +
      '.mcp-chispa{position:absolute;left:50%;top:64%;width:8px;height:8px;margin:-4px;border-radius:50%;z-index:6;pointer-events:none;opacity:0}' +
      // Abriendo
      '.mcp.abre .mcp-sobre-in{animation:none}' +
      '.mcp.abre .mcp-lacre{animation:mcpRompe .35s ease-in forwards}' +
      '.mcp.abre .mcp-cinta{opacity:0}.mcp.abre .mcp-borde{border-top-color:transparent}' +
      '.mcp.abre .mcp-chispa{animation:mcpChispa .6s ease-out forwards}' +
      '.mcp.abre .mcp-tapa{transform:rotateX(180deg);transition-delay:.2s;animation:mcpAtras .7s steps(1) forwards}' +
      '.mcp.abre .mcp-ticket{transform:translateY(-62%);transition-delay:.5s;animation:mcpZ .45s steps(1) forwards}' +
      '.mcp.abre .mcp-tit,.mcp.abre .mcp-pie{animation:mcpSeVa .35s ease-in forwards}' +
      '.mcp.carta .mcp-cerrado{opacity:0;transform:translateY(60px) scale(.92);pointer-events:none}' +
      // El pase
      '.mcp-pase{position:absolute;width:min(360px,calc(100vw - 32px));max-height:calc(100% - 32px);overflow:auto;border-radius:24px;background:#1D1834;border:2px solid #3a3268;border-bottom:7px solid #C6E000;box-shadow:0 24px 70px rgba(0,0,0,.65);opacity:0;transform:translateY(80px) scale(.5) rotate(-4deg);pointer-events:none}' +
      '.mcp.carta .mcp-pase{opacity:1;transform:none;pointer-events:auto;transition:transform .6s cubic-bezier(.2,1.3,.4,1),opacity .25s}' +
      '.mcp-cab{position:relative;display:flex;align-items:center;gap:10px;padding:13px 16px;background:linear-gradient(90deg,#C6E000,#e3ff4a);color:#1a1f00;overflow:hidden}' +
      '.mcp-cab:after{content:"";position:absolute;top:0;bottom:0;width:40%;left:-50%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.65),transparent);animation:mcpBrillo 2.8s ease-in-out 1.2s infinite}' +
      '.mcp-cab .mcp-ic{width:34px;height:34px;border-radius:10px;background:#1a1f00;display:grid;place-items:center;flex:none}' +
      '.mcp-cab .mcp-ic svg{width:22px;height:22px}' +
      '.mcp-cab b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:italic 900 23px/1 "Barlow Condensed",Nunito,sans-serif;text-transform:uppercase;letter-spacing:.5px}' +
      '.mcp-cab span{flex:none;margin-left:auto;font:1000 10px Nunito,sans-serif;letter-spacing:1px;background:#1a1f00;color:#C6E000;border-radius:8px;padding:4px 7px;white-space:nowrap}@media (max-width:380px){.mcp-cab span{display:none}}' +
      '.mcp-cuerpo{display:flex;flex-direction:column}' +
      '.mcp-izq{padding:16px 18px 6px;text-align:center;position:relative}' +
      '.mcp-buho{width:76px;height:76px;margin:0 auto;border-radius:20px;background:#2a2450;border:3px solid #C6E000;display:grid;place-items:center;overflow:hidden;animation:mcpPop .5s cubic-bezier(.2,1.6,.4,1) .45s both}' +
      '.mcp-buho img{width:92%}' +
      '.mcp-para2{margin-top:10px;font:900 11px Nunito,sans-serif;letter-spacing:1.5px;text-transform:uppercase;color:#A99FC8}.mcp-para2 b{color:#fff}' +
      '.mcp-nom{margin:6px 0 2px;font:italic 900 clamp(32px,9vw,40px)/1 "Barlow Condensed",Nunito,sans-serif;text-transform:uppercase;color:#C6E000;text-shadow:0 3px 0 rgba(0,0,0,.35);overflow-wrap:anywhere}' +
      '.mcp-cod{display:inline-block;margin-top:6px;font:1000 11px ui-monospace,Menlo,monospace;letter-spacing:1.5px;color:#A99FC8;background:#13102a;border:1px dashed #3a3268;border-radius:8px;padding:4px 8px}' +
      '.mcp-corte{position:relative;height:22px;margin:8px 0}' +
      '.mcp-corte:before{content:"";position:absolute;left:18px;right:18px;top:50%;border-top:2px dashed #3a3268}' +
      '.mcp-corte i{position:absolute;top:0;width:22px;height:22px;border-radius:50%;background:#0b0918}.mcp-corte i:first-child{left:-13px}.mcp-corte i:last-child{right:-13px}' +
      '.mcp-der{padding:0 18px 18px}' +
      '.mcp-der>small{display:block;font:1000 11px Nunito,sans-serif;letter-spacing:2px;color:#A99FC8;text-transform:uppercase;margin-bottom:8px}' +
      '.mcp-lista{list-style:none;margin:0 0 14px;padding:0;display:grid;gap:8px}' +
      '.mcp-lista li{display:flex;align-items:center;gap:10px;font:900 14px/1.25 Nunito,sans-serif;color:#EEEAF7;background:#241f40;border-radius:12px;padding:9px 11px;opacity:0}' +
      '.mcp.carta .mcp-lista li{animation:mcpEntra .4s cubic-bezier(.2,1.3,.4,1) both;animation-delay:calc(.55s + var(--i) * .1s)}' +
      '.mcp-lista svg{width:22px;height:22px;flex:none}' +
      '.mcp-datos{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px}' +
      '.mcp-dato{display:flex;gap:8px;align-items:flex-start;background:#13102a;border-radius:12px;padding:9px 10px;color:#C6E000}' +
      '.mcp-dato svg{width:20px;height:20px;flex:none;margin-top:1px}' +
      '.mcp-dato div{font:800 12px/1.3 Nunito,sans-serif;color:#A99FC8}.mcp-dato b{display:block;font:1000 14px/1.2 Nunito,sans-serif;color:#fff}' +
      '.mcp-der .mcp-btn{width:100%}' +
      '.mcp-conf{position:absolute;inset:0;pointer-events:none;overflow:hidden}' +
      '.mcp-conf i{position:absolute;top:-16px;width:8px;height:14px;border-radius:2px;animation:mcpCae 2.4s cubic-bezier(.3,.6,.6,1) both}' +
      // Cerrar
      '.mcp.fin .mcp-pase{opacity:0;transform:translateY(-30px) scale(.94);transition:transform .35s ease-in,opacity .3s}' +
      '.mcp.fin .mcp-fondo,.mcp.fin .mcp-luz,.mcp.fin .mcp-rayos{opacity:0;transition:opacity .35s .2s}' +
      '@media (max-height:700px){.mcp-cerrado{gap:22px}.mcp-sobre{width:min(250px,70vw)}.mcp-buho{width:60px;height:60px}.mcp-lista li{padding:7px 10px;font-size:13px}}' +
      '@media (min-width:760px){' +
        '.mcp-sobre{width:380px}.mcp-pase{width:min(720px,calc(100vw - 48px))}' +
        '.mcp-cuerpo{flex-direction:row;align-items:stretch}.mcp-izq{flex:1;padding:26px 22px;display:flex;flex-direction:column;justify-content:center}' +
        '.mcp-corte{width:22px;height:auto;margin:0 4px}.mcp-corte:before{left:50%;right:auto;top:18px;bottom:18px;border-top:0;border-left:2px dashed #3a3268}' +
        '.mcp-corte i{display:none}' +
        '.mcp-der{flex:1.15;padding:24px 22px 22px 8px}.mcp-buho{width:96px;height:96px}.mcp-nom{font-size:46px}}' +
      '@keyframes mcpLlega{0%{transform:translateY(-70vh) rotate(-14deg) scale(.7);opacity:0}60%{opacity:1}100%{transform:none}}' +
      '@keyframes mcpSacude{0%,72%,100%{transform:none}76%{transform:rotate(-5deg)}80%{transform:rotate(5deg)}84%{transform:rotate(-3deg)}88%{transform:rotate(2deg)}}' +
      '@keyframes mcpBrilla{0%,100%{box-shadow:0 5px 0 #5f6d00,0 0 0 0 rgba(198,224,0,.55)}50%{box-shadow:0 5px 0 #5f6d00,0 0 0 14px rgba(198,224,0,0)}}' +
      '@keyframes mcpRompe{40%{transform:translate(-50%,-50%) scale(1.25) rotate(-8deg)}100%{transform:translate(-50%,-50%) scale(0) rotate(40deg);opacity:0}}' +
      '@keyframes mcpChispa{0%{transform:none;opacity:1}100%{transform:translate(var(--x),var(--y)) scale(.3);opacity:0}}' +
      '@keyframes mcpAtras{0%{z-index:4}50%,100%{z-index:1}}' +
      '@keyframes mcpZ{0%{z-index:0}100%{z-index:2}}' +
      '@keyframes mcpBaja{from{transform:translateY(-20px);opacity:0}to{transform:none;opacity:1}}' +
      '@keyframes mcpSube{from{transform:translateY(14px);opacity:0}to{transform:none;opacity:1}}' +
      '@keyframes mcpSeVa{to{transform:translateY(-10px);opacity:0}}' +
      '@keyframes mcpPop{from{opacity:0;transform:scale(.3) rotate(-10deg)}to{opacity:1;transform:none}}' +
      '@keyframes mcpEntra{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:none}}' +
      '@keyframes mcpBrillo{0%{left:-50%}45%,100%{left:120%}}' +
      '@keyframes mcpGira{to{transform:rotate(360deg)}}' +
      '@keyframes mcpCae{0%{transform:translateY(0) rotate(var(--r));opacity:1}100%{transform:translateY(105vh) rotate(calc(var(--r) + 540deg));opacity:.2}}' +
      '@media (prefers-reduced-motion:reduce){.mcp *,.mcp *:before,.mcp *:after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;transition-delay:0s!important}.mcp-conf,.mcp-rayos{display:none}}';
    document.head.appendChild(st);
  }

  function confeti() {
    var col = ['#C6E000', '#FF9600', '#1CB0F6', '#CE82FF', '#FFC800'], h = '';
    for (var i = 0; i < 34; i++) h += '<i style="left:' + ((i * 29 + 7) % 100) + '%;background:' + col[i % 5] + ';--r:' + (i * 47) + 'deg;animation-delay:' + (i % 9) * 70 + 'ms"></i>';
    return h;
  }
  function son(n) { try { if (window.MCSonido && MCSonido[n]) MCSonido[n](); } catch (e) {} }

  function abrir(o) {
    o = o || {};
    var lista = (o.accesos || []).filter(function (a) { return a && a.producto; });
    if (!lista.length) return Promise.resolve();
    css();
    var alumno = '';
    try { var u = window.MCAuth && MCAuth.usuario(), m = (u && u.user_metadata) || {}; alumno = (m.full_name || m.name || '').split(' ')[0]; } catch (e) {}
    if (o.nombre) alumno = o.nombre;
    var titulo = lista.map(function (a) { return nombre(a.producto); }).join(' · ');
    var vence = lista.map(function (a) { return a.vence; }).filter(Boolean).sort().pop() || '';
    var sinFin = lista.some(function (a) { return !a.vence; });
    var n = vence ? dias(vence) : 0;
    var cosas = abre(lista);
    var chispas = '', col = ['#C6E000', '#FFC800', '#fff', '#1CB0F6'];
    for (var i = 0; i < 12; i++) { var an = i / 12 * Math.PI * 2, r = 70 + (i % 3) * 18; chispas += '<i class="mcp-chispa" style="background:' + col[i % 4] + ';--x:' + Math.round(Math.cos(an) * r) + 'px;--y:' + Math.round(Math.sin(an) * r) + 'px"></i>'; }

    var datoFecha = sinFin || !vence
      ? '<div class="mcp-dato">' + I.cal + '<div><b>Sin fecha de fin</b>Tuyo para el ciclo</div></div>'
      : '<div class="mcp-dato">' + I.cal + '<div><b>' + (n > 0 ? n + (n === 1 ? ' día' : ' días') : 'Hoy') + '</b>Hasta el ' + esc(fecha(vence)) + '</div></div>';

    var d = document.createElement('div');
    d.className = 'mcp' + (o.sinSobre ? ' sinsobre' : ''); d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', 'Acceso activado');
    d.innerHTML = '<div class="mcp-fondo"></div><div class="mcp-luz"></div><div class="mcp-rayos"></div>' +
      (o.sinSobre ? '' :
      '<div class="mcp-cerrado">' +
        '<div class="mcp-tit"><small>Correo del búho</small><h2>Llegó tu <b>acceso</b></h2></div>' +
        '<div class="mcp-sobre" role="button" tabindex="0" aria-label="Abrir el sobre"><div class="mcp-sobre-in">' +
          '<div class="mcp-atras"></div>' +
          '<div class="mcp-ticket">Pase<i></i><i style="width:70%"></i><i style="width:45%"></i></div>' +
          '<div class="mcp-frente"></div><div class="mcp-borde"></div>' +
          '<div class="mcp-para">Para: <b>' + esc(alumno || 'ti') + '</b></div>' +
          '<div class="mcp-sello">' + I.estrella + '</div>' +
          '<div class="mcp-tapa"></div>' +
          '<div class="mcp-lacre">' + I.candado + '</div>' + chispas +
          '<div class="mcp-cinta">ACCESO</div>' +
        '</div></div>' +
        '<div class="mcp-pie"><button type="button" class="mcp-btn si mcp-abrir">Abrir</button><p><b>Toca el candado</b> para abrirlo</p></div>' +
      '</div>') +
      '<div class="mcp-conf"></div>' +
      '<div class="mcp-pase" aria-live="polite">' +
        '<div class="mcp-cab"><span class="mcp-ic">' + I.candado2 + '</span><b>¡Acceso activado!</b><span>' + (o.codigo ? 'CÓDIGO' : 'EN TU CUENTA') + '</span></div>' +
        '<div class="mcp-cuerpo">' +
          '<div class="mcp-izq"><div class="mcp-buho"><img src="' + esc(BUHO) + '" alt=""></div>' +
            '<div class="mcp-para2">' + (alumno ? 'Para <b>' + esc(alumno) + '</b>' : 'Para ti') + '</div>' +
            '<div class="mcp-nom">' + esc(titulo) + '</div>' +
            (o.codigo ? '<span class="mcp-cod">' + esc(o.codigo) + '</span>' : '') +
          '</div>' +
          '<div class="mcp-corte"><i></i><i></i></div>' +
          '<div class="mcp-der">' +
            (cosas.length ? '<small>Ya puedes usar</small><ul class="mcp-lista">' + cosas.map(function (t, k) { return '<li style="--i:' + k + '">' + I.check + esc(t) + '</li>'; }).join('') + '</ul>' : '') +
            '<div class="mcp-datos">' + datoFecha +
              '<div class="mcp-dato">' + I.equipos + '<div><b>Con tu Google</b>En tu celular o laptop</div></div></div>' +
            '<button type="button" class="mcp-btn si mcp-ok">Empezar ' + I.flecha + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(d);
    var antes = document.activeElement;
    requestAnimationFrame(function () { requestAnimationFrame(function () { d.classList.add('ver'); }); });
    var sobre = d.querySelector('.mcp-sobre');

    var abierto = false, listo;
    var fin = new Promise(function (r) { listo = r; });
    function mostrarPase() {
      d.classList.add('carta');
      d.querySelector('.mcp-conf').innerHTML = quieto ? '' : confeti();
      son('abrir');
    }
    function abrirSobre() {
      if (abierto) return; abierto = true;
      d.classList.add('abre');
      son('racha');
      if (navigator.vibrate) try { navigator.vibrate(30); } catch (e) {}
      setTimeout(mostrarPase, quieto ? 0 : 1150);
    }
    function cerrar() {
      if (d.classList.contains('fin')) return;
      d.classList.add('fin');
      document.removeEventListener('keydown', tecla);
      setTimeout(function () {
        d.remove();
        try { if (antes && antes.focus) antes.focus({ preventScroll: true }); } catch (e) {}
        listo();
      }, quieto ? 0 : 500);
    }
    function tecla(e) {
      if (e.key === 'Escape') { if (abierto) cerrar(); else abrirSobre(); }
      else if ((e.key === 'Enter' || e.key === ' ') && sobre && document.activeElement === sobre) { e.preventDefault(); abrirSobre(); }
    }
    document.addEventListener('keydown', tecla);
    if (o.sinSobre) { abierto = true; setTimeout(mostrarPase, 60); }
    else {
      setTimeout(function () { son('racha'); }, 350);
      sobre.addEventListener('click', abrirSobre);
      d.querySelector('.mcp-abrir').addEventListener('click', abrirSobre);
    }
    d.querySelector('.mcp-ok').addEventListener('click', cerrar);
    return fin;
  }

  window.MCPase = { abrir: abrir, nombre: nombre };
})();
