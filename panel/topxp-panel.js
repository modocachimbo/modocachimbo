/* =========================================================
   Panel · Top de la semana (Alumnos)
   La experiencia que ganan respondiendo en Práctica, Vocabulario,
   Flashcards, Duelos y Simulacro (lunes a domingo).
   Datos: supabase/19-top-xp.sql (ranking_xp_admin).
   ========================================================= */
const TXP = { dia: null }; // un día de la semana que se ve (null = esta semana)

(function estilosTopXp() {
  const st = document.createElement('style');
  st.textContent = `
  .txp-pts { display: inline-flex; align-items: center; gap: 6px; font: 900 15px Nunito, 'Sora', sans-serif; color: #FFC800; }
  .txp-pts svg { width: 18px; height: 18px; }
  .txp-res { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
  .txp-res div { border: 2px solid #2C2549; border-bottom-width: 4px; border-radius: 14px; padding: 10px 14px; background: var(--surface); font-size: 12.5px; color: var(--text-dim); }
  .txp-rgo { display: inline-flex; align-items: center; gap: 8px; font: 900 13.5px Nunito, sans-serif; white-space: nowrap; }
  .txp-rgo .mc-rgo-mini { width: 30px; }
  .txp-rgo.sin { color: var(--text-faint); }
  .txp-rgo.r0 { color: #5FDAFF; } .txp-rgo.r1 { color: #5FF59A; } .txp-rgo.r2 { color: #D79BFF; } .txp-rgo.r3 { color: #FF6E84; } .txp-rgo.r4 { color: #FFC800; }
  .txp-res b { display: block; font: 900 20px Nunito, sans-serif; color: var(--text); }`;
  document.head.appendChild(st);
})();

// Emblema y nombre del rango de la semana (assets/rango.js)
const txpRango = xp => {
  if (!window.MCRango || MCRango.nivel(xp) < 0) return '<span class="txp-rgo sin">Sin rango</span>';
  const n = MCRango.nivel(xp);
  return `<span class="txp-rgo r${n}">${MCRango.mini(xp)}${esc(MCRango.nombre(n))}</span>`;
};

const TXP_GEMA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#FFC800" d="M12 1.6 21 6.8v10.4L12 22.4 3 17.2V6.8z"/><path fill="#FFDD4A" d="M12 1.6 21 6.8 12 12 3 6.8z"/><path fill="#E0A100" d="M21 6.8v10.4L12 22.4V12z"/><path fill="#fff" opacity=".95" d="M13 5.6 8.2 12.6h3.2l-.9 5.8 5.3-7.4h-3.3z"/></svg>';

async function cargarTopXp() {
  const caja = $('txpList');
  caja.innerHTML = '<div class="loader">Cargando…</div>';
  const lunes = simLunes(TXP.dia);
  const dom = new Date(lunes + 'T12:00:00'); dom.setDate(dom.getDate() + 6);
  const esta = lunes === simLunes(null);
  $('txpSemana').textContent = 'Semana del ' + simCorta(lunes) + ' al ' + simCorta(simIso(dom)) + (esta ? ' (esta semana)' : '') + ' · XP ganado respondiendo en Práctica, Vocabulario, Flashcards, Duelos y Simulacro.';
  $('txpSig').disabled = esta;
  let cliente;
  try { cliente = await MCAuth.listo; }
  catch (e) { caja.innerHTML = '<div class="state-msg error">No se pudo conectar con Supabase. Revisa tu internet.</div>'; return; }
  if (!MCAuth.usuario()) {
    caja.innerHTML = `<div class="state-msg al-login">Entra con tu cuenta de Google de administrador.
      <button class="btn-main" type="button" id="txpEntrar">Entrar con Google</button></div>`;
    $('txpEntrar').addEventListener('click', () => MCAuth.entrarGoogle());
    return;
  }
  const r = await cliente.rpc('ranking_xp_admin', { p_dia: lunes });
  if (r.error) {
    caja.innerHTML = /no autorizado/i.test(r.error.message || '')
      ? '<div class="state-msg error">Tu cuenta no tiene permiso para ver el Top de la semana.</div>'
      : `<div class="state-msg error">${esc(r.error.message || 'No se pudo cargar.')}<br>¿Ya corriste el archivo supabase/19-top-xp.sql?</div>`;
    return;
  }
  const L = r.data || [];
  if (!L.length) { caja.innerHTML = '<div class="state-msg">Nadie ganó XP esa semana.</div>'; return; }
  const mil = n => Number(n || 0).toLocaleString('es-PE');
  caja.innerHTML = `<div class="txp-res">
      <div><b>${mil(L[0].alumnos)}</b>alumnos ganaron XP</div>
      <div><b>${mil(L[0].xp_total)}</b>XP entre todos</div>
      <div><b>${mil(Math.round(L[0].xp_total / Math.max(1, L[0].alumnos)))}</b>XP en promedio</div>
    </div>
    <div class="al-tabla-wrap"><table class="al-tabla sim-tabla">
    <thead><tr><th>#</th><th>Alumno</th><th>Carrera</th><th>Rango</th><th class="num">XP</th></tr></thead>
    <tbody>${L.map(x => `<tr>
      <td class="pos">${(window.MCMedalla && MCMedalla(x.puesto, 24)) || x.puesto}</td>
      <td><div class="al-quien"><div><b>${esc(x.nombre || x.apodo || '—')}${x.apodo && x.nombre ? ' · ' + esc(x.apodo) : ''}</b><small>${esc(x.email || '')}</small></div></div></td>
      <td>${esc(x.carrera || '—')}</td>
      <td>${txpRango(x.xp)}</td>
      <td class="num"><span class="txp-pts">${TXP_GEMA}${mil(x.xp)}</span></td>
    </tr>`).join('')}</tbody></table></div>
    ${L.length >= 50 ? '<p class="hint" style="margin-top:10px">Se muestran los 50 primeros.</p>' : ''}`;
}

$('txpAnt').addEventListener('click', () => { const d = new Date(simLunes(TXP.dia) + 'T12:00:00'); d.setDate(d.getDate() - 7); TXP.dia = simIso(d); cargarTopXp(); });
$('txpSig').addEventListener('click', () => { const d = new Date(simLunes(TXP.dia) + 'T12:00:00'); d.setDate(d.getDate() + 7); TXP.dia = simIso(d); cargarTopXp(); });
