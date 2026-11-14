/* =========================================================
   Panel · Códigos de acceso
   ========================================================= */
const CD = { lista: [], config: { abiertos: {}, legacy: true }, hoy: '', filtro: 'Todos', limites: {}, limErr: '' };
// Paquetes. Un código puede abrir varios a la vez: el producto se guarda como "general,vocabulario-VIP"
// (la misma regla que cubre() de assets/acceso.js y cubre_ del Apps Script v16).
// descarga-VIP va aparte: ni TODO-VIP lo incluye. Se marca solo (código solo de descargas)
// o junto a otros paquetes, incluso junto al Acceso total ("TODO-VIP,descarga-VIP").
const PROD_TODOS = [
  ['TODO-VIP', 'Acceso total'], ['general', 'Acceso general'], ['seminario-VIP', 'Seminarios + Banqueo'], ['vocabulario-VIP', 'Vocabulario'], ['biblioteca-VIP', 'Biblioteca'], ['descarga-VIP', 'Descargas PDF'], ['laboratorio-VIP', 'Laboratorio']
];
const EXTRAS = ['descarga-VIP', 'laboratorio-VIP']; // van aparte: se pueden sumar al Acceso total
const PROD_DESCARGA = 'descarga-VIP';
const esDescarga = c => String(c && c.producto || '').split(',').includes(PROD_DESCARGA);
const PROD_AYUDA = {
  'TODO-VIP': 'Todo: el acceso general, Seminarios, Banqueo, Vocabulario y Biblioteca (las Descargas PDF y el Laboratorio van aparte)',
  general: 'Las 4 áreas con todo lo de adentro (práctica, Repaso, Fijas, Libros, Flashcards), Simulacro, Duelos y Exámenes',
  'seminario-VIP': 'Seminarios y Banqueo de todos los cursos',
  'vocabulario-VIP': 'Vocabulario de todos los cursos',
  'biblioteca-VIP': 'Solo la Biblioteca: entrar y leer todos sus libros',
  'laboratorio-VIP': 'Todos los simuladores del Laboratorio sin gastar energía. Va aparte: no viene en el Acceso total',
  'descarga-VIP': 'Descargar en PDF (con marca de agua y N.º único) lo que permitas en Panel → Descargas PDF. Va aparte: no viene en el Acceso total ni abre los temas'
};
const AREAS_COD = [['matematica', 'Matemática'], ['ciencia-tecnologia', 'Ciencia y Tecnología'], ['comunicacion', 'Comunicación'], ['ciencias-sociales', 'Ciencias Sociales']];
// Link oficial fijo: así el mensaje no muestra el link de una vista previa.
const SITE_URL = 'https://modocachimbo.github.io/modocachimbo/';

function copiar(texto) {
  const ok = () => toast('Copiado');
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(texto).then(ok).catch(() => copiarViejo(texto));
  copiarViejo(texto);
  function copiarViejo(t) { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); ok(); } catch (e) { toast('No se pudo copiar', true); } ta.remove(); }
}
function mensajeCodigo(c) {
  return `¡Hola! 🎓 Tu código de Modo Cachimbo es:\n\n*${c.codigo}*\n\nSirve para: ${c.etiqueta}.\n` +
    (c.max ? `Puedes usarlo en ${c.max} dispositivo${c.max > 1 ? 's' : ''}.\n` : '') +
    (c.vence ? `Válido hasta el ${c.vence.split('-').reverse().join('/')}.\n` : '') +
    `\nActívalo aquí: ${SITE_URL} → «Ingresar código»`;
}
function etiquetaUno(p) {
  const fijos = { 'TODO-VIP': 'Acceso total', general: 'Acceso general', 'seminario-VIP': 'Seminarios + Banqueo', duelo: 'Duelos', examenes: 'Exámenes', 'repaso-VIP': 'Todos los Repasos', 'fijas-VIP': 'Todas las Fijas', 'banqueo-VIP': 'Todo el Banqueo', 'tarjetas-VIP': 'Todas las Flashcards', 'vocabulario-VIP': 'Vocabulario', 'biblioteca-VIP': 'Biblioteca', 'descarga-VIP': 'Descargas PDF', 'laboratorio-VIP': 'Laboratorio', simulacro: 'Simulacro' };
  if (fijos[p]) return fijos[p];
  const ar = AREAS_COD.find(([id]) => 'area-' + id === p); if (ar) return 'Área ' + ar[1];
  const m = String(p).match(/^(curso|repaso|fijas|seminario|banqueo|tarjetas|vocabulario)-(.+)$/); if (!m) return p;
  const n = NOMBRE[m[2]] || m[2];
  return { curso: n + ' completo', repaso: 'Repaso de ' + n, fijas: 'Fijas de ' + n, seminario: 'Seminarios de ' + n, banqueo: 'Banqueo de ' + n, tarjetas: 'Flashcards de ' + n, vocabulario: 'Vocabulario de ' + n }[m[1]];
}
function etiquetaProd(p) { return String(p || '').split(',').filter(Boolean).map(etiquetaUno).join(' + '); }
function fechaCorta(iso) { const d = new Date(iso); return isNaN(d) ? '—' : d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }); }

// ¿Están apagados los candados? (interruptor LIBRE de assets/acceso.js; el panel solo lo lee)
function revisarLibre() {
  if (CD.libre !== undefined) return;
  CD.libre = false;
  fetch('../assets/acceso.js', { cache: 'no-store' }).then(r => r.text()).then(t => {
    CD.libre = /var\s+LIBRE\s*=\s*true/.test(t);
    if (CD.libre && $('cdConfig').innerHTML) renderConfigAcceso();
  }).catch(() => {});
}

/* ---------- Límite de descargas por código (supabase/55-limite-por-codigo.sql) ----------
   { "MC-AAAA-1111": 20 }. Sin fila = el código usa el límite de Panel → Descargas PDF */
async function cargarLimites() {
  try {
    const r = await (await MCAuth.listo).rpc('descarga_limites_lista');
    if (r.error) throw r.error;
    CD.limites = r.data || {}; CD.limErr = '';
  } catch (e) {
    CD.limErr = /descarga_limites_lista/.test(e.message || '') ? 'Falta correr supabase/55-limite-por-codigo.sql en Supabase.'
      : 'Para ver y poner límites de descarga, entra al panel con tu cuenta de Google.';
  }
}
// cods: códigos a los que se pone el mismo límite (0 o vacío = límite general)
async function guardarLimites(cods, limite) {
  const c = await MCAuth.listo;
  for (const cod of cods) {
    const r = await c.rpc('descarga_limite_guardar', { p_codigo: cod, p_limite: limite || 0 });
    if (r.error) throw new Error(/descarga_limite_guardar/.test(r.error.message) ? 'Falta correr supabase/55-limite-por-codigo.sql en Supabase.' : r.error.message);
    if (limite > 0) CD.limites[cod] = limite; else delete CD.limites[cod];
  }
}

/* ---------- Códigos de descarga válidos (supabase/56-descarga-codigos-validos.sql) ----------
   Supabase solo deja descargar con códigos que estén en su copia de la lista.
   Se manda la lista completa (los borrados se quitan) cada vez que cambia algo aquí. */
async function sincronizarDescargas() {
  if (!CD.cargada) return;   // nunca con una lista a medias: borraría códigos buenos
  const lista = CD.lista.filter(esDescarga).map(c => ({ codigo: c.codigo, max: c.max || 0, vence: c.vence || '', activo: c.activo !== false }));
  try {
    const r = await (await MCAuth.listo).rpc('descarga_codigos_sincronizar', { p: lista });
    if (r.error) throw r.error;
    CD.syncErr = '';
  } catch (e) {
    const msg = /descarga_codigos_sincronizar/.test(e.message || '') ? 'Falta correr supabase/56-descarga-codigos-validos.sql en Supabase.'
      : 'Entra al panel con tu cuenta de Google para que valgan los códigos de Descargas PDF.';
    if (CD.syncErr !== msg) toast('Descargas PDF: ' + msg, true);
    CD.syncErr = msg;
  }
}

// Quién metió cada código en su cuenta (supabase/87-codigos-duenos.sql)
async function cargarDuenos() {
  try { CD.duenos = await pidRpc('codigos_duenos') || {}; CD.duenosErr = false; }
  catch (e) { CD.duenos = null; CD.duenosErr = /codigos_duenos|could not find|does not exist|schema cache/i.test(e && e.message || ''); }
}
async function cargarCodigos() {
  revisarLibre();
  $('cdList').innerHTML = '<div class="loader">Cargando códigos…</div>';
  try {
    cargarPorId();
    const [r] = await Promise.all([api('codigos'), cargarLimites(), cargarDuenos()]);
    CD.lista = r.codigos || []; CD.config = r.config || CD.config; CD.hoy = r.hoy; CD.cargada = true;
    renderConfigAcceso(); renderCodigos();
    sincronizarDescargas();
  } catch (e) { $('cdList').innerHTML = `<div class="state-msg error">${esc(e.message)}</div>`; }
}

