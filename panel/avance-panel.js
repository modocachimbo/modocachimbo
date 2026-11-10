/* =========================================================
   Panel · Avance del ciclo (Contenido)
   Tabla de cursos × semanas: qué ya se subió, qué falta, quién lo está
   subiendo ahora y quién dijo "Lo hago yo". Así nadie sube lo mismo dos veces.
   - Subido: sale de los archivos de la web (<curso>/<sección>/data/<ciclo>.json).
   - Subiendo / Lo hago yo / semana actual: supabase/82-avance-ciclo.sql.
   - La semana actual sale resaltada y la tabla se coloca sola en ella.
   - Mientras alguien está en "Subir tema" (paso de revisar), el panel avisa
     cada minuto "estoy subiendo esto"; al publicar, la marca se quita.
   ========================================================= */
const AV = { sec: 'libros', cfg: { ciclo: '2027-I', semana: 8, semanas: 10 }, marcas: [], subido: {}, reg: null, yo: '', soloFalta: false, cargando: false };
const AV_SEC = [['libros', 'Libro'], ['seminarios', 'Seminarios'], ['banqueo', 'Banqueo']];
const AV_AREA = { 'ciencia-tecnologia': ['#C6E000', '198,224,0'], matematica: ['#1CB0F6', '28,176,246'], comunicacion: ['#CE82FF', '206,130,255'], 'ciencias-sociales': ['#FF9600', '255,150,0'] };

