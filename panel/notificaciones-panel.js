/* =========================================================
   Panel · Notificaciones push (Web)
   Manda un aviso al celular / PC de los alumnos que las activaron.
   Datos: supabase/92-notificaciones.sql. Envío: Edge Function
   «enviar-push» (supabase/funciones/enviar-push/index.ts).
   La web: assets/push.js (tarjeta «Activar» en el inicio) y sw.js.
   Usa los estilos de agenda-panel.js (.agp-*).
   ========================================================= */
const NTP = { link: '', confirmar: false, resumen: null, auto: null };
// Avisos automáticos (supabase/93-notificaciones-auto.sql): los manda Supabase cada hora
const NTP_AUTO = {
  tema: ['Tema o curso nuevo', 'Unos 10 min después de subirlo desde el panel.'],
  racha: ['Racha en peligro', '8 p. m., si tiene racha de 2+ días y hoy no llega a su meta.'],
  inactivo: ['No entra hace días', '6 p. m., a los 3 y a los 7 días sin estudiar.'],
  corazones: ['Corazones llenos', 'Cuando se le recargan los 5 corazones.'],
};
const NTP_LINKS = { '': 'Inicio', 'simulacro.html': 'Simulacro', 'perfil.html': 'Mi perfil', 'arcade.html': 'Arcade', otro: 'Otro link…' };

(function estilosNotif() {
  const st = document.createElement('style');
  st.textContent = `
  .ntp-num { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
  .ntp-num div { flex: 1; min-width: 140px; padding: 12px 14px; border: 2px solid #2A2346; border-radius: 16px; background: var(--surface); color: var(--text-dim); font-size: 12.5px; }
  .ntp-num b { display: block; color: var(--text); font: 900 22px Nunito, sans-serif; }
  .ntp-conf { border: 2px dashed #3A3260; border-radius: 16px; padding: 14px 16px; margin-bottom: 18px; }
  .ntp-conf summary { cursor: pointer; font: 900 14.5px Nunito, sans-serif; }
  .ntp-conf ol { margin: 10px 0 0 18px; color: var(--text-dim); font-size: 13.5px; line-height: 1.6; }
  .ntp-llave { display: flex; gap: 8px; align-items: center; margin: 6px 0; }
  .ntp-llave code { flex: 1; min-width: 0; overflow-wrap: anywhere; background: #0c0a16; border: 1px solid #2A2346; border-radius: 10px; padding: 8px 10px; font-size: 12px; color: var(--accent); }
  .ntp-llave span { width: 120px; flex-shrink: 0; font: 800 12px Nunito, sans-serif; color: var(--text); }
  .ntp-prev { margin-top: 14px; display: flex; gap: 10px; align-items: flex-start; padding: 12px; border-radius: 14px; background: #0c0a16; border: 1px solid #2A2346; max-width: 420px; }
  .ntp-prev img { width: 38px; height: 38px; border-radius: 50%; }
  .ntp-prev b { display: block; font: 800 14px Nunito, sans-serif; }
  .ntp-prev small { color: var(--text-dim); font-size: 13px; }
  .ntp-bts { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
  .ntp-msg { margin-top: 10px; font: 800 13.5px Nunito, sans-serif; }
  .ntp-auto { border: 2px solid #2A2346; border-radius: 16px; padding: 14px 16px; margin-bottom: 18px; background: var(--surface); }
  .ntp-auto h3 { margin: 0 0 4px; font: 900 16px Nunito, sans-serif; }
  .ntp-auto > p { margin: 0 0 12px; color: var(--text-dim); font-size: 13px; }
  .ntp-tipos { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; }
  .ntp-tipo { display: flex; align-items: center; gap: 10px; text-align: left; padding: 10px 12px; border-radius: 14px; border: 2px solid #2A2346; background: #0c0a16; color: var(--text); cursor: pointer; font: inherit; }
  .ntp-tipo.on { border-color: var(--accent); background: rgba(198,224,0,.08); }
  .ntp-tipo i { width: 38px; height: 22px; flex-shrink: 0; border-radius: 99px; background: #2A2346; position: relative; transition: background .2s; }
  .ntp-tipo i::after { content: ""; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #8C84B0; transition: transform .2s, background .2s; }
  .ntp-tipo.on i { background: rgba(198,224,0,.3); }
  .ntp-tipo.on i::after { transform: translateX(16px); background: var(--accent); }
  .ntp-tipo span { flex: 1; min-width: 0; }
  .ntp-tipo b { display: block; font: 900 14px Nunito, sans-serif; }
  .ntp-tipo small { display: block; color: var(--text-dim); font-size: 12px; }
  .ntp-fila { padding: 10px 14px; border: 2px solid #2A2346; border-radius: 14px; background: var(--surface); margin-bottom: 8px; }
  .ntp-fila b { font: 900 14.5px Nunito, sans-serif; }
  .ntp-fila small { display: block; color: var(--text-dim); font-size: 12.5px; margin-top: 2px; overflow-wrap: anywhere; }`;
  document.head.appendChild(st);
})();

