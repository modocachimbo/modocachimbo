/* =========================================================
   Panel · Biblioteca
   Libros en PDF que viven en el Google Drive de Modo Cachimbo y se
   leen en biblioteca.html, con el visor de la web.
   - Pegas el link de Drive (compartido como «Cualquier persona con el
     enlace»); se guarda solo el id del archivo.
   - Si la web tiene la clave de Drive (MC_CONFIG.DRIVE_KEY), al pegar
     el link se prueba que abre y se cuentan sus páginas.
   - Portada: una foto que subes (se recorta a 5:7 y va al Storage,
     carpeta recursos/portadas). Sin foto se dibuja una con el color del curso.
   - Colecciones: agrupan libros (Formularios, Pack Ordinario…) y salen
     como estantes propios en la biblioteca.
   Datos: supabase/42-biblioteca.sql (guardar_libro, libros_admin, borrar_libro,
   guardar_coleccion_libros, borrar_coleccion_libros).
   ========================================================= */
const BIB = { lista: [], cols: [], editando: null, borrar: null, prueba: null, img: null, quitarPortada: false, colEd: null, colBorrar: null, filtro: '' };
const BIB_PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
const BIB_W = 600, BIB_H = 840;
const BIB_TIPOS = { libro: 'Libro', formulario: 'Formulario', solucionario: 'Solucionario', fichas: 'Fichas', resumen: 'Resumen', examenes: 'Exámenes', separata: 'Separata' };
const BIB_COLORES = ['#CE82FF', '#1CB0F6', '#C6E000', '#FF9600', '#FF4B4B', '#14C46A', '#FFC800'];

