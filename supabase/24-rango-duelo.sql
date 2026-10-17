-- =========================================================
-- Modo Cachimbo · Rango de la semana en los duelos
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 16-corazones.sql y 22-duelos-v2.sql.
--
--   · ver_duelo ahora devuelve el XP de la semana de cada jugador
--     ('xp'), para mostrar su emblema de rango (assets/rango.js).
--     Es lo mismo que 22-duelos-v2.sql con ese dato de más.
-- =========================================================

create or replace function public.ver_duelo(p_codigo text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  d public.duelos;
  r record;
  yo public.duelo_jugadas;
  juega boolean;
  mostrar boolean;
  rev text;
  lista jsonb;
  mi_puesto integer;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into d from public.duelos x where x.codigo = upper(trim(p_codigo));
  if d.id is null then return null; end if;
  select * into yo from public.duelo_jugadas j where j.duelo = d.id and j.usuario = uid;
  juega := yo.duelo is not null;
  select * into r from public.duelo_resultado(d);
  mostrar := yo.terminado is not null or (r.listo and juega);
  select x.codigo into rev from public.duelos x where x.revancha_de = d.id order by x.creado desc limit 1;
  select t.puesto into mi_puesto from public.duelo_tabla(d) t where t.usuario = uid;

  select coalesce(jsonb_agg(jsonb_build_object(
           'apodo', public.duelo_apodo(t.usuario),
           'yo', t.usuario = uid,
           'creador', t.usuario = d.creador,
           'actual', t.actual,
           'terminado', t.terminado or t.plazo,
           'abandono', t.plazo,
           'aciertos', case when mostrar or t.usuario = uid then t.aciertos end,
           'puntos', t.puntos,
           'ms', case when mostrar or t.usuario = uid then t.ms end,
           'puesto', case when r.listo then t.puesto end,
           'color', t.color,
           'xp', (select x.xp from public.xp_semana x where x.usuario = t.usuario and x.semana = public.cz_lunes())
         ) order by case when r.listo then t.puesto end, t.color), '[]')
    into lista
  from (select u.*, (row_number() over (order by u.inicio, u.usuario))::integer - 1 as color from public.duelo_tabla(d) u) t;

  return jsonb_build_object(
    'codigo', d.codigo, 'titulo', d.titulo, 'curso', d.curso, 'fuente', d.fuente,
    'ciclo', d.ciclo, 'tema', d.tema, 'n', d.n, 'max', d.max_jug,
    'seg', d.seg, 'comodines', d.comodines, 'final', d.final_x3,
    'creado', d.creado, 'vence', d.vence, 'ahora', now(),
    'cerrado', d.empieza is not null or now() >= d.vence or (select count(*) from public.duelo_jugadas j where j.duelo = d.id) >= d.max_jug,
    'en_sala', d.en_sala, 'auto', d.auto,
    'empieza', d.empieza,
    'iniciado', d.empieza is not null and now() >= d.empieza,
    'rol', case when juega then 'jugador' when uid = d.creador then 'creador' end,
    'creador', public.duelo_apodo(d.creador),
    'soy_creador', uid = d.creador,
    'jugadores', lista,
    'yo', case when juega then jsonb_build_object(
            'actual', yo.actual, 'aciertos', yo.aciertos, 'puntos', yo.puntos, 'ms', yo.ms,
            'terminado', yo.terminado is not null, 'respuestas', yo.respuestas,
            'usados', yo.usados, 'xp', yo.xp_premio) end,
    'resultado', case when r.listo then jsonb_build_object(
            'empate', r.empate,
            'gane', r.ganador is not null and r.ganador = uid,
            'ganador', case when r.ganador is not null then public.duelo_apodo(r.ganador) end,
            'puesto', mi_puesto,
            'jugadores', r.jugadores,
            'medallas', case when r.jugadores >= 2 then public.duelo_medallas(d) end) end,
    'correctas', case when mostrar
            then (select jsonb_agg((e ->> 'c')::integer order by n) from jsonb_array_elements(d.preguntas) with ordinality t(e, n)) end,
    'preguntas', case when mostrar
            then (select jsonb_agg(e ->> 'ref' order by n) from jsonb_array_elements(d.preguntas) with ordinality t(e, n)) end,
    'revancha', rev
  );
end $$;
revoke all on function public.ver_duelo(text) from public, anon;
grant execute on function public.ver_duelo(text) to authenticated;
