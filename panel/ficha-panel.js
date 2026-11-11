/* =========================================================
   Panel · Ficha del alumno y Por vencer (Alumnos)
   - Ficha: todo de un alumno en una pantalla (datos, accesos por ID y por
     código, equipos, historial, pagos, nota, suspender, regalar…).
     Se abre tocando un alumno de la lista o buscando por ID, correo,
     nombre, celular o código.
   - Por vencer: accesos que vencen pronto, con WhatsApp y +30 días.
   Datos: supabase/86-ficha-alumno.sql. Usa darPorId (codigos-panel.js)
   para dar y editar accesos por ID, y la hoja (api 'codigos') para los códigos.
   Regalos e Influencers ya no van en el menú: se abren desde la ficha.
   ========================================================= */
const FX = { a: null, usuario: null, volver: null, pv: null, pvVer: 'prox', pvProd: '' };
const FX_FALTA = 'Falta correr supabase/86-ficha-alumno.sql en Supabase.';
const FX_MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
const FX_MEDIOS = { yape: 'Yape', plin: 'Plin', efectivo: 'Efectivo', transferencia: 'Transferencia', otro: 'Otro' };
const FX_ICO = {
  llave: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
  equipo: '<rect x="5" y="2" width="14" height="20" rx="3"/><path d="M11 18h2"/>',
  historial: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><polyline points="3 3 3 8 8 8"/><polyline points="12 7 12 12 15 14"/>',
  estrella: '<path d="m12 2.5 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.3l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z"/>',
  descarga: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
  copa: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  libro: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  candado: '<rect x="4" y="10.5" width="16" height="11" rx="3"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
  reloj: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5"/><path d="M9 2h6"/>',
  wa: '<path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/>'
};
const fxSvg = (k, extra) => `<svg viewBox="0 0 24 24" ${k === 'wa' || k === 'estrella' ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"'} aria-hidden="true"${extra || ''}>${FX_ICO[k]}</svg>`;

(function estilosFicha() {
  const st = document.createElement('style');
  st.textContent = `
  .tab.fuera-menu { display: none !important; }
  .fx-grid { display: grid; grid-template-columns: 340px 1fr; gap: 18px; align-items: start; }
  .fx-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 18px; align-items: start; }
  .fx-card { background: var(--surface); border: 2px solid #2A2346; border-bottom-width: 5px; border-radius: 18px; padding: 18px; min-width: 0; }
  .fx-card h3 { font: 900 16px Nunito, sans-serif; margin: 0 0 12px; display: flex; align-items: center; gap: 8px; }
  .fx-card h3 svg { width: 18px; height: 18px; color: var(--accent); flex-shrink: 0; }
  .fx-card h3 span { color: var(--text-faint); font-weight: 700; font-size: 13px; }
  .fx-yo { display: flex; gap: 14px; align-items: center; min-width: 0; }
  .fx-av { width: 64px; height: 64px; border-radius: 18px; background: linear-gradient(135deg, #C6E000, #7aa000); display: grid; place-items: center; font: 1000 28px Nunito, sans-serif; color: #151A03; flex-shrink: 0; overflow: hidden; }
  .fx-av img { width: 100%; height: 100%; object-fit: cover; }
  .fx-yo > div { min-width: 0; }
  .fx-yo b { font: 900 20px Nunito, sans-serif; display: block; overflow-wrap: anywhere; }
  .fx-yo small { color: var(--text-dim); display: block; font-size: 13px; overflow-wrap: anywhere; }
  .fx-id { display: inline-block; margin-top: 6px; background: #272041; color: var(--accent); font: 900 12px Nunito, sans-serif; border-radius: 8px; padding: 3px 8px; letter-spacing: 1px; }
  .fx-dat { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px; }
  .fx-dat div { background: #1D1834; border-radius: 12px; padding: 10px; min-width: 0; }
  .fx-dat small { color: var(--text-faint); font: 800 10.5px Nunito, sans-serif; letter-spacing: 1px; text-transform: uppercase; display: block; }
  .fx-dat b { font: 900 16px Nunito, sans-serif; overflow-wrap: anywhere; }
  .fx-bts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 16px; }
  .fx-bts button { justify-content: center; }
  .fx-bts .btn-main { grid-column: 1 / -1; }
  .fx-acc { display: flex; align-items: center; gap: 12px; padding: 12px; border: 2px solid #2A2346; border-radius: 14px; margin-bottom: 8px; background: #120E22; }
  .fx-acc.paso { opacity: .6; }
  .fx-ico { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; flex-shrink: 0; }
  .fx-ico svg { width: 22px; height: 22px; }
  .fx-acc .t { flex: 1; min-width: 0; }
  .fx-acc .t b { font: 900 15px Nunito, sans-serif; display: block; overflow-wrap: anywhere; }
  .fx-acc .t small { color: var(--text-dim); font-size: 12.5px; }
  .fx-bar { height: 6px; border-radius: 4px; background: #2A2346; margin-top: 7px; overflow: hidden; }
  .fx-bar i { display: block; height: 100%; border-radius: 4px; }
  .fx-acc .b { display: flex; gap: 6px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }
  .fx-pill { white-space: nowrap; font: 900 10.5px Nunito, sans-serif; letter-spacing: .06em; text-transform: uppercase; border-radius: 8px; padding: 3px 7px; margin-left: 6px; background: #272041; vertical-align: 2px; }
  .fx-eq { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #221C3B; font-size: 13.5px; }
  .fx-eq:last-child { border: 0; }
  .fx-eq small { color: var(--text-dim); display: block; }
  .fx-his { font-size: 13px; color: var(--text-dim); line-height: 1.5; }
  .fx-his div { padding: 6px 0; border-bottom: 1px solid #1E1936; }
  .fx-his div:last-child { border: 0; }
  .fx-his b { color: var(--text); }
  .fx-nota { width: 100%; box-sizing: border-box; margin-top: 12px; background: rgba(251,191,36,.06); border: 1px solid rgba(251,191,36,.3); color: #FBBF24; border-radius: 12px; padding: 10px 12px; font: 700 13px/1.5 Nunito, sans-serif; resize: vertical; min-height: 60px; }
  .fx-nota::placeholder { color: rgba(251,191,36,.5); }
  .fx-susp { margin-top: 12px; background: rgba(255,75,75,.1); border: 1px solid rgba(255,75,75,.35); color: #FF8A8A; border-radius: 12px; padding: 10px 12px; font: 800 13px Nunito, sans-serif; }
  .btn-ghost.rojo { color: var(--red); border-color: rgba(224,60,60,.4); }
  .btn-ghost.mini { padding: 7px 10px; font-size: 12.5px; }
  .btn-ghost.lima { color: var(--accent); border-color: rgba(198,224,0,.45); }
  .btn-ghost.wa { background: #25D366; color: #06240F; border-color: #25D366; font-weight: 800; }
  .btn-ghost.wa svg, .fx-bts .btn-ghost svg { width: 16px; height: 16px; }
  .fx-res { display: flex; flex-direction: column; gap: 6px; margin: 10px 0 16px; }
  .fx-res button { display: flex; align-items: center; gap: 12px; text-align: left; background: var(--surface); border: 2px solid #2A2346; border-radius: 14px; padding: 10px 12px; color: var(--text); cursor: pointer; font: inherit; }
  .fx-res button:hover { border-color: var(--accent); }
  .fx-res .fx-av { width: 38px; height: 38px; border-radius: 12px; font-size: 16px; }
  .fx-res small { color: var(--text-dim); display: block; }
  .al-tabla tbody tr { cursor: pointer; }
  .al-tabla tbody tr:hover td { background: #1B1631; }
  .fx-ops { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
  .fx-op { padding: 8px 13px; border-radius: 12px; border: 2px solid #2F284E; background: transparent; color: var(--text); font: 900 13.5px Nunito, sans-serif; cursor: pointer; }
  .fx-op.on { border-color: var(--accent); color: var(--accent); background: rgba(198,224,0,.1); }
  .fx-volver { margin-bottom: 14px; }
  .pv-res { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
  .pv-res div { background: var(--surface); border: 2px solid #2A2346; border-radius: 16px; padding: 14px; }
  .pv-res small { color: var(--text-faint); font: 800 11px Nunito, sans-serif; letter-spacing: 1px; text-transform: uppercase; }
  .pv-res b { display: block; font: 1000 26px Nunito, sans-serif; margin-top: 4px; }
  .pv-f { display: flex; align-items: center; gap: 14px; padding: 12px 14px; border: 2px solid #2A2346; border-radius: 16px; background: var(--surface); margin-bottom: 8px; }
  .pv-n { width: 54px; height: 54px; border-radius: 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; font: 1000 20px/1 Nunito, sans-serif; flex-shrink: 0; }
  .pv-n small { font: 900 10px Nunito, sans-serif; text-transform: uppercase; margin-top: 3px; }
  .pv-t { flex: 1; min-width: 0; }
  .pv-t b { font: 900 15px Nunito, sans-serif; display: block; overflow-wrap: anywhere; }
  .pv-t small { color: var(--text-dim); font-size: 12.5px; }
  .pv-b { display: flex; gap: 6px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }
  @media (max-width: 900px) { .fx-grid, .fx-2 { grid-template-columns: 1fr; } }
  @media (max-width: 700px) { .fx-acc, .pv-f { flex-wrap: wrap; } .fx-acc .b, .pv-b { width: 100%; } .pv-res b { font-size: 20px; } }`;
  document.head.appendChild(st);
})();

