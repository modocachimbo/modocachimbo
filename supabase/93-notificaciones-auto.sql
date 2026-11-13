-- =========================================================
-- Modo Cachimbo · Notificaciones automáticas
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 92-notificaciones.sql y la Edge Function «enviar-push»
-- (con «Verify JWT» apagado).
--
-- Cada hora (minuto 0) Supabase llama a la Edge Function con
-- { accion: 'auto' }. La función pide aquí a quién avisar
-- (push_auto_lote) y lo envía. Solo entre 8 a. m. y 9 p. m. (Perú),
-- y como máximo 2 avisos automáticos por alumno al día.
--
--   · tema       Tema o curso nuevo (lo que subes desde el panel),
--                unos 10 minutos después, cuando la web ya lo tiene.
--   · racha      8 p. m.: a quien tiene racha de 2+ días y hoy aún
--                no llega a su meta de preguntas.
--   · inactivo   6 p. m.: a quien no estudia hace 3 días y hace 7.
--   · corazones  cuando se le recargan los 5 corazones del día.
--
-- Cada tipo se prende o apaga en el panel → Notificaciones.
-- =========================================================

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Ajustes: clave secreta (la usa el reloj para llamar a la función) y tipos activos
create table if not exists public.push_ajustes (
  id       integer primary key default 1 check (id = 1),
  secreto  text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  tipos    jsonb not null default '{"tema": true, "racha": true, "inactivo": true, "corazones": true}'::jsonb
);
insert into public.push_ajustes (id) values (1) on conflict (id) do nothing;
alter table public.push_ajustes enable row level security;
-- Sin políticas: nadie la lee desde el sitio

-- Qué aviso automático ya se mandó a quién (para no repetir)
create table if not exists public.push_auto_log (
  usuario  uuid not null references auth.users (id) on delete cascade,
  tipo     text not null,
  clave    text not null,
  creado   timestamptz not null default now(),
  primary key (usuario, tipo, clave)
);
create index if not exists push_auto_log_dia on public.push_auto_log (usuario, creado);
alter table public.push_auto_log enable row level security;

-- Link de una novedad (igual que assets/novedades.js)
create or replace function public.push_link_novedad(n public.novedades)
returns text language sql immutable set search_path = '' as $$
  select case when n.tipo = 'curso' then split_part(n.carpeta, '--', 1) || '/'
    else split_part(n.carpeta, '--', 1) || '/' || coalesce(nullif(split_part(n.carpeta, '--', 2), ''), 'libros')
         || '/tema.html?year=' || coalesce(n.anio, '') || '&tema=' || lpad(coalesce(n.tema, ''), 2, '0') end;
$$;

