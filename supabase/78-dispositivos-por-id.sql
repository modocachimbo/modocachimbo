-- =========================================================
-- Modo Cachimbo · Dispositivos para cada acceso por ID
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 70, 76 y 77 (acceso por ID).
--
--   · accesos_id.max_equipos: en cuántos equipos abre ese acceso,
--     igual que «Dispositivos» en los códigos. Vacío = el general de
--     «Acceso libre y ajustes»; 0 = sin límite.
--   · Si el alumno tiene varios accesos por ID, vale el número más alto.
-- =========================================================

alter table public.accesos_id add column if not exists max_equipos integer;
alter table public.accesos_id drop constraint if exists accesos_id_max_equipos_check;
alter table public.accesos_id add constraint accesos_id_max_equipos_check check (max_equipos is null or max_equipos between 0 and 100);

-- Cuántos equipos puede usar este alumno con lo que tiene por ID hoy (0 = sin límite)
create or replace function public.acceso_id_equipos_de(uid uuid)
returns integer language sql stable security definer set search_path = '' as $$
  with m as (
    select coalesce(a.max_equipos, public.acceso_id_equipos_max()) as mx
      from public.accesos_id a
     where a.usuario = uid and a.quitado is null and (a.vence is null or a.vence >= public.acceso_id_hoy()))
  select case when not exists (select 1 from m) then public.acceso_id_equipos_max()
              when exists (select 1 from m where mx = 0) then 0
              else (select max(mx) from m) end
$$;
revoke all on function public.acceso_id_equipos_de(uuid) from public, anon, authenticated;

