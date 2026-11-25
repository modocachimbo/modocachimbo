/* =========================================================
   Panel · Recargas Yape
   Los alumnos yapean, suben su captura y escriben el código de seguridad
   (tienda.html). MacroDroid, en el celular de Javier, manda cada aviso
   «Te yapearon» y si calzan monto + código los diamantes caen solos.
   Lo que no calza en 10 minutos queda «En revisión» y llega notificación.
   Aquí: Aprobar / Rechazar, ver la captura, ver los avisos que llegaron,
   prender o apagar lo automático y la clave para MacroDroid.
   Datos: supabase/141-yape-recargas.sql (yape_admin, yape_resolver, yape_config).
   ========================================================= */
const YP = { d: null, ver: 'revision', ocupado: false, urls: {} };
const YP_URL_AVISO = 'https://tvcrhogybfxphpzpjnis.supabase.co/rest/v1/rpc/yape_aviso';
const YP_LLAVE = 'sb_publishable_clm6obUTs_391NA7FGG1YA_-eNuj7dU';

(function estilosYape() {
  const st = document.createElement('style');
  st.textContent = `
  .yp-aj { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; margin-bottom: 18px; }
  .yp-aj .rcard { display: grid; gap: 8px; align-content: start; }
  .yp-aj h3 { margin: 0; font: 900 15px Nunito, sans-serif; }
  .yp-aj p { margin: 0; color: var(--text-dim); font-size: 13px; line-height: 1.45; }
  .yp-md { display: flex; align-items: center; gap: 10px; font: 900 14px Nunito, sans-serif; }
  .yp-md i { width: 12px; height: 12px; border-radius: 50%; background: #FF6E6E; box-shadow: 0 0 0 4px rgba(255,110,110,.15); flex: none; }
  .yp-md.ok i { background: #58CC02; box-shadow: 0 0 0 4px rgba(88,204,2,.18); }
  .yp-clave { display: flex; gap: 8px; align-items: center; }
  .yp-clave button { flex: none; }
  .yp-clave code { display: block; flex: 1; min-width: 0; word-break: break-all; padding: 9px 11px; border-radius: 10px; background: #120e22; border: 1px solid #2A2346; font-size: 12.5px; color: var(--text); }
  .yp-sw { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .yp-sw button { width: 52px; height: 30px; border-radius: 99px; border: 0; background: #3a3260; position: relative; cursor: pointer; flex: none; }
  .yp-sw button::after { content: ''; position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 50%; background: #fff; transition: left .15s; }
  .yp-sw button.on { background: #58CC02; }
  .yp-sw button.on::after { left: 25px; }
  .yp-card { display: grid; grid-template-columns: 84px 1fr; gap: 14px; }
  .yp-cap { width: 84px; height: 140px; border-radius: 12px; background: #120e22 center/cover; border: 1px solid #2A2346; cursor: zoom-in; display: grid; place-items: center; color: var(--text-faint); font-size: 11px; text-align: center; }
  .yp-info { display: grid; gap: 8px; min-width: 0; }
  .yp-l1 { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .yp-monto { font: 900 22px Nunito, sans-serif; }
  .yp-monto small { font-size: 13px; color: var(--text-dim); font-weight: 800; }
  .yp-tag { font: 900 11px Nunito, sans-serif; text-transform: uppercase; letter-spacing: .5px; border-radius: 100px; padding: 3px 9px; border: 1px solid; }
  .yp-tag.revision, .yp-tag.esperando { color: #FFC800; border-color: rgba(255,200,0,.4); }
  .yp-tag.aprobada { color: #58CC02; border-color: rgba(88,204,2,.45); }
  .yp-tag.rechazada { color: #FF6E6E; border-color: rgba(255,110,110,.45); }
  .yp-hora { margin-left: auto; font-size: 12px; color: var(--text-faint); }
  .yp-al { font-size: 13.5px; color: var(--text-dim); overflow-wrap: anywhere; }
  .yp-al b { color: var(--text); }
  .yp-cod { display: inline-flex; gap: 3px; vertical-align: middle; }
  .yp-cod span { display: inline-grid; place-items: center; width: 24px; height: 26px; border-radius: 6px; background: #2A2346; font: 900 14px Nunito, sans-serif; color: var(--text); }
  .yp-avtx { font-size: 12.5px; color: var(--text-dim); padding: 8px 10px; border-radius: 10px; background: #120e22; border: 1px solid #2A2346; overflow-wrap: anywhere; }
  .yp-acc { display: flex; gap: 8px; flex-wrap: wrap; }
  .yp-acc .rech { color: #FF6E6E; }
  .yp-av { display: flex; gap: 12px; align-items: center; }
  .yp-av .yp-avtx { flex: 1; }
  .yp-ver { position: fixed; inset: 0; z-index: 200; background: rgba(5,4,12,.9); display: grid; place-items: center; padding: 16px; cursor: zoom-out; }
  .yp-ver img { max-width: 100%; max-height: 100%; border-radius: 12px; }
  @media (max-width: 560px) { .yp-card { grid-template-columns: 64px 1fr; } .yp-cap { width: 64px; height: 108px; } .yp-hora { margin-left: 0; width: 100%; } }`;
  document.head.appendChild(st);
})();

