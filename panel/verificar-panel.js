/* =========================================================
   Panel · Verificar claves (exámenes Ordinario, CPU, Control)
   Cuando un profesor confirma la clave de una pregunta, aquí se marca.
   Los alumnos solo ven el sello "Clave verificada" (assets/claves-verificadas.js).
   - Eliges examen y ciclo; ves cuántas van verificadas.
   - Filtros: Sin verificar · Verificadas · Con reporte · La clave cambió.
   - Al verificar puedes cambiar la clave (se publica igual que en Editar
     preguntas, con "corregirExamen"), poner qué profesor la confirmó y una nota.
     Esos dos datos solo los ve el equipo.
   - Si alguien cambia la clave después de verificarla, el sello deja de salir
     y aquí aparece en "La clave cambió" para volver a verificarla.
   Datos: supabase/83-claves-verificadas.sql. Permiso de ayudante: "verificar".
   Cambiar la clave además pide el permiso "Subir examen" o "Editar preguntas".
   ========================================================= */
const VF = { tipo: null, id: null, preguntas: [], marcas: {}, cuentas: {}, filtro: 'sin', curso: '', abierta: null, ocupado: false };
const VF_SELLO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1.6l2.3 1.7 2.8-.3 1.1 2.6 2.6 1.1-.3 2.8 1.7 2.3-1.7 2.3.3 2.8-2.6 1.1-1.1 2.6-2.8-.3L12 22.4l-2.3-1.7-2.8.3-1.1-2.6-2.6-1.1.3-2.8L1.8 12l1.7-2.3-.3-2.8 2.6-1.1 1.1-2.6 2.8.3z"/><path d="m7.6 12.3 3 3 5.8-6" fill="none" stroke="#14112a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

(function estilosVerificar() {
  const st = document.createElement('style');
  st.textContent = `
  .vf-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
  .vf-bar { display: flex; align-items: center; gap: 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 14px 16px; margin: 14px 0; }
  .vf-bar > svg { width: 34px; height: 34px; color: #58CC02; flex-shrink: 0; }
  .vf-bar .t { font-weight: 800; font-size: 15px; color: var(--text); }
  .vf-bar .t small { display: block; color: var(--text-dim); font-weight: 600; font-size: 12.5px; }
  .vf-bar a { margin-left: 4px; }
  .vf-prog { flex: 1; min-width: 60px; height: 12px; border-radius: 99px; background: #241E3E; overflow: hidden; }
  .vf-prog i { display: block; height: 100%; background: #58CC02; border-radius: 99px; transition: width .3s ease; }
  .vf-row { display: flex; gap: 14px; align-items: flex-start; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 14px 16px; margin-bottom: 8px; }
  .vf-row.ok { border-color: rgba(88,204,2,.45); }
  .vf-row.cambio { border-color: rgba(255,200,0,.45); }
  .vf-row .num { flex-shrink: 0; min-width: 34px; height: 34px; padding: 0 4px; box-sizing: border-box; border-radius: 9px; background: var(--accent-soft); color: var(--accent); font-weight: 800; display: flex; align-items: center; justify-content: center; }
  .vf-row .b { flex: 1; min-width: 0; }
  .vf-row .cur { font-size: 11.5px; color: var(--text-faint); font-weight: 700; margin-bottom: 2px; }
  .vf-row .q { font-size: 13.5px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .vf-row .m { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; align-items: center; }
  .vf-row .nota { margin-top: 6px; font-size: 12.5px; color: var(--text-dim); }
  .vf-row .acc { display: flex; gap: 8px; flex-shrink: 0; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
  .pill.vok { background: rgba(88,204,2,.12); color: #7EE23A; display: inline-flex; gap: 5px; align-items: center; }
  .pill.vok svg { width: 14px; height: 14px; color: #58CC02; }
  .pill.vcam, .pill.vrep { background: var(--amber-soft); color: var(--amber); }
  .vf-form { margin-top: 12px; padding: 14px; border-radius: 12px; background: #120F22; border: 1px dashed #3A3360; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .vf-form label { font-size: 12px; color: var(--text-dim); font-weight: 700; display: block; margin-bottom: 6px; }
  .vf-form input { width: 100%; box-sizing: border-box; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; color: var(--text); font: inherit; font-size: 13.5px; }
  .vf-form .full { grid-column: 1 / -1; }
  .vf-form .fila { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
  .vf-form .err { grid-column: 1 / -1; }
  .vf-alts { display: flex; gap: 6px; flex-wrap: wrap; }
  .vf-alts button { width: 38px; height: 38px; border-radius: 10px; border: 1px solid var(--border); background: none; font: 800 14px Nunito, sans-serif; color: var(--text-dim); cursor: pointer; }
  .vf-alts button.on { background: #58CC02; border-color: #58CC02; color: #0e0e0e; }
  .vf-alts small { display: block; width: 100%; margin-top: 6px; font-size: 12px; color: var(--text-dim); }
  .vf-btn { background: #58CC02 !important; border-color: #58CC02 !important; color: #0e0e0e !important; }
  .vf-btn svg, .vf-tabic { width: 16px; height: 16px; }
  .vf-btn svg path:first-child, .vf-tabic path:first-child { fill: none; stroke: currentColor; stroke-width: 1.8; }
  .vf-btn svg path:last-child, .vf-tabic path:last-child { stroke: currentColor; }
  .vf-sub { margin: 16px 0 8px; color: var(--text-dim); font-size: 12.5px; font-weight: 700; }
  @media (max-width: 700px) {
    .vf-row { flex-wrap: wrap; }
    .vf-row .acc { width: 100%; justify-content: flex-start; padding-left: 48px; }
    .vf-form { grid-template-columns: 1fr; }
    .vf-bar { flex-wrap: wrap; }
    .vf-prog { flex-basis: 100%; }
  }`;
  document.head.appendChild(st);
})();

