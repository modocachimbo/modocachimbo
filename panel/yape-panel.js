/* =========================================================
   Panel · Recargas Yape
   Los alumnos yapean, suben su captura y escriben el código de seguridad
   (tienda.html). Montos bajos: se aprueban solos (WhatsApp con «No me
   llegó»). Montos altos o raros: «En revisión» + WhatsApp con Aprobar /
   Rechazar (yape.html) + notificación. MacroDroid es opcional.
   SQL: 141-yape-recargas.sql y 142-yape-semiauto.sql.
   Aquí: Aprobar / Rechazar, ver la captura, ver los avisos que llegaron,
   prender o apagar lo automático y la clave para MacroDroid.
   Datos: supabase/141-yape-recargas.sql (yape_admin, yape_resolver, yape_config).
   Pestaña «Códigos de diamantes»: supabase/144-diamantes-codigos.sql.
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
  .yp-num { display: grid; gap: 8px; }
  .yp-num label { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-dim); }
  .yp-num span { margin-left: auto; color: var(--text); font-weight: 900; }
  .yp-num input, .yp-in { width: 80px; padding: 8px 10px; border-radius: 10px; border: 1px solid #2A2346; background: #120e22; color: var(--text); font: 800 14px Nunito, sans-serif; }
  .yp-in { flex: 1; width: 100%; min-width: 0; }
  .yp-aj > * { min-width: 0; }
  .yp-sub { display: grid; gap: 8px; }
  .yp-sub summary { cursor: pointer; font-size: 13px; color: var(--text-dim); font-weight: 800; }
  .yp-mdro summary { cursor: pointer; list-style: none; }
  .yp-mdro summary::-webkit-details-marker { display: none; }
  .yp-mdro summary::after { content: ' +'; color: var(--text-dim); font-weight: 900; }
  .yp-mdro[open] { display: grid; gap: 8px; grid-column: 1 / -1; }
  .yp-sw { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .yp-sw button { width: 52px; height: 30px; border-radius: 99px; border: 0; background: #3a3260; position: relative; cursor: pointer; flex: none; }
  .yp-sw button::after { content: ''; position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 50%; background: #fff; transition: left .15s; }
  .yp-sw button.on { background: #58CC02; }
  .yp-sw button.on::after { left: 25px; }
  .yp-cform { display: grid; gap: 10px; margin-bottom: 4px; }
  .yp-cform h3 { margin: 0; font: 900 15px Nunito, sans-serif; }
  .yp-cform p { margin: 0; color: var(--text-dim); font-size: 13px; }
  .yp-cfila { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 10px; }
  .yp-cfila label { display: grid; gap: 4px; font-size: 12px; color: var(--text-dim); font-weight: 800; }
  .yp-cfila select { padding: 8px 10px; border-radius: 10px; border: 1px solid #2A2346; background: #120e22; color: var(--text); font: 800 14px Nunito, sans-serif; }
  .rcard.yp-dc { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; width: 100%; box-sizing: border-box; }
  .yp-usado { flex: none; font: 900 11px Nunito, sans-serif; text-transform: uppercase; letter-spacing: .5px; padding: 4px 11px; border-radius: 99px; color: #58CC02; border: 1px solid rgba(88,204,2,.45); }
  .yp-dc code { font: 900 16px ui-monospace, Menlo, monospace; letter-spacing: 1px; padding: 8px 12px; border-radius: 10px; background: #120e22; border: 1px solid #2A2346; color: #D4F000; }
  .yp-dc.usado code { color: var(--text-faint); text-decoration: line-through; }
  .yp-dc.nuevo { border-color: #D4F000; }
  .yp-ctx { flex: 1; min-width: 160px; font-size: 13.5px; }
  .yp-ctx small { color: var(--text-faint); }
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
      <div class="yp-sw"><h3>Aprobar solas las recargas bajas</h3><button type="button" class="${A.auto ? 'on' : ''}" id="ypAuto" aria-label="Aprobar solas las recargas bajas"></button></div>
      <p>${A.auto ? 'Encendido: hasta el monto de abajo se aprueban al instante y te llega un WhatsApp con «No me llegó» por si acaso. Lo más alto o raro va a revisión.' : 'Apagado: todas las recargas te llegan a revisión.'}</p>
      <div class="yp-num"><label>Aprobar solas hasta <span>S/</span><input id="ypTope" type="number" min="0" max="100" step="1" value="${+A.tope || 0}"></label>
        <label>Máximo por alumno al día <span>S/</span><input id="ypTopeDia" type="number" min="0" max="500" step="1" value="${+A.tope_dia || 0}"></label></div>
      <button class="btn-ghost" type="button" id="ypGuardarTope" style="justify-self:start">Guardar montos</button>
    </div>
    <div class="rcard">
      <h3>Avisos a tu celular</h3>
      <div class="yp-md${A.tg || A.wsp ? ' ok' : ''}"><i></i>${A.tg ? 'Telegram conectado' : 'Telegram sin conectar'}${A.wsp ? ' · WhatsApp activo' : ''}</div>
      <p>Te llega un mensaje con enlaces para <b>Aprobar</b>, <b>Rechazar</b> o <b>Quitar</b>.</p>
      <div class="yp-clave"><input id="ypTgToken" class="yp-in" placeholder="${A.tg ? 'Bot guardado · pega otro token para cambiar' : 'Token de tu bot (te lo da @BotFather)'}" aria-label="Token del bot de Telegram"><button class="btn-main" type="button" id="ypTgConectar">Conectar</button></div>
      <button class="btn-ghost" type="button" id="ypWspProbar" style="justify-self:start"${A.tg || A.wsp ? '' : ' disabled'}>Mandarme un mensaje de prueba</button>
      <details class="yp-sub"><summary>WhatsApp (CallMeBot, cuando abra cupos)</summary>
        <div class="yp-clave"><input id="ypWspTel" class="yp-in" value="${esc(A.wsp_tel || '')}" placeholder="+51928030708" aria-label="Tu número de WhatsApp"></div>
        <div class="yp-clave"><input id="ypWspKey" class="yp-in" placeholder="${A.wsp ? 'Clave guardada · pega otra para cambiar' : 'Clave (apikey) de CallMeBot'}" aria-label="Clave de CallMeBot"><button class="btn-ghost" type="button" id="ypWspGuardar">Guardar</button></div>
      </details>
    </div>
    <details class="rcard yp-mdro">
      <summary><h3 style="display:inline">MacroDroid (opcional, solo Android)</h3></summary>
      <div class="yp-md${vivo ? ' ok' : ''}"><i></i>${A.ultimo ? 'Último aviso de Yape: ' + ypHora(A.ultimo) : 'Aún no llegó ningún aviso de Yape'}</div>
      <p>Si tu Yape está en un Android, MacroDroid puede mandar cada «Te yapearon» y así se aprueban solos hasta los montos altos. Datos para la acción «Petición HTTP»:</p>
      <div class="yp-clave"><code>${esc(YP_URL_AVISO)}</code><button class="btn-ghost" type="button" data-copiar="${esc(YP_URL_AVISO)}">Copiar</button></div>
      <div class="yp-clave"><code>apikey: ${esc(YP_LLAVE)}</code><button class="btn-ghost" type="button" data-copiar="${esc(YP_LLAVE)}">Copiar</button></div>
      <div class="yp-clave"><code>{"p_secreto":"${esc(A.secreto || '')}","p_texto":"[notification_title] [notification]"}</code><button class="btn-ghost" type="button" data-copiar='${esc(JSON.stringify({ p_secreto: A.secreto || '', p_texto: '[notification_title] [notification]' }))}'>Copiar</button></div>
      <button class="btn-ghost" type="button" id="ypClave" style="justify-self:start">Cambiar clave secreta</button>
    </details>`;
  const chip = (v, nom, n) => `<button class="chip${YP.ver === v ? ' on' : ''}" data-v="${v}" type="button">${nom} <span class="c">${n}</span></button>`;
  const L = D.recargas || [];
  $('ypChips').innerHTML = chip('revision', 'En revisión', C.revision || 0) + chip('solas', 'Aprobadas solas', C.solas || 0) + chip('todas', 'Todas', L.length) + chip('avisos', 'Avisos de Yape', (D.avisos || []).length) + chip('codigos', 'Códigos de diamantes', YP.cods ? YP.cods.filter(x => !x.usado).length : '·');
  $('ypStats').textContent = `${C.revision || 0} en revisión · ${C.esperando || 0} verificándose ahora.`;
  const caja = $('ypList');
  if (YP.ver === 'codigos') { ypCodigos(); return; }
  if (YP.ver === 'avisos') {
    const V = D.avisos || [];
    caja.innerHTML = V.length ? V.map(v => `<div class="rcard yp-av"><div class="yp-avtx">${esc(v.texto)}</div>
      <div style="text-align:right;flex:none"><b>${v.monto != null ? ypSol(v.monto) : '¿monto?'}</b> · ${v.codigo ? 'código ' + esc(v.codigo) : 'sin código'}<br><small style="color:var(--text-faint)">${ypHora(v.recibido)} · ${v.recarga ? 'usado en #' + v.recarga : 'libre'}</small></div></div>`).join('')
      : '<div class="state-msg">Aún no llegó ningún aviso de Yape. Revisa que MacroDroid esté configurado.</div>';
    return;
  }
  const F = YP.ver === 'revision' ? L.filter(x => x.estado === 'revision') : YP.ver === 'solas' ? L.filter(x => x.como === 'confianza' && x.estado === 'aprobada') : L;
  if (!F.length) { caja.innerHTML = `<div class="state-msg">${YP.ver === 'revision' ? 'No hay recargas por revisar.' : YP.ver === 'solas' ? 'No hay recargas aprobadas solas esta semana.' : 'Aún no hay recargas.'}</div>`; return; }
  caja.innerHTML = F.map(x => `<div class="rcard yp-card" data-id="${x.id}">
      <div class="yp-cap" data-cap="${esc(x.captura || '')}">${x.captura ? 'Cargando…' : 'Sin captura'}</div>
      <div class="yp-info">
        <div class="yp-l1"><span class="yp-monto">${ypSol(x.monto)} <small>→ ${(+x.diamantes).toLocaleString('es-PE')} diamantes</small></span>
          <span class="yp-tag ${x.estado}">${ypEst[x.estado] || x.estado}${x.como === 'auto' ? ' · verificada' : x.como === 'confianza' ? ' · sola' : x.como === 'admin' ? ' · por ti' : ''}</span>
          <span class="yp-hora">#${x.id} · ${ypHora(x.creado)}</span></div>
        <div class="yp-al"><b>${esc(x.apodo || 'Sin apodo')}</b>${x.jid ? ' · ID ' + x.jid : ''} · ${esc(x.email || '')}</div>
        <div class="yp-al">Código de seguridad: <span class="yp-cod">${String(x.codigo || '').split('').map(d => '<span>' + esc(d) + '</span>').join('')}</span></div>
        ${x.aviso ? `<div class="yp-avtx">Aviso de Yape: ${esc(x.aviso)}</div>` : ''}
        ${x.motivo && x.estado === 'revision' ? `<div class="yp-al">Por qué: <b>${esc(x.motivo)}</b></div>` : ''}
        ${x.nota ? `<div class="yp-al">Nota: ${esc(x.nota)}</div>` : ''}
        ${x.estado === 'aprobada' && x.como === 'confianza' ? '<div class="yp-acc"><button class="btn-ghost rech" type="button" data-yp="quitar">No me llegó · Quitar diamantes</button></div>' : ''}
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
    toast(aprobar ? 'Aprobada: los diamantes ya están en su cuenta' : btn.dataset.yp === 'quitar' ? 'Se quitaron los diamantes' : 'Recarga rechazada');
    YP.ocupado = false;
    await cargarYape();
  } catch (e) {
    YP.ocupado = false; btn.disabled = false;
    toast(e.message || 'No se pudo.', true);
  }
}

// ---------- Códigos de diamantes (supabase/144-diamantes-codigos.sql) ----------
// Javier crea un código, se lo pasa al alumno por WhatsApp y el alumno lo canjea en la Tienda
// («Canjear código»). Funciona también dentro de la app de Play Store.
async function ypCodigos(nuevos) {
  const caja = $('ypList');
  if (!YP.cods) {
    caja.innerHTML = '<div class="loader">Cargando…</div>';
    try {
      const c = await MCAuth.listo; const r = await c.rpc('diamantes_codigos_admin');
      if (r.error) throw r.error;
      YP.cods = r.data || [];
    } catch (e) { caja.innerHTML = `<div class="state-msg error">${esc(e.message || 'No se pudo cargar.')}<br>¿Ya corriste el archivo supabase/144-diamantes-codigos.sql?</div>`; return; }
    if (YP.ver !== 'codigos') return;
    const ch = document.querySelector('#ypChips [data-v="codigos"] .c'); if (ch) ch.textContent = YP.cods.filter(x => !x.usado).length;
  }
  const N = new Set(nuevos || []);
  caja.innerHTML = `<div class="rcard yp-cform">
      <h3>Crear código</h3>
      <div class="yp-cfila">
        <label>Diamantes<select id="ypcDia">${[50, 110, 300, 650, 1050, 2000].map(n => `<option value="${n}"${n === 300 ? ' selected' : ''}>${n.toLocaleString('es-PE')}</option>`).join('')}<option value="otro">Otro…</option></select></label>
        <label id="ypcOtroL" hidden>Cantidad<input id="ypcOtro" type="number" min="1" max="100000" class="yp-in"></label>
        <label>Cuántos<input id="ypcCuantos" type="number" min="1" max="50" value="1" class="yp-in" style="width:70px"></label>
        <label style="flex:1;min-width:160px">Nota (opcional)<input id="ypcNota" class="yp-in" maxlength="80" placeholder="Ej.: Ana, Yape S/ 5"></label>
        <button class="btn-main" type="button" id="ypcCrear">Crear</button>
      </div>
      <p>El alumno lo escribe en <b>Tienda → Consigue diamantes → Canjear código</b>. Cada código sirve una sola vez.</p>
    </div>` +
    (YP.cods.length ? YP.cods.map(x => `<div class="rcard yp-dc${x.usado ? ' usado' : ''}${N.has(x.codigo) ? ' nuevo' : ''}">
      <code>${esc(x.codigo)}</code>
      <div class="yp-ctx"><b>${(+x.diamantes).toLocaleString('es-PE')} diamantes</b>${x.nota ? ' · ' + esc(x.nota) : ''}<br>
        <small>${x.usado ? 'Canjeado por ' + esc(x.apodo || 'un alumno') + (x.jid ? ' · ID ' + x.jid : '') + ' · ' + ypHora(x.usado) : 'Sin usar · creado ' + ypHora(x.creado)}</small></div>
      ${x.usado ? '<span class="yp-usado">Usado</span>' : `<button class="btn-ghost" type="button" data-ccopiar="${esc(x.codigo)}" data-cdia="${x.diamantes}">Copiar mensaje</button><button class="btn-ghost" type="button" data-cborrar="${esc(x.codigo)}" style="color:#ff8aa0">Borrar</button>`}
    </div>`).join('') : '<div class="state-msg">Aún no creaste códigos.</div>');
}
const ypcMensaje = (cod, n) => `Tu código de ${(+n).toLocaleString('es-PE')} diamantes: ${cod}\nCanjéalo en Modo Cachimbo: Tienda → Consigue diamantes → Canjear código.`;
async function ypcRpc(fn, args) {
  const c = await MCAuth.listo; const r = await c.rpc(fn, args);
  if (r.error) throw r.error; return r.data;
}
document.addEventListener('change', e => { if (e.target.id === 'ypcDia') $('ypcOtroL').hidden = e.target.value !== 'otro'; });
document.addEventListener('click', async e => {
  if (!e.target.closest('#tab-yape')) return;
  const cr = e.target.closest('#ypcCrear');
  if (cr) {
    const n = $('ypcDia').value === 'otro' ? +$('ypcOtro').value : +$('ypcDia').value;
    if (!(n >= 1)) { toast('Escribe cuántos diamantes', true); return; }
    cr.disabled = true;
    try {
      const l = await ypcRpc('diamantes_codigos_crear', { p_diamantes: n, p_cuantos: Math.max(1, Math.min(50, +$('ypcCuantos').value || 1)), p_nota: $('ypcNota').value.trim() || null });
      YP.cods = null; await ypCodigos(l);
      if (l && l.length === 1) navigator.clipboard.writeText(ypcMensaje(l[0], n)).then(() => toast('Código creado y mensaje copiado. Pégalo en WhatsApp.'), () => toast('Código creado'));
      else toast((l || []).length + ' códigos creados');
    } catch (er) { cr.disabled = false; toast(er.message || 'No se pudo crear.', true); }
    return;
  }
  const cp = e.target.closest('[data-ccopiar]');
  if (cp) { navigator.clipboard.writeText(ypcMensaje(cp.dataset.ccopiar, cp.dataset.cdia)).then(() => toast('Mensaje copiado. Pégalo en WhatsApp.'), () => toast('No se pudo copiar', true)); return; }
  const bo = e.target.closest('[data-cborrar]');
  if (bo) {
    if (bo.dataset.seguro !== '1') { bo.dataset.seguro = '1'; bo.textContent = '¿Seguro?'; return; }
    try { await ypcRpc('diamantes_codigos_borrar', { p_codigo: bo.dataset.cborrar }); YP.cods = null; ypCodigos(); toast('Código borrado'); }
    catch (er) { toast(er.message || 'No se pudo borrar.', true); }
  }
});

async function ypConfig(p) {
  try {
    const c = await MCAuth.listo;
    const r = await c.rpc('yape_config', { p });
    if (r.error) throw r.error;
    YP.d = r.data || YP.d; pintarYape();
  } catch (e) { toast(e.message || 'No se pudo guardar.', true); throw e; }
}

document.addEventListener('click', e => {
  if (!e.target.closest('#tab-yape') && !e.target.closest('.yp-ver')) return;
  const v = e.target.closest('.yp-ver'); if (v) { v.remove(); return; }
  const ch = e.target.closest('#ypChips .chip'); if (ch) { YP.ver = ch.dataset.v; pintarYape(); return; }
  const b = e.target.closest('[data-yp]');
  if (b) { ypResolver(+b.closest('[data-id]').dataset.id, b.dataset.yp === 'aprobar', b); return; }
  if (e.target.closest('#ypGuardarTope')) { ypConfig({ tope: +$('ypTope').value || 0, tope_dia: +$('ypTopeDia').value || 0 }).then(() => toast('Montos guardados'), () => {}); return; }
  if (e.target.closest('#ypWspGuardar')) {
    const p = { wsp_tel: $('ypWspTel').value.trim() }; const k = $('ypWspKey').value.trim(); if (k) p.wsp_key = k;
    ypConfig(p).then(() => toast('WhatsApp guardado'), () => {}); return;
  }
  if (e.target.closest('#ypTgConectar')) { ypTelegram(e.target.closest('#ypTgConectar')); return; }
  if (e.target.closest('#ypWspProbar')) { ypConfig({ probar: true }).then(() => toast('Mensaje de prueba enviado. Revisa tu celular.'), () => {}); return; }
  const cap = e.target.closest('.yp-cap');
  if (cap && YP.urls[cap.dataset.cap]) { const o = document.createElement('div'); o.className = 'yp-ver'; o.innerHTML = `<img src="${YP.urls[cap.dataset.cap]}" alt="Captura del Yape">`; document.body.appendChild(o); return; }
  const cp = e.target.closest('[data-copiar]');
  if (cp) { navigator.clipboard.writeText(cp.dataset.copiar).then(() => toast('Copiado'), () => toast('No se pudo copiar', true)); return; }
  if (e.target.closest('#ypAuto')) { ypConfig({ auto: !(YP.d.ajustes || {}).auto }).catch(() => {}); return; }
  const cl = e.target.closest('#ypClave');
  if (cl) {
    if (cl.dataset.seguro !== '1') { cl.dataset.seguro = '1'; cl.textContent = 'Tendrás que cambiarla en MacroDroid. ¿Seguro?'; return; }
    ypConfig({ nueva_clave: true }).catch(() => {}); return;
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

// Telegram: con el token del bot, busca tu chat (después de que le escribiste al bot) y lo guarda
async function ypTelegram(btn) {
  const tok = $('ypTgToken').value.trim();
  if (!/^\d+:[\w-]{20,}$/.test(tok)) { toast('Pega el token completo que te dio @BotFather (números, dos puntos y letras).', true); return; }
  btn.disabled = true; btn.textContent = 'Buscando…';
  try {
    const yo = await (await fetch(`https://api.telegram.org/bot${tok}/getMe`)).json();
    if (!yo.ok) throw new Error('Ese token no es válido. Cópialo otra vez de @BotFather.');
    const up = await (await fetch(`https://api.telegram.org/bot${tok}/getUpdates`)).json();
    const msgs = (up.result || []).map(u => u.message || u.edited_message).filter(m => m && m.chat && m.chat.type === 'private');
    if (!msgs.length) throw new Error(`Abre tu bot @${yo.result.username} en Telegram, toca INICIAR (o escríbele «hola») y vuelve a tocar Conectar.`);
    const chat = msgs[msgs.length - 1].chat;
    await ypConfig({ tg_token: tok, tg_chat: String(chat.id), probar: true });
    toast('Telegram conectado. Te mandé un mensaje de prueba.');
  } catch (e) {
    toast(e.message && !/Failed to fetch|NetworkError/i.test(e.message) ? e.message : 'No se pudo hablar con Telegram. Revisa tu internet.', true);
  } finally { if (document.body.contains(btn)) { btn.disabled = false; btn.textContent = 'Conectar'; } }
}
