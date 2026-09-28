/* =========================================================
   Panel · Imágenes de preguntas
   - Pegar (Ctrl+V), arrastrar o elegir archivo
   - Se achica en el navegador (máx. 1100 px, WebP/JPG) antes de subir
   - Se guarda en assets/img/<curso>/<año>/ y la pregunta usa <img class="mc-img">
   ========================================================= */
const SITE_ROOT = new URL('../', location.href).pathname; // p. ej. "/modocachimbo/"
const IMG_MAX = 1100;

function imgHtml(repoPath) {
  return '<img class="mc-img" src="' + SITE_ROOT + repoPath + '" alt="Figura de la pregunta" loading="lazy" ' +
    'style="max-width:100%;height:auto;display:block;margin:0 auto;border-radius:6px;">';
}
function imgRuta(carpeta, anio, tema, ext) {
  const rnd = Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 7);
  return 'assets/img/' + carpeta + '/' + anio + '/t' + pad2(tema) + '-' + rnd + '.' + ext;
}

function canvasABlob(canvas, tipo, calidad) {
  return new Promise(res => canvas.toBlob(b => res(b), tipo, calidad));
}
function blobADataUrl(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
}

// Achica la imagen y devuelve { dataUrl, ext, w, h, kb }
async function prepararImagen(file) {
  if (!file || !/^image\//.test(file.type)) throw new Error('Ese archivo no es una imagen');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('No se pudo leer la imagen')); i.src = url; });
    const esc = Math.min(1, IMG_MAX / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * esc)), h = Math.max(1, Math.round(img.naturalHeight * esc));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); // fondo blanco para PNG transparentes
    ctx.drawImage(img, 0, 0, w, h);
    let blob = await canvasABlob(c, 'image/webp', 0.85), ext = 'webp';
    if (!blob || blob.type !== 'image/webp') { blob = await canvasABlob(c, 'image/jpeg', 0.86); ext = 'jpg'; }
    if (blob.size > 1400000) throw new Error('La imagen sigue muy pesada; recórtala un poco');
    return { dataUrl: await blobADataUrl(blob), ext, w, h, kb: Math.round(blob.size / 1024) };
  } finally { URL.revokeObjectURL(url); }
}

/* ---------- Zona de imagen reutilizable ----------
   crearZonaImagen(el, { actual: "<svg…>|<img…>|''", onChange })
   zona.estado() → { cambio: 'igual'|'nueva'|'quitar', img?: {dataUrl, ext} } */
let zonaArmada = null;
document.addEventListener('paste', async e => {
  if (!zonaArmada || !document.body.contains(zonaArmada.el)) return;
  const items = [...(e.clipboardData ? e.clipboardData.items : [])];
  const it = items.find(x => x.kind === 'file' && /^image\//.test(x.type));
  if (!it) return;
  e.preventDefault();
  zonaArmada.recibir(it.getAsFile());
});

function crearZonaImagen(el, opts) {
  const actual = opts.actual || '';
  let cambio = 'igual', nueva = null;
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*'; input.hidden = true;

  const zona = {
    el,
    estado: () => ({ cambio, img: nueva }),
    async recibir(file) {
      el.classList.add('cargando');
      try {
        nueva = await prepararImagen(file);
        cambio = 'nueva';
        if (zonaArmada === zona) zonaArmada = null;
        pintar();
        opts.onChange && opts.onChange();
      } catch (err) { toast(err.message, true); }
      el.classList.remove('cargando');
    }
  };

  function vistaActual() {
    if (cambio === 'nueva') return `<img src="${nueva.dataUrl}" alt="">`;
    if (cambio === 'quitar' || !actual) return '';
    return actual; // svg o img ya publicados
  }
  function pintar() {
    const v = vistaActual();
    const armada = zonaArmada === zona;
    el.innerHTML = v
      ? `<div class="iz-prev">${v}</div>
         <div class="iz-bar">
           <span class="iz-info">${cambio === 'nueva' ? `Imagen nueva · ${nueva.w}×${nueva.h} · ${nueva.kb} KB` : (/^\s*<svg/i.test(actual) ? 'Gráfico SVG publicado' : 'Imagen publicada')}</span>
           <button type="button" class="rbtn" data-z="cambiar">Cambiar</button>
           <button type="button" class="rbtn" data-z="quitar">Quitar</button>
         </div>`
      : `<div class="iz-vacia ${armada ? 'armada' : ''}">
           ${armada
             ? '<b>Ahora presiona Ctrl+V</b> para pegar tu captura, o <button type="button" class="iz-link" data-z="archivo">elige un archivo</button>'
             : `<button type="button" class="rbtn" data-z="armar">＋ Imagen</button><span class="iz-hint">Pega una captura (Ctrl+V), arrastra o elige un archivo</span>`}
           ${cambio === 'quitar' ? '<button type="button" class="iz-link" data-z="deshacer">Deshacer quitar</button>' : ''}
         </div>`;
    el.appendChild(input);
    if (window.renderMath) renderMath(el);
  }
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-z]'); if (!b) return;
    const a = b.dataset.z;
    if (a === 'armar' || a === 'cambiar') {
      if (zonaArmada && zonaArmada !== zona) { const z = zonaArmada; zonaArmada = null; z.repintar(); }
      zonaArmada = zona;
      if (a === 'cambiar') { cambio = 'igual'; nueva = null; opts.onChange && opts.onChange(); }
      pintar();
      if (a === 'cambiar') input.click();
    }
    if (a === 'archivo') input.click();
    if (a === 'quitar') { cambio = actual ? 'quitar' : 'igual'; nueva = null; pintar(); opts.onChange && opts.onChange(); }
    if (a === 'deshacer') { cambio = 'igual'; pintar(); opts.onChange && opts.onChange(); }
  });
  input.addEventListener('change', () => { if (input.files[0]) zona.recibir(input.files[0]); input.value = ''; });
  el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drag'); });
  el.addEventListener('dragleave', () => el.classList.remove('drag'));
  el.addEventListener('drop', e => {
    e.preventDefault(); el.classList.remove('drag');
    const f = [...e.dataTransfer.files].find(x => /^image\//.test(x.type));
    if (f) zona.recibir(f);
  });
  zona.repintar = pintar;
  zona.recibirPreparada = img => { nueva = img; cambio = 'nueva'; pintar(); };
  el.classList.add('izona');
  pintar();
  return zona;
}
