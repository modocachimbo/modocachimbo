/* Modo Cachimbo · Laboratorio · Sonidos cortos hechos con código (0 KB de audio).
   MCLabSonido.tocar('tic'|'abrir'|'cerrar'|'bien'|'mal'|'lanzar'|'caer'), .activo(), .alternar().
   La preferencia se recuerda en el teléfono (mc_lab_sonido). Sin música de fondo. */
(function () {
  if (window.MCLabSonido) return;
  var K = 'mc_lab_sonido', ctx = null, activo = true;
  try { activo = localStorage.getItem(K) !== 'no'; } catch (e) {}
  function crear() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    return ctx;
  }
  function tono(f, ini, dur, o) {
    o = o || {};
    var t = ctx.currentTime + (ini || 0), os = ctx.createOscillator(), g = ctx.createGain();
    os.type = o.tipo || 'sine'; os.frequency.setValueAtTime(f, t);
    if (o.hasta) os.frequency.exponentialRampToValueAtTime(o.hasta, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(o.vol || .12, t + .008);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    os.connect(g); g.connect(ctx.destination); os.start(t); os.stop(t + dur + .05);
  }
  function soplo(dur, desde, hasta, vol) {
    var len = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime;
    s.buffer = b; fl.type = 'bandpass'; fl.Q.value = 1.4;
    fl.frequency.setValueAtTime(desde, t); fl.frequency.exponentialRampToValueAtTime(hasta, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * .35); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(ctx.destination); s.start(t); s.stop(t + dur);
  }
  var EF = {
    tic: function () { tono(1250, 0, .06, { tipo: 'triangle', vol: .07 }); },
    abrir: function () { soplo(.32, 500, 2600, .09); tono(660, .05, .16, { vol: .05, hasta: 990 }); },
    cerrar: function () { soplo(.25, 2200, 450, .07); },
    bien: function () { tono(784, 0, .14, { vol: .1 }); tono(1175, .09, .26, { vol: .1 }); },
    mal: function () { tono(220, 0, .24, { tipo: 'triangle', vol: .09, hasta: 160 }); },
    lanzar: function () { soplo(.28, 300, 1800, .12); tono(140, 0, .12, { tipo: 'triangle', vol: .1, hasta: 70 }); },
    caer: function () { tono(110, 0, .18, { tipo: 'triangle', vol: .12, hasta: 55 }); soplo(.18, 900, 300, .06); }
  };
  window.MCLabSonido = {
    activo: function () { return activo; },
    alternar: function () {
      activo = !activo;
      try { localStorage.setItem(K, activo ? 'si' : 'no'); } catch (e) {}
      if (activo) this.tocar('tic');
      return activo;
    },
    tocar: function (n) {
      if (!activo || !EF[n] || !crear()) return;
      try { if (ctx.state === 'suspended') ctx.resume(); EF[n](); } catch (e) {}
    }
  };
})();