-- ---------- Dar (con dispositivos) ----------
drop function if exists public.acceso_id_dar(integer[], text, text, text, integer);
create or replace function public.acceso_id_dar(p_codigos integer[], p_producto text, p_vence text default null, p_nota text default null, p_limite integer default null, p_equipos integer default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare n integer; faltan integer[]; lim integer := nullif(p_limite, 0);
begin
  if not public.acceso_id_puede() then raise exception 'no autorizado'; end if;
  if p_codigos is null or cardinality(p_codigos) = 0 then raise exception 'Escribe al menos un ID'; end if;
  if coalesce(p_producto, '') !~ '^[A-Za-z0-9_,-]+$' or char_length(p_producto) not between 2 and 300 then raise exception 'Elige qué le das'; end if;
  if nullif(p_vence, '') is not null and p_vence !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Fecha inválida'; end if;
  if lim is not null and (lim < 1 or lim > 500) then raise exception 'Descargas por día: de 1 a 500'; end if;
  if p_equipos is not null and (p_equipos < 0 or p_equipos > 100) then raise exception 'Dispositivos: de 1 a 100 (o sin límite)'; end if;
  if p_producto !~ '(^|,)descarga-VIP(,|$)' then lim := null; end if;
  select coalesce(array_agg(c), '{}') into faltan from unnest(p_codigos) c
   where not exists (select 1 from public.jugador_id j where j.codigo = c);
  insert into public.accesos_id (usuario, producto, vence, nota, dado_por, limite_dia, max_equipos)
    select distinct j.usuario, p_producto, nullif(p_vence, ''), nullif(left(trim(coalesce(p_nota, '')), 120), ''), auth.uid(), lim, p_equipos
      from public.jugador_id j where j.codigo = any (p_codigos);
  get diagnostics n = row_count;
  return jsonb_build_object('alumnos', n, 'sin_id', to_jsonb(faltan));
end $$;
revoke all on function public.acceso_id_dar(integer[], text, text, text, integer, integer) from public, anon;
grant execute on function public.acceso_id_dar(integer[], text, text, text, integer, integer) to authenticated;

-- ---------- Editar (con dispositivos) ----------
drop function if exists public.acceso_id_editar(bigint, text, text, text, integer);
create or replace function public.acceso_id_editar(p_id bigint, p_producto text, p_vence text default null, p_nota text default null, p_limite integer default null, p_equipos integer default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare lim integer := nullif(p_limite, 0);
begin
  if not public.acceso_id_puede() then raise exception 'no autorizado'; end if;
  if coalesce(p_producto, '') !~ '^[A-Za-z0-9_,-]+$' or char_length(p_producto) not between 2 and 300 then raise exception 'Elige qué le das'; end if;
  if nullif(p_vence, '') is not null and p_vence !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Fecha inválida'; end if;
  if lim is not null and (lim < 1 or lim > 500) then raise exception 'Descargas por día: de 1 a 500'; end if;
  if p_equipos is not null and (p_equipos < 0 or p_equipos > 100) then raise exception 'Dispositivos: de 1 a 100 (o sin límite)'; end if;
  if p_producto !~ '(^|,)descarga-VIP(,|$)' then lim := null; end if;
  update public.accesos_id
     set producto = p_producto, vence = nullif(p_vence, ''), nota = nullif(left(trim(coalesce(p_nota, '')), 120), ''),
         limite_dia = lim, max_equipos = p_equipos
   where id = p_id and quitado is null;
  if not found then raise exception 'Ese acceso ya no existe'; end if;
end $$;
revoke all on function public.acceso_id_editar(bigint, text, text, text, integer, integer) from public, anon;
grant execute on function public.acceso_id_editar(bigint, text, text, text, integer, integer) to authenticated;

-- ---------- Lista (con dispositivos) ----------
create or replace function public.acceso_id_lista()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.acceso_id_puede() then raise exception 'no autorizado'; end if;
  return jsonb_build_object(
    'equipos', public.acceso_id_equipos_max(),
    'hoy', public.acceso_id_hoy(),
    'lista', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', a.id, 'usuario', a.usuario, 'jid', j.codigo, 'apodo', p.apodo, 'email', u.email,
          'producto', a.producto, 'vence', a.vence, 'nota', a.nota, 'creado', a.creado, 'visto', a.visto,
          'limite_dia', a.limite_dia, 'max_equipos', a.max_equipos,
          'equipos', coalesce((select jsonb_agg(jsonb_build_object('dispositivo', e.dispositivo, 'equipo', e.equipo, 'visto', e.visto) order by e.visto desc)
                                 from public.accesos_equipos e where e.usuario = a.usuario), '[]'::jsonb))
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

-- ---------- Alumno: el límite de equipos ahora sale de sus accesos ----------
create or replace function public.mis_accesos_id(p_dispositivo text, p_equipo text default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); hoy text := public.acceso_id_hoy();
  mx integer; lista jsonb; usados integer := 0; ok boolean := true;
begin
  if uid is null then return jsonb_build_object('lista', '[]'::jsonb, 'permitido', false); end if;
  mx := public.acceso_id_equipos_de(uid);
  select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'producto', a.producto, 'vence', a.vence, 'nuevo', not a.visto) order by a.creado), '[]'::jsonb)
    into lista from public.accesos_id a
   where a.usuario = uid and a.quitado is null and (a.vence is null or a.vence >= hoy);
  if jsonb_array_length(lista) > 0 and coalesce(p_dispositivo, '') ~ '^d-[a-z0-9]{8,40}$' then
    insert into public.accesos_equipos (usuario, dispositivo, equipo) values (uid, p_dispositivo, left(p_equipo, 60))
    on conflict (usuario, dispositivo) do update set visto = now(), equipo = coalesce(excluded.equipo, public.accesos_equipos.equipo);
    select count(*) into usados from public.accesos_equipos e where e.usuario = uid;
    if mx > 0 and usados > mx then
      delete from public.accesos_equipos e where e.usuario = uid and e.dispositivo not in (
        select x.dispositivo from public.accesos_equipos x where x.usuario = uid order by x.visto desc limit mx);
      usados := mx;
    end if;
    ok := exists (select 1 from public.accesos_equipos e where e.usuario = uid and e.dispositivo = p_dispositivo);
    update public.accesos_id set visto = true where usuario = uid and not visto and quitado is null;
  end if;
  return jsonb_build_object('id', (select j.codigo from public.jugador_id j where j.usuario = uid),
    'permitido', ok, 'equipos', usados, 'max', mx, 'lista', lista);
end $$;
revoke all on function public.mis_accesos_id(text, text) from public, anon;
grant execute on function public.mis_accesos_id(text, text) to authenticated;
