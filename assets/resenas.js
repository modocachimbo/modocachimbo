/* =========================================================
   Modo Cachimbo · Reseñas de la app
   - Slider de reseñas publicadas: en la bienvenida (sin sesión, estilo
     redondeado) y en el inicio (estilo juego). Las tarjetas salen de
     resenas_publicas() (supabase/46-resenas.sql); sin reseñas publicadas
     la sección no se muestra en la bienvenida.
       MCResenas.slider(el, { estilo: 'bv' | 'juego', pie: html junto a las flechas })
     el lleva dentro .rs-prom (promedio, opcional) y .rs-cuerpo (tarjetas).
   - Formulario «Tu reseña» del perfil: estrellas, texto (20 a 280 letras)
     y un aviso de que salen su apodo, foto e ID. Queda pendiente hasta que un
     admin la publica desde el panel → Reseñas.
       MCResenas.formulario(el)
   - MCResenas.tarjeta(r, estilo): una tarjeta suelta (la vista previa del panel).
   ========================================================= */
(function () {
  if (window.MCResenas) return;
  var MIN = 20, MAX = 280;
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function estrellas(n, cls) {
    var s = '';
    for (var i = 1; i <= 5; i++) s += '<i class="' + (i <= n ? 'on' : '') + '">★</i>';
    return '<span class="rs-est' + (cls ? ' ' + cls : '') + '" role="img" aria-label="' + n + ' de 5 estrellas">' + s + '</span>';
  }
  // Color de la tarjeta: el del rango que tenía al enviarla (assets/rango.js; la tabla
  // depende de esa semana); sin rango, lima
  function rango(xp, semana) {
    var R = window.MCRango, n = R ? R.nivel(xp, semana || undefined) : -1;
    return n < 0 ? null : { n: n, nom: R.nombre(n), c: R.color(n).c, img: R.svg(n, { mini: true }) };
  }
  // Foto con su marco (assets/tarjeta-perfil.js). Con sesión se toca para ver su tarjeta.
  function foto(r, conSesion) {
    var x = { apodo: r.apodo, foto: r.foto, avatar: r.avatar, marco: r.marco, fondo: r.fondo, codigo: conSesion ? r.codigo : null };
    if (window.MCTarjeta && MCTarjeta.foto) return MCTarjeta.foto(x, 'rs-av');
    var ini = esc((String(r.apodo || '?').trim()[0] || '?').toUpperCase());
    return '<span class="rs-av rs-av-sola">' + (/^https:\/\//.test(r.foto || '') ? '<img src="' + esc(r.foto) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : ini) + '</span>';
  }
  function tarjeta(r, estilo, conSesion) {
    var rg = rango(r.rango_xp, r.rango_semana);
    return '<article class="rs-card" style="--c:' + (rg ? rg.c : '#C6E000') + '">' + estrellas(r.estrellas) +
      '<p class="rs-tx">“' + esc(r.texto) + '”</p>' +
      '<div class="rs-yo">' + foto(r, conSesion) +
        '<span class="rs-nom"><b>' + esc(r.apodo || 'Cachimbo') + '</b>' + (rg ? '<small>' + rg.img + esc(rg.nom) + '</small>' : '<small>Cachimbo</small>') + '</span>' +
        (r.codigo ? '<span class="rs-id">#' + esc(r.codigo) + '</span>' : '') + '</div></article>';
  }

  /* ---------- Slider ---------- */
  function hoja() {
    if (document.querySelector('link[href*="resenas.css"]')) return;
    var s = document.currentScript || document.querySelector('script[src*="resenas.js"]');
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = (s && s.src ? s.src.replace(/resenas\.js(\?.*)?$/, '') : 'assets/') + 'resenas.css?v=2';
    document.head.appendChild(l);
  }

  var datos = null;
  function traer() {
    if (datos) return datos;
    if (!window.MCAuth) return Promise.reject(new Error('sin auth'));
    datos = MCAuth.listo.then(function (c) { return c.rpc('resenas_publicas'); }).then(function (r) {
      if (r.error) throw r.error;
      return r.data || { lista: [] };
    });
    datos.catch(function () { datos = null; });
    return datos;
  }

  function slider(el, op) {
    op = op || {};
    var estilo = op.estilo || 'juego';
    el.classList.add('rs', 'rs-' + estilo);
    traer().then(function (d) {
      var L = d.lista || [];
      var conSesion = !!(window.MCAuth && MCAuth.usuario());
      if (!L.length) {
        if (estilo === 'bv') { el.hidden = true; return; }
        el.hidden = false;
        el.querySelector('.rs-cuerpo').innerHTML = '<p class="rs-vacio">Aún no hay reseñas publicadas. ¡Sé el primero en contar cómo te va con Modo Cachimbo!</p>' +
          (op.pie ? '<div class="rs-pie">' + op.pie + '</div>' : '');
        return;
      }
      el.hidden = false;
      var prom = el.querySelector('.rs-prom');
      if (prom && d.promedio) prom.innerHTML = '<b>' + String(d.promedio).replace('.', ',') + '</b>' + estrellas(Math.round(d.promedio)) + '<span>' + d.total + (d.total === 1 ? ' reseña' : ' reseñas') + '</span>';
      el.querySelector('.rs-cuerpo').innerHTML =
        '<div class="rs-pista" tabindex="0" aria-label="Reseñas de alumnos">' + L.map(function (r) { return tarjeta(r, estilo, conSesion); }).join('') + '</div>' +
        '<div class="rs-pie"><div class="rs-nav"><button type="button" class="rs-flecha" data-rs="-1" aria-label="Anteriores">‹</button><span class="rs-puntos"></span><button type="button" class="rs-flecha" data-rs="1" aria-label="Siguientes">›</button></div>' + (op.pie || '') + '</div>';
      mover(el);
    }).catch(function () { el.hidden = true; });
  }

  // Flechas, puntos y avance solo (se detiene al tocar, al pasar el mouse o si no se ve)
  function mover(el) {
    var pista = el.querySelector('.rs-pista'), puntos = el.querySelector('.rs-puntos');
    var quieto = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var paso = function () { var c = pista.querySelector('.rs-card'); return c ? c.getBoundingClientRect().width + parseFloat(getComputedStyle(pista).columnGap || 0) : pista.clientWidth; };
    var paginas = function () { return Math.max(1, Math.round((pista.scrollWidth - pista.clientWidth) / paso()) + 1); };
    var actual = function () { return Math.round(pista.scrollLeft / paso()); };
    function pintar() {
      var n = paginas(), a = Math.min(actual(), n - 1);
      el.querySelector('.rs-nav').hidden = n < 2;
      if (puntos.children.length !== n) { var h = ''; for (var i = 0; i < n; i++) h += '<i></i>'; puntos.innerHTML = h; }
      Array.prototype.forEach.call(puntos.children, function (p, i) { p.className = i === a ? 'on' : ''; });
    }
    function ir(i) {
      var n = paginas();
      i = i < 0 ? n - 1 : i >= n ? 0 : i;
      pista.scrollTo({ left: i * paso(), behavior: quieto ? 'auto' : 'smooth' });
    }
    el.querySelector('.rs-nav').addEventListener('click', function (e) {
      var b = e.target.closest('[data-rs]'); if (!b) return;
      ir(actual() + +b.getAttribute('data-rs')); parar(8000);
    });
    var t = null; pista.addEventListener('scroll', function () { clearTimeout(t); t = setTimeout(pintar, 80); }, { passive: true });
    window.addEventListener('resize', pintar);
    pintar();
    if (quieto) return;
    var visible = true, pausa = 0;
    function parar(ms) { pausa = Date.now() + (ms || 6000); }
    ['pointerdown', 'touchstart', 'wheel', 'focusin'].forEach(function (ev) { pista.addEventListener(ev, function () { parar(10000); }, { passive: true }); });
    pista.addEventListener('mouseenter', function () { parar(60000); });
    pista.addEventListener('mouseleave', function () { parar(3000); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(pista);
    setInterval(function () {
      if (!visible || document.hidden || Date.now() < pausa || paginas() < 2) return;
      ir(actual() + 1);
    }, 6000);
  }

  /* ---------- Formulario del perfil ---------- */
  var ESTADO = {
    pendiente: ['pend', 'En revisión', 'El profe la revisará pronto. Te avisamos aquí cuando salga publicada.'],
    publicada: ['pub', 'Publicada', '¡Gracias! Tu reseña ya sale en la página de inicio de Modo Cachimbo.'],
    oculta: ['ocu', 'No publicada', 'Por ahora no se muestra. Puedes editarla y volverá a revisión.']
  };
  function formulario(el) {
    var mia = null, est = 0;
    el.innerHTML = '<p class="nota">Cargando…</p>';
    function msg(t, mal) { var m = el.querySelector('.rsf-msg'); if (m) { m.textContent = t || ''; m.className = 'rsf-msg' + (mal ? ' mal' : t ? ' ok' : ''); } }
    function pintar() {
      var e = mia && ESTADO[mia.estado];
      est = mia ? mia.estrellas : est;
      el.innerHTML =
        (e ? '<div class="rsf-estado ' + e[0] + '"><b>' + e[1] + '</b><span>' + e[2] + '</span></div>' : '') +
        '<div class="rsf-est" role="radiogroup" aria-label="Tu calificación">' + [1, 2, 3, 4, 5].map(function (n) {
          return '<button type="button" role="radio" data-e="' + n + '" aria-checked="' + (n === est) + '" aria-label="' + n + (n === 1 ? ' estrella' : ' estrellas') + '" class="' + (n <= est ? 'on' : '') + '">★</button>';
        }).join('') + '</div>' +
        '<textarea class="rsf-tx" maxlength="' + MAX + '" rows="4" placeholder="¿Qué es lo que más te sirve de Modo Cachimbo? ¿Qué mejorarías?">' + esc(mia ? mia.texto : '') + '</textarea>' +
        '<div class="rsf-cont"><span class="rsf-n"></span></div>' +
        '<p class="rsf-ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.5"/></svg><span>Tu apodo, tu foto de perfil y tu ID aparecerán junto a tu reseña.</span></p>' +
        '<div class="rsf-acc"><button type="button" class="btn-cel rsf-enviar">' + (mia ? 'Guardar cambios' : 'Enviar reseña') + '</button>' +
        (mia ? '<button type="button" class="rsf-borrar">Borrar</button>' : '') + '<span class="rsf-msg" role="status"></span></div>';
      contar();
    }
    function contar() {
      var n = el.querySelector('.rsf-tx').value.trim().length, c = el.querySelector('.rsf-n');
      c.textContent = n < MIN ? 'Faltan ' + (MIN - n) + ' letras' : n + '/' + MAX;
      c.className = 'rsf-n' + (n < MIN ? ' falta' : '');
    }
    el.addEventListener('input', function (e) { if (e.target.classList.contains('rsf-tx')) contar(); });
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-e]');
      if (b) {
        est = +b.getAttribute('data-e');
        Array.prototype.forEach.call(el.querySelectorAll('[data-e]'), function (x) { var n = +x.getAttribute('data-e'); x.classList.toggle('on', n <= est); x.setAttribute('aria-checked', n === est); });
        return;
      }
      if (e.target.closest('.rsf-enviar')) enviar(e.target.closest('.rsf-enviar'));
      if (e.target.closest('.rsf-borrar')) borrar(e.target.closest('.rsf-borrar'));
    });
    function enviar(btn) {
      var tx = el.querySelector('.rsf-tx').value.trim();
      if (!est) return msg('Elige de 1 a 5 estrellas.', true);
      if (tx.length < MIN) return msg('Escribe al menos ' + MIN + ' letras.', true);
      btn.disabled = true; msg('Enviando…');
      MCAuth.listo.then(function (c) { return c.rpc('guardar_resena', { p_estrellas: est, p_texto: tx, p_acepto: true }); }).then(function (r) {
        if (r.error) throw r.error;
        var cambio = !mia || mia.texto !== r.data.texto || mia.estrellas !== r.data.estrellas;
        mia = r.data; pintar();
        msg(cambio ? '¡Listo! Tu reseña quedó en revisión.' : 'No hubo cambios.');
      }).catch(function (er) {
        btn.disabled = false;
        var m = (er && er.message) || '';
        msg(/espera/.test(m) ? 'Espera unos segundos e intenta otra vez.' : /function|does not exist/i.test(m) ? 'Las reseñas aún no están activas. Intenta más tarde.' : 'No se pudo enviar. Revisa tu internet.', true);
      });
    }
    function borrar(btn) {
      if (btn.getAttribute('data-seguro') !== '1') { btn.setAttribute('data-seguro', '1'); btn.textContent = '¿Seguro? Toca otra vez'; return; }
      btn.disabled = true;
      MCAuth.listo.then(function (c) { return c.rpc('borrar_mi_resena'); }).then(function (r) {
        if (r.error) throw r.error;
        mia = null; est = 0; pintar(); msg('Tu reseña se borró.');
      }).catch(function () { btn.disabled = false; msg('No se pudo borrar.', true); });
    }
    MCAuth.listo.then(function (c) { return c.rpc('mi_resena'); }).then(function (r) {
      if (r.error) throw r.error;
      mia = r.data || null; pintar();
    }).catch(function (er) {
      el.innerHTML = '<p class="nota">' + (/function|does not exist/i.test((er && er.message) || '') ? 'Muy pronto podrás dejar tu reseña aquí.' : 'No se pudo cargar tu reseña. Revisa tu internet.') + '</p>';
    });
  }

  hoja();
  window.MCResenas = { slider: slider, formulario: formulario, tarjeta: function (r, estilo) { hoja(); return tarjeta(r, estilo || 'juego', false); }, estrellas: estrellas };
})();
