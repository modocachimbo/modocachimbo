-- =========================================================
-- Modo Cachimbo · Simulacro libre
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 27-simulacro-personalizado.sql.
--
--   · simulacros.libre: true cuando el alumno eligió áreas, cursos,
--     cantidad y tiempo ("Arma tu simulacro libre").
--   · El libre también se guarda como personalizado, así que no entra
--     al Top 10 de la semana, ni al Top del panel, ni a "Tú vs. tu carrera".
--   · El tiempo mínimo baja de 30 a 10 minutos (el libre puede ser corto).
-- =========================================================

alter table public.simulacros add column if not exists libre boolean not null default false;

-- Igual que en 27-simulacro-personalizado.sql, ahora guarda si es libre
-- y acepta desde 10 minutos
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
    insert into public.simulacros (usuario, nombre, ciclos, bloque, carrera, minutos, preguntas, personalizado, libre)
    values (uid,
            left(coalesce(nullif(trim(p ->> 'nombre'), ''), 'Simulacro'), 60),
            coalesce((select array_agg(left(x, 20)) from jsonb_array_elements_text(coalesce(p -> 'ciclos', '[]'::jsonb)) with ordinality t(x, n) where n <= 10), '{}'),
            left(p ->> 'bloque', 4), left(p ->> 'carrera', 80),
            least(greatest(coalesce((p ->> 'minutos')::integer, 120), 10), 240),
            p -> 'preguntas',
            -- el libre siempre queda como personalizado: así no entra a ningún top
            coalesce((p ->> 'personalizado')::boolean, false) or coalesce((p ->> 'libre')::boolean, false),
            coalesce((p ->> 'libre')::boolean, false))
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
