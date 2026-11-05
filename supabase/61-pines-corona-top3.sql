-- =========================================================
-- Modo Cachimbo · Coronas para el Top 3 de la semana
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 31-coleccion.sql y 16-corazones.sql.
--
--   · Tres pines nuevos en Mi colección → Pines:
--       pin-corona-oro    · cerrar una semana en el 1.er puesto del Top
--       pin-corona-plata  · cerrar una semana en el 2.º puesto
--       pin-corona-bronce · cerrar una semana en el 3.er puesto
--     (el Top de la semana es el de XP: ranking_xp, mismo orden:
--      más XP primero y, si empatan, el mismo desempate).
--   · Solo cuentan las semanas ya cerradas (antes de este lunes):
--     la corona llega el lunes, cuando se reinicia el Top.
--   · No hace falta entregarla: col_tiene la reconoce sola y
--     mi_coleccion manda cuántas veces quedaste 1.º, 2.º y 3.º (tops).
--   · Las semanas anteriores también cuentan.
-- =========================================================

insert into public.coleccion_item (id, espacio, regla) values
  ('pin-corona-oro',    'pines', '{"tipo":"top","n":1}'),
  ('pin-corona-plata',  'pines', '{"tipo":"top","n":2}'),
  ('pin-corona-bronce', 'pines', '{"tipo":"top","n":3}')
on conflict (id) do update set espacio = excluded.espacio, regla = excluded.regla;

-- Cuántas semanas cerradas terminó el alumno en el puesto 1, 2 y 3 del Top de XP
create or replace function public.mis_tops(uid uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(t.puesto::text, t.veces), '{}'::jsonb) from (
    select r.puesto, count(*) as veces from (
      select 1 + (select count(*) from public.xp_semana o
                  where o.semana = x.semana and o.xp > 0
                    and (o.xp > x.xp or (o.xp = x.xp and o.usuario < x.usuario))) as puesto
      from public.xp_semana x
      where x.usuario = uid and x.xp > 0 and x.semana < public.cz_lunes()
    ) r
    where r.puesto <= 3
    group by r.puesto
  ) t;
$$;
revoke all on function public.mis_tops(uuid) from public, anon, authenticated;

-- ¿El alumno tiene este objeto? Igual que en 31, más la regla 'top'
create or replace function public.col_tiene(uid uuid, p_item text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare r jsonb; mins int[] := array[20, 1500, 4000, 8000, 12000];
begin
  select i.regla into r from public.coleccion_item i where i.id = p_item and i.visible;
  if r is null then return false; end if;
  if exists (select 1 from public.coleccion_mia m where m.usuario = uid and m.item = p_item) then return true; end if;
  case r ->> 'tipo'
    when 'gratis' then return true;
    when 'racha' then
      return coalesce((public.calc_racha(uid) ->> 'mejor')::int, 0) >= (r ->> 'n')::int
          or coalesce((public.calc_racha(uid) ->> 'actual')::int, 0) >= (r ->> 'n')::int;
    when 'rango' then
      return exists (select 1 from public.xp_semana x where x.usuario = uid and x.xp >= mins[(r ->> 'n')::int + 1]);
    when 'top' then
      return coalesce((public.mis_tops(uid) ->> (r ->> 'n'))::int, 0) > 0;
    else return false;
  end case;
end $$;
revoke all on function public.col_tiene(uuid, text) from public, anon, authenticated;

-- Lo tuyo: igual que en 31, más tops (para las coronas)
create or replace function public.mi_coleccion()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'sin sesión'; end if;
  return jsonb_build_object(
    'mias', coalesce((select jsonb_agg(jsonb_build_object('item', m.item, 'origen', m.origen, 'mensaje', m.mensaje, 'creado', m.creado) order by m.creado)
                        from public.coleccion_mia m where m.usuario = uid), '[]'),
    'puesto', coalesce((select p.puesto from public.coleccion_puesto p where p.usuario = uid), '{}'),
    'tops', public.mis_tops(uid));
end $$;
revoke all on function public.mi_coleccion() from public, anon;
grant execute on function public.mi_coleccion() to authenticated;
