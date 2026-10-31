/* =========================================================
   Panel · Códigos de acceso
   ========================================================= */
const CD = { lista: [], config: { abiertos: {}, legacy: true }, hoy: '', filtro: 'Todos' };
// Paquetes. Un código puede abrir varios a la vez: el producto se guarda como "general,vocabulario-VIP"
// (la misma regla que cubre() de assets/acceso.js y cubre_ del Apps Script v16)
const PROD_TODOS = [
  ['TODO-VIP', 'Acceso total'], ['general', 'Acceso general'], ['seminario-VIP', 'Seminarios + Banqueo'], ['vocabulario-VIP', 'Vocabulario'], ['biblioteca-VIP', 'Biblioteca']
];
const PROD_AYUDA = {
  'TODO-VIP': 'Todo: el acceso general, Seminarios, Banqueo, Vocabulario y Biblioteca',
  general: 'Las 4 áreas con todo lo de adentro (práctica, Repaso, Fijas, Libros, Flashcards), Simulacro, Duelos y Exámenes',
  'seminario-VIP': 'Seminarios y Banqueo de todos los cursos',
  'vocabulario-VIP': 'Vocabulario de todos los cursos',
  'biblioteca-VIP': 'Solo la Biblioteca: entrar y leer todos sus libros'
};
const AREAS_COD = [['matematica', 'Matemática'], ['ciencia-tecnologia', 'Ciencia y Tecnología'], ['comunicacion', 'Comunicación'], ['ciencias-sociales', 'Ciencias Sociales']];
// Link oficial fijo: así el mensaje no muestra el link de una vista previa.
const SITE_URL = 'https://modocachimbo.github.io/modocachimbo/';

function copiar(texto) {
  const ok = () => toast('Copiado');
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(texto).then(ok).catch(() => copiarViejo(texto));
  copiarViejo(texto);
  function copiarViejo(t) { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); ok(); } catch (e) { toast('No se pudo copiar', true); } ta.remove(); }
}
function mensajeCodigo(c) {
  return `¡Hola! 🎓 Tu código de Modo Cachimbo es:\n\n*${c.codigo}*\n\nSirve para: ${c.etiqueta}.\n` +
    (c.max ? `Puedes usarlo en ${c.max} dispositivo${c.max > 1 ? 's' : ''}.\n` : '') +
    (c.vence ? `Válido hasta el ${c.vence.split('-').reverse().join('/')}.\n` : '') +
    `\nActívalo aquí: ${SITE_URL} → «Ingresar código»`;
}
function etiquetaUno(p) {
  const fijos = { 'TODO-VIP': 'Acceso total', general: 'Acceso general', 'seminario-VIP': 'Seminarios + Banqueo', duelo: 'Duelos', examenes: 'Exámenes', 'repaso-VIP': 'Todos los Repasos', 'fijas-VIP': 'Todas las Fijas', 'banqueo-VIP': 'Todo el Banqueo', 'tarjetas-VIP': 'Todas las Flashcards', 'vocabulario-VIP': 'Vocabulario', 'biblioteca-VIP': 'Biblioteca', simulacro: 'Simulacro' };
  if (fijos[p]) return fijos[p];
  const ar = AREAS_COD.find(([id]) => 'area-' + id === p); if (ar) return 'Área ' + ar[1];
  const m = String(p).match(/^(curso|repaso|fijas|seminario|banqueo|tarjetas|vocabulario)-(.+)$/); if (!m) return p;
  const n = NOMBRE[m[2]] || m[2];
  return { curso: n + ' completo', repaso: 'Repaso de ' + n, fijas: 'Fijas de ' + n, seminario: 'Seminarios de ' + n, banqueo: 'Banqueo de ' + n, tarjetas: 'Flashcards de ' + n, vocabulario: 'Vocabulario de ' + n }[m[1]];
}
function etiquetaProd(p) { return String(p || '').split(',').filter(Boolean).map(etiquetaUno).join(' + '); }
function fechaCorta(iso) { const d = new Date(iso); return isNaN(d) ? '—' : d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }); }

