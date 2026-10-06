/* =========================================================
   Panel · Frases del día (Sitio)
   La frase que sale debajo de "¡Hola, …!" en el inicio.
   Una lista por día de la semana; cada semana sale la siguiente.
   Se guarda en Supabase (tabla ajustes, clave 'frases').
   Si nunca se guardó, se parte de las de assets/frases.js.
   ========================================================= */
const FR = { dias: null, cambios: false, cargado: false };
const FR_DIAS = [[1, 'Lunes'], [2, 'Martes'], [3, 'Miércoles'], [4, 'Jueves'], [5, 'Viernes'], [6, 'Sábado'], [0, 'Domingo']];

(function estilosFrases() {
  const st = document.createElement('style');
  st.textContent = `
  .fr-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
  .fr-tit { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: var(--text-faint); font-weight: 700; margin-bottom: 10px; }
  .fr-tit span { text-transform: none; letter-spacing: 0; font-weight: 500; font-size: 12px; }
  .fr-lista { display: flex; flex-direction: column; gap: 8px; }
  .fr-item { display: flex; gap: 8px; align-items: flex-start; }
  .fr-item textarea.inp { flex: 1; min-width: 0; resize: none; overflow: hidden; font-family: inherit; line-height: 1.45; font-size: 13.5px; }
  .fr-x { flex-shrink: 0; width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--border); background: none; color: var(--text-dim); cursor: pointer; }
  .fr-x:hover { color: #ff9a9a; border-color: #5a2a2a; }
  .fr-mas { margin-top: 10px; }
  .fr-hoy { margin-bottom: 16px; }
  .fr-hoy b { color: var(--text); }
  @media (max-width: 800px) { .fr-grid { grid-template-columns: 1fr; } }`;
  document.head.appendChild(st);
})();

function frEstado(txt) { $('frEstado').textContent = txt || ''; }

async function cargarFrases(forzar) {
  if (FR.cargado && !forzar) return;
  const body = $('frBody');
  body.innerHTML = '<div class="loader">Cargando…</div>';
  $('frGuardar').disabled = true;
  let cliente;
  try { cliente = await MCAuth.listo; }
  catch (e) { body.innerHTML = '<div class="state-msg error">No se pudo conectar con Supabase. Revisa tu internet.</div>'; return; }
  if (!MCAuth.usuario()) {
    body.innerHTML = `<div class="state-msg al-login">Para editar las frases entra con tu cuenta de Google de administrador.
      <button class="btn-main" type="button" id="frEntrar">Entrar con Google</button></div>`;
    $('frEntrar').addEventListener('click', () => MCAuth.entrarGoogle());
    return;
  }
  const r = await cliente.from('ajustes').select('valor').eq('clave', 'frases').maybeSingle();
  if (r.error) { body.innerHTML = '<div class="state-msg error">No se pudieron leer las frases. Intenta de nuevo.</div>'; return; }
  const guardadas = r.data && r.data.valor && r.data.valor.dias;
  const base = (window.MCFrases && MCFrases.base) || {};
  FR.dias = {};
  FR_DIAS.forEach(([d]) => { FR.dias[d] = (guardadas && guardadas[d] && guardadas[d].length ? guardadas[d] : base[d] || []).slice(); });
  FR.cargado = true; FR.cambios = false;
  frEstado(guardadas ? '' : 'Mostrando las frases iniciales (aún no guardadas)');
  renderFrases();
}

function frContar(d) {
  const n = FR.dias[d].filter(f => f.trim()).length;
  document.querySelector(`[data-n="${d}"]`).textContent = n + ' frase' + (n === 1 ? '' : 's');
}
function frCambio() { FR.cambios = true; $('frGuardar').disabled = false; frEstado('Cambios sin guardar'); }

