/* =========================================================
   Panel · Subir tema
   Formato:
     CURSO: Lenguaje
     CICLO: 2027-I
     TEMA: 01 - Teoría de la información
     PREGUNTA 1:
     Enunciado… (ecuaciones entre $…$)
     A) …
     B) … ✅
   Además (se ve con assets/pregunta.js):
     [IMAGEN]           pega una imagen en esa línea del enunciado
     [IMAGEN DERECHA]   imagen al lado de las alternativas
     | a | b |          tabla        I. CaO || p) cal viva   columnas
     A) VVV   B) FVV   C) VVF       varias alternativas en una línea
     TEXTO 03:          lectura que comparten las preguntas de abajo
     …                  (hasta el siguiente TEXTO o hasta FIN TEXTO)
   ========================================================= */
const MARCA = /\s*(✅|✔️|✔|☑️|☑|✓)\s*/gu;
const LETRAS = 'ABCDEF';
const MAX_IMG = 6;

// "[imagen]", "[ IMAGEN A LA DERECHA ]"… → '[IMAGEN]' | '[IMAGEN DERECHA]' | null
function marcaImagen(l) {
  const m = sinTildes(l).match(/^\[\s*imagen(?:\s+(?:a\s+la\s+)?(derecha))?\s*\]$/);
  return m ? (m[1] ? '[IMAGEN DERECHA]' : '[IMAGEN]') : null;
}
// "A) VVV   B) FVV  C) VVF" → ['A) VVV', 'B) FVV', 'C) VVF'] (solo si las letras siguen en orden)
function partirAlternativas(l, desde) {
  const partes = [];
  let resto = l, k = desde;
  while (k + 1 < LETRAS.length) {
    const sig = LETRAS[k + 1];
    const m = resto.match(new RegExp('^(.*?\\S)\\s+\\(?(' + sig + ')\\s*\\)\\s*(.*)$'));
    if (!m) break;
    partes.push(m[1]); resto = m[2] + ') ' + m[3]; k++;
  }
  partes.push(resto);
  return partes;
}

