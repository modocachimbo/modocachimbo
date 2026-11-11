/* =========================================================
   Panel · Anuncios flotantes (Web)
   Una imagen que sale en ventana al entrar al inicio, con link
   opcional, fechas, frecuencia, público y conteo de vistas y clics.
   Datos: supabase/84-anuncios.sql. La web: assets/anuncios.js.
   Usa los estilos de agenda-panel.js (.agp-*) y canvasABlob (imagenes.js).
   ========================================================= */
const ANP = { lista: [], editando: null, img: null, borrar: null, tipo: 'propio', icono: 'whatsapp', frecuencia: 'dia', publico: 'todos', noTiene: [], tiene: [], modalidad: '', cuenta: '', equipo: '' };
const ANP_TIPOS = { propio: ['Propio (Modo Cachimbo)', '#C6E000'], patrocinado: ['Academia / patrocinado', '#38BDF8'], aviso: ['Aviso importante', '#FBBF24'] };
const ANP_ICONOS = { whatsapp: 'WhatsApp', web: 'Web', tiktok: 'TikTok', instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube' };
const ANP_FREC = { 'una-vez': 'Solo una vez', dia: 'Una vez al día', siempre: 'Cada vez que entra' };
const ANP_PUB = { todos: 'Todos', 'sin-codigo': 'Sin ningún código', 'con-codigo': 'Con algún código' };
const ANP_PUB_VIEJO = { Ordinario: 'Solo Ordinario', CPU: 'Solo CPU' };
// Los mismos productos que los códigos (assets/acceso.js · cubre)
const ANP_PROD = { 'TODO-VIP': 'Acceso total', area: 'Repaso y Fijas (áreas)', seminario: 'Seminarios + Banqueo', simulacro: 'Simulacro',
  duelo: 'Duelos', examenes: 'Exámenes', vocabulario: 'Vocabulario', biblioteca: 'Biblioteca', descarga: 'Descargas PDF' };
const ANP_MOD = { '': 'Todas', Ordinario: 'Ordinario', CPU: 'CPU' };
const ANP_CUENTA = { '': 'Todas', nuevas: 'Nuevas', antiguas: 'Antiguas' };
const ANP_EQUIPO = { '': 'Todos', celular: 'Celular', pc: 'PC', app: 'App instalada' };
// Resumen corto de a quién le sale
function anpQuien(a) {
  const s = a.segmento || {}, p = [];
  p.push(ANP_PUB[a.publico] || ANP_PUB_VIEJO[a.publico] || a.publico);
  if (s.no_tiene && s.no_tiene.length) p.push('sin ' + s.no_tiene.map(x => ANP_PROD[x] || x).join(' / '));
  if (s.tiene && s.tiene.length) p.push('con ' + s.tiene.map(x => ANP_PROD[x] || x).join(' / '));
  if (s.modalidad) p.push(s.modalidad);
  if (s.cuenta) p.push(s.cuenta === 'nuevas' ? 'cuentas de menos de ' + s.dias + ' días' : 'cuentas de más de ' + s.dias + ' días');
  if (s.equipo) p.push(ANP_EQUIPO[s.equipo]);
  if (p.length > 1 && p[0] === 'Todos') p.shift();
  return p.join(' · ');
}
const ANP_FREC_CORTO = { 'una-vez': '1 sola vez', dia: '1 vez al día', siempre: 'cada ingreso' };

(function estilosAnuncios() {
  const st = document.createElement('style');
  st.textContent = `
  .anp-up { display: flex; gap: 14px; align-items: center; }
  .anp-up .anp-prev { width: 120px; height: 120px; flex-shrink: 0; border-radius: 14px; background: #0c0a16 center/contain no-repeat; border: 2px solid #2F284E; }
  .anp-zona { flex: 1; display: block; border: 2px dashed #3A3260; border-radius: 14px; padding: 16px; text-align: center; color: var(--text-dim); font: 700 13.5px Nunito, sans-serif; cursor: pointer; }
  .anp-zona:hover { border-color: var(--accent); color: var(--text); }
  .anp-zona input { display: none; }
  .anp-fila { display: flex; align-items: center; gap: 14px; padding: 12px 14px; border: 2px solid #2A2346; border-radius: 16px; background: var(--surface); margin-bottom: 8px; }
  .anp-fila.apagado { opacity: .55; }
  .anp-fila img { width: 72px; height: 72px; border-radius: 12px; object-fit: cover; flex-shrink: 0; background: #0c0a16; }
  .anp-tx { flex: 1; min-width: 0; }
  .anp-tx b { display: block; font: 900 15px Nunito, sans-serif; overflow-wrap: anywhere; }
  .anp-tx small { display: block; color: var(--text-dim); font-size: 12.5px; margin-top: 2px; overflow-wrap: anywhere; }
  .anp-num { text-align: right; font-size: 12.5px; color: var(--text-dim); white-space: nowrap; line-height: 1.5; }
  .anp-num b { color: var(--text); font: 900 16px Nunito, sans-serif; }
  .anp-bts { display: flex; gap: 6px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }
  .anp-bts .btn-ghost.rojo { color: var(--red); border-color: rgba(224,60,60,.4); }
  .anp-ayuda { color: var(--text-dim); font-size: 12.5px; margin-top: 6px; }
  .anp-quien { margin-top: 14px; padding: 10px 13px; border-radius: 12px; background: rgba(198,224,0,.08); border: 1px solid rgba(198,224,0,.25); color: var(--accent); font: 800 13.5px Nunito, sans-serif; }
  .anp-3 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 700px) { .anp-fila { flex-wrap: wrap; } .anp-num { text-align: left; } .anp-bts { width: 100%; } .anp-3 { grid-template-columns: 1fr; } .anp-up { flex-direction: column; align-items: stretch; } .anp-up .anp-prev { width: 100%; height: 200px; } }`;
  document.head.appendChild(st);
})();

function anpHoy() { return new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10); }
function anpFecha(s) { const d = new Date(s + 'T12:00:00'); return d.getDate() + ' ' + AGP_MES[d.getMonth()]; }
function anpRuta(url) { const m = /\/object\/public\/anuncios\/(.+)$/.exec(url || ''); return m ? decodeURIComponent(m[1]) : ''; }
function anpMiles(n) { return Number(n || 0).toLocaleString('es-PE'); }

