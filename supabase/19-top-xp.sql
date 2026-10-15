-- =========================================================
-- 19 · Panel → Top XP: ranking semanal de experiencia (XP)
-- Correr una vez en Supabase → SQL Editor (se puede repetir sin problema).
-- Va después de 16-corazones.sql y 18-ciclos-ayudantes.sql.
-- Agrega también el permiso "Top XP" para ayudantes.
-- =========================================================
create or replace function public.permisos_validos()
returns text[] language sql immutable set search_path = '' as $$
  select array['reportes','editar','borrar','corr','subir','examen','vocab','cursos',
               'perfil','frases','alertas','tutorial','alumnos','simulacro','codigos','ciclos','topxp'];
$$;

-- Los 50 que más XP ganaron en la semana del día p_dia (lunes a domingo, hora de Lima)
create or replace function public.ranking_xp_admin(p_dia date default null)
returns table (puesto integer, nombre text, apodo text, email text, carrera text, xp integer, alumnos integer, xp_total bigint, desde date)
language plpgsql stable security definer set search_path = '' as $$
declare
  lunes date;
begin
  if not public.puede('topxp') then raise exception 'no autorizado'; end if;
  lunes := (date_trunc('week', coalesce(p_dia, (now() at time zone 'America/Lima')::date)::timestamp))::date;
  return query
    with sem as (
      select x.usuario, x.xp from public.xp_semana x where x.semana = lunes and x.xp > 0
    ), orden as (
      select s.*, (row_number() over (order by s.xp desc, s.usuario))::integer as puesto from sem s
    )
    select o.puesto, p.nombre, p.apodo, u.email::text, p.carrera, o.xp,
           (select count(*) from sem)::integer, (select coalesce(sum(s.xp), 0) from sem s)::bigint, lunes
    from orden o
    join auth.users u on u.id = o.usuario
    left join public.perfiles p on p.id = o.usuario
    where o.puesto <= 50
    order by o.puesto;
end $$;
revoke all on function public.ranking_xp_admin(date) from public, anon;
grant execute on function public.ranking_xp_admin(date) to authenticated;
