/* =========================================================
   Panel · Cursos → "Orden de tarjetas" y "Armar Fijas"
   - Orden de tarjetas: el orden de Libro, Repaso, Flashcards,
     Seminarios, Banqueo y Fijas en la página del curso
     (se guarda en cursos.json como ordenTarjetas; sin él, la web
     usa el orden automático de assets/cursos.js).
   - Armar Fijas: elegir preguntas del Libro, Seminarios o Banqueo
     y publicarlas en el banco de Fijas del curso ({año}-fijas.json).
   ========================================================= */
const TARJETAS = { libro: 'Libro', repaso: 'Repaso', tarjetas: 'Flashcards', seminarios: 'Seminarios', banqueo: 'Banqueo', fijas: 'Fijas' };
const ORDEN_AUTO = ['libro', 'repaso', 'tarjetas', 'seminarios', 'banqueo', 'fijas'];

function abrirModal(html, ancho) {
  const o = document.createElement('div'); o.className = 'ov';
  o.innerHTML = `<div class="mcard" style="max-width:${ancho || 640}px;"><button class="mx" type="button">✕</button>${html}</div>`;
  document.body.appendChild(o); document.body.classList.add('modal-open');
  const cerrar = () => { o.remove(); document.body.classList.remove('modal-open'); };
  o.querySelector('.mx').addEventListener('click', cerrar);
  return { o, cerrar };
}

/* ---------- Orden de tarjetas ---------- */
function ordenTarjetas(c) {
  const manual = Array.isArray(c.ordenTarjetas) && c.ordenTarjetas.length;
  let orden = manual ? c.ordenTarjetas.concat(ORDEN_AUTO.filter(k => !c.ordenTarjetas.includes(k))) : ORDEN_AUTO.slice();
  const { o, cerrar } = abrirModal(`<div class="eyebrow">${esc(c.nombre)}</div><h3>Orden de tarjetas</h3>
    <p class="sub" style="margin-top:6px;">Así se ven en la página del curso. Sin orden propio, la web usa el automático y pone al final las de "Próximamente".</p>
    <div class="ot-lista" id="otLista"></div>
    <div class="err" id="otErr"></div>
    <div class="mfoot">
      <button type="button" class="btn-ghost" id="otAuto" ${manual ? '' : 'hidden'}>Volver al automático</button>
      <button type="button" class="btn-ghost" data-x>Cancelar</button>
      <button type="button" class="btn-main" id="otSave">Guardar orden</button>
    </div>`, 480);
  o.querySelector('[data-x]').addEventListener('click', cerrar);
  const pintar = () => {
    o.querySelector('#otLista').innerHTML = orden.map((k, i) => `<div class="ot-row"><span class="ot-n">${i + 1}</span><b>${TARJETAS[k]}</b>
      <button class="rbtn" type="button" data-i="${i}" data-d="-1" ${i === 0 ? 'disabled' : ''} title="Subir">↑</button>
      <button class="rbtn" type="button" data-i="${i}" data-d="1" ${i === orden.length - 1 ? 'disabled' : ''} title="Bajar">↓</button></div>`).join('');
    o.querySelectorAll('#otLista [data-i]').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.i, j = i + +b.dataset.d;
      [orden[i], orden[j]] = [orden[j], orden[i]]; pintar();
    }));
  };
  pintar();
  const guardar = async (valor, b) => {
    const err = o.querySelector('#otErr'); err.classList.remove('show');
    const txt = b.textContent; b.disabled = true; b.innerHTML = '<span class="spin-s"></span> Guardando…';
    try {
      await api('editarCurso', { datos: JSON.stringify({ id: c.id, ordenTarjetas: valor }) });
      await cargarRegistro();
      const nuevo = (REG.cursos || []).find(x => x.id === c.id) || {};
      // El Apps Script podría no guardar campos que no conoce
      if (valor && JSON.stringify(nuevo.ordenTarjetas || null) !== JSON.stringify(valor)) throw new Error('Tu Apps Script no guardó el orden (no conoce el campo "ordenTarjetas"). Hay que agregarlo en editarCurso.');
      cerrar(); renderCursos(); toast(valor ? 'Orden guardado · se verá en la web en 1 a 10 minutos' : 'Vuelve al orden automático');
    } catch (e) { b.disabled = false; b.textContent = txt; err.textContent = e.message; err.classList.add('show'); }
  };
  o.querySelector('#otSave').addEventListener('click', e => guardar(orden.slice(), e.currentTarget));
  o.querySelector('#otAuto').addEventListener('click', e => guardar(null, e.currentTarget));
}

