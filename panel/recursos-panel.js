/* =========================================================
   Panel · Recursos
   Fondos de perfil con imagen para Mi colección, sin tocar código.
   - La imagen se recorta a 4:1 y se achica a 1200×300 WebP en el
     navegador, y va al Storage de Supabase (carpeta «recursos»).
   - Los 4 colores del fondo (foto de perfil, degradados) se sacan
     de la imagen.
   - Se gana con las reglas de Mi colección: para todos, racha,
     rango en una semana o regalo (a todos o a ciertos correos).
   Datos: supabase/40-recursos.sql (guardar_recurso, recursos_admin,
   borrar_recurso) y 31-coleccion.sql (regalar_item).
   ========================================================= */
const REC = { lista: [], editando: null, img: null, regla: 'gratis', para: 'todos', borrar: null, regalar: null };
const REC_W = 1200, REC_H = 300;
const REC_RAREZA = {
  comun: { nom: 'Común', c: '#A99FC8' }, raro: { nom: 'Raro', c: '#1CB0F6' }, epico: { nom: 'Épico', c: '#CE82FF' },
  legendario: { nom: 'Legendario', c: '#FFC800' }, evento: { nom: 'Evento', c: '#FF4B4B' }
};
// Topes de XP en una semana de cada rango (los mismos de assets/coleccion.js)
const REC_RANGO_XP = [20, 1500, 4000, 8000, 12000];
const recRango = n => window.MCRango ? MCRango.nombre(MCRango.nivel(REC_RANGO_XP[n])) : 'Rango ' + (n + 1);

(function estilosRecursos() {
  const st = document.createElement('style');
  st.textContent = `
  .rec-zona { position: relative; display: grid; place-items: center; aspect-ratio: 4 / 1; min-height: 90px; border-radius: 14px; border: 2px dashed #3A3260; background: #0f0b1e; color: var(--text-dim); font: 800 13px/1.4 Nunito, sans-serif; text-align: center; cursor: pointer; overflow: hidden; padding: 10px; }
  .rec-zona.sobre { border-color: var(--accent); color: var(--accent); }
  .rec-zona input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
  .rec-vista { position: relative; aspect-ratio: 4 / 1; border-radius: 14px; overflow: hidden; background: #0f0b1e center / cover no-repeat; }
  .rec-vista .tj { position: absolute; left: 4%; top: 50%; transform: translateY(-50%); display: flex; align-items: center; gap: 10px; }
  .rec-vista .tj i { width: 46px; height: 46px; border-radius: 12px; border: 3px solid #FFC800; background: radial-gradient(120% 120% at 80% 0%, var(--f1), var(--f2) 70%, #0d0820) center / cover; }
  .rec-vista .tj b { display: block; font: 800 20px/1 "Barlow Condensed", "Arial Narrow", sans-serif; letter-spacing: .04em; text-transform: uppercase; color: #fff; text-shadow: 0 2px 6px rgba(0,0,0,.5); }
  .rec-vista .tj small { display: block; font: 800 12px/1 "Barlow Condensed", "Arial Narrow", sans-serif; letter-spacing: .06em; text-transform: uppercase; color: #e6e0ff; margin-top: 4px; }
  .rec-vista .x { position: absolute; right: 8px; top: 8px; padding: 5px 9px; border-radius: 9px; border: 0; background: rgba(0,0,0,.55); color: #fff; font: 800 12px Nunito, sans-serif; cursor: pointer; }
  .rec-info { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 8px; font: 700 12px Nunito, sans-serif; color: var(--text-faint); }
  .rec-info span.c { width: 18px; height: 18px; border-radius: 6px; border: 2px solid rgba(255,255,255,.15); }
  .rec-form textarea.inp { min-height: 74px; resize: vertical; font-family: inherit; line-height: 1.45; }
  .rec-sub { margin-top: 10px; padding: 12px; border-radius: 14px; background: rgba(255,255,255,.03); border: 2px solid #2A2346; }
  .rec-sub label:first-child, .rec-sub .agp-l:first-child { margin-top: 0; }
  .rec-lista { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
  .rec-it { border: 2px solid #2A2346; border-bottom-width: 4px; border-radius: 16px; background: var(--surface); overflow: hidden; }
  .rec-it.oculto { opacity: .55; }
  .rec-it .im { aspect-ratio: 4 / 1; background: #0f0b1e center / cover no-repeat; }
  .rec-it .tx { padding: 10px 12px 4px; }
  .rec-it .tx b { display: block; font: 900 15px Nunito, sans-serif; overflow-wrap: anywhere; }
  .rec-it .tx small { display: block; color: var(--text-dim); font-size: 12.5px; margin-top: 2px; }
  .rec-it .tag { display: inline-block; margin-top: 6px; margin-right: 4px; font: 900 10.5px Nunito, sans-serif; letter-spacing: .06em; text-transform: uppercase; border-radius: 8px; padding: 3px 7px; color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); }
  .rec-it .bts { display: flex; gap: 6px; flex-wrap: wrap; padding: 8px 12px 12px; }
  .rec-it .bts .btn-ghost { padding: 6px 10px; font-size: 12.5px; }
  .rec-it .bts .btn-ghost.rojo { color: var(--red); border-color: rgba(224,60,60,.4); }
  .rec-it .rg { padding: 0 12px 12px; }
  .rec-it .rg textarea.inp { min-height: 60px; font-family: inherit; }
  .rec-it .rg .inp { margin-bottom: 8px; }
  .rec-vacio { padding: 18px; border-radius: 16px; border: 2px dashed #2A2346; color: var(--text-dim); font: 700 13.5px/1.5 Nunito, sans-serif; text-align: center; }
  @media (max-width: 560px) { .rec-vista .tj { gap: 7px; } .rec-vista .tj i { width: 30px; height: 30px; border-width: 2px; border-radius: 8px; } .rec-vista .tj b { font-size: 14px; } .rec-vista .tj small { font-size: 9.5px; } .rec-vista .x { top: auto; bottom: 6px; right: 6px; padding: 3px 7px; font-size: 11px; } }
  #tab-recursos h2.rec-h { font: 900 17px Nunito, sans-serif; margin: 6px 0 10px; }`;
  document.head.appendChild(st);
})();

