/* =========================================================
   Panel · Biblioteca
   Libros en PDF que viven en el Google Drive de Modo Cachimbo y se
   leen en biblioteca.html, con el visor de la web.
   - Pegas el link de Drive (compartido como «Cualquier persona con el
     enlace»); se guarda solo el id del archivo.
   - Si la web tiene la clave de Drive (MC_CONFIG.DRIVE_KEY), al pegar
     el link se prueba que abre y se cuentan sus páginas.
   Datos: supabase/42-biblioteca.sql (guardar_libro, libros_admin, borrar_libro).
   ========================================================= */
const BIB = { lista: [], editando: null, borrar: null, prueba: null };
const BIB_PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';

(function estilosBiblioteca() {
  const st = document.createElement('style');
  st.textContent = `
  .bib-prueba { margin-top: 8px; font: 800 12.5px Nunito, sans-serif; color: var(--text-dim); }
  .bib-prueba.ok { color: var(--accent); } .bib-prueba.mal { color: #FF6E6E; }
  .bib-lista { display: grid; gap: 8px; }
  .bib-it { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 2px solid #2A2346; border-bottom-width: 4px; border-radius: 14px; background: var(--surface); }
  .bib-it.oculto { opacity: .55; }
  .bib-it .tp { flex: none; width: 38px; height: 52px; border-radius: 3px 7px 7px 3px; background: linear-gradient(160deg, color-mix(in srgb, var(--c) 92%, #fff), var(--c) 45%, color-mix(in srgb, var(--c) 78%, #000)); box-shadow: inset 3px 0 0 rgba(0,0,0,.18); }
  .bib-it .tx { flex: 1; min-width: 0; }
  .bib-it .tx b { display: block; font: 900 14.5px Nunito, sans-serif; overflow-wrap: anywhere; }
  .bib-it .tx small { display: block; color: var(--text-dim); font-size: 12.5px; margin-top: 2px; }
  .bib-it .bts { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
  .bib-it .bts .btn-ghost { padding: 6px 10px; font-size: 12.5px; }
  .bib-it .bts .btn-ghost.rojo { color: var(--red); border-color: rgba(224,60,60,.4); }
  .bib-pasos { margin: 0 0 16px; padding: 12px 14px; border-radius: 14px; border: 2px dashed #3A3260; color: var(--text-dim); font: 700 13px/1.55 Nunito, sans-serif; }
  .bib-pasos b { color: var(--text); }
  @media (max-width: 560px) { .bib-it { flex-wrap: wrap; } .bib-it .bts { width: 100%; justify-content: flex-start; } }`;
  document.head.appendChild(st);
})();

const BIB_COLOR = { 'ciencia-tecnologia': '#C6E000', matematica: '#1CB0F6', comunicacion: '#CE82FF', 'ciencias-sociales': '#FF9600' };
const bibColor = id => { const c = REG && (REG.cursos || []).find(x => x.id === id); return (c && BIB_COLOR[c.area]) || '#C6E000'; };
const bibCursos = () => CURSOS.filter(([id]) => !/--/.test(id));
const bibNombre = id => (bibCursos().find(c => c[0] === id) || [id, id])[1].replace(/ \(oculto\)$/, '');
// El id del archivo sale de cualquier link de Drive (…/file/d/ID/…, ?id=ID) o del id solo
function bibDriveId(t) {
  t = String(t || '').trim();
  const m = t.match(/\/file\/d\/([A-Za-z0-9_-]{20,})/) || t.match(/[?&]id=([A-Za-z0-9_-]{20,})/) || t.match(/^([A-Za-z0-9_-]{20,80})$/);
  return m ? m[1] : '';
}

async function cargarBiblioteca() {
  const caja = $('bibCuerpo');
  let cliente;
  try { cliente = await MCAuth.listo; }
  catch (e) { caja.innerHTML = '<div class="state-msg error">No se pudo conectar con Supabase. Revisa tu internet.</div>'; return; }
  if (!MCAuth.usuario()) {
    caja.innerHTML = `<div class="state-msg al-login">Entra con tu cuenta de Google de administrador.
      <button class="btn-main" type="button" id="bibEntrar">Entrar con Google</button></div>`;
    $('bibEntrar').addEventListener('click', () => MCAuth.entrarGoogle());
    return;
  }
  if (!REG) await cargarRegistro();
  const r = await cliente.rpc('libros_admin');
  if (r.error) {
    caja.innerHTML = /no autorizado/i.test(r.error.message || '') ? '<div class="state-msg error">Tu cuenta no tiene permiso para la biblioteca.</div>'
      : `<div class="state-msg error">No se pudieron leer los libros. ¿Ya corriste <b>supabase/42-biblioteca.sql</b>?<br><small>${esc(r.error.message || '')}</small></div>`;
    return;
  }
  BIB.lista = r.data || [];
  pintarBiblioteca();
}

