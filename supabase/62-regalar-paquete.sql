-- =========================================================
-- Modo Cachimbo · Regalar recursos por ID y en paquete
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 31-coleccion.sql, 38-ver-jugador.sql y 43-ayudantes-regalos.sql.
--
--   · regalar_items(items, correos, codigos, mensaje): entrega uno o
--     varios ítems de la colección (un paquete) de una sola vez.
--       - correos y codigos en null: a todos los alumnos con cuenta.
--       - si no: a los que tengan uno de esos correos o uno de esos ID
--         (el ID de 5 cifras de su tarjeta).
--     Quien ya tenía un ítem no lo recibe dos veces.
--     Devuelve { alumnos: a cuántos les llegó algo, entregas: ítems
--     entregados en total, sin_id: los ID que no existen }.
--   · Lo usa Panel → Recursos (al publicar un regalo y en «Regalar»).
-- =========================================================

create or replace function public.regalar_items(p_items text[], p_emails text[] default null, p_codigos integer[] default null, p_mensaje text default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare n integer; a integer; faltan integer[];
begin
  -- Desde el SQL Editor no hay sesión (auth.uid() es null) y se permite; desde la web, admins o quien sube recursos
  if auth.uid() is not null and not (public.es_admin() or public.puede('recursos')) then raise exception 'no autorizado'; end if;
  if p_items is null or cardinality(p_items) = 0 then raise exception 'Elige al menos un ítem'; end if;
  if exists (select 1 from unnest(p_items) i where not exists (select 1 from public.coleccion_item c where c.id = i)) then
    raise exception 'Uno de los ítems ya no existe';
  end if;
  select coalesce(array_agg(c), '{}') into faltan from unnest(coalesce(p_codigos, '{}')) c
   where not exists (select 1 from public.jugador_id j where j.codigo = c);

  with para as (
    select u.id from auth.users u
     where (p_emails is null and p_codigos is null)
        or lower(u.email) = any (select lower(e) from unnest(coalesce(p_emails, '{}')) e)
        or u.id in (select j.usuario from public.jugador_id j where j.codigo = any (coalesce(p_codigos, '{}')))
  ), nuevos as (
    insert into public.coleccion_mia (usuario, item, origen, mensaje)
      select p.id, i, 'regalo', nullif(left(trim(coalesce(p_mensaje, '')), 120), '')
        from para p cross join (select distinct x as i from unnest(p_items) x) it
      on conflict (usuario, item) do nothing
      returning usuario
  )
  select count(*), count(distinct usuario) into n, a from nuevos;
  return jsonb_build_object('alumnos', a, 'entregas', n, 'sin_id', to_jsonb(faltan));
end $$;
revoke all on function public.regalar_items(text[], text[], integer[], text) from public, anon;
grant execute on function public.regalar_items(text[], text[], integer[], text) to authenticated;
