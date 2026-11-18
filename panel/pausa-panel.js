/* =========================================================
   Panel · Mantenimiento de la web
   Prende la pantalla "En mantenimiento / Actualizando" para todos
   los alumnos: primero ven un aviso con cuenta regresiva y luego la
   pantalla completa, sin poder tocar nada. Al apagarla sale
   "Parche completado" con la lista de lo que se agregó.
   Datos: Supabase, ajustes clave 'mantenimiento' (sin SQL nuevo).
   Extras: cerrar solo una parte, programar día y hora (se abre sola),
   avisar en el inicio desde antes y «Recargar a todos».
   La web: assets/mantenimiento.js. Solo administradores.
   ========================================================= */
const MNT = { v: null, timer: null };

(function estilosPausa() {
  const st = document.createElement('style');
  st.textContent = `
  .mnt-card { background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 18px; margin-bottom: 16px; }
  .mnt-card h3 { margin: 0 0 4px; font: 800 16px 'Sora', sans-serif; }
  .mnt-card > p { margin: 0 0 14px; font-size: 12.5px; color: var(--text-dim); line-height: 1.5; }
  .mnt-estado { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .mnt-luz { width: 54px; height: 54px; border-radius: 16px; display: grid; place-items: center; flex: 0 0 54px; }
  .mnt-luz svg { width: 30px; height: 30px; }
  .mnt-luz.off { background: rgba(198,224,0,.12); color: var(--accent); }
  .mnt-luz.on { background: rgba(255,170,60,.14); color: #FFB547; } .mnt-luz.on svg { animation: mntGiro 3s linear infinite; }
  @keyframes mntGiro { to { transform: rotate(360deg); } }
  .mnt-estado b { display: block; font: 900 18px Nunito, sans-serif; }
  .mnt-estado small { display: block; font-size: 13px; color: var(--text-dim); margin-top: 2px; }
  .mnt-reloj { margin-left: auto; font: 900 30px Nunito, sans-serif; color: #FFB547; font-variant-numeric: tabular-nums; }
  .mnt-op { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .mnt-op label { display: flex; gap: 10px; align-items: flex-start; border: 2px solid var(--border); border-radius: 14px; padding: 12px; cursor: pointer; }
  .mnt-op label:has(input:checked) { border-color: var(--accent); background: rgba(198,224,0,.06); }
  .mnt-op input { margin-top: 3px; accent-color: #C6E000; }
  .mnt-op b { display: block; font-size: 14px; } .mnt-op small { display: block; font-size: 12px; color: var(--text-dim); margin-top: 2px; }
  .mnt-fila { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
  .mnt-fila label, .mnt-lbl { display: block; font-size: 12.5px; color: var(--text-dim); font-weight: 700; margin-top: 14px; }
  .mnt-fila label { margin-top: 0; }
  .mnt-fila .inp, .mnt-card textarea.inp { margin-top: 6px; width: 100%; }
  .mnt-card textarea.inp { min-height: 74px; resize: vertical; font: inherit; }
  .mnt-pie { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 16px; align-items: center; }
  .mnt-rojo { background: #FFB547 !important; color: #2a1800 !important; box-shadow: 0 4px 0 #b97a1c !important; }
  .mnt-prev { display: flex; gap: 8px; flex-wrap: wrap; }
  .mnt-prev a { font-size: 12.5px; font-weight: 800; color: var(--accent); text-decoration: none; border: 1px solid var(--border); border-radius: 99px; padding: 6px 12px; }
  .mnt-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
  .mnt-chips label { display: inline-flex; align-items: center; gap: 7px; border: 2px solid var(--border); border-radius: 99px; padding: 7px 12px; font-size: 13px; font-weight: 800; cursor: pointer; }
  .mnt-chips label:has(input:checked) { border-color: var(--accent); color: var(--accent); background: rgba(198,224,0,.06); }
  .mnt-chips input { accent-color: #C6E000; margin: 0; }
  .mnt-chk { display: flex; gap: 10px; align-items: flex-start; margin-top: 14px; font-size: 13.5px; cursor: pointer; }
  .mnt-chk input { margin-top: 3px; accent-color: #C6E000; width: 16px; height: 16px; }
  .mnt-chk small { display: block; color: var(--text-dim); font-size: 12px; margin-top: 2px; }
  .mnt-sub { border-left: 3px solid var(--border); padding-left: 12px; margin-top: 10px; }
  .mnt-ghost { background: transparent; border: 2px solid var(--border); color: var(--text); border-radius: 12px; padding: 10px 14px; font: 800 13px Nunito, sans-serif; cursor: pointer; }
  .mnt-luz.prog { background: rgba(124,108,240,.15); color: #A99CFF; }
  .mnt-luz.rec { background: rgba(198,224,0,.12); color: var(--accent); }
  .mnt-flex { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; } .mnt-flex > div:not(.mnt-luz) { flex: 1; min-width: 200px; }
  .mnt-flex p { margin: 2px 0 0; font-size: 12.5px; color: var(--text-dim); line-height: 1.5; }
  input[type=datetime-local].inp { color-scheme: dark; }
  @media (max-width: 760px) { .mnt-op, .mnt-fila { grid-template-columns: 1fr; } .mnt-reloj { margin-left: 0; } }`;
  document.head.appendChild(st);
})();

