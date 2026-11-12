-- =========================================================
-- Modo Cachimbo · Notificaciones push (Panel → Web → Notificaciones)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 03-novedades.sql (es_admin).
--
--   · push_subs: un celular o PC que aceptó notificaciones (una fila por
--     equipo). La guarda el propio alumno con push_guardar().
--   · push_envios: historial de lo que mandaste desde el panel.
--   · El envío lo hace la Edge Function «enviar-push»
--     (supabase/funciones/enviar-push/index.ts), que entra con la sesión
--     del admin y usa push_destinos / push_limpiar / push_registrar.
-- =========================================================

create table if not exists public.push_subs (
  endpoint  text primary key check (char_length(endpoint) <= 1000),
  usuario   uuid not null references auth.users (id) on delete cascade,
  p256dh    text not null check (char_length(p256dh) <= 200),
  auth      text not null check (char_length(auth) <= 100),
  equipo    text check (char_length(equipo) <= 20),
  creado    timestamptz not null default now(),
  visto     timestamptz not null default now()
);
create index if not exists push_subs_usuario on public.push_subs (usuario);
alter table public.push_subs enable row level security;
-- Nadie lee la tabla directo: todo pasa por las funciones de abajo

create table if not exists public.push_envios (
  id        bigint generated always as identity primary key,
  titulo    text not null,
  cuerpo    text not null,
  link      text,
  para      text not null default 'todos',
  enviados  int not null default 0,
  fallidos  int not null default 0,
  por       text,
  creado    timestamptz not null default now()
);
alter table public.push_envios enable row level security;

-- El alumno guarda (o renueva) su equipo
create or replace function public.push_guardar(p_endpoint text, p_p256dh text, p_auth text, p_equipo text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;
  if p_endpoint !~ '^https://' then raise exception 'endpoint no válido'; end if;
  insert into public.push_subs (endpoint, usuario, p256dh, auth, equipo)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth, left(p_equipo, 20))
  on conflict (endpoint) do update
    set usuario = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth,
        equipo = coalesce(excluded.equipo, public.push_subs.equipo), visto = now();
end $$;
revoke all on function public.push_guardar(text, text, text, text) from public, anon;
grant execute on function public.push_guardar(text, text, text, text) to authenticated;

-- El alumno apaga las notificaciones de este equipo
create or replace function public.push_quitar(p_endpoint text)
returns void language sql security definer set search_path = '' as $$
  delete from public.push_subs where endpoint = p_endpoint and usuario = auth.uid();
$$;
revoke all on function public.push_quitar(text) from public, anon;
grant execute on function public.push_quitar(text) to authenticated;

-- Panel: cuántos equipos y alumnos tienen activadas las notificaciones + últimos envíos
create or replace function public.push_resumen()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  return jsonb_build_object(
    'equipos', (select count(*) from public.push_subs),
    'alumnos', (select count(distinct usuario) from public.push_subs),
    'mios', (select count(*) from public.push_subs where usuario = auth.uid()),
    'envios', coalesce((select jsonb_agg(e order by e.creado desc) from (
      select id, titulo, cuerpo, link, para, enviados, fallidos, por, creado
      from public.push_envios order by creado desc limit 30) e), '[]'::jsonb));
end $$;
revoke all on function public.push_resumen() from public, anon;
grant execute on function public.push_resumen() to authenticated;

-- Edge Function: a quién mandar (todos, o solo los equipos del admin para probar)
create or replace function public.push_destinos(p_solo_mio boolean default false)
returns table (endpoint text, p256dh text, auth text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  return query select s.endpoint, s.p256dh, s.auth from public.push_subs s
    where not p_solo_mio or s.usuario = auth.uid();
end $$;
revoke all on function public.push_destinos(boolean) from public, anon;
grant execute on function public.push_destinos(boolean) to authenticated;

-- Edge Function: borra los equipos que ya no existen (desinstalaron o quitaron el permiso)
create or replace function public.push_limpiar(p_endpoints text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  delete from public.push_subs where endpoint = any (p_endpoints);
end $$;
revoke all on function public.push_limpiar(text[]) from public, anon;
grant execute on function public.push_limpiar(text[]) to authenticated;

-- Edge Function: guarda el envío en el historial
create or replace function public.push_registrar(p_titulo text, p_cuerpo text, p_link text, p_para text, p_enviados int, p_fallidos int)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  insert into public.push_envios (titulo, cuerpo, link, para, enviados, fallidos, por)
  values (left(p_titulo, 80), left(p_cuerpo, 240), left(p_link, 600), p_para, p_enviados, p_fallidos, auth.jwt() ->> 'email');
end $$;
revoke all on function public.push_registrar(text, text, text, text, int, int) from public, anon;
grant execute on function public.push_registrar(text, text, text, text, int, int) to authenticated;