(function estilosAvance() {
  const st = document.createElement('style');
  st.textContent = `
  .av-top { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 14px; }
  .av-secs { display: flex; gap: 6px; padding: 4px; border-radius: 14px; background: #151127; border: 2px solid #2C2549; }
  .av-secs button { padding: 9px 14px; border-radius: 10px; border: 0; background: none; color: var(--text-dim); font: 900 13.5px 'Nunito', sans-serif; cursor: pointer; }
  .av-secs button.on { background: #C6E000; color: #151a03; }
  .av-chk { display: flex; align-items: center; gap: 8px; font-weight: 800; color: var(--text-dim); cursor: pointer; }
  .av-cfg { margin-left: auto; display: flex; align-items: center; gap: 8px; font-weight: 800; color: var(--text-dim); }
  .av-cfg .inp { width: auto; padding: 8px 10px; }
  .av-resumen { display: grid; grid-template-columns: auto 1fr auto; gap: 16px; align-items: center; padding: 16px 18px; margin-bottom: 14px; border-radius: 20px;
    border: 2px solid #2C2549; border-bottom-width: 5px; background: linear-gradient(120deg, rgba(198,224,0,.10), #151127 55%); }
  .av-resumen .n { font: italic 900 44px/1 var(--display, 'Barlow Condensed', sans-serif); color: #C6E000; }
  .av-resumen b { display: block; font: 900 17px 'Nunito', sans-serif; }
  .av-resumen small { color: var(--text-dim); font-weight: 700; }
  .av-barra { height: 12px; border-radius: 12px; background: #251F3F; overflow: hidden; margin-top: 8px; }
  .av-barra i { display: block; height: 100%; background: linear-gradient(90deg, #8fa300, #C6E000); border-radius: 12px; transition: width .4s; }
  .av-ley { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; font: 800 12px 'Nunito', sans-serif; color: var(--text-dim); }
  .av-ley span { display: flex; align-items: center; gap: 5px; }
  .av-ley i { width: 12px; height: 12px; border-radius: 4px; }
  .av-tabla-env { overflow-x: auto; border-radius: 20px; border: 2px solid #2C2549; border-bottom-width: 5px; background: #120E22; scroll-behavior: smooth; }
  .av-tabla { border-collapse: separate; border-spacing: 0; width: 100%; min-width: 760px; }
  .av-tabla th, .av-tabla td { padding: 6px; text-align: center; border-bottom: 1px solid #221C3A; }
  .av-tabla thead th { position: sticky; top: 0; z-index: 2; background: #1A1530; font: 900 12.5px 'Nunito', sans-serif; color: var(--text-dim); letter-spacing: .04em; padding: 12px 6px; }
  .av-tabla thead th.curso { z-index: 4; }
  .av-tabla thead th.hoy { color: #151a03; background: #C6E000; }
  .av-tabla thead th.hoy small { display: block; font-size: 10px; letter-spacing: .08em; }
  .av-tabla .curso { position: sticky; left: 0; z-index: 1; background: #151127; text-align: left; padding: 8px 14px; min-width: 170px; font: 900 14px 'Nunito', sans-serif; white-space: nowrap; }
  .av-tabla .curso i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 8px; background: var(--c); vertical-align: 0; }
  .av-tabla tr.area td span { position: sticky; left: 14px; }
  .av-tabla tr.area td { text-align: left; padding: 14px 14px 6px; font: 900 11.5px 'Nunito', sans-serif; letter-spacing: .1em; text-transform: uppercase; color: var(--c); background: #120E22; border-bottom: 0; }
  .av-tabla td.col-hoy { background: rgba(198,224,0,.07); }
  .av-c { width: 100%; min-width: 58px; height: 46px; border-radius: 12px; border: 2px solid #2F284E; border-bottom-width: 4px; background: #1A1630; color: var(--text-dim);
    font: 900 13px 'Nunito', sans-serif; cursor: pointer; display: grid; place-items: center; line-height: 1.05; padding: 2px; transition: transform .1s; }
  .av-c:active { transform: translateY(2px); }
  .av-c small { display: block; font-size: 10px; font-weight: 800; opacity: .85; max-width: 70px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .av-c.ok { background: rgba(88,204,2,.14); border-color: #58CC02; border-bottom-color: #3f9a00; color: #B6F09A; }
  .av-c.sub { background: rgba(255,200,0,.14); border-color: #FFC800; border-bottom-color: #b38c00; color: #FFE28A; animation: avLate 1.6s ease-in-out infinite; }
  .av-c.res { background: rgba(28,176,246,.14); border-color: #1CB0F6; border-bottom-color: #1287bd; color: #A8E2FF; }
  .av-c.tarde { background: rgba(255,75,75,.12); border-color: #FF4B4B; border-bottom-color: #b33030; color: #FFB3B3; }
  .av-c.falta { color: #5E5682; }
  @keyframes avLate { 50% { box-shadow: 0 0 0 4px rgba(255,200,0,.18); } }
  .av-tabla tr.oculta { display: none; }
  .av-pop { position: fixed; inset: 0; z-index: 950; display: grid; place-items: center; background: rgba(5,3,15,.6); padding: 16px; }
  .av-pop[hidden] { display: none; }
  .av-card { width: min(420px, 100%); padding: 22px; border-radius: 22px; background: #151127; border: 2px solid #2C2549; border-bottom-width: 6px; display: grid; gap: 12px; }
  .av-card .eyebrow { margin: 0; }
  .av-card h3 { margin: 0; font: 900 22px 'Nunito', sans-serif; }
  .av-card .est { padding: 12px 14px; border-radius: 14px; font-weight: 800; line-height: 1.45; }
  .av-card .bts { display: flex; gap: 8px; flex-wrap: wrap; }
  .av-card .bts > * { flex: 1; min-width: 130px; justify-content: center; }
  .av-aviso { margin: 0 0 12px; }
  .av-exp { display: flex; gap: 8px; flex-wrap: wrap; }
  /* Hoja para imagen / PDF: toda la tabla a la vista, sin desplazamiento */
  .av-hoja { position: fixed; left: -99999px; top: 0; width: 1180px; padding: 34px 36px 28px; background: #0B0818; color: #EEEAF7; font-family: 'Nunito', sans-serif; }
  .av-hoja .h-top { display: flex; align-items: center; gap: 16px; margin-bottom: 18px; }
  .av-hoja .h-top img { height: 46px; }
  .av-hoja .h-top .t { flex: 1; }
  .av-hoja .h-top .t b { display: block; font: italic 900 40px/1 'Barlow Condensed', sans-serif; text-transform: uppercase; }
  .av-hoja .h-top .t small { color: #A99FC8; font-weight: 800; font-size: 15px; }
  .av-hoja .h-top .f { color: #A99FC8; font-weight: 800; font-size: 14px; text-align: right; }
  .av-hoja .av-tabla-env { overflow: visible; }
  .av-hoja .av-tabla { min-width: 0; }
  .av-hoja .av-c { animation: none; }
  .av-hoja .av-tabla th, .av-hoja .av-tabla td, .av-hoja .av-tabla tr.area td span { position: static !important; }
  .av-hoja .pie { margin-top: 14px; color: #6E6690; font-weight: 800; font-size: 13px; text-align: center; }
  @media (max-width: 700px) { .av-tabla .curso { min-width: 104px; max-width: 104px; padding: 8px 8px; font-size: 12.5px; white-space: normal; } .av-tabla { min-width: 0; } .av-c { min-width: 52px; } .av-resumen { grid-template-columns: auto 1fr; } .av-ley { grid-column: 1 / -1; justify-content: flex-start; } .av-cfg { margin-left: 0; } }`;
  document.head.appendChild(st);
})();

