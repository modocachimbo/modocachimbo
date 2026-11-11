/* =========================================================
   Panel · Clanes (solo administradores)
   Revisar nombres feos o nuevos, renombrar, ver miembros, marcar oficial,
   cerrar clanes y crear clanes oficiales (academias, influencers).
   Datos: supabase/89-clanes-guerras.sql (admin_clanes, admin_clan_*).
   Escudos: ../assets/clanes.js
   ========================================================= */
const CLP = { datos: null, filtro: 'todos', abierto: null, editando: null, seguro: null, nuevo: { forma: 'corona', simbolo: 'buho', color: '#FFC800' } };

(function estilosClanes() {
  const st = document.createElement('style');
  st.textContent = `
  .clp-res { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
  .clp-res div { border: 2px solid #2C2549; border-bottom-width: 4px; border-radius: 14px; padding: 10px 14px; background: var(--surface); font-size: 12.5px; color: var(--text-dim); }
  .clp-res b { display: block; font: 900 20px Nunito, sans-serif; color: var(--text); }
  .clp-res .mal b { color: var(--red); }
  .clp-esc { width: 40px; height: 46px; flex: none; filter: drop-shadow(0 2px 3px rgba(0,0,0,.4)); }
  .clp-esc svg { width: 100%; height: 100%; display: block; }
  .clp-nom { display: flex; align-items: center; gap: 10px; min-width: 210px; }
  .clp-nom b { font-size: 14px; }
  .clp-nom small { display: block; font-size: 12px; color: var(--text-dim); margin-top: 2px; }
  .clp-chip { display: inline-block; font: 900 10.5px Nunito, sans-serif; letter-spacing: .04em; text-transform: uppercase; padding: 3px 7px; border-radius: 6px; margin: 3px 4px 0 0; }
  .clp-chip.feo { background: rgba(224,60,60,.16); color: var(--red); }
  .clp-chip.nuevo { background: rgba(255,200,0,.14); color: var(--amber); }
  .clp-chip.ofi { background: rgba(28,176,246,.16); color: #5fc8ff; }
  .clp-chip.gue { background: rgba(255,150,0,.16); color: #ffb04d; }
  tr.clp-feo td { background: rgba(224,60,60,.06); }
  .clp-acc { display: grid; grid-template-columns: auto auto; gap: 6px; justify-content: end; }
  .clp-acc button { white-space: nowrap; padding: 6px 10px; font-size: 12.5px; }
  .clp-acc .peligro { border-color: var(--red); color: var(--red); }
  .clp-acc .peligro.seguro { background: var(--red); color: #1a0606; }
  .clp-edit { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-top: 6px; }
  .clp-edit input { height: 34px; padding: 0 10px; border-radius: 9px; border: 2px solid #2C2549; background: var(--bg); color: var(--text); font: 700 13px Nunito, sans-serif; }
  .clp-edit input[name=t] { width: 80px; text-transform: uppercase; }
  .clp-mi td { background: rgba(255,255,255,.02); }
  .clp-mi ul { list-style: none; margin: 0; padding: 4px 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 6px; }
  .clp-mi li { border: 1px solid var(--border); border-radius: 10px; padding: 7px 10px; font-size: 12.5px; }
  .clp-mi li small { display: block; color: var(--text-dim); }
  .clp-rol { color: var(--amber); font-weight: 900; font-size: 11px; text-transform: uppercase; margin-left: 4px; }
  .clp-nuevo { background: var(--surface); border: 2px solid #2C2549; border-bottom-width: 4px; border-radius: 18px; padding: 16px 18px; margin-bottom: 18px; }
  .clp-nuevo h3 { margin: 0 0 4px; font: 800 16px 'Sora', sans-serif; }
  .clp-nuevo > p { margin: 0 0 12px; font-size: 12.5px; color: var(--text-dim); line-height: 1.5; }
  .clp-form { display: grid; grid-template-columns: 110px 1fr; gap: 14px; align-items: start; }
  .clp-prev { width: 100px; height: 114px; }
  .clp-campos { display: grid; grid-template-columns: 1fr 90px 120px; gap: 8px; }
  .clp-campos input { height: 38px; padding: 0 10px; border-radius: 10px; border: 2px solid #2C2549; background: var(--bg); color: var(--text); font: 700 14px Nunito, sans-serif; min-width: 0; }
  .clp-elige { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
  .clp-elige button { width: 38px; height: 38px; border-radius: 10px; border: 2px solid #2C2549; background: var(--bg); padding: 4px; cursor: pointer; display: grid; place-items: center; }
  .clp-elige button.on { border-color: var(--accent, #C6E000); box-shadow: 0 0 0 2px rgba(198,224,0,.25); }
  .clp-elige button svg { width: 100%; height: 100%; }
  .clp-elige .col { border-radius: 50%; }
  .clp-err { color: var(--red); font-size: 12.5px; font-weight: 800; margin-top: 8px; min-height: 1em; }
  @media (max-width: 760px) {
    .clp-form { grid-template-columns: 1fr; } .clp-prev { margin: 0 auto; }
    .clp-campos { grid-template-columns: 1fr 1fr; } .clp-campos input[name=n] { grid-column: 1 / 3; }
    .clp-tabla thead { display: none; }
    .clp-tabla, .clp-tabla tbody, .clp-tabla tr, .clp-tabla td { display: block; width: 100%; box-sizing: border-box; }
    .al-tabla.clp-tabla { min-width: 0; }
    .clp-tabla tr { border: 2px solid #2C2549; border-radius: 14px; margin-bottom: 10px; padding: 8px 4px; }
    .clp-tabla td { border: 0 !important; padding: 4px 10px !important; text-align: left !important; }
    .clp-acc { justify-content: start; }
  }`;
  document.head.appendChild(st);
})();

