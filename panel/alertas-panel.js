/* =========================================================
   Panel · Alertas
   ========================================================= */
const AL = { lista: [], cargada: false };
const PAGINAS = [['inicio', 'Inicio del sitio'], ['curso', 'Página del curso y temario'], ['estudio', 'Modo estudio'], ['quiz', 'Modo quiz'], ['repaso', 'Repaso'], ['fijas', 'Fijas']];
const PAG_NIVEL = { sitio: ['inicio', 'curso', 'estudio', 'quiz', 'repaso', 'fijas'], curso: ['curso', 'estudio', 'quiz', 'repaso', 'fijas'], anio: ['curso', 'estudio', 'quiz', 'repaso', 'fijas'], tema: ['estudio', 'quiz'] };
const TIPO_LBL = { aviso: 'Aviso', info: 'Información', urgente: 'Urgente', novedad: 'Novedad' };
const EST_LBL = { ventana: 'Ventana al centro', franja: 'Franja arriba' };
const FREC_LBL = { siempre: 'Siempre', visita: 'Una vez por visita', 'una-vez': 'Solo una vez' };
const NIVEL_LBL = { sitio: 'Todo el sitio', curso: 'Un curso', anio: 'Un año', tema: 'Un tema' };

function alcanceTxt(s) {
  s = s || { nivel: 'sitio' };
  if (s.nivel === 'sitio') return 'Todo el sitio';
  return [NOMBRE[s.carpeta] || s.carpeta, s.anio, s.tema ? 'Tema ' + s.tema : ''].filter(Boolean).join(' · ');
}

async function cargarAlertas() {
  $('alList').innerHTML = '<div class="loader">Cargando alertas…</div>';
  try { AL.lista = (await api('alertas')).alertas || []; AL.cargada = true; renderAlertas(); }
  catch (e) { $('alList').innerHTML = `<div class="state-msg error">${esc(e.message)}</div>`; }
}

function renderAlertas() {
  const hoy = new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10);
  if (!AL.lista.length) { $('alList').innerHTML = '<div class="state-msg">Aún no tienes alertas. Crea una con <b>Nueva alerta</b>.</div>'; return; }
  $('alList').innerHTML = AL.lista.map(a => {
    const t = MCAlertas.tipos[a.tipo] || MCAlertas.tipos.aviso;
    const vencida = a.hasta && hoy > a.hasta;
    return `<article class="rcard alcard ${a.activa && !vencida ? '' : 'dim'}" style="--c:${t.color}">
      <div class="rtop">
        <div class="rmeta">
          <span class="pill" style="background:${t.soft};color:${t.color}">${esc(TIPO_LBL[a.tipo] || a.tipo)}</span>
          <span class="pill gray">${esc(alcanceTxt(a.alcance))}</span>
          ${vencida ? '<span class="pill Revertida">Vencida</span>' : ''}
        </div>
        <label class="sw" title="${a.activa ? 'Apagar' : 'Encender'}"><input type="checkbox" data-sw="${esc(a.id)}" ${a.activa ? 'checked' : ''}><span></span>${a.activa ? 'Activa' : 'Apagada'}</label>
      </div>
      <div class="altit">${esc(a.titulo || '(sin título)')}</div>
      <div class="almsg">${esc(plano(a.mensaje)).slice(0, 220)}</div>
      <div class="almeta">${esc(EST_LBL[a.estilo])} · ${esc(FREC_LBL[a.frecuencia])} · ${(a.paginas || []).map(p => esc((PAGINAS.find(x => x[0] === p) || [p, p])[1])).join(', ')}${a.hasta ? ' · hasta el ' + esc(a.hasta.split('-').reverse().join('/')) : ''}</div>
      <div class="rfoot">
        <button class="rbtn danger" type="button" data-del="${esc(a.id)}">Borrar</button>
        <button class="rbtn primary" type="button" data-ed="${esc(a.id)}">${ICON_EDIT} Editar</button>
      </div>
    </article>`;
  }).join('');
  $('alList').querySelectorAll('[data-ed]').forEach(b => b.addEventListener('click', () => editarAlerta(AL.lista.find(x => x.id === b.dataset.ed))));
  $('alList').querySelectorAll('[data-sw]').forEach(c => c.addEventListener('change', async () => {
    const a = AL.lista.find(x => x.id === c.dataset.sw);
    c.disabled = true;
    try { const r = await api('guardarAlerta', { alerta: JSON.stringify(Object.assign({}, a, { activa: c.checked })) }); Object.assign(a, r.alerta); toast(c.checked ? 'Alerta encendida' : 'Alerta apagada'); }
    catch (e) { c.checked = !c.checked; toast(e.message, true); }
    renderAlertas();
  }));
  $('alList').querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
    if (!b.classList.contains('confirm')) { b.classList.add('confirm'); b.textContent = '¿Seguro? Toca otra vez'; setTimeout(() => { if (b.isConnected) { b.classList.remove('confirm'); b.textContent = 'Borrar'; } }, 4000); return; }
    b.disabled = true;
    try { await api('borrarAlerta', { id: b.dataset.del }); AL.lista = AL.lista.filter(x => x.id !== b.dataset.del); toast('Alerta borrada'); renderAlertas(); }
    catch (e) { toast(e.message, true); b.disabled = false; }
  }));
}

