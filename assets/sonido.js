/* =========================================================
   Modo Cachimbo · Sonidos (hechos con código, sin archivos de audio)
   MCSonido.bien() · mal() · empezar() · fin(pct) · perder() · toque()
   Se silencia con cualquier botón [data-mc-son]; la elección se guarda
   en el navegador (mc_sonido) y vale para toda la web, Flashcards incluidas.
   ========================================================= */
(function () {
  var ctx = null, activo = true;
  try { activo = localStorage.getItem('mc_sonido') !== '0'; } catch (e) {}

  function audio() {
    if (!activo) return null;
    try {
      if (!ctx) { var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); }
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) { return null; }
    return ctx;
  }
  // Una nota: frecuencia, cuándo empieza (s), cuánto dura, forma de onda, volumen y a qué frecuencia se desliza
  function nota(f, t, dur, tipo, vol, hasta) {
    var a = audio(); if (!a) return;
    var o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + (t || 0);
    o.type = tipo || 'sine'; o.frequency.setValueAtTime(f, t0);
    if (hasta) o.frequency.exponentialRampToValueAtTime(hasta, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.02);
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
    src.connect(fl); fl.connect(g); g.connect(a.destination); src.start(t0); src.stop(t0 + dur);
  }
  var DO = 523.25, MI = 659.25, SOL = 783.99, DO2 = 1046.5, MI2 = 1318.5, SOL2 = 1568;

  var S = {
    get activo() { return activo; },
    cambiar: function () {
      activo = !activo;
      try { localStorage.setItem('mc_sonido', activo ? '1' : '0'); } catch (e) {}
      pintar();
      if (activo) S.toque();
      return activo;
    },
    toque: function () { nota(620, 0, 0.07, 'triangle', 0.22, 940); nota(1880, 0.005, 0.04, 'sine', 0.05); },
    // Acierto: dos notas alegres que suben
    bien: function () { nota(DO2, 0, 0.11, 'triangle', 0.22); nota(MI2, 0.09, 0.28, 'triangle', 0.24); nota(MI2 * 2, 0.09, 0.2, 'sine', 0.04); },
    // Fallo: dos notas suaves que bajan, sin sonar a castigo
    mal: function () { nota(392, 0, 0.12, 'sine', 0.16, 330); nota(294, 0.1, 0.22, 'sine', 0.13, 262); },
    empezar: function () { soplo(0.25, 0.14, 600, 2600); [DO, MI, SOL].forEach(function (f, i) { nota(f * 2, 0.05 + i * 0.06, 0.12, 'triangle', 0.16); }); },
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
