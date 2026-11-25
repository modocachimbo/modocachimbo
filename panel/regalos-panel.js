/* =========================================================
   Panel · Regalos
   Un admin o un ayudante con el permiso «Regalos» le da a un alumno,
   por su ID de 5 dígitos (el de su tarjeta de jugador):
   - Corazones extra: se suman a sus 5, no se pierden a medianoche.
   - Corazones infinitos por un tiempo.
   - XP: se suma a su XP de la semana (sube rango y nivel) y a su saldo para canjear.
   - Un ítem de Mi colección subido en Recursos.
   El alumno ve un aviso con la nota la próxima vez que entra.
   Datos: supabase/43-ayudantes-regalos.sql (regalo_buscar, regalar).
   Grupo VIP: una lista de IDs guardada para darles a todos el mismo
   regalo de una vez (supabase/93-grupo-vip.sql: grupo_regalo_ver,
   grupo_regalo_guardar, grupo_regalo_dar).
   Todos (solo admins): el mismo regalo a cada alumno, menos los
   suspendidos, con una ventana para confirmar. Rayos: la energía del
   Arcade y del Laboratorio (supabase/100-regalar-todos-rayos.sql:
   regalo_todos_ver, regalo_todos_dar y el tipo «rayos»).
   ========================================================= */
const RG = { modo: 'uno', todos: null, todosCargando: false, todosError: '', inactivoDias: 7, grupo: null, grupoCargando: false, grupoError: '', alumno: null, tipo: 'corazones', cant: 3, item: '', sel: [], items: null, inf: null, infCargando: false, infError: '', enviando: false };
const RG_TIPOS = {
  corazones: { nom: 'Corazones', c: '#FF4B4B', ops: [[1, '+1'], [3, '+3'], [5, '+5'], [10, '+10']], min: 1, max: 50, uni: 'corazones' },
  infinito: { nom: 'Infinitos', c: '#CE82FF', ops: [[1, '1 hora'], [24, '1 día'], [72, '3 días'], [168, '7 días'], [720, '30 días']] },
  xp: { nom: 'XP', c: '#FFC800', ops: [[100, '+100'], [250, '+250'], [500, '+500'], [1000, '+1000']], min: 1, max: 10000, uni: 'XP' },
  rayos: { nom: 'Rayos', c: '#2FA8FF', ops: [[10, '+10'], [20, '+20'], [50, '+50'], [100, '+100']], min: 1, max: 1000, uni: 'rayos' },
  ticket: { nom: 'Ticket de sala', c: '#C6E000', ops: [[1, '+1'], [3, '+3'], [5, '+5'], [10, '+10']], min: 1, max: 50, uni: 'tickets' },
  diamantes: { nom: 'Diamantes', c: '#C64DF0', ops: [[50, '+50'], [100, '+100'], [300, '+300'], [500, '+500']], min: 1, max: 10000, uni: 'diamantes' },
  item: { nom: 'Ítem de colección', c: '#1CB0F6' },
  // Solo a un alumno (supabase/117-devolver-racha.sql)
  racha: { nom: 'Recuperar racha', c: '#FF9600', solo: 'uno' }
};
const RG_ESP = { racha: 'Banner', avatar: 'Foto de perfil', pines: 'Pin', marco: 'Marco', cuadro: 'Cuadro de racha', titulo: 'Título', buho: 'Búho', escena: 'Escenario' };

(function estilosRegalos() {
  const st = document.createElement('style');
  st.textContent = `
  .rg-buscar { display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap; }
  .rg-buscar > div { flex: 1; min-width: 180px; }
  .rg-buscar .inp { font: 1000 22px Nunito, sans-serif; letter-spacing: .18em; }
  .rg-al { display: flex; align-items: center; gap: 14px; padding: 14px; border-radius: 16px; background: #120e22; border: 2px solid #2A2346; margin-top: 14px; }
  .rg-foto { width: 56px; height: 56px; flex-shrink: 0; border-radius: 50%; background: #2A2346 center/cover; display: grid; place-items: center; font: 1000 22px Nunito, sans-serif; color: var(--accent); }
  .rg-al b { display: block; font: 900 17px Nunito, sans-serif; overflow-wrap: anywhere; }
  .rg-al small { display: block; color: var(--text-dim); font-size: 12.5px; overflow-wrap: anywhere; }
  .rg-stats { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 7px; }
  .rg-stats span { padding: 3px 8px; border-radius: 8px; background: #1D1834; font: 900 12px Nunito, sans-serif; }
  .rg-tipos { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
  .rg-tipo { padding: 12px 8px; border-radius: 14px; border: 2px solid #2F284E; background: none; color: var(--text); font: 900 13.5px Nunito, sans-serif; cursor: pointer; display: grid; justify-items: center; gap: 6px; }
  .rg-tipo svg { width: 26px; height: 26px; color: var(--c); }
  .rg-tipo.on { border-color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); }
  .rg-cant { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .rg-cant .inp { width: 110px; }
  .rg-items { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 8px; max-height: 300px; overflow-y: auto; padding: 2px; }
  .rg-it { border: 2px solid #2F284E; border-radius: 12px; background: #120e22; padding: 8px; text-align: left; cursor: pointer; color: var(--text); }
  .rg-it.on { border-color: #1CB0F6; background: rgba(28,176,246,.12); }
  .rg-it i { display: block; aspect-ratio: 16 / 10; border-radius: 8px; background: #1D1834 center/cover; margin-bottom: 6px; }
  .rg-it b { display: block; font: 900 12.5px Nunito, sans-serif; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rg-it small { display: block; color: var(--text-dim); font: 800 11px Nunito, sans-serif; }
  .rg-resumen { font: 800 14px Nunito, sans-serif; color: var(--text-dim); }
  .rg-resumen b { color: var(--text); }
  .rg-h { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-bottom: 1px solid #221C3C; font-size: 13px; }
  .rg-h:last-child { border-bottom: 0; }
  .rg-h i { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; background: var(--c); }
  .rg-h div { flex: 1; min-width: 0; } .rg-h small { color: var(--text-dim); }
  .rg-modos { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 16px; }
  .rg-modo { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 16px; border: 2px solid #2F284E; background: #120e22; color: var(--text); cursor: pointer; text-align: left; }
  .rg-modo svg { width: 30px; height: 30px; flex-shrink: 0; color: var(--text-dim); }
  .rg-modo b { display: block; font: 1000 16px Nunito, sans-serif; }
  .rg-modo small { display: block; color: var(--text-dim); font: 800 12px Nunito, sans-serif; }
  .rg-modo.on { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, #120e22); }
  .rg-modo.on svg { color: var(--accent); }
  .rg-vip-add { display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap; }
  .rg-vip-add > div { flex: 1; min-width: 200px; }
  .rg-vip-add textarea { min-height: 70px; resize: vertical; font: 900 15px Nunito, sans-serif; letter-spacing: .06em; }
  .rg-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; max-height: 340px; overflow-y: auto; padding: 2px; }
  .rg-chip { display: flex; align-items: center; gap: 8px; padding: 5px 6px 5px 5px; border-radius: 999px; background: #1D1834; border: 2px solid #2F284E; font: 900 13px Nunito, sans-serif; max-width: 100%; }
  .rg-chip.nuevo { border-color: var(--accent); }
  .rg-chip.malo { border-color: #FF4B4B; color: #FF6E6E; }
  .rg-chip.dormido { border-color: rgba(255,150,0,.55); background: rgba(255,150,0,.08); }
  .rg-chip.dormido small { color: #FFAD4D; }
  .rg-vig { display: inline-block; padding: 2px 8px; border-radius: 8px; background: color-mix(in srgb, var(--accent) 16%, transparent); color: var(--accent); font: 900 11.5px Nunito, sans-serif; }
  .rg-h.rg-pasado { opacity: .6; }
  .rg-anular { flex-shrink: 0; padding: 6px 10px; font-size: 12.5px; }
  .rg-act { margin-top: 14px; padding: 12px; border-radius: 14px; background: #120e22; border: 2px solid #2A2346; }
  .rg-act-res { font: 900 14px Nunito, sans-serif; margin-bottom: 10px; }
  .rg-act-res span { color: var(--accent); } .rg-act-res em { font-style: normal; color: #FFAD4D; }
  .rg-act-fila { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; font: 800 13px Nunito, sans-serif; color: var(--text-dim); }
  .rg-chip .rg-foto { width: 26px; height: 26px; font-size: 12px; }
  .rg-chip span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rg-chip small { color: var(--text-dim); font-weight: 800; }
  .rg-chip button { width: 24px; height: 24px; border-radius: 50%; border: 0; background: #2A2346; color: var(--text-dim); cursor: pointer; display: grid; place-items: center; flex-shrink: 0; }
  .rg-chip button:hover { background: #FF4B4B; color: #fff; }
  .rg-vip-cab { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
  .rg-vip-cab .rg-cuenta { font: 1000 15px Nunito, sans-serif; }
  .rg-aviso { padding: 10px 12px; border-radius: 12px; background: rgba(255,200,0,.1); border: 2px solid rgba(255,200,0,.35); color: #FFD84D; font: 800 13px Nunito, sans-serif; margin-top: 10px; }
  .rg-todos { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
  .rg-todos-n { font: 1000 44px/1 Nunito, sans-serif; color: var(--accent); }
  .rg-todos-n small { display: block; font: 900 13px Nunito, sans-serif; color: var(--text-dim); margin-top: 4px; }
  .rg-todos p { flex: 1; min-width: 220px; margin: 0; color: var(--text-dim); font: 700 13.5px/1.5 Nunito, sans-serif; }
  .rg-todos p b { color: var(--text); }
  .rg-conf { text-align: center; }
  .rg-conf .rg-conf-ic { width: 64px; height: 64px; margin: 0 auto 10px; display: grid; place-items: center; border-radius: 50%; background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--c); }
  .rg-conf .rg-conf-ic svg { width: 34px; height: 34px; }
  .rg-conf h3 { margin: 0 0 8px; }
  .rg-conf .rg-conf-que { font: 1000 22px Nunito, sans-serif; margin: 6px 0 4px; }
  .rg-conf .sub { line-height: 1.55; }
  .rg-conf .mfoot { justify-content: center; }
  @media (max-width: 1180px) { .rg-modos { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 760px) { .rg-modos { grid-template-columns: 1fr; } }
  @media (max-width: 560px) { .rg-tipos { grid-template-columns: repeat(3, minmax(0, 1fr)); } }`;
  document.head.appendChild(st);
})();

