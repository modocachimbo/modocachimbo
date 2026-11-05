/* =========================================================
   Panel · Influencers
   Los alumnos que son influencers de Modo Cachimbo. Lo que subes en
   Recursos con «Solo influencers» (fotos de perfil, fondos, pines…)
   lo tienen solo mientras estén en esta lista:
   - Al agregar a alguien (por su ID de 5 cifras) le llega un sobre
     con todo lo de influencer.
   - Al quitarlo se le quita al toque; si lo tenía puesto, vuelve a lo
     que usaba antes.
   Lo ven los admins y los ayudantes con el permiso «Regalos».
   Datos: supabase/64-influencers.sql (influencers_admin,
   influencer_poner, influencer_quitar).
   ========================================================= */
const INF = { datos: null, quitar: null, enviando: false };

(function estilosInfluencers() {
  const st = document.createElement('style');
  st.textContent = `
  .inf-items { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
  .inf-it { display: flex; align-items: center; gap: 8px; padding: 6px 10px 6px 6px; border-radius: 12px; background: #120e22; border: 2px solid #2A2346; font: 900 12.5px Nunito, sans-serif; }
  .inf-it i { width: 30px; height: 30px; border-radius: 8px; background: #2A2346 center/cover; flex-shrink: 0; }
  .inf-it small { color: var(--text-dim); font-weight: 800; }
  .inf-fila { display: flex; align-items: center; gap: 12px; padding: 12px 4px; border-bottom: 1px solid #221C3C; }
  .inf-fila:last-child { border-bottom: 0; }
  .inf-foto { width: 46px; height: 46px; flex-shrink: 0; border-radius: 50%; background: #2A2346 center/cover; display: grid; place-items: center; font: 1000 18px Nunito, sans-serif; color: #CE82FF; border: 2px solid #CE82FF; }
  .inf-fila > div { flex: 1; min-width: 0; }
  .inf-fila b { display: block; font: 900 15px Nunito, sans-serif; overflow-wrap: anywhere; }
  .inf-fila small { display: block; color: var(--text-dim); font-size: 12.5px; overflow-wrap: anywhere; }
  .inf-tag { display: inline-block; margin-left: 6px; padding: 2px 7px; border-radius: 7px; background: rgba(206,130,255,.16); color: #CE82FF; font: 1000 10.5px Nunito, sans-serif; letter-spacing: .5px; vertical-align: 2px; }
  .inf-res { font: 800 14px Nunito, sans-serif; color: var(--text-dim); }
  @media (max-width: 560px) { .inf-fila { flex-wrap: wrap; } .inf-fila .btn-ghost { margin-left: 58px; } }`;
  document.head.appendChild(st);
})();

const INF_ESP = { racha: 'Banner', avatar: 'Foto de perfil', pines: 'Pin', marco: 'Marco', cuadro: 'Cuadro de racha', titulo: 'Título' };
function infFecha(s) { return new Date(s).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }); }
function infCodigos(t) { return [...new Set((String(t || '').match(/\d+/g) || []).filter(x => x.length === 5).map(Number))]; }

async function cargarInfluencers() {
  const caja = $('infCuerpo');
  let c;
  try { c = await MCAuth.listo; }
  catch (e) { caja.innerHTML = '<div class="state-msg error">No se pudo conectar con Supabase. Revisa tu internet.</div>'; return; }
  if (!MCAuth.usuario()) {
    caja.innerHTML = `<div class="state-msg al-login">Entra con tu cuenta de Google de administrador.
      <button class="btn-main" type="button" id="infEntrar">Entrar con Google</button></div>`;
    $('infEntrar').addEventListener('click', () => MCAuth.entrarGoogle());
    return;
  }
  if (!INF.datos) caja.innerHTML = '<div class="loader">Cargando…</div>';
  const r = await c.rpc('influencers_admin');
  if (r.error) {
    caja.innerHTML = /function|does not exist/i.test(r.error.message || '')
      ? '<div class="state-msg error">Falta correr <b>supabase/64-influencers.sql</b> en Supabase → SQL Editor.</div>'
      : `<div class="state-msg error">${/no autorizado/i.test(r.error.message || '') ? 'Tu cuenta no tiene permiso (necesita «Regalos»).' : esc(r.error.message || 'No se pudo cargar.')}</div>`;
    return;
  }
  INF.datos = r.data || { miembros: [], items: [] };
  pintarInfluencers();
}

