-- =========================================================
-- Modo Cachimbo · Quién mandó cada reporte (para el panel)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita haber corrido antes supabase/07-reportes.sql.
--
-- El panel cruza cada reporte de la hoja con esta lista (misma
-- pregunta y hora parecida) y muestra "Reportado por: apodo".
-- Solo el administrador puede leerla.
-- =========================================================

create or replace function public.reportes_autores()
returns table (carpeta text, anio text, tema text, pregunta integer, creado timestamptz,
               email text, nombre text, apodo text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  return query
    select r.carpeta, r.anio, r.tema, r.pregunta, r.creado,
           u.email::text, p.nombre, p.apodo
    from public.reportes_alumno r
    join auth.users u on u.id = r.usuario
    left join public.perfiles p on p.id = r.usuario
    where r.creado > now() - interval '180 days'
    order by r.creado desc
    limit 3000;
end $$;
revoke all on function public.reportes_autores() from public, anon;
grant execute on function public.reportes_autores() to authenticated;
