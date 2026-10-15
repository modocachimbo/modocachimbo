/* =========================================================
   Panel · Agenda (Alumnos)
   Fechas que ven todos los alumnos en su agenda, con candado:
   seminarios, simulacros, exámenes… para todos, Ordinario o CPU.
   Datos: supabase/21-agenda.sql (agenda_general,
   guardar_agenda_general y borrar_agenda_general).
   ========================================================= */
const AGP = { lista: [], ver: 'prox', editando: null, tipo: 'seminario', para: 'todos', borrar: null };
const AGP_TIPOS = {
  examen: ['Examen', '#FF4B4B'], seminario: ['Seminario', '#FF9600'], simulacro: ['Simulacro', '#1CB0F6'],
  tarea: ['Tarea', '#CE82FF'], otro: ['Otro', '#9A9A9A']
};
const AGP_PARA = { todos: 'Todos', Ordinario: 'Solo Ordinario', CPU: 'Solo CPU' };
const AGP_MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
const AGP_DIA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

(function estilosAgenda() {
  const st = document.createElement('style');
  st.textContent = `
  .agp-form { border: 2px solid #262626; border-bottom-width: 5px; border-radius: 18px; background: var(--surface); padding: 18px; margin-bottom: 18px; }
  .agp-form h3 { font: 900 17px Nunito, sans-serif; margin-bottom: 4px; }
  .agp-form label, .agp-form .agp-l { display: block; font: 800 12.5px Nunito, sans-serif; color: var(--text-dim); margin: 14px 0 6px; }
  .agp-ops { display: flex; flex-wrap: wrap; gap: 8px; }
  .agp-op { padding: 8px 13px; border-radius: 12px; border: 2px solid #2a2a2a; background: transparent; color: var(--text); font: 900 13.5px Nunito, sans-serif; cursor: pointer; }
  .agp-op.on { border-color: var(--c, var(--accent)); color: var(--c, var(--accent)); background: color-mix(in srgb, var(--c, #C6E000) 14%, transparent); }
  .agp-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .agp-2 > div { min-width: 0; }
  .agp-form .inp { color-scheme: dark; }
  .agp-acc { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 16px; }
  .agp-fila { display: flex; align-items: center; gap: 14px; padding: 12px 14px; border: 2px solid #232323; border-radius: 16px; background: var(--surface); margin-bottom: 8px; }
  .agp-fila.paso { opacity: .55; }
  .agp-n { flex-shrink: 0; width: 54px; height: 54px; border-radius: 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; font: 1000 20px/1 Nunito, sans-serif; }
  .agp-n small { font: 900 10px Nunito, sans-serif; text-transform: uppercase; letter-spacing: .05em; margin-top: 3px; }
  .agp-tx { flex: 1; min-width: 0; }
  .agp-tx b { display: block; font: 900 15px Nunito, sans-serif; overflow-wrap: anywhere; }
  .agp-tx small { display: block; color: var(--text-dim); font-size: 12.5px; margin-top: 2px; overflow-wrap: anywhere; }
  .agp-tag { display: inline-block; margin-top: 6px; font: 900 10.5px Nunito, sans-serif; letter-spacing: .06em; text-transform: uppercase; border-radius: 8px; padding: 3px 7px; }
  .agp-bts { display: flex; gap: 6px; flex-shrink: 0; }
  .agp-bts .btn-ghost.rojo { color: var(--red); border-color: rgba(224,60,60,.4); }
  @media (max-width: 560px) { .agp-fila { flex-wrap: wrap; } .agp-bts { width: 100%; justify-content: flex-end; } .agp-2 { grid-template-columns: 1fr; } }`;
  document.head.appendChild(st);
})();

function agpIso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function agpDias(s) { const h = new Date(); h.setHours(0, 0, 0, 0); return Math.round((new Date(s + 'T00:00:00') - h) / 864e5); }
function agpFecha(s) { const d = new Date(s + 'T12:00:00'); return AGP_DIA[d.getDay()] + ' ' + d.getDate() + ' ' + AGP_MES[d.getMonth()] + ' ' + d.getFullYear(); }