function chipsSel(nombre, opciones, valor) {
  return `<div class="chips seg" data-g="${nombre}">` + opciones.map(([v, l, extra]) =>
    `<button type="button" class="chip ${v === valor ? 'on' : ''}" data-v="${esc(v)}" ${extra || ''}>${l}</button>`).join('') + '</div>';
}

function editarAlerta(orig) {
  const a = JSON.parse(JSON.stringify(orig || {
    activa: true, etiqueta: '', titulo: '', mensaje: '', tipo: 'aviso', estilo: 'ventana', frecuencia: 'siempre',
    alcance: { nivel: 'tema', carpeta: sel.carpeta || '', anio: sel.anio || '', tema: sel.tema || '' }, paginas: ['estudio'], hasta: '', boton: ''
  }));
  a.alcance = Object.assign({ nivel: 'sitio' }, a.alcance);
  const o = document.createElement('div');
  o.className = 'ov';
  o.innerHTML = `<div class="mcard alcardm"><button class="mx" type="button" aria-label="Cerrar">✕</button>
    <div class="eyebrow">${orig ? 'Editar alerta' : 'Nueva alerta'}</div>
    <h3>${orig ? esc(orig.titulo || 'Alerta') : 'Crear alerta'}</h3>
    <div class="algrid">
      <div class="alform">
        <label class="fld">Tipo</label>${chipsSel('tipo', Object.entries(TIPO_LBL).map(([v, l]) => [v, `<i class="dot" style="background:${MCAlertas.tipos[v].color}"></i>${l}`]), a.tipo)}
        <label class="fld">Título</label><input class="inp" id="alTit" maxlength="120" value="${esc(a.titulo)}" placeholder="Ej.: Claves no oficiales">
        <label class="fld">Mensaje</label><textarea class="ta" id="alMsg" maxlength="1000" style="min-height:100px" placeholder="Ej.: Las claves de este tema son de elaboración propia…">${esc(a.mensaje)}</textarea>
        <div class="hint">**negrita** · los enlaces (https://…) se vuelven clicables.</div>
        <label class="fld">Cómo se ve</label>${chipsSel('estilo', Object.entries(EST_LBL), a.estilo)}
        <label class="fld">Cada cuánto</label>${chipsSel('frecuencia', Object.entries(FREC_LBL), a.frecuencia)}
        <div class="hint" id="alFrecHint"></div>
        <label class="fld">Dónde (alcance)</label>${chipsSel('nivel', Object.entries(NIVEL_LBL), a.alcance.nivel)}
        <div class="alsel" id="alSel"></div>
        <label class="fld">En qué páginas</label><div class="alpags" id="alPags"></div>
        <details class="fmt" style="margin-top:16px;"><summary>Más opciones</summary>
          <div class="al2">
            <label>Etiqueta<input class="inp" id="alEtq" maxlength="40" value="${esc(a.etiqueta)}" placeholder="Aviso importante"></label>
            <label>Texto del botón<input class="inp" id="alBtn" maxlength="30" value="${esc(a.boton)}" placeholder="Entendido"></label>
            <label>Se apaga sola el<input class="inp" id="alHasta" type="date" value="${esc(a.hasta)}"></label>
          </div>
        </details>
        <label class="sw" style="margin-top:18px;"><input type="checkbox" id="alAct" ${a.activa ? 'checked' : ''}><span></span>Activa (visible para los alumnos)</label>
      </div>
      <div class="alprev"><div class="lbl">Vista previa</div><div id="alPrev"></div></div>
    </div>
    <div class="err" id="alErr"></div>
    <div class="mfoot"><button type="button" class="btn-ghost" data-x>Cancelar</button><button type="button" class="btn-main" id="alSave">${orig ? 'Guardar cambios' : 'Publicar alerta'}</button></div>
  </div>`;
  document.body.appendChild(o);
  document.body.classList.add('modal-open');
  const cerrar = () => { o.remove(); document.body.classList.remove('modal-open'); };
  o.querySelector('.mx').addEventListener('click', cerrar);
  o.querySelector('[data-x]').addEventListener('click', cerrar);

  const leer = () => {
    a.titulo = o.querySelector('#alTit').value; a.mensaje = o.querySelector('#alMsg').value;
    a.etiqueta = o.querySelector('#alEtq').value; a.boton = o.querySelector('#alBtn').value;
    a.hasta = o.querySelector('#alHasta').value; a.activa = o.querySelector('#alAct').checked;
    a.paginas = [...o.querySelectorAll('#alPags input:checked')].map(x => x.value);
  };
  const previa = () => {
    leer();
    MCAlertas.previa(Object.assign({}, a, { mensaje: a.mensaje || 'Aquí va tu mensaje…' }), o.querySelector('#alPrev'));
    o.querySelector('#alFrecHint').textContent = {
      siempre: 'Aparece cada vez que el alumno abre la página.',
      visita: 'Aparece una vez; vuelve a salir si cierra el navegador y regresa otro día.',
      'una-vez': 'Aparece una sola vez en cada dispositivo. Si editas la alerta, vuelve a salir.'
    }[a.frecuencia];
  };
  const pintarPaginas = () => {
    const ok = PAG_NIVEL[a.alcance.nivel];
    a.paginas = a.paginas.filter(p => ok.includes(p));
    if (!a.paginas.length) a.paginas = [ok.includes('estudio') ? 'estudio' : ok[0]];
    o.querySelector('#alPags').innerHTML = PAGINAS.filter(([v]) => ok.includes(v)).map(([v, l]) =>
      `<label class="ck"><input type="checkbox" value="${v}" ${a.paginas.includes(v) ? 'checked' : ''}>${l}</label>`).join('');
    o.querySelectorAll('#alPags input').forEach(c => c.addEventListener('change', previa));
  };
  const pintarSel = async () => {
    const s = a.alcance, box = o.querySelector('#alSel');
    if (s.nivel === 'sitio') { box.innerHTML = ''; return; }
    box.innerHTML = `<select class="inp" id="alCur"><option value="">— Curso —</option>${CURSOS.map(([id, n]) => `<option value="${id}" ${id === s.carpeta ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>` +
      (s.nivel !== 'curso' ? '<select class="inp" id="alAnio"><option value="">— Año —</option></select>' : '') +
      (s.nivel === 'tema' ? '<select class="inp" id="alTema"><option value="">— Tema —</option></select>' : '');
    box.querySelector('#alCur').addEventListener('change', e => { s.carpeta = e.target.value; s.anio = ''; s.tema = ''; pintarSel(); });
    if (s.nivel === 'curso' || !s.carpeta) return;
    try {
      const m = await getManifest(s.carpeta);
      const sa = box.querySelector('#alAnio'); if (!sa) return;
      if (!s.anio && m.length === 1) s.anio = m[0].id;
      sa.innerHTML = '<option value="">— Año —</option>' + m.map(x => `<option ${x.id === s.anio ? 'selected' : ''}>${esc(x.id)}</option>`).join('');
      sa.addEventListener('change', e => { s.anio = e.target.value; s.tema = ''; pintarSel(); });
      if (s.nivel !== 'tema' || !s.anio) return;
      const temas = await getTemas(s.carpeta, s.anio);
      const st = box.querySelector('#alTema'); if (!st) return;
      st.innerHTML = '<option value="">— Tema —</option>' + temas.map(t => `<option value="${esc(pad2(t.num))}" ${pad2(t.num) === pad2(s.tema) ? 'selected' : ''}>Tema ${esc(t.num)} · ${esc(t.name)}</option>`).join('');
      st.addEventListener('change', e => { s.tema = e.target.value; });
    } catch (e) { toast(e.message, true); }
  };
  o.querySelectorAll('.chips.seg').forEach(g => g.addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    g.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === b));
    const k = g.dataset.g, v = b.dataset.v;
    if (k === 'nivel') { a.alcance.nivel = v; pintarSel(); pintarPaginas(); } else a[k] = v;
    previa();
  }));
  o.addEventListener('input', previa);
  pintarSel(); pintarPaginas(); previa();

  o.querySelector('#alSave').addEventListener('click', async () => {
    leer();
    const err = o.querySelector('#alErr'); err.classList.remove('show');
    const s = a.alcance;
    const falta = !norm(a.mensaje) ? 'Escribe el mensaje.' : s.nivel !== 'sitio' && !s.carpeta ? 'Elige el curso.' :
      (s.nivel === 'anio' || s.nivel === 'tema') && !s.anio ? 'Elige el año.' : s.nivel === 'tema' && !s.tema ? 'Elige el tema.' :
      !a.paginas.length ? 'Elige al menos una página.' : '';
    if (falta) { err.textContent = falta; err.classList.add('show'); return; }
    const btn = o.querySelector('#alSave'); btn.disabled = true; btn.innerHTML = '<span class="spin-s"></span> Publicando…';
    try {
      const r = await api('guardarAlerta', { alerta: JSON.stringify(a) });
      const i = AL.lista.findIndex(x => x.id === r.alerta.id);
      if (i >= 0) AL.lista[i] = r.alerta; else AL.lista.unshift(r.alerta);
      cerrar(); renderAlertas();
      toast(r.alerta.activa ? 'Alerta publicada · se verá en 1 a 10 minutos' : 'Alerta guardada (apagada)');
    } catch (e) { btn.disabled = false; btn.textContent = orig ? 'Guardar cambios' : 'Publicar alerta'; err.textContent = e.message; err.classList.add('show'); }
  });
}
