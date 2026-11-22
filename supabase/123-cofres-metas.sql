-- =========================================================
-- Modo Cachimbo · 123: Cofres con búho (Bronce, Plata, Oro, Amatista, Leyenda) y metas nuevas
-- Pensado para un clan de 20 miembros activos 7 días (lunes a domingo).
-- Cofres del clan: preguntas respondidas por miembro (la meta total = por_miembro × miembros, mínimo 5):
--   Bronce 15 (300 con 20) · Plata 40 (800) · Oro 80 (1 600) · Amatista 140 (2 800) · Leyenda 210 (4 200)
--   Leyenda = cada miembro responde unas 30 preguntas al día.
-- Cofres personales (puntos propios: 1 por pregunta, +30 meta del día, +60 clan vs clan, +80 simulacro):
--   100 · 250 · 500 · 800
-- Correr después de 122.
-- =========================================================
update public.clan_cofres_cfg set nombre = v.nombre, por_miembro = v.pm, xp = v.xp, rayos = v.ry, tickets = v.tk
from (values
  (1, 'Bronce',    15,  30, 10, 0),
  (2, 'Plata',     40,  50, 20, 0),
  (3, 'Oro',       80,  80, 30, 1),
  (4, 'Amatista', 140, 120, 50, 1),
  (5, 'Leyenda',  210, 200, 80, 2)
) as v(n, nombre, pm, xp, ry, tk)
where public.clan_cofres_cfg.n = v.n;

update public.clan_premios_yo_cfg set meta = v.meta
from (values (1, 100), (2, 250), (3, 500), (4, 800)) as v(n, meta)
where public.clan_premios_yo_cfg.n = v.n;