const RG_IC = {
  corazones: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.7 1.1 5.2 3 1.5-1.9 3.1-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z"/></svg>',
  infinito: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 12c-2-2.7-3.6-4-5.5-4a4 4 0 0 0 0 8c1.9 0 3.5-1.3 5.5-4zm0 0c2 2.7 3.6 4 5.5 4a4 4 0 0 0 0-8c-1.9 0-3.5 1.3-5.5 4z"/></svg>',
  xp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
  // El rayo del Arcade (arcade.html #r-rayo): azul con borde oscuro, distinto del XP
  rayos: '<svg viewBox="0 0 64 64"><defs><linearGradient id="rgRayoG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9BE4FF"/><stop offset=".5" stop-color="#2FA8FF"/><stop offset="1" stop-color="#1060E0"/></linearGradient></defs><path d="M38 4 12 36h16l-6 24 30-36H35l8-20z" fill="#0B3C8C" stroke="#0B3C8C" stroke-width="6" stroke-linejoin="round" transform="translate(2 3)"/><path d="M38 4 12 36h16l-6 24 30-36H35l8-20z" fill="url(#rgRayoG)" stroke="#0E4BB0" stroke-width="3" stroke-linejoin="round"/><path d="M36 9 18 32h8" fill="none" stroke="#D8F1FF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/></svg>',
  todos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.8"/><path d="M16.5 14.2c3 .2 5 2.3 5 5.3"/></svg>',
  uno: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>',
  vip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18 2 7l5.5 4L12 4l4.5 7L22 7l-1 11z"/><path d="M3 21h18"/></svg>',
  diamantes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M7 3h10l5 6-10 12L2 9z"/><path d="M2 9h20M12 21 8 9l2-6M12 21l4-12-2-6"/></svg>',
  ticket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4z"/><path d="M15 5v14" stroke-dasharray="2 2"/></svg>',
  inf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.3l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
  quitar: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  racha: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 1.5-5 3-6.5 0 2.5 1 3.5 2 3.5-1-3.5 0-6.5 1-9z"/></svg>',
  item: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zm0 0h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>'
};

// Varios ítems a la vez: el texto («3 ítems: A, B, C») y un envío por ítem, uno tras otro
function rgSelTexto(sel) {
  sel = sel || RG.sel;
  if (!sel.length) return 'Elige uno o más ítems';
  if (sel.length === 1) return rgTexto({ tipo: 'item', item: sel[0] });
  return sel.length + ' ítems: ' + sel.map(id => { const it = (RG.items || []).find(i => i.id === id); return it ? it.nom || id : id; }).join(', ');
}
// manda(ítem) hace el RPC; para regalos que no son ítems se llama una vez con null.
// Devuelve { data, error, saltados } (data = la respuesta del último que salió bien)
async function rgEnviar(manda, sel) {
  const lista = RG.tipo === 'item' ? (sel || RG.sel).slice() : [null];
  let data = null, sal = 0, hechos = 0;
  for (const it of lista) {
    const r = await manda(it);
    if (r.error) {
      if (hechos) r.error.message = 'Se regalaron ' + hechos + ' de ' + lista.length + '. Falló ' + rgTexto({ tipo: 'item', item: it }) + ': ' + (r.error.message || '');
      return { data, error: r.error };
    }
    data = r.data; hechos++;
    if (r.data && r.data.saltados) sal += +r.data.saltados;
  }
  return { data, saltados: sal };
}