const clpMil = n => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const clpErr = e => (window.MCClanes ? MCClanes.error(e) : (e && e.message) || 'No se pudo.');
async function clpRpc(nombre, args) {
  const c = await MCAuth.listo;
  const r = await c.rpc(nombre, args || {});
  if (r.error) throw r.error;
  return r.data;
}

async function cargarClanes() {
  const caja = $('clpList');
  caja.innerHTML = '<div class="loader">Cargando clanes…</div>';
  try { await MCAuth.listo; }
  catch (e) { caja.innerHTML = '<div class="state-msg error">No se pudo conectar con Supabase. Revisa tu internet.</div>'; return; }
  if (!MCAuth.usuario()) {
    caja.innerHTML = `<div class="state-msg al-login">Entra con tu cuenta de Google de administrador.
      <button class="btn-main" type="button" id="clpEntrar">Entrar con Google</button></div>`;
    $('clpEntrar').addEventListener('click', () => MCAuth.entrarGoogle());
    return;
  }
  try { CLP.datos = await clpRpc('admin_clanes'); }
  catch (e) {
    const m = String(e.message || '');
    caja.innerHTML = /no autorizado/i.test(m) ? '<div class="state-msg error">Solo los administradores pueden ver los clanes.</div>'
      : `<div class="state-msg error">${esc(m || 'No se pudo cargar.')}<br>¿Ya corriste los archivos supabase/88-clanes.sql y 89-clanes-guerras.sql?</div>`;
    return;
  }
  pintarClanes();
}

function clpFormulario() {
  const K = window.MCClanes, n = CLP.nuevo;
  if (!K) return '';
  return `<div class="clp-nuevo"><h3>Crear clan oficial</h3>
    <p>Para academias, profes o influencers. Sale con el sello azul de «Clan oficial» y en la lista de clanes oficiales. El líder es la cuenta de la academia: pon su ID de 5 dígitos (está en su Mi perfil).</p>
    <div class="clp-form"><div class="clp-prev" id="clpPrev">${K.escudo(n)}</div><div>
      <div class="clp-campos"><input name="n" id="clpN" maxlength="24" placeholder="Nombre del clan"><input name="t" id="clpT" maxlength="5" placeholder="Sigla"><input id="clpL" inputmode="numeric" maxlength="6" placeholder="ID del líder"></div>
      <div class="clp-elige">${Object.keys(K.FORMAS).map(f => `<button type="button" data-clpforma="${f}" class="${n.forma === f ? 'on' : ''}" title="${K.NOMBRES_FORMA[f]}">${K.escudo({ forma: f, color: n.color })}</button>`).join('')}</div>
      <div class="clp-elige">${Object.keys(K.SIMB).map(s => `<button type="button" data-clpsimb="${s}" class="${n.simbolo === s ? 'on' : ''}">${K.simbolo(s, n.color)}</button>`).join('')}</div>
      <div class="clp-elige">${K.COLORES.map(c => `<button type="button" data-clpcolor="${c}" class="col ${n.color === c ? 'on' : ''}" style="background:${c}" aria-label="Color"></button>`).join('')}</div>
      <div style="margin-top:12px"><button class="btn-main" type="button" id="clpCrear">Crear clan oficial</button></div>
      <div class="clp-err" id="clpErr"></div>
    </div></div></div>`;
}

