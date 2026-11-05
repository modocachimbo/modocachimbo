-- =========================================================
-- Modo Cachimbo · La corona «Top global» se pone sola
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 61-pines-corona-top3.sql.
--
--   · Desde el martes, quien va 1.º, 2.º o 3.º en el Top de la semana
--     la lleva puesta sin hacer nada: sale primero en su vitrina, en su
--     tarjeta y como su pin en todos los tops (XP, simulacro y duelos).
--   · Si alguien lo pasa, la corona pasa al nuevo al toque.
--   · La del que cierra la semana en ese puesto se queda en su
--     colección para siempre (como en 61) y se la puede poner cuando
--     quiera; ya no sale sola la semana siguiente.
--   · Las imágenes de las coronas pasan a ruta relativa (assets/…) para
--     que también se vean en la web de GitHub Pages (/modocachimbo/).
-- =========================================================

update public.coleccion_item set img = 'assets/pines/' || substr(id, 5) || '.webp'
 where id in ('pin-corona-oro', 'pin-corona-plata', 'pin-corona-bronce');

-- La corona que el alumno lleva esta semana (desde el martes, si va en el top 3), o null
create or replace function public.corona_ahora(u uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case p when 1 then 'pin-corona-oro' when 2 then 'pin-corona-plata' when 3 then 'pin-corona-bronce' end
  from (
    select 1 + (select count(*) from public.xp_semana o
                where o.semana = x.semana and o.xp > 0
                  and (o.xp > x.xp or (o.xp = x.xp and o.usuario < x.usuario))) as p
    from public.xp_semana x
    where x.usuario = u and x.xp > 0 and x.semana = public.cz_lunes()
      and public.cz_hoy() >= public.cz_lunes() + 1
  ) t
  where p <= 3
    and exists (select 1 from public.coleccion_item i where i.visible
                  and i.id = case p when 1 then 'pin-corona-oro' when 2 then 'pin-corona-plata' else 'pin-corona-bronce' end);
$$;
revoke all on function public.corona_ahora(uuid) from public, anon, authenticated;

-- El pin que otros ven en los tops: la corona de esta semana va primero.
-- Si no, igual que en 61 (una corona que ya no tiene no se muestra).
create or replace function public.pin_visible(u uuid, pin text)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(public.corona_ahora(u),
           case when pin is null then null
                when pin like 'pin-corona-%' and not coalesce(public.col_tiene(u, pin), false) then null
                else pin end);
$$;
revoke all on function public.pin_visible(uuid, text) from public, anon, authenticated;

-- Lo que otros ven en su tarjeta: la corona de esta semana primero (hasta 3 pines)
create or replace function public.puesto_visible(u uuid, p jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c text := public.corona_ahora(u); pines jsonb;
begin
  p := coalesce(p, '{}'::jsonb) - '_antes';
  pines := case when jsonb_typeof(p -> 'pines') = 'array' then p -> 'pines' else '[]'::jsonb end;
  pines := coalesce((select jsonb_agg(x order by o) from jsonb_array_elements_text(pines) with ordinality as e(x, o)
                      where (x not like 'pin-corona-%' or coalesce(public.col_tiene(u, x), false))
                        and x is distinct from c), '[]'::jsonb);
  if c is not null then
    pines := to_jsonb(c) || pines;
    if jsonb_array_length(pines) > 3 then pines := pines - 3; end if;
  end if;
  return case when jsonb_array_length(pines) = 0 and not (p ? 'pines') then p else jsonb_set(p, '{pines}', pines) end;
end $$;
revoke all on function public.puesto_visible(uuid, jsonb) from public, anon, authenticated;