(function estilosBiblioteca() {
  const st = document.createElement('style');
  st.textContent = `
  .bib-prueba { margin-top: 8px; font: 800 12.5px Nunito, sans-serif; color: var(--text-dim); }
  .bib-prueba.ok { color: var(--accent); } .bib-prueba.mal { color: #FF6E6E; }
  .bib-pasos { margin: 0 0 16px; padding: 12px 14px; border-radius: 14px; border: 2px dashed #3A3260; color: var(--text-dim); font: 700 13px/1.55 Nunito, sans-serif; }
  .bib-pasos b { color: var(--text); }
  .bib-cuerpo { display: grid; grid-template-columns: 190px 1fr; gap: 20px; align-items: start; }
  .bib-cuerpo > div { min-width: 0; }
  .bib-tapa { position: relative; aspect-ratio: 5 / 7; border-radius: 6px 12px 12px 6px; overflow: hidden; background: #0f0b1e; box-shadow: 0 8px 18px rgba(0,0,0,.4), inset 5px 0 0 rgba(0,0,0,.2); }
  .bib-tapa img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .bib-gen { position: absolute; inset: 0; padding: 16% 11% 0 15%; color: #0b0818; background: linear-gradient(160deg, color-mix(in srgb, var(--c) 88%, #fff), var(--c) 45%, color-mix(in srgb, var(--c) 72%, #000)); }
  .bib-gen b { display: block; font: 1000 18px/1.1 Nunito, sans-serif; text-transform: uppercase; overflow-wrap: break-word; hyphens: auto; }
  .bib-gen em { display: block; font: 900 10.5px/1.2 Nunito, sans-serif; font-style: normal; text-transform: uppercase; letter-spacing: .08em; opacity: .62; margin-top: 7px; }
  .bib-gen u { position: absolute; left: 15%; top: 7%; text-decoration: none; font: 1000 8px Nunito, sans-serif; letter-spacing: .2em; opacity: .5; }
  .bib-tapa-bts { display: grid; gap: 6px; margin-top: 10px; }
  .bib-tapa-bts label, .bib-tapa-bts button { position: relative; display: block; text-align: center; padding: 8px 10px; border-radius: 11px; border: 2px solid #2F284E; background: none; color: var(--text); font: 900 12.5px Nunito, sans-serif; cursor: pointer; margin: 0 !important; }
  .bib-tapa-bts label.on { border-color: var(--accent); color: var(--accent); }
  .bib-tapa-bts input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
  .bib-tapa-bts small { display: block; color: var(--text-faint); font: 700 11px/1.4 Nunito, sans-serif; text-align: center; }
  .bib-tapa.sobre { outline: 3px dashed var(--accent); outline-offset: 3px; }
  .bib-sw { display: flex; align-items: center; gap: 10px; margin-top: 12px; cursor: pointer; font: 800 13.5px Nunito, sans-serif; }
  .bib-sw input { width: 19px; height: 19px; accent-color: #C6E000; flex: none; }
  .bib-sw small { display: block; color: var(--text-dim); font-weight: 700; font-size: 12px; }
  .bib-sws { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
  .bib-lista { display: grid; gap: 8px; }
  .bib-it { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 2px solid #2A2346; border-bottom-width: 4px; border-radius: 14px; background: var(--surface); }
  .bib-it.oculto { opacity: .55; }
  .bib-it .bib-tapa { flex: none; width: 40px; border-radius: 3px 7px 7px 3px; box-shadow: inset 3px 0 0 rgba(0,0,0,.18); }
  .bib-it .bib-gen b { font-size: 5px; } .bib-it .bib-gen em, .bib-it .bib-gen u { display: none; }
  .bib-it .tx { flex: 1; min-width: 0; }
  .bib-it .tx b { display: block; font: 900 14.5px Nunito, sans-serif; overflow-wrap: anywhere; }
  .bib-it .tx small { display: block; color: var(--text-dim); font-size: 12.5px; margin-top: 2px; }
  .bib-it .tag { display: inline-block; margin-top: 5px; margin-right: 4px; font: 900 10.5px Nunito, sans-serif; letter-spacing: .06em; text-transform: uppercase; border-radius: 8px; padding: 3px 7px; color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); }
  .bib-it .bts { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
  .bib-it .bts .btn-ghost { padding: 6px 10px; font-size: 12.5px; }
  .bib-it .bts .btn-ghost.rojo { color: var(--red); border-color: rgba(224,60,60,.4); }
  .bib-cols { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
  .bib-col { display: inline-flex; align-items: center; gap: 8px; padding: 7px 8px 7px 12px; border-radius: 12px; border: 2px solid color-mix(in srgb, var(--c) 50%, #2A2346); background: color-mix(in srgb, var(--c) 10%, var(--surface)); font: 900 13px Nunito, sans-serif; }
  .bib-col small { color: var(--text-dim); font-weight: 800; }
  .bib-col button { border: 0; background: rgba(255,255,255,.06); color: var(--text); border-radius: 8px; padding: 4px 8px; font: 800 12px Nunito, sans-serif; cursor: pointer; }
  .bib-col button.rojo { color: #FF6E6E; }
  .bib-colform { display: grid; grid-template-columns: 1fr 1.4fr auto auto; gap: 8px; align-items: center; margin-top: 8px; }
  .bib-colores { display: flex; gap: 5px; }
  .bib-colores button { width: 24px; height: 24px; border-radius: 8px; border: 2px solid transparent; background: var(--c); cursor: pointer; }
  .bib-colores button.on { border-color: #fff; }
  .bib-h { font: 900 17px Nunito, sans-serif; margin: 22px 0 10px; display: flex; align-items: center; gap: 10px; }
  .bib-filtro { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
  @media (max-width: 700px) { .bib-cuerpo { grid-template-columns: 1fr; } .bib-cuerpo > div:first-child { max-width: 170px; } .bib-sws { grid-template-columns: 1fr; } .bib-colform { grid-template-columns: 1fr; } .bib-it { flex-wrap: wrap; } .bib-it .bts { width: 100%; justify-content: flex-start; } }`;
  document.head.appendChild(st);
})();

