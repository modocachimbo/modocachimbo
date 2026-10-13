/* =========================================================
   Panel · Vocabulario (Razonamiento Verbal)
   El banco de palabras de Sinónimos y Antónimos. Es uno solo
   y aparece en todos los cursos que tengan Vocabulario encendido.
   - Se escribe una palabra por línea:
       EFÍMERO: pasajero, fugaz, breve
         Def: Que dura poco tiempo.
         Ej: Su fama fue efímera; hoy nadie la recuerda.
     Def y Ej son opcionales (sin Ej no sale en "Completar",
     sin Def no sale en "Escribir").
   - También se puede pegar desde Excel: palabra | lista | def | ej.
   - Guardar reemplaza todo el tema (tabla vocabulario,
     función guardar_vocabulario_tema de supabase/13-vocabulario.sql).
   - Los cursos van en ajustes, clave 'vocabulario'.
   ========================================================= */
const VO_TEMAS = [
  { id: 'sinonimos', nombre: 'Sinónimos', lista: 'sinónimos' },
  { id: 'antonimos', nombre: 'Antónimos', lista: 'antónimos' }
];
const VO = { tema: 'sinonimos', textos: {}, publicados: {}, cambios: {}, cargado: false, cursos: null, borrar: false, busca: '' };
const VO_EJEMPLO = 'EFÍMERO: pasajero, fugaz, breve\n  Def: Que dura poco tiempo.\n  Ej: Su fama fue efímera; hoy nadie la recuerda.\n\nLOCUAZ: hablador, parlanchín, charlatán\n  Def: Que habla mucho.';

(function estilosVocabulario() {
  const st = document.createElement('style');
  st.textContent = `
  .vo-temas { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
  .vo-tema { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 14px; background: var(--surface); color: var(--text-dim); border: 2px solid #262626; border-bottom-width: 4px; font: 800 14px Nunito, Inter, sans-serif; cursor: pointer; }
  .vo-tema b { font-weight: 900; font-size: 12px; background: #1c1c1c; color: var(--text-dim); border-radius: 100px; padding: 2px 8px; }
  .vo-tema.on { color: #0e0e0e; background: var(--accent); border-color: #8fa300; }
  .vo-tema.on b { background: rgba(0,0,0,.18); color: #0e0e0e; }
  .vo-tema i { width: 8px; height: 8px; border-radius: 50%; background: var(--amber); }
  .vo-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 14px; align-items: start; }
  .vo-grid .pcard { margin-bottom: 0; }
  .vo-tit { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: var(--text-faint); font-weight: 700; margin-bottom: 10px; }
  .vo-tit span { text-transform: none; letter-spacing: 0; font-weight: 500; font-size: 12px; }
  #voTexto { min-height: 460px; resize: vertical; font: 500 13.5px/1.6 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; white-space: pre; overflow-wrap: normal; overflow-x: auto; tab-size: 2; }
  .vo-acc { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
  .vo-ayuda { margin-top: 12px; font-size: 12.5px; color: var(--text-dim); line-height: 1.55; }
  .vo-ayuda summary { cursor: pointer; font-weight: 700; color: var(--text); }
  .vo-ayuda pre { background: #0a0a0a; border: 1px solid #2a2a2a; border-radius: 10px; padding: 10px 12px; margin: 8px 0; font-size: 12.5px; overflow-x: auto; color: var(--text); }
  .vo-ayuda ul { margin: 6px 0 0 18px; }
  .vo-ayuda li { margin-bottom: 4px; }
  .vo-res { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
  .vo-res span { font-size: 12px; font-weight: 700; padding: 5px 10px; border-radius: 100px; background: #1a1a1a; color: var(--text-dim); }
  .vo-res span.ok { background: var(--accent-soft); color: var(--accent); }
  .vo-avisos { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
  .vo-aviso { text-align: left; border: none; cursor: pointer; font-size: 12.5px; line-height: 1.45; border-radius: 10px; padding: 8px 12px; background: var(--amber-soft); color: var(--amber); }
  .vo-aviso.mal { background: rgba(224,60,60,.1); color: var(--red); }
  .vo-aviso b { font-weight: 800; margin-right: 4px; }
  .vo-aviso:hover { filter: brightness(1.2); }
  .vo-buscar { margin-bottom: 10px; }
  .vo-lista { display: flex; flex-direction: column; gap: 10px; max-height: 620px; overflow-y: auto; padding-right: 4px; }
  .vo-card { background: #111; border: 2px solid #262626; border-bottom-width: 4px; border-radius: 16px; padding: 12px 14px; }
  .vo-card.mal { border-color: rgba(224,60,60,.45); }
  .vo-cab { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .vo-pal { font: 900 16px Nunito, Inter, sans-serif; letter-spacing: .5px; text-transform: uppercase; color: var(--text); overflow-wrap: anywhere; }
  .vo-rae { flex-shrink: 0; font-size: 11.5px; font-weight: 700; color: var(--text-dim); text-decoration: none; border: 1px solid #2a2a2a; border-radius: 8px; padding: 3px 8px; }
  .vo-rae:hover { color: var(--accent); border-color: #3a4a00; }
  .vo-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .vo-chips span { font: 800 12.5px Nunito, Inter, sans-serif; padding: 4px 10px; border-radius: 100px; background: rgba(28,176,246,.12); color: #6fcdf9; }
  .vo-chips.ant span { background: rgba(255,150,0,.12); color: #ffb04d; }
  .vo-def, .vo-ej { font-size: 13px; line-height: 1.5; margin-top: 8px; color: var(--text-dim); }
  .vo-def b, .vo-ej b { color: var(--text-faint); font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-right: 6px; }
  .vo-ej { font-style: italic; }
  .vo-ej mark { background: none; color: var(--accent); font-weight: 700; }
  .vo-falta { display: inline-block; margin-top: 8px; margin-right: 6px; font-size: 11px; font-weight: 700; color: var(--text-faint); border: 1px dashed #333; border-radius: 8px; padding: 2px 7px; }
  .vo-vacio { color: var(--text-faint); font-size: 13px; text-align: center; padding: 30px 10px; }
  .vo-cursos { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
  .vo-curso { display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; border: 2px solid #262626; border-radius: 12px; font-size: 13.5px; font-weight: 600; cursor: pointer; color: var(--text-dim); }
  .vo-curso:has(input:checked) { border-color: #3a4a00; color: var(--text); background: var(--accent-soft); }
  .vo-curso input { accent-color: #C6E000; width: 16px; height: 16px; }
  @media (max-width: 860px) { .vo-grid { grid-template-columns: minmax(0, 1fr); } #voTexto { min-height: 320px; } .vo-lista { max-height: none; } }`;
  document.head.appendChild(st);
})();