-- La Edge Function pide los avisos de esta hora
create or replace function public.push_auto_lote(p_secreto text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  aj     public.push_ajustes;
  ahora  timestamp := now() at time zone 'America/Lima';
  hora   integer := extract(hour from now() at time zone 'America/Lima');
  hoy    date := (now() at time zone 'America/Lima')::date;
  inicio timestamptz := ((now() at time zone 'America/Lima')::date)::timestamp at time zone 'America/Lima';
  u      uuid;
  nom    text;
  r      jsonb;
  c      public.corazones;
  lleno  timestamptz;
  ult    date;
  nv     public.novedades;
  cant   integer;
  msgs   jsonb := '[]'::jsonb;
  usados uuid[] := '{}';
begin
  select * into aj from public.push_ajustes where id = 1;
  if aj.secreto is null or p_secreto is distinct from aj.secreto then raise exception 'no autorizado'; end if;
  if hora < 8 or hora > 21 then return jsonb_build_object('mensajes', msgs, 'subs', '{}'::jsonb); end if;

  for u in select distinct s.usuario from public.push_subs s loop
    -- Máximo 2 avisos automáticos al día por alumno
    select count(*) into cant from public.push_auto_log l where l.usuario = u and l.creado >= inicio;
    continue when cant >= 2;
    select coalesce(nullif(trim(p.apodo), ''), split_part(coalesce(p.nombre, ''), ' ', 1), '') into nom
      from public.perfiles p where p.id = u;
    nom := coalesce(nullif(nom, ''), 'cachimbo');

    -- 1) Tema o curso nuevo (últimas 12 h, ya publicado hace 10 min)
    if coalesce((aj.tipos ->> 'tema')::boolean, true) then
      select count(*) into cant from public.novedades n
        where n.creado between now() - interval '12 hours' and now() - interval '10 minutes'
          and not exists (select 1 from public.push_auto_log l where l.usuario = u and l.tipo = 'tema' and l.clave = n.id::text);
      if cant = 1 then
        select n.* into nv from public.novedades n
          where n.creado between now() - interval '12 hours' and now() - interval '10 minutes'
            and not exists (select 1 from public.push_auto_log l where l.usuario = u and l.tipo = 'tema' and l.clave = n.id::text) limit 1;
        msgs := msgs || jsonb_build_object('usuario', u,
          'titulo', case when nv.tipo = 'curso' then 'Nuevo curso: ' || nv.curso else 'Nuevo tema de ' || nv.curso end,
          'cuerpo', case when nv.tipo = 'curso' then 'Ya puedes estudiar ' || nv.curso || '. ¡Entra a verlo!'
                         else coalesce(nullif(nv.nombre, ''), 'Tema ' || coalesce(nv.tema, '')) || '. ¡Entra a practicarlo!' end,
          'link', public.push_link_novedad(nv));
      elsif cant > 1 then
        select string_agg(distinct n.curso, ', ') into nom from public.novedades n
          where n.creado between now() - interval '12 hours' and now() - interval '10 minutes'
            and not exists (select 1 from public.push_auto_log l where l.usuario = u and l.tipo = 'tema' and l.clave = n.id::text);
        msgs := msgs || jsonb_build_object('usuario', u, 'titulo', 'Hay ' || cant || ' temas nuevos',
          'cuerpo', left('De ' || nom, 150) || '. ¡Entra a verlos!', 'link', '');
      end if;
      if cant > 0 then
        insert into public.push_auto_log (usuario, tipo, clave)
          select u, 'tema', n.id::text from public.novedades n
          where n.creado between now() - interval '12 hours' and now() - interval '10 minutes'
          on conflict do nothing;
        continue;
      end if;
    end if;

    -- 2) Racha en peligro (8 p. m.)
    if hora = 20 and coalesce((aj.tipos ->> 'racha')::boolean, true)
       and not exists (select 1 from public.push_auto_log l where l.usuario = u and l.tipo = 'racha' and l.clave = hoy::text) then
      r := public.calc_racha(u);
      if coalesce((r ->> 'actual')::int, 0) >= 2 and not coalesce((r ->> 'cumplido_hoy')::boolean, false) then
        msgs := msgs || jsonb_build_object('usuario', u,
          'titulo', 'Tu racha de ' || (r ->> 'actual') || ' días está en peligro',
          'cuerpo', 'Te faltan ' || greatest(1, coalesce((r ->> 'meta')::int, 10) - coalesce((r ->> 'hoy')::int, 0))
                    || ' preguntas hoy para mantenerla. ¡Tú puedes, ' || nom || '!',
          'link', '');
        insert into public.push_auto_log (usuario, tipo, clave) values (u, 'racha', hoy::text) on conflict do nothing;
        continue;
      end if;
    end if;

    -- 3) No entra hace 3 o 7 días (6 p. m.)
    if hora = 18 and coalesce((aj.tipos ->> 'inactivo')::boolean, true) then
      select max(a.fecha) into ult from public.actividad a where a.usuario = u and a.preguntas > 0;
      if ult is not null and hoy - ult in (3, 7)
         and not exists (select 1 from public.push_auto_log l where l.usuario = u and l.tipo = 'inactivo' and l.clave = ult::text || '-' || (hoy - ult)) then
        msgs := msgs || jsonb_build_object('usuario', u,
          'titulo', case when hoy - ult = 3 then 'Te extrañamos, ' || nom else 'Ya pasó una semana, ' || nom end,
          'cuerpo', case when hoy - ult = 3 then 'Tu búho te espera. Con 10 preguntas hoy vuelves al ritmo.'
                         else 'Tu examen se acerca. Entra 10 minutos y retoma donde te quedaste.' end,
          'link', '');
        insert into public.push_auto_log (usuario, tipo, clave) values (u, 'inactivo', ult::text || '-' || (hoy - ult)) on conflict do nothing;
        continue;
      end if;
    end if;

    -- 4) Corazones llenos otra vez (se recargan 1 cada 3 h)
    if coalesce((aj.tipos ->> 'corazones')::boolean, true) then
      select * into c from public.corazones z where z.usuario = u;
      if found and c.dia = hoy and c.quedan < 5 then
        lleno := c.recarga + (5 - c.quedan) * interval '3 hours';
        if lleno <= now() and lleno > now() - interval '70 minutes'
           and not exists (select 1 from public.push_auto_log l where l.usuario = u and l.tipo = 'corazones' and l.clave = hoy::text) then
          msgs := msgs || jsonb_build_object('usuario', u, 'titulo', 'Tus corazones están llenos',
            'cuerpo', 'Ya tienes 5 corazones otra vez. ¡Vuelve a practicar, ' || nom || '!', 'link', '');
          insert into public.push_auto_log (usuario, tipo, clave) values (u, 'corazones', hoy::text) on conflict do nothing;
        end if;
      end if;
    end if;
  end loop;

  select coalesce(array_agg(distinct (m ->> 'usuario')::uuid), '{}') into usados from jsonb_array_elements(msgs) m;
  return jsonb_build_object('mensajes', msgs, 'subs', coalesce((
    select jsonb_object_agg(x.usuario, x.lista) from (
      select s.usuario, jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth)) lista
      from public.push_subs s where s.usuario = any (usados) group by s.usuario) x), '{}'::jsonb));