async function cargarAgenda() {
  const caja = $('agpList');
  caja.innerHTML = '<div class="loader">Cargando…</div>';
  let cliente;
  try { cliente = await MCAuth.listo; }
  catch (e) { caja.innerHTML = '<div class="state-msg error">No se pudo conectar con Supabase. Revisa tu internet.</div>'; return; }
  if (!MCAuth.usuario()) {
    caja.innerHTML = `<div class="state-msg al-login">Entra con tu cuenta de Google de administrador.
      <button class="btn-main" type="button" id="agpEntrar">Entrar con Google</button></div>`;
    $('agpEntrar').addEventListener('click', () => MCAuth.entrarGoogle());
    return;
  }
  const r = await cliente.from('agenda_general').select('*').order('fecha').order('hora', { nullsFirst: true });
  if (r.error) {
    caja.innerHTML = `<div class="state-msg error">${esc(r.error.message || 'No se pudo cargar.')}<br>¿Ya corriste el archivo supabase/21-agenda.sql?</div>`;
    return;
  }
  AGP.lista = r.data || [];
  pintarAgendaPanel();
}

function pintarAgendaPanel() {
  const hoy = agpIso(new Date());
  const prox = AGP.lista.filter(e => e.fecha >= hoy), pas = AGP.lista.filter(e => e.fecha < hoy).reverse();
  $('agpStats').textContent = prox.length === 0 ? 'No hay fechas próximas. Las que agregues aparecen con candado en la agenda de cada alumno.'
    : prox.length + (prox.length === 1 ? ' fecha próxima' : ' fechas próximas') + '. Los alumnos las ven con candado en su agenda y el búho les avisa 3 días antes.';
  $('agpChips').innerHTML = `<button class="chip${AGP.ver === 'prox' ? ' on' : ''}" data-v="prox" type="button">Próximas <span class="c">${prox.length}</span></button>` +
    `<button class="chip${AGP.ver === 'pas' ? ' on' : ''}" data-v="pas" type="button">Pasadas <span class="c">${pas.length}</span></button>`;
  const L = AGP.ver === 'prox' ? prox : pas;
  if (!L.length) { $('agpList').innerHTML = `<div class="state-msg">${AGP.ver === 'prox' ? 'Aún no programaste fechas. Toca “Nueva fecha”.' : 'No hay fechas pasadas.'}</div>`; return; }
  $('agpList').innerHTML = L.map(e => {
    const t = AGP_TIPOS[e.tipo] || AGP_TIPOS.otro, n = agpDias(e.fecha);
    const num = n < 0 ? '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' : n === 0 ? 'HOY' : n + '<small>' + (n === 1 ? 'día' : 'días') + '</small>';
    const seguro = AGP.borrar === e.id;
    return `<div class="agp-fila${n < 0 ? ' paso' : ''}">
      <span class="agp-n" style="background:${t[1]}26;color:${t[1]}">${num}</span>
      <div class="agp-tx"><b>${esc(e.titulo)}</b><small>${t[0]} · ${agpFecha(e.fecha)}${e.hora ? ' · ' + esc(e.hora) : ''}${e.nota ? ' · ' + esc(e.nota) : ''}</small>
        <span class="agp-tag" style="background:#1f1f1f;color:${e.para === 'todos' ? 'var(--accent)' : '#1CB0F6'}">${AGP_PARA[e.para] || e.para}</span></div>
      <div class="agp-bts">
        <button class="btn-ghost" type="button" data-ed="${e.id}">Editar</button>
        <button class="btn-ghost rojo" type="button" data-bo="${e.id}">${seguro ? '¿Borrar? Toca otra vez' : 'Borrar'}</button>
      </div></div>`;
  }).join('');
}

