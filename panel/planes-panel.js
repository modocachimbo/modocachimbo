/* =========================================================
   Panel · Planes y precios (Web) — solo admin
   Edita la página precios.html: precios de cada plan, lo que incluye,
   la preventa, «Trae 2 amigos» y la tabla de comparación. También quién
   usa la tienda de descargas (planes.tienda.modo: vip | todos | apagado; se edita en Panel → Descargas PDF).
   Se guarda en Supabase (tabla ajustes, clave 'planes'). Si nunca se
   guardó, se parte del ejemplo de assets/planes.js.
   ========================================================= */
const PL = { v: null, cambios: false, cargado: false };

(function estilosPlanes() {
  const st = document.createElement('style');
  st.textContent = `
  .pl-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
  .pl-card h3 { font-size: 16px; margin: 0 0 10px; display: flex; align-items: center; gap: 8px; }
  .pl-card h3 i { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
  .pl-dos { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .pl-extra { padding: 10px 0; border-top: 1px solid var(--border, #2a2346); } .pl-extra:first-of-type { border-top: 0; }
  .pl-cuatro { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
  .pl-card .fld { margin-top: 10px; }
  .pl-card textarea.inp { width: 100%; resize: vertical; font-family: inherit; line-height: 1.45; font-size: 13px; }
  .pl-sec { margin-top: 16px; }
  .pl-sw { display: flex; align-items: center; gap: 10px; font-weight: 700; cursor: pointer; }
  .pl-sw input { width: 18px; height: 18px; accent-color: var(--accent); }
  .pl-fila { display: grid; grid-template-columns: minmax(0, 2.2fr) minmax(0, 1fr) minmax(0, 1fr) 34px; gap: 8px; margin-top: 8px; }
  .pl-fila.cab { font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: var(--text-faint); font-weight: 700; }
  .pl-op { font-weight: 600; font-size: 13.5px; margin-top: 6px; }
  .pl-ciclos { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 0 28px; }
  .pl-chip { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--border); border-radius: 99px; padding: 5px 11px; font-weight: 700; font-size: 13px; cursor: pointer; }
  .pl-chip input { accent-color: var(--accent); }
  .pl-chip.off { opacity: .45; cursor: default; }
  .pl-x { width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--border); background: none; color: var(--text-dim); cursor: pointer; display: grid; place-items: center; }
  .pl-x svg { width: 14px; height: 14px; }
  .pl-x:hover { color: #ff9a9a; border-color: #5a2a2a; }
  @media (max-width: 1000px) { .pl-grid { grid-template-columns: 1fr; } .pl-cuatro { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 600px) { .pl-fila { grid-template-columns: 1fr 1fr 34px; } .pl-fila > :first-child { grid-column: 1 / -1; } .pl-fila.cab { display: none; } }`;
  document.head.appendChild(st);
})();

const PL_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const PL_COLOR = { gratis: '#A99FC8', area: '#1CB0F6', total: '#C6E000' };

function plEstado(t) { $('plEstado').textContent = t || ''; }
function plCambio() { PL.cambios = true; $('plGuardar').disabled = false; plEstado('Cambios sin guardar'); }

async function cargarPlanes(forzar) {
  if (PL.cargado && !forzar) return;
  const body = $('plBody');
  body.innerHTML = '<div class="loader">Cargando…</div>';
  $('plGuardar').disabled = true;
  let cliente;
  try { cliente = await MCAuth.listo; }
  catch (e) { body.innerHTML = '<div class="state-msg error">No se pudo conectar con Supabase. Revisa tu internet.</div>'; return; }
  if (!MCAuth.usuario()) {
    body.innerHTML = `<div class="state-msg al-login">Para editar los planes entra con tu cuenta de Google de administrador.
      <button class="btn-main" type="button" id="plEntrar">Entrar con Google</button></div>`;
    $('plEntrar').addEventListener('click', () => MCAuth.entrarGoogle());
    return;
  }
  const r = await cliente.from('ajustes').select('valor').eq('clave', 'planes').maybeSingle();
  if (r.error) { body.innerHTML = '<div class="state-msg error">No se pudieron leer los planes. Intenta de nuevo.</div>'; return; }
  const guardado = r.data && r.data.valor;
  PL.v = MCPlanes.mezclar(guardado);
  PL.cargado = true; PL.cambios = false;
  plEstado(guardado ? '' : 'Mostrando el ejemplo (aún no guardado). Cámbialo y toca Guardar.');
  renderPlanes();
}