// ¿Están apagados los candados? (interruptor LIBRE de assets/acceso.js; el panel solo lo lee)
function revisarLibre() {
  if (CD.libre !== undefined) return;
  CD.libre = false;
  fetch('../assets/acceso.js', { cache: 'no-store' }).then(r => r.text()).then(t => {
    CD.libre = /var\s+LIBRE\s*=\s*true/.test(t);
    if (CD.libre && $('cdConfig').innerHTML) renderConfigAcceso();
  }).catch(() => {});
}

async function cargarCodigos() {
  revisarLibre();
  $('cdList').innerHTML = '<div class="loader">Cargando códigos…</div>';
  try {
    const r = await api('codigos');
    CD.lista = r.codigos || []; CD.config = r.config || CD.config; CD.hoy = r.hoy;
    renderConfigAcceso(); renderCodigos();
  } catch (e) { $('cdList').innerHTML = `<div class="state-msg error">${esc(e.message)}</div>`; }
}

/* ---------- Acceso libre ---------- */
function renderConfigAcceso() {
  const ab = CD.config.abiertos || {};
  const fila = (k, titulo, sub) => `<div class="acc-row">
      <div><b>${titulo}</b><span>${sub}</span></div>
      ${ab[k] && ab[k].hasta ? `<span class="pill gray">hasta el ${esc(ab[k].hasta.split('-').reverse().join('/'))}</span>` : ''}
      <label class="sw"><input type="checkbox" data-abrir="${k}" ${ab[k] ? 'checked' : ''}><span></span>${ab[k] ? 'Abierto' : 'Con código'}</label>
    </div>`;
  const extras = Object.keys(ab).filter(k => !['TODO', 'general', 'seminario', 'vocabulario', 'biblioteca'].includes(k));
  const nAb = Object.keys(ab).length;
  $('cdConfig').innerHTML = `${CD.libre ? `<div class="cd-libre"><img src="../assets/buho/avatar/clasico-cuerpo.webp" alt=""><div><b>Candados apagados en toda la web</b><span>Ahora todo se abre sin código (interruptor <code>LIBRE = true</code> en <code>assets/acceso.js</code>). Los códigos que crees se guardan y valdrán cuando se vuelvan a prender.</span></div></div>` : ''}
    <details class="acc-box cd-ajustes" id="cdAjustes" ${CD.ajustesAbiertos ? 'open' : ''}>
      <summary class="acc-ttl">Acceso libre y ajustes <span>— ${nAb ? nAb + ' abierto' + (nAb > 1 ? 's' : '') + ' para todos' : 'todo pide código'}</span></summary>
      ${fila('TODO', 'Todo', 'Áreas, Simulacro, Duelos, Exámenes, Seminarios, Banqueo, Vocabulario y Biblioteca')}
      ${fila('general', 'Acceso general', 'Las 4 áreas, Simulacro, Duelos y Exámenes')}
      ${fila('seminario', 'Seminarios + Banqueo', 'todos los cursos')}
      ${fila('vocabulario', 'Vocabulario', 'todos los cursos')}
      ${fila('biblioteca', 'Biblioteca', 'todos los libros')}
      ${extras.map(k => `<div class="acc-row"><div><b>${esc(etiquetaProd(k))}</b><span>abierto para todos${ab[k].hasta ? ' hasta el ' + esc(ab[k].hasta.split('-').reverse().join('/')) : ''}</span></div>
        <button class="rbtn" type="button" data-cerrar="${esc(k)}">Cerrar</button></div>`).join('')}
      <div class="acc-add">
        <select class="inp" id="accQue"><option value="">— Qué abrir —</option>
          <optgroup label="Un área">${AREAS_COD.map(([id, n]) => `<option value="area-${id}">${esc(n)}</option>`).join('')}</optgroup>
          <option value="simulacro">Simulacro</option><option value="duelo">Duelos</option><option value="examenes">Exámenes</option>
          <optgroup label="Seminarios de…">${CURSOS.map(([id, n]) => `<option value="seminario-${id}">${esc(n)}</option>`).join('')}</optgroup>
          <optgroup label="Banqueo de…">${CURSOS.map(([id, n]) => `<option value="banqueo-${id}">${esc(n)}</option>`).join('')}</optgroup>
        </select>
        <input class="inp" id="accHasta" type="date" title="Opcional: se cierra solo después de esta fecha">
        <button class="rbtn" type="button" id="accAbrir">Abrir</button>
      </div>
      <div class="acc-row legacy">
        <div><b>Quitar códigos desde Perfil</b><span>Cuántas veces al mes cada equipo puede quitar un mismo código para usarlo en otro lado.</span></div>
        <select class="inp" id="accQuitar">${[0, 1, 2, 3, 5, 10].map(n => `<option value="${n}" ${(CD.config.quitarMax || 0) === n ? 'selected' : ''}>${n ? n + (n === 1 ? ' vez' : ' veces') + ' al mes' : 'Sin límite'}</option>`).join('')}</select>
      </div>
      <div class="acc-row legacy">
        <div><b>Accesos del sistema anterior</b><span>Alumnos que desbloquearon antes de este panel (no tienen código guardado). Si los cierras, deberán ingresar su código otra vez.</span></div>
        <label class="sw"><input type="checkbox" id="accLegacy" ${CD.config.legacy !== false ? 'checked' : ''}><span></span>${CD.config.legacy !== false ? 'Permitidos' : 'Cerrados'}</label>
      </div>
    </details>`;
  $('cdAjustes').addEventListener('toggle', e => { CD.ajustesAbiertos = e.target.open; });
  const guardar = async (cfg, msg) => {
    try { const r = await api('guardarConfigAcceso', { config: JSON.stringify(cfg) }); CD.config = r.config; toast(msg); }
    catch (e) { toast(e.message, true); }
    renderConfigAcceso();
  };
  $('cdConfig').querySelectorAll('[data-abrir]').forEach(c => c.addEventListener('change', async () => {
    const cfg = JSON.parse(JSON.stringify(CD.config));
    if (c.checked) {
      const h = await pedirTexto({ titulo: 'Abrir sin código', sub: 'Opcional: escribe hasta qué fecha (AAAA-MM-DD) estará abierto. Déjalo vacío para abrirlo hasta que lo cierres.', placeholder: 'Ej.: 2027-03-31', boton: 'Abrir', valor: '' , vacioOk: true });
      if (h === null) { c.checked = false; return; }
      cfg.abiertos[c.dataset.abrir] = { hasta: /^\d{4}-\d{2}-\d{2}$/.test(h) ? h : '' };
    } else delete cfg.abiertos[c.dataset.abrir];
    guardar(cfg, c.checked ? 'Abierto para todos' : 'Cerrado: ahora pide código');
  }));
  $('cdConfig').querySelectorAll('[data-cerrar]').forEach(b => b.addEventListener('click', () => {
    const cfg = JSON.parse(JSON.stringify(CD.config)); delete cfg.abiertos[b.dataset.cerrar]; guardar(cfg, 'Cerrado');
  }));
  $('accAbrir').addEventListener('click', () => {
    const que = $('accQue').value; if (!que) { toast('Elige qué abrir', true); return; }
    const cfg = JSON.parse(JSON.stringify(CD.config));
    cfg.abiertos[que] = { hasta: $('accHasta').value || '' };
    guardar(cfg, 'Abierto para todos');
  });
  $('accQuitar').addEventListener('change', e => {
    const cfg = JSON.parse(JSON.stringify(CD.config)); cfg.quitarMax = Number(e.target.value);
    guardar(cfg, cfg.quitarMax ? 'Límite: ' + cfg.quitarMax + ' al mes' : 'Sin límite para quitar códigos');
  });
  $('accLegacy').addEventListener('change', e => {
    const cfg = JSON.parse(JSON.stringify(CD.config)); cfg.legacy = e.target.checked;
    guardar(cfg, e.target.checked ? 'Accesos antiguos permitidos' : 'Accesos antiguos cerrados');
  });
}

