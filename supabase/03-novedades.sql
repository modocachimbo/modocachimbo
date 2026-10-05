-- =========================================================
-- Modo Cachimbo · Etapa 5: avisos de temas y cursos nuevos
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita haber corrido antes supabase/02-racha.sql (tabla admins).
--
-- Cómo funciona:
--   · Cuando subes un tema nuevo desde el panel (no Fijas, no
--     "agregar" ni "reemplazar"), el panel guarda un aviso aquí.
--     Si es el primer tema del curso, el aviso dice "curso nuevo".
--   · Los alumnos lo ven desde 10 minutos después (lo que tarda
--     la web en publicarse) y durante 30 días, hasta que lo abren.
-- =========================================================

create table if not exists public.novedades (
  id       bigint generated always as identity primary key,
  tipo     text not null check (tipo in ('tema', 'curso')),
  carpeta  text not null,          -- ej.: algebra
  curso    text not null,          -- ej.: Álgebra
  area     text,                   -- ej.: matematica
  anio     text,                   -- ej.: 2027-I
  tema     text,                   -- ej.: 05
  nombre   text,                   -- nombre del tema
  creado   timestamptz not null default now()
);
alter table public.novedades enable row level security;
-- Sin políticas: el sitio solo entra con las funciones de abajo

-- Qué avisos ya abrió cada alumno
create table if not exists public.novedades_vistas (
  usuario  uuid not null references auth.users (id) on delete cascade,
  novedad  bigint not null references public.novedades (id) on delete cascade,
  visto    timestamptz not null default now(),
  primary key (usuario, novedad)
);
alter table public.novedades_vistas enable row level security;

-- ¿El que está conectado es administrador?
create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where lower(a.email) = lower(auth.jwt() ->> 'email'));
$$;
revoke all on function public.es_admin() from public, anon;
grant execute on function public.es_admin() to authenticated;

-- Avisos que el alumno todavía no abrió
create or replace function public.mis_novedades()
returns table (id bigint, tipo text, carpeta text, curso text, area text, anio text, tema text, nombre text, creado timestamptz)
language sql stable security definer set search_path = '' as $$
  select n.id, n.tipo, n.carpeta, n.curso, n.area, n.anio, n.tema, n.nombre, n.creado
  from public.novedades n
  where auth.uid() is not null
    and n.creado > now() - interval '30 days'
    and n.creado <= now() - interval '10 minutes'
    and not exists (select 1 from public.novedades_vistas v where v.usuario = auth.uid() and v.novedad = n.id)
  order by n.creado desc
  limit 30;
$$;
revoke all on function public.mis_novedades() from public, anon;
grant execute on function public.mis_novedades() to authenticated;

-- El alumno abrió estos avisos
create or replace function public.marcar_novedades(ids bigint[])
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.novedades_vistas (usuario, novedad)
  select auth.uid(), n.id from public.novedades n where n.id = any (ids[1:50])
  on conflict do nothing;
end $$;
revoke all on function public.marcar_novedades(bigint[]) from public, anon;
grant execute on function public.marcar_novedades(bigint[]) to authenticated;

-- Panel: crear un aviso (solo administradores)
create or replace function public.crear_novedad(
  p_tipo text, p_carpeta text, p_curso text, p_area text, p_anio text, p_tema text, p_nombre text)
returns bigint language plpgsql volatile security definer set search_path = '' as $$
declare nuevo bigint;
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  -- Si ya había un aviso del mismo tema o curso, se reemplaza
  delete from public.novedades n
   where n.carpeta = p_carpeta
     and ((p_tipo = 'curso' and n.tipo = 'curso')
       or (n.tipo = 'tema' and n.anio is not distinct from p_anio and n.tema is not distinct from p_tema));
  insert into public.novedades (tipo, carpeta, curso, area, anio, tema, nombre)
  values (p_tipo, left(p_carpeta, 40), left(p_curso, 60), left(p_area, 40), left(p_anio, 12), left(p_tema, 6), left(p_nombre, 120))
  returning id into nuevo;
  return nuevo;
end $$;
revoke all on function public.crear_novedad(text, text, text, text, text, text, text) from public, anon;
grant execute on function public.crear_novedad(text, text, text, text, text, text, text) to authenticated;

-- Panel: quitar un aviso (solo administradores)
create or replace function public.borrar_novedad(p_id bigint)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  delete from public.novedades where id = p_id;
end $$;
revoke all on function public.borrar_novedad(bigint) from public, anon;
grant execute on function public.borrar_novedad(bigint) to authenticated;
