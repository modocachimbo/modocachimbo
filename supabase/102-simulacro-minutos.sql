-- =========================================================
-- Modo Cachimbo · Arreglo: el simulacro libre corto no se guardaba
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
--
-- 45-simulacro-libre.sql dejó al simulacro libre durar desde 10 minutos,
-- pero la tabla public.simulacros seguía pidiendo entre 30 y 240 minutos
-- (09-simulacros.sql). Un libre de pocas preguntas (10 preguntas = 15 min)
-- chocaba con esa regla y salía "No se pudo guardar".
-- Aquí la regla de la tabla pasa a 10–240, igual que la función.
-- =========================================================

alter table public.simulacros drop constraint if exists simulacros_minutos_check;
alter table public.simulacros add constraint simulacros_minutos_check check (minutos between 10 and 240);
