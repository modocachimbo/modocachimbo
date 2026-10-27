-- =========================================================
-- Modo Cachimbo · Ver el perfil de otro alumno desde los tops
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 32-perfil-y-tops.sql, 36-tarjeta-jugador.sql y 17-meta-racha.sql.
--
--   · Los tops (ranking_xp y ranking_simulacro) mandan además el ID de
--     5 dígitos y el XP total (para el nivel) de cada alumno.
--   · ver_jugador(ID): la tarjeta de un alumno (apodo, foto, lo que
--     lleva puesto, nivel, racha, XP de la semana, colección e ID).
--     Nunca manda el correo.
-- =========================================================

-- ID de un alumno (se lo crea si aún no tiene)
create or replace function public.jugador_codigo(u uuid)
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare cod integer; i integer := 0;
begin
  select j.codigo into cod from public.jugador_id j where j.usuario = u;
  while cod is null and i < 50 loop
    i := i + 1;
    begin
      insert into public.jugador_id (usuario, codigo) values (u, 10000 + floor(random() * 89999)::integer) returning codigo into cod;
    exception when unique_violation then
      select j.codigo into cod from public.jugador_id j where j.usuario = u;
    end;
  end loop;
  return cod;
end $$;
revoke all on function public.jugador_codigo(uuid) from public, anon, authenticated;

create or replace function public.jugador_xp_total(u uuid)
returns bigint language sql stable security definer set search_path = '' as $$
  select coalesce(sum(x.xp), 0)::bigint from public.xp_semana x where x.usuario = u;
$$;
revoke all on function public.jugador_xp_total(uuid) from public, anon, authenticated;

-- Top de la semana (XP): igual que en 32, más codigo y xp_total
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
           public.jugador_codigo(x.usuario) as codigo, public.jugador_xp_total(x.usuario) as xp_total
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

-- Top del Simulacro: igual que en 32, más codigo y xp_total (cambia lo que devuelve)
drop function if exists public.ranking_simulacro();
create function public.ranking_simulacro()
returns table (puesto integer, apodo text, puntaje numeric, yo boolean, xp integer, foto text, avatar text, marco text, fondo text, codigo integer, xp_total bigint)
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
         public.jugador_xp_total(o.usuario)
  from orden o
  left join public.perfiles p on p.id = o.usuario
  left join public.xp_semana xs on xs.usuario = o.usuario and xs.semana = public.cz_lunes()
  left join public.coleccion_puesto c on c.usuario = o.usuario
  where o.puesto <= 10 or o.usuario = auth.uid()
  order by o.puesto;
$$;
revoke all on function public.ranking_simulacro() from public, anon;
grant execute on function public.ranking_simulacro() to authenticated;

-- La tarjeta de un alumno por su ID
create or replace function public.ver_jugador(p_codigo integer)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid; r jsonb; correo text;
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;
  select j.usuario into u from public.jugador_id j where j.codigo = p_codigo;
  if u is null then return null; end if;
  select lower(a.email) into correo from auth.users a where a.id = u;
  r := public.calc_racha(u);
  return jsonb_build_object(
    'codigo', p_codigo,
    'yo', u = auth.uid(),
    'apodo', public.duelo_apodo(u),
    'foto', (select p.foto_url from public.perfiles p where p.id = u and p.foto_url like 'https://%'),
    'puesto', coalesce((select c.puesto from public.coleccion_puesto c where c.usuario = u), '{}'::jsonb),
    'xp_total', public.jugador_xp_total(u),
    'xp_semana', coalesce((select x.xp from public.xp_semana x where x.usuario = u and x.semana = public.cz_lunes()), 0),
    'racha', coalesce((r ->> 'actual')::integer, 0),
    'mejor', greatest(coalesce((r ->> 'mejor')::integer, 0), coalesce((r ->> 'actual')::integer, 0)),
    'coleccion', (select count(*) from public.coleccion_item i where public.col_tiene(u, i.id)),
    'admin', exists (select 1 from public.admins a where lower(a.email) = correo)
          or exists (select 1 from public.equipo e where e.email = correo and e.activo)
  );
end $$;
revoke all on function public.ver_jugador(integer) from public, anon;
grant execute on function public.ver_jugador(integer) to authenticated;
