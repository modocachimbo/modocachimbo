/* =========================================================
   Modo Cachimbo · Arcade · Mapa de niveles de un mundo (hecho con código)
   Dibuja un paisaje en SVG (sin imágenes) con un camino de niveles de abajo
   hacia arriba, como Candy Crush / Plants vs. Zombies 2.
   - Cada nivel es un tema. El siguiente se abre al ganar el anterior.
   - El último nivel es el jefe del mundo (un templo).
   - Tema visual por mundo: por ahora 'andes' (Historia del Perú). Para otro
     mundo basta con agregar una paleta en TEMAS_V (o dibujar otro paisaje).
   Uso: MCMundo.abrir(contenedor, { niveles, estrellas(t), max(t), jugar(t), tema })
   ========================================================= */
(function () {
  if (window.MCMundo) return;
  var W = 400, PASO = 150, ARR = 300, ABA = 170;   // ancho del dibujo, distancia entre niveles, márgenes

  // Paletas por mundo
  var TEMAS_V = {
    andes: {
      cielo: ['#7CC8F2', '#BFE6F7', '#F9E7C2'], sol: '#FFD45A', monte: ['#7A8FB0', '#5E7396', '#4C5E7E'], nieve: '#F4F8FF',
      suelo: ['#9BD15A', '#7DB944', '#5E9E33', '#3F7F26'], anden: ['#A5D766', '#8CC24F'], muro: '#A3957A', muro2: '#857860',
      camino: '#EBCB8E', borde: '#B48A4E', rio: '#4FB8EC', rio2: '#B9ECFF', arbol: ['#3E8E3A', '#5DAA45', '#2F6E2C']
    }
  };

  // Aleatorio con semilla (para que el paisaje salga siempre igual)
  function azar(s) { return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

  function css() {
    if (document.getElementById('mc-mundo-css')) return;
    var st = document.createElement('style'); st.id = 'mc-mundo-css';
    st.textContent = [
      '.mm{position:relative;width:100%;margin:0 auto;user-select:none;-webkit-user-select:none}',
      '.mm svg.paisaje{display:block;width:100%;height:auto}',
      '.mm .nubes{animation:mmNube 60s linear infinite}',
      '@keyframes mmNube{from{transform:translateX(-60px)}to{transform:translateX(60px)}}',
      '.mm .agua{stroke-dasharray:14 22;animation:mmAgua 1.6s linear infinite}',
      '@keyframes mmAgua{to{stroke-dashoffset:-36}}',
      '.mm .llama{transform-box:fill-box;transform-origin:center bottom;animation:mmFuego .45s ease-in-out infinite alternate}',
      '@keyframes mmFuego{from{transform:scale(1,1) skewX(-4deg)}to{transform:scale(1.12,.9) skewX(5deg)}}',
      '.mm .rayos{transform-box:fill-box;transform-origin:center;animation:mmGira 40s linear infinite}',
      '@keyframes mmGira{to{transform:rotate(1turn)}}',
      '.mm .condor{animation:mmVuelo 26s linear infinite}',
      '@keyframes mmVuelo{0%{transform:translate(-80px,40px)}50%{transform:translate(220px,-10px)}100%{transform:translate(520px,30px)}}',
      '.mm .ala{transform-box:fill-box;transform-origin:center;animation:mmAla 1.2s ease-in-out infinite alternate}',
      '@keyframes mmAla{to{transform:scaleY(.55)}}',
      // Niveles (botones encima del dibujo)
      '.mm .niv{position:absolute;width:19%;aspect-ratio:1/1;translate:-50% -58%;display:grid;place-items:center;border:0;background:none;cursor:pointer;padding:0;-webkit-tap-highlight-color:transparent}',
      '.mm .niv .base{position:absolute;left:4%;right:4%;bottom:6%;height:42%;border-radius:50%;background:radial-gradient(ellipse at 50% 30%,#9B8E74,#6B5F48 70%);box-shadow:0 8px 12px rgba(30,20,0,.35)}',
      '.mm .niv .disco{position:relative;width:84%;aspect-ratio:1/1;margin-bottom:22%;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 40% 30%,#FFFFFF,#E9E4D6 55%,#C9BFA6);border:4px solid #8A7C5E;box-shadow:inset 0 -6px 0 rgba(0,0,0,.12),0 4px 0 #6B5F48;transform:scaleY(.86);transition:transform .15s}',
      '.mm .niv:active .disco{transform:scaleY(.8) translateY(3px)}',
      '.mm .niv b{font:900 clamp(18px,5.4vw,30px)/1 Nunito,system-ui,sans-serif;color:#5A4A2A;transform:scaleY(1.16);text-shadow:0 2px 0 rgba(255,255,255,.7)}',
      '.mm .niv .est{position:absolute;bottom:-8%;left:50%;translate:-50% 0;display:flex;gap:1px}',
      '.mm .niv .est svg{width:clamp(13px,3.6vw,20px);height:auto;filter:drop-shadow(0 1px 1px rgba(0,0,0,.5))}',
      '.mm .niv.hecho .disco{background:radial-gradient(circle at 40% 30%,#FFF6C8,#FFD45A 55%,#E0A21A);border-color:#9A6A00;box-shadow:inset 0 -6px 0 rgba(0,0,0,.15),0 4px 0 #7A5200}',
      '.mm .niv.hecho b{color:#6A4300}',
      '.mm .niv.bloq .disco{background:radial-gradient(circle at 40% 30%,#DAD6CC,#B8B2A2 60%,#9A9381);border-color:#7A7464;box-shadow:inset 0 -6px 0 rgba(0,0,0,.12),0 4px 0 #5E594C}',
      '.mm .niv.bloq b{color:#6E685A;font-size:clamp(15px,4.4vw,24px)}',
      '.mm .niv.ahora .disco{background:radial-gradient(circle at 40% 30%,#F3FFD8,#A8E05A 55%,#5DAA1E);border-color:#2E6A00;box-shadow:inset 0 -6px 0 rgba(0,0,0,.15),0 4px 0 #2E5A00,0 0 0 6px rgba(255,255,255,.55),0 0 26px 8px rgba(255,240,140,.85);animation:mmLate 1.4s ease-in-out infinite}',
      '.mm .niv.ahora b{color:#1F4A00}',
      '@keyframes mmLate{50%{box-shadow:inset 0 -6px 0 rgba(0,0,0,.15),0 4px 0 #2E5A00,0 0 0 10px rgba(255,255,255,.25),0 0 40px 14px rgba(255,240,140,.95)}}',
      '.mm .niv .pin{position:absolute;bottom:92%;left:50%;translate:-50% 0;padding:6px 12px 7px;border-radius:12px;background:#fff;color:#2E6A00;font:900 clamp(12px,3.4vw,16px)/1 Nunito,system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;box-shadow:0 4px 0 #2E6A00,0 6px 14px rgba(0,0,0,.25);animation:mmSalta 1.1s ease-in-out infinite}',
      '.mm .niv .pin::after{content:"";position:absolute;top:100%;left:50%;translate:-50% 0;border:7px solid transparent;border-top-color:#fff}',
      '@keyframes mmSalta{50%{transform:translateY(-7px)}}',
      '.mm .niv.jefe{width:26%}',
      '.mm .niv.jefe .disco{background:radial-gradient(circle at 40% 30%,#FFE1E1,#FF6B6B 55%,#C0262D);border-color:#7A0F14;box-shadow:inset 0 -6px 0 rgba(0,0,0,.15),0 4px 0 #5A0A0E}',
      '.mm .niv.jefe b{color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.35)}',
      '.mm .niv.jefe.bloq .disco{filter:grayscale(.75) brightness(.9)}',
      '.mm .niv .cand{width:42%;height:auto;transform:scaleY(1.16)}',
      '.mm .niv .nom{position:absolute;top:96%;left:50%;translate:-50% 0;padding:3px 8px;border-radius:8px;background:rgba(40,30,10,.72);color:#FFF4D6;font:800 clamp(10px,2.9vw,13px)/1.15 Nunito,system-ui,sans-serif;white-space:nowrap;max-width:44vw;overflow:hidden;text-overflow:ellipsis;pointer-events:none}',
      '.mm .niv.tiene-est .nom{top:112%}'
    ].join('');
    document.head.appendChild(st);
  }

  var ESTRELLA = '<svg viewBox="0 0 24 24"><path d="m12 2 3 6.6 7 .8-5.2 4.8 1.5 7L12 17.6 5.7 21.2l1.5-7L2 9.4l7-.8z" fill="#FFD23F" stroke="#9A6A00" stroke-width="1.5"/></svg>';
  var ESTRELLA_V = '<svg viewBox="0 0 24 24"><path d="m12 2 3 6.6 7 .8-5.2 4.8 1.5 7L12 17.6 5.7 21.2l1.5-7L2 9.4l7-.8z" fill="rgba(255,255,255,.55)" stroke="rgba(90,74,42,.6)" stroke-width="1.5"/></svg>';
  var CANDADO = '<svg class="cand" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2.5" fill="#6E685A"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="#6E685A" stroke-width="2.6" stroke-linecap="round"/></svg>';

  // Camino suave que pasa por todos los puntos (Catmull-Rom → Bézier)
  function curva(p) {
    var d = 'M' + p[0][0] + ' ' + p[0][1];
    for (var i = 0; i < p.length - 1; i++) {
      var a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c;
      d += ' C' + (b[0] + (c[0] - a[0]) / 6).toFixed(1) + ' ' + (b[1] + (c[1] - a[1]) / 6).toFixed(1) + ' ' + (c[0] - (e[0] - b[0]) / 6).toFixed(1) + ' ' + (c[1] - (e[1] - b[1]) / 6).toFixed(1) + ' ' + c[0] + ' ' + c[1];
    }
    return d;
  }

  /* ---------- Piezas del paisaje ---------- */
  function arbol(x, y, s, P, r) {
    var c = P.arbol, h = '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + s.toFixed(2) + ')">';
    h += '<ellipse cx="0" cy="4" rx="16" ry="5" fill="rgba(0,40,0,.25)"/><rect x="-3" y="-14" width="6" height="18" rx="2" fill="#7A4E2A"/>';
    h += '<circle cx="-8" cy="-20" r="11" fill="' + c[2] + '"/><circle cx="8" cy="-22" r="11" fill="' + c[0] + '"/><circle cx="0" cy="-32" r="12" fill="' + c[0] + '"/>';
    h += '<circle cx="-3" cy="-35" r="5" fill="' + c[1] + '" opacity=".9"/><circle cx="7" cy="-25" r="4" fill="' + c[1] + '" opacity=".8"/>';
    if (r() < .4) h += '<circle cx="-6" cy="-22" r="2" fill="#FF8A3D"/><circle cx="5" cy="-30" r="2" fill="#FF8A3D"/>';
    return h + '</g>';
  }
  function cactus(x, y, s) {
    return '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + s.toFixed(2) + ')"><ellipse cx="0" cy="2" rx="10" ry="3" fill="rgba(0,40,0,.25)"/>' +
      '<rect x="-5" y="-34" width="10" height="36" rx="5" fill="#4E9A3A"/><path d="M-5 -16h-6a3 3 0 0 1-3-3v-8" stroke="#4E9A3A" stroke-width="6" fill="none" stroke-linecap="round"/>' +
      '<path d="M5 -22h5a3 3 0 0 0 3-3v-6" stroke="#4E9A3A" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M-1 -30v24M2 -28v22" stroke="#6CBF52" stroke-width="1.2"/></g>';
  }
  function roca(x, y, s) {
    return '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + s.toFixed(2) + ')"><ellipse cx="0" cy="3" rx="14" ry="4" fill="rgba(0,30,0,.22)"/>' +
      '<path d="M-13 2 -9 -9 0 -13 10 -8 13 2z" fill="#9C9480"/><path d="M-9 -9 0 -13 10 -8 2 -5z" fill="#B9B29E"/></g>';
  }
  function flores(x, y, r) {
    var cs = ['#FF6FA8', '#FFD23F', '#B07BFF', '#FF8A3D', '#FFFFFF'], h = '';
    for (var k = 0; k < 4; k++) h += '<circle cx="' + (x + (r() - .5) * 18).toFixed(1) + '" cy="' + (y + (r() - .5) * 10).toFixed(1) + '" r="2.6" fill="' + cs[Math.floor(r() * cs.length)] + '"/>';
    return h;
  }
  function antorcha(x, y) {
    return '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"><ellipse cx="0" cy="2" rx="6" ry="2" fill="rgba(0,0,0,.25)"/>' +
      '<rect x="-2.5" y="-30" width="5" height="32" rx="1.5" fill="#7A4E2A"/><rect x="-5" y="-34" width="10" height="7" rx="2" fill="#5A3A1E"/>' +
      '<circle cx="0" cy="-42" r="14" fill="rgba(255,190,60,.25)"/>' +
      '<g class="llama"><path d="M0 -54c5 6 8 10 6 15a6 6 0 0 1-12 0c-1-5 3-8 6-15z" fill="#FF8A1E"/><path d="M0 -47c3 4 4 6 3 9a3 3 0 0 1-6 0c0-3 1-5 3-9z" fill="#FFE07A"/></g></g>';
  }
  function llama(x, y, s, voltea) {
    return '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + (voltea ? -s : s).toFixed(2) + ' ' + s.toFixed(2) + ')"><ellipse cx="0" cy="2" rx="14" ry="3.5" fill="rgba(0,30,0,.25)"/>' +
      '<rect x="-10" y="-6" width="4" height="8" rx="1.5" fill="#B88A5A"/><rect x="5" y="-6" width="4" height="8" rx="1.5" fill="#B88A5A"/>' +
      '<ellipse cx="0" cy="-10" rx="13" ry="8" fill="#E9C9A0"/><rect x="7" y="-30" width="7" height="22" rx="3.5" fill="#E9C9A0"/>' +
      '<ellipse cx="13" cy="-30" rx="6" ry="4.5" fill="#E9C9A0"/><path d="M9 -35l1-6 2 5M13 -35l2-6 1 6" fill="#D9B080" stroke="#D9B080" stroke-width="1.5"/>' +
      '<circle cx="14" cy="-31" r="1.2" fill="#3A2A1A"/><path d="M-6 -15h10" stroke="#E0475B" stroke-width="3"/></g>';
  }
  function templo(x, y) {
    var h = '<g transform="translate(' + x + ' ' + y + ')"><ellipse cx="0" cy="8" rx="120" ry="18" fill="rgba(0,30,0,.25)"/>';
    var niveles = [[220, 22, '#B5A88A'], [178, 22, '#A99C7E'], [136, 22, '#9E9174'], [94, 22, '#93876A']];
    var yy = 0;
    niveles.forEach(function (n) {
      h += '<rect x="' + (-n[0] / 2) + '" y="' + (yy - n[1]) + '" width="' + n[0] + '" height="' + n[1] + '" fill="' + n[2] + '" stroke="#6E6450" stroke-width="2"/>';
      for (var bx = -n[0] / 2 + 14; bx < n[0] / 2; bx += 22) h += '<path d="M' + bx + ' ' + (yy - n[1]) + 'v' + n[1] + '" stroke="#857860" stroke-width="1.2"/>';
      h += '<path d="M' + (-n[0] / 2) + ' ' + (yy - n[1] / 2) + 'h' + n[0] + '" stroke="#857860" stroke-width="1"/>';
      yy -= n[1];
    });
    h += '<rect x="-22" y="' + (yy - 40) + '" width="44" height="40" fill="#B5A88A" stroke="#6E6450" stroke-width="2"/><path d="M-11 ' + yy + 'v-26l11-9 11 9v26z" fill="#3B2F22"/>';
    h += '<path d="M-14 0 -12 -88h24l2 88z" fill="#C9BC9C" opacity=".55"/>';
    h += '<circle cx="0" cy="' + (yy - 58) + '" r="12" fill="#FFD45A" stroke="#C08A00" stroke-width="2"/><g class="rayos">';
    for (var k = 0; k < 8; k++) { var a = k * Math.PI / 4; h += '<path d="M' + (Math.cos(a) * 15).toFixed(1) + ' ' + (yy - 58 + Math.sin(a) * 15).toFixed(1) + 'L' + (Math.cos(a) * 22).toFixed(1) + ' ' + (yy - 58 + Math.sin(a) * 22).toFixed(1) + '" stroke="#FFD45A" stroke-width="3" stroke-linecap="round"/>'; }
    h += '</g>' + antorcha(-62, -40) + antorcha(62, -40);
    return h + '</g>';
  }

  /* ---------- Dibujo completo ---------- */
  function paisaje(n, P, pts) {
    var H = ARR + ABA + (n - 1) * PASO, r = azar(7), s = '';
    s += '<defs><linearGradient id="mmCielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + P.cielo[0] + '"/><stop offset=".6" stop-color="' + P.cielo[1] + '"/><stop offset="1" stop-color="' + P.cielo[2] + '"/></linearGradient>' +
      '<linearGradient id="mmSuelo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + P.suelo[0] + '"/><stop offset=".45" stop-color="' + P.suelo[1] + '"/><stop offset=".8" stop-color="' + P.suelo[2] + '"/><stop offset="1" stop-color="' + P.suelo[3] + '"/></linearGradient>' +
      '<radialGradient id="mmSol"><stop offset="0" stop-color="#FFF6C8"/><stop offset=".5" stop-color="' + P.sol + '"/><stop offset="1" stop-color="rgba(255,212,90,0)"/></radialGradient></defs>';
    // Cielo y sol
    s += '<rect width="' + W + '" height="320" fill="url(#mmCielo)"/>';
    s += '<circle cx="318" cy="70" r="70" fill="url(#mmSol)" opacity=".85"/><circle cx="318" cy="70" r="26" fill="' + P.sol + '"/>';
    s += '<g class="rayos">';
    for (var k = 0; k < 12; k++) { var a = k * Math.PI / 6; s += '<path d="M' + (318 + Math.cos(a) * 34).toFixed(1) + ' ' + (70 + Math.sin(a) * 34).toFixed(1) + 'L' + (318 + Math.cos(a) * 46).toFixed(1) + ' ' + (70 + Math.sin(a) * 46).toFixed(1) + '" stroke="' + P.sol + '" stroke-width="4" stroke-linecap="round" opacity=".8"/>'; }
    s += '</g>';
    // Nubes
    s += '<g class="nubes" opacity=".95">';
    [[70, 60, 1], [230, 120, .8], [140, 175, .7]].forEach(function (c) {
      s += '<g transform="translate(' + c[0] + ' ' + c[1] + ') scale(' + c[2] + ')"><ellipse cx="0" cy="0" rx="34" ry="12" fill="#fff"/><circle cx="-12" cy="-8" r="13" fill="#fff"/><circle cx="10" cy="-12" r="16" fill="#fff"/><ellipse cx="0" cy="4" rx="32" ry="6" fill="#E3F2FA"/></g>';
    });
    s += '</g>';
    // Cóndor
    s += '<g class="condor"><g transform="translate(0 120)"><path class="ala" d="M-22 0q11 -9 22 0q11 -9 22 0q-11 -3 -22 3q-11 -6 -22 -3z" fill="#2A2A2A"/><circle cx="0" cy="1" r="3" fill="#F2F2F2"/></g></g>';
    // Montañas (tres capas con nieve)
    s += '<path d="M-20 300 L60 150 L110 210 L180 110 L250 200 L320 130 L420 280 L420 330 L-20 330z" fill="' + P.monte[0] + '"/>';
    s += '<path d="M60 150 L42 184 L58 178 L70 190 L80 176 L60 150z M180 110 L158 146 L174 140 L184 152 L196 138 L180 110z M320 130 L300 162 L316 156 L328 168 L340 158 L320 130z" fill="' + P.nieve + '"/>';
    s += '<path d="M-20 320 L40 230 L100 280 L160 220 L230 290 L300 230 L420 320 L420 360 L-20 360z" fill="' + P.monte[1] + '"/>';
    s += '<path d="M-20 350 L80 290 L170 340 L270 300 L420 350 L420 380 L-20 380z" fill="' + P.monte[2] + '" opacity=".9"/>';
    // Suelo
    s += '<path d="M-20 360 Q100 330 200 352 T420 345 L420 ' + (H + 20) + ' L-20 ' + (H + 20) + 'z" fill="url(#mmSuelo)"/>';
    // Andenes (terrazas incas) en la parte alta
    for (var t = 0; t < 7; t++) {
      var ty = 380 + t * 46, amp = 10 + t * 2;
      s += '<path d="M-20 ' + ty + ' Q100 ' + (ty - amp) + ' 200 ' + (ty + 4) + ' T420 ' + (ty - 4) + ' L420 ' + (ty + 40) + ' Q300 ' + (ty + 34) + ' 200 ' + (ty + 46) + ' T-20 ' + (ty + 40) + 'z" fill="' + P.anden[t % 2] + '"/>';
      s += '<path d="M-20 ' + (ty + 40) + ' Q100 ' + (ty + 32 - amp / 2) + ' 200 ' + (ty + 46) + ' T420 ' + (ty + 38) + '" stroke="' + P.muro + '" stroke-width="7" fill="none"/>';
      s += '<path d="M-20 ' + (ty + 40) + ' Q100 ' + (ty + 32 - amp / 2) + ' 200 ' + (ty + 46) + ' T420 ' + (ty + 38) + '" stroke="' + P.muro2 + '" stroke-width="7" stroke-dasharray="2 16" fill="none"/>';
    }
    // Manchas de pasto en el valle
    for (var m = 0; m < 26; m++) {
      var mx = r() * W, my = 720 + r() * (H - 760);
      s += '<ellipse cx="' + mx.toFixed(0) + '" cy="' + my.toFixed(0) + '" rx="' + (20 + r() * 40).toFixed(0) + '" ry="' + (6 + r() * 10).toFixed(0) + '" fill="' + (r() < .5 ? P.suelo[0] : P.suelo[2]) + '" opacity=".45"/>';
    }
    // Río: baja de la montaña serpenteando
    var rio = 'M300 330 C270 420 360 470 330 560 S250 700 310 820 S380 980 300 1100 S200 1300 260 1450 S300 ' + (H - 120) + ' 200 ' + (H + 20);
    s += '<path d="' + rio + '" stroke="#3A8FC0" stroke-width="34" fill="none" stroke-linecap="round" opacity=".55"/>';
    s += '<path d="' + rio + '" stroke="' + P.rio + '" stroke-width="26" fill="none" stroke-linecap="round"/>';
    s += '<path class="agua" d="' + rio + '" stroke="' + P.rio2 + '" stroke-width="4" fill="none" stroke-linecap="round" opacity=".9"/>';
    // Camino de piedra entre los niveles
    var camE = curva([[pts[0][0] - 30, H + 30]].concat(pts));
    s += '<path d="' + camE + '" stroke="rgba(60,40,10,.25)" stroke-width="46" fill="none" stroke-linecap="round" transform="translate(0 6)"/>';
    s += '<path d="' + camE + '" stroke="' + P.borde + '" stroke-width="44" fill="none" stroke-linecap="round"/>';
    s += '<path d="' + camE + '" stroke="' + P.camino + '" stroke-width="34" fill="none" stroke-linecap="round"/>';
    s += '<path d="' + camE + '" stroke="#D8B46E" stroke-width="22" stroke-dasharray="9 13" fill="none" stroke-linecap="round" opacity=".55"/>';
    // Decoración: lejos del camino y del río
    var muestras = [];
    var tmp = document.createElementNS('http://www.w3.org/2000/svg', 'path'); tmp.setAttribute('d', camE);
    var tmpR = document.createElementNS('http://www.w3.org/2000/svg', 'path'); tmpR.setAttribute('d', rio);
    try {
      var L = tmp.getTotalLength(), LR = tmpR.getTotalLength();
      for (var q = 0; q <= L; q += 18) { var pp = tmp.getPointAtLength(q); muestras.push([pp.x, pp.y, 44]); }
      for (q = 0; q <= LR; q += 18) { pp = tmpR.getPointAtLength(q); muestras.push([pp.x, pp.y, 30]); }
    } catch (e) { pts.forEach(function (p) { muestras.push([p[0], p[1], 60]); }); }
    function libre(x, y, d) { for (var i = 0; i < muestras.length; i++) { var mm = muestras[i]; if (Math.hypot(mm[0] - x, mm[1] - y) < mm[2] + d) return false; } return true; }
    var deco = [];
    for (var tries = 0; tries < 900 && deco.length < 70; tries++) {
      var dx = 12 + r() * (W - 24), dy = 400 + r() * (H - 430);
      if (dy > H - 60 && dx < 120) continue;
      if (!libre(dx, dy, 16)) continue;
      if (deco.some(function (o) { return Math.hypot(o[0] - dx, o[1] - dy) < 34; })) continue;
      deco.push([dx, dy, r()]);
    }
    deco.sort(function (a, b) { return a[1] - b[1]; });
    deco.forEach(function (o, i) {
      var x = o[0], y = o[1], tipo = o[2], alto = y < 720;
      if (alto) s += tipo < .45 ? cactus(x, y, .8 + r() * .3) : tipo < .7 ? roca(x, y, .8 + r() * .4) : flores(x, y, r);
      else s += tipo < .6 ? arbol(x, y, .8 + r() * .45, P, r) : tipo < .75 ? roca(x, y, .7 + r() * .4) : tipo < .88 ? flores(x, y, r) : cactus(x, y, .8);
    });
    // Llamas paseando
    s += llama(70, 700, 1, false) + llama(340, 1030, .9, true);
    // Antorchas junto a algunos niveles
    pts.forEach(function (p, i) { if (i % 2 === 0 && i < pts.length - 1) { var lado = p[0] > W / 2 ? -1 : 1; var ax = p[0] + lado * 58, ay = p[1] + 6; if (libre(ax, ay, -10)) s += antorcha(ax, ay); } });
    // Templo del jefe
    var top = pts[pts.length - 1];
    s += templo(top[0], top[1] - 30);
    return { svg: '<svg class="paisaje" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + s + '</svg>', H: H };
  }

  /* ---------- Abrir el mapa ----------
     o.niveles: [{ n: nombre, t: id del tema (o null si aún no tiene juegos) }]
     o.estrellas(t) y o.max(t): estrellas ganadas y posibles del tema
     o.jugar(i, nivel): al tocar un nivel abierto */
  function abrir(cont, o) {
    css();
    var P = TEMAS_V[o.tema] || TEMAS_V.andes, n = o.niveles.length;
    var H = ARR + ABA + (n - 1) * PASO, pts = [];
    for (var i = 0; i < n; i++) {
      var y = H - ABA - i * PASO, x = W / 2 + Math.sin(i * 1.15 + .4) * 112;
      if (i === n - 1) x = W / 2;
      pts.push([Math.round(x), Math.round(y)]);
    }
    var dib = paisaje(n, P, pts);
    // Estado de cada nivel
    var actual = -1, abiertos = true;
    var est = o.niveles.map(function (nv, i) {
      var e = nv.t ? o.estrellas(nv.t) : 0, m = nv.t ? o.max(nv.t) : 0, hecho = m > 0 && o.completo(nv.t);
      var abierto = abiertos && !!nv.t;
      if (abierto && !hecho && actual < 0) actual = i;
      if (!hecho) abiertos = false;
      return { e: e, m: m, hecho: hecho, abierto: abierto || hecho, tres: m ? Math.round(e / m * 3) : 0 };
    });
    var h = '<div class="mm" style="max-width:' + (o.ancho || 560) + 'px">' + dib.svg;
    o.niveles.forEach(function (nv, i) {
      var s = est[i], jefe = i === n - 1, cls = 'niv' + (jefe ? ' jefe' : '') + (s.hecho ? ' hecho tiene-est' : i === actual ? ' ahora' : !s.abierto ? ' bloq' : '');
      h += '<button class="' + cls + '" type="button" data-i="' + i + '" style="left:' + (pts[i][0] / W * 100).toFixed(2) + '%;top:' + (pts[i][1] / dib.H * 100).toFixed(2) + '%" aria-label="Nivel ' + (i + 1) + ': ' + nv.n + '">' +
        '<span class="base"></span><span class="disco">' + (!s.abierto && !s.hecho ? (jefe ? '<b>☠</b>' : CANDADO) : '<b>' + (jefe ? '★' : i + 1) + '</b>') + '</span>' +
        (s.hecho ? '<span class="est">' + [1, 2, 3].map(function (k) { return k <= s.tres ? ESTRELLA : ESTRELLA_V; }).join('') + '</span>' : '') +
        (i === actual ? '<span class="pin">¡Juega!</span>' : '') +
        '<span class="nom">' + nv.n + '</span></button>';
    });
    h += '</div>';
    cont.innerHTML = h;
    cont.querySelectorAll('.niv').forEach(function (b) {
      b.onclick = function () { var i = +b.dataset.i; o.tocar(i, o.niveles[i], est[i]); };
    });
    // Ir al nivel actual
    var foco = cont.querySelector('.niv.ahora') || cont.querySelector('.niv');
    return { foco: foco, estado: est, actual: actual };
  }

  window.MCMundo = { abrir: abrir, temas: TEMAS_V };
})();
