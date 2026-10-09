/* =========================================================
   Panel · Flashcards del profesor (Editar → tema → Tarjetas)
   Cada línea es una tarjeta:  frente || reverso
   Se guardan en Supabase (tabla tarjetas, supabase/12-tarjetas.sql)
   y salen en tarjetas.html junto a las que se arman solas con
   las preguntas del tema.
   ========================================================= */
function lineasTarjetas(texto) {
  return String(texto || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const i = l.indexOf('||');
    return i < 0 ? { mala: l } : { frente: l.slice(0, i).trim(), reverso: l.slice(i + 2).trim() };
  });
}

async function tarjetasTema(ctx) {
  // ctx = { curso, seccion, anio, tema, nombre, preguntas }
  const o = document.createElement('div');
  o.className = 'ov';
  o.innerHTML = `<div class="mcard" style="max-width:620px;">
    <h3>Flashcards del tema ${esc(ctx.tema)} · ${esc(ctx.nombre)}</h3>
    <p class="sub" style="margin-top:6px; line-height:1.55;">Las ${ctx.preguntas} preguntas de este tema ya salen solas como tarjetas (la pregunta al frente y la respuesta correcta atrás). Aquí agregas las tuyas: <b>una por línea</b>, el frente y el reverso separados por <b>||</b>. Puedes usar *cursiva*, **negrita** y $fórmulas$.</p>
    <textarea class="ta" id="tjTexto" style="margin-top:14px; min-height:220px;" placeholder="Mitocondria || Organelo que produce la energía (ATP) de la célula&#10;¿Qué organelo sintetiza proteínas? || El ribosoma">Cargando…</textarea>
    <div class="hint" id="tjCuenta" style="margin-top:8px;"></div>
    <div class="mfoot"><button type="button" class="btn-ghost" data-x>Cancelar</button>
    <button type="button" class="btn-main" data-ok disabled>Guardar tarjetas</button></div></div>`;
  document.body.appendChild(o);
  const ta = o.querySelector('#tjTexto'), ok = o.querySelector('[data-ok]'), cuenta = o.querySelector('#tjCuenta');
  const cerrar = () => o.remove();
  o.querySelector('[data-x]').addEventListener('click', cerrar);
  o.addEventListener('mousedown', e => { if (e.target === o) cerrar(); });

  let cliente, original = '';
  try {
    cliente = await MCAuth.listo;
    const r = await cliente.from('tarjetas').select('frente,reverso')
      .eq('curso', ctx.curso).eq('seccion', ctx.seccion).eq('anio', ctx.anio).eq('tema', ctx.tema).order('orden');
    if (r.error) throw r.error;
    original = (r.data || []).map(t => t.frente + ' || ' + t.reverso).join('\n');
  } catch (e) {
    ta.value = ''; ta.disabled = true;
    cuenta.innerHTML = /tarjetas|relation|schema/i.test((e && e.message) || '') ? '<b>Primero corre supabase/12-tarjetas.sql en Supabase.</b>' : 'No se pudieron traer las tarjetas: ' + esc((e && e.message) || e);
    return;
  }
  ta.value = original;
  const revisar = () => {
    const ls = lineasTarjetas(ta.value), malas = ls.filter(x => x.mala || !x.frente || !x.reverso).length;
    cuenta.innerHTML = `${ls.length - malas} tarjeta${ls.length - malas === 1 ? '' : 's'}` +
      (malas ? ` · <b style="color:#ff8a8a;">${malas} línea${malas === 1 ? '' : 's'} sin “||” o con un lado vacío (no se guardarán)</b>` : '') +
      (MCAuth.usuario() ? '' : ' · <b>Entra con Google para guardar.</b>');
    ok.disabled = !MCAuth.usuario() || ta.value.trim() === original.trim();
  };
  ta.addEventListener('input', revisar); revisar();
  ok.addEventListener('click', async () => {
    const lista = lineasTarjetas(ta.value).filter(x => x.frente && x.reverso).slice(0, 300)
      .map(x => ({ frente: x.frente.slice(0, 600), reverso: x.reverso.slice(0, 600) }));
    ok.disabled = true; ok.textContent = 'Guardando…';
    try {
      const r = await cliente.rpc('guardar_tarjetas_tema', { p_curso: ctx.curso, p_seccion: ctx.seccion, p_anio: ctx.anio, p_tema: ctx.tema, p_lista: lista });
      if (r.error) throw r.error;
      toast(r.data ? r.data + ' tarjeta' + (r.data === 1 ? '' : 's') + ' guardada' + (r.data === 1 ? '' : 's') : 'Tarjetas del profe quitadas');
      cerrar();
    } catch (e) {
      toast(/function|does not exist/i.test(e.message || '') ? 'Primero corre supabase/12-tarjetas.sql en Supabase' : (e.message || 'No se pudo guardar'), true);
      ok.disabled = false; ok.textContent = 'Guardar tarjetas';
    }
  });
}
