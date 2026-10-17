/* =========================================================
   Modo Cachimbo · Rangos de la semana (escudo hexagonal facetado)
   El rango sale del XP de la semana (xp_semana de supabase/16-corazones.sql)
   y se reinicia cada lunes:
     Bronce 0 · Plata 800 · Oro 2 000 · Diamante 4 000 · Leyenda 7 000
   - MCRango.svg(n, {mini}): el emblema del rango n (0 a 4).
   - En el inicio: tarjeta "Tu rango esta semana" antes de "Empezar a practicar"
     y la pantalla de subida cuando pasas a un rango nuevo.
   - En el perfil: el emblema junto a tu nombre, tu vitrina de semanas
     (tus filas de xp_semana) y un emblema chico en cada fila del ranking.
   ========================================================= */
(function () {
  if (window.MCRango) return;
  var MIN = [0, 800, 2000, 4000, 7000];
  var NOM = ['Bronce', 'Plata', 'Oro', 'Diamante', 'Leyenda'];
  var TXT = ['#FFB070', '#E6EEF4', '#FFD23F', '#7FE0FF', '#D99BFF'];
  // b: cara de frente · l: cara a la luz · d: cara en sombra · h: fondo del hueco
  var PAL = [
    { b: '#C2733A', l: '#F5B07A', d: '#6A3010', h: '#2A1206' },
    { b: '#A3B1C0', l: '#EEF3F8', d: '#4A5868', h: '#161E2A' },
    { b: '#EBAE00', l: '#FFE680', d: '#8F5600', h: '#2E1C00' },
    { b: '#26B6F2', l: '#B0EEFF', d: '#0A4E9C', h: '#062440' },
    { b: '#9A4CE0', l: '#D9A6FF', d: '#4A1A86', h: '#22083E' }
  ];
  var ORO = { b: '#F5B400', l: '#FFF0A0', d: '#B05A00' };
  var LUZ = [-0.5, -0.86];
  var uid = 0;

  function nivel(xp) { var n = 0; for (var i = 1; i < MIN.length; i++) if ((+xp || 0) >= MIN[i]) n = i; return n; }
  function miles(n) { return String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* ---------- El emblema: escudo hexagonal facetado ---------- */
  function hx(c) { return [1, 3, 5].map(function (i) { return parseInt(c.substr(i, 2), 16); }); }
  function mezcla(a, b, t) { a = hx(a); b = hx(b); return '#' + a.map(function (v, i) { return ('0' + Math.round(v + (b[i] - v) * t).toString(16)).slice(-2); }).join(''); }
  // Color de una cara según hacia dónde mira (la luz viene de arriba a la izquierda)
  function cara(p, nx, ny) {
    var b = (nx * LUZ[0] + ny * LUZ[1]) / (Math.hypot(nx, ny) || 1);
    return b >= 0 ? mezcla(p.b, p.l, Math.min(1, b * 1.05)) : mezcla(p.b, p.d, Math.min(1, -b * 1.05));
  }
  function pol(a, f, x) { return '<polygon points="' + a.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ') + '" fill="' + f + '"' + (x || '') + '/>'; }
  function hexa(r) { var o = []; for (var i = 0; i < 6; i++) { var a = (60 * i - 90) * Math.PI / 180; o.push([100 + r * Math.cos(a), 104 + r * Math.sin(a)]); } return o; }
  function espejo(q) { return [200 - q[0], q[1]]; }
  // Anillo entre dos hexágonos, una cara por lado
  function anillo(ext, int, p) {
    var s = '';
    for (var i = 0; i < 6; i++) { var a = ext[i], b = ext[(i + 1) % 6]; s += pol([a, b, int[(i + 1) % 6], int[i]], cara(p, (a[0] + b[0]) / 2 - 100, (a[1] + b[1]) / 2 - 104)); }
    return s;
  }
  // Placa de las alas: un bisel por lado y una cara interior
  function placa(P, p) {
    var cx = 0, cy = 0; P.forEach(function (q) { cx += q[0]; cy += q[1]; }); cx /= P.length; cy /= P.length;
    var dx = cx - 100, dy = cy - 104;
    var I = P.map(function (q) { return [cx + (q[0] - cx) * .62 + dx * .05, cy + (q[1] - cy) * .62 + dy * .05]; });
    var s = '';
    for (var i = 0; i < P.length; i++) {
      var a = P[i], b = P[(i + 1) % P.length], nx = b[1] - a[1], ny = a[0] - b[0];
      if (nx * ((a[0] + b[0]) / 2 - cx) + ny * ((a[1] + b[1]) / 2 - cy) < 0) { nx = -nx; ny = -ny; }
      s += pol([a, b, I[(i + 1) % P.length], I[i]], cara(p, nx, ny));
    }
    return s + pol(I, mezcla(p.b, cara(p, dx * .35 - 30, dy * .35 - 52), .45));
  }
  function placas(P, p) { return placa(P, p) + placa(P.map(espejo).reverse(), p); }
  // Púa de dos caras (gema de los costados en Leyenda)
  function pua(A, B, T, p) {
    var M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
    return pol([A, M, T], cara(p, A[0] - M[0], A[1] - M[1] - 4)) + pol([M, B, T], cara(p, B[0] - M[0], B[1] - M[1] - 4));
  }
  // Más alas mientras más alto el rango
  function alas(n, p) {
    var s = '', top = [[82, 46], [100, 12], [118, 46]];
    if (n === 0) return placas([[66, 60], [26, 56], [38, 80], [36, 124], [46, 154], [70, 148]], p) + placa([[86, 44], [100, 30], [114, 44]], p);
    if (n <= 2) {
      s += placas([[46, 106], [36, 140], [66, 168], [80, 150]], p);
      if (n === 2) s += placas([[40, 80], [12, 88], [28, 104], [12, 122], [42, 128]], p);
      return s + placas([[72, 50], [16, 34], [30, 56], [38, 94], [56, 92]], p) + placa(top, p);
    }
    var arriba = n === 4 ? ORO : p;
    s += placas([[44, 114], [12, 140], [34, 148], [34, 168], [74, 152]], p);
    s += placas([[42, 78], [4, 82], [20, 102], [2, 122], [42, 122]], p);
    if (n === 4) s += placas([[64, 50], [34, 2], [32, 32], [8, 26], [36, 70]], arriba);
    return s + placas([[70, 48], [22, 16], [30, 44], [8, 50], [42, 86]], arriba) + placa(top, n === 4 ? ORO : p);
  }
  // Figura del centro: lápiz, libro, birrete, diamante y laurel con estrella
  function figura(n) {
    var s = '';
    if (n === 0) {
      s += '<g transform="rotate(38 100 100)">';
      s += pol([[92, 60], [100, 60], [100, 70], [92, 70]], '#FF9A9A') + pol([[100, 60], [108, 60], [108, 70], [100, 70]], '#E06A6A');
      s += pol([[92, 70], [100, 70], [100, 77], [92, 77]], '#E8EEF4') + pol([[100, 70], [108, 70], [108, 77], [100, 77]], '#A9B6C4');
      s += pol([[92, 77], [100, 77], [100, 118], [92, 118]], '#FFC94A') + pol([[100, 77], [108, 77], [108, 118], [100, 118]], '#E39A1C');
      s += pol([[92, 118], [100, 118], [100, 140]], '#FCE6C4') + pol([[100, 118], [108, 118], [100, 140]], '#DDB98A');
      s += pol([[96.4, 130], [103.6, 130], [100, 140]], '#3A1A08') + '</g>';
    } else if (n === 1) {
      s += pol([[66, 82], [100, 89], [134, 82], [134, 126], [100, 134], [66, 126]], '#4A5868');
      s += pol([[71, 78], [100, 85], [100, 128], [71, 121]], '#FFFFFF') + pol([[100, 85], [129, 78], [129, 121], [100, 128]], '#CFD9E4');
      [92, 100, 108].forEach(function (y) {
        s += '<path d="M77 ' + (y - 6) + 'L94 ' + (y - 2) + 'M106 ' + (y - 2) + 'L123 ' + (y - 6) + '" stroke="#8C9CAE" stroke-width="2.4" stroke-linecap="round"/>';
      });
      s += pol([[99, 85], [101, 85], [101, 128], [99, 128]], '#7A8A9C');
    } else if (n === 2) {
      s += pol([[80, 94], [100, 94], [100, 124], [80, 116]], '#C98A00') + pol([[100, 94], [120, 94], [120, 116], [100, 124]], '#8F5600');
      s += pol([[64, 86], [100, 102], [136, 86], [136, 91], [100, 107], [64, 91]], '#A86A00');
      s += pol([[100, 70], [64, 86], [100, 102]], '#FFE680') + pol([[100, 70], [136, 86], [100, 102]], '#F5C21A');
      s += '<path d="M100 86L127 94V112" fill="none" stroke="#FF9600" stroke-width="3" stroke-linejoin="round"/>';
      s += pol([[123, 110], [131, 110], [132, 124], [122, 124]], '#FF9600') + '<circle cx="100" cy="86" r="3.5" fill="#FF9600"/>';
    } else if (n === 3) {
      s += pol([[76, 90], [88, 72], [100, 72], [100, 90]], '#9FF0FF') + pol([[100, 72], [112, 72], [124, 90], [100, 90]], '#4CD2FF');
      s += pol([[76, 90], [100, 90], [100, 132]], '#2EB8F5') + pol([[100, 90], [124, 90], [100, 132]], '#0A4E9C');
      s += pol([[86, 90], [100, 90], [100, 132]], '#8BE6FF') + pol([[100, 90], [114, 90], [100, 132]], '#1A80D0');
      s += pol([[100, 74], [110, 90], [90, 90]], '#FFFFFF');
    } else {
      s += anillo(hexa(48), hexa(37), ORO) + pol(hexa(37), '#3A0E66');
      // laurel: hojas a lo largo de dos arcos
      for (var i = 0; i < 6; i++) {
        var a = (112 + i * 23) * Math.PI / 180, x = 100 + 29 * Math.cos(a), y = 105 + 29 * Math.sin(a), g = (112 + i * 23) + 90;
        [[x, y, g, '#FFD84A'], [200 - x, y, 180 - g, '#E0A000']].forEach(function (h) {
          s += '<ellipse cx="' + h[0].toFixed(1) + '" cy="' + h[1].toFixed(1) + '" rx="8" ry="3.6" transform="rotate(' + (h[2] + 20).toFixed(0) + ' ' + h[0].toFixed(1) + ' ' + h[1].toFixed(1) + ')" fill="' + h[3] + '"/>';
        });
      }
      var e = [], m = [];
      for (var k = 0; k < 10; k++) { var r = k % 2 ? 7.5 : 17, t = (-90 + 36 * k) * Math.PI / 180; e.push([100 + r * Math.cos(t), 103 + r * Math.sin(t)]); }
      s += '<g class="cgem">';
      for (k = 0; k < 10; k++) { var p1 = e[k], p2 = e[(k + 1) % 10]; s += pol([[100, 103], p1, p2], cara(ORO, (p1[0] + p2[0]) / 2 - 100, (p1[1] + p2[1]) / 2 - 103)); }
      s += '</g>';
    }
    return s;
  }
  function svg(n, o) {
    o = o || {};
    n = Math.max(0, Math.min(4, n | 0));
    var p = PAL[n], id = 'mcrg' + (++uid), ext = hexa(68), med = hexa(52), som = hexa(46);
    css();
    var s = '<defs><clipPath id="' + id + 'c">' + pol(ext, '#000') + '</clipPath>' +
      '<linearGradient id="' + id + 'g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>';
    s += '<g transform="translate(0 5)" opacity=".35">' + pol(ext, '#000') + '</g>';
    s += alas(n, p) + anillo(ext, med, p) + pol(med, p.h);
    s += pol([med[5], med[0], med[1], som[1], som[0], som[5]], '#000', ' opacity=".35"');
    if (n === 4) [22, 178].forEach(function (x) { s += pua([x, 88], [x + 8, 96], [x, 104], ORO) + pua([x, 88], [x - 8, 96], [x, 104], ORO); });
    s += '<g transform="translate(100 104) scale(' + (n === 4 ? 1.05 : n === 1 ? 1.12 : 1.22) + ') translate(-100 -103)">' + figura(n) + '</g>';
    if (!o.mini) s += '<g clip-path="url(#' + id + 'c)"><g transform="skewX(-20)"><rect class="shine" x="-20" y="0" width="40" height="200" fill="url(#' + id + 'g)"/></g></g>';
    return '<svg class="mc-rgo-em' + (o.quieto ? ' quieto' : '') + '" viewBox="0 0 200 200" role="img" aria-label="Rango ' + NOM[n] + '">' + s + '</svg>';
  }

  /* ---------- Estilos ---------- */
  function css() {
    if (document.getElementById('mc-rango-css')) return;
    var st = document.createElement('style'); st.id = 'mc-rango-css';
    st.textContent =
      '.mc-rgo-em{display:block;width:100%;height:auto;overflow:visible}' +
      '.mc-rgo-em .aura,.mc-rgo-em .rays,.mc-rgo-em .rays2,.mc-rgo-em .tw,.mc-rgo-em .pt,.mc-rgo-em .gem,.mc-rgo-em .flo,.mc-rgo-em .shine,.mc-rgo-em .cgem{transform-box:fill-box}' +
      '.mc-rgo-em .flo{transform-origin:center;animation:mcRgoFlo 6s ease-in-out infinite}' +
      '.mc-rgo-em .shine{animation:mcRgoShine 7s cubic-bezier(.45,0,.25,1) infinite}' +
      '.mc-rgo-em .aura{transform-origin:center;animation:mcRgoAura 5s ease-in-out infinite}' +
      '.mc-rgo-em .rays{transform-origin:center;animation:mcRgoGira 45s linear infinite}' +
      '.mc-rgo-em .rays2{transform-origin:center;animation:mcRgoGira 70s linear infinite reverse}' +
      '.mc-rgo-em .tw{transform-origin:center;animation:mcRgoTw 5s ease-in-out infinite;opacity:0}' +
      '.mc-rgo-em .pt{animation:mcRgoSube 6s ease-in infinite;opacity:0}' +
      '.mc-rgo-em .gem{transform-origin:center;animation:mcRgoGema 4.5s ease-in-out infinite}' +
      '.mc-rgo-em .cgem{transform-origin:center;animation:mcRgoGema 3.6s ease-in-out infinite}' +
      '.mc-rgo-em.quieto *{animation:none!important}.mc-rgo-em.quieto .shine,.mc-rgo-em.quieto .tw,.mc-rgo-em.quieto .pt{display:none}' +
      '@keyframes mcRgoFlo{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}' +
      '@keyframes mcRgoShine{0%,55%{transform:translateX(-40px)}100%{transform:translateX(320px)}}' +
      '@keyframes mcRgoAura{0%,100%{transform:scale(.9);opacity:.55}50%{transform:scale(1.06);opacity:1}}' +
      '@keyframes mcRgoGira{to{transform:rotate(360deg)}}' +
      '@keyframes mcRgoTw{0%,100%{transform:scale(0) rotate(0);opacity:0}40%{transform:scale(1) rotate(45deg);opacity:1}65%{opacity:0}}' +
      '@keyframes mcRgoSube{0%{transform:translateY(0) scale(1);opacity:0}15%{opacity:1}100%{transform:translateY(-70px) scale(.3);opacity:0}}' +
      '@keyframes mcRgoGema{0%,100%{filter:brightness(1) saturate(1)}50%{filter:brightness(1.35) saturate(1.2)}}' +
      // Tarjeta del inicio
      '.mc-rgo{display:flex;align-items:center;gap:14px;width:100%;margin:14px 0 2px;padding:10px 14px 12px 8px;border:2px solid #2a2a2a;border-bottom-width:5px;border-radius:18px;background:radial-gradient(120% 140% at 0% 50%,var(--rg-t) 0%,#111 55%);color:#f2f2f2;text-decoration:none;font-family:Nunito,sans-serif;box-sizing:border-box}' +
      '.mc-rgo:focus-visible{outline:3px solid var(--rg-c);outline-offset:2px}' +
      '.mc-rgo-ic{width:84px;flex:none}' +
      '.mc-rgo-tx{flex:1;min-width:0}' +
      '.mc-rgo-tx small{display:block;font:900 11px Nunito,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#9a9a9a}' +
      '.mc-rgo-tx b{display:block;font:1000 21px Nunito,sans-serif;color:var(--rg-c);line-height:1.15}' +
      '.mc-rgo-bar{height:12px;border-radius:8px;background:#1f1f22;border:2px solid #29292d;margin-top:7px;overflow:hidden}' +
      '.mc-rgo-bar i{display:block;height:100%;border-radius:6px;background:linear-gradient(180deg,var(--rg-c),var(--rg-o));position:relative;overflow:hidden}' +
      '.mc-rgo-bar i::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.75) 50%,transparent 70%);animation:mcRgoBarra 5s ease-in-out infinite}' +
      '@keyframes mcRgoBarra{0%{transform:translateX(-100%)}70%,100%{transform:translateX(170%)}}' +
      '.mc-rgo-tx span{display:block;font:800 12.5px Nunito,sans-serif;color:#9a9a9a;margin-top:5px}' +
      '.mc-rgo-tx span em{font-style:normal;color:#f2f2f2}' +
      // Pantalla de subida
      '.mc-rgo-up{position:fixed;inset:0;z-index:400;display:grid;place-items:center;padding:20px;background:rgba(0,0,0,.78);opacity:0;transition:opacity .35s}' +
      '.mc-rgo-up.ver{opacity:1}' +
      '.mc-rgo-up-c{position:relative;width:100%;max-width:400px;text-align:center;padding:24px 20px 22px;border-radius:26px;border:2px solid var(--rg-b);border-bottom-width:6px;background:radial-gradient(90% 70% at 50% 34%,var(--rg-t) 0%,#0c0c0e 78%);color:#f2f2f2;font-family:Nunito,sans-serif;overflow:hidden;transform:scale(.86);transition:transform .45s cubic-bezier(.2,1.4,.4,1)}' +
      '.mc-rgo-up.ver .mc-rgo-up-c{transform:scale(1)}' +
      '.mc-rgo-up-c small{display:block;font:900 12px Nunito,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--rg-c)}' +
      '.mc-rgo-up-em{width:250px;max-width:80%;margin:10px auto 0}' +
      '.mc-rgo-up-c h2{font:1000 30px Nunito,sans-serif;margin:6px 0 4px;color:var(--rg-c)}' +
      '.mc-rgo-up-c p{font:700 15px Nunito,sans-serif;color:#b0b0b0;margin:0}' +
      '.mc-rgo-up-c button{display:block;width:100%;margin-top:18px;border:0;border-radius:16px;padding:15px;font:1000 16px Nunito,sans-serif;letter-spacing:.06em;text-transform:uppercase;background:#C6E000;color:#141a00;box-shadow:0 5px 0 #8fa300;cursor:pointer}' +
      '.mc-rgo-up-c button:active{transform:translateY(4px);box-shadow:0 1px 0 #8fa300}' +
      '.mc-rgo-cf{position:absolute;inset:0;pointer-events:none}' +
      '.mc-rgo-cf i{position:absolute;top:-14px;width:7px;height:12px;border-radius:2px;animation:mcRgoCae 3.4s linear infinite}' +
      '@keyframes mcRgoCae{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(560px) rotate(540deg);opacity:0}}' +
      // Perfil: insignia junto al nombre y vitrina
      '.mc-rgo-ins{display:inline-flex;align-items:center;gap:8px;margin:8px auto 0;padding:4px 14px 4px 4px;border-radius:999px;border:2px solid #2a2a2a;background:#151517;font:1000 15px Nunito,sans-serif;color:var(--rg-c)}' +
      '.mc-rgo-ins span:first-child{width:38px;flex:none}' +
      '.mc-rgo-ins small{font:800 12.5px Nunito,sans-serif;color:#9a9a9a}' +
      '.mc-rgo-vit{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:10px;margin-top:12px}' +
      '.mc-rgo-pz{position:relative;text-align:center;border:2px solid #262626;border-bottom-width:4px;border-radius:16px;padding:8px 4px 10px;background:radial-gradient(80% 70% at 50% 40%,var(--rg-t) 0%,#121214 80%)}' +
      '.mc-rgo-pz>span{display:block;width:76px;margin:0 auto}' +
      '.mc-rgo-pz b{display:block;font:1000 13.5px Nunito,sans-serif;color:var(--rg-c)}' +
      '.mc-rgo-pz small{display:block;font:800 11.5px Nunito,sans-serif;color:#9a9a9a}' +
      '.mc-rgo-pz em{position:absolute;top:6px;right:6px;font:1000 11px Nunito,sans-serif;font-style:normal;color:#FFC800;background:rgba(255,200,0,.14);padding:2px 7px;border-radius:7px}' +
      '.mc-rgo-pz{font:inherit;color:inherit;cursor:pointer;width:100%}.mc-rgo-pz.no{cursor:default}.mc-rgo-pz:focus-visible{outline:3px solid var(--rg-c);outline-offset:2px}' +
      '.mc-rgo-sem ul{list-style:none;margin:14px 0 0;padding:0;max-height:240px;overflow:auto;text-align:left}' +
      '.mc-rgo-sem li{display:flex;justify-content:space-between;gap:10px;padding:10px 12px;border:2px solid #262626;border-radius:12px;margin-top:6px;font:800 14.5px Nunito,sans-serif;background:#141416}' +
      '.mc-rgo-sem li b{color:var(--rg-c);font-weight:1000;font-variant-numeric:tabular-nums}' +
      '.mc-rgo-sem button{background:#1f1f22;color:#f2f2f2;box-shadow:0 5px 0 #000;border:2px solid #333}' +
      '.mc-rgo-pz.no>span{filter:grayscale(1) brightness(.3)}.mc-rgo-pz.no b{color:#5f5f5f}.mc-rgo-pz.no{background:#121214}' +
      '.mc-rgo-mini{display:inline-block;width:34px;vertical-align:middle;flex:none}' +
      '@media (prefers-reduced-motion:reduce){.mc-rgo-em *,.mc-rgo-bar i::after,.mc-rgo-cf{animation:none!important}.mc-rgo-cf{display:none}}';
    document.head.appendChild(st);
  }

  // Colores de fondo y borde de cada rango
  var TINTE = ['#3a1e08', '#22303c', '#3a2a00', '#06304a', '#2a1050'];
  var BORDE = ['#8F4A1C', '#66798B', '#AE7600', '#1A6CC0', '#8A36E0'];
  var OSC = ['#C26A2A', '#8A9AA8', '#C98F00', '#0A78B0', '#7B35BE'];
  function vars(n) { return '--rg-c:' + TXT[n] + ';--rg-t:' + TINTE[n] + ';--rg-b:' + BORDE[n] + ';--rg-o:' + OSC[n]; }

  /* ---------- Semanas ---------- */
  function lunes(d) { d = new Date(d || Date.now()); var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
  function clave(d) { var x = lunes(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); }
  function diasQuedan() { var f = lunes(); f.setDate(f.getDate() + 7); return Math.max(1, Math.ceil((f - Date.now()) / 864e5)); }
  var MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
  function rangoSemana(iso) {
    var a = new Date(iso + 'T00:00:00'), b = new Date(a); b.setDate(b.getDate() + 6);
    return a.getMonth() === b.getMonth() ? a.getDate() + ' – ' + b.getDate() + ' ' + MES[b.getMonth()] : a.getDate() + ' ' + MES[a.getMonth()] + ' – ' + b.getDate() + ' ' + MES[b.getMonth()];
  }

  /* ---------- Inicio: tarjeta y subida ---------- */
  function tarjeta(xp) {
    var n = nivel(xp), sig = n < 4 ? MIN[n + 1] : null;
    var pct = sig ? Math.max(4, Math.min(100, Math.round(100 * (xp - MIN[n]) / (sig - MIN[n])))) : 100;
    var d = diasQuedan();
    var linea = sig ? 'Te faltan <em>' + miles(sig - xp) + ' XP</em> para ' + NOM[n + 1] + ' · ' + (d === 1 ? 'queda 1 día' : 'quedan ' + d + ' días')
      : '<em>' + miles(xp) + ' XP</em> · ¡Rango máximo de la semana!';
    return '<span class="mc-rgo-ic">' + svg(n) + '</span><span class="mc-rgo-tx"><small>Tu rango esta semana</small><b>' + NOM[n] + '</b>' +
      '<span class="mc-rgo-bar"><i style="width:' + pct + '%"></i></span><span>' + linea + '</span></span>';
  }
  function subida(n, xp) {
    css();
    var col = ['#CE82FF', '#FFC800', '#1CB0F6', '#FF4B4B', '#C6E000', '#F2F2F2'], cf = '';
    for (var k = 0; k < 24; k++) cf += '<i style="left:' + (k * 37) % 100 + '%;background:' + col[k % 6] + ';animation-delay:' + ((k * .29) % 3).toFixed(2) + 's;animation-duration:' + (2.8 + (k % 5) * .35).toFixed(2) + 's"></i>';
    var d = document.createElement('div');
    d.className = 'mc-rgo-up'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', 'Subiste a ' + NOM[n]);
    d.innerHTML = '<div class="mc-rgo-up-c" style="' + vars(n) + '"><div class="mc-rgo-cf">' + cf + '</div><small>Nuevo rango</small>' +
      '<div class="mc-rgo-up-em">' + svg(n) + '</div><h2>¡Llegaste a ' + NOM[n] + '!</h2>' +
      '<p>Llevas ' + miles(xp) + ' XP esta semana.' + (n < 4 ? ' Siguiente: ' + NOM[n + 1] + ' con ' + miles(MIN[n + 1]) + ' XP.' : ' Es el rango más alto.') + '</p>' +
      '<button type="button">Seguir</button></div>';
    function cerrar() { d.classList.remove('ver'); setTimeout(function () { d.remove(); }, 350); }
    d.querySelector('button').addEventListener('click', cerrar);
    d.addEventListener('click', function (e) { if (e.target === d) cerrar(); });
    document.body.appendChild(d);
    try { if (window.MCSonido && MCSonido.racha) MCSonido.racha(); } catch (e) {}
    requestAnimationFrame(function () { requestAnimationFrame(function () { d.classList.add('ver'); }); });
    setTimeout(function () { var b = d.querySelector('button'); if (b) b.focus(); }, 400);
  }
  // Muestra la subida una sola vez por rango y semana (el primer rango visto no celebra)
  function revisarSubida(xp) {
    var n = nivel(xp), k = 'mc_rango_' + clave(), antes;
    try { antes = localStorage.getItem(k); } catch (e) { return; }
    if (antes === null) { try { localStorage.setItem(k, String(n)); } catch (e) {} return; }
    if (n > +antes) { try { localStorage.setItem(k, String(n)); } catch (e) {} subida(n, xp); }
  }

  function enInicio() {
    var boton = document.getElementById('salSeguir');
    if (!boton || !window.MCCorazones) return;
    css();
    var caja = document.createElement('a');
    caja.className = 'mc-rgo'; caja.href = 'perfil.html#rango'; caja.hidden = true;
    boton.insertAdjacentElement('beforebegin', caja);
    var ultimo = -1;
    MCCorazones.alCambiar(function (e) {
      if (!e) return;
      var xp = +e.xp_semana || 0;
      if (xp === ultimo) return;
      ultimo = xp;
      caja.setAttribute('style', vars(nivel(xp)));
      caja.innerHTML = tarjeta(xp);
      caja.setAttribute('aria-label', 'Tu rango esta semana: ' + NOM[nivel(xp)]);
      caja.hidden = false;
      revisarSubida(xp);
    });
  }

  /* ---------- Perfil: insignia, vitrina y ranking ---------- */
  function vitrina(filas) {
    var hoy = clave(), sem = [[], [], [], [], []];
    (filas || []).forEach(function (f) { if (f.semana && f.semana < hoy && (+f.xp || 0) > 0) sem[nivel(f.xp)].push({ semana: f.semana, xp: +f.xp }); });
    sem.forEach(function (l) { l.sort(function (a, b) { return a.semana < b.semana ? 1 : -1; }); });
    var total = sem.reduce(function (a, l) { return a + l.length; }, 0);
    var html = '';
    for (var n = 4; n >= 0; n--) {
      var c = sem[n].length;
      html += c
        ? '<button type="button" class="mc-rgo-pz" data-n="' + n + '" style="' + vars(n) + '" aria-label="' + NOM[n] + ', ' + c + (c === 1 ? ' semana' : ' semanas') + '">' + (c > 1 ? '<em>×' + c + '</em>' : '') +
          '<span>' + svg(n) + '</span><b>' + NOM[n] + '</b><small>' + rangoSemana(sem[n][0].semana) + '</small></button>'
        : '<div class="mc-rgo-pz no" style="' + vars(n) + '"><span>' + svg(n, { mini: true, quieto: true }) + '</span><b>' + NOM[n] + '</b><small>' + miles(MIN[n]) + ' XP</small></div>';
    }
    return { total: total, html: html, semanas: sem };
  }
  // Al tocar un emblema: las semanas en que lo ganaste, con el XP de cada una
  function semanas(n, lista) {
    var d = document.createElement('div');
    d.className = 'mc-rgo-up'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', NOM[n] + ': semanas');
    d.innerHTML = '<div class="mc-rgo-up-c mc-rgo-sem" style="' + vars(n) + '"><small>Mi vitrina</small>' +
      '<div class="mc-rgo-up-em" style="width:150px">' + svg(n) + '</div><h2>' + NOM[n] + (lista.length > 1 ? ' ×' + lista.length : '') + '</h2>' +
      '<p>' + (lista.length === 1 ? 'Lo ganaste 1 semana.' : 'Lo ganaste ' + lista.length + ' semanas.') + '</p>' +
      '<ul>' + lista.map(function (x) { return '<li><span>' + rangoSemana(x.semana) + '</span><b>' + miles(x.xp) + ' XP</b></li>'; }).join('') + '</ul>' +
      '<button type="button">Cerrar</button></div>';
    function cerrar() { d.classList.remove('ver'); setTimeout(function () { d.remove(); }, 350); }
    d.querySelector('button').addEventListener('click', cerrar);
    d.addEventListener('click', function (e) { if (e.target === d) cerrar(); });
    document.body.appendChild(d);
    requestAnimationFrame(function () { requestAnimationFrame(function () { d.classList.add('ver'); }); });
  }
  function enPerfil() {
    var saludo = document.getElementById('saludo');
    if (!saludo) return;
    css();
    // Insignia junto al nombre
    var ins = document.createElement('div');
    ins.style.textAlign = 'center'; ins.hidden = true;
    saludo.insertAdjacentElement('afterend', ins);
    if (window.MCCorazones) MCCorazones.alCambiar(function (e) {
      if (!e) return;
      var n = nivel(e.xp_semana);
      ins.innerHTML = '<a class="mc-rgo-ins" href="#rango" style="' + vars(n) + ';text-decoration:none"><span>' + svg(n, { mini: true }) + '</span>' + NOM[n] + ' <small>· ' + miles(e.xp_semana) + ' XP</small></a>';
      ins.hidden = false;
    });
    // Vitrina con las semanas pasadas
    var tab = document.getElementById('tabPerfil');
    if (!tab || !window.MCAuth) return;
    var sec = document.createElement('section');
    sec.className = 'panel'; sec.id = 'rango'; sec.hidden = true;
    tab.insertBefore(sec, tab.firstChild);
    MCAuth.listo.then(function (c) {
      var u = MCAuth.usuario();
      return u ? c.from('xp_semana').select('semana,xp').eq('usuario', u.id).order('semana', { ascending: false }).limit(60) : { data: [] };
    }).then(function (r) {
      var v = vitrina((r && r.data) || []);
      sec.innerHTML = '<h2 class="sec-tit" style="margin-top:0">Mi vitrina de rangos</h2>' +
        '<p class="nota" style="margin:2px 0 0">' + (v.total ? v.total + (v.total === 1 ? ' semana cerrada' : ' semanas cerradas') + '. Cada lunes se guarda el rango que alcanzaste.' : 'Cada lunes se guarda aquí el rango que alcanzaste en la semana.') + '</p>' +
        '<div class="mc-rgo-vit">' + v.html + '</div>';
      sec.querySelector('.mc-rgo-vit').addEventListener('click', function (e) {
        var b = e.target.closest('button.mc-rgo-pz');
        if (b) semanas(+b.dataset.n, v.semanas[+b.dataset.n]);
      });
      sec.hidden = false;
      if (location.hash === '#rango') sec.scrollIntoView({ block: 'start' });
    }).catch(function () {});
  }

  window.MCRango = { svg: svg, nivel: nivel, nombre: function (n) { return NOM[n]; }, minimo: MIN, css: css, subida: subida, vitrina: vitrina, mini: function (xp) { return '<span class="mc-rgo-mini" title="' + NOM[nivel(xp)] + '">' + svg(nivel(xp), { mini: true }) + '</span>'; } };

  // corazones.js trae el XP de la semana; se espera a que cargue
  function iniciar(intento) {
    intento = intento || 0;
    if (!window.MCCorazones && intento < 40) { setTimeout(function () { iniciar(intento + 1); }, 250); return; }
    var pagina = location.pathname.replace(/^.*\//, '');
    if (pagina === '' || pagina === 'index.html') enInicio();
    else if (pagina === 'perfil.html') enPerfil();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { iniciar(); }); else iniciar();
})();