/* ---------- Acceso libre ---------- */
function renderConfigAcceso() {
  const ab = CD.config.abiertos || {};
  const fila = (k, titulo, sub) => `<div class="acc-row">
      <div><b>${titulo}</b><span>${sub}</span></div>
      ${ab[k] && ab[k].hasta ? `<span class="pill gray">hasta el ${esc(ab[k].hasta.split('-').reverse().join('/'))}</span>` : ''}
      <label class="sw"><input type="checkbox" data-abrir="${k}" ${ab[k] ? 'checked' : ''}><span></span>${ab[k] ? 'Abierto' : 'Con código'}</label>
    </div>`;
  const extras = Object.keys(ab).filter(k => !['TODO', 'general', 'seminario', 'vocabulario', 'biblioteca'].includes(k));
  const nAb = Object.keys(ab).length;
  $('cdConfig').innerHTML = `${CD.libre ? `<div class="cd-libre"><img src="../assets/buho/avatar/clasico-cuerpo.webp" alt=""><div><b>Candados apagados en toda la web</b><span>Ahora todo se abre sin código (interruptor <code>LIBRE = true</code> en <code>assets/acceso.js</code>). Los códigos que crees se guardan y valdrán cuando se vuelvan a prender.</span></div></div>` : ''}
    <details class="acc-box cd-ajustes" id="cdAjustes" ${CD.ajustesAbiertos ? 'open' : ''}>
      <summary class="acc-ttl">Acceso libre y ajustes <span>— ${nAb ? nAb + ' abierto' + (nAb > 1 ? 's' : '') + ' para todos' : 'todo pide código'}</span></summary>
      ${fila('TODO', 'Todo', 'Áreas, Simulacro, Duelos, Exámenes, Seminarios, Banqueo, Vocabulario y Biblioteca')}
      ${fila('general', 'Acceso general', 'Las 4 áreas, Simulacro, Duelos y Exámenes')}
      ${fila('seminario', 'Seminarios + Banqueo', 'todos los cursos')}
      ${fila('vocabulario', 'Vocabulario', 'todos los cursos')}
      ${fila('biblioteca', 'Biblioteca', 'todos los libros')}
      ${extras.map(k => `<div class="acc-row"><div><b>${esc(etiquetaProd(k))}</b><span>abierto para todos${ab[k].hasta ? ' hasta el ' + esc(ab[k].hasta.split('-').reverse().join('/')) : ''}</span></div>
        <button class="rbtn" type="button" data-cerrar="${esc(k)}">Cerrar</button></div>`).join('')}
      <div class="acc-add">
        <select class="inp" id="accQue"><option value="">— Qué abrir —</option>
          <optgroup label="Un área">${AREAS_COD.map(([id, n]) => `<option value="area-${id}">${esc(n)}</option>`).join('')}</optgroup>
          <option value="simulacro">Simulacro</option><option value="duelo">Duelos</option><option value="examenes">Exámenes</option>
          <optgroup label="Seminarios de…">${CURSOS.map(([id, n]) => `<option value="seminario-${id}">${esc(n)}</option>`).join('')}</optgroup>
          <optgroup label="Banqueo de…">${CURSOS.map(([id, n]) => `<option value="banqueo-${id}">${esc(n)}</option>`).join('')}</optgroup>
        </select>
        <input class="inp" id="accHasta" type="date" title="Opcional: se cierra solo después de esta fecha">
        <button class="rbtn" type="button" id="accAbrir">Abrir</button>
      </div>
      <div class="acc-row legacy">
        <div><b>Quitar códigos desde Perfil</b><span>Cuántas veces al mes cada equipo puede quitar un mismo código para usarlo en otro lado.</span></div>
        <select class="inp" id="accQuitar">${[0, 1, 2, 3, 5, 10].map(n => `<option value="${n}" ${(CD.config.quitarMax || 0) === n ? 'selected' : ''}>${n ? n + (n === 1 ? ' vez' : ' veces') + ' al mes' : 'Sin límite'}</option>`).join('')}</select>
      </div>
      <div class="acc-row legacy">
        <div><b>Accesos del sistema anterior</b><span>Alumnos que desbloquearon antes de este panel (no tienen código guardado). Si los cierras, deberán ingresar su código otra vez.</span></div>
        <label class="sw"><input type="checkbox" id="accLegacy" ${CD.config.legacy !== false ? 'checked' : ''}><span></span>${CD.config.legacy !== false ? 'Permitidos' : 'Cerrados'}</label>
      </div>
    </details>`;
  $('cdAjustes').addEventListener('toggle', e => { CD.ajustesAbiertos = e.target.open; });
  const guardar = async (cfg, msg) => {
    try { const r = await api('guardarConfigAcceso', { config: JSON.stringify(cfg) }); CD.config = r.config; toast(msg); }
    catch (e) { toast(e.message, true); }
    renderConfigAcceso();
  };
  $('cdConfig').querySelectorAll('[data-abrir]').forEach(c => c.addEventListener('change', async () => {
    const cfg = JSON.parse(JSON.stringify(CD.config));
    if (c.checked) {
      const h = await pedirTexto({ titulo: 'Abrir sin código', sub: 'Opcional: escribe hasta qué fecha (AAAA-MM-DD) estará abierto. Déjalo vacío para abrirlo hasta que lo cierres.', placeholder: 'Ej.: 2027-03-31', boton: 'Abrir', valor: '' , vacioOk: true });
      if (h === null) { c.checked = false; return; }
      cfg.abiertos[c.dataset.abrir] = { hasta: /^\d{4}-\d{2}-\d{2}$/.test(h) ? h : '' };
    } else delete cfg.abiertos[c.dataset.abrir];
    guardar(cfg, c.checked ? 'Abierto para todos' : 'Cerrado: ahora pide código');
  }));
  $('cdConfig').querySelectorAll('[data-cerrar]').forEach(b => b.addEventListener('click', () => {
    const cfg = JSON.parse(JSON.stringify(CD.config)); delete cfg.abiertos[b.dataset.cerrar]; guardar(cfg, 'Cerrado');
  }));
  $('accAbrir').addEventListener('click', () => {
    const que = $('accQue').value; if (!que) { toast('Elige qué abrir', true); return; }
    const cfg = JSON.parse(JSON.stringify(CD.config));
    cfg.abiertos[que] = { hasta: $('accHasta').value || '' };
    guardar(cfg, 'Abierto para todos');
  });
  $('accQuitar').addEventListener('change', e => {
    const cfg = JSON.parse(JSON.stringify(CD.config)); cfg.quitarMax = Number(e.target.value);
    guardar(cfg, cfg.quitarMax ? 'Límite: ' + cfg.quitarMax + ' al mes' : 'Sin límite para quitar códigos');
  });
  $('accLegacy').addEventListener('change', e => {
    const cfg = JSON.parse(JSON.stringify(CD.config)); cfg.legacy = e.target.checked;
    guardar(cfg, e.target.checked ? 'Accesos antiguos permitidos' : 'Accesos antiguos cerrados');
  });
  ajusteEquiposId();
}

/* ---------- Lista (tabla compacta) ----------
   Códigos y Por ID se ven en filas: quién lo usa (con su ficha), equipos, vence,
   +30 días y el menú ⋯. En Códigos se pueden elegir varios a la vez. */
const CX_ICO = {
  copiar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  mas: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  cel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/></svg>',
  pc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/></svg>'
};
const cxIcoEquipo = t => /Android|iPhone|iPad|Celular|móvil/i.test(t || '') ? CX_ICO.cel : CX_ICO.pc;
const cxFecha = v => v ? v.split('-').reverse().join('/') : '';
const cxHoy = () => CD.hoy || PID.hoy || new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10);
const cxDias = v => Math.round((new Date(v + 'T00:00:00Z') - new Date(cxHoy() + 'T00:00:00Z')) / 864e5);
function cxVence(v, vencido) {
  if (!v) return '<b>Sin fecha</b><small style="color:var(--text-faint)">no vence</small>';
  const d = cxDias(v);
  const col = vencido || d < 0 ? '#9A9A9A' : d <= 3 ? '#FF4B4B' : d <= 7 ? '#FF9600' : 'var(--text-faint)';
  const txt = d < 0 ? 'venció' : d === 0 ? 'vence hoy' : d === 1 ? 'queda 1 día' : 'quedan ' + d + ' días';
  return `<b>${esc(cxFecha(v))}</b><small style="color:${col}">${txt}</small>`;
}
const CX_EST = { Activo: '#C6E000', Lleno: '#38BDF8', Vencido: '#9A9A9A', Desactivado: '#9A9A9A', Vencidos: '#9A9A9A', Activos: '#C6E000' };
const cxEstado = e => `<span class="cx-e" style="background:${CX_EST[e] || '#9A9A9A'}22;color:${CX_EST[e] || '#9A9A9A'}">${esc(e === 'Desactivado' ? 'Apagado' : e)}</span>`;

(function estilosLista() {
  const st = document.createElement('style');
  st.textContent = `
  .cx-sub { display: flex; gap: 6px; border-bottom: 2px solid #221C3B; margin: 4px 0 18px; overflow-x: auto; scrollbar-width: none; }
  .cx-sub button { background: none; border: 0; color: var(--text-dim); font: 900 14.5px Nunito, sans-serif; padding: 10px 14px; border-bottom: 3px solid transparent; margin-bottom: -2px; cursor: pointer; white-space: nowrap; }
  .cx-sub button.on { color: var(--accent); border-color: var(--accent); }
  .cx-sub .c { background: #272041; border-radius: 8px; padding: 1px 7px; font-size: 12px; margin-left: 5px; color: var(--text); }
  .cx-res { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px; }
  .cx-res > div { background: var(--surface); border: 2px solid #2A2346; border-radius: 16px; padding: 12px 14px; }
  .cx-res small { color: var(--text-faint); font: 800 10.5px Nunito, sans-serif; letter-spacing: 1px; text-transform: uppercase; }
  .cx-res b { display: block; font: 1000 24px Nunito, sans-serif; margin-top: 2px; }
  .cx-res button { background: none; border: 0; padding: 0; font: 800 12px Nunito, sans-serif; color: #FF9600; cursor: pointer; }
  #cdChips { align-items: center; }
  #cdChips select { width: auto; padding: 7px 12px; }
  .cx-t { width: 100%; border-collapse: separate; border-spacing: 0 6px; font-size: 13.5px; }
  .cx-t th { color: var(--text-faint); font: 800 10.5px Nunito, sans-serif; letter-spacing: 1px; text-transform: uppercase; text-align: left; padding: 0 10px; }
  .cx-t td { background: var(--surface); padding: 10px; border-top: 2px solid #2A2346; border-bottom: 2px solid #2A2346; vertical-align: middle; }
  .cx-t td:first-child { border-left: 2px solid #2A2346; border-radius: 14px 0 0 14px; }
  .cx-t td:last-child { border-right: 2px solid #2A2346; border-radius: 0 14px 14px 0; text-align: right; white-space: nowrap; }
  .cx-t tr.sel td { border-color: var(--accent); background: #1B1F0E; }
  .cx-t tr.dim td { opacity: .6; }
  .cx-t tr.cx-det td { background: #120E22; border: 2px solid #2A2346; border-radius: 14px; text-align: left; white-space: normal; }
  .cx-cod { white-space: nowrap; background: none; border: 0; padding: 0; cursor: pointer; font: 1000 14px Nunito, sans-serif; letter-spacing: 1px; color: var(--accent); display: inline-flex; gap: 6px; align-items: center; }
  .cx-cod svg { width: 13px; height: 13px; color: var(--text-faint); }
  .cx-ck { width: 20px; height: 20px; border-radius: 6px; border: 2px solid #4A4170; display: inline-grid; place-items: center; background: none; padding: 0; cursor: pointer; vertical-align: middle; }
  .cx-ck.on { background: var(--accent); border-color: var(--accent); }
  .cx-ck.on::after { content: ''; width: 8px; height: 4px; border-left: 2.5px solid #151A03; border-bottom: 2.5px solid #151A03; transform: rotate(-45deg) translate(1px, -1px); }
  .cx-pq { font-weight: 800; }
  .cx-pq small { display: block; color: var(--text-faint); font-weight: 700; font-size: 11.5px; }
  .cx-quien b { display: block; font-weight: 800; overflow-wrap: anywhere; }
  .cx-quien small { color: var(--text-faint); font-size: 11.5px; display: block; overflow-wrap: anywhere; }
  .cx-lnk { background: none; border: 0; padding: 0; cursor: pointer; color: #38BDF8; font: 800 11.5px Nunito, sans-serif; }
  .cx-eq { min-width: 86px; }
  .cx-eq .bar { height: 6px; border-radius: 4px; background: #2A2346; overflow: hidden; margin-top: 5px; }
  .cx-eq i { display: block; height: 100%; background: var(--accent); border-radius: 4px; }
  .cx-v b { display: block; font-weight: 800; }
  .cx-v small { font: 800 11.5px Nunito, sans-serif; }
  .cx-e { font: 900 10.5px Nunito, sans-serif; letter-spacing: .06em; text-transform: uppercase; border-radius: 8px; padding: 3px 7px; margin-right: 8px; vertical-align: middle; }
  .cx-ext { padding: 7px 10px; font-size: 12.5px; color: var(--accent); border-color: rgba(198,224,0,.45); vertical-align: middle; }
  .cx-mas { width: 34px; height: 34px; border-radius: 10px; border: 2px solid #2F284E; background: none; color: var(--text); display: inline-grid; place-items: center; vertical-align: middle; cursor: pointer; margin-left: 4px; }
  .cx-mas svg { width: 16px; height: 16px; }
  .cx-acc { position: relative; }
  .cx-menu { position: absolute; right: 8px; top: calc(100% - 6px); background: #1E1838; border: 2px solid #3A3160; border-radius: 14px; padding: 6px; width: 200px; z-index: 30; text-align: left; box-shadow: 0 10px 30px rgba(0,0,0,.5); }
  .cx-menu button { display: block; width: 100%; text-align: left; background: none; border: 0; color: var(--text); padding: 9px 10px; border-radius: 9px; font: 800 13px Nunito, sans-serif; cursor: pointer; }
  .cx-menu button:hover { background: #2A2346; }
  .cx-menu .r { color: #FF8A8A; }
  .cx-dev { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #221C3B; font-size: 13px; }
  .cx-dev:last-of-type { border: 0; }
  .cx-dev span { display: flex; align-items: center; gap: 8px; }
  .cx-dev svg { width: 16px; height: 16px; color: var(--text-faint); flex-shrink: 0; }
  .cx-flot { position: sticky; bottom: 14px; margin-top: 14px; background: #C6E000; color: #151A03; border-radius: 18px; padding: 12px 16px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; box-shadow: 0 10px 30px rgba(0,0,0,.5); z-index: 20; }
  .cx-flot b { font: 1000 15px Nunito, sans-serif; margin-right: auto; }
  .cx-flot button { background: #151A03; color: #C6E000; border: 0; border-radius: 12px; padding: 9px 13px; font: 900 13px Nunito, sans-serif; cursor: pointer; }
  .cx-flot button.r { background: #5a1010; color: #FFB3B3; }
  .cx-flot button.x { background: none; color: #151A03; text-decoration: underline; }
  .cx-mas-filas { display: block; margin: 10px auto 0; }
  @media (max-width: 800px) {
    .cx-res { grid-template-columns: 1fr 1fr; }
    .cx-t thead { display: none; }
    .cx-t, .cx-t tbody, .cx-t tr, .cx-t td { display: block; }
    .cx-t tr { background: var(--surface); border: 2px solid #2A2346; border-radius: 16px; margin-bottom: 8px; padding: 10px 12px; display: grid; grid-template-columns: 26px 1fr auto; gap: 4px 10px; align-items: center; }
    .cx-t tr.sel { border-color: var(--accent); background: #1B1F0E; }
    .cx-t tr.cx-det { display: block; margin-top: -4px; }
    .cx-t td { background: none !important; border: 0 !important; padding: 0; border-radius: 0 !important; }
    .cx-t tr:not(.cx-det) td:nth-child(1) { grid-row: 1; }
    .cx-t tr:not(.cx-det) td:nth-child(2) { grid-column: 2; grid-row: 1; }
    .cx-t tr:not(.cx-det) td:nth-child(6) { grid-column: 3; grid-row: 1; text-align: right; }
    .cx-t tr:not(.cx-det) td:nth-child(3), .cx-t tr:not(.cx-det) td:nth-child(4), .cx-t tr:not(.cx-det) td:nth-child(5) { grid-column: 2 / 4; }
    .cx-t tr:not(.cx-det) td:nth-child(7) { grid-column: 1 / 4; text-align: left !important; margin-top: 6px; }
    .cx-t.sin-ck tr:not(.cx-det) { grid-template-columns: 0 1fr auto; column-gap: 0; }
    .cx-t.sin-ck tr:not(.cx-det) td:nth-child(2) { padding-right: 10px; }
    .cx-pq small { display: inline; margin-left: 6px; }
    .cx-menu { right: auto; left: 0; }
    .cx-flot { position: sticky; bottom: 10px; }
  }`;
  document.head.appendChild(st);
})();

