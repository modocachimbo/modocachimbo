/* =========================================================
   Modo Cachimbo · Amigos (lo usan amigos.html y perfil.html)
   - Llamadas a supabase/71-amigos.sql con caché corta en el teléfono.
   - Piezas que se repiten: el banner del jugador, la ficha y el
     perfil con el búho en su escenario y la tarjeta al lado.
   Necesita assets/auth.js, rango.js, coleccion.js y tarjeta-perfil.js.
   ========================================================= */
(function () {
  if (window.MCAmigos) return;
  var BASE = (document.currentScript && document.currentScript.src || '').replace(/assets\/amigos\.js.*$/, '');
  function C() { return window.MCColeccion; }
  function T() { return window.MCTarjeta; }
  function R() { return window.MCRango; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function nf(n) { return (+n || 0).toLocaleString('es-PE'); }

  var SV = {
    amigos: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.8"/><path d="M15.5 14.2A5.5 5.5 0 0 1 21.5 20"/></svg>',
    solic: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    add: '<svg viewBox="0 0 24 24"><circle cx="10" cy="8" r="3.5"/><path d="M3.5 20a6.5 6.5 0 0 1 13 0"/><path d="M19 8v6M16 11h6"/></svg>',
    duelo: '<svg viewBox="0 0 24 24"><path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M9.5 17.5 21 6V3h-3L6.5 14.5M11 19l-6-6M8 16l-4 4M5 21l-2-2"/></svg>',
    ver: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    lupa: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    wa: '<svg viewBox="0 0 24 24"><path d="M3 21l1.6-4.7A8.5 8.5 0 1 1 8 19.6z"/><path d="M9 9.5c.3 2 2.5 4.6 5.5 5.3l1.2-1.4-1.9-1-1 .9c-1-.4-2-1.4-2.4-2.4l.9-1-1-1.9z" fill="#fff" stroke="none"/></svg>',
    link: '<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
    share: '<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>',
    estrella: '<svg viewBox="0 0 24 24"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/></svg>',
    quitar: '<svg viewBox="0 0 24 24"><circle cx="10" cy="8" r="3.5"/><path d="M3.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 11h6"/></svg>',
    copia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
    look: '<svg viewBox="0 0 24 24"><path d="M8 3 4 6v4l3 1v10h10V11l3-1V6l-4-3c-.5 1.5-2 2.5-4 2.5S8.5 4.5 8 3z"/></svg>',
    lapiz: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m14 6 4 4"/></svg>',
    cfg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>',
    stats: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    cofre: '<svg viewBox="0 0 24 24"><rect x="3" y="10" width="18" height="10" rx="1"/><path d="M3 10c0-4 4-6 9-6s9 2 9 6M10 10v3h4v-3"/></svg>',
    cor: '<svg viewBox="0 0 24 24"><path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z"/></svg>',
    id: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.2"/><path d="M5.8 16a3.5 3.5 0 0 1 6.4 0M14 10h4M14 13h3"/></svg>'
  };

  /* ---------- Llamadas ---------- */
  function rpc(nombre, args) {
    if (!window.MCAuth) return Promise.reject(new Error('sin-auth'));
    return MCAuth.listo.then(function (c) { return c.rpc(nombre, args || {}); }).then(function (r) {
      if (r.error) throw r.error;
      return r.data;
    });
  }
  function clave() { var u = window.MCAuth && MCAuth.usuario(); return u ? 'mc_amigos_' + u.id : ''; }
  function leer() { try { var x = JSON.parse(localStorage.getItem(clave()) || 'null'); return x && Date.now() - x.t < 5 * 60e3 ? x.d : null; } catch (e) { return null; } }
  function guardar(d) { try { if (clave()) localStorage.setItem(clave(), JSON.stringify({ t: Date.now(), d: d })); } catch (e) {} }
  function invalidar() { try { if (clave()) localStorage.removeItem(clave()); } catch (e) {} vistos = {}; }
  // mis_amigos(): una llamada; se guarda 5 minutos
  function lista(forzar) {
    var g = !forzar && leer();
    if (g) return Promise.resolve(g);
    return rpc('mis_amigos').then(function (d) { d = d || { amigos: [], recibidas: [], enviadas: [] }; guardar(d); return d; });
  }
  var vistos = {};
  // ver_amigo(ID): la tarjeta completa. Sin ID, la tuya.
  function ver(cod, forzar) {
    var k = cod || 'yo';
    if (!forzar && vistos[k]) return vistos[k];
    var p = rpc('ver_amigo', cod ? { p_codigo: +cod } : {}).catch(function (e) { delete vistos[k]; throw e; });
    vistos[k] = p;
    return p;
  }
  function accion(nombre, args) { return rpc(nombre, args).then(function (d) { invalidar(); return d || {}; }); }

  var ERRORES = {
    no_existe: 'No hay ningún alumno con ese ID. Revisa los 5 dígitos.',
    eres_tu: 'Ese es tu propio ID 😄',
    limite_amigos: 'Llegaste a 100 amigos, el máximo.',
    limite_solicitudes: 'Tienes 20 solicitudes sin responder. Espera a que te acepten.',
    espera: 'Rechazó tu solicitud hace poco. Podrás volver a mandarle en unos días.'
  };

  /* ---------- Piezas ---------- */
  function it(id, esp) { var c = C(); return c && (c.item(id) || c.item(c.defecto[esp])); }
  function puesto(a) { return a && a.puesto && typeof a.puesto === 'object' ? a.puesto : {}; }
  function foto(a) {
    var p = puesto(a);
    return T().foto({ apodo: a.apodo, codigo: 0, xp_total: a.xp_total, foto: a.foto, avatar: p.avatar, marco: p.marco, fondo: p.racha, puesto: p, pin: (p.pines || [])[0] }, 'ft');
  }
  function emb(xp) { var n = R().nivel(+xp || 0); return R().svg(Math.max(n, 0), { quieto: true }); }
  function rangoNom(xp) { var n = R().nivel(+xp || 0); return n < 0 ? 'Sin rango' : R().nombre(n); }
  function rangoCol(xp) { var n = R().nivel(+xp || 0); return n < 0 ? '#cfc8e6' : T().colores[n]; }
  function tit(a) { var t = it(puesto(a).titulo, 'titulo'); return t ? t.nom : 'Cachimbo en camino'; }
  function tema(a) { var p = puesto(a), c = C(); return c.tema(c.item(p.racha) ? p.racha : c.defecto.racha); }
  function fondo(a) { var p = puesto(a), c = C(); return c.item(p.racha) ? c.fondo(p.racha) : ''; }
  function banner(a, sub) {
    return '<span class="ma-bn">' + foto(a) + '<span class="bn-b">' + T().arte(tema(a), fondo(a)) +
      '<span class="tx"><span class="nm">' + esc(a.apodo || 'Cachimbo') + '</span><span class="tt' + (sub ? ' id' : '') + '">' + (sub || '— ' + esc(tit(a))) + '</span></span>' +
      '<span class="em">' + emb(a.xp_semana) + '</span></span></span>';
  }
  function hoy() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function fecha(s) { var p = String(s || '').slice(0, 10).split('-'); return p.length === 3 ? new Date(+p[0], +p[1] - 1, +p[2]) : null; }
  // «Estudió hoy», «Hace 2 días»…
  function ultima(s) {
    var f = fecha(s); if (!f) return { t: 'Aún no estudia', hoy: false };
    var n = Math.round((hoy() - f) / 864e5);
    return n <= 0 ? { t: 'Estudió hoy', hoy: true } : { t: n === 1 ? 'Ayer' : n < 30 ? 'Hace ' + n + ' días' : 'Hace más de un mes', hoy: false };
  }
  function hace(ts) {
    var m = Math.max(0, (Date.now() - new Date(ts)) / 6e4);
    return m < 60 ? 'hace ' + Math.max(1, Math.round(m)) + ' min' : m < 1440 ? 'hace ' + Math.round(m / 60) + ' h' : Math.round(m / 1440) === 1 ? 'ayer' : 'hace ' + Math.round(m / 1440) + ' días';
  }
  function dias(ts) { return ts ? Math.max(1, Math.floor((Date.now() - new Date(ts)) / 864e5) + 1) : 0; }
  function vitrina(a) {
    var c = C(), pines = (puesto(a).pines || []).filter(function (id) { return c.item(id); }).slice(0, 3);
    var h = pines.map(function (id) { return c.pin(c.item(id)); });
    while (h.length < 3) h.push('<span class="hueco"></span>');
    return '<div class="ma-vitr">' + h.join('') + '</div>';
  }

  var toastEl, toastT;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'ma-toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('ver');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('ver'); }, 2600);
  }
  function copiar(txt, msg) {
    var ok = function () { toast(msg || 'Copiado'); };
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(ok, function () { toast(txt); });
    else toast(txt);
  }
  function enlace(cod) { return location.origin + location.pathname.replace(/[^/]*$/, '') + 'amigos.html?agregar=' + cod; }
  function invitarTexto(cod) { return 'Agrégame en Modo Cachimbo y estudiemos juntos 🦉 Mi ID es ' + cod + ': ' + enlace(cod); }
  function compartir(cod, como) {
    var txt = invitarTexto(cod);
    if (como === 'wa') { window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank'); return; }
    if (como === 'link') { copiar(enlace(cod), 'Enlace copiado'); return; }
    if (como === 'id') { copiar(String(cod), 'ID copiado'); return; }
    if (navigator.share) navigator.share({ title: 'Modo Cachimbo', text: txt }).catch(function () {});
    else copiar(txt, 'Invitación copiada');
  }

  /* ---------- Perfil: búho en su escenario + tarjeta ---------- */
  var MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
  function perfil(d, op) {
    op = op || {};
    var c = C(), mio = !!op.mio, p = puesto(d);
    var eid = c.item(p.escena) ? p.escena : c.defecto.escena, et = c.escena(eid), b = it(p.buho, 'buho'), t = it(p.titulo, 'titulo');
    var total = c.contar().total, mx = +d.mi_xp_semana || 0, sx = +d.xp_semana || 0;
    var stage = '<div class="ma-esc" style="--esc:radial-gradient(110% 80% at 50% 32%, ' + et[0] + ' 0%, ' + et[3] + ' 46%, #0b0818 92%)">' +
      (mio ? '<div class="marcas"><a class="em" href="coleccion.html#rangos" title="Rango de la semana">' + emb(sx) + '</a></div>'
        : '<div class="vs"><div class="ma-vsb"><div class="l"><span style="color:var(--accent,#C6E000)">' + nf(mx) + '<small>Tú</small></span><i>VS</i><span style="color:#FF6E84;text-align:right">' + nf(sx) + '<small>' + esc(d.apodo) + '</small></span></div>' +
          '<div class="bar"><u style="width:' + (mx + sx ? Math.round(mx / (mx + sx) * 100) : 50) + '%"></u></div></div></div>') +
      '<div class="piso">' + c.piso(eid) + '</div><div class="bh">' + c.buho(b) + '</div>' +
      '<div class="lat">' + (mio ? '<a class="ma-ib on" href="coleccion.html" title="Cambiar mi look" aria-label="Cambiar mi look">' + SV.look + '</a><a class="ma-ib" href="amigos.html" title="Mis amigos" aria-label="Mis amigos">' + SV.amigos + '</a><button type="button" class="ma-ib" data-ma="compartir" title="Invitar amigos" aria-label="Invitar amigos">' + SV.share + '</button>'
        : '<a class="ma-ib duelo" href="duelo.html" title="Retar a duelo" aria-label="Retar a duelo">' + SV.duelo + '</a>') + '</div></div>';
    var ex = fecha(d.fecha_examen), faltan = ex ? Math.round((ex - hoy()) / 864e5) : null;
    var meta = ex && faltan >= 0
      ? '<span class="cal"><small>' + MESES[ex.getMonth()] + '</small><b>' + ex.getDate() + '</b></span><span class="t"><b>' + (mio ? 'Mi examen' : 'Su examen') + (d.modalidad ? ' · ' + esc(d.modalidad) : '') + '</b>' +
        (faltan === 0 ? '<em>¡Es hoy!</em>' : 'Faltan <em>' + faltan + ' día' + (faltan === 1 ? '' : 's') + '</em>') + (d.desde && !mio ? ' · amigos hace ' + dias(d.desde) + ' días' : '') + '</span>'
      : mio ? '<span class="cal sin"><small>Examen</small><b>?</b></span><span class="t"><b>¿Cuándo es tu examen?</b>Agrégalo en tus datos y te contamos los días.</span>'
      : d.desde ? '<span class="cal sin"><small>Amigos</small><b>' + dias(d.desde) + '</b></span><span class="t"><b>Días de amistad</b>Son amigos desde el ' + new Date(d.desde).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }) + '</span>' : '';
    var dest = [b, it(p.escena, 'escena')].filter(Boolean).map(function (x) {
      var Rr = c.rareza[x.rareza] || c.rareza.comun;
      return '<' + (mio ? 'a href="coleccion.html#' + x.espacio + '"' : 'span') + ' style="--c:' + Rr.c + '"><u>' + Rr.nom + '</u><span class="mcc-dib">' + c.dibujo(x) + '</span><small>' + esc(x.nom) + '</small></' + (mio ? 'a' : 'span') + '>';
    }).join('');
    var card = '<div class="ma-card' + (mio ? '' : ' amigo') + '"><div class="c-head">' + T().arte(tema(d), fondo(d)) +
      '<div class="lg"><img src="' + BASE + 'assets/img/logo-modo-cachimbo-horizontal.svg" alt="Modo Cachimbo">' + (mio ? '<a href="coleccion.html" title="Mi colección" aria-label="Mi colección">' + SV.cfg + '</a>' : '') + '</div>' +
      '<div class="yo">' + foto(d) + '<div><div class="nm">' + esc(d.apodo || 'Cachimbo') + '</div>' +
        (t ? '<div class="ttl">' + c.titulo(t) + '</div>' : '') +
        (d.carrera ? '<div class="ca">' + esc(d.carrera) + '</div>' : '') +
        '<button type="button" class="uid" data-ma="id" title="Copiar ID">ID: ' + esc(d.codigo) + ' ' + SV.copia + '</button></div></div></div>' +
      '<div class="c-sec"><span class="ma-k">' + SV.stats + 'Esta semana</span><div class="ma-cuatro">' +
        '<a class="em"' + (mio ? ' href="coleccion.html#rangos"' : '') + '>' + emb(sx) + '<b style="color:' + rangoCol(sx) + ';font-size:16px">' + rangoNom(sx) + '</b><small>Rango</small></a>' +
        '<span>' + T().icono('racha') + '<b>' + (+d.racha || 0) + '</b><small>Racha</small></span>' +
        '<span>' + T().icono('mejor') + '<b>' + (+d.mejor || 0) + '</b><small>Mejor</small></span>' +
        '<span>' + T().icono('cofre') + '<b>' + (+d.coleccion || 0) + '/' + total + '</b><small>Colección</small></span></div></div>' +
      '<div class="c-sec"><span class="ma-k">' + SV.estrella + 'Vitrina</span>' + vitrina(d) + '</div>' +
      (meta ? '<div class="c-sec"><' + (mio ? 'a href="#" data-ma="editar"' : 'div') + ' class="ma-meta">' + meta + '</' + (mio ? 'a' : 'div') + '></div>' : '') +
      '<div class="ma-dest">' + dest + '</div>' +
      (mio ? '<button type="button" class="edit" data-ma="editar" title="Editar mis datos" aria-label="Editar mis datos">' + SV.lapiz + '</button>' : '') + '</div>' +
      (op.acciones || '');
    return '<div class="ma-pf">' + stage + '<div>' + card + '</div></div>';
  }

  // Su colección: todo el catálogo con lo que tiene, lo que lleva y si tú también lo tienes
  function coleccion(d, filtro) {
    var c = C(), p = puesto(d), tiene = {};
    (d.tiene || []).forEach(function (id) { tiene[id] = 1; });
    var esp = [['', 'Todo'], ['buho', 'Búhos'], ['escena', 'Escenarios'], ['racha', 'Banners'], ['marco', 'Marcos'], ['titulo', 'Títulos'], ['pines', 'Pines']];
    var items = c.items();
    var chips = esp.map(function (e) {
      var de = items.filter(function (x) { return !e[0] || x.espacio === e[0]; });
      if (e[0] && !de.length) return '';
      var n = de.filter(function (x) { return tiene[x.id]; }).length;
      return '<button type="button" data-filtro="' + e[0] + '" class="' + ((filtro || '') === e[0] ? 'on' : '') + '">' + e[1] + (e[0] ? '<em>' + n + '/' + de.length + '</em>' : '') + '</button>';
    }).join('');
    var cards = items.filter(function (x) { return !filtro || x.espacio === filtro; }).map(function (x, i) {
      var ok = tiene[x.id], lleva = p[x.espacio] === x.id || (x.espacio === 'pines' && (p.pines || []).indexOf(x.id) >= 0), Rr = c.rareza[x.rareza] || c.rareza.comun, yo = c.tiene(x.id);
      return '<div class="mcc-it' + (ok ? '' : ' lock') + (lleva ? ' mcc-on' : '') + '" style="--c:' + Rr.c + ';--i:' + i + '">' +
        (lleva ? '<span class="lleva">Lo lleva puesto</span>' : '') + '<span class="mcc-dib">' + c.dibujo(x) + '</span>' +
        (ok ? '' : '<span class="mcc-cand"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></span>') +
        '<b>' + esc(x.nom) + '</b><small>' + Rr.nom + '</small>' +
        (ok ? '<span class="tu' + (yo ? ' si' : '') + '">' + (yo ? '✓ Tú también lo tienes' : 'Tú aún no lo tienes') + '</span>' : '<span class="tu">No lo tiene</span>') + '</div>';
    }).join('');
    return '<div class="ma-cab"><h2>Su colección <em>' + items.filter(function (x) { return tiene[x.id]; }).length + ' de ' + items.length + '</em></h2></div>' +
      '<div class="ma-chips">' + chips + '</div><div class="ma-grid">' + cards + '</div>';
  }

  // Botones del perfil (copiar ID, compartir); «editar» lo maneja cada página
  function conectar(el, d, op) {
    op = op || {};
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ma]'); if (!b) return;
      var q = b.getAttribute('data-ma');
      if (q === 'id') { e.preventDefault(); copiar(String(d.codigo), 'ID ' + d.codigo + ' copiado'); }
      else if (q === 'compartir') { e.preventDefault(); compartir(d.codigo, 'share'); }
      else if (q === 'editar' && op.editar) { e.preventDefault(); op.editar(); }
    });
  }

  window.MCAmigos = {
    SV: SV, esc: esc, nf: nf, rpc: rpc, lista: lista, ver: ver, accion: accion, invalidar: invalidar, ERRORES: ERRORES,
    foto: foto, banner: banner, emb: emb, rangoNom: rangoNom, rangoCol: rangoCol, tit: tit, ultima: ultima, hace: hace, dias: dias, vitrina: vitrina,
    perfil: perfil, coleccion: coleccion, conectar: conectar, toast: toast, copiar: copiar, compartir: compartir, enlace: enlace
  };
})();
