/* =========================================================
   Panel · Ciclos académicos (Contenido)
   Por área: agregar un ciclo a todos sus cursos, mostrarlo u ocultarlo,
   cambiarle el nombre, fijar cuántos temas tendrá (barra de avance del
   temario) y pasar el Repaso de todos los cursos a ese ciclo. Ocultar no borra temas.
   Se guarda en Supabase (tabla ajustes, clave 'ciclos'):
     { areas: { matematica: { ocultos: ['2026-III'], nombres: { '2027-I': '2027-I' }, temas: { '2027-I': 12 } } } }
   La web lo lee con assets/ciclos.js (Libros, Seminarios y Banqueo).
   ========================================================= */
const CI = { area: null, cfg: null, cargado: false };
const CI_COLOR = { 'ciencia-tecnologia': ['#C6E000', '198,224,0', '#8fa300'], matematica: ['#1CB0F6', '28,176,246', '#1287bd'],
  comunicacion: ['#CE82FF', '206,130,255', '#a35fd1'], 'ciencias-sociales': ['#FF9600', '255,150,0', '#c77400'] };

(function estilosCiclos() {
  const st = document.createElement('style');
  st.textContent = `
  .ci-areas { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 18px; }
  .ci-ar { display: inline-flex; align-items: center; gap: 8px; padding: 9px 14px; border-radius: 14px; border: 2px solid #2F284E; border-bottom-width: 4px;
    background: #1A1630; color: var(--text-dim); font: 900 13.5px 'Nunito', sans-serif; cursor: pointer; }
  .ci-ar i { width: 11px; height: 11px; border-radius: 50%; background: var(--c); }
  .ci-ar.on { border-color: var(--c); border-bottom-color: var(--d); background: rgba(var(--r), .12); color: var(--c); }
  .ci-nuevo { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; padding: 16px; border-radius: 18px; border: 2px solid #2C2549; border-bottom-width: 5px; background: #151127; margin-bottom: 16px; }
  .ci-nuevo b { flex-basis: 100%; font-weight: 900; }
  .ci-nuevo .inp { flex: 1; min-width: 140px; }
  .ci-nuevo .ci-tn { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; font-weight: 800; color: var(--text-dim); }
  .ci-nuevo .ci-tn .inp { width: 78px; min-width: 0; flex: none; }
  .ci-acc { flex-wrap: wrap; justify-content: flex-end; }
  .ci-nuevo .hint { flex-basis: 100%; }
  .ci-lista { display: grid; gap: 10px; }
  .ci-fila { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 14px; align-items: center; padding: 14px 16px; border-radius: 18px;
    border: 2px solid #2C2549; border-bottom-width: 5px; background: #18132B; }
  .ci-fila.oculto .ci-nom, .ci-fila.oculto .ci-info { opacity: .5; }
  .ci-nom { font: 900 19px 'Nunito', sans-serif; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .ci-nom small { font: 800 11px 'Nunito', sans-serif; padding: 3px 8px; border-radius: 8px; background: #251F3F; color: var(--text-dim); letter-spacing: .04em; }
  .ci-info { color: var(--text-dim); font-size: 13px; margin-top: 3px; }
  .ci-info b { color: var(--c); }
  .ci-acc { display: flex; gap: 10px; align-items: center; }
  .ci-sw { width: 50px; height: 30px; border-radius: 20px; background: #2F284E; position: relative; border: 2px solid #352E58; cursor: pointer; flex-shrink: 0; padding: 0; }
  .ci-sw::after { content: ""; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #777; transition: left .2s, background .2s; }
  .ci-sw.on { background: var(--c); border-color: var(--d); }
  .ci-sw.on::after { left: 23px; background: #fff; }
  .ci-est { font: 900 12px 'Nunito', sans-serif; min-width: 52px; color: #777; }
  .ci-est.v { color: var(--c); }
  @media (max-width: 600px) { .ci-fila { grid-template-columns: 1fr; } .ci-acc { justify-content: space-between; } }`;
  document.head.appendChild(st);
})();