// Pestañas de arriba: Códigos · Por ID · Acceso libre y ajustes
function renderVista() {
  const box = $('cdPorId'); if (!box) return;
  const v = CD.vista || 'codigos';
  box.innerHTML = `<div class="cx-sub">
    <button type="button" class="${v === 'codigos' ? 'on' : ''}" data-vista="codigos">Códigos<span class="c">${CD.lista.length}</span></button>
    <button type="button" class="${v === 'id' ? 'on' : ''}" data-vista="id">Por ID<span class="c">${PID.err ? '!' : PID.lista.length}</span></button>
    <button type="button" class="${v === 'ajustes' ? 'on' : ''}" data-vista="ajustes">Acceso libre y ajustes</button></div>
    <div class="cx-res" id="cdRes"${v === 'ajustes' ? ' hidden' : ''}></div>`;
  box.querySelectorAll('[data-vista]').forEach(b => b.addEventListener('click', () => {
    if (v === b.dataset.vista) return;
    CD.vista = b.dataset.vista; CD.menu = null; $('cdBuscar').value = '';
    $('cdBuscar').placeholder = CD.vista === 'id' ? 'Buscar por ID, apodo, correo o nota…' : 'Buscar código, alumno, ID o nota…';
    renderCodigos();
  }));
  const aj = v === 'ajustes';
  $('cdConfig').hidden = !aj;
  $('cdBuscar').closest('.toolbar').hidden = aj; $('cdChips').hidden = aj; $('cdList').hidden = aj;
  const det = $('cdAjustes'); if (det && aj) det.open = true;
}

// Fila de acciones: estado, +30 días y ⋯
const cxAcciones = (key, estado, ext, extTxt) => `<td class="cx-acc">${cxEstado(estado)}${ext ? `<button class="btn-ghost cx-ext" type="button" data-cx-ext="${esc(key)}">${extTxt || '+30 días'}</button>` : ''}<button class="cx-mas" type="button" data-cx-menu="${esc(key)}" aria-label="Más opciones">${CX_ICO.mas}</button>${CD.menu === key ? '<div class="cx-menu" id="cxMenu"></div>' : ''}</td>`;

