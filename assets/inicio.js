/* =========================================================
   Modo Cachimbo · Inicio (index.html)
   - Bienvenida sin sesión, código al primer ingreso y regreso a la página pedida.
   - Barra de arriba: corazones, racha y XP (corazones.js y racha.js) y la
     tarjeta del perfil con su rango de la semana (rango.js).
   - Escena del búho (assets/buho/buho-vivo.js): saluda, recuerda la meta del
     día, las fechas de la agenda y el evento de la temática.
   - Cursos populares (cursos_populares), Top de la semana (ranking_xp) y
     Top simulacro (ranking_simulacro).
   - Hoja que sube desde abajo: cursos, exámenes, flashcards y "Nuevo para ti".
   - Modo claro / oscuro (html[data-modo], se guarda en mc-modo).
   ========================================================= */
(function () {
  var raiz = document.documentElement;
  var CFG = window.MC_CONFIG || {};
  function $(id) { return document.getElementById(id); }
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function miles(n) { return (+n || 0).toLocaleString('es-PE').replace(/,/g, ' '); }
  function dec(n) { return (Math.round((+n || 0) * 10) / 10).toFixed(1); }
  function sonar(f) { if (window.MCSonido && MCSonido[f]) MCSonido[f](); }

  var MANO = '<svg class="mi mano" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 11V6a2 2 0 0 0-4 0"/><path d="M14 10V4a2 2 0 0 0-4 0v2"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-6-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>';
  var CHEV = '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';
  // Color del texto de cada rango (el mismo de assets/rango.js)
  var RC = ['#5FDAFF', '#5FF59A', '#D79BFF', '#FF6E84', '#FFC800'];
  // Fondo de la inicial en los tops
  var AV = ['#FFC800', '#C9C6D6', '#E58A45', '#1CB0F6', '#CE82FF', '#FF9600', '#58CC02', '#FF4B4B', '#5FDAFF', '#C6E000'];
  var AREA = { 'ciencia-tecnologia': 'var(--a-cyt)', matematica: 'var(--a-mat)', comunicacion: 'var(--a-com)', 'ciencias-sociales': 'var(--a-soc)' };

  var nombreAlumno = '';
  var cursosJson = fetch('assets/cursos.json').then(function (r) { return r.json(); });
  cursosJson.catch(function () {});
  // Copia guardada de cursos.json para armar "Mis cursos" en PC sin esperar la red
  var cursosGuardados = null;
  try { cursosGuardados = JSON.parse(localStorage.getItem('mc-cursos-json') || 'null'); } catch (e) {}
  cursosJson.then(function (d) { cursosGuardados = d; try { localStorage.setItem('mc-cursos-json', JSON.stringify(d)); } catch (e) {} }, function () {});

  /* ---------- Modo claro / oscuro ---------- */
  var temaBtn = $('temaBtn');
  function oscuro() { return raiz.getAttribute('data-modo') !== 'claro'; }
  function cambiarModo() {
    raiz.setAttribute('data-modo', oscuro() ? 'claro' : 'oscuro');
    try { localStorage.setItem('mc-modo', raiz.getAttribute('data-modo')); } catch (e) {}
    pintarModo();
  }
  function pintarModo() {
    var o = oscuro();
    temaBtn.innerHTML = '<svg class="ic"><use href="#i-' + (o ? 'sol' : 'luna') + '"/></svg>';
    temaBtn.setAttribute('aria-label', o ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    Array.prototype.forEach.call(document.querySelectorAll('.mcu-modo'), function (b) { var t = o ? 'Modo claro' : 'Modo oscuro'; if (b.textContent !== t) b.textContent = t; });
  }
  temaBtn.addEventListener('click', cambiarModo);
  pintarModo();

  /* ---------- Bienvenida, código al primer ingreso y regreso a la página pedida ---------- */
  var wa = 'https://wa.me/' + (CFG.WHATSAPP || '51917797543') + '?text=' + encodeURIComponent('Hola! Tengo problemas para entrar a Modo Cachimbo');
  $('bvWhatsapp').href = wa;
  var bvGoogle = $('bvGoogle'), bvMsg = $('bvMsg');
  bvGoogle.addEventListener('click', function () {
    bvGoogle.disabled = true;
    bvMsg.classList.remove('show');
    MCAuth.entrarGoogle().then(function (r) { if (r && r.error) throw r.error; }).catch(function () {
      bvGoogle.disabled = false;
      bvMsg.textContent = 'No se pudo abrir Google. Revisa tu conexión e inténtalo otra vez.';
      bvMsg.classList.add('show');
    });
  });

  // Solo rutas internas del sitio (evita mandar a otra web)
  function destino() {
    var v = new URLSearchParams(location.search).get('volver') || '';
    return /^[a-z0-9][a-z0-9\-\/._]*\.html(\?[a-z0-9=&%._\-]*)?$/i.test(v) && v.indexOf('..') < 0 ? v : '';
  }
  function seguir() {
    var d = destino();
    if (d) location.replace(d);
    else if (location.search) history.replaceState(null, '', location.pathname);
  }

  var fondo = $('codFondo'), input = $('codInput'), btn = $('codActivar'), msg = $('codMsg'), luego = $('codLuego');
  function cerrarCodigo() { fondo.classList.remove('show'); seguir(); }
  luego.addEventListener('click', cerrarCodigo);
  fondo.addEventListener('click', function (e) { if (e.target === fondo && luego.textContent === 'Cerrar') cerrarCodigo(); });
  function abrirCodigo() {
    $('codTitulo').textContent = 'Activa tu código';
    luego.textContent = 'Cerrar';
    input.value = ''; msg.className = 'cod-msg';
    fondo.classList.add('show');
    setTimeout(function () { input.focus(); }, 50);
  }
  $('salCodigo').addEventListener('click', abrirCodigo);
  // Desde Perfil · Mis accesos: index.html#codigo abre la ventana directo
  if (location.hash === '#codigo') { history.replaceState(null, '', location.pathname + location.search); abrirCodigo(); }
  async function activar() {
    var codigo = input.value.trim().toUpperCase();
    msg.className = 'cod-msg';
    if (!codigo) { msg.textContent = 'Escribe tu código.'; msg.className = 'cod-msg show error'; sonar('error'); return; }
    btn.disabled = true; btn.textContent = 'Verificando…';
    sonar('toque');
    try {
      var r = await MCAcceso.activar(codigo, '');
      if (r.ok) {
        msg.textContent = r.mensaje || '¡Código activado!'; msg.className = 'cod-msg show ok';
        pintarAccesos();
        sonar('abrir');
        setTimeout(cerrarCodigo, 1400);
      } else { msg.textContent = r.mensaje || 'Código inválido.'; msg.className = 'cod-msg show error'; sonar('error'); }
    } catch (e) {
      msg.textContent = 'No se pudo verificar. Revisa tu conexión.'; msg.className = 'cod-msg show error';
      sonar('error');
    }
    btn.disabled = false; btn.textContent = 'Activar código';
  }
  btn.addEventListener('click', activar);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') activar(); });

  function primeraVez(u) {
    var clave = 'mc_bienvenida_' + u.id, visto = false;
    try { visto = localStorage.getItem(clave) === '1'; localStorage.setItem(clave, '1'); } catch (e) { visto = true; }
    var tieneCodigo = window.MCAcceso && MCAcceso.activos().length > 0;
    return !visto && !tieneCodigo;
  }

  /* ---------- Accesos activos: botón del código y grupo de WhatsApp ---------- */
  function pintarAccesos() {
    var caja = $('salAccesos');
    var prods = (window.MCAcceso ? MCAcceso.activos() : []).map(function (a) { return a.producto; }).join(',').split(',');
    ['repaso-VIP', 'fijas-VIP'].forEach(function (p) {
      try { if (localStorage.getItem('unlocked_' + p) === '1' && prods.indexOf(p) < 0) prods.push(p); } catch (e) {}
    });
    prods = prods.filter(function (p, i) { return p && prods.indexOf(p) === i; });
    $('salCodigo').lastChild.textContent = $('salCodigo').title = prods.length ? 'Otro código' : 'Activar código';
    var viejo = caja.querySelector('.sal-grupo'); if (viejo) viejo.remove();
    var g = document.createElement('a'); g.className = 'sal-grupo'; g.title = 'Grupo de WhatsApp'; g.target = '_blank'; g.rel = 'noopener noreferrer';
    g.href = CFG.WHATSAPP_GRUPO || 'https://chat.whatsapp.com/HlKvyK6HLXP02iIgGvj1Iz?mode=gi_t';
    g.innerHTML = '<span class="wa"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 0 1-4.79-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.23-9.43 9.44-9.43 2.52 0 4.89.98 6.67 2.77a9.37 9.37 0 0 1 2.76 6.67c0 5.2-4.24 9.43-9.44 9.43zm8.03-17.46A11.27 11.27 0 0 0 12.05.72C5.8.72.7 5.8.7 12.06c0 2 .52 3.95 1.52 5.67L.6 23.28l5.69-1.49a11.33 11.33 0 0 0 5.75 1.47h.01c6.26 0 11.35-5.09 11.35-11.35 0-3.03-1.18-5.88-3.33-8.02z"/></svg></span><span>Únete al grupo de <b>Modo Cachimbo</b></span>';
    caja.appendChild(g);
  }
  pintarAccesos();

  /* ---------- Saludo ---------- */
  function pintarSaludo(u, p) {
    var m = u.user_metadata || {};
    nombreAlumno = ((p && (p.apodo || p.nombre)) || m.full_name || m.name || (u.email || '').split('@')[0] || '').split(' ')[0];
    var h = $('salNombre');
    h.textContent = '¡Hola' + (nombreAlumno ? ', ' : '');
    if (nombreAlumno) { var s = document.createElement('span'); s.textContent = nombreAlumno; h.appendChild(s); }
    h.appendChild(document.createTextNode('!')); h.insertAdjacentHTML('beforeend', MANO);
    avisos();
  }

  /* ---------- Tarjeta del perfil: se arma sobre el botón de la cuenta (assets/auth.js) ---------- */
  var miXp = null;
  function rangoHtml(xp) {
    if (!window.MCRango || xp == null) return '';
    var n = MCRango.nivel(xp);
    return n < 0 ? 'Sin rango' : '<i>' + MCRango.svg(n, { mini: true, quieto: true }) + '</i>' + esc(MCRango.nombre(n));
  }
  function arreglarCuenta() {
    Array.prototype.forEach.call(document.querySelectorAll('.cab .mcu-chip'), function (chip) {
      if (!chip.querySelector('.pf-tx')) {
        chip.classList.add('perfil');
        var av = chip.querySelector('.mcu-av'), nom = chip.querySelector('.mcu-nom');
        var marco = document.createElement('span'); marco.className = 'marco';
        if (av) { chip.insertBefore(marco, av); marco.appendChild(av); }
        var tx = document.createElement('span'); tx.className = 'pf-tx';
        if (nom) tx.appendChild(nom);
        var rg = document.createElement('small'); rg.className = 'pf-rg';
        tx.appendChild(rg); chip.appendChild(tx);
      }
      var r = chip.querySelector('.pf-rg'), n = miXp == null || !window.MCRango ? -1 : MCRango.nivel(miXp);
      // Solo si cambió: el observador vuelve a llamar aquí con cada cambio
      // (el emblema trae ids nuevos cada vez, por eso se compara el nivel)
      var k = miXp == null ? 'x' : String(n), c = n < 0 ? '#cfc8e6' : RC[n];
      if (r.getAttribute('data-n') !== k) { r.setAttribute('data-n', k); r.innerHTML = rangoHtml(miXp); }
      if (r.style.getPropertyValue('--rc') !== c) r.style.setProperty('--rc', c);
    });
    // En celular el cambio de modo va en el menú de la cuenta
    Array.prototype.forEach.call(document.querySelectorAll('.cab .mcu-menu'), function (menu) {
      if (menu.querySelector('.mcu-modo')) return;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'mcu-modo';
      b.addEventListener('click', function () { cambiarModo(); menu.classList.remove('show'); });
      var salir = menu.querySelector('button:last-child');
      menu.insertBefore(b, salir);
      pintarModo();
    });
  }
  var cuenta = document.querySelector('[data-mc-auth]');
  new MutationObserver(arreglarCuenta).observe(cuenta, { childList: true, subtree: true });

  /* ---------- Rango de la semana (barra de la escena) ---------- */
  function pintarRango(e) {
    if (!e || !window.MCRango) return;
    miXp = +e.xp_semana || 0;
    var n = MCRango.nivel(miXp), MIN = MCRango.minimo, barra = $('rangoBar');
    var sig = n + 1, tx, pct;
    if (n < 0) { tx = miles(MIN[0] - miXp) + ' XP<br>para Zafiro'; pct = miXp / MIN[0]; }
    else if (sig < MIN.length) { tx = miles(MIN[sig] - miXp) + ' XP<br>para ' + MCRango.nombre(sig); pct = (miXp - MIN[n]) / (MIN[sig] - MIN[n]); }
    else { tx = miles(miXp) + ' XP<br>rango máximo'; pct = 1; }
    barra.style.setProperty('--rc', n < 0 ? '#A99FC8' : RC[n]);
    $('rangoEm').innerHTML = MCRango.svg(Math.max(n, 0), { mini: true });
    $('rangoEm').style.opacity = n < 0 ? '.4' : '';
    $('rangoNom').textContent = n < 0 ? 'Sin rango' : MCRango.nombre(n);
    $('rangoTx').innerHTML = tx;
    $('rangoBarra').style.width = Math.round(Math.max(0, Math.min(1, pct)) * 100) + '%';
    barra.hidden = false;
    $('ligaNom').textContent = n < 0 ? 'Liga de la semana' : 'Liga ' + MCRango.nombre(n);
    arreglarCuenta();
  }

  /* ---------- Escena: fechas importantes (temática + tu agenda) ---------- */
  var fechas = [], evento = null;
  var CALABAZA = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 9c-2-3-1-6 2-7" fill="none" stroke="#3f8a1e" stroke-width="2.6" stroke-linecap="round"/><ellipse cx="11" cy="19" rx="7.5" ry="9" fill="#e86a10"/><ellipse cx="21" cy="19" rx="7.5" ry="9" fill="#e86a10"/><ellipse cx="16" cy="19" rx="7" ry="9.6" fill="#ff8a1f"/><path d="M10 16l3 2-3 1zM22 16l-3 2 3 1zM10.5 23q5.5 4 11 0l-2 1-1.5-1.5-2 1.5-2-1.5-1.5 1.5z" fill="#3a1500"/></svg>';
  var EVENTOS = { halloween: { nombre: 'Halloween', ico: CALABAZA, cls: 'f-hallo', emoji: '🎃' } };
  function hoyLima() {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); }
  }
  function leerEvento() {
    var t = window.MCTema && MCTema.actual, ev = EVENTOS[t];
    if (!ev) return null;
    var c = null; try { c = JSON.parse(sessionStorage.getItem('mc_tema_ver') || localStorage.getItem('mc_tema') || 'null'); } catch (e) {}
    var d = c && c.fin ? Math.round((new Date(c.fin + 'T12:00:00') - new Date(hoyLima() + 'T12:00:00')) / 864e5) : null;
    return { nombre: ev.nombre, ico: ev.ico, cls: ev.cls, emoji: ev.emoji, dias: d };
  }
  function cuandoTx(e) {
    var A = window.MCAgenda, d = A.dias(e.fecha);
    var dia = d === 0 ? 'Hoy' : d === 1 ? 'Mañana' : d < 7 ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][A.aFecha(e.fecha).getDay()] : A.fechaCorta(e.fecha);
    return dia + (e.hora ? ' ' + A.hora12(e.hora).replace(/ ?[ap]\. m\./, '') : '');
  }
  function pintarFechas() {
    var html = '';
    evento = leerEvento();
    if (evento) html += '<a class="fecha ' + evento.cls + '" href="#" data-ev><span class="fi">' + evento.ico + '</span><span class="ft"><b class="disp">' + esc(evento.nombre) + '</b><small>' +
      (evento.dias == null ? 'Evento de la semana' : evento.dias <= 0 ? 'Último día' : 'Quedan ' + evento.dias + (evento.dias === 1 ? ' día' : ' días')) + '</small></span></a>';
    var A = window.MCAgenda;
    if (A && fechas.length) {
      fechas.slice(0, evento ? 2 : 3).forEach(function (e) {
        var k = A.TIPOS[e.tipo] || A.TIPOS.otro;
        html += '<a class="fecha" href="perfil.html#agenda" style="--fc:' + k.c + '"><span class="fi"><svg class="ic"><use href="#i-' + (e.tipo === 'simulacro' ? 'reloj' : 'agenda') + '"/></svg></span>' +
          '<span class="ft"><b class="disp">' + esc(cuandoTx(e)) + '</b><small>' + esc(e.titulo || k.n) + '</small></span></a>';
      });
    } else if (A) html += '<a class="fecha f-vacia" href="perfil.html#agenda"><span class="fi"><svg class="ic"><use href="#i-agenda"/></svg></span><span class="ft"><b class="disp">Mi agenda</b><small>Agrega tus fechas</small></span></a>';
    $('fechas').innerHTML = html;
    var ev = $('fechas').querySelector('[data-ev]');
    if (ev) ev.addEventListener('click', function (e) { e.preventDefault(); decir(avisoEvento(), 6500); });
    avisos();
  }
  function cargarAgenda() {
    var A = window.MCAgenda;
    if (!A) { pintarFechas(); return; }
    A.cargar().then(function (l) { fechas = A.proximas(l); pintarFechas(); }).catch(function () { pintarFechas(); });
  }
  if (window.MCAgenda) MCAgenda.alCambiar(function (l) { fechas = MCAgenda.proximas(l); pintarFechas(); });

  /* ---------- El búho: su globo sale solo por momentos ----------
     Saluda al entrar, recuerda tus fechas, el evento y la meta (cada aviso una
     vez por visita, uno cada 90 s) y contesta cuando lo tocas. Se va solo. */
  var globo = $('globo'), avisosCola = [], vistos = {}, racha = null, metaAntes = null, tGlobo = null, ocupadoGlobo = false, toqueN = 0;
  var GLOBO_ICO = { fecha: 'agenda', meta: 'fuego', feliz: 'corazon' };
  // fijo: el búho está reaccionando a los toques y nada lo interrumpe
  function decir(m, ms, fijo) {
    if (!m || (ocupadoGlobo && !fijo)) return;
    ms = ms || 5500;
    if (fijo) { ocupadoGlobo = true; setTimeout(function () { ocupadoGlobo = false; }, ms); }
    if (typeof m === 'string') m = { t: m };
    var ico = m.ico ? '<span class="gi">' + m.ico + '</span>' : GLOBO_ICO[m.tipo] ? '<span class="gi"><svg class="ic"><use href="#i-' + GLOBO_ICO[m.tipo] + '"/></svg></span>' : '';
    globo.className = 'globo' + (m.tipo ? ' g-' + m.tipo : '');
    globo.innerHTML = ico + '<span class="gt">' + (m.k ? '<small class="disp">' + m.k + '</small>' : '') + m.t + '</span>';
    void globo.offsetWidth; globo.classList.add('ver');
    clearTimeout(tGlobo); tGlobo = setTimeout(callar, ms);
  }
  function callar() { clearTimeout(tGlobo); globo.classList.remove('ver'); }
  globo.addEventListener('click', callar);
  MCBuhoVivo.toques($('buho'), {
    pose: 'vivo',
    decir: function (t, tono, ms) { decir({ t: t, tipo: tono }, ms, true); },
    alTocar: function () { decir(frasesToque()[toqueN++ % frasesToque().length], 4500); }
  });
  function saludo() {
    var h = new Date().getHours(), s = h < 12 ? '¡Buenos días' : h < 19 ? '¡Buenas tardes' : '¡Buenas noches';
    return { t: s + (nombreAlumno ? ', <em>' + esc(nombreAlumno) + '</em>' : '') + '! ¿Qué estudiamos hoy?' };
  }
  function avisoMeta() {
    if (!racha) return null;
    var meta = racha.meta || 20, hoy = Math.min(racha.hoy || 0, meta);
    if (racha.cumplido_hoy) return { tipo: 'meta', k: 'Meta del día', t: '¡Meta <em>cumplida</em>! Eres una máquina' };
    if (!hoy) return { tipo: 'meta', k: 'Meta del día', t: '¿Empezamos? Hoy son <em>' + meta + ' preguntas</em>' };
    return { tipo: 'meta', k: 'Meta del día', t: '¡Vas <em>' + hoy + ' de ' + meta + '</em>! Tú puedes' };
  }
  function avisoEvento() {
    if (!evento) return null;
    return { tipo: 'evento', ico: evento.ico, k: 'Evento', t: evento.dias == null ? '¡Es semana de <em>' + esc(evento.nombre) + '</em>! ' + evento.emoji
      : evento.dias <= 0 ? '¡Hoy es el último día de <em>' + esc(evento.nombre) + '</em>! ' + evento.emoji
      : '¡' + esc(evento.nombre) + ' termina en <em>' + evento.dias + (evento.dias === 1 ? ' día' : ' días') + '</em>! ' + evento.emoji };
  }
  function avisosFechas() {
    var A = window.MCAgenda;
    if (!A) return [];
    return fechas.filter(function (e) { return A.dias(e.fecha) <= 7; }).slice(0, 3).map(function (e) {
      var d = A.dias(e.fecha), k = A.TIPOS[e.tipo] || A.TIPOS.otro;
      return { id: 'f' + e.fecha + (e.titulo || ''), tipo: 'fecha', k: d === 0 ? 'Hoy' : d === 1 ? 'Mañana' : 'En ' + d + ' días',
        t: '<em>' + esc(e.titulo || k.n) + '</em>' + (e.hora ? ' a las ' + esc(A.hora12(e.hora)) : '') + (d <= 1 ? '. ¡Tú puedes!' : '') };
    });
  }
  function frasesToque() {
    var l = [saludo()];
    l = l.concat(avisosFechas().slice(0, 1));
    var m = avisoMeta(); if (m && !racha.cumplido_hoy) l.push(m);
    return l.concat([{ t: '¿Un repasito de <em>5 minutos</em>? Yo te acompaño' }, { t: 'Tócame 3 veces rápido… <em>si te atreves</em>' }]);
  }
  function avisos() {
    var ev = avisoEvento(), m = avisoMeta();
    avisosCola = avisosFechas().concat(ev ? [Object.assign({ id: 'ev' }, ev)] : [], m && !racha.cumplido_hoy ? [Object.assign({ id: 'meta' }, m)] : [])
      .filter(function (x) { return !vistos[x.id]; });
  }
  function siguienteAviso() {
    if (document.hidden || globo.classList.contains('ver')) return;
    var x = avisosCola.shift();
    if (x) { vistos[x.id] = 1; decir(x, 6500); }
  }
  // Al entrar: saludo, y después el aviso más importante
  setTimeout(function () { decir(saludo(), 3800); }, 900);
  setTimeout(siguienteAviso, 6200);
  setInterval(siguienteAviso, 90000);

  /* ---------- Meta del día (assets/racha.js la carga auth.js) ---------- */
  function pintarRacha(r) {
    racha = r;
    var meta = (r && r.meta) || 20, hoy = Math.min((r && r.hoy) || 0, meta);
    $('salRachaBarra').style.width = (hoy / meta * 100) + '%';
    $('salRachaHoy').textContent = r && r.cumplido_hoy ? '¡Cumplida!' : hoy + '/' + meta;
    $('salRacha').classList.toggle('on', !!(r && r.cumplido_hoy));
    // Recién cumplió la meta: el búho lo celebra
    if (metaAntes === false && r && r.cumplido_hoy) decir({ tipo: 'feliz', k: 'Meta del día', t: '¡Meta <em>cumplida</em>! Eres una máquina' }, 6000);
    metaAntes = !!(r && r.cumplido_hoy);
    avisos();
  }
  (function esperarRacha(i) {
    if (window.MCRacha) MCRacha.alCambiar(pintarRacha);
    else if (i < 100) setTimeout(function () { esperarRacha(i + 1); }, 150);
  })(0);

  /* ---------- Corazones y XP (assets/corazones.js) ---------- */
  $('accMisiones').addEventListener('click', function () { if (window.MCCorazones) MCCorazones.abrirMisiones(); });
  (function esperarCorazones(i) {
    if (window.MCCorazones) MCCorazones.alCambiar(pintarRango);
    else if (i < 100) setTimeout(function () { esperarCorazones(i + 1); }, 150);
  })(0);

  /* ---------- "¡A practicar!": vuelve al último curso o examen que practicó ---------- */
  var EXAMENES = { ordinario: 'Ordinario', cpu: 'CPU', 'control-cpu': 'Control CPU' };
  var practicar = $('salSeguir');
  practicar.addEventListener('click', function (e) { if (practicar.getAttribute('href') === '#cursos') { e.preventDefault(); e.stopPropagation(); abrirHoja('cursos'); } }, true);
  function pintarSeguir(practicas, reg) {
    var cursos = {}; (reg.cursos || []).forEach(function (c) { cursos[c.id] = c.nombre; });
    var x = (practicas || []).filter(function (p) { return p.tipo === 'simulacro' || p.carpeta; })[0];
    if (!x) return;
    var href, nombre;
    if (x.tipo === 'simulacro') { href = 'simulacro.html'; nombre = 'Simulacro'; }
    else if (x.tipo === 'examen' && EXAMENES[x.carpeta]) { href = 'examenes/' + x.carpeta + '/index.html'; nombre = 'Examen ' + EXAMENES[x.carpeta]; }
    else if (/^[a-z0-9-]+$/.test(x.carpeta)) { href = x.carpeta + '/index.html'; nombre = cursos[x.carpeta] || ''; }
    if (!href) return;
    practicar.href = href;
    if (nombre) { $('modoLbl').textContent = 'Seguir con'; $('modoNom').textContent = nombre; }
  }
  (function esperarProgreso(i) {
    if (window.MCProgreso) Promise.all([MCProgreso.cargar(), cursosJson]).then(function (d) { pintarSeguir(d[0].practicas, d[1]); }).catch(function () {});
    else if (i < 100) setTimeout(function () { esperarProgreso(i + 1); }, 150);
  })(0);

  /* ---------- Cursos populares de la semana (supabase/06-populares.sql) ---------- */
  function pintarPopulares(ids, reg) {
    var cursos = (reg.cursos || []).filter(function (c) { return !c.oculto; });
    var areas = {}; (reg.areas || []).forEach(function (a) { areas[a.id] = a.nombre; });
    var por = {}; cursos.forEach(function (c) { por[c.id] = c; });
    var elegidos = [];
    ids.forEach(function (id) { if (por[id] && elegidos.indexOf(por[id]) < 0) elegidos.push(por[id]); });
    // Si aún no hay 4 con actividad, se completa con el orden de cursos.json
    cursos.slice().sort(function (a, b) { return (a.orden || 0) - (b.orden || 0); }).forEach(function (c) { if (elegidos.length < 4 && elegidos.indexOf(c) < 0) elegidos.push(c); });
    $('populares').innerHTML = elegidos.slice(0, 4).map(function (c, i) {
      return '<a class="pop" href="' + esc(c.id) + '/index.html" data-mc-nav="curso" style="--ac:' + (AREA[c.area] || 'var(--lima)') + (c.icono ? ';--ico:url(&quot;' + esc(c.icono) + '&quot;)' : '') + '">' +
        '<span class="pop-pos">#' + (i + 1) + '</span><span class="pop-ico"><i></i></span><span class="pop-txt"><b>' + esc(c.nombre) + '</b><small>' + esc(areas[c.area] || '') + '</small></span></a>';
    }).join('');
  }
  function cargarPopulares() {
    var guardada = null;
    try { var c = JSON.parse(localStorage.getItem('mc_populares')); if (c && Date.now() - c.t < 3600000) guardada = c.lista; } catch (e) {}
    var pedido = guardada ? Promise.resolve(guardada) : MCAuth.listo.then(function (c) { return c.rpc('cursos_populares'); }).then(function (r) {
      var ids = !r.error && Array.isArray(r.data) ? r.data.map(function (x) { return x.carpeta; }) : [];
      if (!r.error) try { localStorage.setItem('mc_populares', JSON.stringify({ t: Date.now(), lista: ids })); } catch (e) {}
      return ids;
    }, function () { return []; });
    Promise.all([pedido, cursosJson]).then(function (rs) { pintarPopulares(rs[0], rs[1]); }).catch(function () {});
  }

  /* ---------- Copa y medallas de los tops ---------- */
  var MED = [['#FFD84D', '#FFC800', '#B38600'], ['#F2F0F8', '#C9C6D6', '#6B6485'], ['#FFC38F', '#E58A45', '#8A4A17']];
  function copa() {
    return '<svg class="copa" viewBox="0 0 32 36" aria-label="1.º"><path d="M9 6H4.5a4.5 4.5 0 0 0 5 6M23 6h4.5a4.5 4.5 0 0 1-5 6" fill="none" stroke="#E0A100" stroke-width="2.6"/>' +
      '<path d="M8 3h16v9a8 8 0 0 1-16 0z" fill="#FFC800"/><path d="M16 3h8v9a8 8 0 0 1-8 8z" fill="#E0A100"/><path d="M10.5 5h2.5v8c0 1.6.6 3 1.6 4-2.4-.6-4.1-2.6-4.1-5z" fill="#FFF3B0" opacity=".8"/>' +
      '<path d="m16 6.5 1.4 2.9 3.1.4-2.3 2.2.6 3.1-2.8-1.5-2.8 1.5.6-3.1-2.3-2.2 3.1-.4z" fill="#fff"/>' +
      '<rect x="14" y="20" width="4" height="6" fill="#B38600"/><path d="M9 26h14l2 6H7z" fill="#6b3fd0"/><path d="M9 26h14l.7 2H8.3z" fill="#8e63f0"/></svg>';
  }
  function medalla(n) {
    var c = MED[n - 1];
    return '<svg class="medalla" viewBox="0 0 32 36" aria-label="' + n + '.º"><path d="M8 0h6l4 12h-6z" fill="#3b6fd8"/><path d="M24 0h-6l-4 12h6z" fill="#e0453c"/>' +
      '<circle cx="16" cy="23" r="12" fill="' + c[2] + '"/><circle cx="16" cy="23" r="9.5" fill="' + c[1] + '"/><path d="M8.5 19a9.5 9.5 0 0 1 12-5.5 10 10 0 0 0-10 9.5z" fill="' + c[0] + '"/>' +
      '<text x="16" y="28" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="800" font-style="italic" font-size="14" fill="' + c[2] + '">' + n + '</text></svg>';
  }
  function puesto(p) { return p === 1 ? copa() : p <= 3 ? medalla(p) : '<span class="num">' + p + '</span>'; }
  function inicial(nom) { return esc((String(nom || '?').trim()[0] || '?').toUpperCase()); }
  function foto(x) { return '<span class="letra" style="background:' + AV[(x.puesto - 1) % AV.length] + '">' + inicial(x.apodo) + '</span>'; }
  function emblema(xp) {
    if (xp == null || !window.MCRango) return '<span class="em"></span>';
    var n = MCRango.nivel(xp);
    return '<span class="em"' + (n < 0 ? '' : ' title="' + MCRango.nombre(n) + '"') + '>' + (n < 0 ? '' : MCRango.svg(n, { mini: true, quieto: true })) + '</span>';
  }

  /* ---------- Top de la semana (ranking_xp en supabase/16-corazones.sql) ---------- */
  var CLS = ['', 'oro', 'plata', 'bronce'];
  function filaXp(x, extra) {
    var nom = x.yo ? 'Tú' : (x.apodo || 'Cachimbo');
    return '<li class="' + (CLS[x.puesto] || '') + (x.yo ? ' tu' : '') + (extra ? ' extra' : '') + '"><span class="pos">' + puesto(x.puesto) + '</span>' + foto({ puesto: x.puesto, apodo: x.yo ? (nombreAlumno || x.apodo) : x.apodo }) +
      '<span class="quien"><b>' + esc(nom) + '</b></span>' + emblema(x.xp) + '<span class="xp">' + miles(x.xp) + ' <small>XP</small></span></li>';
  }
  // corto: solo el podio y tu fila a la vista; el resto se abre con "Ver top 10"
  function listaXp(top, yo, n, corto) {
    var t = top.slice(0, n);
    if (!t.length) return '<li class="vacio">Aún nadie suma XP esta semana. ¡Sé el primero!</li>';
    var html = t.map(function (x) { return filaXp(x, corto && x.puesto > 3 && !x.yo); }).join('');
    if (yo && !t.some(function (x) { return x.yo; })) html += '<li class="sep">···</li>' + filaXp({ puesto: yo.puesto, apodo: 'Tú', xp: yo.xp, yo: true });
    return html;
  }
  $('topMas').addEventListener('click', function () {
    var abierta = $('topCel').classList.toggle('abierta');
    this.textContent = abierta ? 'Ver menos ▴' : 'Ver top 10 ▾';
  });
  function cargarTop() {
    MCAuth.listo.then(function (c) { return c.rpc('ranking_xp'); }).then(function (r) {
      if (r.error) throw r.error;
      var d = r.data || {}, top = (d.top || []).slice().sort(function (a, b) { return a.puesto - b.puesto; });
      $('topLado').innerHTML = listaXp(top, d.yo, 10);
      $('topCel').innerHTML = listaXp(top, d.yo, 10, true);
      $('topMas').hidden = !$('topCel').querySelector('.extra');
    }).catch(function () {
      $('topLado').innerHTML = $('topCel').innerHTML = '<li class="vacio">No se pudo cargar el top. Revisa tu conexión.</li>';
    });
  }

  /* ---------- Top simulacro de la semana (ranking_simulacro) ---------- */
  var CORONA = '<svg class="corona" viewBox="0 0 40 22" aria-hidden="true"><path d="M2 20 4 4l9 8 7-11 7 11 9-8 2 16z" fill="#FFC800"/><path d="M2 20h36v2H2z" fill="#B38600"/><circle cx="20" cy="13" r="2.6" fill="#FF4B4B"/><circle cx="10" cy="15" r="1.8" fill="#1CB0F6"/><circle cx="30" cy="15" r="1.8" fill="#58CC02"/></svg>';
  function rangoSim(xp) {
    if (xp == null || !window.MCRango) return '';
    var n = MCRango.nivel(xp);
    return n < 0 ? '' : '<span class="rg">' + MCRango.svg(n, { mini: true, quieto: true }) + '<small style="color:' + RC[n] + '">' + MCRango.nombre(n) + '</small></span>';
  }
  function filaSim(x, extra) {
    return '<li class="' + (x.yo ? 'tu' : '') + (extra ? ' extra' : '') + '"><span class="num">' + x.puesto + '</span>' + foto(x) + '<span class="quien">' + esc(x.yo ? 'Tú' : x.apodo) + '</span>' +
      emblema(x.xp) + '<b>' + dec(x.puntaje) + ' pts</b></li>';
  }
  function pintarSim(filas) {
    filas = (filas || []).slice().sort(function (a, b) { return a.puesto - b.puesto; });
    var top = filas.filter(function (x) { return x.puesto <= 10; }), yo = filas.filter(function (x) { return x.yo; })[0];
    var podio = $('podio'), lista = $('simLista'), mas = $('simMas');
    if (!top.length) {
      podio.innerHTML = '<p class="sim-vacio">Aún nadie dio el simulacro esta semana. ¡Sé el primero!</p>';
      lista.innerHTML = ''; mas.hidden = true; return;
    }
    podio.innerHTML = '<div class="foco" aria-hidden="true"></div>' + [2, 1, 3].map(function (p) {
      var x = top.filter(function (t) { return t.puesto === p; })[0];
      if (!x) return '<div class="lugar l' + p + ' vacio"><span class="aro"><span class="letra" style="background:var(--tarjeta2);color:var(--suave)">?</span></span><b>Libre</b><span class="pts">—</span><span class="bloque"><i class="cara"></i><span class="frente">' + p + '</span></span></div>';
      return '<div class="lugar l' + p + '">' + (p === 1 ? CORONA : '') + '<span class="aro">' + foto(x) + '</span><b>' + esc(x.yo ? 'Tú' : x.apodo) + '</b>' + rangoSim(x.xp) +
        '<span class="pts">' + dec(x.puntaje) + ' pts</span><span class="bloque"><i class="cara"></i><span class="frente">' + p + '</span></span></div>';
    }).join('');
    var resto = top.filter(function (x) { return x.puesto > 3; });
    var html = resto.map(function (x) { return filaSim(x, x.puesto > 5 && !x.yo); }).join('');
    if (yo && yo.puesto > 10) html += filaSim(yo, false);
    lista.innerHTML = html;
    mas.hidden = !resto.some(function (x) { return x.puesto > 5 && !x.yo; });
  }
  $('simMas').addEventListener('click', function () {
    var l = $('simLista'), abierta = l.classList.toggle('abierta');
    this.textContent = abierta ? 'Ver menos ▴' : 'Ver top 10 ▾';
  });
  // Cierra el lunes a las 00:00 (hora de Lima)
  function pintarCierre() {
    var ahora = Date.now(), lima = new Date(ahora - 5 * 3600000);
    var faltan = (8 - lima.getUTCDay()) % 7 || 7;
    var lunes = Date.UTC(lima.getUTCFullYear(), lima.getUTCMonth(), lima.getUTCDate() + faltan) + 5 * 3600000;
    var h = Math.max(0, Math.floor((lunes - ahora) / 3600000)), d = Math.floor(h / 24);
    $('simCierra').lastChild.textContent = 'Cierra en ' + (d ? d + ' d ' + (h % 24) + ' h' : h + ' h');
  }
  pintarCierre(); setInterval(pintarCierre, 600000);
  function cargarSim() {
    MCAuth.listo.then(function (c) { return c.rpc('ranking_simulacro'); }).then(function (r) {
      if (r.error) throw r.error;
      pintarSim(r.data || []);
    }).catch(function () { $('podio').innerHTML = '<p class="sim-vacio">No se pudo cargar el top. Revisa tu conexión.</p>'; });
  }

  /* ---------- "Activar código", grupo de WhatsApp e "Instala la app": debajo del Top de la semana
     (en el menú en PC). En celular el código y el grupo van junto al saludo y la app debajo del top ---------- */
  var appAviso = $('appInstalar'), accesos = $('salAccesos');
  if (appAviso && accesos) {
    var appMarca = document.createComment('app'), appCel = $('topCel').closest('.sec'), enCel = window.matchMedia('(max-width: 900px)');
    appAviso.parentNode.insertBefore(appMarca, appAviso);
    var ubicarApp = function () {
      if (enCel.matches) { $('salNombre').after(accesos); appCel.appendChild(appAviso); }
      else { appMarca.parentNode.insertBefore(accesos, appMarca); appMarca.parentNode.insertBefore(appAviso, appMarca); }
    };
    ubicarApp();
    if (enCel.addEventListener) enCel.addEventListener('change', ubicarApp);
  }

  /* ---------- Hoja que sube desde abajo: cursos, exámenes y flashcards ---------- */
  var hFondo = $('hojaFondo'), hLista = $('hojaLista'), hTit = $('hojaTit'), hSub = $('hojaSub');
  var ICO_EX = '<svg class="ic" style="font-size:26px"><use href="#i-examen"/></svg>', ICO_FC = '<svg class="ic" style="font-size:26px"><use href="#i-tarjetas"/></svg>';
  function filaHoja(href, ic, nombre, sub, cls, area) {
    return '<a class="curso ' + (cls || '') + '"' + (area ? ' data-area="' + esc(area) + '"' : '') + ' href="' + esc(href) + '"><span class="ic">' + ic + '</span><span class="tx"><b>' + esc(nombre) + '</b>' +
      (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span>' + CHEV + '</a>';
  }
  // "Mis cursos" es una pantalla propia: cada área es una tarjeta grande con sus cursos a la mano
  function pintarAreas() {
    // Con la copia guardada se arma al instante; si no hay, la lista espera oculta para no verse chica y luego crecer
    if (cursosGuardados) return armarAreas(cursosGuardados);
    hLista.style.visibility = 'hidden';
    cursosJson.then(armarAreas, function () {}).then(function () { hLista.style.visibility = ''; });
  }
  function armarAreas(d) {
    Array.prototype.forEach.call(hLista.querySelectorAll('a.curso[data-area]'), function (a) {
      var area = a.getAttribute('data-area');
      var cs = (d.cursos || []).filter(function (c) { return c.area === area && !c.oculto; }).sort(function (x, y) { return (x.orden || 0) - (y.orden || 0); });
      var card = document.createElement('div');
      card.className = 'area-card'; card.setAttribute('data-area', area);
      a.className = 'area-link';
      a.querySelector('small').textContent = cs.length + (cs.length === 1 ? ' curso' : ' cursos');
      a.parentNode.replaceChild(card, a);
      card.appendChild(a);
      card.insertAdjacentHTML('beforeend', '<div class="area-cursos">' + cs.map(function (c) {
        return '<a href="' + esc(c.id) + '/index.html">' + (c.icono ? '<i class="ic-m" style="-webkit-mask-image:url(' + esc(c.icono) + ');mask-image:url(' + esc(c.icono) + ')"></i>' : '') + esc(c.nombre) + '</a>';
      }).join('') + '</div>');
    });
  }
  // "Exámenes" también es una pantalla propia: una tarjeta por modalidad con sus exámenes a la mano
  var EXAMENES = [
    { id: 'ordinario', nombre: 'Ordinario', sub: 'Exámenes de admisión de la UNJFSC',
      ico: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2 1.8 8.1 12 13l10.2-4.9z" fill="currentColor"/><path d="M5.6 10.6v4.3c0 1.9 2.9 3.5 6.4 3.5s6.4-1.6 6.4-3.5v-4.3L12 13.7z" fill="currentColor" opacity=".45"/><path d="M20.6 8.8v6.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="20.6" cy="16.3" r="1.6" fill="currentColor"/></svg>' },
    { id: 'cpu', nombre: 'CPU', sub: 'Exámenes del Centro Preuniversitario',
      ico: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.2 5.6c3.4-1 6.7-.6 9.3 1.3v13.6c-2.6-1.9-5.9-2.3-9.3-1.3z" fill="currentColor" opacity=".45"/><path d="M21.8 5.6c-3.4-1-6.7-.6-9.3 1.3v13.6c2.6-1.9 5.9-2.3 9.3-1.3z" fill="currentColor"/><path d="M15.6 6.1v5.6l1.7-1.2 1.7 1.2V5.6" fill="#10131a" opacity=".55"/></svg>' },
    { id: 'control-cpu', nombre: 'Control CPU', sub: 'Exámenes de control del ciclo',
      ico: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.6" width="14" height="18" rx="2.6" fill="currentColor" opacity=".45"/><rect x="7.4" y="2" width="6.2" height="3.6" rx="1.3" fill="currentColor"/><path d="m7 12.3 2.3 2.3 4.2-4.6" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="17.6" cy="17.4" r="4.9" fill="currentColor"/><path d="M17.6 15.2v2.4l1.6 1" fill="none" stroke="#10131a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity=".6"/></svg>' }
  ];
  var SIM_TIRA = '<a class="ex-sim" href="simulacro.html"><svg class="ic"><use href="#i-reloj"/></svg><span class="tx"><b>¿Examen completo con tiempo?</b><small>Simulacro: 80 preguntas, cronómetro y ranking de la semana</small></span><span class="ir">Ir al simulacro</span></a>';
  function tarjetaExamen(e) {
    return '<div class="ex-mod" data-ex="' + e.id + '"><a class="ex-mod-link" href="examenes/' + e.id + '/index.html"><span class="ic">' + e.ico + '</span>' +
      '<span class="tx"><b>' + esc(e.nombre) + '</b><small>' + esc(e.sub) + '</small></span>' + CHEV + '</a>' +
      '<div class="ex-mod-dat" data-dat></div><div class="ex-mod-anios" data-anios></div></div>';
  }
  // Ciclo y número de examen: "2027-I-2" = Examen de control II del ciclo 2027-I
  function nombreExamen(id) { var m = /^(\d{4}-(?:I|II|III))-([12])$/.exec(id); return m ? m[1] + ' · ' + (m[2] === '2' ? 'II' : 'I') : id; }
  var manifiestos = {};
  function pintarExamenes() {
    EXAMENES.forEach(function (e) {
      var pide = manifiestos[e.id] || (manifiestos[e.id] = fetch('examenes/' + e.id + '/data/manifest.json').then(function (r) { if (!r.ok) throw 0; return r.json(); }));
      pide.then(function (lista) {
        var card = hLista.querySelector('.ex-mod[data-ex="' + e.id + '"]');
        if (!card) return;
        var ex = [];
        (lista || []).forEach(function (c) { (c.exams || [{ id: c.id, count: c.count }]).forEach(function (x) { ex.push({ id: x.id, n: x.count || 0 }); }); });
        // Lo más nuevo primero: por año, luego por ciclo (III, II, I) y por número de examen
        var rom = { I: 1, II: 2, III: 3 };
        function clave(id) { var m = /^(\d{4})-(I{1,3})(?:-(\d))?/.exec(id) || []; return (+m[1] || 0) * 100 + (rom[m[2]] || 0) * 10 + (+m[3] || 0); }
        ex.sort(function (a, b) { return clave(b.id) - clave(a.id); });
        var preg = ex.reduce(function (s, x) { return s + x.n; }, 0);
        card.querySelector('[data-dat]').innerHTML = '<span><b>' + ex.length + '</b>' + (ex.length === 1 ? ' examen' : ' exámenes') + '</span><span><b>' + preg + '</b> preguntas</span>';
        var ver = ex.slice(0, 4).map(function (x) { return '<a href="examenes/' + e.id + '/ver.html?year=' + encodeURIComponent(x.id) + '">' + esc(nombreExamen(x.id)) + '</a>'; }).join('');
        if (ex.length > 4) ver += '<a class="mas" href="examenes/' + e.id + '/index.html">+' + (ex.length - 4) + '</a>';
        card.querySelector('[data-anios]').innerHTML = ver || '<span class="pronto">Muy pronto</span>';
      }).catch(function () { delete manifiestos[e.id]; });
    });
  }
  function abrirHoja(cual) {
    hFondo.classList.remove('full'); document.body.classList.remove('en-cursos');
    hFondo.classList.remove('ex'); document.body.classList.remove('en-examenes');
    if (cual === 'cursos') {
      hTit.textContent = 'Mis cursos'; hSub.textContent = 'Elige un área o entra directo a un curso.';
      hLista.innerHTML = $('tplAreas').innerHTML;
      pintarAreas(); hFondo.classList.add('full'); document.body.classList.add('en-cursos');
    } else if (cual === 'examenes') {
      hTit.textContent = 'Exámenes';
      hSub.textContent = 'Exámenes reales con su clave: estúdialos o practícalos.';
      hLista.innerHTML = EXAMENES.map(tarjetaExamen).join('') + SIM_TIRA;
      pintarExamenes(); hFondo.classList.add('full', 'ex'); document.body.classList.add('en-examenes');
    } else {
      hTit.textContent = 'Flashcards: elige el curso';
      hLista.innerHTML = '';
      cursosJson.then(function (d) {
        var html = '';
        (d.areas || []).forEach(function (a) {
          var cs = (d.cursos || []).filter(function (c) { return c.area === a.id && !c.oculto; }).sort(function (x, y) { return (x.orden || 0) - (y.orden || 0); });
          if (!cs.length) return;
          html += '<div class="grupo">' + esc(a.nombre) + '</div>';
          cs.forEach(function (c) { html += filaHoja('tarjetas.html?curso=' + encodeURIComponent(c.id), c.icono ? '<i class="ic-m" style="-webkit-mask-image:url(' + esc(c.icono) + ');mask-image:url(' + esc(c.icono) + ')"></i>' : ICO_FC, c.nombre, '', '', c.area); });
        });
        hLista.innerHTML = html;
      }).catch(function () { hLista.innerHTML = '<p class="grupo">No se pudo cargar la lista de cursos.</p>'; });
    }
    hFondo.hidden = false;
    sonar('toque');
  }
  function cerrarHoja() { document.documentElement.classList.remove('mc-abre-cursos'); hFondo.hidden = true; hFondo.classList.remove('full', 'ex'); document.body.classList.remove('en-cursos', 'en-examenes'); }
  // "Nuevo para ti" (assets/novedades.js) usa la misma hoja
  window.MCHoja = { abrir: function (t, html) { hFondo.classList.remove('full', 'ex'); document.body.classList.remove('en-cursos', 'en-examenes'); hTit.textContent = t; hLista.innerHTML = html; hFondo.hidden = false; }, cerrar: cerrarHoja };
  Array.prototype.forEach.call(document.querySelectorAll('[data-hoja]'), function (b) { b.addEventListener('click', function () { abrirHoja(b.getAttribute('data-hoja')); }); });
  $('hojaX').addEventListener('click', cerrarHoja);
  // Volver desde un área ("← Mis cursos") o desde un examen ("← Exámenes"): el inicio abre esa pantalla de una vez
  if (location.hash === '#mis-cursos' || location.hash === '#examenes') {
    var hojaVuelta = location.hash === '#examenes' ? 'examenes' : 'cursos';
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    abrirHoja(hojaVuelta);
  }
  hFondo.addEventListener('click', function (e) { if (e.target === hFondo) cerrarHoja(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !hFondo.hidden) cerrarHoja(); });
  // Sin novedades, el regalo igual responde
  $('novBtn').addEventListener('click', function () {
    if (this.hidden) MCHoja.abrir('Nuevo para ti', '<p class="grupo" style="text-transform:none;letter-spacing:0">Por ahora no hay nada nuevo. ¡Vuelve pronto!</p>');
  });

  /* ---------- Con sesión / sin sesión ---------- */
  var cargado = false;
  function alCambiar(u) {
    if (!u) { raiz.classList.add('mc-fuera'); bvGoogle.disabled = false; return; }
    raiz.classList.remove('mc-fuera');
    pintarSaludo(u, null);
    MCAuth.perfil().then(function (p) { var a = MCAuth.usuario(); if (a && a.id === u.id) pintarSaludo(u, p); }).catch(function () {});
    if (!cargado) {
      cargado = true;
      cargarAgenda(); cargarPopulares(); cargarTop(); cargarSim();
    }
    if (primeraVez(u)) {
      var m = u.user_metadata || {};
      var nombre = (m.full_name || m.name || '').split(' ')[0];
      var tit = $('codTitulo');
      tit.textContent = nombre ? '¡Hola, ' + nombre + '!' : '¡Hola!'; tit.insertAdjacentHTML('beforeend', MANO);
      luego.textContent = 'Más tarde';
      fondo.classList.add('show');
      setTimeout(function () { input.focus(); }, 50);
    } else seguir();
  }
  // Si no carga Supabase (sin internet) se respeta lo que había en este navegador
  MCAuth.listo.then(function () {
    alCambiar(MCAuth.usuario());
    MCAuth.alCambiar(alCambiar);
  }, function () {});
  // La temática (assets/tema.js) llega después de pintar: se revisa otra vez
  setTimeout(pintarFechas, 1500);
})();
