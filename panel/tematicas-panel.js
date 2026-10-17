/* =========================================================
   Panel · Temáticas
   Elegir la temática de la web (Halloween, …), desde qué día
   y hasta qué día. Pasada la fecha final, todo vuelve solo al
   diseño de siempre. Datos: supabase/25-tematicas.sql
   (tematica, tema_config y guardar_tema).
   ========================================================= */
const TMP = { cfg: null, tema: 'ninguna', sonidos: true };
const TMP_TEMAS = {
  ninguna: { nombre: 'Predeterminado', desc: 'El diseño de siempre: negro y lima.', fondo: 'linear-gradient(135deg,#050505,#141414)', acento: '#C6E000' },
  halloween: {
    nombre: 'Halloween', desc: 'Noche morada, calabazas, murciélagos, búho con sombrero de bruja y sonidos de miedo.',
    fondo: 'radial-gradient(70px 70px at 80% 25%,#FFE7B0 0 30%,rgba(255,214,140,.25) 31%,transparent 60%),linear-gradient(160deg,#2c1152,#0e0719 60%,#3a1606)', acento: '#FF8A1F',
    sugerido: () => { const y = new Date().getFullYear(); return [y + '-10-24', y + '-11-01']; }
  },
  navidad: { nombre: 'Navidad', desc: 'Pronto.', fondo: 'linear-gradient(160deg,#0b2a1c,#06140e 60%,#3a0a0a)', acento: '#FF4B4B', pronto: true }
};
const TMP_MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];

(function estilosTematicas() {
  const st = document.createElement('style');
  st.textContent = `
  .tmp-estado { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 16px; border: 2px solid #262626; background: var(--surface); margin-bottom: 18px; font: 800 14px/1.4 Nunito, sans-serif; }
  .tmp-estado i { flex-shrink: 0; width: 12px; height: 12px; border-radius: 50%; background: #5f5f5f; }
  .tmp-estado.on { border-color: rgba(255,138,31,.5); } .tmp-estado.on i { background: #FF8A1F; box-shadow: 0 0 12px #FF8A1F; }
  .tmp-estado.prog { border-color: rgba(28,176,246,.45); } .tmp-estado.prog i { background: #1CB0F6; }
  .tmp-estado small { display: block; font-weight: 700; color: var(--text-dim); font-size: 12.5px; }
  .tmp-temas { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 12px; }
  .tmp-tema { text-align: left; padding: 0; border-radius: 18px; border: 2px solid #2a2a2a; border-bottom-width: 5px; background: var(--surface); color: var(--text); cursor: pointer; overflow: hidden; font-family: Nunito, sans-serif; }
  .tmp-tema:disabled { cursor: default; opacity: .5; }
  .tmp-tema.on { border-color: var(--c); box-shadow: 0 0 0 1px var(--c), 0 8px 26px -12px var(--c); }
  .tmp-tema .vista { position: relative; display: block; height: 84px; }
  .tmp-tema .vista b { position: absolute; left: 12px; bottom: 10px; width: 56px; height: 12px; border-radius: 6px; background: var(--c); box-shadow: 0 3px 0 rgba(0,0,0,.35); }
  .tmp-tema .vista em { position: absolute; right: 10px; top: 10px; font: 900 10.5px Nunito, sans-serif; letter-spacing: .08em; text-transform: uppercase; padding: 4px 8px; border-radius: 8px; background: rgba(0,0,0,.45); color: #fff; font-style: normal; }
  .tmp-tema .tx { display: block; padding: 10px 12px 12px; }
  .tmp-tema .tx strong { display: block; font-size: 15.5px; font-weight: 1000; }
  .tmp-tema .tx span { display: block; font-size: 12.5px; color: var(--text-dim); margin-top: 3px; line-height: 1.4; }
  .tmp-sug { margin-top: 8px; }
  .agp-form .tmp-sw { display: flex; align-items: center; gap: 12px; margin-top: 16px; cursor: pointer; font: 800 14px Nunito, sans-serif; }
  .agp-form .tmp-sw input { flex-shrink: 0; width: 20px; height: 20px; accent-color: #FF8A1F; }
  .agp-form .tmp-sw small { display: block; color: var(--text-dim); font-weight: 700; font-size: 12px; }
  #tmpVer { text-decoration: none; display: inline-flex; align-items: center; }
  #tab-tematicas .btn-ghost.rojo { color: var(--red); border-color: rgba(224,60,60,.4); }
  .tmp-cuenta { font: 700 12px Nunito, sans-serif; color: var(--text-faint); margin-top: 6px; text-align: right; }`;
  document.head.appendChild(st);
})();