function sinTildes(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
function detectarCurso(txt) {
  const t = sinTildes(txt).replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const alias = { 'raz verbal': 'raz-verbal', 'rv': 'raz-verbal', 'razonamiento verbal': 'raz-verbal', 'hist del peru': 'historia-peru', 'historia peru': 'historia-peru', 'hist universal': 'historia-universal' };
  if (alias[t]) return alias[t];
  const hit = CURSOS.find(([id, nom]) => sinTildes(nom) === t || id.replace(/-/g, ' ') === t) ||
              CURSOS.find(([id, nom]) => sinTildes(nom).startsWith(t) || t.startsWith(sinTildes(nom)));
  return hit ? hit[0] : '';
}
function normalizarCiclo(s) {
  const m = String(s || '').toUpperCase().replace(/\s+/g, '').match(/^(\d{4})[-–_]?(III|II|I)$/);
  return m ? m[1] + '-' + m[2] : String(s || '').trim();
}

// Lee el texto y devuelve { meta, preguntas: [{num, text, options, correct, errores[]}], avisos[] }
function parsearTexto(raw) {
  const meta = { curso: '', ciclo: '', tema: '', nombre: '' };
  const preguntas = [], avisos = [];
  let cur = null, lastOpt = null, lectura = null, enLectura = false;
  const lecturas = [];
  const lineas = String(raw || '').replace(/\r/g, '').split('\n');
  for (const linea of lineas) {
    const l = linea.trim();
    if (enLectura && !l) { lectura.lines.push(''); continue; }
    if (!l || /^[-=_*]{3,}$/.test(l)) continue;
    let m;
    // Lectura compartida: "TEXTO 03:" … hasta la PREGUNTA; vale para las preguntas de abajo
    if ((m = l.match(/^(TEXTO|LECTURA)\s*(?:N?[°º]?\s*(\d{1,3}))?\s*[:.]?\s*$/i))) {
      lectura = { titulo: m[1].toUpperCase() + (m[2] ? ' ' + m[2] : ''), lines: [], n: 0 };
      lecturas.push(lectura); enLectura = true; cur = null; lastOpt = null; continue;
    }
    if (/^(FIN\s+(DEL\s+)?(TEXTO|LECTURA)|\[\/(TEXTO|LECTURA)\])$/i.test(l)) { lectura = null; enLectura = false; continue; }
    if (!cur && !enLectura && (m = l.match(/^(CURSO|ASIGNATURA)\s*:\s*(.+)$/i))) { meta.curso = m[2].trim(); continue; }
    if (!cur && !enLectura && (m = l.match(/^(CICLO|AÑO|ANIO|PERIODO)\s*:\s*(.+)$/i))) { meta.ciclo = m[2].trim(); continue; }
    if (!cur && !enLectura && (m = l.match(/^TEMA\s*:?\s*N?[°º]?\s*(\d{1,3})\s*[-–—:.)]?\s*(.*)$/i))) { meta.tema = m[1]; meta.nombre = m[2].trim(); continue; }
    if ((m = l.match(/^PREGUNTA\s*N?[°º]?\s*(\d{1,3})\s*(?:[:.)]\s*(.*))?$/i))) {
      cur = { num: +m[1], textLines: m[2] ? [m[2]] : [], options: [], marcas: [], clave: null, lec: lectura };
      if (lectura) lectura.n++;
      preguntas.push(cur); lastOpt = null; enLectura = false; continue;
    }
    if (enLectura) {
      if (marcaImagen(l)) lectura.malas = true; else lectura.lines.push(l);
      continue;
    }
    if (!cur) { avisos.push('Línea ignorada (antes de la PREGUNTA 1): "' + l.slice(0, 60) + '"'); continue; }
    const marca = marcaImagen(l);
    if (marca) {
      if (lastOpt && marca === '[IMAGEN]') cur.malas = (cur.malas || 0) + 1;
      else cur.textLines.push(marca);
      continue;
    }
    if ((m = l.match(/^(?:RESPUESTA|CLAVE|RPTA\.?)\s*(?:CORRECTA)?\s*[:=]?\s*\(?([A-Fa-f])\)?\s*$/i))) { cur.clave = m[1].toUpperCase(); continue; }
    const esperada = LETRAS[cur.options.length];
    if (esperada && (m = l.match(/^\(?([A-Fa-f])\s*[).]\s*(.*)$/)) && m[1].toUpperCase() === esperada) {
      partirAlternativas(m[2], cur.options.length).forEach((pt, j) => {
        let t = j ? pt.replace(/^\(?[A-F]\s*\)\s*/, '') : pt;
        MARCA.lastIndex = 0;
        if (MARCA.test(t)) { cur.marcas.push(cur.options.length); MARCA.lastIndex = 0; t = t.replace(MARCA, ' ').trim(); }
        lastOpt = { letter: LETRAS[cur.options.length], text: t.trim() };
        cur.options.push(lastOpt);
      });
      continue;
    }
    if (lastOpt) {
      MARCA.lastIndex = 0;
      if (MARCA.test(l)) { if (!cur.marcas.includes(cur.options.length - 1)) cur.marcas.push(cur.options.length - 1); MARCA.lastIndex = 0; }
      const extra = l.replace(MARCA, ' ').trim();
      if (extra) lastOpt.text += ' ' + extra;
    } else cur.textLines.push(l);
  }
  lecturas.forEach(x => {
    x.cuerpo = x.lines.join('\n').trim();
    if (!x.n) avisos.push('El ' + x.titulo + ' no tiene preguntas debajo (escribe PREGUNTA … después del texto)');
  });
  preguntas.forEach((q, i) => {
    q.text = q.textLines.join('\n').trim();
    delete q.textLines;
    q.errores = [];
    const x = q.lec; delete q.lec;
    q.lectura = x && x.cuerpo ? '[' + x.titulo + ']\n' + x.cuerpo + '\n[/TEXTO]\n' : '';
    if (x && !x.cuerpo) q.errores.push('El ' + x.titulo + ' está vacío');
    if (x && x.malas) q.errores.push('Por ahora el ' + x.titulo + ' no puede llevar [IMAGEN]; ponla en la pregunta');
    if (q.clave) {
      const idx = q.options.findIndex(o => o.letter === q.clave);
      if (idx < 0) q.errores.push('La clave ' + q.clave + ' no existe entre las alternativas');
      else if (q.marcas.length && !q.marcas.includes(idx)) q.errores.push('La ✅ y la CLAVE no coinciden');
      else q.correct = idx;
    } else if (q.marcas.length === 1) q.correct = q.marcas[0];
    else if (q.marcas.length > 1) q.errores.push('Tiene más de una ✅');
    if (!q.text) q.errores.push('Falta el enunciado');
    if (q.options.length < 2) q.errores.push('Tiene menos de 2 alternativas');
    q.options.forEach(o => { if (!o.text) q.errores.push('La alternativa ' + o.letter + ' está vacía'); });
    const marcas = (q.text.match(/^\[IMAGEN( DERECHA)?\]$/gm) || []);
    q.marcasImg = marcas.length;
    if (q.malas) q.errores.push('La marca [IMAGEN] va en el enunciado, antes de las alternativas (o usa [IMAGEN DERECHA])');
    delete q.malas;
    if (marcas.filter(x => x === '[IMAGEN DERECHA]').length > 1) q.errores.push('Solo puede haber una [IMAGEN DERECHA]');
    if (marcas.length > MAX_IMG) q.errores.push('Máximo ' + MAX_IMG + ' imágenes por pregunta');
    if (q.text && !q.text.replace(/^\[IMAGEN( DERECHA)?\]$/gm, '').trim()) q.errores.push('Falta el enunciado');
    if (q.correct == null && !q.errores.length) q.errores.push('Falta marcar la clave con ✅');
    if (q.num !== i + 1) avisos.push('La PREGUNTA ' + q.num + ' está en la posición ' + (i + 1) + ' (se numerará como ' + (i + 1) + ')');
  });
  return { meta, preguntas, avisos };
}