const MNT_ICO_GEAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
const MNT_ICO_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16.5 9.5"/></svg>';

async function cargarPausa() {
  const caja = $('mntBody');
  caja.innerHTML = '<div class="loader">Cargando…</div>';
  try {
    const c = await MCAuth.listo;
    const r = await c.from('ajustes').select('valor').eq('clave', 'mantenimiento').maybeSingle();
    if (r.error) throw r.error;
    MNT.v = (r.data && r.data.valor) || { activo: false };
    pintarPausa();
  } catch (e) { caja.innerHTML = `<div class="state-msg error">${esc(e.message || 'No se pudo cargar.')}</div>`; }
}

function mntHora(iso) { try { return new Date(iso).toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } }
const mntPto = t => /\.$/.test(t) ? t : t + '.';
function mntDia(iso) {
  const d = new Date(iso), h = new Date(), m = new Date(); m.setDate(h.getDate() + 1);
  const dia = d.toDateString() === h.toDateString() ? 'hoy' : d.toDateString() === m.toDateString() ? 'mañana' : d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'short' });
  return dia + ' a las ' + mntHora(iso);
}
function mntFalta(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60);
  return h ? h + ' h ' + m + ' min' : Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
const MNT_PARTES = [['arcade', 'Arcade'], ['simulacro', 'Simulacro'], ['laboratorio', 'Laboratorio'], ['duelos', 'Duelos'], ['clanes', 'Clanes'], ['examenes', 'Exámenes'], ['cursos', 'Libros y cursos'], ['vocabulario', 'Vocabulario y Flashcards']];
const MNT_ICO_CAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/><path d="M12 13.5v3l2 1"/></svg>';
const MNT_ICO_REC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>';
function mntQue(v) {
  const ps = (v.secciones || []).map(k => (MNT_PARTES.find(p => p[0] === k) || [])[1]).filter(Boolean);
  return ps.length ? ps.join(', ') : 'Toda la web';
}
function mntParaInput(d) { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60e3); return z.toISOString().slice(0, 16); }