const BIB_COLOR = { 'ciencia-tecnologia': '#C6E000', matematica: '#1CB0F6', comunicacion: '#CE82FF', 'ciencias-sociales': '#FF9600' };
const bibCurso = id => REG && (REG.cursos || []).find(x => x.id === id);
const bibColor = id => { const c = bibCurso(id); return (c && BIB_COLOR[c.area]) || '#C6E000'; };
const bibCursos = () => CURSOS.filter(([id]) => !/--/.test(id));
const bibNombre = id => (bibCursos().find(c => c[0] === id) || [id, id])[1].replace(/ \(oculto\)$/, '');
const bibColNombre = id => (BIB.cols.find(c => c.id === id) || {}).nombre || '';
// El id del archivo sale de cualquier link de Drive (…/file/d/ID/…, ?id=ID) o del id solo
function bibDriveId(t) {
  t = String(t || '').trim();
  const m = t.match(/\/file\/d\/([A-Za-z0-9_-]{20,})/) || t.match(/[?&]id=([A-Za-z0-9_-]{20,})/) || t.match(/^([A-Za-z0-9_-]{20,80})$/);
  return m ? m[1] : '';
}
// Portada como en la biblioteca: la foto o una dibujada
function bibTapa(x) {
  return `<div class="bib-tapa" style="--c:${bibColor(x.curso)}">${x.portada ? `<img src="${esc(x.portada)}" alt="">`
    : `<span class="bib-gen"><u>MODO CACHIMBO</u><b>${esc(x.titulo || 'Título')}</b>${x.subtitulo ? `<em>${esc(x.subtitulo)}</em>` : ''}</span>`}</div>`;
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
  const [r, rc] = await Promise.all([cliente.rpc('libros_admin'), cliente.from('biblioteca_coleccion').select('id,nombre,descripcion,color,orden,visible').order('orden')]);
  if (r.error) {
    caja.innerHTML = /no autorizado/i.test(r.error.message || '') ? '<div class="state-msg error">Tu cuenta no tiene permiso para la biblioteca.</div>'
      : `<div class="state-msg error">No se pudieron leer los libros. ¿Ya corriste <b>supabase/42-biblioteca.sql</b>?<br><small>${esc(r.error.message || '')}</small></div>`;
    return;
  }
  BIB.lista = r.data || [];
  BIB.cols = (!rc.error && rc.data) || [];
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
      <div class="bib-cuerpo" style="margin-top:14px">
        <div>
          <span class="agp-l" style="margin-top:0">Portada</span>
          <div id="bibTapaC"></div>
          <div class="bib-tapa-bts">
            <label id="bibSubirL">Subir foto<input type="file" accept="image/png,image/jpeg,image/webp" id="bibArchivo"></label>
            <button type="button" id="bibQuitar" hidden>Usar la dibujada</button>
            <small>Vertical 5:7 (ej. 1000×1400). También puedes arrastrarla o pegarla (Ctrl+V).</small>
          </div>
        </div>
        <div>
          <div class="agp-2">
            <div><label for="bibTit" style="margin-top:0">Título</label><input class="inp" id="bibTit" maxlength="80" placeholder="Ej.: Física"></div>
            <div><label for="bibSub" style="margin-top:0">Subtítulo (opcional)</label><input class="inp" id="bibSub" maxlength="80" placeholder="Ej.: Cinemática y dinámica"></div>
          </div>
          <div class="agp-2">
            <div><label for="bibCurso">Curso</label><select class="inp" id="bibCurso">${bibCursos().map(([id, n]) => `<option value="${id}">${esc(n)}</option>`).join('')}</select></div>
            <div><label for="bibTipo">Tipo</label><select class="inp" id="bibTipo">${Object.keys(BIB_TIPOS).map(k => `<option value="${k}">${BIB_TIPOS[k]}</option>`).join('')}</select></div>
          </div>
          <div class="agp-2">
            <div><label for="bibCol">Colección (opcional)</label><select class="inp" id="bibCol"><option value="">Sin colección</option>${BIB.cols.map(c => `<option value="${esc(c.id)}">${esc(c.nombre)}</option>`).join('')}</select></div>
            <div><label for="bibPag">Páginas</label><input class="inp" id="bibPag" type="number" min="1" max="5000" placeholder="Se cuentan solas al pegar el link"></div>
          </div>
          <div class="agp-2">
            <div><label for="bibAutor">Autor (opcional)</label><input class="inp" id="bibAutor" maxlength="80" placeholder="Ej.: Prof. Rojas"></div>
            <div><label for="bibEtq">Etiquetas para el buscador (opcional)</label><input class="inp" id="bibEtq" placeholder="Ej.: mruv, caída libre, vectores"></div>
          </div>
          <label for="bibDescr">Descripción (opcional)</label>
          <textarea class="inp" id="bibDescr" maxlength="400" style="min-height:64px;resize:vertical;font-family:inherit;line-height:1.45" placeholder="Qué trae el libro. Sale en su ficha y, si es destacado, en el banner de arriba."></textarea>
          <div class="bib-sws">
            <label class="bib-sw"><input type="checkbox" id="bibDest"><span>Destacado<small>Sale grande arriba de la biblioteca.</small></span></label>
            <label class="bib-sw"><input type="checkbox" id="bibDesc"><span>Se puede descargar<small>Muestra el botón Descargar (de Drive).</small></span></label>
            <label class="bib-sw" hidden><input type="checkbox" id="bibAcc"><span>Pide código de alumno</span></label>
            <label class="bib-sw"><input type="checkbox" id="bibVisible"><span>Que se vea en la biblioteca<small>Apágalo para prepararlo antes.</small></span></label>
          </div>
        </div>
      </div>
      <div class="agp-acc">
        <button class="btn-main" type="button" id="bibGuardar">${e ? 'Guardar cambios' : 'Agregar libro'}</button>
        ${e ? '<button class="btn-ghost" type="button" id="bibCancelar">Cancelar</button>' : ''}
      </div>
    </div>
    <h2 class="bib-h">Colecciones</h2>
    <p class="hint" style="margin:-4px 0 10px">Agrupan libros de varios cursos (Formularios, Pack Ordinario 2027-I…). Cada una sale como un estante en la biblioteca.</p>
    <div id="bibColsC"></div>
    <h2 class="bib-h">Libros (${BIB.lista.length})</h2>
    <div class="bib-filtro" id="bibFiltro"></div>
    <div id="bibListaC"></div>`;
  $('bibLink').value = e ? 'https://drive.google.com/file/d/' + e.drive + '/view' : '';
  $('bibTit').value = e ? e.titulo : '';
  $('bibSub').value = e ? e.subtitulo || '' : '';
  $('bibCurso').value = e ? e.curso : (bibCursos()[0] || [''])[0];
  $('bibTipo').value = e ? e.tipo || 'libro' : 'libro';
  $('bibCol').value = e ? e.coleccion || '' : '';
  $('bibPag').value = e && e.paginas ? e.paginas : '';
  $('bibAutor').value = e ? e.autor || '' : '';
  $('bibEtq').value = e ? (e.etiquetas || []).join(', ') : '';
  $('bibDescr').value = e ? e.descr || '' : '';
  $('bibDest').checked = !!(e && e.destacado);
  $('bibDesc').checked = !!(e && e.descarga);
  $('bibAcc').checked = !!(e && e.acceso === 'codigo');
  $('bibVisible').checked = e ? e.visible !== false : true;
  bibPintarTapa();
  ['bibTit', 'bibSub'].forEach(id => $(id).addEventListener('input', bibPintarTapa));
  $('bibCurso').addEventListener('change', bibPintarTapa);
  $('bibLink').addEventListener('input', () => bibProbar($('bibLink').value));
  $('bibArchivo').addEventListener('change', ev => bibRecibir(ev.target.files[0]));
  $('bibQuitar').addEventListener('click', () => { if (BIB.img) URL.revokeObjectURL(BIB.img.url); BIB.img = null; BIB.quitarPortada = true; bibPintarTapa(); });
  const zona = $('bibTapaC');
  zona.addEventListener('dragover', ev => { ev.preventDefault(); zona.firstElementChild.classList.add('sobre'); });
  zona.addEventListener('dragleave', () => zona.firstElementChild.classList.remove('sobre'));
  zona.addEventListener('drop', ev => { ev.preventDefault(); bibRecibir(ev.dataTransfer.files[0]); });
  $('bibGuardar').addEventListener('click', guardarLibro);
  if ($('bibCancelar')) $('bibCancelar').addEventListener('click', () => { BIB.editando = null; BIB.img = null; BIB.quitarPortada = false; pintarBiblioteca(); });
  $('bibListaC').addEventListener('click', bibAccion);
  $('bibFiltro').addEventListener('click', ev => { const b = ev.target.closest('[data-f]'); if (b) { BIB.filtro = b.dataset.f; bibPintarLista(); } });
  $('bibColsC').addEventListener('click', bibAccionCol);
  bibPintarCols();
  bibPintarLista();
}

/* ---------- Portada ---------- */
function bibPortadaActual() {
  const e = BIB.editando;
  if (BIB.img) return BIB.img.url;
  if (BIB.quitarPortada) return '';
  return e ? e.portada || '' : '';
}
function bibPintarTapa() {
  const src = bibPortadaActual();
  $('bibTapaC').innerHTML = bibTapa({ curso: $('bibCurso').value, titulo: $('bibTit').value.trim(), subtitulo: $('bibSub').value.trim(), portada: src });
  $('bibQuitar').hidden = !src;
  $('bibSubirL').firstChild.textContent = src ? 'Cambiar foto' : 'Subir foto';
}
async function bibRecibir(file) {
  try {
    const prev = await recPreparar(file, BIB_W, BIB_H);
    if (BIB.img) URL.revokeObjectURL(BIB.img.url);
    BIB.img = prev; BIB.quitarPortada = false;
    bibPintarTapa();
    if (prev.chica) toast('La foto es chica: puede verse borrosa', true);
  } catch (err) { toast(err.message || 'No se pudo leer la imagen', true); }
}
document.addEventListener('paste', ev => {
  if (!$('tab-biblioteca') || $('tab-biblioteca').hidden || !$('bibForm')) return;
  if (ev.target && /^(INPUT|TEXTAREA)$/.test(ev.target.tagName) && !(ev.clipboardData && [...ev.clipboardData.items].some(x => x.kind === 'file'))) return;
  const it = [...(ev.clipboardData ? ev.clipboardData.items : [])].find(x => x.kind === 'file' && /^image\//.test(x.type));
  if (!it) return;
  ev.preventDefault();
  bibRecibir(it.getAsFile());
});

/* ---------- Colecciones ---------- */
function bibPintarCols() {
  const ed = BIB.colEd;
  $('bibColsC').innerHTML = `<div class="bib-cols">${BIB.cols.map(c => {
    const n = BIB.lista.filter(l => l.coleccion === c.id).length;
    return `<span class="bib-col" style="--c:${esc(c.color)}">${esc(c.nombre)} <small>${n}</small>
      <button type="button" data-ced="${esc(c.id)}">Editar</button><button type="button" class="rojo" data-cbo="${esc(c.id)}">${BIB.colBorrar === c.id ? '¿Borrar?' : 'Borrar'}</button></span>`;
  }).join('')}<button class="btn-ghost" type="button" data-cnueva="1" style="padding:7px 12px;font-size:13px">+ Nueva colección</button></div>
  ${ed ? `<div class="bib-colform">
    <input class="inp" id="bibColNom" maxlength="60" placeholder="Nombre (ej.: Formularios)">
    <input class="inp" id="bibColDes" maxlength="200" placeholder="Descripción corta (opcional)">
    <div class="bib-colores" id="bibColColores">${BIB_COLORES.map(c => `<button type="button" data-cc="${c}" style="--c:${c}" class="${c === ed.color ? 'on' : ''}" aria-label="${c}"></button>`).join('')}</div>
    <div style="display:flex;gap:6px"><button class="btn-main" type="button" data-cok="1" style="padding:9px 14px">${ed.id ? 'Guardar' : 'Crear'}</button><button class="btn-ghost" type="button" data-cno="1" style="padding:9px 12px">Cancelar</button></div>
  </div>` : ''}`;
  if (ed) { $('bibColNom').value = ed.nombre || ''; $('bibColDes').value = ed.descripcion || ''; $('bibColNom').focus(); }
}
async function bibAccionCol(ev) {
  const b = ev.target.closest('button'); if (!b) return;
  if (b.dataset.cnueva) { BIB.colEd = { color: BIB_COLORES[BIB.cols.length % BIB_COLORES.length] }; bibPintarCols(); return; }
  if (b.dataset.cno) { BIB.colEd = null; bibPintarCols(); return; }
  if (b.dataset.cc) { BIB.colEd.nombre = $('bibColNom').value; BIB.colEd.descripcion = $('bibColDes').value; BIB.colEd.color = b.dataset.cc; bibPintarCols(); return; }
  if (b.dataset.ced) { BIB.colEd = Object.assign({}, BIB.cols.find(c => c.id === b.dataset.ced)); BIB.colBorrar = null; bibPintarCols(); return; }
  const c = await MCAuth.listo;
  if (b.dataset.cok) {
    const nombre = $('bibColNom').value.trim();
    if (!nombre) { toast('Ponle un nombre a la colección', true); return; }
    const ed = BIB.colEd;
    b.disabled = true;
    const r = await c.rpc('guardar_coleccion_libros', { p: { id: ed.id || null, nombre, descripcion: $('bibColDes').value.trim(), color: ed.color, orden: ed.id ? ed.orden : BIB.cols.length, visible: true } });
    if (r.error) { toast('No se pudo guardar: ' + r.error.message, true); b.disabled = false; return; }
    toast(ed.id ? 'Colección guardada' : 'Colección creada: elígela en los libros');
    BIB.colEd = null; recargarBiblioteca(); return;
  }
  if (b.dataset.cbo) {
    if (BIB.colBorrar !== b.dataset.cbo) { BIB.colBorrar = b.dataset.cbo; bibPintarCols(); return; }
    BIB.colBorrar = null;
    const r = await c.rpc('borrar_coleccion_libros', { p_id: b.dataset.cbo });
    if (r.error) { toast('No se pudo borrar: ' + r.error.message, true); return; }
    toast('Colección borrada; sus libros siguen en la biblioteca');
    recargarBiblioteca();
  }
}
// Recarga sin perder lo que estás escribiendo en el formulario del libro
async function recargarBiblioteca() {
  const c = await MCAuth.listo;
  const [r, rc] = await Promise.all([c.rpc('libros_admin'), c.from('biblioteca_coleccion').select('id,nombre,descripcion,color,orden,visible').order('orden')]);
  if (!r.error) BIB.lista = r.data || [];
  if (!rc.error) BIB.cols = rc.data || [];
  const sel = $('bibCol'), v = sel.value;
  sel.innerHTML = '<option value="">Sin colección</option>' + BIB.cols.map(x => `<option value="${esc(x.id)}">${esc(x.nombre)}</option>`).join('');
  sel.value = BIB.cols.some(x => x.id === v) ? v : '';
  bibPintarCols(); bibPintarLista();
}

/* ---------- Lista ---------- */
function bibPintarLista() {
  const orden = bibCursos().map(c => c[0]);
  const cursos = [...new Set(BIB.lista.map(x => x.curso))].sort((a, b) => orden.indexOf(a) - orden.indexOf(b));
  if (BIB.filtro && !cursos.includes(BIB.filtro)) BIB.filtro = '';
  $('bibFiltro').hidden = cursos.length < 2;
  $('bibFiltro').innerHTML = `<button type="button" class="agp-op${BIB.filtro ? '' : ' on'}" data-f="">Todos ${BIB.lista.length}</button>` +
    cursos.map(id => `<button type="button" class="agp-op${BIB.filtro === id ? ' on' : ''}" data-f="${id}" style="--c:${bibColor(id)}">${esc(bibNombre(id))} ${BIB.lista.filter(x => x.curso === id).length}</button>`).join('');
  const l = BIB.lista.filter(x => !BIB.filtro || x.curso === BIB.filtro).sort((a, b) => (orden.indexOf(a.curso) - orden.indexOf(b.curso)) || (a.orden - b.orden));
  $('bibListaC').innerHTML = l.length ? '<div class="bib-lista">' + l.map(x => `<div class="bib-it${x.visible ? '' : ' oculto'}">
      ${bibTapa(x)}
      <div class="tx"><b>${esc(x.titulo)}${x.subtitulo ? ' · ' + esc(x.subtitulo) : ''}</b>
        <small>${esc(bibNombre(x.curso))} · ${x.paginas ? x.paginas + ' págs' : 'páginas sin contar'} · ${x.lectores} lo abrieron</small>
        <span class="tag" style="--c:#A99FC8">${esc(BIB_TIPOS[x.tipo] || 'Libro')}</span>${x.coleccion ? `<span class="tag" style="--c:${esc((BIB.cols.find(c => c.id === x.coleccion) || {}).color || '#CE82FF')}">${esc(bibColNombre(x.coleccion))}</span>` : ''}${x.destacado ? '<span class="tag" style="--c:#C6E000">Destacado</span>' : ''}${x.portada ? '' : '<span class="tag" style="--c:#6F6690">Sin foto</span>'}${x.visible ? '' : '<span class="tag" style="--c:#8a83a8">Oculto</span>'}</div>
      <div class="bts">
        <button class="btn-ghost" type="button" data-sube="${esc(x.id)}" title="Subir en su curso">↑</button>
        <button class="btn-ghost" type="button" data-baja="${esc(x.id)}" title="Bajar en su curso">↓</button>
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
    if (tit && !$('bibTit').value.trim()) { $('bibTit').value = String(tit).slice(0, 80); bibPintarTapa(); }
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
  const orden = e && e.curso === curso ? e.orden : BIB.lista.filter(x => x.curso === curso).length;
  const bt = $('bibGuardar'); bt.disabled = true; bt.innerHTML = '<span class="spin-s"></span> ' + (BIB.img ? 'Subiendo portada…' : 'Guardando…');
  try {
    const c = await MCAuth.listo;
    let portada = BIB.quitarPortada ? '' : e ? e.portada || '' : '';
    const vieja = e && e.portada && (BIB.img || BIB.quitarPortada) ? recRuta(e.portada) : '';
    if (BIB.img) {
      const ruta = 'portadas/' + (e ? e.id : 'n') + '-' + Date.now().toString(36) + '.' + BIB.img.ext;
      const up = await c.storage.from('recursos').upload(ruta, BIB.img.blob, { contentType: BIB.img.blob.type, cacheControl: '31536000', upsert: false });
      if (up.error) throw up.error;
      portada = c.storage.from('recursos').getPublicUrl(ruta).data.publicUrl;
    }
    bt.innerHTML = '<span class="spin-s"></span> Guardando…';
    const r = await c.rpc('guardar_libro', { p: {
      id: e ? e.id : null, titulo, subtitulo: $('bibSub').value.trim(), curso, drive, paginas: parseInt($('bibPag').value, 10) || null, orden,
      visible: $('bibVisible').checked, portada, tipo: $('bibTipo').value, autor: $('bibAutor').value.trim(), descr: $('bibDescr').value.trim(),
      coleccion: $('bibCol').value || null, destacado: $('bibDest').checked, descarga: $('bibDesc').checked, acceso: $('bibAcc').checked ? 'codigo' : 'libre',
      etiquetas: $('bibEtq').value.split(/[,;\n]+/).map(x => x.trim()).filter(Boolean).slice(0, 12) } });
    if (r.error) throw r.error;
    if (vieja) c.storage.from('recursos').remove([vieja]).then(() => {}, () => {});
    toast(e ? 'Cambios guardados' : 'Libro agregado: ya sale en la biblioteca');
    if (BIB.img) URL.revokeObjectURL(BIB.img.url);
    BIB.editando = null; BIB.img = null; BIB.quitarPortada = false;
    cargarBiblioteca();
  } catch (err) {
    toast('No se pudo guardar: ' + (err.message || 'error'), true);
    bt.disabled = false; bt.textContent = e ? 'Guardar cambios' : 'Agregar libro';
  }
}

