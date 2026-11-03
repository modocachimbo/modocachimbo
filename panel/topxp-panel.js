/* =========================================================
   Panel · Top de la semana (Alumnos)
   La experiencia que ganan respondiendo en Práctica, Vocabulario,
   Flashcards, Duelos y Simulacro (lunes a domingo).
   Datos: supabase/19-top-xp.sql (ranking_xp_admin).
   «Revisar trampas»: supabase/50-revisar-trampas-xp.sql (xp_revision, xp_ajustar).
   «Verificar Top 10»: supabase/57-verificar-top10.sql (xp_verificar_top) y «Volver a rango cero».
   ========================================================= */
const TXP = { dia: null, revisar: false }; // dia: un día de la semana que se ve (null = esta semana)

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
  .txp-res b { display: block; font: 900 20px Nunito, sans-serif; color: var(--text); }
  #txpRev[aria-pressed="true"] { background: var(--red); border-color: var(--red); color: #1a0606; }
  .txp-ok { color: var(--green); font-weight: 800; font-size: 12.5px; }
  .txp-sen { display: flex; flex-direction: column; gap: 4px; }
  .txp-sen span { display: inline-block; background: rgba(224,60,60,.14); color: var(--red); border: 1px solid rgba(255,138,138,.35); border-radius: 8px; padding: 3px 8px; font-size: 12px; font-weight: 800; line-height: 1.3; }
  tr.txp-alerta td { background: rgba(224,60,60,.06); }
  .txp-num-mal { color: var(--red); font-weight: 900; }
  .txp-aj { font-size: 11.5px; color: var(--amber); font-weight: 800; display: block; margin-top: 3px; }
  .txp-quitar { white-space: nowrap; }
  .txp-rev td { vertical-align: top; }
  .txp-rev td.num small { display: block; font-size: 11.5px; color: var(--text-dim); margin-top: 3px; white-space: nowrap; }
  .txp-hizo { min-width: 200px; font-size: 12.5px; color: var(--text-dim); line-height: 1.5; }
  .txp-hizo span { display: block; }
  .txp-rev .txp-sen { min-width: 190px; }
  .txp-rev .txp-quitar { padding-left: 10px; padding-right: 10px; }
  .txp-hizo span, .txp-sen span { white-space: normal; }
  /* Celular: cada alumno es una tarjeta */
  @media (max-width: 760px) {
    .txp-rev thead { display: none; }
    .txp-rev, .txp-rev tbody, .txp-rev tr, .txp-rev td { display: block; width: 100%; box-sizing: border-box; }
    .al-tabla.txp-rev { min-width: 0; }
    .txp-rev tr.txp-alerta { background: rgba(224,60,60,.06); }
    .txp-rev tr.txp-alerta td { background: none; }
    .txp-rev tr { border: 2px solid #2C2549; border-radius: 14px; margin-bottom: 10px; padding: 8px 4px; position: relative; }
    .txp-rev td { border: 0 !important; padding: 4px 10px !important; text-align: left !important; }
    .txp-rev td.pos { position: absolute; top: 8px; right: 6px; width: auto; }
    .txp-rev .txp-hizo, .txp-rev .txp-sen { min-width: 0; }
    .txp-rev .txp-quitar { width: 100%; justify-content: center; }
  }
  .txp-leyenda { font-size: 12.5px; color: var(--text-dim); line-height: 1.55; margin: 0 0 14px; }
  .txp-ver { background: var(--surface); border: 2px solid #2C2549; border-bottom-width: 4px; border-radius: 18px; padding: 16px 18px; margin-bottom: 18px; }
  .txp-ver-cab { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 4px; }
  .txp-ver h3 { margin: 0; font: 800 16px 'Sora', sans-serif; }
  .txp-ver > p { margin: 0 0 12px; font-size: 12.5px; color: var(--text-dim); line-height: 1.5; }
  .txp-ver-fila { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; gap: 6px 12px; align-items: center; padding: 10px 0; border-top: 1px solid var(--border); }
  .txp-ver-fila .pos { font: 900 15px Nunito, sans-serif; color: var(--text-dim); text-align: center; }
  .txp-ver-fila b { font-size: 14px; } .txp-ver-fila small { display: block; font-size: 12px; color: var(--text-dim); margin-top: 2px; line-height: 1.45; }
  .txp-ver-fila .why { grid-column: 2 / 4; display: flex; flex-wrap: wrap; gap: 4px; }
  .txp-ver-fila .why span { background: rgba(224,60,60,.12); color: var(--red); border-radius: 8px; padding: 2px 8px; font-size: 11.5px; font-weight: 800; }
  .txp-ver-der { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
  .txp-vd { display: inline-block; font: 900 12px Nunito, sans-serif; padding: 4px 10px; border-radius: 99px; white-space: nowrap; }
  .txp-vd.trampa { background: rgba(224,60,60,.16); color: var(--red); }
  .txp-vd.revisar { background: rgba(255,200,0,.14); color: var(--amber); }
  .txp-vd.limpio { background: rgba(88,204,2,.13); color: var(--green); }
  .txp-cero { white-space: nowrap; }
  @media (max-width: 760px) { .txp-ver-fila { grid-template-columns: 28px minmax(0, 1fr); } .txp-ver-der { grid-column: 2; justify-content: flex-start; } .txp-ver-fila .why { grid-column: 2; } }`;
  document.head.appendChild(st);
})();

// Emblema y nombre del rango de la semana (assets/rango.js)
const txpRango = xp => {
  if (!window.MCRango || MCRango.nivel(xp) < 0) return '<span class="txp-rgo sin">Sin rango</span>';
  const n = MCRango.nivel(xp);
  return `<span class="txp-rgo" style="color:${MCRango.color(n).c}">${MCRango.mini(xp)}${esc(MCRango.nombre(n))}</span>`;
};

const TXP_GEMA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#FFC800" d="M12 1.6 21 6.8v10.4L12 22.4 3 17.2V6.8z"/><path fill="#FFDD4A" d="M12 1.6 21 6.8 12 12 3 6.8z"/><path fill="#E0A100" d="M21 6.8v10.4L12 22.4V12z"/><path fill="#fff" opacity=".95" d="M13 5.6 8.2 12.6h3.2l-.9 5.8 5.3-7.4h-3.3z"/></svg>';

async function cargarTopXp() {
  if (TXP.revisar) return cargarRevision();
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

/* ---------- Revisar trampas ---------- */
const txpMil = n => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
async function cargarRevision() {
  const caja = $('txpList');
  caja.innerHTML = '<div class="loader">Revisando…</div>';
  const lunes = simLunes(TXP.dia);
  const dom = new Date(lunes + 'T12:00:00'); dom.setDate(dom.getDate() + 6);
  const esta = lunes === simLunes(null);
  $('txpSemana').textContent = 'Semana del ' + simCorta(lunes) + ' al ' + simCorta(simIso(dom)) + (esta ? ' (esta semana)' : '') + ' · Lo que ganaron frente a lo que de verdad hicieron.';
  $('txpSig').disabled = esta;
  let cliente;
  try { cliente = await MCAuth.listo; }
  catch (e) { caja.innerHTML = '<div class="state-msg error">No se pudo conectar con Supabase. Revisa tu internet.</div>'; return; }
  if (!MCAuth.usuario()) { caja.innerHTML = '<div class="state-msg">Entra con tu cuenta de administrador.</div>'; return; }
  const r = await cliente.rpc('xp_revision', { p_dia: lunes });
  if (r.error) {
    caja.innerHTML = /no autorizado/i.test(r.error.message || '')
      ? '<div class="state-msg error">Tu cuenta no tiene permiso para ver el Top de la semana.</div>'
      : `<div class="state-msg error">${esc(r.error.message || 'No se pudo cargar.')}<br>¿Ya corriste el archivo supabase/50-revisar-trampas-xp.sql?</div>`;
    return;
  }
  const L = r.data || [];
  if (!L.length) { caja.innerHTML = '<div class="state-msg">Nadie ganó XP esa semana.</div>'; return; }
  const alertas = L.filter(x => (x.senales || []).length).length;
  const dash = '<span style="color:var(--text-faint)">—</span>';
  caja.innerHTML = `<div id="txpVer"><div class="txp-ver"><div class="loader">Verificando el Top 10…</div></div></div>
    <div class="txp-res">
      <div><b style="color:${alertas ? 'var(--red)' : 'var(--green)'}">${alertas}</b>${alertas === 1 ? 'alumno para revisar' : 'alumnos para revisar'}</div>
      <div><b>${txpMil(L.length)}</b>revisados (los 50 primeros)</div>
    </div>
    <p class="txp-leyenda"><b>Preguntas</b>: las que quedaron registradas en Práctica, Repaso, Fijas, Exámenes y Simulacro. Seminarios, Banqueo, Duelo, Vocabulario y Tarjetas no se registran ahí, así que el número real es mayor. <b>XP por pregunta</b> divide solo el XP ganado en esos mismos modos registrados (lo de Seminarios, Banqueo y demás no cuenta): un alumno normal saca entre 15 y 40; muy por encima, algo no cuadra. Las <b>respuestas, aciertos y horas</b> salen del registro de envíos, que empieza cuando corres el archivo 50. Las alertas son para revisar, no son prueba.</p>
    <div class="al-tabla-wrap"><table class="al-tabla sim-tabla txp-rev">
    <thead><tr><th>#</th><th>Alumno</th><th class="num">XP</th><th>Lo que hizo</th><th>Alertas</th><th></th></tr></thead>
    <tbody>${L.map((x, i) => {
      const sen = x.senales || [];
      const xpp = x.xp_por_pregunta;
      const extra = x.regalado || x.premios ? '<small>' + (x.regalado ? txpMil(x.regalado) + ' regalado' : '') + (x.regalado && x.premios ? ' · ' : '') + (x.premios ? txpMil(x.premios) + ' de duelos' : '') + '</small>' : '';
      // XP por pregunta: solo el XP de Práctica, Repaso, Fijas, Exámenes y Simulacro (archivo 58).
      // Sin el archivo 58 no llega xp_registrable y se usa todo el XP, como antes.
      const xreg = x.xp_registrable != null ? x.xp_registrable : x.xp;
      const preg = xpp == null
        ? (xreg > 5000 ? '<span class="txp-num-mal">Ninguna pregunta registrada</span>' : 'Sin preguntas registradas')
        : txpMil(x.preguntas) + ' preguntas registradas</span><span class="' + (xpp > 60 ? 'txp-num-mal' : '') + '">' + txpMil(xpp) + ' XP por pregunta';
      const deOtros = x.xp_registrable != null && x.xp - x.xp_registrable > 0
        ? '</span><span>' + txpMil(x.xp_registrable) + ' XP en modos registrados · ' + txpMil(x.xp - x.xp_registrable) + ' en otros' : '';
      const env = x.envios
        ? txpMil(x.respuestas) + ' respuestas</span><span>' + x.aciertos + '\u00a0%\u00a0de aciertos</span><span>' + txpMil(x.horas) + (x.horas === 1 ? ' hora' : ' horas') + ' activo</span><span class="' + (x.max_hora > 6000 ? 'txp-num-mal' : '') + '">Máx. ' + txpMil(x.max_hora) + ' XP en 1 hora'
        : 'Sin envíos registrados';
      return `<tr class="${sen.length ? 'txp-alerta' : ''}">
      <td class="pos">${x.puesto}</td>
      <td><div class="al-quien"><div><b>${esc(x.nombre || x.apodo || '—')}${x.apodo && x.nombre ? ' · ' + esc(x.apodo) : ''}</b><small>${esc(x.email || '')}</small>${x.ajustado ? '<span class="txp-aj">XP ajustado esta semana</span>' : ''}</div></div></td>
      <td class="num"><span class="txp-pts">${TXP_GEMA}${txpMil(x.xp)}</span>${extra}</td>
      <td class="txp-hizo"><span>${preg}${deOtros}</span><span>${env}</span></td>
      <td>${sen.length ? '<div class="txp-sen">' + sen.map(t => '<span>' + esc(t) + '</span>').join('') + '</div>' : '<span class="txp-ok">Todo normal</span>'}</td>
      <td><button type="button" class="btn-ghost txp-quitar" data-i="${i}">Quitar XP</button></td>
    </tr>`; }).join('')}</tbody></table></div>`;
  caja.querySelectorAll('.txp-quitar').forEach(b => b.addEventListener('click', () => txpQuitar(L[+b.dataset.i], lunes)));
  txpVerificar(cliente, lunes);
}

/* ---------- Verificar Top 10: lo que dicen que respondieron frente a lo registrado ---------- */
const TXP_VD = { trampa: 'Trampa probable', revisar: 'Revisar', limpio: 'Limpio', cero: 'En rango cero' };
async function txpVerificar(cliente, lunes) {
  const caja = $('txpVer'); if (!caja) return;
  const r = await cliente.rpc('xp_verificar_top', { p_dia: lunes, p_n: 10 });
  if (!caja.isConnected) return;
  if (r.error) {
    caja.innerHTML = `<div class="txp-ver"><h3>Verificar Top 10</h3><p style="margin:6px 0 0">${/xp_verificar_top/.test(r.error.message || '')
      ? 'Falta correr el archivo <b>supabase/57-verificar-top10.sql</b> en Supabase.' : esc(r.error.message || 'No se pudo verificar.')}</p></div>`;
    return;
  }
  const V = r.data || [];
  if (!V.length) { caja.innerHTML = ''; return; }
  const trampas = V.filter(x => x.veredicto === 'trampa');
  const nombre = x => x.nombre || x.apodo || x.email || '—';
  caja.innerHTML = `<div class="txp-ver">
    <div class="txp-ver-cab"><h3>Verificar Top 10</h3>
      ${trampas.length ? `<button type="button" class="btn-main txp-cero" id="txpCeroTodos" style="background:var(--red);color:#fff">Volver a rango cero ${trampas.length === 1 ? 'al alumno' : 'a los ' + trampas.length} con trampa probable</button>` : '<span class="txp-vd limpio">Ninguna trampa probable</span>'}</div>
    <p>Compara las preguntas que la web <b>dice</b> que respondieron en Práctica, Repaso, Fijas, Exámenes y Simulacro con las que <b>de verdad quedaron registradas</b>. «Volver a rango cero» le deja 0 XP esta semana (sin rango) y queda anotado.</p>
    ${V.map((x, i) => `<div class="txp-ver-fila">
      <span class="pos">${x.puesto}</span>
      <div><b>${esc(nombre(x))}</b><small>${txpMil(x.xp)} XP · dice ${txpMil(x.resp_registrables)} respondidas, hay ${txpMil(x.preguntas)} registradas${x.resp_otras ? ' · ' + txpMil(x.resp_otras) + ' en Seminarios, Banqueo, Duelo y Flashcards' : ''}</small></div>
      <div class="txp-ver-der"><span class="txp-vd ${x.veredicto}">${TXP_VD[x.veredicto] || x.veredicto}</span>
        ${x.veredicto === 'trampa' || x.veredicto === 'revisar' ? `<button type="button" class="btn-ghost txp-cero" data-v="${i}">Volver a rango cero</button>` : ''}</div>
      ${(x.senales || []).length ? `<div class="why">${x.senales.map(t => '<span>' + esc(t) + '</span>').join('')}</div>` : ''}
    </div>`).join('')}
  </div>`;
  caja.querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', () => txpRangoCero([V[+b.dataset.v]], lunes)));
  const todos = $('txpCeroTodos'); if (todos) todos.addEventListener('click', () => txpRangoCero(trampas, lunes));
}

// Deja en 0 XP la semana de uno o varios alumnos (rango cero), con motivo
function txpRangoCero(lista, lunes) {
  const varios = lista.length > 1;
  const quien = varios ? lista.length + ' alumnos' : (lista[0].nombre || lista[0].apodo || lista[0].email || 'este alumno');
  const o = document.createElement('div');
  o.className = 'ov';
  o.innerHTML = `<div class="mcard" style="max-width:480px;"><button class="mx" type="button" aria-label="Cerrar">✕</button>
    <div class="eyebrow">Verificar Top 10</div>
    <h3>Volver a rango cero a ${esc(quien)}</h3>
    <p class="hint" style="margin:0 0 12px;">${varios ? lista.map(x => '<b>' + esc(x.nombre || x.apodo || x.email) + '</b> (' + txpMil(x.xp) + ' XP)').join(', ') + '.' : 'Tiene <b>' + txpMil(lista[0].xp) + ' XP</b> esta semana.'} Quedará${varios ? 'n' : ''} con 0 XP esta semana, sin rango, y se le${varios ? 's' : ''} baja también el XP para canjear. Queda anotado quién lo hizo y por qué.</p>
    <label class="fld">Motivo</label>
    <input class="inp" id="txpCeroMot" maxlength="300" value="Trampa en el Top 10: lo que respondió no cuadra con lo registrado">
    <div class="err" id="txpCeroErr"></div>
    <div class="mfoot"><button type="button" class="btn-ghost" data-x>Cancelar</button><button type="button" class="btn-main" id="txpCeroOk" style="background:var(--red);color:#fff">Volver a rango cero</button></div>
  </div>`;
  document.body.appendChild(o); document.body.classList.add('modal-open');
  const cerrar = () => { o.remove(); document.body.classList.remove('modal-open'); };
  o.querySelector('.mx').addEventListener('click', cerrar); o.querySelector('[data-x]').addEventListener('click', cerrar);
  o.querySelector('#txpCeroOk').addEventListener('click', async () => {
    const btn = o.querySelector('#txpCeroOk'), err = o.querySelector('#txpCeroErr');
    btn.disabled = true; btn.textContent = 'Aplicando…'; err.style.display = 'none';
    const cliente = await MCAuth.listo, motivo = o.querySelector('#txpCeroMot').value.trim() || null, fallos = [];
    for (const x of lista) {
      const r = await cliente.rpc('xp_ajustar', { p_usuario: x.usuario, p_dia: lunes, p_xp: 0, p_motivo: motivo });
      if (r.error) fallos.push((x.nombre || x.apodo || x.email) + ': ' + (r.error.message || 'no se pudo'));
    }
    if (fallos.length) { err.textContent = fallos.join(' · '); err.style.display = 'block'; btn.disabled = false; btn.textContent = 'Volver a rango cero'; return; }
    cerrar();
    toast(varios ? lista.length + ' alumnos volvieron a rango cero' : quien + ' volvió a rango cero');
    cargarRevision();
  });
}

// Deja el XP de la semana de un alumno en un valor (0 = todo)
function txpQuitar(x, lunes) {
  const quien = x.nombre || x.apodo || x.email || 'este alumno';
  const o = document.createElement('div');
  o.className = 'ov';
  o.innerHTML = `<div class="mcard" style="max-width:460px;"><button class="mx" type="button" aria-label="Cerrar">✕</button>
    <div class="eyebrow">Revisar trampas</div>
    <h3>Quitar XP a ${esc(quien)}</h3>
    <p class="hint" style="margin:0 0 12px;">Tiene <b>${txpMil(x.xp)} XP</b> esta semana. Se le baja también el XP que tiene para canjear. Queda anotado quién lo hizo y por qué.</p>
    <label class="fld">Dejarle esta cantidad de XP <span class="hint">0 = se lo quitas todo</span></label>
    <input class="inp" id="txpNuevo" type="number" min="0" max="${x.xp}" value="0">
    <label class="fld">Motivo</label>
    <input class="inp" id="txpMotivo" maxlength="300" placeholder="Ej.: XP sin preguntas respondidas (script)">
    <div class="err" id="txpErr"></div>
    <div class="mfoot"><button type="button" class="btn-ghost" data-x>Cancelar</button><button type="button" class="btn-main" id="txpOk">Quitar XP</button></div>
  </div>`;
  document.body.appendChild(o); document.body.classList.add('modal-open');
  const cerrar = () => { o.remove(); document.body.classList.remove('modal-open'); };
  o.querySelector('.mx').addEventListener('click', cerrar); o.querySelector('[data-x]').addEventListener('click', cerrar);
  o.querySelector('#txpOk').addEventListener('click', async () => {
    const btn = o.querySelector('#txpOk'), err = o.querySelector('#txpErr');
    const nuevo = Math.max(0, Math.min(x.xp, parseInt(o.querySelector('#txpNuevo').value, 10) || 0));
    btn.disabled = true; btn.textContent = 'Quitando…'; err.style.display = 'none';
    const cliente = await MCAuth.listo;
    const r = await cliente.rpc('xp_ajustar', { p_usuario: x.usuario, p_dia: lunes, p_xp: nuevo, p_motivo: o.querySelector('#txpMotivo').value.trim() || null });
    if (r.error) { err.textContent = r.error.message || 'No se pudo.'; err.style.display = 'block'; btn.disabled = false; btn.textContent = 'Quitar XP'; return; }
    cerrar();
    toast('XP de ' + quien + ': ' + txpMil(r.data.antes) + ' → ' + txpMil(r.data.despues));
    cargarRevision();
  });
}

$('txpRev').addEventListener('click', () => {
  TXP.revisar = !TXP.revisar;
  $('txpRev').setAttribute('aria-pressed', String(TXP.revisar));
  $('txpRev').textContent = TXP.revisar ? '‹ Volver al Top' : 'Revisar trampas';
  cargarTopXp();
});
$('txpAnt').addEventListener('click', () => { const d = new Date(simLunes(TXP.dia) + 'T12:00:00'); d.setDate(d.getDate() - 7); TXP.dia = simIso(d); cargarTopXp(); });
$('txpSig').addEventListener('click', () => { const d = new Date(simLunes(TXP.dia) + 'T12:00:00'); d.setDate(d.getDate() + 7); TXP.dia = simIso(d); cargarTopXp(); });
