/* =========================================================
   Modo Cachimbo · Rangos de la semana (emblema heráldico)
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
  // m: metal (brillo → sombra) · e: esmalte (centro → borde) · g: gema (claro → oscuro) · w: luz
  var PAL = [
    { m: ['#FFF3E6', '#FFC48E', '#DA8646', '#8F4A1C', '#3F1C06'], e: ['#9A5222', '#2E1104'], g: ['#FFF4DC', '#FFBE5C', '#FF8A00', '#9A4200'], w: '#FF9600' },
    { m: ['#FFFFFF', '#EEF4F9', '#B4C2CE', '#66798B', '#232F3B'], e: ['#46698A', '#0E1824'], g: ['#FFFFFF', '#D2F1FF', '#7ECBF2', '#2A78A8'], w: '#CFEFFF' },
    { m: ['#FFFEEC', '#FFE57A', '#F5B800', '#AE7600', '#4A2E00'], e: ['#C42222', '#300303'], g: ['#FFE6E6', '#FF8080', '#F01E1E', '#760606'], w: '#FFC800' },
    { m: ['#FFFFFF', '#E6F7FF', '#A2D6EE', '#4A86A8', '#112B3C'], e: ['#1A6CC0', '#031634'], g: ['#F2FDFF', '#A6F2FF', '#2EC4FF', '#0858A0'], w: '#1CB0F6' },
    { m: ['#FFFCE6', '#FFE27A', '#F2B200', '#A66A00', '#3E2400'], e: ['#8A36E0', '#1A0538'], g: ['#FFF2FF', '#EBADFF', '#B44CFF', '#540C98'], w: '#CE82FF' }
  ];
  // Piezas (lado izquierdo; se reflejan) y el rango desde el que aparecen
  var ALAS = [
    [4, 'M66 110 2 116 22 126 4 136 24 138 66 126Z'],
    [2, 'M68 86 10 50 24 72 2 76 28 94 66 104Z'],
    [3, 'M86 60 54 4 64 42 96 52Z'],
    [1, 'M76 68 44 36 52 58 84 58Z'],
    [0, 'M70 80 32 72 48 92 70 101Z'],
    [1, 'M76 122 44 148 56 132 84 132Z']
  ];
  var ESC = 'M100 46 137 67 132 124 100 160 68 124 63 67Z';
  var INT = 'M100 59 125.5 73.5 122 118 100 144 78 118 74.5 73.5Z';
  var uid = 0;

  function nivel(xp) { var n = 0; for (var i = 1; i < MIN.length; i++) if ((+xp || 0) >= MIN[i]) n = i; return n; }
  function miles(n) { return String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  // Refleja un trazo de solo coordenadas (M x y x y … Z) sobre x = 100
  function reflejar(d) { var k = 0; return d.replace(/-?\d+(\.\d+)?/g, function (v) { return k++ % 2 ? v : String(200 - parseFloat(v)); }); }
  function lg(id, st, a) {
    return '<linearGradient id="' + id + '" x1="' + a[0] + '" y1="' + a[1] + '" x2="' + a[2] + '" y2="' + a[3] + '">' +
      st.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] != null ? ' stop-opacity="' + s[2] + '"' : '') + '/>'; }).join('') + '</linearGradient>';
  }

  /* ---------- El emblema ---------- */
  function svg(n, o) {
    o = o || {};
    n = Math.max(0, Math.min(4, n | 0));
    var p = PAL[n], m = p.m, g = p.g, id = 'mcrg' + (++uid), mini = !!o.mini;
    var izq = ALAS.filter(function (a) { return n >= a[0]; }).map(function (a) { return a[1]; });
    var extra = [];
    if (n >= 3) extra.push('M88 140 100 194 112 140Z');
    if (n >= 4) extra.push('M80 62 77 22 92 38 100 10 108 38 123 22 120 62Z');
    else if (n >= 1) extra.push('M87 58 100 32 113 58Z');

    var defs = '<defs>' +
      lg(id + 'm', [[0, m[0]], [.18, m[1]], [.44, m[2]], [.5, m[3]], [.56, m[2]], [.74, m[1]], [.88, m[0]], [1, m[2]]], [.15, 0, .85, 1]) +
      lg(id + 'c', [[0, m[0]], [.3, m[1]], [.5, m[2]], [.52, m[3]], [.62, m[2]], [.85, m[1]], [1, m[2]]], [.1, 0, .9, 1]) +
      lg(id + 'b', [[0, '#fff', .9], [.45, '#fff', 0], [.55, '#000', 0], [1, '#000', .55]], [0, 0, 0, 1]) +
      lg(id + 's', [[0, '#fff', 0], [.5, '#fff', .9], [1, '#fff', 0]], [0, 0, 1, 0]) +
      lg(id + 'gt', [[0, g[0]], [.55, g[1]], [1, g[2]]], [0, 0, 1, 1]) +
      '<radialGradient id="' + id + 'e" cx=".5" cy=".38" r=".7"><stop offset="0" stop-color="' + p.e[0] + '"/><stop offset="1" stop-color="' + p.e[1] + '"/></radialGradient>' +
      '<radialGradient id="' + id + 'w"><stop offset="0" stop-color="' + p.w + '" stop-opacity=".7"/><stop offset=".45" stop-color="' + p.w + '" stop-opacity=".22"/><stop offset="1" stop-color="' + p.w + '" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="' + id + 't" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="' + m[1] + '"/><stop offset="1" stop-color="' + m[3] + '"/></radialGradient>' +
      // Relieve: la luz de arriba a la izquierda marca el bisel de cada pieza
      '<filter id="' + id + 'f" x="-20%" y="-20%" width="140%" height="140%">' +
      '<feGaussianBlur in="SourceAlpha" stdDeviation="2.2" result="b"/>' +
      '<feSpecularLighting in="b" surfaceScale="5" specularConstant="1.25" specularExponent="26" lighting-color="#fff" result="s"><fePointLight x="30" y="-40" z="140"/></feSpecularLighting>' +
      '<feComposite in="s" in2="SourceAlpha" operator="in" result="s2"/>' +
      '<feDiffuseLighting in="b" surfaceScale="4" diffuseConstant="1" lighting-color="#fff" result="d"><feDistantLight azimuth="235" elevation="52"/></feDiffuseLighting>' +
      '<feComposite in="SourceGraphic" in2="d" operator="arithmetic" k1="1.15" k2="0" k3="0" k4="0" result="l"/>' +
      '<feComposite in="l" in2="SourceAlpha" operator="in" result="l2"/>' +
      '<feComposite in="l2" in2="s2" operator="arithmetic" k1="0" k2="1" k3=".85" k4="0"/></filter>' +
      '<filter id="' + id + 'gl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>' +
      '<clipPath id="' + id + 'k"><path d="' + ESC + '"/></clipPath>' +
      '<clipPath id="' + id + 'ki"><path d="' + INT + '"/></clipPath>' +
      '<clipPath id="' + id + 'up"><rect x="-20" y="-20" width="240" height="120"/></clipPath></defs>';

    // Fondo: aura y rayos (en tamaño chico no se dibujan)
    var fondo = '';
    if (!mini) {
      if (n >= 1) fondo += '<circle class="aura" cx="100" cy="100" r="' + [0, 70, 86, 96, 104][n] + '" fill="url(#' + id + 'w)"/>';
      if (n >= 2) {
        var r = '', q;
        for (q = 0; q < 16; q++) r += '<path d="M100 100 103.5 ' + (n >= 4 ? 0 : 10) + ' 96.5 ' + (n >= 4 ? 0 : 10) + 'Z" transform="rotate(' + q * 22.5 + ' 100 100)"/>';
        fondo += '<g class="rays" fill="' + p.w + '" opacity="' + (n >= 3 ? .22 : .15) + '">' + r + '</g>';
      }
      if (n >= 4) {
        var r2 = '';
        for (q = 0; q < 8; q++) r2 += '<path d="M100 100 102 6 98 6Z" transform="rotate(' + (q * 45 + 11) + ' 100 100)"/>';
        fondo += '<g class="rays2" fill="#FFE27A" opacity=".3">' + r2 + '</g>';
      }
    }

    // Cada pieza con grosor: dos cantos, cara con relieve, contorno y filo de luz
    function pieza(d, fill) {
      return '<path d="' + d + '" fill="' + m[4] + '" transform="translate(0 6)"/>' +
        '<path d="' + d + '" fill="' + m[3] + '" transform="translate(0 3)"/>' +
        '<path d="' + d + '" fill="' + (fill || 'url(#' + id + 'm)') + '" filter="url(#' + id + 'f)"/>' +
        '<path d="' + d + '" fill="none" stroke="' + m[4] + '" stroke-width="1.3" stroke-linejoin="round"/>' +
        '<path d="' + d + '" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1" stroke-linejoin="round" transform="translate(0 -.7)" clip-path="url(#' + id + 'up)"/>';
    }
    var cuerpo = izq.map(function (d) { return pieza(d) + pieza(reflejar(d)); }).join('') +
      extra.map(function (d) { return pieza(d); }).join('') + pieza(ESC, 'url(#' + id + 'c)');

    // Gema tallada
    var T = '100 72', R = '119 100', B = '100 131', L = '81 100', t = '100 87', rr = '108 100', b = '100 115', l = '92 100';
    var gema = '<path d="M' + T + 'L' + R + 'L' + B + 'L' + L + 'Z" fill="' + g[2] + '" filter="url(#' + id + 'gl)" opacity=".9"/>' +
      '<g class="gem">' +
      '<path d="M' + T + 'L' + R + 'L' + rr + 'L' + t + 'Z" fill="' + g[1] + '"/>' +
      '<path d="M' + R + 'L' + B + 'L' + b + 'L' + rr + 'Z" fill="' + g[3] + '"/>' +
      '<path d="M' + B + 'L' + L + 'L' + l + 'L' + b + 'Z" fill="' + g[2] + '"/>' +
      '<path d="M' + L + 'L' + T + 'L' + t + 'L' + l + 'Z" fill="' + g[0] + '"/>' +
      '<path d="M' + t + 'L' + rr + 'L' + b + 'L' + l + 'Z" fill="url(#' + id + 'gt)"/>' +
      '<path d="M' + T + 'L' + R + 'L' + B + 'L' + L + 'Z" fill="none" stroke="' + g[0] + '" stroke-width="1.3" stroke-linejoin="round"/>' +
      '<path d="M' + T + 'L' + t + 'M' + R + 'L' + rr + 'M' + B + 'L' + b + 'M' + L + 'L' + l + '" stroke="#fff" stroke-opacity=".45" stroke-width=".9"/>' +
      '<path d="M90 92 96 82 94 96Z" fill="#fff"/><circle cx="104" cy="94" r="1.6" fill="#fff"/></g>';
    var interior = '<path d="' + INT + '" fill="' + m[4] + '" transform="translate(0 -1.6)" opacity=".9"/>' +
      '<path d="' + INT + '" fill="url(#' + id + 'e)"/>' +
      '<path d="' + INT + '" fill="none" stroke="url(#' + id + 'b)" stroke-width="3" clip-path="url(#' + id + 'ki)"/>' +
      '<path d="M100 66 119 77 116 114 100 134 84 114 81 77Z" fill="none" stroke="' + m[1] + '" stroke-opacity=".6" stroke-width="1"/>' +
      '<path d="M100 59 125.5 73.5 124.6 85C112 79 88 79 75.4 85L74.5 73.5Z" fill="#fff" opacity=".1"/>' + gema;
    function remache(x, y) { return '<circle cx="' + x + '" cy="' + (y + 1.4) + '" r="3.6" fill="' + m[4] + '"/><circle cx="' + x + '" cy="' + y + '" r="3.6" fill="url(#' + id + 't)" stroke="' + m[4] + '" stroke-width=".8"/>'; }
    var remaches = remache(70, 71) + remache(130, 71) + remache(100, 152) + (n >= 2 ? remache(76.5, 120) + remache(123.5, 120) : '');
    var corona = n >= 4 ? '<g class="cgem"><circle cx="77" cy="22" r="4.4" fill="' + g[2] + '" stroke="' + m[4] + '"/><circle cx="76" cy="21" r="1.4" fill="#fff"/><circle cx="123" cy="22" r="4.4" fill="' + g[2] + '" stroke="' + m[4] + '"/><circle cx="122" cy="21" r="1.4" fill="#fff"/><path d="M100 0 107 9 100 19 93 9Z" fill="' + g[1] + '" stroke="' + m[4] + '"/><path d="M100 0 107 9 100 9Z" fill="#fff" opacity=".7"/></g>' : '';
    var brillo = '<g clip-path="url(#' + id + 'k)"><g class="shine"><rect x="20" y="0" width="30" height="200" fill="url(#' + id + 's)" transform="skewX(-22)"/></g></g>';

    // Destellos y chispas
    var frente = '';
    if (!mini) {
      var est = function (x, y, s, d, c) { return '<path class="tw" style="animation-delay:' + d + 's" d="M' + x + ' ' + (y - s) + 'Q' + x + ' ' + y + ' ' + (x + s) + ' ' + y + 'Q' + x + ' ' + y + ' ' + x + ' ' + (y + s) + 'Q' + x + ' ' + y + ' ' + (x - s) + ' ' + y + 'Q' + x + ' ' + y + ' ' + x + ' ' + (y - s) + 'Z" fill="' + (c || '#fff') + '"/>'; };
      frente += est(126, 60, 8, 0) + est(84, 90, 5, 2.5);
      if (n >= 2) frente += est(40, 70, 6, 1.3, m[1]) + est(164, 118, 6, 3.6, m[1]);
      if (n >= 3) {
        var pc = [g[0], g[1], m[1]];
        [[30, 150, 0], [170, 150, 1.5], [60, 176, 3], [140, 176, 4.5], [16, 110, 2.2], [184, 104, 3.8], [100, 196, 5.2]].forEach(function (c, k) {
          frente += '<circle class="pt" style="animation-delay:' + c[2] + 's" cx="' + c[0] + '" cy="' + c[1] + '" r="' + (k % 2 ? 2.2 : 3) + '" fill="' + pc[k % 3] + '"/>';
        });
      }
    }
    css();
    return '<svg class="mc-rgo-em' + (o.quieto ? ' quieto' : '') + '" viewBox="-8 -10 216 214" role="img" aria-label="Rango ' + NOM[n] + '">' + defs + fondo +
      '<g class="' + (n >= 3 && !mini ? 'flo' : '') + '">' + cuerpo + interior + remaches + corona + brillo + '</g>' + frente + '</svg>';
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
      '@keyframes mcRgoShine{0%{transform:translateX(-160px)}40%,100%{transform:translateX(200px)}}' +
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
    var hoy = clave(), cuenta = [0, 0, 0, 0, 0], sem = {};
    (filas || []).forEach(function (f) { if (f.semana && f.semana < hoy && (+f.xp || 0) > 0) { var n = nivel(f.xp); cuenta[n]++; (sem[n] = sem[n] || []).push(f.semana); } });
    var total = cuenta.reduce(function (a, b) { return a + b; }, 0);
    var html = '';
    for (var n = 4; n >= 0; n--) {
      var tiene = cuenta[n] > 0, ult = tiene ? sem[n].sort().pop() : null;
      html += '<div class="mc-rgo-pz' + (tiene ? '' : ' no') + '" style="' + vars(n) + '">' + (cuenta[n] > 1 ? '<em>×' + cuenta[n] + '</em>' : '') +
        '<span>' + svg(n, { mini: !tiene, quieto: !tiene }) + '</span><b>' + NOM[n] + '</b><small>' + (tiene ? rangoSemana(ult) : miles(MIN[n]) + ' XP') + '</small></div>';
    }
    return { total: total, html: html };
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