function renderCodigos() {
  renderVista();
  if (CD.vista === 'ajustes') { $('cdStats').innerHTML = 'Lo que se abre para todos sin código y los ajustes de equipos.'; return; }
  if (CD.vista === 'id') { renderPorId(); return; }
  const L = CD.lista, hoy = cxHoy();
  CD.sel = CD.sel || new Set();
  [...CD.sel].forEach(k => { if (!L.some(c => c.codigo === k)) CD.sel.delete(k); });
  const duenos = c => (CD.duenos || {})[c.codigo] || { n: 0, lista: [] };
  const pronto = c => c.estado !== 'Desactivado' && c.estado !== 'Vencido' && c.vence && cxDias(c.vence) >= 0 && cxDias(c.vence) <= 7;
  // 'Descargas' no es un estado: muestra solo los códigos de descarga (descarga-VIP)
  const pasa = (c, e) => e === 'Todos' || (e === 'Descargas' ? esDescarga(c) : e === 'Pronto' ? pronto(c) : c.estado === e);
  const cuenta = e => L.filter(c => pasa(c, e)).length;
  const disp = L.reduce((s, c) => s + c.dispositivos.length, 0);
  $('cdStats').innerHTML = `<b>${L.length}</b> código${L.length === 1 ? '' : 's'} · <b>${disp}</b> equipo${disp === 1 ? '' : 's'} registrados${CD.duenosErr ? ' · <span style="color:#FBBF24">para ver quién usa cada código falta correr supabase/87-codigos-duenos.sql</span>' : ''}`;
  $('cdRes').innerHTML = `<div><small>Activos</small><b style="color:#C6E000">${cuenta('Activo')}</b></div>
    <div><small>Llenos</small><b style="color:#38BDF8">${cuenta('Lleno')}</b></div>
    <div><small>Vencen en 7 días</small><b style="color:#FF9600">${cuenta('Pronto')}</b>${puedeTab('porvencer') ? '<button type="button" data-ir="porvencer">Ver en Por vencer ›</button>' : ''}</div>
    <div><small>Vencidos / apagados</small><b style="color:#9A9A9A">${cuenta('Vencido') + cuenta('Desactivado')}</b></div>`;
  const prods = [...new Set(L.map(c => etiquetaProd(c.producto)))].sort();
  if (CD.prod && !prods.includes(CD.prod)) CD.prod = '';
  $('cdChips').innerHTML = ['Todos', 'Activo', 'Lleno', 'Pronto', 'Vencido', 'Desactivado', 'Descargas'].map(e =>
    `<button type="button" class="chip st ${e === CD.filtro ? 'on' : ''}" data-e="${e}">${{ Todos: 'Todos', Descargas: 'Descargas PDF', Pronto: 'Vencen pronto', Desactivado: 'Apagados' }[e] || e + 's'} <span class="c">${cuenta(e)}</span></button>`).join('') +
    (prods.length > 1 ? `<select class="inp" id="cdProd"><option value="">Todos los paquetes</option>${prods.map(p => `<option${CD.prod === p ? ' selected' : ''}>${esc(p)}</option>`).join('')}</select>` : '');
  $('cdChips').querySelectorAll('.chip').forEach(ch => ch.addEventListener('click', () => { CD.filtro = ch.dataset.e; CD.mostrar = 0; renderCodigos(); }));
  const sp = $('cdProd'); if (sp) sp.addEventListener('change', () => { CD.prod = sp.value; CD.mostrar = 0; renderCodigos(); });
  const q = $('cdBuscar').value.trim().toLowerCase();
  const rows = L.filter(c => pasa(c, CD.filtro) && (!CD.prod || etiquetaProd(c.producto) === CD.prod) &&
    (!q || [c.codigo, c.nota, etiquetaProd(c.producto), ...duenos(c).lista.map(d => [d.apodo, d.jid, d.email].join(' '))].join(' ').toLowerCase().includes(q)));
  if (!L.length) { $('cdList').innerHTML = '<div class="state-msg">Aún no hay códigos. Crea uno con <b>Crear códigos</b> o trae los antiguos con <b>Importar</b>.</div>'; return; }
  if (!rows.length) { $('cdList').innerHTML = '<div class="state-msg">No hay códigos con ese filtro.</div>'; return; }
  const tope = Math.max(60, CD.mostrar || 0), ver = rows.slice(0, tope);
  $('cdList').innerHTML = `<table class="cx-t"><thead><tr><th><button type="button" class="cx-ck${ver.every(c => CD.sel.has(c.codigo)) ? ' on' : ''}" data-cx-todos aria-label="Elegir todos"></button></th><th>Código</th><th>Paquete</th><th>Lo usa</th><th>Equipos</th><th>Vence</th><th></th></tr></thead><tbody>
    ${ver.map(c => {
      const usados = c.usosAnt + c.dispositivos.length, d = duenos(c), sel = CD.sel.has(c.codigo);
      const lim = esDescarga(c) ? (CD.limites[c.codigo] ? CD.limites[c.codigo] + ' descargas al día' : 'límite general de descargas') : '';
      const quien = CD.duenosErr || !CD.duenos ? '<small>—</small>'
        : !d.n ? `<b style="color:var(--text-faint)">Nadie aún</b><small>${c.nota ? esc(c.nota) : 'nadie lo metió en su cuenta'}</small>`
        : d.n === 1 ? `<b>${esc(d.lista[0].apodo || 'Sin apodo')}</b>${puedeTab('alumnos') ? `<button class="cx-lnk" type="button" data-cx-ficha="${esc(d.lista[0].usuario)}">${d.lista[0].jid ? 'ID ' + d.lista[0].jid + ' · ' : ''}Ficha ›</button>` : `<small>${d.lista[0].jid ? 'ID ' + d.lista[0].jid : ''}</small>`}${c.nota ? `<small>${esc(c.nota)}</small>` : ''}`
        : `<b>${d.n} cuentas</b><button class="cx-lnk" type="button" data-cx-det="q:${esc(c.codigo)}">Ver quiénes ›</button>${c.nota ? `<small>${esc(c.nota)}</small>` : ''}`;
      const det = CD.det === 'q:' + c.codigo ? `<tr class="cx-det"><td colspan="7">${d.lista.map(x => `<div class="cx-dev"><span><b>${esc(x.apodo || 'Sin apodo')}</b>${x.jid ? ' · ID ' + x.jid : ''} · ${esc(x.email || '')}</span>${puedeTab('alumnos') ? `<button class="rbtn" type="button" data-cx-ficha="${esc(x.usuario)}">Ficha</button>` : ''}</div>`).join('')}</td></tr>`
        : CD.det === 'e:' + c.codigo ? `<tr class="cx-det"><td colspan="7">${c.dispositivos.length ? c.dispositivos.map(x => `<div class="cx-dev"><span>${cxIcoEquipo(x.equipo)}<span><b>${esc(x.equipo || 'Equipo')}</b> · activado ${esc(fechaCorta(x.alta))} · último uso ${esc(fechaCorta(x.ultimo))}</span></span>
            <button class="rbtn" type="button" data-lib="${esc(c.codigo)}" data-id="${esc(x.id)}">Liberar</button></div>`).join('') : '<div class="hint">Aún no hay equipos registrados con este código.</div>'}
          <div class="rfoot" style="margin-top:8px;">${c.usosAnt ? `<button class="rbtn" type="button" data-lib="${esc(c.codigo)}" data-id="anteriores">Reiniciar usos anteriores (${c.usosAnt})</button>` : ''}${usados ? `<button class="rbtn danger" type="button" data-lib="${esc(c.codigo)}" data-id="todos">Liberar todos</button>` : ''}</div></td></tr>` : '';
      return `<tr class="${sel ? 'sel' : ''}${['Vencido', 'Desactivado'].includes(c.estado) ? ' dim' : ''}">
        <td><button type="button" class="cx-ck${sel ? ' on' : ''}" data-cx-sel="${esc(c.codigo)}" aria-label="Elegir"></button></td>
        <td><button class="cx-cod" type="button" data-copy="${esc(c.codigo)}" title="Copiar código">${esc(c.codigo)} ${CX_ICO.copiar}</button></td>
        <td class="cx-pq">${esc(etiquetaProd(c.producto))}${lim ? `<small>${esc(lim)}</small>` : ''}</td>
        <td class="cx-quien">${quien}</td>
        <td class="cx-eq"><b>${usados}</b> de ${c.max ? c.max : '∞'}<div class="bar"><i style="width:${c.max ? Math.min(100, Math.round(usados / c.max * 100)) : 0}%"></i></div></td>
        <td class="cx-v">${cxVence(c.vence, c.estado === 'Vencido')}</td>
        ${cxAcciones(c.codigo, c.estado, c.estado !== 'Desactivado', c.estado === 'Vencido' ? 'Renovar' : '')}</tr>${det}`;
    }).join('')}</tbody></table>
    ${rows.length > tope ? `<button class="btn-ghost cx-mas-filas" type="button" data-cx-mas>Ver ${Math.min(60, rows.length - tope)} más (de ${rows.length})</button>` : ''}
    ${CD.sel.size ? `<div class="cx-flot"><b>${CD.sel.size} código${CD.sel.size === 1 ? '' : 's'} elegido${CD.sel.size === 1 ? '' : 's'}</b>
      <button type="button" data-cx-lote="ext">+ días a ${CD.sel.size === 1 ? 'este' : 'los ' + CD.sel.size}</button><button type="button" data-cx-lote="msg">Copiar mensajes</button>
      <button type="button" data-cx-lote="apagar">Apagar</button><button type="button" class="r" data-cx-lote="borrar">Borrar</button><button type="button" class="x" data-cx-lote="nada">Quitar selección</button></div>` : ''}`;
  if (CD.menu && $('cxMenu')) {
    const c = L.find(x => x.codigo === CD.menu);
    if (c) $('cxMenu').innerHTML = `<button type="button" data-cx-m="editar">Editar</button><button type="button" data-cx-m="equipos">Equipos (${c.dispositivos.length})</button>
      <button type="button" data-cx-m="msg">Copiar mensaje</button><button type="button" data-cx-m="apagar">${c.activo === false ? 'Prender' : 'Apagar'}</button><button type="button" class="r" data-cx-m="borrar">Borrar</button>`;
  }
}

// Guardar un código en la hoja con cambios (vence, activo) y avisar a la cuenta del alumno
async function cxGuardarCod(c, cambios) {
  const datos = { producto: c.producto, max: c.max, vence: c.vence || '', nota: c.nota || '', editar: c.codigo, activo: c.activo !== false, ...cambios };
  await api('guardarCodigo', { datos: JSON.stringify(datos) });
  Object.assign(c, { vence: datos.vence, activo: datos.activo });
  c.estado = !c.activo ? 'Desactivado' : (c.vence && CD.hoy && CD.hoy > c.vence) ? 'Vencido' : (c.max > 0 && c.usosAnt + c.dispositivos.length >= c.max) ? 'Lleno' : 'Activo';
  if ('vence' in cambios && typeof fxRpc === 'function') fxRpc('codigo_cuenta_vence', { p_codigo: c.codigo, p_vence: datos.vence }).catch(() => {});
}
function cxLoteDias(n, alElegir) {
  let dias = 30;
  const m = fxModal(`<div class="eyebrow">Renovar varios</div><h3>${n} código${n === 1 ? '' : 's'}</h3>
    <div class="hint" style="margin-top:2px">A cada uno se le suman los días desde su fecha (o desde hoy si ya venció). Los apagados se prenden.</div>
    <label class="fld">¿Cuántos días más?</label>
    <div class="fx-ops" id="fxDias">${[7, 15, 30, 60, 90].map(d => `<button type="button" class="fx-op${d === 30 ? ' on' : ''}" data-v="${d}">${d} días</button>`).join('')}</div>
    <div class="err" id="fxErr"></div>
    <div class="mfoot"><button type="button" class="btn-ghost" data-x>Cancelar</button><button type="button" class="btn-main" id="fxOk">Renovar</button></div>`);
  fxOps(m.o.querySelector('#fxDias'), v => { dias = +v; });
  m.o.querySelector('#fxOk').addEventListener('click', () => { m.cerrar(); alElegir(dias); });
}
async function cxLote(accion) {
  const L = CD.lista.filter(c => CD.sel.has(c.codigo));
  if (!L.length) return;
  if (accion === 'nada') { CD.sel.clear(); renderCodigos(); return; }
  if (accion === 'msg') { copiar(L.map(mensajeCodigo).join('\n\n— — —\n\n')); return; }
  const correr = async (txt, fn) => {
    let ok = 0, mal = 0;
    for (const [i, c] of L.entries()) {
      toast(`${txt} ${i + 1} de ${L.length}…`);
      try { await fn(c); ok++; } catch (e) { mal++; }
    }
    sincronizarDescargas(); renderCodigos();
    toast(`${txt}: ${ok} listo${ok === 1 ? '' : 's'}${mal ? ` · ${mal} no se pudo` : ''}`, !!mal);
  };
  if (accion === 'ext') cxLoteDias(L.length, dias => correr('Renovando', c => cxGuardarCod(c, { vence: fxSumar(c.vence, dias), activo: true })));
  if (accion === 'apagar') correr('Apagando', c => cxGuardarCod(c, { activo: false }));
  if (accion === 'borrar') {
    const m = fxModal(`<div class="eyebrow">Borrar</div><h3>¿Borrar ${L.length} código${L.length === 1 ? '' : 's'}?</h3><div class="hint">Dejan de abrir en todos sus equipos. No se puede deshacer.</div>
      <div class="mfoot"><button type="button" class="btn-ghost" data-x>Cancelar</button><button type="button" class="btn-main" id="fxOk" style="background:#FF4B4B;box-shadow:0 4px 0 #a32b2b;color:#fff">Borrar</button></div>`);
    m.o.querySelector('#fxOk').addEventListener('click', () => {
      m.cerrar();
      correr('Borrando', async c => { await api('borrarCodigo', { codigo: c.codigo }); CD.lista = CD.lista.filter(x => x !== c); CD.sel.delete(c.codigo); });
    });
  }
}

