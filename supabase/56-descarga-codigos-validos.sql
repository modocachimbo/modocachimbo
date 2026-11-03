-- =========================================================
-- Modo Cachimbo · Solo valen los códigos de descarga reales
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 53, 54 y 55.
-- DESPUÉS DE CORRERLO: abre una vez Panel → Códigos (entrando con tu
-- cuenta de Google) para que se copien tus códigos de descarga.
--
-- Antes, la cuenta del alumno guardaba el código que él mismo mandaba
-- (guardar_codigos_cuenta), así que alguien podía inventar un código
-- «descarga-VIP» y descargar sin pagar.
-- Ahora:
--   · descarga_codigos: copia de los códigos de descarga de tu hoja
--     (código, dispositivos, vence, activo). Solo el panel la escribe.
--   · Un alumno descarga solo si el código guardado en su cuenta está
--     en esa lista, activo y sin vencer.
--   · El máximo de dispositivos del código también vale aquí: si el
--     código es para 2, solo las 2 primeras cuentas que lo activaron
--     pueden descargar (0 = sin límite).
--   · Si borras o desactivas un código en el panel, deja de descargar.
-- =========================================================

create table if not exists public.descarga_codigos (
  codigo      text primary key check (codigo ~ '^[A-Z0-9_-]{3,40}$'),
  max         integer not null default 0 check (max between 0 and 10000),
  vence       text,
  activo      boolean not null default true,
  actualizado timestamptz not null default now()
);
alter table public.descarga_codigos enable row level security;   -- sin políticas: solo las funciones

-- ---------- Panel: copia la lista completa de códigos de descarga ----------
-- p = [{ "codigo": "MC-AAAA-1111", "max": 2, "vence": "2027-03-31", "activo": true }, ...]
-- Los que ya no vienen en la lista (borrados en el panel) se quitan.
create or replace function public.descarga_codigos_sincronizar(p jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare n integer := 0; x jsonb; cod text; lista text[] := '{}';
begin
  if not (public.es_admin() or public.puede('codigos')) then raise exception 'no autorizado'; end if;
  if jsonb_typeof(coalesce(p, '[]'::jsonb)) <> 'array' then raise exception 'lista inválida'; end if;
  for x in select value from jsonb_array_elements(p) loop
    cod := upper(trim(coalesce(x ->> 'codigo', '')));
    if cod ~ '^[A-Z0-9_-]{3,40}$' then
      insert into public.descarga_codigos (codigo, max, vence, activo, actualizado)
      values (cod, least(greatest(coalesce((x ->> 'max')::int, 0), 0), 10000),
              nullif(left(coalesce(x ->> 'vence', ''), 20), ''), coalesce((x ->> 'activo')::boolean, true), now())
      on conflict (codigo) do update set max = excluded.max, vence = excluded.vence, activo = excluded.activo, actualizado = now()
      where (public.descarga_codigos.max, public.descarga_codigos.vence, public.descarga_codigos.activo)
            is distinct from (excluded.max, excluded.vence, excluded.activo);
      lista := lista || cod;
      n := n + 1;
    end if;
  end loop;
  delete from public.descarga_codigos d where not (d.codigo = any (lista));
  return jsonb_build_object('ok', true, 'codigos', n);
end $$;
revoke all on function public.descarga_codigos_sincronizar(jsonb) from public, anon;
grant execute on function public.descarga_codigos_sincronizar(jsonb) to authenticated;

-- ---------- Códigos de descarga del alumno que valen hoy ----------
-- Un código vale si está en descarga_codigos, activo, sin vencer, y el alumno
-- está entre las primeras «max» cuentas que lo guardaron (max 0 = sin límite).
create or replace function public.descarga_codigos_alumno(uid uuid)
returns table (cod text) language sql stable security definer set search_path = '' as $$
  select d.codigo
  from public.codigos_cuenta c
  join public.descarga_codigos d on d.codigo = upper(c.codigo)
  where c.usuario = uid and c.quitado is null and d.activo
    and (d.vence is null or d.vence = '' or d.vence >= to_char((now() at time zone 'America/Lima')::date, 'YYYY-MM-DD'))
    and (d.max = 0 or (
      select count(*) from public.codigos_cuenta o
      where upper(o.codigo) = d.codigo and o.quitado is null and o.usuario <> uid
        and (o.creado, o.usuario) < (c.creado, c.usuario)) < d.max)
$$;
revoke all on function public.descarga_codigos_alumno(uuid) from public, anon, authenticated;

-- ¿Tiene este alumno un código de descarga real y vigente?
create or replace function public.descarga_con_codigo(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.descarga_codigos_alumno(uid))
$$;
revoke all on function public.descarga_con_codigo(uuid) from public, anon, authenticated;

-- El límite por día también sale solo de códigos reales (el más alto)
create or replace function public.descarga_limite_alumno(uid uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select max(l.limite_dia)
  from public.descarga_codigos_alumno(uid) v
  join public.descarga_limites l on l.codigo = v.cod
$$;
revoke all on function public.descarga_limite_alumno(uuid) from public, anon, authenticated;
