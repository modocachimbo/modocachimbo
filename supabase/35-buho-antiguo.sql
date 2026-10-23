-- =========================================================
-- Modo Cachimbo · Búho antiguo (Mi colección)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 31-coleccion.sql.
--
--   · 'buho-antiguo': el primer búho, el del logo. Gratis para todos.
-- =========================================================

insert into public.coleccion_item (id, espacio, regla) values
  ('buho-antiguo','buho','{"tipo":"gratis"}')
on conflict (id) do update set espacio = excluded.espacio, regla = excluded.regla;
