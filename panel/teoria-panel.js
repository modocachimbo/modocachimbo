/* =========================================================
   Panel · Teoría interactiva (CPU)
   - Teorías: se escriben en texto con marcas ([PARTE], [ENGANCHE],
     [CONCEPTO]…, ver assets/teoria.js) y se guardan con un código
     (ej. bio-glucidos) en <curso>/teoria/<código>.json.
   - Vincular: en cada ciclo, cada tema del libro elige qué teoría usa
     ("teoria": "<código>" en data/<año>.json). Así no importa el orden
     de los temas en cada ciclo.
   - Vista previa: ../teoria.html?borrador=1 lee el texto de localStorage.
   Necesita el Apps Script v25 (teorias, teoria, guardarTeoria, borrarTeoria, vincularTeoria).
   ========================================================= */
const TE = { curso: null, vista: 'lista', lista: null, edit: null, anio: null, temas: null, manifest: null };

(function estilosTeoria() {
  const st = document.createElement('style');
  st.textContent = `
  .te-fila { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; margin-bottom: 14px; }
  .te-fila > small { font: 900 11px Nunito, sans-serif; letter-spacing: .1em; text-transform: uppercase; color: var(--text-faint); }
  .te-fila select.inp { width: auto; min-width: 180px; }
  .te-seg { display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px; background: var(--surface); border: 1px solid #2F284E; }
  .te-seg button { border: 0; background: none; color: var(--text-dim); font: 800 13px Nunito, sans-serif; padding: 7px 12px; border-radius: 9px; cursor: pointer; }
  .te-seg button.on { background: var(--accent); color: #0e0e0e; }
  .te-lista { display: grid; gap: 10px; }
  .te-it { display: flex; align-items: center; gap: 12px; background: var(--surface); border: 1px solid #2F284E; border-radius: 14px; padding: 12px 14px; }
  .te-it .ic { width: 40px; height: 40px; flex: none; border-radius: 11px; background: rgba(198,224,0,.12); display: grid; place-items: center; color: var(--accent); }
  .te-it .ic svg { width: 22px; height: 22px; }
  .te-it .tx { flex: 1; min-width: 0; }
  .te-it .tx b { display: block; font-size: 15px; }
  .te-it .tx small { color: var(--text-dim); font-size: 12.5px; }
  .te-it code, .te-cod { font: 700 12px ui-monospace, Menlo, monospace; background: #241E3E; color: var(--accent); padding: 2px 7px; border-radius: 6px; }
  .te-it .acc { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
  .te-it .acc a { text-decoration: none; }
  .te-ed { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; align-items: start; }
  @media (max-width: 1100px) { .te-ed { grid-template-columns: 1fr; } }
  .te-campos { display: grid; grid-template-columns: 1fr 220px; gap: 10px; margin-bottom: 10px; }
  .te-campos label { font: 800 12px Nunito, sans-serif; color: var(--text-dim); display: grid; gap: 5px; }
  .te-barra { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
  .te-barra button { border: 1px solid #2F284E; background: #110D20; color: var(--text-dim); font: 800 11.5px Nunito, sans-serif; padding: 5px 9px; border-radius: 8px; cursor: pointer; }
  .te-barra button:hover { color: var(--accent); border-color: var(--accent); }
  .te-barra .eng { border-color: rgba(255,95,162,.5); color: #FF8CC0; }
  #teTexto { width: 100%; min-height: 560px; font: 13px/1.55 ui-monospace, Menlo, monospace; resize: vertical; }
  .te-err { margin-top: 10px; border-radius: 12px; padding: 10px 12px; font-size: 13px; line-height: 1.5; }
  .te-err.mal { background: rgba(224,60,60,.1); border: 1px solid rgba(224,60,60,.35); color: #ffb3b3; }
  .te-err.bien { background: rgba(88,204,2,.08); border: 1px solid rgba(88,204,2,.3); color: #9BEA5A; }
  .te-prev { position: sticky; top: 12px; border: 1px solid #2F284E; border-radius: 18px; overflow: hidden; background: #0B0818; }
  .te-prev .cab { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid #2F284E; font: 800 12px Nunito, sans-serif; color: var(--text-dim); }
  .te-prev .cab .te-seg { margin-left: auto; }
  .te-prev iframe { display: block; width: 100%; height: 78vh; border: 0; background: #0B0818; margin: 0 auto; transition: width .2s; }
  .te-prev.cel iframe { width: 390px; max-width: 100%; }
  .te-pie { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; align-items: center; }
  .te-ayuda { margin-top: 12px; border: 1px solid #2F284E; border-radius: 14px; background: var(--surface); }
  .te-ayuda summary { cursor: pointer; padding: 10px 14px; font: 800 13px Nunito, sans-serif; }
  .te-ayuda pre { margin: 0; padding: 0 14px 14px; white-space: pre-wrap; font: 12.5px/1.55 ui-monospace, Menlo, monospace; color: var(--text-dim); }
  .te-tabla { width: 100%; border-collapse: separate; border-spacing: 0; background: var(--surface); border: 1px solid #2F284E; border-radius: 16px; overflow: hidden; }
  .te-tabla th { font: 900 11px Nunito, sans-serif; letter-spacing: .08em; text-transform: uppercase; color: var(--text-faint); text-align: left; padding: 10px 12px; border-bottom: 1px solid #2F284E; }
  .te-tabla td { padding: 8px 12px; border-bottom: 1px solid rgba(47,40,78,.6); font-size: 14px; }
  .te-tabla tr:last-child td { border-bottom: 0; }
  .te-tabla td.n { width: 44px; font: 900 13px Nunito, sans-serif; color: var(--accent); }
  .te-tabla select.inp { padding: 7px 10px; font-size: 13.5px; }
  .te-tabla .est { width: 120px; font-size: 12px; color: var(--text-faint); }
  .te-tabla .est.ok { color: #9BEA5A; } .te-tabla .est.mal { color: #ffb3b3; }
  .te-sug { font-size: 11.5px; color: #FF8CC0; margin-top: 3px; cursor: pointer; }
  `;
  document.head.appendChild(st);
})();

