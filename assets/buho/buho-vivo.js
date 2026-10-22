/* =========================================================
   Modo Cachimbo · Búho animado por capas (estilo juego)
   - Necesita assets/buho/buho.css y assets/buho/buho-datos.js.
   - MCBuhoVivo.crear(pose): el búho armado por capas. Poses: vivo (30 s en
     bucle: lentes, canta, baila), oficial, saludando, logro, estudiando,
     pensativo, caminando, sorprendido, triste, enojado, dormido.
   - MCBuhoVivo.toques(escena, {pose, decir, alTocar}): pone el búho en la
     escena; 1 o 2 toques llaman a alTocar, 3 lo alegran y 7 seguidos lo
     molestan (con sonido y decir(texto, tono, ms) para su globo).
   ========================================================= */
(function () {
  if (window.MCBuhoVivo) return;
  var BASE = (document.currentScript && document.currentScript.src || '').replace(/[^/]*$/, '');
  var pct = function (a, b) { return (a / b * 100).toFixed(3) + '%'; };
  var GAFAS=`<svg viewBox="0 0 800 831" aria-hidden="true"><defs>
  <linearGradient id="mcb-lente" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b2470"/><stop offset=".55" stop-color="#140c2a"/><stop offset="1" stop-color="#05030c"/></linearGradient></defs>
  <g stroke="#120d1f" stroke-width="16" stroke-linecap="round" fill="none">
  <path d="M158 238 L104 222"/><path d="M642 238 L696 222"/><path d="M336 250 Q400 222 464 250"/></g>
  <g stroke="#120d1f" stroke-width="14" fill="url(#mcb-lente)">
  <path d="M160 214 Q160 192 186 192 L320 192 Q344 192 342 222 L334 300 Q326 356 262 360 L230 360 Q168 356 162 296 Z"/>
  <path d="M640 214 Q640 192 614 192 L480 192 Q456 192 458 222 L466 300 Q474 356 538 360 L570 360 Q632 356 638 296 Z"/></g>
  <g fill="#fff" opacity=".55"><path d="M190 214 L222 214 L178 300 L172 266 Z"/><path d="M490 214 L522 214 L478 300 L472 266 Z"/></g>
  <g fill="#f6c21c"><rect x="182" y="196" width="140" height="7" rx="3"/><rect x="478" y="196" width="140" height="7" rx="3"/></g>
  </svg>`;
  var N1 = '<svg viewBox="0 0 24 32"><ellipse cx="8" cy="25" rx="7" ry="5.5" transform="rotate(-20 8 25)"/><rect x="13" y="3" width="3" height="22"/><path d="M16 3c5 2 8 6 6 12-1-4-3-6-6-6z"/></svg>';
  var N2 = '<svg viewBox="0 0 32 32"><ellipse cx="7" cy="26" rx="6.5" ry="5" transform="rotate(-20 7 26)"/><ellipse cx="24" cy="22" rx="6.5" ry="5" transform="rotate(-20 24 22)"/><rect x="11.5" y="5" width="3" height="21"/><rect x="28.5" y="1" width="3" height="21"/><path d="M11.5 5L31.5 1v6L11.5 11z"/></svg>';

  function crear(pose) {
    var key = pose === 'vivo' ? 'oficial' : pose;
    var d = window.MCBuhoDatos[key], el = document.createElement('div');
    el.className = 'mcb mcb-' + pose;
    el.setAttribute('role', 'img'); el.setAttribute('aria-label', 'Búho de Modo Cachimbo');
    el.style.setProperty('--ar', d.W + '/' + d.H);
    el.style.setProperty('--base', pct(d.base, d.H));
    el.style.setProperty('--drop', pct(d.H - d.fb - 6, d.H));
    var jump = document.createElement('div'); jump.className = 'mcb-j';
    var rig = document.createElement('div'); rig.className = 'mcb-r';
    function mk(l) {
      var i = new Image(); i.src = BASE + 'capas/' + l.f; i.alt = ''; i.className = 'mcb-l-' + l.n + ' mcb-k-' + l.k;
      i.style.left = pct(l.x, d.W); i.style.top = pct(l.y, d.H); i.style.width = pct(l.w, d.W);
      if (l.p) i.style.transformOrigin = pct(l.p[0] - l.x, l.w) + ' ' + pct(l.p[1] - l.y, l.h);
      return i;
    }
    function by(k) { return d.L.filter(function (l) { return l.k === k; }); }
    by('feet').forEach(function (l) { jump.append(mk(l)); });
    ['wings', 'body', 'mouth'].forEach(function (k) { by(k).forEach(function (l) { rig.append(mk(l)); }); });
    d.E.forEach(function (e, i) {
      var ey = document.createElement('div'); ey.className = 'mcb-ojo';
      ey.style.left = pct(e.x, d.W); ey.style.top = pct(e.y, d.H); ey.style.width = pct(e.w, d.W); ey.style.height = pct(e.h, d.H);
      ey.style.webkitMaskImage = ey.style.maskImage = 'url(' + BASE + 'capas/' + e.f + ')';
      var lid = document.createElement('div'); lid.className = 'mcb-lid'; lid.style.setProperty('--lc', e.c);
      lid.style.animationDelay = (i ? 0.04 : 0) + 's';
      ey.append(lid); rig.append(ey);
    });
    by('brow').forEach(function (l) { rig.append(mk(l)); });
    if (pose === 'vivo') {
      var g = document.createElement('div'); g.className = 'mcb-gafas'; g.innerHTML = GAFAS; rig.append(g);
      var b = document.createElement('div'); b.className = 'mcb-brillo'; b.textContent = '✦'; rig.append(b);
      [N1, N2, N1, N2].forEach(function (s, i) {
        var n = document.createElement('div'); n.className = 'mcb-nota mcb-n' + i; n.innerHTML = s; n.setAttribute('aria-hidden', 'true'); rig.append(n);
      });
    }
    jump.append(rig);
    d.L.filter(function (l) { return ['feet', 'wings', 'body', 'brow', 'mouth'].indexOf(l.k) < 0; }).forEach(function (l, i) {
      var im = mk(l); if (l.k === 'star') im.style.animationDelay = (i * 0.17) + 's'; jump.append(im);
    });
    el.append(jump);
    return el;
  }

  // Toques: 3 lo alegran, 7 seguidos (en 2,5 s) lo molestan
  function toques(escena, o) {
    o = o || {};
    // pose puede ser una función: la pose cambia y el búho vuelve a la que toque después de reír o enojarse
    var poseDe = function () { return (typeof o.pose === 'function' ? o.pose() : o.pose) || 'vivo'; }, decir = o.decir || function () {}, taps = [], timer = null, ocupado = false;
    var sonido = o.sonido !== false;
    function poner(p) { var v = escena.querySelector('.mcb'); if (v) v.remove(); escena.append(crear(p)); }
    function tocar(k) {
      if (!sonido) return;
      try { var a = new Audio(BASE + k + '.mp3'); a.volume = .7; a.play().catch(function () {}); } catch (e) {}
    }
    function reaccion(feliz) {
      ocupado = true; taps = []; clearTimeout(timer);
      poner(feliz ? 'logro' : 'enojado');
      decir(feliz ? '¡Jiji, me haces cosquillas!' : '¡Oye, ya basta!', feliz ? 'feliz' : 'molesto', feliz ? 2800 : 3400);
      tocar(feliz ? 'risa' : 'enojo');
      setTimeout(function () {
        ocupado = false; poner(poseDe());
      }, feliz ? 2800 : 3400);
    }
    poner(poseDe());
    escena.addEventListener('pointerdown', function (e) {
      var b = e.target.closest('.mcb'); if (!b || ocupado) return;
      b.classList.remove('mcb-toque'); void b.offsetWidth; b.classList.add('mcb-toque');
      var now = performance.now(); taps = taps.filter(function (x) { return now - x < 2500; }); taps.push(now);
      clearTimeout(timer);
      if (taps.length >= 7) return reaccion(false);
      timer = setTimeout(function () { if (taps.length >= 3) reaccion(true); else if (o.alTocar) o.alTocar(); taps = []; }, 550);
    });
    return { sonido: function (v) { sonido = v; } };
  }

  window.MCBuhoVivo = { crear: crear, toques: toques };
})();
