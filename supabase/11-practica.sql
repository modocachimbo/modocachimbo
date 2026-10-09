-- =========================================================
-- Modo Cachimbo · Ajustes de la práctica
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita haber corrido antes supabase/05-perfil-config.sql.
--
--   · ajustes, clave 'practica' = { "mezclar": true | false }
--     Mezclar las alternativas en quiz, repaso, fijas, falladas,
--     simulacro y duelos. Se cambia en Panel → Cursos.
--     Si nunca se guardó, está encendido.
-- =========================================================

-- La tabla ajustes solo aceptaba la clave 'perfil': ahora acepta
-- cualquier nombre corto en minúsculas ('perfil', 'frases', 'practica', …)
alter table public.ajustes drop constraint if exists ajustes_clave_check;
alter table public.ajustes add constraint ajustes_clave_check check (clave ~ '^[a-z_]{1,40}$');
