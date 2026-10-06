/* =========================================================
   Panel · Estado de los reportes en "Mi perfil" del alumno
   (supabase/07-reportes.sql). Necesita haber entrado con la
   cuenta de Google de administrador; si no, no hace nada.
   - Abrir Reportes      → los enviados pasan a "Recibido"
   - Corregir pregunta   → sus reportes pasan a "Corregido"
   - Descartar           → "Denegado"; Volver a pendiente → "Recibido"
   ========================================================= */
window.MCRep = (() => {
  let ultimo = 0;
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
    estado(r, estado) {
      if (!r || !r.carpeta || !r.pregunta) return;
      rpc('estado_reporte', { p_carpeta: r.carpeta, p_anio: r.anio, p_tema: String(r.tema), p_pregunta: +r.pregunta, p_estado: estado });
    }
  };
})();