function pintarPausa() {
  clearInterval(MNT.timer);
  const v = MNT.v || {}, caja = $('mntBody'), base = '../index.html';
  const prev = `<div class="mnt-prev"><a href="${base}?mant=aviso" target="_blank" rel="noopener">Ver el aviso de 2 min</a><a href="${base}?mant=pantalla" target="_blank" rel="noopener">Ver la pantalla</a><a href="${base}?mant=pantalla&tipo=actualizacion" target="_blank" rel="noopener">Ver «Actualizando»</a><a href="${base}?mant=parche" target="_blank" rel="noopener">Ver «Parche completado»</a><a href="${base}?mant=programado" target="_blank" rel="noopener">Ver aviso en el inicio</a><a href="${base}?mant=pantalla&sec=arcade" target="_blank" rel="noopener">Ver solo Arcade cerrado</a><a href="${base}?mant=recarga" target="_blank" rel="noopener">Ver «Hay una versión nueva»</a></div>`;
  const rec = v.recarga;
  const recargaCard = `<div class="mnt-card"><div class="mnt-flex"><div class="mnt-luz rec">${MNT_ICO_REC}</div><div><h3>Recargar a todos</h3>
      <p>Úsalo después de publicar un cambio. A los alumnos que tienen la web abierta les sale «Hay una versión nueva» y la página se recarga sola en 10 s con lo nuevo. En un simulacro, duelo, minijuego o examen no se recarga sola: el alumno toca «Actualizar» cuando termina. Espera 1 o 2 minutos después de publicar antes de tocarlo.${rec && rec.fecha ? '<br><b>Última vez:</b> ' + esc(mntDia(rec.fecha)) : ''}</p></div>
      <button class="btn-main" id="mntRecargar" type="button">Recargar a todos</button></div></div>`;
  const estado = mntEstado(v);
  if (estado !== 'abierta') {
    const esAct = v.tipo === 'actualizacion', que = mntQue(v);
    const titulo = estado === 'programado' ? 'Programado: ' + (esAct ? 'actualización' : 'mantenimiento')
      : estado === 'termino' ? 'Terminó sola' : (esAct ? 'Actualización' : 'Mantenimiento') + ' en curso';
    const notas = (v.parche_auto && v.parche_auto.notas || []).join('\n');
    caja.innerHTML = `
      <div class="mnt-card"><div class="mnt-estado"><div class="mnt-luz ${estado === 'programado' ? 'prog' : estado === 'termino' ? 'off' : 'on'}">${estado === 'programado' ? MNT_ICO_CAL : estado === 'termino' ? MNT_ICO_OK : MNT_ICO_GEAR}</div>
        <div><b>${titulo}</b><small id="mntQue"></small><small>Se cierra: <strong style="color:var(--text)">${esc(que)}</strong>${v.anunciar ? ' · con aviso en el inicio' : ''}${v.hasta ? ' · se abre sola ' + esc(mntDia(v.hasta)) : ''}</small></div><div class="mnt-reloj" id="mntReloj"></div></div>
        ${estado === 'programado' ? '<div class="mnt-pie"><button class="mnt-ghost" id="mntCancelar" type="button">Cancelar lo programado</button></div>' : ''}</div>
      ${estado === 'programado' ? '' : `<div class="mnt-card"><h3>${estado === 'termino' ? 'Cerrar el aviso' : 'Terminar y abrir la web'}</h3>
        <p>${estado === 'termino' ? 'La web ya se abrió sola y los alumnos vieron «Parche completado». Puedes dejarlo así o tocar el botón para limpiar el estado.' : 'Escribe lo que se agregó o arregló, una cosa por línea. Los alumnos lo ven en la pantalla «Parche completado» al volver (y los que entren hasta 3 días después, una sola vez). Si lo dejas vacío solo dice que ya volvieron.'}</p>
        ${estado === 'termino' ? '' : `<label class="mnt-lbl" for="mntTitulo">Título (opcional)</label>
        <input class="inp" id="mntTitulo" maxlength="60" placeholder="Ej.: Parche de noviembre" style="margin-top:6px;width:100%" value="${esc(v.parche_auto && v.parche_auto.titulo || '')}">
        <label class="mnt-lbl" for="mntNotas">Lo nuevo</label>
        <textarea class="inp" id="mntNotas" maxlength="1200" placeholder="Nuevo minijuego en el Arcade&#10;Simulacro más rápido en celulares&#10;Arreglamos las fórmulas largas">${esc(notas)}</textarea>`}
        <div class="mnt-pie"><button class="btn-main" id="mntApagar" type="button">${estado === 'termino' ? 'Listo' : 'Terminar y abrir la web'}</button></div></div>`}
      ${recargaCard}
      <div class="mnt-card"><h3>Vista previa</h3><p>Ábrelas en otra pestaña para ver cómo lo ven los alumnos (no cambia nada).</p>${prev}</div>`;
    const tic = () => {
      const q = $('mntQue'), rl = $('mntReloj'); if (!q) return clearInterval(MNT.timer);
      const ahora = Date.now(), desde = new Date(v.desde).getTime(), empieza = desde - (Number(v.aviso) || 0) * 1000;
      if (mntEstado(v) !== estado) { clearInterval(MNT.timer); pintarPausa(); return; }
      if (estado === 'programado') {
        q.textContent = mntPto('Empieza ' + mntDia(v.desde)) + ((Number(v.aviso) || 0) ? ' El aviso de cuenta regresiva sale ' + (v.aviso / 60) + ' min antes.' : '');
        rl.textContent = mntFalta(empieza - ahora);
      } else if (estado === 'termino') {
        q.textContent = 'Se abrió sola ' + mntDia(v.hasta); rl.textContent = '';
      } else if (ahora < desde) {
        q.textContent = 'Los alumnos están viendo el aviso. La pantalla sale a las ' + mntHora(v.desde).replace(/\.$/, '') + '.';
        rl.textContent = mntFalta(desde - ahora);
      } else {
        q.textContent = 'Cerrada para los alumnos desde las ' + mntHora(v.desde).replace(/\.$/, '') + (v.vuelve ? ' · vuelve aprox. a las ' + mntHora(v.vuelve).replace(/\.$/, '') : '') + '. Tú sí puedes entrar.';
        rl.textContent = v.hasta ? mntFalta(new Date(v.hasta) - ahora) : '';
      }
    };
    tic(); MNT.timer = setInterval(tic, 1000);
    if ($('mntApagar')) $('mntApagar').addEventListener('click', () => apagarPausa(estado === 'termino'));
    if ($('mntCancelar')) $('mntCancelar').addEventListener('click', cancelarPausa);
    $('mntRecargar').addEventListener('click', recargarTodos);
    return;
  }
  const p = v.parche;
  const ahoraMas = mntParaInput(new Date(Date.now() + 3600e3));
  caja.innerHTML = `
    <div class="mnt-card"><div class="mnt-estado"><div class="mnt-luz off">${MNT_ICO_OK}</div>
      <div><b>La web está abierta</b><small>${p && p.fecha ? 'Último parche: ' + esc(new Date(p.fecha).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })) : 'Los alumnos usan la web con normalidad.'}</small></div></div></div>
    <div class="mnt-card"><h3>Poner en mantenimiento</h3>
      <p>Los alumnos que estén dentro ven un aviso con cuenta regresiva para que terminen lo que hacen. Al llegar a cero sale la pantalla completa y no pueden tocar nada. Tú y los administradores sí pueden entrar.</p>
      <div class="mnt-op">
        <label><input type="radio" name="mntTipo" value="mantenimiento" checked><span><b>Mantenimiento</b><small>«Volvemos en un ratito»</small></span></label>
        <label><input type="radio" name="mntTipo" value="actualizacion"><span><b>Actualización</b><small>«Estamos actualizando la web»</small></span></label>
      </div>
      <div class="mnt-lbl">¿Qué se cierra?</div>
      <div class="mnt-chips" id="mntPartes"><label><input type="checkbox" value="" checked> Toda la web</label>${MNT_PARTES.map(([k, n]) => `<label><input type="checkbox" value="${k}"> ${n}</label>`).join('')}</div>
      <div class="mnt-lbl">¿Cuándo?</div>
      <div class="mnt-op" style="margin-top:8px">
        <label><input type="radio" name="mntCuando" value="ahora" checked><span><b>Ahora</b><small>Con el aviso de abajo</small></span></label>
        <label><input type="radio" name="mntCuando" value="prog"><span><b>Programar</b><small>Elige día y hora</small></span></label>
      </div>
      <div class="mnt-sub" id="mntProg" hidden>
        <label class="mnt-lbl" for="mntDesde" style="margin-top:4px">Empieza</label>
        <input class="inp" type="datetime-local" id="mntDesde" value="${ahoraMas}" style="margin-top:6px;width:100%">
        <label class="mnt-chk"><input type="checkbox" id="mntAnunciar" checked><span><b>Avisar en el inicio desde antes</b><small>Una franja en el inicio desde 24 h antes: «Hoy a las 11 p. m. habrá mantenimiento de 30 min».</small></span></label>
      </div>
      <div class="mnt-fila">
        <label>Aviso antes de cerrar<select class="inp" id="mntAviso"><option value="0">Al instante</option><option value="60">1 minuto</option><option value="120" selected>2 minutos</option><option value="300">5 minutos</option></select></label>
        <label>Dura aprox.<select class="inp" id="mntVuelve"><option value="">Sin hora</option><option value="15">15 minutos</option><option value="30" selected>30 minutos</option><option value="60">1 hora</option><option value="120">2 horas</option><option value="240">4 horas</option></select></label>
      </div>
      <label class="mnt-chk"><input type="checkbox" id="mntSola"><span><b>Abrir la web sola al terminar ese tiempo</b><small>No tienes que volver al panel: a la hora se abre y sale «Parche completado».</small></span></label>
      <div class="mnt-sub" id="mntSolaBox" hidden>
        <label class="mnt-lbl" for="mntTituloA" style="margin-top:4px">Título del parche (opcional)</label>
        <input class="inp" id="mntTituloA" maxlength="60" placeholder="Ej.: Parche de noviembre" style="margin-top:6px;width:100%">
        <label class="mnt-lbl" for="mntNotasA">Lo nuevo (una cosa por línea)</label>
        <textarea class="inp" id="mntNotasA" maxlength="1200" placeholder="Nuevo minijuego en el Arcade&#10;Simulacro más rápido en celulares"></textarea>
      </div>
      <label class="mnt-lbl" for="mntMsg">Mensaje para los alumnos (opcional)</label>
      <textarea class="inp" id="mntMsg" maxlength="240" placeholder="Si lo dejas vacío sale el mensaje de siempre."></textarea>
      <div class="mnt-pie"><button class="btn-main mnt-rojo" id="mntPrender" type="button">Activar mantenimiento</button></div></div>
    ${recargaCard}
    <div class="mnt-card"><h3>Vista previa</h3><p>Ábrelas en otra pestaña para ver cómo lo ven los alumnos (no cambia nada).</p>${prev}</div>`;
  // Toda la web y las partes se excluyen entre sí
  const chips = [...$('mntPartes').querySelectorAll('input')];
  chips.forEach(c => c.addEventListener('change', () => {
    if (c.value === '' && c.checked) chips.forEach(x => { if (x.value) x.checked = false; });
    if (c.value && c.checked) chips[0].checked = false;
    if (!chips.some(x => x.checked)) chips[0].checked = true;
  }));
  const pintarBoton = () => {
    const prog = document.querySelector('input[name="mntCuando"]:checked').value === 'prog';
    $('mntProg').hidden = !prog;
    $('mntSolaBox').hidden = !$('mntSola').checked;
    $('mntPrender').textContent = prog ? 'Programar mantenimiento' : 'Activar mantenimiento';
  };
  document.querySelectorAll('input[name="mntCuando"]').forEach(r => r.addEventListener('change', pintarBoton));
  $('mntSola').addEventListener('change', pintarBoton);
  $('mntVuelve').addEventListener('change', () => { if (!$('mntVuelve').value) { $('mntSola').checked = false; pintarBoton(); } });
  $('mntPrender').addEventListener('click', prenderPausa);
  $('mntRecargar').addEventListener('click', recargarTodos);
}

