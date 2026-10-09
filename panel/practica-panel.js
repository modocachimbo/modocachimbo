/* =========================================================
   Panel · Ajustes de la práctica (Cursos)
   Mezclar alternativas: en quiz, repaso, fijas, falladas,
   simulacro y duelos el contenido de las alternativas cambia
   de lugar en cada intento (assets/pregunta.js).
   Se guarda en Supabase (tabla ajustes, clave 'practica');
   si nunca se guardó, está encendido.
   ========================================================= */
const PR = { valor: null };

async function cargarPractica() {
  const caja = $('cuPractica'); if (!caja || !window.MCAuth) return;
  let cliente;
  try { cliente = await MCAuth.listo; } catch (e) { caja.innerHTML = ''; return; }
  const r = await cliente.from('ajustes').select('valor').eq('clave', 'practica').maybeSingle();
  PR.valor = Object.assign({ mezclar: true }, (r.data && r.data.valor) || {});
  pintarPractica();
}

function pintarPractica() {
  const on = PR.valor.mezclar !== false, admin = !!MCAuth.usuario();
  $('cuPractica').innerHTML = `
    <div class="acc-box" style="margin-bottom:18px;">
      <div class="acc-ttl">Práctica <span>— vale para todos los cursos</span></div>
      <div class="acc-row">
        <div><b>Mezclar alternativas</b><span>En Practicar, Repaso, Fijas, Falladas, Simulacro y Duelos la respuesta correcta cambia de letra en cada intento, para que no se memoricen la clave. El modo estudio y los exámenes de admisión quedan como el libro. No se mezclan las preguntas con alternativas como "A y B" o "Todas las anteriores".${admin ? '' : ' <b>Entra con Google para cambiarlo.</b>'}</span></div>
        <label class="sw"><input type="checkbox" id="prMezclar" ${on ? 'checked' : ''} ${admin ? '' : 'disabled'}><span></span>${on ? 'Encendido' : 'Apagado'}</label>
      </div>
    </div>`;
  $('prMezclar').addEventListener('change', async e => {
    const nuevo = Object.assign({}, PR.valor, { mezclar: e.target.checked });
    e.target.disabled = true;
    try {
      const r = await (await MCAuth.listo).rpc('guardar_ajuste', { p_clave: 'practica', p_valor: nuevo });
      if (r.error) throw r.error;
      PR.valor = nuevo;
      toast(nuevo.mezclar ? 'Las alternativas se mezclarán' : 'Las alternativas quedan como el libro');
    } catch (err) {
      toast(/check|constraint/i.test(err.message || '') ? 'Primero corre supabase/11-practica.sql en Supabase' : (err.message || 'No se pudo guardar'), true);
    }
    pintarPractica();
  });
}
