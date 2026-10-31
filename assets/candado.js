/* =========================================================
   Modo Cachimbo · Candados de los paquetes
   - Página completa: <script src="../assets/candado.js" data-producto="area-matematica" data-nombre="Matemática"></script>
     Tapa la página hasta que el alumno tenga un código que la abra
     (por si entra con un link directo: afuera la tarjeta ya lleva el candado).
   - Sin data-producto solo deja window.MCCandado para poner candados afuera:
       MCCandado.marcar(tarjeta, 'simulacro', { nombre: 'Simulacro' })
     La tarjeta lleva la cinta «CON CÓDIGO» y al tocarla sube la hoja para poner el código.
   Paquetes (assets/acceso.js): general · area-<área> · seminario-VIP · vocabulario-VIP · biblioteca-VIP · TODO-VIP
   Requiere assets/mc-config.js y assets/acceso.js
   ========================================================= */
(function () {
  var yo = document.currentScript;
  // Sin assets/acceso.js nuevo (caché vieja) no hace nada
  if (!window.MCAcceso || !MCAcceso.puerta) return;

  var WA_NUM = '51917797543';
  var CANDADO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="mck-arco" d="M7.5 10.5V7.8a4.5 4.5 0 0 1 9 0v2.7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><rect x="4" y="10" width="16" height="11.5" rx="3" fill="currentColor"/><circle cx="12" cy="15.2" r="1.7" fill="#2a1a00"/><path d="M12 15.8v2.4" stroke="#2a1a00" stroke-width="1.8" stroke-linecap="round"/></svg>';
  var CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // Qué paquete abre cada candado y qué trae
  function paquete(x) {
    x = MCAcceso.puerta(x);
    var cat = x.split('-')[0];
    if (cat === 'seminario' || cat === 'banqueo') return {
      nombre: 'Seminarios + Banqueo', color: '#FF9600',
      incluye: ['Seminarios de todos los cursos', 'Banqueo de preguntas por tema', 'Se suma a tu acceso general']
    };
    if (cat === 'biblioteca') return {
      nombre: 'Biblioteca', color: '#C6E000',
      incluye: ['Todos los libros de la Biblioteca', 'Léelos aquí mismo y sigue donde te quedaste', 'Se suma a los otros códigos que tengas']
    };
    if (cat === 'vocabulario') return {
      nombre: 'Vocabulario', color: '#CE82FF',
      incluye: ['Vocabulario de todos los cursos', 'Práctica con tarjetas y sonido']
    };
    return {
      nombre: 'Acceso general', color: '#FFC800',
      incluye: ['Las 4 áreas: práctica, Repaso, Fijas, Libros y Flashcards', 'Simulacro con ranking', 'Duelos en vivo', 'Exámenes de admisión']
    };
  }

  function fuente() {
    if (document.getElementById('mck-fuente') || document.querySelector('link[href*="Barlow+Condensed:ital,wght@0,600;0,700;0,800;1,800;1,900"]')) return;
    var l = document.createElement('link'); l.id = 'mck-fuente'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@1,800;1,900&family=Nunito:wght@700;800;900&display=swap';
    document.head.appendChild(l);
  }
  var BC = "'Barlow Condensed','Arial Narrow',sans-serif", NU = "Nunito,Inter,system-ui,sans-serif";
  function css() {
    if (document.getElementById('mck-css')) return;
    fuente();
    var st = document.createElement('style'); st.id = 'mck-css';
    st.textContent =
      /* Tarjeta con candado */
      '.mck-cerrado{position:relative!important}' +
      '.mck-cerrado::after{content:"";position:absolute;inset:0;z-index:3;pointer-events:none;border-radius:inherit;' +
        'background:repeating-linear-gradient(-45deg,rgba(11,8,24,.5) 0 10px,rgba(11,8,24,.62) 10px 20px)}' +
      '.mck-cerrado>*:not(.mck-cinta){filter:saturate(.45)}' +
      '.mck-cinta{position:absolute;z-index:4;top:8px;right:-4px;display:flex;align-items:center;gap:5px;padding:5px 12px 5px 9px;' +
        'transform:skewX(-12deg);background:linear-gradient(90deg,#FFC800,#FF9600);color:#2a1a00!important;' +
        'font:italic 900 13px/1 ' + BC + '!important;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap;' +
        'box-shadow:0 3px 0 #b36200,0 6px 14px rgba(0,0,0,.45);pointer-events:none}' +
      '.mck-cinta>*{transform:skewX(12deg)}' +
      // :is(#…) le gana a la regla de Nunito con !important de cada página
      ':is(#mck-z,.mck-cinta),:is(#mck-z,.mck-cinta) *{font-family:' + BC + '!important;font-style:italic!important;font-weight:900!important}' +
      ':is(#mck-z,.mck-btxt){font-family:' + BC + '!important;font-style:italic;font-weight:900;font-size:1.15em;letter-spacing:.04em;text-transform:uppercase}' +
      ':is(#mck-z,.mck-cinta) svg{position:static!important;inset:auto!important;width:14px!important;height:14px!important;display:block!important;opacity:1!important;margin:0!important;transform:none!important}' +
      ':is(#mck-z,.mck-cinta){display:flex!important;flex-direction:row!important;align-items:center!important;width:auto!important;max-width:none!important;margin:0!important}' +
      ':is(#mck-z,.mck-cinta)>span{display:block;margin:0!important}' +
      /* En las tarjetas grandes del inicio la cinta va abajo, donde no tapa el título */
      '.juego.mck-cerrado .mck-cinta{top:auto;bottom:14px;right:auto;left:-4px;padding:6px 13px 6px 11px;font-size:15px!important}' +
      ':is(#mck-z,.juego) .mck-cinta svg{width:17px!important;height:17px!important}' +
      // La de la Biblioteca es baja: solo el candado, arriba a la derecha, sin tapar el título
      '.juego.j-bib.mck-cerrado .mck-cinta{top:8px;bottom:auto;left:auto;right:-4px;padding:6px 10px}.juego.j-bib .mck-cinta>span{display:none!important}' +
      '.mck-cerrado .chip{visibility:hidden}' +
      '.mck-cinta.ok{background:linear-gradient(90deg,#58CC02,#2FA84F);color:#06260a!important;box-shadow:0 3px 0 #1f7a2e,0 6px 14px rgba(0,0,0,.45)}' +
      '.mck-cinta.ok .mck-arco{transform:translateY(-3px) rotate(-18deg);transform-origin:16.5px 10px}' +
      '.mck-cinta.chica{top:6px;right:6px;padding:4px 7px;font-size:11px!important}' +
      '.mck-cinta.chica span{display:none}' +
      '.mck-btxt{display:inline-flex;align-items:center;gap:6px}.mck-btxt svg{width:15px;height:15px}' +
      '.mck-cerrado .btn{background:linear-gradient(90deg,#FFC800,#FF9600)!important;color:#2a1a00!important;border-color:#b36200!important;position:relative;z-index:5}' +
      '.mck-cerrado>.btn,.mck-cerrado .btn{filter:none!important}' +
      /* Hoja para poner el código */
      '#mckFondo{position:fixed;inset:0;z-index:9500;display:flex;align-items:flex-end;justify-content:center;background:rgba(5,3,14,.72);' +
        'backdrop-filter:blur(3px);opacity:0;transition:opacity .2s}' +
      '#mckFondo.show{opacity:1}' +
      '#mckFondo.pagina{position:fixed;align-items:flex-start;background:#0B0818;overflow-y:auto;padding:60px 16px 30px;backdrop-filter:none}' +
      '#mckFondo *{box-sizing:border-box;font-family:' + NU + '!important}' +
      '#mckHoja{position:relative;width:100%;max-width:440px;margin:0 auto;padding:30px 22px 22px;border-radius:24px 24px 0 0;background:#151127;' +
        'border:2px solid #2A2346;border-bottom:0;color:#f2f0ff;text-align:center;transform:translateY(40px);transition:transform .25s cubic-bezier(.2,1.3,.4,1);overflow:hidden}' +
      '#mckFondo.show #mckHoja{transform:none}' +
      '#mckFondo.pagina #mckHoja{border-radius:24px;border-bottom:2px solid #2A2346}' +
      '#mckHoja::before{content:"";position:absolute;left:0;right:0;top:0;height:8px;background:repeating-linear-gradient(-45deg,var(--kc) 0 12px,#1b1300 12px 24px)}' +
      '@media (min-width:700px){#mckFondo{align-items:center}#mckHoja{border-radius:24px;border-bottom:2px solid #2A2346}}' +
      '#mckHoja .mck-x{position:absolute;top:16px;right:14px;width:34px;height:34px;border:0;border-radius:10px;background:#221c3c;color:#a59fc4;font-size:18px;cursor:pointer}' +
      '#mckHoja .mck-ico{width:84px;height:84px;margin:6px auto 14px;display:grid;place-items:center;border-radius:24px;color:var(--kc);' +
        'background:radial-gradient(circle at 50% 35%,rgba(255,200,0,.22),rgba(255,200,0,.05) 70%);border:2px solid rgba(255,200,0,.25);animation:mck-bote 2.4s ease-in-out infinite}' +
      '#mckHoja .mck-ico{background:radial-gradient(circle at 50% 35%,color-mix(in srgb,var(--kc) 22%,transparent),color-mix(in srgb,var(--kc) 5%,transparent) 70%);border-color:color-mix(in srgb,var(--kc) 25%,transparent)}' +
      // En su página el candado lleva el color del área (assets/areas.css), aunque llegue después
      'html[data-area] #mckFondo.pagina #mckHoja{--kc:var(--ac)!important}' +
      '#mckHoja .mck-ico svg{width:46px;height:46px;filter:drop-shadow(0 4px 0 rgba(0,0,0,.35))}' +
      '#mckHoja .mck-arco{transition:transform .35s cubic-bezier(.2,1.6,.4,1)}' +
      '#mckHoja.abierto .mck-ico{color:#58CC02;border-color:rgba(88,204,2,.4);background:radial-gradient(circle at 50% 35%,rgba(88,204,2,.25),rgba(88,204,2,.05) 70%);animation:none}' +
      '#mckHoja.abierto .mck-arco{transform:translateY(-4px) rotate(-22deg);transform-origin:16.5px 10px}' +
      '@keyframes mck-bote{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}' +
      '#mckHoja .mck-paq{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:999px;background:rgba(255,255,255,.06);' +
        'color:var(--kc);font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}' +
      '#mckHoja h2{margin:10px 0 4px;font:italic 900 32px/1 ' + BC + '!important;text-transform:uppercase;letter-spacing:.01em;color:#fff}' +
      '#mckHoja h2 span{color:var(--kc)}' +
      '#mckHoja h2 *,#mckHoja .mck-btn *{font-family:' + BC + '!important;font-style:italic!important;font-weight:900!important}' +
      '#mckHoja .mck-sub{margin:0 0 16px;color:#a59fc4;font-size:14px;font-weight:700;line-height:1.45}' +
      '#mckHoja ul{list-style:none;margin:0 0 18px;padding:12px 14px;border-radius:16px;background:#0f0b1e;border:2px solid #241e3e;text-align:left;display:grid;gap:8px}' +
      '#mckHoja li{display:flex;gap:9px;align-items:flex-start;font-size:14px;font-weight:800;color:#dcd8f0;line-height:1.35}' +
      '#mckHoja li svg{flex:none;width:18px;height:18px;margin-top:1px;color:#58CC02}' +
      '#mckHoja input{width:100%;padding:14px;border-radius:14px;border:2px solid #322b54;background:#1d1834;color:#fff;font-size:17px;font-weight:900;' +
        'text-align:center;letter-spacing:.12em;text-transform:uppercase;outline:none}' +
      '#mckHoja input::placeholder{color:#6b6490;letter-spacing:.04em;text-transform:none;font-weight:700}' +
      '#mckHoja input:focus{border-color:var(--kc)}' +
      '#mckHoja .mck-btn{width:100%;margin-top:12px;padding:14px;border:0;border-radius:14px;background:var(--kc);color:#1b1300;cursor:pointer;' +
        'font:italic 900 22px/1 ' + BC + '!important;text-transform:uppercase;letter-spacing:.04em;box-shadow:0 4px 0 rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;gap:8px}' +
      '#mckHoja .mck-btn svg{width:20px;height:20px}' +
      '#mckHoja .mck-btn:active{transform:translateY(3px);box-shadow:0 1px 0 rgba(0,0,0,.35)}' +
      '#mckHoja .mck-btn:disabled{opacity:.6}' +
      '#mckHoja .mck-err{display:none;margin-top:12px;padding:10px 12px;border-radius:12px;background:rgba(255,75,75,.1);color:#ff8a8a;font-size:13px;font-weight:800;line-height:1.45}' +
      '#mckHoja .mck-err.ok{background:rgba(88,204,2,.12);color:#7be03a}' +
      '#mckHoja .mck-wa{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:12px;padding:12px;border-radius:14px;' +
        'background:rgba(37,211,102,.1);border:2px solid rgba(37,211,102,.25);color:#25D366;text-decoration:none;font-size:14px;font-weight:900}' +
      '#mckHoja .mck-wa svg{width:18px;height:18px}' +
      '#mckHoja .mck-luego{display:inline-block;margin-top:14px;padding:6px;border:0;background:none;color:#8a84ad;font-size:14px;font-weight:800;text-decoration:none;cursor:pointer}' +
      'html.mc-cerrado body>*:not(#mckFondo){visibility:hidden}';
    document.head.appendChild(st);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var WA_ICO = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.05 2a9.9 9.9 0 0 0-8.5 15l-1.4 5 5.1-1.3A9.9 9.9 0 1 0 12.05 2zm5.8 14.1c-.25.7-1.44 1.33-2 1.41-.52.08-1.16.11-1.87-.12a17 17 0 0 1-1.69-.63c-2.98-1.29-4.93-4.29-5.08-4.49-.14-.2-1.21-1.62-1.21-3.08s.77-2.18 1.04-2.48c.27-.3.59-.37.79-.37h.57c.18 0 .43-.07.67.51.25.6.85 2.07.92 2.22.07.15.12.32.02.52-.1.2-.15.33-.3.5-.15.17-.32.39-.45.52-.15.15-.3.31-.13.61.17.3.77 1.28 1.66 2.07 1.14 1.02 2.1 1.33 2.4 1.48.3.15.48.13.65-.07.17-.2.74-.87.94-1.17.2-.3.4-.25.67-.15.27.1 1.73.82 2.03.97.3.15.5.22.57.35.08.12.08.71-.17 1.41z"/></svg>';

  // El color de la página: el de su área (la de la página o la del curso) o, si no tiene, su color propio (--accent)
  var COLOR_AREA = { 'matematica': '#1CB0F6', 'ciencia-tecnologia': '#C6E000', 'comunicacion': '#CE82FF', 'ciencias-sociales': '#FF9600' };
  function colorPagina(producto, def) {
    var cs = getComputedStyle(document.documentElement);
    var ac = document.documentElement.hasAttribute('data-area') && cs.getPropertyValue('--ac').trim();
    if (ac) return ac;
    var curso = /^[a-z]+-(.+)$/.exec(producto || ''), area = null;
    if (curso) Object.keys(MCAcceso.AREAS).forEach(function (a) { if (a === curso[1] || MCAcceso.AREAS[a].indexOf(curso[1]) >= 0) area = a; });
    return COLOR_AREA[area] || cs.getPropertyValue('--accent').trim() || def;
  }

  /* ---- La hoja: el candado, lo que trae el paquete y la cajita del código ----
     op: { nombre, pagina (página completa, sin «Ahora no»), volver, alAbrir } */
  function hoja(producto, op) {
    op = op || {};
    css();
    var p = paquete(producto), viejo = document.getElementById('mckFondo');
    var color = op.pagina ? colorPagina(producto, p.color) : p.color;
    if (viejo) viejo.remove();
    var wa = 'https://wa.me/' + WA_NUM + '?text=' + encodeURIComponent('¡Hola! Quiero el paquete ' + p.nombre + ' de Modo Cachimbo' + (op.nombre ? ' (para ' + op.nombre + ')' : '') + ' 🎓');
    var f = document.createElement('div'); f.id = 'mckFondo'; if (op.pagina) f.className = 'pagina';
    f.innerHTML = '<div id="mckHoja" role="dialog" aria-modal="true" aria-labelledby="mckTit" style="--kc:' + esc(color) + '">' +
      (op.pagina ? '' : '<button class="mck-x" type="button" aria-label="Cerrar">✕</button>') +
      '<div class="mck-ico">' + CANDADO + '</div>' +
      '<span class="mck-paq">Incluido en ' + esc(p.nombre) + '</span>' +
      '<h2 id="mckTit">Desbloquea <span>' + esc(op.nombre || p.nombre) + '</span></h2>' +
      '<p class="mck-sub">Ingresa tu código de alumno para entrar.</p>' +
      '<ul>' + p.incluye.map(function (t) { return '<li>' + CHECK + '<span>' + esc(t) + '</span></li>'; }).join('') + '</ul>' +
      '<input type="text" id="mckCod" placeholder="Ej.: MC-7K3P-Q9XR" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Código de acceso">' +
      '<button class="mck-btn" type="button" id="mckBtn">' + CANDADO + '<span>Desbloquear</span></button>' +
      '<div class="mck-err" id="mckErr" role="status"></div>' +
      '<a class="mck-wa" href="' + wa + '" target="_blank" rel="noopener noreferrer">' + WA_ICO + 'Pide tu código por WhatsApp</a>' +
      (op.pagina ? '<a class="mck-luego" href="' + esc(op.volver || '../index.html') + '">Volver</a>' : '<button class="mck-luego" type="button" data-x>Ahora no</button>') +
      '</div>';
    document.body.appendChild(f);
    requestAnimationFrame(function () { f.classList.add('show'); });
    var caja = f.querySelector('#mckHoja'), inp = f.querySelector('#mckCod'), btn = f.querySelector('#mckBtn'), err = f.querySelector('#mckErr');
    function cerrar() { f.classList.remove('show'); setTimeout(function () { f.remove(); }, 200); }
    if (!op.pagina) {
      f.addEventListener('click', function (e) { if (e.target === f || e.target.closest('.mck-x,[data-x]')) cerrar(); });
      setTimeout(function () { inp.focus(); }, 80);
    }
    function aviso(t, ok) { err.textContent = t; err.className = 'mck-err' + (ok ? ' ok' : ''); err.style.display = 'block'; }
    function probar() {
      var cod = inp.value.trim().toUpperCase();
      if (!cod) { aviso('Escribe tu código.'); inp.focus(); return; }
      btn.disabled = true; btn.lastChild.textContent = 'Verificando…';
      if (window.MCSonido && MCSonido.toque) try { MCSonido.toque(); } catch (e) {}
      MCAcceso.activar(cod, producto).then(function (r) {
        if (!r.ok) { aviso(r.mensaje || 'Código inválido.'); return; }
        caja.classList.add('abierto');
        aviso(r.mensaje || '¡Listo! Ya puedes entrar.', true);
        btn.lastChild.textContent = '¡Desbloqueado!';
        setTimeout(function () { cerrar(); if (op.alAbrir) op.alAbrir(); }, 1100);
      }).catch(function () { aviso('No se pudo verificar el código. Revisa tu conexión e inténtalo otra vez.'); })
        .then(function () { if (!caja.classList.contains('abierto')) { btn.disabled = false; btn.lastChild.textContent = 'Desbloquear'; } });
    }
    btn.addEventListener('click', probar);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') probar(); });
    return { aviso: aviso, cerrar: cerrar };
  }

  /* ---- Candado afuera, en la tarjeta que lleva a la página ----
     op: { nombre, chica (cinta solo con el candado), alAbrir } */
  var revisados = {};
  function marcar(el, producto, op) {
    if (!el) return;
    op = op || {};
    css();
    var x = MCAcceso.puerta(producto);
    var cinta = el.querySelector(':scope > .mck-cinta');
    var link = op.link || (el.matches('a[href]') ? el : null);
    // El botón «Entrar» de la tarjeta dice «Desbloquear» mientras tenga candado
    var boton = link && link !== el && link.classList.contains('btn') ? link : null;
    if (boton && boton.__txt == null) boton.__txt = boton.innerHTML;
    function pintar(cerrado) {
      el.classList.toggle('mck-cerrado', cerrado);
      if (boton) { boton.innerHTML = cerrado ? '<span class="mck-btxt">' + CANDADO + 'Desbloquear</span>' : boton.__txt; }
      if (cerrado && !cinta) {
        cinta = document.createElement('b'); cinta.className = 'mck-cinta' + (op.chica ? ' chica' : '');
        cinta.innerHTML = CANDADO + '<span>Con código</span>';
        el.appendChild(cinta);
      } else if (!cerrado && cinta && !cinta.classList.contains('ok')) { cinta.remove(); cinta = null; }
    }
    function abierto() {
      if (!cinta) return;
      el.classList.remove('mck-cerrado');
      cinta.classList.add('ok'); cinta.lastChild.textContent = '✓ Activo';
      setTimeout(function () { if (cinta) { cinta.remove(); cinta = null; } }, 2200);
    }
    pintar(!MCAcceso.accesoLocal(x));
    // Con códigos en el equipo (o recién traídos de la cuenta): se confirma con el servidor una vez por página
    if (el.classList.contains('mck-cerrado') && MCAcceso.activos().length) {
      (revisados[x] = revisados[x] || MCAcceso.verificar(x)).then(function (v) { if (v && v.acceso) pintar(false); });
    }
    if (el.__mck) return;
    el.__mck = true;
    el.addEventListener('click', function (e) {
      if (!el.classList.contains('mck-cerrado')) return;
      e.preventDefault(); e.stopImmediatePropagation();
      // Puede estar abierto para todos desde el panel, o el código vino de la cuenta
      var h = hoja(producto, { nombre: op.nombre, alAbrir: function () { abierto(); if (boton) boton.innerHTML = boton.__txt; if (op.alAbrir) op.alAbrir(); } });
      MCAcceso.verificar(x).then(function (v) {
        if (v && v.acceso) { h.cerrar(); pintar(false); if (op.alAbrir) op.alAbrir(); else if (link) location.href = link.href; else el.click(); }
      });
    }, true);
  }

  /* ---- Qué candado tiene cada link del sitio ---- */
  var RAIZ = '';
  try { RAIZ = new URL('..', yo.src).pathname; } catch (e) {}
  var CURSOS = {};
  Object.keys(MCAcceso.AREAS).forEach(function (a) { MCAcceso.AREAS[a].forEach(function (c) { CURSOS[c] = 1; }); });
  function destino(href) {
    var u; try { u = new URL(href, location.href); } catch (e) { return null; }
    if (u.origin !== location.origin || !RAIZ || u.pathname.indexOf(RAIZ) !== 0) return null;
    var r = u.pathname.slice(RAIZ.length), q = function (k) { return u.searchParams.get(k) || ''; }, m;
    if ((m = /^areas\/([a-z-]+)\.html$/.exec(r)) && MCAcceso.AREAS[m[1]]) return 'area-' + m[1];
    if (r === 'simulacro.html') return 'simulacro';
    if (r === 'duelo.html') return 'duelo';
    if (r === 'biblioteca.html') return 'biblioteca';
    if (/^examenes\//.test(r)) return 'examenes';
    if (r === 'tarjetas.html') return CURSOS[q('curso')] ? 'tarjetas-' + q('curso') : null;
    if (r === 'repaso-mixto.html') return MCAcceso.AREAS[q('area')] ? 'area-' + q('area') : 'area-matematica';
    if (r === 'vocabulario.html') return 'vocabulario-' + (q('curso') || 'raz-verbal');
    if ((m = /^([a-z-]+)\/(seminarios|banqueo)\//.exec(r)) && CURSOS[m[1]]) return (m[2] === 'banqueo' ? 'banqueo-' : 'seminario-') + m[1];
    if ((m = /^([a-z-]+)\//.exec(r)) && CURSOS[m[1]]) return 'curso-' + m[1];
    return null;
  }
  // Pone la cinta en las tarjetas (selector) y cuida todos los links con candado de la página
  function vigilar(op) {
    op = op || {};
    css();
    function decorar() {
      if (!op.cintas) return;
      // Tarjetas que dejaron de llevar a una página (p. ej. «Próximamente»): sin candado
      Array.prototype.forEach.call(document.querySelectorAll('.mck-cerrado'), function (el) {
        var a = el.matches('a[href]') ? el : el.querySelector('a[href]');
        if (el.matches(op.cintas) && (a || el.getAttribute('data-candado'))) return;
        el.classList.remove('mck-cerrado');
        var c = el.querySelector(':scope > .mck-cinta'); if (c) c.remove();
      });
      Array.prototype.forEach.call(document.querySelectorAll(op.cintas), function (el) {
        var a = el.matches('a[href]') ? el : el.querySelector('a[href]');
        var x = el.getAttribute('data-candado') || (a && destino(a.href));
        if (!x || (el.__mck && el.__mckX === x)) return;
        el.__mckX = x;
        var b = el.querySelector('b, h3');
        marcar(el, x, { nombre: el.getAttribute('data-candado-nombre') || (b ? b.textContent.trim() : ''), chica: el.matches(op.chicas || '_'), link: a });
      });
    }
    decorar();
    var t = 0;
    new MutationObserver(function () { clearTimeout(t); t = setTimeout(decorar, 60); }).observe(document.body, { childList: true, subtree: true });
    // Cualquier otro link con candado (los de texto, «¡A practicar!»…) también pide el código
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || a.closest('.mck-cerrado') || e.defaultPrevented) return;
      var x = destino(a.href);
      if (!x || MCAcceso.accesoLocal(x)) return;
      e.preventDefault();
      var nom = a.querySelector('b'), ir = function () { location.href = a.href; };
      var h = hoja(x, { nombre: nom ? nom.textContent.trim() : '', alAbrir: ir });
      MCAcceso.verificar(x).then(function (v) { if (v && v.acceso) { h.cerrar(); ir(); } });
    }, true);
  }

  window.MCCandado = { marcar: marcar, hoja: hoja, paquete: paquete, vigilar: vigilar, destino: destino, svg: CANDADO };

  /* ---- Página completa ---- */
  var PRODUCTO = yo && yo.getAttribute('data-producto');
  if (!PRODUCTO) return;
  var NOMBRE = (yo.getAttribute('data-nombre') || '') + (yo.getAttribute('data-curso') ? ' de ' + yo.getAttribute('data-curso') : '');
  var VOLVER = yo.getAttribute('data-volver') || '../index.html';
  var raiz = document.documentElement, listo = false;
  function abrir() {
    listo = true; raiz.classList.remove('mc-cerrado');
    var f = document.getElementById('mckFondo'); if (f) f.remove();
  }
  var pantalla = null;
  function cerrar(msg) {
    raiz.classList.add('mc-cerrado');
    if (!document.getElementById('mckFondo')) pantalla = hoja(PRODUCTO, { nombre: NOMBRE, pagina: true, volver: VOLVER, alAbrir: abrir });
    if (msg && pantalla) pantalla.aviso(msg);
  }
  // Sin esperar al servidor: si este dispositivo ya tenía acceso, la página se ve al toque
  var local = MCAcceso.accesoLocal(PRODUCTO);
  if (!local) { css(); raiz.classList.add('mc-cerrado'); }
  function iniciar() {
    if (!local) cerrar();
    MCAcceso.verificar(PRODUCTO).then(function (v) {
      if (v.acceso) { if (!listo) abrir(); }
      else cerrar(v.mensaje || (v.error === 'conexion' ? 'No se pudo verificar tu acceso. Revisa tu conexión.' : ''));
    });
  }
  if (document.body) iniciar(); else document.addEventListener('DOMContentLoaded', iniciar);
})();
