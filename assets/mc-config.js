/* =========================================================
   Modo Cachimbo · Configuración compartida
   ---------------------------------------------------------
   REPORTES_URL: pega aquí la URL de tu Apps Script de reportes
   (la que termina en /exec). Mientras esté vacía, los reportes
   se envían solo por WhatsApp.
   ========================================================= */
window.MC_CONFIG = {
  REPORTES_URL: 'https://script.google.com/macros/s/AKfycbym1ufiYN7VFF9jvCBYGP54a7stGanTLOeOre5oSLO_Xi2q2O-Y5YH4NJcp_bvPg0DL/exec',
  WHATSAPP: '51917797543',
  // Grupo de WhatsApp de Modo Cachimbo (botón del inicio)
  WHATSAPP_GRUPO: 'https://chat.whatsapp.com/HlKvyK6HLXP02iIgGvj1Iz?mode=gi_t',
  // Login de alumnos (Supabase). La clave "publishable" es pública:
  // puede ir aquí. La "secret" / service_role NUNCA va en el sitio.
  SUPABASE_URL: 'https://tvcrhogybfxphpzpjnis.supabase.co',
  SUPABASE_KEY: 'sb_publishable_clm6obUTs_391NA7FGG1YA_-eNuj7dU'
};
