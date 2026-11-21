-- =========================================================
-- Modo Cachimbo · Duelos de hasta 6 jugadores.
-- Antes: 2, 3 o 4. Ahora también 5 y 6.
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo → Run.
-- Necesita 111-duelos-v3.sql. crear_duelo es copia de 111 con 5 y 6.
-- También: ver_duelo manda foto, marco, pin y búho de cada jugador (parte 2).
-- =========================================================

alter table public.duelos drop constraint if exists duelos_max_jug_check;
alter table public.duelos add constraint duelos_max_jug_check check (max_jug between 2 and 6);

create or replace function public.crear_duelo(p jsonb)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  cod text;
  letras constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  q jsonb;
  lista jsonb := '[]';
  res jsonb := '[]';
  previo uuid;
  nuevo uuid;
  cant integer;
  segs integer := 60;
  cmd jsonb := '[]';
  ncmd integer := 0;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if (select count(*) from public.duelos x where x.creador = uid and x.creado > now() - interval '1 day') >= 40 then
    raise exception 'Ya creaste muchos duelos hoy. Intenta mañana.';
  end if;
  if jsonb_typeof(p -> 'preguntas') <> 'array' or jsonb_array_length(p -> 'preguntas') not between 3 and 30 then
    raise exception 'preguntas no válidas';
  end if;
  for q in select * from jsonb_array_elements(p -> 'preguntas') loop
    if not public.duelo_q_ok(q) then raise exception 'pregunta no válida'; end if;
    lista := lista || jsonb_build_array(jsonb_build_object('ref', q ->> 'ref', 'c', (q ->> 'c')::integer, 'k', (q ->> 'k')::integer));
  end loop;
  if jsonb_typeof(p -> 'reserva') = 'array' and jsonb_array_length(p -> 'reserva') >= 1 and public.duelo_q_ok(p -> 'reserva' -> 0) then
    q := p -> 'reserva' -> 0;
    res := jsonb_build_array(jsonb_build_object('ref', q ->> 'ref', 'c', (q ->> 'c')::integer, 'k', (q ->> 'k')::integer));
  end if;
  cant := jsonb_array_length(lista);
  if coalesce(p ->> 'seg', '') ~ '^[0-9]{1,3}$' then segs := least(greatest((p ->> 'seg')::integer, 15), 120); end if;
  if coalesce(p ->> 'comodines', '') = 'true' then
    -- Todos los comodines quedan disponibles; cada jugador elige los suyos en la sala
    select coalesce(jsonb_agg(k), '[]') into cmd from unnest(public.duelo_pool()) k
      where k <> 'cambio' or jsonb_array_length(res) > 0;
    ncmd := case when cant <= 10 then 2 when cant <= 20 then 3 else 4 end;
  end if;

  if coalesce(p ->> 'revancha_de', '') ~ '^[A-Z0-9]{6}$' then
    select x.id into previo from public.duelos x where x.codigo = p ->> 'revancha_de'
      and (x.creador = uid or exists (select 1 from public.duelo_jugadas j where j.duelo = x.id and j.usuario = uid));
  end if;

  loop
    cod := '';
    for i in 1..6 loop cod := cod || substr(letras, 1 + floor(random() * length(letras))::integer, 1); end loop;
    exit when not exists (select 1 from public.duelos x where x.codigo = cod);
  end loop;

  insert into public.duelos (codigo, creador, titulo, curso, fuente, ciclo, tema, preguntas, n, revancha_de, max_jug, auto, en_sala, vence,
                             seg, comodines, final_x3, cmd_cant, reserva, relampago)
  values (cod, uid,
          left(coalesce(nullif(trim(p ->> 'titulo'), ''), 'Duelo'), 80),
          left(coalesce(nullif(trim(p ->> 'curso'), ''), 'todos'), 40),
          case when p ->> 'fuente' in ('mezcla', 'libro', 'fijas', 'seminarios', 'banqueo') then p ->> 'fuente' else 'mezcla' end,
          case when coalesce(p ->> 'ciclo', '') ~ '^[0-9]{4}-(I|II|III)$' then p ->> 'ciclo' end,
          left(nullif(trim(coalesce(p ->> 'tema', '')), ''), 80),
          lista, cant, previo,
          case when p ->> 'jugadores' in ('2', '3', '4', '5', '6') then (p ->> 'jugadores')::integer else 2 end,
          coalesce((p ->> 'auto')::boolean, false), true, now() + interval '5 minutes',
          segs, cmd, coalesce(p ->> 'final', '') = 'true', ncmd, res,
          case when cant >= 8 then cant / 2 end)
  returning id into nuevo;
  insert into public.duelo_jugadas (duelo, usuario) values (nuevo, uid);
  delete from public.duelo_eventos e where e.creado < now() - interval '1 day';
  return cod;
