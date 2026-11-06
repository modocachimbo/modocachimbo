-- =========================================================
-- Modo Cachimbo · Quitar de las vitrinas las coronas que quedaron puestas
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 73-corona-se-gana-al-cerrar.sql.
--
--   Antes la corona se ponía sola mientras ibas en el top 3, y al
--   cambiar otro pin quedaba guardada en tu vitrina. Por eso algunos
--   alumnos la siguen mostrando en los tops sin habérsela puesto.
--   Esto la saca de todas las vitrinas una sola vez. La corona sigue
--   siendo suya: quien la quiera lucir se la vuelve a poner en
--   Mi colección → Pines.
-- =========================================================

-- (Opcional) Antes de correrlo, ver quiénes la tienen puesta:
-- select p.usuario, f.apodo, p.puesto -> 'pines' as pines
--   from public.coleccion_puesto p left join public.perfiles f on f.id = p.usuario
--  where jsonb_typeof(p.puesto -> 'pines') = 'array'
--    and exists (select 1 from jsonb_array_elements_text(p.puesto -> 'pines') x where x like 'pin-corona-%');

update public.coleccion_puesto p
   set puesto = jsonb_set(p.puesto, '{pines}', coalesce((
         select jsonb_agg(e.x order by e.o)
           from jsonb_array_elements_text(p.puesto -> 'pines') with ordinality as e(x, o)
          where e.x not like 'pin-corona-%'), '[]'::jsonb))
 where jsonb_typeof(p.puesto -> 'pines') = 'array'
   and exists (select 1 from jsonb_array_elements_text(p.puesto -> 'pines') x where x like 'pin-corona-%');