function avColorArea(a) { return AV_AREA[a] || ['#C6E000', '198,224,0']; }
function avTxtHace(s) { s = +s || 0; return s < 60 ? 'hace un momento' : s < 3600 ? 'hace ' + Math.round(s / 60) + ' min' : 'hace ' + Math.round(s / 3600) + ' h'; }

async function avCliente() {
  const c = await MCAuth.listo;
  if (!MCAuth.usuario()) throw new Error('login');
  return c;
}
async function avEstado() {
  const c = await avCliente();
  const r = await c.rpc('avance_estado', { p_ciclo: null });
  if (r.error) throw new Error(/function|does not exist/i.test(r.error.message) ? 'sql' : r.error.message);
  AV.cfg = Object.assign({ ciclo: '2027-I', semana: 8, semanas: 10 }, r.data.cfg || {});
  AV.marcas = r.data.marcas || []; AV.yo = r.data.yo || '';
}
// Qué temas existen en cada curso (de los archivos publicados en la web)
async function avSubidos() {
  if (!AV.reg) AV.reg = await (await fetch('../assets/cursos.json', { cache: 'no-cache' })).json();
  const cursos = (AV.reg.cursos || []).filter(c => !c.oculto);
  const out = {};
  await Promise.all(cursos.map(async c => {
    out[c.id] = {};
    await Promise.all(AV_SEC.map(async ([sec]) => {
      out[c.id][sec] = {};
      try {
        const r = await fetch('../' + c.id + '/' + sec + '/data/' + AV.cfg.ciclo + '.json', { cache: 'no-cache' });
        if (!r.ok) return;
        (await r.json()).forEach(t => { out[c.id][sec][String(+t.num)] = { n: (t.questions || []).length, nombre: t.name }; });
      } catch (e) { /* sin archivo: nada subido */ }
    }));
  }));
  AV.subido = out;
}

async function cargarAvance() {
  const caja = $('avCaja');
  if (AV.cargando) return; AV.cargando = true;
  caja.innerHTML = '<div class="loader">Cargando avance…</div>';
  try {
    try { await avEstado(); } catch (e) {
      if (e.message === 'login') { caja.innerHTML = `<div class="state-msg al-login">Entra con tu cuenta de Google del equipo para ver el avance.<button class="btn-main" type="button" id="avEntrar">Entrar con Google</button></div>`; $('avEntrar').onclick = () => MCAuth.entrarGoogle(); return; }
      $('avAviso').innerHTML = `<div class="banner warn av-aviso"><div>${e.message === 'sql' ? 'Falta correr <b>supabase/82-avance-ciclo.sql</b> en Supabase: por ahora solo se ve lo subido, sin "Subiendo ahora" ni "Lo hago yo".' : esc(e.message)}</div></div>`;
    }
    await avSubidos();
    pintarAvance();
  } catch (e) { caja.innerHTML = `<div class="state-msg error">${esc(e.message)}</div>`; }
  finally { AV.cargando = false; }
}

