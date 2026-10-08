/* =========================================================
   Panel · Subir examen (Ordinario, CPU, Examen de control)
   Usa la misma pantalla que "Subir tema" (subir.js). Formato:
     EXAMEN: Ordinario
     CICLO: 2027-I
     CURSO: Lenguaje
     TEMA: Lenguaje audiovisual      (opcional)
     PREGUNTA 1:
     …
     CURSO: Literatura
     PREGUNTA 6:
     …
   Se guarda en examenes/<tipo>/data/<ciclo>.json
   ========================================================= */
const TIPOS_EXAMEN = { ordinario: 'Ordinario', cpu: 'CPU', 'control-cpu': 'Examen de control' };

function detectarTipoExamen(txt) {
  const t = sinTildes(txt);
  if (/control/.test(t)) return 'control-cpu';
  if (/cpu|pre/.test(t)) return 'cpu';
  if (/ordinario|admision/.test(t)) return 'ordinario';
  return '';
}
function areaDeCurso(id) {
  const c = REG && (REG.cursos || []).find(x => x.id === id);
  const a = c && (REG.areas || []).find(x => x.id === c.area);
  return a ? a.nombre : '';
}

// Parte el examen en bloques por CURSO: / TEMA: y lee cada bloque con parsearTexto (subir.js)
function parsearExamen(raw) {
  const meta = { tipo: '', ciclo: '' };
  const bloques = [];
  let cur = { curso: '', tema: '', lines: [] };
  const cerrar = () => { if (cur.lines.some(l => l.trim())) bloques.push(cur); };
  String(raw || '').replace(/\r/g, '').split('\n').forEach(linea => {
    const l = linea.trim();
    let m;
    if ((m = l.match(/^(EXAMEN|TIPO)\s*:\s*(.+)$/i))) { meta.tipo = detectarTipoExamen(m[2]) || meta.tipo; return; }
    if ((m = l.match(/^(CICLO|AÑO|ANIO|PERIODO)\s*:\s*(.+)$/i))) { meta.ciclo = m[2].trim(); return; }
    if ((m = l.match(/^(CURSO|ASIGNATURA)\s*:\s*(.+)$/i))) { cerrar(); cur = { curso: m[2].trim(), tema: '', lines: [] }; return; }
    if ((m = l.match(/^TEMA\s*:\s*(.+)$/i))) { cerrar(); cur = { curso: cur.curso, tema: m[1].replace(/^N?[°º]?\s*\d{1,3}\s*[-–—:.)]\s*/, '').trim(), lines: [] }; return; }
    cur.lines.push(linea);
  });
  cerrar();

  const preguntas = [], avisos = [], vistos = {};
  bloques.forEach(b => {
    const r = parsearTexto(b.lines.join('\n'));
    r.avisos.filter(a => !/está en la posición/.test(a)).forEach(a => avisos.push(a));
    const id = detectarCurso(b.curso);
    if (b.curso && !id) avisos.push('No reconocí el curso "' + b.curso + '"; se guardará tal cual.');
    r.preguntas.forEach(q => {
      q.asignatura = id ? NOMBRE[id] : b.curso;
      q.area = id ? areaDeCurso(id) : '';
      q.tema = b.tema;
      if (!b.curso) q.errores.push('Falta la línea CURSO: arriba de esta pregunta');
      if (vistos[q.num]) avisos.push('La PREGUNTA ' + q.num + ' está repetida');
      vistos[q.num] = true;
      preguntas.push(q);
    });
  });
  return { meta, preguntas, avisos };
}

function validarMetaExamen() {
  const tipo = $('exTipo').value, ciclo = normalizarCiclo($('exCiclo').value);
  const errs = [];
  if (!TIPOS_EXAMEN[tipo]) errs.push('elige el examen');
  if (!/^\d{4}-(I|II|III)$/.test(ciclo)) errs.push('el ciclo debe ser como 2027-I');
  const malas = SUB.parse.preguntas.filter(q => q.errores.length).length;
  if (malas) errs.push('corrige ' + malas + ' pregunta' + (malas > 1 ? 's' : ''));
  const sinImg = Object.keys(SUB.zonas).filter(k => !/\|g$/.test(k) && SUB.zonas[k].estado().cambio !== 'nueva').length;
  if (sinImg) errs.push('pega ' + (sinImg === 1 ? 'la imagen que falta' : 'las ' + sinImg + ' imágenes que faltan'));
  const n = SUB.parse.preguntas.length;
  const cursos = new Set(SUB.parse.preguntas.map(q => q.asignatura).filter(Boolean)).size;
  $('subResumen').innerHTML = errs.length
    ? `<span class="bad">Falta: ${errs.join(', ')}.</span>`
    : `<b>${n} pregunta${n > 1 ? 's' : ''}</b> de ${cursos} curso${cursos > 1 ? 's' : ''} · <b>${esc(TIPOS_EXAMEN[tipo])}</b> ${esc(ciclo)}`;
  $('subPublicar').disabled = !!errs.length;
}

