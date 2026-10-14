-- =========================================================
-- Modo Cachimbo · Corazones del día
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita haber corrido antes 09-simulacros, 10-duelos,
-- 12-tarjetas y 15-codigos-cuenta.
--
-- Reglas:
--   · Cada alumno tiene 5 corazones al día (hora de Perú),
--     compartidos entre todas las prácticas. Cada error resta 1.
--   · Con 0 corazones las prácticas se bloquean hasta mañana,
--     salvo que recupere corazones con las misiones del día:
--       - Repasar flashcards ........... +1
--       - Terminar un duelo ............ +1
--       - Terminar un simulacro ........ rellena los 5
--     Cada misión vale una vez al día. Se cobra sola cuando le
--     faltan corazones (así no se pierde si la hizo temprano).
--   · Quien tiene un código activo en su cuenta: ilimitados.
-- =========================================================

create table if not exists public.corazones (
  usuario    uuid primary key references auth.users (id) on delete cascade,
  dia        date not null,
  quedan     integer not null default 5 check (quedan between 0 and 5),
  cobradas   text[] not null default '{}',     -- misiones ya cobradas hoy
  actualizado timestamptz not null default now()
);
alter table public.corazones enable row level security;
drop policy if exists "corazones propios: ver" on public.corazones;
create policy "corazones propios: ver" on public.corazones
  for select to authenticated using ((select auth.uid()) = usuario);
-- Nadie escribe directo: solo con las funciones de abajo

-- ¿Tiene un código vigente guardado en su cuenta? (uso interno)
create or replace function public.corazones_ilimitados(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.codigos_cuenta c
    where c.usuario = uid
      and case when c.vence ~ '^\d{4}-\d{2}-\d{2}$'
               then c.vence::date >= (now() at time zone 'America/Lima')::date
               else true end
  );
$$;

-- Estado del día: reinicia a medianoche y cobra las misiones hechas (uso interno)
create or replace function public.corazones_estado(uid uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  hoy    date := (now() at time zone 'America/Lima')::date;
  desde  timestamptz := ((now() at time zone 'America/Lima')::date)::timestamp at time zone 'America/Lima';
  r      public.corazones;
  hecho  jsonb;
  nuevas text[] := '{}';
  m      text;
begin
  insert into public.corazones (usuario, dia) values (uid, hoy) on conflict (usuario) do nothing;
  select * into r from public.corazones where usuario = uid for update;
  if r.dia <> hoy then
    update public.corazones set dia = hoy, quedan = 5, cobradas = '{}', actualizado = now() where usuario = uid returning * into r;
  end if;

  hecho := jsonb_build_object(
    'tarjetas',  exists (select 1 from public.tarjetas_estado t where t.usuario = uid and t.actualizado >= desde),
    'duelo',     exists (select 1 from public.duelo_jugadas j where j.usuario = uid and j.terminado >= desde),
    'simulacro', exists (select 1 from public.simulacro_intentos s where s.usuario = uid and s.creado >= desde)
  );

  -- Cobra las misiones hechas, solo si le faltan corazones
  foreach m in array array['simulacro', 'duelo', 'tarjetas'] loop
    if r.quedan < 5 and (hecho ->> m)::boolean and not (m = any (r.cobradas)) then
      r.quedan := case when m = 'simulacro' then 5 else least(5, r.quedan + 1) end;
      r.cobradas := r.cobradas || m;
      nuevas := nuevas || m;
    end if;
  end loop;
  if array_length(nuevas, 1) > 0 then
    update public.corazones set quedan = r.quedan, cobradas = r.cobradas, actualizado = now() where usuario = uid;
  end if;

  return jsonb_build_object(
    'quedan', r.quedan, 'max', 5,
    'ilimitado', public.corazones_ilimitados(uid),
    'cobradas', to_jsonb(r.cobradas), 'nuevas', to_jsonb(nuevas),
    'hecho', hecho
  );
end $$;
revoke all on function public.corazones_estado(uuid) from public, anon, authenticated;

-- Lo que pide la web al abrir una práctica o el inicio
create or replace function public.mis_corazones()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;
  return public.corazones_estado(auth.uid());
end $$;
revoke all on function public.mis_corazones() from public, anon;
grant execute on function public.mis_corazones() to authenticated;

-- Un error en una práctica: resta un corazón (no baja de 0)
create or replace function public.perder_corazon()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); e jsonb;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  e := public.corazones_estado(uid);
  if (e ->> 'ilimitado')::boolean then return e; end if;
  update public.corazones set quedan = greatest(quedan - 1, 0), actualizado = now() where usuario = uid;
  return e || jsonb_build_object('quedan', greatest((e ->> 'quedan')::int - 1, 0), 'nuevas', '[]'::jsonb);
end $$;
revoke all on function public.perder_corazon() from public, anon;
grant execute on function public.perder_corazon() to authenticated;