/* ---------- Lista ---------- */
function renderCodigos() {
  const L = CD.lista;
  const cuenta = e => L.filter(c => e === 'Todos' || c.estado === e).length;
  const disp = L.reduce((s, c) => s + c.dispositivos.length, 0);
  $('cdStats').innerHTML = `<b>${L.length}</b> código${L.length === 1 ? '' : 's'} · <b>${cuenta('Activo')}</b> activos · <b>${disp}</b> dispositivo${disp === 1 ? '' : 's'} registrados`;
  $('cdChips').innerHTML = ['Todos', 'Activo', 'Lleno', 'Vencido', 'Desactivado'].map(e =>
    `<button type="button" class="chip st ${e === CD.filtro ? 'on' : ''}" data-e="${e}">${e === 'Todos' ? 'Todos' : e + 's'} <span class="c">${cuenta(e)}</span></button>`).join('');
  $('cdChips').querySelectorAll('.chip').forEach(ch => ch.addEventListener('click', () => { CD.filtro = ch.dataset.e; renderCodigos(); }));
  const q = $('cdBuscar').value.trim().toLowerCase();
  const rows = L.filter(c => (CD.filtro === 'Todos' || c.estado === CD.filtro) &&
    (!q || [c.codigo, c.nota, etiquetaProd(c.producto)].join(' ').toLowerCase().includes(q)));
  if (!L.length) { $('cdList').innerHTML = '<div class="state-msg">Aún no hay códigos. Crea uno con <b>Crear códigos</b> o trae los antiguos con <b>Importar</b>.</div>'; return; }
  if (!rows.length) { $('cdList').innerHTML = '<div class="state-msg">No hay códigos con ese filtro.</div>'; return; }
  $('cdList').innerHTML = rows.map(c => {
    const usados = c.usosAnt + c.dispositivos.length;
    const pct = c.max ? Math.min(100, Math.round(usados / c.max * 100)) : 0;
    return `<article class="rcard cdcard est-${esc(c.estado)} ${['Vencido', 'Desactivado'].includes(c.estado) ? 'dim' : ''}">
      <div class="rtop">
        <div class="rmeta">
          <button class="cdcode" type="button" data-copy="${esc(c.codigo)}" title="Copiar código">${esc(c.codigo)} <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
          <span class="pill">${esc(etiquetaProd(c.producto))}</span>
          <span class="pill ${c.estado === 'Activo' ? 'Vigente' : c.estado === 'Lleno' ? 'Pendiente' : 'Revertida'}">${esc(c.estado)}</span>
        </div>
        <span class="rdate">${c.vence ? 'vence el ' + esc(c.vence.split('-').reverse().join('/')) : 'sin vencimiento'}</span>
      </div>
      ${c.nota ? `<div class="cdnota">👤 ${esc(c.nota)}</div>` : ''}
      <div class="cduso"><div class="bar"><i style="width:${c.max ? pct : 0}%"></i></div>
        <span><b>${usados}</b> de ${c.max ? c.max : '∞'} dispositivos${c.usosAnt ? ` <em>(${c.usosAnt} del sistema anterior)</em>` : ''}</span></div>
      <div class="cddevs" id="devs-${esc(c.codigo)}" hidden>
        ${c.dispositivos.length ? c.dispositivos.map(d => `<div class="dev"><span>📱 <b>${esc(d.equipo || 'Dispositivo')}</b> · activado ${esc(fechaCorta(d.alta))} · último uso ${esc(fechaCorta(d.ultimo))}</span>
          <button class="rbtn" type="button" data-lib="${esc(c.codigo)}" data-id="${esc(d.id)}">Liberar</button></div>`).join('') : '<div class="hint">Aún no hay dispositivos registrados con este código.</div>'}
        <div class="rfoot" style="margin-top:8px;">
          ${c.usosAnt ? `<button class="rbtn" type="button" data-lib="${esc(c.codigo)}" data-id="anteriores">Reiniciar usos anteriores (${c.usosAnt})</button>` : ''}
          ${usados ? `<button class="rbtn danger" type="button" data-lib="${esc(c.codigo)}" data-id="todos">Liberar todos</button>` : ''}
        </div>
      </div>
      <div class="rfoot">
        <button class="rbtn" type="button" data-devs="${esc(c.codigo)}">Dispositivos (${c.dispositivos.length})</button>
        <button class="rbtn link" type="button" data-msg="${esc(c.codigo)}">Copiar mensaje</button>
        <button class="rbtn danger" type="button" data-del="${esc(c.codigo)}">Borrar</button>
        <button class="rbtn primary" type="button" data-ed="${esc(c.codigo)}">${ICON_EDIT} Editar</button>
      </div>
    </article>`;
  }).join('');
  const find = cod => CD.lista.find(x => x.codigo === cod);
  $('cdList').querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => copiar(b.dataset.copy)));
  $('cdList').querySelectorAll('[data-msg]').forEach(b => b.addEventListener('click', () => copiar(mensajeCodigo(find(b.dataset.msg)))));
  $('cdList').querySelectorAll('[data-devs]').forEach(b => b.addEventListener('click', () => { const el = document.getElementById('devs-' + b.dataset.devs); el.hidden = !el.hidden; }));
  $('cdList').querySelectorAll('[data-ed]').forEach(b => b.addEventListener('click', () => editarCodigo(find(b.dataset.ed))));
  $('cdList').querySelectorAll('[data-lib]').forEach(b => b.addEventListener('click', async () => {
    const todos = b.dataset.id === 'todos';
    if (todos && !b.classList.contains('confirm')) { b.classList.add('confirm'); b.textContent = '¿Seguro? Toca otra vez'; return; }
    b.disabled = true;
    try { await api('liberar', { codigo: b.dataset.lib, id: b.dataset.id }); toast(todos ? 'Todos los dispositivos liberados' : b.dataset.id === 'anteriores' ? 'Usos anteriores reiniciados' : 'Dispositivo liberado'); await cargarCodigos(); const el = document.getElementById('devs-' + b.dataset.lib); if (el) el.hidden = false; }
    catch (e) { toast(e.message, true); b.disabled = false; }
  }));
  $('cdList').querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
    if (!b.classList.contains('confirm')) { b.classList.add('confirm'); b.textContent = '¿Seguro? Toca otra vez'; setTimeout(() => { if (b.isConnected) { b.classList.remove('confirm'); b.textContent = 'Borrar'; } }, 4000); return; }
    b.disabled = true;
    try { await api('borrarCodigo', { codigo: b.dataset.del }); CD.lista = CD.lista.filter(x => x.codigo !== b.dataset.del); toast('Código borrado'); renderCodigos(); }
    catch (e) { toast(e.message, true); b.disabled = false; }
  }));
}

