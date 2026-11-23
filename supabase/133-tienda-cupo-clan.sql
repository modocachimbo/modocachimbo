-- =========================================================
-- Modo Cachimbo · Tienda: «+5 integrantes» para un clan
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 103, 120, 121, 127, 130 y 131.
--
--   · Cada clan tiene un cupo (antes siempre 20). Con la tarjeta
--     «+5 integrantes» sube de 5 en 5 hasta 40.
--   · Se compra con el ID del clan (7 números): sirve para tu clan o
--     para regalársela a otro clan. Cuesta 300 diamantes (se cambia en
--     la tabla tienda_items, fila «cupo5»).
--   · Unirse, pedir entrar, aceptar pedidos, el Top y «Todos los
--     clanes» ahora usan el cupo de cada clan en vez de 20 fijo.
-- =========================================================

alter table public.clanes add column if not exists cupo integer not null default 20;
alter table public.clanes drop constraint if exists clanes_cupo_check;
alter table public.clanes add constraint clanes_cupo_check check (cupo between 20 and 40);

create or replace function public.clan_cupo(c bigint)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce((select k.cupo from public.clanes k where k.id = c), 20);
$$;
revoke all on function public.clan_cupo(bigint) from public, anon, authenticated;

insert into public.tienda_items (id, nom, precio, orden) values ('cupo5', '+5 integrantes', 300, 12)
on conflict (id) do nothing;

-- ---------- Aceptar pedidos: hasta el cupo del clan ----------
create or replace function public.clan_responder_pedido(p_jugador integer, p_aceptar boolean)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); m public.clan_miembros; quien uuid;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into m from public.clan_miembros where usuario = uid;
  if m.usuario is null then raise exception 'sin_clan'; end if;
  if m.rol = 'miembro' then raise exception 'no_lider'; end if;
  quien := public.usuario_de_codigo(p_jugador);
  if quien is null or not exists (select 1 from public.clan_solicitudes where usuario = quien and clan = m.clan) then raise exception 'pedido_no_existe'; end if;
  if not coalesce(p_aceptar, false) then
    delete from public.clan_solicitudes where usuario = quien and clan = m.clan;
    return jsonb_build_object('ok', true);
  end if;
  perform 1 from public.clanes where id = m.clan for update;
  if exists (select 1 from public.clan_miembros where usuario = quien) then
    delete from public.clan_solicitudes where usuario = quien;
    raise exception 'ya_tiene_clan';
  end if;
  if (select count(*) from public.clan_miembros where clan = m.clan) >= public.clan_cupo(m.clan) then raise exception 'lleno'; end if;
  insert into public.clan_miembros (usuario, clan, rol) values (quien, m.clan, 'miembro');
  delete from public.clan_solicitudes where usuario = quien;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.clan_responder_pedido(integer, boolean) from public, anon;
grant execute on function public.clan_responder_pedido(integer, boolean) to authenticated;

create or replace function public.clan_unirse(p_codigo text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); c public.clanes; x text;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if exists (select 1 from public.clan_miembros where usuario = uid) then raise exception 'ya_en_clan'; end if;
  if public.clan_espera(uid) then raise exception 'espera'; end if;
  c := public.clan_buscar_fila(p_codigo);
  if c.id is null then raise exception 'no_existe'; end if;
  perform 1 from public.clanes where id = c.id for update;
  if (select count(*) from public.clan_miembros where clan = c.id) >= public.clan_cupo(c.id) then raise exception 'lleno'; end if;
  x := public.clan_cumple(uid, c);
  if x is not null then raise exception '%', x; end if;
  if c.aprobacion = 'solicitud' then
    return public.clan_pedir(c.id) || jsonb_build_object('pendiente', true);
  end if;
  insert into public.clan_miembros (usuario, clan, rol) values (uid, c.id, 'miembro');
  delete from public.clan_solicitudes where usuario = uid;
  return jsonb_build_object('id', c.id, 'nombre', c.nombre);
end $$;
revoke all on function public.clan_unirse(text) from public, anon;
grant execute on function public.clan_unirse(text) to authenticated;

