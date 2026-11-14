-- =========================================================
-- Modo Cachimbo · Rayos y código del Laboratorio
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 02-racha.sql, 09-simulacros.sql, 15-codigos-cuenta.sql,
-- 17-meta-racha.sql, 54-descarga-aparte.sql y 70-acceso-por-id.sql.
--
--   · Rayos: se ganan estudiando y abren simuladores uno por uno.
--       Nivel del Arcade pasado ...... +3 (con 3 estrellas, +2 más)
--       Racha del día cumplida ....... +2
--       Simulacro terminado .......... +5 (hasta 2 por día)
--     Del Arcade se cuentan como máximo 40 rayos por día.
--     Solo cuenta lo hecho desde el 14/11/2026.
--   · Cada simulador tiene su precio (tabla lab_sims). El primero de
--     cada curso es gratis. Abierto una vez = abierto para siempre.
--   · Código Laboratorio (laboratorio-VIP): abre todos los simuladores.
--     Va aparte, como las Descargas PDF: el Acceso total NO lo incluye.
--     Vale por código o dado por ID. El equipo (admin) también entra.
-- =========================================================

-- Precio de cada simulador (el panel o este archivo lo cambia)
create table if not exists public.lab_sims (
  sim     text primary key check (sim ~ '^[a-z0-9-]{2,40}$'),
  precio  integer not null default 40 check (precio between 0 and 1000),
  gratis  boolean not null default false
);
alter table public.lab_sims enable row level security;
drop policy if exists "lab sims: ver" on public.lab_sims;
create policy "lab sims: ver" on public.lab_sims for select to authenticated using (true);
grant select on public.lab_sims to authenticated;

insert into public.lab_sims (sim, precio, gratis) values
  ('celula', 60, true),
  ('mitosis', 40, false), ('punnett', 40, false), ('adn', 60, false),
  ('tabla', 40, true), ('atomo', 40, false), ('balanceo', 40, false),
  ('parabolico', 40, true), ('plano', 40, false), ('mru', 40, false), ('circuito', 40, false), ('optica', 40, false),
  ('corazon', 60, true), ('neurona', 40, false), ('ojo', 40, false),
  ('funcion', 40, true), ('trigo', 40, false), ('geo', 40, false)
on conflict (sim) do nothing;

-- Cada rayo ganado o gastado es una fila. La clave evita contar dos veces lo mismo.
--   nv:<tema:juego>  nv3:<tema:juego>  racha:<fecha>  sim:<id intento>  abrir:<sim>
create table if not exists public.lab_rayos (
  usuario  uuid not null references auth.users (id) on delete cascade,
  clave    text not null check (char_length(clave) between 3 and 80),
  cantidad integer not null,
  creado   timestamptz not null default now(),
  primary key (usuario, clave)
);
create index if not exists lab_rayos_creado on public.lab_rayos (usuario, creado);
alter table public.lab_rayos enable row level security;
drop policy if exists "rayos propios: ver" on public.lab_rayos;
create policy "rayos propios: ver" on public.lab_rayos
  for select to authenticated using ((select auth.uid()) = usuario);
grant select on public.lab_rayos to authenticated;
-- Nadie escribe directo: solo con lab_estado() y lab_abrir()

-- ¿Tiene el código Laboratorio (por código o por ID)? (uso interno)
create or replace function public.lab_con_codigo(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.codigos_cuenta c
    where c.usuario = uid and c.quitado is null
      and c.producto ~ '(^|,)laboratorio-VIP(,|$)'
      and (c.vence is null or c.vence = '' or c.vence >= to_char((now() at time zone 'America/Lima')::date, 'YYYY-MM-DD')))
  or exists (
    select 1 from public.accesos_id a
    where a.usuario = uid and a.quitado is null
      and a.producto ~ '(^|,)laboratorio-VIP(,|$)'
      and (a.vence is null or a.vence >= to_char((now() at time zone 'America/Lima')::date, 'YYYY-MM-DD')))
$$;
revoke all on function public.lab_con_codigo(uuid) from public, anon, authenticated;

