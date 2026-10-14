/* =========================================================
   Panel · Ayudantes e Historial (solo el administrador)
   Los ayudantes entran al panel con su cuenta de Google y solo
   ven las pestañas que se les marcan aquí. Todo lo que hacen
   queda en Historial. Se guarda en Supabase
   (supabase/14-equipo.sql: tablas equipo e historial); lo que
   pasa por el Apps Script lo anota el Apps Script v7.
   ========================================================= */
const EQ = { lista: null, editando: null, borrar: null };
const HI = { filas: [], filtro: '', fin: false, cargando: false };

// Permisos que se pueden dar, en el mismo orden del menú
const EQ_PERMISOS = [
  ['Alumnos', [
    ['reportes', 'Reportes', 'Ver los reportes de errores y atenderlos'],
    ['corr', 'Correcciones', 'Ver, verificar y reaplicar correcciones'],
    ['alumnos', 'Alumnos', 'Ver la lista de alumnos con su racha y progreso'],
    ['simulacro', 'Top simulacro', 'Ver el ranking semanal'],
    ['codigos', 'Códigos', 'Crear, borrar y liberar códigos. Ojo: da acceso al contenido pagado'],
  ]],
  ['Contenido', [
    ['subir', 'Subir tema', 'Publicar temas nuevos o agregarles preguntas'],
    ['examen', 'Subir examen', 'Publicar exámenes de admisión'],
    ['editar', 'Editar preguntas', 'Corregir y borrar preguntas, renombrar temas y flashcards'],
    ['borrar', 'Borrar temas y años', 'Borrar un tema o un año completo. Úsalo junto con Editar preguntas o Cursos'],
    ['vocab', 'Vocabulario', 'Agregar, corregir y borrar palabras'],
    ['cursos', 'Cursos', 'Crear cursos y años, ordenarlos y armar Fijas'],
    ['ciclos', 'Ciclos', 'Elegir qué ciclos se ven en cada área y cambiarles el nombre'],
    ['perfil', 'Perfil del alumno', 'Cambiar bloques, carreras y preguntas del perfil'],
  ]],
  ['Sitio', [
    ['alertas', 'Alertas', 'Crear y quitar avisos de la web'],
    ['frases', 'Frases del día', 'Editar las frases'],
    ['tutorial', 'Tutorial', 'Editar el tutorial'],
  ]],
];
const EQ_NOMBRE = Object.fromEntries(EQ_PERMISOS.flatMap(g => g[1]).map(p => [p[0], p[1]]));

