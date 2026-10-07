/* =========================================================
   Panel · Top 10 semanal del Simulacro (Alumnos)
   Datos: supabase/09-simulacros.sql (ranking_simulacro_admin).
   Solo cuenta el primer intento de cada simulacro.
   ========================================================= */
const SIM = { dia: null }; // un día de la semana que se ve (null = esta semana)

(function estilosTopSim() {
  const st = document.createElement('style');
  st.textContent = `
  .sim-tabla td.pos { width: 46px; text-align: center; font: 800 14px 'Sora', sans-serif; color: var(--text-faint); }
  .sim-tabla td.pos svg { display: block; margin: 0 auto; }
  .sim-pts { font: 800 15px 'Sora', sans-serif; color: var(--accent); }`;
  document.head.appendChild(st);
})();

function simIso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function simCorta(iso) { const p = String(iso).split('-'); return p[2] + '/' + p[1]; }
function simLunes(dia) {
  const d = dia ? new Date(dia + 'T12:00:00') : new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return simIso(d);
}

async function cargarTopSimulacro() {
  const caja = $('simList');
  caja.innerHTML = '<div class="loader">Cargando…</div>';
  const lunes = simLunes(SIM.dia);
  const dom = new Date(lunes + 'T12:00:00'); dom.setDate(dom.getDate() + 6);
  const esta = lunes === simLunes(null);
  $('simSemana').textContent = 'Semana del ' + simCorta(lunes) + ' al ' + simCorta(simIso(dom)) + (esta ? ' (esta semana)' : '') + ' · mejor puntaje del primer intento de cada alumno.';
  $('simSig').disabled = esta;
  let cliente;
  try { cliente = await MCAuth.listo; }
  catch (e) { caja.innerHTML = '<div class="state-msg error">No se pudo conectar con Supabase. Revisa tu internet.</div>'; return; }
  if (!MCAuth.usuario()) {
    caja.innerHTML = `<div class="state-msg al-login">Entra con tu cuenta de Google de administrador.
      <button class="btn-main" type="button" id="simEntrar">Entrar con Google</button></div>`;
    $('simEntrar').addEventListener('click', () => MCAuth.entrarGoogle());
    return;
  }
  const r = await cliente.rpc('ranking_simulacro_admin', { p_dia: lunes });
  if (r.error) {
    caja.innerHTML = /no autorizado/i.test(r.error.message || '')
      ? '<div class="state-msg error">Tu correo no está como administrador.</div>'
      : `<div class="state-msg error">${esc(r.error.message || 'No se pudo cargar.')}<br>¿Ya corriste el archivo supabase/09-simulacros.sql?</div>`;
    return;
  }
  const L = r.data || [];
  if (!L.length) { caja.innerHTML = '<div class="state-msg">Nadie terminó un simulacro esa semana.</div>'; return; }
  const dec = n => (Math.round((+n || 0) * 10) / 10).toFixed(1).replace('.', ',');
  caja.innerHTML = `<div class="al-tabla-wrap"><table class="al-tabla sim-tabla">
    <thead><tr><th>#</th><th>Alumno</th><th>Carrera</th><th>Simulacro</th><th class="num">Intentos</th><th class="num">Puntaje</th></tr></thead>
    <tbody>${L.map(x => `<tr>
      <td class="pos">${(window.MCMedalla && MCMedalla(x.puesto, 24)) || x.puesto}</td>
      <td><div class="al-quien"><div><b>${esc(x.nombre || x.apodo || '—')}${x.apodo && x.nombre ? ' · ' + esc(x.apodo) : ''}</b><small>${esc(x.email || '')}</small></div></div></td>
      <td>${esc(x.carrera || '—')}${x.bloque ? '<br><small style="color:var(--text-faint)">Bloque ' + esc(x.bloque) + '</small>' : ''}</td>
      <td>${esc(x.simulacro || '—')}<br><small style="color:var(--text-faint)">${new Date(x.fecha).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</small></td>
      <td class="num">${x.intentos}</td>
      <td class="num"><span class="sim-pts">${dec(x.puntaje)}</span> <small style="color:var(--text-faint)">/ ${dec(x.maximo)}</small></td>
    </tr>`).join('')}</tbody></table></div>`;
}

$('simAnt').addEventListener('click', () => { const d = new Date(simLunes(SIM.dia) + 'T12:00:00'); d.setDate(d.getDate() - 7); SIM.dia = simIso(d); cargarTopSimulacro(); });
$('simSig').addEventListener('click', () => { const d = new Date(simLunes(SIM.dia) + 'T12:00:00'); d.setDate(d.getDate() + 7); SIM.dia = simIso(d); cargarTopSimulacro(); });