/* ---------- Vista previa (igual que la web del alumno) ---------- */
function formatQText(str) {
  let e = esc(str);
  e = e.replace(/&lt;u&gt;(.+?)&lt;\/u&gt;/g, '<u>$1</u>');
  e = e.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  e = e.replace(/\*(.+?)\*/g, '<em>$1</em>');
  return e;
}
function renderMath(el) {
  if (window.renderMathInElement) {
    renderMathInElement(el, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false });
  }
}

const SUB = { parse: null, zonas: {}, borrador: 'mc_panel_borrador' };

function initSubir() {
  const ta = $('subTexto');
  if (!ta.dataset.listo) {
    ta.dataset.listo = '1';
    const b = ss('get', SUB.borrador); if (b && !ta.value) ta.value = b;
    ta.addEventListener('input', () => ss('set', SUB.borrador, ta.value));
    $('subArchivo').addEventListener('change', async e => {
      const f = e.target.files[0]; e.target.value = '';
      if (!f) return;
      if (f.size > 2000000) { toast('El archivo es muy grande', true); return; }
      ta.value = await f.text(); ss('set', SUB.borrador, ta.value);
      toast('Archivo cargado: ' + f.name);
    });
    $('subRevisar').addEventListener('click', revisarTexto);
    $('subVolver').addEventListener('click', () => { $('subPaso2').hidden = true; $('subPaso1').hidden = false; window.scrollTo(0, 0); });
    $('subPublicar').addEventListener('click', publicarTema);
    ['subCurso', 'subCiclo', 'subNum', 'subNombre', 'subDestino'].forEach(id => $(id).addEventListener('input', validarMeta));
  }
  const actual = $('subCurso').value;
  $('subCurso').innerHTML = '<option value="">— Elige el curso —</option>' + CURSOS.map(([id, n]) => `<option value="${id}">${esc(n)}</option>`).join('');
  $('subCurso').value = actual;
}

