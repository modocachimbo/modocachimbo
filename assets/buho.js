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
  // Colores del búho (los del sitio: lima, con pancita crema y pico ámbar)
  var C = {
    cuerpo: '#C6E000', sombra: '#93A800', ala: '#A9C000', panza: '#F6FFD0', pluma: '#B5CC2A',
    ojo: '#FFFFFF', pupila: '#1B1B1B', pico: '#FFB020', picoOsc: '#E08A00', lengua: '#FF6B81',
    rubor: '#FF8FB1', birrete: '#262626', borla: '#C6E000', lagrima: '#7DD3FC'
  };
  var ANIMOS = { normal: 1, feliz: 1, preocupado: 1, triste: 1, celebrando: 1, dormido: 1 };

  function ojo(cx, cy, animo, lado) {
    var t = '';
    if (animo === 'feliz' || animo === 'celebrando') // ojitos cerrados de alegría ∩
      return '<path d="M' + (cx - 15) + ' ' + (cy + 5) + ' Q' + cx + ' ' + (cy - 15) + ' ' + (cx + 15) + ' ' + (cy + 5) + '" fill="none" stroke="' + C.pupila + '" stroke-width="7" stroke-linecap="round"/>';
    if (animo === 'dormido') // ojitos cerrados ‿ con pestañas
      return '<path d="M' + (cx - 15) + ' ' + cy + ' Q' + cx + ' ' + (cy + 12) + ' ' + (cx + 15) + ' ' + cy + '" fill="none" stroke="' + C.pupila + '" stroke-width="6" stroke-linecap="round"/>';
    var dx = 0, dy = 0, r = 15;
    if (animo === 'preocupado') { dx = lado * 0 - 6; dy = -2; r = 12; }
    if (animo === 'triste') { dy = 6; r = 14; }
    t += '<circle cx="' + cx + '" cy="' + cy + '" r="25" fill="' + C.ojo + '"/>';
    t += '<g class="b-pupila"><circle cx="' + (cx + dx) + '" cy="' + (cy + dy) + '" r="' + r + '" fill="' + C.pupila + '"/>' +
      '<circle cx="' + (cx + dx + 5) + '" cy="' + (cy + dy - 6) + '" r="5.5" fill="#fff"/>' +
      '<circle cx="' + (cx + dx - 5) + '" cy="' + (cy + dy + 5) + '" r="2.4" fill="#fff"/></g>';
    if (animo === 'triste') // párpado caído (del color del cuerpo)
      t += '<path d="M' + (cx - 27) + ' ' + (cy - 26) + ' L' + (cx + 27) + ' ' + (cy - 26) + ' L' + (cx + 27) + ' ' + (cy - 6 + lado * 6) + ' Q' + cx + ' ' + (cy - 4) + ' ' + (cx - 27) + ' ' + (cy - 6 - lado * 6) + ' Z" fill="' + C.cuerpo + '"/>';
    return t;
  }
  function cejas(animo) {
    var p = '';
    if (animo === 'preocupado') p = 'M56 70 Q66 62 80 66 M144 70 Q134 62 120 66';
    else if (animo === 'triste') p = 'M54 72 Q66 70 80 62 M146 72 Q134 70 120 62';
    else return '';
    return '<path d="' + p + '" fill="none" stroke="' + C.pupila + '" stroke-width="5" stroke-linecap="round"/>';
  }
  function pico(animo) {
    if (animo === 'celebrando') // pico abierto, riendo
      return '<path d="M88 116 Q100 110 112 116 L100 126 Z" fill="' + C.pico + '"/>' +
        '<path d="M90 128 Q100 146 110 128 Q100 132 90 128 Z" fill="' + C.picoOsc + '"/><path d="M95 133 Q100 141 105 133 Z" fill="' + C.lengua + '"/>';
    if (animo === 'triste' || animo === 'preocupado')
      return '<path d="M91 118 Q100 113 109 118 L100 131 Z" fill="' + C.pico + '"/>';
    return '<path d="M89 116 Q100 110 111 116 L100 133 Z" fill="' + C.pico + '"/><path d="M95 122 L100 133 L105 122 Z" fill="' + C.picoOsc + '" opacity=".35"/>';
  }
  function alas(animo) {
    // izquierda; la derecha es su espejo
    var d = { normal: 'M42 120 Q20 146 34 182 Q46 172 52 150 Z', celebrando: 'M44 116 Q10 98 6 66 Q30 76 52 104 Z',
      triste: 'M44 124 Q30 158 44 192 Q52 178 54 154 Z', preocupado: 'M44 118 Q24 130 40 158 Q50 150 54 138 Z' }[animo] || 'M42 120 Q20 146 34 182 Q46 172 52 150 Z';
    var esp = d.replace(/(\d+(?:\.\d+)?) (\d+(?:\.\d+)?)/g, function (t, x, y) { return (200 - x) + ' ' + y; });
    return '<path class="b-ala-i" d="' + d + '" fill="' + C.ala + '"/><path class="b-ala-d" d="' + esp + '" fill="' + C.ala + '"/>';
  }
  function extras(animo) {
    if (animo === 'triste') return '<path class="b-lagrima" d="M128 116 Q121 128 128 135 Q135 128 128 116 Z" fill="' + C.lagrima + '"/>';
    if (animo === 'preocupado') return '<path class="b-gota" d="M30 64 Q22 77 30 85 Q38 77 30 64 Z" fill="' + C.lagrima + '"/>';
    if (animo === 'dormido') return '<g class="b-zzz" fill="' + C.cuerpo + '" font-family="Sora,Inter,Arial,sans-serif" font-weight="800">' +
      '<text x="158" y="70" font-size="24">z</text><text x="176" y="50" font-size="18">z</text><text x="190" y="34" font-size="13">z</text></g>';
    if (animo === 'celebrando') return '<g class="b-confeti">' +
      '<rect x="20" y="30" width="9" height="9" rx="2" fill="#F9A8D4" transform="rotate(20 24 34)"/>' +
      '<rect x="170" y="96" width="9" height="9" rx="2" fill="#7DD3FC" transform="rotate(-25 174 100)"/>' +
      '<circle cx="182" cy="30" r="5" fill="#FBBF24"/><circle cx="14" cy="104" r="4.5" fill="#7DD3FC"/>' +
      '<path d="M160 16 l4 9 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1 Z" fill="#FBBF24"/></g>';
    return '';
  }
  function birrete(animo) { // gorro de graduación: ¡es el búho cachimbo!
    var rot = animo === 'triste' ? -8 : animo === 'dormido' ? 14 : animo === 'celebrando' ? -6 : 0;
    return '<g class="b-birrete" transform="rotate(' + rot + ' 100 40)">' +
      '<path d="M72 40 L128 40 L126 56 Q100 64 74 56 Z" fill="' + C.birrete + '"/>' +
      '<path d="M100 20 L154 36 L100 52 L46 36 Z" fill="' + C.birrete + '"/>' +
      '<path d="M100 20 L154 36 L100 30 L46 36 Z" fill="#3d3d3d"/>' +
      '<g class="b-borla"><path d="M100 36 Q130 38 140 44 L140 62" fill="none" stroke="' + C.borla + '" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M135 60 L145 60 L147 72 L133 72 Z" fill="' + C.borla + '"/></g>' +
      '<circle cx="100" cy="36" r="3.5" fill="' + C.borla + '"/></g>';
  }
  function svg(animo, tam) {
    animo = ANIMOS[animo] ? animo : 'normal';
    tam = tam || 96;
    var rubor = animo === 'feliz' || animo === 'celebrando' ? .75 : animo === 'normal' ? .45 : animo === 'dormido' ? .4 : 0;
    return '<svg class="mc-buho b-' + animo + '" width="' + tam + '" height="' + tam + '" viewBox="0 0 200 210" role="img" aria-label="Búho ' + animo + '">' +
      '<ellipse cx="100" cy="203" rx="50" ry="6" fill="#000" opacity=".28"/>' +
      '<g class="b-cuerpo">' +
      // patitas
      '<path d="M78 192 q-6 8 -2 10 q4 -3 6 -1 q2 -3 6 0 q3 -3 -1 -9 Z M122 192 q6 8 2 10 q-4 -3 -6 -1 q-2 -3 -6 0 q-3 -3 1 -9 Z" fill="' + C.pico + '"/>' +
      alas(animo) +
      // cuerpo redondo con orejitas
      '<path d="M100 44 C60 44 38 66 34 96 C30 128 38 170 62 188 C76 198 124 198 138 188 C162 170 170 128 166 96 C162 66 140 44 100 44 Z" fill="' + C.cuerpo + '"/>' +
      '<path d="M40 82 L36 48 L66 60 Z M160 82 L164 48 L134 60 Z" fill="' + C.cuerpo + '"/>' +
      '<path d="M44 74 L41 56 L58 63 Z M156 74 L159 56 L142 63 Z" fill="' + C.sombra + '" opacity=".6"/>' +
      // pancita con plumitas
      '<ellipse cx="100" cy="158" rx="40" ry="34" fill="' + C.panza + '"/>' +
      '<path d="M84 146 q4 5 8 0 M108 146 q4 5 8 0 M96 160 q4 5 8 0 M84 172 q4 5 8 0 M108 172 q4 5 8 0" fill="none" stroke="' + C.pluma + '" stroke-width="3" stroke-linecap="round"/>' +
      // antifaz claro alrededor de los ojos
      '<path d="M100 82 C88 68 50 68 46 96 C44 118 64 128 80 124 C90 122 96 116 100 112 C104 116 110 122 120 124 C136 128 156 118 154 96 C150 68 112 68 100 82 Z" fill="' + C.panza + '" opacity=".55"/>' +
      '<g class="b-ojos">' + ojo(74, 98, animo, -1) + ojo(126, 98, animo, 1) + '</g>' +
      cejas(animo) +
      (rubor ? '<ellipse cx="52" cy="124" rx="10" ry="6" fill="' + C.rubor + '" opacity="' + rubor + '"/><ellipse cx="148" cy="124" rx="10" ry="6" fill="' + C.rubor + '" opacity="' + rubor + '"/>' : '') +
      pico(animo) + birrete(animo) + extras(animo) +
      '</g></svg>';
  }

  var css = '.mc-buho{display:block;overflow:visible}' +
    '.mc-buho .b-cuerpo{transform-origin:50% 100%;transform-box:fill-box}' +
    '.mc-buho .b-ojos{transform-origin:50% 50%;transform-box:fill-box}' +
    '.b-normal .b-ojos{animation:bParpadeo 4.5s infinite}' +
    '@keyframes bParpadeo{0%,93%,100%{transform:scaleY(1)}96%{transform:scaleY(.08)}}' +
    '.b-normal .b-cuerpo{animation:bRespira 3.2s ease-in-out infinite}' +
    '.mc-buho .b-borla{transform-origin:100px 36px;animation:bBorla 2.6s ease-in-out infinite}' +
    '@keyframes bBorla{0%,100%{transform:rotate(0)}50%{transform:rotate(8deg)}}' +
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