/* ---------- Crear / editar ---------- */
function editarCodigo(orig) {
  // st.todos: paquetes · st.areas: áreas sueltas · st.antes: productos de antes (curso-x, repaso-VIP…), se conservan
  const st = { todos: [], areas: [], antes: [] };
  String(orig ? orig.producto : 'general').split(',').filter(Boolean).forEach(p => {
    if (PROD_TODOS.some(([v]) => v === p)) st.todos.push(p);
    else if (/^area-/.test(p)) st.areas.push(p.slice(5));
    else st.antes.push(p);
  });
  const multi = (g, ops, sel) => `<div class="chips" data-g="${g}">` + ops.map(([v, l]) =>
    `<button type="button" class="chip ${sel.includes(v) ? 'on' : ''}" data-v="${esc(v)}">${l}</button>`).join('') + '</div>';
  const o = document.createElement('div');
  o.className = 'ov';
  o.innerHTML = `<div class="mcard" style="max-width:620px;"><button class="mx" type="button" aria-label="Cerrar">✕</button>
    <div class="eyebrow">${orig ? 'Editar código' : 'Nuevos códigos'}</div>
    <h3>${orig ? esc(orig.codigo) : 'Crear códigos'}</h3>
    <label class="fld">¿Qué abre? <span class="hint">Puedes marcar varios paquetes</span></label>
    ${multi('todos', PROD_TODOS, st.todos)}
    <div class="hint" id="cdAyuda" style="margin:6px 0 0;"></div>
    <div class="hint" style="margin:12px 0 6px;">O solo un área (sin Simulacro ni Duelos)</div>${multi('areas', AREAS_COD, st.areas)}
    ${st.antes.length ? `<div class="hint" style="margin:10px 0 0;">Además abre (de antes): <b>${esc(etiquetaProd(st.antes.join(',')))}</b></div>` : ''}
    <div class="hint" id="cdResumen" style="margin-top:10px;"></div>
    <div class="cdgrid">
      <label>Dispositivos<input class="inp" id="cdMax" type="number" min="1" max="10000" value="${orig ? (orig.max || 2) : 2}"></label>
      <label class="ck" style="align-self:end;"><input type="checkbox" id="cdSinLim" ${orig && !orig.max ? 'checked' : ''}>Sin límite</label>
      <label>Vence (opcional)<input class="inp" id="cdVence" type="date" value="${orig ? esc(orig.vence) : ''}"></label>
    </div>
    <label class="fld">Usuario o nota</label><input class="inp" id="cdNota" maxlength="120" value="${orig ? esc(orig.nota) : ''}" placeholder="Ej.: Juan Pérez · pagó por Yape">
    ${orig ? `<label class="sw" style="margin-top:16px;"><input type="checkbox" id="cdAct" ${orig.activo ? 'checked' : ''}><span></span>Código activo</label>`
      : `<div class="cdgrid">
          <label>Cantidad<input class="inp" id="cdCant" type="number" min="1" max="200" value="1"></label>
          <label style="grid-column: span 2;">Código propio (opcional)<input class="inp" id="cdPropio" maxlength="30" placeholder="Se genera solo, ej.: MC-7K3P-Q9XR" style="text-transform:uppercase;"></label>
        </div>`}
    <div class="err" id="cdErr"></div>
    <div class="mfoot"><button type="button" class="btn-ghost" data-x>Cancelar</button><button type="button" class="btn-main" id="cdSave">${orig ? 'Guardar cambios' : 'Crear'}</button></div>
  </div>`;
  document.body.appendChild(o); document.body.classList.add('modal-open');
  const cerrar = () => { o.remove(); document.body.classList.remove('modal-open'); };
  o.querySelector('.mx').addEventListener('click', cerrar); o.querySelector('[data-x]').addEventListener('click', cerrar);
  const producto = () => {
    if (st.todos.includes('TODO-VIP')) return 'TODO-VIP';
    const areas = st.todos.includes('general') ? [] : st.areas.map(a => 'area-' + a);
    return st.todos.concat(areas, st.antes).join(',');
  };
  const pintar = () => {
    o.querySelectorAll('[data-g="todos"] .chip').forEach(x => x.classList.toggle('on', st.todos.includes(x.dataset.v)));
    o.querySelectorAll('[data-g="areas"] .chip').forEach(x => x.classList.toggle('on', st.areas.includes(x.dataset.v)));
    o.querySelector('#cdAyuda').textContent = st.todos.map(v => PROD_AYUDA[v]).filter(Boolean).join(' · ');
    const p = producto(); o.querySelector('#cdResumen').innerHTML = p ? 'Abrirá: <b style="color:#f5ffcc">' + esc(etiquetaProd(p)) + '</b>' : '';
  };
  o.querySelector('[data-g="todos"]').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    const v = b.dataset.v, i = st.todos.indexOf(v);
    if (i >= 0) st.todos.splice(i, 1); else st.todos.push(v);
    if (v === 'TODO-VIP' && i < 0) { st.todos = ['TODO-VIP']; st.areas = []; }
    else if (v !== 'TODO-VIP') st.todos = st.todos.filter(x => x !== 'TODO-VIP');
    if (v === 'general' && i < 0) st.areas = [];
    pintar();
  });
  o.querySelector('[data-g="areas"]').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    const v = b.dataset.v, i = st.areas.indexOf(v);
    if (i >= 0) st.areas.splice(i, 1); else { st.areas.push(v); st.todos = st.todos.filter(x => x !== 'TODO-VIP' && x !== 'general'); }
    pintar();
  });
  const sinLim = o.querySelector('#cdSinLim'), max = o.querySelector('#cdMax');
  const syncLim = () => { max.disabled = sinLim.checked; }; sinLim.addEventListener('change', syncLim); syncLim();
  pintar();

  o.querySelector('#cdSave').addEventListener('click', async () => {
    const err = o.querySelector('#cdErr'); err.classList.remove('show');
    if (!producto()) { err.textContent = 'Marca qué abre el código.'; err.classList.add('show'); return; }
    const datos = {
      producto: producto(),
      max: sinLim.checked ? 0 : Math.max(1, parseInt(max.value, 10) || 1),
      vence: o.querySelector('#cdVence').value, nota: o.querySelector('#cdNota').value
    };
    if (orig) { datos.editar = orig.codigo; datos.activo = o.querySelector('#cdAct').checked; }
    else { datos.cantidad = parseInt(o.querySelector('#cdCant').value, 10) || 1; datos.propio = o.querySelector('#cdPropio').value.trim(); }
    const btn = o.querySelector('#cdSave'); btn.disabled = true; btn.innerHTML = '<span class="spin-s"></span> Guardando…';
    try {
      const r = await api('guardarCodigo', { datos: JSON.stringify(datos) });
      // Sin volver a pedir toda la lista: se actualiza aquí y se refresca de fondo
      if (orig) {
        Object.assign(orig, { producto: datos.producto, max: datos.max, vence: datos.vence, nota: datos.nota, activo: datos.activo, etiqueta: etiquetaProd(datos.producto) });
        orig.estado = !orig.activo ? 'Desactivado' : (orig.vence && CD.hoy && CD.hoy > orig.vence) ? 'Vencido' : (orig.max > 0 && orig.usosAnt + orig.dispositivos.length >= orig.max) ? 'Lleno' : 'Activo';
        renderCodigos(); cerrar(); toast('Código actualizado'); return;
      }
      const nuevos = r.creados.map(cod => ({ codigo: cod, producto: datos.producto, etiqueta: r.etiqueta || etiquetaProd(datos.producto), max: datos.max, usosAnt: 0,
        nota: datos.nota, vence: datos.vence, activo: true, dispositivos: [], estado: 'Activo', creado: new Date().toISOString() }));
      CD.lista = nuevos.concat(CD.lista); renderCodigos();
      o.querySelector('.mcard').innerHTML = `<button class="mx" type="button">✕</button>
        <div class="done" style="text-align:left;padding-top:0;">
          <div class="eyebrow">Listo</div><h3>${nuevos.length} código${nuevos.length > 1 ? 's creados' : ' creado'}</h3>
          <p style="margin:6px 0 14px;max-width:none;">Para: <b style="color:#f5ffcc">${esc(etiquetaProd(datos.producto))}</b> · ${datos.max ? datos.max + ' dispositivo' + (datos.max > 1 ? 's' : '') : 'sin límite'}${datos.vence ? ' · vence el ' + esc(datos.vence.split('-').reverse().join('/')) : ''}</p>
          <div class="cdnuevos">${nuevos.map(c => `<div><code>${esc(c.codigo)}</code><button class="rbtn" type="button" data-c="${esc(c.codigo)}">Copiar</button><button class="rbtn link" type="button" data-m="${esc(c.codigo)}">Mensaje</button></div>`).join('')}</div>
          <div class="mfoot"><button type="button" class="btn-ghost" id="cdCopTodos">Copiar todos</button><button type="button" class="btn-main" id="cdOk">Listo</button></div>
        </div>`;
      o.querySelector('.mx').addEventListener('click', cerrar); o.querySelector('#cdOk').addEventListener('click', cerrar);
      o.querySelector('#cdCopTodos').addEventListener('click', () => copiar(nuevos.map(c => c.codigo).join('\n')));
      o.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => copiar(b.dataset.c)));
      o.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => copiar(mensajeCodigo(nuevos.find(x => x.codigo === b.dataset.m)))));
    } catch (e) { btn.disabled = false; btn.textContent = orig ? 'Guardar cambios' : 'Crear'; err.textContent = e.message; err.classList.add('show'); }
  });
}

