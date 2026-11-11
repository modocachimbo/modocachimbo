/* =========================================================
   Modo Cachimbo · Clanes: escudos dibujados en código y llamadas
   (lo usan clanes.html y el inicio; SQL en supabase/88-clanes.sql)
   ========================================================= */
(function () {
  if (window.MCClanes) return;

  // Cada forma: p = contorno del escudo; s = escala (las que llevan adornos alrededor son más chicas)
  var FORMAS = {
    punta: 'M50 4 92 16v38c0 26-18 44-42 54C26 98 8 80 8 54V16z',
    redondo: 'M50 4c18 0 32 4 42 10v40c0 28-20 46-42 54C28 100 8 82 8 54V14C18 8 32 4 50 4z',
    corona: 'M8 22 22 6l14 10L50 2l14 14L78 6l14 16v32c0 26-18 44-42 54C26 98 8 80 8 54z',
    alas: 'M50 8 80 18v34c0 24-14 40-30 50C34 92 20 76 20 52V18z',
    hex: 'M50 3 91 26v54L50 107 9 80V26z',
    diamante: 'M50 2 95 46 50 108 5 46z',
    real: 'M8 22 22 6l14 10L50 2l14 14L78 6l14 16v32c0 26-18 44-42 54C26 98 8 80 8 54z',
    espadas: 'M50 4 92 16v38c0 26-18 44-42 54C26 98 8 80 8 54V16z',
    laurel: 'M50 4c18 0 32 4 42 10v40c0 28-20 46-42 54C28 100 8 82 8 54V14C18 8 32 4 50 4z',
    llamas: 'M50 4 92 16v38c0 26-18 44-42 54C26 98 8 80 8 54V16z',
    pinchos: 'M50 4 92 16v38c0 26-18 44-42 54C26 98 8 80 8 54V16z',
    cuernos: 'M50 8 86 18v36c0 24-16 40-36 50C30 94 14 78 14 54V18z',
    dragon: 'M50 8 80 18v34c0 24-14 40-30 50C34 92 20 76 20 52V18z'
  };
  var ESCALA = { espadas: .76, laurel: .74, llamas: .72, pinchos: .8, cuernos: .86, dragon: .9, real: .9 };
  var L = 'stroke="rgba(0,0,0,.35)" stroke-width="2" stroke-linejoin="round"';
  var O = 'fill="#222"';
  var SIMB = {
    rayo: '<path d="M56 26 34 60h14l-6 26 24-38H52z" fill="#fff" ' + L + '/>',
    libro: '<path d="M28 36q11-5 22 1 11-6 22-1v40q-11-5-22 1-11-6-22-1z" fill="#fff" ' + L + '/><path d="M50 37v40" stroke="rgba(0,0,0,.35)" stroke-width="2"/>',
    buho: '<path d="M30 40l8-10 12 6 12-6 8 10v18c0 14-9 24-20 24S30 72 30 58z" fill="#fff" ' + L + '/><circle cx="42" cy="50" r="6" fill="#222"/><circle cx="58" cy="50" r="6" fill="#222"/><circle cx="43.5" cy="48.5" r="2" fill="#fff"/><circle cx="59.5" cy="48.5" r="2" fill="#fff"/><path d="M46 60l4 5 4-5z" fill="#FF9600"/>',
    llama: '<path d="M50 24c3 10 18 16 18 34a18 18 0 0 1-36 0c0-9 6-15 9-18 0 6 3 9 6 9 0-9-3-17 3-25z" fill="#fff" ' + L + '/>',
    estrella: '<path d="M50 26l7 15 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2z" fill="#fff" ' + L + '/>',
    montana: '<path d="M24 76 42 44l8 12 8-18 18 38z" fill="#fff" ' + L + '/>',
    atomo: '<g fill="none" stroke="#fff" stroke-width="4"><ellipse cx="50" cy="54" rx="22" ry="9"/><ellipse cx="50" cy="54" rx="22" ry="9" transform="rotate(60 50 54)"/><ellipse cx="50" cy="54" rx="22" ry="9" transform="rotate(-60 50 54)"/></g><circle cx="50" cy="54" r="5" fill="#fff"/>',
    corona: '<path d="M27 68 24 38l13 11 13-19 13 19 13-11-3 30z" fill="#fff" ' + L + '/><path d="M27 70h46v8H27z" fill="#fff" ' + L + '/><circle cx="50" cy="56" r="4" fill="#FF4B4B"/><circle cx="37" cy="60" r="3" fill="#1CB0F6"/><circle cx="63" cy="60" r="3" fill="#1CB0F6"/>',
    espadas: '<g transform="rotate(38 50 56)"><path d="M47 22h6l1 40h-8z" fill="#fff" ' + L + '/><path d="M38 62h24v5H38z" fill="#fff" ' + L + '/><path d="M47.5 67h5v12h-5z" ' + O + '/><circle cx="50" cy="82" r="3.5" fill="#fff" ' + L + '/></g><g transform="rotate(-38 50 56)"><path d="M47 22h6l1 40h-8z" fill="#fff" ' + L + '/><path d="M38 62h24v5H38z" fill="#fff" ' + L + '/><path d="M47.5 67h5v12h-5z" ' + O + '/><circle cx="50" cy="82" r="3.5" fill="#fff" ' + L + '/></g>',
    birrete: '<path d="M34 52v12c0 7 32 7 32 0V52L50 58z" fill="#fff" ' + L + '/><path d="M50 32 82 45 50 58 18 45z" fill="#fff" ' + L + '/><path d="M74 48v16" stroke="#FFC800" stroke-width="3" stroke-linecap="round"/><circle cx="74" cy="67" r="3.5" fill="#FFC800"/>',
    cohete: '<path d="M38 52 28 68h11zM62 52l10 16H61z" fill="#fff" ' + L + '/><path d="M50 22c11 8 15 22 12 42H38c-3-20 1-34 12-42z" fill="#fff" ' + L + '/><circle cx="50" cy="42" r="6" fill="#1CB0F6" stroke="#222" stroke-width="2"/><path d="M43 66h14l-7 16z" fill="#FF9600"/><path d="M47 66h6l-3 8z" fill="#FFC800"/>',
    diamante: '<path d="M34 34h32l12 14-28 34-28-34z" fill="#fff" ' + L + '/><path d="M22 48h56M40 34l-4 14 14 34 14-34-4-14M36 48l14-14 14 14" fill="none" stroke="rgba(0,0,0,.3)" stroke-width="1.8" stroke-linejoin="round"/>',
    matraz: '<path d="M43 26h14v5h-2v13l15 26c2 5-1 10-6 10H36c-5 0-8-5-6-10l15-26V31h-2z" fill="#fff" ' + L + '/><path d="M37 64h26l5 8c1 3-1 5-4 5H36c-3 0-5-2-4-5z" fill="#58CC02"/><circle cx="46" cy="58" r="2.5" fill="#58CC02"/><circle cx="53" cy="52" r="2" fill="#58CC02"/>',
    lobo: '<path d="M28 26l12 14h20l12-14 3 26c0 15-11 27-25 32C36 79 25 67 25 52z" fill="#fff" ' + L + '/><path d="M36 50l9 3-1 4-9-3zM64 50l-9 3 1 4 9-3z" ' + O + '/><path d="M45 66h10l-5 6z" ' + O + '/><path d="M42 74q8 5 16 0" fill="none" stroke="#222" stroke-width="2" stroke-linecap="round"/>',
    aguila: '<path d="M46 44C38 32 24 30 16 34c4 2 6 5 6 5-5 0-8 3-8 3 6 1 9 5 9 5-4 1-6 4-6 4 10 1 20-2 27-6zM54 44c8-12 22-14 30-10-4 2-6 5-6 5 5 0 8 3 8 3-6 1-9 5-9 5 4 1 6 4 6 4-10 1-20-2-27-6z" fill="#fff" ' + L + '/><path d="M44 42h12v16l4 16H40l4-16z" fill="#fff" ' + L + '/><circle cx="50" cy="36" r="7" fill="#fff" ' + L + '/><path d="M50 37l6 2-6 3z" fill="#FFC800"/><circle cx="48" cy="35" r="1.6" fill="#222"/>',
    cerebro: '<path d="M49 30c-5-5-15-4-17 3-8 2-10 11-6 17-4 8 1 17 10 18 3 6 11 6 13 1zM51 30c5-5 15-4 17 3 8 2 10 11 6 17 4 8-1 17-10 18-3 6-11 6-13 1z" fill="#fff" ' + L + '/><path d="M38 42c4 0 6 3 6 6M33 56c5-1 8 2 8 6M62 42c-4 0-6 3-6 6M67 56c-5-1-8 2-8 6" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="2" stroke-linecap="round"/>',
    pi: '<path d="M24 40c2-6 6-8 12-8h40v10h-9v24c0 4 2 6 6 6v9c-9 0-16-4-16-14V42h-9v38H38V42h-2c-3 0-5 2-6 6z" fill="#fff" ' + L + '/>'
  };
  var COLORES = ['#C6E000', '#FF9600', '#1CB0F6', '#CE82FF', '#FF4B4B', '#58CC02', '#FFC800', '#FF86D0', '#2BD9C2', '#7A5CFF', '#C9D1E0', '#CD7F32'];
  var NOMBRES_FORMA = { punta: 'Clásico', redondo: 'Redondo', corona: 'Corona', alas: 'Con alas', hex: 'Hexágono', diamante: 'Diamante', real: 'Real con gemas',
    espadas: 'Espadas cruzadas', laurel: 'Laureles', llamas: 'En llamas', pinchos: 'Con púas', cuernos: 'Con cuernos', dragon: 'Alas de dragón' };

  function osc(c, f) {
    var n = parseInt(String(c || '#C6E000').slice(1), 16);
    return 'rgb(' + Math.round((n >> 16) * f) + ',' + Math.round((n >> 8 & 255) * f) + ',' + Math.round((n & 255) * f) + ')';
  }
  function esp(rot) { // una espada detrás del escudo, con el mango arriba
    return '<g transform="rotate(' + rot + ' 50 56)"><path d="M45 24h10v84l-5 8-5-8z" fill="#E4E9F2" stroke="#4d5468" stroke-width="2" stroke-linejoin="round"/><path d="M50 26v86" stroke="#fff" stroke-width="1.4" opacity=".8"/>' +
      '<path d="M32 17h36l-4 8H36z" fill="#FFC800" stroke="#8a6400" stroke-width="2" stroke-linejoin="round"/><path d="M46.5 3h7v14h-7z" fill="#6b3f1d" stroke="#3a210e" stroke-width="1.5"/><circle cx="50" cy="1" r="4.5" fill="#FF4B4B" stroke="#8a6400" stroke-width="2"/></g>';
  }
  function hoja(x, y, r, col) { return '<ellipse cx="' + x + '" cy="' + y + '" rx="7" ry="3.4" transform="rotate(' + r + ' ' + x + ' ' + y + ')" fill="' + col + '" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/>'; }
  // Adornos detrás (t) y delante (d) del escudo
  function adornos(f, col, id) {
    var t = '', d = '', i, o = osc(col, .75);
    if (f === 'alas') t = '<path class="mccl-ala i" d="M20 26C8 30 2 44 4 60c6-4 10-4 16-2z" fill="url(#' + id + 'b)" stroke="rgba(0,0,0,.4)" stroke-width="2"/><path class="mccl-ala d" d="M80 26c12 4 18 18 16 34-6-4-10-4-16-2z" fill="url(#' + id + 'b)" stroke="rgba(0,0,0,.4)" stroke-width="2"/>';
    if (f === 'dragon') t = '<g class="mccl-ala i"><path d="M24 30C14 18 2 16 0 20c4 4 4 10 2 14 4 0 6 4 4 8 4 0 6 4 4 8 4-1 8 0 12 4z" fill="url(#' + id + 'b)" stroke="rgba(0,0,0,.45)" stroke-width="2" stroke-linejoin="round"/><path d="M24 30 4 22M24 38 8 34M24 46l-12-4" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/></g>' +
      '<g class="mccl-ala d"><path d="M76 30c10-12 22-14 24-10-4 4-4 10-2 14-4 0-6 4-4 8-4 0-6 4-4 8-4-1-8 0-12 4z" fill="url(#' + id + 'b)" stroke="rgba(0,0,0,.45)" stroke-width="2" stroke-linejoin="round"/><path d="M76 30l20-8M76 38l16-4M76 46l12-4" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/></g>';
    if (f === 'espadas') t = esp(-38) + esp(38);
    if (f === 'llamas') t = '<g class="mccl-fuego"><path d="M50 110C20 108 6 90 8 66c2-14 8-20 8-20 0 10 6 14 6 14-4-20 6-36 18-44-2 10 2 16 2 16 2-14 6-22 8-32 2 10 6 18 8 32 0 0 4-6 2-16 12 8 22 24 18 44 0 0 6-4 6-14 0 0 6 6 8 20 2 24-12 42-42 44z" fill="url(#' + id + 'f)" stroke="#a33a00" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M50 104c-20-2-30-16-28-32 1-8 5-12 5-12 0 6 4 9 4 9-2-12 4-22 11-28-1 6 2 10 2 10 2-8 4-14 6-20 2 6 4 12 6 20 0 0 3-4 2-10 7 6 13 16 11 28 0 0 4-3 4-9 0 0 4 4 5 12 2 16-8 30-28 32z" fill="#FFC800" opacity=".75"/></g>';
    if (f === 'pinchos') { for (i = 0; i < 12; i++) { var a = i * 30 - 75; t += '<path d="M46 56 50 4 54 56z" transform="rotate(' + a + ' 50 58)" fill="url(#' + id + 'b)" stroke="rgba(0,0,0,.45)" stroke-width="1.5"/>'; } }
    if (f === 'cuernos') t = '<path d="M20 26C8 22 4 10 8 0c2 10 10 14 18 16zM80 26c12-4 16-16 12-26-2 10-10 14-18 16z" fill="#F4E9D0" stroke="#7a6a48" stroke-width="2"/><path d="M12 8c4 4 8 6 12 6M88 8c-4 4-8 6-12 6" stroke="#7a6a48" stroke-width="1.5" fill="none"/>';
    if (f === 'laurel') {
      var g = '#58CC02', ramas = '<path d="M30 104C10 92 4 66 12 40" fill="none" stroke="#3d8a00" stroke-width="2.5"/><path d="M70 104c20-12 26-38 18-64" fill="none" stroke="#3d8a00" stroke-width="2.5"/>';
      for (i = 0; i < 6; i++) { var yy = 46 + i * 10, xx = 10 + Math.abs(i - 2) * 1.6 + i * 1.2; d += hoja(xx, yy, -60 + i * 10, g) + hoja(100 - xx, yy, 60 - i * 10, g); }
      d = ramas + d + '<path d="M38 104h24l-4 6h-16z" fill="#FFC800" stroke="#8a6400" stroke-width="1.5"/>';
    }
    if (f === 'real') d = '<g class="mccl-gema"><circle cx="22" cy="7" r="4" fill="#FF4B4B" stroke="#fff" stroke-width="1.5"/><circle cx="50" cy="3" r="5" fill="#1CB0F6" stroke="#fff" stroke-width="1.5"/><circle cx="78" cy="7" r="4" fill="#FF4B4B" stroke="#fff" stroke-width="1.5"/></g>' +
      '<path d="M4 88h18l-4 8h22v-8h20v8h22l-4-8h18l-6 10 6 10H74l2-4H24l2 4H4l6-10z" fill="#FFC800" stroke="#8a6400" stroke-width="2" stroke-linejoin="round"/>';
    if (f === 'diamante') d = '<path d="M50 2 95 46 50 108 5 46z" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1.5" transform="translate(50 50) scale(.6) translate(-50 -50)"/>';
    if (f === 'hex') d = [[50, 9], [85, 29], [85, 77], [50, 100], [15, 77], [15, 29]].map(function (q) { return '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="2.4" fill="rgba(255,255,255,.55)"/>'; }).join('');
    return { t: t, d: d };
  }
  function cla(c, f) { // aclara hacia el blanco (f de 0 a 1)
    var n = parseInt(String(c || '#C6E000').slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255;
    return 'rgb(' + Math.round(r + (255 - r) * f) + ',' + Math.round(g + (255 - g) * f) + ',' + Math.round(b + (255 - b) * f) + ')';
  }
  // Estilos de brillo y chispas: solo se animan en los escudos grandes
  (function () {
    if (document.getElementById('mccl-css')) return;
    var st = document.createElement('style'); st.id = 'mccl-css';
    st.textContent = '.mccl-brillo{opacity:0}.mccl-chispa{opacity:0}' +
      '.hero .mccl-brillo,.gbig .mccl-brillo,.prev .mccl-brillo,.grande .mccl-brillo{opacity:1;animation:mcclBrillo 4.5s ease-in-out infinite}' +
      '.hero .mccl-chispa,.gbig .mccl-chispa,.prev .mccl-chispa,.grande .mccl-chispa{animation:mcclChispa 3s ease-in-out infinite;transform-box:fill-box;transform-origin:center}' +
      '.mccl-chispa.b{animation-delay:1s !important}.mccl-chispa.c{animation-delay:2s !important}' +
      '.hero .esc,.prev .esc,.grande{animation:mcclFlota 4s ease-in-out infinite}' +
      '.mccl-ala,.mccl-fuego{transform-box:fill-box}.mccl-ala.i{transform-origin:100% 20%}.mccl-ala.d{transform-origin:0 20%}.mccl-fuego{transform-origin:50% 100%}' +
      '.hero .mccl-ala.i,.gbig .mccl-ala.i,.prev .mccl-ala.i,.grande .mccl-ala.i{animation:mcclAlaI 2.2s ease-in-out infinite}' +
      '.hero .mccl-ala.d,.gbig .mccl-ala.d,.prev .mccl-ala.d,.grande .mccl-ala.d{animation:mcclAlaD 2.2s ease-in-out infinite}' +
      '.hero .mccl-fuego,.gbig .mccl-fuego,.prev .mccl-fuego,.grande .mccl-fuego{animation:mcclFuego .9s ease-in-out infinite alternate}' +
      '.hero .mccl-gema,.gbig .mccl-gema,.prev .mccl-gema,.grande .mccl-gema{animation:mcclGema 2s ease-in-out infinite}' +
      '@keyframes mcclAlaI{50%{transform:rotate(-9deg)}}@keyframes mcclAlaD{50%{transform:rotate(9deg)}}' +
      '@keyframes mcclFuego{0%{transform:scale(1,1)}100%{transform:scale(1.04,1.08)}}' +
      '@keyframes mcclGema{50%{filter:drop-shadow(0 0 3px #fff) brightness(1.3)}}' +
      '@keyframes mcclBrillo{0%,55%{transform:translateX(-120px)}85%,100%{transform:translateX(130px)}}' +
      '@keyframes mcclChispa{0%,100%{opacity:0;transform:scale(.3) rotate(0)}50%{opacity:1;transform:scale(1) rotate(45deg)}}' +
      '@keyframes mcclFlota{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-4px) rotate(1deg)}}' +
      '@media (prefers-reduced-motion:reduce){.mccl-brillo,.mccl-chispa,.mccl-ala,.mccl-fuego,.mccl-gema,.hero .esc,.prev .esc,.grande{animation:none !important}}';
    (document.head || document.documentElement).appendChild(st);
  })();
  var uid = 0;
  // El escudo del clan: c = { forma, simbolo, color }. Capas: grosor, bisel metálico, panel, brillo, símbolo en relieve.
  function escudo(c) {
    c = c || {};
    var f = FORMAS[c.forma] ? c.forma : 'punta', col = /^#[0-9a-f]{6}$/i.test(c.color || '') ? c.color : '#C6E000', p = FORMAS[f], id = 'mcclg' + (uid++);
    var k = ESCALA[f] || 1, esc = k === 1 ? '' : ' transform="translate(50 56) scale(' + k + ') translate(-50 -56)"', a = adornos(f, col, id);
    var dentro = ' transform="translate(50 56) scale(.84) translate(-50 -56)"';
    var simb = (SIMB[c.simbolo] || '').replace(/fill="#fff"/g, 'fill="url(#' + id + 'w)"');
    var chispa = function (x, y, r, cl) { return '<path class="mccl-chispa ' + cl + '" d="M' + x + ' ' + (y - r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + 'Q' + x + ' ' + y + ' ' + x + ' ' + (y + r) + 'Q' + x + ' ' + y + ' ' + (x - r) + ' ' + y + 'Q' + x + ' ' + y + ' ' + x + ' ' + (y - r) + 'z" fill="#fff"/>'; };
    return '<svg viewBox="0 0 100 112" width="100%" height="100%" aria-hidden="true" style="overflow:visible"><defs>' +
      '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + cla(col, .12) + '"/><stop offset=".5" stop-color="' + col + '"/><stop offset="1" stop-color="' + osc(col, .5) + '"/></linearGradient>' +
      '<linearGradient id="' + id + 'b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + cla(col, .7) + '"/><stop offset=".35" stop-color="' + cla(col, .2) + '"/><stop offset=".65" stop-color="' + osc(col, .55) + '"/><stop offset="1" stop-color="' + osc(col, .28) + '"/></linearGradient>' +
      '<radialGradient id="' + id + 'r" cx=".32" cy=".22" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></radialGradient>' +
      '<linearGradient id="' + id + 'w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="' + cla(col, .72) + '"/></linearGradient>' +
      '<linearGradient id="' + id + 'f" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FF4B4B"/><stop offset=".6" stop-color="#FF9600"/><stop offset="1" stop-color="#FFC800"/></linearGradient>' +
      '<linearGradient id="' + id + 's" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<filter id="' + id + 'h" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="2.6" stdDeviation="1.1" flood-color="#000" flood-opacity=".5"/></filter>' +
      '<clipPath id="' + id + 'c"><path d="' + p + '"/></clipPath></defs>' + a.t +
      '<g' + esc + '>' +
        // grosor (el canto del escudo) y sombra
        '<path d="' + p + '" fill="#0a0814" transform="translate(0,8)" opacity=".45"/>' +
        '<path d="' + p + '" fill="' + osc(col, .3) + '" transform="translate(0,4.5)"/>' +
        // bisel metálico
        '<path d="' + p + '" fill="url(#' + id + 'b)" stroke="' + osc(col, .25) + '" stroke-width="2.5" stroke-linejoin="round"/>' +
        // panel interior hundido
        '<path d="' + p + '" fill="' + osc(col, .35) + '"' + ' transform="translate(50 56.8) scale(.86) translate(-50 -56)"/>' +
        '<path d="' + p + '" fill="url(#' + id + ')"' + dentro + '/>' +
        '<path d="' + p + '" fill="url(#' + id + 'r)"' + dentro + '/>' +
        '<g clip-path="url(#' + id + 'c)"><path d="M0 0h100v24H0z" fill="rgba(255,255,255,.12)"' + dentro + '/>' +
          '<g class="mccl-brillo"><path d="M30 -10h22L22 122H0z" fill="url(#' + id + 's)"/></g></g>' +
        '<path d="' + p + '" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="1.2" transform="translate(50 56) scale(.9) translate(-50 -56)"/>' +
        '<g filter="url(#' + id + 'h)">' + simb + '</g>' +
      '</g>' + a.d + chispa(16, 18, 5, 'a') + chispa(86, 40, 4, 'b') + chispa(24, 92, 3.5, 'c') + '</svg>';
  }
  // Solo el símbolo, para el selector
  function simbolo(s, color) {
    return '<svg viewBox="18 18 64 72" aria-hidden="true">' + (SIMB[s] || '').replace(/#fff/g, color || '#C6E000').replace(/rgba\(0,0,0,\.35\)/g, osc(color || '#C6E000', .45)) + '</svg>';
  }

  function rpc(nombre, args) {
    if (!window.MCAuth) return Promise.reject(new Error('sin-auth'));
    return MCAuth.listo.then(function (c) { return c.rpc(nombre, args || {}); }).then(function (r) {
      if (r.error) throw r.error;
      return r.data;
    });
  }
  // El top se guarda 5 minutos para no pedirlo en cada vuelta al inicio
  function clave() { var u = window.MCAuth && MCAuth.usuario && MCAuth.usuario(); return u ? 'mc_clanes_top_' + u.id : ''; }
  function ranking(forzar) {
    if (!forzar) { try { var x = JSON.parse(localStorage.getItem(clave()) || 'null'); if (x && Date.now() - x.t < 5 * 60e3) return Promise.resolve(x.d); } catch (e) {} }
    return rpc('ranking_clanes').then(function (d) { d = d || { top: [] }; try { if (clave()) localStorage.setItem(clave(), JSON.stringify({ t: Date.now(), d: d })); } catch (e) {} return d; });
  }
  function olvidar() { try { if (clave()) localStorage.removeItem(clave()); } catch (e) {} }
  function sinSql(e) { return e && /clan|function .* does not exist|Could not find the function/i.test(String(e.message || e)); }

  var ERRORES = {
    ya_en_clan: 'Ya estás en un clan. Sal de él primero.',
    espera: 'Saliste de un clan hace poco. Espera 24 horas para entrar a otro.',
    no_existe: 'No hay ningún clan con ese código. Revisa las 4 letras.',
    lleno: 'Ese clan ya tiene 20 miembros, el máximo.',
    nombre_usado: 'Ya hay un clan con ese nombre. Prueba otro.',
    nombre_feo: 'Ese nombre no está permitido. Elige uno sin groserías.',
    nombre_largo: 'El nombre debe tener entre 3 y 24 letras.',
    tag_mal: 'La sigla debe tener de 2 a 5 letras o números, sin espacios.',
    no_lider: 'Solo el líder puede hacer eso.',
    max_sub: 'El clan ya tiene 2 sublíderes, el máximo.',
    no_miembro: 'Ese alumno ya no está en el clan.',
    rival_pocos: 'Ese clan aún no tiene 3 miembros para ir a la guerra.',
    pocos: 'Necesitan al menos 3 miembros para ir a la guerra.',
    rival_en_guerra: 'Ese clan ya está en una guerra. Elige otro.',
    ya_en_guerra: 'Tu clan ya tiene una guerra o un reto pendiente.',
    reto_no_existe: 'Ese reto ya no está disponible.',
    muchos_empujones: 'Ya empujaste a 20 compañeros hoy. Mañana puedes seguir.',
    ya_empujado: 'Ya lo empujaste hoy.',
    sin_clan: 'Primero únete a un clan.',
    horas_mal: 'La guerra dura 1 o 2 días.',
    lider_no_existe: 'No hay ningún alumno con ese ID.',
    lider_en_clan: 'Ese alumno ya está en otro clan. Que salga primero.',
    forma_mal: 'Esa forma de escudo aún no está disponible. Actualiza la página.',
    simbolo_mal: 'Ese símbolo aún no está disponible. Actualiza la página.'
  };
  function error(e) {
    var m = String(e && (e.message || e) || '');
    // La clave más larga gana (reto_no_existe antes que no_existe)
    var mejor = '';
    for (var k in ERRORES) if (m.indexOf(k) >= 0 && k.length > mejor.length) mejor = k;
    if (mejor) return ERRORES[mejor];
    return 'No se pudo. Revisa tu internet e intenta otra vez.';
  }

  window.MCClanes = {
    FORMAS: FORMAS, SIMB: SIMB, COLORES: COLORES, NOMBRES_FORMA: NOMBRES_FORMA,
    escudo: escudo, simbolo: simbolo, rpc: rpc, ranking: ranking, olvidar: olvidar, sinSql: sinSql, error: error
  };
})();
