-- =========================================================
-- Modo Cachimbo · Rango en el Top de duelos
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 10-duelos.sql y 16-corazones.sql.
--
--   · ranking_duelos() ahora también devuelve el XP de la semana de
--     cada alumno (xp), para mostrar su rango (Zafiro, Esmeralda, …)
--     en el podio del Top de duelos. Lo demás queda igual.
-- =========================================================

-- Cambia lo que devuelve, por eso se borra y se vuelve a crear
drop function if exists public.ranking_duelos();

create function public.ranking_duelos()
returns table (puesto integer, apodo text, puntaje numeric, yo boolean, xp integer)
language sql stable security definer set search_path = '' as $$
  with semana as (
    select (date_trunc('week', now() at time zone 'America/Lima')) at time zone 'America/Lima' as desde
  ), ganados as (
    select (public.duelo_resultado(d)).ganador as usuario, d.creado
    from public.duelos d, semana
    where d.creado >= semana.desde
  ), cuenta as (
    select g.usuario, count(*) as ganados, min(g.creado) as primero
    from ganados g where g.usuario is not null group by g.usuario
  ), orden as (
    select c.usuario, c.ganados, (row_number() over (order by c.ganados desc, c.primero))::integer as puesto
    from cuenta c
  )
  select o.puesto, public.duelo_apodo(o.usuario), o.ganados::numeric, o.usuario = auth.uid(),
         coalesce(xs.xp, 0)::integer
  from orden o
  left join public.xp_semana xs on xs.usuario = o.usuario and xs.semana = public.cz_lunes()
  where o.puesto <= 10 or o.usuario = auth.uid()
  order by o.puesto;
$$;
revoke all on function public.ranking_duelos() from public, anon;
grant execute on function public.ranking_duelos() to authenticated;