function rgHoras(h) { return h % 24 === 0 ? (h / 24) + (h === 24 ? ' día' : ' días') : h + (h === 1 ? ' hora' : ' horas'); }
function rgFecha(s) { return new Date(s).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
function rgTexto(x) {
  if (x.tipo === 'corazones') return '+' + x.cantidad + (x.cantidad === 1 ? ' corazón' : ' corazones');
  if (x.tipo === 'infinito') return 'Corazones infinitos por ' + rgHoras(x.cantidad);
  if (x.tipo === 'xp') return '+' + (+x.cantidad).toLocaleString('es-PE') + ' XP';
  if (x.tipo === 'rayos') return '+' + (+x.cantidad).toLocaleString('es-PE') + (+x.cantidad === 1 ? ' rayo' : ' rayos');
  if (x.tipo === 'racha') return 'Racha devuelta: ' + x.cantidad + (+x.cantidad === 1 ? ' día' : ' días');
  if (x.tipo === 'diamantes') return '+' + (+x.cantidad).toLocaleString('es-PE') + (+x.cantidad === 1 ? ' diamante' : ' diamantes');
  if (x.tipo === 'ticket') return '+' + x.cantidad + (+x.cantidad === 1 ? ' ticket de sala' : ' tickets de sala');
  const it = (RG.items || []).find(i => i.id === x.item);
  return 'Ítem: ' + (it ? it.nom || it.id : x.item);
}

async function cargarRegalos() {
  const caja = $('rgCuerpo');
  let cliente;
  try { cliente = await MCAuth.listo; }
  catch (e) { caja.innerHTML = '<div class="state-msg error">No se pudo conectar con Supabase. Revisa tu internet.</div>'; return; }
  if (!MCAuth.usuario()) {
    caja.innerHTML = `<div class="state-msg al-login">Entra con tu cuenta de Google de administrador.
      <button class="btn-main" type="button" id="rgEntrar">Entrar con Google</button></div>`;
    $('rgEntrar').addEventListener('click', () => MCAuth.entrarGoogle());
    return;
  }
  if (!RG.items) {
    const r = await cliente.from('coleccion_item').select('id,espacio,nom,img,regla,visible').not('nom', 'is', null).order('creado', { ascending: false });
    RG.items = (!r.error && r.data) || [];
  }
  pintarRegalos();
  // Desde Alumnos: #regalos=12345 abre ese ID
  const m = location.hash.match(/regalos=(\d{5})/);
  if (m) { if (RG.modo !== 'uno') { RG.modo = 'uno'; pintarRegalos(); } $('rgId').value = m[1]; history.replaceState(null, '', location.pathname + location.search); rgBuscar(); }
}

function rgModosHtml() {
  const n = RG.grupo ? RG.grupo.miembros.length : null, t = RG.todos ? RG.todos.alumnos : null, ni = RG.inf ? RG.inf.miembros.length : null;
  return `<div class="rg-modos">
    <button class="rg-modo${RG.modo === 'uno' ? ' on' : ''}" type="button" data-rgm="uno">${RG_IC.uno}<div><b>Un alumno</b><small>Buscas su ID y le regalas</small></div></button>
    <button class="rg-modo${RG.modo === 'inf' ? ' on' : ''}" type="button" data-rgm="inf">${RG_IC.inf}<div><b>Influencers</b><small>${ni == null ? 'Los de Panel → Influencers: a todos de una vez' : ni + (ni === 1 ? ' influencer' : ' influencers') + ' · a todos de una vez'}</small></div></button>
    <button class="rg-modo${RG.modo === 'vip' ? ' on' : ''}" type="button" data-rgm="vip">${RG_IC.vip}<div><b>Grupo VIP</b><small>${n == null ? 'Tu lista guardada: a todos de una vez' : n + (n === 1 ? ' alumno' : ' alumnos') + ' · a todos de una vez'}</small></div></button>
    ${ROL.admin ? `<button class="rg-modo${RG.modo === 'todos' ? ' on' : ''}" type="button" data-rgm="todos">${RG_IC.todos}<div><b>Todos</b><small>${t == null ? 'Cada alumno de la web, de una vez' : t.toLocaleString('es-PE') + (t === 1 ? ' alumno' : ' alumnos') + ' · a todos de una vez'}</small></div></button>` : ''}
  </div>`;
}

function rgModosEventos() {
  document.querySelectorAll('[data-rgm]').forEach(b => b.addEventListener('click', () => {
    if (RG.modo === b.dataset.rgm) return;
    RG.modo = b.dataset.rgm;
    pintarRegalos();
    if (RG.modo === 'vip' && !RG.grupo) rgVipCargar();
    if (RG.modo === 'todos' && !RG.todos) rgTodosCargar();
    if (RG.modo === 'inf' && !RG.inf) rgInfCargar();
  }));
}

// Lo de abajo (tipo, cantidad, nota, botón) es igual en los dos modos
function rgFormHtml(oculto, titulo, boton) {
  if (RG_TIPOS[RG.tipo].solo && RG_TIPOS[RG.tipo].solo !== RG.modo) RG.tipo = 'corazones';
  return `<div class="agp-form" id="rgForm"${oculto ? ' hidden' : ''}>
      <h3>${titulo}</h3>
      <div class="rg-tipos">${Object.entries(RG_TIPOS).filter(([, t]) => !t.solo || t.solo === RG.modo).map(([k, t]) => `<button class="rg-tipo${RG.tipo === k ? ' on' : ''}" type="button" data-rgt="${k}" style="--c:${t.c}">${RG_IC[k]}${t.nom}</button>`).join('')}</div>
      <div id="rgOpc"></div>
      <label for="rgNota">Nota para ${RG.modo === 'uno' ? 'el alumno' : 'los alumnos'} (opcional)</label>
      <input class="inp" id="rgNota" maxlength="140" placeholder="${RG.modo === 'vip' ? '¡Tu regalo VIP del día!' : RG.modo === 'inf' ? '¡Para ti antes que nadie!' : RG.modo === 'todos' ? '¡Un regalo para todos por el fin de semana!' : '¡Bien hecho en el simulacro!'}">
      <p class="hint">Le sale en el aviso del regalo la próxima vez que entra a la web.</p>
      <div class="agp-acc"><button class="btn-main" type="button" id="rgDar">${boton}</button><span class="rg-resumen" id="rgRes"></span></div>
    </div>`;
}

function rgFormEventos(alDar) {
  document.querySelectorAll('[data-rgt]').forEach(b => b.addEventListener('click', () => {
    RG.tipo = b.dataset.rgt;
    const o = RG_TIPOS[RG.tipo].ops; RG.cant = o ? o[1][0] : 0;
    document.querySelectorAll('[data-rgt]').forEach(x => x.classList.toggle('on', x === b));
    rgOpciones();
  }));
  $('rgDar').addEventListener('click', alDar);
}

function pintarRegalos() {
  if (RG.modo === 'vip') { pintarVip(); return; }
  if (RG.modo === 'inf') { pintarInf(); return; }
  if (RG.modo === 'todos') { pintarTodos(); return; }
  const a = RG.alumno;
  $('rgCuerpo').innerHTML = rgModosHtml() + `
    <div class="agp-form">
      <h3>¿A quién?</h3>
      <p class="hint">Escribe el ID de 5 dígitos del alumno. Lo ve en su tarjeta de jugador y también sale en la pestaña Alumnos.</p>
      <div class="rg-buscar">
        <div><label for="rgId">ID del alumno</label><input class="inp" id="rgId" inputmode="numeric" maxlength="5" placeholder="12345" autocomplete="off" value="${a ? a.codigo : ''}"></div>
        <button class="btn-main" type="button" id="rgBuscar">Buscar</button>
      </div>
      <div id="rgAl">${a ? rgAlumnoHtml(a) : ''}</div>
    </div>
    ${rgFormHtml(!a, '¿Qué le regalas?', 'Regalar')}
    ${a && a.historial && a.historial.length ? `<div class="agp-form"><h3>Regalos que recibió</h3>${a.historial.map(x => `<div class="rg-h" style="--c:${(RG_TIPOS[x.tipo] || { c: '#FF9600' }).c}"><i></i><div><b>${esc(rgTexto(x))}</b>${x.nota ? ' · «' + esc(x.nota) + '»' : ''}<br><small>${esc(x.de || 'Admin')} · ${rgFecha(x.creado)}</small></div></div>`).join('')}</div>` : ''}`;
  $('rgId').addEventListener('keydown', e => { if (e.key === 'Enter') rgBuscar(); });
  $('rgId').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 5); });
  $('rgBuscar').addEventListener('click', rgBuscar);
  rgModosEventos();
  rgFormEventos(rgDar);
  if (a) rgOpciones();
}

function rgAlumnoHtml(a) {
  const ini = (a.apodo || a.email || '?').trim().charAt(0).toUpperCase();
  const inf = a.infinito_hasta ? 'Infinitos hasta ' + rgFecha(a.infinito_hasta) : null;
  return `<div class="rg-al">
    <span class="rg-foto"${a.foto ? ` style="background-image:url('${esc(a.foto)}')"` : ''}>${a.foto ? '' : esc(ini)}</span>
    <div style="min-width:0">
      <b>${esc(a.apodo || 'Sin apodo')} <small style="display:inline">· ID ${a.codigo}</small></b>
      <small>${esc(a.email || '')}</small>
      <div class="rg-stats">
        <span style="color:#FF6E6E">❤ ${inf ? '∞' : a.quedan}${a.extra ? ' (' + a.extra + ' extra)' : ''}</span>
        ${inf ? `<span style="color:#CE82FF">${esc(inf)}</span>` : ''}
        <span style="color:#FFC800">${(+a.xp_total || 0).toLocaleString('es-PE')} XP en total</span>
        <span>${(+a.xp_saldo || 0).toLocaleString('es-PE')} XP para canjear</span>
        ${a.rayos != null ? `<span style="color:#5CBEFF">${(+a.rayos || 0).toLocaleString('es-PE')} rayos</span>` : ''}
        ${a.diamantes != null ? `<span style="color:#E4B8FF">${(+a.diamantes || 0).toLocaleString('es-PE')} diamantes</span>` : ''}
      </div>
    </div></div>`;
}