// abierta | programado | aviso/cerrada (en curso) | termino (se abrió sola)
function mntEstado(v) {
  if (!v || !v.activo) return 'abierta';
  const ahora = Date.now();
  if (v.hasta && ahora >= new Date(v.hasta).getTime()) return 'termino';
  if (ahora < new Date(v.desde).getTime() - (Number(v.aviso) || 0) * 1000) return 'programado';
  return 'curso';
}

// Lee lo último antes de guardar, para no pisar lo que cambió otra pestaña
async function guardarPausa(cambiar, boton, texto) {
  boton.disabled = true; boton.innerHTML = '<span class="spin-s"></span> Guardando…';
  const c = await MCAuth.listo;
  const r0 = await c.from('ajustes').select('valor').eq('clave', 'mantenimiento').maybeSingle();
  const actual = (r0.data && r0.data.valor) || {};
  const valor = cambiar(actual);
  const r = await c.rpc('guardar_ajuste', { p_clave: 'mantenimiento', p_valor: valor });
  if (r.error) { boton.disabled = false; boton.textContent = texto; toast(r.error.message || 'No se pudo guardar.', true); return false; }
  MNT.v = valor; pintarPausa(); return true;
}
const mntLineas = t => t.split('\n').map(s => s.replace(/^\s*[-•*]\s*/, '').trim()).filter(Boolean).slice(0, 12);