/* ---------- Importar del sistema anterior ---------- */
function importarCodigos() {
  const o = document.createElement('div');
  o.className = 'ov';
  o.innerHTML = `<div class="mcard" style="max-width:640px;"><button class="mx" type="button">✕</button>
    <div class="eyebrow">Sistema anterior</div><h3>Importar códigos</h3>
    <p class="sub" style="line-height:1.6;margin-top:6px;">En tu hoja antigua <b>"Modo Cachimbo - Códigos"</b>, pestaña <b>Codigos</b>, selecciona desde la columna <b>CÓDIGO</b> hasta <b>USUARIO</b> (puedes incluir los títulos), copia con <b>Ctrl+C</b> y pega aquí con <b>Ctrl+V</b>. Se conservan el límite y los usos.</p>
    <textarea class="ta" id="impTxt" style="min-height:160px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;" placeholder="CÓDIGO	PRODUCTO	DISPOSITIVO PERMITIDO	USOS ACTUALES	USUARIO"></textarea>
    <div id="impPrev" class="hint" style="margin-top:8px;"></div>
    <div class="err" id="impErr"></div>
    <div class="mfoot"><button type="button" class="btn-ghost" data-x>Cancelar</button><button type="button" class="btn-main" id="impOk" disabled>Importar</button></div>
  </div>`;
  document.body.appendChild(o); document.body.classList.add('modal-open');
  const cerrar = () => { o.remove(); document.body.classList.remove('modal-open'); };
  o.querySelector('.mx').addEventListener('click', cerrar); o.querySelector('[data-x]').addEventListener('click', cerrar);
  let filas = [];
  o.querySelector('#impTxt').addEventListener('input', e => {
    filas = e.target.value.split(/\r?\n/).map(l => l.split(/\t|;|,(?=\S)/).map(x => x.trim())).filter(c => c[0] && !/^c[óo]digo$/i.test(c[0]))
      .map(c => ({ codigo: c[0].toUpperCase(), producto: c[1] || '', max: parseFloat(c[2]) || 0, usos: parseFloat(c[3]) || 0, nota: c[4] || '' }));
    const malos = filas.filter(f => !f.producto.split(',').every(x => /^(TODO-VIP|general|repaso-VIP|fijas-VIP|seminario-VIP|banqueo-VIP|tarjetas-VIP|vocabulario-VIP|biblioteca-VIP|simulacro|(area|curso|repaso|fijas|seminario|banqueo|tarjetas|vocabulario)-[a-z0-9-]+)$/.test(x)));
    o.querySelector('#impPrev').innerHTML = filas.length
      ? `<b style="color:var(--text)">${filas.length} código${filas.length > 1 ? 's' : ''} detectado${filas.length > 1 ? 's' : ''}:</b> ` + filas.slice(0, 6).map(f => `${esc(f.codigo)} (${esc(etiquetaProd(f.producto))}, ${f.usos}/${f.max || '∞'})`).join(' · ') + (filas.length > 6 ? ' …' : '') +
        (malos.length ? `<br><span style="color:var(--red)">${malos.length} con producto no reconocido se saltarán.</span>` : '')
      : '';
    o.querySelector('#impOk').disabled = !filas.length;
  });
  o.querySelector('#impOk').addEventListener('click', async () => {
    const b = o.querySelector('#impOk'); b.disabled = true; b.innerHTML = '<span class="spin-s"></span> Importando…';
    try {
      const r = await api('importarCodigos', { filas: JSON.stringify(filas) });
      cerrar(); await cargarCodigos();
      toast(`${r.importados} importado${r.importados === 1 ? '' : 's'}` + (r.saltados.length ? ` · ${r.saltados.length} saltado${r.saltados.length === 1 ? '' : 's'} (ya existían o no son válidos)` : ''));
    } catch (e) { b.disabled = false; b.textContent = 'Importar'; const er = o.querySelector('#impErr'); er.textContent = e.message; er.classList.add('show'); }
  });
}