function rgOpciones() {
  const t = RG_TIPOS[RG.tipo], caja = $('rgOpc');
  if (RG.tipo === 'racha') {
    caja.innerHTML = `<div class="rg-aviso" style="margin:4px 0 14px;--c:#FF9600">Busca el último corte de su racha (hasta 21 días seguidos sin estudiar) y esos días cuentan como cumplidos. Si ya empezó otra racha, se juntan. Le llega el sobre <b>«Racha recuperada»</b>.<br><small>Úsalo como excepción: esos días le salen en sus estadísticas con su meta diaria. No le da XP.</small></div>`;
    rgResumen(); return;
  }
  if (RG.tipo === 'item') {
    const lista = RG.items.filter(i => i.visible !== false || (i.regla || {}).tipo === 'regalo');
    RG.sel = RG.sel.filter(id => lista.some(i => i.id === id));
    caja.innerHTML = `<label>Elige uno o varios ítems <small class="rg-n-sel">${RG.sel.length ? '· ' + RG.sel.length + (RG.sel.length === 1 ? ' elegido' : ' elegidos') : ''}</small></label>${lista.length ? `<div class="rg-items">${lista.map(i => `<button class="rg-it${RG.sel.includes(i.id) ? ' on' : ''}" type="button" data-rgi="${esc(i.id)}"><i${i.img ? ` style="background-image:url('${esc(/^https:/.test(i.img) ? i.img : '../' + i.img.replace(/^\//, ''))}')"` : ''}></i><b>${esc(i.nom)}</b><small>${esc(RG_ESP[i.espacio] || i.espacio)}${(i.regla || {}).tipo === 'regalo' ? ' · solo regalo' : ''}</small></button>`).join('')}</div>`
      : '<p class="hint">Aún no hay ítems subidos en Recursos.</p>'}`;
    caja.querySelectorAll('[data-rgi]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.rgi, k = RG.sel.indexOf(id);
      if (k >= 0) RG.sel.splice(k, 1); else RG.sel.push(id);
      b.classList.toggle('on', k < 0);
      caja.querySelector('.rg-n-sel').textContent = RG.sel.length ? '· ' + RG.sel.length + (RG.sel.length === 1 ? ' elegido' : ' elegidos') : '';
      rgResumen();
    }));
  } else {
    if (!t.ops.some(o => o[0] === RG.cant) && RG.tipo === 'infinito') RG.cant = 24;
    caja.innerHTML = `<label>${RG.tipo === 'infinito' ? '¿Por cuánto tiempo?' : '¿Cuántos?'}</label>
      <div class="rg-cant">${t.ops.map(([v, l]) => `<button class="agp-op${RG.cant === v ? ' on' : ''}" type="button" data-rgc="${v}" style="--c:${t.c}">${l}</button>`).join('')}
      ${t.max ? `<input class="inp" id="rgOtro" type="number" min="${t.min}" max="${t.max}" placeholder="Otro" value="${t.ops.some(o => o[0] === RG.cant) ? '' : RG.cant}">` : ''}</div>`;
    caja.querySelectorAll('[data-rgc]').forEach(b => b.addEventListener('click', () => { RG.cant = +b.dataset.rgc; if ($('rgOtro')) $('rgOtro').value = ''; rgOpciones(); }));
    if ($('rgOtro')) $('rgOtro').addEventListener('input', e => { const v = Math.round(+e.target.value); RG.cant = v; caja.querySelectorAll('[data-rgc]').forEach(x => x.classList.toggle('on', +x.dataset.rgc === v)); rgResumen(); });
  }
  rgResumen();
}

function rgResumen() {
  if (RG.modo === 'vip') { rgVipResumen(); return; }
  if (RG.modo === 'inf') { rgInfResumen(); return; }
  if (RG.modo === 'todos') { rgTodosResumen(); return; }
  const a = RG.alumno, t = RG_TIPOS[RG.tipo];
  let ok = !!a, txt = '';
  if (RG.tipo === 'racha') txt = 'Recuperar su racha';
  else if (RG.tipo === 'item') { ok = ok && RG.sel.length > 0; txt = rgSelTexto(); }
  else if (t.max && !(RG.cant >= t.min && RG.cant <= t.max)) { ok = false; txt = 'Elige de ' + t.min + ' a ' + t.max.toLocaleString('es-PE') + ' ' + t.uni; }
  else txt = rgTexto({ tipo: RG.tipo, cantidad: RG.cant });
  $('rgDar').disabled = !ok || RG.enviando;
  if (!RG.enviando) $('rgDar').textContent = RG.tipo === 'racha' ? 'Recuperar racha' : 'Regalar';
  $('rgRes').innerHTML = a ? esc(txt) + (ok ? ' para <b>' + esc(a.apodo || 'ID ' + a.codigo) + '</b>' : '') : '';
}

async function rgBuscar() {
  const id = +$('rgId').value;
  const caja = $('rgAl');
  if (!/^\d{5}$/.test($('rgId').value)) { caja.innerHTML = '<p class="hint" style="color:#FF6E6E">El ID tiene 5 dígitos.</p>'; return; }
  caja.innerHTML = '<div class="loader">Buscando…</div>';
  const c = await MCAuth.listo;
  const r = await c.rpc('regalo_buscar', { p_codigo: id });
  if (r.error) {
    caja.innerHTML = `<p class="hint" style="color:#FF6E6E">${/no autorizado/i.test(r.error.message || '') ? 'Tu cuenta no tiene permiso para dar regalos.' : /function|does not exist/i.test(r.error.message || '') ? 'Falta correr supabase/43-ayudantes-regalos.sql en Supabase.' : esc(r.error.message || 'No se pudo buscar.')}</p>`;
    return;
  }
  if (!r.data) { RG.alumno = null; pintarRegalos(); $('rgAl').innerHTML = '<p class="hint" style="color:#FF6E6E">No hay ningún alumno con el ID ' + id + '.</p>'; return; }
  RG.alumno = r.data;
  pintarRegalos();
}

async function rgDar() {
  const a = RG.alumno;
  if (!a || RG.enviando) return;
  RG.enviando = true; rgResumen();
  const btn = $('rgDar'); btn.textContent = RG.tipo === 'racha' ? 'Recuperando…' : 'Regalando…';
  if (RG.tipo === 'racha') { await rgRacha(a); return; }
  const c = await MCAuth.listo, nota = $('rgNota').value.trim() || null, txt = RG.tipo === 'item' ? rgSelTexto() : rgTexto({ tipo: RG.tipo, cantidad: RG.cant });
  const r = await rgEnviar(it => c.rpc('regalar', { p_codigo: a.codigo, p_tipo: RG.tipo, p_cantidad: RG.tipo === 'item' ? null : RG.cant, p_item: it, p_nota: nota }));
  RG.enviando = false;
  if (r.error) { btn.textContent = 'Regalar'; if (r.data) RG.alumno = r.data; rgResumen(); toast(rgFaltaSql(r.error) || r.error.message || 'No se pudo regalar'); return; }
  toast(txt + ' para ' + (a.apodo || 'ID ' + a.codigo));
  RG.alumno = r.data; RG.sel = [];
  pintarRegalos();
}

