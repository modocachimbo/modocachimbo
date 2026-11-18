-- =========================================================
-- Modo Cachimbo · Temporadas de premios por rango (una por semana)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 96-rangos-premios.sql y 108-premios-top-semana.sql.
--
--   · Cada semana es una temporada (T1, T2, …). Si en esa semana llegas a un
--     rango, ganas su foto de perfil, su banner y su marco de esa temporada.
--     Es tuyo para siempre.
--   · La regla es la de rango con "sem" (el lunes de la semana):
--       {"tipo":"rango","n":11,"sem":"2026-11-16"} = llegar a Leyenda I esa semana.
--     Sin "sem" sigue igual que antes (tu mejor semana).
--   · T1 Nazca: semana del 16 al 22 de noviembre de 2026.
--   · Para una temporada nueva solo hay que sumar sus 21 filas abajo
--     (y lo mismo en assets/coleccion.js → TEMPORADAS).
-- =========================================================

-- Igual que en 108; la regla 'rango' ahora puede mirar una semana (sem)
create or replace function public.col_tiene(uid uuid, p_item text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare r jsonb; mins int[] := array[20, 1500, 4000, 8000, 12000,
                                       20, 900, 2300, 4700, 9000, 16000, 50000];
begin
  select i.regla into r from public.coleccion_item i where i.id = p_item and i.visible;
  if r is null then return false; end if;
  if r ->> 'tipo' = 'grupo' then
    return exists (select 1 from public.grupo_miembro g where g.usuario = uid and g.grupo = r ->> 'g');
  end if;
  if exists (select 1 from public.coleccion_mia m where m.usuario = uid and m.item = p_item) then return true; end if;
  case r ->> 'tipo'
    when 'gratis' then return true;
    when 'racha' then
      return coalesce((public.calc_racha(uid) ->> 'mejor')::int, 0) >= (r ->> 'n')::int
          or coalesce((public.calc_racha(uid) ->> 'actual')::int, 0) >= (r ->> 'n')::int;
    when 'rango' then
      if r ? 'sem' then
        return exists (select 1 from public.xp_semana x where x.usuario = uid
                       and x.semana = (r ->> 'sem')::date and x.xp >= mins[(r ->> 'n')::int + 1]);
      end if;
      return exists (select 1 from public.xp_semana x where x.usuario = uid and x.xp >= mins[(r ->> 'n')::int + 1]);
    when 'top' then
      return coalesce((public.mis_tops(uid) -> 'fam' -> coalesce(r ->> 'fam', 'hex') ->> (r ->> 'n'))::int, 0) > 0;
    else return false;
  end case;
end $$;
revoke all on function public.col_tiene(uuid, text) from public, anon, authenticated;

-- T1 Nazca: foto, banner y marco de cada rango
insert into public.coleccion_item (id, espacio, regla, nom, rareza, img) values
  ('t1-foto-bronce', 'avatar', '{"tipo":"rango","n":5,"sem":"2026-11-16"}', 'T1 Nazca · Lagartija', 'comun', '/assets/temporadas/t1/bronce-foto.webp'),
  ('t1-banner-bronce', 'racha', '{"tipo":"rango","n":5,"sem":"2026-11-16"}', 'T1 Nazca · Líneas de la Lagartija', 'comun', '/assets/temporadas/t1/bronce-banner.webp'),
  ('t1-marco-bronce', 'marco', '{"tipo":"rango","n":5,"sem":"2026-11-16"}', 'T1 Nazca · Marco Bronce', 'comun', '/assets/temporadas/t1/bronce-marco.webp'),
  ('t1-foto-plata', 'avatar', '{"tipo":"rango","n":6,"sem":"2026-11-16"}', 'T1 Nazca · Araña', 'comun', '/assets/temporadas/t1/plata-foto.webp'),
  ('t1-banner-plata', 'racha', '{"tipo":"rango","n":6,"sem":"2026-11-16"}', 'T1 Nazca · Líneas de la Araña', 'comun', '/assets/temporadas/t1/plata-banner.webp'),
  ('t1-marco-plata', 'marco', '{"tipo":"rango","n":6,"sem":"2026-11-16"}', 'T1 Nazca · Marco Plata', 'comun', '/assets/temporadas/t1/plata-marco.webp'),
  ('t1-foto-esmeralda', 'avatar', '{"tipo":"rango","n":7,"sem":"2026-11-16"}', 'T1 Nazca · Árbol', 'raro', '/assets/temporadas/t1/esmeralda-foto.webp'),
  ('t1-banner-esmeralda', 'racha', '{"tipo":"rango","n":7,"sem":"2026-11-16"}', 'T1 Nazca · Líneas del Árbol', 'raro', '/assets/temporadas/t1/esmeralda-banner.webp'),
  ('t1-marco-esmeralda', 'marco', '{"tipo":"rango","n":7,"sem":"2026-11-16"}', 'T1 Nazca · Marco Esmeralda', 'raro', '/assets/temporadas/t1/esmeralda-marco.webp'),
  ('t1-foto-zafiro', 'avatar', '{"tipo":"rango","n":8,"sem":"2026-11-16"}', 'T1 Nazca · Ballena', 'raro', '/assets/temporadas/t1/zafiro-foto.webp'),
  ('t1-banner-zafiro', 'racha', '{"tipo":"rango","n":8,"sem":"2026-11-16"}', 'T1 Nazca · Líneas de la Ballena', 'raro', '/assets/temporadas/t1/zafiro-banner.webp'),
  ('t1-marco-zafiro', 'marco', '{"tipo":"rango","n":8,"sem":"2026-11-16"}', 'T1 Nazca · Marco Zafiro', 'raro', '/assets/temporadas/t1/zafiro-marco.webp'),
  ('t1-foto-amatista', 'avatar', '{"tipo":"rango","n":9,"sem":"2026-11-16"}', 'T1 Nazca · Mono', 'epico', '/assets/temporadas/t1/amatista-foto.webp'),
  ('t1-banner-amatista', 'racha', '{"tipo":"rango","n":9,"sem":"2026-11-16"}', 'T1 Nazca · Líneas del Mono', 'epico', '/assets/temporadas/t1/amatista-banner.webp'),
  ('t1-marco-amatista', 'marco', '{"tipo":"rango","n":9,"sem":"2026-11-16"}', 'T1 Nazca · Marco Amatista', 'epico', '/assets/temporadas/t1/amatista-marco.webp'),
  ('t1-foto-mitico', 'avatar', '{"tipo":"rango","n":10,"sem":"2026-11-16"}', 'T1 Nazca · Cóndor', 'legendario', '/assets/temporadas/t1/mitico-foto.webp'),
  ('t1-banner-mitico', 'racha', '{"tipo":"rango","n":10,"sem":"2026-11-16"}', 'T1 Nazca · Líneas del Cóndor', 'legendario', '/assets/temporadas/t1/mitico-banner.webp'),
  ('t1-marco-mitico', 'marco', '{"tipo":"rango","n":10,"sem":"2026-11-16"}', 'T1 Nazca · Marco Mítico', 'legendario', '/assets/temporadas/t1/mitico-marco.webp'),
  ('t1-foto-leyenda', 'avatar', '{"tipo":"rango","n":11,"sem":"2026-11-16"}', 'T1 Nazca · Colibrí', 'legendario', '/assets/temporadas/t1/leyenda-foto.webp'),
  ('t1-banner-leyenda', 'racha', '{"tipo":"rango","n":11,"sem":"2026-11-16"}', 'T1 Nazca · Líneas del Colibrí', 'legendario', '/assets/temporadas/t1/leyenda-banner.webp'),
  ('t1-marco-leyenda', 'marco', '{"tipo":"rango","n":11,"sem":"2026-11-16"}', 'T1 Nazca · Marco Leyenda', 'legendario', '/assets/temporadas/t1/leyenda-marco.webp')
on conflict (id) do update set espacio = excluded.espacio, regla = excluded.regla, nom = excluded.nom, rareza = excluded.rareza, img = excluded.img;

-- Para revisar: select id, nom, regla from public.coleccion_item where id like 't1-%' order by id;
