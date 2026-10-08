/* =========================================================
   Modo Cachimbo · El búho con emociones
   - MCBuho.svg(animo, tam): dibujo del búho con ese ánimo.
     Ánimos: normal, feliz, preocupado, triste, celebrando, dormido.
   - MCBuho.animo(racha, extra): elige el ánimo y lo que dice, según la
     racha de estudio (assets/racha.js) y si ganó un duelo hace poco.
   - En el inicio (lo carga index.html) se pone junto al saludo.
   ========================================================= */
(function () {
  if (window.MCBuho) return;
  // Colores del logo: negro, blanco y lima (más rubor y lágrima para las emociones)
  var C = {
    lima: '#C6E000', limaOsc: '#9DB300', negro: '#0B0B0B', blanco: '#F7F7F2', gris: '#D9D9D2',
    pupila: '#0B0B0B', rubor: '#FF8FB1', lengua: '#FF6B81', lagrima: '#7DD3FC'
  };
  var ANIMOS = { normal: 1, feliz: 1, preocupado: 1, triste: 1, celebrando: 1, dormido: 1 };
  // Las cejas largas del logo: cuánto se inclinan (grados) y suben (px) en cada ánimo, o su forma
  var CEJA = { normal: [0, 0], feliz: [-8, -6], celebrando: [8, -12], preocupado: 'M97 64 L90 73 L66 74 L60 80 L42 84 L18 98 L38 74 L64 64 Z', triste: 'M95 58 L89 68 L66 76 L60 82 L44 90 L22 112 L38 82 L62 68 Z', dormido: [-6, -4] };

  function ceja(animo) {
    var a = CEJA[animo] || CEJA.normal;
    // ceja izquierda con el borde de abajo "en plumas", como en el logo;
    // preocupado y triste tienen su propia forma (la punta de adentro sube)
    var d = typeof a === 'string' ? a : 'M99 96 L88 99 L66 84 L60 88 L44 70 L36 72 L12 30 L46 50 L66 64 Z';
    var g = typeof a === 'string' ? '' : 'translate(0 ' + a[1] + ') rotate(' + a[0] + ' 96 96)';
    return '<g class="b-cejas"><path d="' + d + '" fill="' + C.lima + '" transform="' + g + '"/>' +
      '<g transform="translate(200 0) scale(-1 1)"><path d="' + d + '" fill="' + C.lima + '" transform="' + g + '"/></g></g>';
  }
  function ojo(cx, cy, animo, lado) {
    if (animo === 'feliz' || animo === 'celebrando') // ojitos cerrados de alegría ∩
      return '<path d="M' + (cx - 16) + ' ' + (cy + 6) + ' Q' + cx + ' ' + (cy - 16) + ' ' + (cx + 16) + ' ' + (cy + 6) + '" fill="none" stroke="' + C.lima + '" stroke-width="8" stroke-linecap="round"/>';
    if (animo === 'dormido')
      return '<path d="M' + (cx - 16) + ' ' + cy + ' Q' + cx + ' ' + (cy + 13) + ' ' + (cx + 16) + ' ' + cy + '" fill="none" stroke="' + C.lima + '" stroke-width="7" stroke-linecap="round"/>';
    var dx = 0, dy = 0, r = 13;
    if (animo === 'preocupado') { dx = -7; r = 11; }
    if (animo === 'triste') { dy = 6; }
    return '<circle cx="' + cx + '" cy="' + cy + '" r="24" fill="' + C.lima + '"/>' +
      '<g class="b-pupila"><circle cx="' + (cx + dx) + '" cy="' + (cy + dy) + '" r="' + r + '" fill="' + C.pupila + '"/>' +
      '<circle cx="' + (cx + dx + 5) + '" cy="' + (cy + dy - 5) + '" r="5" fill="#fff"/>' +
      '<circle cx="' + (cx + dx - 4) + '" cy="' + (cy + dy + 5) + '" r="2.2" fill="#fff"/></g>';
  }
  function pico(animo) {
    if (animo === 'celebrando')
      return '<path d="M90 114 L110 114 L100 124 Z" fill="' + C.lima + '"/><path d="M92 128 Q100 144 108 128 Z" fill="' + C.limaOsc + '"/><path d="M96 132 Q100 139 104 132 Z" fill="' + C.lengua + '"/>';
    if (animo === 'triste' || animo === 'preocupado') return '<path d="M92 116 L108 116 L100 132 Z" fill="' + C.lima + '"/>';
    return '<path d="M90 114 L110 114 L100 136 Z" fill="' + C.lima + '"/>';
  }
  function alas(animo) {
    var d = { celebrando: 'M48 126 Q18 108 10 78 Q34 88 56 112 Z', triste: 'M44 136 Q32 166 46 194 Q54 180 56 160 Z',
      preocupado: 'M44 132 Q26 146 40 172 Q50 164 56 150 Z' }[animo] || 'M44 132 Q24 156 38 188 Q50 178 56 158 Z';
    var esp = d.replace(/(\d+(?:\.\d+)?) (\d+(?:\.\d+)?)/g, function (t, x, y) { return (200 - x) + ' ' + y; });
    return '<path class="b-ala-i" d="' + d + '" fill="' + C.gris + '"/><path class="b-ala-d" d="' + esp + '" fill="' + C.gris + '"/>';
  }
  function extras(animo) {
    if (animo === 'triste') return '<path class="b-lagrima" d="M132 118 Q125 130 132 137 Q139 130 132 118 Z" fill="' + C.lagrima + '"/>';
    if (animo === 'preocupado') return '<path class="b-gota" d="M172 74 Q164 87 172 95 Q180 87 172 74 Z" fill="' + C.lagrima + '"/>';
    if (animo === 'dormido') return '<g class="b-zzz" fill="' + C.lima + '" font-family="Sora,Inter,Arial,sans-serif" font-weight="800">' +
      '<text x="164" y="80" font-size="24">z</text><text x="180" y="60" font-size="18">z</text><text x="194" y="44" font-size="13">z</text></g>';
    if (animo === 'celebrando') return '<g class="b-confeti">' +
      '<rect x="40" y="6" width="9" height="9" rx="2" fill="#F9A8D4" transform="rotate(20 44 10)"/>' +
      '<rect x="176" y="104" width="9" height="9" rx="2" fill="#7DD3FC" transform="rotate(-25 180 108)"/>' +
      '<circle cx="150" cy="8" r="5" fill="#FBBF24"/><circle cx="10" cy="120" r="4.5" fill="#7DD3FC"/>' +
      '<path d="M100 0 l4 9 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1 Z" fill="#FBBF24"/></g>';
    return '';
  }
  function svg(animo, tam) {
    animo = ANIMOS[animo] ? animo : 'normal';
    tam = tam || 96;
    var rubor = animo === 'feliz' || animo === 'celebrando' ? .8 : animo === 'normal' || animo === 'dormido' ? .5 : 0;
    return '<svg class="mc-buho b-' + animo + '" width="' + tam + '" height="' + tam + '" viewBox="0 0 200 210" role="img" aria-label="Búho ' + animo + '">' +
      '<ellipse cx="100" cy="203" rx="48" ry="6" fill="#000" opacity=".3"/>' +
      '<g class="b-cuerpo">' +
      '<path d="M80 192 q-6 8 -2 10 q4 -3 6 -1 q2 -3 6 0 q3 -3 -1 -9 Z M120 192 q6 8 2 10 q-4 -3 -6 -1 q-2 -3 -6 0 q-3 -3 1 -9 Z" fill="' + C.lima + '"/>' +
      alas(animo) +
      // cuerpo blanco redondo (el círculo blanco del logo, con barriga)
      '<path d="M100 40 C58 40 30 68 30 106 C30 136 40 172 64 188 C78 198 122 198 136 188 C160 172 170 136 170 106 C170 68 142 40 100 40 Z" fill="' + C.blanco + '"/>' +
      // antifaz negro con las puntas de plumas del logo
      '<path d="M100 62 C74 62 44 72 42 104 C41 124 50 136 62 144 L56 164 L76 154 L88 176 L100 162 L112 176 L124 154 L144 164 L138 144 C150 136 159 124 158 104 C156 72 126 62 100 62 Z" fill="' + C.negro + '"/>' +
      // plumitas de la barriga
      '<path d="M78 178 q4 5 8 0 M96 184 q4 5 8 0 M114 178 q4 5 8 0" fill="none" stroke="' + C.gris + '" stroke-width="3" stroke-linecap="round"/>' +
      '<g class="b-ojos">' + ojo(70, 104, animo, -1) + ojo(130, 104, animo, 1) + '</g>' +
      (rubor ? '<ellipse cx="54" cy="130" rx="9" ry="5.5" fill="' + C.rubor + '" opacity="' + rubor + '"/><ellipse cx="146" cy="130" rx="9" ry="5.5" fill="' + C.rubor + '" opacity="' + rubor + '"/>' : '') +
      pico(animo) + ceja(animo) + extras(animo) +
      '</g></svg>';
  }

  var css = '.mc-buho{display:block;overflow:visible}' +
    '.mc-buho .b-cuerpo{transform-origin:50% 100%;transform-box:fill-box}' +
    '.mc-buho .b-ojos{transform-origin:50% 50%;transform-box:fill-box}' +
    '.b-normal .b-ojos{animation:bParpadeo 4.5s infinite}' +
    '@keyframes bParpadeo{0%,93%,100%{transform:scaleY(1)}96%{transform:scaleY(.08)}}' +
    '.b-normal .b-cuerpo{animation:bRespira 3.2s ease-in-out infinite}' +
    '.b-feliz .b-cuerpo{animation:bLado 2.2s ease-in-out infinite}' +
    '@keyframes bLado{0%,100%{transform:rotate(0)}25%{transform:rotate(5deg)}75%{transform:rotate(-5deg)}}' +
    '.b-celebrando .b-cuerpo{animation:bSalto .8s ease-in-out infinite}' +
    '@keyframes bSalto{0%,100%{transform:translateY(0) scale(1,1)}15%{transform:translateY(0) scale(1.05,.94)}45%{transform:translateY(-14px) scale(.97,1.04)}}' +
    '.b-celebrando .b-ala-i{transform-origin:52px 104px;animation:bAleteo .4s ease-in-out infinite alternate}' +
    '.b-celebrando .b-ala-d{transform-origin:148px 104px;animation:bAleteoD .4s ease-in-out infinite alternate}' +
    '@keyframes bAleteo{to{transform:rotate(-14deg)}}@keyframes bAleteoD{to{transform:rotate(14deg)}}' +
    '.b-celebrando .b-confeti{animation:bConfeti 1.6s ease-in-out infinite}' +
    '@keyframes bConfeti{0%,100%{opacity:1;transform:translateY(0)}50%{opacity:.5;transform:translateY(4px)}}' +
    '.b-preocupado .b-pupila{animation:bMira 3s ease-in-out infinite}' +
    '@keyframes bMira{0%,100%{transform:translateX(0)}50%{transform:translateX(10px)}}' +
    '.b-preocupado .b-cuerpo{animation:bTiembla 2.4s ease-in-out infinite}' +
    '@keyframes bTiembla{0%,80%,100%{transform:translateX(0)}84%{transform:translateX(-2px)}88%{transform:translateX(2px)}92%{transform:translateX(-2px)}}' +
    '.b-preocupado .b-gota,.b-triste .b-lagrima{animation:bCae 2.2s ease-in infinite}' +
    '@keyframes bCae{0%{transform:translateY(-4px);opacity:0}25%{opacity:1}100%{transform:translateY(22px);opacity:0}}' +
    '.b-triste .b-cuerpo{animation:bRespira 4.5s ease-in-out infinite}' +
    '.b-dormido .b-cuerpo{animation:bRespira 3.6s ease-in-out infinite}' +
    '@keyframes bRespira{0%,100%{transform:scale(1)}50%{transform:scale(1.025,.98)}}' +
    '.b-dormido .b-zzz{animation:bZzz 3s ease-in-out infinite}' +
    '@keyframes bZzz{0%{opacity:0;transform:translateY(6px)}40%{opacity:1}100%{opacity:0;transform:translateY(-10px)}}' +
    '@media (prefers-reduced-motion:reduce){.mc-buho *{animation:none!important}}';
  function estilos() {
    if (document.getElementById('mc-buho-css')) return;
    var st = document.createElement('style'); st.id = 'mc-buho-css'; st.textContent = css;
    document.head.appendChild(st);
  }

  function al(lista, semilla) { return lista[semilla % lista.length]; }
  // Elige el ánimo. r = racha (mi_racha); extra = { ganoDuelo: 'apodo del rival' }
  function animo(r, extra) {
    extra = extra || {};
    var h = new Date().getHours(), dia = new Date().getDate();
    var n = (r && r.actual) || 0, meta = (r && r.meta) || 10, hoy = (r && r.hoy) || 0, falta = Math.max(0, meta - hoy);
    if (extra.ganoDuelo) return { animo: 'celebrando', titulo: '¡Le ganaste a ' + extra.ganoDuelo + '!', texto: 'Ganaste un duelo. ¿Otro?', link: 'duelo.html', boton: 'Retar a alguien' };
    if (r && r.cumplido_hoy) {
      if (h >= 23 || h < 5) return { animo: 'dormido', titulo: 'Misión cumplida', texto: 'Ya estudiaste hoy. A descansar, mañana seguimos.' };
      if (n > 0 && n % 7 === 0) return { animo: 'celebrando', titulo: '¡' + n + ' días seguidos!', texto: 'Llevas ' + (n / 7 === 1 ? 'una semana' : n / 7 + ' semanas') + ' sin fallar. Eres imparable.' };
      return { animo: 'feliz', titulo: al(['¡Así se hace!', '¡Bien ahí!', '¡Cumpliste hoy!'], dia), texto: n === 1 ? 'Empezaste tu racha. Vuelve mañana para que crezca.' : 'Tu racha va en ' + n + ' días. Vuelve mañana.' };
    }
    if (!r) return { animo: 'normal', titulo: '¡Vamos a estudiar!', texto: 'Responde ' + meta + ' preguntas hoy y empieza tu racha.' };
    if (n > 0 && h >= 18) return { animo: 'preocupado', titulo: '¡Tu racha está en peligro!', texto: 'Te faltan ' + falta + ' pregunta' + (falta === 1 ? '' : 's') + ' para no perder tus ' + n + ' día' + (n === 1 ? '' : 's') + '.' };
    if (n === 0 && (r.mejor || 0) > 0 && hoy === 0) {
      var dias = r.ultima ? Math.floor((Date.now() - new Date(r.ultima + 'T12:00:00')) / 864e5) : 0;
      if (dias > 3) return { animo: 'triste', titulo: '¡Te extrañé!', texto: 'Hace ' + dias + ' días que no estudias. Vuelve con ' + meta + ' preguntas hoy.' };
      return { animo: 'triste', titulo: 'Perdiste tu racha…', texto: 'No pasa nada. Responde ' + meta + ' preguntas hoy y empieza otra.' };
    }
    if (hoy > 0) return { animo: 'normal', titulo: '¡Ya casi!', texto: 'Te faltan ' + falta + ' pregunta' + (falta === 1 ? '' : 's') + ' para cumplir hoy.' };
    return { animo: 'normal', titulo: n > 0 ? 'Hoy toca seguir' : '¡Vamos a estudiar!', texto: n > 0 ? 'Llevas ' + n + ' día' + (n === 1 ? '' : 's') + ' de racha. Responde ' + meta + ' preguntas hoy.' : 'Responde ' + meta + ' preguntas hoy y empieza tu racha.' };
  }

  window.MCBuho = { svg: function (a, t) { estilos(); return svg(a, t); }, animo: animo, estilos: estilos };

  /* ---------- En el inicio: el búho junto al saludo ---------- */
  if (!window.MCAuth) return;
  var racha = null, extra = {}, caja = null, actual = '';
  function esc(x) { return String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function pintar() {
    var m = animo(racha, extra);
    var clave = JSON.stringify(m);
    if (clave === actual) return;
    var nuevoAnimo = !actual || JSON.parse(actual).animo !== m.animo;
    actual = clave;
    if (nuevoAnimo) caja.querySelector('.buho-dibujo').innerHTML = MCBuho.svg(m.animo, 92);
    caja.querySelector('.buho-globo').innerHTML = '<b>' + esc(m.titulo) + '</b><span>' + esc(m.texto) + '</span>' +
      (m.link ? '<a href="' + esc(m.link) + '">' + esc(m.boton) + ' ›</a>' : '');
    caja.dataset.animo = m.animo;
  }
  function iniciar() {
    var texto = document.querySelector('.saludo .sal-texto');
    if (!texto || !MCAuth.usuario() || document.getElementById('mcBuho')) return;
    var st = document.createElement('style');
    st.textContent =
      '.buho-fila{display:flex;align-items:center;gap:12px;margin-top:14px}' +
      '.buho-dibujo{flex-shrink:0;width:92px;height:92px}' +
      '.buho-globo{position:relative;min-width:0;background:var(--surface-2,#141414);border:1px solid var(--border,#232323);border-radius:16px;padding:10px 14px;font-size:13.5px;line-height:1.45;color:var(--text-dim,#9a9a9a)}' +
      '.buho-globo::before{content:"";position:absolute;left:-7px;top:50%;width:12px;height:12px;background:inherit;border-left:1px solid var(--border,#232323);border-bottom:1px solid var(--border,#232323);transform:translateY(-50%) rotate(45deg)}' +
      '.buho-globo b{display:block;font:800 14.5px Sora,Inter,sans-serif;color:var(--text,#f2f2f2);margin-bottom:2px}' +
      '.buho-globo a{display:inline-block;margin-top:4px;color:var(--accent,#C6E000);font-weight:700;text-decoration:none}' +
      '[data-animo=preocupado] .buho-globo{border-color:rgba(251,191,36,.45)}[data-animo=preocupado] .buho-globo::before{border-color:rgba(251,191,36,.45)}' +
      '[data-animo=preocupado] .buho-globo b{color:#fbbf24}' +
      '[data-animo=celebrando] .buho-globo b,[data-animo=feliz] .buho-globo b{color:var(--accent,#C6E000)}' +
      '@media (max-width:520px){.buho-dibujo{width:74px;height:74px}.buho-dibujo svg{width:74px;height:74px}.buho-globo{font-size:13px}}';
    document.head.appendChild(st);
    caja = document.createElement('div');
    caja.className = 'buho-fila'; caja.id = 'mcBuho';
    caja.innerHTML = '<div class="buho-dibujo"></div><div class="buho-globo" role="status"></div>';
    var h1 = texto.querySelector('h1');
    texto.insertBefore(caja, h1 ? h1.nextSibling : texto.firstChild);
    pintar();
    (function esperarRacha(i) {
      if (window.MCRacha) MCRacha.alCambiar(function (r) { racha = r; pintar(); });
      else if (i < 100) setTimeout(function () { esperarRacha(i + 1); }, 150);
    })(0);
    // ¿Ganó un duelo en las últimas 24 horas?
    MCAuth.listo.then(function (c) { return c.rpc('mis_duelos'); }).then(function (r) {
      var g = (r && r.data || []).filter(function (d) { return d.estado === 'ganaste' && Date.now() - new Date(d.creado) < 864e5; })[0];
      if (g) { extra.ganoDuelo = g.rival || 'tu rival'; pintar(); }
    }).catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
