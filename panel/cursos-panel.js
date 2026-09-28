/* =========================================================
   Panel · Cursos (crear, editar, ordenar, ocultar, años, Repaso y Fijas)
   ========================================================= */
function slug(s) { return sinTildes(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30); }
function iconoHtml(ruta) {
  return (window.MCCursos && ruta ? MCCursos.icono(ruta) : Promise.resolve('')).then(h => h || '<span class="ci-vacio">?</span>');
}
function cfgTxt(tipo, cfg, man) {
  if (!cfg || !cfg.anio) return '<span class="cfg off">Próximamente</span>';
  const m = (man || []).find(x => x.id === cfg.anio);
  const vacio = man ? (tipo === 'repaso' ? !(m && m.temas) : cfg.modo !== 'banco' && !(m && m.temas)) : false;
  const extra = tipo === 'fijas' ? (cfg.modo === 'banco' ? ' · banco propio' : Array.isArray(cfg.temas) ? ` · ${cfg.temas.length} tema${cfg.temas.length === 1 ? '' : 's'}` : ' · todos los temas') : '';
  return `<span class="cfg ${vacio ? 'warn' : ''}">${esc(cfg.anio)}${extra}${vacio ? ' · sin temas' : ''}</span>`;
}

async function cargarCursos() {
  $('cuList').innerHTML = '<div class="loader">Cargando cursos…</div>';
  await cargarRegistro();
  if (!REG) { $('cuList').innerHTML = '<div class="state-msg error">No se pudo leer la lista de cursos (assets/cursos.json). ¿Ya subiste el último zip?</div>'; return; }
  renderCursos();
}

function renderCursos() {
  const cursos = REG.cursos || [];
  $('cuStats').textContent = `${cursos.filter(c => !c.oculto).length} cursos visibles` + (cursos.some(c => c.oculto) ? ` · ${cursos.filter(c => c.oculto).length} ocultos` : '');
  $('cuList').innerHTML = (REG.areas || []).map(a => {
    const lista = cursos.filter(c => c.area === a.id).sort((x, y) => (x.orden || 0) - (y.orden || 0));
    return `<section class="cu-area"><div class="cu-atit">${esc(a.nombre)} <span>${lista.length}</span></div>
      ${lista.length ? lista.map((c, i) => `<div class="cu-row ${c.oculto ? 'oculto' : ''}" data-id="${esc(c.id)}">
        <div class="cu-ico" data-ico="${esc(c.icono || '')}"></div>
        <div class="cu-info"><b>${esc(c.nombre)}</b>${c.oculto ? ' <span class="pill Descartado">Oculto</span>' : ''}
          <div class="cu-cfg">Repaso: ${cfgTxt('repaso', c.repaso)} · Fijas: ${cfgTxt('fijas', c.fijas)}</div></div>
        <div class="cu-acc">
          <button class="rbtn" type="button" data-up ${i === 0 ? 'disabled' : ''} title="Subir">↑</button>
          <button class="rbtn" type="button" data-down ${i === lista.length - 1 ? 'disabled' : ''} title="Bajar">↓</button>
          <button class="rbtn" type="button" data-anios>Años</button>
          <button class="rbtn" type="button" data-rf>Repaso y Fijas</button>
          <button class="rbtn" type="button" data-ed>${ICON_EDIT} Editar</button>
          <button class="rbtn ${c.oculto ? 'link' : 'danger'}" type="button" data-oc>${c.oculto ? 'Mostrar' : 'Ocultar'}</button>
        </div></div>`).join('') : '<div class="hint" style="padding:10px 0;">Sin cursos en esta área.</div>'}
    </section>`;
  }).join('');
  $('cuList').querySelectorAll('[data-ico]').forEach(el => iconoHtml(el.dataset.ico).then(h => { el.innerHTML = h; }));
  const cursoDe = b => cursos.find(c => c.id === b.closest('.cu-row').dataset.id);
  $('cuList').querySelectorAll('[data-up],[data-down]').forEach(b => b.addEventListener('click', () => moverCurso(cursoDe(b), b.hasAttribute('data-up') ? -1 : 1)));
  $('cuList').querySelectorAll('[data-ed]').forEach(b => b.addEventListener('click', () => formCurso(cursoDe(b))));
  $('cuList').querySelectorAll('[data-anios]').forEach(b => b.addEventListener('click', () => aniosCurso(cursoDe(b))));
  $('cuList').querySelectorAll('[data-rf]').forEach(b => b.addEventListener('click', () => repasoFijas(cursoDe(b))));
  $('cuList').querySelectorAll('[data-oc]').forEach(b => b.addEventListener('click', async () => {
    const c = cursoDe(b);
    if (!c.oculto && !b.classList.contains('confirm')) { b.classList.add('confirm'); b.textContent = '¿Ocultar? Toca otra vez'; setTimeout(() => { if (b.isConnected) { b.classList.remove('confirm'); b.textContent = 'Ocultar'; } }, 4000); return; }
    b.disabled = true;
    try { await api('editarCurso', { datos: JSON.stringify({ id: c.id, oculto: !c.oculto }) }); toast(c.oculto ? 'Curso visible otra vez' : 'Curso oculto · sus preguntas se conservan'); await cargarCursos(); }
    catch (e) { toast(e.message, true); b.disabled = false; }
  }));
}

