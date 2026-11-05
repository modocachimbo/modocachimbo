-- =========================================================
-- Modo Cachimbo · Quitar la V de verificado que venía con la web
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede correr aunque no hayas corrido el 67
-- (ese archivo ya no existe) y se puede volver a correr.
--
--   · La V ahora la subes tú en Panel → Recursos (Pin, «Solo
--     influencers»); esta solo quita la que había metido el 67.
--   · Borra el objeto, los sobres que aún no se abrieron y se lo
--     quita de la vitrina a quien lo llevaba.
-- =========================================================

update public.coleccion_puesto c
   set puesto = jsonb_set(c.puesto, '{pines}', (select coalesce(jsonb_agg(x), '[]') from jsonb_array_elements_text(c.puesto -> 'pines') x where x <> 'pin-verificado'))
 where jsonb_typeof(c.puesto -> 'pines') = 'array' and c.puesto -> 'pines' ? 'pin-verificado';
delete from public.regalos where item = 'pin-verificado' and not visto;
delete from public.coleccion_mia where item = 'pin-verificado';
delete from public.coleccion_item where id = 'pin-verificado' and not recurso;
