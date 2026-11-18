-- =========================================================
-- Modo Cachimbo · Temporada T2 Machu Picchu (premios por rango)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 109-temporadas-rango.sql.
--
--   · Semana del 23 al 29 de noviembre de 2026.
--   · Esta temporada da foto de perfil y banner (sin marco, para no repetir).
-- =========================================================

insert into public.coleccion_item (id, espacio, regla, nom, rareza, img) values
  ('t2-foto-bronce', 'avatar', '{"tipo":"rango","n":5,"sem":"2026-11-23","xp":20}', 'T2 Machu Picchu · Llama', 'comun', '/assets/temporadas/t2/bronce-foto.webp'),
  ('t2-banner-bronce', 'racha', '{"tipo":"rango","n":5,"sem":"2026-11-23","xp":20}', 'T2 Machu Picchu · Cielo inca · Llama', 'comun', '/assets/temporadas/t2/bronce-banner.webp'),
  ('t2-foto-plata', 'avatar', '{"tipo":"rango","n":6,"sem":"2026-11-23","xp":1900}', 'T2 Machu Picchu · Quipu', 'comun', '/assets/temporadas/t2/plata-foto.webp'),
  ('t2-banner-plata', 'racha', '{"tipo":"rango","n":6,"sem":"2026-11-23","xp":1900}', 'T2 Machu Picchu · Cielo inca · Quipu', 'comun', '/assets/temporadas/t2/plata-banner.webp'),
  ('t2-foto-esmeralda', 'avatar', '{"tipo":"rango","n":7,"sem":"2026-11-23","xp":4300}', 'T2 Machu Picchu · Andenes', 'raro', '/assets/temporadas/t2/esmeralda-foto.webp'),
  ('t2-banner-esmeralda', 'racha', '{"tipo":"rango","n":7,"sem":"2026-11-23","xp":4300}', 'T2 Machu Picchu · Cielo inca · Andenes', 'raro', '/assets/temporadas/t2/esmeralda-banner.webp'),
  ('t2-foto-zafiro', 'avatar', '{"tipo":"rango","n":8,"sem":"2026-11-23","xp":7700}', 'T2 Machu Picchu · Chakana', 'raro', '/assets/temporadas/t2/zafiro-foto.webp'),
  ('t2-banner-zafiro', 'racha', '{"tipo":"rango","n":8,"sem":"2026-11-23","xp":7700}', 'T2 Machu Picchu · Cielo inca · Chakana', 'raro', '/assets/temporadas/t2/zafiro-banner.webp'),
  ('t2-foto-amatista', 'avatar', '{"tipo":"rango","n":9,"sem":"2026-11-23","xp":14000}', 'T2 Machu Picchu · Tumi de oro', 'epico', '/assets/temporadas/t2/amatista-foto.webp'),
  ('t2-banner-amatista', 'racha', '{"tipo":"rango","n":9,"sem":"2026-11-23","xp":14000}', 'T2 Machu Picchu · Cielo inca · Tumi de oro', 'epico', '/assets/temporadas/t2/amatista-banner.webp'),
  ('t2-foto-mitico', 'avatar', '{"tipo":"rango","n":10,"sem":"2026-11-23","xp":23000}', 'T2 Machu Picchu · Intihuatana', 'legendario', '/assets/temporadas/t2/mitico-foto.webp'),
  ('t2-banner-mitico', 'racha', '{"tipo":"rango","n":10,"sem":"2026-11-23","xp":23000}', 'T2 Machu Picchu · Cielo inca · Intihuatana', 'legendario', '/assets/temporadas/t2/mitico-banner.webp'),
  ('t2-foto-leyenda', 'avatar', '{"tipo":"rango","n":11,"sem":"2026-11-23","xp":60000}', 'T2 Machu Picchu · Machu Picchu', 'legendario', '/assets/temporadas/t2/leyenda-foto.webp'),
  ('t2-banner-leyenda', 'racha', '{"tipo":"rango","n":11,"sem":"2026-11-23","xp":60000}', 'T2 Machu Picchu · Cielo inca · Machu Picchu', 'legendario', '/assets/temporadas/t2/leyenda-banner.webp')
on conflict (id) do update set espacio = excluded.espacio, regla = excluded.regla, nom = excluded.nom, rareza = excluded.rareza, img = excluded.img;

-- Para revisar: select id, nom, regla from public.coleccion_item where id like 't2-%' order by id;