function revisarTexto() {
  const r = parsearTexto($('subTexto').value);
  if (!r.preguntas.length) { toast('No encontré preguntas. Revisa que cada una empiece con "PREGUNTA 1:"', true); return; }
  // conservar imágenes ya pegadas (por pregunta y posición)
  const previas = {};
  Object.keys(SUB.zonas).forEach(k => { previas[k] = SUB.zonas[k].estado(); });
  SUB.parse = r;
  $('subCurso').value = detectarCurso(r.meta.curso) || $('subCurso').value;
  $('subCiclo').value = normalizarCiclo(r.meta.ciclo) || $('subCiclo').value;
  $('subNum').value = r.meta.tema ? pad2(r.meta.tema) : $('subNum').value;
  $('subNombre').value = r.meta.nombre || $('subNombre').value;

  const errores = r.preguntas.filter(q => q.errores.length).length;
  $('subAvisos').innerHTML =
    (errores ? `<div class="banner warn"><div><b>${errores} pregunta${errores > 1 ? 's tienen' : ' tiene'} errores.</b> Corrígelas en el texto y vuelve a revisar.</div></div>` : '') +
    (r.avisos.length ? `<div class="banner info"><div>${r.avisos.slice(0, 6).map(esc).join('<br>')}${r.avisos.length > 6 ? '<br>…' : ''}</div></div>` : '');

  // Vista previa: un recuadro por cada [IMAGEN]; sin marcas, uno debajo del enunciado (como antes)
  // Preguntas del mismo TEXTO: la lectura se muestra una vez, en la primera
  const tam = {};
  r.preguntas.forEach(q => { if (q.lectura) tam[q.lectura] = (tam[q.lectura] || 0) + 1; });
  const visto = {};
  $('subLista').innerHTML = r.preguntas.map((q, i) => {
    const k = q.lectura ? (visto[q.lectura] = (visto[q.lectura] || 0) + 1) : 0;
    const sigue = k > 1;
    const v = MCPregunta.armar((sigue ? '' : q.lectura) + q.text, { lecPos: k ? '1 de ' + tam[q.lectura] : '', marca: (k, der) => `<div class="pimg" data-z="${i}|${k}"></div>` });
    const opts = q.options.map((o, k) => `<div class="popt ${k === q.correct ? 'ok' : ''}"><span class="l">${esc(o.letter)}</span><span>${formatQText(o.text)}</span>${k === q.correct ? '<span class="chk">✓</span>' : ''}</div>`).join('');
    return `
    <article class="pcard ${q.errores.length ? 'bad' : ''} ${k ? 'en-texto' : ''} ${sigue ? 'sigue' : ''}">
      <div class="qnum2">${i + 1}</div>
      ${sigue ? `<div class="plec-sig">${esc(q.lectura.split('\n')[0].replace(/[\[\]]/g, ''))} · pregunta ${k} de ${tam[q.lectura]} (misma lectura de arriba)</div>` : ''}
      ${q.errores.length ? `<div class="perr">⚠ ${q.errores.map(esc).join(' · ')}</div>` : ''}
      <div class="ptext">${v.html}</div>
      ${q.marcasImg ? '' : `<div class="pimg" data-z="${i}|g"></div>`}
      ${v.derecha ? `<div class="pder"><div>${opts}</div><div><div class="hint">Al lado de las alternativas</div>${v.derecha}</div></div>` : `<div class="${MCPregunta.cortas(q.options) ? 'popts-cortas' : ''}">${opts}</div>`}
    </article>`;
  }).join('');
  SUB.zonas = {};
  $('subLista').querySelectorAll('.pimg').forEach(el => {
    const k = el.dataset.z;
    const z = SUB.zonas[k] = crearZonaImagen(el, { actual: '', onChange: validarMeta });
    if (previas[k] && previas[k].cambio === 'nueva') z.recibirPreparada(previas[k].img);
  });
  renderMath($('subLista'));
  $('subPaso1').hidden = true; $('subPaso2').hidden = false;
  validarMeta();
  window.scrollTo(0, 0);
}