/* ---------- Ayudas ---------- */
async function fxRpc(fn, args) {
  const r = await (await MCAuth.listo).rpc(fn, args || {});
  if (r.error) throw r.error;
  return r.data;
}
const fxErr = e => /(could not find|does not exist|schema cache)/i.test(e && e.message || '') ? FX_FALTA
  : /no autorizado/.test(e && e.message || '') ? 'Tu cuenta no tiene permiso para esto.' : (e && e.message) || 'No se pudo.';
function fxHoy() { return new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10); }
function fxDias(v) { return Math.round((new Date(v + 'T00:00:00Z') - new Date(fxHoy() + 'T00:00:00Z')) / 864e5); }
function fxFecha(v) { if (!v) return '—'; const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? v + 'T12:00:00' : v); return isNaN(d) ? esc(v) : d.getDate() + ' ' + FX_MES[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''); }
function fxHace(t) {
  if (!t) return '';
  const m = (Date.now() - new Date(t)) / 60000;
  return m < 60 ? 'hace ' + Math.max(1, Math.round(m)) + ' min' : m < 1440 ? 'hace ' + Math.round(m / 60) + ' h' : m < 2880 ? 'ayer' : 'hace ' + Math.round(m / 1440) + ' días';
}
function fxSumar(v, dias) {
  const base = v && /^\d{4}-\d{2}-\d{2}$/.test(v) && v > fxHoy() ? v : fxHoy();
  const d = new Date(base + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + dias); return d.toISOString().slice(0, 10);
}
function fxIcoProd(p) {
  p = String(p || '');
  if (/TODO-VIP/.test(p)) return ['estrella', '#C6E000'];
  if (/descarga/.test(p)) return ['descarga', '#38BDF8'];
  if (/simulacro|duelo|examenes|general/.test(p)) return ['copa', '#FF9600'];
  if (/vocabulario|biblioteca/.test(p)) return ['libro', '#CE82FF'];
  return ['llave', '#1CB0F6'];
}
const fxProd = p => typeof etiquetaProd === 'function' ? etiquetaProd(p) : p;
function fxWa(celular, msg) {
  const n = String(celular || '').replace(/\D/g, '');
  return 'https://wa.me/' + (n.length === 9 ? '51' + n : n) + '?text=' + encodeURIComponent(msg);
}
function fxModal(html) {
  const o = document.createElement('div');
  o.className = 'ov';
  o.innerHTML = `<div class="mcard" style="max-width:460px;"><button class="mx" type="button" aria-label="Cerrar"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>${html}</div>`;
  document.body.appendChild(o); document.body.classList.add('modal-open');
  const cerrar = () => { o.remove(); document.body.classList.remove('modal-open'); };
  o.querySelector('.mx').addEventListener('click', cerrar);
  o.querySelectorAll('[data-x]').forEach(b => b.addEventListener('click', cerrar));
  o.addEventListener('click', e => { if (e.target === o) cerrar(); });
  return { o, cerrar };
}
function fxOps(caja, alElegir) {
  caja.addEventListener('click', e => {
    const b = e.target.closest('.fx-op'); if (!b) return;
    caja.querySelectorAll('.fx-op').forEach(x => x.classList.toggle('on', x === b));
    if (alElegir) alElegir(b.dataset.v);
  });
}