(function estilosEquipo() {
  const st = document.createElement('style');
  st.textContent = `
  .eq-grid { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 6fr); gap: 14px; align-items: start; }
  .eq-grid .pcard { margin-bottom: 0; }
  .eq-tit { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: var(--text-faint); font-weight: 700; margin-bottom: 12px; }
  .eq-tit span { text-transform: none; letter-spacing: 0; font-weight: 600; }
  .eq-campos { display: grid; gap: 10px; margin-bottom: 16px; }
  .eq-campos label { display: grid; gap: 6px; font-size: 12.5px; font-weight: 700; color: var(--text-dim); }
  .eq-grupo { font-size: 10.5px; letter-spacing: 1.4px; text-transform: uppercase; font-weight: 800; color: var(--text-faint); margin: 14px 0 8px; }
  .eq-pers { display: grid; gap: 6px; }
  .eq-per { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-radius: 12px; border: 2px solid #232323; background: #111; cursor: pointer; }
  .eq-per input { margin-top: 3px; accent-color: var(--accent); width: 16px; height: 16px; flex-shrink: 0; }
  .eq-per b { display: block; font: 800 14px Nunito, Inter, sans-serif; color: var(--text); }
  .eq-per small { display: block; font-size: 12px; color: var(--text-dim); line-height: 1.4; margin-top: 2px; }
  .eq-per:has(input:checked) { border-color: rgba(198,224,0,.45); background: var(--accent-soft); }
  .eq-rapido { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
  .eq-acc { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-top: 16px; }
  .eq-err { color: var(--red); font-size: 12.5px; font-weight: 700; }
  .eq-yo { border: 2px dashed #262626; border-radius: 14px; padding: 12px 14px; font-size: 13px; color: var(--text-dim); line-height: 1.55; margin-bottom: 12px; }
  .eq-yo b { color: var(--text); }
  .eq-mi { display: grid; gap: 10px; }
  .eq-card { border: 2px solid #232323; border-bottom-width: 4px; border-radius: 16px; padding: 14px 16px; background: #111; }
  .eq-card.off { opacity: .6; }
  .eq-cab { display: flex; align-items: center; gap: 12px; }
  .eq-av { width: 38px; height: 38px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); display: grid; place-items: center; font: 900 16px Nunito, Inter, sans-serif; flex-shrink: 0; }
  .eq-quien { flex: 1; min-width: 0; }
  .eq-quien b { display: block; font: 800 15px Nunito, Inter, sans-serif; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .eq-quien span { display: block; font-size: 12.5px; color: var(--text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .eq-chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0; }
  .eq-chips span { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 100px; background: #1a1a1a; color: var(--text-dim); }
  .eq-chips span.ojo { background: var(--amber-soft); color: var(--amber); }
  .eq-pie { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12px; color: var(--text-faint); }
  .eq-pie .sp { flex: 1; }
  .eq-vacio { border: 2px dashed #262626; border-radius: 16px; padding: 28px 18px; text-align: center; color: var(--text-dim); font-size: 13.5px; line-height: 1.6; }
  .hi-filtro { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
  .hi-dia { font-size: 11px; letter-spacing: 1.2px; text-transform: uppercase; font-weight: 800; color: var(--text-faint); margin: 18px 0 8px; }
  .hi-fila { display: grid; grid-template-columns: 48px minmax(0, 1fr); gap: 12px; padding: 12px 14px; border-radius: 14px; background: var(--surface); border: 1px solid var(--border); margin-bottom: 6px; }
  .hi-hora { font: 800 13px Nunito, Inter, sans-serif; color: var(--text-dim); font-variant-numeric: tabular-nums; padding-top: 1px; }
  .hi-cab { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
  .hi-quien { font: 800 13.5px Nunito, Inter, sans-serif; color: var(--text); }
  .hi-quien.yo { color: var(--text-dim); }
  .hi-donde { font-size: 11.5px; font-weight: 700; padding: 2px 9px; border-radius: 100px; background: #1a1a1a; color: var(--text-dim); }
  .hi-txt { font-size: 13.5px; color: var(--text); line-height: 1.5; overflow-wrap: anywhere; }
  .hi-det { font-size: 12.5px; color: var(--text-dim); line-height: 1.5; margin-top: 4px; overflow-wrap: anywhere; }
  .hi-det b { color: var(--text); font-weight: 700; }
  .hi-mas { display: flex; justify-content: center; margin: 14px 0; }
  @media (max-width: 900px) { .eq-grid { grid-template-columns: minmax(0, 1fr); } }`;
  document.head.appendChild(st);
})();

async function eqRpc(nombre, args) {
  const r = await (await MCAuth.listo).rpc(nombre, args || {});
  if (r.error) {
    const m = r.error.message || '';
    throw new Error(/no autorizado/i.test(m) ? 'Solo el administrador puede ver esto. Entra con tu cuenta de Google de administrador.'
      : /function|does not exist|schema cache/i.test(m) ? 'Primero corre supabase/14-equipo.sql en Supabase.'
      : m || 'No se pudo conectar con Supabase');
  }
  return r.data;
}
function eqHace(iso) {
  if (!iso) return 'Aún no entra';
  const min = Math.round((Date.now() - new Date(iso)) / 60000);
  if (min < 2) return 'Entró hace un momento';
  if (min < 60) return `Entró hace ${min} min`;
  if (min < 60 * 24) return `Entró hace ${Math.round(min / 60)} h`;
  return 'Entró el ' + new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
}
const eqInicial = m => esc(((m.nombre || m.email || '?').trim().charAt(0) || '?').toUpperCase());

/* ---------------- Ayudantes ---------------- */
async function cargarEquipo() {
  const body = $('eqBody');
  if (!EQ.lista) body.innerHTML = '<div class="state-msg"><span class="spin-s"></span> Cargando…</div>';
  try { EQ.lista = await eqRpc('equipo_lista'); renderEquipo(); }
  catch (e) { body.innerHTML = `<div class="state-msg error">${esc(e.message)}</div>`; }
}