function avMarca(curso, tema) { return AV.marcas.find(m => m.curso === curso && m.seccion === AV.sec && String(+m.tema) === String(tema)); }
function avCelda(curso, s) {
  const sub = ((AV.subido[curso] || {})[AV.sec] || {})[s], m = avMarca(curso, s);
  if (sub) return { cls: 'ok', txt: '✓ ' + sub.n, sub, m };
  if (m && m.estado === 'subiendo') return { cls: 'sub', txt: '⬆', nom: m.nombre, m };
  if (m && m.estado === 'reservado') return { cls: 'res', txt: '✋', nom: m.nombre, m };
  return { cls: s <= AV.cfg.semana && AV.sec === 'libros' ? 'tarde' : 'falta', txt: s <= AV.cfg.semana && AV.sec === 'libros' ? '!' : '—' };
}

function pintarAvance() {
  const cfg = AV.cfg, N = cfg.semanas || 10, hoy = cfg.semana;
  const cursos = (AV.reg.cursos || []).filter(c => !c.oculto);
  // Resumen de la semana actual
  const listos = cursos.filter(c => ((AV.subido[c.id] || {})[AV.sec] || {})[hoy]).length;
  const subiendo = AV.marcas.filter(m => m.seccion === AV.sec && +m.tema === hoy && m.estado === 'subiendo').length;
  const secNom = AV_SEC.find(x => x[0] === AV.sec)[1];
  let h = `<div class="av-resumen">
    <div class="n">${listos}/${cursos.length}</div>
    <div><b>Semana ${String(hoy).padStart(2, '0')} · ${secNom} ${esc(cfg.ciclo)}</b><small>${listos === cursos.length ? '¡Todos los cursos listos!' : (cursos.length - listos) + ' cursos por subir' + (subiendo ? ' · ' + subiendo + ' subiéndose ahora' : '')}</small>
      <div class="av-barra"><i style="width:${Math.round(listos / Math.max(1, cursos.length) * 100)}%"></i></div></div>
    <div class="av-ley"><span><i style="background:#58CC02"></i>Subido</span><span><i style="background:#FFC800"></i>Subiendo ahora</span><span><i style="background:#1CB0F6"></i>Lo hago yo</span><span><i style="background:#FF4B4B"></i>Atrasado</span><span><i style="background:#2F284E"></i>Falta</span></div>
  </div>`;
  h += `<div class="av-tabla-env" id="avEnv"><table class="av-tabla"><thead><tr><th class="curso">Curso</th>`;
  for (let s = 1; s <= N; s++) h += `<th class="${s === hoy ? 'hoy' : ''}" data-s="${s}">${s === hoy ? '<small>AHORA</small>' : ''}S${String(s).padStart(2, '0')}</th>`;
  h += '</tr></thead><tbody>';
  (AV.reg.areas || []).forEach(a => {
    const cs = cursos.filter(c => c.area === a.id).sort((x, y) => (x.orden || 0) - (y.orden || 0)); if (!cs.length) return;
    const col = avColorArea(a.id);
    let filas = '', visibles = 0;
    cs.forEach(c => {
      let fila = '', falta = false;
      for (let s = 1; s <= N; s++) {
        const x = avCelda(c.id, s); if (x.cls !== 'ok' && s <= hoy) falta = true;
        fila += `<td class="${s === hoy ? 'col-hoy' : ''}"><button type="button" class="av-c ${x.cls}" data-c="${c.id}" data-s="${s}" title="${esc(c.nombre)} · semana ${s}">${x.txt}${x.nom ? `<small>${esc(x.nom)}</small>` : ''}</button></td>`;
      }
      if (!(AV.soloFalta && !falta)) visibles++;
      filas += `<tr class="${AV.soloFalta && !falta ? 'oculta' : ''}"><td class="curso" style="--c:${col[0]}"><i></i>${esc(c.nombre)}</td>${fila}</tr>`;
    });
    h += `<tr class="area${visibles ? '' : ' oculta'}" style="--c:${col[0]}"><td colspan="${N + 1}"><span>${esc(a.nombre)}</span></td></tr>` + filas;
  });
  h += '</tbody></table></div>';
  if (AV.soloFalta && !/<tr class=""|<tr class="area"/.test(h)) h += '<div class="state-msg" style="margin-top:12px">🎉 No falta ningún curso hasta la semana ' + String(hoy).padStart(2, '0') + '.</div>';
  $('avCaja').innerHTML = h;
  $('avCaja').querySelectorAll('.av-c').forEach(b => b.onclick = () => avAbrir(b.dataset.c, +b.dataset.s));
  // La tabla se coloca sola en la semana actual
  const env = $('avEnv'), th = env.querySelector('th.hoy');
  if (th) { const cw = env.querySelector('thead th.curso').offsetWidth; env.style.scrollBehavior = 'auto'; env.scrollLeft = Math.max(0, th.offsetLeft - cw - (env.clientWidth - cw - th.offsetWidth) / 2); env.style.scrollBehavior = ''; }
  $('avStats').textContent = `${secNom} ${cfg.ciclo} · estamos en la semana ${String(hoy).padStart(2, '0')} de ${N}`;
}

