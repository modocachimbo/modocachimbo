-- =========================================================
-- Modo Cachimbo · Códigos quitados de la cuenta ya no vuelven
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 15-codigos-cuenta.sql y 14-equipo.sql (puede).
--
--   · Antes, al quitar un código de Perfil · Mis accesos se borraba la
--     fila de codigos_cuenta, pero otro equipo (u otro navegador) que
--     aún lo tenía guardado lo volvía a subir al entrar, y en este
--     equipo reaparecía. Ahora la fila queda marcada (quitado) y la
--     sincronización ya no la revive: solo vuelve si el alumno escribe
--     el código otra vez (activar).
--   · Los equipos que aún lo tienen guardado con su aviso (Ya no existe,
--     Venció…) lo borran solos al ver la marca.
--   · limpiar_codigos_cuentas: el botón «Limpiar cuentas» de Panel ·
--     Códigos marca en todas las cuentas los códigos que ya no sirven
--     (borrados, vencidos o desactivados).
-- =========================================================

alter table public.codigos_cuenta add column if not exists quitado timestamptz;

-- Guarda en la cuenta los códigos que ya funcionan en este dispositivo.
-- p = [{ "codigo": "MC-ABCD-EFGH", "producto": "fijas-VIP", "vence": "2027-03-31", "nuevo": true }, ...]
-- "nuevo": recién activado (escrito por el alumno): vuelve aunque lo haya quitado antes.
-- Sin "nuevo" (sincronización entre equipos) un código quitado no se revive.
create or replace function public.guardar_codigos_cuenta(p jsonb)
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); x jsonb; n integer := 0; cod text; nuevo boolean;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if jsonb_typeof(coalesce(p, '[]'::jsonb)) <> 'array' then raise exception 'lista inválida'; end if;
  for x in select value from jsonb_array_elements(p) with ordinality a(value, i) where i <= 20 loop
    cod := upper(coalesce(x ->> 'codigo', ''));
    nuevo := coalesce((x ->> 'nuevo')::boolean, false);
    if cod ~ '^[A-Z0-9_-]{3,40}$' and coalesce(x ->> 'producto', '') <> ''
       and (select count(*) from public.codigos_cuenta c where c.usuario = uid and c.quitado is null) < 30 then
      insert into public.codigos_cuenta (usuario, codigo, producto, vence)
      values (uid, cod, left(x ->> 'producto', 300), nullif(left(coalesce(x ->> 'vence', ''), 20), ''))
      on conflict (usuario, codigo) do update set producto = excluded.producto,
        vence = coalesce(excluded.vence, public.codigos_cuenta.vence),
        quitado = case when nuevo then null else public.codigos_cuenta.quitado end,
        creado = case when nuevo and public.codigos_cuenta.quitado is not null then now() else public.codigos_cuenta.creado end;
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;
revoke all on function public.guardar_codigos_cuenta(jsonb) from public, anon;
grant execute on function public.guardar_codigos_cuenta(jsonb) to authenticated;

-- Quita un código de la cuenta: queda marcado para que ningún equipo lo vuelva a subir.
-- Si la cuenta no lo tenía, igual deja la marca (otro equipo podría subirlo después).
create or replace function public.quitar_codigo_cuenta(p_codigo text)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); cod text := upper(coalesce(p_codigo, ''));
begin
  if uid is null or cod !~ '^[A-Z0-9_-]{3,40}$' then return; end if;
  insert into public.codigos_cuenta (usuario, codigo, producto, quitado)
  values (uid, cod, '-', now())
  on conflict (usuario, codigo) do update set quitado = now();
  -- Que las marcas no crezcan sin fin: se quedan las 60 más recientes
  delete from public.codigos_cuenta c where c.usuario = uid and c.quitado is not null
    and c.codigo not in (select d.codigo from public.codigos_cuenta d where d.usuario = uid and d.quitado is not null order by d.quitado desc limit 60);
end $$;
revoke all on function public.quitar_codigo_cuenta(text) from public, anon;
grant execute on function public.quitar_codigo_cuenta(text) to authenticated;

-- Panel · Códigos · «Limpiar cuentas». p_validos = los códigos que aún sirven
-- (activos o llenos). Marca como quitados, en todas las cuentas, los demás.
-- p_probar = true: solo cuenta, no cambia nada. Devuelve { codigos, cuentas, filas }.
create or replace function public.limpiar_codigos_cuentas(p_validos text[], p_probar boolean default true)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare v text[]; r jsonb;
begin
  if not public.puede('codigos') then raise exception 'no autorizado'; end if;
  if p_validos is null then raise exception 'falta la lista de códigos'; end if;
  select coalesce(array_agg(upper(x)), '{}') into v from unnest(p_validos) x;
  select jsonb_build_object('codigos', count(distinct c.codigo), 'cuentas', count(distinct c.usuario), 'filas', count(*),
           'lista', coalesce((select jsonb_agg(t) from (select distinct d.codigo from public.codigos_cuenta d
                    where d.quitado is null and not (d.codigo = any (v)) order by d.codigo limit 50) s(t)), '[]'::jsonb))
    into r from public.codigos_cuenta c where c.quitado is null and not (c.codigo = any (v));
  if not p_probar then
    update public.codigos_cuenta set quitado = now() where quitado is null and not (codigo = any (v));
  end if;
  return r;
end $$;
revoke all on function public.limpiar_codigos_cuentas(text[], boolean) from public, anon;
grant execute on function public.limpiar_codigos_cuentas(text[], boolean) to authenticated;
