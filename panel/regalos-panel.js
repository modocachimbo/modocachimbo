/* =========================================================
   Panel · Regalos
   Un admin o un ayudante con el permiso «Regalos» le da a un alumno,
   por su ID de 5 dígitos (el de su tarjeta de jugador):
   - Corazones extra: se suman a sus 5, no se pierden a medianoche.
   - Corazones infinitos por un tiempo.
   - XP: sube su nivel y su saldo para canjear (no cuenta en el Top de la semana).
   - Un ítem de Mi colección subido en Recursos.
   El alumno ve un aviso con la nota la próxima vez que entra.
   Datos: supabase/43-ayudantes-regalos.sql (regalo_buscar, regalar).
   ========================================================= */
const RG = { alumno: null, tipo: 'corazones', cant: 3, item: '', items: null, enviando: false };
const RG_TIPOS = {
  corazones: { nom: 'Corazones', c: '#FF4B4B', ops: [[1, '+1'], [3, '+3'], [5, '+5'], [10, '+10']], min: 1, max: 50, uni: 'corazones' },
  infinito: { nom: 'Infinitos', c: '#CE82FF', ops: [[1, '1 hora'], [24, '1 día'], [72, '3 días'], [168, '7 días'], [720, '30 días']] },
  xp: { nom: 'XP', c: '#FFC800', ops: [[100, '+100'], [250, '+250'], [500, '+500'], [1000, '+1000']], min: 1, max: 10000, uni: 'XP' },
  item: { nom: 'Ítem de colección', c: '#1CB0F6' }
};
const RG_ESP = { racha: 'Fondo', avatar: 'Foto de perfil', pines: 'Pin', marco: 'Marco', cuadro: 'Cuadro de racha', titulo: 'Título', buho: 'Búho' };

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
  .rg-tipos { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
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
  @media (max-width: 560px) { .rg-tipos { grid-template-columns: 1fr 1fr; } }`;
  document.head.appendChild(st);
})();

const RG_IC = {
  corazones: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.7 1.1 5.2 3 1.5-1.9 3.1-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z"/></svg>',
  infinito: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 12c-2-2.7-3.6-4-5.5-4a4 4 0 0 0 0 8c1.9 0 3.5-1.3 5.5-4zm0 0c2 2.7 3.6 4 5.5 4a4 4 0 0 0 0-8c-1.9 0-3.5 1.3-5.5 4z"/></svg>',
  xp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
  item: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zm0 0h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>'
};

function rgHoras(h) { return h % 24 === 0 ? (h / 24) + (h === 24 ? ' día' : ' días') : h + (h === 1 ? ' hora' : ' horas'); }
function rgFecha(s) { return new Date(s).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
function rgTexto(x) {
  if (x.tipo === 'corazones') return '+' + x.cantidad + (x.cantidad === 1 ? ' corazón' : ' corazones');
  if (x.tipo === 'infinito') return 'Corazones infinitos por ' + rgHoras(x.cantidad);
  if (x.tipo === 'xp') return '+' + (+x.cantidad).toLocaleString('es-PE') + ' XP';
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
  if (m) { $('rgId').value = m[1]; history.replaceState(null, '', location.pathname + location.search); rgBuscar(); }
}

function pintarRegalos() {
  const a = RG.alumno;
  $('rgCuerpo').innerHTML = `
    <div class="agp-form">
      <h3>¿A quién?</h3>
      <p class="hint">Escribe el ID de 5 dígitos del alumno. Lo ve en su tarjeta de jugador y también sale en la pestaña Alumnos.</p>
      <div class="rg-buscar">
        <div><label for="rgId">ID del alumno</label><input class="inp" id="rgId" inputmode="numeric" maxlength="5" placeholder="12345" autocomplete="off" value="${a ? a.codigo : ''}"></div>
        <button class="btn-main" type="button" id="rgBuscar">Buscar</button>
      </div>
      <div id="rgAl">${a ? rgAlumnoHtml(a) : ''}</div>
    </div>
    <div class="agp-form" id="rgForm"${a ? '' : ' hidden'}>
      <h3>¿Qué le regalas?</h3>
      <div class="rg-tipos">${Object.entries(RG_TIPOS).map(([k, t]) => `<button class="rg-tipo${RG.tipo === k ? ' on' : ''}" type="button" data-rgt="${k}" style="--c:${t.c}">${RG_IC[k]}${t.nom}</button>`).join('')}</div>
      <div id="rgOpc"></div>
      <label for="rgNota">Nota para el alumno (opcional)</label>
      <input class="inp" id="rgNota" maxlength="140" placeholder="¡Bien hecho en el simulacro!">
      <p class="hint">Le sale en el aviso del regalo la próxima vez que entra a la web.</p>
      <div class="agp-acc"><button class="btn-main" type="button" id="rgDar">Regalar</button><span class="rg-resumen" id="rgRes"></span></div>
    </div>
    ${a && a.historial && a.historial.length ? `<div class="agp-form"><h3>Regalos que recibió</h3>${a.historial.map(x => `<div class="rg-h" style="--c:${RG_TIPOS[x.tipo].c}"><i></i><div><b>${esc(rgTexto(x))}</b>${x.nota ? ' · «' + esc(x.nota) + '»' : ''}<br><small>${esc(x.de || 'Admin')} · ${rgFecha(x.creado)}</small></div></div>`).join('')}</div>` : ''}`;
  $('rgId').addEventListener('keydown', e => { if (e.key === 'Enter') rgBuscar(); });
  $('rgId').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 5); });
  $('rgBuscar').addEventListener('click', rgBuscar);
  document.querySelectorAll('[data-rgt]').forEach(b => b.addEventListener('click', () => {
    RG.tipo = b.dataset.rgt;
    const o = RG_TIPOS[RG.tipo].ops; RG.cant = o ? o[1][0] : 0;
    document.querySelectorAll('[data-rgt]').forEach(x => x.classList.toggle('on', x === b));
    rgOpciones();
  }));
  $('rgDar').addEventListener('click', rgDar);
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
      </div>
    </div></div>`;
}