async function moverCurso(c, dir) {
  const lista = (REG.cursos || []).filter(x => x.area === c.area).sort((x, y) => (x.orden || 0) - (y.orden || 0));
  const i = lista.indexOf(c), j = i + dir;
  if (j < 0 || j >= lista.length) return;
  [lista[i], lista[j]] = [lista[j], lista[i]];
  lista.forEach((x, k) => { x.orden = k + 1; });
  renderCursos();
  try { await api('ordenarCursos', { area: c.area, ids: JSON.stringify(lista.map(x => x.id)) }); toast('Orden guardado'); }
  catch (e) { toast(e.message, true); cargarCursos(); }
}

/* ---------- Ícono: SVG (limpio) o PNG/JPG (se achica a 256 px con transparencia) ---------- */
async function prepararIcono(file) {
  if (/svg/.test(file.type) || /\.svg$/i.test(file.name)) {
    let t = await file.text();
    t = t.replace(/<\?xml[^>]*>/g, '').replace(/<!DOCTYPE[^>]*>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '').replace(/javascript:/gi, '');
    if (!/<svg[\s>]/i.test(t)) throw new Error('Ese archivo SVG no es válido');
    if (t.length > 290000) throw new Error('El SVG es muy pesado (máx. 300 KB)');
    return { ext: 'svg', data: btoa(unescape(encodeURIComponent(t))), vista: t };
  }
  if (!/^image\//.test(file.type)) throw new Error('El ícono debe ser SVG o PNG');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('No se pudo leer la imagen')); i.src = url; });
    const k = Math.min(1, 256 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const d = c.toDataURL('image/png');
    return { ext: 'png', data: d.split(',')[1], vista: `<img src="${d}" alt="">` };
  } finally { URL.revokeObjectURL(url); }
}

/* ---------- Nuevo / editar curso ---------- */
function formCurso(orig) {
  let icono = null;
  const areas = REG.areas || [];
  const o = document.createElement('div'); o.className = 'ov';
  o.innerHTML = `<div class="mcard" style="max-width:600px;"><button class="mx" type="button">✕</button>
    <div class="eyebrow">${orig ? 'Editar curso' : 'Nuevo curso'}</div><h3>${orig ? esc(orig.nombre) : 'Crear curso'}</h3>
    <div class="cu-form">
      <div class="cu-icoed"><div class="cu-ico big" id="cfIco"></div>
        <label class="rbtn filebtn">Subir ícono<input type="file" id="cfIcoIn" accept=".svg,image/svg+xml,image/png,image/webp,image/jpeg"></label>
        <span class="hint">SVG de un color (se pinta verde como los demás) o PNG.</span></div>
      <div class="cu-campos">
        <label>Nombre del curso<input class="inp" id="cfNom" maxlength="40" value="${orig ? esc(orig.nombre) : ''}" placeholder="Ej.: Botánica"></label>
        <label>Identificador (carpeta)<input class="inp" id="cfId" maxlength="30" value="${orig ? esc(orig.id) : ''}" ${orig ? 'disabled' : ''} placeholder="botanica"></label>
        <label>Área<select class="inp" id="cfArea">${areas.map(a => `<option value="${esc(a.id)}" ${orig && orig.area === a.id ? 'selected' : ''}>${esc(a.nombre)}</option>`).join('')}</select></label>
        <label>Nombre corto (opcional)<input class="inp" id="cfCorto" maxlength="40" value="${orig && orig.corto ? esc(orig.corto) : ''}" placeholder="Para la tarjeta del área"></label>
        <label>Etiqueta del libro (opcional)<input class="inp" id="cfLib" maxlength="20" value="${orig ? esc(orig.libro || '') : ''}" placeholder="Ej.: CPU → 'Libro · CPU'"></label>
      </div>
    </div>
    ${orig ? '<p class="hint" style="margin-top:12px;line-height:1.5;">Si cambias el nombre, el área o la etiqueta del libro, se actualizan las 7 páginas del curso (sus preguntas no se tocan).</p>' : '<p class="hint" style="margin-top:12px;line-height:1.5;">Se crean sus páginas (curso, Libro, Repaso y Fijas). Luego agrega un año en <b>Años</b> y sube temas en <b>Subir tema</b>.</p>'}
    <div class="err" id="cfErr"></div>
    <div class="mfoot"><button type="button" class="btn-ghost" data-x>Cancelar</button><button type="button" class="btn-main" id="cfSave">${orig ? 'Guardar cambios' : 'Crear curso'}</button></div></div>`;
  document.body.appendChild(o); document.body.classList.add('modal-open');
  const cerrar = () => { o.remove(); document.body.classList.remove('modal-open'); };
  o.querySelector('.mx').addEventListener('click', cerrar); o.querySelector('[data-x]').addEventListener('click', cerrar);
  const ico = o.querySelector('#cfIco');
  if (orig) iconoHtml(orig.icono).then(h => { ico.innerHTML = h; }); else ico.innerHTML = '<span class="ci-vacio">+</span>';
  if (!orig) o.querySelector('#cfNom').addEventListener('input', e => { const idIn = o.querySelector('#cfId'); if (!idIn.dataset.tocado) idIn.value = slug(e.target.value); });
  if (!orig) o.querySelector('#cfId').addEventListener('input', e => { e.target.dataset.tocado = '1'; e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''); });
  o.querySelector('#cfIcoIn').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try { icono = await prepararIcono(f); ico.innerHTML = icono.vista; } catch (err) { toast(err.message, true); }
  });
  o.querySelector('#cfSave').addEventListener('click', async () => {
    const err = o.querySelector('#cfErr'); err.classList.remove('show');
    const datos = { nombre: o.querySelector('#cfNom').value.trim(), area: o.querySelector('#cfArea').value, corto: o.querySelector('#cfCorto').value.trim(), libro: o.querySelector('#cfLib').value.trim() };
    if (!datos.nombre) { err.textContent = 'Escribe el nombre del curso.'; err.classList.add('show'); return; }
    if (orig) datos.id = orig.id; else datos.id = o.querySelector('#cfId').value.trim();
    if (icono) datos.icono = { ext: icono.ext, data: icono.data };
    const b = o.querySelector('#cfSave'); b.disabled = true; b.innerHTML = '<span class="spin-s"></span> ' + (orig ? 'Guardando…' : 'Creando páginas…');
    try {
      const r = await api(orig ? 'editarCurso' : 'crearCurso', { datos: JSON.stringify(datos) });
      cerrar(); await cargarCursos();
      toast(orig ? (r.paginas ? 'Curso actualizado · páginas regeneradas' : 'Curso actualizado') : 'Curso creado · aparecerá en la web en 1 a 10 minutos');
      if (!orig) aniosCurso(REG.cursos.find(c => c.id === r.curso.id));
    } catch (e) { b.disabled = false; b.textContent = orig ? 'Guardar cambios' : 'Crear curso'; err.textContent = e.message; err.classList.add('show'); }
  });
}