async function cargarAnuncios() {
  const caja = $('anpList');
  caja.innerHTML = '<div class="loader">Cargando…</div>';
  let c;
  try { c = await MCAuth.listo; }
  catch (e) { caja.innerHTML = '<div class="state-msg error">No se pudo conectar con Supabase. Revisa tu internet.</div>'; return; }
  if (!MCAuth.usuario()) {
    caja.innerHTML = `<div class="state-msg al-login">Entra con tu cuenta de Google de administrador.
      <button class="btn-main" type="button" id="anpEntrar">Entrar con Google</button></div>`;
    $('anpEntrar').addEventListener('click', () => MCAuth.entrarGoogle());
    return;
  }
  const r = await c.rpc('anuncios_admin');
  if (r.error) {
    caja.innerHTML = `<div class="state-msg error">${esc(r.error.message || 'No se pudo cargar.')}<br>¿Ya corriste el archivo supabase/84-anuncios.sql?</div>`;
    return;
  }
  ANP.lista = r.data || [];
  pintarAnuncios();
}

function anpEstado(a) {
  const hoy = anpHoy();
  if (!a.activo) return ['Apagado', '#9A9A9A'];
  if (a.hasta < hoy) return ['Vencido', '#9A9A9A'];
  if (a.desde > hoy) return ['Programado', '#38BDF8'];
  return ['Activo', '#C6E000'];
}

