/* =========================================================
   Panel · Perfil del alumno
   Bloques, carreras, puntos por curso y preguntas extra que ve
   cada alumno en "Mi perfil". Se guarda en Supabase
   (supabase/05-perfil-config.sql, tabla ajustes, clave 'perfil').
   Si nunca se guardó, se parte de la lista de assets/carreras.js.
   ========================================================= */
const PF = { datos: null, cambios: false, cargado: false };
const PF_CURSOS = [['com', 'Comunicación'], ['mat', 'Matemática'], ['cta', 'Ciencia y Tec.'], ['ccss', 'C. Sociales']];
const PF_TIPOS = [['texto', 'Texto'], ['opciones', 'Lista de opciones'], ['numero', 'Número'], ['sino', 'Sí / No']];

(function estilosPerfil() {
  const st = document.createElement('style');
  st.textContent = `
  .pf-sec { margin: 6px 0 26px; }
  .pf-sec > h2 { font-family: 'Sora', sans-serif; font-size: 17px; margin: 0 0 4px; }
  .pf-sec > .hint { margin-bottom: 14px; }
  .pf-fila { display: grid; grid-template-columns: 80px 1fr; gap: 10px; }
  .pf-puntos { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 10px; }
  .pf-card label, .pf-pt label { display: flex; flex-direction: column; gap: 6px; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: var(--text-faint); font-weight: 700; }
  .pf-card textarea.inp { min-height: 120px; resize: vertical; font-family: inherit; line-height: 1.5; }
  .pf-card .pf-pie { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
  .pf-card .pf-pie .hint { margin-right: auto; }
  .pf-card .pf-ck { flex-direction: row; align-items: center; gap: 8px; text-transform: none; letter-spacing: 0; font-size: 13.5px; color: var(--text-dim); font-weight: 500; cursor: pointer; }
  .pf-card .pf-ck input { width: 16px; height: 16px; accent-color: var(--accent); }
  .pf-q { display: grid; grid-template-columns: 1fr 190px; gap: 10px; }
  .pf-ops { margin-top: 10px; }
  .pf-ops[hidden] { display: none; }
  .pf-errs { margin-bottom: 14px; }
  @media (max-width: 600px) { .pf-puntos { grid-template-columns: 1fr 1fr; } .pf-q { grid-template-columns: 1fr; } }`;
  document.head.appendChild(st);
})();

function pfCopia(v) { return JSON.parse(JSON.stringify(v)); }
function pfLineas(t) {
  const vistos = {};
  return String(t || '').split('\n').map(x => x.trim()).filter(x => x && !vistos[x.toLowerCase()] && (vistos[x.toLowerCase()] = true));
}

function pfEstado(txt) { $('pfEstado').textContent = txt || ''; }
function pfCambio() { PF.cambios = true; $('pfGuardar').disabled = false; pfEstado('Cambios sin guardar'); }

async function cargarPerfilCfg(forzar) {
  if (PF.cargado && !forzar) return;
  const body = $('pfBody');
  body.innerHTML = '<div class="loader">Cargando…</div>';
  $('pfGuardar').disabled = true;
  let cliente;
  try { cliente = await MCAuth.listo; }
  catch (e) { body.innerHTML = '<div class="state-msg error">No se pudo conectar con Supabase. Revisa tu internet.</div>'; return; }
  const u = MCAuth.usuario();
  if (!u) {
    body.innerHTML = `<div class="state-msg al-login">Para editar el perfil del alumno entra con tu cuenta de Google de administrador.
      <button class="btn-main" type="button" id="pfEntrar">Entrar con Google</button></div>`;
    $('pfEntrar').addEventListener('click', () => MCAuth.entrarGoogle());
    return;
  }
  const r = await cliente.from('ajustes').select('valor').eq('clave', 'perfil').maybeSingle();
  if (r.error) {
    body.innerHTML = `<div class="state-msg error">Falta preparar Supabase para esta sección.<br>Corre el archivo <b>supabase/05-perfil-config.sql</b> en Supabase → SQL Editor.</div>`;
    return;
  }
  const v = r.data && r.data.valor;
  const base = v && Array.isArray(v.bloques) && v.bloques.length ? v : { bloques: MCCarreras.bloques, extras: MCCarreras.extras };
  PF.datos = { bloques: pfCopia(base.bloques), extras: pfCopia(base.extras || []) };
  PF.datos.bloques.forEach(b => { b.puntos = b.puntos || {}; b.carreras = b.carreras || []; });
  PF.cargado = true; PF.cambios = false;
  pfEstado(r.data ? '' : 'Mostrando la lista inicial (aún no guardada)');
  renderPerfilCfg();
}

