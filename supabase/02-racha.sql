-- =========================================================
-- Modo Cachimbo · Etapa 4: racha de estudio
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
--
-- Reglas de la racha:
--   · Un día cuenta cuando el alumno responde 10 preguntas
--     (hora de Perú).
--   · 1 día de descanso por semana (lunes a domingo): si falta
--     un día, la racha sigue. Si falta 2 días seguidos, o 2 en
--     la misma semana, vuelve a 0.
-- =========================================================

-- Preguntas respondidas por alumno y por día
create table if not exists public.actividad (
  usuario    uuid not null references auth.users (id) on delete cascade,
  fecha      date not null,
  preguntas  integer not null default 0 check (preguntas >= 0),
  primary key (usuario, fecha)
);

alter table public.actividad enable row level security;

drop policy if exists "actividad propia: ver" on public.actividad;
create policy "actividad propia: ver" on public.actividad
  for select to authenticated using ((select auth.uid()) = usuario);
-- Nadie escribe directo: solo con la función sumar_preguntas()

-- Correos de quienes pueden ver a todos los alumnos en el panel
create table if not exists public.admins (
  email text primary key
);
alter table public.admins enable row level security;
-- Sin políticas: nadie la lee desde el sitio, solo las funciones

-- Calcula la racha de un alumno (uso interno)
create or replace function public.calc_racha(uid uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  meta     constant integer := 10;
  hoy      date := (now() at time zone 'America/Lima')::date;
  desde    date;
  d        date;
  cumplido boolean;
  actual   integer := 0;
  mejor    integer := 0;
  falto_ayer boolean := false;
  semana_descanso date;          -- lunes de la semana en que se usó el descanso
  hoy_preg integer;
  ultima   date;
begin
  select coalesce(preguntas, 0) into hoy_preg from public.actividad where usuario = uid and fecha = hoy;
  hoy_preg := coalesce(hoy_preg, 0);
  select min(fecha), max(fecha) into desde, ultima from public.actividad where usuario = uid and preguntas >= meta;

  if desde is not null then
    d := desde;
    while d <= hoy loop
      cumplido := exists (select 1 from public.actividad where usuario = uid and fecha = d and preguntas >= meta);
      if cumplido then
        actual := actual + 1;
        falto_ayer := false;
        mejor := greatest(mejor, actual);
      elsif d < hoy then
        -- Día perdido: se perdona uno por semana, nunca dos seguidos
        if actual > 0 and not falto_ayer
           and semana_descanso is distinct from date_trunc('week', d)::date then
          semana_descanso := date_trunc('week', d)::date;
          falto_ayer := true;
        else
          actual := 0;
          falto_ayer := false;
        end if;
      end if;
      -- hoy sin cumplir todavía no rompe la racha
      d := d + 1;
    end loop;
  end if;

  return jsonb_build_object(
    'meta', meta,
    'hoy', hoy_preg,
    'cumplido_hoy', hoy_preg >= meta,
    'actual', actual,
    'mejor', mejor,
    'descanso_usado', coalesce(semana_descanso = date_trunc('week', hoy)::date, false),
    'ultima', ultima
  );
end $$;

revoke all on function public.calc_racha(uuid) from public, anon, authenticated;

-- La racha del alumno que está conectado
create or replace function public.mi_racha()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then return null; end if;
  return public.calc_racha(auth.uid());
end $$;

revoke all on function public.mi_racha() from public, anon;
grant execute on function public.mi_racha() to authenticated;

-- Suma preguntas respondidas hoy y devuelve la racha al día
create or replace function public.sumar_preguntas(n integer)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  hoy date := (now() at time zone 'America/Lima')::date;
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;
  n := least(greatest(coalesce(n, 0), 0), 50);   -- máximo 50 por envío
  if n > 0 then
    insert into public.actividad (usuario, fecha, preguntas)
    values (auth.uid(), hoy, n)
    on conflict (usuario, fecha)
    do update set preguntas = least(public.actividad.preguntas + excluded.preguntas, 3000);
  end if;
  return public.calc_racha(auth.uid());
end $$;

revoke all on function public.sumar_preguntas(integer) from public, anon;
grant execute on function public.sumar_preguntas(integer) to authenticated;

-- Panel: racha de todos los alumnos (solo correos en public.admins)
create or replace function public.racha_alumnos()
returns table (
  email text, nombre text, apodo text, carrera text, foto_url text,
  actual integer, mejor integer, hoy integer, ultima date, registrado timestamptz
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.admins a where lower(a.email) = lower(auth.jwt() ->> 'email')) then
    raise exception 'no autorizado';
  end if;
  return query
    select u.email::text, p.nombre, p.apodo, p.carrera, p.foto_url,
           (r ->> 'actual')::integer, (r ->> 'mejor')::integer, (r ->> 'hoy')::integer,
           (r ->> 'ultima')::date, u.created_at
    from auth.users u
    left join public.perfiles p on p.id = u.id
    cross join lateral public.calc_racha(u.id) r
    order by (r ->> 'actual')::integer desc, u.created_at desc;
end $$;

revoke all on function public.racha_alumnos() from public, anon;
grant execute on function public.racha_alumnos() to authenticated;