// Los códigos están en la hoja (Apps Script): se traen una vez si el panel tiene la contraseña
async function fxCodigos() {
  if (CD.cargada) return CD.lista;
  if (!PASS) return null;
  try { const r = await api('codigos'); CD.lista = r.codigos || []; CD.hoy = r.hoy; CD.cargada = true; return CD.lista; }
  catch (e) { return null; }
}

/* ---------- Ficha ---------- */
function fxPrepararAlumnos() {
  const tab = $('tab-alumnos');
  if ($('fxVista')) return;
  // La lista de siempre queda en #aluLista; la ficha en #fxVista
  const lista = document.createElement('div'); lista.id = 'aluLista';
  while (tab.firstChild) lista.appendChild(tab.firstChild);
  tab.appendChild(lista);
  const v = document.createElement('div'); v.id = 'fxVista'; v.hidden = true; tab.appendChild(v);
  // Buscar ficha desde la cabecera de la lista
  const head = lista.querySelector('.page-head');
  const caja = document.createElement('div');
  caja.className = 'toolbar';
  caja.innerHTML = `<input class="search" id="fxBuscarLista" type="search" placeholder="Abrir ficha: ID, correo, nombre, celular o código…" autocomplete="off"><div class="fx-res" id="fxResLista"></div>`;
  head.after(caja);
  fxBuscador($('fxBuscarLista'), $('fxResLista'));
  $('aluStats').insertAdjacentHTML('afterend', '<p style="margin-top:4px;color:var(--text-faint);font-size:12.5px">Toca un alumno para abrir su ficha.</p>');
}

function fxBuscador(inp, res) {
  let t = null, n = 0;
  const buscar = async () => {
    const q = inp.value.trim(), mio = ++n;
    if (q.length < 2) { res.innerHTML = ''; return; }
    res.innerHTML = '<div class="loader">Buscando…</div>';
    try {
      const L = await fxRpc('ficha_buscar', { p_q: q });
      if (mio !== n) return;
      if (!L.length) { res.innerHTML = '<div class="state-msg">Nadie coincide con eso.</div>'; return; }
      res.innerHTML = L.map(a => `<button type="button" data-u="${esc(a.usuario)}"><span class="fx-av">${a.foto ? `<img src="${esc(a.foto)}" alt="" referrerpolicy="no-referrer">` : esc((a.apodo || '?').charAt(0).toUpperCase())}</span>
        <span><b>${esc(a.apodo || a.nombre || 'Sin apodo')}</b><small>${a.jid ? 'ID ' + a.jid + ' · ' : ''}${esc(a.email || '')}</small></span></button>`).join('');
    } catch (e) { res.innerHTML = `<div class="state-msg error">${esc(fxErr(e))}</div>`; }
  };
  inp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(buscar, 350); });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { clearTimeout(t); buscar(); } });
  res.addEventListener('click', e => { const b = e.target.closest('[data-u]'); if (b) { inp.value = ''; res.innerHTML = ''; abrirFicha(b.dataset.u); } });
}

function fxIrAlumnos() {
  const t = document.querySelector('.tab[data-tab="alumnos"]');
  FX.abriendo = true;
  if (t && !(t.classList.contains('on') && !$('tab-alumnos').hidden)) t.click();
  FX.abriendo = false;
}

async function abrirFicha(usuario) {
  fxPrepararAlumnos();
  fxIrAlumnos();
  FX.usuario = usuario;
  $('aluLista').hidden = true; $('fxVista').hidden = false;
  $('barraTitulo').textContent = 'Ficha del alumno';
  window.scrollTo(0, 0);
  $('fxVista').innerHTML = '<div class="loader">Cargando ficha…</div>';
  try {
    const [a] = await Promise.all([fxRpc('ficha_alumno', { p_usuario: usuario }), fxCodigos()]);
    if (FX.usuario !== usuario) return;
    if (!a) { $('fxVista').innerHTML = '<div class="state-msg">Ese alumno ya no existe.</div>'; return; }
    FX.a = a;
    pintarFicha();
  } catch (e) { $('fxVista').innerHTML = `<button class="btn-ghost fx-volver" type="button" data-fx="lista">← Lista de alumnos</button><div class="state-msg error">${esc(fxErr(e))}</div>`; }
}
function cerrarFicha() {
  FX.usuario = null; FX.a = null;
  if (!$('fxVista')) return;
  $('fxVista').hidden = true; $('aluLista').hidden = false;
  $('barraTitulo').textContent = 'Alumnos y fichas';
}

// Accesos de la ficha: por ID (Supabase) y por código (cuenta + la hoja si está cargada)
function fxAccesos(a) {
  const hoy = fxHoy(), L = [];
  (a.por_id || []).forEach(x => L.push({ origen: 'id', id: x.id, producto: x.producto, vence: x.vence, nota: x.nota, raw: x }));
  (a.codigos || []).forEach(x => {
    const c = CD.cargada ? CD.lista.find(k => k.codigo === x.codigo) : null;
    L.push({ origen: 'codigo', codigo: x.codigo, producto: c ? c.producto : x.producto, vence: c ? c.vence : x.vence,
      estado: c ? c.estado : '', hoja: c, nota: c && c.nota });
  });
  L.forEach(x => {
    x.vencido = !!(x.vence && x.vence < hoy) || x.estado === 'Vencido' || x.estado === 'Desactivado';
    x.dias = x.vence ? fxDias(x.vence) : null;
  });
  return L.sort((p, q) => (p.vencido - q.vencido) || String(p.vence || '9').localeCompare(String(q.vence || '9')));
}

