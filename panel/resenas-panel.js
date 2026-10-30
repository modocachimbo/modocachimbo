/* =========================================================
   Panel · Reseñas
   Las reseñas que dejan los alumnos desde su perfil. Ninguna sale en la
   web hasta que aquí se publica. Cada una muestra su ID (#), el ID de 5
   dígitos del alumno y, al tocarlo, su ficha y cómo se verá la tarjeta.
   - Publicar · Ocultar · Volver a pendiente · Destacar (sale primero) · Borrar
   - Las publicadas se ordenan con ↑ ↓ (es el orden del slider).
   Datos: supabase/46-resenas.sql (resenas_admin, moderar_resena, ordenar_resenas).
   El slider y las tarjetas: assets/resenas.js
   ========================================================= */
const RSP = { lista: [], cuenta: {}, ver: 'pendiente', ocupado: false };

(function estilosResenas() {
  const st = document.createElement('style');
  st.textContent = `
  .rsp-card { display: grid; gap: 12px; }
  .rsp-card.dest { border-bottom-color: #FFC800 !important; }
  .rsp-top { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .rsp-num { font: 900 13px Nunito, sans-serif; color: var(--text-faint); }
  .rsp-est { color: #FFC800; font-size: 17px; letter-spacing: 1px; }
  .rsp-est i { font-style: normal; color: #3a3260; }
  .rsp-tag { font: 900 11px Nunito, sans-serif; text-transform: uppercase; letter-spacing: .5px; border-radius: 100px; padding: 3px 9px; border: 1px solid; }
  .rsp-tag.pendiente { color: #FFC800; border-color: rgba(255,200,0,.4); }
  .rsp-tag.publicada { color: #58CC02; border-color: rgba(88,204,2,.45); }
  .rsp-tag.oculta { color: var(--text-dim); border-color: #352E58; }
  .rsp-tag.dest { color: #2a1d00; background: #FFC800; border-color: #FFC800; }
  .rsp-fecha { margin-left: auto; font-size: 12px; color: var(--text-faint); }
  .rsp-tx { font-size: 15px; line-height: 1.55; color: var(--text); overflow-wrap: anywhere; }
  .rsp-al { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 14px; background: #120e22; border: 2px solid #2A2346; cursor: pointer; text-align: left; color: var(--text); width: 100%; font: inherit; }
  .rsp-al:hover { border-color: #3A3360; }
  .rsp-foto { width: 42px; height: 42px; flex-shrink: 0; border-radius: 50%; background: #2A2346 center/cover; display: grid; place-items: center; font: 1000 18px Nunito, sans-serif; color: var(--accent); }
  .rsp-al b { display: block; font: 900 15px Nunito, sans-serif; overflow-wrap: anywhere; }
  .rsp-al small { display: block; color: var(--text-dim); font-size: 12.5px; overflow-wrap: anywhere; }
  .rsp-al .ver { margin-left: auto; flex-shrink: 0; font: 900 12px Nunito, sans-serif; color: var(--accent); text-transform: uppercase; letter-spacing: .5px; }
  .rsp-acc { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .rsp-acc .orden { margin-left: auto; display: flex; gap: 6px; }
  .rsp-acc .orden button { width: 40px; padding: 8px 0; }
  .rsp-prev { margin-top: 18px; padding: 18px; border-radius: 18px; background: #0B0818;
    --tarjeta: #151127; --borde: #2A2346; --texto: #EEEAF7; --suave: #A99FC8; --display: 'Barlow Condensed', 'Arial Narrow', sans-serif; --cuerpo: Nunito, sans-serif; }
  .rsp-prev .rs-card { flex: none; max-width: 340px; }
  .rsp-datos { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 14px; }
  .rsp-datos div { padding: 9px 12px; border-radius: 12px; background: #120e22; border: 1px solid #2A2346; font-size: 12px; color: var(--text-dim); overflow-wrap: anywhere; }
  .rsp-datos b { display: block; font: 900 14.5px Nunito, sans-serif; color: var(--text); }
  @media (max-width: 560px) { .rsp-fecha { margin-left: 0; width: 100%; } .rsp-acc .orden { margin-left: 0; } }`;
  document.head.appendChild(st);
})();