async function prenderPausa() {
  const tipo = document.querySelector('input[name="mntTipo"]:checked').value;
  const prog = document.querySelector('input[name="mntCuando"]:checked').value === 'prog';
  const aviso = Number($('mntAviso').value) || 0, durMin = Number($('mntVuelve').value) || 0;
  const secciones = [...$('mntPartes').querySelectorAll('input:checked')].map(x => x.value).filter(Boolean);
  let desde;
  if (prog) {
    const d = new Date($('mntDesde').value);
    if (isNaN(d)) return toast('Elige el día y la hora en que empieza.', true);
    if (d.getTime() < Date.now() + aviso * 1000) return toast('Esa hora ya pasó o está muy cerca. Elige una más tarde o usa «Ahora».', true);
    desde = d.getTime();
  } else desde = Date.now() + aviso * 1000;
  const sola = $('mntSola').checked && durMin > 0;
  const vuelve = durMin ? new Date(desde + durMin * 60e3).toISOString() : null;
  const ok = await guardarPausa(a => ({
    activo: true, tipo, aviso, secciones: secciones.length ? secciones : null,
    desde: new Date(desde).toISOString(), vuelve,
    hasta: sola ? vuelve : null,
    anunciar: prog && $('mntAnunciar').checked,
    parche_auto: sola ? { titulo: $('mntTituloA').value.trim() || null, notas: mntLineas($('mntNotasA').value) } : null,
    mensaje: $('mntMsg').value.trim() || null,
    parche: a.parche || null, recarga: a.recarga || null
  }), $('mntPrender'), prog ? 'Programar mantenimiento' : 'Activar mantenimiento');
  if (ok) toast(prog ? mntPto('Listo: programado para ' + mntDia(new Date(desde).toISOString())) : aviso ? 'Listo: los alumnos ya ven el aviso con la cuenta regresiva.' : 'Listo: se cerró para los alumnos.');
}