function pintarAnuncios() {
  const vivos = ANP.lista.filter(a => anpEstado(a)[0] === 'Activo').length;
  $('anpStats').textContent = !ANP.lista.length ? 'Salen en ventana al entrar al inicio. El alumno toca la imagen para ir al link o la cierra con la X.'
    : (vivos ? vivos + (vivos === 1 ? ' anuncio activo hoy.' : ' anuncios activos hoy (se turnan: cada alumno ve uno al día).') : 'Ningún anuncio activo hoy.') + ' Vistas y clics son de alumnos únicos por día.';
  if (!ANP.lista.length) { $('anpList').innerHTML = '<div class="state-msg">Aún no tienes anuncios. Toca “Nuevo anuncio” y sube tu imagen.</div>'; return; }
  $('anpList').innerHTML = ANP.lista.map(a => {
    const e = anpEstado(a), t = ANP_TIPOS[a.tipo] || ANP_TIPOS.propio, seguro = ANP.borrar === a.id;
    const pct = a.vistas ? ' · ' + (Math.round(a.clics / a.vistas * 1000) / 10) + '%' : '';
    return `<div class="anp-fila${e[0] === 'Activo' || e[0] === 'Programado' ? '' : ' apagado'}">
      <img src="${esc(a.img)}" alt="" loading="lazy">
      <div class="anp-tx"><b>${esc(a.titulo)}</b>
        <small>${anpFecha(a.desde)} – ${anpFecha(a.hasta)} · ${ANP_FREC_CORTO[a.frecuencia] || a.frecuencia} · ${esc(anpQuien(a))}${a.tope ? ' · tope ' + anpMiles(a.tope) + ' vistas' : ''}${a.anunciante ? ' · ' + esc(a.anunciante) : ''}</small>
        <span class="agp-tag" style="background:#272041;color:${t[1]}">${a.tipo === 'patrocinado' ? 'Patrocinado' : a.tipo === 'aviso' ? 'Aviso' : 'Propio'}</span>
        <span class="agp-tag" style="background:#272041;color:${e[1]}">${e[0]}</span></div>
      <div class="anp-num"><b>${anpMiles(a.vistas)}</b> vistas · <b>${anpMiles(a.clics)}</b> clics${pct}<br>${anpMiles(a.alumnos)} alumnos · hoy ${anpMiles(a.hoy)}</div>
      <div class="anp-bts">
        <button class="btn-ghost" type="button" data-act="${a.id}">${a.activo ? 'Apagar' : 'Prender'}</button>
        <button class="btn-ghost" type="button" data-ed="${a.id}">Editar</button>
        <button class="btn-ghost rojo" type="button" data-bo="${a.id}">${seguro ? '¿Borrar? Toca otra vez' : 'Borrar'}</button>
      </div></div>`;
  }).join('');
}

/* ---------- Formulario ---------- */
const anpOps = (id, obj, col) => `<div class="agp-ops" id="${id}">${Object.keys(obj).map(k => `<button type="button" class="agp-op" data-v="${k}"${col && obj[k][1] ? ` style="--c:${obj[k][1]}"` : ''}>${Array.isArray(obj[k]) ? obj[k][0] : obj[k]}</button>`).join('')}</div>`;