function pintarFicha() {
  const a = FX.a, p = a.perfil || {}, acc = fxAccesos(a), activos = acc.filter(x => !x.vencido).length;
  const nom = p.nombre || a.apodo || (a.email || '').split('@')[0];
  const susp = a.suspension;
  const eqCod = acc.filter(x => x.hoja && x.hoja.dispositivos && x.hoja.dispositivos.length);
  const nEq = (a.equipos || []).length + eqCod.reduce((s, x) => s + x.hoja.dispositivos.length, 0);
  const puedeAdmin = ROL.admin;
  $('fxVista').innerHTML = `
  <div class="page-head"><div><div class="eyebrow">Alumnos · Ficha</div><h1 class="disp">Ficha del alumno</h1>
    <p>Todo de un alumno en un solo lugar: accesos, equipos, regalos y bloqueos.</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn-ghost" type="button" data-fx="lista">← Lista de alumnos</button><button class="btn-ghost" type="button" data-fx="recargar">Actualizar</button></div></div>
  <div class="toolbar"><input class="search" id="fxBuscar" type="search" placeholder="Buscar otro alumno: ID, correo, nombre, celular o código…" autocomplete="off"></div>
  <div class="fx-res" id="fxRes"></div>
  <div class="fx-grid">
    <div class="fx-card">
      <div class="fx-yo"><div class="fx-av">${p.foto ? `<img src="${esc(p.foto)}" alt="" referrerpolicy="no-referrer">` : esc((nom || '?').charAt(0).toUpperCase())}</div>
        <div><b>${esc(nom)}</b><small>${esc(a.email || '')}</small>${a.jid ? `<span class="fx-id">ID ${a.jid}</span>` : ''}</div></div>
      <div class="fx-dat">
        <div><small>Modalidad</small><b>${esc(p.modalidad || '—')}</b></div>
        <div><small>Carrera</small><b>${esc(p.carrera || '—')}</b></div>
        <div><small>Racha</small><b>${(a.racha && a.racha.actual) || 0} días</b></div>
        <div><small>Último estudio</small><b>${a.ultima_actividad ? fxFecha(a.ultima_actividad) : '—'}</b></div>
        <div><small>Cuenta desde</small><b>${fxFecha(a.creado)}</b></div>
        <div><small>Pagado total</small><b>S/ ${Number(a.pagado || 0).toLocaleString('es-PE')}</b></div>
        <div><small>Celular</small><b>${esc(p.celular || '—')}</b></div>
        <div><small>Descargas (30 días)</small><b>${(a.descargas && a.descargas.mes) || 0}</b></div>
      </div>
      ${susp ? `<div class="fx-susp">${susp.hasta ? 'Suspendida hasta el ' + fxFecha(susp.hasta) : 'Baneada para siempre'}${susp.motivo ? ' · ' + esc(susp.motivo) : ''}</div>` : ''}
      <div class="fx-bts">
        ${a.jid && puedeTab('codigos') ? '<button class="btn-main" type="button" data-fx="dar">＋ Dar acceso</button>' : ''}
        <button class="btn-ghost" type="button" data-fx="pago">Anotar pago</button>
        <button class="btn-ghost wa" type="button" data-fx="wa">${fxSvg('wa')} WhatsApp</button>
        ${a.jid && puedeTab('regalos') ? `<button class="btn-ghost" type="button" data-fx="regalar">Regalar</button>
        <button class="btn-ghost${a.influencer ? ' lima' : ''}" type="button" data-fx="influencer">Influencer: ${a.influencer ? 'sí' : 'no'}</button>` : ''}
        ${puedeAdmin ? `<button class="btn-ghost rojo" type="button" data-fx="suspender" style="grid-column:1/-1">${susp ? (susp.hasta ? 'Levantar suspensión' : 'Quitar baneo') : 'Suspender o banear'}</button>` : ''}
      </div>
      <textarea class="fx-nota" id="fxNota" maxlength="600" placeholder="Nota privada (solo la ves tú): cómo pagó, cuándo renueva…">${esc(a.nota || '')}</textarea>
    </div>
    <div>
      <div class="fx-card"><h3>${fxSvg('llave')}Accesos <span>— ${activos} activo${activos === 1 ? '' : 's'}</span></h3>
        ${acc.length ? acc.map(fxAccHtml).join('') : '<div class="state-msg">No tiene ningún acceso. Toca <b>＋ Dar acceso</b>.</div>'}
        ${(a.codigos || []).length && !CD.cargada ? '<div class="anp-ayuda" style="color:var(--text-faint);font-size:12.5px;margin-top:6px">Los códigos se ven con la fecha que guardó su cuenta. Entra al panel con la contraseña para ver la de la hoja y poder alargarlos.</div>' : ''}
      </div>
      <div class="fx-2">
        <div class="fx-card"><h3>${fxSvg('equipo')}Equipos <span>— ${nEq}${a.equipos_max ? ' de ' + a.equipos_max + ' por ID' : ''}</span></h3>
          ${(a.equipos || []).map(e => `<div class="fx-eq"><span>${esc(e.equipo || 'Equipo')}<small>por ID · último uso ${esc(fxHace(e.visto))}</small></span><button class="btn-ghost mini" type="button" data-lib-id="${esc(e.dispositivo)}">Liberar</button></div>`).join('')}
          ${eqCod.map(x => x.hoja.dispositivos.map(d => `<div class="fx-eq"><span>${esc(d.equipo || 'Equipo')}<small>código ${esc(x.codigo)} · último uso ${esc(fxFecha(d.ultimo))}</small></span><button class="btn-ghost mini" type="button" data-lib-cod="${esc(x.codigo)}" data-lib-dev="${esc(d.id)}">Liberar</button></div>`).join('')).join('')}
          ${nEq ? '' : '<div class="state-msg" style="padding:10px 0">Aún no abrió nada en ningún equipo.</div>'}
        </div>
        <div class="fx-card"><h3>${fxSvg('historial')}Historial</h3>
          <div class="fx-his">${(a.historial || []).length ? a.historial.map(h => `<div><b>${fxFecha(h.t)}</b> · ${esc(h.txt)}</div>`).join('') : 'Sin movimientos todavía.'}</div>
        </div>
      </div>
    </div>
  </div>`;
  fxBuscador($('fxBuscar'), $('fxRes'));
  let tN = null;
  $('fxNota').addEventListener('input', () => { clearTimeout(tN); tN = setTimeout(fxGuardarNota, 900); });
  $('fxNota').addEventListener('blur', () => { clearTimeout(tN); fxGuardarNota(); });
}
function fxAccHtml(x) {
  const [ic, col] = fxIcoProd(x.producto);
  const pill = x.origen === 'id' ? '<span class="fx-pill" style="color:#38BDF8">Por ID</span>' : `<span class="fx-pill" style="color:#C6E000">Código ${esc(x.codigo)}</span>`;
  const est = x.estado === 'Desactivado' ? 'desactivado' : x.vencido ? 'venció el ' + fxFecha(x.vence) : x.vence ? `vence el ${fxFecha(x.vence)} · ${x.dias === 0 ? 'vence hoy' : 'quedan ' + x.dias + (x.dias === 1 ? ' día' : ' días')}` : 'sin vencimiento';
  const pct = x.vence && !x.vencido ? Math.max(4, Math.min(100, Math.round(x.dias / 30 * 100))) : 0;
  const color = x.dias !== null && x.dias <= 3 ? '#FF4B4B' : x.dias !== null && x.dias <= 7 ? '#FBBF24' : col;
  const ref = x.origen === 'id' ? `data-id="${x.id}"` : `data-cod="${esc(x.codigo)}"`;
  const puedeCod = x.origen === 'codigo' && x.hoja && PASS;
  let bts = '';
  if (x.origen === 'id' && puedeTab('codigos')) bts = `${x.vence ? `<button class="btn-ghost mini lima" type="button" data-ext ${ref}>${x.vencido ? 'Renovar 30 días' : '+30 días'}</button>` : ''}
    <button class="btn-ghost mini" type="button" data-ed ${ref}>Editar</button><button class="btn-ghost mini rojo" type="button" data-qu ${ref}>Quitar</button>`;
  else if (x.origen === 'codigo') bts = `${puedeCod && x.estado !== 'Desactivado' ? `<button class="btn-ghost mini lima" type="button" data-ext ${ref}>${x.vencido ? 'Renovar 30 días' : '+30 días'}</button>` : ''}
    <button class="btn-ghost mini" type="button" data-vercod="${esc(x.codigo)}">Ver en Códigos</button>`;
  return `<div class="fx-acc${x.vencido ? ' paso' : ''}"><span class="fx-ico" style="background:${col}1f;color:${col}">${fxSvg(ic)}</span>
    <div class="t"><b>${esc(fxProd(x.producto))}${pill}</b><small>${est}${x.nota ? ' · ' + esc(x.nota) : ''}</small>
    ${pct ? `<div class="fx-bar"><i style="width:${pct}%;background:${color}"></i></div>` : ''}</div>
    <div class="b">${bts}</div></div>`;
}