/* ---------- Leer el texto ---------- */
const voNorm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
// La palabra sin su última letra, para encontrar "efímera" en el ejemplo de "EFÍMERO"
const voRaiz = p => { const n = voNorm(p); return n.length > 4 ? n.slice(0, -1) : n; };
const voPartir = s => s.split(/[,;]/).map(x => x.trim().replace(/\.$/, '').trim()).filter(Boolean);

function voLeer(texto) {
  const items = [], errores = [], avisos = [];
  let ult = null;
  texto.split('\n').forEach((crudo, i) => {
    const n = i + 1, linea = crudo.trim();
    if (!linea || linea.startsWith('#') || linea.startsWith('//')) return;
    const extra = linea.match(/^(def|definici[oó]n|ej|ejemplo)\s*[:.]\s*(.*)$/i);
    // Pegado desde Excel: palabra ⇥ lista ⇥ def ⇥ ej
    if (!extra && linea.includes('\t')) {
      const c = linea.split('\t').map(x => x.trim());
      ult = { palabra: c[0] || '', lista: voPartir(c[1] || ''), def: c[2] || '', ej: c[3] || '', linea: n };
      items.push(ult); return;
    }
    if (extra) {
      if (!ult) { errores.push({ n, t: `"${extra[1]}:" debe ir debajo de una palabra.` }); return; }
      const campo = /^d/i.test(extra[1]) ? 'def' : 'ej';
      if (ult[campo]) avisos.push({ n, t: `${ult.palabra} ya tenía ${campo === 'def' ? 'definición' : 'ejemplo'}; se usa este.` });
      ult[campo] = extra[2].trim();
      return;
    }
    const k = linea.indexOf(':');
    if (k < 0) {
      // Línea con sangría sin "Def:" ni "Ej:" = continúa lo anterior
      if (ult && /^\s/.test(crudo) && (ult.ej || ult.def)) { ult[ult.ej ? 'ej' : 'def'] += ' ' + linea; return; }
      errores.push({ n, t: `Falta ":" entre la palabra y sus ${voTema().lista}.` }); return;
    }
    ult = { palabra: linea.slice(0, k).trim(), lista: voPartir(linea.slice(k + 1)), def: '', ej: '', linea: n };
    items.push(ult);
  });

  const vistas = {};
  items.forEach(it => {
    const n = it.linea, p = voNorm(it.palabra);
    it.mal = false;
    if (!it.palabra) { errores.push({ n, t: 'Falta la palabra antes de ":".' }); it.mal = true; }
    else if (it.palabra.length > 60) { errores.push({ n, t: `${it.palabra.slice(0, 20)}…: la palabra es muy larga (máximo 60 letras).` }); it.mal = true; }
    if (!it.lista.length) { errores.push({ n, t: `${it.palabra || 'Esta palabra'}: escribe al menos un ${voTema().lista.slice(0, -1)} después de ":".` }); it.mal = true; }
    if (it.lista.length > 12) avisos.push({ n, t: `${it.palabra}: tiene ${it.lista.length} ${voTema().lista}; solo se guardan los 12 primeros.` });
    if (it.lista.some(x => x.length > 60)) avisos.push({ n, t: `${it.palabra}: hay un ${voTema().lista.slice(0, -1)} muy largo; ¿falta una coma?` });
    if (p && vistas[p]) { errores.push({ n, t: `${it.palabra} está repetida (también en la línea ${vistas[p]}).` }); it.mal = true; }
    else if (p) vistas[p] = n;
    if (p && it.lista.some(x => voNorm(x) === p)) avisos.push({ n, t: `${it.palabra}: la palabra está dentro de su propia lista.` });
    const dobles = it.lista.filter((x, j) => it.lista.findIndex(y => voNorm(y) === voNorm(x)) !== j);
    if (dobles.length) avisos.push({ n, t: `${it.palabra}: "${dobles[0]}" está dos veces en la lista.` });
    if (it.ej && p && !voNorm(it.ej).includes(voRaiz(it.palabra))) avisos.push({ n, t: `${it.palabra}: el ejemplo no usa la palabra, así que no saldrá en "Completar".` });
    if (it.def.length > 400 || it.ej.length > 400) avisos.push({ n, t: `${it.palabra}: la definición o el ejemplo pasa de 400 letras y se cortará.` });
  });
  errores.sort((a, b) => a.n - b.n); avisos.sort((a, b) => a.n - b.n);
  return { items, errores, avisos };
}

