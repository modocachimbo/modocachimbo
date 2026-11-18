-- =========================================================
-- Modo Cachimbo · Premios del Top 3 por semana (familias de pines)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 61-pines-corona-top3.sql, 73-corona-se-gana-al-cerrar.sql y 96-rangos-premios.sql.
--
--   · Cada semana el Top 3 gana un pin de una familia (oro, plata y bronce
--     de la misma familia):
--       hex     · hexágono con corona (las coronas de siempre, con diseño nuevo)
--       corona  · Corona Cachimbo
--       medalla · Medalla del Top
--       escudo  · Escudo del Top
--   · Hasta la semana del 16-11-2026 todo fue hexágono (lo que ya tienen
--     los alumnos se queda igual).
--   · Semana del 23-11: corona · 30-11: medalla · 07-12: escudo.
--   · Desde el 14-12: una familia al azar cada semana, sin repetir la de la
--     semana anterior. El azar es fijo por semana (sale lo mismo cada vez).
--   · Se gana igual que antes: cerrando la semana (domingo) en ese puesto.
-- =========================================================

-- La familia de premio de una semana (s = lunes de esa semana)
create or replace function public.top_familia(s date)
returns text language plpgsql immutable set search_path = '' as $$
declare
  fams text[] := array['hex', 'corona', 'medalla', 'escudo'];
  ini  date := date '2026-11-23';
  w    date;
  prev text := 'escudo';
  f    text;
  opts text[];
begin
  s := date_trunc('week', s)::date;
  if s < ini then return 'hex'; end if;
  if s = ini then return 'corona'; end if;
  if s = ini + 7 then return 'medalla'; end if;
  if s = ini + 14 then return 'escudo'; end if;
  w := ini + 21;
  loop
    opts := array_remove(fams, prev);
    f := opts[1 + (('x' || substr(md5('mc-top-' || w::text), 1, 7))::bit(28)::int % 3)];
    if w >= s then return f; end if;
    prev := f;
    w := w + 7;
  end loop;
end $$;
grant execute on function public.top_familia(date) to authenticated;