/* ---------- Imagen: recorte 4:1, WebP y colores ---------- */
const recHex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const recMezcla = (c, k) => c.map(v => v * (1 - k));
// Colores del fondo: [principal vivo, medio, borde, oscuro] (el mismo orden que los fondos de assets/coleccion.js)
function recColores(ctx, w, h) {
  const d = ctx.getImageData(0, 0, w, h).data, cols = 8, suma = [], todo = [0, 0, 0];
  for (let i = 0; i < cols; i++) suma.push([0, 0, 0, 0]);
  for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) {
    const k = (y * w + x) * 4, s = suma[Math.min(cols - 1, Math.floor(x / w * cols))];
    s[0] += d[k]; s[1] += d[k + 1]; s[2] += d[k + 2]; s[3]++;
  }
  let vivo = null, mejor = -1;
  suma.forEach(s => {
    const c = [s[0] / s[3], s[1] / s[3], s[2] / s[3]];
    todo[0] += c[0] / cols; todo[1] += c[1] / cols; todo[2] += c[2] / cols;
    const sat = Math.max(...c) - Math.min(...c), luz = (Math.max(...c) + Math.min(...c)) / 2;
    const puntos = sat - Math.abs(luz - 140) * .35;
    if (puntos > mejor) { mejor = puntos; vivo = c; }
  });
  return [recHex(...vivo), recHex(...recMezcla(todo, .35)), recHex(...recMezcla(vivo, .15)), recHex(...recMezcla(todo, .62))];
}
async function recPreparar(file) {
  if (!file || !/^image\//.test(file.type)) throw new Error('Ese archivo no es una imagen');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('No se pudo leer la imagen')); i.src = url; });
    const iw = img.naturalWidth, ih = img.naturalHeight;
    // Recorte al centro, como se ve en la tarjeta (4:1)
    let sw = iw, sh = iw / 4;
    if (sh > ih) { sh = ih; sw = ih * 4; }
    const c = document.createElement('canvas'); c.width = REC_W; c.height = REC_H;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, REC_W, REC_H);
    const tema = recColores(ctx, REC_W, REC_H);
    let blob = await canvasABlob(c, 'image/webp', 0.82), ext = 'webp';
    if (!blob || blob.type !== 'image/webp') { blob = await canvasABlob(c, 'image/jpeg', 0.85); ext = 'jpg'; }
    if (blob.size > 500000) throw new Error('La imagen sigue muy pesada; prueba con otra');
    return { blob, ext, tema, url: URL.createObjectURL(blob), kb: Math.round(blob.size / 1024), chica: iw < REC_W * .75 };
  } finally { URL.revokeObjectURL(url); }
}