async function fxGuardarNota() {
  const a = FX.a, el = $('fxNota'); if (!a || !el) return;
  const v = el.value.trim(); if (v === (a.nota || '')) return;
  try { await fxRpc('alumno_nota_guardar', { p_usuario: a.usuario, p_nota: v }); a.nota = v; toast('Nota guardada'); }
  catch (e) { toast('No se guardó la nota: ' + fxErr(e), true); }
}

/* ---------- +30 días (acceso por ID o código) ---------- */
// x: { origen: 'id', id, vence } o { origen: 'codigo', codigo, hoja }; quien: { usuario, apodo }
function fxExtender(x, quien, despues) {
  let dias = 30, medio = 'yape';
  const m = fxModal(`<div class="eyebrow">Renovar</div><h3>${esc(fxProd(x.producto))}</h3>
    <div class="hint" style="margin-top:2px">${esc(quien.apodo || '')} · ${x.vence ? (x.vence < fxHoy() ? 'venció el ' : 'vence el ') + fxFecha(x.vence) : 'sin fecha'}</div>
    <label class="fld">¿Cuántos días más?</label>
    <div class="fx-ops" id="fxDias">${[7, 15, 30, 60, 90].map(d => `<button type="button" class="fx-op${d === 30 ? ' on' : ''}" data-v="${d}">${d} días</button>`).join('')}</div>
    <div class="hint" id="fxNueva" style="margin-top:10px"></div>
    ${quien.usuario ? `<label class="fld">Pagó (opcional) <span class="hint">se anota en su ficha y en tus ventas</span></label>
    <div class="cdgrid"><label>Monto S/<input class="inp" id="fxMonto" type="number" min="0" step="0.5" placeholder="Ej.: 15"></label></div>
    <div class="fx-ops" id="fxMedio">${Object.keys(FX_MEDIOS).map(k => `<button type="button" class="fx-op${k === medio ? ' on' : ''}" data-v="${k}">${FX_MEDIOS[k]}</button>`).join('')}</div>` : ''}
    <div class="err" id="fxErr"></div>
    <div class="mfoot"><button type="button" class="btn-ghost" data-x>Cancelar</button><button type="button" class="btn-main" id="fxOk">Renovar</button></div>`);
  const nueva = () => { m.o.querySelector('#fxNueva').innerHTML = 'Nueva fecha: <b style="color:#f5ffcc">' + fxFecha(fxSumar(x.vence, dias)) + '</b>'; };
  fxOps(m.o.querySelector('#fxDias'), v => { dias = +v; nueva(); });
  if (quien.usuario) fxOps(m.o.querySelector('#fxMedio'), v => { medio = v; });
  nueva();
  m.o.querySelector('#fxOk').addEventListener('click', async () => {
    const b = m.o.querySelector('#fxOk'), err = m.o.querySelector('#fxErr'); err.classList.remove('show');
    b.disabled = true; b.innerHTML = '<span class="spin-s"></span> Guardando…';
    try {
      let vence;
      if (x.origen === 'id') vence = await fxRpc('acceso_id_extender', { p_id: x.id, p_dias: dias });
      else {
        const c = x.hoja; if (!c) throw new Error('Entra al panel con la contraseña para alargar códigos.');
        vence = fxSumar(c.vence, dias);
        await api('guardarCodigo', { datos: JSON.stringify({ producto: c.producto, max: c.max, vence, nota: c.nota || '', editar: c.codigo, activo: true }) });
        Object.assign(c, { vence, activo: true, estado: 'Activo' });
        fxRpc('codigo_cuenta_vence', { p_codigo: c.codigo, p_vence: vence }).catch(() => {});
        if (typeof esDescarga === 'function' && esDescarga(c) && typeof sincronizarDescargas === 'function') sincronizarDescargas();
      }
      const monto = quien.usuario ? parseFloat(m.o.querySelector('#fxMonto').value) : 0;
      let aviso = '';
      if (monto > 0) {
        try { await fxRpc('alumno_pagar', { p_usuario: quien.usuario, p_monto: monto, p_medio: medio, p_producto: x.producto, p_nota: '+' + dias + ' días' }); }
        catch (e) { aviso = ' (no se anotó el pago: ' + fxErr(e) + ')'; }
      }
      m.cerrar();
      toast('Renovado hasta el ' + fxFecha(vence) + aviso, !!aviso);
      if (despues) despues();
    } catch (e) { b.disabled = false; b.textContent = 'Renovar'; err.textContent = fxErr(e); err.classList.add('show'); }
  });
}

