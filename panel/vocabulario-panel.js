/* =========================================================
   Panel · Vocabulario (Razonamiento Verbal)
   El banco de palabras: uno solo para todos los cursos que tengan
   Vocabulario encendido y para todos los ciclos.
   - Cada palabra es una ficha:
       EFÍMERO
         Sin: pasajero, fugaz, breve
         Ant: duradero, perenne
         Def: Que dura poco tiempo.
         Ej: Fue una alegría efímera.
     Necesita Sin o Ant (o los dos). Def y Ej son opcionales
     (sin Ej no sale en "Completar", sin Def no sale en "Escribir").
     Puede llevar hasta 5 ejemplos: una línea Ej: por cada uno.
   - También se puede pegar desde Excel: palabra | sin | ant | def | ej.
   - Al abrir la pestaña se cargan las palabras publicadas para
     corregirlas; Guardar reemplaza todo el banco (tabla vocabulario,
     función guardar_vocabulario de supabase/13-vocabulario.sql).
   - Los cursos van en ajustes, clave 'vocabulario'.
   ========================================================= */
const VO = { texto: '', publicados: [], cambios: false, cargado: false, cursos: null, borrar: false, busca: '', filtro: 'todo' };
const VO_EJEMPLO = 'EFÍMERO\n  Sin: pasajero, fugaz, breve\n  Ant: duradero, perenne\n  Def: Que dura poco tiempo.\n  Ej: Fue una alegría efímera.\n  Ej: Las modas son efímeras.\n  Tipo: adj.\n  Nivel: 2\n  Examen: UNMSM 2024-I\n  Raíz: del griego ephémeros, "de un día"\n\n# Sin antónimo: no se escribe la línea Ant\nLOCUAZ\n  Sin: hablador, parlanchín\n\n# Sin sinónimo: no se escribe la línea Sin\nDIURNO\n  Ant: nocturno';
const VO_CAMPOS = { sin: 'sinónimos', ant: 'antónimos', def: 'definición', ej: 'ejemplo' };

