-- =========================================================
-- Modo Cachimbo · Cursos populares de la semana
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita haber corrido antes supabase/04-progreso.sql.
--
-- Devuelve los cursos más estudiados en los últimos 7 días
-- (cuántos alumnos distintos practicaron Libro, Repaso o Fijas),
-- solo el orden: no dice quién estudió ni cuántos fueron.
-- =========================================================

create index if not exists progreso_actualizado on public.progreso (actualizado);

create or replace function public.cursos_populares()
returns table (carpeta text, puesto integer)
language sql stable security definer set search_path = '' as $$
  select x.carpeta, (row_number() over (order by x.alumnos desc, x.ultima desc))::integer
  from (
    select g.carpeta, count(distinct g.usuario) as alumnos, max(g.actualizado) as ultima
    from public.progreso g
    where g.actualizado > now() - interval '7 days'
      and g.tipo in ('libro', 'repaso', 'fijas')
      and g.carpeta ~ '^[a-z0-9-]{2,40}$'
    group by g.carpeta
  ) x
  order by 2
  limit 8;
$$;
revoke all on function public.cursos_populares() from public, anon;
grant execute on function public.cursos_populares() to authenticated;
