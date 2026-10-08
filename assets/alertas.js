/* =========================================================
   Modo Cachimbo · Alertas (se administran desde el panel)
   Lee assets/alertas.json y muestra las que corresponden a esta página.
   ========================================================= */
(function () {
  var SCRIPT = document.currentScript;
  var ROOT = new URL('..', SCRIPT ? SCRIPT.src : location.href); // raíz del sitio (assets/..)
  var TIPOS = {
    aviso:   { color: '#FBBF24', soft: 'rgba(251,191,36,0.12)', borde: 'rgba(251,191,36,0.3)', tag: 'Aviso importante',
               icon: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' },
    info:    { color: '#60A5FA', soft: 'rgba(96,165,250,0.12)', borde: 'rgba(96,165,250,0.3)', tag: 'Información',
               icon: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>' },
    urgente: { color: '#F87171', soft: 'rgba(248,113,113,0.12)', borde: 'rgba(248,113,113,0.35)', tag: 'Urgente',
               icon: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' },
    novedad: { color: '#C6E000', soft: 'rgba(198,224,0,0.12)', borde: 'rgba(198,224,0,0.3)', tag: 'Novedad',
               icon: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>' }
  };

  var css = `
  body.mca-open { overflow: hidden; }
  .mca-ov { position: fixed; inset: 0; z-index: 110; display: flex; align-items: center; justify-content: center; padding: 20px;
    background: rgba(0,0,0,0.72); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); animation: mcaFade .25s ease; }
  .mca-ov.cerrando { animation: mcaFadeOut .2s ease forwards; }
  .mca-card { position: relative; overflow: hidden; width: 100%; max-width: 480px; max-height: calc(100vh - 40px); overflow-y: auto;
    background: linear-gradient(160deg, #1a1a1a 0%, #0e0e0e 60%); border: 1px solid #2c2c2c; border-radius: 26px;
    padding: 40px 34px 30px; text-align: center; box-shadow: 0 30px 80px rgba(0,0,0,0.6);
    font-family: 'Inter', system-ui, sans-serif; color: #f2f2f2; animation: mcaPop .35s cubic-bezier(.2,.9,.3,1.2); }
  .mca-ov.cerrando .mca-card { animation: mcaPopOut .2s ease forwards; }
  .mca-card::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 4px; background: linear-gradient(90deg, var(--mca-c), #C6E000); }
  .mca-icon { width: 76px; height: 76px; margin: 0 auto 20px; border-radius: 22px; display: flex; align-items: center; justify-content: center;
    background: var(--mca-soft); border: 1px solid var(--mca-borde); color: var(--mca-c); box-shadow: 0 0 40px var(--mca-soft); }
  .mca-icon svg { width: 38px; height: 38px; }
  .mca-tag { font-size: 11.5px; letter-spacing: 3px; text-transform: uppercase; color: var(--mca-c); font-weight: 700; margin-bottom: 10px; }
  .mca-card h2 { font-family: 'Sora', 'Inter', sans-serif; font-weight: 800; font-size: clamp(22px, 5vw, 28px); line-height: 1.2; margin: 0 0 14px; color: #f2f2f2; }
  .mca-msg { font-size: 15px; line-height: 1.65; color: #9a9a9a; }
  .mca-msg b, .mca-msg strong { color: #f2f2f2; }
  .mca-msg a, .mca-franja a { color: var(--mca-c); font-weight: 600; }
  .mca-btn { margin-top: 28px; width: 100%; background: #C6E000; color: #0e0e0e; border: none; border-radius: 14px; cursor: pointer;
    padding: 15px 20px; font-family: 'Inter', sans-serif; font-weight: 700; font-size: 15px; transition: transform .12s, box-shadow .12s; }
  .mca-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(198,224,0,0.25); }
  .mca-franja { position: relative; z-index: 30; display: flex; align-items: center; gap: 12px; padding: 12px 48px 12px 18px;
    background: linear-gradient(90deg, var(--mca-soft), rgba(20,20,20,0.95)); border-bottom: 1px solid var(--mca-borde);
    font-family: 'Inter', system-ui, sans-serif; font-size: 13.5px; line-height: 1.5; color: #d8d8d8; animation: mcaDown .3s ease; }
  .mca-franja .ico { flex-shrink: 0; width: 20px; height: 20px; color: var(--mca-c); }
  .mca-franja .ico svg { width: 20px; height: 20px; display: block; }
  .mca-franja b.t { color: #fff; margin-right: 6px; }
  .mca-franja .x { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); width: 30px; height: 30px; border-radius: 8px;
    border: none; background: none; color: #8a8a8a; cursor: pointer; font-size: 15px; }
  .mca-franja .x:hover { color: #fff; background: rgba(255,255,255,0.06); }
  .mca-franja .in { max-width: 980px; margin: 0 auto; display: flex; gap: 12px; align-items: center; width: 100%; }
  @keyframes mcaFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes mcaFadeOut { to { opacity: 0; } }
  @keyframes mcaPop { from { opacity: 0; transform: translateY(16px) scale(.94); } to { opacity: 1; transform: none; } }
  @keyframes mcaPopOut { to { opacity: 0; transform: scale(.96); } }
  @keyframes mcaDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
  @media (max-width: 480px) { .mca-card { padding: 34px 22px 22px; border-radius: 22px; } .mca-icon { width: 64px; height: 64px; } .mca-icon svg { width: 32px; height: 32px; } }
  `;

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function formato(s) {
    var e = esc(s);
    e = e.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<em>$1</em>');
    e = e.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    return e.replace(/\n/g, '<br>');
  }
  function tipo(a) { return TIPOS[a.tipo] || TIPOS.aviso; }
  function vars(el, t) { el.style.setProperty('--mca-c', t.color); el.style.setProperty('--mca-soft', t.soft); el.style.setProperty('--mca-borde', t.borde); }
  function svg(t) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + t.icon + '</svg>'; }
  function ponerEstilos() {
    if (document.getElementById('mca-css')) return;
    var st = document.createElement('style'); st.id = 'mca-css'; st.textContent = css; document.head.appendChild(st);
  }

  /* ---------- Contexto de la página ---------- */
  function contexto() {
    var rel = location.pathname.slice(ROOT.pathname.length).replace(/^\/+/, '');
    var seg = rel.split('/');
    var q = new URLSearchParams(location.search);
    var ctx = { pagina: null, carpeta: null, anio: q.get('year') || null, tema: q.get('tema') || null };
    if (rel === '' || rel === 'index.html') { ctx.pagina = 'inicio'; return ctx; }
    if (seg[0] === 'panel' || seg[0] === 'assets' || seg[0] === 'examenes' || seg[0] === 'areas') return ctx;
    ctx.carpeta = seg[0];
    var resto = seg.slice(1).join('/').replace(/^(seminarios|banqueo)\//, 'libros/');
    if (resto === '' || resto === 'index.html' || resto === 'libros/' || resto === 'libros/index.html' || resto === 'libros/temario.html') ctx.pagina = 'curso';
    else if (resto === 'libros/tema.html') ctx.pagina = 'estudio';
    else if (resto === 'libros/quiz.html') ctx.pagina = 'quiz';
    else if (resto === 'repaso.html') ctx.pagina = 'repaso';
    else if (resto === 'fijas.html') ctx.pagina = 'fijas';
    return ctx;
  }
  function pad2(t) { var s = String(t == null ? '' : t).trim(); return /^\d$/.test(s) ? '0' + s : s; }

  function aplica(a, ctx, hoy) {
    if (!a || !a.activa) return false;
    if (a.hasta && hoy > a.hasta) return false;
    if (!ctx.pagina || (a.paginas || []).indexOf(ctx.pagina) < 0) return false;
    var s = a.alcance || { nivel: 'sitio' };
    if (s.nivel === 'sitio') return true;
    if (s.carpeta !== ctx.carpeta) return false;
    if (s.nivel === 'curso') return true;
    if (!ctx.anio || s.anio !== ctx.anio) return false;
    if (s.nivel === 'anio') return true;
    return !!ctx.tema && pad2(s.tema) === pad2(ctx.tema);
  }

  /* ---------- Frecuencia ---------- */
  function clave(a) { return 'mc_alerta_' + a.id + '_' + (a.version || a.actualizada || ''); }
  function almacen(tipoF) { try { return tipoF === 'una-vez' ? localStorage : sessionStorage; } catch (e) { return null; } }
  function yaVista(a) {
    if (a.frecuencia !== 'visita' && a.frecuencia !== 'una-vez') return false;
    var st = almacen(a.frecuencia); try { return !!(st && st.getItem(clave(a))); } catch (e) { return false; }
  }
  function marcarVista(a) {
    if (a.frecuencia !== 'visita' && a.frecuencia !== 'una-vez') return;
    var st = almacen(a.frecuencia); try { st && st.setItem(clave(a), '1'); } catch (e) {}
  }

  /* ---------- Dibujo ---------- */
  function htmlVentana(a) {
    var t = tipo(a);
    return '<div class="mca-card" role="document">' +
      '<div class="mca-icon">' + svg(t) + '</div>' +
      '<div class="mca-tag">' + esc(a.etiqueta || t.tag) + '</div>' +
      (a.titulo ? '<h2>' + esc(a.titulo) + '</h2>' : '') +
      '<div class="mca-msg">' + formato(a.mensaje) + '</div>' +
      '<button class="mca-btn" type="button">' + esc(a.boton || 'Entendido') + '</button></div>';
  }
  function htmlFranja(a) {
    var t = tipo(a);
    return '<div class="in"><span class="ico">' + svg(t) + '</span><span>' + (a.titulo ? '<b class="t">' + esc(a.titulo) + '</b>' : '') +
      formato(a.mensaje).replace(/<br>/g, ' ') + '</span></div><button class="x" type="button" aria-label="Cerrar">✕</button>';
  }

  var cola = [];
  function siguienteVentana() {
    var a = cola.shift();
    if (!a) { document.body.classList.remove('mca-open'); return; }
    var ov = document.createElement('div');
    ov.className = 'mca-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    vars(ov, tipo(a));
    ov.innerHTML = htmlVentana(a);
    document.body.appendChild(ov);
    document.body.classList.add('mca-open');
    var btn = ov.querySelector('.mca-btn');
    function cerrar() {
      if (ov.classList.contains('cerrando')) return;
      marcarVista(a);
      ov.classList.add('cerrando');
      document.removeEventListener('keydown', onKey);
      setTimeout(function () { ov.remove(); siguienteVentana(); }, 200);
    }
    function onKey(e) { if (e.key === 'Escape') cerrar(); }
    btn.addEventListener('click', cerrar);
    ov.addEventListener('click', function (e) { if (e.target === ov) cerrar(); });
    document.addEventListener('keydown', onKey);
    try { btn.focus({ preventScroll: true }); } catch (e) {}
  }
  function mostrarFranja(a) {
    var f = document.createElement('div');
    f.className = 'mca-franja'; f.setAttribute('role', 'status');
    vars(f, tipo(a));
    f.innerHTML = htmlFranja(a);
    f.querySelector('.x').addEventListener('click', function () { f.remove(); });
    document.body.insertBefore(f, document.body.firstChild);
    marcarVista(a); // la franja cuenta como vista apenas aparece
  }

  function mostrar(lista) {
    ponerEstilos();
    lista.filter(function (a) { return a.estilo === 'franja'; }).reverse().forEach(mostrarFranja);
    lista.filter(function (a) { return a.estilo !== 'franja'; }).forEach(function (a) { cola.push(a); });
    if (cola.length && !document.querySelector('.mca-ov')) siguienteVentana();
  }

  // Para la vista previa del panel
  window.MCAlertas = {
    tipos: TIPOS,
    previa: function (a, cont) {
      ponerEstilos();
      var t = tipo(a);
      if (a.estilo === 'franja') {
        cont.innerHTML = '<div class="mca-franja" style="animation:none;border-radius:12px;">' + htmlFranja(a) + '</div>';
        vars(cont.firstChild, t);
      } else {
        cont.innerHTML = '<div style="display:flex;justify-content:center;">' + htmlVentana(a) + '</div>';
        var card = cont.querySelector('.mca-card'); card.style.animation = 'none'; vars(card, t);
      }
    }
  };

  if (SCRIPT && SCRIPT.hasAttribute('data-solo-previa')) return;

  function iniciar() {
    var ctx = contexto();
    if (!ctx.pagina) return;
    fetch(new URL('assets/alertas.json', ROOT).href, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (todas) {
        var hoy = new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10); // fecha en Perú
        var lista = (Array.isArray(todas) ? todas : []).filter(function (a) { return aplica(a, ctx, hoy) && !yaVista(a); });
        if (lista.length) mostrar(lista);
      })
      .catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
