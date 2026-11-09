/* =========================================================
   Modo Cachimbo · Arcade · Mapa de niveles de un mundo (hecho con código)
   Estilo plano / low-poly: una isla verde con acantilado de tierra en medio
   de un río ancho, camino de arena en zigzag que sube y niveles hexagonales.
   Temática "sierra del Perú" para Historia del Perú: río, cascada, laguna, puente,
   andenes, portadas incas, chozas de piedra, huacos, chakanas, llamas, cóndor,
   cactus, montañas nevadas y el templo inca del jefe en la cima.
   - Cada nivel es un tema; el siguiente se abre al ganar el anterior.
   - El último nivel es el jefe del mundo.
   Uso: MCMundo.abrir(contenedor, { niveles, estrellas(t), max(t), completo(t), tocar(i, nivel, estado), tema, ancho })
   ========================================================= */
(function () {
  if (window.MCMundo) return;
  var W = 400, PASO = 128, ARR = 380, ABA = 150;

  // Paletas por mundo (para otro curso basta con otra paleta)
  var TEMAS_V = {
    sierra: {
      cielo: ['#8FD3F4', '#D6F0FA'], rio: ['#3DB7E3', '#1E86BE'], ola: '#B8ECFA',
      tierra: '#9A6436', tierra2: '#7A4A22', borde: '#2FAE4C', pasto: '#4CC85A', pasto2: '#62D466',
      arena: '#F6CF8E', arena2: '#E5AE62', agua: '#34B9D9', agua2: '#8BE3F4', espuma: '#E8FBFF',
      cubo: ['#5FD8B6', '#23A98C', '#177A68'], piedra: ['#B7B08C', '#8F8A68', '#6E6A4E'],
      monte: ['#9AA7C4', '#6F7EA0', '#55627F'], nieve: ['#FFFFFF', '#DCE6F5'], muro: ['#D9C49A', '#B39E74', '#8E7B55']
    }
  };
  TEMAS_V.andes = TEMAS_V.sierra;

  function azar(s) { return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function f(n) { return (+n).toFixed(1); }

  function css() {
    if (document.getElementById('mc-mundo-css')) return;
    var HEX = 'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)';
    var st = document.createElement('style'); st.id = 'mc-mundo-css';
    st.textContent = [
      '.mm{position:relative;width:100%;margin:0 auto;user-select:none;-webkit-user-select:none;background:#2A9FD3}',
      '.mm svg.paisaje{display:block;width:100%;height:auto}',
      '.mm .olas{animation:mmOla 6s ease-in-out infinite alternate}',
      '@keyframes mmOla{to{transform:translate(14px,4px)}}',
      '.mm .olas2{animation:mmOla2 7s ease-in-out infinite alternate}',
      '@keyframes mmOla2{to{transform:translate(-12px,-3px)}}',
      '.mm .cae{stroke-dasharray:10 14;animation:mmCae .7s linear infinite}',
      '@keyframes mmCae{to{stroke-dashoffset:-24}}',
      '.mm .corre{stroke-dasharray:8 12;animation:mmCae 1.4s linear infinite}',
      '.mm .fuego{transform-box:fill-box;transform-origin:center bottom;animation:mmFuego .45s ease-in-out infinite alternate}',
      '@keyframes mmFuego{from{transform:scale(1,1) skewX(-5deg)}to{transform:scale(1.12,.88) skewX(6deg)}}',
      '.mm .gira{transform-box:fill-box;transform-origin:center;animation:mmGira 40s linear infinite}',
      '@keyframes mmGira{to{transform:rotate(1turn)}}',
      '.mm .condor{animation:mmVuelo 24s linear infinite}',
      '@keyframes mmVuelo{0%{transform:translate(-80px,30px)}50%{transform:translate(220px,-6px)}100%{transform:translate(520px,24px)}}',
      '.mm .ala{transform-box:fill-box;transform-origin:center;animation:mmAla 1.1s ease-in-out infinite alternate}',
      '@keyframes mmAla{to{transform:scaleY(.5)}}',
      '.mm .bruma{animation:mmBruma 2.4s ease-in-out infinite alternate}',
      '@keyframes mmBruma{to{opacity:.35;transform:translateY(-3px)}}',
      '.mm .nubes{animation:mmNube 50s linear infinite alternate}',
      '@keyframes mmNube{to{transform:translateX(60px)}}',
      // Niveles: hexágonos con grosor
      '.mm .niv{position:absolute;z-index:2;width:21%;aspect-ratio:1.25/1;translate:-50% -55%;border:0;background:none;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .12s}',
      '.mm .niv:active{transform:translateY(3px)}',
      '.mm .niv .base,.mm .niv .disco{position:absolute;left:4%;right:4%;height:66%;clip-path:' + HEX + '}',
      '.mm .niv .base{top:24%;background:#6E6A5C}',
      '.mm .niv .disco{top:10%;display:grid;place-items:center;background:#C9C4B4}',
      '.mm .niv .disco::before{content:"";position:absolute;inset:12% 10%;clip-path:' + HEX + ';background:#DAD6C8}',
      '.mm .niv .sombra{position:absolute;left:10%;right:10%;top:62%;height:30%;border-radius:50%;background:rgba(40,60,10,.28)}',
      '.mm .niv b{position:relative;font:900 clamp(17px,5vw,28px)/1 Nunito,system-ui,sans-serif;color:#6E6A5C;text-shadow:0 2px 0 rgba(255,255,255,.55)}',
      '.mm .niv .cand{position:relative;width:30%;height:auto}',
      '.mm .niv.hecho .base{background:#B8650F}',
      '.mm .niv.hecho .disco{background:#FFB23F}',
      '.mm .niv.hecho .disco::before{background:#FFCB6B}',
      '.mm .niv.hecho b{color:#8A4A00;text-shadow:0 2px 0 rgba(255,255,255,.6)}',
      '.mm .niv.ahora{filter:drop-shadow(0 0 10px rgba(255,255,170,.95)) drop-shadow(0 0 22px rgba(120,255,120,.7));animation:mmLate 1.3s ease-in-out infinite}',
      '.mm .niv.ahora .base{background:#2E8A12}',
      '.mm .niv.ahora .disco{background:#6EDB2E}',
      '.mm .niv.ahora .disco::before{background:#A6F05C}',
      '.mm .niv.ahora b{color:#1F5A00;text-shadow:0 2px 0 rgba(255,255,255,.7)}',
      '@keyframes mmLate{50%{filter:drop-shadow(0 0 14px rgba(255,255,170,1)) drop-shadow(0 0 32px rgba(120,255,120,.9))}}',
      '.mm .niv.jefe{width:25%}',
      '.mm .niv.jefe .base{background:#8A1414}',
      '.mm .niv.jefe .disco{background:#E8343B}',
      '.mm .niv.jefe .disco::before{background:#FF5A5F}',
      '.mm .niv.jefe b{color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.35)}',
      '.mm .niv.jefe.bloq .disco,.mm .niv.jefe.bloq .base{filter:saturate(.35) brightness(.95)}',
      '.mm .niv .espadas{position:absolute;left:50%;bottom:78%;translate:-50% 0;width:56%;height:auto;filter:drop-shadow(0 3px 2px rgba(0,0,0,.3))}',
      '.mm .niv .est{position:absolute;top:96%;left:50%;translate:-50% 0;display:flex;gap:1px}',
      '.mm .niv .est svg{width:clamp(14px,3.8vw,21px);height:auto;filter:drop-shadow(0 1px 0 rgba(120,70,0,.6))}',
      '.mm .niv .pin{position:absolute;bottom:88%;left:50%;translate:-50% 0;padding:6px 12px 7px;border-radius:10px;background:#fff;color:#2E7A00;font:900 clamp(12px,3.3vw,15px)/1 Nunito,system-ui,sans-serif;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap;box-shadow:0 4px 0 #2E7A00,0 6px 12px rgba(0,0,0,.2);animation:mmSalta 1.1s ease-in-out infinite}',
      '.mm .niv .pin::after{content:"";position:absolute;top:100%;left:50%;translate:-50% 0;border:7px solid transparent;border-top-color:#fff}',
      '@keyframes mmSalta{50%{transform:translateY(-7px)}}',
      '.mm .niv .nom{position:absolute;top:92%;left:50%;translate:-50% 0;padding:3px 8px;border-radius:7px;background:rgba(70,45,10,.78);color:#FFF4D6;font:800 clamp(10px,2.8vw,12.5px)/1.15 Nunito,system-ui,sans-serif;white-space:nowrap;max-width:42vw;overflow:hidden;text-overflow:ellipsis;pointer-events:none}',
      '.mm .niv.hecho .nom{top:122%}'
    ].join('');
    document.head.appendChild(st);
  }

  var ESTRELLA = '<svg viewBox="0 0 24 24"><path d="m12 2 3 6.6 7 .8-5.2 4.8 1.5 7L12 17.6 5.7 21.2l1.5-7L2 9.4l7-.8z" fill="#FFD23F" stroke="#B87400" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  var ESTRELLA_V = '<svg viewBox="0 0 24 24"><path d="m12 2 3 6.6 7 .8-5.2 4.8 1.5 7L12 17.6 5.7 21.2l1.5-7L2 9.4l7-.8z" fill="#F7E7C0" stroke="#C9A55A" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  var CANDADO = '<svg class="cand" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2" fill="#7E7A6C"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="#7E7A6C" stroke-width="2.8" stroke-linecap="round"/><rect x="11" y="14" width="2" height="4" rx="1" fill="#DAD6C8"/></svg>';
  var ESPADAS = '<svg class="espadas" viewBox="0 0 48 30"><g stroke-linecap="round"><path d="M8 26 34 4" stroke="#E9EEF3" stroke-width="5"/><path d="M8 26 34 4" stroke="#B9C3CC" stroke-width="2"/><path d="M40 26 14 4" stroke="#E9EEF3" stroke-width="5"/><path d="M40 26 14 4" stroke="#B9C3CC" stroke-width="2"/><path d="M5 22l7 7M43 22l-7 7" stroke="#8A5A2A" stroke-width="4"/></g></svg>';

  function curva(p) {
    var d = 'M' + p[0][0] + ' ' + p[0][1];
    for (var i = 0; i < p.length - 1; i++) {
      var a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c;
      d += ' C' + f(b[0] + (c[0] - a[0]) / 6) + ' ' + f(b[1] + (c[1] - a[1]) / 6) + ' ' + f(c[0] - (e[0] - b[0]) / 6) + ' ' + f(c[1] - (e[1] - b[1]) / 6) + ' ' + c[0] + ' ' + c[1];
    }
    return d;
  }
  function poli(pts) { return pts.map(function (p) { return f(p[0]) + ',' + f(p[1]); }).join(' '); }
  function mancha(cx, cy, rx, ry, lados, r) {
    var p = [];
    for (var k = 0; k < lados; k++) { var a = k / lados * Math.PI * 2 + r() * .3, q = .82 + r() * .3; p.push([cx + Math.cos(a) * rx * q, cy + Math.sin(a) * ry * q]); }
    return p;
  }
  function centro(lb) { var cx = 0, cy = 0; lb.forEach(function (p) { cx += p[0]; cy += p[1]; }); return [cx / lb.length, cy / lb.length]; }

  /* ---------- Piezas planas ---------- */
  function arbolCubo(x, y, s, P) {
    var c = P.cubo, h = '<g transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + s.toFixed(2) + ')"><ellipse cx="0" cy="3" rx="22" ry="7" fill="rgba(20,60,10,.28)"/>';
    h += '<path d="M-4 2v-16h8v16z" fill="#7A4A22"/><path d="M0 2v-16h4v16z" fill="#5E3616"/>';
    function cubo(cx, cy, t) {
      return '<path d="M' + cx + ' ' + (cy - t) + ' l' + t + ' ' + (t / 2) + ' l-' + t + ' ' + (t / 2) + ' l-' + t + ' -' + (t / 2) + 'z" fill="' + c[0] + '"/>' +
        '<path d="M' + (cx - t) + ' ' + (cy - t / 2) + ' l' + t + ' ' + (t / 2) + ' v' + t + ' l-' + t + ' -' + (t / 2) + 'z" fill="' + c[1] + '"/>' +
        '<path d="M' + cx + ' ' + cy + ' l' + t + ' -' + (t / 2) + ' v' + t + ' l-' + t + ' ' + (t / 2) + 'z" fill="' + c[2] + '"/>';
    }
    h += cubo(-9, -16, 12) + cubo(10, -18, 12) + cubo(0, -30, 14);
    return h + '</g>';
  }
  function roca(x, y, s, P) {
    var c = P.piedra;
    return '<g transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + s.toFixed(2) + ')"><ellipse cx="0" cy="3" rx="16" ry="4" fill="rgba(20,60,10,.25)"/>' +
      '<path d="M-15 2 -11 -8 -2 -13 9 -10 15 0 8 4 -6 4z" fill="' + c[1] + '"/><path d="M-11 -8 -2 -13 9 -10 3 -4 -6 -4z" fill="' + c[0] + '"/><path d="M9 -10 15 0 8 4 3 -4z" fill="' + c[2] + '"/></g>';
  }
  function rocaAgua(x, y, s, P) {
    return '<g transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + s.toFixed(2) + ')"><ellipse cx="0" cy="3" rx="22" ry="6" fill="' + P.espuma + '" opacity=".55"/>' + roca(0, 0, 1, P).replace(/<ellipse[^>]*>/, '') + '</g>';
  }
  function pasto(x, y, s) {
    return '<g transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + s.toFixed(2) + ')"><path d="M-7 0 -4 -14 -1 0z" fill="#2E9E45"/><path d="M-2 0 2 -18 5 0z" fill="#3DB955"/><path d="M3 0 8 -11 10 0z" fill="#2E9E45"/></g>';
  }
  function cactus(x, y, s) {
    return '<g transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + s.toFixed(2) + ')"><ellipse cx="0" cy="2" rx="10" ry="3" fill="rgba(20,60,10,.25)"/>' +
      '<path d="M-5 2V-28l5-4 5 4V2z" fill="#2E9E45"/><path d="M0 -32l5 4V2H0z" fill="#23853A"/>' +
      '<path d="M-5 -12h-6v-12l3-3 3 3v6h0" fill="#2E9E45"/><path d="M5 -16h6v-10l-3-3-3 3z" fill="#23853A"/></g>';
  }
  function flores(x, y, r) {
    var cs = ['#FF6FA8', '#FFD23F', '#B07BFF', '#FF8A3D', '#FFFFFF'], h = '';
    for (var k = 0; k < 3; k++) { var fx = x + (r() - .5) * 16, fy = y + (r() - .5) * 8, c = cs[Math.floor(r() * cs.length)]; h += '<path d="M' + f(fx) + ' ' + f(fy - 3) + 'l3 3-3 3-3-3z" fill="' + c + '"/>'; }
    return h;
  }
  function llama(x, y, s, voltea) {
    return '<g transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + (voltea ? -s : s).toFixed(2) + ' ' + s.toFixed(2) + ')"><ellipse cx="0" cy="2" rx="14" ry="3.5" fill="rgba(20,60,10,.25)"/>' +
      '<path d="M-10 2v-8h4v8zM5 2v-8h4v8z" fill="#B88A5A"/><path d="M-13 -6 -10 -16h20l3 10z" fill="#F1D3A8"/><path d="M10 -16h-6l2 10h7z" fill="#DDB98A"/>' +
      '<path d="M7 -16v-16h7v16z" fill="#F1D3A8"/><path d="M7 -32h11l-2 6h-9z" fill="#F1D3A8"/><path d="M8 -32l1-6 3 6zM12 -32l2-6 2 6z" fill="#DDB98A"/>' +
      '<rect x="13" y="-30" width="2" height="2" fill="#3A2A1A"/><path d="M-8 -16h12v3h-12z" fill="#E0475B"/><path d="M-6 -13h3v2h-3zM0 -13h3v2h-3z" fill="#FFD23F"/></g>';
  }
  function antorcha(x, y) {
    return '<g transform="translate(' + f(x) + ' ' + f(y) + ')"><ellipse cx="0" cy="2" rx="6" ry="2" fill="rgba(0,0,0,.25)"/><path d="M-2 2v-28h4v28z" fill="#7A4A22"/><path d="M-5 -26h10l-2 -6h-6z" fill="#5E3616"/>' +
      '<circle cx="0" cy="-38" r="13" fill="rgba(255,190,60,.28)"/><g class="fuego"><path d="M0 -50l6 10-2 8h-8l-2-8z" fill="#FF8A1E"/><path d="M0 -44l3 6-1 5h-4l-1-5z" fill="#FFE07A"/></g></g>';
  }
  function choza(x, y, s, P) {
    var m = P.muro;
    return '<g transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + s.toFixed(2) + ')"><ellipse cx="0" cy="3" rx="26" ry="6" fill="rgba(20,60,10,.28)"/>' +
      '<path d="M-20 0v-20l20-8 20 8v20l-20 6z" fill="' + m[0] + '"/><path d="M0 -28 20 -20v20L0 6z" fill="' + m[1] + '"/>' +
      '<path d="M-24 -18 0 -42 24 -18 0 -28z" fill="#E0A23A"/><path d="M0 -42 24 -18 0 -28z" fill="#B57A1E"/><path d="M-6 3v-12h8v10z" fill="#5E3616"/>' +
      '<path d="M-20 -10h20M0 -10l20 0M-20 -4l20 0" stroke="' + m[2] + '" stroke-width="1" opacity=".6"/></g>';
  }
  function andenes(x, y, s, P) {
    var h = '<g transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + s.toFixed(2) + ')"><ellipse cx="0" cy="4" rx="56" ry="10" fill="rgba(20,60,10,.28)"/>';
    [[52, 0], [40, -14], [28, -28]].forEach(function (c) {
      var w = c[0], yy = c[1];
      h += '<path d="M' + (-w) + ' ' + yy + 'l' + w + ' ' + (w / 4) + 'l' + w + ' -' + (w / 4) + 'v-8l-' + w + ' ' + (w / 4) + 'l-' + w + ' -' + (w / 4) + 'z" fill="' + P.muro[1] + '"/>';
      h += '<path d="M0 ' + (yy + w / 4) + 'l' + w + ' -' + (w / 4) + 'v-8l-' + w + ' ' + (w / 4) + 'z" fill="' + P.muro[2] + '"/>';
      h += '<path d="M' + (-w) + ' ' + (yy - 8) + 'l' + w + ' ' + (w / 4) + 'l' + w + ' -' + (w / 4) + 'l-' + w + ' -' + (w / 4) + 'z" fill="' + P.pasto2 + '"/>';
    });
    return h + '</g>';
  }
  function huaco(x, y, s) {
    return '<g transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + s.toFixed(2) + ')"><ellipse cx="0" cy="2" rx="12" ry="3" fill="rgba(20,60,10,.28)"/>' +
      '<path d="M-10 0-12-10-8-20h16l4 10-2 10z" fill="#C8642A"/><path d="M0 -20h8l4 10-2 10H0z" fill="#A34E1E"/>' +
      '<path d="M-4 -20v-8h8v8z" fill="#C8642A"/><path d="M-6 -28h12v-3H-6z" fill="#A34E1E"/>' +
      '<path d="M-11 -12h22" stroke="#F2D29A" stroke-width="2"/><path d="M-8 -16l3 3 3-3 3 3 3-3 3 3" stroke="#3A2210" stroke-width="1.4" fill="none"/></g>';
  }
  function portada(x, y, s, P) {
    var m = P.muro;
    return '<g transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + s.toFixed(2) + ')"><ellipse cx="0" cy="3" rx="30" ry="6" fill="rgba(20,60,10,.28)"/>' +
      '<path d="M-28 2-24-34h48l4 36z" fill="' + m[0] + '"/><path d="M0 -34h24l4 36H0z" fill="' + m[1] + '"/>' +
      '<path d="M-9 2-6-22h12l3 24z" fill="#3B2F22"/>' +
      '<path d="M-26 -10h52M-25 -22h50M-14 -34v12M10 -34v12M-20 -10v12M16 -10v12" stroke="' + m[2] + '" stroke-width="1.4"/></g>';
  }
  function chakana(x, y, s, P) {
    return '<g transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + s.toFixed(2) + ')"><ellipse cx="0" cy="2" rx="16" ry="4" fill="rgba(20,60,10,.28)"/>' +
      '<path d="M-14 0-12-18h24l2 18z" fill="' + P.muro[1] + '"/><path d="M0 -18h12l2 18H0z" fill="' + P.muro[2] + '"/>' +
      '<path d="M-2 -16h4v3h3v3h3v4h-3v3h-3v3h-4v-3h-3v-3h-3v-4h3v-3h3z" fill="' + P.muro[0] + '"/><rect x="-1.2" y="-9.2" width="2.4" height="2.4" fill="' + P.muro[2] + '"/></g>';
  }
  function templo(x, y, P) {
    var m = P.muro, h = '<g transform="translate(' + x + ' ' + y + ')"><ellipse cx="0" cy="10" rx="110" ry="22" fill="rgba(20,60,10,.3)"/>';
    [[96, 0], [76, -22], [56, -44], [36, -66]].forEach(function (c) {
      var w = c[0], yy = c[1];
      h += '<path d="M' + (-w) + ' ' + yy + 'l' + w + ' ' + (w / 4) + 'l' + w + ' -' + (w / 4) + 'v-22l-' + w + ' ' + (w / 4) + 'l-' + w + ' -' + (w / 4) + 'z" fill="' + m[1] + '"/>';
      h += '<path d="M0 ' + (yy + w / 4) + 'l' + w + ' -' + (w / 4) + 'v-22l-' + w + ' ' + (w / 4) + 'z" fill="' + m[2] + '"/>';
      h += '<path d="M' + (-w) + ' ' + (yy - 22) + 'l' + w + ' ' + (w / 4) + 'l' + w + ' -' + (w / 4) + 'l-' + w + ' -' + (w / 4) + 'z" fill="' + m[0] + '"/>';
    });
    h += '<path d="M-14 22 14 22 10 -70 -10 -70z" fill="' + m[0] + '"/>';
    for (var k = 0; k < 10; k++) h += '<path d="M' + (-14 + k * .4) + ' ' + (18 - k * 9) + 'h' + (28 - k * .8) + '" stroke="' + m[2] + '" stroke-width="1.6"/>';
    h += '<path d="M-16 -88v-26l16-6 16 6v26l-16 6z" fill="' + m[0] + '"/><path d="M0 -120 16 -114v26L0 -82z" fill="' + m[1] + '"/><path d="M-7 -84v-16l7-3v20z" fill="#3B2F22"/>';
    h += '<g class="gira"><path d="M0 -168l5 12 13-3-8 11 8 11-13-3-5 12-5-12-13 3 8-11-8-11 13 3z" fill="#FFD23F" opacity=".9"/></g><circle cx="0" cy="-149" r="10" fill="#FFB31F"/>';
    h += antorcha(-58, -30) + antorcha(58, -30);
    return h + '</g>';
  }
  function montana(x, y, w, hgt, P, oscuro) {
    var m = P.monte, n = P.nieve, a = oscuro ? m[1] : m[0], b = oscuro ? m[2] : m[1];
    return '<path d="M' + (x - w) + ' ' + y + 'L' + x + ' ' + (y - hgt) + 'L' + x + ' ' + y + 'z" fill="' + a + '"/>' +
      '<path d="M' + x + ' ' + (y - hgt) + 'L' + (x + w) + ' ' + y + 'L' + x + ' ' + y + 'z" fill="' + b + '"/>' +
      '<path d="M' + x + ' ' + (y - hgt) + 'L' + (x - w * .32) + ' ' + (y - hgt * .68) + 'L' + (x - w * .12) + ' ' + (y - hgt * .72) + 'L' + x + ' ' + (y - hgt * .64) + 'z" fill="' + n[0] + '"/>' +
      '<path d="M' + x + ' ' + (y - hgt) + 'L' + (x + w * .32) + ' ' + (y - hgt * .68) + 'L' + (x + w * .1) + ' ' + (y - hgt * .7) + 'L' + x + ' ' + (y - hgt * .64) + 'z" fill="' + n[1] + '"/>';
  }

  /* ---------- Dibujo completo ---------- */
  function paisaje(n, P, pts) {
    var H = ARR + ABA + (n - 1) * PASO, r = azar(11), s = '', k;
    var top = pts[pts.length - 1], orilla = top[1] - 150;   // donde el cielo y los cerros se encuentran con el río
    s += '<defs><linearGradient id="mmCielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + P.cielo[0] + '"/><stop offset="1" stop-color="' + P.cielo[1] + '"/></linearGradient>' +
      '<linearGradient id="mmRio" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="' + P.rio[1] + '"/><stop offset=".5" stop-color="' + P.rio[0] + '"/><stop offset="1" stop-color="' + P.rio[1] + '"/></linearGradient></defs>';
    // Cielo y cordillera al fondo
    s += '<rect width="' + W + '" height="' + (orilla + 40) + '" fill="url(#mmCielo)"/>';
    s += '<g class="nubes"><g fill="#fff" opacity=".9"><path d="M20 70h70l-10-14H40z"/><path d="M40 56h40l-8-10H52z"/><path d="M250 40h80l-12-16h-52z"/><path d="M270 24h44l-8-10h-26z"/></g></g>';
    s += montana(40, orilla + 30, 110, 210, P, false) + montana(360, orilla + 30, 120, 230, P, false);
    s += montana(140, orilla + 40, 100, 170, P, true) + montana(270, orilla + 40, 110, 190, P, true);
    s += '<path d="M-10 ' + (orilla + 10) + 'L60 ' + (orilla - 30) + 'L130 ' + (orilla + 5) + 'L200 ' + (orilla - 25) + 'L280 ' + (orilla + 8) + 'L350 ' + (orilla - 20) + 'L410 ' + (orilla + 10) + 'V' + (orilla + 60) + 'H-10z" fill="#3E9A4E"/>';
    // Río ancho que corre a ambos lados de la isla
    s += '<rect y="' + (orilla + 30) + '" width="' + W + '" height="' + (H - orilla) + '" fill="url(#mmRio)"/>';
    s += '<path d="M-10 ' + (orilla + 34) + 'Q100 ' + (orilla + 24) + ' 200 ' + (orilla + 36) + 'T410 ' + (orilla + 30) + '" stroke="' + P.espuma + '" stroke-width="5" fill="none" opacity=".7"/>';
    var olas = '', olas2 = '';
    for (k = 0; k < 90; k++) {
      var ox = r() * W, oy = orilla + 50 + r() * (H - orilla - 40), ow = 10 + r() * 16, d = '<path d="M' + f(ox) + ' ' + f(oy) + 'q' + f(ow / 2) + ' -5 ' + f(ow) + ' 0" stroke="' + P.ola + '" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="' + (.45 + r() * .4).toFixed(2) + '"/>';
      if (k % 2) olas += d; else olas2 += d;
    }
    s += '<g class="olas">' + olas + '</g><g class="olas2">' + olas2 + '</g>';

    // Camino completo (sale del río por abajo y llega al templo)
    var ruta = [[pts[0][0] - 40, H + 40]].concat(pts).concat([[top[0], top[1] - 60]]);
    var camino = curva(ruta);
    var tmp = document.createElementNS('http://www.w3.org/2000/svg', 'path'); tmp.setAttribute('d', camino);
    var muestras = [];
    try { var L = tmp.getTotalLength(); for (var q = 0; q <= L; q += 22) { var pp = tmp.getPointAtLength(q); muestras.push([pp.x, pp.y]); } }
    catch (e) { muestras = ruta.slice(); }

    // Isla: franja ancha a lo largo del camino + lóbulos a los lados
    var lobulos = [];
    for (k = 0; k < n; k++) {
      var p = pts[k], lado = p[0] > W / 2 ? -1 : 1;
      lobulos.push(mancha(p[0] + lado * (66 + r() * 26), p[1] + (r() - .5) * 40, 66 + r() * 22, 52 + r() * 18, 7, r));
      if (r() < .5) lobulos.push(mancha(p[0] - lado * (52 + r() * 18), p[1] + 50 + (r() - .5) * 30, 46 + r() * 18, 38 + r() * 14, 6, r));
    }
    lobulos.push(mancha(top[0], top[1] - 30, 150, 80, 9, r));
    var franja = 'M' + muestras.map(function (m, i) { return f(m[0] + (i % 2 ? 6 : -6)) + ' ' + f(m[1]); }).join(' L');
    function isla(color, dy, ancho, esc, extra) {
      var h = '<g transform="translate(0 ' + dy + ')"' + (extra || '') + '>';
      h += '<path d="' + franja + '" stroke="' + color + '" stroke-width="' + ancho + '" fill="none" stroke-linejoin="bevel" stroke-linecap="square"/>';
      lobulos.forEach(function (lb) {
        var c = centro(lb);
        h += '<polygon points="' + poli(lb.map(function (p) { return [c[0] + (p[0] - c[0]) * esc, c[1] + (p[1] - c[1]) * esc]; })) + '" fill="' + color + '"/>';
      });
      return h + '</g>';
    }
    s += isla('rgba(8,50,90,.35)', 26, 206, 1.03);            // sombra en el agua
    s += isla(P.espuma, 20, 216, 1.06, ' opacity=".55"');       // espuma en la orilla
    s += isla(P.tierra2, 18, 200, 1);                           // acantilado (abajo)
    s += isla(P.tierra, 10, 200, 1);                            // acantilado
    s += isla(P.borde, 0, 200, 1);                              // borde de pasto
    s += isla(P.pasto, 0, 172, .86);                            // pasto
    // Rocas en el río
    for (k = 0; k < 14; k++) {
      var rx = r() < .5 ? 16 + r() * 50 : W - 16 - r() * 50, ry = orilla + 80 + r() * (H - orilla - 120);
      if (muestras.some(function (m) { return Math.hypot(m[0] - rx, m[1] - ry) < 110; })) continue;
      s += rocaAgua(rx, ry, .7 + r() * .5, P);
    }
    // Cóndor
    s += '<g class="condor"><g transform="translate(0 ' + (orilla - 150) + ')"><path class="ala" d="M-22 0l11-7 11 7 11-7 11 7-11-2-11 4-11-4z" fill="#2A2A2A"/><path d="M-3 0h6v3h-6z" fill="#F2F2F2"/></g></g>';

    // Laguna con cascada que cae al río por el borde de la isla
    var cosas = [], lago = lobulos[3];
    if (lago) {
      var lc = centro(lago), lagoP = mancha(lc[0], lc[1], 38, 24, 7, r);
      s += '<polygon points="' + poli(lagoP) + '" fill="' + P.agua + '"/><polygon points="' + poli(mancha(lc[0] - 6, lc[1] - 4, 22, 12, 6, r)) + '" fill="' + P.agua2 + '" opacity=".7"/>';
      var dir = lc[0] > W / 2 ? 1 : -1, bx = lc[0] + dir * 46, by = lc[1] + 22;
      s += '<path d="M' + f(lc[0]) + ' ' + f(lc[1] + 8) + 'L' + f(bx) + ' ' + f(by) + '" stroke="' + P.agua + '" stroke-width="16" stroke-linecap="round"/>';
      s += '<path d="M' + f(bx) + ' ' + f(by) + 'v46" stroke="' + P.agua + '" stroke-width="20"/>';
      s += '<path class="cae" d="M' + f(bx - 4) + ' ' + f(by) + 'v46" stroke="' + P.espuma + '" stroke-width="3"/><path class="cae" d="M' + f(bx + 5) + ' ' + f(by + 4) + 'v42" stroke="' + P.agua2 + '" stroke-width="3"/>';
      s += '<g class="bruma"><ellipse cx="' + f(bx) + '" cy="' + f(by + 50) + '" rx="22" ry="7" fill="' + P.espuma + '" opacity=".85"/></g>';
      cosas.push([lc[0], lc[1], 50], [bx, by + 24, 26]);
    }
    // Arroyo que cruza la isla y pasa bajo un puente
    var ip = Math.min(5, n - 2), a = pts[ip], b = pts[ip + 1] || pts[ip];
    var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    var arr = 'M' + f(mx - 96) + ' ' + f(my + 26) + 'Q' + f(mx) + ' ' + f(my - 10) + ' ' + f(mx + 96) + ' ' + f(my + 18);
    s += '<path d="' + arr + '" stroke="' + P.agua + '" stroke-width="22" fill="none" stroke-linecap="round"/>';
    s += '<path class="corre" d="' + arr + '" stroke="' + P.agua2 + '" stroke-width="3" fill="none" stroke-linecap="round"/>';
    cosas.push([mx - 80, my + 20, 26], [mx + 80, my + 14, 26], [mx, my, 34]);

    // Camino de arena
    s += '<path d="' + camino + '" stroke="' + P.arena2 + '" stroke-width="52" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    s += '<path d="' + camino + '" stroke="' + P.arena + '" stroke-width="42" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    s += '<path d="' + camino + '" stroke="#FBE2B0" stroke-width="10" stroke-dasharray="2 26" fill="none" stroke-linecap="round"/>';
    // Puente de madera
    var ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
    s += '<g transform="translate(' + f(mx) + ' ' + f(my + 4) + ') rotate(' + f(ang) + ')"><rect x="-30" y="-27" width="60" height="54" rx="3" fill="#8A5426"/>';
    for (k = -26; k <= 22; k += 12) s += '<rect x="' + k + '" y="-25" width="10" height="50" rx="2" fill="#B5743A"/><rect x="' + k + '" y="-25" width="10" height="4" fill="#CC8B4E"/>';
    s += '</g>';

    // Decoración: solo sobre la isla, lejos del camino, de los niveles y del agua
    function enIsla(x, y) {
      for (var i = 0; i < muestras.length; i++) if (Math.hypot(muestras[i][0] - x, muestras[i][1] - y) < 78) return true;
      return lobulos.some(function (lb) { var c = centro(lb); return Math.hypot((x - c[0]) / 1.1, y - c[1]) < 46; });
    }
    function libre(x, y, d) {
      for (var i = 0; i < muestras.length; i++) if (Math.hypot(muestras[i][0] - x, muestras[i][1] - y) < 30 + d) return false;
      for (i = 0; i < pts.length; i++) if (Math.hypot(pts[i][0] - x, pts[i][1] - y) < 52 + d) return false;
      return !cosas.some(function (c) { return Math.hypot(c[0] - x, c[1] - y) < c[2] + d; });
    }
    var deco = [];
    [['andenes', 34], ['portada', 28], ['llama', 16], ['choza', 26], ['llama', 16], ['andenes', 34], ['portada', 28], ['choza', 26], ['llama', 16]].forEach(function (g, gi) {
      for (var t = 0; t < 250; t++) {
        var x = 30 + r() * (W - 60), y = top[1] + 40 + r() * (H - top[1] - 120);
        if (!enIsla(x, y) || !libre(x, y, g[1])) continue;
        cosas.push([x, y, g[1] + 6]); deco.push([x, y, g[0], gi]); break;
      }
    });
    for (var t2 = 0; t2 < 1600 && deco.length < 80; t2++) {
      var x = 24 + r() * (W - 48), y = top[1] + 10 + r() * (H - top[1] - 40);
      if (!enIsla(x, y) || !libre(x, y, 10)) continue;
      if (deco.some(function (o) { return Math.hypot(o[0] - x, o[1] - y) < 30; })) continue;
      var u = r(), tipo = u < .26 ? 'arbol' : u < .44 ? 'pasto' : u < .55 ? 'roca' : u < .66 ? 'cactus' : u < .74 ? 'huaco' : u < .8 ? 'chakana' : 'flores';
      deco.push([x, y, tipo]);
    }
    deco.sort(function (a, b) { return a[1] - b[1]; });
    deco.forEach(function (o) {
      var x = o[0], y = o[1];
      s += o[2] === 'arbol' ? arbolCubo(x, y, .9 + r() * .35, P) : o[2] === 'roca' ? roca(x, y, .8 + r() * .4, P) : o[2] === 'cactus' ? cactus(x, y, .85)
        : o[2] === 'pasto' ? pasto(x, y, 1) : o[2] === 'flores' ? flores(x, y, r) : o[2] === 'andenes' ? andenes(x, y, .8, P)
        : o[2] === 'choza' ? choza(x, y, .9, P) : o[2] === 'huaco' ? huaco(x, y, .9) : o[2] === 'chakana' ? chakana(x, y, .9, P) : o[2] === 'portada' ? portada(x, y, .85, P) : llama(x, y, .95, o[3] % 2 === 1);
    });
    pts.forEach(function (p, i) { if (i % 3 === 1 && i < pts.length - 1) { var ax = p[0] + (p[0] > W / 2 ? -50 : 50); if (libre(ax, p[1] + 8, -24)) s += antorcha(ax, p[1] + 8); } });
    s += templo(top[0], top[1] - 40, P);
    return { svg: '<svg class="paisaje" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + s + '</svg>', H: H };
  }

  /* ---------- Abrir el mapa ---------- */
  function abrir(cont, o) {
    css();
    var P = TEMAS_V[o.tema] || TEMAS_V.sierra, n = o.niveles.length;
    var H = ARR + ABA + (n - 1) * PASO, pts = [];
    // Zigzag: tramos diagonales que suben de un lado al otro
    var xs = [250, 140, 110, 210, 300, 290, 180, 100, 150, 270, 200];
    for (var i = 0; i < n; i++) pts.push([i === n - 1 ? W / 2 : xs[i % (xs.length - 1)], H - ABA - i * PASO]);
    var dib = paisaje(n, P, pts);
    var actual = -1, abiertos = true;
    var est = o.niveles.map(function (nv, i) {
      var e = nv.t ? o.estrellas(nv.t) : 0, m = nv.t ? o.max(nv.t) : 0, hecho = m > 0 && o.completo(nv.t);
      var abierto = abiertos && !!nv.t;
      if (abierto && !hecho && actual < 0) actual = i;
      if (!hecho) abiertos = false;
      return { e: e, m: m, hecho: hecho, abierto: abierto || hecho, tres: m && e ? Math.max(1, Math.round(e / m * 3)) : 0 };
    });
    var h = '<div class="mm" style="max-width:' + (o.ancho || 560) + 'px">' + dib.svg;
    o.niveles.forEach(function (nv, i) {
      var s = est[i], jefe = i === n - 1, cls = 'niv' + (jefe ? ' jefe' : '') + (s.hecho ? ' hecho' : i === actual ? ' ahora' : !s.abierto ? ' bloq' : '');
      var dentro = jefe ? '<b>☠</b>' : (!s.abierto && !s.hecho ? CANDADO : '<b>' + (i + 1) + '</b>');
      h += '<button class="' + cls + '" type="button" data-i="' + i + '" style="left:' + (pts[i][0] / W * 100).toFixed(2) + '%;top:' + (pts[i][1] / dib.H * 100).toFixed(2) + '%" aria-label="Nivel ' + (i + 1) + ': ' + nv.n + '">' +
        '<span class="sombra"></span><span class="base"></span><span class="disco">' + dentro + '</span>' + (jefe ? ESPADAS : '') +
        (s.hecho ? '<span class="est">' + [1, 2, 3].map(function (k) { return k <= s.tres ? ESTRELLA : ESTRELLA_V; }).join('') + '</span>' : '') +
        (i === actual ? '<span class="pin">¡Juega!</span>' : '') + '<span class="nom">' + nv.n + '</span></button>';
    });
    cont.innerHTML = h + '</div>';
    cont.querySelectorAll('.niv').forEach(function (b) { b.onclick = function () { var i = +b.dataset.i; o.tocar(i, o.niveles[i], est[i]); }; });
    var hechos = est.filter(function (s) { return s.hecho; }).length;
    return { foco: cont.querySelector('.niv.ahora') || cont.querySelector('.niv'), estado: est, actual: actual, hechos: hechos, total: n };
  }

  window.MCMundo = { abrir: abrir, temas: TEMAS_V };
})();