create or replace function public.clan_pedir(p_clan bigint)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); c public.clanes; x text;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if exists (select 1 from public.clan_miembros where usuario = uid) then raise exception 'ya_en_clan'; end if;
  if public.clan_espera(uid) then raise exception 'espera'; end if;
  select * into c from public.clanes where id = p_clan and not cerrado;
  if c.id is null then raise exception 'no_existe'; end if;
  if (select count(*) from public.clan_miembros where clan = c.id) >= public.clan_cupo(c.id) then raise exception 'lleno'; end if;
  x := public.clan_cumple(uid, c);
  if x is not null then raise exception '%', x; end if;
  if c.aprobacion = 'abierto' then
    perform 1 from public.clanes where id = c.id for update;
    insert into public.clan_miembros (usuario, clan, rol) values (uid, c.id, 'miembro');
    delete from public.clan_solicitudes where usuario = uid;
    return jsonb_build_object('ok', true, 'unido', true, 'nombre', c.nombre);
  end if;
  delete from public.clan_solicitudes where usuario = uid and not public.clan_sol_viva(creado);
  if not exists (select 1 from public.clan_solicitudes where usuario = uid and clan = c.id)
     and (select count(*) from public.clan_solicitudes where usuario = uid) >= 3 then raise exception 'muchos_pedidos'; end if;
  insert into public.clan_solicitudes (usuario, clan) values (uid, c.id)
    on conflict (usuario, clan) do update set creado = now();
  return jsonb_build_object('ok', true, 'nombre', c.nombre);
end $$;
revoke all on function public.clan_pedir(bigint) from public, anon;
grant execute on function public.clan_pedir(bigint) to authenticated;

-- ---------- Top de clanes con el cupo ----------
create or replace function public.ranking_clanes()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); mio bigint; top jsonb; yo jsonb;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  perform public.clan_guardar_semana();
  select clan into mio from public.clan_miembros where usuario = uid;
  with orden as (
    select s.clan, s.xp, row_number() over (order by s.xp desc, s.clan) as puesto,
           (select count(*) from public.clan_miembros k where k.clan = s.clan) as miembros
    from public.clan_semanas s join public.clanes c on c.id = s.clan and not c.cerrado
    where s.semana = public.cz_lunes() and s.xp > 0
  ), filas as (
    select o.puesto, o.clan, jsonb_build_object('id', c.id, 'puesto', o.puesto, 'nombre', c.nombre, 'tag', c.tag, 'forma', c.forma,
             'simbolo', c.simbolo, 'color', c.color, 'oficial', c.oficial, 'miembros', o.miembros, 'xp', o.xp,
             'lleno', o.miembros >= coalesce(c.cupo, 20), 'cupo', coalesce(c.cupo, 20), 'mio', coalesce(o.clan = mio, false),
             'pedido', exists (select 1 from public.clan_solicitudes q where q.usuario = uid and q.clan = c.id and public.clan_sol_viva(q.creado))) as j
    from orden o join public.clanes c on c.id = o.clan
  )
  select coalesce(jsonb_agg(f.j order by f.puesto) filter (where f.puesto <= 10), '[]'::jsonb),
         (array_agg(f.j) filter (where f.clan = mio))[1]
    into top, yo from filas f;
  return jsonb_build_object('top', top, 'mio', yo, 'tengo_clan', mio is not null,
    'pedidos', (select count(*) from public.clan_solicitudes q where q.usuario = uid and public.clan_sol_viva(q.creado)),
    'total', (select count(*) from public.clan_semanas s join public.clanes c on c.id = s.clan and not c.cerrado where s.semana = public.cz_lunes() and s.xp > 0));
end $$;
revoke all on function public.ranking_clanes() from public, anon;
grant execute on function public.ranking_clanes() to authenticated;