function pintarBiblioteca() {
  const e = BIB.editando, clave = !!(window.MC_CONFIG || {}).DRIVE_KEY;
  $('bibCuerpo').innerHTML = `
    ${clave ? '' : `<div class="bib-pasos"><b>Falta la clave de Google Drive.</b> Sin ella los libros igual se abren, pero con la vista previa de Drive (sin «Seguir leyendo» ni marcadores).
      Pégala en <b>assets/mc-config.js → DRIVE_KEY</b>.</div>`}
    <div class="agp-form" id="bibForm">
      <h3>${e ? 'Editar «' + esc(e.titulo) + '»' : 'Nuevo libro'}</h3>
      <p class="hint">En Drive: clic derecho al PDF → <b>Compartir</b> → «Cualquier persona con el enlace» → <b>Copiar enlace</b>, y pégalo aquí.</p>
      <label for="bibLink">Link de Google Drive</label>
      <input class="inp" id="bibLink" placeholder="https://drive.google.com/file/d/…/view?usp=sharing" autocomplete="off">
      <div class="bib-prueba" id="bibPrueba"></div>
      <div class="agp-2">
        <div><label for="bibTit">Título</label><input class="inp" id="bibTit" maxlength="80" placeholder="Ej.: Física"></div>
        <div><label for="bibSub">Subtítulo (opcional)</label><input class="inp" id="bibSub" maxlength="80" placeholder="Ej.: Cinemática y dinámica"></div>
      </div>
      <div class="agp-2">
        <div><label for="bibCurso">Curso</label><select class="inp" id="bibCurso">${bibCursos().map(([id, n]) => `<option value="${id}">${esc(n)}</option>`).join('')}</select></div>
        <div><label for="bibPag">Páginas</label><input class="inp" id="bibPag" type="number" min="1" max="5000" placeholder="Se cuentan solas al pegar el link"></div>
      </div>
      <label class="tmp-sw" style="display:flex;align-items:center;gap:12px;margin-top:16px;cursor:pointer;font:800 14px Nunito,sans-serif">
        <input type="checkbox" id="bibVisible" style="width:20px;height:20px;accent-color:#C6E000"><span>Que se vea en la biblioteca</span></label>
      <div class="agp-acc">
        <button class="btn-main" type="button" id="bibGuardar">${e ? 'Guardar cambios' : 'Agregar libro'}</button>
        ${e ? '<button class="btn-ghost" type="button" id="bibCancelar">Cancelar</button>' : ''}
      </div>
    </div>
    <h2 class="rec-h" style="font:900 17px Nunito,sans-serif;margin:6px 0 10px">Libros (${BIB.lista.length})</h2>
    <div id="bibListaC"></div>`;
  $('bibLink').value = e ? 'https://drive.google.com/file/d/' + e.drive + '/view' : '';
  $('bibTit').value = e ? e.titulo : '';
  $('bibSub').value = e ? e.subtitulo || '' : '';
  $('bibCurso').value = e ? e.curso : (bibCursos()[0] || [''])[0];
  $('bibPag').value = e && e.paginas ? e.paginas : '';
  $('bibVisible').checked = e ? e.visible !== false : true;
  $('bibLink').addEventListener('input', () => bibProbar($('bibLink').value));
  $('bibGuardar').addEventListener('click', guardarLibro);
  if ($('bibCancelar')) $('bibCancelar').addEventListener('click', () => { BIB.editando = null; pintarBiblioteca(); });
  $('bibListaC').addEventListener('click', bibAccion);
  bibPintarLista();
}

function bibPintarLista() {
  const orden = bibCursos().map(c => c[0]);
  const l = BIB.lista.slice().sort((a, b) => (orden.indexOf(a.curso) - orden.indexOf(b.curso)) || (a.orden - b.orden));
  $('bibListaC').innerHTML = l.length ? '<div class="bib-lista">' + l.map(x => `<div class="bib-it${x.visible ? '' : ' oculto'}">
      <span class="tp" style="--c:${bibColor(x.curso)}"></span>
      <div class="tx"><b>${esc(x.titulo)}${x.subtitulo ? ' · ' + esc(x.subtitulo) : ''}</b>
        <small>${esc(bibNombre(x.curso))} · ${x.paginas ? x.paginas + ' págs' : 'páginas sin contar'} · ${x.lectores} lo abrieron${x.visible ? '' : ' · Oculto'}</small></div>
      <div class="bts">
        <a class="btn-ghost" href="../biblioteca.html#libro=${encodeURIComponent(x.id)}" target="_blank" rel="noopener">Abrir</a>
        <button class="btn-ghost" type="button" data-ed="${esc(x.id)}">Editar</button>
        <button class="btn-ghost" type="button" data-vi="${esc(x.id)}">${x.visible ? 'Ocultar' : 'Mostrar'}</button>
        <button class="btn-ghost rojo" type="button" data-bo="${esc(x.id)}">${BIB.borrar === x.id ? '¿Borrar? Toca otra vez' : 'Borrar'}</button>
      </div></div>`).join('') + '</div>'
    : '<div class="rec-vacio" style="padding:18px;border-radius:16px;border:2px dashed #2A2346;color:var(--text-dim);font:700 13.5px Nunito,sans-serif;text-align:center">Todavía no hay libros. Pega el link del primero arriba.</div>';
}

