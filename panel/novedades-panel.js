/* =========================================================
   Panel · Avisos de temas y cursos nuevos
   Al publicar un tema nuevo (no Fijas) se guarda un aviso en
   Supabase para que los alumnos lo vean (supabase/03-novedades.sql).
   Para eso hay que haber entrado con la cuenta de Google que está
   en public.admins.
   ========================================================= */
const NOV = { admin: null };

(function estilosNovedades() {
  const st = document.createElement('style');
  st.textContent = `
  .nv-aviso { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; border: 1px solid var(--border); background: var(--surface); border-radius: 14px; padding: 12px 14px; margin-bottom: 16px; font-size: 13.5px; color: var(--text-dim); line-height: 1.5; }
  .nv-aviso[hidden] { display: none; }
  .nv-aviso.ok { border-color: rgba(198,224,0,.3); }
  .nv-aviso.mal { border-color: rgba(224,60,60,.35); }
  .nv-aviso span { flex: 1; min-width: 200px; }
  .nv-aviso b { color: var(--text); }
  .nv-res { margin: 14px auto 0; max-width: 460px; font-size: 13.5px; line-height: 1.5; color: var(--text-dim); }
  .nv-res .rbtn { margin-top: 8px; }`;
  document.head.appendChild(st);
})();

// ¿Puede este panel crear avisos? → 'ok' | 'sin-sesion' | 'no-admin' | 'error'
async function novEstado() {
  let cliente;
  try { cliente = await MCAuth.listo; } catch (e) { return 'error'; }
  if (!MCAuth.usuario()) return 'sin-sesion';
  if (NOV.admin === null) {
    const r = await cliente.rpc('es_admin');
    if (r.error) return 'error';
    NOV.admin = !!r.data;
  }
  return NOV.admin ? 'ok' : 'no-admin';
}

// Franja arriba de "Subir tema"
async function pintarAvisoNovedades() {
  const el = $('subNovAviso'); if (!el) return;
  const e = await novEstado();
  const u = MCAuth.usuario();
  el.className = 'nv-aviso ' + (e === 'ok' ? 'ok' : 'mal');
  if (e === 'ok') el.innerHTML = `<span>🔔 Cuando publiques un tema nuevo, los alumnos verán el aviso <b>“Nuevo”</b>. Conectado como <b>${esc(u.email)}</b>.</span>`;
  else if (e === 'sin-sesion') el.innerHTML = `<span>🔔 Para que los alumnos vean el aviso de temas nuevos, entra con tu cuenta de Google de administrador.</span><button type="button" class="btn-main" id="nvEntrar">Entrar con Google</button>`;
  else if (e === 'no-admin') el.innerHTML = `<span>🔔 Tu correo <b>${esc(u.email)}</b> no es administrador, así que los temas nuevos no avisarán a los alumnos. Entra con la cuenta de Modo Cachimbo.</span>`;
  else el.innerHTML = `<span>🔔 No se pudo revisar los avisos. ¿Ya corriste el archivo <b>supabase/03-novedades.sql</b>?</span>`;
  el.hidden = false;
  const b = $('nvEntrar'); if (b) b.addEventListener('click', () => MCAuth.entrarGoogle());
}

// Guarda el aviso. d = { tipo, carpeta, curso, anio, tema, nombre }
async function avisarNovedad(d) {
  const e = await novEstado();
  if (e !== 'ok') return { ok: false, motivo: e };
  if (!REG) await cargarRegistro();
  const info = ((REG && REG.cursos) || []).find(c => c.id === String(d.carpeta).split('--')[0]) || {};
  const cliente = await MCAuth.listo;
  const r = await cliente.rpc('crear_novedad', {
    p_tipo: d.tipo, p_carpeta: d.carpeta, p_curso: d.curso, p_area: info.area || null,
    p_anio: d.anio, p_tema: d.tema, p_nombre: d.nombre
  });
  if (r.error) return { ok: false, motivo: 'error', mensaje: r.error.message };
  return { ok: true, id: r.data };
}

// Muestra el resultado en la pantalla de "¡Tema publicado!"
function pintarResultadoNovedad(caja, d, res) {
  if (!caja) return;
  const que = d.tipo === 'curso' ? 'curso nuevo' : 'tema nuevo';
  if (res.ok) {
    caja.innerHTML = `🔔 Los alumnos verán el aviso de <b style="color:#f5ffcc">${que}</b> en unos 10 minutos, durante 30 días o hasta que lo abran.<br>
      <button type="button" class="rbtn" id="nvQuitar">No mostrar este aviso</button>`;
    $('nvQuitar').addEventListener('click', async ev => {
      const b = ev.currentTarget; b.disabled = true;
      const r = await (await MCAuth.listo).rpc('borrar_novedad', { p_id: res.id });
      if (r.error) { b.disabled = false; toast(r.error.message, true); return; }
      caja.innerHTML = 'Listo, este aviso ya no se mostrará.';
    });
    return;
  }
  const porque = res.motivo === 'sin-sesion' ? 'no entraste con Google en el panel'
    : res.motivo === 'no-admin' ? 'tu correo no es administrador'
    : 'no se pudo conectar con Supabase';
  caja.innerHTML = `⚠️ El tema se publicó, pero los alumnos no verán el aviso porque ${porque}.` +
    (res.motivo === 'error' ? '<br><button type="button" class="rbtn" id="nvReintentar">Intentar de nuevo</button>' : '');
  const b = $('nvReintentar');
  if (b) b.addEventListener('click', async () => { b.disabled = true; pintarResultadoNovedad(caja, d, await avisarNovedad(d)); });
}

if (window.MCAuth) { MCAuth.alCambiar(() => { NOV.admin = null; pintarAvisoNovedades(); }); pintarAvisoNovedades(); }