function voEscribir(filas) {
  return (filas || []).map(f => {
    let s = `${f.palabra}: ${(f.lista || []).join(', ')}`;
    if (f.def) s += `\n  Def: ${f.def}`;
    if (f.ej) s += `\n  Ej: ${f.ej}`;
    return s;
  }).join('\n\n');
}

/* ---------- Pantalla ---------- */
const voTema = () => VO_TEMAS.find(t => t.id === VO.tema) || VO_TEMAS[0];
function voEstado(txt) { $('voEstado').textContent = txt || ''; }

async function cargarVocabulario(forzar) {
  if (VO.cargado && !forzar) return;
  const body = $('voBody');
  body.innerHTML = '<div class="loader">Cargando…</div>';
  $('voGuardar').disabled = true;
  let cliente;
  try { cliente = await MCAuth.listo; }
  catch (e) { body.innerHTML = '<div class="state-msg error">No se pudo conectar con Supabase. Revisa tu internet.</div>'; return; }
  if (!MCAuth.usuario()) {
    body.innerHTML = `<div class="state-msg al-login">Para editar el vocabulario entra con tu cuenta de Google de administrador.
      <button class="btn-main" type="button" id="voEntrar">Entrar con Google</button></div>`;
    $('voEntrar').addEventListener('click', () => MCAuth.entrarGoogle());
    return;
  }
  const [r, a, reg] = await Promise.all([
    cliente.from('vocabulario').select('tema, orden, palabra, lista, def, ej').order('tema').order('orden').limit(5000),
    cliente.from('ajustes').select('valor').eq('clave', 'vocabulario').maybeSingle(),
    window.MCCursos ? MCCursos.registro() : Promise.resolve(null)
  ]);
  if (r.error) {
    body.innerHTML = /does not exist|could not find|schema cache/i.test(r.error.message || '')
      ? '<div class="state-msg error">Falta crear la tabla. Corre <b>supabase/13-vocabulario.sql</b> en Supabase → SQL Editor y vuelve a abrir esta pestaña.</div>'
      : '<div class="state-msg error">No se pudo leer el vocabulario. Intenta de nuevo.</div>';
    return;
  }
  VO_TEMAS.forEach(t => {
    VO.publicados[t.id] = (r.data || []).filter(f => f.tema === t.id);
    VO.textos[t.id] = voEscribir(VO.publicados[t.id]);
    VO.cambios[t.id] = false;
  });
  VO.cursos = ((a.data && a.data.valor && a.data.valor.cursos) || []).slice();
  VO.registro = reg;
  VO.cargado = true;
  pintarVoCursos();
  renderVocabulario();
}

