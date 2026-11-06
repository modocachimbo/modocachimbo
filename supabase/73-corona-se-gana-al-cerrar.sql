-- =========================================================
-- Modo Cachimbo · La corona «Top global» ya no se pone sola
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 64-influencers.sql, 65-corona-se-pone-sola.sql y 69-corona-solo-top-actual.sql.
--
--   · Durante la semana nadie lleva la corona puesta de forma automática.
--   · Quien cierra la semana en el 1.º, 2.º o 3.º puesto del Top gana la
--     corona para siempre (como antes) y él decide si se la pone en su
--     vitrina. Si se la pone, sale en su tarjeta y como su pin en los tops.
-- =========================================================

-- Nadie lleva corona «automática»
create or replace function public.corona_ahora(u uuid)
returns text language sql stable security definer set search_path = '' as $$
  select null::text;
$$;
revoke all on function public.corona_ahora(uuid) from public, anon, authenticated;

-- La corona se tiene solo al cerrar una semana en ese puesto (o si te la regalaron)
create or replace function public.col_tiene(uid uuid, p_item text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare r jsonb; mins int[] := array[20, 1500, 4000, 8000, 12000];
begin
  select i.regla into r from public.coleccion_item i where i.id = p_item and i.visible;
  if r is null then return false; end if;
  if r ->> 'tipo' = 'grupo' then
    return exists (select 1 from public.grupo_miembro g where g.usuario = uid and g.grupo = r ->> 'g');
  end if;
  if exists (select 1 from public.coleccion_mia m where m.usuario = uid and m.item = p_item) then return true; end if;
  case r ->> 'tipo'
    when 'gratis' then return true;
    when 'racha' then
      return coalesce((public.calc_racha(uid) ->> 'mejor')::int, 0) >= (r ->> 'n')::int
          or coalesce((public.calc_racha(uid) ->> 'actual')::int, 0) >= (r ->> 'n')::int;
    when 'rango' then
      return exists (select 1 from public.xp_semana x where x.usuario = uid and x.xp >= mins[(r ->> 'n')::int + 1]);
    when 'top' then
      return coalesce((public.mis_tops(uid) ->> (r ->> 'n'))::int, 0) > 0;
    else return false;
  end case;
end $$;
revoke all on function public.col_tiene(uuid, text) from public, anon, authenticated;

-- El pin que otros ven en los tops: el primero de tu vitrina (una corona solo si es tuya)
create or replace function public.pin_visible(u uuid, pin text)
returns text language sql stable security definer set search_path = '' as $$
  select case when pin is null then null
              when pin like 'pin-corona-%' and not coalesce(public.col_tiene(u, pin), false) then null
              else pin end;
$$;
revoke all on function public.pin_visible(uuid, text) from public, anon, authenticated;