function renderEquipo() {
  const ed = EQ.editando, per = new Set(ed ? ed.permisos : []);
  $('eqBody').innerHTML = `
    <div class="eq-grid">
      <div class="pcard">
        <div class="eq-tit">${ed && ed.email ? 'Cambiar a ' + esc(ed.nombre || ed.email) : 'Agregar ayudante'}<span>${ed && ed.email ? '' : 'necesita una cuenta de Google'}</span></div>
        <div class="eq-campos">
          <label>Correo de Google<input class="inp" id="eqEmail" type="email" placeholder="nombre@gmail.com" value="${esc(ed ? ed.email : '')}" ${ed && ed.email ? 'readonly' : ''}></label>
          <label>Nombre (para reconocerlo en el Historial)<input class="inp" id="eqNombre" type="text" maxlength="60" placeholder="Ej.: Profe Ana" value="${esc(ed ? ed.nombre : '')}"></label>
        </div>
        <div class="eq-tit" style="margin-bottom:0;">Qué puede hacer</div>
        ${EQ_PERMISOS.map(([g, ps]) => `
          <div class="eq-grupo">${g}</div>
          <div class="eq-pers">${ps.map(([k, nom, txt]) => `
            <label class="eq-per"><input type="checkbox" value="${k}" ${per.has(k) ? 'checked' : ''}><span><b>${nom}</b><small>${txt}</small></span></label>`).join('')}
          </div>`).join('')}
        <div class="eq-rapido">
          <button class="chip" type="button" id="eqTodoContenido">Todo Contenido</button>
          <button class="chip" type="button" id="eqTodoMenos">Todo menos Códigos</button>
          <button class="chip" type="button" id="eqNada">Ninguno</button>
        </div>
        <div class="eq-acc">
          <button class="btn-main" type="button" id="eqGuardar">${ed && ed.email ? 'Guardar cambios' : 'Agregar ayudante'}</button>
          ${ed && ed.email ? '<button class="btn-ghost" type="button" id="eqCancelar">Cancelar</button>' : ''}
          <span class="eq-err" id="eqErr"></span>
        </div>
      </div>
      <div class="pcard">
        <div class="eq-tit">Tu equipo<span>${EQ.lista.filter(m => m.activo).length} activo${EQ.lista.filter(m => m.activo).length === 1 ? '' : 's'}</span></div>
        <div class="eq-yo">Para entrar, tu ayudante abre <b>${esc(location.origin + location.pathname)}</b>, toca <b>Entrar con Google</b> con el correo que agregaste y luego <b>Entrar al panel</b>. No necesita tu contraseña.</div>
        <div class="eq-mi">${EQ.lista.length ? EQ.lista.map(eqTarjeta).join('') : '<div class="eq-vacio">Todavía no tienes ayudantes. Agrega su correo a la izquierda y marca lo que puede hacer.</div>'}</div>
      </div>
    </div>`;

  const marcar = ks => $('eqBody').querySelectorAll('.eq-per input').forEach(i => { i.checked = ks.includes(i.value); });
  $('eqTodoContenido').addEventListener('click', () => marcar(EQ_PERMISOS[1][1].map(p => p[0]).filter(k => k !== 'borrar')));
  $('eqTodoMenos').addEventListener('click', () => marcar(Object.keys(EQ_NOMBRE).filter(k => k !== 'codigos')));
  $('eqNada').addEventListener('click', () => marcar([]));
  $('eqGuardar').addEventListener('click', eqGuardar);
  if ($('eqCancelar')) $('eqCancelar').addEventListener('click', () => { EQ.editando = null; renderEquipo(); });

  $('eqBody').querySelectorAll('[data-eq]').forEach(b => b.addEventListener('click', () => {
    const m = EQ.lista.find(x => x.email === b.dataset.email); if (!m) return;
    if (b.dataset.eq === 'editar') { EQ.editando = Object.assign({}, m); renderEquipo(); $('eqNombre').focus(); window.scrollTo(0, 0); }
    else if (b.dataset.eq === 'historial') { HI.filtro = m.email; document.querySelector('.tab[data-tab="historial"]').click(); }
    else if (b.dataset.eq === 'quitar') eqQuitar(m, b);
  }));
  $('eqBody').querySelectorAll('[data-activo]').forEach(i => i.addEventListener('change', async () => {
    const m = EQ.lista.find(x => x.email === i.dataset.activo);
    i.disabled = true;
    try { await eqRpc('equipo_guardar', { p_email: m.email, p_nombre: m.nombre, p_permisos: m.permisos, p_activo: i.checked }); toast(i.checked ? 'Ayudante activado' : 'Ayudante pausado: ya no puede entrar'); await cargarEquipo(); }
    catch (e) { toast(e.message, true); i.checked = !i.checked; i.disabled = false; }
  }));
}