function renderPerfilCfg(errores) {
  const D = PF.datos, body = $('pfBody');
  body.innerHTML = `
    ${errores && errores.length ? `<div class="perr pf-errs">${errores.map(esc).join('<br>')}</div>` : ''}
    <section class="pf-sec">
      <h2>Bloques y carreras</h2>
      <p class="hint">El alumno elige su bloque y luego su carrera. Los puntos son los que vale cada pregunta correcta en ese bloque (los usará el simulacro). Escribe una carrera por línea. Si quitas una carrera, quien ya la eligió la conserva.</p>
      <div id="pfBloques">${D.bloques.map((b, i) => `
        <div class="pcard pf-card" data-b="${i}">
          <div class="pf-fila">
            <label>Letra<input class="inp" data-k="id" maxlength="3" value="${esc(b.id)}"></label>
            <label>Nombre del bloque<input class="inp" data-k="nombre" maxlength="60" value="${esc(b.nombre)}"></label>
          </div>
          <div class="pf-puntos">${PF_CURSOS.map(c => `
            <label>${c[1]}<input class="inp" data-p="${c[0]}" type="number" min="0" max="20" step="0.5" value="${esc(b.puntos[c[0]] == null ? '' : b.puntos[c[0]])}"></label>`).join('')}
          </div>
          <label style="margin-top:10px;">Carreras<textarea class="inp" data-k="carreras" rows="6">${esc(b.carreras.join('\n'))}</textarea></label>
          <div class="pf-pie">
            <span class="hint">${b.carreras.length} carrera${b.carreras.length === 1 ? '' : 's'}</span>
            <button class="rbtn danger" type="button" data-quitar-b="${i}">Quitar bloque</button>
          </div>
        </div>`).join('')}
      </div>
      <button class="btn-ghost" type="button" id="pfAddB">＋ Agregar bloque</button>
    </section>

    <section class="pf-sec">
      <h2>Preguntas extra</h2>
      <p class="hint">Aparecen en "Mis datos" debajo del celular. Las respuestas salen como columnas en Alumnos.</p>
      <div id="pfExtras">${D.extras.length ? D.extras.map((x, i) => `
        <div class="pcard pf-card" data-x="${i}">
          <div class="pf-q">
            <label>Pregunta<input class="inp" data-k="etiqueta" maxlength="80" placeholder="Ej.: ¿De qué colegio eres?" value="${esc(x.etiqueta)}"></label>
            <label>Tipo de respuesta<select class="inp" data-k="tipo">${PF_TIPOS.map(t => `<option value="${t[0]}"${x.tipo === t[0] ? ' selected' : ''}>${t[1]}</option>`).join('')}</select></label>
          </div>
          <label class="pf-ops" ${x.tipo === 'opciones' ? '' : 'hidden'}>Opciones (una por línea)<textarea class="inp" data-k="opciones" rows="4">${esc((x.opciones || []).join('\n'))}</textarea></label>
          <div class="pf-pie">
            <label class="pf-ck"><input type="checkbox" data-k="obligatoria"${x.obligatoria ? ' checked' : ''}> Obligatoria</label>
            <span class="hint"></span>
            <button class="rbtn danger" type="button" data-quitar-x="${i}">Quitar pregunta</button>
          </div>
        </div>`).join('') : '<div class="state-msg" style="margin-bottom:12px;">Aún no hay preguntas extra.</div>'}
      </div>
      <button class="btn-ghost" type="button" id="pfAddX"${D.extras.length >= 15 ? ' disabled' : ''}>＋ Agregar pregunta</button>
    </section>`;

  body.querySelectorAll('[data-b]').forEach(card => {
    const b = D.bloques[+card.dataset.b];
    card.querySelectorAll('[data-k]').forEach(el => el.addEventListener('input', () => {
      if (el.dataset.k === 'carreras') {
        b.carreras = pfLineas(el.value);
        card.querySelector('.pf-pie .hint').textContent = `${b.carreras.length} carrera${b.carreras.length === 1 ? '' : 's'}`;
      } else b[el.dataset.k] = el.dataset.k === 'id' ? el.value.trim().toUpperCase() : el.value;
      pfCambio();
    }));
    card.querySelectorAll('[data-p]').forEach(el => el.addEventListener('input', () => {
      if (el.value === '') delete b.puntos[el.dataset.p]; else b.puntos[el.dataset.p] = Number(el.value);
      pfCambio();
    }));
  });
  body.querySelectorAll('[data-x]').forEach(card => {
    const x = D.extras[+card.dataset.x];
    card.querySelectorAll('[data-k]').forEach(el => el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input', () => {
      const k = el.dataset.k;
      if (k === 'obligatoria') x.obligatoria = el.checked;
      else if (k === 'opciones') x.opciones = pfLineas(el.value);
      else x[k] = el.value;
      if (k === 'tipo') card.querySelector('.pf-ops').hidden = x.tipo !== 'opciones';
      pfCambio();
    }));
  });
  // Quitar: hay que tocar dos veces
  body.querySelectorAll('[data-quitar-b],[data-quitar-x]').forEach(btn => btn.addEventListener('click', () => {
    if (!btn.classList.contains('confirm')) {
      const txt = btn.textContent;
      btn.classList.add('confirm'); btn.textContent = '¿Seguro? Toca otra vez';
      setTimeout(() => { if (btn.isConnected) { btn.classList.remove('confirm'); btn.textContent = txt; } }, 4000);
      return;
    }
    if (btn.dataset.quitarB != null) D.bloques.splice(+btn.dataset.quitarB, 1);
    else D.extras.splice(+btn.dataset.quitarX, 1);
    pfCambio(); renderPerfilCfg();
  }));
  $('pfAddB').addEventListener('click', () => {
    const usadas = D.bloques.map(b => b.id);
    let id = 'A'; while (usadas.includes(id) && id < 'Z') id = String.fromCharCode(id.charCodeAt(0) + 1);
    D.bloques.push({ id, nombre: '', puntos: { com: 1, mat: 1, cta: 1, ccss: 1 }, carreras: [] });
    pfCambio(); renderPerfilCfg();
    const c = document.querySelector(`[data-b="${D.bloques.length - 1}"] [data-k="nombre"]`); if (c) c.focus();
  });
  $('pfAddX').addEventListener('click', () => {
    D.extras.push({ id: 'x' + Date.now().toString(36), etiqueta: '', tipo: 'texto', opciones: [], obligatoria: false });
    pfCambio(); renderPerfilCfg();
    const c = document.querySelector(`[data-x="${D.extras.length - 1}"] [data-k="etiqueta"]`); if (c) c.focus();
  });
}

