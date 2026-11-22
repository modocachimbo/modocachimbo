-- =========================================================
-- Modo Cachimbo · 128: Mis compras (la Tienda guarda lo que compras)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 127-tienda.sql.
--
--   · Comprar ya no activa: la tarjeta se guarda en «Mis compras».
--   · Activar usa 1 cuando el alumno quiera (tienda_usar).
--   · Vidas ilimitadas, Doble XP y Fortuna se pueden pausar: el tiempo
--     que falta se guarda y se reanuda después (tienda_pausar / tienda_reanudar).
--   · Protección de racha: se puede quitar una que no se usó y vuelve a Mis compras.
--   · Cofre sorpresa se abre al comprarlo; si sale una tarjeta, va a Mis compras.
-- =========================================================

create table if not exists public.tienda_inv (
  usuario  uuid not null references auth.users (id) on delete cascade,
  item     text not null,
  cantidad integer not null default 0 check (cantidad between 0 and 999),
  primary key (usuario, item)
);
alter table public.tienda_inv enable row level security;

create table if not exists public.tienda_pausa (
  usuario  uuid not null references auth.users (id) on delete cascade,
  efecto   text not null check (efecto in ('infinito', 'doblexp', 'fortuna')),
  segundos integer not null default 0,
  primary key (usuario, efecto)
);
alter table public.tienda_pausa enable row level security;

create or replace function public.tienda_inv_sumar(u uuid, k text, n integer)
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare r integer;
begin
  insert into public.tienda_inv (usuario, item, cantidad) values (u, k, greatest(0, least(999, n)))
  on conflict (usuario, item) do update set cantidad = greatest(0, least(999, public.tienda_inv.cantidad + n))
  returning cantidad into r;
  return r;
end $$;
revoke all on function public.tienda_inv_sumar(uuid, text, integer) from public, anon, authenticated;

-- ---------- Lo que ve el alumno: ahora con Mis compras y pausas ----------
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
    'historial', coalesce((select jsonb_agg(jsonb_build_object('cantidad', x.cantidad, 'motivo', x.motivo, 'creado', x.creado) order by x.id desc)
                           from (select * from public.diamantes_mov d where d.usuario = uid order by d.id desc limit 12) x), '[]'::jsonb)
  );
end $$;
revoke all on function public.tienda_ver() from public, anon;
grant execute on function public.tienda_ver() to authenticated;

-- ---------- Comprar: se guarda (el cofre sorpresa se abre al toque) ----------
create or replace function public.tienda_comprar(p_item text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); it public.tienda_items; pr jsonb; r integer; k text;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into it from public.tienda_items where id = p_item and activo;
  if it.id is null then raise exception 'item_no_existe'; end if;
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

-- ---------- Activar 1 de Mis compras ----------
create or replace function public.tienda_usar(p_item text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); pr jsonb;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  perform pg_advisory_xact_lock(hashtext('tienda:' || uid::text));
  if coalesce((select v.cantidad from public.tienda_inv v where v.usuario = uid and v.item = p_item), 0) < 1 then raise exception 'sin_inventario'; end if;
  if p_item = 'sorpresa' then raise exception 'item_no_existe'; end if;
  pr := public.tienda_efecto(uid, p_item);
  perform public.tienda_inv_sumar(uid, p_item, -1);
  return public.tienda_ver() || jsonb_build_object('premio', pr, 'item', p_item);
end $$;
revoke all on function public.tienda_usar(text) from public, anon;
grant execute on function public.tienda_usar(text) to authenticated;

-- ---------- Pausar / reanudar (vidas ilimitadas, Doble XP, Fortuna) ----------
create or replace function public.tienda_pausar(p_efecto text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); h timestamptz; s integer;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if p_efecto not in ('infinito', 'doblexp', 'fortuna') then raise exception 'item_no_existe'; end if;
  perform pg_advisory_xact_lock(hashtext('tienda:' || uid::text));
  perform public.cz_estado(uid);
  select case p_efecto when 'infinito' then c.infinito_hasta when 'doblexp' then c.doble_xp_hasta else c.fortuna_hasta end into h
    from public.corazones c where c.usuario = uid for update;
  if h is null or h <= now() then raise exception 'nada_activo'; end if;
  s := ceil(extract(epoch from h - now()))::integer;
  insert into public.tienda_pausa (usuario, efecto, segundos) values (uid, p_efecto, s)
  on conflict (usuario, efecto) do update set segundos = public.tienda_pausa.segundos + excluded.segundos;
  if p_efecto = 'infinito' then update public.corazones set infinito_hasta = now(), actualizado = now() where usuario = uid;
  elsif p_efecto = 'doblexp' then update public.corazones set doble_xp_hasta = now(), actualizado = now() where usuario = uid;
  else update public.corazones set fortuna_hasta = now(), actualizado = now() where usuario = uid; end if;
  return public.tienda_ver();
end $$;
revoke all on function public.tienda_pausar(text) from public, anon;
grant execute on function public.tienda_pausar(text) to authenticated;

create or replace function public.tienda_reanudar(p_efecto text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); s integer; iv interval;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  perform pg_advisory_xact_lock(hashtext('tienda:' || uid::text));
  delete from public.tienda_pausa p where p.usuario = uid and p.efecto = p_efecto returning p.segundos into s;
  if coalesce(s, 0) <= 0 then raise exception 'nada_pausado'; end if;
  perform public.cz_estado(uid);
  iv := s * interval '1 second';
  if p_efecto = 'infinito' then update public.corazones set infinito_hasta = greatest(coalesce(infinito_hasta, now()), now()) + iv, actualizado = now() where usuario = uid;
  elsif p_efecto = 'doblexp' then update public.corazones set doble_xp_hasta = greatest(coalesce(doble_xp_hasta, now()), now()) + iv, actualizado = now() where usuario = uid;
  else update public.corazones set fortuna_hasta = greatest(coalesce(fortuna_hasta, now()), now()) + iv, actualizado = now() where usuario = uid; end if;
  return public.tienda_ver();
end $$;
revoke all on function public.tienda_reanudar(text) from public, anon;
grant execute on function public.tienda_reanudar(text) to authenticated;

-- ---------- Quitar una protección de racha que aún no se usó ----------
create or replace function public.tienda_escudo_quitar()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'sin sesión'; end if;
  perform pg_advisory_xact_lock(hashtext('tienda:' || uid::text));
  if coalesce((public.calc_racha(uid) ->> 'escudos')::integer, 0) < 1 then raise exception 'nada_activo'; end if;
  delete from public.racha_escudos e where e.id = (select max(x.id) from public.racha_escudos x where x.usuario = uid);
  perform public.tienda_inv_sumar(uid, 'escudo', 1);
  return public.tienda_ver();
end $$;
revoke all on function public.tienda_escudo_quitar() from public, anon;
grant execute on function public.tienda_escudo_quitar() to authenticated;
