-- =========================================================
-- Modo Cachimbo · Skins del cuadro de racha (Mi colección)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 31-coleccion.sql, 32-perfil-y-tops.sql y 33-escenarios.sql.
--
--   · Espacio nuevo 'cuadro': el cuadro de racha de tu perfil, con su
--     color y el de su fuego. Va aparte del fondo de perfil ('racha'),
--     que ahora pinta solo tu tarjeta de perfil.
--   · Cuadro Calabaza: se entrega en el evento, igual que los otros:
--       select public.regalar_item('cuadro-calabaza', null, 'evento');
-- =========================================================

alter table public.coleccion_item drop constraint if exists coleccion_item_espacio_check;
alter table public.coleccion_item add constraint coleccion_item_espacio_check
  check (espacio in ('buho','avatar','escena','racha','cuadro','marco','titulo','pines'));

insert into public.coleccion_item (id, espacio, regla) values
  ('cuadro-galaxia','cuadro','{"tipo":"gratis"}'), ('cuadro-cielo','cuadro','{"tipo":"gratis"}'),
  ('cuadro-menta','cuadro','{"tipo":"racha","n":7}'), ('cuadro-hielo','cuadro','{"tipo":"racha","n":30}'),
  ('cuadro-volcan','cuadro','{"tipo":"rango","n":2}'), ('cuadro-aurora','cuadro','{"tipo":"racha","n":100}'),
  ('cuadro-calabaza','cuadro','{"tipo":"evento"}')
on conflict (id) do update set espacio = excluded.espacio, regla = excluded.regla;