function avAbrir(curso, s) {
  const c = (AV.reg.cursos || []).find(x => x.id === curso), x = avCelda(curso, s), m = x.m, mio = m && m.email === AV.yo;
  const secNom = AV_SEC.find(z => z[0] === AV.sec)[1];
  let est;
  if (x.cls === 'ok') est = `<div class="est" style="background:rgba(88,204,2,.12);color:#B6F09A">✓ Subido · <b>${esc(x.sub.nombre || '')}</b><br>${x.sub.n} pregunta${x.sub.n === 1 ? '' : 's'}</div>`;
  else if (x.cls === 'sub') est = `<div class="est" style="background:rgba(255,200,0,.12);color:#FFE28A">⬆ <b>${mio ? 'Tú lo estás' : esc(m.nombre) + ' lo está'} subiendo</b> (${avTxtHace(m.hace)}).${mio ? '' : '<br>Mejor espera o coordínalo para no subirlo dos veces.'}</div>`;
  else if (x.cls === 'res') est = `<div class="est" style="background:rgba(28,176,246,.12);color:#A8E2FF">✋ <b>${mio ? 'Tú dijiste' : esc(m.nombre) + ' dijo'} "Lo hago yo"</b> (${avTxtHace(m.hace)}).</div>`;
  else est = `<div class="est" style="background:${x.cls === 'tarde' ? 'rgba(255,75,75,.12);color:#FFB3B3' : 'rgba(255,255,255,.05);color:var(--text-dim)'}">${x.cls === 'tarde' ? '! Falta subir y su semana ya llegó.' : 'Todavía no se sube.'} Nadie lo tiene tomado.</div>`;
  const libre = x.cls === 'falta' || x.cls === 'tarde';
  $('avPop').innerHTML = `<div class="av-card" role="dialog" aria-modal="true">
    <div class="eyebrow">${esc(secNom)} ${esc(AV.cfg.ciclo)} · Semana ${String(s).padStart(2, '0')}</div>
    <h3>${esc(c ? c.nombre : curso)}</h3>
    ${est}
    <div class="bts">
      ${x.cls !== 'ok' && (libre || mio) ? `<button type="button" class="btn-main" id="avSubir">Subir este tema</button>` : ''}
      ${libre ? `<button type="button" class="btn-ghost" id="avYo">✋ Lo hago yo</button>` : ''}
      ${m && (mio || ROL.admin) && x.cls !== 'ok' ? `<button type="button" class="btn-ghost" id="avSoltar">Liberar</button>` : ''}
      ${x.cls === 'ok' ? `<a class="btn-ghost" href="../${curso}/${AV.sec}/tema.html?year=${encodeURIComponent(AV.cfg.ciclo)}&tema=${String(s).padStart(2, '0')}" target="_blank" rel="noopener">Ver como alumno ↗</a>` : ''}
      <button type="button" class="btn-ghost" id="avCerrar">Cerrar</button>
    </div></div>`;
  $('avPop').hidden = false;
  const cerrar = () => { $('avPop').hidden = true; };
  $('avCerrar').onclick = cerrar;
  if ($('avYo')) $('avYo').onclick = async () => { await avMarcar(curso, AV.sec, s, 'reservado'); cerrar(); };
  if ($('avSoltar')) $('avSoltar').onclick = async () => { try { const cl = await avCliente(); await cl.rpc('avance_soltar', { p_curso: curso, p_seccion: AV.sec, p_ciclo: AV.cfg.ciclo, p_tema: String(s).padStart(2, '0') }); } catch (e) {} cerrar(); recargarMarcas(); };
  if ($('avSubir')) $('avSubir').onclick = () => { cerrar(); avIrASubir(curso, s); };
}
$('avPop') && ($('avPop').onclick = e => { if (e.target.id === 'avPop') $('avPop').hidden = true; });