const ypHora = f => {
  if (!f) return '';
  const ms = Date.now() - new Date(f);
  if (ms < 60e3) return 'hace un momento';
  if (ms < 3600e3) return 'hace ' + Math.round(ms / 60e3) + ' min';
  if (ms < 86400e3) return 'hace ' + Math.round(ms / 3600e3) + ' h';
  return new Date(f).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};
const ypSol = m => 'S/ ' + (+m || 0).toLocaleString('es-PE', { maximumFractionDigits: 2 });
const ypEst = { esperando: 'Verificando', revision: 'En revisión', aprobada: 'Aprobada', rechazada: 'Rechazada' };

function ypBadge() {
  const n = (YP.d && YP.d.cuenta && YP.d.cuenta.revision) || 0, b = $('badgeYape');
  if (b) { b.hidden = !n; b.textContent = n; }
}

async function cargarYape() {
  const caja = $('ypList');
  caja.innerHTML = '<div class="loader">Cargando…</div>';
  let c;
  try { c = await MCAuth.listo; }
  catch (e) { caja.innerHTML = '<div class="state-msg error">No se pudo conectar con Supabase. Revisa tu internet.</div>'; return; }
  const r = await c.rpc('yape_admin');
  if (r.error) {
    caja.innerHTML = /no autorizado/i.test(r.error.message || '')
      ? '<div class="state-msg error">Solo el administrador puede ver las recargas.</div>'
      : `<div class="state-msg error">${esc(r.error.message || 'No se pudo cargar.')}<br>¿Ya corriste el archivo supabase/141-yape-recargas.sql?</div>`;
    $('ypAjustes').innerHTML = '';
    return;
  }
  YP.d = r.data || {};
  ypBadge();
  pintarYape();
}