// Un solo manejador para la tabla (Códigos y Por ID)
$('cdList').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || !$('cdList').contains(b)) return;
  const enId = CD.vista === 'id', d = b.dataset;
  if (d.copy) { copiar(d.copy); return; }
  if (d.cxFicha) { abrirFicha(d.cxFicha); return; }
  if ('cxMas' in d) { CD.mostrar = (Math.max(60, CD.mostrar || 0)) + 60; renderCodigos(); return; }
  if (d.cxDet) { CD.det = CD.det === d.cxDet ? null : d.cxDet; renderCodigos(); return; }
  if (d.cxMenu) { CD.menu = CD.menu === d.cxMenu ? null : d.cxMenu; renderCodigos(); return; }
  if (d.cxLote) { cxLote(d.cxLote); return; }
  if (d.cxSel) { CD.sel.has(d.cxSel) ? CD.sel.delete(d.cxSel) : CD.sel.add(d.cxSel); renderCodigos(); return; }
  if ('cxTodos' in d) {
    const ver = [...$('cdList').querySelectorAll('[data-cx-sel]')].map(x => x.dataset.cxSel);
    const todos = ver.every(k => CD.sel.has(k));
    ver.forEach(k => todos ? CD.sel.delete(k) : CD.sel.add(k)); renderCodigos(); return;
  }
  if (d.cxExt) {
    if (enId) {
      const a = PID.lista.find(x => String(x.id) === d.cxExt); if (!a) return;
      fxExtender({ origen: 'id', id: a.id, producto: a.producto, vence: a.vence }, { usuario: a.usuario, apodo: a.apodo }, () => cargarPorId());
    } else {
      const c = CD.lista.find(x => x.codigo === d.cxExt); if (!c) return;
      const due = ((CD.duenos || {})[c.codigo] || { lista: [] }).lista;
      fxExtender({ origen: 'codigo', codigo: c.codigo, hoja: c, producto: c.producto, vence: c.vence }, due.length === 1 ? due[0] : { usuario: null, apodo: c.nota || c.codigo }, () => renderCodigos());
    }
    return;
  }
  if (d.cxM) {
    const key = CD.menu; CD.menu = null;
    if (enId) {
      const a = PID.lista.find(x => String(x.id) === key); if (!a) { renderCodigos(); return; }
      if (d.cxM === 'editar') { renderCodigos(); darPorId(a); return; }
      if (d.cxM === 'equipos') { CD.det = 'p:' + a.id; renderCodigos(); return; }
      if (d.cxM === 'ficha') { abrirFicha(a.usuario); return; }
      if (d.cxM === 'quitar') {
        if (b.dataset.seguro !== '1') { CD.menu = key; b.dataset.seguro = '1'; b.textContent = '¿Seguro? Toca otra vez'; return; }
        try { await pidRpc('acceso_id_quitar', { p_id: a.id }); PID.lista = PID.lista.filter(x => x !== a); toast('Quitado. Al alumno se le cierra en unos minutos.'); }
        catch (er) { toast(pidError(er), true); }
        renderCodigos(); return;
      }
      return;
    }
    const c = CD.lista.find(x => x.codigo === key); if (!c) { renderCodigos(); return; }
    if (d.cxM === 'editar') { renderCodigos(); editarCodigo(c); return; }
    if (d.cxM === 'equipos') { CD.det = 'e:' + c.codigo; renderCodigos(); return; }
    if (d.cxM === 'msg') { renderCodigos(); copiar(mensajeCodigo(c)); return; }
    if (d.cxM === 'apagar') {
      try { await cxGuardarCod(c, { activo: c.activo === false }); toast(c.activo ? 'Código prendido' : 'Código apagado: deja de abrir'); sincronizarDescargas(); }
      catch (er) { toast(er.message, true); }
      renderCodigos(); return;
    }
    if (d.cxM === 'borrar') {
      if (b.dataset.seguro !== '1') { CD.menu = key; b.dataset.seguro = '1'; b.textContent = '¿Seguro? Toca otra vez'; return; }
      try { await api('borrarCodigo', { codigo: c.codigo }); CD.lista = CD.lista.filter(x => x !== c); CD.sel && CD.sel.delete(c.codigo); toast('Código borrado'); sincronizarDescargas(); }
      catch (er) { toast(er.message, true); }
      renderCodigos(); return;
    }
  }
  if (d.lib) {
    const todos = d.id === 'todos';
    if (todos && !b.classList.contains('confirm')) { b.classList.add('confirm'); b.textContent = '¿Seguro? Toca otra vez'; return; }
    b.disabled = true;
    try { await api('liberar', { codigo: d.lib, id: d.id }); toast(todos ? 'Todos los equipos liberados: pedirán el código otra vez' : d.id === 'anteriores' ? 'Usos anteriores reiniciados' : 'Equipo liberado: pedirá el código otra vez'); await cargarCodigos(); }
    catch (er) { toast(er.message, true); b.disabled = false; }
    return;
  }
  if (d.plib) {
    const a = PID.lista.find(x => String(x.id) === d.plib); if (!a) return;
    b.disabled = true; b.textContent = 'Liberando…';
    try {
      await pidRpc('acceso_id_liberar', { p_usuario: a.usuario, p_dispositivo: d.disp || null });
      // El mismo alumno puede tener varios accesos: sus equipos son los mismos en todos
      PID.lista.filter(x => x.usuario === a.usuario).forEach(x => { x.equipos = d.disp ? pidEquipos(x).filter(q => q.dispositivo !== d.disp) : []; });
      toast(d.disp ? 'Equipo liberado' : 'Equipos liberados');
    } catch (er) { toast(/acceso_id_liberar/.test(er.message || '') ? 'Falta correr supabase/77-accesos-id-panel.sql en Supabase.' : pidError(er), true); }
    renderCodigos();
  }
});
// El menú ⋯ se cierra al tocar fuera; «Ver en Por vencer» lleva a esa sección
document.addEventListener('click', e => {
  const ir = e.target.closest('#cdRes [data-ir]');
  if (ir) { const t = document.querySelector(`.tab[data-tab="${ir.dataset.ir}"]`); if (t) t.click(); return; }
  if (CD.menu && !e.target.closest('.cx-menu, [data-cx-menu]')) { CD.menu = null; if (!$('tab-codigos').hidden) renderCodigos(); }
});

/* ---------- Limpiar cuentas ----------
   Los alumnos guardan sus códigos en su cuenta (Perfil · Mis accesos). Este botón marca como
   quitados, en todas las cuentas, los que ya no sirven: borrados de aquí, vencidos o desactivados
   (supabase/48-codigos-quitados.sql). Los llenos se quedan: siguen sirviendo en sus equipos. */
async function limpiarCuentas() {
  if (!CD.lista.length) { toast('Primero deben cargar los códigos', true); return; }
  const validos = CD.lista.filter(c => c.estado === 'Activo' || c.estado === 'Lleno').map(c => c.codigo);
  const o = document.createElement('div');
  o.className = 'ov';
  o.innerHTML = `<div class="mcard" style="max-width:520px;"><button class="mx" type="button" aria-label="Cerrar">✕</button>
    <div class="eyebrow">Mis accesos de los alumnos</div>
    <h3>Limpiar cuentas</h3>
    <p class="sub" style="margin-top:6px;line-height:1.55;">Quita de la lista de cada alumno los códigos que ya no existen, vencieron o están desactivados. Los activos y los llenos no se tocan, y no cambia nada aquí en Códigos.</p>
    <div class="cdlimp" id="clRes"><div class="loader">Revisando cuentas…</div></div>
    <div class="mfoot"><button type="button" class="btn-ghost" data-x>Cancelar</button>
      <button type="button" class="btn-main" id="clOk" style="background:#c43d3d;color:#fff;" disabled>Limpiar</button></div></div>`;
  document.body.appendChild(o);
  const cerrar = () => o.remove();
  o.querySelector('.mx').addEventListener('click', cerrar);
  o.querySelector('[data-x]').addEventListener('click', cerrar);
  let c;
  try {
    c = await MCAuth.listo;
    const r = await c.rpc('limpiar_codigos_cuentas', { p_validos: validos, p_probar: true });
    if (r.error) throw new Error(/limpiar_codigos_cuentas/.test(r.error.message) ? 'Falta correr supabase/48-codigos-quitados.sql en Supabase.' : r.error.message);
    const d = r.data;
    if (!d.filas) { $('clRes').innerHTML = '<div class="state-msg">Todo limpio: ninguna cuenta tiene códigos que ya no sirven.</div>'; return; }
    $('clRes').innerHTML = `<p style="margin:14px 0 8px;"><b>${d.codigos}</b> código${d.codigos === 1 ? '' : 's'} que ya no sirve${d.codigos === 1 ? '' : 'n'}, en <b>${d.cuentas}</b> cuenta${d.cuentas === 1 ? '' : 's'}.</p>
      <div class="cdlimp-lista">${d.lista.map(x => `<code>${esc(x)}</code>`).join('')}${d.codigos > d.lista.length ? ` <span class="hint">y ${d.codigos - d.lista.length} más</span>` : ''}</div>`;
    const ok = $('clOk'); ok.disabled = false;
    ok.addEventListener('click', async () => {
      ok.disabled = true; ok.textContent = 'Limpiando…';
      const r2 = await c.rpc('limpiar_codigos_cuentas', { p_validos: validos, p_probar: false });
      if (r2.error) { toast(r2.error.message, true); ok.disabled = false; ok.textContent = 'Limpiar'; return; }
      cerrar();
      toast(`Listo: ${r2.data.filas} código${r2.data.filas === 1 ? '' : 's'} quitado${r2.data.filas === 1 ? '' : 's'} de ${r2.data.cuentas} cuenta${r2.data.cuentas === 1 ? '' : 's'}`);
    });
  } catch (e) { $('clRes').innerHTML = `<div class="state-msg error">${esc(e.message)}</div>`; }
}

