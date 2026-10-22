/* =========================================================
   Modo Cachimbo · "Mis accesos" en el perfil
   Cada código con su estado (activo, vencido…), cuántos equipos usa
   y el botón para quitarlo de este equipo (libera su cupo).
   Usa window.MCAcceso (assets/acceso.js) y las acciones misCodigos
   y soltar del Apps Script.
   ========================================================= */
(function () {
  var ul = document.getElementById('accesos');
  if (!ul || !window.MCAcceso) return;

  var NOMBRES = { 'repaso-VIP': 'Todos los Repasos', 'fijas-VIP': 'Todas las Fijas', 'seminario-VIP': 'Todos los Seminarios', 'banqueo-VIP': 'Todo el Banqueo', 'tarjetas-VIP': 'Todas las Flashcards', 'TODO-VIP': 'Acceso total', 'simulacro': 'Simulacro' };
  var TIPO = { repaso: 'Repaso de ', fijas: 'Fijas de ', seminario: 'Seminarios de ', banqueo: 'Banqueo de ', tarjetas: 'Flashcards de ' };
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
  var COLOR = { repaso: '#CE82FF', fijas: '#FFC800', seminario: '#FF9600', banqueo: '#FF4B4B', tarjetas: '#C6E000', simulacro: '#1CB0F6', curso: '#1CB0F6', TODO: '#C6E000' };
  var ICO = {
    repaso: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
    fijas: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>',
    seminario: '<path d="M4 19.5V5a2.5 2.5 0 0 1 2.5-2.5H20v17H6.5A2.5 2.5 0 0 0 4 22"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>',
    banqueo: '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    tarjetas: '<rect x="3" y="7" width="13" height="14" rx="2.5"/><path d="M8 3h10a3 3 0 0 1 3 3v10"/>',
    simulacro: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M10 2h4"/>',
    curso: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    TODO: '<path d="M12 2l3 6.5 7 .9-5.1 4.8 1.3 7L12 17.8 5.8 21.2l1.3-7L2 9.4l7-.9z"/>'
  };

  var st = document.createElement('style');
  st.textContent = [
    '.acc{list-style:none;margin-top:16px;display:flex;flex-direction:column;gap:10px;font-family:Nunito,Inter,sans-serif}',
    '.acc li{display:flex;align-items:flex-start;gap:12px;padding:12px 12px 12px 14px;border-radius:16px;background:var(--surface-2);border:2px solid #2C2549;border-bottom-width:4px}',
    '.acc li.vacio{display:block;color:var(--text-dim);font-weight:700;font-size:14px;border-style:dashed;border-bottom-width:2px}',
    '.acc .ic{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;flex-shrink:0}',
    '.acc .ic svg{width:22px;height:22px}',
    '.acc .tx{flex:1;min-width:0}',
    '.acc b{display:block;font:900 15.5px Nunito,sans-serif;overflow-wrap:anywhere}',
    '.acc code{font:800 12.5px ui-monospace,Menlo,monospace;color:var(--text-dim);letter-spacing:.04em}',
    '.acc .meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}',
    '.acc .meta i{font:normal 900 11.5px Nunito,sans-serif;border-radius:8px;padding:3px 8px;background:#272041;color:#cfcfcf}',
    '.acc .meta i.ok{background:rgba(198,224,0,.12);color:#C6E000}',
    '.acc .meta i.mal{background:rgba(255,75,75,.14);color:#FF4B4B}',
    '.acc .quitar{display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:7px 11px;border-radius:12px;border:2px solid #322B52;border-bottom-width:4px;background:transparent;color:#cfcfcf;font:900 13px Nunito,sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}',
    '.acc .quitar:active{transform:translateY(2px);border-bottom-width:2px}',
    '.acc li.mal{border-color:rgba(255,75,75,.35);border-bottom-color:rgba(255,75,75,.6)}',
    '.acc .aviso{display:block;margin-top:6px;font:800 12.5px/1.4 Nunito,sans-serif;color:#ff8a8a}',
    '.acc li.elegido{border-color:rgba(255,75,75,.5)}',
    '.acc li.conf{display:block;padding:14px;border-color:rgba(255,75,75,.4);background:rgba(255,75,75,.07)}',
    '.acc li.conf b{font-size:15px}',
    '.acc li.conf p{color:var(--text-dim);font:700 13px/1.45 Nunito,sans-serif;margin:4px 0 12px}',
    '.acc li.conf p strong{color:var(--text)}',
    '.acc .bts{display:flex;gap:8px;flex-wrap:wrap}',
    '.acc .rojo{padding:10px 16px;border-radius:12px;border:0;background:#FF4B4B;color:#fff;font:1000 13.5px Nunito,sans-serif;text-transform:uppercase;letter-spacing:.04em;box-shadow:0 4px 0 #c43434;cursor:pointer}',
    '.acc .rojo:disabled{opacity:.6}',
    '.acc .gris{padding:10px 16px;border-radius:12px;border:2px solid #322B52;border-bottom-width:4px;background:transparent;color:#ddd;font:900 13.5px Nunito,sans-serif;cursor:pointer}',
    '.acc .err{color:#FF4B4B;font:800 13px Nunito,sans-serif;margin-top:10px}',
    '.acc .local{margin-top:10px;padding:9px 14px;border-radius:12px;border:2px dashed #FF4B4B;background:transparent;color:#ff9b9b;font:900 13px Nunito,sans-serif;cursor:pointer}',
    '.acc-pie{display:flex;gap:10px 14px;margin-top:14px;align-items:center;flex-wrap:wrap}',
    '.acc-btn{display:inline-flex;align-items:center;gap:8px;padding:11px 16px;border-radius:14px;border:2px solid #1CB0F6;border-bottom-width:5px;background:rgba(28,176,246,.1);color:#1CB0F6;font:1000 13.5px Nunito,sans-serif;letter-spacing:.04em;text-transform:uppercase;text-decoration:none}',
    '.acc-btn svg{width:18px;height:18px}',
    '.acc-pie small{color:var(--text-dim);font:800 12.5px Nunito,sans-serif;flex:1;min-width:180px}'
  ].join('\n');
  document.head.appendChild(st);
  ul.className = 'acc';

  var pie = document.createElement('div');
  pie.className = 'acc-pie';
  pie.innerHTML = '<a class="acc-btn" href="index.html#codigo"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="15" r="5" fill="currentColor"/><circle cx="8" cy="15" r="2" fill="#0b2a3a"/><path d="M11.5 11.5 20 3m-4 4 3 3m-5.5-.5 2 2" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>Activar otro código</a>' +
    '<small>Cada código se puede quitar de un equipo hasta 2 veces al mes.</small>';
  ul.after(pie);
  var nota = document.getElementById('accesosNota');
  if (nota) nota.textContent = 'Tus códigos se guardan en tu cuenta. Si quitas uno de este equipo, deja libre su cupo y puedes activarlo otra vez.';

  var cursos = {}, servidor = {}, elegido = null, error = '', sinRed = false;
  fetch('assets/cursos.json').then(function (r) { return r.json(); }).then(function (d) {
    (d.cursos || []).forEach(function (c) { cursos[c.id] = c.nombre; });
    pintar();
  }).catch(function () {});

  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function nombre(prod) {
    return String(prod || '').split(',').map(function (p) {
      if (NOMBRES[p]) return NOMBRES[p];
      var m = /^(curso|repaso|fijas|seminario|banqueo|tarjetas)-(.+)$/.exec(p);
      if (!m) return p;
      var c = cursos[m[2]] || m[2];
      return m[1] === 'curso' ? c + ' completo' : TIPO[m[1]] + c;
    }).join(' + ');
  }
  function tipo(prod) {
    var p = String(prod || '').split(',')[0];
    if (p === 'TODO-VIP') return 'TODO';
    return p === 'simulacro' ? 'simulacro' : p.split('-')[0];
  }
  function fecha(s) { var p = String(s).split('-'); return +p[2] + ' ' + MESES[+p[1] - 1] + ' ' + p[0]; }

  function fila(a) {
    var s = servidor[a.codigo] || {}, t = tipo(a.producto), col = COLOR[t] || '#1CB0F6';
    var vence = s.vence !== undefined ? s.vence : a.vence;
    var aviso = s.estado && s.estado !== 'activo' ? s.mensaje : a.error;
    var mal = !!aviso;
    var chips = [];
    if (mal) chips.push('<i class="mal">' + (s.estado === 'vencido' ? 'Venció' : s.estado === 'desactivado' ? 'Desactivado' : s.estado === 'no-existe' ? 'Ya no existe' : s.estado === 'lleno' ? 'Sin cupo' : 'No funciona') + '</i>');
    else chips.push('<i class="ok">Activo</i>');
    if (vence) chips.push('<i>' + (s.estado === 'vencido' ? '' : 'Vence ') + fecha(vence) + '</i>');
    else if (!mal) chips.push('<i>Sin vencimiento</i>');
    if (!mal && s.max > 0) chips.push('<i>' + s.usados + ' de ' + s.max + (s.max === 1 ? ' equipo' : ' equipos') + '</i>');
    return '<li class="' + (mal ? 'mal' : '') + (elegido === a.codigo ? ' elegido' : '') + '"><span class="ic" style="background:' + col + '22;color:' + col + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">' + (ICO[t] || ICO.curso) + '</svg></span>' +
      '<div class="tx"><b>' + esc(nombre(s.producto || a.producto)) + '</b><code>' + esc(a.codigo) + '</code><div class="meta">' + chips.join('') + '</div>' +
      (mal ? '<span class="aviso">' + esc(aviso) + '</span>' : '') +
      '<button type="button" class="quitar" data-c="' + esc(a.codigo) + '">' + (mal ? 'Quitar de la lista' : 'Quitar de este equipo') + '</button></div></li>' +
      (elegido === a.codigo ? confirmar(a, s, mal) : '');
  }

  function confirmar(a, s, mal) {
    var quedan = s.limite ? Math.max(0, s.limite - (s.soltadas || 0)) : null;
    var texto = mal ? 'Se borra de tu lista y de tu cuenta.'
      : 'Dejará de abrirse en este equipo y se libera 1 equipo del código. Puedes activarlo otra vez cuando quieras.' +
        (quedan !== null && s.registrado ? '<br>Te quedan <strong>' + quedan + ' de ' + s.limite + '</strong> quitadas este mes para este código.' : '');
    return '<li class="conf"><b>¿Quitar ' + esc(nombre(s.producto || a.producto)) + (mal ? ' de tu lista?' : ' de este equipo?') + '</b><p>' + texto + '</p>' +
      '<div class="bts"><button type="button" class="rojo" data-si="' + esc(a.codigo) + '">Sí, quitar</button><button type="button" class="gris" data-no="1">Cancelar</button></div>' +
      (error ? '<div class="err" role="alert">' + esc(error) + '</div>' : '') +
      (sinRed ? '<button type="button" class="local" data-local="' + esc(a.codigo) + '">Quitarlo solo de este equipo</button>' : '') + '</li>';
  }

  function pintar() {
    var lista = MCAcceso.todos();
    if (!lista.length) { ul.innerHTML = '<li class="vacio">Aún no activaste ningún código. Tócalo abajo para activar el tuyo.</li>'; return; }
    ul.innerHTML = lista.map(fila).join('');
  }

  function revisar() {
    pintar();
    MCAcceso.estado().then(function (m) { if (m) { servidor = m; pintar(); } });
  }

  ul.addEventListener('click', function (e) {
    var q = e.target.closest('[data-c]'), si = e.target.closest('[data-si]'), no = e.target.closest('[data-no]'), lo = e.target.closest('[data-local]');
    if (q) { elegido = elegido === q.dataset.c ? null : q.dataset.c; error = ''; sinRed = false; pintar(); return; }
    if (no) { elegido = null; error = ''; sinRed = false; pintar(); return; }
    if (lo) { MCAcceso.soltar(lo.dataset.local, true).then(function () { elegido = null; error = ''; sinRed = false; revisar(); }); return; }
    if (!si) return;
    si.disabled = true; si.textContent = 'Quitando…';
    MCAcceso.soltar(si.dataset.si).then(function (r) {
      if (r.ok) { elegido = null; error = ''; sinRed = false; delete servidor[si.dataset.si]; revisar(); return; }
      error = r.mensaje || r.error || 'No se pudo quitar. Inténtalo otra vez.'; sinRed = false; pintar();
    }, function () {
      error = 'No se pudo conectar con el servidor. Inténtalo otra vez o quítalo solo de este equipo (el cupo no se libera).';
      sinRed = true; pintar();
    });
  });

  window.MCMisAccesos = { pintar: revisar };
})();