function ntpB64(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }

async function cargarNotificaciones() {
  const caja = $('ntpCaja');
  caja.innerHTML = '<div class="loader">Cargando…</div>';
  let c;
  try { c = await MCAuth.listo; }
  catch (e) { caja.innerHTML = '<div class="state-msg error">No se pudo conectar con Supabase. Revisa tu internet.</div>'; return; }
  if (!MCAuth.usuario()) {
    caja.innerHTML = `<div class="state-msg al-login">Entra con tu cuenta de Google de administrador.
      <button class="btn-main" type="button" id="ntpEntrar">Entrar con Google</button></div>`;
    $('ntpEntrar').addEventListener('click', () => MCAuth.entrarGoogle());
    return;
  }
  const r = await c.rpc('push_resumen');
  if (r.error) {
    caja.innerHTML = `<div class="state-msg error">${esc(r.error.message || 'No se pudo cargar.')}<br>¿Ya corriste el archivo supabase/92-notificaciones.sql?</div>`;
    return;
  }
  NTP.resumen = r.data || {};
  const a = await c.rpc('push_auto_tipos', {});
  NTP.auto = a.error ? null : (a.data || {});
  let clave = '';
  try { const k = await c.functions.invoke('enviar-push', { body: { accion: 'clave' } }); clave = (k.data && k.data.clave) || ''; } catch (e) {}
  pintarNotificaciones(clave);
}

