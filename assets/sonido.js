/* =========================================================
   Modo Cachimbo · Sonidos (hechos con código, sin archivos de audio)
   MCSonido.bien() · mal() · empezar() · fin(pct) · perder() · toque()
   Duelo: comodin() · robado() · reaccion(cara)
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
  function soplo(dur, vol, desde, hasta, t) {
    var a = audio(); if (!a) return;
    var n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    var src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(), t0 = a.currentTime + (t || 0);
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
      if (activo) S.toque(); else if (amb.on) { amb.on = false; ambParar(); }
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
    // Duelo: usar un comodín (sube como un power-up) y que te roben tiempo (un "fiuu" que cae)
    comodin: function () { blup(0.22, 0.08, 300, 900); [SOL, DO2, MI2, SOL2].forEach(function (f, i) { nota(f, 0.06 + i * 0.05, 0.14, 'triangle', 0.12); }); },
    robado: function () { soplo(0.35, 0.16, 2600, 400); nota(520, 0.04, 0.4, 'sawtooth', 0.05, 140); },
    // Reacciones del duelo: risa, llanto, enojo, susto, genial y aplauso
    reaccion: function (cara) {
      if (cara === 'risa') [0, 1, 2, 3].forEach(function (i) { nota(760 - i * 45, i * 0.11, 0.09, 'triangle', 0.2, 560 - i * 45); });
      else if (cara === 'llanto') { hoot(560, 0, 0.32, 0.24, 470); hoot(520, 0.36, 0.75, 0.24, 300); }
      else if (cara === 'enojo') { nota(150, 0, 0.38, 'sawtooth', 0.09, 105); nota(160, 0.03, 0.34, 'square', 0.05, 95); }
      else if (cara === 'susto') { nota(320, 0, 0.16, 'sine', 0.26, 980); nota(1250, 0.15, 0.14, 'triangle', 0.12, 1050); }
      else if (cara === 'genial') { [SOL, DO2, MI2, SOL2, DO3].forEach(function (f, i) { nota(f, i * 0.05, 0.18, 'sine', 0.12); }); soplo(0.2, 0.05, 3000, 6000, 0.2); }
      else if (cara === 'aplauso') [0, 0.11, 0.2, 0.31, 0.4, 0.5].forEach(function (t) { soplo(0.06, 0.22, 1800, 1200, t); });
    },
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
    if (a.matches('.mce-btn')) return 'toque';
    if (EN_TARJETAS) return '';
    // Práctica, Repaso y Fijas: Siguiente con la burbuja, Atrás como retroceder
    if (a.matches('#btnNext')) return 'toque';
    if (a.matches('#btnBack')) return 'volver';
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
  css.textContent = '.mc-son{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;margin-left:10px;border-radius:9px;border:2px solid #322B52;border-bottom-width:3px;background:#1F1936;color:#e6e6e6;cursor:pointer;padding:0;vertical-align:middle}' +
    '.mc-son:active{transform:translateY(1px);border-bottom-width:2px}.mc-son svg{width:16px;height:16px}.mc-son.mudo{color:#6b6b6b}';
  (document.head || document.documentElement).appendChild(css);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pintar); else pintar();

  // ---------- Duelos v3: ataques, fuego y ambiente ----------
  // Un golpe grave (bombo) para el latido y el redoble
  function bombo(t, vol, f) {
    var a = audio(); if (!a) return;
    var o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + (t || 0);
    o.type = 'sine'; o.frequency.setValueAtTime(f || 110, t0); o.frequency.exponentialRampToValueAtTime(42, t0 + 0.22);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.3, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
    o.connect(g); g.connect(salida); o.start(t0); o.stop(t0 + 0.3);
  }
  // Fuego: un "fuush" que sube y chisporroteo
  function crepita(dur, t) { for (var i = 0; i < Math.round(dur * 22); i++) soplo(0.025, 0.05 + Math.random() * 0.08, 2500 + Math.random() * 3000, 1500, (t || 0) + Math.random() * dur); }
  S.vs = function () { soplo(0.5, 0.2, 300, 3200); bombo(0.42, 0.4, 130); nota(220, 0.42, 0.5, 'sawtooth', 0.06, 110); [DO, SOL, DO2].forEach(function (f, i) { nota(f, 0.5 + i * 0.05, 0.3, 'triangle', 0.1); }); };
  S.cargado = function () { soplo(0.3, 0.12, 400, 2400); [SOL, DO2, MI2].forEach(function (f, i) { nota(f, 0.08 + i * 0.06, 0.2, 'triangle', 0.1); }); crepita(0.4, 0.1); };
  S.llamarada = function () { soplo(0.6, 0.24, 250, 3600); nota(140, 0, 0.5, 'sawtooth', 0.07, 320); crepita(0.8, 0.15); };
  S.volcan = function () { bombo(0, 0.45, 90); soplo(0.9, 0.28, 180, 2800); nota(80, 0, 0.9, 'sawtooth', 0.09, 50); crepita(1.1, 0.2); bombo(0.35, 0.3, 80); };
  S.quemado = function () { crepita(1.2, 0.05); };
  S.gota = function (n) { nota(900 + (n || 1) * 180, 0, 0.08, 'sine', 0.2, 1900 + (n || 1) * 200); soplo(0.08, 0.06, 4000, 2000, 0.02); };
  S.terremoto = function () { for (var i = 0; i < 6; i++) bombo(i * 0.11, 0.22 - i * 0.02, 70 + Math.random() * 30); soplo(1.2, 0.14, 120, 260); };
  S.espejo = function () { [MI2, SOL2, DO3, SOL2 * 1.5].forEach(function (f, i) { nota(f, i * 0.05, 0.35, 'sine', 0.07); }); soplo(0.3, 0.05, 6000, 9000); };
  S.apuesta = function () { [0, 0.06, 0.12, 0.2].forEach(function (t) { nota(2200 + Math.random() * 600, t, 0.04, 'square', 0.04); }); nota(SOL, 0.25, 0.18, 'triangle', 0.12); };
  S.ladron = function () { nota(1568, 0, 0.08, 'square', 0.05); nota(2093, 0.08, 0.25, 'square', 0.05); soplo(0.2, 0.06, 1200, 400, 0.05); };
  S.relampago = function () { soplo(0.18, 0.2, 7000, 1500); nota(1800, 0, 0.12, 'sawtooth', 0.05, 300); bombo(0.12, 0.25, 160); };
  S.niebla = function () { nota(196, 0, 1.4, 'sine', 0.08, 185); nota(233, 0.1, 1.4, 'sine', 0.06, 220); soplo(1.4, 0.06, 300, 900); };
  S.cambioQ = function () { blup(0.2, 0.1, 500, 1400); blup(0.18, 0.1, 1400, 500, 0.12); };
  // Redoble antes del ganador
  S.redoble = function (dur) { for (var t = 0; t < (dur || 1.3); t += 0.055) soplo(0.045, 0.05 + t * 0.08, 1800, 900, t); bombo(dur || 1.3, 0.45, 120); };

  // Ambiente del duelo: un zumbido grave y un pulso que se acelera (1 juego, 2 niebla, 3 duelo cerrado).
  // Tiene su propio interruptor (mc_ambiente) y respeta el silencio general.
  var amb = { on: false, nivel: 0, g: null, oscs: [], fl: null, t: null };
  function ambParar() {
    clearTimeout(amb.t); amb.t = null;
    if (amb.g && ctx) { try { amb.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3); } catch (e) {} }
    var os = amb.oscs; amb.oscs = []; amb.g = null;
    setTimeout(function () { os.forEach(function (o) { try { o.stop(); } catch (e) {} }); }, 1200);
  }
  function ambPulso() {
    if (!amb.on || !activo) return;
    var n = amb.nivel, a = audio(); if (!a) return;
    if (!document.hidden) {
      if (n >= 3) { bombo(0, 0.16, 95); bombo(0.18, 0.11, 85); }
      else if (n >= 1) bombo(0, n >= 2 ? 0.1 : 0.06, 80);
      if (n >= 2 && Math.random() < 0.35) nota(n >= 3 ? 1318 : 988, 0.4, 0.06, 'sine', 0.025);
    }
    amb.t = setTimeout(ambPulso, n >= 3 ? 760 : n >= 2 ? 1100 : n >= 1 ? 1500 : 2200);
  }
  S.ambiente = function (on, nivel) {
    var quiere = !!on && activo && S.ambienteOn;
    if (!quiere) { amb.on = false; ambParar(); return; }
    amb.nivel = nivel || 0;
    var a = audio(); if (!a) return;
    if (!amb.g) {
      amb.g = a.createGain(); amb.g.gain.value = 0.0001;
      amb.fl = a.createBiquadFilter(); amb.fl.type = 'lowpass'; amb.fl.frequency.value = 300;
      [55, 55.6, 82.4].forEach(function (f, i) {
        var o = a.createOscillator(); o.type = i === 2 ? 'triangle' : 'sawtooth'; o.frequency.value = f;
        o.connect(amb.fl); o.start(); amb.oscs.push(o);
      });
      amb.fl.connect(amb.g); amb.g.connect(salida);
    }
    amb.g.gain.setTargetAtTime([0.018, 0.026, 0.035, 0.045][Math.min(amb.nivel, 3)], a.currentTime, 0.8);
    amb.fl.frequency.setTargetAtTime([260, 320, 480, 700][Math.min(amb.nivel, 3)], a.currentTime, 0.8);
    if (!amb.on) { amb.on = true; clearTimeout(amb.t); ambPulso(); }
  };
  try { S.ambienteOn = localStorage.getItem('mc_ambiente') !== '0'; } catch (e) { S.ambienteOn = true; }
  S.ambienteCambiar = function (v) {
    S.ambienteOn = v == null ? !S.ambienteOn : !!v;
    try { localStorage.setItem('mc_ambiente', S.ambienteOn ? '1' : '0'); } catch (e) {}
    if (!S.ambienteOn) { amb.on = false; ambParar(); }
    return S.ambienteOn;
  };
  document.addEventListener('visibilitychange', function () { if (document.hidden && amb.g && ctx) amb.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.2); else if (amb.on && amb.g && ctx) S.ambiente(true, amb.nivel); });

  // Para las temáticas (assets/tema.js): sus propios sonidos con el mismo motor
  S.motor = { audio: audio, nota: nota, soplo: soplo, hoot: hoot, aire: aire, salida: function () { return salida; } };
  window.MCSonido = S;
})();
