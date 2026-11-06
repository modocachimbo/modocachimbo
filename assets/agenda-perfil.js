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
    '.ag-nav{width:40px;height:40px;border-radius:12px;border:2px solid #322B52;border-bottom-width:4px;background:transparent;color:var(--text);display:grid;place-items:center;cursor:pointer;-webkit-tap-highlight-color:transparent}',
    '.ag-nav:active{transform:translateY(2px);border-bottom-width:2px}',
    '.ag-nav svg{width:18px;height:18px}',
    '.ag-sem,.ag-mes{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}',
    '.ag-sem{margin:16px 0 6px;text-align:center;font:900 12px Nunito,sans-serif;color:var(--text-dim)}',
    '.ag-d{position:relative;aspect-ratio:1/1.05;min-width:0;border:0;border-radius:12px;background:#231D3C;color:var(--text);font:1000 15.5px Nunito,sans-serif;font-variant-numeric:tabular-nums;cursor:pointer;padding:6px 0 0;display:flex;flex-direction:column;align-items:center;gap:3px;-webkit-tap-highlight-color:transparent}',
    '.ag-d.fuera{background:transparent;color:#3a3a3a;cursor:default}',
    '.ag-d.paso{color:#5f5f5f;background:#1E1935}',
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
    '.ag-ev{display:flex;align-items:center;gap:12px;padding:12px 12px 12px 14px;border-radius:16px;background:#201B39;margin-bottom:8px}',
    '.ag-ev .lin{align-self:stretch;width:5px;border-radius:4px;flex-shrink:0}',
    '.ag-ev .tx{flex:1;min-width:0}',
    '.ag-ev b{display:block;font:900 15.5px/1.25 Nunito,sans-serif;overflow-wrap:anywhere}',
    '.ag-ev .q{display:block;color:var(--text-dim);font-weight:800;font-size:13px;margin-top:2px;overflow-wrap:anywhere}',
    '.ag-ev .de{display:inline-flex;align-items:center;gap:5px;margin-top:5px;font:900 11px Nunito,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--text-dim)}',
    '.ag-ev .de svg{width:13px;height:13px}',
    '.ag-ev .ac{flex-shrink:0;width:38px;height:38px;border-radius:12px;border:0;background:transparent;color:var(--text-dim);display:grid;place-items:center;cursor:pointer;text-decoration:none}',
    '.ag-ev .ac:hover{background:#292245;color:var(--text)}.ag-ev .ac svg{width:20px;height:20px}',
    '.ag-ev.paso{opacity:.55}',
    '.ag-nada{color:var(--text-dim);font-weight:800;font-size:14px;padding:6px 2px 12px}',
    '.ag-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:14px;border:0;border-radius:16px;background:var(--accent);color:#1f2600;font:1000 15.5px Nunito,sans-serif;letter-spacing:.06em;text-transform:uppercase;box-shadow:0 5px 0 #8fa300;cursor:pointer;margin-top:6px;-webkit-tap-highlight-color:transparent}',
    '.ag-btn:active{transform:translateY(4px);box-shadow:0 1px 0 #8fa300}.ag-btn svg{width:20px;height:20px}',
    '.ag-btn:disabled{opacity:.5;cursor:default}',
    '.ag-prox h3{font:1000 19px Nunito,sans-serif;margin-bottom:10px}',
    '.ag-pr{display:flex;align-items:center;gap:12px;width:100%;padding:10px 4px;border:0;border-top:1px solid #292245;background:transparent;color:var(--text);text-align:left;cursor:pointer;font-family:Nunito,sans-serif}',
    '.ag-pr:first-of-type{border-top:0}',
    '.ag-pr .n{flex-shrink:0;width:50px;height:50px;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;font:1000 20px/1 Nunito,sans-serif;font-variant-numeric:tabular-nums}',
    '.ag-pr .n small{font:900 9.5px Nunito,sans-serif;letter-spacing:.05em;text-transform:uppercase;margin-top:2px}',
    '.ag-pr .tx{flex:1;min-width:0}.ag-pr b{display:block;font:900 15px Nunito,sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.ag-pr span.q{font-weight:800;font-size:12.5px;color:var(--text-dim)}',
    '.ag-pr .ca{width:15px;height:15px;color:var(--text-dim);flex-shrink:0}',
    '.ag-aviso{margin-top:18px;padding:14px 16px;border-radius:16px;border:2px dashed #322B52;color:var(--text-dim);font-weight:800;font-size:14px;line-height:1.5}',
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
    '.ag-op{padding:10px 15px;border-radius:14px;border:2px solid #2F284E;background:transparent;color:var(--text);font:900 14.5px Nunito,sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}',
    '.ag-op.on{border-color:var(--c,#1CB0F6);color:var(--c,#1CB0F6);background:color-mix(in srgb,var(--c,#1CB0F6) 14%,transparent)}',
    '.ag-hoja input,.ag-hoja textarea{width:100%;padding:13px 15px;border-radius:14px;border:2px solid #2F284E;background:#110D20;color:var(--text);font:800 16px Nunito,sans-serif;color-scheme:dark}',
    '.ag-hoja textarea{resize:vertical;min-height:52px}',
    '.ag-hoja input:focus,.ag-hoja textarea:focus{outline:none;border-color:#1CB0F6}',
    '.ag-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.ag-2>div{min-width:0}',
    '.ag-err{color:#FF4B4B;font-weight:800;font-size:13.5px;min-height:18px;margin-top:10px}',
    '.ag-hoja .ag-btn{margin-top:8px}',
    '.ag-pie{display:flex;align-items:center;justify-content:center;gap:18px;flex-wrap:wrap;margin-top:16px}',
    '.ag-g{display:inline-flex;align-items:center;gap:8px;color:#1CB0F6;font:900 14.5px Nunito,sans-serif;text-decoration:none}.ag-g svg{width:20px;height:20px}',
    '.ag-borrar{border:0;background:transparent;color:#FF4B4B;font:900 14.5px Nunito,sans-serif;cursor:pointer;padding:4px}',
    '@media (min-width:600px){.ag-d{aspect-ratio:auto;height:62px;font-size:16.5px}.ag-mes,.ag-sem{gap:8px}}',
    '@media (max-width:420px){.ag-caja{padding:16px 12px}.ag-sem,.ag-mes{gap:5px}.ag-d{font-size:14.5px;border-radius:11px}.ag-d .bs{bottom:6px}}',
    /* ===== Agenda v2: compacta, oscura y con fuego (como la racha) ===== */
    '.ag-p{display:grid;gap:14px}',
    '.ag-caja{margin-top:0;border-radius:20px;border:2px solid #2f2852;border-bottom-width:5px;background:radial-gradient(70% 90% at 0% 0%,rgba(255,150,0,.10),transparent 70%),linear-gradient(180deg,#1c1636,#120e24)}',
    '.ag-hero{position:relative;overflow:hidden;display:flex;align-items:center;gap:16px;padding:16px 18px;border-radius:20px;border:2px solid color-mix(in srgb,var(--hc,#FF9600) 45%,#2f2852);border-bottom-width:5px;background:radial-gradient(60% 130% at 0% 0%,color-mix(in srgb,var(--hc,#FF9600) 30%,transparent),transparent 70%),radial-gradient(50% 90% at 100% 100%,rgba(255,61,46,.14),transparent 70%),linear-gradient(180deg,#1c1636,#120e24);color:#fff;text-align:left;cursor:pointer;width:100%;font:inherit}',
    '.ag-hero.vacio{--hc:#5b5f80;cursor:default}',
    '.ag-reloj{flex-shrink:0;width:58px;height:58px;filter:drop-shadow(0 0 10px color-mix(in srgb,var(--hc,#FF9600) 45%,transparent))}.ag-reloj svg{width:100%;height:100%;display:block}',
    '.ag-reloj .aguja{transform-origin:24px 27px;animation:agAguja 4s steps(60) infinite}',
    '.ag-reloj{animation:agTic 1s ease-in-out infinite}',
    '@keyframes agAguja{to{transform:rotate(360deg)}}',
    '@keyframes agTic{0%,100%{transform:rotate(0)}50%{transform:rotate(-3deg)}}',
    '.ag-hero.vacio .ag-reloj{filter:none;animation:none}.ag-hero.vacio .ag-reloj .aguja{animation-duration:12s}',
    /* Días de examen: brasa con llamita animada */
    '.ag-d.fuego{overflow:visible;animation:agBrasa 1.6s ease-in-out infinite}',
    '.ag-d.fuego::after{content:"";position:absolute;top:-9px;right:-5px;width:15px;height:18px;background:radial-gradient(circle at 50% 70%,#FFF3A0 0 22%,#FFC21A 35%,#FF6A1A 62%,transparent 64%);clip-path:path("M7.5 0C8.5 4 14 6.5 14 11.5 14 15.5 11 18 7.5 18S1 15.5 1 11.5C1 8.5 3 7 4 5.5 4.3 7.5 5.2 8.6 6.3 9 5.8 5.5 6.3 2.8 7.5 0Z");transform-origin:50% 100%;animation:rcLlama 1.1s ease-in-out infinite;filter:drop-shadow(0 0 4px #FF9600)}',
    '@keyframes agBrasa{0%,100%{box-shadow:0 0 8px rgba(255,120,0,.4),inset 0 -2px 0 rgba(0,0,0,.25)}50%{box-shadow:0 0 16px rgba(255,140,0,.75),inset 0 -2px 0 rgba(0,0,0,.25)}}',
    '.ag-d.hoy{animation:agHoy 2.4s ease-in-out infinite}',
    '@keyframes agHoy{0%,100%{box-shadow:0 3px 0 #8fa300}50%{box-shadow:0 3px 0 #8fa300,0 0 14px rgba(198,224,0,.55)}}',
    '@media (prefers-reduced-motion:reduce){.ag-reloj,.ag-reloj .aguja,.ag-d.fuego,.ag-d.fuego::after,.ag-d.hoy{animation:none}}',
    '@media (max-width:600px){.ag-hero b{white-space:normal!important;display:-webkit-box!important;-webkit-line-clamp:2;-webkit-box-orient:vertical}.ag-hero{gap:12px;padding:14px}.ag-hero .num{font-size:40px}}',
    '.ag-hero .num{font:italic 900 46px/.9 "Barlow Condensed","Arial Narrow",sans-serif;text-shadow:0 3px 0 rgba(0,0,0,.4)}',
    '.ag-hero .num small{font-size:20px;margin-left:4px;letter-spacing:.04em;text-transform:uppercase}',
    '.ag-hero .tx{flex:1;min-width:0}',
    '.ag-hero .k{display:block;font:italic 900 14px/1 "Barlow Condensed","Arial Narrow",sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--hc,#FF9600);margin-bottom:5px}',
    '.ag-hero b{display:block;font:900 17px/1.2 Nunito,sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.ag-hero .q{display:block;font:800 13px Nunito,sans-serif;color:#cfc8ee;margin-top:3px}',
    '.ag-cab h2{font:italic 900 24px/1 "Barlow Condensed","Arial Narrow",sans-serif;letter-spacing:.04em;text-transform:uppercase}',
    '.ag-cab p{font-size:12.5px;margin-top:4px}',
    '.ag-nav{width:34px;height:34px;border-radius:10px;border-bottom-width:3px}',
    '.ag-nav svg{width:15px;height:15px}',
    '.ag-cal{max-width:380px;margin:12px auto 0;padding:10px 12px 12px;border-radius:14px;background:rgba(0,0,0,.25)}',
    '.ag-sem{margin:0 0 6px;font:italic 900 13px "Barlow Condensed","Arial Narrow",sans-serif}',
    '.ag-sem,.ag-mes{grid-template-columns:repeat(7,1fr);gap:5px}',
    '.ag-d,.ag-d.fuera{aspect-ratio:auto;height:40px;border-radius:10px;padding:0;justify-content:center;font-size:13.5px;background:rgba(255,255,255,.05)}',
    '.ag-d.fuera{background:transparent;color:rgba(255,255,255,.14)}',
    '.ag-d.paso{background:transparent;color:rgba(255,255,255,.35)}',
    '.ag-d.ev{background:color-mix(in srgb,var(--ec) 22%,transparent);color:#fff;box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--ec) 55%,transparent)}',
    '.ag-d.ev.fuego{background:radial-gradient(circle at 50% 35%,#FFB547,#FF6A1A);color:#3a1300;box-shadow:0 0 10px rgba(255,120,0,.45),inset 0 -2px 0 rgba(0,0,0,.25)}',
    '.ag-d.hoy{background:var(--accent);color:#1f2600;box-shadow:0 3px 0 #8fa300}',
    '.ag-d.sel{box-shadow:inset 0 0 0 2px #fff}',
    '.ag-d.hoy.sel{box-shadow:0 3px 0 #8fa300,inset 0 0 0 2px #1f2600}',
    '.ag-d .bs{left:50%;right:auto;bottom:4px;transform:translateX(-50%);flex-direction:row;gap:2px}',
    '.ag-d .bs i{width:4px;height:4px;border-radius:50%}',
    '.ag-d.ev .bs{display:none}',
    '.ag-ley{justify-content:center;gap:4px 12px;margin-top:10px;font-size:11.5px}.ag-ley i{width:8px;height:8px;border-radius:50%}',
    '.ag-dia h3,.ag-prox h3{font:italic 900 19px/1.1 "Barlow Condensed","Arial Narrow",sans-serif;letter-spacing:.04em;text-transform:uppercase}',
    '.ag-ev{background:rgba(255,255,255,.04);border:1.5px solid rgba(255,255,255,.06)}',
    '.ag-pr .n{width:44px;height:44px;border-radius:12px;font:italic 900 20px/1 "Barlow Condensed","Arial Narrow",sans-serif}',
    '@media (min-width:900px){.ag-p{grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start}.ag-hero{grid-column:1/-1}.ag-p>.ag-cal-caja{grid-row:2/span 2}}',
    '@media (min-width:600px){.ag-d,.ag-d.fuera{height:42px;font-size:14px}}',
    '@media (max-width:420px){.ag-d,.ag-d.fuera{height:38px}}'
  ].join('\n');
  document.head.appendChild(st);

  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function color(t) { return (A.TIPOS[t] || A.TIPOS.otro).c; }

  var lista = [], hoyS = A.hoy(), sel = hoyS, ver = A.aFecha(hoyS), error = false;
  ver.setDate(1);

  raiz.innerHTML =
    '<div class="ag-p bc">' +
    '<button type="button" class="ag-hero" id="agHero"></button>' +
    '<section class="ag-caja ag-cal-caja" aria-label="Calendario">' +
      '<div class="ag-cab"><div><h2 id="agMes"></h2><p id="agMesSub"></p></div><span class="esp"></span>' +
      '<button type="button" class="ag-nav" id="agAnt" aria-label="Mes anterior">' + ICO.izq + '</button>' +
      '<button type="button" class="ag-nav" id="agSig" aria-label="Mes siguiente">' + ICO.flecha + '</button></div>' +
      '<div class="ag-cal"><div class="ag-sem" aria-hidden="true"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>' +
      '<div class="ag-mes" id="agGrid"></div></div>' +
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
        var fut = evs.length && s > hoyS;
        if (fut) cls += ' ev' + (evs.some(function (e) { return e.tipo === 'examen'; }) ? ' fuego' : '');
        html += '<button type="button" class="' + cls + '"' + (fut ? ' style="--ec:' + color(evs[0].tipo) + '"' : '') + ' data-d="' + s + '" aria-label="' + d.getDate() + ' de ' + MESES[m] + (evs.length ? ', ' + evs.length + (evs.length === 1 ? ' fecha' : ' fechas') : '') + '">' + d.getDate() +
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

  var RELOJ = '<span class="ag-reloj" aria-hidden="true"><svg viewBox="0 0 48 48"><defs><linearGradient id="agR1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4F1FF"/><stop offset="1" stop-color="#B9B2D8"/></linearGradient></defs>' +
    '<rect x="20" y="2" width="8" height="5" rx="1.5" fill="var(--hc,#FF9600)" stroke="#2a1f00" stroke-width="1.5"/><rect x="22.5" y="6" width="3" height="4" fill="#8a84a8"/>' +
    '<path d="M36.5 9.5l3 3" stroke="#8a84a8" stroke-width="3.2" stroke-linecap="round"/>' +
    '<circle cx="24" cy="27" r="18" fill="url(#agR1)" stroke="#1d1836" stroke-width="2.4"/><circle cx="24" cy="27" r="13.5" fill="#15112a"/>' +
    '<circle class="arco" cx="24" cy="27" r="13.5" fill="none" stroke="var(--hc,#FF9600)" stroke-width="3" stroke-dasharray="84.8" stroke-dashoffset="21" transform="rotate(-90 24 27)"/>' +
    '<g class="aguja"><path d="M24 27V16" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></g><circle cx="24" cy="27" r="2.4" fill="var(--hc,#FF9600)"/></svg></span>';
  function pintarHero() {
    var h = $('agHero'), t = A.proximas(lista, 8), e = t.filter(function (x) { return x.tipo === 'examen'; })[0] || t[0];
    if (!e) {
      h.className = 'ag-hero vacio'; h.removeAttribute('data-d');
      h.innerHTML = RELOJ + '<span class="tx"><span class="k">Sin fechas próximas</span><b>Anota tu próximo examen</b><span class="q">Toca un día del calendario y agrégalo.</span></span>';
      return;
    }
    var n = A.dias(e.fecha), d = A.aFecha(e.fecha);
    h.className = 'ag-hero'; h.dataset.d = e.fecha; h.style.setProperty('--hc', color(e.tipo));
    h.innerHTML = RELOJ + '<span class="num">' + (n === 0 ? '¡HOY!' : n + '<small>' + (n === 1 ? 'día' : 'días') + '</small>') + '</span>' +
      '<span class="tx"><span class="k">' + (n === 0 ? 'Es hoy' : 'Falta' + (n === 1 ? '' : 'n')) + ' · ' + esc((A.TIPOS[e.tipo] || A.TIPOS.otro).n) + '</span><b>' + esc(e.titulo) + '</b>' +
      '<span class="q">' + DIAS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()] + (e.hora ? ' · ' + A.hora12(e.hora) : '') + '</span></span>';
  }
  function pintar() { pintarHero(); pintarMes(); pintarDia(); pintarProx(); }

  function elegir(s) {
    sel = s;
    var d = A.aFecha(s);
    if (d.getMonth() !== ver.getMonth() || d.getFullYear() !== ver.getFullYear()) { ver = new Date(d.getFullYear(), d.getMonth(), 1); }
    pintar();
  }

  $('agAnt').onclick = function () { ver.setMonth(ver.getMonth() - 1); pintarMes(); };
  $('agSig').onclick = function () { ver.setMonth(ver.getMonth() + 1); pintarMes(); };
  $('agGrid').addEventListener('click', function (ev) { var b = ev.target.closest('[data-d]'); if (b) elegir(b.dataset.d); });
  $('agHero').addEventListener('click', function () { if (this.dataset.d) elegir(this.dataset.d); });
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