function pintarInfluencers() {
  const d = INF.datos, m = d.miembros || [], it = (d.items || []).filter(x => x.visible !== false);
  const txt = $('infIds') ? $('infIds').value : '', msj = $('infMsj') ? $('infMsj').value : '';
  $('infCuerpo').innerHTML = `
    <div class="agp-form">
      <h3>Agregar influencers</h3>
      <p class="hint">Escribe el ID de 5 cifras de su tarjeta de jugador. Puedes poner varios, separados por comas o en líneas.</p>
      <label for="infIds">IDs</label>
      <textarea class="inp" id="infIds" placeholder="12345, 67890"></textarea>
      <label for="infMsj">Mensaje del sobre (opcional)</label>
      <input class="inp" id="infMsj" maxlength="120" placeholder="¡Ahora eres influencer de Modo Cachimbo! Esto es para ti.">
      <div class="agp-acc"><button class="btn-main" type="button" id="infPoner">Agregar</button><span class="inf-res" id="infRes"></span></div>
    </div>
    <div class="agp-form">
      <h3>Lo que tienen los influencers</h3>
      ${it.length ? `<div class="inf-items">${it.map(x => `<span class="inf-it"><i${x.img ? ` style="background-image:url('${esc(x.img)}')"` : ''}></i><span>${esc(x.nom)}<br><small>${esc(INF_ESP[x.espacio] || x.espacio)}</small></span></span>`).join('')}</div>`
        : '<p class="hint" style="margin:0">Todavía nada.</p>'}
      <p class="hint" style="margin:10px 0 0">Para sumar más, en <b>Recursos</b> elige <b>Solo influencers</b> en «Cómo se gana». A los que ya son influencers les llega en un sobre.</p>
    </div>
    <div class="agp-form">
      <h3>Influencers <span class="inf-tag">${m.length}</span></h3>
      ${m.length ? m.map(x => {
        const ini = (x.apodo || x.email || '?').trim().charAt(0).toUpperCase(), seguro = INF.quitar === x.codigo;
        return `<div class="inf-fila">
          <span class="inf-foto"${x.foto ? ` style="background-image:url('${esc(x.foto)}')"` : ''}>${x.foto ? '' : esc(ini)}</span>
          <div><b>${esc(x.apodo || 'Sin apodo')} <small style="display:inline">· ID ${x.codigo || '—'}</small></b><small>${esc(x.email || '')} · desde ${infFecha(x.desde)}</small></div>
          ${x.codigo ? `<button class="btn-ghost rojo" type="button" data-q="${x.codigo}">${seguro ? '¿Quitar? Toca otra vez' : 'Quitar'}</button>` : ''}
        </div>`;
      }).join('') : '<p class="hint" style="margin:0">Aún no hay influencers. Agrégalos arriba con su ID.</p>'}
    </div>`;
  $('infIds').value = txt; $('infMsj').value = msj;
  $('infPoner').addEventListener('click', infPoner);
  document.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => infQuitar(+b.dataset.q)));
}

async function infPoner() {
  if (INF.enviando) return;
  const ids = infCodigos($('infIds').value);
  if (!ids.length) { $('infRes').textContent = 'Escribe al menos un ID de 5 cifras.'; return; }
  INF.enviando = true; $('infPoner').disabled = true; $('infPoner').textContent = 'Agregando…';
  const c = await MCAuth.listo;
  const r = await c.rpc('influencer_poner', { p_codigos: ids, p_mensaje: $('infMsj').value.trim() || null });
  INF.enviando = false;
  if (r.error) { $('infPoner').disabled = false; $('infPoner').textContent = 'Agregar'; toast(r.error.message || 'No se pudo agregar'); return; }
  const d = r.data || {}, partes = [];
  if (d.agregados) partes.push(d.agregados + (d.agregados === 1 ? ' influencer nuevo' : ' influencers nuevos') + (d.items ? ' (les llegó el sobre)' : ''));
  if (d.ya) partes.push(d.ya + (d.ya === 1 ? ' ya era' : ' ya eran'));
  if (d.sin_id && d.sin_id.length) partes.push('no existen: ' + d.sin_id.join(', '));
  toast('⭐ ' + (partes.join(' · ') || 'Listo'));
  $('infIds').value = ''; $('infMsj').value = '';
  cargarInfluencers();
}

async function infQuitar(codigo) {
  if (INF.quitar !== codigo) { INF.quitar = codigo; pintarInfluencers(); return; }
  INF.quitar = null;
  const c = await MCAuth.listo;
  const r = await c.rpc('influencer_quitar', { p_codigo: codigo });
  if (r.error) { toast(r.error.message || 'No se pudo quitar'); pintarInfluencers(); return; }
  toast('Se quitó al ID ' + codigo + ' de influencers');
  cargarInfluencers();
}
