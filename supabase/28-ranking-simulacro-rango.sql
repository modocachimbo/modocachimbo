-- =========================================================
-- Modo Cachimbo · Rango en el Top simulacro del inicio
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 09-simulacros.sql, 16-corazones.sql y 27-simulacro-personalizado.sql.
--
--   · ranking_simulacro() ahora también devuelve el XP de la semana de
--     cada alumno (xp), para mostrar su rango (Zafiro, Esmeralda, …)
--     junto a su nombre en el Top simulacro. Lo demás queda igual.
-- =========================================================

-- Cambia lo que devuelve, por eso se borra y se vuelve a crear
drop function if exists public.ranking_simulacro();

create function public.ranking_simulacro()
returns table (puesto integer, apodo text, puntaje numeric, yo boolean, xp integer)
language sql stable security definer set search_path = '' as $$
  with semana as (
    select (date_trunc('week', now() at time zone 'America/Lima')) at time zone 'America/Lima' as desde
  ), mejores as (
    select x.usuario, max(x.puntaje) as puntaje, min(x.creado) filter (where true) as primero
    from public.simulacro_intentos x
    join public.simulacros s on s.id = x.simulacro and not s.personalizado, semana
    where x.creado >= semana.desde and x.primero
    group by x.usuario
  ), orden as (
    select m.usuario, m.puntaje,
           (row_number() over (order by m.puntaje desc, m.primero))::integer as puesto
    from mejores m
  )
  select o.puesto,
         coalesce(nullif(trim(p.apodo), ''), split_part(coalesce(nullif(trim(p.nombre), ''), 'Alumno'), ' ', 1)),
         o.puntaje,
         o.usuario = auth.uid(),
         coalesce(xs.xp, 0)::integer
  from orden o
  left join public.perfiles p on p.id = o.usuario
  left join public.xp_semana xs on xs.usuario = o.usuario and xs.semana = public.cz_lunes()
  where o.puesto <= 10 or o.usuario = auth.uid()
  order by o.puesto;
$$;
revoke all on function public.ranking_simulacro() from public, anon;
grant execute on function public.ranking_simulacro() to authenticated;
