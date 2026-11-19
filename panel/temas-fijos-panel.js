/* =========================================================
   Panel · Temas fijos
   Qué temas vinieron en cada examen de admisión, por modalidad
   (CPU / Ordinario) y por curso. Se crean los exámenes (2026-II…),
   los temas de cada curso y se marca con check donde vino.
   Se guarda en Supabase (tabla ajustes, clave 'temas_fijos') con
   guardar_ajuste: no necesita SQL nuevo. La página temas-fijos.html
   lo lee de ahí; si nunca se guardó, usa assets/temas-fijos/datos.js.
   Formato: { cpu: { examenes: ['2020-I', …], cursos: { biologia: [['Tema', '0101…'], …] } }, ordinario: {…} }
   ========================================================= */
const TF = { datos: null, mod: 'cpu', curso: 'biologia', cambios: false, cargado: false };
const TF_MODS = [['cpu', 'CPU'], ['ordinario', 'Ordinario']];
const TF_AREAS = [['ciencia-tecnologia', 'Ciencia y Tecnología'], ['matematica', 'Matemática'], ['comunicacion', 'Comunicación'], ['ciencias-sociales', 'Ciencias Sociales']];
const TF_CURSOS = [
  ['biologia', 'Biología', 'ciencia-tecnologia'], ['anatomia', 'Anatomía', 'ciencia-tecnologia'], ['quimica', 'Química', 'ciencia-tecnologia'], ['fisica', 'Física', 'ciencia-tecnologia'],
  ['algebra', 'Álgebra', 'matematica'], ['aritmetica', 'Aritmética', 'matematica'], ['geometria', 'Geometría', 'matematica'], ['trigonometria', 'Trigonometría', 'matematica'], ['estadistica', 'Estadística', 'matematica'],
  ['raz-verbal', 'Razonamiento Verbal', 'comunicacion'], ['literatura', 'Literatura', 'comunicacion'], ['lenguaje', 'Lenguaje', 'comunicacion'],
  ['historia-peru', 'Historia del Perú', 'ciencias-sociales'], ['historia-universal', 'Historia Universal', 'ciencias-sociales'], ['geografia', 'Espacio Geográfico', 'ciencias-sociales'],
  ['economia', 'Economía', 'ciencias-sociales'], ['ciudadania', 'Ciudadanía', 'ciencias-sociales'], ['psicologia', 'Psicología', 'ciencias-sociales'], ['filosofia', 'Filosofía', 'ciencias-sociales']
];
const TF_IC = {
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  arriba: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"/></svg>',
  abajo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>'
};

