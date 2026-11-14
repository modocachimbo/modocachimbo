/* =========================================================
   Modo Cachimbo · Laboratorio · Modo Reto (simuladores de Matemática)
   MCReto({ sim, preguntas: 5, nueva(i) → {comprobar() → {ok, msg, sol}}, alEntrar, alSalir })
   - Pone el interruptor "Explorar | Reto" arriba (al lado del título).
   - En reto la ficha muestra: avance, la pregunta (#rCaja la llena cada página) y COMPROBAR.
   - Al acertar llama a MCRayos.reto(sim): +2 de energía (máx. 10 al día, supabase/98).
   - R.opciones(texto, [opciones], correcta, explicación) arma una pregunta de 4 opciones.
   ========================================================= */
(function () {
  var ICO = {
    exp: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
    reto: '<svg viewBox="0 0 24 24"><path d="M6 21V4M6 4h11l-2.5 4L17 12H6"/></svg>',
    ok: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    mal: '<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg>',
    rayo: '<svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
    copa: '<svg viewBox="0 0 24 24"><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4"/></svg>'
  };
  window.MCReto = function (o) {
    var N = o.preguntas || 5, SN = window.MCLabSonido, h = document.documentElement;
    function son(n) { if (SN) SN.tocar(n); }
    var ficha = document.querySelector('.ficha'), top = document.querySelector('.top'), ttl = top.querySelector('.ttl');
    ttl.insertAdjacentHTML('afterend', '<div class="modo glass"><button data-m="exp">' + ICO.exp + 'Explorar</button><button data-m="reto">' + ICO.reto + 'Reto</button></div>');
    ficha.insertAdjacentHTML('beforeend', '<div class="reto" id="rBox"></div>');
    document.body.insertAdjacentHTML('beforeend', '<div class="fb" id="rFb"></div>');
    var box = document.getElementById('rBox'), fb = document.getElementById('rFb');
    var R = { i: 0, res: [], q: null, energia: 0, activo: false };
    function modoBtns() { top.querySelectorAll('.modo button').forEach(function (b) { b.classList.toggle('on', (b.dataset.m === 'reto') === R.activo); }); }
    top.querySelectorAll('.modo button').forEach(function (b) { b.onclick = function () { if ((b.dataset.m === 'reto') !== R.activo) { son('tic'); b.dataset.m === 'reto' ? R.entrar() : R.salir(); } }; });
    function avance() {
      return '<div class="prog"><div class="seg">' + Array.apply(null, Array(N)).map(function (_, k) {
        return '<i class="' + (k < R.res.length ? (R.res[k] ? 'ok' : 'no') : k === R.i ? 'ya' : '') + '"></i>'; }).join('') + '</div><b>Reto ' + Math.min(R.i + 1, N) + ' de ' + N + '</b></div>';
    }
    function pregunta() {
      fb.classList.remove('on', 'mal');
      box.innerHTML = avance() + '<div id="rCaja"></div><button class="btnr" id="rOk">COMPROBAR</button>';
      R.q = o.nueva(R.i, document.getElementById('rCaja'), R) || {};
      var b = document.getElementById('rOk'); R.listo(R.q.listo !== false);
      b.onclick = function () { if (!b.disabled) comprobar(); };
      ficha.scrollTop = 0;
    }
    R.listo = function (si) { var b = document.getElementById('rOk'); if (b) b.disabled = !si; };
    function comprobar() {
      var r = R.q.comprobar() || {}; R.res.push(!!r.ok);
      var b = document.getElementById('rOk'); if (b) b.disabled = true;
      box.querySelector('.prog').outerHTML = avance();
      fb.classList.toggle('mal', !r.ok);
      fb.innerHTML = '<div class="ic">' + (r.ok ? ICO.ok : ICO.mal) + '</div><div class="tx"><b>' + (r.ok ? ['¡Excelente!', '¡Bien hecho!', '¡Correcto!'][R.i % 3] : 'Casi…') + '</b><small>' + (r.msg || '') + '</small></div>' +
        (r.ok ? '<div class="gana" id="rGana"></div>' : '') + '<button id="rSig">CONTINUAR</button>';
      fb.classList.add('on'); son(r.ok ? 'bien' : 'mal');
      if (R.q.mostrar && !r.ok) R.q.mostrar();
      if (r.ok && window.MCRayos) MCRayos.reto(o.sim).then(function (s) {
        if (!s || s.error) return; if (s.ganado) R.energia += s.ganado;
        var g = document.getElementById('rGana'); if (!g) return;
        if (s.ganado) g.innerHTML = ICO.rayo + '+' + s.ganado;
        else if (s.tope) g.innerHTML = '<small>Ya ganaste tu energía de hoy</small>';
      });
      document.getElementById('rSig').onclick = function () { son('tic'); R.i++; R.i < N ? pregunta() : final(); };
    }
    function final() {
      fb.classList.remove('on', 'mal');
      var ok = R.res.filter(Boolean).length;
      box.innerHTML = '<div class="fin"><div class="copa">' + ICO.copa + '</div><b>' + (ok === N ? '¡Perfecto!' : ok >= N - 2 ? '¡Muy bien!' : 'Sigue practicando') + '</b>' +
        '<p>Acertaste <em>' + ok + ' de ' + N + '</em></p>' + (R.energia ? '<p class="en">' + ICO.rayo + '+' + R.energia + ' de energía</p>' : '') +
        '<button class="btnr" id="rOtra">OTRA RONDA</button><button class="reset" id="rExp">Volver a explorar</button></div>';
      son(ok >= N - 1 ? 'bien' : 'cerrar');
      document.getElementById('rOtra').onclick = function () { son('tic'); ronda(); };
      document.getElementById('rExp').onclick = function () { son('tic'); R.salir(); };
    }
    function ronda() { R.i = 0; R.res = []; R.energia = 0; pregunta(); }
    R.entrar = function () { R.activo = true; h.classList.add('reto-on'); modoBtns(); if (o.alEntrar) o.alEntrar(); ronda(); };
    R.salir = function () { R.activo = false; h.classList.remove('reto-on'); fb.classList.remove('on', 'mal'); modoBtns(); if (o.alSalir) o.alSalir(); };
    /* Pregunta de 4 opciones: devuelve {comprobar} y marca la elegida */
    R.opciones = function (caja, texto, ops, buena, explica) {
      var orden = ops.map(function (t, k) { return [t, k]; }).sort(function () { return Math.random() - .5; }), elegida = -1;
      caja.innerHTML = '<div class="preg"><small>' + (o.nombre || 'Reto') + '</small><p>' + texto + '</p></div><div class="ops">' +
        orden.map(function (x) { return '<button data-k="' + x[1] + '">' + x[0] + '</button>'; }).join('') + '</div>';
      caja.querySelectorAll('.ops button').forEach(function (b) { b.onclick = function () {
        if (R.res.length > R.i) return; elegida = +b.dataset.k; son('tic');
        caja.querySelectorAll('.ops button').forEach(function (x) { x.classList.toggle('sel', x === b); }); R.listo(true); }; });
      return { listo: false, comprobar: function () {
        caja.querySelectorAll('.ops button').forEach(function (x) { var k = +x.dataset.k; x.classList.toggle('bien', k === buena); x.classList.toggle('mala', k === elegida && k !== buena); });
        return { ok: elegida === buena, msg: elegida === buena ? explica : 'Era ' + ops[buena] + '. ' + explica }; } };
    };
    R.texto = function (caja, titulo, texto) { caja.innerHTML = '<div class="preg"><small>' + (o.nombre || 'Reto') + (titulo ? ' · ' + titulo : '') + '</small><p>' + texto + '</p></div>'; };
    modoBtns();
    if (new URLSearchParams(location.search).get('modo') === 'reto') setTimeout(R.entrar, 0);
    return R;
  };
  /* elegir al azar */
  window.MCAzar = function (a) { return a[Math.floor(Math.random() * a.length)]; };
})();