function clpFila(c) {
  const K = window.MCClanes;
  const ed = CLP.editando === c.id;
  const chips = (c.feo ? '<span class="clp-chip feo">Revisar nombre</span>' : '') + (c.nuevo ? '<span class="clp-chip nuevo">Nuevo</span>' : '') +
    (c.oficial ? '<span class="clp-chip ofi">Oficial</span>' : '') + (c.en_guerra ? '<span class="clp-chip gue">En guerra</span>' : '');
  const seguro = CLP.seguro === c.id;
  let h = `<tr class="${c.feo ? 'clp-feo' : ''}">
    <td><div class="clp-nom"><span class="clp-esc">${K ? K.escudo(c) : ''}</span><div><b>${esc(c.nombre)}</b> <small>[${esc(c.tag)}] · código ${esc(c.codigo)}</small>${chips}
      ${ed ? `<div class="clp-edit"><input name="n" id="clpEdN" maxlength="24" value="${esc(c.nombre)}"><input name="t" id="clpEdT" maxlength="5" value="${esc(c.tag)}"><button class="btn-main" type="button" data-clpguardar="${c.id}">Guardar</button><button class="btn-ghost" type="button" data-clpcancel>Cancelar</button></div>` : ''}</div></div></td>
    <td>${esc(c.lider || '—')}<small style="display:block;color:var(--text-dim);font-size:12px">${c.lider_id ? 'ID ' + c.lider_id : ''}${c.lider_email ? ' · ' + esc(c.lider_email) : ''}</small></td>
    <td class="num">${c.miembros}/20</td>
    <td class="num">${clpMil(c.xp)}</td>
    <td class="num">${c.victorias || 0}</td>
    <td><div class="clp-acc">
      <button class="btn-ghost" type="button" data-clpver="${c.id}">${CLP.abierto === c.id ? 'Ocultar' : 'Miembros'}</button>
      <button class="btn-ghost" type="button" data-clpedit="${c.id}">Renombrar</button>
      <button class="btn-ghost" type="button" data-clpofi="${c.id}" data-si="${c.oficial ? 0 : 1}">${c.oficial ? 'Quitar oficial' : 'Hacer oficial'}</button>
      <button class="btn-ghost peligro${seguro ? ' seguro' : ''}" type="button" data-clpcerrar="${c.id}">${seguro ? '¿Seguro? Cerrar' : 'Cerrar clan'}</button>
    </div></td></tr>`;
  if (CLP.abierto === c.id) h += `<tr class="clp-mi"><td colspan="6" id="clpMi${c.id}"><div class="loader">Cargando miembros…</div></td></tr>`;
  return h;
}

function pintarClanes() {
  const d = CLP.datos || { clanes: [] }, L = d.clanes || [];
  const feos = L.filter(c => c.feo).length, nuevos = L.filter(c => c.nuevo).length, ofis = L.filter(c => c.oficial).length;
  const ver = CLP.filtro === 'revisar' ? L.filter(c => c.feo || c.nuevo) : CLP.filtro === 'oficiales' ? L.filter(c => c.oficial) : L;
  $('clpList').innerHTML = `<div class="clp-res">
      <div><b>${clpMil(L.length)}</b>clanes abiertos</div>
      <div><b>${clpMil(d.alumnos)}</b>alumnos en clanes</div>
      <div><b>${clpMil(d.guerras_semana)}</b>guerras esta semana</div>
      <div class="${feos ? 'mal' : ''}"><b>${feos}</b>nombres por revisar</div>
    </div>
    <div class="chips" style="margin-bottom:12px">
      <button class="chip${CLP.filtro === 'todos' ? ' on' : ''}" type="button" data-clpfiltro="todos">Todos (${L.length})</button>
      <button class="chip${CLP.filtro === 'revisar' ? ' on' : ''}" type="button" data-clpfiltro="revisar">Por revisar (${L.filter(c => c.feo || c.nuevo).length})</button>
      <button class="chip${CLP.filtro === 'oficiales' ? ' on' : ''}" type="button" data-clpfiltro="oficiales">Oficiales (${ofis})</button>
    </div>
    ${!ver.length ? '<div class="state-msg">' + (L.length ? 'No hay clanes en este filtro.' : 'Aún no hay clanes. Los alumnos los crean desde la página Clanes.') + '</div>' :
      `<div class="al-tabla-wrap"><table class="al-tabla clp-tabla">
      <thead><tr><th>Clan</th><th>Líder</th><th class="num">Miembros</th><th class="num">XP semana</th><th class="num">Victorias</th><th></th></tr></thead>
      <tbody>${ver.map(clpFila).join('')}</tbody></table></div>`}
    <p class="hint" style="margin:8px 0 18px">«Revisar nombre» sale cuando el nombre o la sigla parecen una grosería. «Nuevo» = creado en las últimas 48 horas. Cerrar un clan deja libres a sus miembros (pueden entrar a otro al instante) y cancela su guerra.</p>
    ${clpFormulario()}`;
  if (CLP.abierto) clpMiembros(CLP.abierto);
}