function pintarNotificaciones(clave) {
  const R = NTP.resumen, est = window.MCPush ? MCPush.estado() : 'no-soportado';
  const miEquipo = est === 'granted' ? 'Activadas' : est === 'denied' ? 'Bloqueadas' : est === 'no-soportado' ? 'No disponible' : 'Sin activar';
  $('ntpCaja').innerHTML = `
    <div class="ntp-num">
      <div><b>${Number(R.alumnos || 0).toLocaleString('es-PE')}</b>alumnos con notificaciones</div>
      <div><b>${Number(R.equipos || 0).toLocaleString('es-PE')}</b>equipos (celulares y PC)</div>
      <div><b>${miEquipo}</b>en este equipo${R.mios ? ' · ' + R.mios + ' tuyo(s)' : ''}
        ${est === 'default' || (est === 'granted' && !R.mios) ? '<br><button class="btn-ghost" type="button" id="ntpActivarYo" style="margin-top:6px">Activar aquí</button>' : ''}</div>
    </div>
    <div class="ntp-auto">
      <h3>Automáticas</h3>
      ${NTP.auto ? `<p>Supabase las manda solo, cada hora, de 8 a. m. a 9 p. m. Máximo 2 al día por alumno. Toca para prender o apagar.</p>
      <div class="ntp-tipos" id="ntpTipos">${Object.keys(NTP_AUTO).map(k => {
        const on = !NTP.auto.tipos || NTP.auto.tipos[k] !== false, n = (NTP.auto.hoy || {})[k] || 0;
        return `<button type="button" class="ntp-tipo${on ? ' on' : ''}" data-k="${k}" aria-pressed="${on}"><i></i><span><b>${NTP_AUTO[k][0]}</b><small>${NTP_AUTO[k][1]}${n ? ' · ' + n + ' en 7 días' : ''}</small></span></button>`;
      }).join('')}</div>` : '<p>Para activarlas corre <b>supabase/93-notificaciones-auto.sql</b> en Supabase y vuelve a subir la función <b>enviar-push</b>.</p>'}
    </div>
    <details class="ntp-conf"${clave ? '' : ' open'}>
      <summary>${clave ? 'Configuración lista' : 'Configuración (se hace una sola vez)'}</summary>
      <ol>
        <li>Supabase → SQL Editor: corre <b>supabase/92-notificaciones.sql</b>.</li>
        <li>Supabase → Edge Functions → <b>Deploy a new function → Via Editor</b>, nombre <b>enviar-push</b>, pega <b>supabase/funciones/enviar-push/index.ts</b> y pulsa Deploy.</li>
        <li>Pulsa <b>Generar llaves</b> aquí abajo y copia las 3 en Supabase → Edge Functions → <b>Secrets</b>, con esos mismos nombres.</li>
      </ol>
      <div id="ntpLlaves" style="margin-top:10px">${clave ? '<div class="anp-ayuda">Llave pública en uso: ' + esc(clave.slice(0, 18)) + '…  Si generas llaves nuevas, todos tendrán que volver a activar las notificaciones.</div>' : ''}</div>
      <button class="btn-ghost" type="button" id="ntpGenerar" style="margin-top:8px">Generar llaves</button>
    </details>
    <div class="agp-form">
      <h3>Nueva notificación</h3>
      <label for="ntpTit">Título (corto, máx. 50)</label>
      <input class="inp" id="ntpTit" maxlength="80" placeholder="Nuevo tema de Química">
      <label for="ntpCue">Mensaje (máx. 160)</label>
      <textarea class="inp" id="ntpCue" maxlength="240" rows="3" placeholder="Ya puedes practicar Estequiometría. ¡Entra y no pierdas tu racha!"></textarea>
      <span class="agp-l">Al tocarla abre</span>
      <div class="agp-ops" id="ntpLinks">${Object.keys(NTP_LINKS).map(k => `<button type="button" class="agp-op${k === NTP.link ? ' on' : ''}" data-v="${k}">${NTP_LINKS[k]}</button>`).join('')}</div>
      <input class="inp" id="ntpOtro" placeholder="https://… o página del sitio (ej. lenguaje/libros/temario.html)" style="margin-top:8px" hidden>
      <div class="ntp-prev"><img src="../assets/app/icono-192.png" alt=""><div><b id="ntpPrevT">Título</b><small id="ntpPrevC">Mensaje</small></div></div>
      <div class="ntp-bts">
        <button class="btn-ghost" type="button" id="ntpProbar">Probar en mis equipos</button>
        <button class="btn-main" type="button" id="ntpEnviar">Enviar a todos</button>
      </div>
      <div class="ntp-msg" id="ntpMsg"></div>
    </div>
    <h3 style="font:900 16px Nunito,sans-serif;margin:6px 0 10px">Enviadas</h3>
    <div>${(R.envios || []).length ? R.envios.map(e => `<div class="ntp-fila"><b>${esc(e.titulo)}</b>
      <small>${esc(e.cuerpo)}</small>
      <small>${new Date(e.creado).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · ${e.para === 'prueba' ? 'prueba' : 'a todos'} · ${e.enviados} enviadas${e.fallidos ? ' · ' + e.fallidos + ' fallidas' : ''}${e.link ? ' · ' + esc(e.link) : ''}</small></div>`).join('') : '<div class="state-msg">Todavía no mandas ninguna.</div>'}</div>`;

  const prev = () => { $('ntpPrevT').textContent = $('ntpTit').value.trim() || 'Título'; $('ntpPrevC').textContent = $('ntpCue').value.trim() || 'Mensaje'; };
  $('ntpTit').addEventListener('input', prev); $('ntpCue').addEventListener('input', prev);
  $('ntpOtro').hidden = NTP.link !== 'otro';
  $('ntpLinks').addEventListener('click', e => {
    const b = e.target.closest('.agp-op'); if (!b) return;
    NTP.link = b.dataset.v;
    $('ntpLinks').querySelectorAll('.agp-op').forEach(x => x.classList.toggle('on', x === b));
    $('ntpOtro').hidden = NTP.link !== 'otro';
  });
  $('ntpGenerar').addEventListener('click', ntpGenerarLlaves);
  if ($('ntpTipos')) $('ntpTipos').addEventListener('click', async e => {
    const b = e.target.closest('.ntp-tipo'); if (!b) return;
    const on = !b.classList.contains('on');
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
    const c = await MCAuth.listo;
    const r = await c.rpc('push_auto_tipos', { p_tipos: { [b.dataset.k]: on } });
    if (r.error) { b.classList.toggle('on', !on); b.setAttribute('aria-pressed', !on); }
    else NTP.auto.tipos = r.data.tipos;
  });
  if ($('ntpActivarYo')) $('ntpActivarYo').addEventListener('click', async () => {
    const r = await MCPush.activar().catch(() => 'error');
    if (r === 'activado') cargarNotificaciones();
    else $('ntpActivarYo').textContent = r === 'denied' ? 'Bloqueadas en el navegador' : 'No se pudo (¿configuración lista?)';
  });
  $('ntpProbar').addEventListener('click', () => ntpEnviar('prueba'));
  $('ntpEnviar').addEventListener('click', () => {
    if (!NTP.confirmar) { NTP.confirmar = true; $('ntpEnviar').textContent = '¿Seguro? Toca otra vez'; setTimeout(() => { NTP.confirmar = false; if ($('ntpEnviar')) $('ntpEnviar').textContent = 'Enviar a todos'; }, 4000); return; }
    NTP.confirmar = false; ntpEnviar('todos');
  });
}

async function ntpGenerarLlaves() {
  const k = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
  const pub = ntpB64(await crypto.subtle.exportKey('raw', k.publicKey));
  const priv = (await crypto.subtle.exportKey('jwk', k.privateKey)).d;
  const fila = (n, v) => `<div class="ntp-llave"><span>${n}</span><code>${esc(v)}</code><button class="btn-ghost" type="button" data-cp="${esc(v)}">Copiar</button></div>`;
  $('ntpLlaves').innerHTML = fila('VAPID_PUBLICA', pub) + fila('VAPID_PRIVADA', priv) + fila('VAPID_CORREO', 'modocachimbo@gmail.com')
    + '<div class="anp-ayuda">La privada no se guarda en ningún lado: cópiala ahora en Secrets. No la compartas.</div>';
  $('ntpLlaves').querySelectorAll('[data-cp]').forEach(b => b.addEventListener('click', () => {
    navigator.clipboard.writeText(b.dataset.cp).then(() => { b.textContent = 'Copiada'; setTimeout(() => { b.textContent = 'Copiar'; }, 1500); });
  }));
}

async function ntpEnviar(para) {
  const titulo = $('ntpTit').value.trim(), cuerpo = $('ntpCue').value.trim();
  const link = NTP.link === 'otro' ? $('ntpOtro').value.trim() : NTP.link;
  const msg = $('ntpMsg');
  if (!titulo || !cuerpo) { msg.style.color = 'var(--red)'; msg.textContent = 'Escribe el título y el mensaje.'; return; }
  msg.style.color = 'var(--text-dim)'; msg.textContent = 'Enviando…';
  const c = await MCAuth.listo;
  const r = await c.functions.invoke('enviar-push', { body: { accion: 'enviar', titulo, cuerpo, link, para } });
  let d = r.data;
  if (r.error) { try { d = await r.error.context.json(); } catch (e) { d = { error: r.error.message }; } }
  if (!d || d.error) { msg.style.color = 'var(--red)'; msg.textContent = (d && d.error) || 'No se pudo enviar.'; return; }
  msg.style.color = 'var(--accent)';
  msg.textContent = d.total ? `Enviada a ${d.enviados} de ${d.total} equipos.${d.borrados ? ' Se quitaron ' + d.borrados + ' que ya no existen.' : ''}` : (para === 'prueba' ? 'No tienes equipos activados: pulsa «Activar aquí» arriba.' : 'Nadie tiene activadas las notificaciones todavía.');
  if (para === 'todos' && d.total) { $('ntpTit').value = ''; $('ntpCue').value = ''; }
  const r2 = await c.rpc('push_resumen'); if (!r2.error) { NTP.resumen = r2.data; }
}
