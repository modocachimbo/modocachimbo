-- =========================================================
-- Modo Cachimbo · Simulacro personalizado
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 09-simulacros.sql, 14-equipo.sql y 23-simulacro-comparar.sql.
--
--   · simulacros.personalizado: true cuando el alumno eligió sus temas
--     y la cantidad de preguntas ("Personaliza tu simulacro").
--   · El personalizado es libre: no entra al Top 10 de la semana, ni al
--     Top del panel, ni a "Tú vs. tu carrera". Solo cuenta el simulacro rápido.
-- =========================================================

alter table public.simulacros add column if not exists personalizado boolean not null default false;

-- Igual que en 09-simulacros.sql, ahora guarda si es personalizado
create or replace function public.guardar_simulacro(p jsonb)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  sid uuid;
  nuevo boolean := false;
  pts numeric(6,1);
  mx numeric(6,1);
  c integer; i integer; b integer;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  c := least(greatest(coalesce((p ->> 'correctas')::integer, 0), 0), 200);
  i := least(greatest(coalesce((p ->> 'incorrectas')::integer, 0), 0), 200);
  b := least(greatest(coalesce((p ->> 'blancos')::integer, 0), 0), 200);
  mx := least(greatest(coalesce((p ->> 'maximo')::numeric, 0), 0), 1000);
  pts := least(greatest(coalesce((p ->> 'puntaje')::numeric, 0), -100), mx);

  if coalesce(p ->> 'id', '') ~ '^[0-9a-f-]{36}$' then
    select s.id into sid from public.simulacros s where s.id = (p ->> 'id')::uuid and s.usuario = uid;
  end if;

  if sid is null then
    if jsonb_typeof(p -> 'preguntas') <> 'array' or jsonb_array_length(p -> 'preguntas') = 0
       or jsonb_array_length(p -> 'preguntas') > 120 then
      raise exception 'preguntas no válidas';
    end if;
    insert into public.simulacros (usuario, nombre, ciclos, bloque, carrera, minutos, preguntas, personalizado)
    values (uid,
            left(coalesce(nullif(trim(p ->> 'nombre'), ''), 'Simulacro'), 60),
            coalesce((select array_agg(left(x, 20)) from jsonb_array_elements_text(coalesce(p -> 'ciclos', '[]'::jsonb)) with ordinality t(x, n) where n <= 10), '{}'),
            left(p ->> 'bloque', 4), left(p ->> 'carrera', 80),
            least(greatest(coalesce((p ->> 'minutos')::integer, 120), 30), 240),
            p -> 'preguntas',
            coalesce((p ->> 'personalizado')::boolean, false))
    returning id into sid;
    nuevo := true;
  end if;

  insert into public.simulacro_intentos (simulacro, usuario, puntaje, maximo, bloque, correctas, incorrectas, blancos, segundos, areas, primero)
  values (sid, uid, pts, mx, left(p ->> 'bloque', 4), c, i, b,
          least(greatest(coalesce((p ->> 'segundos')::integer, 0), 0), 6 * 3600),
          case when jsonb_typeof(p -> 'areas') = 'object' then p -> 'areas' end, nuevo);

  update public.simulacros s set
    intentos = s.intentos + 1,
    mejor = greatest(coalesce(s.mejor, pts), pts),
    ultimo = pts,
    actualizado = now()
  where s.id = sid;

  return sid;
end $$;
revoke all on function public.guardar_simulacro(jsonb) from public, anon;
grant execute on function public.guardar_simulacro(jsonb) to authenticated;

-- Top 10 de la semana: solo simulacros rápidos
create or replace function public.ranking_simulacro()
returns table (puesto integer, apodo text, puntaje numeric, yo boolean)
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
         o.usuario = auth.uid()
  from orden o
  left join public.perfiles p on p.id = o.usuario
  where o.puesto <= 10 or o.usuario = auth.uid()
  order by o.puesto;
$$;
revoke all on function public.ranking_simulacro() from public, anon;
grant execute on function public.ranking_simulacro() to authenticated;

-- Panel → Top simulacro: solo simulacros rápidos (igual que en 14-equipo.sql)
create or replace function public.ranking_simulacro_admin(p_dia date default null)
returns table (puesto integer, nombre text, apodo text, email text, carrera text, bloque text,
               puntaje numeric, maximo numeric, simulacro text, intentos integer, fecha timestamptz, desde date)
language plpgsql stable security definer set search_path = '' as $$
declare
  ini timestamptz;