(function estilosVocabulario() {
  const st = document.createElement('style');
  st.textContent = `
  .vo-temas { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
  .vo-tema { font-size: 13px !important; padding: 7px 12px !important;  display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 14px; background: var(--surface); color: var(--text-dim); border: 2px solid #262626; border-bottom-width: 4px; font: 800 14px Nunito, Inter, sans-serif; cursor: pointer; }
  .vo-tema b { font-weight: 900; font-size: 12px; background: #1c1c1c; color: var(--text-dim); border-radius: 100px; padding: 2px 8px; }
  .vo-tema.on { color: #1CB0F6; border-color: #1CB0F6; background: rgba(28,176,246,.08); }
  .vo-tema.on b { background: rgba(28,176,246,.18); color: #1CB0F6; }
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
  .vo-et { font: 900 11px Nunito, Inter, sans-serif; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-faint); margin-top: 10px; }
  .vo-chips span { font: 800 13px Nunito, Inter, sans-serif; padding: 4px 12px; border-radius: 100px; border: 2px solid #1586BD; background: rgba(28,176,246,.1); color: #1CB0F6; }
  .vo-chips.ant span { border-color: #9A5BC4; background: rgba(206,130,255,.1); color: #CE82FF; }
  .vo-def { color: var(--text); font-size: 13.5px; margin-top: 6px; }
  .vo-def, .vo-ej { font-size: 13px; line-height: 1.5; margin-top: 8px; }
  .vo-ej { font-style: italic; color: var(--text-dim); border-left: 3px solid #333; padding-left: 10px; margin-top: 8px; }
  .vo-tipo { font: 700 12px Inter, sans-serif; text-transform: none; letter-spacing: 0; color: var(--text-faint); font-style: italic; }
  .vo-niv { font-size: 10px; letter-spacing: 1px; color: #FF9600; vertical-align: 2px; }
  .vo-mas { font-size: 12.5px; line-height: 1.5; color: var(--text-dim); margin-top: 8px; }
  .vo-mas b { display: block; font: 900 11px Nunito, Inter, sans-serif; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-faint); }
  .vo-exa { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .vo-exa span { font: 800 11.5px Nunito, Inter, sans-serif; color: #FFC800; background: rgba(255,200,0,.1); border-radius: 8px; padding: 3px 8px; }
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
const voNorm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
// La palabra sin su última letra, para encontrar "efímera" en el ejemplo de "EFÍMERO"
const voRaiz = p => { const n = voNorm(p); return n.length > 4 ? n.slice(0, -1) : n; };
const voPartir = s => String(s || '').split(/[,;]/).map(x => x.trim().replace(/\.$/, '').trim()).filter(Boolean);
const VO_CLAVES = { sin: 'sin', sinonimo: 'sin', sinonimos: 'sin', ant: 'ant', antonimo: 'ant', antonimos: 'ant', def: 'def', definicion: 'def', ej: 'ej', ejemplo: 'ej',
  tipo: 'tipo', categoria: 'tipo', nivel: 'nivel', examen: 'examen', examenes: 'examen', par: 'par', paronimo: 'par', paronimos: 'par',
  raiz: 'raiz', etimologia: 'raiz', origen: 'raiz', tip: 'tip', truco: 'tip' };
// Datos opcionales que van en "extra" (no necesitan cambiar el SQL)
const VO_EXTRA = { tipo: 'Tipo', nivel: 'Nivel', examen: 'Examen', par: 'Par', raiz: 'Raíz', tip: 'Tip' };
const VO_TIPOS = { adj: 'adj.', adjetivo: 'adj.', sust: 'sust.', sustantivo: 'sust.', s: 'sust.', verbo: 'verbo', v: 'verbo', adv: 'adv.', adverbio: 'adv.' };

function voLeer(texto) {
  const items = [], errores = [], avisos = [];
  let ult = null, campo = null;
  const nueva = (palabra, n) => { ult = { palabra, sin: [], ant: [], def: '', ej: [], extra: {}, linea: n }; items.push(ult); campo = null; };
  texto.split('\n').forEach((crudo, i) => {
    const n = i + 1, linea = crudo.trim();
    if (!linea || linea.startsWith('#') || linea.startsWith('//')) return;
    const m = linea.match(/^([A-Za-zÁÉÍÓÚáéíóú]+)\s*:\s*(.*)$/);
    const clave = m && VO_CLAVES[voNorm(m[1])];
    // Pegado desde Excel: palabra ⇥ sin ⇥ ant ⇥ def ⇥ ej
    if (!clave && linea.includes('\t')) {
      const c = linea.split('\t').map(x => x.trim());
      nueva(c[0] || '', n);
      Object.assign(ult, { sin: voPartir(c[1]), ant: voPartir(c[2]), def: c[3] || '', ej: c.slice(4).filter(Boolean) });
      return;
    }
    if (clave) {
      if (!ult) { errores.push({ n, t: `"${m[1]}:" debe ir debajo de una palabra.` }); return; }
      if (clave === 'sin' || clave === 'ant') {
        if (ult[clave].length) avisos.push({ n, t: `${ult.palabra}: ya tenía ${VO_CAMPOS[clave]}; se juntan.` });
        ult[clave] = ult[clave].concat(voPartir(m[2]));
      } else if (clave === 'ej') {
        if (m[2].trim()) ult.ej.push(m[2].trim());
      } else if (VO_EXTRA[clave]) {
        const v = m[2].trim();
        if (clave === 'tipo') {
          const t = VO_TIPOS[voNorm(v).replace(/\.$/, '')];
          if (t) ult.extra.tipo = t; else if (v) avisos.push({ n, t: `${ult.palabra}: el tipo "${v}" no se reconoce; usa adj., sust., verbo o adv.` });
        } else if (clave === 'nivel') {
          if (/^[123]$/.test(v)) ult.extra.nivel = +v; else if (v) avisos.push({ n, t: `${ult.palabra}: el nivel debe ser 1, 2 o 3.` });
        } else if (clave === 'examen' || clave === 'par') {
          ult.extra[clave] = (ult.extra[clave] || []).concat(voPartir(v)).slice(0, 8);
        } else if (v) ult.extra[clave] = v.slice(0, 300);
      } else {
        if (ult[clave]) avisos.push({ n, t: `${ult.palabra} ya tenía ${VO_CAMPOS[clave]}; se usa este.` });
        ult[clave] = m[2].trim();
      }
      campo = clave;
      return;
    }
    // Línea con sangría que no empieza con Sin/Ant/Def/Ej = sigue lo de arriba
    if (/^\s/.test(crudo) && ult) {
      if (campo === 'def') { ult.def += ' ' + linea; return; }
      if (campo === 'ej' && ult.ej.length) { ult.ej[ult.ej.length - 1] += ' ' + linea; return; }
      if (campo === 'sin' || campo === 'ant') { ult[campo] = ult[campo].concat(voPartir(linea)); return; }
      errores.push({ n, t: 'Empieza la línea con Sin:, Ant:, Def: o Ej:.' }); return;
    }
    // "EFÍMERO: pasajero, fugaz" no dice si son sinónimos o antónimos
    const dos = linea.indexOf(':');
    if (dos > -1 && linea.slice(dos + 1).trim()) {
      errores.push({ n, t: `Escribe la palabra sola y debajo "Sin:" o "Ant:" con su lista.` });
      nueva(linea.slice(0, dos).trim(), n); ult.malForma = true; return;
    }
    nueva(linea.replace(/:$/, '').trim(), n);
  });

  const vistas = {};
  items.forEach(it => {
    const n = it.linea, p = voNorm(it.palabra);
    it.mal = !!it.malForma;
    if (!it.palabra) { errores.push({ n, t: 'Falta la palabra.' }); it.mal = true; }
    else if (it.palabra.length > 60) { errores.push({ n, t: `${it.palabra.slice(0, 20)}…: es muy larga (máximo 60 letras). ¿Falta un "Sin:" o "Ant:"?` }); it.mal = true; }
    if (!it.malForma && !it.sin.length && !it.ant.length) { errores.push({ n, t: `${it.palabra || 'Esta palabra'}: falta "Sin:" o "Ant:" con al menos una palabra.` }); it.mal = true; }
    ['sin', 'ant'].forEach(k => {
      if (it[k].length > 12) avisos.push({ n, t: `${it.palabra}: tiene ${it[k].length} ${VO_CAMPOS[k]}; solo se guardan los 12 primeros.` });
      if (it[k].some(x => x.length > 60)) avisos.push({ n, t: `${it.palabra}: hay un ${VO_CAMPOS[k].slice(0, -1)} muy largo; ¿falta una coma?` });
      if (p && it[k].some(x => voNorm(x) === p)) avisos.push({ n, t: `${it.palabra}: la palabra está dentro de sus ${VO_CAMPOS[k]}.` });
      const dobles = it[k].filter((x, j) => it[k].findIndex(y => voNorm(y) === voNorm(x)) !== j);
      if (dobles.length) avisos.push({ n, t: `${it.palabra}: "${dobles[0]}" está dos veces.` });
    });
    const cruce = it.sin.find(x => it.ant.some(y => voNorm(y) === voNorm(x)));
    if (cruce) avisos.push({ n, t: `${it.palabra}: "${cruce}" está como sinónimo y como antónimo.` });
    if (p && vistas[p]) { errores.push({ n, t: `${it.palabra} está repetida (también en la línea ${vistas[p]}).` }); it.mal = true; }
    else if (p) vistas[p] = n;
    if (p) it.ej.forEach((e, j) => { if (!voNorm(e).includes(voRaiz(it.palabra))) avisos.push({ n, t: `${it.palabra}: ${it.ej.length > 1 ? 'el ejemplo ' + (j + 1) : 'el ejemplo'} no usa la palabra, así que no saldrá en "Completar".` }); });
    if (it.ej.length > 5) avisos.push({ n, t: `${it.palabra}: tiene ${it.ej.length} ejemplos; solo se guardan los 5 primeros.` });
    if (it.def.length > 400) avisos.push({ n, t: `${it.palabra}: la definición pasa de 400 letras y se cortará.` });
    if (it.ej.some(e => e.length > 300)) avisos.push({ n, t: `${it.palabra}: un ejemplo pasa de 300 letras y se cortará.` });
  });
  errores.sort((a, b) => a.n - b.n); avisos.sort((a, b) => a.n - b.n);
  return { items, errores, avisos };
}

function voEscribir(filas) {
  return (filas || []).map(f => {
    let s = f.palabra;
    if ((f.sin || []).length) s += `\n  Sin: ${f.sin.join(', ')}`;
    if ((f.ant || []).length) s += `\n  Ant: ${f.ant.join(', ')}`;
    if (f.def) s += `\n  Def: ${f.def}`;
    (f.ej || []).forEach(e => { s += `\n  Ej: ${e}`; });
    const x = f.extra || {};
    Object.keys(VO_EXTRA).forEach(k => {
      if (x[k] == null || x[k] === '' || (Array.isArray(x[k]) && !x[k].length)) return;
      s += `\n  ${VO_EXTRA[k]}: ${Array.isArray(x[k]) ? x[k].join(', ') : x[k]}`;
    });
    return s;
  }).join('\n\n');
}

/* ---------- Pantalla ---------- */
function voEstado(txt) { $('voEstado').textContent = txt || ''; }
const voError = m => /does not exist|could not find|schema cache/i.test(m || '');

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
    cliente.from('vocabulario').select('orden, palabra, sin, ant, def, ej, extra').order('orden').limit(5000),
    cliente.from('ajustes').select('valor').eq('clave', 'vocabulario').maybeSingle(),
    window.MCCursos ? MCCursos.registro() : Promise.resolve(null)
  ]);
  if (r.error) {
    body.innerHTML = voError(r.error.message)
      ? '<div class="state-msg error">Falta crear la tabla. Corre <b>supabase/13-vocabulario.sql</b> en Supabase → SQL Editor y vuelve a abrir esta pestaña.</div>'
      : '<div class="state-msg error">No se pudo leer el vocabulario. Intenta de nuevo.</div>';
    return;
  }
  VO.publicados = r.data || [];
  VO.texto = voEscribir(VO.publicados);
  VO.cambios = false;
  // Si se recargó la página sin guardar, recupera lo que estaba escrito
  const borrador = voBorrador();
  if (borrador != null && borrador !== VO.texto) { VO.texto = borrador; VO.cambios = true; VO.recuperado = true; }
  else voBorrador(null);
  // "on" lo dejó guardado por error el interruptor del candado: no es un curso
  VO.cursos = ((a.data && a.data.valor && a.data.valor.cursos) || []).filter(c => c !== 'on');
  VO.candado = !(a.data && a.data.valor && a.data.valor.candado === false);
  VO.registro = reg;
  VO.cargado = true;
  pintarVoCursos();
  renderVocabulario();
}

// Borrador en este navegador: lo escrito y no publicado no se pierde al recargar
function voBorrador(v) {
  try {
    if (v === undefined) return localStorage.getItem('mc_voc_borrador');
    if (v === null) localStorage.removeItem('mc_voc_borrador'); else localStorage.setItem('mc_voc_borrador', v);
  } catch (e) { return null; }
}
function voPublicadoTxt() {
  const n = VO.publicados.length;
  return n ? `Publicadas ahora: ${n} palabra${n > 1 ? 's' : ''}` : 'Aún no hay palabras publicadas';
}

function pintarVoCursos() {
  const caja = $('voCursos');
  const lista = ((VO.registro && VO.registro.cursos) || [])
    .filter(c => c.area === 'comunicacion' || VO.cursos.includes(c.id))
    .sort((x, y) => (y.id === 'raz-verbal') - (x.id === 'raz-verbal'));
  caja.innerHTML = `
    <div class="acc-box" style="margin-bottom:18px;">
      <div class="acc-ttl">Cursos con Vocabulario <span>— todos usan este mismo banco de palabras, en todos los ciclos</span></div>
      <div class="vo-cursos">${lista.map(c => `
        <label class="vo-curso"><input type="checkbox" value="${esc(c.id)}" ${VO.cursos.includes(c.id) ? 'checked' : ''}>${esc(c.nombre || c.id)}</label>`).join('') || '<span class="hint">No hay cursos de Comunicación.</span>'}
      </div>
      <p class="hint">La tarjeta Vocabulario aparece en los cursos marcados.</p>
      <div class="acc-row" id="voCandado"><div><b>Candado</b><span>Cargando…</span></div></div>
    </div>`;
  pintarVoCandado();
  caja.querySelectorAll('.vo-curso input').forEach(inp => inp.addEventListener('change', async () => {
    const nuevos = [...caja.querySelectorAll('.vo-curso input:checked')].map(x => x.value);
    caja.querySelectorAll('input').forEach(x => { x.disabled = true; });
    const r = await (await MCAuth.listo).rpc('guardar_ajuste', { p_clave: 'vocabulario', p_valor: { cursos: nuevos, candado: VO.candado } });
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
  $('voBody').innerHTML = `
    <div class="vo-grid">
      <div class="pcard">
        <div class="vo-tit">Escribe aquí <span>una ficha por palabra</span></div>
        <textarea class="inp" id="voTexto" spellcheck="false" placeholder="${esc(VO_EJEMPLO)}"></textarea>
        <div class="vo-acc">
          <button class="btn-ghost" type="button" id="voDeshacer">Volver a lo publicado</button>
        </div>
        <details class="vo-ayuda">
          <summary>Cómo escribir las palabras</summary>
          <pre>${esc(VO_EJEMPLO)}</pre>
          <ul>
            <li>La <b>palabra</b> va sola en su línea. Debajo, <b>Sin:</b> con sus sinónimos y <b>Ant:</b> con sus antónimos, separados por comas. Si la palabra no tiene antónimo, no escribas la línea <b>Ant:</b>; si no tiene sinónimo, no escribas <b>Sin:</b>. Pero necesita al menos una de las dos.</li>
            <li><b>Def:</b> y <b>Ej:</b> son opcionales. Puedes poner hasta 5 ejemplos, cada uno en su propia línea <b>Ej:</b>. Sin <b>Ej</b> la palabra no sale en el juego <i>Completar</i>; sin <b>Def</b> no sale en <i>Escribir</i>.</li>
            <li>El ejemplo debe usar la palabra (sirve "efímera" para EFÍMERO), porque ahí va el espacio en blanco.</li>
            <li>También opcionales: <b>Tipo:</b> adj., sust., verbo o adv. · <b>Nivel:</b> 1, 2 o 3 · <b>Examen:</b> dónde salió (puedes poner varios con comas) · <b>Par:</b> la palabra con la que se confunde · <b>Raíz:</b> de dónde viene · <b>Tip:</b> un truco para recordarla.</li>
            <li>Para corregir una palabra ya publicada, cámbiala aquí y vuelve a guardar.</li>
            <li>Desde Excel: copia las columnas palabra, sinónimos, antónimos, definición y ejemplo (para más ejemplos, más columnas a la derecha) y pégalas aquí.</li>
            <li>Una línea que empieza con <b>#</b> es una nota y no se publica.</li>
          </ul>
        </details>
      </div>
      <div class="pcard">
        <div class="vo-tit">Así lo verán los alumnos <span id="voCuenta"></span></div>
        <div id="voRes"></div>
        <div class="vo-temas" id="voFiltro"></div>
        <input class="inp vo-buscar" id="voBuscar" type="search" placeholder="Buscar palabra" value="${esc(VO.busca)}">
        <div class="vo-lista" id="voLista"></div>
      </div>
    </div>`;
  const ta = $('voTexto');
  ta.value = VO.texto;
  ta.addEventListener('input', () => {
    VO.texto = ta.value;
    VO.cambios = ta.value !== voEscribir(VO.publicados);
    voBorrador(VO.cambios ? ta.value : null);
    VO.borrar = false;
    voVista();
  });
  $('voBuscar').addEventListener('input', e => { VO.busca = e.target.value; voVista(); });
  $('voDeshacer').addEventListener('click', () => {
    VO.texto = voEscribir(VO.publicados); VO.cambios = false; VO.borrar = false; voBorrador(null); VO.recuperado = false; renderVocabulario();
  });
  voVista();
}

// Candado de Vocabulario: se guarda en Supabase (ajustes "vocabulario" → candado: true | false)
function pintarVoCandado() {
  const caja = $('voCandado'); if (!caja) return;
  const con = VO.candado !== false;
  caja.innerHTML = `<div><b>Candado</b><span>${con
      ? 'Pide código. Lo abren los códigos de Vocabulario, de Razonamiento Verbal completo o de Acceso total.'
      : 'Abierto para todos, sin código. Actívalo para volver a pedir código.'}</span></div>
    <label class="sw"><input type="checkbox" id="voCandSw" ${con ? 'checked' : ''}><span></span>${con ? 'Con código' : 'Abierto'}</label>`;
  $('voCandSw').addEventListener('change', async e => {
    const nuevo = e.target.checked;
    e.target.disabled = true;
    const r = await (await MCAuth.listo).rpc('guardar_ajuste', { p_clave: 'vocabulario', p_valor: { cursos: VO.cursos, candado: nuevo } });
    if (r.error) toast(/no autorizado/i.test(r.error.message || '') ? 'Tu correo no es administrador' : (r.error.message || 'No se pudo guardar'), true);
    else { VO.candado = nuevo; toast(nuevo ? 'Candado activado: ahora pide código' : 'Vocabulario abierto para todos'); }
    pintarVoCandado();
  });
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

function voFicha(x) {
  const raiz = voRaiz(x.palabra);
  const ejs = x.ej.slice(0, 5).map(e => raiz ? esc(e).replace(/[\p{L}]+/gu, w => voNorm(w).startsWith(raiz) ? `<mark>${w}</mark>` : w) : esc(e));
  const chips = (k, nom) => x[k].length && VO.filtro !== (k === 'sin' ? 'ant' : 'sin')
    ? `<div class="vo-et">${nom}</div><div class="vo-chips${k === 'ant' ? ' ant' : ''}">${x[k].slice(0, 12).map(y => `<span>${esc(y)}</span>`).join('')}</div>` : '';
  return `
    <div class="vo-card${x.mal ? ' mal' : ''}" data-n="${x.linea}">
      <div class="vo-cab"><div class="vo-pal">${esc(x.palabra) || '—'}${x.extra.tipo ? ` <small class="vo-tipo">${esc(x.extra.tipo)}</small>` : ''}${x.extra.nivel ? ` <small class="vo-niv" title="Nivel ${x.extra.nivel}">${'●'.repeat(x.extra.nivel)}${'○'.repeat(3 - x.extra.nivel)}</small>` : ''}</div>
        ${x.palabra ? `<a class="vo-rae" href="https://dle.rae.es/${encodeURIComponent(x.palabra.toLowerCase())}" target="_blank" rel="noopener">Ver en RAE</a>` : ''}</div>
      ${x.def ? `<div class="vo-def">${esc(x.def)}</div>` : ''}
      ${chips('sin', 'Sinónimos')}${chips('ant', 'Antónimos')}
      ${ejs.map(e => `<div class="vo-ej">${e}</div>`).join('')}
      ${x.extra.par && x.extra.par.length ? `<div class="vo-mas"><b>Se confunde con</b>${x.extra.par.map(esc).join(', ')}</div>` : ''}
      ${x.extra.raiz ? `<div class="vo-mas"><b>Raíz</b>${esc(x.extra.raiz)}</div>` : ''}
      ${x.extra.tip ? `<div class="vo-mas"><b>Truco</b>${esc(x.extra.tip)}</div>` : ''}
      ${x.extra.examen && x.extra.examen.length ? `<div class="vo-exa">${x.extra.examen.map(e => `<span>Salió en ${esc(e)}</span>`).join('')}</div>` : ''}
      ${!x.def ? '<span class="vo-falta">sin definición</span>' : ''}${!x.ej.length ? '<span class="vo-falta">sin ejemplo</span>' : ''}
    </div>`;
}

function voVista() {
  const d = voLeer(VO.texto);
  const nSin = d.items.filter(x => x.sin.length).length, nAnt = d.items.filter(x => x.ant.length).length;
  const conDef = d.items.filter(x => x.def).length, conEj = d.items.filter(x => x.ej.length).length;
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

  $('voFiltro').innerHTML = [['todo', 'Todo', d.items.length], ['sin', 'Sinónimos', nSin], ['ant', 'Antónimos', nAnt]].map(([k, nom, c]) =>
    `<button class="vo-tema${VO.filtro === k ? ' on' : ''}" type="button" data-f="${k}">${nom} <b>${c}</b></button>`).join('');
  $('voFiltro').querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => { VO.filtro = b.dataset.f; voVista(); }));

  const q = voNorm(VO.busca);
  let vis = VO.filtro === 'todo' ? d.items : d.items.filter(x => x[VO.filtro].length || x.mal);
  if (q) vis = vis.filter(x => voNorm(x.palabra).includes(q) || x.sin.concat(x.ant).some(y => voNorm(y).includes(q)));
  $('voLista').innerHTML = vis.length ? vis.slice(0, 300).map(voFicha).join('') + (vis.length > 300 ? `<div class="hint">Se muestran 300 de ${vis.length}. Usa el buscador.</div>` : '')
    : `<div class="vo-vacio">${q ? 'Ninguna palabra coincide.' : 'Aún no hay palabras. Escribe a la izquierda o pega tu lista.'}</div>`;
  $('voLista').querySelectorAll('.vo-card').forEach(c => c.addEventListener('dblclick', () => voIrLinea(+c.dataset.n)));

  $('voDeshacer').disabled = !VO.cambios;
  $('voGuardar').disabled = !VO.cambios;
  $('voGuardar').textContent = VO.borrar ? 'Toca otra vez para vaciar' : 'Guardar y publicar';
  voEstado(VO.cambios
    ? (VO.recuperado ? 'Recuperé lo que escribiste y no publicaste · ' : 'Cambios sin guardar · ') + (d.errores.length ? `${d.errores.length} por corregir` : 'toca Guardar y publicar')
    : voPublicadoTxt());
}

async function guardarVocabulario() {
  const d = voLeer(VO.texto);
  if (d.errores.length) { voVista(); toast('Corrige lo marcado en rojo antes de publicar', true); voIrLinea(d.errores[0].n); return; }
  if (!d.items.length && VO.publicados.length && !VO.borrar) {
    VO.borrar = true; voVista(); toast('Así se borran todas las palabras publicadas. Toca otra vez para confirmar.', true); return;
  }
  VO.borrar = false;
  const lista = d.items.map(x => ({ palabra: x.palabra, sin: x.sin.slice(0, 12), ant: x.ant.slice(0, 12), def: x.def.slice(0, 400), ej: x.ej.slice(0, 5).map(e => e.slice(0, 300)), extra: x.extra }));
  const btn = $('voGuardar'); btn.disabled = true; voEstado('Guardando…');
  const r = await (await MCAuth.listo).rpc('guardar_vocabulario', { p_lista: lista });
  if (r.error) {
    btn.disabled = false; voEstado('');
    const m = r.error.message || '';
    toast(/no autorizado/i.test(m) ? 'Tu correo no es administrador'
      : voError(m) ? 'Primero corre supabase/13-vocabulario.sql en Supabase'
      : (m || 'No se pudo guardar'), true);
    return;
  }
  VO.publicados = lista.map((x, i) => Object.assign({ orden: i + 1 }, x));
  VO.texto = voEscribir(VO.publicados);
  VO.cambios = false;
  voBorrador(null);
  renderVocabulario();
  VO.recuperado = false;
  voEstado(`✓ Publicado: ${r.data == null ? lista.length : r.data} palabras.`);
  toast('Vocabulario guardado');
}

$('voGuardar').addEventListener('click', guardarVocabulario);
window.addEventListener('beforeunload', e => { if (VO.cambios) { e.preventDefault(); e.returnValue = ''; } });
