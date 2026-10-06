/* =========================================================
   Panel · Alumnos (cuentas de Supabase)
   Racha de cada alumno. Solo ven la lista los correos que
   están en la tabla public.admins (supabase/02-racha.sql).
   ========================================================= */
const ALU = { lista: [], cargado: false, extras: [] };

(function estilosAlumnos() {
  const st = document.createElement('style');
  st.textContent = `
  .al-tabla-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 18px; background: var(--surface); }
  .al-tabla { width: 100%; border-collapse: collapse; font-size: 13.5px; min-width: 860px; }
  .al-tabla th { text-align: left; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-faint); font-weight: 700; padding: 14px 16px; border-bottom: 1px solid var(--border); white-space: nowrap; }
  .al-tabla td { padding: 12px 16px; border-bottom: 1px solid #191919; vertical-align: middle; }
  .al-tabla tr:last-child td { border-bottom: none; }
  .al-tabla .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .al-quien { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .al-av { width: 34px; height: 34px; border-radius: 50%; background: var(--accent); color: #0e0e0e; display: grid; place-items: center; font: 800 13px 'Sora', sans-serif; overflow: hidden; flex-shrink: 0; }
  .al-av img { width: 100%; height: 100%; object-fit: cover; }
  .al-quien b { display: block; font-weight: 600; }
  .al-quien small { display: block; color: var(--text-faint); font-size: 12px; }
  .al-racha { display: inline-flex; align-items: center; gap: 6px; font: 800 15px 'Sora', sans-serif; color: var(--text-dim); }
  .al-racha.on { color: var(--accent); }
  .al-racha svg { width: 12px; height: 16px; }
  .al-login { display: grid; justify-items: center; gap: 14px; }`;
  document.head.appendChild(st);
})();

function alFecha(f) {
  if (!f) return '—';
  const p = String(f).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : esc(f);
}

async function cargarAlumnos(forzar) {
  if (ALU.cargado && !forzar) return renderAlumnos();
  $('aluList').innerHTML = '<div class="loader">Cargando alumnos…</div>';
  let cliente;
  try { cliente = await MCAuth.listo; }
  catch (e) { $('aluList').innerHTML = '<div class="state-msg error">No se pudo conectar con Supabase. Revisa tu internet.</div>'; return; }
  const u = MCAuth.usuario();
  if (!u) {
    $('aluList').innerHTML = `<div class="state-msg al-login">
      Para ver a tus alumnos entra con tu cuenta de Google de administrador.
      <button class="btn-main" type="button" id="aluEntrar">Entrar con Google</button></div>`;
    $('aluEntrar').addEventListener('click', () => MCAuth.entrarGoogle());
    return;
  }
  const r = await cliente.rpc('racha_alumnos');
  if (r.error) {
    const noAdmin = /no autorizado/i.test(r.error.message || '');
    $('aluList').innerHTML = noAdmin
      ? `<div class="state-msg error">Tu correo <b>${esc(u.email)}</b> no está como administrador.<br>Agrégalo en Supabase → SQL Editor con:<br><code>insert into public.admins (email) values ('${esc(u.email)}');</code></div>`
      : `<div class="state-msg error">${esc(r.error.message || 'No se pudo cargar la lista.')}<br>¿Ya corriste el archivo supabase/02-racha.sql?</div>`;
    return;
  }
  ALU.lista = r.data || []; ALU.cargado = true;
  // Progreso de cada alumno (supabase/04-progreso.sql); si aún no existe, la tabla sale sin esas columnas
  const g = await cliente.rpc('progreso_alumnos');
  ALU.progreso = !g.error;
  if (!g.error) {
    const por = {}; (Array.isArray(g.data) ? g.data : []).forEach(x => { por[x.email] = x; });
    ALU.lista.forEach(a => { const x = por[a.email] || {}; a.practicas = x.practicas || 0; a.promedio = x.promedio || 0; a.falladas = x.falladas || 0; });
  }
  // Respuestas a las preguntas extra del perfil (supabase/05-perfil-config.sql)
  ALU.extras = [];
  if (window.MCCarreras) {
    const [x] = await Promise.all([cliente.rpc('alumnos_extra'), MCCarreras.cargar()]);
    if (!x.error) {
      const por = {}; (Array.isArray(x.data) ? x.data : []).forEach(e => { por[e.email] = e.extra || {}; });
      ALU.extras = MCCarreras.extras.slice();
      ALU.lista.forEach(a => { a.extra = por[a.email] || {}; });
    }
  }
  renderAlumnos();
}

function renderAlumnos() {
  const L = ALU.lista;
  const activos = L.filter(a => a.actual > 0).length;
  const hoy = L.filter(a => a.hoy >= 10).length;
  $('aluStats').innerHTML = `<b>${L.length}</b> alumno${L.length === 1 ? '' : 's'} · <b>${activos}</b> con racha · <b>${hoy}</b> cumplieron hoy`;
  const q = $('aluBuscar').value.trim().toLowerCase();
  const rows = L.filter(a => !q || [a.nombre, a.apodo, a.email, a.carrera].concat(Object.values(a.extra || {})).join(' ').toLowerCase().includes(q));
  if (!L.length) { $('aluList').innerHTML = '<div class="state-msg">Todavía no hay alumnos registrados.</div>'; return; }
  if (!rows.length) { $('aluList').innerHTML = '<div class="state-msg">Ningún alumno coincide con la búsqueda.</div>'; return; }
  const icono = window.MCRacha ? MCRacha.icono : '🔥';
  $('aluList').innerHTML = `<div class="al-tabla-wrap"><table class="al-tabla">
    <thead><tr><th>Alumno</th><th>Carrera</th><th class="num">Racha</th><th class="num">Mejor</th><th class="num">Preguntas hoy</th><th class="num">Último día cumplido</th>${ALU.progreso ? '<th class="num">Prácticas</th><th class="num">Promedio</th><th class="num">Por repasar</th>' : ''}${ALU.extras.map(x => `<th>${esc(x.etiqueta)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(a => {
      const nom = a.apodo || a.nombre || (a.email || '').split('@')[0];
      const ini = esc((nom || '?').charAt(0).toUpperCase());
      return `<tr>
        <td><div class="al-quien"><span class="al-av">${a.foto_url ? `<img src="${esc(a.foto_url)}" alt="" referrerpolicy="no-referrer">` : ini}</span>
          <div><b>${esc(nom)}</b><small>${esc(a.email || '')}</small></div></div></td>
        <td>${esc(a.carrera || '—')}</td>
        <td class="num"><span class="al-racha ${a.hoy >= 10 ? 'on' : ''}">${icono}${a.actual}</span></td>
        <td class="num">${a.mejor}</td>
        <td class="num">${a.hoy}</td>
        <td class="num">${alFecha(a.ultima)}</td>
        ${ALU.progreso ? `<td class="num">${a.practicas}</td><td class="num">${a.practicas ? a.promedio + '%' : '—'}</td><td class="num">${a.falladas}</td>` : ''}
        ${ALU.extras.map(x => { const v = (a.extra || {})[x.id]; return `<td>${v == null || v === '' ? '—' : esc(v)}</td>`; }).join('')}
      </tr>`;
    }).join('')}</tbody></table></div>`;
}

$('aluBuscar').addEventListener('input', renderAlumnos);
$('aluRecargar').addEventListener('click', () => cargarAlumnos(true));