$('anpForm').innerHTML = `<h3 id="anpFormTit">Nuevo anuncio</h3>
  <span class="agp-l">Imagen (cuadrada 1:1 o vertical 4:5; se guarda en WebP de 1080 px)</span>
  <div class="anp-up"><div class="anp-prev" id="anpPrev"></div>
    <label class="anp-zona" id="anpZona"><span id="anpZonaTx">Toca para elegir la imagen, arrástrala aquí o pégala (Ctrl+V).<br>PNG, JPG o WebP.</span><input type="file" accept="image/png,image/jpeg,image/webp" id="anpArchivo"></label></div>
  <label for="anpTitulo">Nombre (solo lo ves tú)</label><input class="inp" id="anpTitulo" maxlength="80" placeholder="Ej.: Descargas en PDF">
  <span class="agp-l">Tipo</span>${anpOps('anpTipos', ANP_TIPOS, true)}
  <div id="anpAnunCaja" hidden><label for="anpAnun">Nombre de la academia (sale como «Publicidad · …»)</label><input class="inp" id="anpAnun" maxlength="60" placeholder="Ej.: Academia Pitágoras"></div>
  <label for="anpLink">Link al tocar (opcional)</label><input class="inp" id="anpLink" maxlength="600" placeholder="https://wa.me/51917797543?text=Hola" inputmode="url">
  <div class="anp-ayuda">WhatsApp: https://wa.me/51 + número. Si lo dejas vacío, la imagen solo se cierra con la X.</div>
  <div class="anp-3"><div><label for="anpBoton">Texto del botón de abajo (opcional)</label><input class="inp" id="anpBoton" maxlength="30" placeholder="Ej.: Pedir mi código"></div>
    <div><span class="agp-l">Icono del botón</span>${anpOps('anpIconos', ANP_ICONOS)}</div></div>
  <div class="anp-3"><div><label for="anpDesde">Desde</label><input class="inp" id="anpDesde" type="date"></div>
    <div><label for="anpHasta">Hasta (incluido)</label><input class="inp" id="anpHasta" type="date"></div></div>
  <span class="agp-l">Cada cuánto lo ve un alumno</span>${anpOps('anpFrec', ANP_FREC)}
  <h3 style="margin-top:22px">¿A quién le sale?</h3>
  <div class="anp-ayuda" style="margin-top:0">Tiene que cumplir todo lo que elijas. Lo que dejes en «Todos» no filtra.</div>
  <span class="agp-l">Códigos</span>${anpOps('anpPub', ANP_PUB)}
  <span class="agp-l">Solo a quien NO tiene (ideal para vender: si ya lo compró, no le sale)</span>${anpOps('anpNoTiene', ANP_PROD)}
  <span class="agp-l">Solo a quien SÍ tiene alguno de</span>${anpOps('anpTiene', ANP_PROD)}
  <div class="anp-3"><div><span class="agp-l">Modalidad</span>${anpOps('anpMod', ANP_MOD)}</div>
    <div><span class="agp-l">Equipo</span>${anpOps('anpEquipo', ANP_EQUIPO)}</div></div>
  <div class="anp-3"><div><span class="agp-l">Cuenta</span>${anpOps('anpCuenta', ANP_CUENTA)}</div>
    <div id="anpDiasCaja"><label for="anpDias">Cuenta nueva = menos de (días)</label><input class="inp" id="anpDias" type="number" min="1" max="365" value="7"></div></div>
  <div class="anp-3"><div><label for="anpTope">Tope de vistas (opcional)</label><input class="inp" id="anpTope" type="number" min="1" placeholder="Ej.: 5000"></div>
    <div class="anp-ayuda" style="align-self:end">Al llegar a ese número de vistas se apaga solo. Sirve para venderle a una academia un paquete de vistas.</div></div>
  <div class="anp-quien" id="anpQuien"></div>
  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:16px"><input type="checkbox" id="anpActivo" checked> Prendido (sale en sus fechas)</label>
  <div class="agp-acc"><button class="btn-main" type="button" id="anpGuardar">Guardar</button><button class="btn-ghost" type="button" id="anpVer">Ver cómo sale</button><button class="btn-ghost" type="button" id="anpCancelar">Cancelar</button></div>`;