function rgOpciones() {
  const t = RG_TIPOS[RG.tipo], caja = $('rgOpc');
  if (RG.tipo === 'item') {
    const lista = RG.items.filter(i => i.visible !== false || (i.regla || {}).tipo === 'regalo');
    caja.innerHTML = `<label>Elige el ítem</label>${lista.length ? `<div class="rg-items">${lista.map(i => `<button class="rg-it${RG.item === i.id ? ' on' : ''}" type="button" data-rgi="${esc(i.id)}"><i${i.img ? ` style="background-image:url('${esc(i.img)}')"` : ''}></i><b>${esc(i.nom)}</b><small>${esc(RG_ESP[i.espacio] || i.espacio)}${(i.regla || {}).tipo === 'regalo' ? ' · solo regalo' : ''}</small></button>`).join('')}</div>`
      : '<p class="hint">Aún no hay ítems subidos en Recursos.</p>'}`;
    caja.querySelectorAll('[data-rgi]').forEach(b => b.addEventListener('click', () => { RG.item = b.dataset.rgi; caja.querySelectorAll('[data-rgi]').forEach(x => x.classList.toggle('on', x === b)); rgResumen(); }));
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
  const a = RG.alumno, t = RG_TIPOS[RG.tipo];
  let ok = !!a, txt = '';
  if (RG.tipo === 'item') { ok = ok && !!RG.item; txt = RG.item ? rgTexto({ tipo: 'item', item: RG.item }) : 'Elige un ítem'; }
  else if (t.max && !(RG.cant >= t.min && RG.cant <= t.max)) { ok = false; txt = 'Elige de ' + t.min + ' a ' + t.max.toLocaleString('es-PE') + ' ' + t.uni; }
  else txt = rgTexto({ tipo: RG.tipo, cantidad: RG.cant });
  $('rgDar').disabled = !ok || RG.enviando;
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
  RG.alumno = r.data; RG.item = '';
  pintarRegalos();
}

async function rgDar() {
  const a = RG.alumno;
  if (!a || RG.enviando) return;
  RG.enviando = true; rgResumen();
  const btn = $('rgDar'); btn.textContent = 'Regalando…';
  const c = await MCAuth.listo;
  const r = await c.rpc('regalar', { p_codigo: a.codigo, p_tipo: RG.tipo, p_cantidad: RG.tipo === 'item' ? null : RG.cant, p_item: RG.tipo === 'item' ? RG.item : null, p_nota: $('rgNota').value.trim() || null });
  RG.enviando = false;
  if (r.error) { btn.textContent = 'Regalar'; rgResumen(); toast(r.error.message || 'No se pudo regalar'); return; }
  toast('🎁 ' + rgTexto({ tipo: RG.tipo, cantidad: RG.cant, item: RG.item }) + ' para ' + (a.apodo || 'ID ' + a.codigo));
  RG.alumno = r.data; RG.item = '';
  pintarRegalos();
}
