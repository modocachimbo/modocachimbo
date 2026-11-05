-- =========================================================
-- Modo Cachimbo · Pines «Top global»: coronas para el Top 3 de la semana
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 31-coleccion.sql, 16-corazones.sql, 38-ver-jugador.sql y 47-pines-tops.sql.
--
--   · Tres pines nuevos en Mi colección → Pines («Top global»):
--       pin-corona-oro    · cerrar una semana en el 1.er puesto del Top
--       pin-corona-plata  · cerrar una semana en el 2.º puesto
--       pin-corona-bronce · cerrar una semana en el 3.er puesto
--     (el Top de la semana es el de XP: ranking_xp, mismo orden:
--      más XP primero y, si empatan, el mismo desempate).
--   · Desde el martes (hora de Lima), los que van 1.º, 2.º y 3.º en el
--     Top de esta semana ya la tienen y se la pueden poner. Si alguien
--     los pasa, la corona pasa al nuevo y el que bajó deja de llevarla
--     (en los tops, su tarjeta y su vitrina).
--   · Se queda guardada para siempre solo si cierras la semana (domingo
--     a medianoche) en ese puesto.
--   · No hace falta entregarla: col_tiene la reconoce sola y
--     mi_coleccion manda cuántas veces quedaste 1.º, 2.º y 3.º (tops).
--   · También salen en Panel → Regalos, por si quieres dar una a mano.
--   · Las semanas anteriores también cuentan.
-- =========================================================

-- nom e img: para que también salgan en Panel → Regalos (por si quieres entregar una a mano)
insert into public.coleccion_item (id, espacio, regla, nom, rareza, img) values
  ('pin-corona-oro',    'pines', '{"tipo":"top","n":1}', 'Top global · 1.º', 'legendario', '/assets/pines/corona-oro.webp'),
  ('pin-corona-plata',  'pines', '{"tipo":"top","n":2}', 'Top global · 2.º', 'epico',      '/assets/pines/corona-plata.webp'),
  ('pin-corona-bronce', 'pines', '{"tipo":"top","n":3}', 'Top global · 3.º', 'raro',       '/assets/pines/corona-bronce.webp')
on conflict (id) do update set espacio = excluded.espacio, regla = excluded.regla, nom = excluded.nom, rareza = excluded.rareza, img = excluded.img;