/* ---------- Crear / editar ---------- */
function editarCodigo(orig) {
  // st.todos: paquetes · st.areas: áreas sueltas · st.antes: productos de antes (curso-x, repaso-VIP…), se conservan
  const st = { todos: [], areas: [], antes: [] };
  String(orig ? orig.producto : 'general').split(',').filter(Boolean).forEach(p => {
    if (PROD_TODOS.some(([v]) => v === p)) st.todos.push(p);
    else if (/^area-/.test(p)) st.areas.push(p.slice(5));
    else st.antes.push(p);
  });
  const multi = (g, ops, sel) => `<div class="chips" data-g="${g}">` + ops.map(([v, l]) =>
    `<button type="button" class="chip ${sel.includes(v) ? 'on' : ''}" data-v="${esc(v)}">${l}</button>`).join('') + '</div>';
  const o = document.createElement('div');
  o.className = 'ov';
  o.innerHTML = `<div class="mcard" style="max-width:620px;"><button class="mx" type="button" aria-label="Cerrar">✕</button>
    <div class="eyebrow">${orig ? 'Editar código' : 'Nuevos códigos'}</div>
    <h3>${orig ? esc(orig.codigo) : 'Crear códigos'}</h3>
    <label class="fld">¿Qué abre? <span class="hint">Puedes marcar varios paquetes</span></label>
    ${multi('todos', PROD_TODOS, st.todos)}
    <div class="hint" id="cdAyuda" style="margin:6px 0 0;"></div>
    <div class="hint" style="margin:12px 0 6px;">O solo un área (sin Simulacro ni Duelos)</div>${multi('areas', AREAS_COD, st.areas)}
    ${st.antes.length ? `<div class="hint" style="margin:10px 0 0;">Además abre (de antes): <b>${esc(etiquetaProd(st.antes.join(',')))}</b></div>` : ''}
    <div class="hint" id="cdResumen" style="margin-top:10px;"></div>
    <div id="cdLimBox">
      <label class="fld">Descargas PDF por día <span class="hint">por alumno · vacío = el límite general de Panel → Descargas PDF</span></label>
      <input class="inp" id="cdLimDia" type="number" min="1" max="500" placeholder="Ej.: 20" value="${orig && CD.limites[orig.codigo] ? CD.limites[orig.codigo] : ''}">
      ${CD.limErr ? `<div class="hint" style="color:var(--red);margin-top:6px;">${esc(CD.limErr)}</div>` : ''}
    </div>
    <div class="cdgrid">
      <label>Dispositivos<input class="inp" id="cdMax" type="number" min="1" max="10000" value="${orig ? (orig.max || 2) : 2}"></label>
      <label class="ck" style="align-self:end;"><input type="checkbox" id="cdSinLim" ${orig && !orig.max ? 'checked' : ''}>Sin límite</label>
      <label>Vence (opcional)<input class="inp" id="cdVence" type="date" value="${orig ? esc(orig.vence) : ''}"></label>
    </div>
    <label class="fld">Usuario o nota</label><input class="inp" id="cdNota" maxlength="120" value="${orig ? esc(orig.nota) : ''}" placeholder="Ej.: Juan Pérez · pagó por Yape">
    ${orig ? `<label class="sw" style="margin-top:16px;"><input type="checkbox" id="cdAct" ${orig.activo ? 'checked' : ''}><span></span>Código activo</label>`
      : `<div class="cdgrid">
          <label>Cantidad<input class="inp" id="cdCant" type="number" min="1" max="200" value="1"></label>
          <label style="grid-column: span 2;">Código propio (opcional)<input class="inp" id="cdPropio" maxlength="30" placeholder="Se genera solo, ej.: MC-7K3P-Q9XR" style="text-transform:uppercase;"></label>
        </div>`}
    <div class="err" id="cdErr"></div>
    <div class="mfoot"><button type="button" class="btn-ghost" data-x>Cancelar</button><button type="button" class="btn-main" id="cdSave">${orig ? 'Guardar cambios' : 'Crear'}</button></div>
  </div>`;
  document.body.appendChild(o); document.body.classList.add('modal-open');
  const cerrar = () => { o.remove(); document.body.classList.remove('modal-open'); };
  o.querySelector('.mx').addEventListener('click', cerrar); o.querySelector('[data-x]').addEventListener('click', cerrar);
  const producto = () => {
    if (st.todos.includes('TODO-VIP')) return ['TODO-VIP'].concat(EXTRAS.filter(x => st.todos.includes(x))).join(',');
    const areas = st.todos.includes('general') ? [] : st.areas.map(a => 'area-' + a);
    return st.todos.concat(areas, st.antes).join(',');
  };
  const pintar = () => {
    o.querySelectorAll('[data-g="todos"] .chip').forEach(x => x.classList.toggle('on', st.todos.includes(x.dataset.v)));
    o.querySelectorAll('[data-g="areas"] .chip').forEach(x => x.classList.toggle('on', st.areas.includes(x.dataset.v)));
    o.querySelector('#cdAyuda').textContent = st.todos.map(v => PROD_AYUDA[v]).filter(Boolean).join(' · ');
    const p = producto(); o.querySelector('#cdResumen').innerHTML = p ? 'Abrirá: <b style="color:#f5ffcc">' + esc(etiquetaProd(p)) + '</b>' : '';
    o.querySelector('#cdLimBox').hidden = !esDescarga({ producto: p });
  };
  o.querySelector('[data-g="todos"]').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    const v = b.dataset.v, i = st.todos.indexOf(v);
    if (i >= 0) st.todos.splice(i, 1); else st.todos.push(v);
    // El Acceso total ya trae todos los paquetes menos Descargas PDF: solo se le puede sumar esa
    if (v === 'TODO-VIP' && i < 0) { st.todos = st.todos.filter(x => x === 'TODO-VIP' || EXTRAS.includes(x)); st.areas = []; }
    else if (v !== 'TODO-VIP' && !EXTRAS.includes(v)) st.todos = st.todos.filter(x => x !== 'TODO-VIP');
    if (v === 'general' && i < 0) st.areas = [];
    pintar();
  });
  o.querySelector('[data-g="areas"]').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    const v = b.dataset.v, i = st.areas.indexOf(v);
    if (i >= 0) st.areas.splice(i, 1); else { st.areas.push(v); st.todos = st.todos.filter(x => x !== 'TODO-VIP' && x !== 'general'); }
    pintar();
  });
  const sinLim = o.querySelector('#cdSinLim'), max = o.querySelector('#cdMax');
  const syncLim = () => { max.disabled = sinLim.checked; }; sinLim.addEventListener('change', syncLim); syncLim();
  pintar();

  o.querySelector('#cdSave').addEventListener('click', async () => {
    const err = o.querySelector('#cdErr'); err.classList.remove('show');
    if (!producto()) { err.textContent = 'Marca qué abre el código.'; err.classList.add('show'); return; }
    const datos = {
      producto: producto(),
      max: sinLim.checked ? 0 : Math.max(1, parseInt(max.value, 10) || 1),
      vence: o.querySelector('#cdVence').value, nota: o.querySelector('#cdNota').value
    };
    if (orig) { datos.editar = orig.codigo; datos.activo = o.querySelector('#cdAct').checked; }
    else { datos.cantidad = parseInt(o.querySelector('#cdCant').value, 10) || 1; datos.propio = o.querySelector('#cdPropio').value.trim(); }
    // Límite de descargas al día: solo cuenta si el código lleva Descargas PDF
    const conDescarga = esDescarga(datos), limite = conDescarga ? Math.min(500, Math.max(0, parseInt(o.querySelector('#cdLimDia').value, 10) || 0)) : 0;
    const btn = o.querySelector('#cdSave'); btn.disabled = true; btn.innerHTML = '<span class="spin-s"></span> Guardando…';
    try {
      const r = await api('guardarCodigo', { datos: JSON.stringify(datos) });
      // El código ya quedó guardado; si el límite falla se avisa sin perder el código
      let avisoLim = '';
      const cods = orig ? [orig.codigo] : r.creados;
      if (limite > 0 || (orig && CD.limites[orig.codigo])) {
        try { await guardarLimites(cods, limite); } catch (e) { avisoLim = e.message; }
      }
      // Sin volver a pedir toda la lista: se actualiza aquí y se refresca de fondo
      if (orig) {
        Object.assign(orig, { producto: datos.producto, max: datos.max, vence: datos.vence, nota: datos.nota, activo: datos.activo, etiqueta: etiquetaProd(datos.producto) });
        orig.estado = !orig.activo ? 'Desactivado' : (orig.vence && CD.hoy && CD.hoy > orig.vence) ? 'Vencido' : (orig.max > 0 && orig.usosAnt + orig.dispositivos.length >= orig.max) ? 'Lleno' : 'Activo';
        renderCodigos(); cerrar(); sincronizarDescargas();
        toast(avisoLim ? 'Código guardado, pero no el límite de descargas: ' + avisoLim : 'Código actualizado', !!avisoLim); return;
      }
      const nuevos = r.creados.map(cod => ({ codigo: cod, producto: datos.producto, etiqueta: r.etiqueta || etiquetaProd(datos.producto), max: datos.max, usosAnt: 0,
        nota: datos.nota, vence: datos.vence, activo: true, dispositivos: [], estado: 'Activo', creado: new Date().toISOString() }));
      CD.lista = nuevos.concat(CD.lista); renderCodigos(); sincronizarDescargas();
      if (avisoLim) toast('Códigos creados, pero no el límite de descargas: ' + avisoLim, true);
      o.querySelector('.mcard').innerHTML = `<button class="mx" type="button">✕</button>
        <div class="done" style="text-align:left;padding-top:0;">
          <div class="eyebrow">Listo</div><h3>${nuevos.length} código${nuevos.length > 1 ? 's creados' : ' creado'}</h3>
          <p style="margin:6px 0 14px;max-width:none;">Para: <b style="color:#f5ffcc">${esc(etiquetaProd(datos.producto))}</b> · ${datos.max ? datos.max + ' dispositivo' + (datos.max > 1 ? 's' : '') : 'sin límite'}${datos.vence ? ' · vence el ' + esc(datos.vence.split('-').reverse().join('/')) : ''}${conDescarga ? ' · ' + (limite && !avisoLim ? limite + ' descargas al día' : 'límite general de descargas') : ''}</p>
          <div class="cdnuevos">${nuevos.map(c => `<div><code>${esc(c.codigo)}</code><button class="rbtn" type="button" data-c="${esc(c.codigo)}">Copiar</button><button class="rbtn link" type="button" data-m="${esc(c.codigo)}">Mensaje</button></div>`).join('')}</div>
          <div class="mfoot"><button type="button" class="btn-ghost" id="cdCopTodos">Copiar todos</button><button type="button" class="btn-main" id="cdOk">Listo</button></div>
        </div>`;
      o.querySelector('.mx').addEventListener('click', cerrar); o.querySelector('#cdOk').addEventListener('click', cerrar);
      o.querySelector('#cdCopTodos').addEventListener('click', () => copiar(nuevos.map(c => c.codigo).join('\n')));
      o.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => copiar(b.dataset.c)));
      o.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => copiar(mensajeCodigo(nuevos.find(x => x.codigo === b.dataset.m)))));
    } catch (e) { btn.disabled = false; btn.textContent = orig ? 'Guardar cambios' : 'Crear'; err.textContent = e.message; err.classList.add('show'); }
  });
}

/* ---------- Importar del sistema anterior ---------- */
function importarCodigos() {
  const o = document.createElement('div');
  o.className = 'ov';
  o.innerHTML = `<div class="mcard" style="max-width:640px;"><button class="mx" type="button">✕</button>
    <div class="eyebrow">Sistema anterior</div><h3>Importar códigos</h3>
    <p class="sub" style="line-height:1.6;margin-top:6px;">En tu hoja antigua <b>"Modo Cachimbo - Códigos"</b>, pestaña <b>Codigos</b>, selecciona desde la columna <b>CÓDIGO</b> hasta <b>USUARIO</b> (puedes incluir los títulos), copia con <b>Ctrl+C</b> y pega aquí con <b>Ctrl+V</b>. Se conservan el límite y los usos.</p>
    <textarea class="ta" id="impTxt" style="min-height:160px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;" placeholder="CÓDIGO	PRODUCTO	DISPOSITIVO PERMITIDO	USOS ACTUALES	USUARIO"></textarea>
    <div id="impPrev" class="hint" style="margin-top:8px;"></div>
    <div class="err" id="impErr"></div>
    <div class="mfoot"><button type="button" class="btn-ghost" data-x>Cancelar</button><button type="button" class="btn-main" id="impOk" disabled>Importar</button></div>
  </div>`;
  document.body.appendChild(o); document.body.classList.add('modal-open');
  const cerrar = () => { o.remove(); document.body.classList.remove('modal-open'); };
  o.querySelector('.mx').addEventListener('click', cerrar); o.querySelector('[data-x]').addEventListener('click', cerrar);
  let filas = [];
  o.querySelector('#impTxt').addEventListener('input', e => {
    filas = e.target.value.split(/\r?\n/).map(l => l.split(/\t|;|,(?=\S)/).map(x => x.trim())).filter(c => c[0] && !/^c[óo]digo$/i.test(c[0]))
      .map(c => ({ codigo: c[0].toUpperCase(), producto: c[1] || '', max: parseFloat(c[2]) || 0, usos: parseFloat(c[3]) || 0, nota: c[4] || '' }));
    const malos = filas.filter(f => !f.producto.split(',').every(x => /^(TODO-VIP|general|repaso-VIP|fijas-VIP|seminario-VIP|banqueo-VIP|tarjetas-VIP|vocabulario-VIP|biblioteca-VIP|descarga-VIP|laboratorio-VIP|simulacro|(area|curso|repaso|fijas|seminario|banqueo|tarjetas|vocabulario)-[a-z0-9-]+)$/.test(x)));
    o.querySelector('#impPrev').innerHTML = filas.length
      ? `<b style="color:var(--text)">${filas.length} código${filas.length > 1 ? 's' : ''} detectado${filas.length > 1 ? 's' : ''}:</b> ` + filas.slice(0, 6).map(f => `${esc(f.codigo)} (${esc(etiquetaProd(f.producto))}, ${f.usos}/${f.max || '∞'})`).join(' · ') + (filas.length > 6 ? ' …' : '') +
        (malos.length ? `<br><span style="color:var(--red)">${malos.length} con producto no reconocido se saltarán.</span>` : '')
      : '';
    o.querySelector('#impOk').disabled = !filas.length;
  });
  o.querySelector('#impOk').addEventListener('click', async () => {
    const b = o.querySelector('#impOk'); b.disabled = true; b.innerHTML = '<span class="spin-s"></span> Importando…';
    try {
      const r = await api('importarCodigos', { filas: JSON.stringify(filas) });
      cerrar(); await cargarCodigos();
      toast(`${r.importados} importado${r.importados === 1 ? '' : 's'}` + (r.saltados.length ? ` · ${r.saltados.length} saltado${r.saltados.length === 1 ? '' : 's'} (ya existían o no son válidos)` : ''));
    } catch (e) { b.disabled = false; b.textContent = 'Importar'; const er = o.querySelector('#impErr'); er.textContent = e.message; er.classList.add('show'); }
  });
}