(function estilosTemasFijos() {
  const st = document.createElement('style');
  st.textContent = `
  .tf-fila { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; margin-bottom: 14px; }
  .tf-fila > small { font: 900 11px Nunito, sans-serif; letter-spacing: .1em; text-transform: uppercase; color: var(--text-faint); }
  .tf-seg { display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px; background: var(--surface); border: 1px solid #2F284E; flex-wrap: wrap; }
  .tf-seg button { border: 0; background: none; color: var(--text-dim); font: 800 13px Nunito, sans-serif; padding: 7px 12px; border-radius: 9px; cursor: pointer; }
  .tf-seg button.on { background: var(--accent); color: #0e0e0e; }
  .tf-seg button .n { font-size: 10.5px; opacity: .75; margin-left: 4px; }
  .tf-ex { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .tf-ex span { display: inline-flex; align-items: center; gap: 4px; padding: 5px 6px 5px 10px; border-radius: 9px; background: var(--surface); border: 1px solid #2F284E; font: 800 13px Nunito, sans-serif; }
  .tf-ex span button { width: 20px; height: 20px; border: 0; background: none; color: var(--text-faint); cursor: pointer; padding: 2px; border-radius: 6px; }
  .tf-ex span button:hover { color: #ff9a9a; background: rgba(255,80,80,.1); }
  .tf-ex svg, .tf-btn svg { width: 100%; height: 100%; display: block; }
  .tf-ex .inp { width: 110px; padding: 6px 10px; }
  .tf-caja { overflow-x: auto; border: 1px solid #2F284E; border-radius: 16px; background: var(--surface); }
  .tf-tabla { border-collapse: separate; border-spacing: 0; min-width: 100%; }
  .tf-tabla th { font: 900 11px Nunito, sans-serif; color: var(--text-faint); padding: 8px 4px; text-align: center; white-space: nowrap; border-bottom: 1px solid #2F284E; }
  .tf-tabla th.tm, .tf-tabla td.tm { position: sticky; left: 0; z-index: 1; background: var(--surface); text-align: left; padding: 6px 8px 6px 10px; min-width: 300px; border-right: 1px solid #2F284E; }
  .tf-tabla td { padding: 4px; text-align: center; border-bottom: 1px solid rgba(47,40,78,.6); }
  .tf-tabla td.v { font: 900 13px Nunito, sans-serif; color: var(--accent); padding: 0 12px; }
  .tf-tm { display: flex; align-items: center; gap: 6px; }
  .tf-tm b { width: 24px; flex: none; font: 900 12px Nunito, sans-serif; color: var(--text-faint); text-align: right; }
  .tf-tm .inp { flex: 1; min-width: 0; padding: 7px 10px; font-size: 13.5px; }
  .tf-btn { flex: none; width: 28px; height: 28px; padding: 6px; border-radius: 8px; border: 1px solid #2F284E; background: none; color: var(--text-dim); cursor: pointer; }
  .tf-btn:hover { color: var(--text); border-color: #4a4170; } .tf-btn.del:hover { color: #ff9a9a; border-color: #5a2a2a; }
  .tf-btn:disabled { opacity: .3; cursor: default; }
  .tf-c { width: 30px; height: 30px; border-radius: 8px; border: 1.5px solid #2F284E; background: #110D20; cursor: pointer; padding: 5px; color: #0e0e0e; }
  .tf-c.on { background: var(--accent); border-color: var(--accent); }
  .tf-c:not(.on) svg { display: none; }
  .tf-c:hover { border-color: var(--accent); }
  .tf-pie { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
  .tf-pie a.btn-ghost { text-decoration: none; }
  .tf-pegar { margin-top: 14px; }
  .tf-pegar textarea { width: 100%; min-height: 130px; font-family: ui-monospace, Menlo, monospace; font-size: 12.5px; }
  .tf-vacio { padding: 28px 18px; text-align: center; color: var(--text-dim); }
  `;
  document.head.appendChild(st);
})();

function tfEstado(txt) { $('tfEstado').textContent = txt || ''; }
function tfCambio() { TF.cambios = true; $('tfGuardar').disabled = false; tfEstado('Cambios sin guardar'); }
function tfRomano(r) { return { I: 1, II: 2, III: 3, IV: 4, V: 5 }[r] || 9; }
function tfOrden(a, b) { const [ya, ra] = a.split('-'), [yb, rb] = b.split('-'); return ya - yb || tfRomano(ra) - tfRomano(rb); }
function tfNormal(v) {
  const d = {};
  TF_MODS.forEach(([m]) => {
    const x = (v && v[m]) || {}, ex = Array.isArray(x.examenes) ? x.examenes.slice() : [], cursos = {};
    Object.keys(x.cursos || {}).forEach(c => {
      cursos[c] = (x.cursos[c] || []).map(t => [String(t[0] || ''), String(t[1] || '').replace(/[^01]/g, '0').padEnd(ex.length, '0').slice(0, ex.length)]);
    });
    d[m] = { examenes: ex, cursos };
  });
  return d;
}
function tfMod() { return TF.datos[TF.mod]; }
function tfTemas(crear) { const m = tfMod(); if (!m.cursos[TF.curso] && crear) m.cursos[TF.curso] = []; return m.cursos[TF.curso] || []; }

