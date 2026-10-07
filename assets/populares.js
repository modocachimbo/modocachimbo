/* =========================================================
   Modo Cachimbo · Cursos populares de la semana (solo en el inicio)
   Lo carga assets/auth.js cuando hay alumno con sesión.
   Orden: supabase/06-populares.sql (cursos_populares). Si aún
   no hay 4 cursos con actividad, se completa con el orden de
   assets/cursos.json para que la fila nunca quede vacía.
   ========================================================= */
(function () {
  if (window.MCPopulares || !window.MCAuth) return;
  window.MCPopulares = true;
  var ancla;

  var BASE = new URL(MCAuth.base || './', location.href).href;
  var CACHE = 'mc_populares', HORA = 3600000, N = 4;

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function leer() { try { var c = JSON.parse(localStorage.getItem(CACHE)); return c && Date.now() - c.t < HORA ? c.lista : null; } catch (e) { return null; } }
  function guardar(lista) { try { localStorage.setItem(CACHE, JSON.stringify({ t: Date.now(), lista: lista })); } catch (e) { /* sin espacio */ } }

  function css() {
    var st = document.createElement('style');
    st.textContent =
      '.mcp{margin:26px 0 4px}' +
      '.mcp[hidden]{display:none}' +
      '.mcp h2{font:800 16px Sora,Inter,sans-serif;margin:0 0 12px;color:var(--text,#f2f2f2);display:flex;align-items:center;gap:8px}' +
      '.mcp h2 .mi{width:18px;height:18px;fill:none;stroke:var(--accent,#C6E000);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
      '.mcp h2 small{font:600 12px Inter,sans-serif;color:var(--text-dim,#9a9a9a)}' +
      '.mcp-fila{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}' +
      '.mcp-it{position:relative;display:flex;align-items:center;gap:12px;padding:14px;border:1px solid rgba(255,255,255,.08);background:var(--surface,#141414);border-radius:18px;text-decoration:none;color:inherit;min-width:0;transition:border-color .15s,transform .15s}' +
      '.mcp-it:hover{border-color:rgba(198,224,0,.45);transform:translateY(-2px)}' +
      '.mcp-ico{width:44px;height:44px;border-radius:13px;background:rgba(198,224,0,.12);display:grid;place-items:center;flex-shrink:0}' +
      '.mcp-ico i{width:26px;height:26px;background:var(--accent,#C6E000);-webkit-mask:var(--ico) center/contain no-repeat;mask:var(--ico) center/contain no-repeat}' +
      '.mcp-txt{min-width:0;flex:1}' +
      '.mcp-nom{display:block;font:700 14.5px Inter,sans-serif;color:var(--text,#f2f2f2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.mcp-area{display:block;font-size:12px;color:var(--text-dim,#9a9a9a);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.mcp-pos{position:absolute;top:-9px;right:12px;background:var(--accent,#C6E000);color:#0e0e0e;font:800 11px/1 Sora,Inter,sans-serif;padding:5px 8px;border-radius:100px;box-shadow:0 0 16px rgba(198,224,0,.3)}' +
      '@media (max-width:900px){.mcp-fila{grid-template-columns:repeat(2,minmax(0,1fr))}}' +
      '@media (max-width:520px){.mcp-fila{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;padding:10px 2px 6px;margin:-10px -2px 0;scrollbar-width:none}' +
      '.mcp-fila::-webkit-scrollbar{display:none}.mcp-it{flex:0 0 72%;scroll-snap-align:start}}';
    document.head.appendChild(st);
  }

  function pintar(ids, reg) {
    var cursos = (reg.cursos || []).filter(function (c) { return !c.oculto; });
    var areas = {}; (reg.areas || []).forEach(function (a) { areas[a.id] = a.nombre; });
    var por = {}; cursos.forEach(function (c) { por[c.id] = c; });
    var elegidos = [];
    ids.forEach(function (id) { if (por[id] && elegidos.indexOf(por[id]) < 0) elegidos.push(por[id]); });
    cursos.slice().sort(function (a, b) { return (a.orden || 0) - (b.orden || 0); }).forEach(function (c) {
      if (elegidos.length < N && elegidos.indexOf(c) < 0) elegidos.push(c);
    });
    elegidos = elegidos.slice(0, N);
    if (!elegidos.length) return;

    var caja = document.getElementById('mcPopulares');
    if (!caja) {
      css();
      caja = document.createElement('section');
      caja.id = 'mcPopulares'; caja.className = 'mcp';
      caja.setAttribute('aria-label', 'Cursos populares esta semana');
      // Justo antes de "Mis cursos" (y debajo de "Nuevo para ti", que se pone antes de esta fila)
      ancla.parentNode.insertBefore(caja, ancla);
    }
    caja.innerHTML = '<h2><svg class="mi" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>Populares esta semana</h2><div class="mcp-fila">' +
      elegidos.map(function (c, i) {
        return '<a class="mcp-it" href="' + esc(BASE + c.id + '/index.html') + '">' +
          '<span class="mcp-pos">#' + (i + 1) + '</span>' +
          '<span class="mcp-ico">' + (c.icono ? '<i style="--ico:url(&quot;' + esc(BASE + c.icono) + '&quot;)"></i>' : '') + '</span>' +
          '<span class="mcp-txt"><span class="mcp-nom">' + esc(c.nombre) + '</span><span class="mcp-area">' + esc(areas[c.area] || '') + '</span></span></a>';
      }).join('') + '</div>';
  }

  function iniciar() {
  ancla = document.getElementById('cursos');
  if (!ancla || !document.querySelector('.saludo')) return;
  var registro = fetch(BASE + 'assets/cursos.json').then(function (r) { return r.json(); });
  var guardada = leer();
  var pedido = guardada ? Promise.resolve(guardada) : MCAuth.listo.then(function (c) { return c.rpc('cursos_populares'); }).then(function (r) {
    var ids = !r.error && Array.isArray(r.data) ? r.data.map(function (x) { return x.carpeta; }) : [];
    if (!r.error) guardar(ids);
    return ids;
  }, function () { return []; });

  Promise.all([pedido, registro]).then(function (rs) { pintar(rs[0], rs[1]); }).catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