-- ---------- Todos los clanes con el cupo ----------
create or replace function public.clanes_todos(p_buscar text default null, p_desde integer default 0)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid  uuid := auth.uid();
  mio  bigint;
  b    text := nullif(trim(coalesce(p_buscar, '')), '');
  idb  bigint;
  pat  text;
  desde integer := greatest(coalesce(p_desde, 0), 0);
  filas jsonb;
  total integer;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  perform public.clan_guardar_semana();
  select clan into mio from public.clan_miembros where usuario = uid;
  if b ~ '^\d{7}$' then idb := b::bigint - 1000000; end if;
  if b is not null then pat := '%' || replace(replace(replace(left(b, 30), '\', '\\'), '%', '\%'), '_', '\_') || '%'; end if;

  with base as (
    select c.*, coalesce(s.xp, 0) as xp_s,
           (select count(*) from public.clan_miembros k where k.clan = c.id) as n
      from public.clanes c
      left join public.clan_semanas s on s.clan = c.id and s.semana = public.cz_lunes()
     where not c.cerrado
  ), orden as (
    select b2.*, case when b2.xp_s > 0 then row_number() over (order by b2.xp_s desc, b2.id) end as puesto_s
      from base b2
  ), elegidos as (
    select o.* from orden o
     where pat is null or o.id = idb or o.nombre ilike pat or o.tag ilike pat
  )
  select (select count(*) from elegidos),
         coalesce((select jsonb_agg(j order by r) from (
           select row_number() over (order by (e.id = idb) desc, e.xp_s desc, e.n desc, e.id) as r,
                  jsonb_build_object('id', e.id, 'id_publico', public.clan_id_publico(e.id), 'nombre', e.nombre, 'tag', e.tag,
                    'forma', e.forma, 'simbolo', e.simbolo, 'color', e.color, 'oficial', e.oficial,
                    'miembros', e.n, 'xp', e.xp_s, 'puesto', e.puesto_s, 'lleno', e.n >= coalesce(e.cupo, 20), 'cupo', coalesce(e.cupo, 20),
                    'aprobacion', e.aprobacion, 'mio', coalesce(e.id = mio, false),
                    'pedido', exists (select 1 from public.clan_solicitudes q where q.usuario = uid and q.clan = e.id and public.clan_sol_viva(q.creado))) as j
             from elegidos e
            order by (e.id = idb) desc, e.xp_s desc, e.n desc, e.id
            offset desde limit 30) x), '[]'::jsonb)
    into total, filas;

  return jsonb_build_object('clanes', filas, 'total', total, 'mas', total > desde + 30, 'desde', desde,
    'tengo_clan', mio is not null);
end $$;
revoke all on function public.clanes_todos(text, integer) from public, anon;
grant execute on function public.clanes_todos(text, integer) to authenticated;

-- ---------- Datos del clan (mi_clan, vistas previas): ahora con el cupo ----------
create or replace function public.clan_logros(c bigint)
returns jsonb language sql stable security definer set search_path = '' as $$
  with cerradas as (
    select s.clan, s.semana, s.xp, s.meta, rank() over (partition by s.semana order by s.xp desc) as puesto
    from public.clan_semanas s where s.semana < public.cz_lunes() and s.xp > 0
  ), pts as (
    select coalesce((select sum(s.xp) from public.clan_semanas s where s.clan = c and s.semana < public.cz_lunes()), 0)::bigint
           + public.clan_xp_semana(c) as p
  ), viejo as (
    select least(5, 1 + (select count(*) from cerradas k where k.clan = c and k.xp >= k.meta))::integer as n
  ), nuevo as (
    select (select count(*) from unnest(public.clan_niveles()) u where u <= pts.p)::integer as n from pts
  )
  select jsonb_build_object(
    'nivel', greatest(viejo.n, nuevo.n),
    'puntos', pts.p,
    'niveles', to_jsonb(public.clan_niveles()),
    'copas', (select count(*) from cerradas k where k.clan = c and k.puesto <= 3),
    'victorias', public.clan_victorias(c),
    'id_publico', public.clan_id_publico(c)
  ) || coalesce((select jsonb_build_object('aprobacion', k.aprobacion, 'min_nivel', k.min_nivel, 'min_rango', k.min_rango,
       'eslogan', k.eslogan, 'cupo', coalesce(k.cupo, 20), 'etiquetas', to_jsonb(k.etiquetas)) from public.clanes k where k.id = c), '{}'::jsonb)
  from pts, viejo, nuevo;
$$;
revoke all on function public.clan_logros(bigint) from public, anon, authenticated;

-- ---------- Tienda: ahora dice el ID de tu clan ----------
create or replace function public.tienda_ver()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); c public.corazones; rc jsonb;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  perform public.cz_estado(uid);
  select * into c from public.corazones where usuario = uid;
  rc := public.calc_racha(uid);
  return jsonb_build_object(
    'diamantes', (select coalesce(sum(d.cantidad), 0)::integer from public.diamantes_mov d where d.usuario = uid),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'nom', i.nom, 'precio', i.precio) order by i.orden)
                         from public.tienda_items i where i.activo), '[]'::jsonb),
    'infinito_hasta', case when c.infinito_hasta > now() then c.infinito_hasta end,
    'doble_xp_hasta', case when c.doble_xp_hasta > now() then c.doble_xp_hasta end,
    'fortuna_hasta', case when c.fortuna_hasta > now() then c.fortuna_hasta end,
    'escudos', coalesce((rc ->> 'escudos')::integer, 0),
    'racha', coalesce((rc ->> 'actual')::integer, 0),
    'tickets', public.sala_tickets_de(uid),
    'rayos', public.rayos_saldo(uid),
    'inv', coalesce((select jsonb_object_agg(v.item, v.cantidad) from public.tienda_inv v where v.usuario = uid and v.cantidad > 0), '{}'::jsonb),
    'pausa', coalesce((select jsonb_object_agg(p.efecto, p.segundos) from public.tienda_pausa p where p.usuario = uid and p.segundos > 0), '{}'::jsonb),
    'id', (select j.codigo from public.jugador_id j where j.usuario = uid),
    -- Fortuna y Ticket de sala solo sirven con clan (sin clan salen desactivados)
    'clan', exists (select 1 from public.clan_miembros m where m.usuario = uid),
    -- ID de mi clan (para «+5 integrantes»)
    'clan_id', (select public.clan_id_publico(m.clan) from public.clan_miembros m where m.usuario = uid),
    'historial', coalesce((select jsonb_agg(jsonb_build_object('cantidad', x.cantidad, 'motivo', x.motivo, 'creado', x.creado) order by x.id desc)
                           from (select * from public.diamantes_mov d where d.usuario = uid order by d.id desc limit 12) x), '[]'::jsonb)
  );
