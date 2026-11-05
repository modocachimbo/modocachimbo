-- =========================================================
-- Modo Cachimbo · Acceso por ID (sin código)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 14-equipo.sql, 36-tarjeta-jugador.sql y 56-descarga-codigos-validos.sql.
--
--   · accesos_id: lo que el profe le dio a un alumno desde
--     Panel → Códigos → «Dar por ID» (un paquete, con fecha de fin
--     opcional y una nota que solo ve el panel). Va directo a la cuenta
--     de Google del alumno: no hay código que mandar.
--     Los paquetes son los mismos de los códigos (TODO-VIP, general,
--     seminario-VIP, vocabulario-VIP, biblioteca-VIP, descarga-VIP, area-x…).
--   · accesos_equipos: en qué equipos (celular o laptop) abrió el alumno
--     lo que tiene por ID. Solo valen los «equipos» más recientes
--     (ajustes 'acceso_id', 2 por defecto): si entra en uno más, el más
--     antiguo deja de abrir. Así una cuenta no se presta a todo el salón.
--   · Los códigos siguen igual: la web abre si hay código O acceso por ID.
--   · Las Descargas PDF también valen con descarga-VIP dado por ID.
-- =========================================================

create table if not exists public.accesos_id (
  id       bigserial primary key,
  usuario  uuid not null references auth.users (id) on delete cascade,
  producto text not null check (producto ~ '^[A-Za-z0-9_,-]+$' and char_length(producto) between 2 and 300),
  vence    text check (vence is null or vence ~ '^\d{4}-\d{2}-\d{2}$'),
  nota     text check (char_length(nota) <= 120),
  dado_por uuid references auth.users (id) on delete set null,
  creado   timestamptz not null default now(),
  visto    boolean not null default false,   -- el alumno ya vio el aviso «¡Acceso activado!»
  quitado  timestamptz
);
create index if not exists accesos_id_usuario on public.accesos_id (usuario) where quitado is null;
alter table public.accesos_id enable row level security;
-- Nadie lee ni escribe directo: solo con las funciones de abajo

create table if not exists public.accesos_equipos (
  usuario     uuid not null references auth.users (id) on delete cascade,
  dispositivo text not null check (dispositivo ~ '^d-[a-z0-9]{8,40}$'),
  equipo      text check (char_length(equipo) <= 60),
  visto       timestamptz not null default now(),
  primary key (usuario, dispositivo)
);
alter table public.accesos_equipos enable row level security;

-- ---------- Permiso: quien maneja los códigos también da por ID ----------
create or replace function public.acceso_id_puede()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is null or coalesce(public.es_admin(), false) or coalesce(public.puede('codigos'), false)
$$;
revoke all on function public.acceso_id_puede() from public, anon, authenticated;

create or replace function public.acceso_id_hoy()
returns text language sql stable set search_path = '' as $$
  select to_char((now() at time zone 'America/Lima')::date, 'YYYY-MM-DD')
$$;

-- Cuántos equipos por cuenta (0 = sin límite)
create or replace function public.acceso_id_equipos_max()
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce((select (a.valor ->> 'equipos')::int from public.ajustes a where a.clave = 'acceso_id'), 2)
$$;
revoke all on function public.acceso_id_equipos_max() from public, anon, authenticated;

-- ---------- Panel: ¿de quién es cada ID? (para ver antes de activar) ----------
create or replace function public.acceso_id_quienes(p_codigos integer[])
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.acceso_id_puede() then raise exception 'no autorizado'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', c, 'apodo', p.apodo, 'email', u.email, 'existe', j.usuario is not null) order by o)
      from unnest(coalesce(p_codigos, '{}')) with ordinality as x(c, o)
      left join public.jugador_id j on j.codigo = x.c
      left join auth.users u on u.id = j.usuario
      left join public.perfiles p on p.id = j.usuario), '[]'::jsonb);
end $$;
revoke all on function public.acceso_id_quienes(integer[]) from public, anon;
grant execute on function public.acceso_id_quienes(integer[]) to authenticated;

