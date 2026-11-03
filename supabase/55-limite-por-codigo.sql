-- =========================================================
-- Modo Cachimbo · Límite de descargas por código
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 53-descargas-pdf.sql y 54-descarga-aparte.sql.
--
--   · descarga_limites: cuántas descargas al día da cada código de
--     descarga (descarga-VIP). Ej.: MC-AAAA-1111 → 20, MC-BBBB-2222 → 5.
--     Se pone en Panel → Códigos al crear o editar el código.
--   · El límite es por alumno: cada alumno con ese código tiene ese cupo.
--   · Un código sin límite propio usa el de Panel → Descargas PDF.
--   · Si el alumno tiene varios códigos de descarga, vale el más alto.
--   · No suma consultas: se revisa dentro de descargas_estado, que ya
--     se llama una vez por descarga.
-- =========================================================

create table if not exists public.descarga_limites (
  codigo      text primary key check (codigo ~ '^[A-Z0-9_-]{3,40}$'),
  limite_dia  integer not null check (limite_dia between 1 and 500),
  actualizado timestamptz not null default now()
);
alter table public.descarga_limites enable row level security;   -- sin políticas: solo las funciones

-- ---------- Panel: poner o quitar el límite de un código ----------
-- p_limite vacío o 0 = el código usa el límite general
create or replace function public.descarga_limite_guardar(p_codigo text, p_limite integer)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare cod text := upper(trim(coalesce(p_codigo, '')));
begin
  if not (public.es_admin() or public.puede('codigos') or public.puede('descargas')) then raise exception 'no autorizado'; end if;
  if cod !~ '^[A-Z0-9_-]{3,40}$' then raise exception 'Código no válido'; end if;
  if coalesce(p_limite, 0) <= 0 then
    delete from public.descarga_limites where codigo = cod;
    return jsonb_build_object('ok', true, 'codigo', cod, 'limite_dia', null);
  end if;
  if p_limite > 500 then raise exception 'Máximo 500 descargas al día'; end if;
  insert into public.descarga_limites (codigo, limite_dia, actualizado) values (cod, p_limite, now())
  on conflict (codigo) do update set limite_dia = excluded.limite_dia, actualizado = now();
  return jsonb_build_object('ok', true, 'codigo', cod, 'limite_dia', p_limite);
end $$;
revoke all on function public.descarga_limite_guardar(text, integer) from public, anon;
grant execute on function public.descarga_limite_guardar(text, integer) to authenticated;

-- ---------- Panel: lista de límites { "MC-AAAA-1111": 20, ... } ----------
create or replace function public.descarga_limites_lista()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.es_admin() or public.puede('codigos') or public.puede('descargas')) then raise exception 'no autorizado'; end if;
  return coalesce((select jsonb_object_agg(l.codigo, l.limite_dia) from public.descarga_limites l), '{}'::jsonb);
end $$;
revoke all on function public.descarga_limites_lista() from public, anon;
grant execute on function public.descarga_limites_lista() to authenticated;

-- ---------- El límite propio más alto de los códigos de descarga del alumno (null = ninguno) ----------
create or replace function public.descarga_limite_alumno(uid uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select max(l.limite_dia)
  from public.codigos_cuenta c
  join public.descarga_limites l on l.codigo = upper(c.codigo)
  where c.usuario = uid and c.quitado is null
    and c.producto ~ '(^|,)descarga-VIP(,|$)'
    and (c.vence is null or c.vence = '' or c.vence >= to_char((now() at time zone 'America/Lima')::date, 'YYYY-MM-DD'))
$$;
revoke all on function public.descarga_limite_alumno(uuid) from public, anon, authenticated;

-- ---------- Lo que la web necesita saber (igual que en 53, con el límite por código) ----------
create or replace function public.descargas_estado()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  cfg jsonb := public.descargas_cfg();
  hoy timestamptz := ((now() at time zone 'America/Lima')::date)::timestamp at time zone 'America/Lima';
  mes timestamptz := (date_trunc('month', now() at time zone 'America/Lima'))::timestamp at time zone 'America/Lima';
  equipo boolean := public.es_admin() or public.puede('descargas');
  ud integer := 0; um integer := 0; ld integer; lm integer;
begin
  ld := coalesce((cfg ->> 'limite_dia')::int, 0); lm := coalesce((cfg ->> 'limite_mes')::int, 0);
  if uid is not null then
    -- El código de descarga puede traer su propio límite por día
    ld := coalesce(public.descarga_limite_alumno(uid), ld);
    select count(*) filter (where d.creado >= hoy), count(*) filter (where d.creado >= mes) into ud, um
    from public.descargas d where d.usuario = uid and d.creado >= least(hoy, mes);
  end if;
  return jsonb_build_object(
    'activo', (cfg ->> 'activo')::boolean or equipo,
    'abierto', (cfg ->> 'abierto')::boolean,
    'tipos', cfg -> 'tipos', 'ficha', coalesce((cfg ->> 'ficha')::boolean, true),
    'sesion', uid is not null,
    'acceso', uid is not null and (equipo or (cfg ->> 'abierto')::boolean or public.descarga_con_codigo(uid)),
    'bloqueado', uid is not null and exists (select 1 from public.descarga_bloqueos b where b.usuario = uid),
    'equipo', equipo,
    'limite_dia', ld, 'usadas_dia', ud, 'quedan_dia', case when equipo or ld = 0 then null else greatest(ld - ud, 0) end,
    'limite_mes', lm, 'usadas_mes', um, 'quedan_mes', case when equipo or lm = 0 then null else greatest(lm - um, 0) end);
end $$;
revoke all on function public.descargas_estado() from public, anon;
grant execute on function public.descargas_estado() to anon, authenticated;
