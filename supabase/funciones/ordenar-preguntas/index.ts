// =========================================================
// Modo Cachimbo · Edge Function «ordenar-preguntas»
// Botón «Ordenar con IA» de Panel → Subir tema: manda a Gemini el texto
// desordenado (y/o fotos o PDF) con el prompt del formato del panel
// (panel/prompt-ia.js) y devuelve las preguntas listas para Revisar.
//
// Cómo subirla: Supabase → Edge Functions → Deploy a new function →
// Via Editor → nombre: ordenar-preguntas → borra lo que trae, pega todo
// este archivo → Deploy function.
// Usa el mismo secret que leer-yape (Edge Functions → Secrets):
//   GEMINI_API_KEY = tu clave gratis de https://aistudio.google.com/apikey
//   (opcional) GEMINI_MODELO_TEXTO = un modelo en particular
//
// Solo la pueden usar los administradores (public.admins) y los ayudantes
// activos de Panel → Equipo con permiso «subir» o «examen».
// POST { prompt, texto, archivos: [{ mime, data(base64) }] } → { texto, modelo }
// =========================================================
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// Primero el que pongas en GEMINI_MODELO_TEXTO; si Google no lo tiene, prueba los siguientes
// Flash Lite primero: es el rápido (el mismo que lee los Yape). Sin «pensar» para que responda en segundos.
const MODELOS = [Deno.env.get('GEMINI_MODELO_TEXTO') || '', 'gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-2.5-flash'].filter(Boolean);
const LIMITE_MS = 110000; // Supabase corta la función a los 150 s
const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
const MAX_ARCHIVOS = 6, MAX_BYTES = 14 * 1024 * 1024; // base64 total

const FINAL = `

IMPORTANTE: responde SOLO con las preguntas ya formateadas, en texto plano, sin bloques de código (\`\`\`), sin saludos ni comentarios antes o después.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const url = Deno.env.get('SUPABASE_URL')!;
  const servicio = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const clave = Deno.env.get('GEMINI_API_KEY') || '';
  if (!servicio) return json({ error: 'Falta SUPABASE_SERVICE_ROLE_KEY' }, 500);
  if (!clave) return json({ error: 'Falta el secret GEMINI_API_KEY en Supabase' }, 500);

  // ¿Quién la llama? Admin o ayudante con permiso de subir
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const sb = createClient(url, servicio, { auth: { persistSession: false } });
  const { data: quien } = await sb.auth.getUser(jwt);
  const email = String(quien?.user?.email || '').toLowerCase();
  if (!email) return json({ error: 'Entra con tu cuenta de Google' }, 401);
  const { data: adm } = await sb.from('admins').select('email').ilike('email', email).maybeSingle();
  if (!adm) {
    const { data: eq } = await sb.from('equipo').select('permisos, activo').eq('email', email).maybeSingle();
    const p: string[] = (eq && eq.activo && eq.permisos) || [];
    if (!p.includes('subir') && !p.includes('examen')) return json({ error: 'No tienes permiso para subir temas' }, 403);
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch (_) { return json({ error: 'Pedido vacío' }, 400); }
  const prompt = String(body.prompt || '').slice(0, 60000);
  const texto = String(body.texto || '').slice(0, 80000);
  const archivos = (Array.isArray(body.archivos) ? body.archivos : []).slice(0, MAX_ARCHIVOS) as { mime?: string; data?: string }[];
  if (!prompt) return json({ error: 'Falta el prompt' }, 400);
  if (!texto.trim() && !archivos.length) return json({ error: 'Pega el texto o adjunta fotos o un PDF' }, 400);
  let total = 0;
  const partes: Record<string, unknown>[] = [];
  for (const a of archivos) {
    const mime = String(a.mime || '').toLowerCase(), data = String(a.data || '');
    if (!TIPOS.includes(mime) || !data) return json({ error: 'Solo fotos (JPG, PNG, WEBP) o PDF' }, 400);
    total += data.length;
    if (total > MAX_BYTES) return json({ error: 'Los archivos pesan mucho. Manda menos fotos o un PDF más chico (máx. ~10 MB).' }, 400);
    partes.push({ inline_data: { mime_type: mime, data } });
  }
  partes.push({ text: prompt + FINAL + (texto.trim() ? '\n\nESTAS SON LAS PREGUNTAS:\n\n' + texto : '\n\nLas preguntas están en los archivos adjuntos.') });

  let ultimo = '';
  const inicio = Date.now();
  // Cada modelo acepta ajustes distintos: si Google responde 400 por un ajuste, se prueba
  // el siguiente juego más simple y luego el siguiente modelo.
  const AJUSTES = [
    { temperature: 0.2, maxOutputTokens: 8192, thinkingConfig: { thinkingBudget: 0 } },
    { temperature: 0.2, maxOutputTokens: 8192 },
    { temperature: 0.2 },
  ];
  for (const modelo of MODELOS) {
    for (const cfg of AJUSTES) {
      const queda = LIMITE_MS - (Date.now() - inicio);
      if (queda < 5000) return json({ error: 'Gemini tardó demasiado. Prueba con menos preguntas a la vez.' }, 504);
      let r: Response;
      try {
        r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': clave },
          body: JSON.stringify({ contents: [{ role: 'user', parts: partes }], generationConfig: cfg }),
          signal: AbortSignal.timeout(queda),
        });
      } catch (_) { return json({ error: 'Gemini tardó demasiado. Prueba con menos preguntas a la vez.' }, 504); }
      if (r.status === 404) { ultimo = modelo + ' no disponible'; break; }
      if (r.status === 400) {
        const txt = await r.text();
        ultimo = 'Gemini 400 (' + modelo + '): ' + txt.slice(0, 140);
        if (/not found|not supported for generateContent/i.test(txt)) break; // modelo no existe: el siguiente
        continue; // ajuste no aceptado: el siguiente juego de ajustes
      }
      if (r.status === 429) return json({ error: 'Se llegó al límite gratis de Gemini por ahora. Intenta en un rato.' }, 429);
      if (!r.ok) return json({ error: 'Gemini ' + r.status + ': ' + (await r.text()).slice(0, 160) }, 502);
      const d = await r.json();
      let t: string = d?.candidates?.[0]?.content?.parts?.map((p: { text?: string; thought?: boolean }) => p.thought ? '' : p.text || '').join('') || '';
      t = t.replace(/^\s*```[a-z]*\s*\n?/i, '').replace(/\n?```\s*$/, '').trim();
      if (!t) return json({ error: 'Gemini no devolvió nada' + (d?.candidates?.[0]?.finishReason ? ' (' + d.candidates[0].finishReason + ')' : '') }, 502);
      return json({ texto: t, modelo, cortado: d?.candidates?.[0]?.finishReason === 'MAX_TOKENS' });
    }
  }
  return json({ error: ultimo || 'Sin modelo de Gemini disponible' }, 502);
});