// Recuperar la racha (supabase/117-devolver-racha.sql): rellena el último corte y le manda el sobre
async function rgRacha(a) {
  const c = await MCAuth.listo;
  const r = await c.rpc('racha_devolver', { p_codigo: a.codigo, p_nota: $('rgNota').value.trim() || null });
  RG.enviando = false;
  if (r.error) {
    const m = r.error.message || '';
    rgResumen();
    toast(/racha_devolver|does not exist|schema cache|regalos_tipo_check/i.test(m) ? 'Falta correr supabase/117-devolver-racha.sql en Supabase.'
      : /no autorizado/i.test(m) ? 'Tu cuenta no tiene permiso para dar regalos.' : m.replace(/ Nada cambió\.$/, '') + ' No se cambió nada.');
    return;
  }
  const d = r.data || {};
  toast('Racha recuperada: ' + d.antes + ' → ' + d.despues + ' días para ' + (a.apodo || 'ID ' + a.codigo));
  rgBuscar();
}

/* ---------- Grupo VIP: una lista de IDs guardada y el mismo regalo a todos ---------- */
const RG_GRUPO = 'vip';

function rgVipError(e) {
  const m = (e && e.message) || '';
  return /no autorizado/i.test(m) ? 'Tu cuenta no tiene permiso para dar regalos.'
    : /grupo_regalo_anular|nuevos|regalo_grupo_dado/i.test(m) ? 'Falta correr supabase/140-grupo-vip-mientras.sql en Supabase.'
    : /function|does not exist|schema cache/i.test(m) ? 'Falta correr supabase/93-grupo-vip.sql en Supabase.'
    : /ya es del grupo/i.test(m) ? 'Ese ítem ya es del grupo: lo tienen todos y lo reciben los que entran.'
    : m || 'No se pudo.';
}

async function rgVipCargar() {
  RG.grupoCargando = true; RG.grupoError = ''; pintarRegalos();
  const c = await MCAuth.listo;
  const r = await c.rpc('grupo_regalo_ver', { p_grupo: RG_GRUPO });
  RG.grupoCargando = false;
  if (r.error) { RG.grupoError = rgVipError(r.error); pintarRegalos(); return; }
  rgVipTomar(r.data);
  pintarRegalos();
}

function rgVipTomar(d) {
  RG.grupo = { miembros: d.miembros || [], envios: d.envios || [] };
  RG.borrador = RG.grupo.miembros.map(m => m.codigo);
  RG.noExisten = d.no_existen || [];
}

function rgVipCambios() {
  if (!RG.grupo) return false;
  // Los IDs que no existen (en rojo) no cuentan como cambio: no se pueden guardar
  const g = RG.grupo.miembros.map(m => m.codigo).sort().join(), b = RG.borrador.filter(c => !RG.noExisten.includes(c)).sort().join();
  return g !== b;
}

// Días desde que se le vio (null = nunca entró)
function rgDiasVisto(v) {
  if (!v) return null;
  const f = d => new Date(new Date(d).toLocaleDateString('en-CA', { timeZone: 'America/Lima' }));
  return Math.max(0, Math.round((f(Date.now()) - f(v)) / 86400000));
}
function rgVistoTxt(v) {
  const d = rgDiasVisto(v);
  return d == null ? 'nunca activo' : d === 0 ? 'activo hoy' : d === 1 ? 'activo ayer' : 'activo hace ' + d + ' días';
}
function rgDormido(m) { const d = rgDiasVisto(m.visto); return d == null || d >= RG.inactivoDias; }

function rgHoyLima(s) {
  const f = d => new Date(d).toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
  return f(s) === f(Date.now());
}

function pintarVip() {
  const cab = rgModosHtml();
  if (RG.grupoError) { $('rgCuerpo').innerHTML = cab + `<div class="state-msg error">${esc(RG.grupoError)}</div>`; rgModosEventos(); return; }
  if (!RG.grupo && !RG.grupoCargando) { rgVipCargar(); return; }
  if (RG.grupoCargando) { $('rgCuerpo').innerHTML = cab + '<div class="loader">Cargando el grupo…</div>'; rgModosEventos(); return; }
  const info = {}; RG.grupo.miembros.forEach(m => { info[m.codigo] = m; });
  const cambios = rgVipCambios(), n = RG.borrador.length, guardados = RG.grupo.miembros.length;
  const ult = RG.grupo.envios.filter(x => x.tipo !== 'item' && x.tipo !== 'item-quitado').sort((a, b) => new Date(b.creado) - new Date(a.creado))[0];
  const chips = RG.borrador.map(cod => {
    const m = info[cod], malo = RG.noExisten.includes(cod);
    const ini = m ? (m.apodo || m.email || '?').trim().charAt(0).toUpperCase() : '#';
    return `<span class="rg-chip${malo ? ' malo' : m ? (rgDormido(m) ? ' dormido' : '') : ' nuevo'}" title="${m ? esc((m.email || '') + ' · ' + rgVistoTxt(m.visto)) : malo ? 'No hay ningún alumno con este ID' : 'Falta guardar'}">
      <span class="rg-foto"${m && m.foto ? ` style="background-image:url('${esc(m.foto)}')"` : ''}>${m && m.foto ? '' : esc(ini)}</span>
      <span>${m ? esc(m.apodo || 'Sin apodo') + ' <small>· ' + cod + ' · ' + rgVistoTxt(m.visto) + '</small>' : cod + ' <small>· ' + (malo ? 'no existe' : 'sin guardar') + '</small>'}</span>
      <button type="button" data-rgq="${cod}" aria-label="Quitar ${cod}" title="Quitar del grupo">${RG_IC.quitar}</button></span>`;
  }).join('');
  $('rgCuerpo').innerHTML = cab + `
    <div class="agp-form">
      <div class="rg-vip-cab"><h3 style="margin:0">Alumnos del grupo VIP</h3><span class="rg-cuenta">${n} ${n === 1 ? 'alumno' : 'alumnos'}</span></div>
      <p class="hint">Escribe o pega los IDs de 5 dígitos (puedes pegar varios juntos, separados por espacios, comas o saltos de línea) y toca Agregar. Luego Guardar grupo: la lista queda guardada para la próxima vez.</p>
      <div class="rg-vip-add">
        <div><label for="rgVipIds">IDs</label><textarea class="inp" id="rgVipIds" inputmode="numeric" placeholder="12345, 23456, 34567"></textarea></div>
        <button class="btn-ghost" type="button" id="rgVipAdd">Agregar</button>
      </div>
      ${n ? `<div class="rg-chips">${chips}</div>` : '<p class="hint" style="margin-top:12px">Aún no hay nadie en el grupo.</p>'}
      ${rgActividadHtml(info)}
      ${RG.noExisten.length ? `<div class="rg-aviso">No hay ningún alumno con ${RG.noExisten.length === 1 ? 'el ID' : 'los IDs'} ${RG.noExisten.join(', ')}. No se guard${RG.noExisten.length === 1 ? 'ó' : 'aron'}: quíta${RG.noExisten.length === 1 ? 'lo' : 'los'} o revisa el número.</div>` : ''}
      <div class="agp-acc"><button class="btn-main" type="button" id="rgVipGuardar"${cambios ? '' : ' disabled'}>Guardar grupo</button>
        <span class="rg-resumen">${cambios ? 'Tienes cambios sin guardar' : guardados ? 'Grupo guardado' : ''}</span></div>
    </div>
    ${rgFormHtml(!guardados, '¿Qué les regalas a todos?', 'Regalar a todos')}
    ${ult && rgHoyLima(ult.creado) ? `<div class="rg-aviso" style="margin:-4px 0 16px">Hoy ya le diste al grupo: <b>${esc(rgTexto(ult))}</b> (${rgFecha(ult.creado)}).</div>` : ''}
    ${RG.grupo.envios.length ? `<div class="agp-form"><h3>Regalos al grupo</h3>
      <p class="hint">Valen solo mientras estén en el grupo: si quitas a alguien, se le quita lo que le dio el grupo (ítems, infinitos que le quedan, corazones que no usó, XP, rayos, tickets y diamantes). Si agregas a alguien, recibe los ítems del grupo, los infinitos que siguen vigentes y los corazones, XP, rayos, tickets y diamantes de hoy.</p>
      ${RG.grupo.envios.map(rgEnvioHtml).join('')}</div>` : ''}`;
  rgModosEventos();
  const add = () => {
    const ids = ($('rgVipIds').value.match(/\d{5}/g) || []).map(Number);
    if (!ids.length) { toast('Escribe IDs de 5 dígitos'); return; }
    const antes = RG.borrador.length;
    ids.forEach(i => { if (!RG.borrador.includes(i)) RG.borrador.push(i); });
    const nuevos = RG.borrador.length - antes;
    toast(nuevos ? nuevos + (nuevos === 1 ? ' ID agregado' : ' IDs agregados') + '. Toca Guardar grupo.' : 'Esos IDs ya estaban en el grupo');
    pintarVip();
  };
  $('rgVipAdd').addEventListener('click', add);
  $('rgVipIds').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); add(); } });
  document.querySelectorAll('[data-rgq]').forEach(b => b.addEventListener('click', () => {
    const cod = +b.dataset.rgq;
    RG.borrador = RG.borrador.filter(x => x !== cod);
    RG.noExisten = RG.noExisten.filter(x => x !== cod);
    pintarVip();
  }));
  $('rgVipGuardar').addEventListener('click', rgVipGuardar);
  document.querySelectorAll('[data-rga]').forEach(b => b.addEventListener('click', () => rgVipAnular(b)));
  document.querySelectorAll('[data-rgd]').forEach(b => b.addEventListener('click', () => { RG.inactivoDias = +b.dataset.rgd; pintarVip(); }));
  if ($('rgQuitarDorm')) $('rgQuitarDorm').addEventListener('click', () => {
    const fuera = RG.grupo.miembros.filter(rgDormido).map(m => m.codigo);
    RG.borrador = RG.borrador.filter(c => !fuera.includes(c));
    toast(fuera.length + (fuera.length === 1 ? ' alumno quitado' : ' alumnos quitados') + '. Toca Guardar grupo.');
    pintarVip();
  });
  if (guardados) { rgFormEventos(rgVipDar); rgOpciones(); }
}