function pintarVoCursos() {
  const caja = $('voCursos');
  const lista = ((VO.registro && VO.registro.cursos) || [])
    .filter(c => c.area === 'comunicacion' || VO.cursos.includes(c.id))
    .sort((x, y) => (y.id === 'raz-verbal') - (x.id === 'raz-verbal'));
  caja.innerHTML = `
    <div class="acc-box" style="margin-bottom:18px;">
      <div class="acc-ttl">Cursos con Vocabulario <span>— todos usan este mismo banco de palabras</span></div>
      <div class="vo-cursos">${lista.map(c => `
        <label class="vo-curso"><input type="checkbox" value="${esc(c.id)}" ${VO.cursos.includes(c.id) ? 'checked' : ''}>${esc(c.nombre || c.id)}</label>`).join('') || '<span class="hint">No hay cursos de Comunicación.</span>'}
      </div>
      <p class="hint">La tarjeta Vocabulario aparece en los cursos marcados. Por ahora el acceso es libre.</p>
    </div>`;
  caja.querySelectorAll('input').forEach(inp => inp.addEventListener('change', async () => {
    const nuevos = [...caja.querySelectorAll('input:checked')].map(x => x.value);
    caja.querySelectorAll('input').forEach(x => { x.disabled = true; });
    const r = await (await MCAuth.listo).rpc('guardar_ajuste', { p_clave: 'vocabulario', p_valor: { cursos: nuevos } });
    if (r.error) {
      toast(/no autorizado/i.test(r.error.message || '') ? 'Tu correo no es administrador' : (r.error.message || 'No se pudo guardar'), true);
    } else {
      VO.cursos = nuevos;
      toast(nuevos.length ? 'Cursos guardados' : 'Vocabulario quedó oculto en todos los cursos');
    }
    pintarVoCursos();
  }));
}