const rspFecha = f => f ? new Date(f).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const rspEst = n => '<span class="rsp-est" aria-label="' + n + ' de 5">' + '★'.repeat(n) + '<i>' + '★'.repeat(5 - n) + '</i></span>';
const rspIni = r => esc((r.apodo || r.email || '?').trim().charAt(0).toUpperCase());

function rspBadge() {
  const n = RSP.cuenta.pendiente || 0, b = $('badgeResenas');
  if (b) { b.hidden = !n; b.textContent = n; }
}

async function cargarResenas() {
  const caja = $('rspList');
  caja.innerHTML = '<div class="loader">Cargando…</div>';
  let cliente;
  try { cliente = await MCAuth.listo; }
  catch (e) { caja.innerHTML = '<div class="state-msg error">No se pudo conectar con Supabase. Revisa tu internet.</div>'; return; }
  if (!MCAuth.usuario()) {
    caja.innerHTML = `<div class="state-msg al-login">Entra con tu cuenta de Google de administrador.
      <button class="btn-main" type="button" id="rspEntrar">Entrar con Google</button></div>`;
    $('rspEntrar').addEventListener('click', () => MCAuth.entrarGoogle());
    return;
  }
  const r = await cliente.rpc('resenas_admin');
  if (r.error) {
    caja.innerHTML = /no autorizado/i.test(r.error.message || '')
      ? '<div class="state-msg error">Tu cuenta no tiene permiso para revisar reseñas.</div>'
      : `<div class="state-msg error">${esc(r.error.message || 'No se pudo cargar.')}<br>¿Ya corriste el archivo supabase/46-resenas.sql?</div>`;
    return;
  }
  RSP.lista = (r.data && r.data.lista) || [];
  RSP.cuenta = (r.data && r.data.cuenta) || {};
  rspBadge();
  pintarResenas();
}