async function cargarTemasFijos(forzar) {
  if (TF.cargado && !forzar) return;
  const body = $('tfBody');
  body.innerHTML = '<div class="loader">Cargando…</div>';
  $('tfGuardar').disabled = true;
  let cliente;
  try { cliente = await MCAuth.listo; }
  catch (e) { body.innerHTML = '<div class="state-msg error">No se pudo conectar con Supabase. Revisa tu internet.</div>'; return; }
  if (!MCAuth.usuario()) {
    body.innerHTML = `<div class="state-msg al-login">Para editar Temas fijos entra con tu cuenta de Google de administrador.
      <button class="btn-main" type="button" id="tfEntrar">Entrar con Google</button></div>`;
    $('tfEntrar').addEventListener('click', () => MCAuth.entrarGoogle());
    return;
  }
  const r = await cliente.from('ajustes').select('valor').eq('clave', 'temas_fijos').maybeSingle();
  if (r.error) { body.innerHTML = '<div class="state-msg error">No se pudieron leer los Temas fijos. Intenta de nuevo.</div>'; return; }
  const guardado = r.data && r.data.valor;
  TF.datos = tfNormal(guardado || window.MC_TEMAS_FIJOS || {});
  TF.cargado = true; TF.cambios = false;
  tfEstado(guardado ? '' : 'Mostrando los datos iniciales (aún no guardados)');
  renderTemasFijos();
}

function renderTemasFijos(errores) {
  const body = $('tfBody'), m = tfMod(), ex = m.examenes, cur = TF_CURSOS.find(c => c[0] === TF.curso) || TF_CURSOS[0];
  const temas = tfTemas(false);
  const cuenta = c => (m.cursos[c] || []).length;
  const tabla = !ex.length ? '<div class="tf-vacio">Primero agrega los exámenes de esta modalidad (por ejemplo 2026-I).</div>'
    : !temas.length ? '<div class="tf-vacio">Este curso aún no tiene temas. Agrega el primero o pégalos desde Excel.</div>'
    : `<div class="tf-caja"><table class="tf-tabla"><thead><tr><th class="tm">Tema</th>${ex.map(e => `<th>${esc(e)}</th>`).join('')}<th>Veces</th></tr></thead><tbody>${temas.map((t, i) => `
      <tr><td class="tm"><div class="tf-tm"><b>${i + 1}</b><input class="inp" data-nombre="${i}" value="${esc(t[0])}" maxlength="80" placeholder="Nombre del tema">
        <button class="tf-btn" type="button" data-sube="${i}" title="Subir" ${i ? '' : 'disabled'}>${TF_IC.arriba}</button>
        <button class="tf-btn" type="button" data-baja="${i}" title="Bajar" ${i < temas.length - 1 ? '' : 'disabled'}>${TF_IC.abajo}</button>
        <button class="tf-btn del" type="button" data-quita="${i}" title="Quitar tema">${TF_IC.x}</button></div></td>
        ${ex.map((e, k) => `<td><button class="tf-c${t[1][k] === '1' ? ' on' : ''}" type="button" data-t="${i}" data-k="${k}" title="${esc(t[0])} · ${esc(e)}" aria-pressed="${t[1][k] === '1'}">${TF_IC.check}</button></td>`).join('')}
        <td class="v" data-v="${i}">${t[1].split('').filter(c => c === '1').length}</td></tr>`).join('')}</tbody></table></div>`;
  body.innerHTML = `
    ${errores && errores.length ? `<div class="perr pf-errs">${errores.map(esc).join('<br>')}</div>` : ''}
    <div class="tf-fila"><small>Modalidad</small><div class="tf-seg">${TF_MODS.map(([k, n]) => `<button type="button" data-mod="${k}" class="${k === TF.mod ? 'on' : ''}">${n}<span class="n">${TF.datos[k].examenes.length} ex.</span></button>`).join('')}</div></div>
    <div class="tf-fila"><small>Exámenes</small><div class="tf-ex">${ex.map((e, k) => `<span>${esc(e)}<button type="button" data-quitaex="${k}" title="Quitar ${esc(e)}">${TF_IC.x}</button></span>`).join('')}
      <input class="inp" id="tfNuevoEx" placeholder="2026-II" maxlength="8"><button class="btn-ghost" type="button" id="tfAgregaEx">+ Agregar examen</button></div></div>
    <div class="tf-fila"><small>Área</small><div class="tf-seg">${TF_AREAS.map(([k, n]) => `<button type="button" data-area="${k}" class="${k === cur[2] ? 'on' : ''}">${n}</button>`).join('')}</div></div>
    <div class="tf-fila"><small>Curso</small><div class="tf-seg">${TF_CURSOS.filter(c => c[2] === cur[2]).map(c => `<button type="button" data-curso="${c[0]}" class="${c[0] === TF.curso ? 'on' : ''}">${esc(c[1])}<span class="n">${cuenta(c[0]) || ''}</span></button>`).join('')}</div></div>
    ${tabla}
    <div class="tf-pie">
      <button class="btn-ghost" type="button" id="tfAgregaTema" ${ex.length ? '' : 'disabled'}>+ Agregar tema</button>
      <button class="btn-ghost" type="button" id="tfVerPegar" ${ex.length ? '' : 'disabled'}>Pegar desde Excel</button>
      <button class="btn-ghost" type="button" id="tfBajarXlsx">Descargar Excel</button>
      <button class="btn-ghost" type="button" id="tfSubirXlsx">Subir Excel</button>
      <input type="file" id="tfArchivo" accept=".xlsx,.xls,.csv" hidden>
      <a class="btn-ghost" href="../temas-fijos.html?curso=${TF.curso}&mod=${TF.mod}" target="_blank" rel="noopener">Ver en la web</a>
    </div>
    <div class="pcard tf-pegar" id="tfPegar" hidden>
      <p class="hint" style="margin:0 0 8px">Copia de Excel las filas del curso: primera columna el tema y luego una columna por examen, en el mismo orden de arriba (${esc(ex.join(', '))}). Una X, x, 1 o cualquier marca = vino; vacío = no vino. Reemplaza los temas de <b>${esc(cur[1])}</b> en ${TF.mod === 'cpu' ? 'CPU' : 'Ordinario'}.</p>
      <textarea class="inp" id="tfPegarTx" placeholder="Biología como ciencia&#9;&#9;&#9;X&#10;Origen de la vida&#9;X&#9;&#9;X"></textarea>
      <div class="tf-pie"><button class="btn-main" type="button" id="tfPegarOk">Usar estos temas</button><button class="btn-ghost" type="button" id="tfPegarNo">Cancelar</button></div>
    </div>`;
}