/* ---------- Carga ---------- */
async function cargarRecursos(soloLista) {
  const caja = $('recCuerpo');
  let cliente;
  try { cliente = await MCAuth.listo; }
  catch (e) { caja.innerHTML = '<div class="state-msg error">No se pudo conectar con Supabase. Revisa tu internet.</div>'; return; }
  if (!MCAuth.usuario()) {
    caja.innerHTML = `<div class="state-msg al-login">Entra con tu cuenta de Google de administrador.
      <button class="btn-main" type="button" id="recEntrar">Entrar con Google</button></div>`;
    $('recEntrar').addEventListener('click', () => MCAuth.entrarGoogle());
    return;
  }
  const r = await cliente.rpc('recursos_admin');
  if (r.error) {
    caja.innerHTML = /no autorizado/i.test(r.error.message || '') ? '<div class="state-msg error">Tu cuenta no tiene permiso para subir recursos.</div>'
      : `<div class="state-msg error">No se pudieron leer los recursos. ¿Ya corriste <b>supabase/40-recursos.sql</b>?<br><small>${esc(r.error.message || '')}</small></div>`;
    return;
  }
  REC.lista = r.data || [];
  if (soloLista === true && $('recListaC')) recPintarLista(); else pintarRecursos();
}

function recReglaTxt(g) {
  g = g || {};
  if (g.tipo === 'gratis') return 'Para todos';
  if (g.tipo === 'racha') return 'Racha de ' + g.n + ' días';
  if (g.tipo === 'rango') return 'Llegar a ' + recRango(g.n) + ' en una semana';
  return 'Regalo';
}

/* ---------- Formulario ---------- */
function recFormHtml() {
  const e = REC.editando, g = e ? e.regla || {} : {};
  const tit = e ? 'Editar «' + esc(e.nom) + '»' : 'Nuevo fondo de perfil';
  return `<div class="agp-form rec-form" id="recForm">
    <h3>${tit}</h3>
    <p class="hint">Sale en <b>Mi colección → Fondos</b>, en la tarjeta del perfil y en la de arriba de la web.</p>
    <span class="agp-l">Imagen (horizontal 4:1, ideal 1200×300 o más grande)</span>
    <div id="recImg"></div>
    <div class="agp-2">
      <div><label for="recNom">Nombre</label><input class="inp" id="recNom" maxlength="40" placeholder="Ej.: Atardecer en Huacho"></div>
      <div><label for="recRareza">Rareza</label><select class="inp" id="recRareza">${Object.keys(REC_RAREZA).map(k => `<option value="${k}">${REC_RAREZA[k].nom}</option>`).join('')}</select></div>
    </div>
    <label for="recDesc">Descripción (opcional)</label>
    <input class="inp" id="recDesc" maxlength="140" placeholder="Ej.: Para los que llegaron a 30 días de racha.">
    <span class="agp-l">Cómo se gana</span>
    <div class="agp-ops" id="recReglas">
      <button type="button" class="agp-op" data-r="gratis">Para todos</button>
      <button type="button" class="agp-op" data-r="regalo">Regalo</button>
      <button type="button" class="agp-op" data-r="racha">Racha</button>
      <button type="button" class="agp-op" data-r="rango">Rango semanal</button>
    </div>
    <div class="rec-sub" id="recSub"></div>
    <label class="tmp-sw" style="display:flex;align-items:center;gap:12px;margin-top:16px;cursor:pointer;font:800 14px Nunito,sans-serif">
      <input type="checkbox" id="recVisible" style="width:20px;height:20px;accent-color:#C6E000"><span>Que se vea en Mi colección<small style="display:block;color:var(--text-dim);font-weight:700;font-size:12px">Apágalo para prepararlo antes y mostrarlo después.</small></span></label>
    <div class="agp-acc">
      <button class="btn-main" type="button" id="recGuardar">${e ? 'Guardar cambios' : 'Publicar fondo'}</button>
      ${e ? '<button class="btn-ghost" type="button" id="recCancelar">Cancelar</button>' : ''}
    </div>
  </div>`;
}