// Si el examen ya existe → 'reemplazar' | 'agregar' | null
function elegirModoExamen(nombre, actuales, nuevas) {
  return new Promise(resolve => {
    const o = document.createElement('div');
    o.className = 'ov';
    o.innerHTML = `<div class="mcard" style="max-width:520px;">
      <div class="eyebrow" style="color:var(--amber)">Este examen ya existe</div>
      <h3>${esc(nombre)}</h3>
      <p class="sub" style="margin-top:6px;">Ya tiene <b>${actuales} pregunta${actuales > 1 ? 's' : ''}</b> publicadas. ¿Qué hago con las ${nuevas} nuevas?</p>
      <div class="modo-op" data-m="reemplazar"><b>Reemplazar el examen completo</b><span>Quedarán solo las ${nuevas} nuevas.</span></div>
      <div class="modo-op" data-m="agregar"><b>Agregar al final</b><span>El examen quedará con ${actuales + nuevas} preguntas.</span></div>
      <div class="mfoot"><button type="button" class="btn-ghost" data-m="">Cancelar</button></div>
    </div>`;
    document.body.appendChild(o);
    o.addEventListener('click', e => {
      const b = e.target.closest('[data-m]');
      if (!b && e.target !== o) return;
      o.remove(); resolve(b ? (b.dataset.m || null) : null);
    });
  });
}

async function publicarExamen() {
  const tipo = $('exTipo').value, ciclo = normalizarCiclo($('exCiclo').value);
  const nombre = TIPOS_EXAMEN[tipo] + ' ' + ciclo;
  const btn = $('subPublicar');
  btn.disabled = true; btn.innerHTML = '<span class="spin-s"></span> Revisando…';
  try {
    let modo = 'nuevo';
    const actual = (await api('examen', { tipo, ciclo })).preguntas || [];
    if (actual.length) {
      modo = await elegirModoExamen(nombre, actual.length, SUB.parse.preguntas.length);
      if (!modo) { btn.disabled = false; btn.textContent = 'Publicar examen'; return; }
    }
    const { preguntas, imagenes } = armarConImagenes(
      (q, ext) => imgRuta('examen-' + tipo, ciclo, q.num, ext),
      q => ({ num: String(q.num), area: q.area, asignatura: q.asignatura, tema: q.tema, topic: q.asignatura + ' · ' + ciclo }));
    btn.innerHTML = '<span class="spin-s"></span> ' + (imagenes.length ? `Subiendo ${imagenes.length} imagen${imagenes.length > 1 ? 'es' : ''} y publicando…` : 'Publicando…');
    const r = await api('publicarExamen', { tipo, ciclo, modo, preguntas: JSON.stringify(preguntas), imagenes: JSON.stringify(imagenes) });
    ss('del', SUB.borrador);
    const url = SITE_ROOT + 'examenes/' + tipo + '/ver.html?year=' + encodeURIComponent(ciclo);
    $('subPaso2').hidden = true;
    $('subListo').hidden = false;
    $('subListo').innerHTML = `<div class="done">
        <div class="ico">${ICON_OK}</div>
        <div class="eyebrow">Publicado</div>
        <h3>¡Examen publicado!</h3>
        <p><b style="color:#f5ffcc">${esc(nombre)}</b><br>
        ${modo === 'agregar' ? (preguntas.length === 1 ? 'Se agregó 1 pregunta' : 'Se agregaron ' + preguntas.length + ' preguntas') + '; el examen ahora tiene ' + r.preguntas + '.' : r.preguntas + ' preguntas' + (imagenes.length ? ' y ' + imagenes.length + ' imagen' + (imagenes.length > 1 ? 'es' : '') : '') + '.'}
        <br>Los alumnos lo verán en 1 a 10 minutos.</p>
        <div class="mfoot" style="justify-content:center;">
          <a class="rbtn link" href="${esc(url)}" target="_blank" rel="noopener">Ver en la web ${ICON_EXT}</a>
          <button type="button" class="btn-main" id="subOtro">Subir otro examen</button>
        </div></div>`;
    $('subOtro').addEventListener('click', () => {
      $('subTexto').value = ''; SUB.parse = null; SUB.zonas = {};
      $('subListo').hidden = true; $('subPaso1').hidden = false;
    });
    window.scrollTo(0, 0);
  } catch (e) {
    toast(e.message === 'EXAMEN_EXISTE' ? 'Ese examen ya existe; vuelve a publicar y elige qué hacer.' : /Acción no válida|desconocida/i.test(e.message) ? 'Falta actualizar el Apps Script (versión 3) para subir exámenes.' : e.message, true);
  }
  btn.disabled = false; btn.textContent = 'Publicar examen';
  validarMeta();
}