// ¿Se conectaron? Cuántos entraron en los últimos días y botón para quitar a los que no
function rgActividadHtml(info) {
  const ms = RG.borrador.map(c => info[c]).filter(Boolean);
  if (!ms.length) return '';
  const dorm = ms.filter(rgDormido).length, nunca = ms.filter(m => !m.visto).length;
  return `<div class="rg-act">
    <div class="rg-act-res"><span>${ms.length - dorm} activos</span> en los últimos ${RG.inactivoDias} días · <em>${dorm} no${nunca ? ' (' + nunca + ' nunca)' : ''}</em></div>
    <div class="rg-act-fila">Sin actividad hace
      ${[3, 7, 14, 30].map(d => `<button class="agp-op${RG.inactivoDias === d ? ' on' : ''}" type="button" data-rgd="${d}">${d} días</button>`).join('')}
      ${dorm ? `<button class="btn-ghost" type="button" id="rgQuitarDorm">Quitar a los ${dorm}</button>` : ''}</div>
    <p class="hint" style="margin:8px 0 0">«Activo» = inició sesión o practicó ese día. Los que no están activos se ven en naranja. Al quitarlos, toca Guardar grupo.</p>
  </div>`;
}

// Un regalo del grupo: vigente (lo reciben los que entran) o ya pasado
function rgEnvioHtml(x) {
  const quitado = x.tipo === 'item-quitado', t = RG_TIPOS[quitado ? 'item' : x.tipo] || RG_TIPOS.item;
  const txt = quitado ? rgTexto({ tipo: 'item', item: x.item }) + ' (quitado)' : rgTexto(x);
  const anulable = x.vigente && (x.tipo === 'item' || x.tipo === 'infinito');
  const estado = quitado ? '' : x.vigente ? `<span class="rg-vig">${x.tipo === 'item' ? 'Del grupo' : x.tipo === 'infinito' ? 'Vigente hasta ' + rgFecha(x.hasta) : 'De hoy'}</span>` : '';
  return `<div class="rg-h${quitado || !x.vigente ? ' rg-pasado' : ''}" style="--c:${t.c}"><i></i><div><b>${esc(txt)}</b> ${estado}<br>
    <small>${x.recibieron} ${x.recibieron === 1 ? 'alumno' : 'alumnos'}${x.nuevos ? ' + ' + x.nuevos + (x.nuevos === 1 ? ' que entró' : ' que entraron') + ' después' : ''}${x.saltados ? ' · ' + x.saltados + ' ya lo tenían' : ''}${x.nota ? ' · «' + esc(x.nota) + '»' : ''} · ${esc(x.de || 'Admin')} · ${rgFecha(x.creado)}</small></div>
    ${anulable ? `<button class="btn-ghost rg-anular" type="button" data-rga="${x.id}">Quitar a todos</button>` : ''}</div>`;
}

async function rgVipAnular(b) {
  if (b.dataset.ok !== '1') {
    b.dataset.ok = '1'; b.textContent = '¿Seguro? Toca otra vez';
    setTimeout(() => { if (b.isConnected) { b.dataset.ok = ''; b.textContent = 'Quitar a todos'; } }, 4000);
    return;
  }
  b.disabled = true; b.textContent = 'Quitando…';
  const c = await MCAuth.listo;
  const r = await c.rpc('grupo_regalo_anular', { p_grupo: RG_GRUPO, p_envio: +b.dataset.rga });
  if (r.error) { b.disabled = false; b.textContent = 'Quitar a todos'; toast(rgVipError(r.error)); return; }
  rgVipTomar(r.data);
  toast('Regalo quitado a todo el grupo');
  pintarVip();
}

async function rgVipGuardar() {
  const btn = $('rgVipGuardar'); btn.disabled = true; btn.textContent = 'Guardando…';
  const c = await MCAuth.listo;
  const r = await c.rpc('grupo_regalo_guardar', { p_grupo: RG_GRUPO, p_codigos: RG.borrador });
  if (r.error) { btn.disabled = false; btn.textContent = 'Guardar grupo'; toast(rgVipError(r.error)); return; }
  const malos = r.data.no_existen || [];
  rgVipTomar(r.data);
  // Los que no existen se quedan a la vista (en rojo) para que los corrijas
  RG.borrador = RG.borrador.concat(malos);
  const ent = r.data.entraron || 0, sal = r.data.salieron || 0;
  toast('Grupo VIP guardado: ' + RG.grupo.miembros.length + ' alumnos' + (ent ? ' · ' + ent + ' recibieron los regalos del grupo' : '') + (sal ? ' · a ' + sal + ' se les quitaron' : ''));
  pintarVip();
}

function rgVipResumen() {
  const t = RG_TIPOS[RG.tipo], n = RG.grupo ? RG.grupo.miembros.length : 0;
  let ok = n > 0 && !rgVipCambios(), txt = '';
  if (RG.tipo === 'item') { ok = ok && RG.sel.length > 0; txt = rgSelTexto(); }
  else if (t.max && !(RG.cant >= t.min && RG.cant <= t.max)) { ok = false; txt = 'Elige de ' + t.min + ' a ' + t.max.toLocaleString('es-PE') + ' ' + t.uni; }
  else txt = rgTexto({ tipo: RG.tipo, cantidad: RG.cant });
  const btn = $('rgDar'); if (!btn) return;
  btn.disabled = !ok || RG.enviando;
  if (!RG.confirmar) btn.textContent = 'Regalar a todos';
  $('rgRes').innerHTML = rgVipCambios() ? 'Primero guarda el grupo' : esc(txt) + (ok ? ' para cada uno de los <b>' + n + '</b>' : '');
}