async function avMarcar(curso, sec, s, estado) {
  try {
    const cl = await avCliente();
    const r = await cl.rpc('avance_marcar', { p_curso: curso, p_seccion: sec, p_ciclo: AV.cfg.ciclo, p_tema: String(s).padStart(2, '0'), p_estado: estado });
    if (r.data && r.data.ok === false) toast(`${r.data.nombre} ya lo tiene (${r.data.estado === 'reservado' ? 'Lo hago yo' : 'subiendo'}).`, true);
    return r.data;
  } catch (e) { return null; } finally { recargarMarcas(); }
}
async function recargarMarcas() {
  try { await avEstado(); if (!$('tab-avance').hidden && AV.reg) pintarAvance(); } catch (e) {}
}

// "Subir este tema": abre Subir tema con curso, ciclo y semana listos
function avIrASubir(curso, s) {
  document.querySelector('.tab[data-tab="subir"]').click();
  setTimeout(() => {
    const nom = (AV.reg.cursos.find(c => c.id === curso) || {}).nombre || curso, ta = $('subTexto');
    if (ta && !ta.value.trim()) {
      ta.value = `CURSO: ${nom}\nCICLO: ${AV.cfg.ciclo}\nTEMA: ${String(s).padStart(2, '0')} - \n\nPREGUNTA 1:\n`;
      ta.dispatchEvent(new Event('input')); ta.focus(); ta.setSelectionRange(ta.value.indexOf(' - ') + 3, ta.value.indexOf(' - ') + 3);
    }
    if ($('subDestino')) $('subDestino').value = AV.sec === 'seminarios' ? 'seminario' : AV.sec === 'banqueo' ? 'banqueo' : 'libro';
    avMarcar(curso, AV.sec, s, 'subiendo');
  }, 60);
}