function tmpFecha(s) { if (!s) return ''; const d = new Date(s + 'T12:00:00'); return d.getDate() + ' ' + TMP_MES[d.getMonth()] + ' ' + d.getFullYear(); }
function tmpHoy() { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); } }
function tmpDias(a, b) { return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5); }

function tmpEstado(c) {
  const e = $('tmpEstado'), h = tmpHoy();
  e.className = 'tmp-estado';
  if (!c || c.tema === 'ninguna' || !TMP_TEMAS[c.tema]) { e.innerHTML = '<i></i><span>Ahora se ve el diseño de siempre.<small>Elige una temática y sus fechas para activarla.</small></span>'; return; }
  const n = TMP_TEMAS[c.tema].nombre;
  if (c.fin && c.fin < h) { e.innerHTML = `<i></i><span>${n} terminó el ${tmpFecha(c.fin)}. Se ve el diseño de siempre.<small>Cambia las fechas para volver a activarla.</small></span>`; return; }
  if (c.inicio && c.inicio > h) {
    e.classList.add('prog');
    const d = tmpDias(h, c.inicio);
    e.innerHTML = `<i></i><span>${n} empieza el ${tmpFecha(c.inicio)} (en ${d} ${d === 1 ? 'día' : 'días'}).<small>${c.fin ? 'Termina el ' + tmpFecha(c.fin) + ' y vuelve sola al diseño de siempre.' : 'Sin fecha final: queda hasta que la apagues.'}</small></span>`;
    return;
  }
  e.classList.add('on');
  e.innerHTML = `<i></i><span>${n} está activa ahora.<small>${c.fin ? 'Termina el ' + tmpFecha(c.fin) + ' (' + (tmpDias(h, c.fin) <= 0 ? 'hoy es el último día' : 'faltan ' + tmpDias(h, c.fin) + ' días') + ') y vuelve sola al diseño de siempre.' : 'Sin fecha final: queda hasta que la apagues.'}</small></span>`;
}

function tmpMarcar() {
  document.querySelectorAll('.tmp-tema').forEach(b => b.classList.toggle('on', b.dataset.v === TMP.tema));
  const t = TMP_TEMAS[TMP.tema];
  $('tmpFechas').hidden = TMP.tema === 'ninguna';
  $('tmpSug').hidden = !(t && t.sugerido);
  if (t && t.sugerido) $('tmpSug').textContent = 'Usar fechas sugeridas: ' + t.sugerido().map(tmpFecha).join(' al ');
  $('tmpVer').hidden = TMP.tema === 'ninguna';
}

async function cargarTematicas() {
  const caja = $('tmpCuerpo');
  let cliente;
  try { cliente = await MCAuth.listo; }
  catch (e) { caja.innerHTML = '<div class="state-msg error">No se pudo conectar con Supabase. Revisa tu internet.</div>'; return; }
  if (!MCAuth.usuario()) {
    caja.innerHTML = `<div class="state-msg al-login">Entra con tu cuenta de Google de administrador.
      <button class="btn-main" type="button" id="tmpEntrar">Entrar con Google</button></div>`;
    $('tmpEntrar').addEventListener('click', () => MCAuth.entrarGoogle());
    return;
  }
  const r = await cliente.rpc('tema_config');
  if (r.error) {
    caja.innerHTML = /no autorizado/i.test(r.error.message || '') ? '<div class="state-msg error">Tu cuenta no tiene permiso para cambiar la temática.</div>'
      : `<div class="state-msg error">No se pudo leer la temática. ¿Ya corriste <b>supabase/25-tematicas.sql</b>?<br><small>${esc(r.error.message || '')}</small></div>`;
    return;
  }
  TMP.cfg = r.data || { tema: 'ninguna' };
  pintarTematicas();
}

