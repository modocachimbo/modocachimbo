/* =========================================================
   Panel · Revisar archivos subidos a mano
   Detecta cambios del panel que se perdieron al subir archivos
   viejos a GitHub y permite restaurarlos.
   ========================================================= */
function nombreArchivo(h) {
  if (h.archivo === 'manifest.json') return 'Lista de años';
  if (h.archivo === 'alertas.json') return 'Alertas';
  return 'Preguntas ' + h.archivo.replace('.json', '');
}
function fechaHora(iso) { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }

async function revisarArchivos() {
  const b = $('btnRevArch'), box = $('revArch');
  b.disabled = true; b.innerHTML = '<span class="spin-s"></span> Revisando… (puede tardar unos segundos)';
  try {
    const r = await api('revisarArchivos');
    pintarRevision(r);
  } catch (e) { box.innerHTML = `<div class="state-msg error">${esc(e.message)}</div>`; }
  b.disabled = false; b.textContent = 'Revisar archivos';
}

function pintarRevision(r) {
  const box = $('revArch');
  const H = r.hallazgos || [], A = r.aniosPorReparar || [];
  if (!H.length && !A.length) {
    box.innerHTML = `<div class="banner ok"><div>✓ <b>Todo en orden.</b> Revisé ${r.revisados} archivos: ninguna subida manual borró cambios del panel y todas las listas de años están correctas.</div></div>`;
    return;
  }
  box.innerHTML =
    (H.length ? `<div class="banner warn"><div><b>${H.length} archivo${H.length > 1 ? 's' : ''} con cambios del panel que se perdieron</b> por una subida manual a GitHub. Revisa cada uno y restaura la versión del panel si es la correcta.</div></div>` : '') +
    H.map((h, i) => `<article class="rcard">
      <div class="rtop"><div class="rmeta"><span class="pill">${esc(h.cursoNombre || 'Sitio')}</span><span class="pill gray">${esc(nombreArchivo(h))}</span></div>
        <span class="rdate">subida manual: ${esc(fechaHora(h.fechaManual))}</span></div>
      <div class="rgrid">
        <div class="rbox"><div class="k">Ahora en la web</div><div class="v">${esc(h.ahora)}</div></div>
        <div class="rbox new"><div class="k">Versión del panel · ${esc(fechaHora(h.fechaPanel))}</div><div class="v">${esc(h.delPanel)}${h.distintas ? ` <span style="font-weight:500;opacity:.8">· ${h.distintas} pregunta${h.distintas > 1 ? 's' : ''} con cambios</span>` : ''}</div></div>
      </div>
      <div class="rfoot"><button class="rbtn primary" type="button" data-rest="${i}">Restaurar versión del panel</button></div>
    </article>`).join('') +
    (A.length ? `<div class="banner info" style="margin-top:12px;"><div><b>Listas de años desactualizadas</b> (lo que muestra "Elige un año"):<br>${A.map(a => `${esc(a.cursoNombre)}: ${esc(a.antes)} → <b>${esc(a.despues)}</b>`).join('<br>')}</div>
      <button class="btn-main" type="button" id="btnRepAnios">Reparar ${A.length === 1 ? 'lista' : A.length + ' listas'}</button></div>` : '');
  box.querySelectorAll('[data-rest]').forEach(b => b.addEventListener('click', async () => {
    const h = H[+b.dataset.rest];
    b.disabled = true; b.innerHTML = '<span class="spin-s"></span> Restaurando…';
    try {
      await api('restaurarArchivo', { path: h.path, sha: h.sha });
      delete cacheManifest[h.curso]; Object.keys(cacheArchivos).forEach(k => { if (k.startsWith(h.curso + '|')) delete cacheArchivos[k]; });
      b.closest('.rcard').innerHTML = `<div class="banner ok" style="margin:0"><div>✓ <b>${esc(h.cursoNombre)} · ${esc(nombreArchivo(h))}</b> restaurado. Se verá en la web en 1 a 10 minutos.</div></div>`;
    } catch (e) { b.disabled = false; b.textContent = 'Restaurar versión del panel'; toast(e.message, true); }
  }));
  const rb = $('btnRepAnios');
  if (rb) rb.addEventListener('click', async () => {
    rb.disabled = true; rb.innerHTML = '<span class="spin-s"></span> Reparando…';
    try {
      const x = await api('repararAnios');
      Object.keys(cacheManifest).forEach(k => delete cacheManifest[k]);
      rb.closest('.banner').outerHTML = `<div class="banner ok"><div>✓ <b>Listas de años reparadas</b>${x.cambios.length ? ': ' + x.cambios.map(c => esc(c.cursoNombre)).join(', ') : ''}. Se verán en 1 a 10 minutos.</div></div>`;
    } catch (e) { rb.disabled = false; rb.textContent = 'Reparar'; toast(e.message, true); }
  });
}