async function rgVipDar() {
  if (RG.enviando) return;
  const btn = $('rgDar');
  // Dos toques: el primero pide confirmar (llega a todos y no se deshace)
  if (!RG.confirmar) {
    RG.confirmar = true; btn.textContent = '¿Seguro? Toca otra vez';
    clearTimeout(RG.confT); RG.confT = setTimeout(() => { RG.confirmar = false; rgVipResumen(); }, 4000);
    return;
  }
  clearTimeout(RG.confT); RG.confirmar = false;
  RG.enviando = true; rgVipResumen(); btn.textContent = 'Regalando…';
  const c = await MCAuth.listo, nota = $('rgNota').value.trim() || null, txt = RG.tipo === 'item' ? rgSelTexto() : rgTexto({ tipo: RG.tipo, cantidad: RG.cant });
  const r = await rgEnviar(it => c.rpc('grupo_regalo_dar', { p_grupo: RG_GRUPO, p_tipo: RG.tipo, p_cantidad: RG.tipo === 'item' ? null : RG.cant, p_item: it, p_nota: nota }));
  RG.enviando = false;
  if (r.error) { if (r.data) rgVipTomar(r.data); rgVipResumen(); toast(rgFaltaSql(r.error) || rgVipError(r.error)); return; }
  toast(txt + ' para ' + r.data.recibieron + (r.data.recibieron === 1 ? ' alumno' : ' alumnos') + (r.saltados ? ' · ' + r.saltados + ' ya lo tenían' : ''));
  rgVipTomar(r.data); RG.sel = [];
  pintarVip();
}

// Rayos y Todos necesitan supabase/100-regalar-todos-rayos.sql
function rgFaltaSql(e) {
  const m = (e && e.message) || '';
  return /regalos_tipo_check|tipo de regalo no válido|regalo_todos|function|does not exist|schema cache/i.test(m) ? 'Falta correr supabase/100-regalar-todos-rayos.sql en Supabase.' : '';
}

/* ---------- Todos: el mismo regalo a cada alumno de la web (solo admins) ---------- */
async function rgTodosCargar() {
  RG.todosCargando = true; RG.todosError = ''; pintarRegalos();
  const c = await MCAuth.listo;
  const r = await c.rpc('regalo_todos_ver');
  RG.todosCargando = false;
  if (r.error) { RG.todosError = /no autorizado/i.test(r.error.message || '') ? 'Solo un administrador puede regalar a todos.' : rgFaltaSql(r.error) || r.error.message || 'No se pudo.'; pintarRegalos(); return; }
  RG.todos = r.data;
  pintarRegalos();
}

function pintarTodos() {
  const cab = rgModosHtml();
  if (RG.todosError) { $('rgCuerpo').innerHTML = cab + `<div class="state-msg error">${esc(RG.todosError)}</div>`; rgModosEventos(); return; }
  if (!RG.todos && !RG.todosCargando) { rgTodosCargar(); return; }
  if (RG.todosCargando || !RG.todos) { $('rgCuerpo').innerHTML = cab + '<div class="loader">Contando a los alumnos…</div>'; rgModosEventos(); return; }
  const T = RG.todos, ult = (T.envios || [])[0];
  $('rgCuerpo').innerHTML = cab + `
    <div class="agp-form">
      <h3>¿A quién?</h3>
      <div class="rg-todos">
        <div class="rg-todos-n">${(+T.alumnos).toLocaleString('es-PE')}<small>${T.alumnos === 1 ? 'alumno' : 'alumnos'}</small></div>
        <p>El regalo le llega a <b>cada alumno con cuenta</b> en la web. <b>${(+T.activos || 0).toLocaleString('es-PE')}</b> entraron en los últimos 7 días; los demás lo verán cuando vuelvan. Los suspendidos o baneados no reciben nada. Solo los administradores ven esta opción.</p>
      </div>
    </div>
    ${rgFormHtml(!T.alumnos, '¿Qué les regalas a todos?', 'Regalar a todos')}
    ${ult && rgHoyLima(ult.creado) ? `<div class="rg-aviso" style="margin:-4px 0 16px">Hoy ya les diste a todos: <b>${esc(rgTexto(ult))}</b> (${rgFecha(ult.creado)}).</div>` : ''}
    ${(T.envios || []).length ? `<div class="agp-form"><h3>Regalos a todos</h3>${T.envios.map(x => `<div class="rg-h" style="--c:${(RG_TIPOS[x.tipo] || RG_TIPOS.item).c}"><i></i><div><b>${esc(rgTexto(x))}</b> · ${(+x.recibieron).toLocaleString('es-PE')} ${x.recibieron === 1 ? 'alumno' : 'alumnos'}${x.saltados && x.tipo === 'item' ? ' (' + x.saltados + ' ya lo tenían)' : ''}${x.nota ? ' · «' + esc(x.nota) + '»' : ''}<br><small>${esc(x.de || 'Admin')} · ${rgFecha(x.creado)}</small></div></div>`).join('')}</div>` : ''}`;
  rgModosEventos();
  if (T.alumnos) { rgFormEventos(rgTodosConfirmar); rgOpciones(); }
}

function rgTodosResumen() {
  const t = RG_TIPOS[RG.tipo], n = RG.todos ? +RG.todos.alumnos : 0;
  let ok = n > 0, txt = '';
  if (RG.tipo === 'item') { ok = ok && RG.sel.length > 0; txt = rgSelTexto(); }
  else if (t.max && !(RG.cant >= t.min && RG.cant <= t.max)) { ok = false; txt = 'Elige de ' + t.min + ' a ' + t.max.toLocaleString('es-PE') + ' ' + t.uni; }
  else txt = rgTexto({ tipo: RG.tipo, cantidad: RG.cant });
  const btn = $('rgDar'); if (!btn) return;
  btn.disabled = !ok || RG.enviando;
  $('rgRes').innerHTML = esc(txt) + (ok ? ' para cada uno de los <b>' + n.toLocaleString('es-PE') + '</b> alumnos' : '');
}

// Llega a todos y no se deshace: una ventana que dice qué y a cuántos antes de darlo
function rgTodosConfirmar() {
  if (RG.enviando) return;
  const n = +RG.todos.alumnos, tipo = RG.tipo, cant = RG.cant, item = RG.sel.slice(), nota = $('rgNota').value.trim();
  const txt = tipo === 'item' ? rgSelTexto() : rgTexto({ tipo, cantidad: cant });
  const o = document.createElement('div');
  o.className = 'ov';
  o.innerHTML = `<div class="mcard rg-conf" style="max-width:460px;--c:${RG_TIPOS[tipo].c}">
    <div class="rg-conf-ic">${RG_IC[tipo]}</div>
    <h3>¿Regalar a todos?</h3>
    <div class="rg-conf-que">${esc(txt)}</div>
    <p class="sub">para cada uno de los <b>${n.toLocaleString('es-PE')} alumnos</b>${nota ? ', con la nota «' + esc(nota) + '»' : ''}.<br>Les llega al toque y <b>no se puede deshacer</b>.</p>
    <div class="mfoot"><button type="button" class="btn-ghost" data-x>Cancelar</button>
    <button type="button" class="btn-main" data-ok>Sí, regalar a ${n.toLocaleString('es-PE')}</button></div></div>`;
  document.body.appendChild(o);
  const fin = () => { o.remove(); document.removeEventListener('keydown', esc_); };
  const esc_ = e => { if (e.key === 'Escape') fin(); };
  document.addEventListener('keydown', esc_);
  o.addEventListener('mousedown', e => { if (e.target === o) fin(); });
  o.querySelector('[data-x]').addEventListener('click', fin);
  o.querySelector('[data-ok]').addEventListener('click', () => { fin(); rgTodosDar(tipo, cant, item, nota); });
  o.querySelector('[data-x]').focus();
}

