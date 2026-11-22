-- =========================================================
-- Modo Cachimbo · Duelos: comodines v4 (4 grupos, reglas nuevas).
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Necesita 111, 112 y 114.
--
-- Grupos (máx. 2 cartas del mismo grupo en la mano):
--   Sabiduría: Oráculo (mitad, ahora quita 3), Ojo de halcón (espia),
--              Reloj de arena (reloj, NUEVO: +10 s y te salva de Arenas).
--   Fortuna:   Corona doble (doble), Dado de oro (apuesta),
--              Botín (ladron: −1 a cada uno que va delante, máx. 2, y tú los ganas).
--   Guardia:   Fénix (escudo: si fallas eliges otra vez y esa pregunta
--              ningún ataque te toca), Espejo (dura 2 preguntas),
--              Elixir (elixir, NUEVO: limpia el ataque y 5 s de inmunidad).
--   Asalto:    Glaciar (hielo), Sismo (terremoto), Arenas del tiempo
--              (robar: −8 s pero nunca te deja con menos de 5 s),
--              Furia (furia, NUEVO: solo quien la elige carga Llamarada/Volcán).
--   Cambio se quita.
-- Reglas: cada carta 1 vez; por pregunta máx. 1 propia + 1 ataque
-- (Llamarada y Volcán cuentan como ataque); en la final ×3 no hay ataques
-- y el que está en su final no recibe; cartas: 5→2, 10/15→3, 20/25→4, 30→5.
-- =========================================================

alter table public.duelo_jugadas add column if not exists inmune timestamptz;          -- Elixir: ningún ataque hasta esta hora
alter table public.duelo_jugadas add column if not exists espejo_hasta integer;        -- Espejo activo hasta esta pregunta (incluida)

-- ---------- Ayudas ----------
create or replace function public.duelo_pool()
returns text[] language sql immutable set search_path = '' as $$
  select array['mitad', 'espia', 'reloj', 'doble', 'apuesta', 'ladron', 'escudo', 'espejo', 'elixir', 'hielo', 'terremoto', 'robar', 'furia'];
$$;
revoke all on function public.duelo_pool() from public, anon, authenticated;

create or replace function public.duelo_grupo(k text)
returns text language sql immutable set search_path = '' as $$
  select case when k in ('mitad', 'espia', 'reloj') then 'sab'
              when k in ('doble', 'apuesta', 'ladron') then 'for'
              when k in ('escudo', 'espejo', 'elixir') then 'gua'
              else 'asa' end;
$$;
revoke all on function public.duelo_grupo(text) from public, anon, authenticated;

-- ¿Ya usó una carta de esta clase (ataque o propia) en la pregunta i?
create or replace function public.duelo_usado_en(j public.duelo_jugadas, i integer, ataque boolean)
returns boolean language sql immutable set search_path = '' as $$
  select exists (select 1 from jsonb_array_elements(j.usados) e
                 where (e ->> 'i')::integer = i and ((e ->> 'k') in ('hielo', 'terremoto', 'robar')) = ataque)
      or (ataque and (j.stats -> 'ult_fuego' ->> 'i')::integer = i);
$$;
revoke all on function public.duelo_usado_en(public.duelo_jugadas, integer, boolean) from public, anon, authenticated;

-- Mano al azar que respeta máx. 2 por grupo
create or replace function public.duelo_mano_azar(pool jsonb, n integer)
returns jsonb language plpgsql volatile set search_path = '' as $$
declare
  k text;
  m jsonb := '[]';
begin
  for k in select x from jsonb_array_elements_text(pool) x order by random() loop
    exit when jsonb_array_length(m) >= n;
    if (select count(*) from jsonb_array_elements_text(m) y where public.duelo_grupo(y) = public.duelo_grupo(k)) < 2 then
      m := m || jsonb_build_array(k);
    end if;
  end loop;
  return m;
end $$;
revoke all on function public.duelo_mano_azar(jsonb, integer) from public, anon, authenticated;

-- ---------- Crear (copia de 114: sin Cambio y con la tabla nueva de cartas) ----------
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
    select coalesce(jsonb_agg(k), '[]') into cmd from unnest(public.duelo_pool()) k;
    -- 5 → 2 · 10 y 15 → 3 · 20 y 25 → 4 · 30 → 5
    ncmd := case when cant <= 5 then 2 when cant <= 15 then 3 when cant <= 25 then 4 else 5 end;
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

