/* =========================================================
   Panel · Recursos
   Lo de Mi colección que se sube sin tocar código: fondos de perfil,
   fotos de perfil, pines, marcos, cuadros de racha y títulos.
   - La imagen se recorta al centro y se achica en el navegador
     (WebP; las que tienen partes transparentes no pierden el fondo),
     y va al Storage de Supabase (carpeta «recursos»).
   - Los colores (fondo detrás de la foto, círculo del pin) se sacan
     de la imagen; los marcos sin imagen y los cuadros de racha se
     arman con colores.
   - Se gana con las reglas de Mi colección: para todos, racha,
     rango en una semana o regalo (a todos o a ciertos correos).
   Datos: supabase/40-recursos.sql y 41-recursos-coleccion.sql
   (guardar_recurso, recursos_admin, borrar_recurso) y 31-coleccion.sql (regalar_item).
   ========================================================= */
const REC = { lista: [], editando: null, img: null, tipo: 'racha', marcoCon: 'colores', regla: 'gratis', para: 'todos', borrar: null, regalar: null, filtro: '' };
// Cada tipo: tamaño de la imagen (w×h) y dónde sale
const REC_TIPOS = {
  racha: { nom: 'Fondo de perfil', plural: 'Fondos', w: 1200, h: 300, img: true, donde: '<b>Mi colección → Fondos</b>, en la tarjeta del perfil y en la de arriba de la web.', medida: 'horizontal 4:1, ideal 1200×300 o más grande', ej: 'Atardecer en Huacho' },
  avatar: { nom: 'Foto de perfil', plural: 'Fotos', w: 512, h: 512, img: true, donde: '<b>Mi colección → Perfil</b>: es la foto del alumno en su tarjeta, los tops y los duelos.', medida: 'cuadrada, ideal 512×512; si es PNG sin fondo se ve encima del fondo del alumno', ej: 'Búho ingeniero' },
  pines: { nom: 'Pin', plural: 'Pines', w: 256, h: 256, img: true, donde: '<b>Mi colección → Pines</b>: va en la vitrina del perfil (hasta 3) y en la tarjeta.', medida: 'cuadrada, ideal 256×256 y mejor PNG sin fondo; el círculo toma sus colores', ej: 'Ingresante 2027' },
  marco: { nom: 'Marco', plural: 'Marcos', w: 400, h: 400, img: 'opcional', donde: '<b>Mi colección → Marcos</b>: el borde de la foto en la tarjeta y el perfil.', medida: 'una textura cuadrada (oro, madera, mármol…); se ve solo el borde', ej: 'Esmeralda' },
  cuadro: { nom: 'Cuadro de racha', plural: 'Rachas', donde: '<b>Mi colección → Racha</b>: el cuadro de la racha en el perfil.', ej: 'Fuego verde' },
  titulo: { nom: 'Título', plural: 'Títulos', donde: '<b>Mi colección → Títulos</b>: sale debajo del nombre en la tarjeta y el perfil.', ej: 'Rey del álgebra' }
};
const recTipo = () => REC_TIPOS[REC.tipo];
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
  #tab-recursos h2.rec-h { font: 900 17px Nunito, sans-serif; margin: 6px 0 10px; }
  .rec-zona.cuadrada { aspect-ratio: auto; min-height: 150px; }
  .rec-mini { position: relative; display: flex; align-items: center; justify-content: center; gap: 22px; flex-wrap: wrap; min-height: 150px; padding: 16px; border-radius: 14px; background: radial-gradient(120% 120% at 50% 0%, #2a1f55, #0f0b1e 70%); }
  .rec-mini .x { position: absolute; right: 8px; top: 8px; padding: 5px 9px; border-radius: 9px; border: 0; background: rgba(0,0,0,.55); color: #fff; font: 800 12px Nunito, sans-serif; cursor: pointer; }
  .rec-mini .pie { display: block; margin-top: 6px; font: 800 11px Nunito, sans-serif; color: var(--text-dim); text-align: center; }
  .rec-av { width: 96px; height: 96px; border-radius: 22%; overflow: hidden; display: grid; place-items: center; background: radial-gradient(120% 120% at 80% 0%, var(--f1, #5b34b8), var(--f2, #1a0f40) 70%, #0d0820); box-shadow: inset 0 -5px 0 rgba(0,0,0,.25); }
  .rec-av img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .rec-av.chico { width: 46px; height: 46px; border-radius: 12px; }
  .rec-pin { width: 92px; height: 92px; border-radius: 50%; display: grid; place-items: center; background: radial-gradient(circle at 35% 30%, rgba(255,255,255,.25), transparent 45%), var(--pf); border: 5px solid var(--pb); box-shadow: inset 0 -6px 0 rgba(0,0,0,.25), 0 4px 0 rgba(0,0,0,.3); }
  .rec-pin img { width: 68%; height: 68%; object-fit: contain; display: block; }
  .rec-pin.chico { width: 46px; height: 46px; border-width: 3px; }
  .rec-marco { width: 104px; height: 104px; border-radius: 30%; padding: 7px; background: var(--m); }
  .rec-marco > span { display: grid; place-items: center; width: 100%; height: 100%; border-radius: 26%; background: radial-gradient(120% 120% at 80% 0%, #5b34b8, #1a0f40 70%, #0d0820); color: #fff; font: 900 34px Nunito, sans-serif; }
  .rec-cr { display: flex; align-items: center; gap: 8px; width: 210px; padding: 14px 14px; border-radius: 14px; color: #fff; background: linear-gradient(135deg, var(--r1), var(--r2)); border: 2px solid var(--rb); border-bottom: 4px solid var(--rd); }
  .rec-cr svg { width: 28px; height: 32px; flex: none; }
  .rec-cr b { font: 900 30px/1 "Barlow Condensed", "Arial Narrow", sans-serif; margin-right: auto; }
  .rec-cr i { width: 12px; height: 12px; border-radius: 50%; background: rgba(0,0,0,.25); border: 2px solid rgba(255,255,255,.3); }
  .rec-tit { display: inline-block; font: 1000 14px Nunito, sans-serif; color: var(--c); background: color-mix(in srgb, var(--c) 12%, transparent); border: 1.5px solid color-mix(in srgb, var(--c) 55%, transparent); border-radius: 999px; padding: 6px 12px; max-width: 100%; overflow-wrap: anywhere; }
  .rec-cols { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 4px; }
  .rec-cols label { margin: 0; display: flex; align-items: center; gap: 8px; font: 800 13px Nunito, sans-serif; color: var(--text-dim); }
  .rec-cols input[type=color] { width: 44px; height: 34px; padding: 0; border: 2px solid #2F284E; border-radius: 9px; background: none; cursor: pointer; }
  .rec-it .im.mini { aspect-ratio: auto; height: 96px; display: flex; align-items: center; justify-content: center; background: radial-gradient(120% 120% at 50% 0%, #2a1f55, #0f0b1e 70%); }
  .rec-it .im.mini .rec-av, .rec-it .im.mini .rec-pin, .rec-it .im.mini .rec-marco { width: 64px; height: 64px; }
  .rec-it .im.mini .rec-marco { padding: 5px; }
  .rec-it .im.mini .rec-marco > span { font-size: 22px; }
  .rec-it .im.mini .rec-cr { width: 170px; padding: 10px 12px; }
  .rec-it .im.mini .rec-cr b { font-size: 24px; }
  .rec-it .im.mini .rec-cr svg { width: 22px; height: 26px; }`;
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
    if (d[k + 3] < 128) continue; // lo transparente no cuenta
    s[0] += d[k]; s[1] += d[k + 1]; s[2] += d[k + 2]; s[3]++;
  }
  let vivo = null, mejor = -1;
  const llenas = suma.filter(s => s[3]);
  if (!llenas.length) return ['#5b34b8', '#241452', '#4a2a9a', '#1a0f40'];
  llenas.forEach(s => {
    const c = [s[0] / s[3], s[1] / s[3], s[2] / s[3]];
    todo[0] += c[0] / llenas.length; todo[1] += c[1] / llenas.length; todo[2] += c[2] / llenas.length;
    const sat = Math.max(...c) - Math.min(...c), luz = (Math.max(...c) + Math.min(...c)) / 2;
    const puntos = sat - Math.abs(luz - 140) * .35;
    if (puntos > mejor) { mejor = puntos; vivo = c; }
  });
  return [recHex(...vivo), recHex(...recMezcla(todo, .35)), recHex(...recMezcla(vivo, .15)), recHex(...recMezcla(todo, .62))];
}
async function recPreparar(file, W, H) {
  if (!file || !/^image\//.test(file.type)) throw new Error('Ese archivo no es una imagen');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('No se pudo leer la imagen')); i.src = url; });
    const iw = img.naturalWidth, ih = img.naturalHeight, k = W / H;
    // Recorte al centro, como se ve en la web
    let sw = iw, sh = iw / k;
    if (sh > ih) { sh = ih; sw = ih * k; }
    // Si es más chica que el tamaño final no se agranda (solo se recorta)
    const f = Math.min(1, sw / W), cw = Math.round(W * f), ch = Math.round(H * f);
    const c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, cw, ch);
    const tema = recColores(ctx, cw, ch);
    // WebP guarda lo transparente; si el navegador no lo hace, PNG (con transparencia) o JPG
    const d = ctx.getImageData(0, 0, cw, ch).data;
    let alfa = false;
    for (let i = 3; i < d.length; i += 16) if (d[i] < 250) { alfa = true; break; }
    let blob = await canvasABlob(c, 'image/webp', 0.82), ext = 'webp';
    if (!blob || blob.type !== 'image/webp') { blob = alfa ? await canvasABlob(c, 'image/png') : await canvasABlob(c, 'image/jpeg', 0.85); ext = alfa ? 'png' : 'jpg'; }
    if (blob.size > 500000) throw new Error('La imagen sigue muy pesada; prueba con otra');
    return { blob, ext, tema, url: URL.createObjectURL(blob), kb: Math.round(blob.size / 1024), chica: sw < W * .75 };
  } finally { URL.revokeObjectURL(url); }
}

/* ---------- Colores a mano (marcos y cuadros de racha) ---------- */
const recRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const recOscuro = (h, k) => recHex(...recMezcla(recRgb(h), k));
const recClaro = (h, k) => recHex(...recRgb(h).map(v => v + (255 - v) * k));
// Cuadro de racha: [arriba, abajo del degradado, borde, borde de abajo] como los de assets/coleccion.js
const recTemaCuadro = c => [c, recOscuro(c, .25), recOscuro(c, .18), recOscuro(c, .42)];
const recLlama = f => [f, recClaro(f, .7)];
const REC_COL_DEF = { marco: ['#7DF9C2', '#14C46A', '#0B6B4A'], cuadro: ['#14C46A', '#FFC800'] };
function recColoresDe(e) {
  if (e && e.espacio === 'marco' && Array.isArray(e.tema)) return e.tema.slice();
  if (e && e.espacio === 'cuadro' && Array.isArray(e.tema)) return [e.tema[0], (e.llama || [])[0] || '#FFC800'];
  return REC_COL_DEF[REC.tipo] ? REC_COL_DEF[REC.tipo].slice() : [];
}
const recFuegoSvg = l => `<svg viewBox="0 0 32 36" aria-hidden="true"><path fill="${l[0]}" d="M16 1.5c1.2 4.6 7.6 8.2 9.6 13.6 2.6 7-1.6 17.4-9.6 17.4S3.8 24.9 6.1 17.6c1-3.2 3.3-5.3 4.9-6.9.2 2.8 1.4 4.6 3 5.2C13.3 10.6 14 6 16 1.5z"/><path fill="${l[1]}" d="M16.3 15.5c.6 2.4 4.5 4.4 4.5 8.6a4.8 4.8 0 0 1-9.6 0c0-2 1-3.4 2.1-4.4.2 1.4.8 2.3 1.6 2.6-.4-2.4 0-4.6 1.4-6.8z"/></svg>`;

/* ---------- Dibujos (como salen en Mi colección) ---------- */
// x: { espacio, img, tema, llama, nom, rareza }; chico para la lista
function recDibujo(x, chico) {
  const ch = chico ? ' chico' : '';
  if (x.espacio === 'avatar') return `<span class="rec-av${ch}"><img src="${esc(x.img)}" alt=""></span>`;
  if (x.espacio === 'pines') return `<span class="rec-pin${ch}" style="--pf:${x.tema[3]};--pb:${x.tema[0]}"><img src="${esc(x.img)}" alt=""></span>`;
  if (x.espacio === 'marco') {
    const m = x.img ? `url(${x.img}) center/cover` : `conic-gradient(from 200deg,${x.tema[0]},${x.tema[1]},${x.tema[2]},${x.tema[0]})`;
    return `<span class="rec-marco" style="--m:${esc(m)}"><span>J</span></span>`;
  }
  if (x.espacio === 'cuadro') return `<span class="rec-cr" style="--r1:${x.tema[0]};--r2:${x.tema[1]};--rb:${x.tema[2]};--rd:${x.tema[3]}">${recFuegoSvg(x.llama)}<b>7</b><i></i><i></i><i></i></span>`;
  if (x.espacio === 'titulo') return `<span class="rec-tit" style="--c:${(REC_RAREZA[x.rareza] || REC_RAREZA.comun).c}">★ ${esc(x.nom || 'Tu título')}</span>`;
  return '';
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
  const e = REC.editando, T = recTipo();
  const tit = e ? 'Editar «' + esc(e.nom) + '»' : 'Nuevo: ' + T.nom.toLowerCase();
  return `<div class="agp-form rec-form" id="recForm">
    ${e ? '' : `<span class="agp-l" style="margin-top:0">Qué quieres subir</span>
    <div class="agp-ops" id="recTipos">${Object.keys(REC_TIPOS).map(k => `<button type="button" class="agp-op${k === REC.tipo ? ' on' : ''}" data-t="${k}">${REC_TIPOS[k].nom}</button>`).join('')}</div>`}
    <h3${e ? '' : ' style="margin-top:16px"'}>${tit}</h3>
    <p class="hint">Sale en ${T.donde}</p>
    ${REC.tipo === 'marco' ? `<span class="agp-l">Cómo es el marco</span>
    <div class="agp-ops" id="recMarcoCon">
      <button type="button" class="agp-op${REC.marcoCon === 'colores' ? ' on' : ''}" data-m="colores">Degradado de colores</button>
      <button type="button" class="agp-op${REC.marcoCon === 'imagen' ? ' on' : ''}" data-m="imagen">Con una imagen</button>
    </div>` : ''}
    ${recConImagen() ? `<span class="agp-l">Imagen (${T.medida})</span>` : REC.tipo === 'titulo' ? '' : '<span class="agp-l">Colores</span>'}
    <div id="recImg"></div>
    <div class="agp-2">
      <div><label for="recNom">${REC.tipo === 'titulo' ? 'Título (lo que se lee)' : 'Nombre'}</label><input class="inp" id="recNom" maxlength="40" placeholder="Ej.: ${esc(T.ej)}"></div>
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
      <button class="btn-main" type="button" id="recGuardar">${e ? 'Guardar cambios' : 'Publicar ' + T.nom.toLowerCase()}</button>
      ${e ? '<button class="btn-ghost" type="button" id="recCancelar">Cancelar</button>' : ''}
    </div>
  </div>`;
}
// ¿Este recurso va con imagen? (los marcos pueden ir con imagen o con colores)
const recConImagen = () => REC.tipo === 'marco' ? REC.marcoCon === 'imagen' : !!recTipo().img;

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
  const z = $('recImg'), e = REC.editando, T = recTipo();
  const nom = ($('recNom') && $('recNom').value.trim()) || '';
  // Sin imagen: colores a mano (marco con degradado y cuadro de racha), o nada (título)
  if (!recConImagen()) {
    if (REC.tipo === 'titulo') { z.innerHTML = `<div class="rec-mini"><span>${recDibujo({ espacio: 'titulo', nom: nom || 'Tu título', rareza: $('recRareza') ? $('recRareza').value : 'comun' })}<span class="pie">Así se ve en Mi colección</span></span></div>`; return; }
    if (!REC.colores) REC.colores = recColoresDe(e);
    const c = REC.colores, x = REC.tipo === 'marco' ? { espacio: 'marco', tema: c } : { espacio: 'cuadro', tema: recTemaCuadro(c[0]), llama: recLlama(c[1]) };
    const nombres = REC.tipo === 'marco' ? ['Claro', 'Medio', 'Oscuro'] : ['Cuadro', 'Fuego'];
    z.innerHTML = `<div class="rec-mini"><span>${recDibujo(x)}<span class="pie">Así se ve</span></span></div>
      <div class="rec-cols">${c.map((v, i) => `<label>${nombres[i]} <input type="color" data-c="${i}" value="${v}"></label>`).join('')}</div>`;
    z.querySelectorAll('[data-c]').forEach(inp => inp.addEventListener('input', () => {
      REC.colores[+inp.dataset.c] = inp.value;
      const cx = REC.colores, nx = REC.tipo === 'marco' ? { espacio: 'marco', tema: cx } : { espacio: 'cuadro', tema: recTemaCuadro(cx[0]), llama: recLlama(cx[1]) };
      z.querySelector('.rec-mini > span').innerHTML = recDibujo(nx) + '<span class="pie">Así se ve</span>';
    }));
    return;
  }
  const src = REC.img ? REC.img.url : e ? e.img : '';
  const tema = REC.img ? REC.img.tema : e ? e.tema : null;
  if (!src) {
    z.innerHTML = `<label class="rec-zona${REC.tipo === 'racha' ? '' : ' cuadrada'}" id="recZona"><span>Toca para elegir una imagen, arrástrala aquí o pégala (Ctrl+V).<br>PNG, JPG o WebP. Se recorta al centro y se guarda en WebP${REC.tipo === 'racha' ? '' : ' (lo transparente se mantiene)'}.</span><input type="file" accept="image/png,image/jpeg,image/webp" id="recArchivo"></label>`;
    const zona = $('recZona');
    $('recArchivo').addEventListener('change', ev => recRecibir(ev.target.files[0]));
    zona.addEventListener('dragover', ev => { ev.preventDefault(); zona.classList.add('sobre'); });
    zona.addEventListener('dragleave', () => zona.classList.remove('sobre'));
    zona.addEventListener('drop', ev => { ev.preventDefault(); zona.classList.remove('sobre'); recRecibir(ev.dataTransfer.files[0]); });
    return;
  }
  const info = (tema && REC.tipo !== 'avatar' && REC.tipo !== 'marco' ? 'Colores sacados de la imagen: ' + tema.map(c => `<span class="c" style="background:${c}" title="${c}"></span>`).join('') : '')
    + (REC.img ? (tema && REC.tipo !== 'avatar' && REC.tipo !== 'marco' ? ' · ' : '') + REC.img.kb + ' KB' + (REC.img.chica ? ' · <b style="color:#FFC800">la imagen es chica, puede verse borrosa</b>' : '') : '');
  if (REC.tipo === 'racha') {
    z.innerHTML = `<div class="rec-vista" style="background-image:linear-gradient(90deg,rgba(0,0,0,.38),rgba(0,0,0,0) 60%),url(&quot;${esc(src)}&quot;);--f1:${tema[0]};--f2:${tema[3]}">
        <div class="tj"><i></i><span><b id="recVNom">${esc(nom || 'Tu nombre')}</b><small>Así se ve en la tarjeta</small></span></div>
        <button type="button" class="x" id="recCambiar">Cambiar imagen</button></div>`;
  } else {
    const x = { espacio: REC.tipo, img: src, tema };
    // La foto de perfil y el pin se ven también en chico, como en la tarjeta
    z.innerHTML = `<div class="rec-mini"><span>${recDibujo(x)}<span class="pie">En Mi colección</span></span>
      ${REC.tipo === 'marco' ? '' : `<span>${recDibujo(x, true)}<span class="pie">En la tarjeta</span></span>`}
      <button type="button" class="x" id="recCambiar">Cambiar imagen</button></div>`;
  }
  z.insertAdjacentHTML('beforeend', info ? `<div class="rec-info">${info}</div>` : '');
  $('recCambiar').addEventListener('click', () => {
    if (REC.img) URL.revokeObjectURL(REC.img.url);
    REC.img = null;
    if (REC.editando) REC.editando = Object.assign({}, REC.editando, { img: '' });
    recPintarImg();
  });
}

async function recRecibir(file) {
  try {
    const prev = await recPreparar(file, recTipo().w, recTipo().h);
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
  const R = REC_RAREZA[x.rareza] || REC_RAREZA.comun, seguro = REC.borrar === x.id, T = REC_TIPOS[x.espacio] || REC_TIPOS.racha;
  const datos = [x.regla && x.regla.tipo === 'regalo' ? x.regalados + ' lo recibieron' : '', x.puestos + ' lo llevan puesto'].filter(Boolean).join(' · ');
  const im = x.espacio === 'racha' ? `<div class="im" style="background-image:url(&quot;${esc(x.img)}&quot;)"></div>`
    : `<div class="im mini">${recDibujo(x)}</div>`;
  return `<div class="rec-it${x.visible ? '' : ' oculto'}">
    ${im}
    <div class="tx"><b>${esc(x.nom)}</b><small>${esc(recReglaTxt(x.regla))} · ${datos}</small>
      <span class="tag" style="--c:#C6E000">${esc(T.nom)}</span><span class="tag" style="--c:${R.c}">${R.nom}</span>${x.visible ? '' : '<span class="tag" style="--c:#8a83a8">Oculto</span>'}</div>
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
  if (e) { REC.tipo = e.espacio; REC.marcoCon = e.espacio === 'marco' && e.img ? 'imagen' : REC.marcoCon; }
  $('recCuerpo').innerHTML = recFormHtml() + `<h2 class="rec-h">Lo que subiste</h2>
    <div class="agp-ops" id="recFiltro" style="margin-bottom:12px"></div><div id="recListaC"></div>`;
  $('recListaC').addEventListener('click', recAccionLista);
  $('recFiltro').addEventListener('click', ev => { const b = ev.target.closest('[data-f]'); if (b) { REC.filtro = b.dataset.f; recPintarLista(); } });
  recPintarLista();
  REC.regla = e ? (e.regla && e.regla.tipo) || 'gratis' : REC.regla;
  $('recNom').value = e ? e.nom || '' : '';
  $('recRareza').value = e ? e.rareza || 'comun' : 'comun';
  $('recDesc').value = e ? e.descr || '' : '';
  $('recVisible').checked = e ? e.visible !== false : true;
  recPintarImg();
  recMarcarRegla();
  $('recNom').addEventListener('input', () => {
    const v = $('recVNom'); if (v) v.textContent = $('recNom').value.trim() || 'Tu nombre';
    if (REC.tipo === 'titulo') recPintarImg();
  });
  $('recRareza').addEventListener('change', () => { if (REC.tipo === 'titulo') recPintarImg(); });
  if ($('recTipos')) $('recTipos').addEventListener('click', ev => {
    const b = ev.target.closest('[data-t]'); if (!b || b.dataset.t === REC.tipo) return;
    if (REC.img) URL.revokeObjectURL(REC.img.url);
    REC.tipo = b.dataset.t; REC.img = null; REC.colores = null;
    pintarRecursos();
  });
  if ($('recMarcoCon')) $('recMarcoCon').addEventListener('click', ev => {
    const b = ev.target.closest('[data-m]'); if (!b || b.dataset.m === REC.marcoCon) return;
    REC.marcoCon = b.dataset.m;
    $('recMarcoCon').querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b));
    const l = $('recImg').previousElementSibling;
    if (l) l.textContent = recConImagen() ? 'Imagen (' + recTipo().medida + ')' : 'Colores';
    recPintarImg();
  });
  $('recReglas').addEventListener('click', ev => { const b = ev.target.closest('[data-r]'); if (b) { REC.regla = b.dataset.r; recMarcarRegla(); } });
  $('recGuardar').addEventListener('click', guardarRecurso);
  if ($('recCancelar')) $('recCancelar').addEventListener('click', () => { REC.editando = null; REC.img = null; REC.colores = null; REC.regla = 'gratis'; pintarRecursos(); });
}
function recPintarLista() {
  const tipos = Object.keys(REC_TIPOS).filter(k => REC.lista.some(x => x.espacio === k));
  if (REC.filtro && !tipos.includes(REC.filtro)) REC.filtro = '';
  const f = $('recFiltro');
  if (f) {
    f.hidden = tipos.length < 2;
    f.innerHTML = `<button type="button" class="agp-op${REC.filtro ? '' : ' on'}" data-f="">Todos ${REC.lista.length}</button>` +
      tipos.map(k => `<button type="button" class="agp-op${REC.filtro === k ? ' on' : ''}" data-f="${k}">${REC_TIPOS[k].plural} ${REC.lista.filter(x => x.espacio === k).length}</button>`).join('');
  }
  const lista = REC.lista.filter(x => !REC.filtro || x.espacio === REC.filtro);
  $('recListaC').innerHTML = lista.length ? `<div class="rec-lista">${lista.map(recItemHtml).join('')}</div>`
    : '<div class="rec-vacio">Todavía no subiste nada. Elige qué subir arriba.</div>';
}

const recCorreos = t => String(t || '').split(/[\s,;]+/).map(x => x.trim().toLowerCase()).filter(x => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x));
const recRuta = url => (String(url || '').split('/object/public/recursos/')[1] || '').split('?')[0];

async function guardarRecurso() {
  const e = REC.editando, T = recTipo(), nom = $('recNom').value.trim(), conImg = recConImagen();
  if (conImg && !REC.img && !(e && e.img)) { toast('Falta la imagen', true); return; }
  if (!nom) { toast(REC.tipo === 'titulo' ? 'Escribe el título' : 'Ponle un nombre', true); $('recNom').focus(); return; }
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
    let img = conImg && e ? e.img || '' : '', tema = null, llama = null, vieja = '';
    if (conImg && REC.img) {
      const ruta = ({ racha: 'fondos', avatar: 'fotos', pines: 'pines', marco: 'marcos' })[REC.tipo] + '/' + id + '-' + Date.now().toString(36) + '.' + REC.img.ext;
      const up = await c.storage.from('recursos').upload(ruta, REC.img.blob, { contentType: REC.img.blob.type, cacheControl: '31536000', upsert: false });
      if (up.error) throw up.error;
      img = c.storage.from('recursos').getPublicUrl(ruta).data.publicUrl;
      tema = REC.img.tema;
    } else if (conImg && e) tema = e.tema;
    // La imagen de antes se borra si se cambió o si el marco pasó a colores
    if (e && e.imgAntes && e.imgAntes !== img) vieja = recRuta(e.imgAntes);
    if (!conImg && REC.tipo !== 'titulo') {
      const cs = REC.colores || recColoresDe(e);
      if (REC.tipo === 'marco') tema = cs; else { tema = recTemaCuadro(cs[0]); llama = recLlama(cs[1]); }
    }
    bt.innerHTML = '<span class="spin-s"></span> Guardando…';
    const r = await c.rpc('guardar_recurso', { p: { id, espacio: REC.tipo, nom, rareza: $('recRareza').value, img, tema, llama, descr: $('recDesc').value.trim(), regla, visible: $('recVisible').checked } });
    if (r.error) throw r.error;
    if (vieja) c.storage.from('recursos').remove([vieja]).then(() => {}, () => {});
    let msg = e ? 'Cambios guardados' : T.nom + ' publicado: ya sale en Mi colección';
    if (entregar) {
      const g = await c.rpc('regalar_item', { p_item: id, p_emails: correos, p_origen: 'regalo', p_mensaje: $('recMsj').value.trim() || null });
      if (g.error) throw g.error;
      msg = T.nom + ' publicado y entregado a ' + (g.data || 0) + ' alumno' + (g.data === 1 ? '' : 's');
    }
    toast(msg);
    if (REC.img) URL.revokeObjectURL(REC.img.url);
    REC.img = null; REC.colores = null; REC.editando = null; REC.regla = 'gratis'; REC.para = 'todos';
    cargarRecursos();
  } catch (err) {
    const m = err.message || 'error';
    toast('No se pudo guardar: ' + (/tipo no válido|falta la imagen/.test(m) ? m + '. ¿Ya corriste supabase/41-recursos-coleccion.sql?' : m), true);
    bt.disabled = false; bt.textContent = e ? 'Guardar cambios' : 'Publicar ' + T.nom.toLowerCase();
  }
}

async function recAccionLista(ev) {
  const b = ev.target.closest('button'); if (!b) return;
  const buscar = id => REC.lista.find(x => x.id === id);
  if (b.dataset.ed) {
    const x = buscar(b.dataset.ed);
    REC.editando = Object.assign({}, x, { imgAntes: x.img }); REC.img = null; REC.colores = null; REC.borrar = null; REC.regalar = null;
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
    toast('Borrado; quien lo llevaba vuelve a lo de siempre');
    if (REC.editando && REC.editando.id === x.id) { REC.editando = null; cargarRecursos(); } else cargarRecursos(true);
  }
}
