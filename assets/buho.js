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
  var LIMA = '#C6E000', NEGRO = '#050505', BLANCO = '#f4f4f4';

  // Mechones (las "cejas" del logo). Cada ánimo los inclina distinto.
  var CEJAS = {
    normal:     'M98 100 L89 104 L50 78 L20 40 L58 60 Z',
    dormido:    'M97 96 L88 100 L50 74 L22 40 L58 56 Z',
    feliz:      'M96 86 L87 92 L50 70 L20 32 L58 50 Z',
    celebrando: 'M96 82 L87 88 L50 66 L20 28 L58 46 Z',
    preocupado: 'M95 76 L88 84 L50 78 L18 54 L56 62 Z',
    triste:     'M94 74 L88 82 L50 82 L20 66 L56 66 Z'
  };
  function espejo(d) {
    return d.replace(/(\d+(?:\.\d+)?) (\d+(?:\.\d+)?)/g, function (t, x, y) { return (200 - x) + ' ' + y; });
  }
  function ojos(animo) {
    var L = 68, R = 132, Y = 114;
    function anillo(cx, dx, dy, r) {
      return '<circle cx="' + cx + '" cy="' + Y + '" r="23" fill="' + LIMA + '"/>' +
        '<circle cx="' + (cx + dx) + '" cy="' + (Y + dy) + '" r="' + (r || 12) + '" fill="' + NEGRO + '"/>' +
        '<circle cx="' + (cx + dx + 4) + '" cy="' + (Y + dy - 4) + '" r="3.6" fill="#fff"/>';
    }
    function arco(cx, arriba) { // ojo cerrado: ^ (feliz) o ‿ (dormido)
      return '<path d="M' + (cx - 18) + ' ' + (Y + (arriba ? 8 : -2)) + ' Q' + cx + ' ' + (Y + (arriba ? -18 : 16)) + ' ' + (cx + 18) + ' ' + (Y + (arriba ? 8 : -2)) +
        '" fill="none" stroke="' + LIMA + '" stroke-width="10" stroke-linecap="round"/>';
    }
    if (animo === 'feliz' || animo === 'celebrando') return arco(L, true) + arco(R, true);
    if (animo === 'dormido') return arco(L, false) + arco(R, false);
    if (animo === 'preocupado') return '<g class="b-mira">' + anillo(L, 5, -1, 10) + anillo(R, 5, -1, 10) + '</g>';
    if (animo === 'triste') return anillo(L, 0, 5, 11) + anillo(R, 0, 5, 11) +
      // párpado caído
      '<path d="M44 106 Q68 96 92 106 L92 90 L44 90 Z" fill="' + NEGRO + '"/><path d="M108 106 Q132 96 156 106 L156 90 L108 90 Z" fill="' + NEGRO + '"/>';
    return '<g class="b-parpadeo">' + anillo(L, 0, 0) + anillo(R, 0, 0) + '</g>';
  }
  function pico(animo) {
    if (animo === 'celebrando') return '<path d="M89 122 L111 122 L100 136 Z" fill="' + LIMA + '"/><path d="M94 140 L106 140 L100 150 Z" fill="' + LIMA + '"/>';
    if (animo === 'triste') return '<path d="M92 126 L108 126 L100 144 Z" fill="' + LIMA + '"/>';
    return '<path d="M90 122 L110 122 L100 148 Z" fill="' + LIMA + '"/>';
  }
  function extras(animo) {
    if (animo === 'triste') return '<path class="b-lagrima" d="M148 136 Q141 147 148 154 Q155 147 148 136 Z" fill="#7dd3fc"/>';
    if (animo === 'preocupado') return '<path class="b-gota" d="M170 70 Q162 82 170 90 Q178 82 170 70 Z" fill="#7dd3fc"/>';
    if (animo === 'dormido') return '<g class="b-zzz" fill="' + LIMA + '" font-family="Sora,Inter,Arial,sans-serif" font-weight="800">' +
      '<text x="170" y="66" font-size="22">z</text><text x="186" y="46" font-size="16">z</text><text x="198" y="30" font-size="12">z</text></g>';
    if (animo === 'celebrando') return '<g class="b-confeti">' +
      '<rect x="14" y="78" width="8" height="8" rx="2" fill="#f9a8d4" transform="rotate(20 18 82)"/>' +
      '<rect x="176" y="84" width="8" height="8" rx="2" fill="#7dd3fc" transform="rotate(-25 180 88)"/>' +
      '<circle cx="30" cy="150" r="4" fill="#fbbf24"/><circle cx="172" cy="150" r="4" fill="#f9a8d4"/>' +
      '<rect x="96" y="2" width="8" height="8" rx="2" fill="#fbbf24" transform="rotate(35 100 6)"/></g>';
    if (animo === 'feliz') return '<ellipse cx="52" cy="140" rx="9" ry="5" fill="' + LIMA + '" opacity=".35"/><ellipse cx="148" cy="140" rx="9" ry="5" fill="' + LIMA + '" opacity=".35"/>';
    return '';
  }
  function svg(animo, tam) {
    animo = CEJAS[animo] ? animo : 'normal';
    tam = tam || 96;
    var ceja = CEJAS[animo];
    return '<svg class="mc-buho b-' + animo + '" width="' + tam + '" height="' + tam + '" viewBox="0 0 200 200" role="img" aria-label="Búho ' + animo + '">' +
      '<g class="b-cuerpo">' +
      '<circle cx="100" cy="112" r="80" fill="' + BLANCO + '"/>' +
      // máscara negra con las "plumas" del logo hacia abajo
      '<path d="M100 64 C72 64 40 74 38 108 C36 128 46 140 58 150 L50 174 L72 160 L86 188 L100 172 L114 188 L128 160 L150 174 L142 150 C154 140 164 128 162 108 C160 74 128 64 100 64 Z" fill="' + NEGRO + '"/>' +
      ojos(animo) +
      '<path d="' + ceja + '" fill="' + LIMA + '"/><path d="' + espejo(ceja) + '" fill="' + LIMA + '"/>' +
      pico(animo) + extras(animo) +
      '</g></svg>';
  }

  var css = '.mc-buho{display:block;overflow:visible}' +
    '.mc-buho .b-cuerpo{transform-origin:50% 100%;transform-box:fill-box}' +
    '.mc-buho .b-parpadeo{transform-origin:50% 56%;animation:bParpadeo 4.5s infinite}' +
    '@keyframes bParpadeo{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}' +
    '.b-feliz .b-cuerpo{animation:bLado 2.4s ease-in-out infinite}' +
    '@keyframes bLado{0%,100%{transform:rotate(0)}25%{transform:rotate(4deg)}75%{transform:rotate(-4deg)}}' +
    '.b-celebrando .b-cuerpo{animation:bSalto .9s ease-in-out infinite}' +
    '@keyframes bSalto{0%,100%{transform:translateY(0)}40%{transform:translateY(-10px) scale(1.03)}}' +
    '.b-celebrando .b-confeti{animation:bConfeti 1.8s ease-in-out infinite}' +
    '@keyframes bConfeti{0%,100%{opacity:1}50%{opacity:.4}}' +
    '.b-preocupado .b-mira{animation:bMira 3s ease-in-out infinite}' +
    '@keyframes bMira{0%,100%{transform:translateX(0)}50%{transform:translateX(-8px)}}' +
    '.b-preocupado .b-gota,.b-triste .b-lagrima{animation:bCae 2.2s ease-in infinite}' +
    '@keyframes bCae{0%{transform:translateY(-6px);opacity:0}25%{opacity:1}100%{transform:translateY(16px);opacity:0}}' +
    '.b-dormido .b-cuerpo{animation:bRespira 3.6s ease-in-out infinite}' +
    '@keyframes bRespira{0%,100%{transform:scale(1)}50%{transform:scale(1.03,.98)}}' +
    '.b-dormido .b-zzz{animation:bZzz 3s ease-in-out infinite}' +
    '@keyframes bZzz{0%{opacity:0;transform:translateY(6px)}40%{opacity:1}100%{opacity:0;transform:translateY(-8px)}}' +
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
    if (nuevoAnimo) caja.querySelector('.buho-dibujo').innerHTML = MCBuho.svg(m.animo, 76);
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
      '.buho-dibujo{flex-shrink:0;width:76px;height:76px}' +
      '.buho-globo{position:relative;min-width:0;background:var(--surface-2,#141414);border:1px solid var(--border,#232323);border-radius:16px;padding:10px 14px;font-size:13.5px;line-height:1.45;color:var(--text-dim,#9a9a9a)}' +
      '.buho-globo::before{content:"";position:absolute;left:-7px;top:50%;width:12px;height:12px;background:inherit;border-left:1px solid var(--border,#232323);border-bottom:1px solid var(--border,#232323);transform:translateY(-50%) rotate(45deg)}' +
      '.buho-globo b{display:block;font:800 14.5px Sora,Inter,sans-serif;color:var(--text,#f2f2f2);margin-bottom:2px}' +
      '.buho-globo a{display:inline-block;margin-top:4px;color:var(--accent,#C6E000);font-weight:700;text-decoration:none}' +
      '[data-animo=preocupado] .buho-globo{border-color:rgba(251,191,36,.45)}[data-animo=preocupado] .buho-globo::before{border-color:rgba(251,191,36,.45)}' +
      '[data-animo=preocupado] .buho-globo b{color:#fbbf24}' +
      '[data-animo=celebrando] .buho-globo b,[data-animo=feliz] .buho-globo b{color:var(--accent,#C6E000)}' +
      '@media (max-width:520px){.buho-dibujo{width:62px;height:62px}.buho-dibujo svg{width:62px;height:62px}.buho-globo{font-size:13px}}';
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