function eqTarjeta(m) {
  const ps = (m.permisos || []).filter(k => EQ_NOMBRE[k]);
  return `
    <div class="eq-card${m.activo ? '' : ' off'}">
      <div class="eq-cab">
        <span class="eq-av">${eqInicial(m)}</span>
        <div class="eq-quien"><b>${esc(m.nombre || m.email)}</b><span>${esc(m.email)}</span></div>
        <label class="sw" title="${m.activo ? 'Puede entrar' : 'Pausado'}"><input type="checkbox" data-activo="${esc(m.email)}" ${m.activo ? 'checked' : ''}><span></span>${m.activo ? 'Activo' : 'Pausado'}</label>
      </div>
      <div class="eq-chips">${ps.length ? ps.map(k => `<span${k === 'codigos' || k === 'borrar' ? ' class="ojo"' : ''}>${EQ_NOMBRE[k]}</span>`).join('') : '<span>Sin permisos: no ve nada</span>'}</div>
      <div class="eq-pie">
        <span>${eqHace(m.ultimo_ingreso)}</span><span class="sp"></span>
        <button class="rbtn" type="button" data-eq="historial" data-email="${esc(m.email)}">Ver historial</button>
        <button class="rbtn" type="button" data-eq="editar" data-email="${esc(m.email)}">Cambiar</button>
        <button class="rbtn danger" type="button" data-eq="quitar" data-email="${esc(m.email)}">Quitar</button>
      </div>
    </div>`;
}

async function eqGuardar() {
  const email = $('eqEmail').value.trim().toLowerCase(), err = $('eqErr');
  const permisos = [...$('eqBody').querySelectorAll('.eq-per input:checked')].map(i => i.value);
  err.textContent = '';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = 'Escribe un correo válido'; $('eqEmail').focus(); return; }
  if (!permisos.length) { err.textContent = 'Marca al menos una cosa que pueda hacer'; return; }
  const ed = EQ.editando, nuevo = !(ed && ed.email);
  if (nuevo && EQ.lista.some(m => m.email === email)) { err.textContent = 'Ese correo ya está en tu equipo. Tócalo en Cambiar'; return; }
  const b = $('eqGuardar'); b.disabled = true; b.textContent = 'Guardando…';
  try {
    await eqRpc('equipo_guardar', { p_email: email, p_nombre: $('eqNombre').value.trim(), p_permisos: permisos, p_activo: nuevo ? true : ed.activo });
    EQ.editando = null;
    toast(nuevo ? 'Ayudante agregado' : 'Cambios guardados');
    await cargarEquipo();
  } catch (e) { err.textContent = e.message; b.disabled = false; b.textContent = nuevo ? 'Agregar ayudante' : 'Guardar cambios'; }
}

async function eqQuitar(m, b) {
  if (!b.dataset.ok) { b.dataset.ok = '1'; b.classList.add('confirm'); b.textContent = '¿Quitar? Toca otra vez'; return; }
  b.disabled = true;
  try { await eqRpc('equipo_borrar', { p_email: m.email }); toast((m.nombre || m.email) + ' ya no es ayudante'); if (EQ.editando && EQ.editando.email === m.email) EQ.editando = null; await cargarEquipo(); }
  catch (e) { toast(e.message, true); b.disabled = false; }
}