function pfValidar(D) {
  const err = [], ids = {}, carreras = {};
  if (!D.bloques.length) err.push('Debe haber al menos un bloque.');
  D.bloques.forEach((b, i) => {
    const n = `Bloque ${b.id || i + 1}`;
    if (!/^[A-Z0-9]{1,3}$/.test(b.id || '')) err.push(`${n}: la letra debe ser de 1 a 3 letras o números.`);
    else if (ids[b.id]) err.push(`La letra ${b.id} está repetida.`);
    ids[b.id] = true;
    if (!String(b.nombre || '').trim()) err.push(`${n}: falta el nombre.`);
    if (!b.carreras.length) err.push(`${n}: agrega al menos una carrera.`);
    PF_CURSOS.forEach(c => { const v = b.puntos[c[0]]; if (v == null || !(v >= 0 && v <= 20)) err.push(`${n}: puntos de ${c[1]} entre 0 y 20.`); });
    b.carreras.forEach(c => {
      const k = MCCarreras.norm ? MCCarreras.norm(c) : c.toLowerCase();
      if (carreras[k] && carreras[k] !== b.id) err.push(`"${c}" está en el bloque ${carreras[k]} y en el ${b.id}.`);
      carreras[k] = b.id;
    });
  });
  D.extras.forEach((x, i) => {
    const n = `Pregunta ${i + 1}`;
    if (!String(x.etiqueta || '').trim()) err.push(`${n}: escribe la pregunta.`);
    if (x.tipo === 'opciones' && (x.opciones || []).length < 2) err.push(`${n}: pon al menos 2 opciones.`);
  });
  return err;
}

async function guardarPerfilCfg() {
  const D = PF.datos; if (!D) return;
  const errores = pfValidar(D);
  if (errores.length) { renderPerfilCfg(errores); window.scrollTo(0, 0); toast('Revisa lo marcado en rojo', true); return; }
  const valor = {
    bloques: D.bloques.map(b => ({ id: b.id, nombre: b.nombre.trim(), puntos: { com: b.puntos.com, mat: b.puntos.mat, cta: b.puntos.cta, ccss: b.puntos.ccss }, carreras: b.carreras })),
    extras: D.extras.map(x => ({ id: x.id, etiqueta: x.etiqueta.trim(), tipo: x.tipo, opciones: x.tipo === 'opciones' ? x.opciones : [], obligatoria: !!x.obligatoria }))
  };
  const btn = $('pfGuardar'); btn.disabled = true; pfEstado('Guardando…');
  const r = await (await MCAuth.listo).rpc('guardar_ajuste', { p_clave: 'perfil', p_valor: valor });
  if (r.error) {
    btn.disabled = false;
    pfEstado('');
    toast(/no autorizado/i.test(r.error.message || '') ? 'Tu correo no es administrador' : (r.error.message || 'No se pudo guardar'), true);
    return;
  }
  MCCarreras.aplicar(valor);
  try { localStorage.setItem('mc_perfil_cfg', JSON.stringify(valor)); } catch (e) { /* sin espacio */ }
  PF.cambios = false; ALU.cargado = false;
  pfEstado('✓ Publicado. Los alumnos lo ven al abrir Mi perfil.');
  renderPerfilCfg();
  toast('Perfil del alumno guardado');
}

$('pfGuardar').addEventListener('click', guardarPerfilCfg);
window.addEventListener('beforeunload', e => { if (PF.cambios) { e.preventDefault(); e.returnValue = ''; } });
if (window.MCAuth) MCAuth.alCambiar(() => { if (!$('tab-perfil').hidden) cargarPerfilCfg(true); else PF.cargado = false; });