function validarMeta() {
  if (!SUB.parse) return;
  const curso = $('subCurso').value, ciclo = normalizarCiclo($('subCiclo').value), num = $('subNum').value.trim(), nombre = $('subNombre').value.trim();
  const errs = [];
  if (!curso) errs.push('elige el curso');
  if (!/^\d{4}-(I|II|III)$/.test(ciclo)) errs.push('el ciclo debe ser como 2027-I');
  if (!/^\d{1,3}$/.test(num)) errs.push('pon el número de tema');
  if (!nombre) errs.push('pon el nombre del tema');
  const malas = SUB.parse.preguntas.filter(q => q.errores.length).length;
  if (malas) errs.push('corrige ' + malas + ' pregunta' + (malas > 1 ? 's' : ''));
  const sinImg = Object.keys(SUB.zonas).filter(k => !/\|g$/.test(k) && SUB.zonas[k].estado().cambio !== 'nueva').length;
  if (sinImg) errs.push('pega ' + (sinImg === 1 ? 'la imagen que falta' : 'las ' + sinImg + ' imágenes que faltan'));
  const n = SUB.parse.preguntas.length;
  $('subResumen').innerHTML = errs.length
    ? `<span class="bad">Falta: ${errs.join(', ')}.</span>`
    : `<b>${n} pregunta${n > 1 ? 's' : ''}</b> para ${esc(NOMBRE[curso])} · ${esc(ciclo)} · Tema ${esc(pad2(num))}${$('subDestino').value === 'fijas' ? ' · <b>Banco de Fijas</b>' : ''}`;
  $('subPublicar').disabled = !!errs.length;
}

function armarPreguntas(carpeta, anio, tema, nombre) {
  const imagenes = [];
  const subir = st => {
    const path = imgRuta(carpeta, anio, tema, st.img.ext);
    imagenes.push({ path, data: st.img.dataUrl });
    return path;
  };
  const preguntas = SUB.parse.preguntas.map((q, i) => {
    // Cada [IMAGEN] se cambia por la ruta de la imagen pegada ahí
    let k = 0;
    const text = q.text.replace(/^\[IMAGEN( DERECHA)?\]$/gm, (x, der) => {
      const z = SUB.zonas[i + '|' + (k++)], st = z && z.estado();
      return st && st.cambio === 'nueva' ? '[IMG' + (der ? '-DER' : '') + ':' + subir(st) + ']' : '';
    });
    const out = { text: q.lectura + text, topic: NOMBRE[carpeta] + ' · ' + nombre, options: q.options.map(o => ({ letter: o.letter, text: o.text })), correct: q.correct };
    const st = SUB.zonas[i + '|g'] && SUB.zonas[i + '|g'].estado();
    if (st && st.cambio === 'nueva') {
      const path = imgRuta(carpeta, anio, tema, st.img.ext);
      imagenes.push({ path, data: st.img.dataUrl });
      out.graphic = imgHtml(path);
    }
    return out;
  });
  return { preguntas, imagenes };
}

