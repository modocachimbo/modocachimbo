/* =========================================================
   Modo Cachimbo · "Mi agenda" en el perfil
   Calendario del mes, lo de cada día, próximas fechas y la
   hoja para agregar o editar. Usa window.MCAgenda (assets/agenda.js)
   ========================================================= */
(function () {
  var A = window.MCAgenda, raiz = document.getElementById('tabAgenda');
  if (!A || !raiz) return;

  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
  var DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  var CORTO = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  var ICO = A.ICO;
  ICO.yo = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg>';
  ICO.izq = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
  ICO.gcal = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><path d="M12 8.5v7M8.5 12h7"/></svg>';
  ICO.cerrar = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  var st = document.createElement('style');
  st.textContent = [
    '.ag-p{font-family:Nunito,Inter,sans-serif}',
    '.ag-caja{background:var(--surface);border:2px solid var(--border);border-bottom-width:5px;border-radius:22px;padding:18px 16px;margin-top:18px}',
    '.ag-cab{display:flex;align-items:center;gap:10px}',
    '.ag-cab h2{font:1000 23px/1.1 Nunito,sans-serif;text-transform:capitalize}',
    '.ag-cab p{color:var(--text-dim);font-weight:800;font-size:13.5px;margin-top:3px}',
    '.ag-cab .esp{flex:1}',
    '.ag-nav{width:40px;height:40px;border-radius:12px;border:2px solid #2e2e2e;border-bottom-width:4px;background:transparent;color:var(--text);display:grid;place-items:center;cursor:pointer;-webkit-tap-highlight-color:transparent}',
    '.ag-nav:active{transform:translateY(2px);border-bottom-width:2px}',
    '.ag-nav svg{width:18px;height:18px}',
    '.ag-sem,.ag-mes{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}',
    '.ag-sem{margin:16px 0 6px;text-align:center;font:900 12px Nunito,sans-serif;color:var(--text-dim)}',
    '.ag-d{position:relative;aspect-ratio:1/1.05;min-width:0;border:0;border-radius:12px;background:#1b1b1b;color:var(--text);font:1000 15.5px Nunito,sans-serif;font-variant-numeric:tabular-nums;cursor:pointer;padding:6px 0 0;display:flex;flex-direction:column;align-items:center;gap:3px;-webkit-tap-highlight-color:transparent}',
    '.ag-d.fuera{background:transparent;color:#3a3a3a;cursor:default}',
    '.ag-d.paso{color:#5f5f5f;background:#151515}',
    '.ag-d.hoy{background:var(--accent);color:#1f2600;box-shadow:0 4px 0 #8fa300}',
    '.ag-d.sel{box-shadow:inset 0 0 0 2.5px #f2f2f2}',
    '.ag-d.hoy.sel{box-shadow:0 4px 0 #8fa300,inset 0 0 0 2.5px #1f2600}',
    '.ag-d .bs{position:absolute;left:14%;right:14%;bottom:7px;display:flex;flex-direction:column;gap:2px}',
    '.ag-d .bs i{display:block;height:4px;border-radius:3px}',
    '.ag-d.paso .bs i{opacity:.45}',
    '.ag-ley{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:14px;font:800 13px Nunito,sans-serif;color:var(--text-dim)}',
    '.ag-ley span{display:inline-flex;align-items:center;gap:6px}.ag-ley i{width:10px;height:10px;border-radius:3px}',
    '.ag-dia h3{font:1000 19px/1.2 Nunito,sans-serif}',
    '.ag-dia>p{color:var(--text-dim);font-weight:800;font-size:13.5px;margin:3px 0 12px}',
    '.ag-ev{display:flex;align-items:center;gap:12px;padding:12px 12px 12px 14px;border-radius:16px;background:#181818;margin-bottom:8px}',
    '.ag-ev .lin{align-self:stretch;width:5px;border-radius:4px;flex-shrink:0}',
    '.ag-ev .tx{flex:1;min-width:0}',
    '.ag-ev b{display:block;font:900 15.5px/1.25 Nunito,sans-serif;overflow-wrap:anywhere}',
    '.ag-ev .q{display:block;color:var(--text-dim);font-weight:800;font-size:13px;margin-top:2px;overflow-wrap:anywhere}',
    '.ag-ev .de{display:inline-flex;align-items:center;gap:5px;margin-top:5px;font:900 11px Nunito,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--text-dim)}',
    '.ag-ev .de svg{width:13px;height:13px}',
    '.ag-ev .ac{flex-shrink:0;width:38px;height:38px;border-radius:12px;border:0;background:transparent;color:var(--text-dim);display:grid;place-items:center;cursor:pointer;text-decoration:none}',
    '.ag-ev .ac:hover{background:#222;color:var(--text)}.ag-ev .ac svg{width:20px;height:20px}',
    '.ag-ev.paso{opacity:.55}',
    '.ag-nada{color:var(--text-dim);font-weight:800;font-size:14px;padding:6px 2px 12px}',
    '.ag-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:14px;border:0;border-radius:16px;background:var(--accent);color:#1f2600;font:1000 15.5px Nunito,sans-serif;letter-spacing:.06em;text-transform:uppercase;box-shadow:0 5px 0 #8fa300;cursor:pointer;margin-top:6px;-webkit-tap-highlight-color:transparent}',
    '.ag-btn:active{transform:translateY(4px);box-shadow:0 1px 0 #8fa300}.ag-btn svg{width:20px;height:20px}',
    '.ag-btn:disabled{opacity:.5;cursor:default}',
    '.ag-prox h3{font:1000 19px Nunito,sans-serif;margin-bottom:10px}',
    '.ag-pr{display:flex;align-items:center;gap:12px;width:100%;padding:10px 4px;border:0;border-top:1px solid #222;background:transparent;color:var(--text);text-align:left;cursor:pointer;font-family:Nunito,sans-serif}',
    '.ag-pr:first-of-type{border-top:0}',
    '.ag-pr .n{flex-shrink:0;width:50px;height:50px;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;font:1000 20px/1 Nunito,sans-serif;font-variant-numeric:tabular-nums}',
    '.ag-pr .n small{font:900 9.5px Nunito,sans-serif;letter-spacing:.05em;text-transform:uppercase;margin-top:2px}',
    '.ag-pr .tx{flex:1;min-width:0}.ag-pr b{display:block;font:900 15px Nunito,sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.ag-pr span.q{font-weight:800;font-size:12.5px;color:var(--text-dim)}',
    '.ag-pr .ca{width:15px;height:15px;color:var(--text-dim);flex-shrink:0}',
    '.ag-aviso{margin-top:18px;padding:14px 16px;border-radius:16px;border:2px dashed #2e2e2e;color:var(--text-dim);font-weight:800;font-size:14px;line-height:1.5}',
    /* Hoja para agregar o editar */
    '.ag-fondo{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.72);display:flex;align-items:flex-end;justify-content:center;padding:0}',
    '.ag-fondo[hidden]{display:none}',
    '.ag-hoja{width:100%;max-width:520px;max-height:92vh;overflow:auto;background:var(--surface);border:2px solid var(--border);border-bottom:0;border-radius:24px 24px 0 0;padding:18px 18px calc(22px + env(safe-area-inset-bottom,0px));font-family:Nunito,sans-serif}',
    '@media (min-width:620px){.ag-fondo{align-items:center;padding:20px}.ag-hoja{border-radius:24px;border-bottom:2px solid var(--border)}}',
    '.ag-hoja .top{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}',
    '.ag-hoja .top b{font:1000 13px Nunito,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--text-dim)}',
    '.ag-x{width:38px;height:38px;border:0;border-radius:12px;background:transparent;color:var(--text-dim);display:grid;place-items:center;cursor:pointer}.ag-x svg{width:20px;height:20px}',
    '.ag-hoja label,.ag-hoja .lb{display:block;font:900 14px Nunito,sans-serif;color:var(--text-dim);margin:12px 0 6px}',
    '.ag-ops{display:flex;flex-wrap:wrap;gap:8px}',
    '.ag-op{padding:10px 15px;border-radius:14px;border:2px solid #2a2a2a;background:transparent;color:var(--text);font:900 14.5px Nunito,sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}',
    '.ag-op.on{border-color:var(--c,#1CB0F6);color:var(--c,#1CB0F6);background:color-mix(in srgb,var(--c,#1CB0F6) 14%,transparent)}',
    '.ag-hoja input,.ag-hoja textarea{width:100%;padding:13px 15px;border-radius:14px;border:2px solid #2a2a2a;background:#0a0a0a;color:var(--text);font:800 16px Nunito,sans-serif;color-scheme:dark}',
    '.ag-hoja textarea{resize:vertical;min-height:52px}',
    '.ag-hoja input:focus,.ag-hoja textarea:focus{outline:none;border-color:#1CB0F6}',
    '.ag-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.ag-2>div{min-width:0}',
    '.ag-err{color:#FF4B4B;font-weight:800;font-size:13.5px;min-height:18px;margin-top:10px}',
    '.ag-hoja .ag-btn{margin-top:8px}',
    '.ag-pie{display:flex;align-items:center;justify-content:center;gap:18px;flex-wrap:wrap;margin-top:16px}',
    '.ag-g{display:inline-flex;align-items:center;gap:8px;color:#1CB0F6;font:900 14.5px Nunito,sans-serif;text-decoration:none}.ag-g svg{width:20px;height:20px}',
    '.ag-borrar{border:0;background:transparent;color:#FF4B4B;font:900 14.5px Nunito,sans-serif;cursor:pointer;padding:4px}',
    '@media (min-width:600px){.ag-d{aspect-ratio:auto;height:62px;font-size:16.5px}.ag-mes,.ag-sem{gap:8px}}',
    '@media (max-width:420px){.ag-caja{padding:16px 12px}.ag-sem,.ag-mes{gap:5px}.ag-d{font-size:14.5px;border-radius:11px}.ag-d .bs{bottom:6px}}'
  ].join('\n');
  document.head.appendChild(st);

  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function color(t) { return (A.TIPOS[t] || A.TIPOS.otro).c; }

  var lista = [], hoyS = A.hoy(), sel = hoyS, ver = A.aFecha(hoyS), error = false;
  ver.setDate(1);

  raiz.innerHTML =
    '<div class="ag-p">' +
    '<section class="ag-caja" aria-label="Calendario">' +
      '<div class="ag-cab"><div><h2 id="agMes"></h2><p id="agMesSub"></p></div><span class="esp"></span>' +
      '<button type="button" class="ag-nav" id="agAnt" aria-label="Mes anterior">' + ICO.izq + '</button>' +
      '<button type="button" class="ag-nav" id="agSig" aria-label="Mes siguiente">' + ICO.flecha + '</button></div>' +
      '<div class="ag-sem" aria-hidden="true"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>' +
      '<div class="ag-mes" id="agGrid"></div>' +
      '<div class="ag-ley">' + Object.keys(A.TIPOS).map(function (k) { return '<span><i style="background:' + A.TIPOS[k].c + '"></i>' + A.TIPOS[k].n + '</span>'; }).join('') + '</div>' +
    '</section>' +
    '<section class="ag-caja ag-dia" id="agDia"></section>' +
    '<section class="ag-caja ag-prox" id="agProx"></section>' +
    '</div>' +
    '<div class="ag-fondo" id="agFondo" hidden><form class="ag-hoja" id="agForm" novalidate role="dialog" aria-modal="true" aria-labelledby="agHojaTit">' +
      '<div class="top"><b id="agHojaTit">Agregar fecha</b><button type="button" class="ag-x" id="agCerrar" aria-label="Cerrar">' + ICO.cerrar + '</button></div>' +
      '<span class="lb">¿Qué es?</span><div class="ag-ops" id="agTipos">' +
        Object.keys(A.TIPOS).map(function (k) { return '<button type="button" class="ag-op" data-v="' + k + '" style="--c:' + A.TIPOS[k].c + '">' + A.TIPOS[k].n + '</button>'; }).join('') + '</div>' +
      '<label for="agTitulo">Título</label><input id="agTitulo" maxlength="80" placeholder="Ej.: Seminario 3 · Álgebra" autocomplete="off">' +
      '<div class="ag-2"><div><label for="agFecha">Fecha</label><input id="agFecha" type="date"></div>' +
      '<div><label for="agHora">Hora <small>(opcional)</small></label><input id="agHora" type="time"></div></div>' +
      '<label for="agNota">Nota</label><textarea id="agNota" maxlength="200" rows="2" placeholder="Ej.: llevar DNI, repasar Logaritmos"></textarea>' +
      '<span class="lb">Que el búho me avise</span><div class="ag-ops" id="agAvisos">' +
        A.AVISOS.map(function (a) { return '<button type="button" class="ag-op" data-v="' + a[0] + '">' + a[1] + '</button>'; }).join('') + '</div>' +
      '<div class="ag-err" id="agErr" role="alert"></div>' +
      '<button type="submit" class="ag-btn" id="agGuardar">Guardar</button>' +
      '<div class="ag-pie"><a class="ag-g" id="agGoogle" href="#" target="_blank" rel="noopener noreferrer">' + ICO.gcal + 'Agregar también a Google Calendar</a>' +
      '<button type="button" class="ag-borrar" id="agBorrar" hidden>Borrar</button></div>' +
    '</form></div>';

  function $(id) { return document.getElementById(id); }

  function delDia(s) { return lista.filter(function (e) { return e.fecha === s; }); }

  function pintarMes() {
    var y = ver.getFullYear(), m = ver.getMonth();
    $('agMes').textContent = MESES[m];
    var n = lista.filter(function (e) { var d = A.aFecha(e.fecha); return d.getFullYear() === y && d.getMonth() === m; }).length;
    $('agMesSub').textContent = y + ' · ' + (n === 0 ? 'sin fechas este mes' : n === 1 ? '1 fecha este mes' : n + ' fechas este mes');
    var ini = new Date(y, m, 1), lunes = (ini.getDay() + 6) % 7;
    var d = new Date(y, m, 1 - lunes), html = '';
    var semanas = Math.ceil((lunes + new Date(y, m + 1, 0).getDate()) / 7);
    for (var i = 0; i < semanas * 7; i++) {
      var s = A.iso(d), fuera = d.getMonth() !== m;
      if (fuera) html += '<span class="ag-d fuera" aria-hidden="true">' + d.getDate() + '</span>';
      else {
        var evs = delDia(s), cls = 'ag-d' + (s === hoyS ? ' hoy' : s < hoyS ? ' paso' : '') + (s === sel ? ' sel' : '');
        html += '<button type="button" class="' + cls + '" data-d="' + s + '" aria-label="' + d.getDate() + ' de ' + MESES[m] + (evs.length ? ', ' + evs.length + (evs.length === 1 ? ' fecha' : ' fechas') : '') + '">' + d.getDate() +
          (evs.length ? '<span class="bs">' + evs.slice(0, 3).map(function (e) { return '<i style="background:' + color(e.tipo) + '"></i>'; }).join('') + '</span>' : '') + '</button>';
      }
      d.setDate(d.getDate() + 1);
    }
    $('agGrid').innerHTML = html;
  }

  function filaEvento(e) {
    var meta = [e.hora ? A.hora12(e.hora) : '', e.nota || ''].filter(Boolean).join(' · ');
    var mio = e.origen === 'mio';
    return '<div class="ag-ev' + (e.fecha < hoyS ? ' paso' : '') + '"><span class="lin" style="background:' + color(e.tipo) + '"></span><div class="tx">' +
      '<b>' + esc(e.titulo) + '</b>' + (meta ? '<span class="q">' + esc(meta) + '</span>' : '') +
      '<span class="de">' + (mio ? ICO.yo + 'Tuya' : ICO.candado + 'De Modo Cachimbo') + '</span></div>' +
      (mio && !e.fija ? '<button type="button" class="ac" data-ed="' + e.id + '" aria-label="Editar">' + ICO.lapiz + '</button>'
        : '<a class="ac" href="' + esc(A.google(e)) + '" target="_blank" rel="noopener noreferrer" aria-label="Agregar a Google Calendar">' + ICO.gcal + '</a>') +
      '</div>';
  }

  function pintarDia() {
    var d = A.aFecha(sel), evs = delDia(sel), n = A.dias(sel);
    var cuando = n === 0 ? 'Hoy' : n === 1 ? 'Mañana' : n === -1 ? 'Ayer' : n > 0 ? 'En ' + n + ' días' : 'Hace ' + (-n) + ' días';
    var cosas = evs.length === 0 ? 'nada anotado' : evs.length === 1 ? '1 cosa este día' : evs.length + ' cosas este día';
    $('agDia').innerHTML = '<h3>' + DIAS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()] + '</h3><p>' + cuando + ' · ' + cosas + '</p>' +
      evs.map(filaEvento).join('') +
      (A.sinTabla() ? '<div class="ag-aviso">Muy pronto podrás anotar tus fechas aquí.</div>'
        : '<button type="button" class="ag-btn" id="agAgregar">' + ICO.mas + 'Agregar en este día</button>');
  }

  function pintarProx() {
    var t = A.proximas(lista, 8);
    if (error) { $('agProx').innerHTML = '<h3>Próximas fechas</h3><p class="ag-nada">No se pudo cargar tu agenda. Revisa tu internet.</p>'; return; }
    $('agProx').innerHTML = '<h3>Próximas fechas</h3>' + (t.length ? t.map(function (e) {
      var n = A.dias(e.fecha), c = color(e.tipo), d = A.aFecha(e.fecha);
      return '<button type="button" class="ag-pr" data-d="' + e.fecha + '"><span class="n" style="background:' + c + '26;color:' + c + '">' + (n === 0 ? 'HOY' : n + '<small>' + (n === 1 ? 'día' : 'días') + '</small>') + '</span>' +
        '<span class="tx"><b>' + esc(e.titulo) + '</b><span class="q">' + CORTO[d.getDay()] + ' ' + d.getDate() + ' ' + A.MESES[d.getMonth()] + (e.hora ? ' · ' + A.hora12(e.hora) : '') + '</span></span>' +
        (e.origen === 'mc' ? '<span class="ca" title="De Modo Cachimbo">' + ICO.candado + '</span>' : '') + '</button>';
    }).join('') : '<p class="ag-nada">Aún no tienes fechas. Toca un día del calendario y agrega tu primer seminario, simulacro o examen.</p>');
  }

  function pintar() { pintarMes(); pintarDia(); pintarProx(); }

  function elegir(s) {
    sel = s;
    var d = A.aFecha(s);
    if (d.getMonth() !== ver.getMonth() || d.getFullYear() !== ver.getFullYear()) { ver = new Date(d.getFullYear(), d.getMonth(), 1); }
    pintar();
  }

  $('agAnt').onclick = function () { ver.setMonth(ver.getMonth() - 1); pintarMes(); };
  $('agSig').onclick = function () { ver.setMonth(ver.getMonth() + 1); pintarMes(); };
  $('agGrid').addEventListener('click', function (ev) { var b = ev.target.closest('[data-d]'); if (b) elegir(b.dataset.d); });
  $('agProx').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-d]'); if (!b) return;
    elegir(b.dataset.d);
    $('agDia').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('agDia').addEventListener('click', function (ev) {
    if (ev.target.closest('#agAgregar')) return abrir(null);
    var b = ev.target.closest('[data-ed]');
    if (b) abrir(lista.filter(function (e) { return e.origen === 'mio' && String(e.id) === b.dataset.ed; })[0]);
  });

  /* ---------- Hoja: agregar o editar ---------- */
  var editando = null, tipo = 'otro', aviso = 1;
  function marcar(caja, v) { [].forEach.call($(caja).children, function (b) { b.classList.toggle('on', b.dataset.v === String(v)); }); }
  function datos() {
    return { id: editando && editando.id, tipo: tipo, titulo: $('agTitulo').value.trim(), fecha: $('agFecha').value, hora: $('agHora').value || null, nota: $('agNota').value.trim(), aviso: aviso };
  }
  function actualizarGoogle() {
    var d = datos();
    $('agGoogle').href = d.titulo && d.fecha ? A.google(d) : '#';
    $('agGoogle').style.opacity = d.titulo && d.fecha ? '' : '.5';
  }
  function abrir(e) {
    editando = e || null;
    tipo = e ? e.tipo : 'seminario'; aviso = e ? e.aviso : 1;
    $('agHojaTit').textContent = e ? 'Editar fecha' : 'Agregar fecha';
    $('agTitulo').value = e ? e.titulo : '';
    $('agFecha').value = e ? e.fecha : sel;
    $('agHora').value = e && e.hora ? e.hora : '';
    $('agNota').value = e && e.nota ? e.nota : '';
    $('agErr').textContent = '';
    $('agBorrar').hidden = !e; $('agBorrar').textContent = 'Borrar';
    marcar('agTipos', tipo); marcar('agAvisos', aviso);
    actualizarGoogle();
    $('agFondo').hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(function () { if (!e) $('agTitulo').focus(); }, 50);
  }
  function cerrar() { $('agFondo').hidden = true; document.body.style.overflow = ''; }
  $('agCerrar').onclick = cerrar;
  $('agFondo').addEventListener('click', function (ev) { if (ev.target === this) cerrar(); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !$('agFondo').hidden) cerrar(); });
  $('agTipos').addEventListener('click', function (ev) { var b = ev.target.closest('[data-v]'); if (b) { tipo = b.dataset.v; marcar('agTipos', tipo); } });
  $('agAvisos').addEventListener('click', function (ev) { var b = ev.target.closest('[data-v]'); if (b) { aviso = +b.dataset.v; marcar('agAvisos', aviso); } });
  ['agTitulo', 'agFecha', 'agHora', 'agNota'].forEach(function (id) { $(id).addEventListener('input', actualizarGoogle); });
  $('agGoogle').addEventListener('click', function (ev) { if (this.getAttribute('href') === '#') { ev.preventDefault(); $('agErr').textContent = 'Primero pon el título y la fecha.'; } });

  $('agForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var d = datos();
    if (!d.titulo) { $('agErr').textContent = 'Ponle un título.'; $('agTitulo').focus(); return; }
    if (!d.fecha) { $('agErr').textContent = 'Elige la fecha.'; $('agFecha').focus(); return; }
    var b = $('agGuardar'); b.disabled = true; b.textContent = 'Guardando…';
    A.guardar(d).then(function () {
      cerrar(); sel = d.fecha; elegir(d.fecha);
    }).catch(function (e) {
      $('agErr').textContent = e && e.message === 'sin-tabla' ? 'La agenda aún no está activa. Inténtalo más tarde.' : 'No se pudo guardar. Revisa tu internet e inténtalo otra vez.';
    }).then(function () { b.disabled = false; b.textContent = 'Guardar'; });
  });
  $('agBorrar').addEventListener('click', function () {
    var b = this;
    if (b.textContent === 'Borrar') { b.textContent = '¿Seguro? Toca otra vez'; return; }
    b.disabled = true;
    A.borrar(editando.id).then(cerrar, function () { $('agErr').textContent = 'No se pudo borrar. Inténtalo otra vez.'; })
      .then(function () { b.disabled = false; });
  });

  function cargar() {
    hoyS = A.hoy();
    A.cargar().then(function (l) { lista = l; error = false; pintar(); }, function () { lista = []; error = true; pintar(); });
  }
  A.alCambiar(function (l) { lista = l; pintar(); });
  pintar();
  window.MCAgendaPerfil = { cargar: cargar };
})();
