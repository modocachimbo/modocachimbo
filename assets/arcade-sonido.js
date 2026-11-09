/* =========================================================
   Modo Cachimbo · Arcade · Sonido (todo hecho con código, sin archivos)
   - Ambientes: 'mapa' (remolino de los mundos) y 'mundo' (Cusco: río, viento,
     pájaros, antorchas y una quena con escala pentatónica andina).
   - Efectos: tap, abrir, cambio, bien, mal, victoria, bloq.
   - El botón 🔊/🔇 se recuerda en el teléfono (mc_arcade_sonido).
   Los navegadores solo dejan sonar después de un toque: el audio arranca solo
   con el primer toque del alumno.
   ========================================================= */
(function () {
  if (window.MCSonido) return;
  var K = 'mc_arcade_sonido', ctx = null, maestro = null, eco = null, amb = null, pedido = null, activo = true;
  try { activo = localStorage.getItem(K) !== 'no'; } catch (e) {}

  function crear() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ctx = new AC();
    maestro = ctx.createGain(); maestro.gain.value = activo ? 1 : 0; maestro.connect(ctx.destination);
    // Eco suave (reverberación de cerros)
    eco = ctx.createConvolver();
    var len = ctx.sampleRate * 2.4, b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) { var d = b.getChannelData(c); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    eco.buffer = b;
    var g = ctx.createGain(); g.gain.value = .35; eco.connect(g); g.connect(maestro);
    return ctx;
  }
  function ruido(tipo) {
    var len = ctx.sampleRate * 3, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0), u = 0;
    for (var i = 0; i < len; i++) { var w = Math.random() * 2 - 1; if (tipo === 'cafe') { u = (u + .02 * w) / 1.02; d[i] = u * 3.5; } else d[i] = w; }
    var s = ctx.createBufferSource(); s.buffer = b; s.loop = true; return s;
  }
  function tono(frec, ini, dur, o) {
    o = o || {};
    var t = ctx.currentTime + (ini || 0), os = ctx.createOscillator(), g = ctx.createGain();
    os.type = o.tipo || 'sine'; os.frequency.setValueAtTime(frec, t);
    if (o.hasta) os.frequency.exponentialRampToValueAtTime(o.hasta, t + dur);
    if (o.vib) { var lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = o.vib; lg.gain.value = frec * .012; lfo.connect(lg); lg.connect(os.frequency); lfo.start(t); lfo.stop(t + dur + .1); }
    var v = o.vol || .2;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + (o.ataque || .01)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    os.connect(g); g.connect(o.destino || maestro); if (o.eco) g.connect(eco);
    os.start(t); os.stop(t + dur + .05);
  }
  function golpe(dur, filtro, vol, ini) {
    var t = ctx.currentTime + (ini || 0), s = ruido('blanco'), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.frequency.value = filtro; f.Q.value = 1.2;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(maestro); s.start(t); s.stop(t + dur + .05);
  }

  /* ---------- Ambientes ---------- */
  function pararAmb() {
    if (!amb) return;
    var a = amb; amb = null;
    a.timers.forEach(clearTimeout); a.timers.forEach(clearInterval);
    try { a.g.gain.linearRampToValueAtTime(0, ctx.currentTime + .6); } catch (e) {}
    setTimeout(function () { a.nodos.forEach(function (n) { try { n.stop(); } catch (e) {} try { n.disconnect(); } catch (e) {} }); }, 800);
  }
  function ambMundo() {
    var g = ctx.createGain(); g.gain.value = 0; g.connect(maestro); g.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.5);
    var a = { g: g, nodos: [], timers: [] };
    // Río (ruido café filtrado, con oleaje lento)
    var rio = ruido('cafe'), fr = ctx.createBiquadFilter(), gr = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    fr.type = 'lowpass'; fr.frequency.value = 900; gr.gain.value = .16; lfo.frequency.value = .12; lg.gain.value = .05;
    lfo.connect(lg); lg.connect(gr.gain); rio.connect(fr); fr.connect(gr); gr.connect(g); rio.start(); lfo.start(); a.nodos.push(rio, lfo);
    // Viento de la sierra (ruido blanco que barre)
    var vi = ruido('blanco'), fv = ctx.createBiquadFilter(), gv = ctx.createGain(), lv = ctx.createOscillator(), lvg = ctx.createGain();
    fv.type = 'bandpass'; fv.frequency.value = 600; fv.Q.value = 3; gv.gain.value = .035; lv.frequency.value = .07; lvg.gain.value = 300;
    lv.connect(lvg); lvg.connect(fv.frequency); vi.connect(fv); fv.connect(gv); gv.connect(g); vi.start(); lv.start(); a.nodos.push(vi, lv);
    // Quena: frases cortas en pentatónica menor de La (La Do Re Mi Sol)
    var esc = [440, 523.25, 587.33, 659.25, 783.99, 880, 392, 329.63], idx = 2;
    function frase() {
      if (!amb || amb !== a) return;
      var n = 3 + Math.floor(Math.random() * 4), t = 0;
      for (var k = 0; k < n; k++) {
        idx = Math.max(0, Math.min(esc.length - 1, idx + Math.floor(Math.random() * 3) - 1));
        var dur = Math.random() < .3 ? 1.1 : .5;
        tono(esc[idx], t, dur, { tipo: 'sine', vol: .045, ataque: .08, vib: 5.2, eco: true, destino: g });
        tono(esc[idx] * 2, t, dur * .8, { tipo: 'sine', vol: .008, ataque: .08, destino: g });
        t += dur * .85;
      }
      a.timers.push(setTimeout(frase, (t + 3 + Math.random() * 5) * 1000));
    }
    a.timers.push(setTimeout(frase, 1800));
    // Pájaros de vez en cuando
    function pajaro() {
      if (!amb || amb !== a) return;
      var base = 2400 + Math.random() * 1600, n = 2 + Math.floor(Math.random() * 3);
      for (var k = 0; k < n; k++) tono(base, k * .13, .09, { hasta: base * 1.4, vol: .02, destino: g });
      a.timers.push(setTimeout(pajaro, 4000 + Math.random() * 7000));
    }
    a.timers.push(setTimeout(pajaro, 3000));
    // Crepitar de antorchas
    a.timers.push(setInterval(function () { if (Math.random() < .5) golpe(.04, 1800 + Math.random() * 1500, .02); }, 260));
    return a;
  }
  function ambMapa() {
    var g = ctx.createGain(); g.gain.value = 0; g.connect(maestro); g.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.5);
    var a = { g: g, nodos: [], timers: [] };
    // Zumbido mágico del remolino (dos sierras desafinadas con filtro que respira)
    var f = ctx.createBiquadFilter(), gp = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    f.type = 'lowpass'; f.frequency.value = 520; gp.gain.value = .05; lfo.frequency.value = .1; lg.gain.value = 260;
    lfo.connect(lg); lg.connect(f.frequency); f.connect(gp); gp.connect(g); gp.connect(eco);
    [110, 110.7, 164.8].forEach(function (fr) { var o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.connect(f); o.start(); a.nodos.push(o); });
    lfo.start(); a.nodos.push(lfo);
    // Destellos
    var es = [1318.5, 1567.98, 1760, 2093, 2349.3];
    a.timers.push(setInterval(function () { tono(es[Math.floor(Math.random() * es.length)], 0, .6, { vol: .018, eco: true, destino: g }); }, 1400));
    return a;
  }
  function ambiente(tipo) {
    pedido = tipo;
    if (!ctx || ctx.state !== 'running') return;
    if (amb && amb.tipo === tipo) return;
    pararAmb();
    if (!tipo) return;
    amb = tipo === 'mundo' ? ambMundo() : ambMapa(); amb.tipo = tipo;
  }

  /* ---------- Efectos ---------- */
  var EF = {
    tap: function () { tono(880, 0, .08, { tipo: 'triangle', vol: .12 }); },
    abrir: function () { [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { tono(f, i * .06, .25, { tipo: 'triangle', vol: .1, eco: true }); }); },
    cambio: function () {
      var t = ctx.currentTime, s = ruido('blanco'), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2600, t + .45); f.frequency.exponentialRampToValueAtTime(500, t + .8);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.18, t + .2); g.gain.exponentialRampToValueAtTime(.0001, t + .85);
      s.connect(f); f.connect(g); g.connect(maestro); g.connect(eco); s.start(t); s.stop(t + .9);
      tono(220, 0, .7, { hasta: 660, vol: .05, eco: true });
    },
    bien: function () { tono(659.25, 0, .12, { tipo: 'triangle', vol: .14 }); tono(987.77, .09, .22, { tipo: 'triangle', vol: .14, eco: true }); },
    mal: function () { tono(196, 0, .22, { tipo: 'sawtooth', hasta: 140, vol: .07 }); },
    victoria: function () { [440, 523.25, 659.25, 880, 783.99, 880].forEach(function (f, i) { tono(f, i * .12, i === 5 ? .7 : .18, { tipo: 'triangle', vol: .13, eco: true }); }); },
    bloq: function () { tono(120, 0, .15, { tipo: 'square', hasta: 90, vol: .05 }); golpe(.08, 400, .08); }
  };
  function efecto(n) { if (!activo || !ctx || ctx.state !== 'running' || !EF[n]) return; try { EF[n](); } catch (e) {} }

  /* ---------- Encender / apagar ---------- */
  function despertar() {
    if (!activo) return;
    if (!crear()) return;
    var seguir = function () { ambiente(pedido); };
    if (ctx.state === 'suspended') ctx.resume().then(seguir); else seguir();
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, despertar, { passive: true }); });
  document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else if (activo) ctx.resume();
  });
  function pintar() {
    document.querySelectorAll('.btn-sonido').forEach(function (b) {
      b.innerHTML = activo ? '🔊' : '🔇'; b.setAttribute('aria-label', activo ? 'Apagar sonido' : 'Encender sonido'); b.setAttribute('aria-pressed', activo ? 'true' : 'false');
    });
  }
  function alternar() {
    activo = !activo;
    try { localStorage.setItem(K, activo ? 'si' : 'no'); } catch (e) {}
    if (activo) { despertar(); if (maestro) maestro.gain.setTargetAtTime(1, ctx.currentTime, .1); }
    else if (maestro) maestro.gain.setTargetAtTime(0, ctx.currentTime, .1);
    pintar();
  }
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('.btn-sonido'); if (b) { e.preventDefault(); alternar(); } });
  document.addEventListener('DOMContentLoaded', pintar);

  window.MCSonido = { ambiente: ambiente, efecto: efecto, alternar: alternar, activo: function () { return activo; }, pintar: pintar };
})();