// Sí / No / texto  ⇄  true / false / texto
function plCelda(v) { return v === true ? 'Sí' : v === false ? 'No' : String(v == null ? '' : v); }
function plValor(t) { if (typeof t === 'boolean') return t; t = String(t || '').trim(); return /^s[ií]$/i.test(t) ? true : /^no$/i.test(t) ? false : t; }
function plLineas(t) { return String(t || '').split('\n').map(x => x.trim()).filter(Boolean).slice(0, 12); }

// Ciclos que existen en Libros, Seminarios y Banqueo de todos los cursos (de sus manifest.json)
const PL_CURSOS = ['algebra', 'aritmetica', 'estadistica', 'geometria', 'trigonometria', 'anatomia', 'biologia', 'fisica', 'quimica', 'lenguaje', 'literatura', 'raz-verbal', 'ciudadania', 'economia', 'filosofia', 'geografia', 'historia-peru', 'historia-universal', 'psicologia'];
let plCiclos = null;
function plOrden(id) { const x = String(id).match(/^(\d{4})-(III|II|I)$/); return x ? +x[1] * 10 + { I: 1, II: 2, III: 3 }[x[2]] : 0; }
async function plCargarCiclos() {
  if (plCiclos) return plCiclos;
  const ids = new Set();
  await Promise.all(PL_CURSOS.flatMap(c => ['libros', 'seminarios', 'banqueo'].map(t =>
    fetch(`../${c}/${t}/data/manifest.json`, { cache: 'no-cache' }).then(r => r.ok ? r.json() : []).then(m => (m || []).forEach(x => x && x.id && ids.add(x.id))).catch(() => {}))));
  plCiclos = [...ids].filter(plOrden).sort((a, b) => plOrden(b) - plOrden(a));
  return plCiclos;
}
function plChips(marcados, apagado) {
  const todos = [...new Set([...(plCiclos || []), ...(marcados || [])])].sort((a, b) => plOrden(b) - plOrden(a));
  if (!todos.length) return '<span class="hint">Buscando ciclos…</span>';
  return todos.map(id => `<label class="pl-chip${apagado ? ' off' : ''}"><input type="checkbox" value="${esc(id)}" ${(marcados || []).includes(id) ? 'checked' : ''} ${apagado ? 'disabled' : ''}> ${esc(id)}</label>`).join('');
}

