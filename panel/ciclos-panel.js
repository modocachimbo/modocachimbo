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
  .ci-top { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
  .ci-top .btn-main, .ci-top .btn-ghost { display: inline-flex; align-items: center; gap: 8px; }
  .ci-top svg { width: 17px; height: 17px; }
  .ci-top .hint { flex-basis: 100%; }
  .ci-wz { max-width: 560px !important; }
  .ci-wz .fld { margin-top: 12px; }
  .ci-wz .ci-dos { display: grid; grid-template-columns: 1fr 120px; gap: 10px; }
  .ci-wz .ci-op { display: flex; gap: 10px; align-items: flex-start; margin-top: 12px; font-weight: 800; color: var(--text); cursor: pointer; line-height: 1.4; }
  .ci-wz .ci-op small { display: block; color: var(--text-dim); font-weight: 700; }
  .ci-wz .ci-op input { margin-top: 3px; width: 17px; height: 17px; accent-color: #C6E000; flex-shrink: 0; }
  .ci-pasos { margin-top: 14px; display: grid; gap: 6px; max-height: 260px; overflow: auto; }
  .ci-paso { display: flex; gap: 10px; align-items: center; font-weight: 800; font-size: 13.5px; color: var(--text-dim); }
  .ci-paso i { width: 18px; height: 18px; flex-shrink: 0; display: grid; place-items: center; }
  .ci-paso i svg { width: 18px; height: 18px; }
  .ci-paso.ok { color: var(--text); } .ci-paso.ok i { color: #58CC02; }
  .ci-paso.mal { color: #FF8A8A; } .ci-paso.va i { color: #C6E000; animation: ciGira 1s linear infinite; }
  @keyframes ciGira { to { transform: rotate(360deg); } }
  .ci-tabla { width: 100%; border-collapse: separate; border-spacing: 0 6px; margin-top: 10px; }
  .ci-tabla th { text-align: left; font: 900 11px 'Nunito', sans-serif; letter-spacing: .06em; text-transform: uppercase; color: var(--text-dim); padding: 0 10px; }
  .ci-tabla td { background: #18132B; padding: 10px; font-weight: 800; font-size: 13.5px; border-top: 2px solid #2C2549; border-bottom: 2px solid #2C2549; }
  .ci-tabla td:first-child { border-left: 2px solid #2C2549; border-radius: 12px 0 0 12px; }
  .ci-tabla td:last-child { border-right: 2px solid #2C2549; border-radius: 0 12px 12px 0; }
  .ci-tabla .area { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; }
  .ci-ok, .ci-no, .ci-med { display: inline-flex; align-items: center; gap: 6px; }
  .ci-ok { color: #58CC02; } .ci-no { color: #FF8A8A; } .ci-med { color: #FFC800; }
  .ci-ok svg, .ci-no svg, .ci-med svg { width: 16px; height: 16px; }
  .ci-falta-top { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 10px; }
  .ci-falta-res { margin-top: 10px; font-weight: 800; color: var(--text-dim); }
  .ci-falta-res b { color: #C6E000; }
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

const CI_ICO = {
  mas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  lista: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 6 1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2"/></svg>',
  ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  no: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  med: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 2"/></svg>',
  va: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 3a9 9 0 1 0 9 9"/></svg>',
  pend: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="7"/></svg>'
};

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
  body.innerHTML = `<div class="ci-top"><button class="btn-main" type="button" id="ciAbrir">${CI_ICO.mas} Abrir ciclo nuevo</button>
      <button class="btn-ghost" type="button" id="ciFalta">${CI_ICO.lista} Lo que falta del ciclo</button>
      <span class="hint">Abre un ciclo en todas las áreas de una vez, o mira qué le falta a cada curso.</span></div>
    <div class="ci-areas">${(REG.areas || []).map(a => `<button type="button" class="ci-ar ${a.id === CI.area ? 'on' : ''}" style="${ciVars(a.id)}" data-a="${esc(a.id)}"><i></i>${esc(a.nombre)}</button>`).join('')}</div>
    <div class="ci-nuevo" style="${ciVars(CI.area)}"><b>Agregar un ciclo nuevo</b>
      <input class="inp" id="ciNuevo" placeholder="Ej.: 2027-III" maxlength="8" autocomplete="off">
      <label class="ci-tn">Temas <input class="inp" id="ciNuevoTemas" type="number" min="1" max="60" value="10"></label>
      <button class="btn-main" type="button" id="ciCrear">Agregar a ${esc(area.nombre || '')}</button>
      <span class="hint">Se crea en ${esc(cursos.map(c => c.nombre).join(', ') || 'los cursos del área')}. Se ve como "Próximamente" hasta que subas el primer tema; si no quieres que se vea, apágalo. «Temas» es cuántos tendrá el ciclo: la barra del temario muestra «4 de 12 temas». Puedes cambiarlo después.</span></div>
    <div class="ci-lista" id="ciLista" style="${ciVars(CI.area)}"><div class="loader">Leyendo los ciclos de cada curso…</div></div>`;
  body.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => { CI.area = b.dataset.a; renderCiclos(); }));
  $('ciCrear').addEventListener('click', () => ciCrear(cursos));
  $('ciAbrir').addEventListener('click', ciAsistente);
  $('ciFalta').addEventListener('click', () => ciFalta());
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

/* ---------- «Abrir ciclo nuevo»: todo de una vez ----------
   1) crea el ciclo en Libros de todos los cursos visibles (crearAnio, en fila por el Apps Script)
   2) fija «Temas del ciclo» en todas las áreas (ajustes 'ciclos')
   3) opcional: Avance del ciclo pasa a este ciclo, semana 01 (avance_cfg_guardar, supabase/82)
   4) opcional: la preventa de Planes y precios usa este ciclo (ajustes 'planes'.preventa.ciclo)
   El ciclo anterior se sigue cobrando hasta que el nuevo tenga su primer tema (assets/acceso.js). */
function ciSiguiente() {
  // Ciclo que sigue al más nuevo que existe en algún curso: 2027-I → 2027-II → 2027-III → 2028-I
  let max = 0;
  Object.values(cacheManifest || {}).forEach(m => (m || []).forEach(x => { max = Math.max(max, ciOrden(x.id)); }));
  if (!max) return '';
  const a = Math.floor(max / 10), k = max % 10;
  return k >= 3 ? (a + 1) + '-I' : a + '-' + ['', 'I', 'II', 'III'][k + 1];
}

async function ciAsistente() {
  const cursos = (REG.cursos || []).filter(c => !c.oculto);
  await Promise.all(cursos.map(c => getManifest(c.id).catch(() => [])));
  let preventa = null;
  try { const q = await (await MCAuth.listo).from('ajustes').select('valor').eq('clave', 'planes').maybeSingle(); preventa = q.data && q.data.valor && q.data.valor.preventa || null; } catch (e) {}
  const o = document.createElement('div'); o.className = 'ov';
  o.innerHTML = `<div class="mcard ci-wz">
    <h3>Abrir ciclo nuevo</h3>
    <p class="sub" style="margin-top:6px;line-height:1.55;">Se crea en el Libro de los ${cursos.length} cursos de todas las áreas. Mientras no subas el primer tema se ve como «Próximamente» y el ciclo anterior se sigue cobrando. Tarda unos 2 minutos: no cierres el panel.</p>
    <div class="ci-dos"><div><label class="fld">Ciclo</label><input class="inp" id="wzCiclo" maxlength="8" placeholder="Ej.: 2027-II" value="${esc(ciSiguiente())}" autocomplete="off"></div>
      <div><label class="fld">Temas</label><input class="inp" id="wzTemas" type="number" min="1" max="30" value="10"></div></div>
    <label class="ci-op"><input type="checkbox" id="wzAvance" checked><span>Avance del ciclo sigue este ciclo<small>La tabla de semanas empieza en la semana 01, con tantas semanas como temas.</small></span></label>
    ${preventa ? `<label class="ci-op"><input type="checkbox" id="wzPreventa" ${preventa.activa ? 'checked' : ''}><span>La preventa es de este ciclo<small>En Planes y precios dice ahora: ${esc(preventa.ciclo || 'sin ciclo')}${preventa.activa ? '' : ' (apagada)'}.</small></span></label>` : ''}
    <div class="ci-pasos" id="wzPasos" hidden></div>
    <div class="mfoot"><button type="button" class="btn-ghost" data-x>Cancelar</button><button type="button" class="btn-main" data-ok>Abrir ciclo</button></div></div>`;
  document.body.appendChild(o);
  const q = x => o.querySelector(x), bOk = q('[data-ok]'), bX = q('[data-x]');
  let corriendo = false;
  bX.onclick = () => { if (!corriendo) o.remove(); };
  bOk.onclick = async () => {
    if (bOk.dataset.fin) { o.remove(); ciFalta(bOk.dataset.fin); return; }
    const ciclo = q('#wzCiclo').value.toUpperCase().replace(/\s+/g, '').replace(/^(\d{4})(I{1,3})$/, '$1-$2');
    const n = parseInt(q('#wzTemas').value, 10);
    if (!/^\d{4}-(I|II|III)$/.test(ciclo)) { toast('Escribe el ciclo como 2028-I, 2028-II o 2028-III', true); return; }
    if (!(n >= 1 && n <= 30)) { toast('Los temas van de 1 a 30', true); return; }
    corriendo = true; bOk.disabled = true; bX.disabled = true;
    o.querySelectorAll('input').forEach(i => i.disabled = true);
    const pasos = q('#wzPasos'); pasos.hidden = false;
    const fila = txt => { const d = document.createElement('div'); d.className = 'ci-paso va'; d.innerHTML = `<i>${CI_ICO.va}</i><span>${esc(txt)}</span>`; pasos.appendChild(d); pasos.scrollTop = pasos.scrollHeight; return d; };
    const fin = (d, ok, txt) => { d.className = 'ci-paso ' + (ok ? 'ok' : 'mal'); d.querySelector('i').innerHTML = ok ? CI_ICO.ok : CI_ICO.no; if (txt) d.querySelector('span').textContent = txt; };
    const fallos = [];
    // 1) crear en cada curso
    for (const c of cursos) {
      const d = fila('Creando ' + ciclo + ' en ' + c.nombre + '…');
      try {
        const man = await getManifest(c.id).catch(() => []);
        if (!man.some(m => m.id === ciclo)) await api('crearAnio', { carpeta: c.id, anio: ciclo });
        delete cacheManifest[c.id];
        fin(d, true, c.nombre + ': listo');
      } catch (e) { fallos.push(c.nombre); fin(d, false, c.nombre + ': ' + (e.message || 'no se pudo')); }
    }
    const cl = await MCAuth.listo;
    // 2) temas en todas las áreas (y que el ciclo no esté oculto)
    let d = fila('Guardando ' + n + ' temas en todas las áreas…');
    try {
      const qq = await cl.from('ajustes').select('valor').eq('clave', 'ciclos').maybeSingle();
      const v = (qq.data && qq.data.valor) || {}; v.areas = v.areas || {};
      (REG.areas || []).forEach(a => {
        const x = (v.areas[a.id] = v.areas[a.id] || {});
        x.temas = x.temas || {}; x.ocultos = (x.ocultos || []).filter(id => id !== ciclo);
        if (n === 10) delete x.temas[ciclo]; else x.temas[ciclo] = n;
      });
      const g = await cl.rpc('guardar_ajuste', { p_clave: 'ciclos', p_valor: v });
      if (g.error) throw new Error(g.error.message);
      CI.cfg = v; try { localStorage.setItem('mc_ciclos', JSON.stringify(v)); } catch (e) {}
      fin(d, true, 'Barra del Libro: ' + n + ' temas en todas las áreas');
    } catch (e) { fallos.push('temas'); fin(d, false, 'Temas: ' + e.message); }
    // 3) avance
    if (q('#wzAvance').checked) {
      d = fila('Avance del ciclo → ' + ciclo + '…');
      try {
        const r = await cl.rpc('avance_cfg_guardar', { p_ciclo: ciclo, p_semana: 1, p_semanas: n });
        if (r.error) throw new Error(/function|does not exist/i.test(r.error.message) ? 'falta supabase/82-avance-ciclo.sql' : r.error.message);
        fin(d, true, 'Avance del ciclo: ' + ciclo + ', semana 01 de ' + n);
      } catch (e) { fallos.push('avance'); fin(d, false, 'Avance: ' + e.message); }
    }
    // 4) preventa
    if (q('#wzPreventa') && q('#wzPreventa').checked) {
      d = fila('Preventa → ' + ciclo + '…');
      try {
        const qq = await cl.from('ajustes').select('valor').eq('clave', 'planes').maybeSingle();
        const v = qq.data && qq.data.valor;
        if (!v || !v.preventa) throw new Error('no hay preventa guardada');
        v.preventa.ciclo = ciclo;
        const g = await cl.rpc('guardar_ajuste', { p_clave: 'planes', p_valor: v });
        if (g.error) throw new Error(g.error.message);
        try { localStorage.removeItem('mc_planes'); } catch (e) {}
        fin(d, true, 'Preventa: ciclo ' + ciclo);
      } catch (e) { fallos.push('preventa'); fin(d, false, 'Preventa: ' + e.message); }
    }
    corriendo = false; bX.disabled = false; bX.textContent = 'Cerrar';
    bOk.disabled = false; bOk.textContent = 'Ver lo que falta'; bOk.dataset.fin = ciclo;
    toast(fallos.length ? 'Ciclo ' + ciclo + ' abierto con avisos: ' + fallos.join(', ') : 'Ciclo ' + ciclo + ' abierto · se verá en la web en 1 a 10 minutos', !!fallos.length);
    CI.cargado = false; if (typeof AV !== 'undefined' && AV.cfg) AV.cfg.ciclo = ciclo;
    renderCiclos();
  };
}

/* ---------- «Lo que falta del ciclo»: por curso, temas / Repaso / Fijas ---------- */
async function ciFalta(cicloPedido) {
  const cursos = (REG.cursos || []).filter(c => !c.oculto);
  const areas = REG.areas || [];
  const mans = await Promise.all(cursos.map(c => getManifest(c.id).catch(() => [])));
  const todos = [...new Set(mans.flat().map(m => m.id))].sort((a, b) => ciOrden(b) - ciOrden(a));
  if (!todos.length) { toast('Todavía no hay ciclos', true); return; }
  let ciclo = cicloPedido && todos.includes(cicloPedido) ? cicloPedido : todos[0];
  const o = document.createElement('div'); o.className = 'ov';
  o.innerHTML = `<div class="mcard" style="max-width:820px;width:100%;">
    <h3>Lo que falta del ciclo</h3>
    <div class="ci-falta-top"><select class="inp" id="cfCiclo" style="width:auto;">${todos.map(id => `<option ${id === ciclo ? 'selected' : ''}>${esc(id)}</option>`).join('')}</select>
      <span class="hint">Temas del Libro, y si Repaso y Fijas ya usan este ciclo.</span></div>
    <div class="ci-falta-res" id="cfRes"></div>
    <div style="max-height:min(60vh,520px);overflow:auto;"><table class="ci-tabla" id="cfTabla"></table></div>
    <div class="mfoot"><button type="button" class="btn-main" data-x>Cerrar</button></div></div>`;
  document.body.appendChild(o);
  o.querySelector('[data-x]').onclick = () => o.remove();
  const pintar = () => {
    const cfgCi = (CI.cfg && CI.cfg.areas) || {};
    let listos = 0;
    const orden = cursos.slice().sort((a, b) => areas.findIndex(x => x.id === a.area) - areas.findIndex(x => x.id === b.area) || (a.orden || 0) - (b.orden || 0));
    const filas = orden.map(c => {
      const m = (mans[cursos.indexOf(c)] || []).find(x => x.id === ciclo);
      const tot = +((cfgCi[c.area] || {}).temas || {})[ciclo] || 10;
      const t = m ? (m.temas || 0) : -1;
      const rep = c.repaso && c.repaso.anio === ciclo, fij = c.fijas && c.fijas.anio === ciclo;
      const temasHtml = t < 0 ? `<span class="ci-no">${CI_ICO.no} Sin crear</span>` : t >= tot ? `<span class="ci-ok">${CI_ICO.ok} ${t} de ${tot}</span>` : t > 0 ? `<span class="ci-med">${CI_ICO.med} ${t} de ${tot}</span>` : `<span class="ci-no">${CI_ICO.no} 0 de ${tot}</span>`;
      const si = ok => ok ? `<span class="ci-ok">${CI_ICO.ok} Sí</span>` : `<span class="ci-no">${CI_ICO.no} No</span>`;
      if (t >= tot && rep && fij) listos++;
      return `<tr><td><span class="area" style="background:${(CI_COLOR[c.area] || CI_COLOR['ciencia-tecnologia'])[0]}"></span>${esc(c.nombre)}</td><td>${temasHtml}</td><td>${si(rep)}</td><td>${si(fij)}</td></tr>`;
    }).join('');
    $('cfTabla').innerHTML = `<tr><th>Curso</th><th>Temas del Libro</th><th>Repaso</th><th>Fijas</th></tr>${filas}`;
    $('cfRes').innerHTML = `<b>${listos} de ${cursos.length}</b> cursos completos en ${esc(ciclo)}. Repaso: Ciclos → «Usar en Repaso». Fijas: Cursos → Armar Fijas.`;
  };
  o.querySelector('#cfCiclo').onchange = e => { ciclo = e.target.value; pintar(); };
  pintar();
}
