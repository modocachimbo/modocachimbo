/* =========================================================
   Panel · Descargas PDF
   - Prender o apagar las descargas (apagadas: el botón no se ve en la web)
   - Abierto para todos (sin código) o solo con el paquete descarga-VIP (TODO-VIP no lo incluye)
   - Qué se puede descargar, ficha óptica y límites por día y por mes
   - Historial con buscador por N.º, correo, apodo o título
   - Bloquear o desbloquear a un alumno
   Los códigos de descarga se crean en Panel → Códigos (botón «Código Descargas PDF»).
   Datos: supabase/53-descargas-pdf.sql y 54-descarga-aparte.sql
   ========================================================= */
const DSC = { datos: null, q: '' };
const DSC_TIPOS = [
  ['libro', 'Libros'], ['seminario', 'Seminarios'], ['banqueo', 'Banqueo'], ['fijas', 'Fijas'], ['falladas', 'Mis falladas'],
  ['simulacro', 'Simulacro'], ['examen', 'Exámenes'], ['vocabulario', 'Vocabulario'], ['tarjetas', 'Flashcards']
];

(function estilosDescargas() {
  const st = document.createElement('style');
  st.textContent = `
  .dsc-res { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 16px; }
  .dsc-res div { border: 2px solid #2C2549; border-bottom-width: 4px; border-radius: 14px; padding: 10px 14px; background: var(--surface); font-size: 12.5px; color: var(--text-dim); }
  .dsc-res b { display: block; font: 900 22px Nunito, sans-serif; color: var(--text); }
  .dsc-card { background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 18px; margin-bottom: 16px; }
  .dsc-card h3 { margin: 0 0 4px; font: 800 16px 'Sora', sans-serif; }
  .dsc-card > p { margin: 0 0 14px; font-size: 12.5px; color: var(--text-dim); line-height: 1.5; }
  .dsc-sw { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 12px 0; border-top: 1px solid var(--border); }
  .dsc-sw:first-of-type { border-top: 0; }
  .dsc-sw b { display: block; font-size: 14px; }
  .dsc-sw small { display: block; font-size: 12px; color: var(--text-dim); margin-top: 2px; line-height: 1.4; }
  .dsc-sw .sw span { width: 44px; height: 24px; } .dsc-sw .sw span::after { width: 20px; height: 20px; } .dsc-sw .sw input:checked + span::after { left: 22px; }
  .dsc-lim { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 6px; }
  .dsc-lim label { font-size: 12.5px; color: var(--text-dim); font-weight: 700; }
  .dsc-lim .inp { margin-top: 6px; }
  .dsc-tipos { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
  .dsc-pie { display: flex; align-items: center; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
  .dsc-estado { display: inline-flex; align-items: center; gap: 8px; font: 800 12.5px Nunito, sans-serif; padding: 5px 12px; border-radius: 99px; }
  .dsc-estado.on { background: rgba(198,224,0,.12); color: var(--accent); } .dsc-estado.off { background: rgba(255,138,138,.1); color: var(--red); }
  .dsc-estado i { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
  .dsc-buscar { display: flex; gap: 8px; margin-bottom: 12px; } .dsc-buscar .inp { flex: 1; }
  .dsc-num { font: 800 13px ui-monospace, Consolas, monospace; letter-spacing: .04em; color: var(--accent); white-space: nowrap; }
  .dsc-tipo { display: inline-block; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 99px; background: #241E3E; color: var(--text-dim); white-space: nowrap; }
  .dsc-bloq { color: var(--red); font-size: 11.5px; font-weight: 800; }
  .dsc-top li { display: flex; justify-content: space-between; gap: 10px; padding: 8px 0; border-top: 1px solid var(--border); font-size: 13px; } .dsc-top li:first-child { border-top: 0; }
  .dsc-top ul { list-style: none; margin: 0; padding: 0; }
  .dsc-dos { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 760px) {
    .dsc-res { grid-template-columns: 1fr 1fr; } .dsc-dos { grid-template-columns: 1fr; } .dsc-lim { grid-template-columns: 1fr; }
    .dsc-tabla thead { display: none; }
    .dsc-tabla, .dsc-tabla tbody, .dsc-tabla tr, .dsc-tabla td { display: block; width: 100%; }
    .al-tabla.dsc-tabla { min-width: 0; }
    .dsc-tabla tr { border: 1px solid var(--border); border-radius: 14px; padding: 8px 4px; margin-bottom: 8px; }
    .dsc-tabla td { border: 0 !important; padding: 3px 10px !important; }
  }`;
  document.head.appendChild(st);
})();