async function bibAccion(ev) {
  const b = ev.target.closest('button'); if (!b) return;
  const x = BIB.lista.find(l => l.id === (b.dataset.ed || b.dataset.vi || b.dataset.bo || b.dataset.sube || b.dataset.baja));
  if (!x) return;
  if (b.dataset.ed) { BIB.editando = x; BIB.img = null; BIB.quitarPortada = false; BIB.borrar = null; pintarBiblioteca(); window.scrollTo(0, 0); return; }
  const c = await MCAuth.listo;
  if (b.dataset.sube || b.dataset.baja) {
    // Cambia de lugar con el de al lado en su curso y guarda el orden de todos
    const hermanos = BIB.lista.filter(l => l.curso === x.curso).sort((a, b2) => a.orden - b2.orden);
    const i = hermanos.indexOf(x), j = i + (b.dataset.sube ? -1 : 1);
    if (j < 0 || j >= hermanos.length) return;
    [hermanos[i], hermanos[j]] = [hermanos[j], hermanos[i]];
    const cambios = hermanos.map((l, k) => ({ l, k })).filter(({ l, k }) => l.orden !== k);
    cambios.forEach(({ l, k }) => { l.orden = k; });
    bibPintarLista();
    const rs = await Promise.all(cambios.map(({ l }) => c.rpc('guardar_libro', { p: l })));
    if (rs.some(r => r.error)) toast('No se pudo guardar el orden', true);
    return;
  }
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
    if (x.portada) c.storage.from('recursos').remove([recRuta(x.portada)]).then(() => {}, () => {});
    toast('Libro borrado de la biblioteca (el PDF sigue en tu Drive)');
    if (BIB.editando && BIB.editando.id === x.id) BIB.editando = null;
    cargarBiblioteca();
  }
}