function ciVars(area) { const c = CI_COLOR[area] || CI_COLOR['ciencia-tecnologia']; return `--c:${c[0]};--r:${c[1]};--d:${c[2]}`; }
function ciOrden(id) { const x = String(id).match(/^(\d{4})-(III|II|I)$/); return x ? +x[1] * 10 + { I: 1, II: 2, III: 3 }[x[2]] : 0; }
function ciArea() {
  const a = (CI.cfg.areas = CI.cfg.areas || {}), x = (a[CI.area] = a[CI.area] || {});
  x.ocultos = x.ocultos || []; x.nombres = x.nombres || {}; x.temas = x.temas || {};
  return x;
}
function ciTemasTxt(n) { return n + ' tema' + (n === 1 ? '' : 's'); }

async function ciGuardar() {
  const r = await (await MCAuth.listo).rpc('guardar_ajuste', { p_clave: 'ciclos', p_valor: CI.cfg });
  if (r.error) throw new Error(/autorizado/.test(r.error.message) ? 'Solo el administrador puede cambiar los ciclos' : 'No se pudo guardar. Intenta de nuevo.');
  try { localStorage.setItem('mc_ciclos', JSON.stringify(CI.cfg)); } catch (e) {}
}

async function cargarCiclos(forzar) {
  const body = $('ciBody');
  if (CI.cargado && !forzar) return renderCiclos();
  body.innerHTML = '<div class="loader">Cargando…</div>';
  let cliente;
  try { cliente = await MCAuth.listo; }
  catch (e) { body.innerHTML = '<div class="state-msg error">No se pudo conectar con Supabase. Revisa tu internet.</div>'; return; }
  if (!MCAuth.usuario()) {
    body.innerHTML = `<div class="state-msg al-login">Para cambiar los ciclos entra con tu cuenta de Google de administrador.
      <button class="btn-main" type="button" id="ciEntrar">Entrar con Google</button></div>`;
    $('ciEntrar').addEventListener('click', () => MCAuth.entrarGoogle());
    return;
  }
  const [r] = await Promise.all([cliente.from('ajustes').select('valor').eq('clave', 'ciclos').maybeSingle(), REG ? null : cargarRegistro()]);
  if (r.error || !REG) { body.innerHTML = '<div class="state-msg error">No se pudieron leer los ciclos. Intenta de nuevo.</div>'; return; }
  CI.cfg = (r.data && r.data.valor) || { areas: {} };
  CI.area = CI.area || ((REG.areas || [])[0] || {}).id;
  CI.cargado = true;
  renderCiclos();
}

