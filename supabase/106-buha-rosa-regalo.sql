-- =========================================================
-- Modo Cachimbo · Búha Rosa y su aspecto de Navidad: se regalan
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 31-coleccion.sql y 40-recursos.sql.
--
--   · Son ítems del espacio «buho» (lo que sale en tu inicio).
--   · Nadie los tiene hasta que se los regalas en Panel → Regalos →
--     «Ítem de colección» (a un ID, a un grupo o a todos).
--   · Con «nom» puesto ya salen en esa lista del panel.
-- =========================================================

insert into public.coleccion_item (id, espacio, regla, visible, recurso, nom, rareza, img, descr) values
  ('buho-rosa',         'buho', '{"tipo":"regalo"}', true, false, 'Búha Rosa',            'epico',  'assets/buho/rosa.webp',
   'La mejor amiga del Búho. Lleva una flor y siempre saluda con alegría.'),
  ('buho-rosa-navidad', 'buho', '{"tipo":"regalo"}', true, false, 'Búha Rosa · Navidad', 'evento', 'assets/buho/rosa-navidad.webp',
   'Gorro de Papá Noel, bufanda y capa roja.')
on conflict (id) do update set
  espacio = excluded.espacio, regla = excluded.regla, visible = true, recurso = false,
  nom = excluded.nom, rareza = excluded.rareza, img = excluded.img, descr = excluded.descr;