-- Cuántas semanas cerradas terminó el alumno en el puesto 1, 2 y 3 del Top de XP,
-- y ahora: su puesto en el Top de esta semana si va en el top 3 y ya es martes o después
create or replace function public.mis_tops(uid uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce((
    select jsonb_object_agg(t.puesto::text, t.veces) from (
      select r.puesto, count(*) as veces from (
        select 1 + (select count(*) from public.xp_semana o
                    where o.semana = x.semana and o.xp > 0
                      and (o.xp > x.xp or (o.xp = x.xp and o.usuario < x.usuario))) as puesto
        from public.xp_semana x
        where x.usuario = uid and x.xp > 0 and x.semana < public.cz_lunes()
      ) r
      where r.puesto <= 3
      group by r.puesto
    ) t), '{}'::jsonb)
  || coalesce((
    select jsonb_build_object('ahora', a.puesto) from (
      select 1 + (select count(*) from public.xp_semana o
                  where o.semana = x.semana and o.xp > 0
                    and (o.xp > x.xp or (o.xp = x.xp and o.usuario < x.usuario))) as puesto
      from public.xp_semana x
      where x.usuario = uid and x.xp > 0 and x.semana = public.cz_lunes()
        and public.cz_hoy() >= public.cz_lunes() + 1
    ) a where a.puesto <= 3), '{}'::jsonb);
$$;
revoke all on function public.mis_tops(uuid) from public, anon, authenticated;

-- ¿El alumno tiene este objeto? Igual que en 31, más la regla 'top'
create or replace function public.col_tiene(uid uuid, p_item text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare r jsonb; mins int[] := array[20, 1500, 4000, 8000, 12000];
begin
  select i.regla into r from public.coleccion_item i where i.id = p_item and i.visible;
  if r is null then return false; end if;
  if exists (select 1 from public.coleccion_mia m where m.usuario = uid and m.item = p_item) then return true; end if;
  case r ->> 'tipo'
    when 'gratis' then return true;
    when 'racha' then
      return coalesce((public.calc_racha(uid) ->> 'mejor')::int, 0) >= (r ->> 'n')::int
          or coalesce((public.calc_racha(uid) ->> 'actual')::int, 0) >= (r ->> 'n')::int;
    when 'rango' then
      return exists (select 1 from public.xp_semana x where x.usuario = uid and x.xp >= mins[(r ->> 'n')::int + 1]);
    when 'top' then
      return coalesce((public.mis_tops(uid) ->> (r ->> 'n'))::int, 0) > 0
          or coalesce((public.mis_tops(uid) ->> 'ahora') = (r ->> 'n'), false);
    else return false;
  end case;
end $$;
revoke all on function public.col_tiene(uuid, text) from public, anon, authenticated;

-- Lo tuyo: igual que en 31, más tops (para las coronas)
create or replace function public.mi_coleccion()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'sin sesión'; end if;
  return jsonb_build_object(
    'mias', coalesce((select jsonb_agg(jsonb_build_object('item', m.item, 'origen', m.origen, 'mensaje', m.mensaje, 'creado', m.creado) order by m.creado)
                        from public.coleccion_mia m where m.usuario = uid), '[]'),
    'puesto', coalesce((select p.puesto from public.coleccion_puesto p where p.usuario = uid), '{}'),
    'tops', public.mis_tops(uid));
end $$;
revoke all on function public.mi_coleccion() from public, anon;
grant execute on function public.mi_coleccion() to authenticated;

-- Lo que otros ven puesto: una corona que ya no tienes (te pasaron en el Top) no se muestra
create or replace function public.pin_visible(u uuid, pin text)
returns text language sql stable security definer set search_path = '' as $$
  select case when pin is null then null
              when pin like 'pin-corona-%' and not coalesce(public.col_tiene(u, pin), false) then null
              else pin end;
$$;
revoke all on function public.pin_visible(uuid, text) from public, anon, authenticated;

create or replace function public.puesto_visible(u uuid, p jsonb)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when p is null then '{}'::jsonb
              when jsonb_typeof(p -> 'pines') <> 'array' then p
              else jsonb_set(p, '{pines}', coalesce((
                select jsonb_agg(x order by o) from jsonb_array_elements_text(p -> 'pines') with ordinality as e(x, o)
                where x not like 'pin-corona-%' or coalesce(public.col_tiene(u, x), false)), '[]'::jsonb)) end;
$$;
revoke all on function public.puesto_visible(uuid, jsonb) from public, anon, authenticated;

-- Tarjeta de otro alumno: igual que en 38, pero sin coronas que ya no tiene
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
    'puesto', public.puesto_visible(u, (select c.puesto from public.coleccion_puesto c where c.usuario = u)),
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

-- Top de la semana (XP): igual que en 47, pero el pin pasa por pin_visible
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
           public.pin_visible(x.usuario, c.puesto -> 'pines' ->> 0) as pin, public.jugador_verificado(x.usuario) as admin
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

-- Top del Simulacro: igual que en 47, pero el pin pasa por pin_visible
create or replace function public.ranking_simulacro()
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
         public.pin_visible(o.usuario, c.puesto -> 'pines' ->> 0),
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

-- Top de duelos: igual que en 47, pero el pin pasa por pin_visible
create or replace function public.ranking_duelos()
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
         public.pin_visible(o.usuario, c.puesto -> 'pines' ->> 0),
         public.jugador_verificado(o.usuario)
  from orden o
  left join public.xp_semana xs on xs.usuario = o.usuario and xs.semana = public.cz_lunes()
  left join public.coleccion_puesto c on c.usuario = o.usuario
  where o.puesto <= 10 or o.usuario = auth.uid()
  order by o.puesto;
$$;
revoke all on function public.ranking_duelos() from public, anon;
grant execute on function public.ranking_duelos() to authenticated;