const dscMil = n => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const dscFecha = t => { const d = new Date(t); return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }); };

async function cargarDescargas() {
  // Quien entra aquí ve el botón de descarga en la web aunque esté apagado (para probarlo)
  try { localStorage.setItem('mc_desc_equipo', '1'); } catch (e) {}
  const caja = $('dscCuerpo');
  caja.innerHTML = '<div class="loader">Cargando…</div>';
  let cliente;
  try { cliente = await MCAuth.listo; } catch (e) { caja.innerHTML = '<div class="state-msg error">No se pudo conectar con Supabase. Revisa tu internet.</div>'; return; }
  if (!MCAuth.usuario()) { caja.innerHTML = '<div class="state-msg">Entra con tu cuenta de administrador.</div>'; return; }
  const [r, h] = await Promise.all([cliente.rpc('descargas_resumen'), cliente.rpc('descargas_buscar', { p_q: DSC.q || null, p_limite: 100 })]);
  if (r.error) {
    caja.innerHTML = /no autorizado/i.test(r.error.message || '')
      ? '<div class="state-msg error">Tu cuenta no tiene permiso para ver las descargas.</div>'
      : `<div class="state-msg error">${esc(r.error.message || 'No se pudo cargar.')}<br>¿Ya corriste el archivo supabase/53-descargas-pdf.sql?</div>`;
    return;
  }
  DSC.datos = r.data;
  pintarDescargas(h.data || []);
}

