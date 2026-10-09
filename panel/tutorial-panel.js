/* =========================================================
   Panel · Tutorial de primera visita
   ========================================================= */
const TU = { datos: null, pag: 'inicio', cambios: false };
const TU_PAGS = [['inicio', 'Inicio'], ['area', 'Área'], ['curso', 'Página del curso'], ['libros', 'Años y temario'],
  ['estudio', 'Modo estudio (tema)'], ['quiz', 'Modo quiz'], ['repaso', 'Repaso'], ['fijas', 'Fijas'], ['simulacro', 'Simulacro'],
  ['duelo', 'Duelos'], ['falladas', 'Repasar mis falladas']];

function tuPagina(k) {
  const p = TU.datos.paginas[k] = TU.datos.paginas[k] || { activa: false, version: 1, boton: true, pasos: [] };
  return p;
}
function tuMarcar() { TU.cambios = true; $('tuGuardar').disabled = false; $('tuEstado').textContent = 'Cambios sin guardar'; }

async function cargarTutorial() {
  $('tuBody').innerHTML = '<div class="loader">Cargando tutorial…</div>';
  try {
    TU.datos = (await api('tutorial')).tutorial;
    TU.datos.paginas = TU.datos.paginas || {};
    TU.cambios = false;
    renderTutorial();
  } catch (e) { $('tuBody').innerHTML = `<div class="state-msg error">${esc(e.message)}</div>`; }
}

// Página de ejemplo para la vista previa
function tuUrlEjemplo(k) {
  const c = (REG && REG.cursos || []).find(x => !x.oculto && x.repaso && x.repaso.anio) || { id: 'biologia', area: 'ciencia-tecnologia', repaso: { anio: '2027-I' } };
  const y = encodeURIComponent(c.repaso.anio);
  const rutas = { inicio: '', area: 'areas/' + c.area + '.html', curso: c.id + '/index.html', libros: c.id + '/libros/index.html',
    estudio: c.id + '/libros/tema.html?year=' + y + '&tema=01', quiz: c.id + '/libros/quiz.html?year=' + y + '&tema=01',
    repaso: c.id + '/repaso.html?year=' + y, fijas: c.id + '/fijas.html?year=' + y, simulacro: 'simulacro.html', duelo: 'duelo.html', falladas: 'falladas.html' };
  const r = rutas[k];
  return SITE_ROOT + r + (r.includes('?') ? '&' : '?') + 'tutorial=borrador';
}