/* ---------- Armar Fijas ---------- */
const FUENTES = [['libros', 'Libro', ''], ['seminarios', 'Seminarios', '--seminarios'], ['banqueo', 'Banqueo', '--banqueo']];
function textoPlano(t) {
  return String(t || '').replace(/\[IMG[^\]]*\]/g, ' [imagen] ').replace(/<[^>]*>/g, ' ').replace(/\$+/g, '').replace(/\s+/g, ' ').trim();
}
function huellaQ(q) { return textoPlano(q && q.text).slice(0, 120); }

async function armarFijas(c) {
  const { o, cerrar } = abrirModal(`<div class="eyebrow">${esc(c.nombre)}</div><h3>Armar Fijas</h3>
    <div id="afBody"><div class="loader">Cargando…</div></div>`, 760);
  const body = o.querySelector('#afBody');
  let man;
  try { delete cacheManifest[c.id]; man = await getManifest(c.id); } catch (e) { body.innerHTML = `<div class="state-msg error">${esc(e.message)}</div>`; return; }
  if (!man.length) { body.innerHTML = '<div class="state-msg">Este curso aún no tiene años. Créalos en <b>Años</b>.</div>'; return; }
  const anios = man.map(m => m.id).reverse();
  const st = {
    anio: (c.fijas && anios.includes(c.fijas.anio)) ? c.fijas.anio : anios[0],
    banco: [],        // [{ num, name, questions }] tal como se publicará
    original: '',     // para saber qué temas cambiaron
    fuente: 'libros', fAnio: null, fTema: null, fTemas: [], marcadas: new Set()
  };

  async function cargarBanco() {
    body.innerHTML = '<div class="loader">Cargando banco de Fijas…</div>';
    let t = [];
    try { t = (await api('archivo', { carpeta: c.id, anio: st.anio + '-fijas' })).temas || []; } catch (e) { t = []; }
    st.banco = t.map(x => ({ num: pad2(x.num), name: x.name, questions: (x.questions || []).slice() }));
    st.original = JSON.stringify(st.banco);
    pintar();
    cargarFuente();
  }

  function total() { return st.banco.reduce((s, t) => s + t.questions.length, 0); }
  function enBanco() { const s = new Set(); st.banco.forEach(t => t.questions.forEach(q => s.add(huellaQ(q)))); return s; }

  function pintar() {
    body.innerHTML = `
      <div class="af-top">
        <label class="af-lbl">Fijas del año <select class="inp" id="afAnio">${anios.map(a => `<option ${a === st.anio ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select></label>
        <span class="af-total" id="afTotal"></span>
      </div>
      <div class="rf-box"><div class="rf-tit">Agregar preguntas</div>
        <div class="chips seg">${FUENTES.map(f => `<button type="button" class="chip ${st.fuente === f[0] ? 'on' : ''}" data-f="${f[0]}">${f[1]}</button>`).join('')}</div>
        <div class="af-sel"><select class="inp" id="afFAnio"></select><select class="inp" id="afFTema"></select></div>
        <div class="af-preg" id="afPreg"></div>
        <div class="mfoot" style="margin-top:10px;"><button type="button" class="rbtn" id="afTodas">Marcar todas</button><button type="button" class="btn-main" id="afAgregar" disabled>Agregar a Fijas</button></div>
      </div>
      <div class="rf-box"><div class="rf-tit">Banco de Fijas ${esc(st.anio)}</div><div id="afBanco"></div></div>
      <div class="err" id="afErr"></div>
      <div class="mfoot"><button type="button" class="btn-ghost" data-x>Cerrar</button><button type="button" class="btn-main" id="afPub">Publicar en Fijas</button></div>`;
    body.querySelector('[data-x]').addEventListener('click', cerrar);
    body.querySelector('#afAnio').addEventListener('change', e => {
      if (cambios() && !confirmarSalto()) { e.target.value = st.anio; return; }
      st.anio = e.target.value; cargarBanco();
    });
    body.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => {
      st.fuente = b.dataset.f; st.fAnio = null; st.fTema = null;
      body.querySelectorAll('[data-f]').forEach(x => x.classList.toggle('on', x === b));
      cargarFuente();
    }));
    body.querySelector('#afFAnio').addEventListener('change', e => { st.fAnio = e.target.value; st.fTema = null; cargarTemasFuente(); });
    body.querySelector('#afFTema').addEventListener('change', e => { st.fTema = e.target.value; pintarPreguntas(); });
    body.querySelector('#afTodas').addEventListener('click', () => {
      const cajas = [...body.querySelectorAll('#afPreg input:not(:disabled)')];
      const todas = cajas.every(x => x.checked);
      cajas.forEach(x => { x.checked = !todas; x.dispatchEvent(new Event('change')); });
    });
    body.querySelector('#afAgregar').addEventListener('click', agregar);
    body.querySelector('#afPub').addEventListener('click', publicar);
    pintarBanco();
  }
  let saltoOk = false;
  function confirmarSalto() {
    if (saltoOk) return true;
    toast('Tienes cambios sin publicar. Elige otra vez para descartarlos.', true);
    saltoOk = true; setTimeout(() => { saltoOk = false; }, 4000);
    return false;
  }
  function cambios() { return JSON.stringify(st.banco) !== st.original; }

  function pintarBanco() {
    const box = body.querySelector('#afBanco');
    body.querySelector('#afTotal').textContent = total() + (total() === 1 ? ' pregunta' : ' preguntas') + (cambios() ? ' · sin publicar' : '');
    if (!st.banco.length) { box.innerHTML = '<p class="hint">Aún no hay preguntas. Agrégalas desde el Libro, Seminarios o Banqueo.</p>'; return; }
    box.innerHTML = st.banco.map((t, ti) => `<div class="af-tema"><div class="af-tt">Tema ${esc(t.num)} · ${esc(t.name)} <em>${t.questions.length}</em></div>
      ${t.questions.map((q, qi) => `<div class="af-q"><span>${esc(textoPlano(q.text).slice(0, 140))}</span>
        <button class="rbtn danger" type="button" data-t="${ti}" data-q="${qi}" title="Quitar de Fijas" ${t.questions.length === 1 ? 'disabled' : ''}>Quitar</button></div>`).join('')}
      ${t.questions.length === 1 ? '<p class="hint" style="margin:6px 0 0;">Un tema necesita al menos 1 pregunta.</p>' : ''}</div>`).join('');
    box.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => {
      st.banco[+b.dataset.t].questions.splice(+b.dataset.q, 1);
      pintarBanco(); pintarPreguntas();
    }));
  }

  async function cargarFuente() {
    const f = FUENTES.find(x => x[0] === st.fuente), carpeta = c.id + f[2];
    const sA = body.querySelector('#afFAnio'), sT = body.querySelector('#afFTema'), box = body.querySelector('#afPreg');
    sA.innerHTML = ''; sT.innerHTML = ''; box.innerHTML = '<div class="loader" style="padding:14px 0;">Cargando…</div>';
    let m = [];
    try { m = (await getManifest(carpeta)).filter(x => x.temas); } catch (e) { m = []; }
    if (!m.length) { box.innerHTML = `<p class="hint">${f[1]} de este curso aún no tiene temas.</p>`; return; }
    const lista = m.map(x => x.id).reverse();
    if (!st.fAnio || !lista.includes(st.fAnio)) st.fAnio = lista.includes(st.anio) ? st.anio : lista[0];
    sA.innerHTML = lista.map(a => `<option ${a === st.fAnio ? 'selected' : ''}>${esc(a)}</option>`).join('');
    cargarTemasFuente();
  }
  async function cargarTemasFuente() {
    const f = FUENTES.find(x => x[0] === st.fuente), carpeta = c.id + f[2];
    const sT = body.querySelector('#afFTema'), box = body.querySelector('#afPreg');
    box.innerHTML = '<div class="loader" style="padding:14px 0;">Cargando temas…</div>';
    try { st.fTemas = await getTemas(carpeta, st.fAnio); } catch (e) { st.fTemas = []; }
    if (!st.fTemas.length) { sT.innerHTML = ''; box.innerHTML = '<p class="hint">Este año no tiene temas.</p>'; return; }
    if (!st.fTema || !st.fTemas.some(t => pad2(t.num) === st.fTema)) st.fTema = pad2(st.fTemas[0].num);
    sT.innerHTML = st.fTemas.map(t => `<option value="${esc(pad2(t.num))}" ${pad2(t.num) === st.fTema ? 'selected' : ''}>Tema ${esc(t.num)} · ${esc(t.name)} (${(t.questions || []).length})</option>`).join('');
    pintarPreguntas();
  }
  function temaFuente() { return st.fTemas.find(t => pad2(t.num) === st.fTema); }
  function pintarPreguntas() {
    const box = body.querySelector('#afPreg'), t = temaFuente();
    st.marcadas = new Set();
    body.querySelector('#afAgregar').disabled = true;
    if (!t) return;
    const ya = enBanco();
    box.innerHTML = (t.questions || []).map((q, i) => {
      const esta = ya.has(huellaQ(q));
      return `<label class="ck af-ck ${esta ? 'ya' : ''}"><input type="checkbox" value="${i}" ${esta ? 'disabled checked' : ''}><span><b>${i + 1}.</b> ${esc(textoPlano(q.text).slice(0, 180))}${esta ? ' <em>ya está en Fijas</em>' : ''}</span></label>`;
    }).join('');
    box.querySelectorAll('input:not(:disabled)').forEach(x => x.addEventListener('change', () => {
      x.checked ? st.marcadas.add(+x.value) : st.marcadas.delete(+x.value);
      const b = body.querySelector('#afAgregar');
      b.disabled = !st.marcadas.size;
      b.textContent = st.marcadas.size ? `Agregar ${st.marcadas.size} a Fijas` : 'Agregar a Fijas';
    }));
  }
  function agregar() {
    const t = temaFuente(); if (!t || !st.marcadas.size) return;
    // Mismo tema (por nombre) si ya existe en el banco; si no, uno nuevo con el número del libro o el siguiente libre
    const nombre = String(t.name || '').trim();
    let destino = st.banco.find(x => sinTildes(x.name).trim() === sinTildes(nombre));
    if (!destino) {
      const usados = new Set(st.banco.map(x => x.num));
      let num = st.fuente === 'libros' ? pad2(t.num) : null;
      if (!num || usados.has(num)) { let n = 1; while (usados.has(pad2(String(n)))) n++; num = pad2(String(n)); }
      destino = { num, name: nombre, questions: [] };
      st.banco.push(destino);
      st.banco.sort((a, b) => (+a.num || 0) - (+b.num || 0));
    }
    [...st.marcadas].sort((a, b) => a - b).forEach(i => {
      const q = JSON.parse(JSON.stringify(t.questions[i]));
      q.topic = NOMBRE[c.id] + ' · ' + destino.name;
      destino.questions.push(q);
    });
    toast(st.marcadas.size === 1 ? '1 pregunta agregada · falta publicar' : st.marcadas.size + ' preguntas agregadas · falta publicar');
    pintarBanco(); pintarPreguntas();
  }

  async function publicar() {
    const err = body.querySelector('#afErr'); err.classList.remove('show');
    const antes = {}; JSON.parse(st.original).forEach(t => { antes[t.num] = JSON.stringify(t); });
    const cambiados = st.banco.filter(t => t.questions.length && antes[t.num] !== JSON.stringify(t));
    const b = body.querySelector('#afPub');
    if (!total()) { err.textContent = 'Agrega al menos una pregunta.'; err.classList.add('show'); return; }
    b.disabled = true;
    try {
      for (let k = 0; k < cambiados.length; k++) {
        const t = cambiados[k];
        b.innerHTML = `<span class="spin-s"></span> Publicando tema ${k + 1} de ${cambiados.length}…`;
        await api('publicarTema', { carpeta: c.id, curso: NOMBRE[c.id], anio: st.anio, tema: t.num, nombre: t.name, credito: '',
          modo: antes[t.num] ? 'reemplazar' : 'nuevo', destino: 'fijas', preguntas: JSON.stringify(t.questions), imagenes: '[]' });
      }
      // Que la web use este banco (Repaso queda igual)
      const f = c.fijas || {};
      if (f.anio !== st.anio || f.modo !== 'banco') {
        b.innerHTML = '<span class="spin-s"></span> Activando Fijas…';
        await api('configCurso', { id: c.id, repaso: JSON.stringify(c.repaso && c.repaso.anio ? c.repaso : null), fijas: JSON.stringify({ anio: st.anio, modo: 'banco', temas: 'todos', porTema: 1 }) });
      }
      st.original = JSON.stringify(st.banco);
      b.disabled = false; b.textContent = 'Publicar en Fijas';
      pintarBanco();
      await cargarCursos();
      c = (REG.cursos || []).find(x => x.id === c.id) || c;
      toast(`Fijas ${st.anio} publicadas · ${total()} preguntas · se verá en la web en 1 a 10 minutos`);
    } catch (e) { b.disabled = false; b.textContent = 'Publicar en Fijas'; err.textContent = e.message; err.classList.add('show'); }
  }

  cargarBanco();
}