async function rgTodosDar(tipo, cant, item, nota) {
  if (RG.enviando) return;
  RG.enviando = true; rgTodosResumen();
  const btn = $('rgDar'); btn.textContent = 'Regalando a todos…';
  const c = await MCAuth.listo, txt = tipo === 'item' ? rgSelTexto(item) : rgTexto({ tipo, cantidad: cant });
  const r = await rgEnviar(it => c.rpc('regalo_todos_dar', { p_tipo: tipo, p_cantidad: tipo === 'item' ? null : cant, p_item: it, p_nota: nota || null }), item);
  RG.enviando = false;
  if (r.error) { btn.textContent = 'Regalar a todos'; if (r.data) RG.todos = r.data; rgTodosResumen(); toast(rgFaltaSql(r.error) || r.error.message || 'No se pudo regalar'); return; }
  toast(txt + ' para ' + (+r.data.recibieron).toLocaleString('es-PE') + (r.data.recibieron === 1 ? ' alumno' : ' alumnos') + (r.saltados && tipo === 'item' ? ' · ' + r.saltados + ' ya lo tenían' : ''));
  RG.todos = r.data; RG.sel = [];
  pintarTodos();
}

/* ---------- Influencers: los de Panel → Influencers (supabase/107-regalos-influencers.sql) ---------- */
async function rgInfCargar() {
  RG.infCargando = true; RG.infError = ''; pintarRegalos();
  const c = await MCAuth.listo;
  const r = await c.rpc('grupo_regalo_ver', { p_grupo: 'influencer' });
  RG.infCargando = false;
  if (r.error) { RG.infError = rgVipError(r.error); pintarRegalos(); return; }
  RG.inf = { miembros: r.data.miembros || [], envios: r.data.envios || [] };
  pintarRegalos();
}

function pintarInf() {
  const cab = rgModosHtml();
  if (RG.infError) { $('rgCuerpo').innerHTML = cab + `<div class="state-msg error">${esc(RG.infError)}</div>`; rgModosEventos(); return; }
  if (!RG.inf && !RG.infCargando) { rgInfCargar(); return; }
  if (RG.infCargando || !RG.inf) { $('rgCuerpo').innerHTML = cab + '<div class="loader">Cargando a los influencers…</div>'; rgModosEventos(); return; }
  const I = RG.inf, n = I.miembros.length, ult = I.envios[0];
  const chips = I.miembros.map(m => {
    const ini = (m.apodo || m.email || '?').trim().charAt(0).toUpperCase();
    return `<span class="rg-chip${rgDormido(m) ? ' dormido' : ''}" title="${esc((m.email || '') + ' · ' + rgVistoTxt(m.visto))}">
      <span class="rg-foto"${m.foto ? ` style="background-image:url('${esc(m.foto)}')"` : ''}>${m.foto ? '' : esc(ini)}</span>
      <span>${esc(m.apodo || 'Sin apodo')} <small>· ${m.codigo} · ${rgVistoTxt(m.visto)}</small></span></span>`;
  }).join('');
  $('rgCuerpo').innerHTML = cab + `
    <div class="agp-form">
      <div class="rg-vip-cab"><h3 style="margin:0">Influencers</h3><span class="rg-cuenta">${n} ${n === 1 ? 'influencer' : 'influencers'}</span></div>
      <p class="hint">Son los mismos de Panel → Influencers: para agregar o quitar a alguien, hazlo ahí. Dales primero lo nuevo y luego regálaselo al resto.</p>
      ${n ? `<div class="rg-chips">${chips}</div>` : '<p class="hint" style="margin-top:12px">Aún no hay influencers. Si ya los agregaste en Panel → Influencers, falta correr supabase/107-regalos-influencers.sql en Supabase.</p>'}
    </div>
    ${rgFormHtml(!n, '¿Qué les regalas a los influencers?', 'Regalar a los influencers')}
    ${ult && rgHoyLima(ult.creado) ? `<div class="rg-aviso" style="margin:-4px 0 16px">Hoy ya les diste: <b>${esc(rgTexto(ult))}</b> (${rgFecha(ult.creado)}).</div>` : ''}
    ${I.envios.length ? `<div class="agp-form"><h3>Regalos a los influencers</h3>${I.envios.map(x => `<div class="rg-h" style="--c:${(RG_TIPOS[x.tipo] || RG_TIPOS.item).c}"><i></i><div><b>${esc(rgTexto(x))}</b> · ${x.recibieron} ${x.recibieron === 1 ? 'influencer' : 'influencers'}${x.saltados ? ' (' + x.saltados + ' ya lo tenían)' : ''}${x.nota ? ' · «' + esc(x.nota) + '»' : ''}<br><small>${esc(x.de || 'Admin')} · ${rgFecha(x.creado)}</small></div></div>`).join('')}</div>` : ''}`;
  rgModosEventos();
  if (n) { rgFormEventos(rgInfDar); rgOpciones(); }
}

function rgInfResumen() {
  const t = RG_TIPOS[RG.tipo], n = RG.inf ? RG.inf.miembros.length : 0;
  let ok = n > 0, txt = '';
  if (RG.tipo === 'item') { ok = ok && RG.sel.length > 0; txt = rgSelTexto(); }
  else if (t.max && !(RG.cant >= t.min && RG.cant <= t.max)) { ok = false; txt = 'Elige de ' + t.min + ' a ' + t.max.toLocaleString('es-PE') + ' ' + t.uni; }
  else txt = rgTexto({ tipo: RG.tipo, cantidad: RG.cant });
  const btn = $('rgDar'); if (!btn) return;
  btn.disabled = !ok || RG.enviando;
  if (!RG.confirmar && !RG.enviando) btn.textContent = 'Regalar a los influencers';
  $('rgRes').innerHTML = esc(txt) + (ok ? ' para cada uno de los <b>' + n + '</b>' : '');
}

async function rgInfDar() {
  if (RG.enviando) return;
  const btn = $('rgDar');
  if (!RG.confirmar) {
    RG.confirmar = true; btn.textContent = '¿Seguro? Toca otra vez';
    clearTimeout(RG.confT); RG.confT = setTimeout(() => { RG.confirmar = false; rgInfResumen(); }, 4000);
    return;
  }
  clearTimeout(RG.confT); RG.confirmar = false;
  RG.enviando = true; rgInfResumen(); btn.textContent = 'Regalando…';
  const c = await MCAuth.listo, nota = $('rgNota').value.trim() || null, txt = RG.tipo === 'item' ? rgSelTexto() : rgTexto({ tipo: RG.tipo, cantidad: RG.cant });
  const r = await rgEnviar(it => c.rpc('grupo_regalo_dar', { p_grupo: 'influencer', p_tipo: RG.tipo, p_cantidad: RG.tipo === 'item' ? null : RG.cant, p_item: it, p_nota: nota }));
  RG.enviando = false;
  const err = r.error && (/vacío/i.test(r.error.message || '') ? 'Aún no hay influencers.' : /regalo_grupo_de|function|does not exist|schema cache/i.test(r.error.message || '') ? 'Falta correr supabase/107-regalos-influencers.sql en Supabase.' : r.error.message);
  if (r.data) RG.inf = { miembros: r.data.miembros || [], envios: r.data.envios || [] };
  if (r.error) { rgInfResumen(); toast(err || 'No se pudo regalar'); return; }
  toast(txt + ' para ' + r.data.recibieron + (r.data.recibieron === 1 ? ' influencer' : ' influencers') + (r.saltados ? ' · ' + r.saltados + ' ya lo tenían' : ''));
  RG.sel = [];
  pintarInf();
}