function fxPago() {
  const a = FX.a; let medio = 'yape';
  const m = fxModal(`<div class="eyebrow">Ventas</div><h3>Anotar pago</h3>
    <div class="hint" style="margin-top:2px">${esc(a.apodo || '')} · ${esc(a.email || '')}</div>
    <div class="cdgrid"><label>Monto S/<input class="inp" id="fxMonto" type="number" min="0" step="0.5" placeholder="Ej.: 15"></label>
      <label style="grid-column: span 2;">¿Por qué? (opcional)<input class="inp" id="fxPor" maxlength="140" placeholder="Ej.: Descargas PDF 30 días"></label></div>
    <div class="fx-ops" id="fxMedio">${Object.keys(FX_MEDIOS).map(k => `<button type="button" class="fx-op${k === medio ? ' on' : ''}" data-v="${k}">${FX_MEDIOS[k]}</button>`).join('')}</div>
    <div class="err" id="fxErr"></div>
    <div class="mfoot"><button type="button" class="btn-ghost" data-x>Cancelar</button><button type="button" class="btn-main" id="fxOk">Guardar</button></div>`);
  fxOps(m.o.querySelector('#fxMedio'), v => { medio = v; });
  setTimeout(() => m.o.querySelector('#fxMonto').focus(), 50);
  m.o.querySelector('#fxOk').addEventListener('click', async () => {
    const err = m.o.querySelector('#fxErr'), monto = parseFloat(m.o.querySelector('#fxMonto').value);
    if (!(monto >= 0)) { err.textContent = 'Escribe el monto.'; err.classList.add('show'); return; }
    try { await fxRpc('alumno_pagar', { p_usuario: a.usuario, p_monto: monto, p_medio: medio, p_nota: m.o.querySelector('#fxPor').value.trim() || null }); m.cerrar(); toast('Pago anotado'); abrirFicha(a.usuario); }
    catch (e) { err.textContent = fxErr(e); err.classList.add('show'); }
  });
}

function fxSuspender() {
  const a = FX.a;
  if (a.suspension) {
    const m = fxModal(`<div class="eyebrow">Cuenta</div><h3>¿Levantar la suspensión?</h3><div class="hint">${esc(a.apodo || '')} podrá volver a entrar al toque.</div>
      <div class="mfoot"><button type="button" class="btn-ghost" data-x>Cancelar</button><button type="button" class="btn-main" id="fxOk">Levantar</button></div>`);
    m.o.querySelector('#fxOk').addEventListener('click', async () => {
      try { await fxRpc('alumno_suspender', { p_usuario: a.usuario, p_quitar: true }); m.cerrar(); toast('Suspensión levantada'); abrirFicha(a.usuario); }
      catch (e) { toast(fxErr(e), true); }
    });
    return;
  }
  let dias = 7;
  const m = fxModal(`<div class="eyebrow">Restringir</div><h3>Suspender o banear</h3>
    <div class="hint" style="margin-top:2px">${esc(a.apodo || '')} · ${esc(a.email || '')}<br>Por días le sale «Tu cuenta está suspendida» con la fecha en que vuelve. Para siempre le sale «Tu cuenta fue baneada». No puede usar nada y lo que tiene por ID deja de abrir.</div>
    <label class="fld">¿Por cuánto tiempo?</label>
    <div class="fx-ops" id="fxDias">${[[1, '1 día'], [3, '3 días'], [7, '7 días'], [30, '30 días'], [0, 'Banear para siempre']].map(([d, l]) => `<button type="button" class="fx-op${d === 7 ? ' on' : ''}" data-v="${d}">${l}</button>`).join('')}</div>
    <label class="fld">Motivo (solo lo ves tú)</label><input class="inp" id="fxMotivo" maxlength="200" placeholder="Ej.: comparte la cuenta con otros">
    <div class="err" id="fxErr"></div>
    <div class="mfoot"><button type="button" class="btn-ghost" data-x>Cancelar</button><button type="button" class="btn-main" id="fxOk" style="background:#FF4B4B;box-shadow:0 4px 0 #a32b2b;color:#fff">Suspender</button></div>`);
  fxOps(m.o.querySelector('#fxDias'), v => { dias = +v; });
  m.o.querySelector('#fxOk').addEventListener('click', async () => {
    const err = m.o.querySelector('#fxErr');
    try { await fxRpc('alumno_suspender', { p_usuario: a.usuario, p_dias: dias || null, p_motivo: m.o.querySelector('#fxMotivo').value.trim() || null }); m.cerrar(); toast(dias ? 'Cuenta suspendida' : 'Cuenta baneada'); abrirFicha(a.usuario); }
    catch (e) { err.textContent = fxErr(e); err.classList.add('show'); }
  });
}

function fxWhatsapp(quien, celular, msg, ref) {
  const w = window.open(fxWa(celular, msg), '_blank');
  if (w) { try { w.opener = null; } catch (e) {} }
  fxRpc('alumno_contactado', { p_usuario: quien.usuario, p_ref: ref || null }).catch(() => {});
}
function fxMsgVence(apodo, producto, vence) {
  const d = fxDias(vence), cuando = d < 0 ? 'venció el ' + fxFecha(vence) : d === 0 ? 'vence hoy' : d === 1 ? 'vence mañana' : 'vence el ' + fxFecha(vence);
  return `Hola ${apodo || ''}, tu acceso a ${fxProd(producto)} de Modo Cachimbo ${cuando}. ¿Lo renuevas?`.replace(/\s+/g, ' ');
}