function pintarTematicas() {
  const c = TMP.cfg;
  TMP.tema = c.tema || 'ninguna';
  TMP.sonidos = c.sonidos !== false;
  $('tmpCuerpo').innerHTML = `<div class="tmp-estado" id="tmpEstado"></div>
  <div class="agp-form">
    <h3>Temática de la web</h3>
    <span class="agp-l">Elige cómo se ve</span>
    <div class="tmp-temas" id="tmpTemas">${Object.keys(TMP_TEMAS).map(k => {
      const t = TMP_TEMAS[k];
      return `<button type="button" class="tmp-tema" data-v="${k}" style="--c:${t.acento}"${t.pronto ? ' disabled' : ''}>
        <span class="vista" style="background:${t.fondo}"><b></b>${t.pronto ? '<em>Pronto</em>' : ''}</span>
        <span class="tx"><strong>${t.nombre}</strong><span>${t.desc}</span></span></button>`;
    }).join('')}</div>
    <div id="tmpFechas">
      <div class="agp-2"><div><label for="tmpInicio">Desde</label><input class="inp" id="tmpInicio" type="date"></div>
        <div><label for="tmpFin">Hasta (incluido)</label><input class="inp" id="tmpFin" type="date"></div></div>
      <button class="btn-ghost tmp-sug" type="button" id="tmpSug"></button>
      <label for="tmpMensaje">Mensaje del aviso en el inicio (opcional)</label>
      <input class="inp" id="tmpMensaje" maxlength="140" placeholder="Ej.: Practica de noche o de día: cada acierto te deja un dulce.">
      <div class="tmp-cuenta" id="tmpCuenta">0 / 140</div>
      <label class="tmp-sw"><input type="checkbox" id="tmpSonidos"><span>Sonidos de la temática<small>Aciertos con caja de música, errores con un fantasmita y el botón "Ambiente" en el inicio.</small></span></label>
    </div>
    <div class="agp-acc">
      <button class="btn-main" type="button" id="tmpGuardar">Guardar</button>
      <a class="btn-ghost" id="tmpVer" target="_blank" rel="noopener">Vista previa</a>
      <button class="btn-ghost rojo" type="button" id="tmpApagar">Volver al predeterminado ahora</button>
    </div>
  </div>`;
  $('tmpInicio').value = c.inicio || '';
  $('tmpFin').value = c.fin || '';
  $('tmpMensaje').value = c.mensaje || '';
  $('tmpCuenta').textContent = ($('tmpMensaje').value.length) + ' / 140';
  $('tmpSonidos').checked = TMP.sonidos;
  $('tmpApagar').hidden = TMP.tema === 'ninguna';
  tmpEstado(c);
  tmpMarcar();
  $('tmpTemas').addEventListener('click', ev => {
    const b = ev.target.closest('[data-v]'); if (!b || b.disabled) return;
    TMP.tema = b.dataset.v;
    const t = TMP_TEMAS[TMP.tema];
    if (t.sugerido && !$('tmpInicio').value && !$('tmpFin').value) { const s = t.sugerido(); $('tmpInicio').value = s[0]; $('tmpFin').value = s[1]; }
    tmpMarcar(); tmpVista();
  });
  $('tmpSug').addEventListener('click', () => { const s = TMP_TEMAS[TMP.tema].sugerido(); $('tmpInicio').value = s[0]; $('tmpFin').value = s[1]; });
  $('tmpMensaje').addEventListener('input', () => { $('tmpCuenta').textContent = $('tmpMensaje').value.length + ' / 140'; });
  $('tmpGuardar').addEventListener('click', () => guardarTematica());
  $('tmpApagar').addEventListener('click', () => guardarTematica('ninguna'));
  tmpVista();
}

function tmpVista() { $('tmpVer').href = '../index.html?tematica=' + (TMP.tema === 'ninguna' ? 'ninguna' : TMP.tema); }

async function guardarTematica(forzar) {
  const tema = forzar || TMP.tema;
  const p = tema === 'ninguna' ? { tema: 'ninguna', inicio: '', fin: '', mensaje: '', sonidos: true }
    : { tema, inicio: $('tmpInicio').value, fin: $('tmpFin').value, mensaje: $('tmpMensaje').value.trim(), sonidos: $('tmpSonidos').checked };
  if (tema !== 'ninguna' && !p.fin) { toast('Elige hasta qué día dura (así vuelve sola al diseño de siempre)', true); return; }
  if (p.inicio && p.fin && p.fin < p.inicio) { toast('La fecha final es antes que la inicial', true); return; }
  const bt = forzar ? $('tmpApagar') : $('tmpGuardar');
  bt.disabled = true;
  try {
    const c = await MCAuth.listo;
    const r = await c.rpc('guardar_tema', { p });
    if (r.error) throw r.error;
    toast(tema === 'ninguna' ? 'Listo: la web volvió al diseño de siempre' : 'Temática guardada. Los alumnos la ven al abrir la web.');
    TMP.cfg = Object.assign({}, TMP.cfg, p, { inicio: p.inicio || null, fin: p.fin || null });
    pintarTematicas();
  } catch (e) {
    toast(/no autorizado/i.test(e.message || '') ? 'Tu cuenta no tiene permiso para cambiar la temática' : 'No se pudo guardar: ' + (e.message || 'error'), true);
    bt.disabled = false;
  }
}