function anpMarcar() {
  [['anpTipos', 'tipo'], ['anpIconos', 'icono'], ['anpFrec', 'frecuencia'], ['anpPub', 'publico'], ['anpMod', 'modalidad'], ['anpCuenta', 'cuenta'], ['anpEquipo', 'equipo']].forEach(([id, k]) =>
    $(id).querySelectorAll('[data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === ANP[k])));
  [['anpNoTiene', 'noTiene'], ['anpTiene', 'tiene']].forEach(([id, k]) =>
    $(id).querySelectorAll('[data-v]').forEach(b => b.classList.toggle('on', ANP[k].includes(b.dataset.v))));
  $('anpAnunCaja').hidden = ANP.tipo !== 'patrocinado';
  $('anpDiasCaja').style.visibility = ANP.cuenta ? '' : 'hidden';
  $('anpQuien').textContent = 'Le sale a: ' + anpQuien({ publico: ANP.publico, segmento: anpSegmento() });
}
[['anpTipos', 'tipo'], ['anpIconos', 'icono'], ['anpFrec', 'frecuencia'], ['anpPub', 'publico'], ['anpMod', 'modalidad'], ['anpCuenta', 'cuenta'], ['anpEquipo', 'equipo']].forEach(([id, k]) =>
  $(id).addEventListener('click', ev => { const b = ev.target.closest('[data-v]'); if (b) { ANP[k] = b.dataset.v; anpMarcar(); } }));

[['anpNoTiene', 'noTiene', 'tiene'], ['anpTiene', 'tiene', 'noTiene']].forEach(([id, k, otro]) =>
  $(id).addEventListener('click', ev => {
    const b = ev.target.closest('[data-v]'); if (!b) return;
    const v = b.dataset.v, L = ANP[k];
    if (L.includes(v)) L.splice(L.indexOf(v), 1); else { L.push(v); if (ANP[otro].includes(v)) ANP[otro].splice(ANP[otro].indexOf(v), 1); }
    anpMarcar();
  }));
$('anpDias').addEventListener('input', () => anpMarcar());
function anpSegmento() {
  const s = {};
  if (ANP.noTiene.length) s.no_tiene = ANP.noTiene.slice();
  if (ANP.tiene.length) s.tiene = ANP.tiene.slice();
  if (ANP.modalidad) s.modalidad = ANP.modalidad;
  if (ANP.cuenta) { s.cuenta = ANP.cuenta; s.dias = Math.min(365, Math.max(1, Math.round(+$('anpDias').value || 7))); }
  if (ANP.equipo) s.equipo = ANP.equipo;
  return s;
}

function anpAbrir(a) {
  ANP.editando = a || null; ANP.img = null;
  ANP.tipo = a ? a.tipo : 'propio'; ANP.icono = a ? a.icono : 'whatsapp';
  ANP.frecuencia = a ? a.frecuencia : 'dia';
  const sg = (a && a.segmento) || {};
  // Los de antes guardaban Ordinario/CPU en "publico": pasan a Modalidad
  ANP.publico = a && ANP_PUB[a.publico] ? a.publico : 'todos';
  ANP.modalidad = sg.modalidad || (a && ANP_PUB_VIEJO[a.publico] ? a.publico : '');
  ANP.noTiene = (sg.no_tiene || []).slice(); ANP.tiene = (sg.tiene || []).slice();
  ANP.cuenta = sg.cuenta || ''; ANP.equipo = sg.equipo || '';
  $('anpDias').value = sg.dias || 7;
  $('anpTope').value = a && a.tope ? a.tope : '';
  const hoy = anpHoy(), mes = new Date(Date.now() - 5 * 3600e3 + 30 * 864e5).toISOString().slice(0, 10);
  $('anpFormTit').textContent = a ? 'Editar anuncio' : 'Nuevo anuncio';
  $('anpTitulo').value = a ? a.titulo : '';
  $('anpAnun').value = a && a.anunciante ? a.anunciante : '';
  $('anpLink').value = a && a.link ? a.link : '';
  $('anpBoton').value = a && a.boton ? a.boton : '';
  $('anpDesde').value = a ? a.desde : hoy;
  $('anpHasta').value = a ? a.hasta : mes;
  $('anpActivo').checked = a ? a.activo : true;
  $('anpPrev').style.backgroundImage = a ? `url("${a.img}")` : '';
  $('anpZonaTx').innerHTML = a ? 'Toca para cambiar la imagen (o déjala igual).' : 'Toca para elegir la imagen, arrástrala aquí o pégala (Ctrl+V).<br>PNG, JPG o WebP.';
  anpMarcar();
  $('anpForm').hidden = false;
  $('anpForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Se achica a 1080 px de ancho (sin recortar) y se guarda en WebP
async function anpPreparar(file) {
  if (!file || !/^image\//.test(file.type)) throw new Error('Ese archivo no es una imagen');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('No se pudo leer la imagen')); i.src = url; });
    const iw = img.naturalWidth, ih = img.naturalHeight;
    if (ih / iw > 2 || iw / ih > 2) throw new Error('Usa una imagen cuadrada o vertical (no tan alargada)');
    const f = Math.min(1, 1080 / iw), cw = Math.round(iw * f), ch = Math.round(ih * f);
    const c = document.createElement('canvas'); c.width = cw; c.height = ch;
    c.getContext('2d').drawImage(img, 0, 0, cw, ch);
    let blob = await canvasABlob(c, 'image/webp', 0.86), ext = 'webp';
    if (!blob || blob.type !== 'image/webp') { blob = await canvasABlob(c, 'image/jpeg', 0.88); ext = 'jpg'; }
    if (blob.size > 1000000) blob = await canvasABlob(c, ext === 'webp' ? 'image/webp' : 'image/jpeg', 0.7);
    if (blob.size > 1000000) throw new Error('La imagen sigue muy pesada; prueba con otra');
    return { blob, ext, url: URL.createObjectURL(blob), kb: Math.round(blob.size / 1024), chica: iw < 700 };
  } finally { URL.revokeObjectURL(url); }
}
async function anpElegir(file) {
  try {
    ANP.img = await anpPreparar(file);
    $('anpPrev').style.backgroundImage = `url("${ANP.img.url}")`;
    $('anpZonaTx').innerHTML = `Lista: ${ANP.img.kb} KB. ${ANP.img.chica ? '<b>Es pequeña, puede verse borrosa.</b> ' : ''}Toca para cambiarla.`;
    if (!$('anpTitulo').value.trim()) $('anpTitulo').value = file.name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').slice(0, 80);
  } catch (e) { toast(e.message, true); }
}
$('anpArchivo').addEventListener('change', e => { anpElegir(e.target.files[0]); e.target.value = ''; });
$('anpZona').addEventListener('dragover', e => e.preventDefault());
$('anpZona').addEventListener('drop', e => { e.preventDefault(); anpElegir(e.dataTransfer.files[0]); });
document.addEventListener('paste', e => {
  if ($('anpForm').hidden || $('tab-anuncios').hidden) return;
  const f = [...(e.clipboardData && e.clipboardData.files || [])].find(x => /^image\//.test(x.type));
  if (f) { e.preventDefault(); anpElegir(f); }
});

function anpDatos() {
  return { id: ANP.editando ? ANP.editando.id : null, titulo: $('anpTitulo').value.trim(), tipo: ANP.tipo,
    anunciante: ANP.tipo === 'patrocinado' ? $('anpAnun').value.trim() : '', link: $('anpLink').value.trim(),
    boton: $('anpBoton').value.trim(), icono: ANP.icono, desde: $('anpDesde').value, hasta: $('anpHasta').value,
    frecuencia: ANP.frecuencia, publico: ANP.publico, activo: $('anpActivo').checked, segmento: anpSegmento(), tope: +$('anpTope').value > 0 ? Math.round(+$('anpTope').value) : null };
}

// Vista previa: la misma ventana que ve el alumno
$('anpVer').addEventListener('click', () => {
  const p = anpDatos(), src = ANP.img ? ANP.img.url : ANP.editando && ANP.editando.img;
  if (!src) { toast('Primero elige la imagen', true); return; }
  if (!window.MCAnunciosVista) { toast('No se pudo abrir la vista previa', true); return; }
  MCAnunciosVista(Object.assign({}, p, { img: src, link: p.link || '' }));
});

$('anpNuevo').addEventListener('click', () => anpAbrir(null));
$('anpCancelar').addEventListener('click', () => { $('anpForm').hidden = true; });

$('anpGuardar').addEventListener('click', async () => {
  const p = anpDatos(), e = ANP.editando;
  if (!ANP.img && !e) { toast('Elige la imagen del anuncio', true); return; }
  if (!p.titulo) { toast('Ponle un nombre', true); return; }
  if (p.tipo === 'patrocinado' && !p.anunciante) { toast('Escribe el nombre de la academia', true); return; }
  if (p.link && !/^https:\/\/\S+$/.test(p.link)) { toast('El link debe empezar con https://', true); return; }
  if (p.boton && !p.link) { toast('El botón necesita un link', true); return; }
  if (!p.desde || !p.hasta) { toast('Elige las fechas', true); return; }
  if (p.hasta < p.desde) { toast('La fecha “hasta” es antes de “desde”', true); return; }
  const bt = $('anpGuardar'); bt.disabled = true;
  bt.innerHTML = '<span class="spin-s"></span> ' + (ANP.img ? 'Subiendo imagen…' : 'Guardando…');
  let subida = '';
  try {
    const c = await MCAuth.listo;
    p.img = e ? e.img : '';
    if (ANP.img) {
      subida = 'an-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + '.' + ANP.img.ext;
      const up = await c.storage.from('anuncios').upload(subida, ANP.img.blob, { contentType: ANP.img.blob.type, cacheControl: '31536000', upsert: false });
      if (up.error) throw up.error;
      p.img = c.storage.from('anuncios').getPublicUrl(subida).data.publicUrl;
    }
    bt.innerHTML = '<span class="spin-s"></span> Guardando…';
    const r = await c.rpc('guardar_anuncio', { p });
    if (r.error) throw r.error;
    subida = '';
    if (e && ANP.img && anpRuta(e.img)) c.storage.from('anuncios').remove([anpRuta(e.img)]).then(() => {}, () => {});
    toast(e ? 'Cambios guardados' : 'Anuncio guardado. Sale a los alumnos en sus fechas.');
    $('anpForm').hidden = true; ANP.img = null;
    await cargarAnuncios();
  } catch (err) {
    if (subida) MCAuth.listo.then(c => c.storage.from('anuncios').remove([subida])).then(() => {}, () => {});
    const m = err.message || 'error';
    toast(/no autorizado|row-level|policy/i.test(m) ? 'Solo el administrador puede guardar anuncios' : /bucket/i.test(m) ? 'Falta correr supabase/84-anuncios.sql' : 'No se pudo guardar: ' + m, true);
  } finally { bt.disabled = false; bt.textContent = 'Guardar'; }
});

$('anpList').addEventListener('click', async ev => {
  const ed = ev.target.closest('[data-ed]');
  if (ed) { anpAbrir(ANP.lista.find(x => String(x.id) === ed.dataset.ed)); return; }
  const ac = ev.target.closest('[data-act]');
  if (ac) {
    const a = ANP.lista.find(x => String(x.id) === ac.dataset.act); if (!a) return;
    ac.disabled = true;
    try {
      const c = await MCAuth.listo;
      const r = await c.rpc('activar_anuncio', { p_id: a.id, p_activo: !a.activo });
      if (r.error) throw r.error;
      toast(a.activo ? 'Anuncio apagado' : 'Anuncio prendido');
      await cargarAnuncios();
    } catch (e) { toast('No se pudo cambiar: ' + (e.message || 'error'), true); ac.disabled = false; }
    return;
  }
  const bo = ev.target.closest('[data-bo]');
  if (!bo) return;
  const id = +bo.dataset.bo;
  if (ANP.borrar !== id) { ANP.borrar = id; pintarAnuncios(); return; }
  ANP.borrar = null;
  const a = ANP.lista.find(x => x.id === id);
  try {
    const c = await MCAuth.listo;
    const r = await c.rpc('borrar_anuncio', { p_id: id });
    if (r.error) throw r.error;
    if (a && anpRuta(a.img)) c.storage.from('anuncios').remove([anpRuta(a.img)]).then(() => {}, () => {});
    toast('Anuncio borrado');
    await cargarAnuncios();
  } catch (e) { toast('No se pudo borrar: ' + (e.message || 'error'), true); pintarAnuncios(); }
});
