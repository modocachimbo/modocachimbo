-- =========================================================
-- Modo Cachimbo · El Top duelos muestra el perfil de cada alumno
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 73-corona-se-gana-al-cerrar.sql. (Reemplaza al 70 del PR #220.)
--
--   · ranking_duelos ahora devuelve lo mismo que el Top simulacro:
--     foto, avatar (búho), marco, fondo, código, XP total, pin y V.
--     Así en duelo.html sale su foto con marco, nivel y pin, y al
--     tocarla se abre su tarjeta, igual que en los otros tops.
--   · El pin pasa por pin_visible: la corona sale solo si es suya y
--     se la puso en su vitrina.
-- =========================================================

drop function if exists public.ranking_duelos();
create function public.ranking_duelos()
returns table (puesto integer, apodo text, puntaje numeric, yo boolean, xp integer, foto text, avatar text, marco text, fondo text, codigo integer, xp_total bigint, pin text, admin boolean)
language sql volatile security definer set search_path = '' as $$
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
         coalesce(xs.xp, 0)::integer,
         case when p.foto_url like 'https://%' then p.foto_url end,
         c.puesto ->> 'avatar',
         c.puesto ->> 'marco',
         c.puesto ->> 'racha',
         public.jugador_codigo(o.usuario),
         public.jugador_xp_total(o.usuario),
         public.pin_visible(o.usuario, c.puesto -> 'pines' ->> 0),
         public.jugador_verificado(o.usuario)
  from orden o
  left join public.perfiles p on p.id = o.usuario
  left join public.xp_semana xs on xs.usuario = o.usuario and xs.semana = public.cz_lunes()
  left join public.coleccion_puesto c on c.usuario = o.usuario
  where o.puesto <= 10 or o.usuario = auth.uid()
  order by o.puesto;
$$;
revoke all on function public.ranking_duelos() from public, anon;
grant execute on function public.ranking_duelos() to authenticated;