/* ---------- Años de un curso ---------- */
async function aniosCurso(c) {
  const o = document.createElement('div'); o.className = 'ov';
  o.innerHTML = `<div class="mcard" style="max-width:560px;"><button class="mx" type="button">✕</button>
    <div class="eyebrow">${esc(c.nombre)}</div><h3>Años del curso</h3>
    <div id="anLista"><div class="loader">Cargando…</div></div>
    <div class="an-nuevo"><input class="inp" id="anNuevo" placeholder="Ej.: 2028-I" maxlength="8"><button class="btn-main" type="button" id="anCrear">＋ Crear año</button></div>
    <p class="hint" style="margin-top:8px;">Un año sin temas se ve como "Próximamente" hasta que subas el primero.</p>
    <div class="mfoot"><button type="button" class="btn-ghost" data-x>Cerrar</button></div></div>`;
  document.body.appendChild(o); document.body.classList.add('modal-open');
  const cerrar = () => { o.remove(); document.body.classList.remove('modal-open'); };
  o.querySelector('.mx').addEventListener('click', cerrar); o.querySelector('[data-x]').addEventListener('click', cerrar);
  const pintar = async () => {
    delete cacheManifest[c.id];
    let man = [];
    try { man = await getManifest(c.id); } catch (e) { o.querySelector('#anLista').innerHTML = `<div class="state-msg error">${esc(e.message)}</div>`; return; }
    o.querySelector('#anLista').innerHTML = man.length ? man.slice().reverse().map(m => `<div class="an-row">
        <b>${esc(m.id)}</b><span>${m.temas ? m.temas + ' tema' + (m.temas > 1 ? 's' : '') : 'Próximamente (sin temas)'}</span>
        ${c.repaso && c.repaso.anio === m.id ? '<span class="pill">Repaso</span>' : ''}${c.fijas && c.fijas.anio === m.id ? '<span class="pill">Fijas</span>' : ''}
        <button class="rbtn danger" type="button" data-del="${esc(m.id)}">Eliminar</button></div>`).join('')
      : '<div class="state-msg" style="padding:24px;">Este curso aún no tiene años.</div>';
    o.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      const m = man.find(x => x.id === b.dataset.del);
      const r = await pedirTexto({ titulo: `Eliminar ${c.nombre} ${m.id}`, sub: `Se borrarán sus <b>${m.temas} tema${m.temas === 1 ? '' : 's'}</b> y su banco de Fijas (si tiene). Si el Repaso o las Fijas usan este año, pasarán a "Próximamente". GitHub guarda el historial.<br><br>Escribe <b>BORRAR</b> para confirmar.`, placeholder: 'BORRAR', boton: 'Eliminar año', peligro: true, exacto: 'BORRAR' });
      if (r !== 'BORRAR') return;
      b.disabled = true;
      try { await api('eliminarAnio', { carpeta: c.id, anio: m.id, confirmar: 'BORRAR' }); delete cacheArchivos[c.id + '|' + m.id]; toast('Año ' + m.id + ' eliminado'); await cargarRegistro(); c = REG.cursos.find(x => x.id === c.id) || c; pintar(); if (!$('tab-cursos').hidden) renderCursos(); }
      catch (e) { toast(e.message, true); b.disabled = false; }
    }));
  };
  o.querySelector('#anCrear').addEventListener('click', async () => {
    const v = o.querySelector('#anNuevo').value.toUpperCase().replace(/\s+/g, '').replace(/^(\d{4})(I{1,3})$/, '$1-$2');
    if (!/^\d{4}-(I|II|III)$/.test(v)) { toast('Escribe el ciclo como 2028-I, 2028-II o 2028-III', true); return; }
    const b = o.querySelector('#anCrear'); b.disabled = true;
    try { await api('crearAnio', { carpeta: c.id, anio: v }); o.querySelector('#anNuevo').value = ''; toast('Año ' + v + ' creado'); await pintar(); }
    catch (e) { toast(e.message, true); }
    b.disabled = false;
  });
  pintar();
}

