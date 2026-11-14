-- =========================================================
-- Modo Cachimbo · Qué simuladores del Laboratorio son gratis
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 97-laboratorio-rayos.sql.
--
--   · Gratis: Célula y Tabla periódica.
--   · Todos los demás se abren con Energía (o con el código
--     laboratorio-VIP). Quien ya pagó Energía por uno lo sigue teniendo.
--   · Para cambiar cuáles son gratis, edita la lista de abajo.
-- =========================================================

update public.lab_sims
   set gratis = (sim in ('celula', 'tabla'));

select sim, precio, gratis from public.lab_sims order by gratis desc, sim;