function vfLetra(q) { const o = (q.options || [])[q.correct]; return o ? String(o.letter || 'ABCDEF'[q.correct]).toUpperCase() : ''; }
function vfEstado(q, i) {
  const m = VF.marcas[i + 1];
  if (!m) return 'sin';
  return m.letra === vfLetra(q) ? 'ok' : 'cambio';
}
// Reportes pendientes de esta pregunta (si el que entra puede ver Reportes)
function vfReportes(i) {
  if (typeof DATA === 'undefined' || !Array.isArray(DATA)) return [];
  return DATA.filter(r => r.estado === 'Pendiente' && r.carpeta === 'examenes/' + VF.tipo && String(r.anio) === String(VF.id) && +r.pregunta === i + 1);
}
function vfFecha(iso) { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }); }

async function vfRpc(nombre, args) {
  const c = await MCAuth.listo;
  const r = await c.rpc(nombre, args);
  if (r.error) throw new Error(/no autorizado/i.test(r.error.message || '') ? 'Tu cuenta no tiene el permiso Verificar claves.'
    : /does not exist|Could not find/i.test(r.error.message || '') ? 'Falta correr supabase/83-claves-verificadas.sql en Supabase.' : r.error.message);
  return r.data;
}

async function cargarVerificar(forzar) {
  const cuerpo = $('vfCuerpo');
  if (!cuerpo) return;
  cuerpo.innerHTML = '<div class="loader">Cargando exámenes…</div>';
  try {
    if (forzar || !cacheExamenes.lista) cacheExamenes.lista = (await api('examenes')).examenes || {};
    if (!VF.tipo) VF.tipo = Object.keys(TIPOS_EXAMEN).find(t => vfExamenes(t).length) || 'ordinario';
    await vfAbrirExamen(VF.id, forzar);
  } catch (e) {
    cuerpo.innerHTML = `<div class="state-msg error">${esc(e.message)}</div>`;
  }
}
function vfExamenes(t) {
  const L = cacheExamenes.lista || {};
  return ((L[t] || {}).ciclos || []).flatMap(c => (c.exams || []).map(e => ({ id: e.id, count: e.count, label: e.label === 'Examen' ? c.label || c.id : e.label + ' · ' + c.id })));
}
async function vfAbrirExamen(id, fresco) {
  const lista = vfExamenes(VF.tipo);
  if (!id || !lista.some(e => e.id === id)) id = lista.length ? lista[lista.length - 1].id : null;   // el más reciente
  VF.id = id; VF.abierta = null; VF.curso = '';
  if (!id) { VF.preguntas = []; VF.marcas = {}; vfPintar(); return; }
  if ($('vfLista')) $('vfLista').innerHTML = '<div class="loader">Cargando preguntas…</div>';
  const [preguntas, datos] = await Promise.all([getExamen(VF.tipo, id, fresco), vfRpc('claves_verificadas_admin', { p_tipo: VF.tipo, p_examen: id })]);
  if (VF.id !== id) return;
  VF.preguntas = preguntas;
  VF.marcas = {}; ((datos && datos.lista) || []).forEach(m => { VF.marcas[m.n] = m; });
  VF.cuentas = (datos && datos.cuentas) || {};
  vfPintar();
}