async function apagarPausa(yaTermino) {
  const v = MNT.v || {};
  // Si se abrió sola, se guarda el mismo parche que ya vieron (mismo id: no lo vuelven a ver)
  const parche = yaTermino
    ? { id: 'auto-' + v.desde, fecha: v.hasta, titulo: v.parche_auto && v.parche_auto.titulo || null, notas: v.parche_auto && v.parche_auto.notas || [] }
    : { id: String(Date.now()), fecha: new Date().toISOString(), titulo: $('mntTitulo').value.trim() || null, notas: mntLineas($('mntNotas').value) };
  const ok = await guardarPausa(a => ({ activo: false, parche, recarga: a.recarga || null }), $('mntApagar'), yaTermino ? 'Listo' : 'Terminar y abrir la web');
  if (ok) toast(yaTermino ? 'Listo.' : 'Web abierta. Los alumnos ven «Parche completado» y vuelven a entrar.');
}

async function cancelarPausa() {
  const ok = await guardarPausa(a => ({ activo: false, parche: a.parche || null, recarga: a.recarga || null }), $('mntCancelar'), 'Cancelar lo programado');
  if (ok) toast('Cancelado. No se cerrará nada.');
}

async function recargarTodos() {
  const ok = await guardarPausa(a => Object.assign({}, a, { recarga: { id: String(Date.now()), fecha: new Date().toISOString() } }), $('mntRecargar'), 'Recargar a todos');
  if (ok) toast('Listo: las pestañas abiertas se recargan con lo nuevo (en menos de 2 min).');
}