function pintarDescargas(filas) {
  const d = DSC.datos, c = d.cfg || {}, tipos = c.tipos || {};
  const sw = (id, on, tit, sub) => `<div class="dsc-sw"><div><b>${tit}</b><small>${sub}</small></div><label class="sw"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><span></span></label></div>`;
  const porTipo = d.por_tipo || {};
  $('dscCuerpo').innerHTML = `
    <div class="dsc-res">
      <div><b>${dscMil(d.hoy)}</b>descargas hoy</div>
      <div><b>${dscMil(d.semana)}</b>en 7 días</div>
      <div><b>${dscMil(d.alumnos_semana)}</b>alumnos en 7 días</div>
      <div><b>${dscMil(d.total)}</b>en total</div>
    </div>
    <div class="dsc-card">
      <h3>Ajustes</h3>
      <p>Lo que cambies aquí les llega a los alumnos en unos minutos. Tú (y el equipo con permiso) ven el botón aunque esté apagado, para probarlo.</p>
      ${sw('dscActivo', c.activo, 'Descargas prendidas', 'Apagadas: el botón PDF desaparece de toda la web.')}
      ${sw('dscAbierto', c.abierto, 'Abierto para todos', 'Cualquier alumno con su cuenta de Google puede descargar, sin código. Apagado: solo con el paquete Descargas PDF (descarga-VIP). El Acceso total no lo incluye: se vende aparte.')}
      ${sw('dscFicha', c.ficha !== false, 'Ficha óptica OptiCheck', 'Ofrece la hoja horizontal de respuestas para calificar con OptiCheck.')}
      <div class="dsc-sw" style="display:block"><b>Qué se puede descargar</b><small>Toca para prender o apagar cada sección.</small>
        <div class="dsc-tipos">${DSC_TIPOS.map(([k, n]) => `<button type="button" class="chip ${tipos[k] !== false ? 'on' : ''}" data-t="${k}">${n}${porTipo[k] ? ` <span class="c">${dscMil(porTipo[k])}</span>` : ''}</button>`).join('')}</div>
        <small style="margin-top:6px">El número es cuántas veces se descargó en los últimos 30 días.</small></div>
      <div class="dsc-sw" style="display:block"><b>Límites por alumno</b><small>0 = sin límite. El equipo no tiene límite.</small>
        <div class="dsc-lim"><label>Por día<input class="inp" type="number" min="0" max="500" id="dscDia" value="${Number(c.limite_dia ?? 10)}"></label>
        <label>Por mes<input class="inp" type="number" min="0" max="5000" id="dscMes" value="${Number(c.limite_mes ?? 0)}"></label></div></div>
      <div class="dsc-pie"><button class="btn-main" type="button" id="dscGuardar">Guardar ajustes</button>
        <span class="dsc-estado ${c.activo ? 'on' : 'off'}"><i></i>${c.activo ? (c.abierto ? 'Prendido · abierto para todos' : 'Prendido · con código') : 'Apagado'}</span></div>
    </div>
    <div class="dsc-card">
      <h3>Buscar una descarga</h3>
      <p>Si encuentras un PDF compartido, busca el N.º que sale al pie de cada hoja (MC-XXXX-XXXX) y sabrás quién lo descargó. También puedes buscar por correo, apodo o título.</p>
      <div class="dsc-buscar"><input class="inp" id="dscQ" placeholder="MC-7F3K-29QD, correo, apodo o título" value="${esc(DSC.q)}"><button class="btn-ghost" type="button" id="dscIr">Buscar</button></div>
      ${filas.length ? `<div class="al-tabla-wrap"><table class="al-tabla dsc-tabla"><thead><tr><th>Fecha</th><th>N.º</th><th>Alumno</th><th>Qué</th><th>Equipo</th><th></th></tr></thead><tbody>
        ${filas.map((x, i) => `<tr><td style="white-space:nowrap">${dscFecha(x.creado)}</td><td><span class="dsc-num">${esc(x.num)}</span></td>
          <td><div class="al-quien"><div><b>${esc(x.apodo || '—')}</b><small>${esc(x.email || '')}</small>${x.bloqueado ? '<span class="dsc-bloq">Bloqueado</span>' : ''}</div></div></td>
          <td><span class="dsc-tipo">${esc((DSC_TIPOS.find(t => t[0] === x.tipo) || [0, x.tipo])[1])}</span> ${esc(x.titulo || '')}</td>
          <td style="color:var(--text-dim);font-size:12px">${esc(x.equipo || '')}</td>
          <td><button type="button" class="btn-ghost" data-b="${i}">${x.bloqueado ? 'Desbloquear' : 'Bloquear'}</button></td></tr>`).join('')}
      </tbody></table></div>${filas.length >= 100 ? '<p class="hint">Se muestran las 100 más recientes. Busca para ver otras.</p>' : ''}`
      : `<div class="state-msg">${DSC.q ? 'No hay descargas con ese dato.' : 'Todavía nadie descargó nada.'}</div>`}
    </div>
    <div class="dsc-dos">
      <div class="dsc-card dsc-top"><h3>Los que más descargan (7 días)</h3><p>Para notar si alguien descarga de más.</p>
        ${(d.top || []).length ? '<ul>' + d.top.map(t => `<li><span><b>${esc(t.apodo || '—')}</b> <small style="color:var(--text-dim)">${esc(t.email || '')}</small></span><b>${dscMil(t.n)}</b></li>`).join('') + '</ul>' : '<div class="hint">Nadie todavía.</div>'}</div>
      <div class="dsc-card dsc-top"><h3>Bloqueados</h3><p>No pueden descargar aunque tengan código.</p>
        ${(d.bloqueados || []).length ? '<ul>' + d.bloqueados.map((b, i) => `<li><span><b>${esc(b.email || '')}</b><br><small style="color:var(--text-dim)">${esc(b.motivo || 'Sin motivo')} · ${esc(b.por || '')}</small></span><button type="button" class="btn-ghost" data-d="${i}">Desbloquear</button></li>`).join('') + '</ul>' : '<div class="hint">Nadie bloqueado.</div>'}</div>
    </div>`;

  $('dscCuerpo').querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => b.classList.toggle('on')));
  $('dscGuardar').addEventListener('click', guardarDescargas);  const buscar = () => { DSC.q = $('dscQ').value.trim(); cargarDescargas(); };
  $('dscIr').addEventListener('click', buscar);
  $('dscQ').addEventListener('keydown', e => { if (e.key === 'Enter') buscar(); });
  $('dscCuerpo').querySelectorAll('[data-b]').forEach(b => b.addEventListener('click', () => { const x = filas[+b.dataset.b]; bloquearDescargas(x.usuario, x.email, !x.bloqueado); }));
  $('dscCuerpo').querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => { const x = d.bloqueados[+b.dataset.d]; bloquearDescargas(x.usuario, x.email, false); }));
}