function vfPintar() {
  const cuerpo = $('vfCuerpo');
  const lista = vfExamenes(VF.tipo);
  const ps = VF.preguntas;
  const est = ps.map(vfEstado);
  const nOk = est.filter(e => e === 'ok').length;
  const reps = ps.map((q, i) => vfReportes(i).length);
  const nCambio = est.filter(e => e === 'cambio').length;
  const nRep = reps.filter(Boolean).length;
  if (VF.filtro === 'rep' && !nRep) VF.filtro = 'sin';
  if (VF.filtro === 'cambio' && !nCambio) VF.filtro = 'sin';
  const cursos = [...new Set(ps.map(q => q.asignatura).filter(Boolean))];
  if (VF.curso && !cursos.includes(VF.curso)) VF.curso = '';
  const nombre = VF.id ? nombreExamen(VF.tipo, VF.id) : '';
  const raiz = typeof SITE_ROOT !== 'undefined' ? SITE_ROOT : '../';
  const url = VF.id ? raiz + 'examenes/' + VF.tipo + '/ver.html?year=' + encodeURIComponent(VF.id) : '';

  const filas = ps.map((q, i) => ({ q, i, e: est[i], r: reps[i] }))
    .filter(x => !VF.curso || x.q.asignatura === VF.curso)
    .filter(x => VF.filtro === 'todas' || (VF.filtro === 'sin' && x.e === 'sin') || (VF.filtro === 'ok' && x.e === 'ok') || (VF.filtro === 'cambio' && x.e === 'cambio') || (VF.filtro === 'rep' && x.r));

  cuerpo.innerHTML = `
    <div class="vf-chips" id="vfTipos">${chipsHtml(Object.keys(TIPOS_EXAMEN).map(t => [t, TIPOS_EXAMEN[t], vfExamenes(t).length]), VF.tipo)}</div>
    <div class="vf-chips" id="vfIds">${lista.length ? chipsHtml(lista.map(e => [e.id, e.label, (VF.cuentas[VF.tipo + '|' + e.id] || 0) + '/' + e.count]), VF.id) : '<span class="hint">Aún no hay exámenes publicados aquí. Súbelos en Subir examen.</span>'}</div>
    ${VF.id ? `
    <div class="vf-bar">${VF_SELLO}<div class="t">${nOk} de ${ps.length} claves verificadas<small>${esc(nombre)}${ps.length - nOk ? ' · faltan ' + (ps.length - nOk) : ' · ¡todas verificadas!'} · <a class="rbtn link" style="padding:0;border:0;display:inline" href="${esc(url)}" target="_blank" rel="noopener">Ver en la web</a></small></div><div class="vf-prog"><i style="width:${ps.length ? Math.round(nOk / ps.length * 100) : 0}%"></i></div></div>
    <div class="vf-chips" id="vfFiltros">${chipsHtml([['sin', 'Sin verificar', est.filter(e => e === 'sin').length], ['ok', 'Verificadas', nOk]]
      .concat(nCambio ? [['cambio', 'La clave cambió', nCambio]] : []).concat(nRep ? [['rep', 'Con reporte', nRep]] : []).concat([['todas', 'Todas', ps.length]]), VF.filtro)}</div>
    ${cursos.length > 1 ? `<div class="vf-chips" id="vfCursos">${chipsHtml([['', 'Todos los cursos']].concat(cursos.map(c => [c, c])), VF.curso)}</div>` : ''}
    <div id="vfLista">${filas.length ? filas.map(vfFila).join('') : `<div class="state-msg">${VF.filtro === 'sin' ? 'No queda ninguna sin verificar aquí.' : 'No hay preguntas con ese filtro.'}</div>`}</div>` : ''}`;

  cuerpo.querySelectorAll('#vfTipos .chip').forEach(c => c.addEventListener('click', () => { VF.tipo = c.dataset.v; VF.id = null; vfAbrirExamen(null).catch(vfError); }));
  cuerpo.querySelectorAll('#vfIds .chip').forEach(c => c.addEventListener('click', () => vfAbrirExamen(c.dataset.v).catch(vfError)));
  cuerpo.querySelectorAll('#vfFiltros .chip').forEach(c => c.addEventListener('click', () => { VF.filtro = c.dataset.v; VF.abierta = null; vfPintar(); }));
  cuerpo.querySelectorAll('#vfCursos .chip').forEach(c => c.addEventListener('click', () => { VF.curso = c.dataset.v; VF.abierta = null; vfPintar(); }));
  cuerpo.querySelectorAll('[data-vf-abrir]').forEach(b => b.addEventListener('click', () => { VF.abierta = +b.dataset.vfAbrir; vfPintar(); const f = document.querySelector('.vf-form input'); if (f) f.focus(); }));
  cuerpo.querySelectorAll('[data-vf-quitar]').forEach(b => b.addEventListener('click', () => vfQuitar(+b.dataset.vfQuitar, b)));
  cuerpo.querySelectorAll('[data-vf-editar]').forEach(b => b.addEventListener('click', () => abrirEditor({ examen: { tipo: VF.tipo, id: VF.id, nombre }, n: +b.dataset.vfEditar })));
  const form = cuerpo.querySelector('.vf-form');
  if (form) vfForm(form);
}
function vfError(e) { toast(e.message || 'No se pudo.', true); }