// Al pegar el link: si hay clave de Drive, se abre el PDF para ver que es público y contar sus páginas
let bibPdfjs = null;
function bibCargarPdfjs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (!bibPdfjs) bibPdfjs = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = BIB_PDFJS + 'pdf.min.js';
    s.onload = () => { pdfjsLib.GlobalWorkerOptions.workerSrc = BIB_PDFJS + 'pdf.worker.min.js'; res(pdfjsLib); };
    s.onerror = () => { bibPdfjs = null; rej(new Error('sin-pdfjs')); };
    document.head.appendChild(s);
  });
  return bibPdfjs;
}
async function bibProbar(link) {
  const id = bibDriveId(link), out = $('bibPrueba'), key = (window.MC_CONFIG || {}).DRIVE_KEY;
  out.className = 'bib-prueba'; BIB.prueba = id;
  if (!link.trim()) { out.textContent = ''; return; }
  if (!id) { out.className = 'bib-prueba mal'; out.textContent = 'Ese link no parece de un archivo de Drive.'; return; }
  if (!key) { out.textContent = 'Link de Drive reconocido.'; return; }
  out.innerHTML = '<span class="spin-s"></span> Probando el link…';
  try {
    const lib = await bibCargarPdfjs();
    const t = lib.getDocument({ url: 'https://www.googleapis.com/drive/v3/files/' + id + '?alt=media&key=' + encodeURIComponent(key), disableAutoFetch: true, rangeChunkSize: 262144 });
    const pdf = await t.promise;
    if (BIB.prueba !== id) { t.destroy(); return; }
    $('bibPag').value = pdf.numPages;
    const meta = await pdf.getMetadata().catch(() => null);
    const tit = meta && meta.info && meta.info.Title;
    if (tit && !$('bibTit').value.trim()) $('bibTit').value = String(tit).slice(0, 80);
    out.className = 'bib-prueba ok'; out.textContent = '✓ Abre bien: ' + pdf.numPages + ' páginas.';
    t.destroy();
  } catch (e) {
    if (BIB.prueba !== id) return;
    out.className = 'bib-prueba mal';
    out.textContent = 'No se pudo abrir. Revisa que sea un PDF y que esté compartido como «Cualquier persona con el enlace».';
  }
}

async function guardarLibro() {
  const e = BIB.editando, drive = bibDriveId($('bibLink').value), titulo = $('bibTit').value.trim();
  if (!drive) { toast('Pega el link de Drive del PDF', true); $('bibLink').focus(); return; }
  if (!titulo) { toast('Ponle un título', true); $('bibTit').focus(); return; }
  const curso = $('bibCurso').value;
  const orden = e ? e.orden : BIB.lista.filter(x => x.curso === curso).length;
  const bt = $('bibGuardar'); bt.disabled = true; bt.innerHTML = '<span class="spin-s"></span> Guardando…';
  try {
    const c = await MCAuth.listo;
    const r = await c.rpc('guardar_libro', { p: { id: e ? e.id : null, titulo, subtitulo: $('bibSub').value.trim(), curso, drive, paginas: parseInt($('bibPag').value, 10) || null, orden, visible: $('bibVisible').checked } });
    if (r.error) throw r.error;
    toast(e ? 'Cambios guardados' : 'Libro agregado: ya sale en la biblioteca');
    BIB.editando = null;
    cargarBiblioteca();
  } catch (err) {
    toast('No se pudo guardar: ' + (err.message || 'error'), true);
    bt.disabled = false; bt.textContent = e ? 'Guardar cambios' : 'Agregar libro';
  }
}

async function bibAccion(ev) {
  const b = ev.target.closest('button'); if (!b) return;
  const x = BIB.lista.find(l => l.id === (b.dataset.ed || b.dataset.vi || b.dataset.bo));
  if (!x) return;
  if (b.dataset.ed) { BIB.editando = x; BIB.borrar = null; pintarBiblioteca(); window.scrollTo(0, 0); return; }
  const c = await MCAuth.listo;
  if (b.dataset.vi) {
    const r = await c.rpc('guardar_libro', { p: Object.assign({}, x, { visible: !x.visible }) });
    if (r.error) { toast('No se pudo cambiar: ' + r.error.message, true); return; }
    toast(x.visible ? 'Oculto: ya no sale en la biblioteca' : 'Ya sale en la biblioteca');
    cargarBiblioteca(); return;
  }
  if (b.dataset.bo) {
    if (BIB.borrar !== x.id) { BIB.borrar = x.id; bibPintarLista(); return; }
    BIB.borrar = null;
    const r = await c.rpc('borrar_libro', { p_id: x.id });
    if (r.error) { toast('No se pudo borrar: ' + r.error.message, true); bibPintarLista(); return; }
    toast('Libro borrado de la biblioteca (el PDF sigue en tu Drive)');
    if (BIB.editando && BIB.editando.id === x.id) BIB.editando = null;
    cargarBiblioteca();
  }
}
