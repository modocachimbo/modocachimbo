-- =========================================================
-- Modo Cachimbo · Duelos v3: cada uno elige sus comodines,
-- Llamarada / Volcán por racha, comodines de ataque y defensa,
-- pregunta relámpago y medallas nuevas.
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 22-duelos-v2.sql y 30-duelo-fotos.sql.
--
-- Qué cambia:
--   · Comodines elegidos: en la sala cada jugador elige los suyos
--     (2 si son hasta 10 preguntas, 3 hasta 20, 4 si son más) de
--     11 posibles. Si no elige a tiempo, se le reparten al azar.
--     Nuevos: terremoto, espejo, apuesta, ladron y cambio.
--       terremoto  las alternativas de los rivales tiemblan y cambian de lugar
--       espejo     el próximo ataque que recibas rebota al que lo lanzó
--       apuesta    apuestas 1, 2 o 3 puntos: los ganas o los pierdes
--       ladron     si aciertas, le quitas 1 punto al rival que va mejor
--       cambio     te cambia la pregunta por otra (de reserva)
--     Robar tiempo ahora quita 8 s (antes 5).
--   · Comodín activo por racha (no gasta el comodín de la pregunta):
--       3 seguidas → Llamarada: quema las alternativas de los rivales
--       5 seguidas → Volcán: quema más fuerte y tu próxima respuesta vale doble
--     Si fallas, la carga se apaga.
--   · Pregunta relámpago (duelos de 8 o más): a la mitad, el primero
--     en acertarla gana +2.
--   · Medallas nuevas: Pirómano, Intocable, Ladrón de oro y Apostador.
--   · La cuenta antes de empezar dura 7 s (pantalla VS).
-- =========================================================

-- ---------- Columnas nuevas ----------
alter table public.duelos add column if not exists cmd_cant integer not null default 0;       -- comodines que elige cada uno (0 = duelo viejo)
alter table public.duelos add column if not exists reserva jsonb not null default '[]';       -- pregunta de reserva para Cambio [{ref,c,k}]
alter table public.duelos add column if not exists relampago integer;                          -- índice de la pregunta relámpago

alter table public.duelo_jugadas add column if not exists mano jsonb not null default '[]';   -- comodines que eligió
alter table public.duelo_jugadas add column if not exists espejo boolean not null default false;
alter table public.duelo_jugadas add column if not exists apuesta integer;
alter table public.duelo_jugadas add column if not exists fuego integer not null default 0;   -- 1 = Llamarada lista, 2 = Volcán listo
alter table public.duelo_jugadas add column if not exists bonus integer not null default 0;   -- 2 = la próxima vale doble (Volcán)
alter table public.duelo_jugadas add column if not exists cambio_i integer;                    -- pregunta que cambió
alter table public.duelo_jugadas add column if not exists stats jsonb not null default '{}';   -- fuegos, robos, rebotes, ult_fuego…

alter table public.duelo_jugadas drop constraint if exists duelo_jugadas_activo_check;
alter table public.duelo_jugadas add constraint duelo_jugadas_activo_check
  check (activo is null or activo in ('doble', 'escudo', 'apuesta', 'ladron'));

alter table public.duelo_eventos add column if not exists para uuid;                          -- a quién va (null = a todos)
alter table public.duelo_eventos drop constraint if exists duelo_eventos_tipo_check;
alter table public.duelo_eventos add constraint duelo_eventos_tipo_check
  check (tipo in ('robar', 'comodin', 'reac', 'ataque', 'rebote', 'relampago'));

-- ---------- Ayudas internas ----------
create or replace function public.duelo_pool()
returns text[] language sql immutable set search_path = '' as $$
  select array['mitad', 'hielo', 'doble', 'escudo', 'robar', 'espia', 'terremoto', 'espejo', 'apuesta', 'ladron', 'cambio'];
$$;
revoke all on function public.duelo_pool() from public, anon, authenticated;

-- Los comodines que puede usar el jugador (duelos viejos: los mismos para todos)
create or replace function public.duelo_mano(d public.duelos, j public.duelo_jugadas)
returns jsonb language sql stable set search_path = '' as $$
  select case when d.cmd_cant > 0 then coalesce(j.mano, '[]') else coalesce(d.comodines, '[]') end;
$$;
revoke all on function public.duelo_mano(public.duelos, public.duelo_jugadas) from public, anon, authenticated;

create or replace function public.duelo_stat(s jsonb, k text, n integer)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(s, '{}') || jsonb_build_object(k, coalesce((s ->> k)::integer, 0) + n);
$$;
revoke all on function public.duelo_stat(jsonb, text, integer) from public, anon, authenticated;