function pintarYape() {
  const D = YP.d, A = D.ajustes || {}, C = D.cuenta || {};
  const vivo = A.ultimo && Date.now() - new Date(A.ultimo) < 3 * 86400e3;
  $('ypAjustes').innerHTML = `
    <div class="rcard">
      <div class="yp-sw"><h3>Recarga automática</h3><button type="button" class="${A.auto ? 'on' : ''}" id="ypAuto" aria-label="Recarga automática"></button></div>
      <p>${A.auto ? 'Encendida: si el aviso de Yape calza (monto + código), los diamantes caen solos. Si no aparece en ' + (A.espera || 10) + ' minutos, queda en revisión y te llega una notificación.' : 'Apagada: todas las recargas te llegan a revisión.'}</p>
    </div>
    <div class="rcard">
      <h3>MacroDroid (tu celular)</h3>
      <div class="yp-md${vivo ? ' ok' : ''}"><i></i>${A.ultimo ? 'Último aviso de Yape: ' + ypHora(A.ultimo) : 'Aún no llegó ningún aviso de Yape'}</div>
      <p>Datos para la acción «Petición HTTP» de MacroDroid:</p>
      <div class="yp-clave"><code>${esc(YP_URL_AVISO)}</code><button class="btn-ghost" type="button" data-copiar="${esc(YP_URL_AVISO)}">Copiar</button></div>
      <div class="yp-clave"><code>apikey: ${esc(YP_LLAVE)}</code><button class="btn-ghost" type="button" data-copiar="${esc(YP_LLAVE)}">Copiar</button></div>
      <div class="yp-clave"><code>{"p_secreto":"${esc(A.secreto || '')}","p_texto":"[notification_title] [notification]"}</code><button class="btn-ghost" type="button" data-copiar='${esc(JSON.stringify({ p_secreto: A.secreto || '', p_texto: '[notification_title] [notification]' }))}'>Copiar</button></div>
      <button class="btn-ghost" type="button" id="ypClave" style="justify-self:start">Cambiar clave secreta</button>
    </div>`;
  const chip = (v, nom, n) => `<button class="chip${YP.ver === v ? ' on' : ''}" data-v="${v}" type="button">${nom} <span class="c">${n}</span></button>`;
  const L = D.recargas || [];
  $('ypChips').innerHTML = chip('revision', 'En revisión', C.revision || 0) + chip('todas', 'Todas', L.length) + chip('avisos', 'Avisos de Yape', (D.avisos || []).length);
  $('ypStats').textContent = `${C.revision || 0} en revisión · ${C.esperando || 0} verificándose ahora.`;
  const caja = $('ypList');
  if (YP.ver === 'avisos') {
    const V = D.avisos || [];
    caja.innerHTML = V.length ? V.map(v => `<div class="rcard yp-av"><div class="yp-avtx">${esc(v.texto)}</div>
      <div style="text-align:right;flex:none"><b>${v.monto != null ? ypSol(v.monto) : '¿monto?'}</b> · ${v.codigo ? 'código ' + esc(v.codigo) : 'sin código'}<br><small style="color:var(--text-faint)">${ypHora(v.recibido)} · ${v.recarga ? 'usado en #' + v.recarga : 'libre'}</small></div></div>`).join('')
      : '<div class="state-msg">Aún no llegó ningún aviso de Yape. Revisa que MacroDroid esté configurado.</div>';
    return;
  }
  const F = YP.ver === 'revision' ? L.filter(x => x.estado === 'revision') : L;
  if (!F.length) { caja.innerHTML = `<div class="state-msg">${YP.ver === 'revision' ? 'No hay recargas por revisar.' : 'Aún no hay recargas.'}</div>`; return; }
  caja.innerHTML = F.map(x => `<div class="rcard yp-card" data-id="${x.id}">
      <div class="yp-cap" data-cap="${esc(x.captura || '')}">${x.captura ? 'Cargando…' : 'Sin captura'}</div>
      <div class="yp-info">
        <div class="yp-l1"><span class="yp-monto">${ypSol(x.monto)} <small>→ ${(+x.diamantes).toLocaleString('es-PE')} diamantes</small></span>
          <span class="yp-tag ${x.estado}">${ypEst[x.estado] || x.estado}${x.como === 'auto' ? ' · solo' : x.como === 'admin' ? ' · por ti' : ''}</span>
          <span class="yp-hora">#${x.id} · ${ypHora(x.creado)}</span></div>
        <div class="yp-al"><b>${esc(x.apodo || 'Sin apodo')}</b>${x.jid ? ' · ID ' + x.jid : ''} · ${esc(x.email || '')}</div>
        <div class="yp-al">Código de seguridad: <span class="yp-cod">${String(x.codigo || '').split('').map(d => '<span>' + esc(d) + '</span>').join('')}</span></div>
        ${x.aviso ? `<div class="yp-avtx">Aviso de Yape: ${esc(x.aviso)}</div>` : ''}
        ${x.nota ? `<div class="yp-al">Nota: ${esc(x.nota)}</div>` : ''}
        ${x.estado !== 'aprobada' ? `<div class="yp-acc">
          <button class="btn-main" type="button" data-yp="aprobar">Sí me llegó · Aprobar</button>
          ${x.estado !== 'rechazada' ? '<button class="btn-ghost rech" type="button" data-yp="rechazar">No me llegó · Rechazar</button>' : ''}
        </div>` : ''}
      </div>
    </div>`).join('');
  ypCapturas();
}

