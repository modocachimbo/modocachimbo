/* =========================================================
   Modo Cachimbo · Sonidos (hechos con código, sin archivos de audio)
   MCSonido.bien() · mal() · empezar() · fin(pct) · perder() · toque()
   Se silencia con cualquier botón [data-mc-son]; la elección se guarda
   en el navegador (mc_sonido) y vale para toda la web, Flashcards incluidas.
   ========================================================= */
(function () {
  var ctx = null, salida = null, activo = true;
  try { activo = localStorage.getItem('mc_sonido') !== '0'; } catch (e) {}

  function audio() {
    if (!activo) return null;
    try {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
        // iPhone: que suene aunque el botón de silencio esté puesto
        try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
        ctx = new AC();
        salida = ctx.destination;
      }
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) { return null; }
    return ctx;
  }
  // El navegador solo deja sonar después de un toque: se "despierta" el audio en el primero
  ['pointerdown', 'touchend', 'keydown'].forEach(function (ev) {
    document.addEventListener(ev, function abrir() {
      var a = audio(); if (!a) return;
      try { var s = a.createBufferSource(); s.buffer = a.createBuffer(1, 1, 22050); s.connect(a.destination); s.start(0); } catch (e) {}
      if (a.state === 'running') ['pointerdown', 'touchend', 'keydown'].forEach(function (x) { document.removeEventListener(x, abrir, true); });
    }, true);
  });
  // Una nota: frecuencia, cuándo empieza (s), cuánto dura, forma de onda, volumen y a qué frecuencia se desliza
  function nota(f, t, dur, tipo, vol, hasta) {
    var a = audio(); if (!a) return;
    var o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + (t || 0);
    o.type = tipo || 'sine'; o.frequency.setValueAtTime(f, t0);
    if (hasta) o.frequency.exponentialRampToValueAtTime(hasta, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(salida); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  // Un "fsss" corto de ruido filtrado
  function soplo(dur, vol, desde, hasta) {
    var a = audio(); if (!a) return;
    var n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    var src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(), t0 = a.currentTime;
    src.buffer = b; fl.type = 'bandpass'; fl.Q.value = 1.2;
    fl.frequency.setValueAtTime(desde, t0); fl.frequency.exponentialRampToValueAtTime(hasta, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(fl); fl.connect(g); g.connect(salida); src.start(t0); src.stop(t0 + dur);
  }
  // El "hu" del búho: entra suave y tiembla un poquito, como una voz
  function hoot(f, t, dur, vol, hasta) {
    var a = audio(); if (!a) return;
    var t0 = a.currentTime + t, o = a.createOscillator(), g = a.createGain(), lf = a.createOscillator(), lg = a.createGain(), fl = a.createBiquadFilter();
    o.type = 'sine'; o.frequency.setValueAtTime(f, t0); o.frequency.linearRampToValueAtTime(hasta || f, t0 + dur);
    lf.frequency.value = 5.5; lg.gain.value = f * 0.012; lf.connect(lg); lg.connect(o.frequency);
    fl.type = 'lowpass'; fl.frequency.value = 1400;
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + Math.min(0.06, dur * 0.3));
    g.gain.setValueAtTime(vol, t0 + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(fl); fl.connect(g); g.connect(salida); o.start(t0); lf.start(t0); o.stop(t0 + dur + 0.05); lf.stop(t0 + dur + 0.05);
  }
  // El aire que acompaña al "hu"
  function aire(t, dur, vol, f) {
    var a = audio(); if (!a) return;
    var n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    var src = a.createBufferSource(), bp = a.createBiquadFilter(), g = a.createGain(), t0 = a.currentTime + t;
    src.buffer = b; bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 1.5;
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(bp); bp.connect(g); g.connect(salida); src.start(t0);
  }
  var DO = 523.25, MI = 659.25, SOL = 783.99, DO2 = 1046.5, MI2 = 1318.5, SOL2 = 1568, DO3 = 2093;
  // La burbuja: una nota redonda que sube
  function blup(vol, dur, desde, hasta, t) { nota(desde || 320, t || 0, dur || 0.09, 'sine', vol || 0.26, hasta || 1100); }

  var S = {
    get activo() { return activo; },
    cambiar: function () {
      activo = !activo;
      try { localStorage.setItem('mc_sonido', activo ? '1' : '0'); } catch (e) {}
      pintar();
      if (activo) S.toque();
      return activo;
    },
    toque: function () { nota(320, 0, 0.09, 'sine', 0.26, 1100); },
    // Acierto: dos notas alegres que suben
    bien: function () { [DO2, MI2, SOL2].forEach(function (f, i) { nota(f, i * 0.07, 0.14 + i * 0.06, 'triangle', 0.18); }); },
    // Fallo: dos notas suaves que bajan, sin sonar a castigo
    mal: function () { nota(700, 0, 0.1, 'sine', 0.2, 450); nota(450, 0.1, 0.16, 'sine', 0.18, 250); },
    empezar: function () { soplo(0.25, 0.14, 600, 2600); [DO, MI, SOL].forEach(function (f, i) { nota(f * 2, 0.05 + i * 0.06, 0.12, 'triangle', 0.16); }); },
    // Al navegar (data-mc-nav): entrar a un área, a un curso, a Libro/Repaso/Fijas, a un tema y a Practicar/Flashcards
    area: function () { blup(0.28, 0.12, 280, 1000); },
    curso: function () { blup(); nota(1760, 0.06, 0.12, 'sine', 0.05); },
    seccion: function () { blup(0.17, 0.07, 340, 1000); },
    tema: function () { blup(0.22, 0.06, 380, 1200); },
    practicar: function () { blup(0.24, 0.08); [DO, MI, SOL].forEach(function (f, i) { nota(f * 2, 0.09 + i * 0.06, 0.12, 'sine', 0.16); }); },
    // Retroceder o ir al inicio: la burbuja al revés, bajando
    volver: function () { nota(1000, 0, 0.09, 'sine', 0.2, 340); },
    // Código: aceptado (campanitas que suben) o rechazado (dos notas graves cortas)
    abrir: function () { nota(880, 0, 0.08, 'triangle', 0.18); [DO2, MI2, SOL2].forEach(function (f, i) { nota(f, 0.1 + i * 0.07, 0.22, 'sine', 0.16); }); },
    error: function () { nota(220, 0, 0.12, 'square', 0.06); nota(185, 0.13, 0.18, 'square', 0.06); },
    // El búho del inicio: un "hu-hu" según su ánimo
    buho: function (animo) {
      var A = { // [frecuencia, empieza, dura, volumen, hasta] por "hu"; el aire acompaña cada uno
        feliz: [[440, 0, .18, .32, 460], [500, .26, .5, .32, 560]],
        celebrando: [[440, 0, .14, .3, 450], [494, .2, .14, .3, 505], [587, .4, .6, .32, 640]],
        preocupado: [[392, 0, .22, .3, 380], [400, .36, .55, .3, 500]],
        triste: [[380, 0, .9, .26, 290]],
        dormido: [[300, .05, .6, .07, 285]]
      }[animo] || [[392, 0, .22, .32, 370], [415, .32, .6, .32, 360]];
      A.forEach(function (h) { hoot(h[0], h[1], h[2], h[3], h[4]); if (animo !== 'dormido') aire(h[1], h[2] * .85, animo === 'triste' ? .06 : .05, h[0] + 60); });
      if (animo === 'dormido') { aire(0, .7, .07, 300); aire(.95, .8, .06, 240); }
    },
    // Racha +1: la burbuja con chispitas
    racha: function () { blup(); [DO2, MI2, SOL2, DO3].forEach(function (f, i) { nota(f, 0.1 + i * 0.055, 0.2, 'sine', 0.08); }); },
    // Cuenta del duelo: "tic" en 3, 2, 1 y "¡ding!" al empezar (n = 0)
    cuenta: function (n) {
      if (n > 0) return nota(660, 0, 0.12, 'sine', 0.18);
      nota(1320, 0, 0.5, 'sine', 0.2); [DO2, MI2, SOL2].forEach(function (f, i) { nota(f, 0.05 + i * 0.06, 0.4, 'triangle', 0.08); });
    },
    // Últimos 5 segundos de una pregunta: un tic suave por segundo, el último más agudo
    tic: function (s) { nota(s > 1 ? 880 : 1040, 0, 0.05, 'sine', 0.09); },
    // Se acabaron las vidas: tres notas que caen
    perder: function () { [SOL, MI, DO].forEach(function (f, i) { nota(f / 2, i * 0.16, 0.24, 'triangle', 0.16); }); nota(DO / 2, 0.5, 0.5, 'sine', 0.12, DO / 2.4); },
    // Fin de ronda: fanfarria desde 70%, si no dos notas tranquilas
    fin: function (pct) {
      if (pct >= 70) {
        [[DO, 0], [MI, .13], [SOL, .26], [DO2, .39]].forEach(function (x) { nota(x[0], x[1], .2, 'triangle', .2); });
        [DO2, MI2, SOL2].forEach(function (f) { nota(f, .55, .9, 'triangle', .12); });
      } else {
        nota(SOL, 0, .2, 'triangle', .18); nota(DO2, .18, .5, 'triangle', .18);
      }
    }
  };

  // Botón de parlante: cualquier elemento con [data-mc-son]
  var ICON_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  var ICON_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>';
  function pintar() {
    var bs = document.querySelectorAll('[data-mc-son]');
    for (var i = 0; i < bs.length; i++) {
      bs[i].innerHTML = activo ? ICON_ON : ICON_OFF;
      bs[i].classList.toggle('mudo', !activo);
      bs[i].setAttribute('aria-label', activo ? 'Silenciar sonidos' : 'Activar sonidos');
      bs[i].title = bs[i].getAttribute('aria-label');
    }
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-mc-son]');
    if (b) { e.preventDefault(); S.cambiar(); }
  });
  // Qué suena al tocar cada cosa de la web (si el enlace no trae su propio data-mc-nav)
  var EN_AREA = /\/areas\//.test(location.pathname);
  // Flashcards trae sus propios sonidos: ahí solo suenan retroceder y la casita
  var EN_TARJETAS = /\/tarjetas\.html$/.test(location.pathname);
  var EN_SIMULACRO = /\/simulacro\.html$/.test(location.pathname);
  function tipoDe(a) {
    if (a.matches('a.back, a.home-btn, a.volver, a.logo')) return 'volver';
    // Tutorial: Siguiente con la burbuja, Atrás y Saltar como retroceder, ¡Listo! con campanitas
    if (a.matches('.mct-sig')) return /listo/i.test(a.textContent) ? 'abrir' : 'toque';
    if (a.matches('.mct-atr, .mct-saltar')) return 'volver';
    if (a.matches('.mct-ayuda')) return 'toque';
    if (EN_TARJETAS) return '';
    if (a.matches('#mcPopulares a')) return 'curso';
    // Inicio: "Nuevo para ti", Top del simulacro
    if (a.matches('a.mcn-item')) return 'tema';
    if (a.matches('a.mcr-bt')) return 'practicar';
    if (a.matches('#btnEmpezar, #btnCrear, #btnUnirse, #btnJugar, #btnRevancha')) return 'practicar';
    // Simulacro: marcar una alternativa no dice si está bien, así que suena la burbuja suave
    if (EN_SIMULACRO && a.matches('.alts:not(.ver) li button')) return 'seccion';
    if (a.matches('.chips button, .tiempos button, #repMas, .mcn-mas, #mcrVer, #btnCopiar, #btnAnt, #btnSig, #btnMarcar, #btnMapa, #mapaCerrar, #btnTerminar, #btnRevisar, button[data-i], button[data-f], #btnUnlock')) return 'toque';
    if (a.matches('#practicarLink, #tarjetasLink, #btnStartSim')) return 'practicar';
    if (a.matches('a.year-card.active, .year-card.multi, a.tema-card, .exam-sublist a')) return 'tema';
    if (a.matches('a[href$="perfil.html"], a[href*="perfil.html#"]')) return 'tema';
    if (a.matches('.barra a, #barCodigo, #vipToggle')) return 'toque';
    if (a.matches('a.btn')) {
      var h = a.getAttribute('href') || '';
      if (/^(areas|examenes)\//.test(h)) return 'area';
      if (EN_AREA) return 'curso';
      if (/(libros|seminarios|banqueo)\/|repaso\.html|fijas\.html|tarjetas\.html/.test(h)) return 'seccion';
      if (/simulacro\.html|duelo\.html/.test(h)) return 'practicar';
    }
    return '';
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a, button, .year-card');
    if (!a || a.hasAttribute('data-mc-nav')) return;
    var t = tipoDe(a); if (t) a.setAttribute('data-mc-nav', t);
  }, true);
  // Casillas para elegir (exámenes y ciclos del simulacro): la burbuja suave; listas desplegables (duelo, simulacro): la burbuja
  document.addEventListener('change', function (e) {
    if (!activo || EN_TARJETAS || !e.target.matches) return;
    if (e.target.matches('.pick input[type="checkbox"], #ciclos input')) S.seccion();
    else if (e.target.matches('select')) S.toque();
  });
  // Enlaces con data-mc-nav: suena y se espera un instante antes de cambiar de página para que no se corte
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-mc-nav]');
    var fn = el && S[el.getAttribute('data-mc-nav')];
    if (!fn || !activo || e.defaultPrevented) return;
    fn();
    var href = el.tagName === 'A' && el.getAttribute('href');
    if (!href || href.charAt(0) === '#' || el.target === '_blank' || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button) return;
    e.preventDefault();
    setTimeout(function () { location.href = el.href; }, el.getAttribute('data-mc-nav') === 'practicar' ? 220 : 130);
  });
  // Los botones pueden aparecer después (la cabecera del quiz se arma al cargar)
  if (window.MutationObserver) {
    new MutationObserver(function () {
      var nuevos = document.querySelectorAll('[data-mc-son]:empty');
      if (nuevos.length) pintar();
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
  var css = document.createElement('style');
  css.textContent = '.mc-son{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;margin-left:10px;border-radius:9px;border:2px solid #2e2e2e;border-bottom-width:3px;background:#161616;color:#e6e6e6;cursor:pointer;padding:0;vertical-align:middle}' +
    '.mc-son:active{transform:translateY(1px);border-bottom-width:2px}.mc-son svg{width:16px;height:16px}.mc-son.mudo{color:#6b6b6b}';
  (document.head || document.documentElement).appendChild(css);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pintar); else pintar();

  window.MCSonido = S;
})();
