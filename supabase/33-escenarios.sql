-- =========================================================
-- Modo Cachimbo · Escenarios del búho (Mi colección)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 31-coleccion.sql y 32-perfil-y-tops.sql.
--
--   · Espacio nuevo 'escena': donde se para el búho en el inicio,
--     con su cielo y su piso. Va aparte del fondo de perfil ('racha'),
--     que ahora pinta solo tu tarjeta de perfil y tu cuadro de racha.
--   · Escenario Calabazas: se entrega en el evento, igual que los otros:
--       select public.regalar_item('escena-calabaza', null, 'evento');
-- =========================================================

alter table public.coleccion_item drop constraint if exists coleccion_item_espacio_check;
alter table public.coleccion_item add constraint coleccion_item_espacio_check
  check (espacio in ('buho','avatar','escena','racha','marco','titulo','pines'));

insert into public.coleccion_item (id, espacio, regla) values
  ('escena-galaxia','escena','{"tipo":"gratis"}'), ('escena-nube','escena','{"tipo":"gratis"}'),
  ('escena-cesped','escena','{"tipo":"racha","n":7}'), ('escena-luna','escena','{"tipo":"rango","n":2}'),
  ('escena-volcan','escena','{"tipo":"racha","n":30}'), ('escena-hielo','escena','{"tipo":"racha","n":100}'),
  ('escena-calabaza','escena','{"tipo":"evento"}')
on conflict (id) do update set espacio = excluded.espacio, regla = excluded.regla;
