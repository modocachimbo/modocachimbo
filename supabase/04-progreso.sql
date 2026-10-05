-- =========================================================
-- Modo Cachimbo · Etapa 6: progreso del estudiante
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita haber corrido antes supabase/02-racha.sql (tabla admins).
--
-- Qué guarda (solo un resumen, al terminar cada práctica):
--   · progreso: una fila por alumno y práctica (tema del libro,
--     Repaso, Fijas, examen pasado o simulacro) con su mejor nota,
--     la última y cuántas veces la hizo.
--   · falladas: las preguntas que el alumno falló, para repasarlas.
--     Se borran solas cuando la vuelve a responder bien.
-- =========================================================

create table if not exists public.progreso (
  usuario     uuid not null references auth.users (id) on delete cascade,
  clave       text not null,                 -- ej.: libro|algebra|2027-I|05
  tipo        text not null check (tipo in ('libro', 'repaso', 'fijas', 'examen', 'simulacro')),
  carpeta     text,                          -- curso (algebra) o examen (ordinario)
  anio        text,
  tema        text,
  titulo      text,
  intentos    integer not null default 0,
  mejor       integer not null default 0,    -- % de aciertos (0 a 100)
  ultimo      integer not null default 0,
  correctas   integer not null default 0,    -- del último intento
  total       integer not null default 0,
  actualizado timestamptz not null default now(),
  primary key (usuario, clave)
);
alter table public.progreso enable row level security;
drop policy if exists "progreso propio: ver" on public.progreso;
create policy "progreso propio: ver" on public.progreso
  for select to authenticated using ((select auth.uid()) = usuario);

create table if not exists public.falladas (
  usuario  uuid not null references auth.users (id) on delete cascade,
  ref      text not null,                    -- archivo#tema#número de la pregunta
  huella   text,                             -- comienzo del enunciado, para comprobarla
  carpeta  text,
  titulo   text,
  veces    integer not null default 1,
  ultima   timestamptz not null default now(),
  primary key (usuario, ref)
);
alter table public.falladas enable row level security;
drop policy if exists "falladas propias: ver" on public.falladas;
create policy "falladas propias: ver" on public.falladas
  for select to authenticated using ((select auth.uid()) = usuario);
-- Nadie escribe directo: solo con guardar_practica()

-- Guarda una práctica terminada.
-- p = { clave, tipo, carpeta, anio, tema, titulo, correctas, total,
--       falladas: [{ref, huella, carpeta, titulo}], acertadas: [ref] }
create or replace function public.guardar_practica(p jsonb)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  c integer; t integer; pct integer;
  f jsonb;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  t := least(greatest(coalesce((p ->> 'total')::integer, 0), 0), 500);
  c := least(greatest(coalesce((p ->> 'correctas')::integer, 0), 0), t);

  if t > 0 and coalesce(p ->> 'tipo', '') in ('libro', 'repaso', 'fijas', 'examen', 'simulacro') and coalesce(p ->> 'clave', '') <> '' then
    pct := round(c * 100.0 / t);
    insert into public.progreso as g (usuario, clave, tipo, carpeta, anio, tema, titulo, intentos, mejor, ultimo, correctas, total, actualizado)
    values (uid, left(p ->> 'clave', 120), p ->> 'tipo', left(p ->> 'carpeta', 40), left(p ->> 'anio', 40),
            left(p ->> 'tema', 6), left(p ->> 'titulo', 120), 1, pct, pct, c, t, now())
    on conflict (usuario, clave) do update set
      intentos = g.intentos + 1, mejor = greatest(g.mejor, excluded.mejor), ultimo = excluded.ultimo,
      correctas = excluded.correctas, total = excluded.total, titulo = excluded.titulo, actualizado = now();
  end if;

  -- Preguntas falladas (máximo 100 por envío)
  for f in select value from jsonb_array_elements(coalesce(p -> 'falladas', '[]'::jsonb)) with ordinality x(value, n) where n <= 100 loop
    if coalesce(f ->> 'ref', '') <> '' then
      insert into public.falladas as x (usuario, ref, huella, carpeta, titulo)
      values (uid, left(f ->> 'ref', 160), left(f ->> 'huella', 40), left(f ->> 'carpeta', 40), left(f ->> 'titulo', 120))
      on conflict (usuario, ref) do update set veces = x.veces + 1, ultima = now(), huella = excluded.huella;
    end if;
  end loop;

  -- Las que ahora respondió bien ya no están por repasar
  delete from public.falladas x
   where x.usuario = uid
     and x.ref in (select left(value, 160) from jsonb_array_elements_text(coalesce(p -> 'acertadas', '[]'::jsonb)) with ordinality a(value, n) where n <= 500);

  -- Guardar como máximo las 300 más recientes
  delete from public.falladas x
   where x.usuario = uid
     and x.ref not in (select y.ref from public.falladas y where y.usuario = uid order by y.ultima desc limit 300);
end $$;
revoke all on function public.guardar_practica(jsonb) from public, anon;
grant execute on function public.guardar_practica(jsonb) to authenticated;

-- Panel: resumen de progreso de todos los alumnos (solo administradores)
create or replace function public.progreso_alumnos()
returns table (email text, practicas integer, promedio integer, falladas integer, ultima timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.admins a where lower(a.email) = lower(auth.jwt() ->> 'email')) then
    raise exception 'no autorizado';
  end if;
  return query
    select u.email::text,
           coalesce(sum(g.intentos), 0)::integer,
           coalesce(round(avg(g.mejor)), 0)::integer,
           (select count(*) from public.falladas f where f.usuario = u.id)::integer,
           max(g.actualizado)
    from auth.users u
    left join public.progreso g on g.usuario = u.id
    group by u.id, u.email;
end $$;
revoke all on function public.progreso_alumnos() from public, anon;
grant execute on function public.progreso_alumnos() to authenticated;
