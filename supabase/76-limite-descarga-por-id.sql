-- =========================================================
-- Modo Cachimbo · Límite de Descargas PDF al dar acceso por ID
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 70-acceso-por-id.sql y 56-descarga-codigos-validos.sql.
--
--   · accesos_id.limite_dia: cuántos PDF al día puede bajar ese alumno
--     con lo que le diste por ID (vacío = el límite general de
--     Panel → Descargas PDF). Igual que el límite por código.
--   · Si el alumno tiene varios (códigos y/o por ID), vale el más alto.
-- =========================================================

alter table public.accesos_id add column if not exists limite_dia integer;
alter table public.accesos_id drop constraint if exists accesos_id_limite_dia_check;
alter table public.accesos_id add constraint accesos_id_limite_dia_check check (limite_dia is null or limite_dia between 1 and 500);

-- ---------- Panel: dar un paquete a uno o varios ID (ahora con límite de descargas) ----------
drop function if exists public.acceso_id_dar(integer[], text, text, text);
create or replace function public.acceso_id_dar(p_codigos integer[], p_producto text, p_vence text default null, p_nota text default null, p_limite integer default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare n integer; faltan integer[]; lim integer := nullif(p_limite, 0);
begin
  if not public.acceso_id_puede() then raise exception 'no autorizado'; end if;
  if p_codigos is null or cardinality(p_codigos) = 0 then raise exception 'Escribe al menos un ID'; end if;
  if coalesce(p_producto, '') !~ '^[A-Za-z0-9_,-]+$' or char_length(p_producto) not between 2 and 300 then raise exception 'Elige qué le das'; end if;
  if nullif(p_vence, '') is not null and p_vence !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Fecha inválida'; end if;
  if lim is not null and (lim < 1 or lim > 500) then raise exception 'Descargas por día: de 1 a 500'; end if;
  -- El límite solo tiene sentido si va con Descargas PDF
  if p_producto !~ '(^|,)descarga-VIP(,|$)' then lim := null; end if;
  select coalesce(array_agg(c), '{}') into faltan from unnest(p_codigos) c
   where not exists (select 1 from public.jugador_id j where j.codigo = c);
  insert into public.accesos_id (usuario, producto, vence, nota, dado_por, limite_dia)
    select distinct j.usuario, p_producto, nullif(p_vence, ''), nullif(left(trim(coalesce(p_nota, '')), 120), ''), auth.uid(), lim
      from public.jugador_id j where j.codigo = any (p_codigos);
  get diagnostics n = row_count;
  return jsonb_build_object('alumnos', n, 'sin_id', to_jsonb(faltan));
end $$;
revoke all on function public.acceso_id_dar(integer[], text, text, text, integer) from public, anon;
grant execute on function public.acceso_id_dar(integer[], text, text, text, integer) to authenticated;

-- ---------- Panel: lista (con el límite de descargas) ----------
create or replace function public.acceso_id_lista()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.acceso_id_puede() then raise exception 'no autorizado'; end if;
  return jsonb_build_object(
    'equipos', public.acceso_id_equipos_max(),
    'hoy', public.acceso_id_hoy(),
    'lista', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', a.id, 'jid', j.codigo, 'apodo', p.apodo, 'email', u.email,
          'producto', a.producto, 'vence', a.vence, 'nota', a.nota, 'creado', a.creado, 'visto', a.visto,
          'limite_dia', a.limite_dia,
          'equipos', (select count(*) from public.accesos_equipos e where e.usuario = a.usuario))
        order by a.creado desc)
        from public.accesos_id a
        join auth.users u on u.id = a.usuario
        left join public.jugador_id j on j.usuario = a.usuario
        left join public.perfiles p on p.id = a.usuario
       where a.quitado is null
         and (a.vence is null or a.vence >= to_char((now() at time zone 'America/Lima')::date - 60, 'YYYY-MM-DD'))),
      '[]'::jsonb));
end $$;
revoke all on function public.acceso_id_lista() from public, anon;
grant execute on function public.acceso_id_lista() to authenticated;

-- ---------- El límite por día del alumno: el más alto entre sus códigos y lo dado por ID ----------
create or replace function public.descarga_limite_alumno(uid uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select greatest(
    (select max(l.limite_dia)
       from public.descarga_codigos_alumno(uid) v
       join public.descarga_limites l on l.codigo = v.cod),
    (select max(a.limite_dia)
       from public.accesos_id a
      where a.usuario = uid and a.quitado is null and a.limite_dia is not null
        and a.producto ~ '(^|,)descarga-VIP(,|$)'
        and (a.vence is null or a.vence >= public.acceso_id_hoy())))
$$;
revoke all on function public.descarga_limite_alumno(uuid) from public, anon, authenticated;