function renderVocabulario() {
  const t = voTema();
  $('voBody').innerHTML = `
    <div class="vo-temas" role="tablist">${VO_TEMAS.map(x => `
      <button class="vo-tema${x.id === VO.tema ? ' on' : ''}" type="button" data-t="${x.id}">${x.nombre} <b>${VO.publicados[x.id].length}</b></button>`).join('')}
    </div>
    <div class="vo-grid">
      <div class="pcard">
        <div class="vo-tit">Escribe aquí <span>una palabra por línea</span></div>
        <textarea class="inp" id="voTexto" spellcheck="false" placeholder="${esc(VO_EJEMPLO)}"></textarea>
        <div class="vo-acc">
          <button class="btn-ghost" type="button" id="voDeshacer">Volver a lo publicado</button>
        </div>
        <details class="vo-ayuda">
          <summary>Cómo escribir las palabras</summary>
          <pre>${esc(VO_EJEMPLO)}</pre>
          <ul>
            <li><b>PALABRA:</b> y después sus ${t.lista} separados por comas.</li>
            <li><b>Def:</b> y <b>Ej:</b> van debajo, con o sin espacios al inicio. Son opcionales.</li>
            <li>Sin <b>Ej</b> la palabra no sale en el juego <i>Completar</i>; sin <b>Def</b> no sale en <i>Escribir</i>. En los demás juegos sí.</li>
            <li>El ejemplo debe usar la palabra (sirve "efímera" para EFÍMERO), porque ahí va el espacio en blanco.</li>
            <li>Desde Excel: copia 4 columnas (palabra, ${t.lista}, definición, ejemplo) y pégalas aquí.</li>
            <li>Una línea que empieza con <b>#</b> es una nota y no se publica.</li>
          </ul>
        </details>
      </div>
      <div class="pcard">
        <div class="vo-tit">Así lo verán los alumnos <span id="voCuenta"></span></div>
        <div id="voRes"></div>
        <input class="inp vo-buscar" id="voBuscar" type="search" placeholder="Buscar palabra" value="${esc(VO.busca)}">
        <div class="vo-lista" id="voLista"></div>
      </div>
    </div>`;
  const ta = $('voTexto');
  ta.value = VO.textos[t.id];
  ta.addEventListener('input', () => {
    VO.textos[t.id] = ta.value;
    VO.cambios[t.id] = ta.value !== voEscribir(VO.publicados[t.id]);
    VO.borrar = false;
    voVista();
  });
  $('voBuscar').addEventListener('input', e => { VO.busca = e.target.value; voVista(); });
  $('voDeshacer').addEventListener('click', () => {
    VO.textos[t.id] = voEscribir(VO.publicados[t.id]); VO.cambios[t.id] = false; VO.borrar = false; renderVocabulario();
  });
  $('voBody').querySelectorAll('.vo-tema').forEach(b => b.addEventListener('click', () => {
    VO.tema = b.dataset.t; VO.borrar = false; renderVocabulario();
  }));
  voVista();
}

// Lleva el cursor a una línea del cuadro de texto
function voIrLinea(n) {
  const ta = $('voTexto'), lineas = ta.value.split('\n');
  let a = 0; for (let i = 0; i < n - 1 && i < lineas.length; i++) a += lineas[i].length + 1;
  const z = a + (lineas[n - 1] || '').length;
  ta.focus(); ta.setSelectionRange(a, z);
  const alto = parseFloat(getComputedStyle(ta).lineHeight) || 20;
  ta.scrollTop = Math.max(0, (n - 4) * alto);
}

