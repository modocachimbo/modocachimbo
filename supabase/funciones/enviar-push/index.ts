// =========================================================
// Modo Cachimbo · Edge Function «enviar-push»
// Cómo subirla: Supabase → Edge Functions → Deploy a new function →
// Via Editor → nombre: enviar-push → borra lo que trae, pega todo este
// archivo → Deploy function.
// Secrets (Edge Functions → Secrets), los genera el panel
// (Web → Notificaciones → Generar llaves):
//   VAPID_PUBLICA · VAPID_PRIVADA · VAPID_CORREO
//
// Acciones (POST con JSON):
//   { accion: 'clave' }  → la llave pública (la pide la web al activar)
//   { accion: 'enviar', titulo, cuerpo, link, para: 'todos' | 'prueba' }
//     solo administradores (es_admin). 'prueba' = solo tus equipos.
// =========================================================
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

// Clave publishable (pública, la misma de assets/mc-config.js)
const PUBLICA_SB = 'sb_publishable_clm6obUTs_391NA7FGG1YA_-eNuj7dU';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const pub = Deno.env.get('VAPID_PUBLICA') || '';
  const priv = Deno.env.get('VAPID_PRIVADA') || '';
  const correo = Deno.env.get('VAPID_CORREO') || 'modocachimbo@gmail.com';
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch (_) { /* sin cuerpo */ }

  if (body.accion === 'clave') return json({ clave: pub });
  if (body.accion !== 'enviar') return json({ error: 'acción no válida' }, 400);
  if (!pub || !priv) return json({ error: 'Faltan las llaves VAPID en Secrets.' }, 500);

  // Todo con la sesión del que llama: las funciones SQL revisan que sea admin
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, PUBLICA_SB, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    auth: { persistSession: false },
  });
  const { data: esAdmin } = await sb.rpc('es_admin');
  if (!esAdmin) return json({ error: 'no autorizado' }, 403);

  const titulo = String(body.titulo || '').trim().slice(0, 80);
  const cuerpo = String(body.cuerpo || '').trim().slice(0, 240);
  const link = String(body.link || '').trim().slice(0, 600);
  const para = body.para === 'prueba' ? 'prueba' : 'todos';
  if (!titulo || !cuerpo) return json({ error: 'Falta el título o el mensaje.' }, 400);

  const { data: subs, error } = await sb.rpc('push_destinos', { p_solo_mio: para === 'prueba' });
  if (error) return json({ error: error.message }, 500);

  webpush.setVapidDetails('mailto:' + correo, pub, priv);
  const carga = JSON.stringify({ titulo, cuerpo, link });
  let enviados = 0, fallidos = 0;
  const muertos: string[] = [];
  const lista = (subs || []) as { endpoint: string; p256dh: string; auth: string }[];
  for (let i = 0; i < lista.length; i += 50) {
    const r = await Promise.allSettled(lista.slice(i, i + 50).map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, carga, { TTL: 86400, urgency: 'normal' })));
    r.forEach((x, j) => {
      if (x.status === 'fulfilled') { enviados++; return; }
      fallidos++;
      const code = (x.reason && (x.reason as { statusCode?: number }).statusCode) || 0;
      if (code === 404 || code === 410) muertos.push(lista[i + j].endpoint);
    });
  }
  if (muertos.length) await sb.rpc('push_limpiar', { p_endpoints: muertos });
  await sb.rpc('push_registrar', { p_titulo: titulo, p_cuerpo: cuerpo, p_link: link, p_para: para, p_enviados: enviados, p_fallidos: fallidos });
  return json({ enviados, fallidos, borrados: muertos.length, total: lista.length });
});