function recSubHtml() {
  const e = REC.editando, g = e ? e.regla || {} : {};
  if (REC.regla === 'gratis') return '<p class="hint" style="margin:0">Lo tienen todos los alumnos desde que lo publicas, también los que se registren después.</p>';
  if (REC.regla === 'racha') return `<label for="recN">Días de racha</label><input class="inp" id="recN" type="number" min="1" max="1000" value="${g.tipo === 'racha' ? g.n : 7}">
    <p class="hint" style="margin:8px 0 0">Lo gana solo quien llega (o ya llegó) a esa racha. Al ganarlo le sale la celebración.</p>`;
  if (REC.regla === 'rango') return `<label for="recRg">Rango</label><select class="inp" id="recRg">${REC_RANGO_XP.map((x, i) => `<option value="${i}"${g.tipo === 'rango' && +g.n === i ? ' selected' : ''}>${esc(recRango(i))} (${x.toLocaleString('es-PE')} XP en una semana)</option>`).join('')}</select>
    <p class="hint" style="margin:8px 0 0">Lo gana quien cierra (o ya cerró) una semana en ese rango o más.</p>`;
  return `${e ? '<p class="hint" style="margin:0 0 4px">Para entregarlo a más alumnos usa <b>Regalar</b> en la lista de abajo.</p>' : `
    <span class="agp-l">A quién se lo entregas ahora</span>
    <div class="agp-ops" id="recPara">
      <button type="button" class="agp-op${REC.para === 'todos' ? ' on' : ''}" data-p="todos">Todos los alumnos con cuenta</button>
      <button type="button" class="agp-op${REC.para === 'correos' ? ' on' : ''}" data-p="correos">Solo a estos correos</button>
      <button type="button" class="agp-op${REC.para === 'nadie' ? ' on' : ''}" data-p="nadie">Nadie por ahora</button>
    </div>
    <div id="recCorreosC"${REC.para === 'correos' ? '' : ' hidden'}><label for="recCorreos">Correos (uno por línea o separados por coma)</label><textarea class="inp" id="recCorreos" placeholder="alumno@gmail.com"></textarea></div>
    <div id="recMsjC"${REC.para === 'nadie' ? ' hidden' : ''}><label for="recMsj">Mensaje (opcional)</label><input class="inp" id="recMsj" maxlength="120" placeholder="Ej.: ¡Gracias por estudiar con nosotros!"></div>
    <p class="hint" style="margin:8px 0 0">«Todos» es para los que ya tienen cuenta; los nuevos no lo reciben. Si quieres que lo tengan todos siempre, elige <b>Para todos</b>.</p>`}`;
}