async function guardarDescargas() {
  const btn = $('dscGuardar'); btn.disabled = true; btn.textContent = 'Guardando…';
  const tipos = {}; $('dscCuerpo').querySelectorAll('[data-t]').forEach(b => { tipos[b.dataset.t] = b.classList.contains('on'); });
  const p = { activo: $('dscActivo').checked, abierto: $('dscAbierto').checked, ficha: $('dscFicha').checked,
    limite_dia: Math.max(0, parseInt($('dscDia').value, 10) || 0), limite_mes: Math.max(0, parseInt($('dscMes').value, 10) || 0), tipos };
  const r = await (await MCAuth.listo).rpc('descargas_guardar', { p });
  btn.disabled = false; btn.textContent = 'Guardar ajustes';
  if (r.error) { toast(r.error.message || 'No se pudo guardar', true); return; }
  // Que la web de este equipo vea el cambio al instante
  try { localStorage.removeItem('mc_desc_cfg'); } catch (e) {}
  toast(p.activo ? 'Descargas prendidas' : 'Descargas apagadas: el botón ya no se ve');
  cargarDescargas();
}

function bloquearDescargas(usuario, email, bloquear) {
  if (!bloquear) return hacer('');
  const o = document.createElement('div'); o.className = 'ov';
  o.innerHTML = `<div class="mcard" style="max-width:440px;"><button class="mx" type="button" aria-label="Cerrar">✕</button>
    <div class="eyebrow">Descargas PDF</div><h3>Bloquear a ${esc(email || 'este alumno')}</h3>
    <p class="hint" style="margin:0 0 12px;">No podrá descargar más PDF, aunque tenga código. Lo que ya descargó no se borra. Puedes desbloquearlo cuando quieras.</p>
    <label class="fld">Motivo</label><input class="inp" id="dscMot" maxlength="300" placeholder="Ej.: compartió su PDF en un grupo">
    <div class="mfoot"><button type="button" class="btn-ghost" data-x>Cancelar</button><button type="button" class="btn-main" id="dscOk">Bloquear</button></div></div>`;
  document.body.appendChild(o); document.body.classList.add('modal-open');
  const cerrar = () => { o.remove(); document.body.classList.remove('modal-open'); };
  o.querySelector('.mx').addEventListener('click', cerrar); o.querySelector('[data-x]').addEventListener('click', cerrar);
  o.querySelector('#dscOk').addEventListener('click', () => { const m = o.querySelector('#dscMot').value.trim(); cerrar(); hacer(m); });
  async function hacer(motivo) {
    const r = await (await MCAuth.listo).rpc('descargas_bloquear', { p_usuario: usuario, p_bloquear: bloquear, p_motivo: motivo || null });
    if (r.error) { toast(r.error.message || 'No se pudo', true); return; }
    toast(bloquear ? 'Bloqueado: ya no puede descargar' : 'Desbloqueado');
    cargarDescargas();
  }
}