function vfFila({ q, i, e, r }) {
  const m = VF.marcas[i + 1];
  const reps = r ? vfReportes(i) : [];
  const sug = reps.map(x => (String(x.sugerida || '').match(/^([A-F])\)/) || [])[1]).filter(Boolean);
  const o = (q.options || [])[q.correct];
  let estado = '';
  if (e === 'ok') estado = `<span class="pill vok">${VF_SELLO}Verificada</span><span class="pill gray">${esc([m.quien, vfFecha(m.fecha), m.por ? 'marcó ' + m.por : ''].filter(Boolean).join(' · '))}</span>`;
  else if (e === 'cambio') estado = `<span class="pill vcam">La clave cambió: se verificó la ${esc(m.letra)}</span>`;
  else estado = '<span class="pill Pendiente">Sin verificar</span>';
  if (reps.length) estado += `<span class="pill vrep">${reps.length} reporte${reps.length > 1 ? 's' : ''}${sug.length ? ': dicen que es ' + [...new Set(sug)].join(' o ') : ''}</span>`;
  const abierta = VF.abierta === i + 1;
  const acc = abierta ? '' : e === 'ok'
    ? `<button class="rbtn" type="button" data-vf-editar="${i + 1}">Abrir</button><button class="rbtn" type="button" data-vf-abrir="${i + 1}">Editar datos</button><button class="rbtn" type="button" data-vf-quitar="${i + 1}">Quitar sello</button>`
    : `<button class="rbtn" type="button" data-vf-editar="${i + 1}">Abrir</button><button class="rbtn primary vf-btn" type="button" data-vf-abrir="${i + 1}">${VF_SELLO}${e === 'cambio' ? 'Verificar de nuevo' : 'Verificar'}</button>`;
  return `<div class="vf-row ${e}" data-i="${i}">
    <div class="num">${esc(q.num || i + 1)}</div>
    <div class="b">${q.asignatura ? `<div class="cur">${esc(q.asignatura)}${q.tema ? ' · ' + esc(q.tema) : ''}</div>` : ''}<div class="q">${esc(plano(MCPregunta && MCPregunta.sinLectura ? MCPregunta.sinLectura(q.text) : q.text))}</div>
      <div class="m"><span class="pill gray">Clave ${o ? esc(o.letter + ' · ' + plano(o.text).slice(0, 60)) : '—'}</span>${estado}</div>
      ${m && m.nota && !abierta ? `<div class="nota">Nota: ${esc(m.nota)}</div>` : ''}
      ${abierta ? vfFormHtml(q, i, m, sug) : ''}
    </div>
    <div class="acc">${acc}</div>
  </div>`;
}

function vfQuienGuardado() { try { return localStorage.getItem('mc_vf_quien') || ''; } catch (e) { return ''; } }
function vfFormHtml(q, i, m, sug) {
  const actual = vfLetra(q);
  return `<div class="vf-form" data-n="${i + 1}" data-letra="${esc(actual)}">
    <div><label>¿Cuál es la clave correcta?</label><div class="vf-alts">${q.options.map((o, k) => `<button type="button" data-k="${k}" class="${k === q.correct ? 'on' : ''}" title="${esc(plano(o.text))}">${esc(o.letter)}</button>`).join('')}<small class="vf-alt-t"></small></div></div>
    <div><label>¿Qué profesor la confirmó? (solo lo ve el equipo)</label><input class="vf-quien" maxlength="120" placeholder="Ej.: Profesor de Biología · CEPRE" value="${esc(m ? m.quien : vfQuienGuardado())}"></div>
    <div class="full"><label>Nota (opcional, solo el equipo)</label><input class="vf-nota" maxlength="500" placeholder="Ej.: Lo consultó Ana con su profe; el 3.er enunciado es V." value="${esc(m ? m.nota : '')}"></div>
    <div class="err"></div>
    <div class="full fila"><button class="rbtn" type="button" data-vf-cancelar>Cancelar</button><button class="rbtn primary vf-btn" type="button" data-vf-ok>${VF_SELLO}<span>Verificar clave ${esc(actual)}</span></button></div>
  </div>`;
}

