/* =========================================================
   Modo Cachimbo · Rangos de la semana (escudo hexagonal facetado)
   El rango sale del XP de la semana (xp_semana de supabase/16-corazones.sql)
   y se reinicia cada lunes:
     Zafiro 20 · Esmeralda 1 500 · Amatista 4 000 · Rubí 8 000 · Leyenda 12 000
   - MCRango.svg(n, {mini}): el emblema del rango n (0 a 4).
   - En el inicio: tarjeta "Tu rango esta semana" antes de "Empezar a practicar"
     y la pantalla de subida cuando pasas a un rango nuevo.
   - En el perfil: el emblema junto a tu nombre, tu vitrina de semanas
     (tus filas de xp_semana) y un emblema chico en cada fila del ranking.
   ========================================================= */
(function () {
  if (window.MCRango) return;
  var MIN = [20, 1500, 4000, 8000, 12000];
  var NOM = ['Zafiro', 'Esmeralda', 'Amatista', 'Rubí', 'Leyenda'];
  var TXT = ['#5FDAFF', '#5FF59A', '#D79BFF', '#FF6E84', '#FFC800'];
  // b: cara de frente · l: cara a la luz · d: cara en sombra · h: fondo del hueco
  var PAL = [
    { b: '#14B4FF', l: '#7AE6FF', d: '#0A5CE0', h: '#062A66' },
    { b: '#14D45A', l: '#8CFFB0', d: '#06873A', h: '#03361A' },
    { b: '#A55CFF', l: '#D9A8FF', d: '#5A1FC4', h: '#2A0A66' },
    { b: '#FF2D4A', l: '#FF8A9C', d: '#A3061E', h: '#4A0612' },
    { b: '#FF2D4A', l: '#FF8A9C', d: '#A3061E', h: '#4A2004' }
  ];
  var ORO = { b: '#F5B400', l: '#FFF0A0', d: '#B05A00' };
  var LLAMA = { b: '#FF9A2E', l: '#FFE27A', d: '#D0381A' };
  var LUZ = [-0.5, -0.86];
  var uid = 0;

  // -1 = todavía sin rango (menos de 20 XP en la semana)
  function nivel(xp) { var n = -1; for (var i = 0; i < MIN.length; i++) if ((+xp || 0) >= MIN[i]) n = i; return n; }
  function miles(n) { return String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* ---------- El emblema: escudo hexagonal facetado ---------- */
  function hx(c) { return [1, 3, 5].map(function (i) { return parseInt(c.substr(i, 2), 16); }); }
  function mezcla(a, b, t) { a = hx(a); b = hx(b); return '#' + a.map(function (v, i) { return ('0' + Math.round(v + (b[i] - v) * t).toString(16)).slice(-2); }).join(''); }
  // Color de una cara según hacia dónde mira (la luz viene de arriba a la izquierda)
  function cara(p, nx, ny) {
    var b = (nx * LUZ[0] + ny * LUZ[1]) / (Math.hypot(nx, ny) || 1);
    return b >= 0 ? mezcla(p.b, p.l, Math.min(1, b * 1.05)) : mezcla(p.b, p.d, Math.min(.85, -b * .9));
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
    if (n <= 2) {
      s += placas([[46, 106], [36, 140], [66, 168], [80, 150]], p);
      if (n >= 1) s += placas([[40, 80], [12, 88], [28, 104], [12, 122], [42, 128]], p);
      return s + placas([[72, 50], [16, 34], [30, 56], [38, 94], [56, 92]], p) + placa(top, p);
    }
    var arriba = n === 4 ? LLAMA : p;
    s += placas([[44, 114], [12, 140], [34, 148], [34, 168], [74, 152]], p);
    s += placas([[42, 78], [4, 82], [20, 102], [2, 122], [42, 122]], p);
    if (n === 4) s += placas([[64, 50], [34, 2], [32, 32], [8, 26], [36, 70]], arriba);
    return s + placas([[70, 48], [22, 16], [30, 44], [8, 50], [42, 86]], arriba) + placa(top, n === 4 ? ORO : p);
  }
  // Figura del centro: copa, corona, corona grande, rubí y gema en cruz (claro, medio, oscuro)
  var FIG = [['#7FF0FF', '#2CCBFF', '#0F8EF0'], ['#9DFFC0', '#2EE873', '#0FA845'], ['#FF8CFF', '#E040FB', '#B01ED8']];
  function figura(n) {
    var s = '', f = FIG[n];
    if (n === 0) {
      s += '<path d="M80 76H68V88Q68 98 82 101M120 76H132V88Q132 98 118 101" fill="none" stroke="' + f[2] + '" stroke-width="6" stroke-linejoin="round"/>';
      s += pol([[78, 68], [100, 68], [100, 112], [90, 112], [82, 100]], f[0]) + pol([[100, 68], [122, 68], [118, 100], [110, 112], [100, 112]], f[1]);
      s += pol([[94, 112], [106, 112], [106, 122], [94, 122]], f[2]);
      s += pol([[84, 122], [100, 122], [100, 134], [82, 134]], f[0]) + pol([[100, 122], [116, 122], [118, 134], [100, 134]], f[2]);
    } else if (n === 1) {
      s += pol([[74, 122], [74, 82], [88, 98], [100, 66], [100, 122]], f[0]) + pol([[100, 66], [112, 98], [126, 82], [126, 122], [100, 122]], f[1]);
      s += pol([[100, 66], [94, 82], [100, 78]], '#FFFFFF', ' opacity=".9"');
      s += pol([[74, 112], [126, 112], [126, 124], [74, 124]], f[2]) + pol([[74, 112], [100, 112], [100, 124], [74, 124]], f[1]);
    } else if (n === 2) {
      s += pol([[76, 100], [84, 70], [94, 94]], f[2]) + pol([[106, 94], [116, 70], [124, 100]], f[2]);
      s += pol([[70, 118], [70, 86], [86, 102], [100, 60], [100, 118]], f[0]) + pol([[100, 60], [114, 102], [130, 86], [130, 118], [100, 118]], f[1]);
      [[100, 96, 8], [82, 108, 4.5], [118, 108, 4.5]].forEach(function (g) {
        var x = g[0], y = g[1], r = g[2];
        s += pol([[x, y - r], [x - r, y], [x, y]], '#FFFFFF') + pol([[x, y - r], [x + r, y], [x, y]], '#FFE6FF') + pol([[x - r, y], [x, y + r], [x, y]], f[1]) + pol([[x + r, y], [x, y + r], [x, y]], f[2]);
      });
      s += pol([[68, 116], [100, 116], [100, 132], [70, 132]], f[0]) + pol([[100, 116], [132, 116], [130, 132], [100, 132]], f[1]);
      s += pol([[70, 128], [130, 128], [130, 133], [70, 133]], f[2]);
    } else if (n === 3) {
      s += pol([[76, 90], [88, 72], [100, 72], [100, 90]], '#FF4A62') + pol([[100, 72], [112, 72], [124, 90], [100, 90]], '#E01E3A');
      s += pol([[76, 90], [100, 90], [100, 132]], '#E01E3A') + pol([[100, 90], [124, 90], [100, 132]], '#7A0618');
      s += pol([[86, 90], [100, 90], [100, 132]], '#FF4A62') + pol([[100, 90], [114, 90], [100, 132]], '#A80C24');
      s += pol([[100, 74], [110, 90], [90, 90]], '#FFFFFF');
    } else {
      s += anillo(hexa(48), hexa(37), ORO) + pol(hexa(37), '#5A1004');
      s += '<g class="cgem">' + pol([[92, 80], [108, 80], [108, 96], [124, 96], [124, 112], [108, 112], [108, 128], [92, 128], [92, 112], [76, 112], [76, 96], [92, 96]], '#E01E3A');
      s += pol([[92, 80], [108, 80], [100, 96]], '#FF5A6E') + pol([[76, 96], [92, 96], [100, 104], [76, 112]], '#FF5A6E');
      s += pol([[124, 96], [124, 112], [100, 104], [108, 96]], '#A80C24') + pol([[92, 128], [108, 128], [100, 112]], '#A80C24');
      s += pol([[92, 96], [108, 96], [108, 112], [92, 112]], '#FF3550') + pol([[92, 80], [100, 80], [94, 90]], '#FFFFFF', ' opacity=".85"') + '</g>';
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
    s += '<g transform="translate(100 104) scale(' + (n === 4 ? 1.05 : n === 2 ? 1.12 : 1.22) + ') translate(-100 -103)">' + figura(n) + '</g>';
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
      '.mc-rgo-ic{width:84px;flex:none}.mc-rgo-ic.bloq{filter:grayscale(1) brightness(.45)}.mc-rgo.sin .mc-rgo-tx b{color:#9a9a9a}' +
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
  var TINTE = ['#06304a', '#06361a', '#2a1050', '#3e0812', '#3e2400'];
  var BORDE = ['#1A6CC0', '#0FA845', '#8A36E0', '#B01A30', '#D08A00'];
  var OSC = ['#123FC0', '#0FA845', '#8A36E0', '#B01A30', '#E3263F'];
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
    var n = nivel(xp), sig = n < 4 ? MIN[n + 1] : null, base = n < 0 ? 0 : MIN[n];
    var pct = sig ? Math.max(4, Math.min(100, Math.round(100 * (xp - base) / (sig - base)))) : 100;
    var d = diasQuedan();
    var linea = sig ? 'Te faltan <em>' + miles(sig - xp) + ' XP</em> para ' + NOM[n + 1] + ' · ' + (d === 1 ? 'queda 1 día' : 'quedan ' + d + ' días')
      : '<em>' + miles(xp) + ' XP</em> · ¡Rango máximo de la semana!';
    if (n < 0) linea = 'Gana <em>' + miles(sig - xp) + ' XP</em> para llegar a ' + NOM[0] + ' · ' + (d === 1 ? 'queda 1 día' : 'quedan ' + d + ' días');
    return '<span class="mc-rgo-ic' + (n < 0 ? ' bloq' : '') + '">' + svg(Math.max(0, n), { quieto: n < 0 }) + '</span><span class="mc-rgo-tx"><small>Tu rango esta semana</small><b>' + (n < 0 ? 'Aún sin rango' : NOM[n]) + '</b>' +
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
      var n = nivel(xp);
      caja.setAttribute('style', vars(Math.max(0, n)));
      caja.classList.toggle('sin', n < 0);
      caja.innerHTML = tarjeta(xp);
      caja.setAttribute('aria-label', n < 0 ? 'Aún sin rango esta semana' : 'Tu rango esta semana: ' + NOM[n]);
      caja.hidden = false;
      revisarSubida(xp);
    });
  }

  /* ---------- Perfil: insignia, vitrina y ranking ---------- */
  function vitrina(filas) {
    var hoy = clave(), sem = [[], [], [], [], []];
    (filas || []).forEach(function (f) { if (f.semana && f.semana < hoy && nivel(f.xp) >= 0) sem[nivel(f.xp)].push({ semana: f.semana, xp: +f.xp }); });
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
      if (n < 0) { ins.hidden = true; return; }
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

  window.MCRango = { svg: svg, nivel: nivel, nombre: function (n) { return NOM[n]; }, minimo: MIN, css: css, subida: subida, vitrina: vitrina, mini: function (xp) { return nivel(xp) < 0 ? '' : '<span class="mc-rgo-mini" title="' + NOM[nivel(xp)] + '">' + svg(nivel(xp), { mini: true }) + '</span>'; } };

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
