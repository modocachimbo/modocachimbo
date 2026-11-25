-- =========================================================
-- Modo Cachimbo · Tienda: Fortuna y Ticket de sala piden clan
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 88-clanes.sql, 127-tienda.sql y 128-tienda-mis-compras.sql.
--
--   · tienda_ver ahora dice si el alumno tiene clan ('clan').
--   · Sin clan, Fortuna y Ticket de sala salen desactivados y al tocarlos
--     dice «Únete a un clan para comprar»; tienda_comprar tampoco los vende.
-- =========================================================

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