const TE_IC_LIBRO = '<svg viewBox="0 0 64 64" fill="currentColor"><path fill-rule="evenodd" d="M16 4h36a4 4 0 0 1 4 4v40a4 4 0 0 1-4 4H17a3 3 0 0 0 0 6h37a2 2 0 0 1 0 4H17a7 7 0 0 1-7-7V10a6 6 0 0 1 6-6zM19 4h3v48h-3zM28 14v12h20V14zm4 4h12v4H32z"/></svg>';
const TE_PLANTILLAS = {
  parte: '[PARTE] Título de la parte\n',
  enganche: '[ENGANCHE] Pregunta curiosa que despierte ganas de leer\nA) …\nB) …\nC) …\nCLAVE: B\nPOR QUÉ: Explicación que se muestra al final de la parte.\n',
  concepto: '[CONCEPTO] Concepto clave\nTexto con **negrita** y ==resaltado==.\n',
  formula: '[FÓRMULA] $E = \\rho \\cdot g \\cdot V$\nQué significa cada letra\n',
  tarjetas: '[TARJETAS] Recuerda\nNombre | detalle\nNombre | detalle\nNombre | detalle\n',
  arbol: '[ÁRBOL] Tipos\nRama 1 | detalle\nRama 2 | detalle\nRama 3 | detalle\n',
  pasos: '[PASOS] Paso a paso\nPrimero…\nLuego…\nAl final…\n',
  ojo: '[OJO] Lo que más cae en el examen.\n',
  dato: '[DATO] ¿Sabías que…?\n',
  grafico: '[GRÁFICO: barras]\nA: 10\nB: 20\n[/GRÁFICO]\n',
  imagen: '[IMAGEN] https://…\nPie de la imagen\n',
  figura: '[FIGURA] glucosa\nPie de la figura\n',
  laboratorio: '[LABORATORIO] lab-celula\nJuega con el simulador y mira…\n',
  entendiste: '[ENTENDISTE] Pregunta para comprobar\nA) …\nB) …\nC) …\nCLAVE: A\nPOR QUÉ: …\n'
};
const TE_AYUDA = `Cada marca va al inicio de una línea; lo que sigue hasta la próxima marca es su contenido.

[PARTE] Título            → empieza una parte (4 a 6 partes por tema va bien)
[ENGANCHE] Pregunta       → la primera de cada parte: el alumno adivina ANTES de leer
A) …  B) …  C) …          → una opción por línea
CLAVE: B                  → la correcta
POR QUÉ: …                → se muestra al final de la parte («¿Acertaste?»)
[CONCEPTO] Título         → párrafos (una línea en blanco separa párrafos)
[FÓRMULA] $…$             → la línea de abajo explica cada letra
[TARJETAS] Título         → «Nombre | detalle», una por línea (salen de colores)
[ÁRBOL] Raíz              → clasificación: «Rama | detalle», una por línea
[PASOS] Título            → lista numerada, un paso por línea
[OJO] …                   → «Ojo, cae en el examen» (naranja)
[DATO] …                  → «¿Sabías que…?» (azul)
[GRÁFICO: tipo] … [/GRÁFICO] → los mismos gráficos de las preguntas
[IMAGEN] https://…        → la línea de abajo es el pie
[FIGURA] glucosa          → figuras animadas: glucosa, enlace, trigliceridos
[LABORATORIO] lab-celula  → botón al simulador (lab-celula, lab-mitosis, lab-tabla…)
[ENTENDISTE] Pregunta     → al final de la parte, con A) B) C), CLAVE y POR QUÉ

Texto: **negrita**  ==resaltado en lima==  $fórmula$`;