/* Botones de la ficha */
document.addEventListener('click', async e => {
  const v = $('fxVista'); if (!v || v.hidden || !v.contains(e.target)) return;
  const a = FX.a;
  const b = e.target.closest('[data-fx],[data-ext],[data-ed],[data-qu],[data-vercod],[data-lib-id],[data-lib-cod]');
  if (!b) return;
  const f = b.dataset.fx;
  if (f === 'lista') { cerrarFicha(); return; }
  if (!a) return;
  if (f === 'recargar') { CD.cargada = false; abrirFicha(a.usuario); return; }
  if (f === 'dar') { darPorId(null, { ids: [a.jid], despues: () => abrirFicha(a.usuario) }); return; }
  if (f === 'pago') { fxPago(); return; }
  if (f === 'suspender') { fxSuspender(); return; }
  if (f === 'wa') {
    const acc = fxAccesos(a).filter(x => x.vence).sort((p, q) => String(p.vence).localeCompare(String(q.vence)))[0];
    fxWhatsapp(a, (a.perfil || {}).celular, acc ? fxMsgVence(a.apodo, acc.producto, acc.vence) : `Hola ${a.apodo || ''}, te escribo de Modo Cachimbo.`);
    return;
  }
  if (f === 'regalar') {
    FX.volver = a.usuario;
    location.hash = 'regalos=' + a.jid;
    document.querySelector('.tab[data-tab="regalos"]').click();
    fxBotonVolver('tab-regalos');
    return;
  }
  if (f === 'influencer') {
    b.disabled = true;
    try {
      if (a.influencer) await fxRpc('influencer_quitar', { p_codigo: a.jid });
      else await fxRpc('influencer_poner', { p_codigos: [a.jid] });
      toast(a.influencer ? 'Ya no es influencer' : 'Ahora es influencer: le llega su sobre');
      abrirFicha(a.usuario);
    } catch (er) { toast(fxErr(er), true); b.disabled = false; }
    return;
  }
  const acc = fxAccesos(a);
  const x = b.dataset.id ? acc.find(k => k.origen === 'id' && String(k.id) === b.dataset.id) : b.dataset.cod ? acc.find(k => k.origen === 'codigo' && k.codigo === b.dataset.cod) : null;
  if (b.hasAttribute('data-ext') && x) { fxExtender(x, a, () => abrirFicha(a.usuario)); return; }
  if (b.hasAttribute('data-ed') && x) {
    darPorId(Object.assign({}, x.raw, { jid: a.jid, apodo: a.apodo, email: a.email }), { despues: () => abrirFicha(a.usuario) });
    return;
  }
  if (b.hasAttribute('data-qu') && x) {
    if (b.dataset.seguro !== '1') { b.dataset.seguro = '1'; b.textContent = '¿Seguro?'; return; }
    try { await fxRpc('acceso_id_quitar', { p_id: x.id }); toast('Acceso quitado'); abrirFicha(a.usuario); } catch (er) { toast(fxErr(er), true); }
    return;
  }
  if (b.dataset.vercod) {
    CD.vista = 'codigos';
    document.querySelector('.tab[data-tab="codigos"]').click();
    setTimeout(() => { const s = $('cdBuscar'); if (s) { s.value = b.dataset.vercod; s.dispatchEvent(new Event('input')); } }, 300);
    return;
  }
  if (b.dataset.libId) {
    try { await fxRpc('acceso_id_liberar', { p_usuario: a.usuario, p_dispositivo: b.dataset.libId }); toast('Equipo liberado'); abrirFicha(a.usuario); } catch (er) { toast(fxErr(er), true); }
    return;
  }
  if (b.dataset.libCod) {
    try { await api('liberar', { codigo: b.dataset.libCod, id: b.dataset.libDev }); CD.cargada = false; toast('Equipo liberado: pedirá el código otra vez'); abrirFicha(a.usuario); } catch (er) { toast(er.message || 'No se pudo', true); }
  }
});

// En Regalos (abierto desde la ficha): botón para volver a la ficha
function fxBotonVolver(tabId) {
  const t = $(tabId); if (!t) return;
  let b = t.querySelector('.fx-volver');
  if (!b) {
    b = document.createElement('button'); b.type = 'button'; b.className = 'btn-ghost fx-volver'; b.textContent = '← Volver a la ficha';
    b.addEventListener('click', () => { if (FX.volver) abrirFicha(FX.volver); });
    t.prepend(b);
  }
  b.hidden = !FX.volver;
}

/* La lista de alumnos: tocar una fila abre su ficha */
$('aluList').addEventListener('click', async e => {
  if (e.target.closest('[data-rg]')) return;
  const tr = e.target.closest('tbody tr'); if (!tr) return;
  const mail = (tr.querySelector('.al-quien small') || {}).textContent || '';
  if (!mail) return;
  try {
    const L = await fxRpc('ficha_buscar', { p_q: mail.trim() });
    const a = L.find(x => x.email === mail.trim().toLowerCase()) || L[0];
    if (a) abrirFicha(a.usuario); else toast('No se encontró la cuenta', true);
  } catch (er) { toast(fxErr(er), true); }
});