function renderPlanes(errores) {
  const v = PL.v, P = v.preventa, A = v.amigos, C = v.comparar;
  const body = $('plBody');
  body.innerHTML = `
    ${errores && errores.length ? `<div class="perr pf-errs">${errores.map(esc).join('<br>')}</div>` : ''}
    <div class="pl-grid">${v.planes.map((p, i) => `
      <div class="pcard pl-card">
        <h3><i style="background:${PL_COLOR[p.id] || '#888'}"></i>${p.id === 'gratis' ? 'Plan gratis' : p.id === 'area' ? 'Plan de un área' : 'Plan completo'}</h3>
        <label class="fld">Nombre</label><input class="inp" maxlength="30" data-p="${i}" data-k="nombre" value="${esc(p.nombre)}">
        <label class="fld">Frase corta</label><input class="inp" maxlength="90" data-p="${i}" data-k="sub" value="${esc(p.sub)}">
        ${p.id === 'gratis' ? '' : `<div class="pl-dos">
          <div><label class="fld">Mensual (S/)</label><input class="inp" type="number" min="0" step="0.10" data-p="${i}" data-k="mes" value="${p.mes}"></div>
          <div><label class="fld">3 meses (S/)</label><input class="inp" type="number" min="0" step="0.10" data-p="${i}" data-k="ciclo" value="${p.ciclo}"></div>
        </div>`}
        <label class="fld">Incluye <span class="hint">una cosa por línea</span></label>
        <textarea class="inp" rows="5" data-p="${i}" data-k="si">${esc((p.si || []).join('\n'))}</textarea>
        <label class="fld">No incluye <span class="hint">sale tachado</span></label>
        <textarea class="inp" rows="3" data-p="${i}" data-k="no">${esc((p.no || []).join('\n'))}</textarea>
      </div>`).join('')}
    </div>

    <div class="pcard pl-card pl-sec">
      <h3>Ciclos: qué se cobra y qué se descarga</h3>
      <p class="hint" style="margin:0 0 4px">Para Libros, Seminarios y Banqueo. Lo que no se cobra se practica gratis. Repaso, Fijas y Simulacro siempre piden código.</p>
      <div class="pl-dos" style="gap:18px">
        <div>
          <label class="fld">Se cobran (piden código)</label>
          <label class="pl-sw pl-op"><input type="radio" name="plCobMod" value="auto" ${v.ciclos.modo !== 'lista' ? 'checked' : ''}> Automático: solo el ciclo más nuevo de cada curso</label>
          <label class="pl-sw pl-op"><input type="radio" name="plCobMod" value="lista" ${v.ciclos.modo === 'lista' ? 'checked' : ''}> Solo los que marco:</label>
          <div class="pl-ciclos" id="plCob">${plChips(v.ciclos.cobrados, v.ciclos.modo !== 'lista')}</div>
        </div>
        <div>
          <label class="fld">Se descargan en PDF</label>
          <label class="pl-sw pl-op"><input type="radio" name="plDesMod" value="auto" ${v.ciclos.descarga.modo !== 'lista' ? 'checked' : ''}> Automático: los mismos que se cobran</label>
          <label class="pl-sw pl-op"><input type="radio" name="plDesMod" value="lista" ${v.ciclos.descarga.modo === 'lista' ? 'checked' : ''}> Solo los que marco:</label>
          <div class="pl-ciclos" id="plDes">${plChips(v.ciclos.descarga.lista, v.ciclos.descarga.modo !== 'lista')}</div>
        </div>
      </div>
      <p class="hint" style="margin:10px 0 0">Los exámenes pasados no cambian con esto.</p>
    </div>

    <div class="pcard pl-card pl-sec">
      <label class="pl-sw"><input type="checkbox" data-g="preventa" data-k="activa" ${P.activa ? 'checked' : ''}> Preventa: descuento en Amatista y Leyenda (mensual o 3 meses)</label>
      <div class="pl-cuatro">
        <div><label class="fld">Descuento (%) <span class="hint">se redondea a .90</span></label><input class="inp" type="number" min="1" max="90" step="1" data-g="preventa" data-k="pct" value="${P.pct == null ? 20 : P.pct}"></div>
        <div><label class="fld">Ciclo</label><input class="inp" maxlength="12" data-g="preventa" data-k="ciclo" value="${esc(P.ciclo)}"></div>
        <div><label class="fld">Hasta <span class="hint">ej. 30/11</span></label><input class="inp" maxlength="20" data-g="preventa" data-k="hasta" value="${esc(P.hasta)}"></div>
        <div><label class="fld">Primeros <span class="hint">alumnos · 0 = sin tope</span></label><input class="inp" type="number" min="0" data-g="preventa" data-k="cupos" value="${+P.cupos || 0}"></div>
      </div>
    </div>

    <div class="pcard pl-card pl-sec">
      <h3>Extras que se compran aparte <span class="hint">Tienda → Accesos, solo en la web</span></h3>
      ${(v.extras || []).map((x, i) => `<div class="pl-extra">
        <label class="pl-sw"><input type="checkbox" data-x="${i}" data-k="activa" ${x.activa !== false ? 'checked' : ''}> A la venta</label>
        <div><label class="fld">Nombre</label><input class="inp" maxlength="30" data-x="${i}" data-k="nombre" value="${esc(x.nombre)}"></div>
        <label class="fld">Paquetes de 30 días <span class="hint">PDF al día · precio · etiqueta (opcional)</span></label>
        ${(x.paquetes || []).map((q, j) => `<div class="pl-cuatro">
          <div><input class="inp" type="number" min="1" max="500" step="1" data-pq="${i}:${j}" data-k="n" value="${q.n}" aria-label="PDF al día"></div>
          <div><input class="inp" type="number" min="0" step="0.10" data-pq="${i}:${j}" data-k="precio" value="${q.precio}" aria-label="Precio S/"></div>
          <div style="grid-column:span 2"><input class="inp" maxlength="24" data-pq="${i}:${j}" data-k="tag" value="${esc(q.tag || '')}" placeholder="Ej.: El más elegido"></div>
        </div>`).join('')}
        <label class="fld">Frase corta</label><input class="inp" maxlength="90" data-x="${i}" data-k="sub" value="${esc(x.sub)}">
      </div>`).join('')}
    </div>

    <div class="pcard pl-card pl-sec">
      <label class="pl-sw"><input type="checkbox" data-g="descuento" data-k="activa" ${v.descuento && v.descuento.activa ? 'checked' : ''}> Descuento para todos los accesos <span class="hint">menos la preventa</span></label>
      <div class="pl-dos">
        <div><label class="fld">Descuento (%)</label><input class="inp" type="number" min="1" max="90" step="1" data-g="descuento" data-k="pct" value="${(v.descuento && v.descuento.pct) || 10}"></div>
        <div><label class="fld">Texto de la oferta</label><input class="inp" maxlength="50" data-g="descuento" data-k="texto" value="${esc((v.descuento && v.descuento.texto) || '')}"></div>
      </div>
    </div>

    <div class="pcard pl-card pl-sec">
      <label class="pl-sw"><input type="checkbox" data-g="amigos" data-k="activa" ${A.activa ? 'checked' : ''}> Mostrar «Trae amigos»</label>
      <label class="fld">Título</label><input class="inp" maxlength="60" data-g="amigos" data-k="titulo" value="${esc(A.titulo)}">
      <label class="fld">Texto</label><input class="inp" maxlength="160" data-g="amigos" data-k="texto" value="${esc(A.texto)}">
    </div>

    <div class="pcard pl-card pl-sec">
      <label class="pl-sw"><input type="checkbox" data-g="comparar" data-k="activa" ${C.activa ? 'checked' : ''}> Mostrar la tabla de comparación</label>
      <div class="pl-dos">
        <div><label class="fld">Título</label><input class="inp" maxlength="70" data-g="comparar" data-k="titulo" value="${esc(C.titulo)}"></div>
        <div><label class="fld">Nombre de la otra columna</label><input class="inp" maxlength="30" data-g="comparar" data-k="otro" value="${esc(C.otro)}"></div>
      </div>
      <label class="fld">Frase debajo del título</label><input class="inp" maxlength="140" data-g="comparar" data-k="sub" value="${esc(C.sub)}">
      <label class="fld" style="margin-top:14px">Filas <span class="hint">escribe Sí, No o un texto corto</span></label>
      <div class="pl-fila cab"><span>Qué se compara</span><span>Modo Cachimbo</span><span>${esc(C.otro)}</span><span></span></div>
      ${(C.tabla || []).map((f, i) => `<div class="pl-fila">
        <input class="inp" maxlength="70" data-f="${i}" data-c="0" value="${esc(f[0])}">
        <input class="inp" maxlength="30" data-f="${i}" data-c="1" value="${esc(plCelda(f[1]))}">
        <input class="inp" maxlength="30" data-f="${i}" data-c="2" value="${esc(plCelda(f[2]))}">
        <button class="pl-x" type="button" data-quitar="${i}" title="Quitar fila" aria-label="Quitar fila">${PL_X}</button></div>`).join('')}
      <button class="btn-ghost" type="button" id="plFila" style="margin-top:10px">+ Agregar fila</button>
      <label class="fld" style="margin-top:14px">Nota pequeña al pie</label>
      <textarea class="inp" rows="2" maxlength="260" data-g="comparar" data-k="nota">${esc(C.nota)}</textarea>
    </div>`;

  body.querySelectorAll('[data-p]').forEach(el => el.addEventListener('input', () => {
    const p = v.planes[+el.dataset.p], k = el.dataset.k;
    p[k] = (k === 'si' || k === 'no') ? el.value.split('\n') : (k === 'mes' || k === 'ciclo') ? el.value : el.value;
    plCambio();
  }));
  body.querySelectorAll('[data-x]').forEach(el => el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => {
    v.extras[+el.dataset.x][el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value;
    plCambio();
  }));
  body.querySelectorAll('[data-pq]').forEach(el => el.addEventListener('input', () => {
    const [i, j] = el.dataset.pq.split(':').map(Number);
    v.extras[i].paquetes[j][el.dataset.k] = el.value;
    plCambio();
  }));
  body.querySelectorAll('[data-g]').forEach(el => el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => {
    v[el.dataset.g][el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value;
    plCambio();
  }));
  body.querySelectorAll('[data-f]').forEach(el => el.addEventListener('input', () => {
    C.tabla[+el.dataset.f][+el.dataset.c] = el.value; plCambio();
  }));
  body.querySelectorAll('[data-quitar]').forEach(b => b.addEventListener('click', () => {
    C.tabla.splice(+b.dataset.quitar, 1); plCambio(); renderPlanes();
  }));
  const C2 = v.ciclos;
  body.querySelectorAll('input[name="plCobMod"]').forEach(r => r.addEventListener('change', () => { C2.modo = r.value; if (r.value === 'lista' && !C2.cobrados.length && plCiclos && plCiclos[0]) C2.cobrados = [plCiclos[0]]; plCambio(); renderPlanes(); }));
  body.querySelectorAll('input[name="plDesMod"]').forEach(r => r.addEventListener('change', () => { C2.descarga.modo = r.value; if (r.value === 'lista' && !C2.descarga.lista.length) C2.descarga.lista = C2.cobrados.slice(); plCambio(); renderPlanes(); }));
  body.querySelectorAll('#plCob input').forEach(x => x.addEventListener('change', () => { C2.cobrados = [...body.querySelectorAll('#plCob input:checked')].map(i => i.value); plCambio(); }));
  body.querySelectorAll('#plDes input').forEach(x => x.addEventListener('change', () => { C2.descarga.lista = [...body.querySelectorAll('#plDes input:checked')].map(i => i.value); plCambio(); }));
  if (!plCiclos) plCargarCiclos().then(() => { { $('plCob').innerHTML = plChips(C2.cobrados, C2.modo !== 'lista'); $('plDes').innerHTML = plChips(C2.descarga.lista, C2.descarga.modo !== 'lista'); renderPlanesCiclosEventos(); } });
  $('plFila').addEventListener('click', () => {
    C.tabla.push(['', 'Sí', 'No']); plCambio(); renderPlanes();
    const t = body.querySelector(`[data-f="${C.tabla.length - 1}"][data-c="0"]`); if (t) t.focus();
  });
}