async function clpMiembros(id) {
  const td = $('clpMi' + id); if (!td) return;
  try {
    const L = await clpRpc('admin_clan_miembros', { p_clan: id });
    if (!$('clpMi' + id)) return;
    td.innerHTML = '<ul>' + (L || []).map(m => `<li><b>${esc(m.apodo || '—')}</b>${m.rol !== 'miembro' ? `<span class="clp-rol">${m.rol === 'lider' ? 'Líder' : 'Sublíder'}</span>` : ''}<small>ID ${m.id || '—'} · ${clpMil(m.xp)} XP esta semana</small><small>${esc(m.email || '')}</small></li>`).join('') + '</ul>';
  } catch (e) { td.innerHTML = '<div class="state-msg error">' + esc(clpErr(e)) + '</div>'; }
}

function clpPrevia() {
  const p = $('clpPrev'); if (p && window.MCClanes) p.innerHTML = MCClanes.escudo(CLP.nuevo);
}

document.addEventListener('click', async e => {
  const t = e.target.closest('[data-clpfiltro],[data-clpver],[data-clpedit],[data-clpcancel],[data-clpguardar],[data-clpofi],[data-clpcerrar],[data-clpforma],[data-clpsimb],[data-clpcolor],#clpCrear,#clpRecargar');
  if (!t || !$('tab-clanes') || $('tab-clanes').hidden) return;
  const d = t.dataset;
  if (t.id === 'clpRecargar') { CLP.seguro = null; return cargarClanes(); }
  if (d.clpfiltro) { CLP.filtro = d.clpfiltro; return pintarClanes(); }
  if (d.clpver) { CLP.abierto = CLP.abierto === +d.clpver ? null : +d.clpver; return pintarClanes(); }
  if (d.clpedit) { CLP.editando = +d.clpedit; pintarClanes(); const i = $('clpEdN'); if (i) i.focus(); return; }
  if ('clpcancel' in d) { CLP.editando = null; return pintarClanes(); }
  if (d.clpguardar) {
    t.disabled = true;
    try { await clpRpc('admin_clan_editar', { p_clan: +d.clpguardar, p_nombre: $('clpEdN').value, p_tag: $('clpEdT').value.toUpperCase() }); CLP.editando = null; toast('Nombre cambiado'); cargarClanes(); }
    catch (x) { toast(clpErr(x), true); t.disabled = false; }
    return;
  }
  if (d.clpofi) {
    t.disabled = true;
    try { await clpRpc('admin_clan_oficial', { p_clan: +d.clpofi, p_si: d.si === '1' }); toast(d.si === '1' ? 'Ahora es clan oficial' : 'Ya no es oficial'); cargarClanes(); }
    catch (x) { toast(clpErr(x), true); t.disabled = false; }
    return;
  }
  if (d.clpcerrar) {
    const id = +d.clpcerrar;
    if (CLP.seguro !== id) { CLP.seguro = id; pintarClanes(); setTimeout(() => { if (CLP.seguro === id) { CLP.seguro = null; pintarClanes(); } }, 4000); return; }
    t.disabled = true; CLP.seguro = null;
    try { await clpRpc('admin_clan_cerrar', { p_clan: id }); toast('Clan cerrado'); if (CLP.abierto === id) CLP.abierto = null; cargarClanes(); }
    catch (x) { toast(clpErr(x), true); t.disabled = false; }
    return;
  }
  if (d.clpforma || d.clpsimb || d.clpcolor) {
    const N = { n: $('clpN').value, t: $('clpT').value, l: $('clpL').value };
    if (d.clpforma) CLP.nuevo.forma = d.clpforma;
    if (d.clpsimb) CLP.nuevo.simbolo = d.clpsimb;
    if (d.clpcolor) CLP.nuevo.color = d.clpcolor;
    pintarClanes();
    $('clpN').value = N.n; $('clpT').value = N.t; $('clpL').value = N.l;
    return;
  }
  if (t.id === 'clpCrear') {
    const err = $('clpErr'), lid = parseInt($('clpL').value, 10);
    err.textContent = '';
    if (!lid) { err.textContent = 'Pon el ID del líder (5 dígitos, está en su Mi perfil).'; return; }
    t.disabled = true;
    try {
      const r = await clpRpc('admin_clan_crear', { p_nombre: $('clpN').value, p_tag: $('clpT').value.toUpperCase(), p_forma: CLP.nuevo.forma, p_simbolo: CLP.nuevo.simbolo, p_color: CLP.nuevo.color, p_lider: lid });
      toast('Clan oficial creado. Código para invitar: ' + (r && r.codigo));
      CLP.filtro = 'oficiales'; cargarClanes();
    } catch (x) { err.textContent = clpErr(x); t.disabled = false; }
  }
});