function recPintarImg() {
  const z = $('recImg'), e = REC.editando;
  const src = REC.img ? REC.img.url : e ? e.img : '';
  const tema = REC.img ? REC.img.tema : e ? e.tema : null;
  if (!src) {
    z.innerHTML = `<label class="rec-zona" id="recZona"><span>Toca para elegir una imagen, arrástrala aquí o pégala (Ctrl+V).<br>PNG, JPG o WebP. Se recorta al centro y se guarda en WebP.</span><input type="file" accept="image/png,image/jpeg,image/webp" id="recArchivo"></label>`;
    const zona = $('recZona');
    $('recArchivo').addEventListener('change', ev => recRecibir(ev.target.files[0]));
    zona.addEventListener('dragover', ev => { ev.preventDefault(); zona.classList.add('sobre'); });
    zona.addEventListener('dragleave', () => zona.classList.remove('sobre'));
    zona.addEventListener('drop', ev => { ev.preventDefault(); zona.classList.remove('sobre'); recRecibir(ev.dataTransfer.files[0]); });
    return;
  }
  const nom = ($('recNom') && $('recNom').value.trim()) || 'Tu nombre';
  z.innerHTML = `<div class="rec-vista" style="background-image:linear-gradient(90deg,rgba(0,0,0,.38),rgba(0,0,0,0) 60%),url(&quot;${esc(src)}&quot;);--f1:${tema[0]};--f2:${tema[3]}">
      <div class="tj"><i></i><span><b id="recVNom">${esc(nom)}</b><small>Así se ve en la tarjeta</small></span></div>
      <button type="button" class="x" id="recCambiar">Cambiar imagen</button></div>
    <div class="rec-info">Colores sacados de la imagen: ${tema.map(c => `<span class="c" style="background:${c}" title="${c}"></span>`).join('')}
      ${REC.img ? ' · ' + REC.img.kb + ' KB' + (REC.img.chica ? ' · <b style="color:#FFC800">la imagen es chica, puede verse borrosa</b>' : '') : ''}</div>`;
  $('recCambiar').addEventListener('click', () => {
    if (REC.img) URL.revokeObjectURL(REC.img.url);
    REC.img = null;
    if (REC.editando) REC.editando = Object.assign({}, REC.editando, { img: '' });
    recPintarImg();
  });
}

async function recRecibir(file) {
  try {
    const prev = await recPreparar(file);
    if (REC.img) URL.revokeObjectURL(REC.img.url);
    REC.img = prev;
    recPintarImg();
  } catch (e) { toast(e.message || 'No se pudo leer la imagen', true); }
}
// Pegar con Ctrl+V mientras se ve el formulario
document.addEventListener('paste', ev => {
  if ($('tab-recursos').hidden || !$('recForm')) return;
  const it = [...(ev.clipboardData ? ev.clipboardData.items : [])].find(x => x.kind === 'file' && /^image\//.test(x.type));
  if (!it) return;
  ev.preventDefault();
  recRecibir(it.getAsFile());
});

function recMarcarRegla() {
  document.querySelectorAll('#recReglas [data-r]').forEach(b => b.classList.toggle('on', b.dataset.r === REC.regla));
  $('recSub').innerHTML = recSubHtml();
  const pa = $('recPara');
  if (pa) pa.addEventListener('click', ev => {
    const b = ev.target.closest('[data-p]'); if (!b) return;
    REC.para = b.dataset.p;
    pa.querySelectorAll('[data-p]').forEach(x => x.classList.toggle('on', x === b));
    $('recCorreosC').hidden = REC.para !== 'correos';
    $('recMsjC').hidden = REC.para === 'nadie';
  });
}

/* ---------- Lista ---------- */
function recItemHtml(x) {
  const R = REC_RAREZA[x.rareza] || REC_RAREZA.comun, seguro = REC.borrar === x.id;
  const datos = [x.regla && x.regla.tipo === 'regalo' ? x.regalados + ' lo recibieron' : '', x.puestos + ' lo llevan puesto'].filter(Boolean).join(' · ');
  return `<div class="rec-it${x.visible ? '' : ' oculto'}">
    <div class="im" style="background-image:url(&quot;${esc(x.img)}&quot;)"></div>
    <div class="tx"><b>${esc(x.nom)}</b><small>${esc(recReglaTxt(x.regla))} · ${datos}</small>
      <span class="tag" style="--c:${R.c}">${R.nom}</span>${x.visible ? '' : '<span class="tag" style="--c:#8a83a8">Oculto</span>'}</div>
    <div class="bts">
      <button class="btn-ghost" type="button" data-ed="${esc(x.id)}">Editar</button>
      ${x.regla && x.regla.tipo === 'gratis' ? '' : `<button class="btn-ghost" type="button" data-rg="${esc(x.id)}">Regalar</button>`}
      <button class="btn-ghost" type="button" data-vi="${esc(x.id)}">${x.visible ? 'Ocultar' : 'Mostrar'}</button>
      <button class="btn-ghost rojo" type="button" data-bo="${esc(x.id)}">${seguro ? '¿Borrar? Toca otra vez' : 'Borrar'}</button>
    </div>
    ${REC.regalar === x.id ? `<div class="rg">
      <textarea class="inp" id="recRgCorreos" placeholder="Correos, uno por línea. Vacío = a todos los alumnos con cuenta."></textarea>
      <input class="inp" id="recRgMsj" maxlength="120" placeholder="Mensaje (opcional)">
      <button class="btn-main" type="button" data-rgok="${esc(x.id)}">Entregar</button>
    </div>` : ''}
  </div>`;
}

function pintarRecursos() {
  const e = REC.editando;
  $('recCuerpo').innerHTML = recFormHtml() + '<h2 class="rec-h">Fondos subidos</h2><div id="recListaC"></div>';
  $('recListaC').addEventListener('click', recAccionLista);
  recPintarLista();
  REC.regla = e ? (e.regla && e.regla.tipo) || 'gratis' : REC.regla;
  $('recNom').value = e ? e.nom || '' : '';
  $('recRareza').value = e ? e.rareza || 'comun' : 'comun';
  $('recDesc').value = e ? e.descr || '' : '';
  $('recVisible').checked = e ? e.visible !== false : true;
  recPintarImg();
  recMarcarRegla();
  $('recNom').addEventListener('input', () => { const v = $('recVNom'); if (v) v.textContent = $('recNom').value.trim() || 'Tu nombre'; });
  $('recReglas').addEventListener('click', ev => { const b = ev.target.closest('[data-r]'); if (b) { REC.regla = b.dataset.r; recMarcarRegla(); } });
  $('recGuardar').addEventListener('click', guardarRecurso);
  if ($('recCancelar')) $('recCancelar').addEventListener('click', () => { REC.editando = null; REC.img = null; REC.regla = 'gratis'; pintarRecursos(); });
}
function recPintarLista() {
  $('recListaC').innerHTML = REC.lista.length ? `<div class="rec-lista">${REC.lista.map(recItemHtml).join('')}</div>`
    : '<div class="rec-vacio">Todavía no subiste ningún fondo. Sube el primero arriba.</div>';
}

const recCorreos = t => String(t || '').split(/[\s,;]+/).map(x => x.trim().toLowerCase()).filter(x => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x));
const recRuta = url => (String(url || '').split('/object/public/recursos/')[1] || '').split('?')[0];