function renderPlanesCiclosEventos() {
  const body = $('plBody'), C2 = PL.v.ciclos;
  body.querySelectorAll('#plCob input').forEach(x => x.addEventListener('change', () => { C2.cobrados = [...body.querySelectorAll('#plCob input:checked')].map(i => i.value); plCambio(); }));
  body.querySelectorAll('#plDes input').forEach(x => x.addEventListener('change', () => { C2.descarga.lista = [...body.querySelectorAll('#plDes input:checked')].map(i => i.value); plCambio(); }));
}

async function guardarPlanes() {
  if (!PL.v) return;
  const v = PL.v, err = [];
  const num = x => Math.round((parseFloat(String(x).replace(',', '.')) || 0) * 100) / 100;
  v.planes.forEach(p => {
    p.nombre = String(p.nombre || '').trim(); p.sub = String(p.sub || '').trim();
    p.mes = p.id === 'gratis' ? 0 : num(p.mes); p.ciclo = p.id === 'gratis' ? 0 : num(p.ciclo);
    p.si = plLineas(Array.isArray(p.si) ? p.si.join('\n') : p.si); p.no = plLineas(Array.isArray(p.no) ? p.no.join('\n') : p.no);
    if (!p.nombre) err.push('Falta el nombre de un plan.');
    if (p.id !== 'gratis' && (!p.mes || !p.ciclo)) err.push(`${p.nombre || 'Un plan'}: pon el precio mensual y el del ciclo.`);
  });
  (v.extras || []).forEach(x => {
    x.nombre = String(x.nombre || '').trim(); x.sub = String(x.sub || '').trim(); x.activa = x.activa !== false;
    delete x.mes; delete x.ciclo;
    x.paquetes = (x.paquetes || []).map(q => ({ n: parseInt(q.n, 10) || 0, precio: num(q.precio), tag: String(q.tag || '').trim() }));
    if (x.activa && x.paquetes.some(q => q.n < 1 || q.n > 500 || !q.precio)) err.push(`${x.nombre || 'Descargas PDF'}: cada paquete necesita PDF al día (1 a 500) y precio.`);
  });
  v.descuento.pct = Math.max(1, Math.min(90, parseInt(v.descuento.pct, 10) || 10)); v.descuento.texto = String(v.descuento.texto || '').trim();
  v.preventa.pct = parseInt(v.preventa.pct, 10) || 0; delete v.preventa.precio; v.preventa.cupos = Math.max(0, parseInt(v.preventa.cupos, 10) || 0);
  if (v.preventa.activa && (v.preventa.pct < 1 || v.preventa.pct > 90)) err.push('Preventa: pon el descuento (1 a 90 %).');
  if (v.ciclos.modo === 'lista' && !v.ciclos.cobrados.length) err.push('Ciclos: marca al menos un ciclo que se cobra, o elige Automático.');
  v.comparar.tabla = (v.comparar.tabla || []).filter(f => String(f[0] || '').trim()).map(f => [String(f[0]).trim(), plValor(f[1]), plValor(f[2])]).slice(0, 20);
  if (err.length) { renderPlanes(err); window.scrollTo(0, 0); toast('Revisa lo marcado en rojo', true); return; }
  const btn = $('plGuardar'); btn.disabled = true; plEstado('Guardando…');
  // La tienda de Descargas se maneja en Panel → Descargas PDF: se guarda la que está ahora en Supabase
  try { const g = await (await MCAuth.listo).from('ajustes').select('valor').eq('clave', 'planes').maybeSingle(); if (g.data && g.data.valor && g.data.valor.tienda) v.tienda = g.data.valor.tienda; } catch (e) { /* nada */ }
  const r = await (await MCAuth.listo).rpc('guardar_ajuste', { p_clave: 'planes', p_valor: v });
  if (r.error) {
    btn.disabled = false; plEstado('');
    toast(/no autorizado/i.test(r.error.message || '') ? 'Tu correo no es administrador' : (r.error.message || 'No se pudo guardar'), true);
    return;
  }
  try { localStorage.removeItem('mc_planes'); } catch (e) { /* nada */ }
  PL.cambios = false;
  plEstado('Publicado. Ábrelo con «Ver la página».');
  renderPlanes();
  toast('Planes guardados');
}

$('plGuardar').addEventListener('click', guardarPlanes);
window.addEventListener('beforeunload', e => { if (PL.cambios) { e.preventDefault(); e.returnValue = ''; } });
if (window.MCAuth) MCAuth.alCambiar(() => { if (!$('tab-planes').hidden) cargarPlanes(true); else PL.cargado = false; });