/* ---------- Acceso por ID (supabase/70-acceso-por-id.sql) ----------
   Sin código: el alumno te pasa su ID (el de 5 cifras de su tarjeta, en Perfil)
   y el paquete va directo a su cuenta de Google. Los códigos siguen igual. */
const PID = { lista: [], equipos: 2, hoy: '', err: '', filtro: 'Todos', abiertos: {} };
const PID_FALTA = 'Falta correr supabase/70-acceso-por-id.sql en Supabase.';
const pidError = e => /(could not find|does not exist|schema cache).*acceso_id_|acceso_id_.*(could not find|does not exist|schema cache)/i.test(e && e.message || '') ? PID_FALTA
  : /no autorizado/.test(e && e.message || '') ? 'Tu cuenta no tiene permiso de Códigos.'
  : (e && e.message) || 'Entra al panel con tu cuenta de Google para dar acceso por ID.';
async function pidRpc(fn, args) {
  const r = await (await MCAuth.listo).rpc(fn, args || {});
  if (r.error) throw r.error;
  return r.data;
}
async function cargarPorId() {
  try {
    const d = await pidRpc('acceso_id_lista');
    PID.lista = d.lista || []; PID.equipos = d.equipos; PID.hoy = d.hoy || ''; PID.err = ''; PID.cargado = true;
  } catch (e) { PID.err = pidError(e); }
  renderPorId(); ajusteEquiposId();
}
const pidVigente = a => !a.vence || !PID.hoy || a.vence >= PID.hoy;
const pidEquipos = a => Array.isArray(a.equipos) ? a.equipos : [];
function renderPorId() {
  renderVista();
  if (CD.vista !== 'id') return;
  const L = PID.lista;
  const pronto = a => pidVigente(a) && a.vence && cxDias(a.vence) <= 7;
  const pasa = (a, e) => e === 'Todos' || (e === 'Activos' ? pidVigente(a) : e === 'Vencidos' ? !pidVigente(a) : e === 'Pronto' ? pronto(a) : esDescarga(a));
  const cuenta = e => L.filter(a => pasa(a, e)).length;
  if (!['Todos', 'Activos', 'Pronto', 'Vencidos', 'Descargas'].includes(PID.filtro)) PID.filtro = 'Todos';
  const eqUso = L.reduce((s, a) => s + pidEquipos(a).length, 0);
  $('cdStats').innerHTML = PID.err ? '' : `<b>${L.length}</b> accesos dados por ID, sin código`;
  $('cdRes').innerHTML = PID.err ? '' : `<div><small>Activos</small><b style="color:#C6E000">${cuenta('Activos')}</b></div>
    <div><small>Vencen en 7 días</small><b style="color:#FF9600">${cuenta('Pronto')}</b>${puedeTab('porvencer') ? '<button type="button" data-ir="porvencer">Ver en Por vencer ›</button>' : ''}</div>
    <div><small>Vencidos</small><b style="color:#9A9A9A">${cuenta('Vencidos')}</b></div>
    <div><small>Equipos en uso</small><b style="color:#38BDF8">${eqUso}</b></div>`;
  $('cdChips').innerHTML = PID.err ? '' : ['Todos', 'Activos', 'Pronto', 'Vencidos', 'Descargas'].map(e =>
    `<button type="button" class="chip st ${e === PID.filtro ? 'on' : ''}" data-e="${e}">${{ Descargas: 'Descargas PDF', Pronto: 'Vencen pronto' }[e] || e} <span class="c">${cuenta(e)}</span></button>`).join('');
  $('cdChips').querySelectorAll('.chip').forEach(ch => ch.addEventListener('click', () => { PID.filtro = ch.dataset.e; CD.mostrar = 0; renderPorId(); }));
  if (PID.err) { $('cdList').innerHTML = `<div class="state-msg error">${esc(PID.err)}</div>`; return; }
  const q = $('cdBuscar').value.trim().toLowerCase();
  const rows = L.filter(a => pasa(a, PID.filtro) && (!q || [a.jid, a.apodo, a.email, a.nota, etiquetaProd(a.producto)].join(' ').toLowerCase().includes(q)));
  if (!L.length) { $('cdList').innerHTML = '<div class="state-msg">Aún no diste nada por ID. El alumno te pasa su ID (Perfil → su tarjeta → copiar) y tú tocas <b>＋ Dar por ID</b>.</div>'; return; }
  if (!rows.length) { $('cdList').innerHTML = '<div class="state-msg">Nada con ese filtro.</div>'; return; }
  // Equipos que vale cada alumno: el más alto de sus accesos activos (0 = sin límite), igual que en Supabase
  const maxDe = u => {
    const m = L.filter(x => x.usuario === u && pidVigente(x)).map(x => x.max_equipos == null ? (PID.equipos || 0) : x.max_equipos);
    return !m.length ? (PID.equipos || 0) : m.includes(0) ? 0 : Math.max(...m);
  };
  const tope = Math.max(60, CD.mostrar || 0), ver = rows.slice(0, tope);
  $('cdList').innerHTML = `<table class="cx-t sin-ck"><thead><tr><th></th><th>ID</th><th>Paquete</th><th>Alumno</th><th>Equipos</th><th>Vence</th><th></th></tr></thead><tbody>
    ${ver.map(a => {
      const max = maxDe(a.usuario), vig = pidVigente(a), eqs = pidEquipos(a);
      const sub = [esDescarga(a) ? (a.limite_dia ? a.limite_dia + ' descargas al día' : 'límite general de descargas') : '',
        a.max_equipos != null ? (a.max_equipos ? a.max_equipos + (a.max_equipos === 1 ? ' equipo' : ' equipos') : 'equipos sin límite') : ''].filter(Boolean).join(' · ');
      const det = CD.det === 'p:' + a.id ? `<tr class="cx-det"><td colspan="7">${eqs.length ? eqs.map(x => `<div class="cx-dev"><span>${cxIcoEquipo(x.equipo)}<span><b>${esc(x.equipo || 'Equipo')}</b> · último uso ${esc(fechaCorta(x.visto))}</span></span>
          <button class="rbtn" type="button" data-plib="${a.id}" data-disp="${esc(x.dispositivo)}">Liberar</button></div>`).join('') : '<div class="hint">Aún no entra en ningún equipo.</div>'}
        ${eqs.length > 1 ? `<div class="rfoot" style="margin-top:8px;"><button class="rbtn danger" type="button" data-plib="${a.id}" data-disp="">Liberar todos</button></div>` : ''}</td></tr>` : '';
      return `<tr class="${vig ? '' : 'dim'}"><td></td>
        <td>${a.jid ? `<button class="cx-cod" type="button" data-copy="${esc(a.jid)}" title="Copiar ID">ID ${esc(a.jid)} ${CX_ICO.copiar}</button>` : '<span class="cx-cod">Sin ID</span>'}</td>
        <td class="cx-pq">${esc(etiquetaProd(a.producto))}${sub ? `<small>${esc(sub)}</small>` : ''}</td>
        <td class="cx-quien"><b>${esc(a.apodo || 'Sin apodo')}</b>${puedeTab('alumnos') ? `<button class="cx-lnk" type="button" data-cx-ficha="${esc(a.usuario)}">${esc(a.email || '')} · Ficha ›</button>` : `<small>${esc(a.email || '')}</small>`}${a.nota ? `<small>${esc(a.nota)}</small>` : ''}</td>
        <td class="cx-eq"><b>${eqs.length}</b> de ${max || '∞'}<div class="bar"><i style="width:${max ? Math.min(100, Math.round(eqs.length / max * 100)) : 0}%"></i></div></td>
        <td class="cx-v">${cxVence(a.vence, !vig)}</td>
        ${cxAcciones(String(a.id), vig ? 'Activo' : 'Vencido', !!a.vence, vig ? '' : 'Renovar')}</tr>${det}`;
    }).join('')}</tbody></table>
    ${rows.length > tope ? `<button class="btn-ghost cx-mas-filas" type="button" data-cx-mas>Ver ${Math.min(60, rows.length - tope)} más (de ${rows.length})</button>` : ''}`;
  if (CD.menu && $('cxMenu')) {
    const a = PID.lista.find(x => String(x.id) === CD.menu);
    if (a) $('cxMenu').innerHTML = `<button type="button" data-cx-m="editar">Editar</button><button type="button" data-cx-m="equipos">Equipos (${pidEquipos(a).length})</button>
      ${puedeTab('alumnos') ? '<button type="button" data-cx-m="ficha">Abrir ficha</button>' : ''}<button type="button" class="r" data-cx-m="quitar">Quitar</button>`;
  }
}
// «Equipos por cuenta» va en la caja «Acceso libre y ajustes»
function ajusteEquiposId() {
  const box = $('cdAjustes'); if (!box || PID.err || !PID.cargado) return;
  const ya = box.querySelector('#pidEquipos'); if (ya) { ya.value = String(PID.equipos); return; }
  const row = document.createElement('div');
  row.className = 'acc-row legacy';
  row.innerHTML = `<div><b>Equipos por cuenta (acceso por ID)</b><span>En cuántos celulares o laptops abre lo dado por ID. Si entra en uno más, deja de abrir en el más antiguo. Los códigos no cambian.</span></div>
    <select class="inp" id="pidEquipos">${[1, 2, 3, 4, 5, 0].map(v => `<option value="${v}" ${PID.equipos === v ? 'selected' : ''}>${v ? v + (v === 1 ? ' equipo' : ' equipos') : 'Sin límite'}</option>`).join('')}</select>`;
  box.appendChild(row);
  row.querySelector('select').addEventListener('change', async e => {
    const v = parseInt(e.target.value, 10);
    try { await pidRpc('acceso_id_equipos_guardar', { p_max: v }); PID.equipos = v; toast('Equipos por cuenta: ' + (v || 'sin límite')); if (CD.vista === 'id') renderPorId(); }
    catch (er) { toast(pidError(er), true); e.target.value = String(PID.equipos); }
  });
}
// Saca los ID de 5 cifras de lo que se pegue (con comas, espacios, saltos de línea o «ID 12345»)
const pidIds = t => [...new Set((String(t).match(/\b\d{5}\b/g) || []).map(Number))].slice(0, 200);
function darPorId(orig, opts) {
  // opts (desde la Ficha del alumno): { ids: [48213], despues: fn }
  opts = opts || {};
  // orig: editar un acceso ya dado (cambia paquete, fecha, nota o límite sin quitarlo)
  const st = { todos: orig ? [] : ['seminario-VIP'], areas: [] };
  if (orig) String(orig.producto || '').split(',').filter(Boolean).forEach(p => {
    if (/^area-/.test(p)) st.areas.push(p.slice(5)); else st.todos.push(p);
  });
  const multi = (g, ops) => `<div class="chips" data-g="${g}">` + ops.map(([v, l]) => `<button type="button" class="chip" data-v="${esc(v)}">${l}</button>`).join('') + '</div>';
  const o = document.createElement('div');
  o.className = 'ov';
  o.innerHTML = `<div class="mcard" style="max-width:620px;"><button class="mx" type="button" aria-label="Cerrar">✕</button>
    <div class="eyebrow">${orig ? 'Editar acceso por ID' : 'Sin código'}</div><h3>${orig ? 'ID ' + esc(orig.jid || '') : 'Dar acceso por ID'}</h3>
    ${orig ? `<div class="hint" style="margin-top:2px;"><b>${esc(orig.apodo || 'Sin apodo')}</b> · ${esc(orig.email || '')}</div>` : `
    <label class="fld">ID del alumno <span class="hint">Uno o varios: el número de 5 cifras de su tarjeta (Perfil)</span></label>
    <textarea class="inp" id="pidIds" rows="2" placeholder="Ej.: 48217, 10593"></textarea>
    <div class="hint" id="pidQuien" style="margin-top:6px;line-height:1.6;"></div>`}
    <label class="fld">¿Qué le das? <span class="hint">Puedes marcar varios paquetes</span></label>
    ${multi('todos', PROD_TODOS)}
    <div class="hint" id="pidAyuda" style="margin:6px 0 0;"></div>
    <div class="hint" style="margin:12px 0 6px;">O solo un área (sin Simulacro ni Duelos)</div>${multi('areas', AREAS_COD)}
    <div class="hint" id="pidResumen" style="margin-top:10px;"></div>
    <div id="pidLimBox" hidden>
      <label class="fld">Descargas PDF por día <span class="hint">por alumno · vacío = el límite general de Panel → Descargas PDF</span></label>
      <input class="inp" id="pidLimDia" type="number" min="1" max="500" placeholder="Ej.: 20" value="${orig && orig.limite_dia ? orig.limite_dia : ''}">
    </div>
    <div class="cdgrid">
      <label>Dispositivos<input class="inp" id="pidMax" type="number" min="1" max="100" placeholder="General: ${PID.equipos ? PID.equipos : 'sin límite'}" value="${orig && orig.max_equipos ? orig.max_equipos : ''}"></label>
      <label class="ck" style="align-self:end;"><input type="checkbox" id="pidSinLim" ${orig && orig.max_equipos === 0 ? 'checked' : ''}>Sin límite</label>
    </div>
    <div class="hint" style="margin:4px 0 0;">En cuántos celulares o laptops abre. Vacío = lo general (${PID.equipos ? PID.equipos : 'sin límite'}). Si el alumno entra en uno más, el más antiguo deja de abrir.</div>
    <div class="cdgrid">
      <label>Hasta (opcional)<input class="inp" id="pidVence" type="date" value="${orig && orig.vence ? esc(orig.vence) : ''}"></label>
      <label style="grid-column: span 2;">Nota (solo la ves tú)<input class="inp" id="pidNota" maxlength="120" placeholder="Ej.: Yape 05/11 · S/ 25" value="${orig && orig.nota ? esc(orig.nota) : ''}"></label>
    </div>
    <div class="err" id="pidErr"></div>
    <div class="mfoot"><button type="button" class="btn-ghost" data-x>Cancelar</button><button type="button" class="btn-main" id="pidSave">${orig ? 'Guardar cambios' : 'Activar'}</button></div>
  </div>`;
  document.body.appendChild(o); document.body.classList.add('modal-open');
  const cerrar = () => { o.remove(); document.body.classList.remove('modal-open'); };
  o.querySelector('.mx').addEventListener('click', cerrar); o.querySelector('[data-x]').addEventListener('click', cerrar);
  // Mismas reglas que al crear un código
  const producto = () => {
    if (st.todos.includes('TODO-VIP')) return ['TODO-VIP'].concat(EXTRAS.filter(x => st.todos.includes(x))).join(',');
    const areas = st.todos.includes('general') ? [] : st.areas.map(a => 'area-' + a);
    return st.todos.concat(areas).join(',');
  };
  let quienes = [], ids = [], tQ = null;
  const pintar = () => {
    o.querySelectorAll('[data-g="todos"] .chip').forEach(x => x.classList.toggle('on', st.todos.includes(x.dataset.v)));
    o.querySelectorAll('[data-g="areas"] .chip').forEach(x => x.classList.toggle('on', st.areas.includes(x.dataset.v)));
    o.querySelector('#pidAyuda').textContent = st.todos.map(v => PROD_AYUDA[v]).filter(Boolean).join(' · ');
    const p = producto(); o.querySelector('#pidResumen').innerHTML = p ? 'Abrirá: <b style="color:#f5ffcc">' + esc(etiquetaProd(p)) + '</b>' : '';
    o.querySelector('#pidLimBox').hidden = !esDescarga({ producto: p });
    if (orig) return;
    const ok = quienes.filter(x => x.existe).length;
    o.querySelector('#pidQuien').innerHTML = quienes.map(x => x.existe
      ? `<span style="color:var(--accent)">✔</span> <b>${x.id}</b> ${esc(x.apodo || 'Sin apodo')} · ${esc(x.email || '')}`
      : `<span style="color:var(--red)">✘ <b>${x.id}</b> no existe</span>`).join('<br>');
    o.querySelector('#pidSave').textContent = ok > 1 ? `Activar a ${ok} alumnos` : 'Activar';
  };
  if (!orig) o.querySelector('#pidIds').addEventListener('input', e => {
    ids = pidIds(e.target.value); clearTimeout(tQ);
    if (!ids.length) { quienes = []; pintar(); return; }
    tQ = setTimeout(async () => {
      const pedidos = ids.slice();
      try { const r = await pidRpc('acceso_id_quienes', { p_codigos: pedidos }); if (pedidos.join() === ids.join()) { quienes = r || []; pintar(); } }
      catch (er) { o.querySelector('#pidQuien').innerHTML = `<span style="color:var(--red)">${esc(pidError(er))}</span>`; }
    }, 350);
  });
  o.querySelector('[data-g="todos"]').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    const v = b.dataset.v, i = st.todos.indexOf(v);
    if (i >= 0) st.todos.splice(i, 1); else st.todos.push(v);
    if (v === 'TODO-VIP' && i < 0) { st.todos = st.todos.filter(x => x === 'TODO-VIP' || EXTRAS.includes(x)); st.areas = []; }
    else if (v !== 'TODO-VIP' && !EXTRAS.includes(v)) st.todos = st.todos.filter(x => x !== 'TODO-VIP');
    if (v === 'general' && i < 0) st.areas = [];
    pintar();
  });
  o.querySelector('[data-g="areas"]').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    const v = b.dataset.v, i = st.areas.indexOf(v);
    if (i >= 0) st.areas.splice(i, 1); else { st.areas.push(v); st.todos = st.todos.filter(x => x !== 'TODO-VIP' && x !== 'general'); }
    pintar();
  });
  const syncMax = () => { const sl = o.querySelector('#pidSinLim').checked, m = o.querySelector('#pidMax'); m.disabled = sl; if (sl) m.value = ''; };
  o.querySelector('#pidSinLim').addEventListener('change', syncMax); syncMax();
  pintar();
  if (!orig && opts.ids && opts.ids.length) { const t = o.querySelector('#pidIds'); t.value = opts.ids.join(', '); t.dispatchEvent(new Event('input')); }
  if (!orig) o.querySelector('#pidIds').focus();
  o.querySelector('#pidSave').addEventListener('click', async () => {
    const err = o.querySelector('#pidErr'); err.classList.remove('show');
    const p = producto();
    if (!orig && !ids.length) { err.textContent = 'Escribe al menos un ID (5 cifras).'; err.classList.add('show'); return; }
    if (!p) { err.textContent = 'Marca qué le das.'; err.classList.add('show'); return; }
    const btn = o.querySelector('#pidSave'); btn.disabled = true; btn.innerHTML = '<span class="spin-s"></span> Activando…';
    try {
      const lim = esDescarga({ producto: p }) ? Math.min(500, Math.max(0, parseInt(o.querySelector('#pidLimDia').value, 10) || 0)) : 0;
      const args = { p_codigos: ids, p_producto: p, p_vence: o.querySelector('#pidVence').value || null, p_nota: o.querySelector('#pidNota').value || null };
      if (lim) args.p_limite = lim;
      const mxv = parseInt(o.querySelector('#pidMax').value, 10);
      const eq = o.querySelector('#pidSinLim').checked ? 0 : (mxv > 0 ? Math.min(100, mxv) : null);
      if (eq !== null) args.p_equipos = eq;
      const falta78 = er => { if (/p_equipos|acceso_id_dar|acceso_id_editar/.test(er && er.message || '')) throw new Error('Para poner dispositivos por ID, falta correr supabase/78-dispositivos-por-id.sql en Supabase.'); throw er; };
      if (orig) {
        await pidRpc('acceso_id_editar', { p_id: orig.id, p_producto: p, p_vence: args.p_vence, p_nota: args.p_nota, p_limite: lim || null, p_equipos: eq }).catch(falta78);
        Object.assign(orig, { producto: p, vence: args.p_vence, nota: args.p_nota, limite_dia: lim || null, max_equipos: eq });
        cerrar(); renderPorId(); toast('Acceso actualizado'); if (opts.despues) opts.despues(); return;
      }
      const r = await pidRpc('acceso_id_dar', args).catch(er => {
        if (eq !== null) falta78(er);
        if (lim && /p_limite|acceso_id_dar/.test(er && er.message || '')) throw new Error('Para poner descargas por día, falta correr supabase/76-limite-descarga-por-id.sql en Supabase.');
        throw er;
      });
      const sin = r.sin_id || [];
      cerrar(); CD.vista = 'id'; cargarPorId(); if (opts.despues) opts.despues();
      toast(`Activado a ${r.alumnos} alumno${r.alumnos === 1 ? '' : 's'}: ${etiquetaProd(p)}` + (sin.length ? ` · no existen: ${sin.join(', ')}` : ''), !!sin.length);
    } catch (er) { btn.disabled = false; btn.textContent = orig ? 'Guardar cambios' : 'Activar'; err.textContent = pidError(er); err.classList.add('show'); }
  });
}
