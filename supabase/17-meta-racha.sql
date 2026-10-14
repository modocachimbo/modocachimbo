-- =========================================================
-- Modo Cachimbo · Meta diaria de la racha a elegir
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Va después de 02-racha.sql.
--
-- Reglas:
--   · Cada alumno elige su meta: Suave 20, Normal 30 o Intenso 50
--     preguntas al día. Si no elige, es 20.
--   · Si la cambia, cuenta desde mañana (si hoy todavía no respondió
--     nada, cuenta desde hoy).
--   · Cada día guarda la meta que tenía, así cambiarla no rompe la
--     racha. Los días de antes de este cambio se quedan con 10.
-- =========================================================

-- Meta que tenía el alumno ese día (null = días antiguos: 10)
alter table public.actividad add column if not exists meta integer check (meta in (10, 20, 30, 50));

create table if not exists public.metas_racha (
  usuario     uuid primary key references auth.users (id) on delete cascade,
  meta        integer not null default 20 check (meta in (20, 30, 50)),
  nueva       integer check (nueva in (20, 30, 50)),
  nueva_desde date
);
alter table public.metas_racha enable row level security;
drop policy if exists "meta propia: ver" on public.metas_racha;
create policy "meta propia: ver" on public.metas_racha
  for select to authenticated using ((select auth.uid()) = usuario);
-- Nadie escribe directo: solo con elegir_meta()

-- Meta que rige hoy para un alumno (uso interno)
create or replace function public.meta_hoy(uid uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select a.meta from public.actividad a where a.usuario = uid and a.fecha = (now() at time zone 'America/Lima')::date),
    (select case when m.nueva is not null and m.nueva_desde <= (now() at time zone 'America/Lima')::date then m.nueva else m.meta end
       from public.metas_racha m where m.usuario = uid),
    20);
$$;
revoke all on function public.meta_hoy(uuid) from public, anon, authenticated;

-- Calcula la racha de un alumno (uso interno); cada día con su propia meta
create or replace function public.calc_racha(uid uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  hoy      date := (now() at time zone 'America/Lima')::date;
  meta_d   integer := public.meta_hoy(uid);
  desde    date;
  d        date;
  cumplido boolean;
  actual   integer := 0;
  mejor    integer := 0;
  falto_ayer boolean := false;
  semana_descanso date;          -- lunes de la semana en que se usó el descanso
  hoy_preg integer;
  ultima   date;
  m        record;
begin
  select coalesce(preguntas, 0) into hoy_preg from public.actividad where usuario = uid and fecha = hoy;
  hoy_preg := coalesce(hoy_preg, 0);
  select min(fecha), max(fecha) into desde, ultima from public.actividad a
    where a.usuario = uid and a.preguntas >= case when a.fecha = hoy then meta_d else coalesce(a.meta, 10) end;

  if desde is not null then
    d := desde;
    while d <= hoy loop
      cumplido := exists (select 1 from public.actividad a where a.usuario = uid and a.fecha = d
        and a.preguntas >= case when d = hoy then meta_d else coalesce(a.meta, 10) end);
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

  select * into m from public.metas_racha where usuario = uid;
  return jsonb_build_object(
    'meta', meta_d,
    'meta_elegida', coalesce(case when m.nueva is not null and m.nueva_desde > hoy then m.nueva end, m.meta, 20),
    'meta_desde', case when m.nueva is not null and m.nueva_desde > hoy then m.nueva_desde end,
    'hoy', hoy_preg,
    'cumplido_hoy', hoy_preg >= meta_d,
    'actual', actual,
    'mejor', mejor,
    'descanso_usado', coalesce(semana_descanso = date_trunc('week', hoy)::date, false),
    'ultima', ultima
  );
end $$;
revoke all on function public.calc_racha(uuid) from public, anon, authenticated;

-- Suma preguntas respondidas hoy (guarda la meta del día) y devuelve la racha
create or replace function public.sumar_preguntas(n integer)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  hoy date := (now() at time zone 'America/Lima')::date;
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'sin sesión'; end if;
  n := least(greatest(coalesce(n, 0), 0), 50);   -- máximo 50 por envío
  if n > 0 then
    insert into public.actividad (usuario, fecha, preguntas, meta)
    values (uid, hoy, n, public.meta_hoy(uid))
    on conflict (usuario, fecha)
    do update set preguntas = least(public.actividad.preguntas + excluded.preguntas, 3000),
                  meta = coalesce(public.actividad.meta, excluded.meta);
  end if;
  return public.calc_racha(uid);
end $$;
revoke all on function public.sumar_preguntas(integer) from public, anon;
grant execute on function public.sumar_preguntas(integer) to authenticated;

-- El alumno elige su meta (20, 30 o 50). Rige desde mañana,
-- o desde hoy si todavía no respondió nada hoy.
create or replace function public.elegir_meta(p_meta integer)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  hoy date := (now() at time zone 'America/Lima')::date;
  uid uuid := auth.uid();
  empezo boolean;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if p_meta is null or p_meta not in (20, 30, 50) then raise exception 'meta no válida'; end if;
  empezo := exists (select 1 from public.actividad where usuario = uid and fecha = hoy and preguntas > 0);
  insert into public.metas_racha (usuario) values (uid) on conflict (usuario) do nothing;
  -- Primero se aplica un cambio pendiente que ya llegó a su día
  update public.metas_racha set meta = nueva, nueva = null, nueva_desde = null
    where usuario = uid and nueva is not null and nueva_desde <= hoy;
  if empezo then
    update public.metas_racha set nueva = case when p_meta = meta then null else p_meta end,
      nueva_desde = case when p_meta = meta then null else hoy + 1 end where usuario = uid;
  else
    update public.metas_racha set meta = p_meta, nueva = null, nueva_desde = null where usuario = uid;
  end if;
  return public.calc_racha(uid);
end $$;
revoke all on function public.elegir_meta(integer) from public, anon;
grant execute on function public.elegir_meta(integer) to authenticated;