function vfForm(form) {
  const n = +form.dataset.n, q = VF.preguntas[n - 1];
  let elegida = q.correct;
  const ok = form.querySelector('[data-vf-ok]');
  const pintar = () => {
    form.querySelectorAll('.vf-alts button').forEach(b => b.classList.toggle('on', +b.dataset.k === elegida));
    const o = q.options[elegida];
    form.querySelector('.vf-alt-t').textContent = o ? o.letter + ') ' + plano(o.text) : '';
    ok.querySelector('span').textContent = elegida === q.correct ? 'Verificar clave ' + o.letter : 'Cambiar a ' + o.letter + ' y verificar';
  };
  form.querySelectorAll('.vf-alts button').forEach(b => b.addEventListener('click', () => { elegida = +b.dataset.k; pintar(); }));
  form.querySelector('[data-vf-cancelar]').addEventListener('click', () => { VF.abierta = null; vfPintar(); });
  ok.addEventListener('click', () => vfGuardar(form, n, elegida, ok));
  pintar();
}

async function vfGuardar(form, n, elegida, btn) {
  if (VF.ocupado) return;
  const q = VF.preguntas[n - 1];
  const err = form.querySelector('.err');
  const quien = form.querySelector('.vf-quien').value.trim();
  const nota = form.querySelector('.vf-nota').value.trim();
  err.classList.remove('show');
  const tipo = VF.tipo, id = VF.id, nombre = nombreExamen(tipo, id);
  VF.ocupado = true; btn.disabled = true;
  const antes = btn.innerHTML;
  const cambia = elegida !== q.correct;
  try {
    // 1) Si la clave es otra, se corrige el examen (igual que en Editar preguntas)
    if (cambia) {
      btn.innerHTML = '<span class="spin-s"></span> Cambiando la clave…';
      const v = { text: q.text, options: q.options.map((o, k) => ({ letter: o.letter, text: o.text })), correct: elegida };
      try {
        await api('corregirExamen', Object.assign({ tipo, curso: nombre, n, textoAntes: q.text, pregunta: JSON.stringify(v), imagenes: '[]' }, partesExamen(id)));
      } catch (e) {
        throw new Error(/permiso/i.test(e.message) ? 'Para cambiar la clave necesitas también el permiso Subir examen o Editar preguntas. Pídeselo al administrador.' : e.message);
      }
      q.correct = elegida;
      cacheExamenes.preguntas[tipo + '|' + id] = VF.preguntas;   // ya con la clave nueva
    }
    // 2) El sello
    btn.innerHTML = '<span class="spin-s"></span> Guardando…';
    const letra = vfLetra(q);
    await vfRpc('verificar_clave', { p_tipo: tipo, p_examen: id, p_n: n, p_num: String(q.num || n), p_letra: letra, p_quien: quien, p_nota: nota });
    try { if (quien) localStorage.setItem('mc_vf_quien', quien); } catch (e) {}
    const yaEstaba = !!VF.marcas[n];
    VF.marcas[n] = { n, num: String(q.num || n), letra, quien, nota, por: (typeof ROL !== 'undefined' && ROL.nombre) || 'tú', fecha: new Date().toISOString() };
    if (!yaEstaba) VF.cuentas[tipo + '|' + id] = (VF.cuentas[tipo + '|' + id] || 0) + 1;
    VF.abierta = null;
    toast('Pregunta ' + (q.num || n) + ': clave ' + letra + ' verificada' + (cambia ? '. La web mostrará la nueva clave en 1 a 10 minutos.' : ''));
    vfPintar();
  } catch (e) {
    err.textContent = e.message || 'No se pudo.'; err.classList.add('show');
    btn.disabled = false; btn.innerHTML = antes;
  } finally { VF.ocupado = false; }
}

async function vfQuitar(n, btn) {
  if (VF.ocupado) return;
  const q = VF.preguntas[n - 1];
  if (!confirm('¿Quitar el sello "Clave verificada" de la pregunta ' + (q.num || n) + '?')) return;
  VF.ocupado = true; btn.disabled = true;
  try {
    await vfRpc('quitar_verificacion', { p_tipo: VF.tipo, p_examen: VF.id, p_n: n });
    delete VF.marcas[n];
    const k = VF.tipo + '|' + VF.id; VF.cuentas[k] = Math.max(0, (VF.cuentas[k] || 1) - 1);
    toast('Sello quitado');
    vfPintar();
  } catch (e) { vfError(e); btn.disabled = false; }
  finally { VF.ocupado = false; }
}
