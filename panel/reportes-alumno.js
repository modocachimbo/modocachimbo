/* =========================================================
   Panel · Estado de los reportes en "Mi perfil" del alumno
   (supabase/07-reportes.sql). Necesita haber entrado con la
   cuenta de Google de administrador; si no, no hace nada.
   - Abrir Reportes      → los enviados pasan a "Recibido"
   - Corregir pregunta   → sus reportes pasan a "Corregido"
   - Descartar           → "Denegado"; Volver a pendiente → "Recibido"
   ========================================================= */
window.MCRep = (() => {
  let ultimo = 0, autores = null, pidiendo = null, cargado = 0;
  const asignado = new Map(), usados = new Set();
  const norm = t => String(t == null ? '' : t).replace(/^0+/, '');
  async function rpc(nombre, args) {
    if (!window.MCAuth || !MCAuth.usuario()) return null;
    try { const r = await (await MCAuth.listo).rpc(nombre, args || {}); return r.error ? null : r.data; }
    catch (e) { return null; }
  }
  return {
    // Como mucho una vez por minuto
    recibidos() {
      if (!window.MCAuth || !MCAuth.usuario() || Date.now() - ultimo < 60000) return;
      ultimo = Date.now();
      rpc('reportes_recibidos');
    },
    // Quién mandó cada reporte (supabase/08-reportes-autor.sql). alListo se llama una vez al tener la lista.
    cargarAutores(alListo) {
      if (pidiendo || Date.now() - cargado < 120000 || !window.MCAuth || !MCAuth.usuario()) return;
      cargado = Date.now();
      pidiendo = rpc('reportes_autores').then(d => {
        pidiendo = null;
        if (!Array.isArray(d)) return;
        autores = d.map(a => Object.assign({ t: new Date(a.creado).getTime() }, a));
        asignado.clear(); usados.clear();
        if (alListo) alListo();
      });
    },
    // La hoja no guarda el alumno: se busca el reporte de la misma pregunta con la hora más cercana
    // (hasta 26 h, por si la hoja usa otra zona horaria que el navegador)
    autor(r) {
      if (!autores || !r || !r.carpeta) return null;
      const clave = r.fila + '|' + r.fecha;
      if (asignado.has(clave)) return asignado.get(clave);
      const t = new Date(r.fecha).getTime();
      let mejor = null, dif = 26 * 3600000;
      autores.forEach(a => {
        if (usados.has(a) || a.carpeta !== r.carpeta || String(a.anio) !== String(r.anio) || norm(a.tema) !== norm(r.tema) || +a.pregunta !== +r.pregunta) return;
        const d = Math.abs(a.t - t);
        if (isNaN(t) || d <= dif) { mejor = a; dif = isNaN(t) ? dif : d; }
      });
      if (mejor) usados.add(mejor);
      asignado.set(clave, mejor);
      return mejor;
    },
    estado(r, estado) {
      if (!r || !r.carpeta || !r.pregunta) return;
      rpc('estado_reporte', { p_carpeta: r.carpeta, p_anio: r.anio, p_tema: String(r.tema), p_pregunta: +r.pregunta, p_estado: estado });
    }
  };
})();