begin
  if not public.puede('simulacro') then raise exception 'no autorizado'; end if;
  ini := (date_trunc('week', coalesce(p_dia::timestamp, now() at time zone 'America/Lima'))) at time zone 'America/Lima';
  return query
    with sem as (
      select x.* from public.simulacro_intentos x
      join public.simulacros s on s.id = x.simulacro and not s.personalizado
      where x.creado >= ini and x.creado < ini + interval '7 days'
    ), mejor as (
      select distinct on (x.usuario) x.usuario, x.puntaje, x.maximo, x.bloque, x.simulacro, x.creado
      from sem x where x.primero
      order by x.usuario, x.puntaje desc, x.creado
    ), orden as (
      select m.*, (row_number() over (order by m.puntaje desc, m.creado))::integer as puesto from mejor m
    )
    select o.puesto, p.nombre, p.apodo, u.email::text, p.carrera, o.bloque, o.puntaje, o.maximo, s.nombre,
           (select count(*) from sem y where y.usuario = o.usuario)::integer, o.creado, (ini at time zone 'America/Lima')::date
    from orden o
    join auth.users u on u.id = o.usuario
    left join public.perfiles p on p.id = o.usuario
    left join public.simulacros s on s.id = o.simulacro
    where o.puesto <= 10
    order by o.puesto;
end $$;
revoke all on function public.ranking_simulacro_admin(date) from public, anon;
grant execute on function public.ranking_simulacro_admin(date) to authenticated;

-- Tú vs. tu carrera: solo simulacros rápidos (igual que en 23-simulacro-comparar.sql)
create or replace function public.comparar_simulacro(p_bloque text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  mi_carrera text;
  r jsonb;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select nullif(trim(carrera), '') into mi_carrera from public.perfiles where id = uid;

  with base as (
    select distinct on (i.usuario) i.usuario, nullif(trim(p.carrera), '') as carrera, i.puntaje,
           public.sim_pct(i.areas -> 'com') as com, public.sim_pct(i.areas -> 'mat') as mat,
           public.sim_pct(i.areas -> 'cta') as cta, public.sim_pct(i.areas -> 'ccss') as ccss,
           greatest(0, least(100, round(100 * (1 - i.segundos / greatest(s.minutos * 60.0, 1))))) as rap
    from public.simulacro_intentos i
    join public.simulacros s on s.id = i.simulacro and not s.personalizado
    left join public.perfiles p on p.id = i.usuario
    where i.bloque = p_bloque and i.creado > now() - interval '90 days' and i.areas is not null
    order by i.usuario, i.creado desc
  ), g as (
    select case when mi_carrera is not null and count(*) filter (where carrera = mi_carrera) >= 5
                then 'carrera' else 'bloque' end as grupo
    from base
  ), t as (
    select b.*, rank() over (order by b.puntaje desc) as puesto,
           percent_rank() over (order by b.puntaje) as pr
    from base b, g
    where g.grupo = 'bloque' or b.carrera = mi_carrera
  )
  select jsonb_build_object(
    'grupo', g.grupo,
    'nombre', case when g.grupo = 'carrera' then mi_carrera else 'Bloque ' || p_bloque end,
    'n', (select count(*) from t),
    'puesto', (select puesto from t where usuario = uid),
    'yo', (select jsonb_build_object('com', com, 'mat', mat, 'cta', cta, 'ccss', ccss, 'rap', rap, 'puntaje', puntaje) from t where usuario = uid),
    'prom', (select jsonb_build_object('com', round(avg(com)), 'mat', round(avg(mat)), 'cta', round(avg(cta)),
                                       'ccss', round(avg(ccss)), 'rap', round(avg(rap)), 'puntaje', round(avg(puntaje), 1)) from t),
    'top', (select jsonb_build_object('com', round(avg(com)), 'mat', round(avg(mat)), 'cta', round(avg(cta)),
                                      'ccss', round(avg(ccss)), 'rap', round(avg(rap)), 'puntaje', round(avg(puntaje), 1)) from t where pr >= 0.9))
  into r from g;
  -- Con menos de 5 alumnos un promedio deja adivinar a los demás: solo el conteo
  if coalesce((r ->> 'n')::integer, 0) < 5 then
    return jsonb_build_object('n', coalesce((r ->> 'n')::integer, 0), 'nombre', r -> 'nombre');
  end if;
  return r;
end $$;
revoke all on function public.comparar_simulacro(text) from public, anon;
grant execute on function public.comparar_simulacro(text) to authenticated;
