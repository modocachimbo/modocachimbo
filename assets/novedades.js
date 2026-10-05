/* =========================================================
   Modo Cachimbo · Avisos de temas y cursos nuevos
   - Lo carga assets/auth.js cuando hay un alumno con sesión.
   - Los avisos los crea el panel al subir un tema nuevo
     (supabase/03-novedades.sql).
   - Pone la marca "Nuevo" en las tarjetas que llevan al tema o
     curso, y en el inicio muestra la lista "Nuevo para ti".
   - El aviso desaparece cuando el alumno abre ese tema o curso
     (se guarda en su cuenta, así que vale en todos sus equipos).
   ========================================================= */
(function () {
  if (window.MCNovedades || !window.MCAuth) return;
  if (/\/panel\//.test(location.pathname)) return;

  var BASE = new URL(MCAuth.base || './', location.href).href;
  var uid = (MCAuth.usuario() || {}).id || '';
  var CLAVE = 'mc_nov_' + uid;
  var lista = [];
  try { lista = JSON.parse(sessionStorage.getItem(CLAVE) || '[]') || []; } catch (e) {}

  function guardar() { try { sessionStorage.setItem(CLAVE, JSON.stringify(lista)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad2(t) { t = String(t == null ? '' : t).trim(); return /^\d+$/.test(t) ? ('0' + parseInt(t, 10)).slice(-2) : t; }

  // Dirección relativa a la raíz del sitio: "algebra/libros/tema.html?year=2027-I&tema=05"
  function rel(href) {
    var u;
    try { u = new URL(href, location.href); } catch (e) { return null; }
    var raiz = new URL(BASE);
    if (u.origin !== raiz.origin || u.pathname.indexOf(raiz.pathname) !== 0) return null;
    var p = u.pathname.slice(raiz.pathname.length).replace(/(^|\/)index\.html$/, '$1');
    var q = [];
    if (u.searchParams.get('year')) q.push('year=' + u.searchParams.get('year'));
    if (u.searchParams.get('tema')) q.push('tema=' + pad2(u.searchParams.get('tema')));
    return p + (q.length ? '?' + q.join('&') : '');
  }

  function urlTema(n) { return n.carpeta + '/libros/tema.html?year=' + n.anio + '&tema=' + pad2(n.tema); }
  function destino(n) { return n.tipo === 'curso' ? n.carpeta + '/' : urlTema(n); }

  // Páginas cuyo enlace lleva hacia este aviso
  function claves(n) {
    var c = n.carpeta, k = [c + '/', c + '/libros/'];
    if (n.area) k.push('areas/' + n.area + '.html');
    if (n.anio) k.push(c + '/libros/temario.html?year=' + n.anio);
    if (n.tipo === 'tema' && n.anio && n.tema) k.push(urlTema(n));
    return k;
  }

  /* ---------- Estilos ---------- */
  function css() {
    if (document.getElementById('mcn-css')) return;
    var st = document.createElement('style'); st.id = 'mcn-css';
    st.textContent =
      '.mcn-host{position:relative}' +
      '.mcn-tag{display:inline-flex;align-items:center;background:var(--accent,#C6E000);color:#0e0e0e;font:800 10px/1 Sora,Inter,sans-serif;letter-spacing:.8px;text-transform:uppercase;padding:5px 8px;border-radius:100px;white-space:nowrap;pointer-events:none;box-shadow:0 0 18px rgba(198,224,0,.35)}' +
      '.mcn-tag.abs{position:absolute;top:10px;right:10px;z-index:2}' +
      '.mcn-tag.inl{margin-left:8px;vertical-align:2px}' +
      '.mcn{margin:26px 0 6px;border:1px solid rgba(198,224,0,.28);background:linear-gradient(180deg,rgba(198,224,0,.07),rgba(198,224,0,.015));border-radius:22px;padding:18px 18px 12px}' +
      '.mcn[hidden]{display:none}' +
      '.mcn-cab{display:flex;align-items:center;gap:10px;margin-bottom:10px}' +
      '.mcn-cab h2{font:800 16px Sora,Inter,sans-serif;margin:0;color:var(--text,#f2f2f2)}' +
      '.mcn-cab .mcn-n{margin-left:auto;font:700 12px Inter,sans-serif;color:var(--accent,#C6E000)}' +
      '.mcn-item{display:flex;align-items:center;gap:14px;padding:12px 4px;border-top:1px solid rgba(255,255,255,.06);text-decoration:none;color:inherit;min-width:0}' +
      '.mcn-item:first-of-type{border-top:none}' +
      '.mcn-item:hover .mcn-tit{color:var(--accent,#C6E000)}' +
      '.mcn-ico{width:40px;height:40px;border-radius:12px;background:rgba(198,224,0,.12);color:var(--accent,#C6E000);display:grid;place-items:center;font:800 13px Sora,Inter,sans-serif;flex-shrink:0}' +
      '.mcn-txt{min-width:0;flex:1}' +
      '.mcn-tit{display:block;font:600 14.5px Inter,sans-serif;color:var(--text,#f2f2f2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:color .15s}' +
      '.mcn-sub{display:block;font-size:12.5px;color:var(--text-dim,#9a9a9a);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.mcn-item svg{width:18px;height:18px;color:var(--text-faint,#666);flex-shrink:0}' +
      '.mcn-mas{display:block;width:100%;margin-top:4px;padding:10px;border:none;background:none;color:var(--accent,#C6E000);font:700 13px Inter,sans-serif;cursor:pointer;border-top:1px solid rgba(255,255,255,.06)}' +
      '@media (max-width:520px){.mcn{padding:14px 14px 8px;border-radius:18px}.mcn-tag.abs{top:8px;right:8px;font-size:9px;padding:4px 7px}}';
    document.head.appendChild(st);
  }

  /* ---------- Marca "Nuevo" en tarjetas ---------- */
  var HOST = '.card, .course, .year-card, .tema-card';
  function decorar() {
    css();
    var mapa = {};
    lista.forEach(function (n) { claves(n).forEach(function (k) { mapa[k] = true; }); });
    // Quitar marcas que ya no corresponden
    Array.prototype.forEach.call(document.querySelectorAll('.mcn-tag'), function (t) {
      if (!mapa[t.getAttribute('data-k')]) t.remove();
    });
    if (!lista.length) return;
    Array.prototype.forEach.call(document.querySelectorAll('a[href]'), function (a) {
      if (a.closest('.mcn, .barra, header, .mcu, [data-mc-auth], .back, .home-btn, .logo')) return;
      var k = rel(a.getAttribute('href'));
      if (k == null || !mapa[k] || k === aqui) return;
      var host = a.closest(HOST) || a;
      if (host.querySelector('.mcn-tag')) return;
      var tag = document.createElement('span');
      tag.textContent = 'Nuevo'; tag.setAttribute('data-k', k);
      var linea = host.querySelector('.tema-info .name, .yr');
      if (linea) { tag.className = 'mcn-tag inl'; linea.appendChild(tag); }
      else { tag.className = 'mcn-tag abs'; host.classList.add('mcn-host'); host.appendChild(tag); }
    });
  }

  /* ---------- Inicio: "Nuevo para ti" ---------- */
  var abierto = false;
  var FLECHA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 6 15 12 9 18"/></svg>';
  function pintarInicio() {
    if (aqui !== '') return;
    var ancla = document.getElementById('cursos');
    if (!ancla) return;
    var caja = document.getElementById('mcNovedades');
    if (!caja) {
      caja = document.createElement('section');
      caja.id = 'mcNovedades'; caja.className = 'mcn';
      caja.setAttribute('aria-label', 'Nuevo para ti');
      ancla.parentNode.insertBefore(caja, ancla);
    }
    if (!lista.length) { caja.hidden = true; return; }
    css();
    var ver = abierto ? lista : lista.slice(0, 3);
    caja.innerHTML = '<div class="mcn-cab"><h2>✨ Nuevo para ti</h2><span class="mcn-n">' + lista.length + (lista.length === 1 ? ' novedad' : ' novedades') + '</span></div>' +
      ver.map(function (n) {
        var esCurso = n.tipo === 'curso';
        var tit = esCurso ? 'Curso nuevo: ' + n.curso : n.curso + ' · ' + (n.nombre || 'Tema ' + pad2(n.tema));
        var sub = esCurso ? 'Ya puedes empezar a estudiarlo' : 'Tema ' + pad2(n.tema) + ' nuevo · Libro ' + n.anio;
        return '<a class="mcn-item" href="' + esc(BASE + destino(n)) + '"><span class="mcn-ico">' + (esCurso ? '★' : esc(pad2(n.tema))) + '</span>' +
          '<span class="mcn-txt"><span class="mcn-tit">' + esc(tit) + '</span><span class="mcn-sub">' + esc(sub) + '</span></span>' + FLECHA + '</a>';
      }).join('') +
      (lista.length > 3 ? '<button type="button" class="mcn-mas">' + (abierto ? 'Ver menos' : 'Ver todos (' + lista.length + ')') + '</button>' : '');
    caja.hidden = false;
    var b = caja.querySelector('.mcn-mas');
    if (b) b.addEventListener('click', function () { abierto = !abierto; pintarInicio(); });
  }

  function pintar() { decorar(); pintarInicio(); }

  /* ---------- Abrió el tema o curso: ya no es nuevo ---------- */
  var aqui = rel(location.href);
  function vistosAqui() {
    if (aqui == null) return [];
    return lista.filter(function (n) {
      return n.tipo === 'curso' ? aqui.indexOf(n.carpeta + '/') === 0 : aqui === urlTema(n);
    }).map(function (n) { return n.id; });
  }

  function rpc(nombre, args) {
    return MCAuth.listo.then(function (c) { return c.rpc(nombre, args || {}); }).then(function (r) {
      if (r.error) throw r.error;
      return r.data;
    });
  }

  function marcar(ids) {
    if (!ids.length) return;
    lista = lista.filter(function (n) { return ids.indexOf(n.id) < 0; });
    guardar();
    rpc('marcar_novedades', { ids: ids }).catch(function () {});
  }

  function cargar() {
    return rpc('mis_novedades').then(function (r) {
      lista = Array.isArray(r) ? r : [];
      marcar(vistosAqui());
      guardar(); pintar();
    }, function () { pintar(); });
  }

  // Listas que se arman después (temario, años): se marcan al aparecer
  var pendiente = null;
  new MutationObserver(function (cambios) {
    if (!lista.length || pendiente) return;
    var propio = cambios.every(function (m) {
      return Array.prototype.every.call(m.addedNodes, function (x) { return x.nodeType !== 1 || (x.classList && x.classList.contains('mcn-tag')) || x.id === 'mcNovedades' || (x.closest && x.closest('.mcn')); });
    });
    if (propio) return;
    pendiente = setTimeout(function () { pendiente = null; decorar(); }, 120);
  }).observe(document.body, { childList: true, subtree: true });

  window.MCNovedades = { lista: function () { return lista.slice(); }, recargar: cargar, pintar: pintar };

  marcar(vistosAqui());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pintar); else pintar();
  cargar();
})();
