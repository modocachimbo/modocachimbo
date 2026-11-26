/* ============================================================
   Panel → Editar preguntas: caja «Ojo de claves (Modo estudio)»
   Un interruptor: ¿las claves se ven al entrar al Modo estudio?
   Vale para todos los tema.html (CPU y Ordinario) y Ejercicios MC
   de tema-ord.html, solo para alumnos que nunca tocaron el ojo
   (si el alumno lo toca, se respeta lo suyo).
   Supabase: ajustes clave 'ojo_claves' = { visibles: bool } (sin SQL nuevo).
   Sin ajuste guardado = claves ocultas. Lo lee assets/ojo-claves.js.
   ============================================================ */
(function () {
  const css = document.createElement('style');
  css.textContent = `
  .ojc-card { display:flex; align-items:center; justify-content:space-between; gap:14px; background:var(--surface); border:1px solid var(--border); border-radius:18px; padding:14px 18px; margin:0 0 16px; }
  .ojc-card .ojc-ic { width:40px; height:40px; flex:none; border-radius:12px; background:#1F1936; border:2px solid #3a4a00; color:#C6E000; display:grid; place-items:center; }
  .ojc-card .ojc-ic.off { color:#8F86B0; border-color:#322B52; }
  .ojc-card .ojc-ic svg { width:22px; height:22px; }
  .ojc-card .ojc-tx { flex:1; min-width:0; }
  .ojc-card b { display:block; font-size:14px; }
  .ojc-card small { display:block; font-size:12px; color:var(--text-dim); margin-top:2px; line-height:1.4; }
  .ojc-card .sw span { width:44px; height:24px; } .ojc-card .sw span::after { width:20px; height:20px; } .ojc-card .sw input:checked + span::after { left:22px; }`;
  document.head.appendChild(css);

  const OJO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const OJO_NO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-2.6 3.5M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M3 3l18 18"/></svg>';

  function pintar(caja, v, msg) {
    caja.innerHTML = `<div class="ojc-ic${v ? '' : ' off'}">${v ? OJO : OJO_NO}</div>
      <div class="ojc-tx"><b>Claves visibles al entrar al Modo estudio</b>
      <small>${msg || (v ? 'Prendido: el alumno entra viendo las claves en verde.' : 'Apagado: el alumno entra con las claves ocultas y las ve con el ojo.')} Si el alumno toca el ojo, se respeta lo que eligió. Se guarda al tocar.</small></div>
      <label class="sw"><input type="checkbox" id="ojcSw" ${v ? 'checked' : ''}><span></span></label>`;
    caja.querySelector('#ojcSw').addEventListener('change', async e => {
      const nv = e.target.checked; e.target.disabled = true;
      try {
        const r = await (await MCAuth.listo).rpc('guardar_ajuste', { p_clave: 'ojo_claves', p_valor: { visibles: nv } });
        if (r.error) throw r.error;
        try { localStorage.setItem('mc_ojo_def', nv ? 'si' : 'no'); } catch (e2) {}
        if (typeof toast === 'function') toast(nv ? 'Claves visibles al entrar' : 'Claves ocultas al entrar');
        pintar(caja, nv);
      } catch (err) {
        if (typeof toast === 'function') toast(/no autorizado/i.test(err.message || '') ? 'Tu correo no es administrador' : (err.message || 'No se pudo guardar'), true);
        pintar(caja, !nv);
      }
    });
  }

  async function iniciar() {
    const tab = document.getElementById('tab-editar'); if (!tab || tab.querySelector('.ojc-card')) return;
    const caja = document.createElement('div'); caja.className = 'ojc-card';
    const head = tab.querySelector('.page-head');
    head ? head.after(caja) : tab.prepend(caja);
    caja.innerHTML = '<small>Cargando ajuste de claves…</small>';
    try {
      const r = await (await MCAuth.listo).from('ajustes').select('valor').eq('clave', 'ojo_claves').maybeSingle();
      if (r.error) throw r.error;
      pintar(caja, !!(r.data && r.data.valor && r.data.valor.visibles));
    } catch (e) { caja.innerHTML = '<small>No se pudo leer el ajuste del ojo de claves.</small>'; }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