-- Plazo total: además 20 s por Congelar y el tiempo de una pregunta por Cambio
create or replace function public.duelo_plazo(d public.duelos)
returns interval language sql immutable set search_path = '' as $$
  select make_interval(secs => d.n * (d.seg + 5) + 20 + case when d.cmd_cant > 0 then d.seg + 10 else 0 end);
$$;
revoke all on function public.duelo_plazo(public.duelos) from public, anon, authenticated;

-- Valida una pregunta {ref, c, k}
create or replace function public.duelo_q_ok(q jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(q ->> 'ref', '') ~ '^[a-z0-9-]{2,40}/(libros|seminarios|banqueo)/data/[0-9]{4}-(I|II|III)(-fijas)?\.json#[A-Za-z0-9._-]{1,12}#[0-9]{1,3}$'
     and jsonb_typeof(q -> 'c') = 'number' and jsonb_typeof(q -> 'k') = 'number'
     and (q ->> 'k')::integer between 2 and 8 and (q ->> 'c')::integer between 0 and (q ->> 'k')::integer - 1;
$$;
revoke all on function public.duelo_q_ok(jsonb) from public, anon, authenticated;

-- ---------- Crear ----------
-- p = { …como antes…, reserva:[{ref, c, k}] (1 pregunta extra para Cambio) }
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
          case when p ->> 'jugadores' in ('2', '3', '4') then (p ->> 'jugadores')::integer else 2 end,
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

-- ---------- Elegir comodines (en la sala, antes de empezar) ----------
create or replace function public.elegir_comodines(p_codigo text, p_mano jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  d public.duelos;
  limpio jsonb;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into d from public.duelos x where x.codigo = upper(trim(p_codigo));
  if d.id is null then raise exception 'No existe ese duelo.'; end if;
  if d.cmd_cant <= 0 then raise exception 'Este duelo no tiene comodines para elegir.'; end if;
  if not exists (select 1 from public.duelo_jugadas j where j.duelo = d.id and j.usuario = uid) then raise exception 'Primero entra a la sala.'; end if;
  if d.empieza is not null and now() >= d.empieza - interval '3 seconds' then raise exception 'El duelo ya empezó.'; end if;
  if jsonb_typeof(p_mano) <> 'array' then raise exception 'Comodines no válidos.'; end if;
  select coalesce(jsonb_agg(k order by k), '[]') into limpio
    from (select distinct k from jsonb_array_elements_text(p_mano) k where d.comodines ? k) x;
  if jsonb_array_length(limpio) <> d.cmd_cant then raise exception 'Elige % comodines.', d.cmd_cant; end if;
  update public.duelo_jugadas j set mano = limpio where j.duelo = d.id and j.usuario = uid;
  return jsonb_build_object('ok', true, 'mano', limpio);
end $$;
revoke all on function public.elegir_comodines(text, jsonb) from public, anon;
grant execute on function public.elegir_comodines(text, jsonb) to authenticated;

-- Al arrancar: 7 s para la pantalla VS, y comodines al azar a quien no eligió
create or replace function public.duelo_arrancar(p_id uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  t timestamptz := now() + interval '7 seconds';
  d public.duelos;
begin
  update public.duelos x set empieza = t where x.id = p_id and x.empieza is null returning * into d;
  if d.id is not null then
    update public.duelo_jugadas j set entro = coalesce(j.entro, j.inicio), inicio = t, visto = t where j.duelo = p_id;
    if d.cmd_cant > 0 then
      update public.duelo_jugadas j set mano = (
          select coalesce(jsonb_agg(k), '[]') from (select k from jsonb_array_elements_text(d.comodines) k order by random() limit d.cmd_cant) x)
      where j.duelo = p_id and jsonb_array_length(j.mano) <> d.cmd_cant;
    end if;
  end if;
end $$;
revoke all on function public.duelo_arrancar(uuid) from public, anon, authenticated;

-- ---------- Ataques (con Espejo) ----------
-- Lanza un ataque a todos los rivales que siguen jugando. Si un rival tiene
-- Espejo, se le gasta y el ataque rebota al atacante.
-- Robar tiempo quita 8 s al reloj; los demás son efectos en pantalla.
create or replace function public.duelo_atacar(d public.duelos, uid uuid, tipo text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  r public.duelo_jugadas;
  golpes integer := 0;
  rebotes integer := 0;
begin
  for r in select * from public.duelo_jugadas j where j.duelo = d.id and j.usuario <> uid and j.terminado is null and j.actual < d.n
           order by coalesce(j.entro, j.inicio) for update loop
    if r.espejo then
      update public.duelo_jugadas j set espejo = false, stats = public.duelo_stat(j.stats, 'rebotes', 1) where j.duelo = d.id and j.usuario = r.usuario;
      if tipo = 'robar' then
        update public.duelo_jugadas j set visto = j.visto - interval '8 seconds' where j.duelo = d.id and j.usuario = uid and j.terminado is null;
      end if;
      insert into public.duelo_eventos (duelo, usuario, tipo, dato, para) values (d.id, r.usuario, 'rebote', tipo, uid);
      rebotes := rebotes + 1;
    else
      if tipo = 'robar' then
        update public.duelo_jugadas j set visto = j.visto - interval '8 seconds' where j.duelo = d.id and j.usuario = r.usuario;
      end if;
      insert into public.duelo_eventos (duelo, usuario, tipo, dato, para) values (d.id, uid, 'ataque', tipo, r.usuario);
      update public.duelo_jugadas j set stats = public.duelo_stat(j.stats, 'golpes', 1) where j.duelo = d.id and j.usuario = r.usuario;
      golpes := golpes + 1;
    end if;
  end loop;
  return jsonb_build_object('golpes', golpes, 'rebotes', rebotes);
end $$;
revoke all on function public.duelo_atacar(public.duelos, uuid, text) from public, anon, authenticated;

-- ---------- Comodines ----------
-- p_n: los puntos de la Apuesta (1, 2 o 3)
drop function if exists public.usar_comodin(text, text, integer);
create or replace function public.usar_comodin(p_codigo text, p_k text, p_i integer, p_n integer default 0)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  d public.duelos;
  j public.duelo_jugadas;
  q jsonb;
  quita jsonb;
  extra jsonb := '{}';
  ult boolean;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into d from public.duelos x where x.codigo = upper(trim(p_codigo));
  if d.id is null then raise exception 'No existe ese duelo.'; end if;
  select * into j from public.duelo_jugadas x where x.duelo = d.id and x.usuario = uid for update;
  if j.duelo is null or j.terminado is not null then raise exception 'No estás jugando este duelo.'; end if;
  if d.empieza is null or now() < d.empieza then raise exception 'El duelo aún no empieza.'; end if;
  if p_i is distinct from j.actual then raise exception 'Esa pregunta ya pasó.'; end if;
  if not public.duelo_mano(d, j) ? p_k then raise exception 'No tienes ese comodín.'; end if;
  if exists (select 1 from jsonb_array_elements(j.usados) e where e ->> 'k' = p_k) then raise exception 'Ya usaste ese comodín.'; end if;
  if exists (select 1 from jsonb_array_elements(j.usados) e where (e ->> 'i')::integer = j.actual) then
    raise exception 'Solo un comodín por pregunta.';
  end if;
  if now() > j.visto + make_interval(secs => d.seg) then raise exception 'Se acabó el tiempo de esta pregunta.'; end if;
  ult := d.final_x3 and j.actual = d.n - 1;
  if p_k in ('doble', 'apuesta') and ult then raise exception 'La última ya vale 3.'; end if;
  q := case when j.cambio_i = j.actual and jsonb_array_length(d.reserva) > 0 then d.reserva -> 0 else d.preguntas -> j.actual end;

  if p_k = 'mitad' then
    select jsonb_agg(o) into quita from (
      select o from generate_series(0, (q ->> 'k')::integer - 1) o
      where o <> (q ->> 'c')::integer order by random() limit least(2, (q ->> 'k')::integer - 2)) x;
    extra := jsonb_build_object('quita', coalesce(quita, '[]'));
  elsif p_k = 'hielo' then
    update public.duelo_jugadas x set visto = x.visto + interval '10 seconds' where x.duelo = d.id and x.usuario = uid;
    extra := jsonb_build_object('lleva', (extract(epoch from (now() - j.visto - interval '10 seconds')) * 1000)::bigint);
  elsif p_k in ('doble', 'escudo', 'ladron') then
    update public.duelo_jugadas x set activo = p_k where x.duelo = d.id and x.usuario = uid;
  elsif p_k = 'apuesta' then
    if p_n is null or p_n not between 1 and 3 then raise exception 'Apuesta 1, 2 o 3 puntos.'; end if;
    update public.duelo_jugadas x set activo = 'apuesta', apuesta = p_n where x.duelo = d.id and x.usuario = uid;
    extra := jsonb_build_object('apuesta', p_n);
  elsif p_k = 'espejo' then
    if j.espejo then raise exception 'Tu Espejo ya está activo.'; end if;
    update public.duelo_jugadas x set espejo = true where x.duelo = d.id and x.usuario = uid;
  elsif p_k = 'cambio' then
    if jsonb_array_length(d.reserva) = 0 then raise exception 'Este duelo no tiene preguntas de reserva.'; end if;
    -- Pregunta nueva con el reloj desde cero
    update public.duelo_jugadas x set cambio_i = j.actual, visto = now(), activo = null where x.duelo = d.id and x.usuario = uid;
    extra := jsonb_build_object('reserva', d.reserva -> 0 ->> 'ref');
  elsif p_k in ('robar', 'terremoto') then
    extra := public.duelo_atacar(d, uid, p_k);
    update public.duelo_jugadas x set stats = public.duelo_stat(x.stats, 'ataques', 1) where x.duelo = d.id and x.usuario = uid;
    extra := extra || jsonb_build_object('robados', (extra ->> 'golpes')::integer);
  elsif p_k <> 'espia' then
    raise exception 'Comodín no válido.';
  end if;

  update public.duelo_jugadas x set usados = x.usados || jsonb_build_array(
      jsonb_build_object('k', p_k, 'i', j.actual) || case when quita is not null then jsonb_build_object('quita', quita) else '{}' end)
  where x.duelo = d.id and x.usuario = uid;
  if p_k not in ('robar', 'terremoto') then
    insert into public.duelo_eventos (duelo, usuario, tipo, dato) values (d.id, uid, 'comodin', p_k);
  end if;
  return jsonb_build_object('ok', true, 'k', p_k) || extra || case when p_k = 'espia' then jsonb_build_object('espia', public.duelo_espia(d, uid, j.actual)) else '{}' end;
end $$;
revoke all on function public.usar_comodin(text, text, integer, integer) from public, anon;
grant execute on function public.usar_comodin(text, text, integer, integer) to authenticated;

-- ---------- Llamarada / Volcán (se cargan con la racha) ----------
create or replace function public.lanzar_fuego(p_codigo text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  d public.duelos;
  j public.duelo_jugadas;
  tipo text;
  r jsonb;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into d from public.duelos x where x.codigo = upper(trim(p_codigo));
  if d.id is null then raise exception 'No existe ese duelo.'; end if;
  select * into j from public.duelo_jugadas x where x.duelo = d.id and x.usuario = uid for update;
  if j.duelo is null or j.terminado is not null then raise exception 'No estás jugando este duelo.'; end if;
  if d.empieza is null or now() < d.empieza then raise exception 'El duelo aún no empieza.'; end if;
  if j.fuego <= 0 then raise exception 'Aún no cargas tu Llamarada.'; end if;
  tipo := case when j.fuego >= 2 then 'volcan' else 'llama' end;
  r := public.duelo_atacar(d, uid, tipo);
  update public.duelo_jugadas x set fuego = 0, bonus = case when tipo = 'volcan' then 2 else x.bonus end,
      stats = public.duelo_stat(x.stats, 'fuegos', 1) || jsonb_build_object('ult_fuego', jsonb_build_object('t', tipo, 'i', j.actual))
  where x.duelo = d.id and x.usuario = uid;
  return jsonb_build_object('ok', true, 'tipo', tipo) || r;
end $$;
revoke all on function public.lanzar_fuego(text) from public, anon;
grant execute on function public.lanzar_fuego(text) to authenticated;

-- ---------- Responder ----------
create or replace function public.responder_duelo(p_codigo text, p_i integer, p_op integer)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  d public.duelos;
  j public.duelo_jugadas;
  v public.duelo_jugadas;
  q jsonb;
  t integer;
  ok boolean;
  op integer := p_op;
  fin boolean;
  pts integer;
  lim integer;
  rel boolean := false;
  robo jsonb;
  extra integer := 0;
  racha integer;
  carga integer;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into d from public.duelos x where x.codigo = upper(trim(p_codigo));
  if d.id is null then raise exception 'No existe ese duelo.'; end if;
  select * into j from public.duelo_jugadas x where x.duelo = d.id and x.usuario = uid for update;
  if j.duelo is null then raise exception 'Primero empieza el duelo.'; end if;
  if j.terminado is not null then raise exception 'Ya terminaste este duelo.'; end if;
  if d.en_sala and (d.empieza is null or now() < d.empieza) then raise exception 'El duelo aún no empieza.'; end if;
  if p_i is distinct from j.actual then
    return jsonb_build_object('repetida', true, 'actual', j.actual, 'aciertos', j.aciertos, 'puntos', j.puntos);
  end if;
  q := case when j.cambio_i = j.actual and jsonb_array_length(d.reserva) > 0 then d.reserva -> 0 else d.preguntas -> j.actual end;
  lim := d.seg * 1000;
  t := greatest(least((extract(epoch from (now() - j.visto)) * 1000)::bigint, 600000), 0)::integer;
  if t > lim + 3000 or now() >= coalesce(d.empieza, j.inicio) + public.duelo_plazo(d) or op is null or op < 0 or op >= (q ->> 'k')::integer then
    op := -1; t := lim;
  end if;
  t := least(t, lim);
  ok := op = (q ->> 'c')::integer;

  -- Escudo: falló pero puede elegir otra vez (el reloj sigue corriendo)
  if not ok and op >= 0 and j.activo = 'escudo' then
    update public.duelo_jugadas x set activo = null where x.duelo = d.id and x.usuario = uid;
    return jsonb_build_object('reintenta', true, 'op', op, 'actual', j.actual, 'puntos', j.puntos);
  end if;

  fin := j.actual + 1 >= d.n;
  pts := case when not ok then 0
              when d.final_x3 and fin then 3
              when j.activo = 'doble' then 2
              else 1 end;
  if j.activo = 'apuesta' and coalesce(j.apuesta, 0) > 0 then
    pts := case when ok then j.apuesta else -least(j.apuesta, j.puntos) end;
  end if;
  if ok and j.bonus > 0 then pts := pts * j.bonus; end if;   -- Volcán: la siguiente vale doble

  -- Pregunta relámpago: el primero que la acierta gana +2
  if ok and d.relampago is not null and d.relampago = j.actual
     and not exists (select 1 from public.duelo_jugadas o where o.duelo = d.id and o.usuario <> uid
                     and jsonb_array_length(o.respuestas) > j.actual and (o.respuestas -> j.actual ->> 'ok')::boolean) then
    rel := true; pts := pts + 2;
    insert into public.duelo_eventos (duelo, usuario, tipo, dato) values (d.id, uid, 'relampago', '2');
  end if;

  -- Ladrón: si acierta, le quita 1 punto al rival que va mejor (si tiene Espejo, rebota)
  if ok and j.activo = 'ladron' then
    select * into v from public.duelo_jugadas o where o.duelo = d.id and o.usuario <> uid and o.puntos > 0
      order by o.puntos desc, coalesce(o.entro, o.inicio) limit 1 for update;
    if v.duelo is not null then
      if v.espejo then
        update public.duelo_jugadas o set espejo = false, puntos = o.puntos + 1, stats = public.duelo_stat(o.stats, 'rebotes', 1)
          where o.duelo = d.id and o.usuario = v.usuario;
        extra := -1;
        insert into public.duelo_eventos (duelo, usuario, tipo, dato, para) values (d.id, v.usuario, 'rebote', 'ladron', uid);
        robo := jsonb_build_object('a', public.duelo_apodo(v.usuario), 'rebote', true);
      else
        update public.duelo_jugadas o set puntos = o.puntos - 1 where o.duelo = d.id and o.usuario = v.usuario;
        extra := 1;
        insert into public.duelo_eventos (duelo, usuario, tipo, dato, para) values (d.id, uid, 'ataque', 'ladron', v.usuario);
        robo := jsonb_build_object('a', public.duelo_apodo(v.usuario), 'rebote', false);
      end if;
    end if;
  end if;

  update public.duelo_jugadas x set
    actual = x.actual + 1,
    visto = now() + interval '1500 milliseconds',   -- la pausa entre preguntas no cuenta
    respuestas = x.respuestas || jsonb_build_array(jsonb_build_object('op', op, 'ok', ok, 'ms', t, 'p', pts)
                   || case when rel then jsonb_build_object('rel', true) else '{}' end
                   || case when j.activo = 'apuesta' then jsonb_build_object('ap', j.apuesta) else '{}' end),
    aciertos = x.aciertos + case when ok then 1 else 0 end,
    puntos = greatest(x.puntos + pts + extra, 0),
    activo = null,
    apuesta = null,
    bonus = case when op >= 0 or not ok then 0 else x.bonus end,
    stats = case when extra > 0 then public.duelo_stat(x.stats, 'robos', 1) else x.stats end,
    ms = x.ms + t,
    terminado = case when fin then now() end
  where x.duelo = d.id and x.usuario = uid
  returning * into j;

  -- Racha: 3 seguidas cargan la Llamarada, 5 el Volcán. Si falla, se apaga
  racha := public.duelo_racha(j.respuestas);
  carga := case when not ok then 0
                when d.cmd_cant > 0 and racha > 0 and racha % 5 = 0 then 2
                when d.cmd_cant > 0 and racha % 5 = 3 then greatest(j.fuego, 1)
                else j.fuego end;
  if carga <> j.fuego then
    update public.duelo_jugadas x set fuego = carga where x.duelo = d.id and x.usuario = uid;
  end if;

  return jsonb_build_object('ok', ok, 'correcta', (q ->> 'c')::integer, 'op', op, 'ms', t, 'p', pts,
                            'actual', j.actual, 'aciertos', j.aciertos, 'puntos', j.puntos, 'terminado', fin,
                            'racha', racha, 'fuego', carga, 'rel', rel, 'robo', robo, 'extra', extra);
end $$;
revoke all on function public.responder_duelo(text, integer, integer) from public, anon;
grant execute on function public.responder_duelo(text, integer, integer) to authenticated;

-- ---------- Empezar / volver a entrar ----------
create or replace function public.empezar_duelo(p_codigo text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  d public.duelos;
  j public.duelo_jugadas;
  otros integer;
  refs jsonb;
  base jsonb;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into d from public.duelos x where x.codigo = upper(trim(p_codigo)) for update;
  if d.id is null then raise exception 'No existe ese duelo.'; end if;
  select * into j from public.duelo_jugadas x where x.duelo = d.id and x.usuario = uid;
  refs := (select jsonb_agg(e ->> 'ref' order by n) from jsonb_array_elements(d.preguntas) with ordinality t(e, n));
  base := jsonb_build_object('preguntas', refs, 'seg', d.seg, 'final', d.final_x3, 'cmd_cant', d.cmd_cant,
            'reserva', (select jsonb_agg(e ->> 'ref') from jsonb_array_elements(d.reserva) e), 'relampago', d.relampago);
  if d.en_sala then
    if j.duelo is null then raise exception 'No entraste a este duelo.'; end if;
    if d.empieza is null then raise exception 'El duelo aún no empieza.'; end if;
    if now() < d.empieza then
      return base || jsonb_build_object('espera', (extract(epoch from (d.empieza - now())) * 1000)::bigint,
        'comodines', public.duelo_mano(d, j));
    end if;
  elsif j.duelo is null then
    if now() >= d.vence then raise exception 'La sala de este duelo ya se cerró.'; end if;
    select count(*) into otros from public.duelo_jugadas x where x.duelo = d.id and x.usuario <> d.creador;
    if uid <> d.creador and otros >= d.max_jug - 1 then raise exception 'Este duelo ya está lleno.'; end if;
    insert into public.duelo_jugadas (duelo, usuario) values (d.id, uid) returning * into j;
  end if;
  return base || jsonb_build_object(
    'comodines', public.duelo_mano(d, j),
    'actual', j.actual, 'aciertos', j.aciertos, 'puntos', j.puntos, 'respuestas', j.respuestas,
    'usados', j.usados, 'activo', j.activo, 'apuesta', j.apuesta,
    'espejo', j.espejo, 'fuego', j.fuego, 'bonus', j.bonus, 'cambio_i', j.cambio_i,
    'terminado', j.terminado is not null,
    'lleva', (extract(epoch from (now() - j.visto)) * 1000)::bigint
  );
end $$;
revoke all on function public.empezar_duelo(text) from public, anon;
grant execute on function public.empezar_duelo(text) to authenticated;

-- ---------- En vivo ----------
-- Ahora cada evento dice a quién va ('para_mi') y el nombre del otro ('otro').
create or replace function public.duelo_vivo(p_codigo text, p_desde bigint)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  d public.duelos;
  yo public.duelo_jugadas;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into d from public.duelos x where x.codigo = upper(trim(p_codigo));
  if d.id is null then return null; end if;
  select * into yo from public.duelo_jugadas j where j.duelo = d.id and j.usuario = uid;
  if yo.duelo is null then raise exception 'No estás en este duelo.'; end if;
  return jsonb_build_object(
    'jugadores', (select coalesce(jsonb_agg(jsonb_build_object(
        'apodo', public.duelo_apodo(j.usuario), 'yo', j.usuario = uid,
        'actual', j.actual, 'puntos', j.puntos, 'racha', public.duelo_racha(j.respuestas),
        'usados', (select coalesce(jsonb_agg(e ->> 'k'), '[]') from jsonb_array_elements(j.usados) e),
        'ok', (select coalesce(jsonb_agg((e ->> 'ok')::boolean), '[]') from jsonb_array_elements(j.respuestas) e),
        'fuego', j.fuego, 'espejo', j.espejo,
        'terminado', j.terminado is not null or now() >= coalesce(d.empieza, j.inicio) + public.duelo_plazo(d)
      ) order by coalesce(j.entro, j.inicio), j.usuario), '[]') from public.duelo_jugadas j where j.duelo = d.id),
    'eventos', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', e.id, 'tipo', e.tipo, 'dato', e.dato, 'yo', e.usuario = uid, 'para_mi', e.para = uid,
        'apodo', public.duelo_apodo(e.usuario),
        'otro', case when e.para is not null then public.duelo_apodo(e.para) end) order by e.id), '[]')
      from (select * from public.duelo_eventos e where e.duelo = d.id and e.id > coalesce(p_desde, 0)
            and (e.para is null or e.para = uid or e.usuario = uid or e.tipo = 'ataque') order by e.id limit 30) e),
    'ultimo', (select coalesce(max(e.id), 0) from public.duelo_eventos e where e.duelo = d.id),
    'actual', yo.actual,
    'fuego', yo.fuego, 'espejo', yo.espejo, 'bonus', yo.bonus,
    'lleva', (extract(epoch from (now() - yo.visto)) * 1000)::bigint,
    'espia', case when exists (select 1 from jsonb_array_elements(yo.usados) e where e ->> 'k' = 'espia' and (e ->> 'i')::integer = yo.actual)
                  then public.duelo_espia(d, uid, yo.actual) end
  );
end $$;
revoke all on function public.duelo_vivo(text, bigint) from public, anon;
grant execute on function public.duelo_vivo(text, bigint) to authenticated;

-- ---------- Medallas (+ Pirómano, Intocable, Ladrón de oro, Apostador y la jugada del duelo) ----------
create or replace function public.duelo_medallas_v3(d public.duelos)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  m jsonb := public.duelo_medallas(d);
  piro jsonb; intoc jsonb; ladron jsonb; apost jsonb; jugada jsonb;
  gan uuid; g public.duelo_jugadas;
begin
  select jsonb_build_object('quien', public.duelo_apodo(j.usuario), 'dato', (j.stats ->> 'fuegos')::integer) into piro
    from public.duelo_jugadas j where j.duelo = d.id and coalesce((j.stats ->> 'fuegos')::integer, 0) > 0
    order by (j.stats ->> 'fuegos')::integer desc, coalesce(j.entro, j.inicio) limit 1;
  select jsonb_build_object('quien', public.duelo_apodo(j.usuario), 'dato', (j.stats ->> 'rebotes')::integer) into intoc
    from public.duelo_jugadas j where j.duelo = d.id and coalesce((j.stats ->> 'rebotes')::integer, 0) > 0
    order by (j.stats ->> 'rebotes')::integer desc, coalesce(j.entro, j.inicio) limit 1;
  select jsonb_build_object('quien', public.duelo_apodo(j.usuario), 'dato', (j.stats ->> 'robos')::integer) into ladron
    from public.duelo_jugadas j where j.duelo = d.id and coalesce((j.stats ->> 'robos')::integer, 0) > 0
    order by (j.stats ->> 'robos')::integer desc, coalesce(j.entro, j.inicio) limit 1;
  select jsonb_build_object('quien', public.duelo_apodo(j.usuario), 'dato', 3) into apost
    from public.duelo_jugadas j where j.duelo = d.id
      and exists (select 1 from jsonb_array_elements(j.respuestas) e where (e ->> 'ap')::integer = 3 and (e ->> 'ok')::boolean)
    order by coalesce(j.entro, j.inicio) limit 1;

  -- Jugada del duelo: lo que hizo el ganador para ganar
  select t.usuario into gan from public.duelo_tabla(d) t where t.puesto = 1
    and (select count(*) from public.duelo_tabla(d) u where u.puesto = 1) = 1;
  if gan is not null then
    select * into g from public.duelo_jugadas j where j.duelo = d.id and j.usuario = gan;
    jugada := case
      when g.stats ? 'ult_fuego' then jsonb_build_object('t', g.stats -> 'ult_fuego' ->> 't', 'i', (g.stats -> 'ult_fuego' ->> 'i')::integer)
      when m ? 'remontada' and m -> 'remontada' <> 'null' then jsonb_build_object('t', 'remontada', 'dato', m -> 'remontada' -> 'dato')
      when exists (select 1 from jsonb_array_elements(g.respuestas) e where (e ->> 'rel')::boolean) then
        jsonb_build_object('t', 'relampago', 'i', (select n - 1 from jsonb_array_elements(g.respuestas) with ordinality t(e, n) where (e ->> 'rel')::boolean limit 1))
      when coalesce((g.stats ->> 'robos')::integer, 0) > 0 then jsonb_build_object('t', 'ladron', 'dato', (g.stats ->> 'robos')::integer)
      when coalesce((g.stats ->> 'rebotes')::integer, 0) > 0 then jsonb_build_object('t', 'espejo', 'dato', (g.stats ->> 'rebotes')::integer)
      end;
    if jugada is not null then jugada := jugada || jsonb_build_object('quien', public.duelo_apodo(gan)); end if;
  end if;

  return m || jsonb_build_object('piromano', piro, 'intocable', intoc, 'ladron', ladron, 'apostador', apost, 'jugada', jugada);
end $$;
revoke all on function public.duelo_medallas_v3(public.duelos) from public, anon, authenticated;

-- ---------- Estado del duelo (como 30-duelo-fotos.sql, con lo nuevo) ----------
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

-- ---------- Invitar a tus amigos directo desde la sala ----------
-- Le sale un aviso al amigo en la web (assets/duelo-invita.js) y, si
-- activó las notificaciones, un aviso en el celular (Edge Function
-- «enviar-push», accion 'invitar'). Máximo 15 invitaciones por duelo.
create table if not exists public.duelo_invitaciones (
  id      bigserial primary key,
  duelo   uuid not null references public.duelos (id) on delete cascade,
  de      uuid not null references auth.users (id) on delete cascade,
  para    uuid not null references auth.users (id) on delete cascade,
  creado  timestamptz not null default now(),
  visto   boolean not null default false,
  unique (duelo, para)
);
create index if not exists duelo_invitaciones_para on public.duelo_invitaciones (para, creado desc);
alter table public.duelo_invitaciones enable row level security;
revoke all on public.duelo_invitaciones from anon, authenticated;

create or replace function public.invitar_duelo(p_codigo text, p_amigo integer)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  d public.duelos;
  amigo uuid;
  nuevo bigint;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into d from public.duelos x where x.codigo = upper(trim(p_codigo));
  if d.id is null then raise exception 'No existe ese duelo.'; end if;
  if not exists (select 1 from public.duelo_jugadas j where j.duelo = d.id and j.usuario = uid) then raise exception 'Primero entra a la sala.'; end if;
  if d.empieza is not null or now() >= d.vence then raise exception 'La sala ya se cerró.'; end if;
  amigo := public.usuario_de_codigo(p_amigo);
  if amigo is null or not public.son_amigos(uid, amigo) then raise exception 'Solo puedes invitar a tus amigos.'; end if;
  if exists (select 1 from public.duelo_jugadas j where j.duelo = d.id and j.usuario = amigo) then raise exception 'Ya está en la sala.'; end if;
  if (select count(*) from public.duelo_invitaciones i where i.duelo = d.id) >= 15 then raise exception 'Ya invitaste a muchos amigos a este duelo.'; end if;
  insert into public.duelo_invitaciones (duelo, de, para) values (d.id, uid, amigo)
    on conflict (duelo, para) do nothing returning id into nuevo;
  -- Aviso al celular (si la Edge Function y las notificaciones están listas)
  if nuevo is not null then
    begin
      perform net.http_post(
        url := 'https://tvcrhogybfxphpzpjnis.supabase.co/functions/v1/enviar-push',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := jsonb_build_object('accion', 'invitar', 'id', nuevo, 'secreto', (select secreto from public.push_ajustes where id = 1)));
    exception when others then null;
    end;
  end if;
  delete from public.duelo_invitaciones i where i.creado < now() - interval '1 day';
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.invitar_duelo(text, integer) from public, anon;
grant execute on function public.invitar_duelo(text, integer) to authenticated;

-- Invitaciones que me llegaron y siguen abiertas
create or replace function public.mis_invitaciones()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', i.id, 'codigo', d.codigo, 'titulo', d.titulo, 'n', d.n, 'seg', d.seg,
      'de', public.duelo_apodo(i.de),
      'foto', (select p.foto_url from public.perfiles p where p.id = i.de and p.foto_url like 'https://%'),
      'vence', d.vence, 'ahora', now()) order by i.creado desc)
    from public.duelo_invitaciones i join public.duelos d on d.id = i.duelo
    where i.para = uid and not i.visto and d.empieza is null and now() < d.vence
      and not exists (select 1 from public.duelo_jugadas j where j.duelo = d.id and j.usuario = uid)), '[]'::jsonb);