async function renderCiclos() {
  const body = $('ciBody');
  const area = (REG.areas || []).find(a => a.id === CI.area) || {};
  const cursos = (REG.cursos || []).filter(c => c.area === CI.area && !c.oculto).sort((a, b) => (a.orden || 0) - (b.orden || 0));
  body.innerHTML = `<div class="ci-areas">${(REG.areas || []).map(a => `<button type="button" class="ci-ar ${a.id === CI.area ? 'on' : ''}" style="${ciVars(a.id)}" data-a="${esc(a.id)}"><i></i>${esc(a.nombre)}</button>`).join('')}</div>
    <div class="ci-nuevo" style="${ciVars(CI.area)}"><b>Agregar un ciclo nuevo</b>
      <input class="inp" id="ciNuevo" placeholder="Ej.: 2027-III" maxlength="8" autocomplete="off">
      <label class="ci-tn">Temas <input class="inp" id="ciNuevoTemas" type="number" min="1" max="60" value="10"></label>
      <button class="btn-main" type="button" id="ciCrear">Agregar a ${esc(area.nombre || '')}</button>
      <span class="hint">Se crea en ${esc(cursos.map(c => c.nombre).join(', ') || 'los cursos del área')}. Se ve como "Próximamente" hasta que subas el primer tema; si no quieres que se vea, apágalo. «Temas» es cuántos tendrá el ciclo: la barra del temario muestra «4 de 12 temas». Puedes cambiarlo después.</span></div>
    <div class="ci-lista" id="ciLista" style="${ciVars(CI.area)}"><div class="loader">Leyendo los ciclos de cada curso…</div></div>`;
  body.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => { CI.area = b.dataset.a; renderCiclos(); }));
  $('ciCrear').addEventListener('click', () => ciCrear(cursos));
  $('ciNuevo').addEventListener('keydown', e => { if (e.key === 'Enter') ciCrear(cursos); });

  const mans = await Promise.all(cursos.map(c => getManifest(c.id).catch(() => [])));
  if (area.id !== CI.area || !$('ciLista')) return; // cambió de área mientras cargaba
  const ciclos = {};
  cursos.forEach((c, i) => (mans[i] || []).forEach(m => { (ciclos[m.id] = ciclos[m.id] || {})[c.id] = m.temas || 0; }));
  const ids = Object.keys(ciclos).sort((a, b) => ciOrden(b) - ciOrden(a));
  const cfg = ciArea();
  const masNuevo = ids.find(id => cursos.some(c => ciclos[id][c.id])); // «Usar en Repaso» solo en el ciclo más nuevo con temas
  $('ciLista').innerHTML = ids.length ? ids.map(id => {
    const visible = !cfg.ocultos.includes(id);
    const conTemas = cursos.filter(c => ciclos[id][c.id]);
    const info = conTemas.length
      ? cursos.map(c => ciclos[id][c.id] ? `<b>${esc(c.nombre)} ${ciclos[id][c.id]} tema${ciclos[id][c.id] === 1 ? '' : 's'}</b>` : `${esc(c.nombre)} 0`).join(' · ')
      : 'Sin temas todavía' + (visible ? ' · se ve como "Próximamente"' : '');
    const nombre = cfg.nombres[id];
    const tot = +cfg.temas[id] || 0;
    const enRepaso = cursos.filter(c => c.repaso && c.repaso.anio === id).length;
    const repTxt = !conTemas.length ? '' : enRepaso === cursos.length ? ' · Repaso de todos los cursos' : enRepaso ? ` · Repaso en ${enRepaso} de ${cursos.length} cursos` : '';
    return `<div class="ci-fila ${visible ? '' : 'oculto'}"><div><div class="ci-nom">${esc(nombre || id)}${nombre ? `<small>${esc(id)}</small>` : ''}${visible ? '' : '<small>OCULTO</small>'}</div>
      <div class="ci-info">${info}</div>
      <div class="ci-info">Barra del temario: <b>${tot ? ciTemasTxt(tot) : '10 temas'}</b>${tot ? '' : ' (sin fijar)'}${repTxt}</div></div>
      <div class="ci-acc"><button class="rbtn" type="button" data-tem="${esc(id)}">Temas del ciclo</button>
      ${id === masNuevo && enRepaso < cursos.length ? `<button class="rbtn" type="button" data-rep="${esc(id)}">Usar en Repaso</button>` : ''}
      <button class="rbtn" type="button" data-ren="${esc(id)}">Renombrar</button>
      <span class="ci-est ${visible ? 'v' : ''}">${visible ? 'Visible' : 'Oculto'}</span>
      <button class="ci-sw ${visible ? 'on' : ''}" type="button" data-sw="${esc(id)}" aria-label="${visible ? 'Ocultar' : 'Mostrar'} ${esc(id)}"></button></div></div>`;
  }).join('') : '<div class="state-msg" style="padding:24px;">Esta área aún no tiene ciclos. Agrega el primero arriba.</div>';

  $('ciLista').querySelectorAll('[data-sw]').forEach(b => b.addEventListener('click', async () => {
    const id = b.dataset.sw, antes = cfg.ocultos.slice();
    cfg.ocultos = cfg.ocultos.includes(id) ? cfg.ocultos.filter(x => x !== id) : cfg.ocultos.concat(id);
    b.disabled = true;
    try { await ciGuardar(); toast(cfg.ocultos.includes(id) ? id + ' oculto · sus temas se conservan' : id + ' visible en la web'); }
    catch (e) { cfg.ocultos = antes; toast(e.message, true); }
    renderCiclos();
  }));
  $('ciLista').querySelectorAll('[data-tem]').forEach(b => b.addEventListener('click', async () => {
    const id = b.dataset.tem;
    const v = await pedirTexto({ titulo: 'Temas del ciclo ' + (cfg.nombres[id] || id),
      sub: `Cuántos temas tendrá este ciclo en ${esc(area.nombre || '')}. La barra del Libro muestra «4 de <b>N</b> temas» y llega al final cuando se publican todos. Déjalo vacío para volver a 10.`,
      valor: String(cfg.temas[id] || 10), vacioOk: true });
    if (v === null) return;
    const n = v === '' ? 0 : parseInt(v, 10);
    if (v !== '' && !(n >= 1 && n <= 60)) { toast('Escribe un número de 1 a 60', true); return; }
    const antes = cfg.temas[id];
    if (!n || n === 10) delete cfg.temas[id]; else cfg.temas[id] = n;
    try { await ciGuardar(); toast('Ciclo ' + id + ': ' + ciTemasTxt(n || 10)); }
    catch (e) { if (antes) cfg.temas[id] = antes; else delete cfg.temas[id]; toast(e.message, true); }
    renderCiclos();
  }));
  $('ciLista').querySelectorAll('[data-rep]').forEach(b => b.addEventListener('click', () => ciRepaso(b.dataset.rep, cursos.filter(c => ciclos[b.dataset.rep][c.id]))));
  $('ciLista').querySelectorAll('[data-ren]').forEach(b => b.addEventListener('click', async () => {
    const id = b.dataset.ren;
    const v = await pedirTexto({ titulo: 'Renombrar ' + id, sub: `Así se verá el ciclo en Libros, Seminarios y Banqueo de ${esc(area.nombre || '')}. Déjalo vacío para volver a <b>${esc(id)}</b>.`, valor: cfg.nombres[id] || id, vacioOk: true });
    if (v === null) return;
    const antes = cfg.nombres[id];
    if (!v || v === id) delete cfg.nombres[id]; else cfg.nombres[id] = v.slice(0, 40);
    try { await ciGuardar(); toast('Nombre guardado'); }
    catch (e) { if (antes) cfg.nombres[id] = antes; else delete cfg.nombres[id]; toast(e.message, true); }
    renderCiclos();
  }));
}

