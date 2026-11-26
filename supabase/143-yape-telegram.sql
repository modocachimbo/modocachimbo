-- =========================================================
-- Modo Cachimbo · 143 · Avisos de Yape también por Telegram
-- (va después de 142-yape-semiauto.sql)
-- El bot de WhatsApp gratis (CallMeBot) está lleno: con Telegram creas
-- tu propio bot gratis (@BotFather) y te llegan los mismos mensajes con
-- los enlaces Aprobar / Rechazar / No me llegó. Se conecta en el panel →
-- Recargas Yape. Si hay WhatsApp y Telegram, llega por los dos.
-- Cómo correrlo: Supabase → SQL Editor → New query → pega todo → Run.
-- =========================================================

alter table public.yape_ajustes add column if not exists tg_token text;
alter table public.yape_ajustes add column if not exists tg_chat  text;

create or replace function public.yape_wsp(p_texto text)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare aj public.yape_ajustes;
begin
  select * into aj from public.yape_ajustes where id = 1;
  if coalesce(aj.wsp_key, '') <> '' then
    begin
      perform net.http_get(
        url := 'https://api.callmebot.com/whatsapp.php',
        params := jsonb_build_object('phone', aj.wsp_tel, 'text', left(p_texto, 900), 'apikey', aj.wsp_key));
    exception when others then null;
    end;
  end if;
  if coalesce(aj.tg_token, '') <> '' and coalesce(aj.tg_chat, '') <> '' then
    begin
      perform net.http_get(
        url := 'https://api.telegram.org/bot' || aj.tg_token || '/sendMessage',
        params := jsonb_build_object('chat_id', aj.tg_chat, 'text', left(p_texto, 3000), 'disable_web_page_preview', 'true'));
    exception when others then null;
    end;
  end if;
end $$;
revoke all on function public.yape_wsp(text) from public, anon, authenticated;

create or replace function public.yape_admin()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare aj public.yape_ajustes;
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  select * into aj from public.yape_ajustes where id = 1;
  return jsonb_build_object(
    'ajustes', jsonb_build_object('secreto', aj.secreto, 'auto', aj.auto, 'espera', aj.espera, 'tope', aj.tope, 'tope_dia', aj.tope_dia,
      'wsp_tel', aj.wsp_tel, 'wsp', coalesce(aj.wsp_key, '') <> '',
      'tg', coalesce(aj.tg_token, '') <> '' and coalesce(aj.tg_chat, '') <> '',
      'ultimo', (select max(v.recibido) from public.yape_avisos v)),
    'cuenta', jsonb_build_object('revision', (select count(*) from public.yape_recargas r where r.estado = 'revision'),
      'esperando', (select count(*) from public.yape_recargas r where r.estado = 'esperando'),
      'solas', (select count(*) from public.yape_recargas r where r.como = 'confianza' and r.estado = 'aprobada' and r.creado > now() - interval '7 days')),
    'recargas', coalesce((select jsonb_agg(jsonb_build_object(
        'id', r.id, 'estado', r.estado, 'como', r.como, 'monto', r.monto, 'diamantes', r.diamantes, 'codigo', r.codigo,
        'captura', r.captura, 'nota', r.nota, 'motivo', r.motivo, 'creado', r.creado, 'resuelto', r.resuelto,
        'apodo', (select coalesce(nullif(trim(p.apodo), ''), p.nombre) from public.perfiles p where p.id = r.usuario),
        'email', (select u.email from auth.users u where u.id = r.usuario),
        'jid', (select j.codigo from public.jugador_id j where j.usuario = r.usuario),
        'aviso', (select v.texto from public.yape_avisos v where v.id = r.aviso))
      order by (r.estado = 'revision') desc, r.creado desc)
      from (select * from public.yape_recargas x order by x.creado desc limit 80) r), '[]'::jsonb),
    'avisos', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'texto', v.texto, 'monto', v.monto, 'codigo', v.codigo, 'recibido', v.recibido, 'recarga', v.recarga) order by v.recibido desc)
      from (select * from public.yape_avisos x order by x.recibido desc limit 30) v), '[]'::jsonb));
end $$;
revoke all on function public.yape_admin() from public, anon;
grant execute on function public.yape_admin() to authenticated;

create or replace function public.yape_config(p jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  update public.yape_ajustes set
    auto = coalesce((p ->> 'auto')::boolean, auto),
    espera = greatest(2, least(120, coalesce((p ->> 'espera')::integer, espera))),
    tope = greatest(0, least(100, coalesce((p ->> 'tope')::numeric, tope))),
    tope_dia = greatest(0, least(500, coalesce((p ->> 'tope_dia')::numeric, tope_dia))),
    wsp_tel = coalesce(nullif(regexp_replace(p ->> 'wsp_tel', '[^0-9+]', '', 'g'), ''), wsp_tel),
    wsp_key = case when p ? 'wsp_key' then nullif(trim(p ->> 'wsp_key'), '') else wsp_key end,
    tg_token = case when p ? 'tg_token' then nullif(trim(p ->> 'tg_token'), '') else tg_token end,
    tg_chat = case when p ? 'tg_chat' then nullif(trim(p ->> 'tg_chat'), '') else tg_chat end,
    secreto = case when (p ->> 'nueva_clave')::boolean then replace(gen_random_uuid()::text, '-', '') else secreto end
  where id = 1;
  if (p ->> 'probar')::boolean then perform public.yape_wsp('Modo Cachimbo: prueba de avisos de Yape. Si lees esto, ya te llegan los avisos.'); end if;
  return public.yape_admin();
end $$;
revoke all on function public.yape_config(jsonb) from public, anon;
grant execute on function public.yape_config(jsonb) to authenticated;