/* ---------- Señal "estoy subiendo" desde Subir tema ---------- */
let avUltSenal = '';
function avQueSubo() {
  try {
    if ($('tab-subir').hidden || SUB.modo !== 'tema') return null;
    const curso = $('subCurso').value, tema = $('subNum').value.trim(), ciclo = normalizarCiclo($('subCiclo').value);
    if (!curso || !tema || $('subPaso2').hidden) return null;
    const x = partesCarpeta(carpetaDestino(curso, $('subDestino').value));
    if ($('subDestino').value === 'fijas') return null;
    return { curso: x.curso, seccion: x.seccion, ciclo, tema: pad2(tema) };
  } catch (e) { return null; }
}
async function avSenal() {
  const q = avQueSubo(); if (!q || q.ciclo !== AV.cfg.ciclo) { avUltSenal = ''; return; }
  const k = [q.curso, q.seccion, q.tema].join('|');
  try {
    const cl = await avCliente();
    const r = await cl.rpc('avance_marcar', { p_curso: q.curso, p_seccion: q.seccion, p_ciclo: q.ciclo, p_tema: q.tema, p_estado: 'subiendo' });
    const box = $('subAvisos');
    const viejo = document.getElementById('avChoque'); if (viejo) viejo.remove();
    if (r.data && r.data.ok === false && box) box.insertAdjacentHTML('afterbegin', `<div class="banner warn" id="avChoque"><div>⚠ <b>${esc(r.data.nombre)}</b> ${r.data.estado === 'reservado' ? 'dijo "Lo hago yo" para' : 'está subiendo'} este curso y semana (${avTxtHace(r.data.hace)}). Coordínalo antes de publicar para no subirlo dos veces.</div></div>`);
    avUltSenal = k;
  } catch (e) {}
}
setInterval(avSenal, 60000);
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#subRevisar')) setTimeout(avSenal, 800); });
// Al publicar: se quita la marca (lo subido ya se ve en verde)
(function () {
  const listo = document.getElementById('subListo'); if (!listo) return;
  new MutationObserver(async () => {
    if (listo.hidden || !avUltSenal) return;
    const [curso, seccion, tema] = avUltSenal.split('|'); avUltSenal = '';
    try { const cl = await avCliente(); await cl.rpc('avance_soltar', { p_curso: curso, p_seccion: seccion, p_ciclo: AV.cfg.ciclo, p_tema: tema }); } catch (e) {}
  }).observe(listo, { attributes: true, attributeFilter: ['hidden'] });
})();
// Mientras la pestaña está abierta se refresca sola cada 30 s
setInterval(() => { if ($('tab-avance') && !$('tab-avance').hidden && !document.hidden && AV.reg) recargarMarcas(); }, 30000);

/* ---------- Controles ---------- */
(function () {
  const secs = $('avSecs'); if (!secs) return;
  secs.innerHTML = AV_SEC.map(([k, n]) => `<button type="button" data-k="${k}" class="${k === AV.sec ? 'on' : ''}">${n}</button>`).join('');
  secs.querySelectorAll('button').forEach(b => b.onclick = () => { AV.sec = b.dataset.k; secs.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); if (AV.reg) pintarAvance(); });
  $('avSoloFalta').onchange = e => { AV.soloFalta = e.target.checked; if (AV.reg) pintarAvance(); };
  $('avSemana').onchange = async e => {
    const s = +e.target.value;
    try { const cl = await avCliente(); const r = await cl.rpc('avance_cfg_guardar', { p_ciclo: AV.cfg.ciclo, p_semana: s, p_semanas: AV.cfg.semanas || 10 }); if (r.error) throw new Error(r.error.message); AV.cfg.semana = s; pintarAvance(); toast('Semana actual: ' + s); }
    catch (err) { toast(/administrador/i.test(err.message) ? 'Solo el administrador cambia la semana.' : err.message, true); e.target.value = AV.cfg.semana; }
  };
  $('avRecargar').onclick = () => cargarAvance();
  const pintarSel = () => { $('avSemana').innerHTML = Array.from({ length: AV.cfg.semanas || 10 }, (_, i) => `<option value="${i + 1}" ${i + 1 === AV.cfg.semana ? 'selected' : ''}>Semana ${String(i + 1).padStart(2, '0')}</option>`).join(''); };
  const orig = pintarAvance;
  pintarAvance = function () { pintarSel(); return orig.apply(this, arguments); };
})();