function tfAgregarExamen() {
  const inp = $('tfNuevoEx'), v = inp.value.trim().toUpperCase().replace(/\s+/g, '').replace(/^(\d{4})-?(I{1,3}|IV|V)$/, '$1-$2');
  const m = tfMod();
  if (!/^\d{4}-(I|II|III|IV|V)$/.test(v)) { tfEstado('Escribe el examen así: 2026-I, 2026-II, 2026-III o 2026-IV'); inp.focus(); return; }
  if (m.examenes.includes(v)) { tfEstado(v + ' ya está'); return; }
  const lista = m.examenes.concat(v).sort(tfOrden), k = lista.indexOf(v);
  m.examenes = lista;
  Object.keys(m.cursos).forEach(c => m.cursos[c].forEach(t => { t[1] = t[1].slice(0, k) + '0' + t[1].slice(k); }));
  tfCambio(); renderTemasFijos(); tfEstado(v + ' agregado. Marca los temas que vinieron y guarda.');
}
function tfQuitarExamen(k) {
  const m = tfMod(), e = m.examenes[k];
  const marcas = Object.keys(m.cursos).reduce((a, c) => a + m.cursos[c].filter(t => t[1][k] === '1').length, 0);
  if (!confirm('¿Quitar el examen ' + e + '?' + (marcas ? ' Se borran sus ' + marcas + ' checks en todos los cursos.' : ''))) return;
  m.examenes.splice(k, 1);
  Object.keys(m.cursos).forEach(c => m.cursos[c].forEach(t => { t[1] = t[1].slice(0, k) + t[1].slice(k + 1); }));
  tfCambio(); renderTemasFijos();
}
function tfPegar() {
  const m = tfMod(), n = m.examenes.length, errores = [];
  const filas = $('tfPegarTx').value.split(/\r?\n/).map(l => l.replace(/\s+$/, '')).filter(l => l.trim());
  const temas = filas.map((l, i) => {
    const cel = l.split('\t'), nombre = (cel[0] || '').trim();
    if (!nombre) errores.push('Fila ' + (i + 1) + ': falta el nombre del tema');
    if (cel.length - 1 > n) errores.push('Fila ' + (i + 1) + ' (' + nombre + '): tiene ' + (cel.length - 1) + ' columnas y hay ' + n + ' exámenes');
    let s = ''; for (let k = 0; k < n; k++) s += (cel[k + 1] || '').trim() ? '1' : '0';
    return [nombre, s];
  });
  if (!temas.length) errores.push('No hay filas para pegar');
  if (errores.length) { renderTemasFijos(errores); return; }
  if (tfTemas(false).length && !confirm('Se reemplazan los ' + tfTemas(false).length + ' temas de este curso por los ' + temas.length + ' pegados. ¿Seguir?')) return;
  m.cursos[TF.curso] = temas;
  tfCambio(); renderTemasFijos(); tfEstado(temas.length + ' temas pegados. Revisa y guarda.');
}