// Las capturas son privadas: se piden con un enlace temporal (1 hora)
async function ypCapturas() {
  const cajas = [...document.querySelectorAll('#ypList [data-cap]')].filter(x => x.dataset.cap);
  if (!cajas.length) return;
  const c = await MCAuth.listo;
  const faltan = [...new Set(cajas.map(x => x.dataset.cap).filter(p => !YP.urls[p]))];
  if (faltan.length) {
    const r = await c.storage.from('yape').createSignedUrls(faltan, 3600);
    (r.data || []).forEach(x => { if (x.signedUrl) YP.urls[x.path] = x.signedUrl; });
  }
  cajas.forEach(x => {
    const u = YP.urls[x.dataset.cap];
    if (u) { x.style.backgroundImage = `url('${u}')`; x.textContent = ''; } else x.textContent = 'No se encontró';
  });
}

async function ypResolver(id, aprobar, btn) {
  if (YP.ocupado) return;
  if (!aprobar && btn.dataset.seguro !== '1') { btn.dataset.seguro = '1'; btn.textContent = '¿Seguro? Toca otra vez'; return; }
  YP.ocupado = true; btn.disabled = true;
  try {
    const c = await MCAuth.listo;
    const r = await c.rpc('yape_resolver', { p_id: id, p_aprobar: aprobar, p_nota: null });
    if (r.error) throw r.error;
    toast(aprobar ? 'Aprobada: los diamantes ya están en su cuenta' : 'Recarga rechazada');
    YP.ocupado = false;
    await cargarYape();
  } catch (e) {
    YP.ocupado = false; btn.disabled = false;
    toast(e.message || 'No se pudo.', true);
  }
}

async function ypConfig(p) {
  try {
    const c = await MCAuth.listo;
    const r = await c.rpc('yape_config', { p });
    if (r.error) throw r.error;
    YP.d = r.data || YP.d; pintarYape();
  } catch (e) { toast(e.message || 'No se pudo guardar.', true); }
}

document.addEventListener('click', e => {
  if (!e.target.closest('#tab-yape') && !e.target.closest('.yp-ver')) return;
  const v = e.target.closest('.yp-ver'); if (v) { v.remove(); return; }
  const ch = e.target.closest('#ypChips .chip'); if (ch) { YP.ver = ch.dataset.v; pintarYape(); return; }
  const b = e.target.closest('[data-yp]');
  if (b) { ypResolver(+b.closest('[data-id]').dataset.id, b.dataset.yp === 'aprobar', b); return; }
  const cap = e.target.closest('.yp-cap');
  if (cap && YP.urls[cap.dataset.cap]) { const o = document.createElement('div'); o.className = 'yp-ver'; o.innerHTML = `<img src="${YP.urls[cap.dataset.cap]}" alt="Captura del Yape">`; document.body.appendChild(o); return; }
  const cp = e.target.closest('[data-copiar]');
  if (cp) { navigator.clipboard.writeText(cp.dataset.copiar).then(() => toast('Copiado'), () => toast('No se pudo copiar', true)); return; }
  if (e.target.closest('#ypAuto')) { ypConfig({ auto: !(YP.d.ajustes || {}).auto }); return; }
  const cl = e.target.closest('#ypClave');
  if (cl) {
    if (cl.dataset.seguro !== '1') { cl.dataset.seguro = '1'; cl.textContent = 'Tendrás que cambiarla en MacroDroid. ¿Seguro?'; return; }
    ypConfig({ nueva_clave: true }); return;
  }
  if (e.target.closest('#ypRecargar')) cargarYape();
});

// Número rojo en el menú apenas entras al panel (y cada 2 minutos)
(function ypContar() {
  async function contar() {
    try {
      if (!window.MCAuth || !MCAuth.usuario()) return;
      const c = await MCAuth.listo;
      const r = await c.rpc('yape_admin');
      if (!r.error) { YP.d = r.data; ypBadge(); }
    } catch (e) {}
  }
  document.addEventListener('DOMContentLoaded', () => { setTimeout(contar, 2500); setInterval(contar, 120e3); });
})();
