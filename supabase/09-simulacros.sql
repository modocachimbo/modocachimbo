-- =========================================================
-- Modo Cachimbo · Simulacro (80 preguntas)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita haber corrido antes supabase/01-perfiles.sql.
--
-- Qué guarda:
--   · simulacros: cada simulacro que crea un alumno, con su nombre,
--     ciclos, bloque y la lista de sus 80 preguntas (para "Repetir").
--   · simulacro_intentos: cada vez que lo termina (puntaje, aciertos…).
--   · ranking_simulacro(): top 10 de la semana (lunes a domingo,
--     hora de Lima) con el mejor puntaje de cada alumno, por apodo.
--     Solo cuenta el PRIMER intento de cada simulacro (al repetir ya
--     se conocen las preguntas).
--   · ranking_simulacro_admin(semana): lo mismo para el panel, con
--     nombre, correo y carrera. Solo para administradores.
-- =========================================================

create table if not exists public.simulacros (
  id          uuid primary key default gen_random_uuid(),
  usuario     uuid not null references auth.users (id) on delete cascade,
  nombre      text not null check (char_length(nombre) between 1 and 60),
  ciclos      text[] not null default '{}',
  bloque      text check (char_length(bloque) <= 4),
  carrera     text check (char_length(carrera) <= 80),
  minutos     integer not null default 120 check (minutos between 30 and 240),
  preguntas   jsonb not null,                -- ["carpeta|anio|tema|n", …] en el orden del examen
  intentos    integer not null default 0,
  mejor       numeric(6,1),
  ultimo      numeric(6,1),
  creado      timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create index if not exists simulacros_usuario on public.simulacros (usuario, actualizado desc);
alter table public.simulacros enable row level security;
drop policy if exists "simulacros propios: ver" on public.simulacros;
create policy "simulacros propios: ver" on public.simulacros
  for select to authenticated using ((select auth.uid()) = usuario);
drop policy if exists "simulacros propios: borrar" on public.simulacros;
create policy "simulacros propios: borrar" on public.simulacros
  for delete to authenticated using ((select auth.uid()) = usuario);

create table if not exists public.simulacro_intentos (
  id          bigint generated always as identity primary key,
  simulacro   uuid not null references public.simulacros (id) on delete cascade,
  usuario     uuid not null references auth.users (id) on delete cascade,
  puntaje     numeric(6,1) not null,
  maximo      numeric(6,1) not null,
  bloque      text,
  correctas   integer not null default 0,
  incorrectas integer not null default 0,
  blancos     integer not null default 0,
  segundos    integer not null default 0,
  areas       jsonb,                         -- {com:{c,i,b,p}, mat:…}
  creado      timestamptz not null default now()
);
alter table public.simulacro_intentos add column if not exists primero boolean not null default true;
create index if not exists simulacro_intentos_creado on public.simulacro_intentos (creado);
create index if not exists simulacro_intentos_usuario on public.simulacro_intentos (usuario, creado desc);
alter table public.simulacro_intentos enable row level security;
drop policy if exists "intentos propios: ver" on public.simulacro_intentos;
create policy "intentos propios: ver" on public.simulacro_intentos
  for select to authenticated using ((select auth.uid()) = usuario);
-- Nadie escribe directo: solo con guardar_simulacro()
grant select, delete on public.simulacros to authenticated;
grant select on public.simulacro_intentos to authenticated;

-- Guarda un simulacro terminado. Si p.id es de un simulacro del alumno,
-- es un "Repetir" y solo suma el intento. Devuelve el id del simulacro.
-- p = { id?, nombre, ciclos[], bloque, carrera, minutos, preguntas[],
--       puntaje, maximo, correctas, incorrectas, blancos, segundos, areas }
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
    insert into public.simulacros (usuario, nombre, ciclos, bloque, carrera, minutos, preguntas)
    values (uid,
            left(coalesce(nullif(trim(p ->> 'nombre'), ''), 'Simulacro'), 60),
            coalesce((select array_agg(left(x, 20)) from jsonb_array_elements_text(coalesce(p -> 'ciclos', '[]'::jsonb)) with ordinality t(x, n) where n <= 10), '{}'),
            left(p ->> 'bloque', 4), left(p ->> 'carrera', 80),
            least(greatest(coalesce((p ->> 'minutos')::integer, 120), 30), 240),
            p -> 'preguntas')
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

-- Top 10 de la semana (desde el lunes, hora de Lima): mejor puntaje de cada alumno.
-- Si el alumno que consulta no está en el top, se agrega al final con su puesto.
create or replace function public.ranking_simulacro()
returns table (puesto integer, apodo text, puntaje numeric, yo boolean)
language sql stable security definer set search_path = '' as $$
  with semana as (
    select (date_trunc('week', now() at time zone 'America/Lima')) at time zone 'America/Lima' as desde
  ), mejores as (
    select x.usuario, max(x.puntaje) as puntaje, min(x.creado) filter (where true) as primero
    from public.simulacro_intentos x, semana
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

-- Panel: top 10 de una semana (cualquier día de esa semana; null = esta semana)
create or replace function public.ranking_simulacro_admin(p_dia date default null)
returns table (puesto integer, nombre text, apodo text, email text, carrera text, bloque text,
               puntaje numeric, maximo numeric, simulacro text, intentos integer, fecha timestamptz, desde date)
language plpgsql stable security definer set search_path = '' as $$
declare
  ini timestamptz;
begin
  if not exists (select 1 from public.admins a where lower(a.email) = lower(auth.jwt() ->> 'email')) then
    raise exception 'no autorizado';
  end if;
  ini := (date_trunc('week', coalesce(p_dia::timestamp, now() at time zone 'America/Lima'))) at time zone 'America/Lima';
  return query
    with sem as (
      select x.* from public.simulacro_intentos x
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
