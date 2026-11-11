/* =========================================================
   Modo Cachimbo · Clanes en el inicio
   Pestañas «Alumnos | Clanes» en el Top de la semana (menú de la izquierda en PC
   y la sección de abajo en el celular). El top de clanes sale de ranking_clanes
   (supabase/88-clanes.sql) y solo se pide al abrir la pestaña Clanes.
   ========================================================= */
(function () {
  var K = window.MCClanes;
  if (!K) return;
  var LS = 'mc_inicio_top_tab';
  var tab = 'alumnos';
  try { if (localStorage.getItem(LS) === 'clanes') tab = 'clanes'; } catch (e) {}
  var datos = null, cargando = false, fallo = false;

  var css = document.createElement('style');
  css.textContent =
    '.cl-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:8px 8px 0}' +
    '.cl-tabs button{height:32px;display:grid;place-items:center;border:1px solid var(--borde);background:var(--tarjeta2);color:var(--suave);cursor:pointer;' +
      'font:italic 900 15px/1 var(--display);text-transform:uppercase;letter-spacing:.04em;clip-path:polygon(0 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%)}' +
    '.cl-tabs button.on{background:var(--lima);color:#14101f;border-color:#8fa300}' +
    '.liga li.cl{grid-template-columns:30px 34px minmax(0,1fr) auto !important;text-decoration:none;color:inherit}' +
    '.liga li.cl .esc{width:34px;height:39px;display:block;filter:drop-shadow(0 3px 4px rgba(0,0,0,.45))}' +
    '.liga li.cl .esc svg{width:100%;height:100%;display:block}' +
    '.liga li.cl .quien small{display:block;color:var(--suave);font:800 11px/1.1 var(--display);text-transform:uppercase;letter-spacing:.04em;margin-top:2px}' +
    '.liga li.cl-cta{display:block;text-align:center;padding:12px;clip-path:none;font-size:13.5px;color:var(--suave)}' +
    '.liga li.cl-cta a{color:var(--lima-tx,#C6E000);font-weight:900;text-decoration:none}' +
    '.cl-ver{display:block;text-align:center;padding:4px 0 12px;font:italic 900 15px/1 var(--display);text-transform:uppercase;color:var(--amarillo-tx);text-decoration:none;letter-spacing:.03em}';
  document.head.appendChild(css);

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function miles(n) { return (+n || 0).toLocaleString('es-PE').replace(/,/g, ' '); }
  var CLS = ['', 'oro', 'plata', 'bronce'];
  function pos(p) { return window.MCTopPuesto ? MCTopPuesto(p) : '<span class="num">' + p + '</span>'; }
  function fila(c) {
    return '<li class="cl ' + (CLS[c.puesto] || '') + (c.mio ? ' tu' : '') + '"><span class="pos">' + pos(c.puesto) + '</span><span class="esc">' + K.escudo(c) + '</span>' +
      '<span class="quien"><b>' + esc(c.nombre) + '</b><small>' + (c.mio ? 'Tu clan · ' : '') + c.miembros + ' miembros</small></span><span class="xp">' + miles(c.xp) + ' <small>XP</small></span></li>';
  }
  function lista(n) {
    if (fallo) return '<li class="vacio">No se pudo cargar el top de clanes. Revisa tu conexión.</li>';
    if (!datos) return '<li class="vacio">Cargando…</li>';
    var t = (datos.top || []).slice(0, n), h = t.map(fila).join('');
    if (datos.mio && !t.some(function (c) { return c.mio; })) h += '<li class="sep">···</li>' + fila(datos.mio);
    if (!t.length) h = '<li class="vacio">Aún ningún clan suma XP esta semana.</li>';
    if (!datos.tengo_clan) h += '<li class="cl-cta">¿Aún sin clan? <a href="clanes.html">Únete o crea uno ›</a></li>';
    return h;
  }

  // Cada lugar del inicio donde va el top: su lista de alumnos y cuántos clanes muestra
  var lugares = [];
  function preparar(idLista, n) {
    var ol = document.getElementById(idLista);
    if (!ol) return;
    var cl = document.createElement('ol');
    cl.className = 'liga cl-liga'; cl.style.display = 'none';
    var ver = document.createElement('a');
    ver.className = 'cl-ver'; ver.href = 'clanes.html#top'; ver.textContent = 'Ver top de clanes ›'; ver.style.display = 'none';
    var tabs = document.createElement('div');
    tabs.className = 'cl-tabs'; tabs.setAttribute('role', 'tablist');
    tabs.innerHTML = '<button type="button" role="tab" data-cltab="alumnos">Alumnos</button><button type="button" role="tab" data-cltab="clanes">Clanes</button>';
    ol.parentNode.insertBefore(tabs, ol);
    ol.parentNode.insertBefore(cl, ol.nextSibling);
    cl.parentNode.insertBefore(ver, cl.nextSibling);
    lugares.push({ ol: ol, cl: cl, ver: ver, tabs: tabs, n: n, mas: ol.parentNode.querySelector('#topMas'), cab: ol.parentNode.querySelector('#ligaNom') });
  }
  function aplicar() {
    lugares.forEach(function (l) {
      var c = tab === 'clanes';
      l.ol.style.display = c ? 'none' : ''; l.cl.style.display = c ? '' : 'none'; l.ver.style.display = c ? '' : 'none';
      [].forEach.call(l.tabs.children, function (b) { var on = b.getAttribute('data-cltab') === tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
      if (l.mas) l.mas.style.display = c ? 'none' : '';
      if (l.cab) { if (!l.cab.dataset.alumnos) l.cab.dataset.alumnos = l.cab.textContent; l.cab.textContent = c ? 'Clanes · semana' : l.cab.dataset.alumnos; }
      if (c) l.cl.innerHTML = lista(l.n);
    });
    if (tab === 'clanes' && !datos && !cargando) {
      cargando = true; fallo = false;
      K.ranking().then(function (d) { datos = d || { top: [] }; }, function () { fallo = true; }).then(function () { cargando = false; aplicar(); });
    }
  }
  function iniciar() {
    preparar('topLado', 3);
    preparar('topCel', 4);
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cltab]');
      if (!b) return;
      tab = b.getAttribute('data-cltab');
      try { localStorage.setItem(LS, tab); } catch (x) {}
      aplicar();
    });
    if (window.MCAuth && MCAuth.listo) MCAuth.listo.then(aplicar, aplicar); else aplicar();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