-- Igual que en 61, más 'fam' (semanas cerradas en cada puesto por familia) y 'fam_ahora'
create or replace function public.mis_tops(uid uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  with r as (
    select x.semana,
           1 + (select count(*) from public.xp_semana o
                where o.semana = x.semana and o.xp > 0
                  and (o.xp > x.xp or (o.xp = x.xp and o.usuario < x.usuario))) as puesto
    from public.xp_semana x
    where x.usuario = uid and x.xp > 0 and x.semana < public.cz_lunes()
  ), g as (
    select puesto, count(*) as veces from r where puesto <= 3 group by puesto
  ), f as (
    select public.top_familia(semana) as fam, puesto, count(*) as veces from r where puesto <= 3 group by 1, 2
  ), ff as (
    select fam, jsonb_object_agg(puesto::text, veces) as p from f group by fam
  )
  select coalesce((select jsonb_object_agg(puesto::text, veces) from g), '{}'::jsonb)
    || jsonb_build_object('fam', coalesce((select jsonb_object_agg(fam, p) from ff), '{}'::jsonb),
                          'fam_ahora', public.top_familia(public.cz_lunes()))
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

-- Igual que en 96; la regla 'top' ahora mira la familia (sin fam = hexágono)
create or replace function public.col_tiene(uid uuid, p_item text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare r jsonb; mins int[] := array[20, 1500, 4000, 8000, 12000,
                                       20, 900, 2300, 4700, 9000, 16000, 50000];
begin
  select i.regla into r from public.coleccion_item i where i.id = p_item and i.visible;
  if r is null then return false; end if;
  if r ->> 'tipo' = 'grupo' then
    return exists (select 1 from public.grupo_miembro g where g.usuario = uid and g.grupo = r ->> 'g');
  end if;
  if exists (select 1 from public.coleccion_mia m where m.usuario = uid and m.item = p_item) then return true; end if;
  case r ->> 'tipo'
    when 'gratis' then return true;
    when 'racha' then
      return coalesce((public.calc_racha(uid) ->> 'mejor')::int, 0) >= (r ->> 'n')::int
          or coalesce((public.calc_racha(uid) ->> 'actual')::int, 0) >= (r ->> 'n')::int;
    when 'rango' then
      return exists (select 1 from public.xp_semana x where x.usuario = uid and x.xp >= mins[(r ->> 'n')::int + 1]);
    when 'top' then
      return coalesce((public.mis_tops(uid) -> 'fam' -> coalesce(r ->> 'fam', 'hex') ->> (r ->> 'n'))::int, 0) > 0;
    else return false;
  end case;
end $$;
revoke all on function public.col_tiene(uuid, text) from public, anon, authenticated;

-- Los pines (también salen en Panel → Regalos)
insert into public.coleccion_item (id, espacio, regla, nom, rareza, img) values
  ('pin-corona-oro',             'pines', '{"tipo":"top","n":1}',                   'Top global · 1.º',       'legendario', '/assets/pines/top-hex-oro.webp'),
  ('pin-corona-plata',           'pines', '{"tipo":"top","n":2}',                   'Top global · 2.º',       'epico',      '/assets/pines/top-hex-plata.webp'),
  ('pin-corona-bronce',          'pines', '{"tipo":"top","n":3}',                   'Top global · 3.º',       'raro',       '/assets/pines/top-hex-bronce.webp'),
  ('pin-corona-cachimbo-oro',    'pines', '{"tipo":"top","n":1,"fam":"corona"}',    'Corona Cachimbo · 1.º',  'legendario', '/assets/pines/top-corona-oro.webp'),
  ('pin-corona-cachimbo-plata',  'pines', '{"tipo":"top","n":2,"fam":"corona"}',    'Corona Cachimbo · 2.º',  'epico',      '/assets/pines/top-corona-plata.webp'),
  ('pin-corona-cachimbo-bronce', 'pines', '{"tipo":"top","n":3,"fam":"corona"}',    'Corona Cachimbo · 3.º',  'raro',       '/assets/pines/top-corona-bronce.webp'),
  ('pin-corona-medalla-oro',     'pines', '{"tipo":"top","n":1,"fam":"medalla"}',   'Medalla del Top · 1.º',  'legendario', '/assets/pines/top-medalla-oro.webp'),
  ('pin-corona-medalla-plata',   'pines', '{"tipo":"top","n":2,"fam":"medalla"}',   'Medalla del Top · 2.º',  'epico',      '/assets/pines/top-medalla-plata.webp'),
  ('pin-corona-medalla-bronce',  'pines', '{"tipo":"top","n":3,"fam":"medalla"}',   'Medalla del Top · 3.º',  'raro',       '/assets/pines/top-medalla-bronce.webp'),
  ('pin-corona-escudo-oro',      'pines', '{"tipo":"top","n":1,"fam":"escudo"}',    'Escudo del Top · 1.º',   'legendario', '/assets/pines/top-escudo-oro.webp'),
  ('pin-corona-escudo-plata',    'pines', '{"tipo":"top","n":2,"fam":"escudo"}',    'Escudo del Top · 2.º',   'epico',      '/assets/pines/top-escudo-plata.webp'),
  ('pin-corona-escudo-bronce',   'pines', '{"tipo":"top","n":3,"fam":"escudo"}',    'Escudo del Top · 3.º',   'raro',       '/assets/pines/top-escudo-bronce.webp')
on conflict (id) do update set espacio = excluded.espacio, regla = excluded.regla, nom = excluded.nom, rareza = excluded.rareza, img = excluded.img;

-- Para revisar: las próximas 12 semanas y su premio
-- select d::date as semana, public.top_familia(d::date) from generate_series(date '2026-11-16', date '2026-11-16' + 7*12, '7 days') d;