/* ---------------- Historial ---------------- */
async function cargarHistorial(mas) {
  if (HI.cargando) return;
  HI.cargando = true;
  if (!mas) { HI.filas = []; HI.fin = false; $('hiBody').innerHTML = '<div class="state-msg"><span class="spin-s"></span> Cargando…</div>'; }
  try {
    if (!EQ.lista) EQ.lista = await eqRpc('equipo_lista');
    const antes = mas && HI.filas.length ? HI.filas[HI.filas.length - 1].id : null;
    const filtro = HI.filtro && HI.filtro !== '*' ? HI.filtro : null;
    const nuevas = await eqRpc('historial_ver', { p_email: filtro, p_limite: 100, p_antes: antes });
    HI.filas = HI.filas.concat(nuevas || []);
    HI.fin = !nuevas || nuevas.length < 100;
    renderHistorial();
  } catch (e) { $('hiBody').innerHTML = `<div class="state-msg error">${esc(e.message)}</div>`; }
  HI.cargando = false;
}

function hiDia(d) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const dif = Math.round((hoy - x) / 86400000);
  if (dif === 0) return 'Hoy';
  if (dif === 1) return 'Ayer';
  return x.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: x.getFullYear() === hoy.getFullYear() ? undefined : 'numeric' });
}

// Lo que vale la pena mostrar debajo de cada acción
function hiDetalle(h) {
  const d = h.detalle || {}, out = [];
  const lista = (nom, xs) => { if (xs && xs.length) out.push(`<b>${nom}:</b> ${xs.map(esc).join(', ')}`); };
  lista('Nuevas', d.nuevas); lista('Corregidas', d.corregidas); lista('Borradas', d.borradas);
  if (h.donde === 'Equipo' && d.permisos) out.push(`<b>Puede:</b> ${d.permisos.length ? d.permisos.map(k => esc(EQ_NOMBRE[k] || k)).join(', ') : 'nada'}`);
  if (d.preguntas) out.push(`${d.preguntas} pregunta${d.preguntas == 1 ? '' : 's'}`);
  if (d.cursos && Array.isArray(d.cursos)) out.push(`<b>Cursos:</b> ${d.cursos.map(esc).join(', ') || 'ninguno'}${d.candado === false ? ' · abierto para todos' : d.candado ? ' · con código' : ''}`);
  return out.length ? `<div class="hi-det">${out.join(' · ')}</div>` : '';
}

function renderHistorial() {
  const gente = EQ.lista || [];
  const mio = ((MCAuth.usuario() || {}).email || '').toLowerCase();
  const yo = h => h.email === mio;
  const nombre = h => h.nombre || (gente.find(m => m.email === h.email) || {}).nombre || h.email;
  const ops = [['', 'Todos'], ['*', 'Solo ayudantes']].concat(gente.map(m => [m.email, m.nombre || m.email]));
  $('hiFiltro').innerHTML = `<div class="hi-filtro">${ops.map(([k, t]) => `<button class="chip${HI.filtro === k ? ' on' : ''}" type="button" data-hf="${esc(k)}">${esc(t)}</button>`).join('')}</div>`;
  $('hiFiltro').querySelectorAll('[data-hf]').forEach(b => b.addEventListener('click', () => { HI.filtro = b.dataset.hf; cargarHistorial(); }));

  const filas = HI.filtro === '*' ? HI.filas.filter(h => !h.dueno) : HI.filas;
  let dia = '', html = '';
  filas.forEach(h => {
    const d = hiDia(h.fecha);
    if (d !== dia) { dia = d; html += `<div class="hi-dia">${esc(d)}</div>`; }
    html += `
      <div class="hi-fila">
        <div class="hi-hora">${new Date(h.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
        <div>
          <div class="hi-cab"><span class="hi-quien${yo(h) ? ' yo' : ''}" title="${esc(h.email)}">${yo(h) ? 'Tú' : esc(nombre(h))}</span><span class="hi-donde">${esc(h.donde)}</span></div>
          <div class="hi-txt">${esc(h.accion)}</div>
          ${hiDetalle(h)}
        </div>
      </div>`;
  });
  $('hiBody').innerHTML = (html || `<div class="state-msg">${HI.filtro ? 'Nada todavía con este filtro.' : 'Todavía no hay nada en el historial.'}</div>`)
    + (!HI.fin ? '<div class="hi-mas"><button class="btn-ghost" type="button" id="hiMas">Ver más</button></div>' : '');
  if ($('hiMas')) $('hiMas').addEventListener('click', () => cargarHistorial(true));
}

$('hiRecargar').addEventListener('click', () => cargarHistorial());
