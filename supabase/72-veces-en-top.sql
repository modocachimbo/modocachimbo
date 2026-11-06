-- =========================================================
-- Modo Cachimbo · Veces en el top (tarjeta del perfil)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 71-amigos.sql (y 61-pines-corona-top3.sql).
--
--   · jugador_tops(u): cuántas veces quedó en un top 10 semanal,
--     sumando los tres tops (XP, simulacro y duelos) de todas las
--     semanas, con las mismas reglas de ranking_xp, ranking_simulacro
--     y ranking_duelos. La semana actual cuenta si hoy está en el top.
--   · ver_amigo manda además 'tops' (la tarjeta lo muestra en
--     «Veces en top», donde antes decía «Mejor»).
-- =========================================================

create or replace function public.jugador_tops(u uuid)
returns integer language plpgsql stable security definer set search_path = '' as $$
declare n_xp integer; n_sim integer; n_duelo integer;
begin
  if u is null then return 0; end if;
  -- Top de XP: semanas con XP en las que menos de 10 lo superaban
  select count(*) into n_xp from public.xp_semana x
  where x.usuario = u and x.xp > 0
    and (select count(*) from public.xp_semana o
         where o.semana = x.semana and o.xp > 0 and (o.xp > x.xp or (o.xp = x.xp and o.usuario < x.usuario))) < 10;

  -- Top del simulacro: mejor puntaje de la semana (primer intento de simulacros no personalizados)
  with intentos as (
    select x.usuario, x.puntaje, x.creado,
           (date_trunc('week', x.creado at time zone 'America/Lima'))::date as semana
    from public.simulacro_intentos x
    join public.simulacros s on s.id = x.simulacro and not s.personalizado
    where x.primero
  ), mias as (
    select distinct semana from intentos where usuario = u
  ), mejores as (
    select i.semana, i.usuario, max(i.puntaje) as puntaje, min(i.creado) as primero
    from intentos i join mias m on m.semana = i.semana
    group by i.semana, i.usuario
  ), orden as (
    select usuario, row_number() over (partition by semana order by puntaje desc, primero) as puesto from mejores
  )
  select count(*) into n_sim from orden where usuario = u and puesto <= 10;

  -- Top de duelos: duelos ganados en la semana
  with ganados as (
    select (public.duelo_resultado(d)).ganador as usuario, d.creado,
           (date_trunc('week', d.creado at time zone 'America/Lima'))::date as semana
    from public.duelos d
  ), mias as (
    select distinct semana from ganados where usuario = u
  ), cuenta as (
    select g.semana, g.usuario, count(*) as n, min(g.creado) as primero
    from ganados g join mias m on m.semana = g.semana
    where g.usuario is not null group by g.semana, g.usuario
  ), orden as (
    select usuario, row_number() over (partition by semana order by n desc, primero) as puesto from cuenta
  )
  select count(*) into n_duelo from orden where usuario = u and puesto <= 10;

  return coalesce(n_xp, 0) + coalesce(n_sim, 0) + coalesce(n_duelo, 0);
end $$;
revoke all on function public.jugador_tops(uuid) from public, anon, authenticated;

-- ver_amigo: igual que en 71, más 'tops'
create or replace function public.ver_amigo(p_codigo integer default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); u uuid; r jsonb; f public.amistades; amigo boolean; p record;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  u := case when p_codigo is null then uid else public.usuario_de_codigo(p_codigo) end;
  if u is null then return null; end if;
  r := public.ver_jugador(public.jugador_codigo(u));
  f := public.amistad_entre(uid, u);
  amigo := f.estado = 'aceptada';
  r := r || jsonb_build_object(
    'relacion', case when u = uid then 'yo' when amigo then 'amigo'
                     when f.estado = 'pendiente' and f.de = uid then 'enviada'
                     when f.estado = 'pendiente' then 'recibida' else 'nada' end,
    'desde', case when amigo then coalesce(f.respondido, f.creado) end,
    'destacado', case when amigo then (case when f.de = uid then f.fav_de else f.fav_para end) end,
    'tops', public.jugador_tops(u));
  if u = uid or amigo then
    select pf.carrera, pf.modalidad, pf.fecha_examen into p from public.perfiles pf where pf.id = u;
    r := r || jsonb_build_object('carrera', p.carrera, 'modalidad', p.modalidad, 'fecha_examen', p.fecha_examen,
      'tiene', coalesce((select jsonb_agg(i.id) from public.coleccion_item i where public.col_tiene(u, i.id)), '[]'::jsonb),
      'mi_xp_semana', coalesce((select x.xp from public.xp_semana x where x.usuario = uid and x.semana = public.cz_lunes()), 0));
  end if;
  return r;
end $$;
revoke all on function public.ver_amigo(integer) from public, anon;
grant execute on function public.ver_amigo(integer) to authenticated;