function teCursos() { return (typeof CURSOS !== 'undefined' ? CURSOS : []).map(c => [c[0], String(c[1])]).filter(c => !/--/.test(c[0])); }
function teEstado(t) { const e = $('teEstado'); if (e) e.textContent = t || ''; }
function teFecha(iso) { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }); }
function teUrl(cod) { return SITE_ROOT + 'teoria.html?curso=' + encodeURIComponent(TE.curso) + '&c=' + encodeURIComponent(cod); }

async function cargarTeoria(forzar) {
  if (!TE.curso) TE.curso = (teCursos()[0] || ['biologia'])[0];
  if (forzar) { TE.lista = null; TE.temas = null; }
  renderTeoria();
}

function renderTeoria() {
  const body = $('teBody'); if (!body) return;
  if (TE.edit) return renderEditorTeoria();
  const cursos = teCursos();
  body.innerHTML = `
    <div class="te-fila">
      <small>Curso</small>
      <select class="inp" id="teCurso">${cursos.map(([id, n]) => `<option value="${esc(id)}"${id === TE.curso ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>
      <div class="te-seg" id="teVista"><button type="button" data-v="lista" class="${TE.vista === 'lista' ? 'on' : ''}">Teorías</button><button type="button" data-v="vincular" class="${TE.vista === 'vincular' ? 'on' : ''}">Vincular a temas</button></div>
    </div>
    <div id="teCont"><div class="loader">Cargando…</div></div>`;
  $('teCurso').onchange = e => { TE.curso = e.target.value; TE.lista = null; TE.temas = null; TE.manifest = null; TE.anio = null; renderTeoria(); };
  $('teVista').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; TE.vista = b.dataset.v; renderTeoria(); };
  if (TE.vista === 'vincular') renderVincular(); else renderListaTeoria();
}

async function teTraerLista() {
  if (!TE.lista) TE.lista = (await api('teorias', { curso: TE.curso })).teorias || [];
  return TE.lista;
}

async function renderListaTeoria() {
  const cont = $('teCont');
  try { await teTraerLista(); } catch (e) { cont.innerHTML = `<div class="state-msg error">${esc(e.message)}${/no válida/i.test(e.message) ? '<br>Pega el Apps Script v25 para usar Teoría.' : ''}</div>`; return; }
  const L = TE.lista;
  cont.innerHTML = `
    <div class="te-pie" style="margin:0 0 14px"><button class="btn-main" id="teNueva" type="button">＋ Nueva teoría</button>
      <span class="hint" style="margin:0">Después de guardarla, ve a «Vincular a temas» para elegir en qué tema de cada ciclo aparece.</span></div>
    ${L.length ? `<div class="te-lista">${L.map(t => `
      <div class="te-it">
        <span class="ic">${TE_IC_LIBRO}</span>
        <div class="tx"><b>${esc(t.titulo)}</b><small><code>${esc(t.codigo)}</code> · ${t.partes || 0} partes · ${esc(teFecha(t.actualizado))}</small></div>
        <div class="acc">
          <a class="btn-ghost" href="${esc(teUrl(t.codigo))}" target="_blank" rel="noopener">Ver</a>
          <button class="btn-ghost" type="button" data-ed="${esc(t.codigo)}">Editar</button>
          <button class="btn-ghost solo-borrar" type="button" data-del="${esc(t.codigo)}">Borrar</button>
        </div>
      </div>`).join('')}</div>` : '<div class="state-msg">Este curso todavía no tiene teoría. Toca «＋ Nueva teoría».</div>'}`;
  $('teNueva').onclick = () => { TE.edit = { nuevo: true, codigo: teSugerirCodigo(''), titulo: '', texto: '' }; renderTeoria(); };
  cont.querySelectorAll('[data-ed]').forEach(b => b.onclick = async () => {
    b.disabled = true; b.textContent = 'Abriendo…';
    try { const t = (await api('teoria', { curso: TE.curso, codigo: b.dataset.ed })).teoria; TE.edit = { nuevo: false, codigo: t.codigo, titulo: t.titulo, texto: t.texto || '' }; renderTeoria(); }
    catch (e) { toast(e.message, true); b.disabled = false; b.textContent = 'Editar'; }
  });
  cont.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    const cod = b.dataset.del;
    if (prompt('Se borra la teoría «' + cod + '». Los temas vinculados dejan de mostrarla. Escribe BORRAR para confirmar.') !== 'BORRAR') return;
    b.disabled = true;
    try { await api('borrarTeoria', { curso: TE.curso, codigo: cod }); toast('Teoría borrada'); TE.lista = null; renderListaTeoria(); }
    catch (e) { toast(e.message, true); b.disabled = false; }
  });
}

function teSugerirCodigo(titulo) {
  const pre = { biologia: 'bio', anatomia: 'ana', quimica: 'qui', fisica: 'fis', algebra: 'alg', aritmetica: 'ari', geometria: 'geo', trigonometria: 'tri', estadistica: 'est' }[TE.curso] || TE.curso.slice(0, 3);
  const s = String(titulo || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').filter(w => w.length > 1 && !['de', 'la', 'el', 'los', 'las', 'del', 'y', 'en'].includes(w)).slice(0, 3).join('-');
  return s ? pre + '-' + s : '';
}

let teT = 0;
function renderEditorTeoria() {
  const E = TE.edit, body = $('teBody');
  body.innerHTML = `
    <div class="te-ed">
      <div>
        <div class="te-campos">
          <label>Título<input class="inp" id="teTitulo" maxlength="80" placeholder="Ej. Glúcidos y lípidos" value="${esc(E.titulo)}"></label>
          <label>Código${E.nuevo ? '' : ' (no cambia)'}<input class="inp" id="teCodigo" maxlength="50" placeholder="bio-glucidos" value="${esc(E.codigo)}"${E.nuevo ? '' : ' disabled'}></label>
        </div>
        <div class="te-barra" id="teMarcas">
          ${Object.keys(TE_PLANTILLAS).map(k => `<button type="button" data-m="${k}" class="${k === 'enganche' ? 'eng' : ''}">${{ parte: '+ Parte', enganche: '+ Enganche', concepto: 'Concepto', formula: 'Fórmula', tarjetas: 'Tarjetas', arbol: 'Árbol', pasos: 'Pasos', ojo: 'Ojo', dato: 'Dato', grafico: 'Gráfico', imagen: 'Imagen', figura: 'Figura', laboratorio: 'Laboratorio', entendiste: '¿Entendiste?' }[k]}</button>`).join('')}
        </div>
        <textarea class="inp" id="teTexto" spellcheck="true" placeholder="[PARTE] …">${esc(E.texto)}</textarea>
        <div id="teErr"></div>
        <div class="te-pie">
          <button class="btn-main" id="teGuardar" type="button">Guardar y publicar</button>
          <button class="btn-ghost" id="teCancelar" type="button">Volver</button>
          <span id="tePrompt"></span>
        </div>
        <details class="te-ayuda"><summary>Cómo escribir la teoría (marcas)</summary><pre>${esc(TE_AYUDA)}</pre></details>
      </div>
      <div class="te-prev" id="tePrev">
        <div class="cab">Vista previa <div class="te-seg" id="teTam"><button type="button" data-t="cel" class="on">Celular</button><button type="button" data-t="pc">PC</button></div></div>
        <iframe id="teFrame" title="Vista previa de la teoría"></iframe>
      </div>
    </div>`;
  $('tePrev').classList.add('cel');
  $('teTam').onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; $('teTam').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); $('tePrev').classList.toggle('cel', b.dataset.t === 'cel'); };
  const pb = document.createElement('button'); pb.type = 'button'; pb.className = 'btn-ghost btn-ia';
  pb.innerHTML = (typeof ICONO_IA !== 'undefined' ? ICONO_IA : '') + ' Copiar prompt para IA';
  pb.onclick = () => copiarPromptIA(null, pb, IA_TEORIA(), 'Prompt copiado. Pégalo en Gemini con tu separata o el tema, y pega aquí lo que te devuelva.');
  $('tePrompt').appendChild(pb);
  const ta = $('teTexto');
  $('teTitulo').oninput = () => { E.titulo = $('teTitulo').value; if (E.nuevo && !E.codigoTocado) { E.codigo = teSugerirCodigo(E.titulo); $('teCodigo').value = E.codigo; } tePrevia(); };
  $('teCodigo').oninput = () => { E.codigoTocado = true; E.codigo = $('teCodigo').value.trim().toLowerCase(); };
  ta.oninput = () => { E.texto = ta.value; clearTimeout(teT); teT = setTimeout(tePrevia, 500); };
  $('teMarcas').onclick = e => {
    const b = e.target.closest('[data-m]'); if (!b) return;
    const ins = TE_PLANTILLAS[b.dataset.m], s = ta.selectionStart, antes = ta.value.slice(0, s);
    const pre = antes && !/\n\n$/.test(antes) ? (/\n$/.test(antes) ? '\n' : '\n\n') : '';
    ta.setRangeText(pre + ins, s, ta.selectionEnd, 'end'); ta.focus(); ta.dispatchEvent(new Event('input'));
  };
  $('teCancelar').onclick = () => { if (TE.edit.cambio && !confirm('¿Salir sin guardar?')) return; TE.edit = null; renderTeoria(); };
  $('teGuardar').onclick = teGuardar;
  ta.addEventListener('input', () => { E.cambio = true; }, { once: true });
  $('teFrame').src = SITE_ROOT + 'teoria.html?borrador=1&curso=' + encodeURIComponent(TE.curso);
  tePrevia();
}

function tePrevia() {
  const E = TE.edit; if (!E) return;
  const r = window.MCTeoria ? MCTeoria.parsear(E.texto) : { partes: [], errores: [] };
  E.partes = r.partes.length;
  const err = $('teErr');
  if (err) err.innerHTML = !E.texto.trim() ? '' : r.errores.length
    ? `<div class="te-err mal"><b>Revisa:</b><br>${r.errores.slice(0, 8).map(esc).join('<br>')}${r.errores.length > 8 ? '<br>…y ' + (r.errores.length - 8) + ' más' : ''}</div>`
    : `<div class="te-err bien">Todo bien: ${r.partes.length} ${r.partes.length === 1 ? 'parte' : 'partes'}, ${r.partes.filter(p => p.enganche).length} con enganche.</div>`;
  try { localStorage.setItem('mc_teoria_borrador', JSON.stringify({ curso: TE.curso, codigo: E.codigo || 'borrador', titulo: E.titulo || 'Sin título', texto: E.texto })); } catch (e) {}
  const f = $('teFrame'); if (f && f.contentWindow) f.contentWindow.postMessage('mc-teoria-recargar', location.origin);
}

async function teGuardar() {
  const E = TE.edit, b = $('teGuardar');
  E.titulo = $('teTitulo').value.trim(); E.codigo = $('teCodigo').value.trim().toLowerCase();
  if (E.titulo.length < 2) return toast('Falta el título', true);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(E.codigo)) return toast('El código solo lleva minúsculas, números y guiones (ej. bio-glucidos)', true);
  const r = MCTeoria.parsear(E.texto);
  if (r.errores.length && !confirm('La teoría tiene ' + r.errores.length + ' cosa(s) por revisar. ¿Guardar igual?')) return;
  b.disabled = true; b.textContent = 'Guardando…';
  try {
    await api('guardarTeoria', { curso: TE.curso, codigo: E.codigo, titulo: E.titulo, texto: E.texto, partes: r.partes.length, nuevo: !!E.nuevo });
    toast('Teoría guardada. En 1–2 minutos se ve en la web.');
    TE.lista = null; E.nuevo = false; E.cambio = false;
    b.textContent = 'Guardado';
    $('teCodigo').disabled = true;
    setTimeout(() => { if ($('teGuardar')) { $('teGuardar').disabled = false; $('teGuardar').textContent = 'Guardar y publicar'; } }, 1500);
  } catch (e) { toast(e.message, true); b.disabled = false; b.textContent = 'Guardar y publicar'; }
}

/* ---------- Vincular: en cada ciclo, qué teoría usa cada tema ---------- */
async function renderVincular() {
  const cont = $('teCont');
  try {
    await teTraerLista();
    if (!TE.manifest) TE.manifest = ((await api('archivo', { carpeta: TE.curso })).manifest || []).filter(m => /^\d{4}-[IV]+$/.test(m.id));
  } catch (e) { cont.innerHTML = `<div class="state-msg error">${esc(e.message)}</div>`; return; }
  const ciclos = TE.manifest.map(m => m.id);
  if (!ciclos.length) { cont.innerHTML = '<div class="state-msg">Este curso todavía no tiene ciclos.</div>'; return; }
  if (!TE.anio || !ciclos.includes(TE.anio)) TE.anio = ciclos[ciclos.length - 1];
  cont.innerHTML = `<div class="te-fila"><small>Ciclo</small><div class="te-seg" id="teCiclo">${ciclos.map(c => `<button type="button" data-c="${esc(c)}" class="${c === TE.anio ? 'on' : ''}">${esc(c)}</button>`).join('')}</div></div><div id="teTemas"><div class="loader">Cargando temas…</div></div>`;
  $('teCiclo').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; TE.anio = b.dataset.c; TE.temas = null; renderVincular(); };
  const caja = $('teTemas');
  try { if (!TE.temas) TE.temas = (await api('archivo', { carpeta: TE.curso, anio: TE.anio })).temas || []; }
  catch (e) { caja.innerHTML = `<div class="state-msg error">${esc(e.message)}</div>`; return; }
  if (!TE.lista.length) { caja.innerHTML = '<div class="state-msg">Primero crea una teoría en la pestaña «Teorías».</div>'; return; }
  const plano = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  caja.innerHTML = `<table class="te-tabla"><thead><tr><th>N°</th><th>Tema del ${esc(TE.anio)}</th><th>Teoría</th><th></th></tr></thead><tbody>${TE.temas.map(t => {
    const sug = !t.teoria && TE.lista.find(x => plano(x.titulo) === plano(t.name));
    return `<tr data-t="${esc(t.num)}"><td class="n">${esc(t.num)}</td><td>${esc(t.name)}</td>
      <td><select class="inp">${['<option value="">— Sin teoría —</option>'].concat(TE.lista.map(x => `<option value="${esc(x.codigo)}"${x.codigo === t.teoria ? ' selected' : ''}>${esc(x.titulo)} (${esc(x.codigo)})</option>`)).join('')}${t.teoria && !TE.lista.some(x => x.codigo === t.teoria) ? `<option value="${esc(t.teoria)}" selected>${esc(t.teoria)} (ya no existe)</option>` : ''}</select>
      ${sug ? `<div class="te-sug" data-sug="${esc(sug.codigo)}">Sugerida: ${esc(sug.titulo)} · tocar para usarla</div>` : ''}</td>
      <td class="est">${t.teoria ? 'Vinculada' : ''}</td></tr>`;
  }).join('')}</tbody></table><p class="hint">Cada cambio se guarda solo y se publica en 1–2 minutos. En el tema aparece la barra «Teoría».</p>`;
  caja.querySelectorAll('tr[data-t]').forEach(tr => {
    const s = tr.querySelector('select'), est = tr.querySelector('.est');
    const guardar = async () => {
      s.disabled = true; est.className = 'est'; est.textContent = 'Guardando…';
      try {
        await api('vincularTeoria', { curso: TE.curso, anio: TE.anio, tema: tr.dataset.t, codigo: s.value });
        const t = TE.temas.find(x => String(x.num) === tr.dataset.t); if (t) { if (s.value) t.teoria = s.value; else delete t.teoria; }
        est.className = 'est ok'; est.textContent = s.value ? 'Vinculada' : 'Quitada';
        const sg = tr.querySelector('.te-sug'); if (sg) sg.remove();
      } catch (e) { est.className = 'est mal'; est.textContent = 'Error'; toast(e.message, true); }
      s.disabled = false;
    };
    s.onchange = guardar;
    const sg = tr.querySelector('.te-sug'); if (sg) sg.onclick = () => { s.value = sg.dataset.sug; guardar(); };
  });
}

/* ---------- Prompt para que la IA escriba la teoría con este formato ---------- */
function IA_TEORIA() {
  return `Eres un profesor preuniversitario peruano experto y muy didáctico. Vas a escribir la TEORÍA de un tema para mi plataforma "Modo Cachimbo" (alumnos de 16–18 años que postulan a la universidad, nivel CPU). Te pasaré la separata, el libro o solo el nombre del tema.

${typeof IA_SALIDA !== 'undefined' ? IA_SALIDA.replace(/\n- No cambies el contenido[^\n]*/, '').replace(/\n- No resumas[^\n]*/, '') : ''}

CÓMO ES LA TEORÍA
- Divide el tema en 4 a 6 PARTES cortas (cada una se lee en 1–2 minutos).
- Cada parte empieza con un ENGANCHE: una pregunta curiosa de la vida diaria que el alumno intenta adivinar ANTES de leer (ej. "¿Por qué el pan se vuelve dulce si lo masticas un buen rato?"). Debe dar ganas de leer y la respuesta debe estar en esa parte. 3 opciones, una sola correcta, las otras creíbles.
- Escribe corto, claro y en español peruano neutro. Frases de máximo 2 líneas. Nada de relleno.
- Usa **negrita** para los términos clave y ==resaltado== para lo que deben memorizar (fórmulas, números, nombres).
- Pon al menos un bloque visual por parte: TARJETAS, ÁRBOL, PASOS, FÓRMULA o GRÁFICO.
- Agrega un OJO con lo que más cae en el examen de admisión (trampas típicas).
- Termina cada parte con un ENTENDISTE (pregunta tipo examen, 3 opciones).
- Las fórmulas van con LaTeX entre signos $ (ej. $E = \\rho \\cdot g \\cdot V$).
- No uses emojis.

FORMATO EXACTO (cada marca al inicio de una línea; lo que sigue hasta la próxima marca es su contenido)
[PARTE] Título de la parte
[ENGANCHE] Pregunta curiosa
A) opción
B) opción
C) opción
CLAVE: B
POR QUÉ: Explicación corta de la respuesta (se muestra al final de la parte).