end $$;
revoke all on function public.push_auto_lote(text) from public;
grant execute on function public.push_auto_lote(text) to anon, authenticated;

-- La Edge Function borra los equipos que ya no existen
create or replace function public.push_auto_limpiar(p_secreto text, p_endpoints text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_secreto is distinct from (select secreto from public.push_ajustes where id = 1) then raise exception 'no autorizado'; end if;
  delete from public.push_subs where endpoint = any (p_endpoints);
end $$;
revoke all on function public.push_auto_limpiar(text, text[]) from public;
grant execute on function public.push_auto_limpiar(text, text[]) to anon, authenticated;

-- Panel: ver y cambiar qué avisos automáticos están prendidos
create or replace function public.push_auto_tipos(p_tipos jsonb default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t jsonb;
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  if p_tipos is not null then
    update public.push_ajustes set tipos = tipos || jsonb_strip_nulls(jsonb_build_object(
      'tema', (p_tipos ->> 'tema')::boolean, 'racha', (p_tipos ->> 'racha')::boolean,
      'inactivo', (p_tipos ->> 'inactivo')::boolean, 'corazones', (p_tipos ->> 'corazones')::boolean)) where id = 1;
  end if;
  select tipos into t from public.push_ajustes where id = 1;
  return jsonb_build_object('tipos', t, 'hoy', (
    select coalesce(jsonb_object_agg(tipo, n), '{}'::jsonb) from (
      select l.tipo, count(*) n from public.push_auto_log l
      where l.creado > now() - interval '7 days' group by l.tipo) x));
end $$;
revoke all on function public.push_auto_tipos(jsonb) from public, anon;
grant execute on function public.push_auto_tipos(jsonb) to authenticated;

-- El reloj: cada hora en punto llama a la Edge Function
do $$ begin
  if exists (select 1 from cron.job where jobname = 'mc-push-auto') then perform cron.unschedule('mc-push-auto'); end if;
end $$;
select cron.schedule('mc-push-auto', '0 * * * *', $cron$
  select net.http_post(
    url := 'https://tvcrhogybfxphpzpjnis.supabase.co/functions/v1/enviar-push',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('accion', 'auto', 'secreto', (select secreto from public.push_ajustes where id = 1))
  );
$cron$);