async function publicarTema() {
  const carpeta = $('subCurso').value, anio = normalizarCiclo($('subCiclo').value), tema = pad2($('subNum').value.trim()), nombre = $('subNombre').value.trim();
  const btn = $('subPublicar');
  btn.disabled = true; btn.innerHTML = '<span class="spin-s"></span> Revisando…';
  try {
    // ¿Ya existe el tema?
    const destino = $('subDestino').value;
    let existente = null, temasCurso = null;
    if (destino === 'fijas') {
      try { existente = ((await api('archivo', { carpeta, anio: anio + '-fijas' })).temas || []).find(t => pad2(t.num) === tema) || null; } catch (e) { existente = null; }
    } else {
      const man = await api('archivo', { carpeta });
      temasCurso = (man.manifest || []).reduce((n, x) => n + (+x.temas || 0), 0);
      if ((man.manifest || []).some(x => x.id === anio)) {
        const temas = (await api('archivo', { carpeta, anio })).temas || [];
        existente = temas.find(t => pad2(t.num) === tema) || null;
      }
    }
    let modo = 'nuevo';
    if (existente) {
      modo = await elegirModo(existente, SUB.parse.preguntas.length);
      if (!modo) { btn.disabled = false; btn.textContent = 'Publicar tema'; return; }
    }
    const { preguntas, imagenes } = armarPreguntas(carpeta, anio, tema, nombre);
    btn.innerHTML = '<span class="spin-s"></span> ' + (imagenes.length ? `Subiendo ${imagenes.length} imagen${imagenes.length > 1 ? 'es' : ''} y publicando…` : 'Publicando…');
    const r = await api('publicarTema', { carpeta, curso: NOMBRE[carpeta], anio, tema, nombre, modo, destino, preguntas: JSON.stringify(preguntas), imagenes: JSON.stringify(imagenes) });
    delete cacheManifest[carpeta]; delete cacheArchivos[carpeta + '|' + anio];
    ss('del', SUB.borrador);
    const url = SITE_ROOT + carpeta + '/libros/tema.html?year=' + encodeURIComponent(anio) + '&tema=' + encodeURIComponent(tema);
    $('subPaso2').hidden = true;
    $('subListo').hidden = false;
    $('subListo').innerHTML = `<div class="done">
        <div class="ico">${ICON_OK}</div>
        <div class="eyebrow">Publicado</div>
        <h3>¡Tema ${esc(tema)} publicado!</h3>
        <p><b style="color:#f5ffcc">${esc(NOMBRE[carpeta])} · ${esc(anio)}${destino === 'fijas' ? ' · Banco de Fijas' : ''} · ${esc(nombre)}</b><br>
        ${modo === 'agregar' ? (preguntas.length === 1 ? 'Se agregó 1 pregunta' : 'Se agregaron ' + preguntas.length + ' preguntas') + '; el tema ahora tiene ' + r.preguntasTema + '.' : r.preguntasTema + ' preguntas' + (imagenes.length ? ' y ' + imagenes.length + ' imagen' + (imagenes.length > 1 ? 'es' : '') : '') + '.'}
        ${destino === 'fijas' ? 'Para usarlo, en <b>Cursos → Repaso y Fijas</b> elige "Banco de Fijas propio".' : `El año ${esc(anio)} tiene ${r.temas} tema${r.temas > 1 ? 's' : ''}.`}<br>Los alumnos lo verán en 1 a 10 minutos.</p>
        <div class="mfoot" style="justify-content:center;">
          <a class="rbtn link" href="${esc(url)}" target="_blank" rel="noopener">Ver en la web ${ICON_EXT}</a>
          <button type="button" class="btn-main" id="subOtro">Subir otro tema</button>
        </div></div>`;
    // Aviso a los alumnos: solo temas nuevos (no Fijas). El primer tema de un curso avisa "curso nuevo".
    if (modo === 'nuevo' && destino !== 'fijas') {
      const res = document.createElement('div'); res.className = 'nv-res'; res.textContent = 'Avisando a los alumnos…';
      $('subListo').querySelector('.mfoot').before(res);
      const d = { tipo: temasCurso === 0 ? 'curso' : 'tema', carpeta, curso: NOMBRE[carpeta], anio, tema, nombre };
      avisarNovedad(d).then(r => pintarResultadoNovedad(res, d, r), () => pintarResultadoNovedad(res, d, { ok: false, motivo: 'error' }));
    }
    $('subOtro').addEventListener('click', () => {
      $('subTexto').value = ''; SUB.parse = null; SUB.zonas = {};
      $('subListo').hidden = true; $('subPaso1').hidden = false;
    });
    window.scrollTo(0, 0);
  } catch (e) {
    toast(e.message === 'TEMA_EXISTE' ? 'Ese tema ya existe; vuelve a publicar y elige qué hacer.' : e.message, true);
  }
  btn.disabled = false; btn.textContent = 'Publicar tema';
  validarMeta();
}

// Pregunta qué hacer si el tema ya existe → 'reemplazar' | 'agregar' | null
function elegirModo(existente, nuevas) {
  return new Promise(resolve => {
    const o = document.createElement('div');
    o.className = 'ov';
    const n = existente.questions.length;
    o.innerHTML = `<div class="mcard" style="max-width:520px;">
      <div class="eyebrow" style="color:var(--amber)">Este tema ya existe</div>
      <h3>Tema ${esc(existente.num)} · ${esc(existente.name)}</h3>
      <p class="sub" style="margin-top:6px;">Ya tiene <b>${n} pregunta${n > 1 ? 's' : ''}</b> publicadas. ¿Qué hago con las ${nuevas} nuevas?</p>
      <div class="modo-op" data-m="reemplazar"><b>Reemplazar el tema completo</b><span>Quedarán solo las ${nuevas} nuevas (y el nombre nuevo).</span></div>
      <div class="modo-op" data-m="agregar"><b>Agregar al final</b><span>El tema quedará con ${n + nuevas} preguntas.</span></div>
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
