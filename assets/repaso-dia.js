/* =========================================================
   Modo Cachimbo · Tu repaso de hoy (solo en el inicio)
   Una barra naranja debajo de la meta del día. Al tocarla se abre
   con los 3 temas que más te cuestan (según tus falladas) y el botón
   para hacer 10 preguntas de ellos (falladas.html?dia=1).
   Sin falladas no se muestra.
   ========================================================= */
(function () {
  var ancla = document.getElementById('salRacha');
  if (!ancla) return;
  var BASE = (window.MCAuth && MCAuth.base) || './';
  var COLOR = { 'ciencia-tecnologia': '#58CC02', matematica: '#1CB0F6', comunicacion: '#CE82FF', 'ciencias-sociales': '#FF9600' };

  var st = document.createElement('style');
  st.textContent =
    '.mc-rd{width:100%;margin:14px 0 2px;border:2px solid #FF9600;border-bottom-width:5px;border-radius:18px;background:linear-gradient(90deg,#2a1a05,#111 70%);color:#f2f2f2;font-family:Nunito,sans-serif;overflow:hidden}' +
    '.mc-rd.hecho{border-color:#2c2c2c;background:#111}' +
    '.mc-rd-cab{all:unset;box-sizing:border-box;width:100%;display:flex;align-items:center;gap:12px;padding:11px 14px;cursor:pointer}' +
    '.mc-rd-cab:focus-visible{outline:3px solid #FF9600;outline-offset:-3px;border-radius:14px}' +
    '.mc-rd-ic{width:40px;height:40px;border-radius:12px;background:#FF9600;display:grid;place-items:center;flex:none;box-shadow:inset 0 -3px 0 #c97200}' +
    '.mc-rd.hecho .mc-rd-ic{background:#58CC02;box-shadow:inset 0 -3px 0 #3f9a00}' +
    '.mc-rd-ic svg{width:22px;height:22px}' +
    '.mc-rd-tx{flex:1;min-width:0;text-align:left}' +
    '.mc-rd-tx b{display:block;font:1000 17px Nunito,sans-serif}' +
    '.mc-rd-tx span{display:block;font:800 13.5px Nunito,sans-serif;color:#FF9600}' +
    '.mc-rd.hecho .mc-rd-tx span{color:#58CC02}' +
    '.mc-rd-chev{width:22px;height:22px;flex:none;stroke:#9a9a9a;transition:transform .25s}' +
    '.mc-rd.abierto .mc-rd-chev{transform:rotate(180deg)}' +
    '.mc-rd-cuerpo{display:grid;grid-template-rows:0fr;transition:grid-template-rows .3s ease}' +
    '.mc-rd.abierto .mc-rd-cuerpo{grid-template-rows:1fr}' +
    '.mc-rd-in{min-height:0;overflow:hidden;padding:0 14px}' +
    '.mc-rd.abierto .mc-rd-in{padding-bottom:16px}' +
    '.mc-rd-in p{font:700 14px Nunito,sans-serif;color:#9a9a9a;margin:0 0 4px}' +
    '.mc-rd-tm{display:flex;align-items:center;gap:12px;padding:10px 12px;border:2px solid #262626;border-radius:14px;margin-top:8px}' +
    '.mc-rd-tm i{width:12px;height:12px;border-radius:50%;flex:none;background:var(--c)}' +
    '.mc-rd-tm b{flex:1;min-width:0;font:900 15px Nunito,sans-serif}' +
    '.mc-rd-tm small{display:block;color:#9a9a9a;font:700 12.5px Nunito,sans-serif}' +
    '.mc-rd-tm em{font:1000 13px Nunito,sans-serif;font-style:normal;color:#FF4B4B;background:rgba(255,75,75,.13);padding:3px 9px;border-radius:9px;white-space:nowrap}' +
    '.mc-rd-btn{display:block;margin-top:14px;text-align:center;background:#FF9600;color:#111;text-decoration:none;font:1000 16px Nunito,sans-serif;letter-spacing:.06em;text-transform:uppercase;padding:13px;border-radius:16px;box-shadow:0 5px 0 #c97200;transition:transform .08s,box-shadow .08s}' +
    '.mc-rd-btn:active{transform:translateY(4px);box-shadow:0 1px 0 #c97200}';
  document.head.appendChild(st);

  var ICO = {
    mira: '<svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.6" stroke-linecap="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="4.5" fill="#111"/></svg>',
    ok: '<svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    chev: '<svg class="mc-rd-chev" viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'
  };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function plural(n, a, b) { return n + ' ' + (n === 1 ? a : b); }
  function hechoHoy() {
    try { return localStorage.getItem('mc_repaso_dia') === String(MCProgreso.inicioHoy().getTime()); } catch (e) { return false; }
  }

  var caja = null;
  function pintar(lista, reg) {
    var r = MCProgreso.repasoDia(lista, 10);
    if (!r.refs.length) { if (caja) caja.hidden = true; return; }
    var cursos = {}, area = {};
    ((reg && reg.cursos) || []).forEach(function (c) { cursos[c.id] = c.nombre; area[c.id] = c.area; });
    var hecho = hechoHoy(), n = r.refs.length;
    if (!caja) {
      caja = document.createElement('div');
      ancla.insertAdjacentElement('afterend', caja);
    }
    caja.hidden = false;
    caja.className = 'mc-rd' + (hecho ? ' hecho' : '');
    caja.innerHTML =
      '<button type="button" class="mc-rd-cab" aria-expanded="false" aria-controls="mcRdCuerpo">' +
        '<span class="mc-rd-ic">' + (hecho ? ICO.ok : ICO.mira) + '</span>' +
        '<span class="mc-rd-tx"><b>Tu repaso de hoy</b><span>' +
          (hecho ? 'Hecho. Puedes repetirlo si quieres' : plural(n, 'pregunta', 'preguntas') + ' · ' + plural(r.temas.length, 'tema', 'temas')) +
        '</span></span>' + ICO.chev +
      '</button>' +
      '<div class="mc-rd-cuerpo" id="mcRdCuerpo"><div class="mc-rd-in">' +
        '<p>Elegidas de lo que más te cuesta, según tus falladas.</p>' +
        r.temas.map(function (t) {
          var curso = cursos[t.carpeta] || t.carpeta;
          return '<div class="mc-rd-tm" style="--c:' + (COLOR[area[t.carpeta]] || '#FFC800') + '"><i></i><b>' + esc(t.titulo || curso) +
            '<small>' + esc(curso) + '</small></b><em>' + plural(t.n, 'fallada', 'falladas') + '</em></div>';
        }).join('') +
        '<a class="mc-rd-btn" href="' + BASE + 'falladas.html?dia=1">' + (hecho ? 'Repetir mi repaso' : 'Hacer mi repaso') + '</a>' +
      '</div></div>';
    var cab = caja.querySelector('.mc-rd-cab');
    cab.addEventListener('click', function () {
      var ab = caja.classList.toggle('abierto');
      cab.setAttribute('aria-expanded', ab ? 'true' : 'false');
    });
  }

  function cargar() {
    if (!window.MCProgreso || !MCProgreso.repasoDia) { if ((cargar.k = (cargar.k || 0) + 1) < 100) setTimeout(cargar, 150); return; }
    if (!MCAuth.usuario()) { if (caja) caja.hidden = true; return; }
    var reg = fetch(BASE + 'assets/cursos.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    Promise.all([MCProgreso.cargar(), reg]).then(function (x) { pintar(x[0].falladas, x[1]); }, function () {});
  }

  if (window.MCAuth) {
    MCAuth.alCambiar(function () { cargar.k = 0; cargar(); });
    MCAuth.listo.then(cargar, function () {});
  }
})();