function agpMarcar() {
  $('agpTipos').querySelectorAll('[data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === AGP.tipo));
  $('agpPara').querySelectorAll('[data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === AGP.para));
}

function agpAbrir(e) {
  AGP.editando = e || null;
  AGP.tipo = e ? e.tipo : 'seminario';
  AGP.para = e ? e.para : 'todos';
  $('agpFormTit').textContent = e ? 'Editar fecha' : 'Nueva fecha para los alumnos';
  $('agpTitulo').value = e ? e.titulo : '';
  $('agpFecha').value = e ? e.fecha : '';
  $('agpHora').value = e && e.hora ? e.hora : '';
  $('agpNota').value = e && e.nota ? e.nota : '';
  agpMarcar();
  $('agpForm').hidden = false;
  $('agpForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => $('agpTitulo').focus(), 200);
}

$('agpForm').innerHTML = `<h3 id="agpFormTit">Nueva fecha para los alumnos</h3>
  <span class="agp-l">Tipo</span>
  <div class="agp-ops" id="agpTipos">${Object.keys(AGP_TIPOS).map(k => `<button type="button" class="agp-op" data-v="${k}" style="--c:${AGP_TIPOS[k][1]}">${AGP_TIPOS[k][0]}</button>`).join('')}</div>
  <label for="agpTitulo">Título</label><input class="inp" id="agpTitulo" maxlength="80" placeholder="Ej.: Seminario 3 · Álgebra">
  <div class="agp-2"><div><label for="agpFecha">Fecha</label><input class="inp" id="agpFecha" type="date"></div>
    <div><label for="agpHora">Hora (opcional)</label><input class="inp" id="agpHora" type="time"></div></div>
  <label for="agpNota">Nota (opcional)</label><input class="inp" id="agpNota" maxlength="200" placeholder="Ej.: temas 1 al 5, llevar DNI">
  <span class="agp-l">¿Quiénes la ven?</span>
  <div class="agp-ops" id="agpPara">${Object.keys(AGP_PARA).map(k => `<button type="button" class="agp-op" data-v="${k}">${AGP_PARA[k]}</button>`).join('')}</div>
  <div class="agp-acc"><button class="btn-main" type="button" id="agpGuardar">Guardar</button><button class="btn-ghost" type="button" id="agpCancelar">Cancelar</button></div>`;

$('agpTipos').addEventListener('click', ev => { const b = ev.target.closest('[data-v]'); if (b) { AGP.tipo = b.dataset.v; agpMarcar(); } });
$('agpPara').addEventListener('click', ev => { const b = ev.target.closest('[data-v]'); if (b) { AGP.para = b.dataset.v; agpMarcar(); } });
$('agpNueva').addEventListener('click', () => agpAbrir(null));
$('agpCancelar').addEventListener('click', () => { $('agpForm').hidden = true; });
$('agpChips').addEventListener('click', ev => { const b = ev.target.closest('[data-v]'); if (b) { AGP.ver = b.dataset.v; AGP.borrar = null; pintarAgendaPanel(); } });

$('agpGuardar').addEventListener('click', async () => {
  const p = { id: AGP.editando ? AGP.editando.id : null, tipo: AGP.tipo, titulo: $('agpTitulo').value.trim(), fecha: $('agpFecha').value,
    hora: $('agpHora').value || '', nota: $('agpNota').value.trim(), para: AGP.para };
  if (!p.titulo) { toast('Ponle un título', true); return; }
  if (!p.fecha) { toast('Elige la fecha', true); return; }
  const b = $('agpGuardar'); b.disabled = true;
  try {
    const c = await MCAuth.listo;
    const r = await c.rpc('guardar_agenda_general', { p });
    if (r.error) throw r.error;
    toast(AGP.editando ? 'Fecha actualizada' : 'Fecha agregada. Ya la ven los alumnos.');
    $('agpForm').hidden = true;
    await cargarAgenda();
  } catch (e) {
    toast(/no autorizado/i.test(e.message || '') ? 'Tu cuenta no tiene permiso para la agenda' : 'No se pudo guardar: ' + (e.message || 'error'), true);
  } finally { b.disabled = false; }
});

$('agpList').addEventListener('click', async ev => {
  const ed = ev.target.closest('[data-ed]');
  if (ed) { agpAbrir(AGP.lista.find(x => String(x.id) === ed.dataset.ed)); return; }
  const bo = ev.target.closest('[data-bo]');
  if (!bo) return;
  const id = +bo.dataset.bo;
  if (AGP.borrar !== id) { AGP.borrar = id; pintarAgendaPanel(); return; }
  AGP.borrar = null;
  try {
    const c = await MCAuth.listo;
    const r = await c.rpc('borrar_agenda_general', { p_id: id });
    if (r.error) throw r.error;
    toast('Fecha borrada');
    await cargarAgenda();
  } catch (e) { toast('No se pudo borrar: ' + (e.message || 'error'), true); pintarAgendaPanel(); }
});