/* ---------- Descargar / compartir (imagen PNG o PDF) ---------- */
function avScript(src) {
  return new Promise((ok, mal) => { if (document.querySelector('script[src="' + src + '"]')) return ok(); const x = document.createElement('script'); x.src = src; x.onload = ok; x.onerror = mal; document.head.appendChild(x); });
}
async function avHoja() {
  await avScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
  const secNom = AV_SEC.find(x => x[0] === AV.sec)[1], hoy = new Date();
  const hoja = document.createElement('div'); hoja.className = 'av-hoja';
  hoja.innerHTML = `<div class="h-top"><img src="../assets/app/icono-192.png" alt=""><div class="t"><b>Avance del ciclo</b><small>${esc(secNom)} ${esc(AV.cfg.ciclo)} · estamos en la semana ${String(AV.cfg.semana).padStart(2, '0')}${AV.soloFalta ? ' · <span style="color:#FF8A8A">solo los cursos que faltan</span>' : ''}</small></div>
    <div class="f">Modo Cachimbo<br>${hoy.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })} · ${hoy.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</div></div>` + $('avCaja').innerHTML + '<div class="pie">modocachimbo.github.io · Panel del equipo</div>';
  hoja.querySelectorAll('tr.oculta').forEach(t => t.remove());
  document.body.appendChild(hoja);
  await (document.fonts ? document.fonts.ready : Promise.resolve());
  try { return await html2canvas(hoja, { backgroundColor: '#0B0818', scale: 2, useCORS: true, logging: false }); }
  finally { hoja.remove(); }
}
function avNombre(ext) { return 'avance-' + (AV.soloFalta ? 'faltan-' : '') + AV.sec + '-' + AV.cfg.ciclo + '-semana-' + String(AV.cfg.semana).padStart(2, '0') + '.' + ext; }
function avBajar(blob, nombre) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
async function avExportar(tipo, b) {
  if (!AV.reg) return;
  const txt = b.textContent; b.disabled = true; b.innerHTML = '<span class="spin-s"></span> Preparando…';
  try {
    const cv = await avHoja();
    if (tipo === 'pdf') {
      await avScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      const pdf = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const W = 297, H = 210, m = 8, r = Math.min((W - 2 * m) / cv.width, (H - 2 * m) / cv.height);
      pdf.setFillColor(11, 8, 24); pdf.rect(0, 0, W, H, 'F');
      pdf.addImage(cv.toDataURL('image/jpeg', .92), 'JPEG', (W - cv.width * r) / 2, m, cv.width * r, cv.height * r);
      avBajar(pdf.output('blob'), avNombre('pdf'));
    } else {
      const blob = await new Promise(ok => cv.toBlob(ok, 'image/png'));
      const file = new File([blob], avNombre('png'), { type: 'image/png' });
      // En el celular abre "Compartir" (WhatsApp, Telegram…); en la PC se descarga
      if (tipo === 'compartir' && navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: 'Avance del ciclo', text: 'Avance del ciclo · semana ' + String(AV.cfg.semana).padStart(2, '0') }); } catch (e) {}
      } else avBajar(blob, avNombre('png'));
    }
  } catch (e) { toast('No se pudo preparar el archivo: ' + e.message, true); }
  finally { b.disabled = false; b.textContent = txt; }
}
(function () {
  const caja = $('avExp'); if (!caja) return;
  const puede = !!(navigator.canShare && window.File);
  caja.innerHTML = `<button class="btn-ghost" type="button" data-t="png">⬇ Imagen</button><button class="btn-ghost" type="button" data-t="pdf">⬇ PDF</button>${puede ? '<button class="btn-main" type="button" data-t="compartir">Compartir</button>' : ''}`;
  caja.querySelectorAll('button').forEach(b => b.onclick = () => avExportar(b.dataset.t, b));
})();
