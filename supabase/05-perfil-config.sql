-- =========================================================
-- Modo Cachimbo · Perfil del alumno editable desde el panel
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita haber corrido antes supabase/02-racha.sql (tabla admins)
-- y supabase/03-novedades.sql (función es_admin).
--
--   · ajustes: configuración del sitio que se edita en el panel.
--     clave 'perfil' = bloques, carreras, puntos y preguntas extra.
--     Todos la pueden leer; solo los administradores la cambian.
--   · perfiles.extra: las respuestas de cada alumno a las
--     preguntas extra.
-- =========================================================

create table if not exists public.ajustes (
  clave       text primary key check (clave in ('perfil')),
  valor       jsonb not null,
  actualizado timestamptz not null default now()
);
alter table public.ajustes enable row level security;
drop policy if exists "ajustes: ver" on public.ajustes;
create policy "ajustes: ver" on public.ajustes for select to anon, authenticated using (true);
-- Nadie escribe directo: solo con guardar_ajuste()

create or replace function public.guardar_ajuste(p_clave text, p_valor jsonb)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  if pg_column_size(p_valor) > 60000 then raise exception 'demasiado grande'; end if;
  insert into public.ajustes (clave, valor, actualizado) values (p_clave, p_valor, now())
  on conflict (clave) do update set valor = excluded.valor, actualizado = now();
end $$;
revoke all on function public.guardar_ajuste(text, jsonb) from public, anon;
grant execute on function public.guardar_ajuste(text, jsonb) to authenticated;

-- Respuestas a las preguntas extra (cada alumno edita las suyas, como el resto del perfil)
alter table public.perfiles add column if not exists extra jsonb not null default '{}'::jsonb;
alter table public.perfiles drop constraint if exists perfiles_extra_tamano;
alter table public.perfiles add constraint perfiles_extra_tamano
  check (jsonb_typeof(extra) = 'object' and pg_column_size(extra) <= 4000);

-- Panel: respuestas extra de todos los alumnos (solo administradores)
create or replace function public.alumnos_extra()
returns table (email text, extra jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  return query
    select u.email::text, coalesce(p.extra, '{}'::jsonb)
    from auth.users u left join public.perfiles p on p.id = u.id;
end $$;
revoke all on function public.alumnos_extra() from public, anon;
grant execute on function public.alumnos_extra() to authenticated;