/* ---------- Por vencer ---------- */
async function cargarPorVencer(forzar) {
  const caja = $('pvList');
  caja.innerHTML = '<div class="loader">Cargando…</div>';
  try {
    const [d] = await Promise.all([fxRpc('por_vencer', { p_dias: 7 }), fxCodigos()]);
    FX.pv = (d.lista || []).map(x => {
      // Si la hoja de códigos está cargada, manda su fecha (puede que ya lo alargaste)
      if (x.origen === 'codigo' && CD.cargada) {
        const c = CD.lista.find(k => k.codigo === x.codigo);
        if (c) { x.vence = c.vence || x.vence; x.hoja = c; x.producto = c.producto; if (c.activo === false) x.fuera = true; }
      }
      x.dias = fxDias(x.vence);
      return x;
    }).filter(x => !x.fuera && x.dias <= 7 && x.dias >= -7);
    pintarPorVencer(); fxBadge();
  } catch (e) { caja.innerHTML = `<div class="state-msg error">${esc(fxErr(e))}</div>`; }
}
function pintarPorVencer() {
  const L = FX.pv || [];
  const hoy = L.filter(x => x.dias === 0), prox = L.filter(x => x.dias >= 0), ven = L.filter(x => x.dias < 0);
  $('pvRes').innerHTML = `<div><small>Vencen hoy</small><b style="color:#FF4B4B">${hoy.length}</b></div><div><small>Próximos 7 días</small><b style="color:#FF9600">${prox.length}</b></div><div><small>Vencieron (7 días)</small><b style="color:#9A9A9A">${ven.length}</b></div>`;
  const prods = [...new Set(L.map(x => fxProd(x.producto)))].sort();
  $('pvChips').innerHTML = [['prox', 'Próximos 7 días', prox.length], ['hoy', 'Hoy', hoy.length], ['ven', 'Ya vencidos', ven.length]]
    .map(([k, l, n]) => `<button type="button" class="chip${FX.pvVer === k ? ' on' : ''}" data-v="${k}">${l} <span class="c">${n}</span></button>`).join('') +
    (prods.length > 1 ? `<select class="inp" id="pvProd" style="width:auto;padding:7px 12px"><option value="">Todos los productos</option>${prods.map(p => `<option${FX.pvProd === p ? ' selected' : ''}>${esc(p)}</option>`).join('')}</select>` : '');
  const sel = $('pvProd'); if (sel) sel.addEventListener('change', () => { FX.pvProd = sel.value; pintarPorVencer(); });
  let V = FX.pvVer === 'hoy' ? hoy : FX.pvVer === 'ven' ? ven.slice().reverse() : prox;
  if (FX.pvProd) V = V.filter(x => fxProd(x.producto) === FX.pvProd);
  if (!V.length) { $('pvList').innerHTML = `<div class="state-msg">${FX.pvVer === 'ven' ? 'Nadie venció en los últimos 7 días.' : 'Nadie vence en estos días.'}</div>`; return; }
  $('pvList').innerHTML = V.map((x, i) => {
    const c = x.dias < 0 ? ['#9A9A9A', 'VENCIÓ'] : x.dias === 0 ? ['#FF4B4B', 'HOY'] : x.dias <= 3 ? ['#FF9600', x.dias] : ['#FBBF24', x.dias];
    const num = typeof c[1] === 'number' ? c[1] + '<small>' + (c[1] === 1 ? 'día' : 'días') + '</small>' : c[1] === 'VENCIÓ' ? '<small style="margin:0">venció</small>' : c[1];
    const puedeExt = x.origen === 'id' ? puedeTab('codigos') : !!(x.hoja && PASS);
    return `<div class="pv-f"><span class="pv-n" style="background:${c[0]}26;color:${c[0]}">${num}</span>
      <div class="pv-t"><b>${esc(x.apodo || 'Sin apodo')}${x.jid ? ' · ID ' + x.jid : ''}</b>
        <small>${esc(fxProd(x.producto))} · ${x.origen === 'id' ? 'por ID' : 'por código ' + esc(x.codigo)} · ${x.dias < 0 ? 'venció el ' : 'vence el '}${fxFecha(x.vence)}${x.escribiste ? ' · le escribiste ' + esc(fxHace(x.escribiste)) : ''}${x.celular ? '' : ' · sin celular'}</small></div>
      <div class="pv-b"><button class="btn-ghost mini wa" type="button" data-pv-wa="${i}">${fxSvg('wa')} WhatsApp</button>
        ${puedeExt ? `<button class="btn-ghost mini lima" type="button" data-pv-ext="${i}">+30 días</button>` : ''}
        <button class="btn-ghost mini" type="button" data-pv-ficha="${esc(x.usuario)}">Ficha</button></div></div>`;
  }).join('') + '<p style="color:var(--text-faint);font-size:12.5px;margin-top:12px">El botón de WhatsApp abre el chat del alumno (su celular del perfil) con el mensaje ya escrito. Si no tiene celular, eliges el contacto.</p>';
  FX.pvVista = V;
}
function fxBadge() {
  const t = document.querySelector('.tab[data-tab="porvencer"]'); if (!t || !FX.pv) return;
  let b = t.querySelector('.badge');
  if (!b) { b = document.createElement('span'); b.className = 'badge'; t.appendChild(b); }
  const n = FX.pv.filter(x => x.dias >= 0 && !x.escribiste).length;
  b.textContent = n; b.hidden = !n;
}

$('pvRecargar').addEventListener('click', () => { CD.cargada = false; cargarPorVencer(true); });
$('pvChips').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) { FX.pvVer = b.dataset.v; pintarPorVencer(); } });
$('pvList').addEventListener('click', e => {
  const w = e.target.closest('[data-pv-wa]'), x2 = e.target.closest('[data-pv-ext]'), f = e.target.closest('[data-pv-ficha]');
  if (f) { abrirFicha(f.dataset.pvFicha); return; }
  const x = (FX.pvVista || [])[+(w || x2 || {}).dataset?.[w ? 'pvWa' : 'pvExt']];
  if (!x) return;
  if (w) { fxWhatsapp(x, x.celular, fxMsgVence(x.apodo, x.producto, x.vence), x.ref); x.escribiste = new Date().toISOString(); pintarPorVencer(); fxBadge(); return; }
  fxExtender({ origen: x.origen, id: x.id, codigo: x.codigo, hoja: x.hoja, producto: x.producto, vence: x.vence }, x, () => cargarPorVencer(true));
});

/* ---------- Menú: Regalos sale (está en la ficha); Influencers se queda porque ahí se suben sus aspectos exclusivos; entra Por vencer ---------- */
(function menuAlumnos() {
  const q = s => document.querySelector('.tab[data-tab="' + s + '"]');
  ['regalos'].forEach(s => { const t = q(s); if (t) t.classList.add('fuera-menu'); });
  const alu = q('alumnos'); if (alu) alu.querySelector('span').textContent = 'Alumnos y fichas';
  fxPrepararAlumnos();
  // Al tocar «Alumnos y fichas» otra vez desde otra sección, se vuelve a la lista
  if (alu) alu.addEventListener('click', () => { if (!FX.abriendo) cerrarFicha(); });
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
    if (t.dataset.tab !== 'regalos') { const r = $('tab-regalos') && $('tab-regalos').querySelector('.fx-volver'); if (r && t.dataset.tab !== 'alumnos') { FX.volver = null; r.hidden = true; } }
  }));
  // El número de «Por vencer» en el menú, al entrar al panel
  let pedido = false;
  new MutationObserver(() => {
    if (pedido || $('panelView').hidden || !puedeTab('porvencer')) return;
    pedido = true;
    setTimeout(() => fxRpc('por_vencer', { p_dias: 7 }).then(d => {
      FX.pv = (d.lista || []).map(x => Object.assign(x, { dias: fxDias(x.vence) })).filter(x => x.dias <= 7 && x.dias >= -7);
      fxBadge();
    }, () => {}), 1500);
  }).observe($('panelView'), { attributes: true, attributeFilter: ['hidden'] });
})();