end $$;
revoke all on function public.tienda_ver() from public, anon;
grant execute on function public.tienda_ver() to authenticated;

create or replace function public.tienda_comprar(p_item text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); it public.tienda_items; pr jsonb; r integer; k text;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into it from public.tienda_items where id = p_item and activo;
  if it.id is null then raise exception 'item_no_existe'; end if;
  if it.id = 'cupo5' then raise exception 'cupo_con_id'; end if;   -- se compra con tienda_comprar_cupo
  if it.id in ('fortuna', 'ticket') and not exists (select 1 from public.clan_miembros m where m.usuario = uid) then raise exception 'sin_clan'; end if;
  perform pg_advisory_xact_lock(hashtext('tienda:' || uid::text));
  if (select coalesce(sum(d.cantidad), 0) from public.diamantes_mov d where d.usuario = uid) < it.precio then raise exception 'pocos_diamantes'; end if;
  if it.id = 'sorpresa' then
    -- 30 % 300 XP · 20 % Doble XP · 20 % 40 de energía · 15 % vidas 1 día · 10 % 2 tickets · 5 % 150 diamantes
    r := floor(random() * 100)::integer;
    k := case when r < 30 then 'xp300' when r < 50 then 'doblexp' when r < 70 then 'energia40' when r < 85 then 'vida1' when r < 95 then 'ticket2' else 'dia150' end;
    if k in ('doblexp', 'vida1') then
      perform public.tienda_inv_sumar(uid, k, 1);
      pr := jsonb_build_object('tipo', 'guardado', 'item', k, 'cantidad', 1);
    else
      pr := public.tienda_efecto(uid, k);
    end if;
  else
    pr := jsonb_build_object('tipo', 'guardado', 'item', it.id, 'cantidad', public.tienda_inv_sumar(uid, it.id, 1));
  end if;
  perform public.diamantes_dar(uid, -it.precio, 'Tienda: ' || it.nom);
  insert into public.tienda_compras (usuario, item, precio, premio) values (uid, it.id, it.precio, pr);
  return public.tienda_ver() || jsonb_build_object('premio', pr, 'item', it.id);
end $$;
revoke all on function public.tienda_comprar(text) from public, anon;
grant execute on function public.tienda_comprar(text) to authenticated;

-- ---------- Comprar «+5 integrantes» para un clan (por su ID de 7 números) ----------
create or replace function public.tienda_comprar_cupo(p_clan integer)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); it public.tienda_items; c public.clanes; pr jsonb;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into it from public.tienda_items where id = 'cupo5' and activo;
  if it.id is null then raise exception 'item_no_existe'; end if;
  select * into c from public.clanes where id = coalesce(p_clan, 0)::bigint - 1000000 and not cerrado for update;
  if c.id is null then raise exception 'no_existe'; end if;
  if coalesce(c.cupo, 20) >= 40 then raise exception 'cupo_tope'; end if;
  perform pg_advisory_xact_lock(hashtext('tienda:' || uid::text));
  if (select coalesce(sum(d.cantidad), 0) from public.diamantes_mov d where d.usuario = uid) < it.precio then raise exception 'pocos_diamantes'; end if;
  update public.clanes set cupo = least(40, coalesce(cupo, 20) + 5) where id = c.id returning * into c;
  pr := jsonb_build_object('tipo', 'cupo', 'cantidad', 5, 'clan', c.nombre, 'clan_id', public.clan_id_publico(c.id), 'cupo', c.cupo,
    'mio', exists (select 1 from public.clan_miembros m where m.usuario = uid and m.clan = c.id));
  perform public.diamantes_dar(uid, -it.precio, left('Tienda: +5 integrantes para ' || c.nombre, 80));
  insert into public.tienda_compras (usuario, item, precio, premio) values (uid, it.id, it.precio, pr);
  return public.tienda_ver() || jsonb_build_object('premio', pr, 'item', it.id);
end $$;
revoke all on function public.tienda_comprar_cupo(integer) from public, anon;
grant execute on function public.tienda_comprar_cupo(integer) to authenticated;
