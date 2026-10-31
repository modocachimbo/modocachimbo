-- =========================================================
-- Modo Cachimbo · El pin de cada alumno en los tops
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 38-ver-jugador.sql y 29-ranking-duelos-rango.sql.
--
--   · Los tops (ranking_xp, ranking_simulacro y ranking_duelos) mandan
--     además el primer pin de la vitrina de cada alumno (pin) y si es
--     del equipo (admin). Al lado del nombre sale el mismo pin de su
--     tarjeta: el de verificado si es admin; si no, su primer pin.
--   · Nunca se manda el correo.
-- =========================================================

-- ¿Lleva el pin de verificado? (admins y equipo activo, igual que mi_tarjeta)
create or replace function public.jugador_verificado(u uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from auth.users x join public.admins a on lower(a.email) = lower(x.email) where x.id = u)
      or exists (select 1 from auth.users x join public.equipo e on e.email = lower(x.email) and e.activo where x.id = u);
$$;
revoke all on function public.jugador_verificado(uuid) from public, anon, authenticated;

-- Top de la semana (XP): igual que en 38, más pin y admin
create or replace function public.ranking_xp()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); lunes date := public.cz_lunes(); top jsonb; yo jsonb; total integer;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select count(*) into total from public.xp_semana where semana = lunes and xp > 0;
  select coalesce(jsonb_agg(t order by t.puesto), '[]'::jsonb) into top from (
    select row_number() over (order by x.xp desc, x.usuario) as puesto, public.duelo_apodo(x.usuario) as apodo, x.xp, x.usuario = uid as yo,
           (select p.foto_url from public.perfiles p where p.id = x.usuario and p.foto_url like 'https://%') as foto,
           c.puesto ->> 'avatar' as avatar, c.puesto ->> 'marco' as marco, c.puesto ->> 'racha' as fondo,
           public.jugador_codigo(x.usuario) as codigo, public.jugador_xp_total(x.usuario) as xp_total,
           c.puesto -> 'pines' ->> 0 as pin, public.jugador_verificado(x.usuario) as admin
    from public.xp_semana x
    left join public.coleccion_puesto c on c.usuario = x.usuario
    where x.semana = lunes and x.xp > 0 order by x.xp desc, x.usuario limit 10
  ) t;
  select jsonb_build_object('puesto', 1 + (select count(*) from public.xp_semana o where o.semana = lunes and (o.xp > x.xp or (o.xp = x.xp and o.usuario < x.usuario))), 'xp', x.xp,
           'codigo', public.jugador_codigo(uid), 'xp_total', public.jugador_xp_total(uid))
    into yo from public.xp_semana x where x.usuario = uid and x.semana = lunes and x.xp > 0;
  return jsonb_build_object('top', top, 'yo', yo, 'total', total);
end $$;
revoke all on function public.ranking_xp() from public, anon;
grant execute on function public.ranking_xp() to authenticated;

-- Top del Simulacro: igual que en 38, más pin y admin (cambia lo que devuelve)
drop function if exists public.ranking_simulacro();
create function public.ranking_simulacro()
returns table (puesto integer, apodo text, puntaje numeric, yo boolean, xp integer, foto text, avatar text, marco text, fondo text, codigo integer, xp_total bigint, pin text, admin boolean)
language sql volatile security definer set search_path = '' as $$
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
         coalesce(xs.xp, 0)::integer,
         case when p.foto_url like 'https://%' then p.foto_url end,
         c.puesto ->> 'avatar',
         c.puesto ->> 'marco',
         c.puesto ->> 'racha',
         public.jugador_codigo(o.usuario),
         public.jugador_xp_total(o.usuario),
         c.puesto -> 'pines' ->> 0,
         public.jugador_verificado(o.usuario)
  from orden o
  left join public.perfiles p on p.id = o.usuario
  left join public.xp_semana xs on xs.usuario = o.usuario and xs.semana = public.cz_lunes()
  left join public.coleccion_puesto c on c.usuario = o.usuario
  where o.puesto <= 10 or o.usuario = auth.uid()
  order by o.puesto;
$$;
revoke all on function public.ranking_simulacro() from public, anon;
grant execute on function public.ranking_simulacro() to authenticated;

-- Top de duelos: igual que en 29, más pin y admin (cambia lo que devuelve)
drop function if exists public.ranking_duelos();
create function public.ranking_duelos()
returns table (puesto integer, apodo text, puntaje numeric, yo boolean, xp integer, pin text, admin boolean)
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
         coalesce(xs.xp, 0)::integer,
         c.puesto -> 'pines' ->> 0,
         public.jugador_verificado(o.usuario)
  from orden o
  left join public.xp_semana xs on xs.usuario = o.usuario and xs.semana = public.cz_lunes()
  left join public.coleccion_puesto c on c.usuario = o.usuario
  where o.puesto <= 10 or o.usuario = auth.uid()
  order by o.puesto;
$$;
revoke all on function public.ranking_duelos() from public, anon;
grant execute on function public.ranking_duelos() to authenticated;
