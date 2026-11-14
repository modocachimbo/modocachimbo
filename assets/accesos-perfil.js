/* =========================================================
   Modo Cachimbo · "Mis accesos" en el perfil
   Cada código con su estado (activo, vencido…), cuántos equipos usa
   y el botón para quitarlo de este equipo (libera su cupo).
   Arriba, «Quitar los que no sirven» borra de una vez los que ya no existen,
   vencieron, se desactivaron o no tienen cupo.
   Usa window.MCAcceso (assets/acceso.js) y las acciones misCodigos
   y soltar del Apps Script.
   Arriba de los códigos, lo activado por ID desde el panel (sin código):
   no se quita desde aquí, solo el profe lo quita.
   ========================================================= */
(function () {
  var ul = document.getElementById('accesos');
  if (!ul || !window.MCAcceso) return;

  var NOMBRES = { 'repaso-VIP': 'Todos los Repasos', 'fijas-VIP': 'Todas las Fijas', 'seminario-VIP': 'Seminarios + Banqueo', 'general': 'Acceso general', 'vocabulario-VIP': 'Vocabulario', 'area-matematica': 'Área Matemática', 'area-ciencia-tecnologia': 'Área Ciencia y Tecnología', 'area-comunicacion': 'Área Comunicación', 'area-ciencias-sociales': 'Área Ciencias Sociales', 'banqueo-VIP': 'Todo el Banqueo', 'tarjetas-VIP': 'Todas las Flashcards', 'TODO-VIP': 'Acceso total', 'simulacro': 'Simulacro', 'biblioteca-VIP': 'Biblioteca', 'descarga-VIP': 'Descargas PDF', 'laboratorio-VIP': 'Laboratorio' };
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
    '.acc-limpiar{display:flex;align-items:center;gap:10px 12px;flex-wrap:wrap;margin-top:16px;padding:12px 14px;border-radius:16px;background:rgba(255,75,75,.07);border:2px solid rgba(255,75,75,.3);font-family:Nunito,Inter,sans-serif}',
    '.acc-limpiar[hidden]{display:none}',
    '.acc-limpiar span{flex:1;min-width:180px;color:#ff9b9b;font:800 13px/1.4 Nunito,sans-serif}',
    '.acc-limpiar span strong{color:#fff}',
    '.acc-limpiar .bts{display:flex;gap:8px;flex-wrap:wrap}',
    '.acc-limpiar button{padding:9px 14px;border-radius:12px;font:1000 13px Nunito,sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}',
    '.acc-limpiar .rojo{border:0;background:#FF4B4B;color:#fff;text-transform:uppercase;letter-spacing:.04em;box-shadow:0 4px 0 #c43434}',
    '.acc-limpiar .rojo:disabled{opacity:.6}',
    '.acc-limpiar .gris{border:2px solid #322B52;border-bottom-width:4px;background:transparent;color:#ddd}',
    '.acc i.id{background:rgba(56,189,248,.14);color:#7dd3fc}',
    '.acc-eq{margin:10px 0 0;color:var(--text-dim);font:800 12.5px/1.45 Nunito,sans-serif}',
    '.acc-eq b{color:#fff}',
    '.acc-eq.fuera{color:#ff9b9b}',
    '.acc-pie small{color:var(--text-dim);font:800 12.5px Nunito,sans-serif;flex:1;min-width:180px}',
    /* ===== v2: pases con brillo animado ===== */
    '.acc-hero{position:relative;overflow:hidden;display:flex;align-items:center;gap:16px;margin-top:16px;padding:16px 18px;border-radius:18px;border:2px solid rgba(198,224,0,.4);border-bottom-width:5px;background:radial-gradient(60% 130% at 0% 0%,rgba(198,224,0,.2),transparent 70%),linear-gradient(180deg,#1c1636,#120e24)}',
    '.acc-hero.cero{border-color:#2f2852;background:linear-gradient(180deg,#1c1636,#120e24)}',
    '.acc-hero .cand{flex-shrink:0;width:54px;height:54px;filter:drop-shadow(0 0 10px rgba(198,224,0,.45))}',
    '.acc-hero.cero .cand{filter:none;opacity:.6}',
    '.acc-hero .cand .arco{transform-origin:31px 22px;animation:accAbre 2.8s ease-in-out infinite}',
    '.acc-hero.cero .cand .arco{animation:none}',
    '@keyframes accAbre{0%,55%,100%{transform:rotate(0)}70%,85%{transform:rotate(-28deg) translateY(-2px)}}',
    '.acc-hero .num{font:italic 900 46px/.9 "Barlow Condensed","Arial Narrow",sans-serif;color:#C6E000;text-shadow:0 3px 0 rgba(0,0,0,.4)}',
    '.acc-hero.cero .num{color:#8a83b0}',
    '.acc-hero .tx b{display:block;font:italic 900 19px/1.05 "Barlow Condensed","Arial Narrow",sans-serif !important;text-transform:uppercase;letter-spacing:.04em;color:#fff}',
    '.acc-hero .tx span{display:block;margin-top:3px;font:800 13px Nunito,sans-serif;color:#cfc8ee}',
    '.acc{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}',
    '.acc li.conf,.acc li.vacio{grid-column:1/-1}',
    '.acc li.pase{--c:#1CB0F6;position:relative;overflow:hidden;isolation:isolate;padding:14px;border:2px solid color-mix(in srgb,var(--c) 45%,#2f2852);border-bottom-width:5px;border-radius:18px;background:radial-gradient(70% 120% at 0% 0%,color-mix(in srgb,var(--c) 24%,transparent),transparent 70%),linear-gradient(180deg,#1c1636,#140f28);animation:accEntra .45s ease-out both}',
    '.acc li.pase:nth-child(2){animation-delay:.06s}.acc li.pase:nth-child(3){animation-delay:.12s}.acc li.pase:nth-child(4){animation-delay:.18s}.acc li.pase:nth-child(5){animation-delay:.24s}',
    '@keyframes accEntra{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}',
    '.acc li.pase.on::before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;background:linear-gradient(105deg,transparent 38%,rgba(255,255,255,.10) 50%,transparent 62%);background-size:260% 100%;animation:accBrillo 4.5s ease-in-out infinite}',
    '@keyframes accBrillo{0%{background-position:130% 0}55%,100%{background-position:-30% 0}}',
    '.acc li.pase.mal{--c:#5b5f80;filter:saturate(.6)}',
    '.acc li.pase .ic{width:52px;height:52px;border-radius:14px;background:color-mix(in srgb,var(--c) 18%,transparent)!important;color:var(--c)!important;box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--c) 40%,transparent),0 0 16px color-mix(in srgb,var(--c) 30%,transparent)}',
    '.acc li.pase .ic svg{width:26px;height:26px}',
    '.acc li.pase b{font:italic 900 20px/1.05 "Barlow Condensed","Arial Narrow",sans-serif !important;text-transform:uppercase;letter-spacing:.02em;color:#fff}',
    '.acc li.pase code{display:block;margin-top:3px}',
    '.acc .meta i.ok{display:inline-flex;align-items:center;gap:5px}',
    '.acc .meta i.ok::before{content:"";width:7px;height:7px;border-radius:50%;background:#C6E000;box-shadow:0 0 0 0 rgba(198,224,0,.6);animation:accLate 1.8s ease-out infinite}',
    '@keyframes accLate{0%{box-shadow:0 0 0 0 rgba(198,224,0,.6)}100%{box-shadow:0 0 0 7px rgba(198,224,0,0)}}',
    '.acc li.pase .quitar{margin-top:10px;padding:5px 10px;border-radius:10px;border-width:1.5px;border-bottom-width:3px;font-size:12px;color:#a9a2cc}',
    '.acc .meta i.pronto{background:rgba(255,150,0,.16);color:#FFB04A;animation:accAviso 2s ease-in-out infinite}',
    '@keyframes accAviso{0%,100%{box-shadow:0 0 0 0 rgba(255,150,0,0)}50%{box-shadow:0 0 0 3px rgba(255,150,0,.25)}}',
    '.acc li.pase.pronto{border-color:rgba(255,150,0,.45);border-bottom-color:rgba(255,150,0,.7)}',
    '@media (prefers-reduced-motion:reduce){.acc .meta i.pronto{animation:none!important}}',
    '@media (prefers-reduced-motion:reduce){.acc li.pase,.acc li.pase::before,.acc .meta i.ok::before,.acc-hero .cand .arco{animation:none!important}}'
  ].join('\n');
  document.head.appendChild(st);
  ul.className = 'acc';

  var hero = document.createElement('div');
  hero.className = 'acc-hero';
  ul.before(hero);
  var CANDADO = '<svg class="cand" viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="accG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F2FF7A"/><stop offset="1" stop-color="#9DB800"/></linearGradient></defs>' +
    '<path class="arco" d="M15 22v-6a9 9 0 0 1 18 0v6" fill="none" stroke="#d9d4f2" stroke-width="4.5" stroke-linecap="round"/>' +
    '<rect x="9" y="21" width="30" height="23" rx="6" fill="url(#accG)" stroke="#3d4a00" stroke-width="2"/><circle cx="24" cy="31" r="3.4" fill="#2b3300"/><path d="M24 33v5" stroke="#2b3300" stroke-width="3" stroke-linecap="round"/></svg>';
  function pintarHero(n) {
    hero.className = 'acc-hero' + (n ? '' : ' cero');
    hero.innerHTML = CANDADO + '<span class="num">' + n + '</span><span class="tx"><b>' + (n === 1 ? 'Paquete activo' : 'Paquetes activos') + '</b><span>' +
      (n ? 'Todo esto ya está desbloqueado para ti.' : 'Activa un código para desbloquear más contenido.') + '</span></span>';
  }

  var limpiar = document.createElement('div');
  limpiar.className = 'acc-limpiar';
  limpiar.hidden = true;
  ul.before(limpiar);

  var pie = document.createElement('div');
  pie.className = 'acc-pie';
  pie.innerHTML = '<a class="acc-btn" href="index.html#codigo"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="15" r="5" fill="currentColor"/><circle cx="8" cy="15" r="2" fill="#0b2a3a"/><path d="M11.5 11.5 20 3m-4 4 3 3m-5.5-.5 2 2" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>Activar otro código</a>' +
    '<small>Cada código se puede quitar de un equipo hasta 2 veces al mes.</small>';
  ul.after(pie);
  var nota = document.getElementById('accesosNota');
  if (nota) nota.textContent = 'Tus códigos se guardan en tu cuenta. Si quitas uno de este equipo, deja libre su cupo y puedes activarlo otra vez.';

  var cursos = {}, servidor = {}, elegido = null, error = '', sinRed = false, confLimpiar = false, limpiando = false;
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
    if (p === 'TODO-VIP' || p === 'general') return 'TODO';
    if (/^area-/.test(p)) return 'curso';
    return p === 'simulacro' ? 'simulacro' : p.split('-')[0];
  }
  function fecha(s) { var p = String(s).split('-'); return +p[2] + ' ' + MESES[+p[1] - 1] + ' ' + p[0]; }
  // Días que le quedan (null si no tiene fecha); con 7 o menos se avisa en naranja
  function dias(s) {
    var p = String(s || '').split('-'); if (p.length < 3) return null;
    var h = new Date(); h = new Date(h.getFullYear(), h.getMonth(), h.getDate());
    return Math.round((new Date(+p[0], +p[1] - 1, +p[2]) - h) / 864e5);
  }
  function chipVence(v) {
    var d = dias(v);
    if (d !== null && d >= 0 && d <= 7) return '<i class="pronto">' + (d === 0 ? 'Vence hoy' : d === 1 ? 'Vence mañana' : 'Vence en ' + d + ' días') + '</i>';
    return '<i>Vence ' + fecha(v) + '</i>';
  }
  function pronto(v) { var d = dias(v); return d !== null && d >= 0 && d <= 7; }

  function aviso(a) { var s = servidor[a.codigo] || {}; return s.estado && s.estado !== 'activo' ? s.mensaje : a.error; }

  function fila(a) {
    var s = servidor[a.codigo] || {}, t = tipo(a.producto), col = COLOR[t] || '#1CB0F6';
    var vence = s.vence !== undefined ? s.vence : a.vence;
    var mal = !!aviso(a);
    var chips = [];
    if (mal) chips.push('<i class="mal">' + (s.estado === 'vencido' ? 'Venció' : s.estado === 'desactivado' ? 'Desactivado' : s.estado === 'no-existe' ? 'Ya no existe' : s.estado === 'lleno' ? 'Sin cupo' : s.estado === 'liberado' ? 'Liberado' : 'No funciona') + '</i>');
    else chips.push('<i class="ok">Activo</i>');
    if (vence) chips.push(s.estado === 'vencido' || mal ? '<i>' + (s.estado === 'vencido' ? '' : 'Vence ') + fecha(vence) + '</i>' : chipVence(vence));
    else if (!mal) chips.push('<i>Sin vencimiento</i>');
    if (!mal && s.max > 0) chips.push('<i>' + s.usados + ' de ' + s.max + (s.max === 1 ? ' equipo' : ' equipos') + '</i>');
    return '<li class="pase ' + (mal ? 'mal' : 'on') + (!mal && pronto(vence) ? ' pronto' : '') + (elegido === a.codigo ? ' elegido' : '') + '" style="--c:' + col + '"><span class="ic" style="background:' + col + '22;color:' + col + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">' + (ICO[t] || ICO.curso) + '</svg></span>' +
      '<div class="tx"><b>' + esc(nombre(s.producto || a.producto)) + '</b><code>' + esc(a.codigo) + '</code><div class="meta">' + chips.join('') + '</div>' +
      (mal ? '<span class="aviso">' + esc(aviso(a)) + '</span>' : '') +
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

  function pintarLimpiar(malos) {
    limpiar.hidden = malos.length < 2 && !limpiando;
    if (limpiar.hidden) { confLimpiar = false; return; }
    var n = malos.length, cods = n === 1 ? 'código' : 'códigos';
    limpiar.innerHTML = limpiando ? '<span>Quitando ' + n + ' ' + cods + '…</span>'
      : confLimpiar ? '<span>Se borran <strong>' + n + ' ' + cods + '</strong> de tu lista y de tu cuenta. Los que funcionan no se tocan.</span>' +
        '<div class="bts"><button type="button" class="rojo" data-limpiar-si="1">Sí, quitar</button><button type="button" class="gris" data-limpiar-no="1">Cancelar</button></div>'
      : '<span>Tienes <strong>' + n + ' ' + cods + '</strong> que ya no sirven.</span>' +
        '<div class="bts"><button type="button" class="rojo" data-limpiar="1">Quitar los que no sirven</button></div>';
  }

  // Lo activado por ID: el profe lo dio en el panel, va con la cuenta (no con un código)
  function filaId(g) {
    var t = tipo(g.producto), col = COLOR[t] || '#1CB0F6';
    var chips = ['<i class="ok">Activo</i>', '<i class="id">Por ID</i>', (g.vence ? chipVence(g.vence) : '<i>Sin vencimiento</i>')];
    return '<li class="pase on' + (pronto(g.vence) ? ' pronto' : '') + '" style="--c:' + col + '"><span class="ic" style="background:' + col + '22;color:' + col + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">' + (ICO[t] || ICO.curso) + '</svg></span>' +
      '<div class="tx"><b>' + esc(nombre(g.producto)) + '</b><code>Activado en tu cuenta</code><div class="meta">' + chips.join('') + '</div></div></li>';
  }
  var eq = document.createElement('p');
  eq.className = 'acc-eq';
  eq.hidden = true;
  ul.after(eq);

  function pintar() {
    var lista = MCAcceso.todos(), ide = MCAcceso.idEstado ? MCAcceso.idEstado() : { lista: [] };
    pintarLimpiar(lista.filter(function (a) { return aviso(a); }));
    eq.hidden = !ide.lista.length && ide.permitido;
    if (!ide.permitido) { eq.className = 'acc-eq fuera'; eq.innerHTML = 'Lo activado por ID se abrió en otros equipos más nuevos y ya no abre en este. Si este es tu equipo, recarga la página para usarlo aquí.'; }
    else if (ide.lista.length) { eq.className = 'acc-eq'; eq.innerHTML = 'Lo activado por ID se abre con tu cuenta de Google' + (ide.max ? ' en <b>' + ide.equipos + ' de ' + ide.max + '</b> ' + (ide.max === 1 ? 'equipo' : 'equipos') : '') + '.'; }
    pintarHero(ide.lista.length + lista.filter(function (a) { return !aviso(a); }).length);
    if (!lista.length && !ide.lista.length) { ul.innerHTML = '<li class="vacio">Aún no tienes accesos. Activa un código abajo o pásale tu ID (arriba, en tu tarjeta) a Modo Cachimbo.</li>'; return; }
    ul.innerHTML = ide.lista.map(filaId).join('') + lista.map(fila).join('');
  }

  function revisar() {
    pintar();
    if (MCAcceso.refrescarID) MCAcceso.refrescarID(true).then(pintar);
    MCAcceso.estado().then(function (m) { if (m) { servidor = m; pintar(); } });
  }

  // Uno por uno: el servidor libera el cupo si este equipo lo tenía; sin conexión, solo de aquí
  limpiar.addEventListener('click', function (e) {
    if (e.target.closest('[data-limpiar]')) { confLimpiar = true; pintar(); return; }
    if (e.target.closest('[data-limpiar-no]')) { confLimpiar = false; pintar(); return; }
    if (!e.target.closest('[data-limpiar-si]') || limpiando) return;
    var malos = MCAcceso.todos().filter(function (a) { return aviso(a); }).map(function (a) { return a.codigo; });
    limpiando = true; confLimpiar = false; elegido = null; pintar();
    malos.reduce(function (p, c) {
      return p.then(function () {
        return MCAcceso.soltar(c).then(function (r) { if (!r.ok) return MCAcceso.soltar(c, true); }, function () { return MCAcceso.soltar(c, true); })
          .then(function () { delete servidor[c]; });
      });
    }, Promise.resolve()).then(function () { limpiando = false; revisar(); });
  });

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
