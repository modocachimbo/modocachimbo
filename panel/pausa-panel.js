/* =========================================================
   Panel · Mantenimiento de la web
   Prende la pantalla "En mantenimiento / Actualizando" para todos
   los alumnos: primero ven un aviso con cuenta regresiva y luego la
   pantalla completa, sin poder tocar nada. Al apagarla sale
   "Parche completado" con la lista de lo que se agregó.
   Datos: Supabase, ajustes clave 'mantenimiento' (sin SQL nuevo).
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

function pintarPausa() {
  clearInterval(MNT.timer);
  const v = MNT.v || {}, caja = $('mntBody'), base = '../index.html';
  const prev = `<div class="mnt-prev"><a href="${base}?mant=aviso" target="_blank" rel="noopener">Ver el aviso de 2 min</a><a href="${base}?mant=pantalla" target="_blank" rel="noopener">Ver la pantalla</a><a href="${base}?mant=pantalla&tipo=actualizacion" target="_blank" rel="noopener">Ver «Actualizando»</a><a href="${base}?mant=parche" target="_blank" rel="noopener">Ver «Parche completado»</a></div>`;
  if (v.activo) {
    const esAct = v.tipo === 'actualizacion';
    caja.innerHTML = `
      <div class="mnt-card"><div class="mnt-estado"><div class="mnt-luz on">${MNT_ICO_GEAR}</div>
        <div><b>${esAct ? 'Actualización' : 'Mantenimiento'} en curso</b><small id="mntQue"></small></div><div class="mnt-reloj" id="mntReloj"></div></div></div>
      <div class="mnt-card"><h3>Terminar y abrir la web</h3>
        <p>Escribe lo que se agregó o arregló, una cosa por línea. Los alumnos lo ven en la pantalla «Parche completado» al volver (y los que entren hasta 3 días después, una sola vez). Si lo dejas vacío solo dice que ya volvieron.</p>
        <label class="mnt-lbl" for="mntTitulo">Título (opcional)</label>
        <input class="inp" id="mntTitulo" maxlength="60" placeholder="Ej.: Parche de noviembre" style="margin-top:6px;width:100%">
        <label class="mnt-lbl" for="mntNotas">Lo nuevo</label>
        <textarea class="inp" id="mntNotas" maxlength="1200" placeholder="Nuevo minijuego en el Arcade&#10;Simulacro más rápido en celulares&#10;Arreglamos las fórmulas largas"></textarea>
        <div class="mnt-pie"><button class="btn-main" id="mntApagar" type="button">Terminar y abrir la web</button></div></div>
      <div class="mnt-card"><h3>Vista previa</h3><p>Ábrelas en otra pestaña para ver cómo lo ven los alumnos (no cambia nada).</p>${prev}</div>`;
    const tic = () => {
      const ms = new Date(v.desde) - Date.now();
      const q = $('mntQue'), rl = $('mntReloj'); if (!q) return clearInterval(MNT.timer);
      if (ms > 0) {
        const s = Math.ceil(ms / 1000);
        q.textContent = 'Los alumnos están viendo el aviso. La pantalla sale a las ' + mntHora(v.desde).replace(/\.$/, '') + '.';
        rl.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
      } else {
        q.textContent = 'La web está cerrada para los alumnos desde las ' + mntHora(v.desde) + (v.vuelve ? ' · dijiste que vuelve aprox. a las ' + mntHora(v.vuelve) : '') + '. Tú sí puedes entrar.';
        rl.textContent = '';
      }
    };
    tic(); MNT.timer = setInterval(tic, 1000);
    $('mntApagar').addEventListener('click', apagarPausa);
    return;
  }
  const p = v.parche;
  caja.innerHTML = `
    <div class="mnt-card"><div class="mnt-estado"><div class="mnt-luz off">${MNT_ICO_OK}</div>
      <div><b>La web está abierta</b><small>${p && p.fecha ? 'Último parche: ' + esc(new Date(p.fecha).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })) : 'Los alumnos usan la web con normalidad.'}</small></div></div></div>
    <div class="mnt-card"><h3>Poner la web en mantenimiento</h3>
      <p>Todos los alumnos que estén dentro ven un aviso con cuenta regresiva para que terminen lo que hacen. Al llegar a cero sale la pantalla completa y no pueden tocar nada. Tú y los administradores sí pueden entrar.</p>
      <div class="mnt-op">
        <label><input type="radio" name="mntTipo" value="mantenimiento" checked><span><b>Mantenimiento</b><small>«Volvemos en un ratito»</small></span></label>
        <label><input type="radio" name="mntTipo" value="actualizacion"><span><b>Actualización</b><small>«Estamos actualizando la web»</small></span></label>
      </div>
      <div class="mnt-fila">
        <label>Aviso antes de cerrar<select class="inp" id="mntAviso"><option value="0">Al instante</option><option value="60">1 minuto</option><option value="120" selected>2 minutos</option><option value="300">5 minutos</option></select></label>
        <label>Vuelve aprox. en<select class="inp" id="mntVuelve"><option value="">Sin hora</option><option value="15">15 minutos</option><option value="30" selected>30 minutos</option><option value="60">1 hora</option><option value="120">2 horas</option></select></label>
      </div>
      <label class="mnt-lbl" for="mntMsg">Mensaje para los alumnos (opcional)</label>
      <textarea class="inp" id="mntMsg" maxlength="240" placeholder="Si lo dejas vacío sale el mensaje de siempre."></textarea>
      <div class="mnt-pie"><button class="btn-main mnt-rojo" id="mntPrender" type="button">Activar mantenimiento</button></div></div>
    <div class="mnt-card"><h3>Vista previa</h3><p>Ábrelas en otra pestaña para ver cómo lo ven los alumnos (no cambia nada).</p>${prev}</div>`;
  $('mntPrender').addEventListener('click', prenderPausa);
}

async function guardarPausa(valor, boton, texto) {
  boton.disabled = true; boton.innerHTML = '<span class="spin-s"></span> Guardando…';
  const r = await (await MCAuth.listo).rpc('guardar_ajuste', { p_clave: 'mantenimiento', p_valor: valor });
  if (r.error) { boton.disabled = false; boton.textContent = texto; toast(r.error.message || 'No se pudo guardar.', true); return false; }
  MNT.v = valor; pintarPausa(); return true;
}

async function prenderPausa() {
  const tipo = document.querySelector('input[name="mntTipo"]:checked').value;
  const aviso = Number($('mntAviso').value) || 0, vuelveMin = Number($('mntVuelve').value) || 0;
  const ahora = Date.now();
  const v = {
    activo: true, tipo, aviso,
    desde: new Date(ahora + aviso * 1000).toISOString(),
    vuelve: vuelveMin ? new Date(ahora + aviso * 1000 + vuelveMin * 60e3).toISOString() : null,
    mensaje: $('mntMsg').value.trim() || null,
    parche: (MNT.v && MNT.v.parche) || null
  };
  if (await guardarPausa(v, $('mntPrender'), 'Activar mantenimiento'))
    toast(aviso ? 'Listo: los alumnos ya ven el aviso con la cuenta regresiva.' : 'Listo: la web se cierra para los alumnos.');
}

async function apagarPausa() {
  const notas = $('mntNotas').value.split('\n').map(s => s.replace(/^\s*[-•*]\s*/, '').trim()).filter(Boolean).slice(0, 12);
  const v = {
    activo: false,
    parche: { id: String(Date.now()), fecha: new Date().toISOString(), titulo: $('mntTitulo').value.trim() || null, notas }
  };
  if (await guardarPausa(v, $('mntApagar'), 'Terminar y abrir la web'))
    toast('Web abierta. Los alumnos ven «Parche completado» y vuelven a entrar.');
}