function renderFrases(errores) {
  const body = $('frBody');
  const hoy = window.MCFrases ? MCFrases.elegir(FR.dias) : '';
  body.innerHTML = `
    ${errores && errores.length ? `<div class="perr pf-errs">${errores.map(esc).join('<br>')}</div>` : ''}
    ${hoy ? `<p class="hint fr-hoy">Hoy los alumnos ven: <b>${esc(hoy)}</b></p>` : ''}
    <div class="fr-grid">${FR_DIAS.map(([d, nom]) => `
      <div class="pcard fr-card">
        <div class="fr-tit">${nom} <span data-n="${d}"></span></div>
        <div class="fr-lista">${FR.dias[d].map((f, i) => `
          <div class="fr-item"><textarea class="inp" rows="2" maxlength="220" data-d="${d}" data-i="${i}" placeholder="Escribe la frase">${esc(f)}</textarea>
          <button class="fr-x" type="button" data-d="${d}" data-i="${i}" aria-label="Quitar frase" title="Quitar">✕</button></div>`).join('')}
        </div>
        <button class="btn-ghost fr-mas" type="button" data-d="${d}">+ Agregar frase</button>
      </div>`).join('')}
    </div>`;
  FR_DIAS.forEach(([d]) => frContar(d));
  const crecer = t => { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; };
  body.querySelectorAll('textarea[data-d]').forEach(crecer);
  body.querySelectorAll('textarea[data-d]').forEach(t => t.addEventListener('input', () => {
    crecer(t);
    FR.dias[t.dataset.d][+t.dataset.i] = t.value.replace(/\s*\n\s*/g, ' ');
    frContar(t.dataset.d); frCambio();
  }));
  body.querySelectorAll('.fr-x').forEach(b => b.addEventListener('click', () => {
    FR.dias[b.dataset.d].splice(+b.dataset.i, 1); frCambio(); renderFrases();
  }));
  body.querySelectorAll('.fr-mas').forEach(b => b.addEventListener('click', () => {
    const d = b.dataset.d; FR.dias[d].push(''); frCambio(); renderFrases();
    const t = body.querySelector(`textarea[data-d="${d}"][data-i="${FR.dias[d].length - 1}"]`); if (t) t.focus();
  }));
}

async function guardarFrases() {
  if (!FR.dias) return;
  const err = [];
  FR_DIAS.forEach(([d]) => { FR.dias[d] = FR.dias[d].map(f => f.trim()).filter(Boolean); });
  FR_DIAS.forEach(([d, nom]) => {
    if (!FR.dias[d].length) err.push(`${nom}: escribe al menos una frase.`);
    if (FR.dias[d].some(f => f.length > 220)) err.push(`${nom}: hay una frase muy larga (máximo 220 letras).`);
  });
  if (err.length) { renderFrases(err); window.scrollTo(0, 0); toast('Revisa lo marcado en rojo', true); return; }
  const valor = { dias: {} };
  FR_DIAS.forEach(([d]) => { valor.dias[d] = FR.dias[d].slice(0, 31); });
  const btn = $('frGuardar'); btn.disabled = true; frEstado('Guardando…');
  const r = await (await MCAuth.listo).rpc('guardar_ajuste', { p_clave: 'frases', p_valor: valor });
  if (r.error) {
    btn.disabled = false; frEstado('');
    toast(/no autorizado/i.test(r.error.message || '') ? 'Tu correo no es administrador' : (r.error.message || 'No se pudo guardar'), true);
    return;
  }
  try { localStorage.removeItem('mc_frases'); } catch (e) { /* nada */ }
  FR.cambios = false;
  frEstado('✓ Publicado. Los alumnos lo ven en menos de 1 hora.');
  renderFrases();
  toast('Frases guardadas');
}

$('frGuardar').addEventListener('click', guardarFrases);
window.addEventListener('beforeunload', e => { if (FR.cambios) { e.preventDefault(); e.returnValue = ''; } });
if (window.MCAuth) MCAuth.alCambiar(() => { if (!$('tab-frases').hidden) cargarFrases(true); else FR.cargado = false; });