async function ciCrear(cursos) {
  const inp = $('ciNuevo'), b = $('ciCrear');
  const v = inp.value.toUpperCase().replace(/\s+/g, '').replace(/^(\d{4})(I{1,3})$/, '$1-$2');
  if (!/^\d{4}-(I|II|III)$/.test(v)) { toast('Escribe el ciclo como 2028-I, 2028-II o 2028-III', true); return; }
  if (!cursos.length) { toast('Esta área no tiene cursos', true); return; }
  b.disabled = true;
  let hechos = 0, fallos = [];
  for (const c of cursos) {
    b.textContent = `Creando en ${c.nombre}…`;
    try {
      const man = await getManifest(c.id).catch(() => []);
      if (!man.some(m => m.id === v)) await api('crearAnio', { carpeta: c.id, anio: v });
      delete cacheManifest[c.id]; hechos++;
    } catch (e) { fallos.push(c.nombre); }
  }
  const cfg = ciArea();
  const nt = parseInt(($('ciNuevoTemas') || {}).value, 10);
  let cambio = false;
  if (cfg.ocultos.includes(v)) { cfg.ocultos = cfg.ocultos.filter(x => x !== v); cambio = true; }
  if (nt >= 1 && nt <= 60 && nt !== 10) { cfg.temas[v] = nt; cambio = true; }
  if (cambio) { try { await ciGuardar(); } catch (e) {} }
  if (fallos.length) toast('No se pudo crear en: ' + fallos.join(', '), true);
  else toast('Ciclo ' + v + ' creado en ' + hechos + ' curso' + (hechos === 1 ? '' : 's'));
  renderCiclos();
}

// Repaso de todos los cursos del área (que ya tienen temas en ese ciclo) pasa a este ciclo. Fijas no se toca.
async function ciRepaso(id, cursos) {
  const faltan = cursos.filter(c => !(c.repaso && c.repaso.anio === id));
  if (!faltan.length) { toast('Todos los cursos ya usan ' + id + ' en Repaso'); return; }
  const ok = await pedirTexto({ titulo: 'Repaso ' + id,
    sub: `El Repaso de <b>${esc(faltan.map(c => c.nombre).join(', '))}</b> pasará a usar los temas de ${esc(id)}. Fijas no cambia. Escribe <b>SI</b> para seguir.`,
    exacto: 'SI', boton: 'Cambiar Repaso' });
  if (ok === null) return;
  let hechos = 0; const fallos = [];
  for (const c of faltan) {
    try {
      await api('configCurso', { id: c.id, repaso: JSON.stringify({ anio: id }), fijas: JSON.stringify(c.fijas && c.fijas.anio ? c.fijas : null) });
      c.repaso = { anio: id }; hechos++;
    } catch (e) { fallos.push(c.nombre); }
  }
  if (fallos.length) toast('No se pudo cambiar en: ' + fallos.join(', '), true);
  else toast('Repaso ' + id + ' en ' + hechos + ' curso' + (hechos === 1 ? '' : 's') + ' · se verá en la web en 1 a 10 minutos');
  renderCiclos();
}