-- ---------- Panel: dar un paquete a uno o varios ID ----------
-- Devuelve { alumnos: a cuántos se les dio, sin_id: los ID que no existen }
create or replace function public.acceso_id_dar(p_codigos integer[], p_producto text, p_vence text default null, p_nota text default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare n integer; faltan integer[];
begin
  if not public.acceso_id_puede() then raise exception 'no autorizado'; end if;
  if p_codigos is null or cardinality(p_codigos) = 0 then raise exception 'Escribe al menos un ID'; end if;
  if coalesce(p_producto, '') !~ '^[A-Za-z0-9_,-]+$' or char_length(p_producto) not between 2 and 300 then raise exception 'Elige qué le das'; end if;
  if nullif(p_vence, '') is not null and p_vence !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Fecha inválida'; end if;
  select coalesce(array_agg(c), '{}') into faltan from unnest(p_codigos) c
   where not exists (select 1 from public.jugador_id j where j.codigo = c);
  insert into public.accesos_id (usuario, producto, vence, nota, dado_por)
    select distinct j.usuario, p_producto, nullif(p_vence, ''), nullif(left(trim(coalesce(p_nota, '')), 120), ''), auth.uid()
      from public.jugador_id j where j.codigo = any (p_codigos);
  get diagnostics n = row_count;
  return jsonb_build_object('alumnos', n, 'sin_id', to_jsonb(faltan));
end $$;
revoke all on function public.acceso_id_dar(integer[], text, text, text) from public, anon;
grant execute on function public.acceso_id_dar(integer[], text, text, text) to authenticated;

-- ---------- Panel: quitar uno ----------
create or replace function public.acceso_id_quitar(p_id bigint)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.acceso_id_puede() then raise exception 'no autorizado'; end if;
  update public.accesos_id set quitado = now() where id = p_id and quitado is null;
end $$;
revoke all on function public.acceso_id_quitar(bigint) from public, anon;
grant execute on function public.acceso_id_quitar(bigint) to authenticated;

-- ---------- Panel: lista de lo dado (los vigentes y los vencidos de los últimos 60 días) ----------
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

-- ---------- Panel: equipos por cuenta ----------
create or replace function public.acceso_id_equipos_guardar(p_max integer)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.acceso_id_puede() then raise exception 'no autorizado'; end if;
  if p_max is null or p_max < 0 or p_max > 20 then raise exception 'Número inválido'; end if;
  insert into public.ajustes (clave, valor) values ('acceso_id', jsonb_build_object('equipos', p_max))
  on conflict (clave) do update set valor = public.ajustes.valor || excluded.valor, actualizado = now();
end $$;
revoke all on function public.acceso_id_equipos_guardar(integer) from public, anon;
grant execute on function public.acceso_id_equipos_guardar(integer) to authenticated;

-- ---------- Alumno: lo que tengo por ID en este equipo ----------
-- Anota este equipo (solo si tiene algo por ID) y responde:
-- { id, permitido, equipos, max, lista: [{ id, producto, vence, nuevo }] }
-- permitido = false: este equipo quedó fuera porque la cuenta se abrió en otros más nuevos.
-- «nuevo» sale una sola vez (para el aviso «¡Acceso activado!»).
create or replace function public.mis_accesos_id(p_dispositivo text, p_equipo text default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); hoy text := public.acceso_id_hoy();
  mx integer := public.acceso_id_equipos_max(); lista jsonb; usados integer := 0; ok boolean := true;
begin
  if uid is null then return jsonb_build_object('lista', '[]'::jsonb, 'permitido', false); end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'producto', a.producto, 'vence', a.vence, 'nuevo', not a.visto) order by a.creado), '[]'::jsonb)
    into lista from public.accesos_id a
   where a.usuario = uid and a.quitado is null and (a.vence is null or a.vence >= hoy);
  if jsonb_array_length(lista) > 0 and coalesce(p_dispositivo, '') ~ '^d-[a-z0-9]{8,40}$' then
    insert into public.accesos_equipos (usuario, dispositivo, equipo) values (uid, p_dispositivo, left(p_equipo, 60))
    on conflict (usuario, dispositivo) do update set visto = now(), equipo = coalesce(excluded.equipo, public.accesos_equipos.equipo);
    select count(*) into usados from public.accesos_equipos e where e.usuario = uid;
    if mx > 0 and usados > mx then
      -- Solo valen los «mx» más recientes; los demás se borran (si vuelven, entran como nuevos)
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

-- ---------- Descargas PDF: descarga-VIP dado por ID también vale ----------
create or replace function public.descarga_por_id(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.accesos_id a
     where a.usuario = uid and a.quitado is null
       and a.producto ~ '(^|,)descarga-VIP(,|$)'
       and (a.vence is null or a.vence >= public.acceso_id_hoy()))
$$;
revoke all on function public.descarga_por_id(uuid) from public, anon, authenticated;

create or replace function public.descarga_con_codigo(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.descarga_codigos_alumno(uid)) or public.descarga_por_id(uid)
$$;
revoke all on function public.descarga_con_codigo(uuid) from public, anon, authenticated;