function pintarResenas() {
  const C = RSP.cuenta, caja = $('rspList');
  const chip = (v, nom) => `<button class="chip${RSP.ver === v ? ' on' : ''}" data-v="${v}" type="button">${nom} <span class="c">${C[v] || 0}</span></button>`;
  $('rspChips').innerHTML = chip('pendiente', 'Pendientes') + chip('publicada', 'Publicadas') + chip('oculta', 'Ocultas');
  const pub = RSP.lista.filter(x => x.estado === 'publicada');
  const prom = pub.length ? (pub.reduce((s, x) => s + x.estrellas, 0) / pub.length).toFixed(1).replace('.', ',') : '–';
  $('rspStats').textContent = `${pub.length} publicadas · promedio ${prom} ★ en la web. Las pendientes no se ven hasta que las publiques.`;
  const L = RSP.lista.filter(x => x.estado === RSP.ver);
  if (!L.length) {
    caja.innerHTML = `<div class="state-msg">${RSP.ver === 'pendiente' ? 'No hay reseñas por revisar. 🎉' : RSP.ver === 'publicada' ? 'Aún no publicaste ninguna reseña.' : 'No hay reseñas ocultas.'}</div>`;
    return;
  }
  const noBorrar = document.body.classList.contains('no-borrar');
  caja.innerHTML = (RSP.ver === 'publicada' ? '<p class="hint" style="margin:0 0 12px">Este es el orden del slider: las destacadas salen primero y luego las demás de arriba hacia abajo.</p>' : '') +
    L.map((x, i) => `<div class="rcard rsp-card${x.destacada ? ' dest' : ''}" data-id="${x.id}">
      <div class="rsp-top">
        <span class="rsp-num">#${x.id}</span>${rspEst(x.estrellas)}
        <span class="rsp-tag ${x.estado}">${x.estado}</span>${x.destacada ? '<span class="rsp-tag dest">Destacada</span>' : ''}
        <span class="rsp-fecha">${x.editada && x.creada && x.editada !== x.creada && new Date(x.editada) - new Date(x.creada) > 60000 ? 'Editada el ' + rspFecha(x.editada) : rspFecha(x.creada)}${x.revisor ? ' · revisó ' + esc(x.revisor.split('@')[0]) : ''}</span>
      </div>
      <div class="rsp-tx">“${esc(x.texto)}”</div>
      <button type="button" class="rsp-al" data-rsp-ver="${x.id}">
        <span class="rsp-foto"${x.foto ? ` style="background-image:url('${esc(x.foto)}')"` : ''}>${x.foto ? '' : rspIni(x)}</span>
        <span style="min-width:0"><b>${esc(x.apodo || 'Sin apodo')}${x.codigo ? ' · ID ' + x.codigo : ''}</b><small>${esc([x.nombre, x.email].filter(Boolean).join(' · '))}</small></span>
        <span class="ver">Ver alumno ›</span>
      </button>
      <div class="rsp-acc">
        ${x.estado !== 'publicada' ? `<button class="btn-main" type="button" data-acc="publicar">Publicar</button>` : ''}
        ${x.estado === 'publicada' ? (x.destacada ? '<button class="btn-ghost" type="button" data-acc="quitar">Quitar destacada</button>' : '<button class="btn-ghost" type="button" data-acc="destacar">★ Destacar</button>') : ''}
        ${x.estado !== 'oculta' ? '<button class="btn-ghost" type="button" data-acc="ocultar">Ocultar</button>' : '<button class="btn-ghost" type="button" data-acc="pendiente">Volver a pendiente</button>'}
        ${noBorrar ? '' : '<button class="btn-ghost" type="button" data-acc="borrar" style="color:#FF6E6E">Borrar</button>'}
        ${x.estado === 'publicada' && !x.destacada ? `<span class="orden"><button class="btn-ghost" type="button" data-mover="-1" ${i === 0 || L[i - 1].destacada ? 'disabled' : ''} aria-label="Subir">↑</button><button class="btn-ghost" type="button" data-mover="1" ${i === L.length - 1 ? 'disabled' : ''} aria-label="Bajar">↓</button></span>` : ''}
      </div>
    </div>`).join('');
}

async function rspAccion(id, acc, btn) {
  if (RSP.ocupado) return;
  if (acc === 'borrar' && btn.dataset.seguro !== '1') { btn.dataset.seguro = '1'; btn.textContent = '¿Seguro? Toca otra vez'; return; }
  RSP.ocupado = true; btn.disabled = true;
  try {
    const c = await MCAuth.listo;
    const r = await c.rpc('moderar_resena', { p_id: id, p_accion: acc });
    if (r.error) throw r.error;
    toast({ publicar: 'Reseña publicada', ocultar: 'Reseña oculta', pendiente: 'Volvió a pendientes', destacar: 'Ahora sale primero', quitar: 'Ya no está destacada', borrar: 'Reseña borrada' }[acc]);
    RSP.ocupado = false;
    await cargarResenas();
  } catch (e) {
    RSP.ocupado = false; btn.disabled = false;
    toast(/no autorizado/i.test(e.message || '') ? 'Tu cuenta no tiene permiso para esto.' : e.message || 'No se pudo.', true);
  }
}

