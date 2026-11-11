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
    '.cl-av{display:flex;align-items:center;gap:10px;margin:8px 8px 0;padding:9px 11px;text-decoration:none;color:#fff;border:1.5px solid #6b1f2c;background:linear-gradient(100deg,#3a1030,#1c0f33 60%,#0f2440);' +
      'clip-path:polygon(0 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%);animation:clAvEnt .4s ease-out both}' +
    '.cl-av.nar{border-color:rgba(255,150,0,.5);background:linear-gradient(100deg,#3a2410,#1c0f33)}' +
    '.cl-av.win{border-color:#8fa300;background:linear-gradient(100deg,#2c3a08,#1c0f33)}' +
    '.cl-av svg{width:24px;height:24px;flex:none;fill:none;stroke:#FF4B4B;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}' +
    '.cl-av.nar svg{stroke:#FF9600}.cl-av.win svg{stroke:#C6E000}' +
    '.cl-av span{flex:1;min-width:0}.cl-av b{display:block;font:italic 900 15px/1.05 var(--display);text-transform:uppercase;letter-spacing:.02em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.cl-av small{display:block;color:#c9bfe6;font-size:11.5px;margin-top:2px}' +
    '.cl-av i{display:flex;height:6px;margin-top:5px;background:#1CB0F6;overflow:hidden}.cl-av i em{display:block;background:#C6E000}' +
    '@keyframes clAvEnt{from{opacity:0;transform:translateY(-6px)}}@media (prefers-reduced-motion:reduce){.cl-av{animation:none}}' +
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
  // Aviso de guerra, reto o empujones (clan_aviso en supabase/89-clanes-guerras.sql)
  var IC = {
    guerra: '<svg viewBox="0 0 24 24"><path d="M5 3l14 14M19 3 5 17M3 21l4-4M21 21l-4-4"/></svg>',
    empujar: '<svg viewBox="0 0 24 24"><path d="M5 12h11M12 6l6 6-6 6"/></svg>',
    copa: '<svg viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>'
  };
  function quedan(fin) {
    var ms = Math.max(0, new Date(fin) - Date.now()), h = Math.floor(ms / 36e5), m = Math.floor(ms / 6e4) % 60;
    return h >= 24 ? Math.floor(h / 24) + ' d ' + (h % 24) + ' h' : h ? h + ' h ' + m + ' min' : m + ' min';
  }
  function avisoHtml(a) {
    var g = a.guerra, e = a.empujaron || [], r = a.resultado;
    if (g && g.estado === 'activa') {
      var t = Math.max(1, (+g.xp_mio || 0) + (+g.xp_rival || 0)), p = t > 1 ? Math.round(100 * g.xp_mio / t) : 50, va = +g.xp_mio >= +g.xp_rival;
      return '<a class="cl-av" href="clanes.html#guerra">' + IC.guerra + '<span><b>Guerra vs ' + esc(g.rival) + '</b><small>' + (+g.xp_mio === +g.xp_rival ? 'Van empatados' : va ? 'Van ganando' : 'Van perdiendo') + ' ' + miles(g.xp_mio) + ' a ' + miles(g.xp_rival) + ' · quedan ' + quedan(g.fin) + '</small><i><em style="width:' + p + '%"></em></i></span></a>';
    }
    if (g && g.estado === 'pendiente' && !g.reto_mio) return '<a class="cl-av" href="clanes.html#guerra">' + IC.guerra + '<span><b>¡' + esc(g.rival) + ' los retó!</b><small>Tu líder o sublíder puede aceptar la guerra</small></span></a>';
    if (r) return '<a class="cl-av' + (r.gane ? ' win' : '') + '" href="clanes.html#guerra">' + (r.gane ? IC.copa : IC.guerra) + '<span><b>' + (r.gane ? '¡Ganaron la guerra!' : r.empate ? 'Guerra empatada' : 'Perdieron la guerra') + '</b><small>vs ' + esc(r.rival) + ' · ' + miles(r.xp_mio) + ' a ' + miles(r.xp_rival) + ' XP</small></span></a>';
    if (e.length) return '<a class="cl-av nar" href="clanes.html">' + IC.empujar + '<span><b>' + esc(e[0]) + (e.length > 1 ? ' y ' + (e.length - 1) + ' más' : '') + ' te ' + (e.length > 1 ? 'empujaron' : 'empujó') + '</b><small>Tu clan te espera: estudia hoy y suma para la meta</small></span></a>';
    return '';
  }
  function aviso() {
    if (!window.MCAuth || !MCAuth.usuario || !MCAuth.usuario()) return;
    K.rpc('clan_aviso').then(function (a) {
      if (!a || !a.clan) return;
      var h = avisoHtml(a);
      var punto = !!h;
      if (punto) [].forEach.call(document.querySelectorAll('a.acceso[href="clanes.html"]'), function (x) { x.classList.add('punto'); });
      if (!h) return;
      lugares.forEach(function (l) {
        var d = document.createElement('div'); d.innerHTML = h;
        l.tabs.parentNode.insertBefore(d.firstChild, l.tabs);
      });
    }, function () {});
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
    if (window.MCAuth && MCAuth.listo) MCAuth.listo.then(function () { aplicar(); aviso(); }, aplicar); else aplicar();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