end $$;
revoke all on function public.crear_duelo(jsonb) from public, anon;
grant execute on function public.crear_duelo(jsonb) to authenticated;

-- ---------------------------------------------------------------
-- 2) Foto, marco y pin de cada jugador en el duelo (como en los tops)
--    ver_duelo igual que en 111, más avatar, marco, fondo, pin, buho (sala de espera) y
--    codigo (para tocar su foto y ver su tarjeta).
-- ---------------------------------------------------------------
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
           'xp', (select x.xp from public.xp_semana x where x.usuario = t.usuario and x.semana = public.cz_lunes()),
           'foto', (select p.foto_url from public.perfiles p where p.id = t.usuario and p.foto_url like 'https://%'),
           -- Lo que lleva puesto (como en los tops, supabase/47): foto del búho, marco, fondo y su primer pin
           'avatar', (select c.puesto ->> 'avatar' from public.coleccion_puesto c where c.usuario = t.usuario),
           'marco', (select c.puesto ->> 'marco' from public.coleccion_puesto c where c.usuario = t.usuario),
           'fondo', (select c.puesto ->> 'racha' from public.coleccion_puesto c where c.usuario = t.usuario),
           'pin', (select c.puesto -> 'pines' ->> 0 from public.coleccion_puesto c where c.usuario = t.usuario),
           'buho', (select c.puesto ->> 'buho' from public.coleccion_puesto c where c.usuario = t.usuario),
           'codigo', (select ji.codigo from public.jugador_id ji where ji.usuario = t.usuario),
           'eligio', jsonb_array_length(t.mano) > 0,
           -- Los comodines de cada uno son secretos hasta la pantalla VS
           'mano', case when t.usuario = uid or d.empieza is not null then t.mano end
         ) order by case when r.listo then t.puesto end, t.color), '[]')
    into lista
  from (select u.*, j.mano, (row_number() over (order by u.inicio, u.usuario))::integer - 1 as color
        from public.duelo_tabla(d) u join public.duelo_jugadas j on j.duelo = d.id and j.usuario = u.usuario) t;

  return jsonb_build_object(
    'codigo', d.codigo, 'titulo', d.titulo, 'curso', d.curso, 'fuente', d.fuente,
    'ciclo', d.ciclo, 'tema', d.tema, 'n', d.n, 'max', d.max_jug,
    'seg', d.seg, 'comodines', d.comodines, 'final', d.final_x3,
    'cmd_cant', d.cmd_cant, 'relampago', d.relampago,
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
            'usados', yo.usados, 'xp', yo.xp_premio, 'mano', yo.mano, 'cambio_i', yo.cambio_i) end,
    'resultado', case when r.listo then jsonb_build_object(
            'empate', r.empate,
            'gane', r.ganador is not null and r.ganador = uid,
            'ganador', case when r.ganador is not null then public.duelo_apodo(r.ganador) end,
            'puesto', mi_puesto,
            'jugadores', r.jugadores,
            'medallas', case when r.jugadores >= 2 then public.duelo_medallas_v3(d) end) end,
    'correctas', case when mostrar
            then (select jsonb_agg((e ->> 'c')::integer order by n) from jsonb_array_elements(d.preguntas) with ordinality t(e, n)) end,
    'preguntas', case when mostrar
            then (select jsonb_agg(e ->> 'ref' order by n) from jsonb_array_elements(d.preguntas) with ordinality t(e, n)) end,
    'reserva', case when mostrar and yo.cambio_i is not null
            then jsonb_build_object('ref', d.reserva -> 0 ->> 'ref', 'c', (d.reserva -> 0 ->> 'c')::integer) end,
    'revancha', rev
  );
end $$;
revoke all on function public.ver_duelo(text) from public, anon;
grant execute on function public.ver_duelo(text) to authenticated;