async function guardarRecurso() {
  const e = REC.editando, nom = $('recNom').value.trim();
  if (!REC.img && !(e && e.img)) { toast('Falta la imagen', true); return; }
  if (!nom) { toast('Ponle un nombre', true); $('recNom').focus(); return; }
  const regla = { tipo: REC.regla };
  if (REC.regla === 'racha') { regla.n = parseInt($('recN').value, 10); if (!(regla.n >= 1 && regla.n <= 1000)) { toast('Los días de racha van de 1 a 1000', true); return; } }
  if (REC.regla === 'rango') regla.n = parseInt($('recRg').value, 10);
  const entregar = !e && REC.regla === 'regalo' && REC.para !== 'nadie';
  const correos = entregar && REC.para === 'correos' ? recCorreos($('recCorreos').value) : null;
  if (entregar && REC.para === 'correos' && !correos.length) { toast('Escribe al menos un correo', true); return; }
  const bt = $('recGuardar');
  bt.disabled = true; bt.innerHTML = '<span class="spin-s"></span> ' + (REC.img ? 'Subiendo imagen…' : 'Guardando…');
  try {
    const c = await MCAuth.listo;
    const id = e ? e.id : 'rec-' + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 6);
    let img = e ? e.img : '', tema = e ? e.tema : null, vieja = '';
    if (REC.img) {
      const ruta = 'fondos/' + id + '-' + Date.now().toString(36) + '.' + REC.img.ext;
      const up = await c.storage.from('recursos').upload(ruta, REC.img.blob, { contentType: REC.img.blob.type, cacheControl: '31536000', upsert: false });
      if (up.error) throw up.error;
      img = c.storage.from('recursos').getPublicUrl(ruta).data.publicUrl;
      tema = REC.img.tema;
      if (e && REC.editando.imgAntes) vieja = recRuta(REC.editando.imgAntes);
    }
    bt.innerHTML = '<span class="spin-s"></span> Guardando…';
    const r = await c.rpc('guardar_recurso', { p: { id, espacio: 'racha', nom, rareza: $('recRareza').value, img, tema, descr: $('recDesc').value.trim(), regla, visible: $('recVisible').checked } });
    if (r.error) throw r.error;
    if (vieja) c.storage.from('recursos').remove([vieja]).then(() => {}, () => {});
    let msg = e ? 'Cambios guardados' : 'Fondo publicado: ya sale en Mi colección';
    if (entregar) {
      const g = await c.rpc('regalar_item', { p_item: id, p_emails: correos, p_origen: 'regalo', p_mensaje: $('recMsj').value.trim() || null });
      if (g.error) throw g.error;
      msg = 'Fondo publicado y entregado a ' + (g.data || 0) + ' alumno' + (g.data === 1 ? '' : 's');
    }
    toast(msg);
    if (REC.img) URL.revokeObjectURL(REC.img.url);
    REC.img = null; REC.editando = null; REC.regla = 'gratis'; REC.para = 'todos';
    cargarRecursos();
  } catch (err) {
    toast('No se pudo guardar: ' + (err.message || 'error'), true);
    bt.disabled = false; bt.textContent = e ? 'Guardar cambios' : 'Publicar fondo';
  }
}

