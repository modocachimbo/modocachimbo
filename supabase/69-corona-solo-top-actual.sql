-- =========================================================
-- Modo Cachimbo · En los tops, la corona solo la llevan los 3 de esta semana
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 65-corona-se-pone-sola.sql.
--
--   · En los tops (XP, simulacro y duelos) la corona solo sale en el
--     1.º, 2.º y 3.º de la semana actual.
--   · Quien ganó una corona en una semana pasada la sigue teniendo en su
--     colección (y en su vitrina si quiere), pero en los tops sale su
--     siguiente pin de la vitrina, o ninguno.
-- =========================================================

create or replace function public.pin_visible(u uuid, pin text)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(public.corona_ahora(u),
    case when pin is null then null
         when pin not like 'pin-corona-%' then pin
         else (select e.x
                 from public.coleccion_puesto c,
                      jsonb_array_elements_text(case when jsonb_typeof(c.puesto -> 'pines') = 'array' then c.puesto -> 'pines' else '[]'::jsonb end) with ordinality as e(x, o)
                where c.usuario = u and e.x not like 'pin-corona-%'
                order by e.o limit 1)
    end);
$$;
revoke all on function public.pin_visible(uuid, text) from public, anon, authenticated;