end $$;
revoke all on function public.mis_invitaciones() from public, anon;
grant execute on function public.mis_invitaciones() to authenticated;

create or replace function public.invitacion_vista(p_id bigint)
returns void language sql volatile security definer set search_path = '' as $$
  update public.duelo_invitaciones set visto = true where id = p_id and para = auth.uid();
$$;
revoke all on function public.invitacion_vista(bigint) from public, anon;
grant execute on function public.invitacion_vista(bigint) to authenticated;

-- Para la Edge Function: a quién mandar el aviso de una invitación
create or replace function public.push_invitacion(p_secreto text, p_id bigint)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  i public.duelo_invitaciones;
  d public.duelos;
begin
  if p_secreto is distinct from (select secreto from public.push_ajustes where id = 1) then raise exception 'no autorizado'; end if;
  select * into i from public.duelo_invitaciones x where x.id = p_id;
  if i.id is null or i.creado < now() - interval '2 minutes' then return jsonb_build_object('mensajes', '[]'::jsonb, 'subs', '{}'::jsonb); end if;
  select * into d from public.duelos x where x.id = i.duelo;
  return jsonb_build_object(
    'mensajes', jsonb_build_array(jsonb_build_object('usuario', i.para,
      'titulo', public.duelo_apodo(i.de) || ' te reta a un duelo',
      'cuerpo', d.titulo || ' · ' || d.n || ' preguntas. La sala se cierra en unos minutos, ¡entra ya!',
      'link', 'duelo.html?d=' || d.codigo)),
    'subs', jsonb_build_object(i.para::text, coalesce((select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
      from public.push_subs s where s.usuario = i.para), '[]'::jsonb)));
end $$;
revoke all on function public.push_invitacion(text, bigint) from public;
grant execute on function public.push_invitacion(text, bigint) to anon, authenticated;