/* ---------- Repaso y Fijas ---------- */
async function repasoFijas(c) {
  const o = document.createElement('div'); o.className = 'ov';
  o.innerHTML = `<div class="mcard" style="max-width:640px;"><button class="mx" type="button">✕</button>
    <div class="eyebrow">${esc(c.nombre)}</div><h3>Repaso y Fijas</h3><div id="rfBody"><div class="loader">Cargando años…</div></div></div>`;
  document.body.appendChild(o); document.body.classList.add('modal-open');
  const cerrar = () => { o.remove(); document.body.classList.remove('modal-open'); };
  o.querySelector('.mx').addEventListener('click', cerrar);
  delete cacheManifest[c.id];
  let man = [];
  try { man = await getManifest(c.id); } catch (e) { o.querySelector('#rfBody').innerHTML = `<div class="state-msg error">${esc(e.message)}</div>`; return; }
  const opcAnios = (sel) => '<option value="">— Próximamente (sin configurar) —</option>' +
    man.slice().reverse().map(m => `<option value="${esc(m.id)}" ${sel === m.id ? 'selected' : ''}>${esc(m.id)} · ${m.temas ? m.temas + ' tema' + (m.temas > 1 ? 's' : '') : 'sin temas'}</option>`).join('');
  const f = c.fijas || {};
  const st = { modo: f.modo || 'temas', temas: f.temas || 'todos', porTema: f.porTema === 0 ? 0 : 1 };
  o.querySelector('#rfBody').innerHTML = `
    <div class="rf-box"><div class="rf-tit">Repaso</div><p class="hint">Usa <b>todas las preguntas</b> del año elegido, mezcladas.</p>
      <select class="inp" id="rfRep">${opcAnios(c.repaso && c.repaso.anio)}</select></div>
    <div class="rf-box"><div class="rf-tit">Fijas</div>
      <select class="inp" id="rfFij">${opcAnios(f.anio)}</select>
      <div id="rfFijOpc"></div></div>
    <div class="err" id="rfErr"></div>
    <div class="mfoot"><button type="button" class="btn-ghost" data-x>Cancelar</button><button type="button" class="btn-main" id="rfSave">Guardar</button></div>`;
  o.querySelector('[data-x]').addEventListener('click', cerrar);
  const pintarFijas = async () => {
    const anio = o.querySelector('#rfFij').value, box = o.querySelector('#rfFijOpc');
    if (!anio) { box.innerHTML = ''; return; }
    box.innerHTML = '<div class="loader" style="padding:14px 0;">Cargando temas…</div>';
    let temas = [], banco = null;
    try { temas = await getTemas(c.id, anio, true); } catch (e) { temas = []; }
    try { banco = (await api('archivo', { carpeta: c.id, anio: anio + '-fijas' })).temas || []; } catch (e) { banco = null; }
    if (st.modo === 'banco' && !banco) st.modo = 'temas';
    const marcado = t => st.temas === 'todos' || (Array.isArray(st.temas) && st.temas.includes(pad2(t.num)));
    box.innerHTML = `
      <div class="chips seg" style="margin-top:12px;">
        <button type="button" class="chip ${st.modo === 'temas' ? 'on' : ''}" data-m="temas">Temas del libro</button>
        <button type="button" class="chip ${st.modo === 'banco' ? 'on' : ''}" data-m="banco" ${banco ? '' : 'disabled title="Este año no tiene banco de Fijas propio. Súbelo en Subir tema → Destino: Banco de Fijas"'}>Banco de Fijas propio${banco ? ` (${banco.reduce((s, t) => s + (t.questions || []).length, 0)} preg.)` : ''}</button>
      </div>
      ${st.modo === 'temas' ? (temas.length ? `
        <label class="ck" style="margin-top:12px;"><input type="checkbox" id="rfTodos" ${st.temas === 'todos' ? 'checked' : ''}>Todos los temas (incluye los que subas después)</label>
        <div class="rf-temas">${temas.map(t => `<label class="ck"><input type="checkbox" value="${esc(pad2(t.num))}" ${marcado(t) ? 'checked' : ''} ${st.temas === 'todos' ? 'disabled' : ''}>Tema ${esc(t.num)} · ${esc(t.name)} <em>${(t.questions || []).length} preg.</em></label>`).join('')}</div>
        <div class="chips seg" style="margin-top:12px;">
          <button type="button" class="chip ${st.porTema === 1 ? 'on' : ''}" data-p="1">1 pregunta al azar por tema</button>
          <button type="button" class="chip ${st.porTema === 0 ? 'on' : ''}" data-p="0">Todas las preguntas de cada tema</button>
        </div>` : '<p class="hint" style="margin-top:10px;">Este año aún no tiene temas. Las Fijas se verán como "Próximamente" hasta que subas alguno.</p>')
      : '<p class="hint" style="margin-top:10px;">Se usan todas las preguntas del banco de Fijas propio de este año.</p>'}`;
    box.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => { st.modo = b.dataset.m; pintarFijas(); }));
    box.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => { st.porTema = +b.dataset.p; box.querySelectorAll('[data-p]').forEach(x => x.classList.toggle('on', x === b)); }));
    const todos = box.querySelector('#rfTodos');
    if (todos) todos.addEventListener('change', () => {
      st.temas = todos.checked ? 'todos' : temas.map(t => pad2(t.num));
      box.querySelectorAll('.rf-temas input').forEach(i => { i.disabled = todos.checked; i.checked = true; });
    });
    box.querySelectorAll('.rf-temas input').forEach(i => i.addEventListener('change', () => {
      st.temas = [...box.querySelectorAll('.rf-temas input:checked')].map(x => x.value);
    }));
  };
  o.querySelector('#rfFij').addEventListener('change', () => { st.temas = 'todos'; pintarFijas(); });
  pintarFijas();
  o.querySelector('#rfSave').addEventListener('click', async () => {
    const err = o.querySelector('#rfErr'); err.classList.remove('show');
    const rep = o.querySelector('#rfRep').value, fij = o.querySelector('#rfFij').value;
    if (fij && st.modo === 'temas' && Array.isArray(st.temas) && !st.temas.length) { err.textContent = 'Marca al menos un tema para las Fijas.'; err.classList.add('show'); return; }
    const b = o.querySelector('#rfSave'); b.disabled = true; b.innerHTML = '<span class="spin-s"></span> Guardando…';
    try {
      await api('configCurso', { id: c.id, repaso: JSON.stringify(rep ? { anio: rep } : null), fijas: JSON.stringify(fij ? { anio: fij, modo: st.modo, temas: st.temas, porTema: st.porTema } : null) });
      cerrar(); await cargarCursos(); toast('Repaso y Fijas guardados · se verá en la web en 1 a 10 minutos');
    } catch (e) { b.disabled = false; b.textContent = 'Guardar'; err.textContent = e.message; err.classList.add('show'); }
  });
}