[CONCEPTO] Título
Párrafo con **negrita** y ==resaltado==.
Otro párrafo (separa párrafos con una línea en blanco).

[FÓRMULA] $fórmula$
Qué significa cada letra

[TARJETAS] Título
Nombre | detalle corto
Nombre | detalle corto

[ÁRBOL] Raíz de la clasificación
Rama | detalle
Rama | detalle

[PASOS] Título
Primer paso
Segundo paso

[OJO] Lo que más cae / la trampa típica.

[DATO] Un dato curioso que ayude a recordar.

[ENTENDISTE] Pregunta tipo examen
A) opción
B) opción
C) opción
CLAVE: A
POR QUÉ: Por qué esa es la correcta.

Opcionales:
[FIGURA] glucosa   (figuras animadas que ya existen: glucosa, enlace, trigliceridos)
[LABORATORIO] lab-celula   (simuladores: lab-celula, lab-mitosis, lab-punnett, lab-tabla, lab-atomo, lab-balanceo, lab-parabolico, lab-plano-inclinado, lab-mru, lab-circuito, lab-optica, lab-funciones, lab-trigo, lab-triangulos) y abajo una línea que diga qué probar
[GRÁFICO: tipo] … [/GRÁFICO]   (solo si el tema lo necesita)

${typeof IA_GRAFICOS !== 'undefined' ? IA_GRAFICOS : ''}`;
}