async function guardarTemasFijos() {
  const errores = [], limpio = {};
  TF_MODS.forEach(([m, nom]) => {
    const x = TF.datos[m], cursos = {};
    Object.keys(x.cursos).forEach(c => {
      const lista = x.cursos[c].map(t => [t[0].trim(), t[1]]).filter(t => t[0]);
      if (x.cursos[c].some(t => !t[0].trim() && t[1].includes('1'))) errores.push(nom + ' · ' + ((TF_CURSOS.find(k => k[0] === c) || [, c])[1]) + ': hay un tema con checks y sin nombre');
      if (lista.length) cursos[c] = lista;
    });
    limpio[m] = { examenes: x.examenes.slice(), cursos };
  });
  if (errores.length) { renderTemasFijos(errores); return; }
  $('tfGuardar').disabled = true; tfEstado('Guardando…');
  try {
    const cliente = await MCAuth.listo;
    const r = await cliente.rpc('guardar_ajuste', { p_clave: 'temas_fijos', p_valor: limpio });
    if (r.error) throw r.error;
    TF.cambios = false; tfEstado('Guardado. Ya se ve en la web.');
  } catch (e) {
    $('tfGuardar').disabled = false;
    tfEstado('No se pudo guardar: ' + ((e && e.message) || 'intenta de nuevo'));
  }
}

document.addEventListener('click', e => {
  if (!e.target.closest || !e.target.closest('#tab-temasfijos')) return;
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  const d = b.dataset;
  if (b.id === 'tfGuardar') return guardarTemasFijos();
  if (!TF.datos) return;
  if (d.mod) { TF.mod = d.mod; return renderTemasFijos(); }
  if (d.area) { TF.curso = (TF_CURSOS.find(c => c[2] === d.area && tfMod().cursos[c[0]]) || TF_CURSOS.find(c => c[2] === d.area))[0]; return renderTemasFijos(); }
  if (d.curso) { TF.curso = d.curso; return renderTemasFijos(); }
  if (d.quitaex != null) return tfQuitarExamen(+d.quitaex);
  if (b.id === 'tfAgregaEx') return tfAgregarExamen();
  if (b.id === 'tfAgregaTema') { tfTemas(true).push(['', '0'.repeat(tfMod().examenes.length)]); tfCambio(); renderTemasFijos(); const ins = document.querySelectorAll('#tfBody [data-nombre]'); if (ins.length) ins[ins.length - 1].focus(); return; }
  if (b.id === 'tfVerPegar') { $('tfPegar').hidden = false; $('tfPegarTx').focus(); return; }
  if (b.id === 'tfPegarNo') { $('tfPegar').hidden = true; return; }
  if (b.id === 'tfPegarOk') return tfPegar();
  if (b.id === 'tfBajarXlsx') return tfBajarExcel();
  if (b.id === 'tfSubirXlsx') { $('tfArchivo').value = ''; return $('tfArchivo').click(); }
  const temas = tfTemas(false);
  if (d.t != null) {
    const t = temas[+d.t], k = +d.k, on = t[1][k] !== '1';
    t[1] = t[1].slice(0, k) + (on ? '1' : '0') + t[1].slice(k + 1);
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
    document.querySelector(`#tfBody [data-v="${d.t}"]`).textContent = t[1].split('').filter(c => c === '1').length;
    return tfCambio();
  }
  const mover = (i, j) => { const x = temas[i]; temas[i] = temas[j]; temas[j] = x; tfCambio(); renderTemasFijos(); };
  if (d.sube != null) return mover(+d.sube, +d.sube - 1);
  if (d.baja != null) return mover(+d.baja, +d.baja + 1);
  if (d.quita != null) {
    const t = temas[+d.quita];
    if (t[1].includes('1') && !confirm('¿Quitar el tema "' + (t[0] || 'sin nombre') + '" con sus checks?')) return;
    temas.splice(+d.quita, 1); tfCambio(); renderTemasFijos();
  }
});
document.addEventListener('input', e => {
  const i = e.target.dataset && e.target.dataset.nombre;
  if (i == null || !TF.datos) return;
  tfTemas(false)[+i][0] = e.target.value; tfCambio();
});
document.addEventListener('change', e => { if (e.target.id === 'tfArchivo' && e.target.files[0]) tfSubirExcel(e.target.files[0]); });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'tfNuevoEx') { e.preventDefault(); tfAgregarExamen(); } });
window.addEventListener('beforeunload', e => { if (TF.cambios) { e.preventDefault(); e.returnValue = ''; } });