-- Saldo, simuladores abiertos y rayos nuevos. Antes de responder cobra lo ganado:
-- racha y simulacros los revisa aquí mismo; los niveles del Arcade los manda el teléfono
-- (niveles = {"tema:juego": estrellas, ...}).
create or replace function public.lab_estado(niveles jsonb default '{}'::jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid   uuid := auth.uid();
  hoy   date := (now() at time zone 'America/Lima')::date;
  desde date := date '2026-11-14';
  antes integer; despues integer; arcade_hoy integer; k text; v integer; n integer := 0;
begin
  if uid is null then raise exception 'Inicia sesión'; end if;
  select coalesce(sum(cantidad), 0) into antes from public.lab_rayos where usuario = uid and cantidad > 0;

  -- Racha: cada día cumplido (preguntas >= meta de ese día)
  insert into public.lab_rayos (usuario, clave, cantidad)
  select uid, 'racha:' || a.fecha, 2 from public.actividad a
   where a.usuario = uid and a.fecha >= desde and a.fecha <= hoy and a.preguntas >= coalesce(a.meta, 10)
  on conflict do nothing;

  -- Simulacros terminados (primer intento), hasta 2 por día
  insert into public.lab_rayos (usuario, clave, cantidad)
  select uid, 'sim:' || x.id, 5 from (
    select i.id, row_number() over (partition by (i.creado at time zone 'America/Lima')::date order by i.creado) as r
      from public.simulacro_intentos i
     where i.usuario = uid and i.primero and (i.creado at time zone 'America/Lima')::date >= desde) x
   where x.r <= 2
  on conflict do nothing;

  -- Arcade: +3 por nivel pasado y +2 más con 3 estrellas; máximo 40 por día
  if jsonb_typeof(niveles) = 'object' then
    select coalesce(sum(cantidad), 0) into arcade_hoy from public.lab_rayos
     where usuario = uid and clave ~ '^nv3?:' and (creado at time zone 'America/Lima')::date = hoy;
    for k, v in select e.key, case when jsonb_typeof(e.value) = 'number' then (e.value #>> '{}')::numeric::integer else 0 end
                  from jsonb_each(niveles) e loop
      n := n + 1; exit when n > 200 or arcade_hoy >= 40;
      continue when k !~ '^[a-z0-9-]{1,40}:[a-z0-9-]{1,20}$' or v < 1 or v > 3;
      insert into public.lab_rayos (usuario, clave, cantidad) values (uid, 'nv:' || k, 3) on conflict do nothing;
      if found then arcade_hoy := arcade_hoy + 3; end if;
      if v = 3 and arcade_hoy < 40 then
        insert into public.lab_rayos (usuario, clave, cantidad) values (uid, 'nv3:' || k, 2) on conflict do nothing;
        if found then arcade_hoy := arcade_hoy + 2; end if;
      end if;
    end loop;
  end if;

  select coalesce(sum(cantidad), 0) into despues from public.lab_rayos where usuario = uid and cantidad > 0;
  return jsonb_build_object(
    'saldo', (select coalesce(sum(cantidad), 0) from public.lab_rayos where usuario = uid),
    'nuevos', despues - antes,
    'abiertos', (select coalesce(jsonb_agg(substr(clave, 7)), '[]'::jsonb) from public.lab_rayos where usuario = uid and clave like 'abrir:%'),
    'precios', (select coalesce(jsonb_object_agg(s.sim, jsonb_build_object('precio', s.precio, 'gratis', s.gratis)), '{}'::jsonb) from public.lab_sims s),
    'codigo', public.lab_con_codigo(uid),
    'equipo', public.es_admin());
end;
$$;
revoke all on function public.lab_estado(jsonb) from public, anon;
grant execute on function public.lab_estado(jsonb) to authenticated;

-- Abre un simulador con rayos. Devuelve el estado nuevo, o {error}
create or replace function public.lab_abrir(p_sim text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); s record; saldo integer;
begin
  if uid is null then raise exception 'Inicia sesión'; end if;
  select * into s from public.lab_sims where sim = p_sim;
  if not found then return jsonb_build_object('error', 'Ese simulador no existe'); end if;
  if s.gratis or public.lab_con_codigo(uid) or public.es_admin()
     or exists (select 1 from public.lab_rayos where usuario = uid and clave = 'abrir:' || p_sim) then
    return public.lab_estado('{}'::jsonb);
  end if;
  perform pg_advisory_xact_lock(hashtext('lab_rayos:' || uid::text));
  select coalesce(sum(cantidad), 0) into saldo from public.lab_rayos where usuario = uid;
  if saldo < s.precio then
    return jsonb_build_object('error', 'Te faltan ' || (s.precio - saldo) || ' rayos', 'saldo', saldo);
  end if;
  insert into public.lab_rayos (usuario, clave, cantidad) values (uid, 'abrir:' || p_sim, -s.precio) on conflict do nothing;
  return public.lab_estado('{}'::jsonb);
end;
$$;
revoke all on function public.lab_abrir(text) from public, anon;
grant execute on function public.lab_abrir(text) to authenticated;