function renderTutorial() {
  const T = TU.datos, pg = tuPagina(TU.pag);
  const objs = [['centro', 'Sin resaltar (mensaje al centro)']].concat(((window.MCTutorial && MCTutorial.objetivos[TU.pag]) || []).map(o => [o[0], o[1]]));
  $('tuBody').innerHTML = `
    <div class="acc-box" style="margin-bottom:16px;">
      <div class="acc-row" style="border-top:none;padding-top:0;">
        <div><b>Tutorial de primera visita</b><span>Se muestra una sola vez a cada alumno, en cada página donde esté activo.</span></div>
        <label class="sw"><input type="checkbox" id="tuGlobal" ${T.activo !== false ? 'checked' : ''}><span></span>${T.activo !== false ? 'Encendido' : 'Apagado'}</label>
      </div>
    </div>
    <div class="chips" id="tuPags">${TU_PAGS.map(([k, l]) => {
      const p = T.paginas[k], n = p ? (p.pasos || []).length : 0;
      return `<button type="button" class="chip ${k === TU.pag ? 'on' : ''}" data-k="${k}">${esc(l)} <span class="c">${p && p.activa && n ? n + ' pasos' : 'apagado'}</span></button>`;
    }).join('')}</div>
    <div class="acc-box">
      <div class="tu-top">
        <label class="sw"><input type="checkbox" id="tuActiva" ${pg.activa ? 'checked' : ''}><span></span>Activo en esta página</label>
        <label class="sw"><input type="checkbox" id="tuBoton" ${pg.boton !== false ? 'checked' : ''}><span></span>Botón "?" para volver a verlo</label>
        <span class="hint" style="margin-left:auto;">Versión ${pg.version || 1}</span>
      </div>
      <div id="tuPasos">${(pg.pasos || []).map((p, i) => `
        <div class="tu-paso" data-i="${i}">
          <div class="tu-num">${i + 1}</div>
          <div class="tu-campos">
            <select class="inp" data-f="objetivo">${objs.map(([v, l]) => `<option value="${esc(v)}" ${v === (p.objetivo || 'centro') ? 'selected' : ''}>✦ ${esc(l)}</option>`).join('')}</select>
            <input class="inp" data-f="titulo" maxlength="80" value="${esc(p.titulo)}" placeholder="Título (opcional)">
            <textarea class="ta" data-f="texto" maxlength="500" style="min-height:70px" placeholder="Texto del paso. Usa **negrita**.">${esc(p.texto)}</textarea>
          </div>
          <div class="tu-acc">
            <button class="rbtn" type="button" data-mv="-1" ${i === 0 ? 'disabled' : ''}>↑</button>
            <button class="rbtn" type="button" data-mv="1" ${i === pg.pasos.length - 1 ? 'disabled' : ''}>↓</button>
            <button class="rbtn danger" type="button" data-del>✕</button>
          </div>
        </div>`).join('') || '<div class="state-msg" style="padding:26px;">Esta página aún no tiene pasos. Agrega el primero.</div>'}</div>
      <div class="rfoot" style="justify-content:space-between;">
        <button class="rbtn" type="button" id="tuAdd" ${pg.pasos.length >= 12 ? 'disabled' : ''}>＋ Agregar paso</button>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="rbtn" type="button" id="tuReset" title="Los alumnos que ya lo vieron lo verán de nuevo">Mostrar otra vez a todos</button>
          <button class="rbtn link" type="button" id="tuPrev">Vista previa ${ICON_EXT}</button>
        </div>
      </div>
    </div>`;
  $('tuGlobal').addEventListener('change', e => { T.activo = e.target.checked; tuMarcar(); renderTutorial(); });
  $('tuPags').querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => { TU.pag = b.dataset.k; renderTutorial(); }));
  $('tuActiva').addEventListener('change', e => { pg.activa = e.target.checked; tuMarcar(); renderTutorial(); });
  $('tuBoton').addEventListener('change', e => { pg.boton = e.target.checked; tuMarcar(); });
  $('tuPasos').querySelectorAll('.tu-paso').forEach(row => {
    const p = pg.pasos[+row.dataset.i];
    row.querySelectorAll('[data-f]').forEach(inp => inp.addEventListener('input', () => { p[inp.dataset.f] = inp.value; tuMarcar(); }));
    row.querySelectorAll('[data-mv]').forEach(b => b.addEventListener('click', () => {
      const i = +row.dataset.i, j = i + +b.dataset.mv;
      [pg.pasos[i], pg.pasos[j]] = [pg.pasos[j], pg.pasos[i]]; tuMarcar(); renderTutorial();
    }));
    row.querySelector('[data-del]').addEventListener('click', () => { pg.pasos.splice(+row.dataset.i, 1); tuMarcar(); renderTutorial(); });
  });
  $('tuAdd').addEventListener('click', () => { pg.pasos.push({ objetivo: 'centro', titulo: '', texto: '' }); if (!pg.activa) pg.activa = true; tuMarcar(); renderTutorial(); });
  $('tuReset').addEventListener('click', () => { pg.version = (pg.version || 1) + 1; tuMarcar(); renderTutorial(); toast('Al guardar, todos verán otra vez el tutorial de esta página'); });
  $('tuPrev').addEventListener('click', () => {
    if (!pg.pasos.length) { toast('Agrega al menos un paso', true); return; }
    const copia = JSON.parse(JSON.stringify(T)); copia.activo = true; copia.paginas[TU.pag].activa = true;
    try { localStorage.setItem('mc_tutorial_borrador', JSON.stringify(copia)); } catch (e) { toast('Tu navegador no permite la vista previa', true); return; }
    window.open(tuUrlEjemplo(TU.pag), '_blank');
  });
  $('tuGuardar').disabled = !TU.cambios;
  $('tuEstado').textContent = TU.cambios ? 'Cambios sin guardar' : '';
}

async function guardarTutorial() {
  const T = TU.datos;
  for (const [k, l] of TU_PAGS) {
    const p = T.paginas[k]; if (!p) continue;
    const i = (p.pasos || []).findIndex(x => !String(x.texto || '').trim());
    if (i >= 0) { TU.pag = k; renderTutorial(); toast(`${l}: el paso ${i + 1} no tiene texto`, true); return; }
  }
  const b = $('tuGuardar'); b.disabled = true; b.innerHTML = '<span class="spin-s"></span> Publicando…';
  try {
    TU.datos = (await api('guardarTutorial', { tutorial: JSON.stringify(T) })).tutorial;
    TU.cambios = false; renderTutorial();
    toast('Tutorial publicado · se verá en la web en 1 a 10 minutos');
  } catch (e) { toast(e.message, true); b.disabled = false; }
  b.textContent = 'Guardar y publicar';
}