function voVista() {
  const t = voTema(), d = voLeer(VO.textos[t.id]);
  VO.leido = d;
  const conDef = d.items.filter(x => x.def).length, conEj = d.items.filter(x => x.ej).length;
  $('voCuenta').textContent = d.items.length + ' palabra' + (d.items.length === 1 ? '' : 's');
  const avisos = [...d.errores.map(x => Object.assign({ mal: true }, x)), ...d.avisos].sort((a, b) => a.n - b.n);
  $('voRes').innerHTML = (d.items.length ? `
    <div class="vo-res">
      <span class="ok">${d.items.length} palabra${d.items.length === 1 ? '' : 's'}</span>
      <span>${conDef} con definición</span>
      <span>${conEj} con ejemplo</span>
    </div>` : '') + (avisos.length ? `
    <div class="vo-avisos">${avisos.slice(0, 30).map(x => `
      <button class="vo-aviso${x.mal ? ' mal' : ''}" type="button" data-n="${x.n}"><b>Línea ${x.n}</b>${esc(x.t)}</button>`).join('')}
      ${avisos.length > 30 ? `<span class="hint">… y ${avisos.length - 30} más</span>` : ''}
    </div>` : '');
  $('voRes').querySelectorAll('.vo-aviso').forEach(b => b.addEventListener('click', () => voIrLinea(+b.dataset.n)));

  const q = voNorm(VO.busca);
  const vis = q ? d.items.filter(x => voNorm(x.palabra).includes(q) || x.lista.some(y => voNorm(y).includes(q))) : d.items;
  const ant = t.id === 'antonimos';
  $('voLista').innerHTML = vis.length ? vis.slice(0, 300).map(x => {
    let ej = esc(x.ej);
    if (x.ej) {
      const raiz = voRaiz(x.palabra);
      ej = esc(x.ej).replace(/[\p{L}]+/gu, w => voNorm(w).startsWith(raiz) && raiz ? `<mark>${w}</mark>` : w);
    }
    return `
    <div class="vo-card${x.mal ? ' mal' : ''}" data-n="${x.linea}">
      <div class="vo-cab"><div class="vo-pal">${esc(x.palabra) || '—'}</div>
        ${x.palabra ? `<a class="vo-rae" href="https://dle.rae.es/${encodeURIComponent(x.palabra.toLowerCase())}" target="_blank" rel="noopener">Ver en RAE</a>` : ''}</div>
      <div class="vo-chips${ant ? ' ant' : ''}">${x.lista.slice(0, 12).map(y => `<span>${esc(y)}</span>`).join('')}</div>
      ${x.def ? `<div class="vo-def"><b>Def</b>${esc(x.def)}</div>` : ''}
      ${x.ej ? `<div class="vo-ej"><b>Ej</b>${ej}</div>` : ''}
      ${!x.def ? '<span class="vo-falta">sin definición</span>' : ''}${!x.ej ? '<span class="vo-falta">sin ejemplo</span>' : ''}
    </div>`;
  }).join('') + (vis.length > 300 ? `<div class="hint">Se muestran 300 de ${vis.length}. Usa el buscador.</div>` : '')
    : `<div class="vo-vacio">${q ? 'Ninguna palabra coincide.' : `Aún no hay ${t.lista}. Escribe a la izquierda o pega tu lista.`}</div>`;
  $('voLista').querySelectorAll('.vo-card').forEach(c => c.addEventListener('dblclick', () => voIrLinea(+c.dataset.n)));

  const hay = Object.values(VO.cambios).some(Boolean);
  $('voBody').querySelectorAll('.vo-tema').forEach(b => {
    const i = b.querySelector('i');
    if (VO.cambios[b.dataset.t] && !i) b.insertAdjacentHTML('beforeend', '<i title="Cambios sin guardar"></i>');
    if (!VO.cambios[b.dataset.t] && i) i.remove();
  });
  $('voDeshacer').disabled = !VO.cambios[t.id];
  $('voGuardar').disabled = !VO.cambios[t.id];
  $('voGuardar').textContent = VO.borrar ? 'Toca otra vez para vaciar' : 'Guardar y publicar';
  voEstado(VO.cambios[t.id] ? 'Cambios sin guardar' + (d.errores.length ? ` · ${d.errores.length} por corregir` : '') : (hay ? 'Hay cambios sin guardar en otro tema' : ''));
}

async function guardarVocabulario() {
  const t = voTema(), d = voLeer(VO.textos[t.id]);
  if (d.errores.length) { voVista(); toast('Corrige lo marcado en rojo antes de publicar', true); voIrLinea(d.errores[0].n); return; }
  if (!d.items.length && VO.publicados[t.id].length && !VO.borrar) {
    VO.borrar = true; voVista(); toast(`Así se borran todos los ${t.lista} publicados. Toca otra vez para confirmar.`, true); return;
  }
  VO.borrar = false;
  const lista = d.items.map(x => ({ palabra: x.palabra, lista: x.lista.slice(0, 12), def: x.def.slice(0, 400), ej: x.ej.slice(0, 400) }));
  const btn = $('voGuardar'); btn.disabled = true; voEstado('Guardando…');
  const r = await (await MCAuth.listo).rpc('guardar_vocabulario_tema', { p_tema: t.id, p_lista: lista });
  if (r.error) {
    btn.disabled = false; voEstado('');
    const m = r.error.message || '';
    toast(/no autorizado/i.test(m) ? 'Tu correo no es administrador'
      : /could not find|does not exist|schema cache/i.test(m) ? 'Primero corre supabase/13-vocabulario.sql en Supabase'
      : (m || 'No se pudo guardar'), true);
    return;
  }
  VO.publicados[t.id] = lista.map((x, i) => Object.assign({ tema: t.id, orden: i + 1 }, x));
  VO.textos[t.id] = voEscribir(VO.publicados[t.id]);
  VO.cambios[t.id] = false;
  renderVocabulario();
  voEstado(`✓ Publicado: ${r.data} ${t.lista}.`);
  toast(`${t.nombre} guardados`);
}

$('voGuardar').addEventListener('click', guardarVocabulario);
window.addEventListener('beforeunload', e => { if (Object.values(VO.cambios).some(Boolean)) { e.preventDefault(); e.returnValue = ''; } });