async function recAccionLista(ev) {
  const b = ev.target.closest('button'); if (!b) return;
  const buscar = id => REC.lista.find(x => x.id === id);
  if (b.dataset.ed) {
    const x = buscar(b.dataset.ed);
    REC.editando = Object.assign({}, x, { imgAntes: x.img }); REC.img = null; REC.borrar = null; REC.regalar = null;
    pintarRecursos(); window.scrollTo(0, 0); return;
  }
  if (b.dataset.rg) { REC.regalar = REC.regalar === b.dataset.rg ? null : b.dataset.rg; REC.borrar = null; recPintarLista(); return; }
  const c = await MCAuth.listo;
  if (b.dataset.rgok) {
    const correos = recCorreos($('recRgCorreos').value), txt = $('recRgCorreos').value.trim();
    if (txt && !correos.length) { toast('Esos correos no se entienden', true); return; }
    b.disabled = true;
    const g = await c.rpc('regalar_item', { p_item: b.dataset.rgok, p_emails: correos.length ? correos : null, p_origen: 'regalo', p_mensaje: $('recRgMsj').value.trim() || null });
    if (g.error) { toast('No se pudo entregar: ' + g.error.message, true); b.disabled = false; return; }
    toast(g.data ? 'Entregado a ' + g.data + ' alumno' + (g.data === 1 ? '' : 's') : 'Ya lo tenían todos');
    REC.regalar = null; cargarRecursos(true); return;
  }
  if (b.dataset.vi) {
    const x = buscar(b.dataset.vi);
    const r = await c.rpc('guardar_recurso', { p: Object.assign({}, x, { visible: !x.visible }) });
    if (r.error) { toast('No se pudo cambiar: ' + r.error.message, true); return; }
    toast(x.visible ? 'Oculto: ya no sale en Mi colección' : 'Ya sale en Mi colección');
    cargarRecursos(true); return;
  }
  if (b.dataset.bo) {
    if (REC.borrar !== b.dataset.bo) { REC.borrar = b.dataset.bo; REC.regalar = null; recPintarLista(); return; }
    const x = buscar(b.dataset.bo);
    REC.borrar = null;
    const r = await c.rpc('borrar_recurso', { p_id: x.id });
    if (r.error) { toast('No se pudo borrar: ' + r.error.message, true); recPintarLista(); return; }
    const ruta = recRuta(x.img);
    if (ruta) c.storage.from('recursos').remove([ruta]).then(() => {}, () => {});
    toast('Fondo borrado; quien lo llevaba vuelve al de siempre');
    if (REC.editando && REC.editando.id === x.id) { REC.editando = null; cargarRecursos(); } else cargarRecursos(true);
  }
}
