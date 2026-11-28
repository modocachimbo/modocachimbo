// =========================================================
// Modo Cachimbo · Edge Function «leer-yape»
// Lee la captura de un Yape con Gemini y la compara con lo que escribió
// el alumno (supabase/155-yape-lectura-ia.sql → yape_lectura).
//
// Cómo subirla: Supabase → Edge Functions → Deploy a new function →
// Via Editor → nombre: leer-yape → borra lo que trae, pega todo este
// archivo → Deploy function.
// Secret (Edge Functions → Secrets → Add new secret):
//   GEMINI_API_KEY = tu clave gratis de https://aistudio.google.com/apikey
//   (opcional) GEMINI_MODELO = un modelo en particular
//
// La llama la web (assets/yape-plan.js y tienda.html) con la sesión del alumno:
//   POST { id }               → lee SU compra y decide (aprobar o revisión)
//   POST { id, admin: true }  → solo administradores: vuelve a leer cualquier
//                               compra (botón «Leer con IA» del panel). No aprueba
//                               ni rechaza nada que ya estuviera decidido.
// =========================================================
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

const PUBLICA_SB = 'sb_publishable_clm6obUTs_391NA7FGG1YA_-eNuj7dU';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// Primero el que pongas en GEMINI_MODELO; si Google no lo tiene, prueba los siguientes
const MODELOS = [Deno.env.get('GEMINI_MODELO') || '', 'gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-2.5-flash'].filter(Boolean);

const PROMPT = `Esta imagen debería ser la captura de un pago hecho con Yape (Perú).
Lee SOLO lo que se ve escrito en la imagen y responde en JSON:
- es_yape: true si es una constancia de pago de Yape («¡Yapeaste!», «Yapeaste», constancia de Yape). false si es otra cosa.
- monto: el monto pagado, solo el número con punto decimal (ej. "10" o "12.90").
- codigo: los 3 dígitos que aparecen junto a «Código de seguridad».
- fecha: la fecha del pago en formato YYYY-MM-DD.
- hora: la hora del pago en formato 24 h HH:MM.
- destinatario: el nombre de la persona que RECIBIÓ el pago (sale debajo del monto).
- destino_digitos: los dígitos visibles del «Nro. de celular» del destino (ej. "708").
- operacion: el «Nro. de operación», solo dígitos.
- editada: true SOLO si ves señales claras de que la captura fue editada o armada: números o letras con otro tipo, tamaño, grosor o color que el resto; cifras desalineadas o encimadas; manchas, borrones o recuadros tapando algo; bordes cortados raros; partes pixeladas distintas al resto. Si se ve normal, false.
- senales: si editada es true, en pocas palabras qué viste y dónde (ej. "el monto tiene otra letra"). Si no, "".
Si un dato no se ve, pon "". No inventes nada.`;

const ESQUEMA = {
  type: 'OBJECT',
  properties: {
    es_yape: { type: 'BOOLEAN' }, monto: { type: 'STRING' }, codigo: { type: 'STRING' }, fecha: { type: 'STRING' },
    hora: { type: 'STRING' }, destinatario: { type: 'STRING' }, destino_digitos: { type: 'STRING' }, operacion: { type: 'STRING' },
    editada: { type: 'BOOLEAN' }, senales: { type: 'STRING' },
  },
  required: ['es_yape', 'monto', 'codigo', 'fecha', 'hora', 'destinatario', 'destino_digitos', 'operacion', 'editada', 'senales'],
};

function base64(buf: Uint8Array): string {
  let s = '';
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}

async function leerConGemini(img: Uint8Array, mime: string, clave: string): Promise<Record<string, unknown>> {
  let ultimo = '';
  for (const modelo of MODELOS) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': clave },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ inline_data: { mime_type: mime, data: base64(img) } }, { text: PROMPT }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: ESQUEMA },
      }),
      signal: AbortSignal.timeout(40000),
    });
    if (r.status === 404 || r.status === 400 && /not found|not supported/i.test(await r.clone().text())) { ultimo = modelo + ' no existe'; continue; }
    if (!r.ok) throw new Error('Gemini ' + r.status + ': ' + (await r.text()).slice(0, 120));
    const d = await r.json();
    const t = d?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || '';
    const datos = JSON.parse(t.replace(/^```(?:json)?\s*|\s*```$/g, ''));
    return { ...datos, modelo };
  }
  throw new Error(ultimo || 'sin modelo');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const url = Deno.env.get('SUPABASE_URL')!;
  const servicio = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const clave = Deno.env.get('GEMINI_API_KEY') || '';
  if (!servicio) return json({ error: 'Falta SUPABASE_SERVICE_ROLE_KEY' }, 500);
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch (_) { /* sin cuerpo */ }
  const id = Number(body.id) || 0;
  if (!id) return json({ error: 'falta id' }, 400);

  // ¿Quién la llama?
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const sb = createClient(url, servicio, { auth: { persistSession: false } });
  const { data: quien } = await sb.auth.getUser(jwt);
  const uid = quien?.user?.id;
  if (!uid) return json({ error: 'sin sesión' }, 401);
  let usuario: string | null = uid;
  if (body.admin) {
    const comoEl = createClient(url, PUBLICA_SB, { auth: { persistSession: false }, global: { headers: { Authorization: 'Bearer ' + jwt } } });
    const { data: adm } = await comoEl.rpc('es_admin');
    if (!adm) return json({ error: 'no autorizado' }, 403);
    usuario = null;
  }

  const { data: r, error: e1 } = await sb.rpc('yape_para_leer', { p_id: id, p_usuario: usuario });
  if (e1) return json({ error: e1.message }, 500);
  if (!r) return json({ error: 'no existe' }, 404);
  if (!body.admin && r.leida && !r.ia_pend) return json({ ok: true, ya: true });

  let datos: Record<string, unknown>;
  if (!clave) datos = { error: 'falta GEMINI_API_KEY' };
  else if (!r.captura) datos = { error: 'sin captura' };
  else {
    try {
      const { data: archivo, error: e2 } = await sb.storage.from('yape').download(String(r.captura));
      if (e2 || !archivo) throw new Error('no se pudo bajar la captura');
      datos = await leerConGemini(new Uint8Array(await archivo.arrayBuffer()), archivo.type || 'image/jpeg', clave);
    } catch (e) {
      datos = { error: String((e as Error)?.message || e).slice(0, 120) };
    }
  }
  const { data: res, error: e3 } = await sb.rpc('yape_lectura', { p_id: id, p_usuario: usuario, p_datos: datos });
  if (e3) return json({ error: e3.message }, 500);
  return json({ ...(res as Record<string, unknown>), lectura: datos });
});