// Sube o baja una publicada (no destacada) y guarda el orden de todas
async function rspMover(id, dir) {
  if (RSP.ocupado) return;
  const pub = RSP.lista.filter(x => x.estado === 'publicada' && !x.destacada);
  const i = pub.findIndex(x => x.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= pub.length) return;
  [pub[i], pub[j]] = [pub[j], pub[i]];
  const dest = RSP.lista.filter(x => x.estado === 'publicada' && x.destacada);
  const resto = RSP.lista.filter(x => x.estado !== 'publicada');
  RSP.lista = [...dest, ...pub, ...resto];
  pintarResenas();
  RSP.ocupado = true;
  try {
    const c = await MCAuth.listo;
    const r = await c.rpc('ordenar_resenas', { p_ids: [...dest, ...pub].map(x => x.id) });
    if (r.error) throw r.error;
  } catch (e) { toast('No se pudo guardar el orden: ' + (e.message || ''), true); cargarResenas(); }
  RSP.ocupado = false;
}

// Ficha del alumno y vista previa de su tarjeta tal como sale en el inicio
function rspVerAlumno(id) {
  const x = RSP.lista.find(r => r.id === id); if (!x) return;
  const mil = n => Number(n || 0).toLocaleString('es-PE');
  const rg = window.MCRango && MCRango.nivel(x.xp_semana) >= 0 ? MCRango.nombre(MCRango.nivel(x.xp_semana)) : 'Sin rango';
  const o = document.createElement('div'); o.className = 'ov';
  o.innerHTML = `<div class="mcard" style="max-width:560px"><button class="mx" type="button" aria-label="Cerrar">✕</button>
    <div class="eyebrow">Reseña #${x.id} · ${esc(x.estado)}</div><h3>${esc(x.apodo || 'Sin apodo')}</h3>
    <div class="sub">${esc(x.email || '')}</div>
    <div class="rsp-datos">
      <div><b>${x.codigo || '—'}</b>ID de alumno</div>
      <div><b>${esc(x.nombre || '—')}</b>Nombre</div>
      <div><b>${esc(x.carrera || '—')}</b>Carrera${x.modalidad ? ' · ' + esc(x.modalidad) : ''}</div>
      <div><b>${esc(rg)}</b>Rango de la semana (${mil(x.xp_semana)} XP)</div>
      <div><b>${mil(x.xp_total)} XP</b>En total</div>
      <div><b>${rspFecha(x.alta) || '—'}</b>Se registró</div>
    </div>
    <label class="fld">Así se verá en el inicio</label>
    <div class="rsp-prev rs rs-juego">${window.MCResenas ? MCResenas.tarjeta(x, 'juego') : ''}</div>
    <div class="mfoot"><button type="button" class="btn-ghost" data-x>Cerrar</button></div></div>`;
  document.body.appendChild(o); document.body.classList.add('modal-open');
  const cerrar = () => { o.remove(); document.body.classList.remove('modal-open'); };
  o.querySelector('.mx').addEventListener('click', cerrar); o.querySelector('[data-x]').addEventListener('click', cerrar);
  o.addEventListener('click', e => { if (e.target === o) cerrar(); });
}

$('rspChips').addEventListener('click', ev => { const b = ev.target.closest('[data-v]'); if (b) { RSP.ver = b.dataset.v; pintarResenas(); } });
$('rspList').addEventListener('click', ev => {
  const card = ev.target.closest('[data-id]'); if (!card) return;
  const id = +card.dataset.id;
  const v = ev.target.closest('[data-rsp-ver]'); if (v) { rspVerAlumno(id); return; }
  const a = ev.target.closest('[data-acc]'); if (a) { rspAccion(id, a.dataset.acc, a); return; }
  const m = ev.target.closest('[data-mover]'); if (m) rspMover(id, +m.dataset.mover);
});
$('rspRecargar').addEventListener('click', () => cargarResenas());

// Al entrar al panel: cuántas hay por revisar (para el número junto a «Reseñas»)
if (window.MCAuth) MCAuth.listo.then(c => {
  let hecho = false;
  const contar = u => {
    if (!u || hecho) return; hecho = true;
    c.rpc('resenas_admin').then(r => { if (!r.error && r.data) { RSP.cuenta = r.data.cuenta || {}; rspBadge(); } }, () => {});
  };
  contar(MCAuth.usuario()); MCAuth.alCambiar(contar);
}, () => {});