-- ---------- Elegir comodines: máx. 2 del mismo grupo ----------
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
  if exists (select 1 from jsonb_array_elements_text(limpio) k group by public.duelo_grupo(k) having count(*) > 2) then
    raise exception 'Máximo 2 comodines del mismo grupo.';
  end if;
  update public.duelo_jugadas j set mano = limpio where j.duelo = d.id and j.usuario = uid;
  return jsonb_build_object('ok', true, 'mano', limpio);
end $$;
revoke all on function public.elegir_comodines(text, jsonb) from public, anon;
grant execute on function public.elegir_comodines(text, jsonb) to authenticated;

-- ---------- Arrancar: al azar a quien no eligió, respetando los grupos ----------
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
      update public.duelo_jugadas j set mano = public.duelo_mano_azar(d.comodines, d.cmd_cant)
      where j.duelo = p_id and jsonb_array_length(j.mano) <> d.cmd_cant;
    end if;
  end if;
end $$;
revoke all on function public.duelo_arrancar(uuid) from public, anon, authenticated;

-- ---------- Ataques ----------
-- A todos los rivales que siguen jugando, menos a quien:
--   · usó Fénix en su pregunta actual,
--   · tiene la inmunidad del Elixir,
--   · está en su pregunta final ×3,
--   · (solo Arenas) usó Reloj de arena en su pregunta actual.
-- Espejo activo (dura 2 preguntas): rebota al atacante.
-- Arenas del tiempo: −8 s, pero nunca deja menos de 5 s.
create or replace function public.duelo_atacar(d public.duelos, uid uuid, tipo text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  r public.duelo_jugadas;
  golpes integer := 0;
  rebotes integer := 0;
  salvados integer := 0;
  quien uuid;
begin
  for r in select * from public.duelo_jugadas j where j.duelo = d.id and j.usuario <> uid and j.terminado is null and j.actual < d.n
           order by coalesce(j.entro, j.inicio) for update loop
    if (d.final_x3 and r.actual = d.n - 1)
       or coalesce(r.inmune > now(), false)
       or exists (select 1 from jsonb_array_elements(r.usados) e where e ->> 'k' = 'escudo' and (e ->> 'i')::integer = r.actual)
       or (tipo = 'robar' and exists (select 1 from jsonb_array_elements(r.usados) e where e ->> 'k' = 'reloj' and (e ->> 'i')::integer = r.actual)) then
      salvados := salvados + 1;
      insert into public.duelo_eventos (duelo, usuario, tipo, dato, para) values (d.id, uid, 'ataque', 'salvo:' || tipo, r.usuario);
      continue;
    end if;
    if r.espejo and (r.espejo_hasta is null or r.actual <= r.espejo_hasta) then
      update public.duelo_jugadas j set espejo = false, espejo_hasta = null, stats = public.duelo_stat(j.stats, 'rebotes', 1) where j.duelo = d.id and j.usuario = r.usuario;
      quien := uid;
      insert into public.duelo_eventos (duelo, usuario, tipo, dato, para) values (d.id, r.usuario, 'rebote', tipo, uid);
      rebotes := rebotes + 1;
    else
      quien := r.usuario;
      insert into public.duelo_eventos (duelo, usuario, tipo, dato, para) values (d.id, uid, 'ataque', tipo, r.usuario);
      update public.duelo_jugadas j set stats = public.duelo_stat(j.stats, 'golpes', 1) where j.duelo = d.id and j.usuario = r.usuario;
      golpes := golpes + 1;
    end if;
    if tipo = 'robar' then
      update public.duelo_jugadas j
        set visto = least(j.visto, greatest(j.visto - interval '8 seconds', now() + interval '5 seconds' - make_interval(secs => d.seg)))
        where j.duelo = d.id and j.usuario = quien and j.terminado is null;
    end if;
  end loop;
  return jsonb_build_object('golpes', golpes, 'rebotes', rebotes, 'salvados', salvados);
end $$;
revoke all on function public.duelo_atacar(public.duelos, uuid, text) from public, anon, authenticated;

-- El evento 'salvo:<ataque>' entra en el tipo 'ataque' (dato libre): no hace falta tocar la restricción.

-- ---------- Comodines ----------
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
  ataque boolean := p_k in ('hielo', 'terremoto', 'robar');
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into d from public.duelos x where x.codigo = upper(trim(p_codigo));
  if d.id is null then raise exception 'No existe ese duelo.'; end if;
  select * into j from public.duelo_jugadas x where x.duelo = d.id and x.usuario = uid for update;
  if j.duelo is null or j.terminado is not null then raise exception 'No estás jugando este duelo.'; end if;
  if d.empieza is null or now() < d.empieza then raise exception 'El duelo aún no empieza.'; end if;
  if p_i is distinct from j.actual then raise exception 'Esa pregunta ya pasó.'; end if;
  if not public.duelo_mano(d, j) ? p_k then raise exception 'No tienes ese comodín.'; end if;
  if p_k = 'furia' then raise exception 'Furia se carga sola: acierta 3 seguidas.'; end if;
  if exists (select 1 from jsonb_array_elements(j.usados) e where e ->> 'k' = p_k) then raise exception 'Ya usaste ese comodín.'; end if;
  if public.duelo_usado_en(j, j.actual, ataque) then
    raise exception '%', case when ataque then 'Solo un ataque por pregunta.' else 'Solo un comodín propio por pregunta.' end;
  end if;
  if now() > j.visto + make_interval(secs => d.seg) then raise exception 'Se acabó el tiempo de esta pregunta.'; end if;
  ult := d.final_x3 and j.actual = d.n - 1;
  if p_k in ('doble', 'apuesta') and ult then raise exception 'La última ya vale 3.'; end if;
  if ataque and ult then raise exception 'En la final no hay ataques.'; end if;
  q := case when j.cambio_i = j.actual and jsonb_array_length(d.reserva) > 0 then d.reserva -> 0 else d.preguntas -> j.actual end;

  if p_k = 'mitad' then
    -- Oráculo: quita 3 malas (quedan 2)
    select jsonb_agg(o) into quita from (
      select o from generate_series(0, (q ->> 'k')::integer - 1) o
      where o <> (q ->> 'c')::integer order by random() limit greatest(least(3, (q ->> 'k')::integer - 2), 0)) x;
    extra := jsonb_build_object('quita', coalesce(quita, '[]'));
  elsif p_k = 'ladron' then
    if not exists (select 1 from public.duelo_jugadas o where o.duelo = d.id and o.usuario <> uid and o.puntos > j.puntos) then
      raise exception 'Vas primero: Botín no tiene a quién quitarle.';
    end if;
    update public.duelo_jugadas x set activo = p_k where x.duelo = d.id and x.usuario = uid;
  elsif p_k in ('doble', 'escudo') then
    update public.duelo_jugadas x set activo = p_k where x.duelo = d.id and x.usuario = uid;
  elsif p_k = 'apuesta' then
    if p_n is null or p_n not between 1 and 3 then raise exception 'Apuesta 1, 2 o 3 puntos.'; end if;
    update public.duelo_jugadas x set activo = 'apuesta', apuesta = p_n where x.duelo = d.id and x.usuario = uid;
    extra := jsonb_build_object('apuesta', p_n);
  elsif p_k = 'espejo' then
    if j.espejo then raise exception 'Tu Espejo ya está activo.'; end if;
    update public.duelo_jugadas x set espejo = true, espejo_hasta = j.actual + 1 where x.duelo = d.id and x.usuario = uid;
  elsif p_k = 'reloj' then
    -- Reloj de arena: +10 s en esta pregunta
    update public.duelo_jugadas x set visto = x.visto + interval '10 seconds' where x.duelo = d.id and x.usuario = uid;
  elsif p_k = 'elixir' then
    update public.duelo_jugadas x set inmune = now() + interval '5 seconds' where x.duelo = d.id and x.usuario = uid;
  elsif ataque then
    extra := public.duelo_atacar(d, uid, p_k);
    update public.duelo_jugadas x set stats = public.duelo_stat(x.stats, 'ataques', 1) where x.duelo = d.id and x.usuario = uid;
    extra := extra || jsonb_build_object('robados', (extra ->> 'golpes')::integer);
  elsif p_k <> 'espia' then
    raise exception 'Comodín no válido.';
  end if;

  update public.duelo_jugadas x set usados = x.usados || jsonb_build_array(
      jsonb_build_object('k', p_k, 'i', j.actual) || case when quita is not null then jsonb_build_object('quita', quita) else '{}' end)
  where x.duelo = d.id and x.usuario = uid;
  if not ataque then
    insert into public.duelo_eventos (duelo, usuario, tipo, dato) values (d.id, uid, 'comodin', p_k);
  end if;
  return jsonb_build_object('ok', true, 'k', p_k) || extra || case when p_k = 'espia' then jsonb_build_object('espia', public.duelo_espia(d, uid, j.actual)) else '{}' end;
end $$;
revoke all on function public.usar_comodin(text, text, integer, integer) from public, anon;
grant execute on function public.usar_comodin(text, text, integer, integer) to authenticated;

-- ---------- Llamarada / Volcán: solo con Furia, cuenta como el ataque de la pregunta ----------
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
  if d.cmd_cant > 0 and not public.duelo_mano(d, j) ? 'furia' then raise exception 'Necesitas la carta Furia.'; end if;
  if j.fuego <= 0 then raise exception 'Aún no cargas tu Llamarada.'; end if;
  if d.final_x3 and j.actual = d.n - 1 then raise exception 'En la final no hay ataques.'; end if;
  if public.duelo_usado_en(j, j.actual, true) then raise exception 'Solo un ataque por pregunta.'; end if;
  tipo := case when j.fuego >= 2 then 'volcan' else 'llama' end;
  r := public.duelo_atacar(d, uid, tipo);
  update public.duelo_jugadas x set fuego = 0, bonus = case when tipo = 'volcan' then 2 else x.bonus end,
      stats = public.duelo_stat(x.stats, 'fuegos', 1) || jsonb_build_object('ult_fuego', jsonb_build_object('t', tipo, 'i', j.actual))
  where x.duelo = d.id and x.usuario = uid;
  return jsonb_build_object('ok', true, 'tipo', tipo) || r;
end $$;
revoke all on function public.lanzar_fuego(text) from public, anon;
grant execute on function public.lanzar_fuego(text) to authenticated;


-- ---------- Responder: Botín nuevo, Espejo de 2 preguntas y fuego solo con Furia ----------
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
  furia boolean;
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

  -- Botín: si acierta, −1 a cada rival que va delante (máx. 2) y él los gana. Con Espejo, rebota: pierde 1
  if ok and j.activo = 'ladron' then
    robo := '[]';
    for v in select * from public.duelo_jugadas o where o.duelo = d.id and o.usuario <> uid and o.puntos > j.puntos
             order by o.puntos desc, coalesce(o.entro, o.inicio) limit 2 for update loop
      if v.espejo and (v.espejo_hasta is null or v.actual <= v.espejo_hasta) then
        update public.duelo_jugadas o set espejo = false, espejo_hasta = null, stats = public.duelo_stat(o.stats, 'rebotes', 1)
          where o.duelo = d.id and o.usuario = v.usuario;
        extra := extra - 1;
        insert into public.duelo_eventos (duelo, usuario, tipo, dato, para) values (d.id, v.usuario, 'rebote', 'ladron', uid);
        robo := robo || jsonb_build_array(jsonb_build_object('a', public.duelo_apodo(v.usuario), 'rebote', true));
      else
        update public.duelo_jugadas o set puntos = greatest(o.puntos - 1, 0) where o.duelo = d.id and o.usuario = v.usuario;
        extra := extra + 1;
        insert into public.duelo_eventos (duelo, usuario, tipo, dato, para) values (d.id, uid, 'ataque', 'ladron', v.usuario);
        robo := robo || jsonb_build_array(jsonb_build_object('a', public.duelo_apodo(v.usuario), 'rebote', false));
      end if;
    end loop;
    if jsonb_array_length(robo) = 0 then robo := null; end if;
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
    espejo = case when x.espejo_hasta is not null and x.actual + 1 > x.espejo_hasta then false else x.espejo end,
    espejo_hasta = case when x.espejo_hasta is not null and x.actual + 1 > x.espejo_hasta then null else x.espejo_hasta end,
    stats = case when extra > 0 then public.duelo_stat(x.stats, 'robos', extra) else x.stats end,
    ms = x.ms + t,
    terminado = case when fin then now() end
  where x.duelo = d.id and x.usuario = uid
  returning * into j;

  -- Racha: 3 seguidas cargan la Llamarada, 5 el Volcán. Si falla, se apaga
  -- Solo con la carta Furia
  racha := public.duelo_racha(j.respuestas);
  furia := d.cmd_cant > 0 and public.duelo_mano(d, j) ? 'furia';
  carga := case when not ok then 0
                when furia and racha > 0 and racha % 5 = 0 then 2
                when furia and racha % 5 = 3 then greatest(j.fuego, 1)
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