/* ---------- Excel: descargar y subir ----------
   Un archivo por modalidad. Hoja "Cómo llenar" + una hoja por curso (con el nombre del curso).
   En cada hoja: fila 1 = Tema y los exámenes (2020-I, 2020-II…); desde la fila 2, un tema por fila
   y una X en cada examen donde vino. Al subir se reemplazan los temas de los cursos que traiga el archivo;
   los exámenes que no existían se agregan solos. */
const TF_XLSX = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
function tfLibXlsx() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  return new Promise((ok, mal) => { const sc = document.createElement('script'); sc.src = TF_XLSX; sc.onload = () => ok(window.XLSX); sc.onerror = () => mal(new Error('No se pudo cargar la herramienta de Excel. Revisa tu internet.')); document.head.appendChild(sc); });
}
function tfSinTilde(x) { return String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function tfHoja(nombre) { return nombre.replace(/[\\/?*[\]:]/g, '').slice(0, 31); }
async function tfBajarExcel() {
  let X; try { X = await tfLibXlsx(); } catch (e) { return tfEstado(e.message); }
  const m = tfMod(), ex = m.examenes, modNom = TF.mod === 'cpu' ? 'CPU' : 'Ordinario', wb = X.utils.book_new();
  const guia = [
    ['Temas fijos · Modalidad ' + modNom],
    [],
    ['Cómo llenar este Excel'],
    ['1. Cada hoja es un curso. No cambies el nombre de la hoja.'],
    ['2. Fila 1: "Tema" y luego un examen por columna (2020-I, 2020-II, 2024-III…). Para agregar un examen, escríbelo en una columna nueva.'],
    ['3. Desde la fila 2: un tema por fila. Escribe X en cada examen donde vino ese tema; deja vacío donde no vino.'],
    ['4. Guarda el archivo y en el panel toca "Subir Excel". Se reemplazan los temas de los cursos que traiga el archivo.'],
    ['5. Revisa la tabla y toca "Guardar y publicar".'],
    [],
    ['Exámenes de ' + modNom + ':', ex.join(', ') || '(ninguno todavía)']
  ];
  const g = X.utils.aoa_to_sheet(guia); g['!cols'] = [{ wch: 110 }, { wch: 60 }];
  X.utils.book_append_sheet(wb, g, 'Cómo llenar');
  TF_CURSOS.forEach(([c, nom]) => {
    const temas = m.cursos[c] || [];
    const filas = [['Tema'].concat(ex)].concat(temas.map(t => [t[0]].concat(ex.map((_, k) => t[1][k] === '1' ? 'X' : ''))));
    const h = X.utils.aoa_to_sheet(filas);
    h['!cols'] = [{ wch: 38 }].concat(ex.map(() => ({ wch: 9 })));
    h['!freeze'] = { xSplit: 1, ySplit: 1 };
    X.utils.book_append_sheet(wb, h, tfHoja(nom));
  });
  X.writeFile(wb, 'temas-fijos-' + TF.mod + '.xlsx');
  tfEstado('Excel descargado: una hoja por curso.');
}
async function tfSubirExcel(archivo) {
  let X; try { X = await tfLibXlsx(); } catch (e) { return tfEstado(e.message); }
  let wb;
  try { wb = X.read(await archivo.arrayBuffer(), { type: 'array' }); }
  catch (e) { return renderTemasFijos(['No se pudo leer el archivo. Debe ser un Excel (.xlsx).']); }
  const m = tfMod(), errores = [], cursos = {}, nuevosEx = new Set();
  const porNombre = {}; TF_CURSOS.forEach(([c, nom]) => { porNombre[tfSinTilde(nom)] = c; porNombre[tfSinTilde(c)] = c; });
  wb.SheetNames.forEach(hn => {
    const c = porNombre[tfSinTilde(hn)]; if (!c) return;   // hojas que no son cursos (la guía) se saltan
    const filas = X.utils.sheet_to_json(wb.Sheets[hn], { header: 1, defval: '', raw: false });
    if (!filas.length) return;
    const cab = filas[0].map(x => String(x).trim().toUpperCase().replace(/\s+/g, '').replace(/^(\d{4})-?(I{1,3}|IV|V)$/, '$1-$2'));
    const cols = [];
    cab.slice(1).forEach((e, i) => {
      if (!e) return;
      if (!/^\d{4}-(I|II|III|IV|V)$/.test(e)) { errores.push(hn + ': la columna "' + filas[0][i + 1] + '" no es un examen (escríbelo como 2026-I)'); return; }
      cols.push([i + 1, e]); if (!m.examenes.includes(e)) nuevosEx.add(e);
    });
    const temas = filas.slice(1).filter(f => String(f[0] || '').trim()).map(f => ({ nombre: String(f[0]).trim().slice(0, 80), vino: new Set(cols.filter(([i]) => String(f[i] || '').trim()).map(([, e]) => e)) }));
    cursos[c] = temas;
  });
  if (errores.length) return renderTemasFijos(errores);
  const lista = Object.keys(cursos).filter(c => cursos[c].length);
  if (!lista.length) return renderTemasFijos(['El archivo no trae temas. Usa el Excel de "Descargar Excel": una hoja por curso, fila 1 con los exámenes.']);
  const nom = c => (TF_CURSOS.find(k => k[0] === c) || [, c])[1];
  const resumen = lista.map(c => nom(c) + ': ' + cursos[c].length + ' temas').join('\n');
  if (!confirm('Subir a ' + (TF.mod === 'cpu' ? 'CPU' : 'Ordinario') + ':\n\n' + resumen + (nuevosEx.size ? '\n\nExámenes nuevos: ' + [...nuevosEx].sort(tfOrden).join(', ') : '') + '\n\nSe reemplazan los temas de esos cursos. ¿Seguir?')) return;
  // Exámenes nuevos: se insertan en su lugar en todos los cursos
  [...nuevosEx].sort(tfOrden).forEach(v => {
    const l = m.examenes.concat(v).sort(tfOrden), k = l.indexOf(v);
    m.examenes = l;
    Object.keys(m.cursos).forEach(cc => m.cursos[cc].forEach(t => { t[1] = t[1].slice(0, k) + '0' + t[1].slice(k); }));
  });
  lista.forEach(c => { m.cursos[c] = cursos[c].map(t => [t.nombre, m.examenes.map(e => t.vino.has(e) ? '1' : '0').join('')]); });
  if (!lista.includes(TF.curso)) TF.curso = lista[0];
  tfCambio(); renderTemasFijos();
  tfEstado('Excel cargado (' + lista.length + (lista.length === 1 ? ' curso' : ' cursos') + '). Revisa y toca "Guardar y publicar".');
}
