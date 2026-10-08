-- =========================================================
-- Modo Cachimbo · Duelos 1 vs 1
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita haber corrido antes supabase/01-perfiles.sql.
--
-- Cómo funciona:
--   · Un alumno crea un duelo (10 preguntas) y comparte el enlace.
--     El primero que lo abre y empieza queda como su rival.
--   · Cada uno lo juega cuando quiera dentro de 24 horas; las
--     preguntas son las mismas y tienen 60 segundos cada una.
--     El tiempo lo mide el servidor.
--   · Gana quien acierta más; si empatan, el más rápido.
--     Si se acaban las 24 horas, gana el que terminó.
--   · ranking_duelos(): top 10 de la semana (lunes a domingo,
--     hora de Lima) por duelos ganados, con apodo.
--
-- Qué guarda:
--   · duelos: el reto, con la lista de preguntas. De cada pregunta
--     solo se guarda dónde está en la web y cuál es la correcta.
--   · duelo_jugadas: lo que respondió cada jugador.
-- Nadie lee ni escribe las tablas directo: todo pasa por las funciones.
-- =========================================================

create table if not exists public.duelos (
  id          uuid primary key default gen_random_uuid(),
  codigo      text not null unique check (codigo ~ '^[A-Z0-9]{6}$'),
  creador     uuid not null references auth.users (id) on delete cascade,
  rival       uuid references auth.users (id) on delete set null,
  titulo      text not null check (char_length(titulo) between 1 and 80),
  curso       text not null check (char_length(curso) between 1 and 40),
  fuente      text not null check (fuente in ('mezcla', 'libro', 'fijas', 'seminarios', 'banqueo')),
  preguntas   jsonb not null,               -- [{ref:"curso/libros/data/2027-I.json#01#3", c:2, k:5}, …]
  n           integer not null check (n between 3 and 15),
  revancha_de uuid references public.duelos (id) on delete set null,
  creado      timestamptz not null default now(),
  vence       timestamptz not null default now() + interval '24 hours'
);
create index if not exists duelos_creador on public.duelos (creador, creado desc);
create index if not exists duelos_rival on public.duelos (rival, creado desc);
create index if not exists duelos_creado on public.duelos (creado);
create index if not exists duelos_revancha on public.duelos (revancha_de);
alter table public.duelos enable row level security;

create table if not exists public.duelo_jugadas (
  duelo      uuid not null references public.duelos (id) on delete cascade,
  usuario    uuid not null references auth.users (id) on delete cascade,
  inicio     timestamptz not null default now(),
  actual     integer not null default 0,       -- pregunta que le toca (0 = la primera)
  visto      timestamptz not null default now(),  -- desde cuándo ve la pregunta actual
  respuestas jsonb not null default '[]',       -- [{op:2, ok:true, ms:8123}, …]
  aciertos   integer not null default 0,
  ms         integer not null default 0,
  terminado  timestamptz,
  primary key (duelo, usuario)
);
create index if not exists duelo_jugadas_usuario on public.duelo_jugadas (usuario);
alter table public.duelo_jugadas enable row level security;

revoke all on public.duelos from anon, authenticated;
revoke all on public.duelo_jugadas from anon, authenticated;

-- Nombre visible del alumno (apodo o primer nombre)
create or replace function public.duelo_apodo(u uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(trim(p.apodo), ''), split_part(coalesce(nullif(trim(p.nombre), ''), 'Alumno'), ' ', 1))
  from (select 1) x left join public.perfiles p on p.id = u;
$$;
revoke all on function public.duelo_apodo(uuid) from public, anon, authenticated;

-- Ganador del duelo: uuid del ganador, o null si empatan / aún no hay resultado.
-- empate = true cuando terminaron igual.
create or replace function public.duelo_resultado(d public.duelos, out ganador uuid, out empate boolean, out listo boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  a public.duelo_jugadas;
  b public.duelo_jugadas;
begin
  ganador := null; empate := false; listo := false;
  if d.rival is null then
    listo := now() >= d.vence;  -- nadie aceptó: sin resultado
    return;
  end if;
  select * into a from public.duelo_jugadas j where j.duelo = d.id and j.usuario = d.creador;
  select * into b from public.duelo_jugadas j where j.duelo = d.id and j.usuario = d.rival;
  if a.terminado is not null and b.terminado is not null then
    listo := true;
    if a.aciertos > b.aciertos or (a.aciertos = b.aciertos and a.ms < b.ms) then ganador := d.creador;
    elsif b.aciertos > a.aciertos or (a.aciertos = b.aciertos and b.ms < a.ms) then ganador := d.rival;
    else empate := true;
    end if;
  elsif now() >= d.vence then
    listo := true;
    if a.terminado is not null then ganador := d.creador;
    elsif b.terminado is not null then ganador := d.rival;
    end if;
  end if;
end $$;
revoke all on function public.duelo_resultado(public.duelos) from public, anon, authenticated;

-- Crea un duelo. p = { titulo, curso, fuente, revancha_de?, preguntas:[{ref, c, k}] }
-- Devuelve el código (6 letras/números) para el enlace duelo.html?d=CODIGO
create or replace function public.crear_duelo(p jsonb)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  cod text;
  letras constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  q jsonb;
  lista jsonb := '[]';
  previo public.duelos;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if (select count(*) from public.duelos x where x.creador = uid and x.creado > now() - interval '1 day') >= 40 then
    raise exception 'Ya creaste muchos duelos hoy. Intenta mañana.';
  end if;
  if jsonb_typeof(p -> 'preguntas') <> 'array' or jsonb_array_length(p -> 'preguntas') not between 3 and 15 then
    raise exception 'preguntas no válidas';
  end if;
  for q in select * from jsonb_array_elements(p -> 'preguntas') loop
    if coalesce(q ->> 'ref', '') !~ '^[a-z0-9-]{2,40}/(libros|seminarios|banqueo)/data/[0-9]{4}-(I|II|III)(-fijas)?\.json#[A-Za-z0-9._-]{1,12}#[0-9]{1,3}$'
       or jsonb_typeof(q -> 'c') <> 'number' or jsonb_typeof(q -> 'k') <> 'number'
       or (q ->> 'k')::integer not between 2 and 8 or (q ->> 'c')::integer not between 0 and (q ->> 'k')::integer - 1 then
      raise exception 'pregunta no válida';
    end if;
    lista := lista || jsonb_build_array(jsonb_build_object('ref', q ->> 'ref', 'c', (q ->> 'c')::integer, 'k', (q ->> 'k')::integer));
  end loop;

  if coalesce(p ->> 'revancha_de', '') ~ '^[A-Z0-9]{6}$' then
    select * into previo from public.duelos x where x.codigo = p ->> 'revancha_de' and uid in (x.creador, x.rival);
  end if;

  loop
    cod := '';
    for i in 1..6 loop cod := cod || substr(letras, 1 + floor(random() * length(letras))::integer, 1); end loop;
    exit when not exists (select 1 from public.duelos x where x.codigo = cod);
  end loop;

  insert into public.duelos (codigo, creador, rival, titulo, curso, fuente, preguntas, n, revancha_de)
  values (cod, uid,
          -- en la revancha, el rival es el mismo de antes
          case when previo.id is not null then (case when previo.creador = uid then previo.rival else previo.creador end) end,
          left(coalesce(nullif(trim(p ->> 'titulo'), ''), 'Duelo'), 80),
          left(coalesce(nullif(trim(p ->> 'curso'), ''), 'todos'), 40),
          case when p ->> 'fuente' in ('mezcla', 'libro', 'fijas', 'seminarios', 'banqueo') then p ->> 'fuente' else 'mezcla' end,
          lista, jsonb_array_length(lista), previo.id);
  return cod;
end $$;
revoke all on function public.crear_duelo(jsonb) from public, anon;
grant execute on function public.crear_duelo(jsonb) to authenticated;

-- Estado de un duelo para la página. Las respuestas correctas solo
-- se muestran a quien ya terminó; el puntaje del otro, también.
create or replace function public.ver_duelo(p_codigo text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  d public.duelos;
  r record;
  yo public.duelo_jugadas;
  otro public.duelo_jugadas;
  rol text;
  otro_id uuid;
  rev text;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into d from public.duelos x where x.codigo = upper(trim(p_codigo));
  if d.id is null then return null; end if;
  rol := case when uid = d.creador then 'creador' when uid = d.rival then 'rival' end;
  otro_id := case when rol = 'creador' then d.rival when rol = 'rival' then d.creador end;
  select * into yo from public.duelo_jugadas j where j.duelo = d.id and j.usuario = uid;
  if otro_id is not null then select * into otro from public.duelo_jugadas j where j.duelo = d.id and j.usuario = otro_id; end if;
  select * into r from public.duelo_resultado(d);
  select x.codigo into rev from public.duelos x where x.revancha_de = d.id order by x.creado desc limit 1;

  return jsonb_build_object(
    'codigo', d.codigo, 'titulo', d.titulo, 'curso', d.curso, 'fuente', d.fuente, 'n', d.n,
    'creado', d.creado, 'vence', d.vence, 'vencido', now() >= d.vence,
    'rol', rol,
    'creador', public.duelo_apodo(d.creador),
    'rival', case when d.rival is not null then public.duelo_apodo(d.rival) end,
    'yo', case when yo.duelo is not null then jsonb_build_object(
            'actual', yo.actual, 'aciertos', yo.aciertos, 'ms', yo.ms,
            'terminado', yo.terminado is not null, 'respuestas', yo.respuestas) end,
    'otro', case when otro.duelo is not null then jsonb_build_object(
            'apodo', public.duelo_apodo(otro_id),
            'actual', otro.actual, 'terminado', otro.terminado is not null,
            'aciertos', case when yo.terminado is not null or r.listo then otro.aciertos end,
            'ms', case when yo.terminado is not null or r.listo then otro.ms end) end,
    'resultado', case when r.listo then jsonb_build_object(
            'empate', r.empate,
            'gane', r.ganador is not null and r.ganador = uid,
            'ganador', case when r.ganador is not null then public.duelo_apodo(r.ganador) end) end,
    'correctas', case when yo.terminado is not null or (r.listo and rol is not null)
            then (select jsonb_agg((e ->> 'c')::integer order by n) from jsonb_array_elements(d.preguntas) with ordinality t(e, n)) end,
    'preguntas', case when yo.terminado is not null or (r.listo and rol is not null)
            then (select jsonb_agg(e ->> 'ref' order by n) from jsonb_array_elements(d.preguntas) with ordinality t(e, n)) end,
    'revancha', rev
  );
end $$;
revoke all on function public.ver_duelo(text) from public, anon;
grant execute on function public.ver_duelo(text) to authenticated;

-- Empieza (o retoma) la parte del alumno. El primero que entra y no es
-- el creador queda como rival. Devuelve las preguntas (sin la correcta),
-- la que le toca y cuántos milisegundos lleva viéndola.
create or replace function public.empezar_duelo(p_codigo text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  d public.duelos;
  j public.duelo_jugadas;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into d from public.duelos x where x.codigo = upper(trim(p_codigo)) for update;
  if d.id is null then raise exception 'No existe ese duelo.'; end if;
  if uid <> d.creador and d.rival is not null and uid <> d.rival then
    raise exception 'Este duelo ya tiene rival.';
  end if;
  select * into j from public.duelo_jugadas x where x.duelo = d.id and x.usuario = uid;
  if j.duelo is null then
    if now() >= d.vence then raise exception 'Este duelo ya venció.'; end if;
    if uid <> d.creador and d.rival is null then
      update public.duelos x set rival = uid where x.id = d.id;
    end if;
    insert into public.duelo_jugadas (duelo, usuario) values (d.id, uid) returning * into j;
  end if;
  return jsonb_build_object(
    'preguntas', (select jsonb_agg(e ->> 'ref' order by n) from jsonb_array_elements(d.preguntas) with ordinality t(e, n)),
    'actual', j.actual, 'aciertos', j.aciertos, 'respuestas', j.respuestas,
    'terminado', j.terminado is not null,
    'lleva', (extract(epoch from (now() - j.visto)) * 1000)::bigint
  );
end $$;
revoke all on function public.empezar_duelo(text) from public, anon;
grant execute on function public.empezar_duelo(text) to authenticated;

-- Responde la pregunta p_i (en orden). p_op = -1 si se acabó el tiempo.
-- Cada pregunta tiene 60 s (+3 s de margen por la conexión); pasado eso
-- cuenta como no respondida.
create or replace function public.responder_duelo(p_codigo text, p_i integer, p_op integer)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  d public.duelos;
  j public.duelo_jugadas;
  q jsonb;
  t integer;
  ok boolean;
  op integer := p_op;
  fin boolean;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into d from public.duelos x where x.codigo = upper(trim(p_codigo));
  if d.id is null then raise exception 'No existe ese duelo.'; end if;
  select * into j from public.duelo_jugadas x where x.duelo = d.id and x.usuario = uid for update;
  if j.duelo is null then raise exception 'Primero empieza el duelo.'; end if;
  if j.terminado is not null then raise exception 'Ya terminaste este duelo.'; end if;
  if p_i is distinct from j.actual then
    -- respuesta repetida o vieja (p. ej. doble clic): se devuelve el estado sin cambiar nada
    return jsonb_build_object('repetida', true, 'actual', j.actual, 'aciertos', j.aciertos);
  end if;
  q := d.preguntas -> j.actual;
  t := least((extract(epoch from (now() - j.visto)) * 1000)::bigint, 600000)::integer;
  if t > 63000 or now() >= d.vence + interval '2 minutes' or op is null or op < 0 or op >= (q ->> 'k')::integer then
    op := -1; t := 60000;
  end if;
  t := least(t, 60000);
  ok := op = (q ->> 'c')::integer;
  fin := j.actual + 1 >= d.n;
  update public.duelo_jugadas x set
    actual = x.actual + 1,
    visto = now(),
    respuestas = x.respuestas || jsonb_build_array(jsonb_build_object('op', op, 'ok', ok, 'ms', t)),
    aciertos = x.aciertos + case when ok then 1 else 0 end,
    ms = x.ms + t,
    terminado = case when fin then now() end
  where x.duelo = d.id and x.usuario = uid
  returning * into j;
  return jsonb_build_object('ok', ok, 'correcta', (q ->> 'c')::integer, 'op', op, 'ms', t,
                            'actual', j.actual, 'aciertos', j.aciertos, 'terminado', fin);
end $$;
revoke all on function public.responder_duelo(text, integer, integer) from public, anon;
grant execute on function public.responder_duelo(text, integer, integer) to authenticated;

-- Mis últimos 20 duelos (creados por mí o aceptados)
create or replace function public.mis_duelos()
returns table (codigo text, titulo text, rival text, creado timestamptz, estado text,
               mis_aciertos integer, sus_aciertos integer, n integer)
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  d public.duelos;
  r record;
  yo public.duelo_jugadas;
  otro public.duelo_jugadas;
  otro_id uuid;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  for d in select * from public.duelos x where x.creador = uid or x.rival = uid order by x.creado desc limit 20 loop
    otro_id := case when d.creador = uid then d.rival else d.creador end;
    yo := null; otro := null;
    select * into yo from public.duelo_jugadas j where j.duelo = d.id and j.usuario = uid;
    if otro_id is not null then select * into otro from public.duelo_jugadas j where j.duelo = d.id and j.usuario = otro_id; end if;
    select * into r from public.duelo_resultado(d);
    codigo := d.codigo; titulo := d.titulo; creado := d.creado; n := d.n;
    rival := case when otro_id is not null then public.duelo_apodo(otro_id) end;
    estado := case
      when r.listo and r.ganador = uid then 'ganaste'
      when r.listo and r.empate then 'empate'
      when r.listo and r.ganador is not null then 'perdiste'
      when r.listo then 'sin-resultado'
      when yo.duelo is null then 'te-toca'
      when yo.terminado is null then 'a-medias'
      else 'esperando' end;
    mis_aciertos := yo.aciertos;
    sus_aciertos := case when yo.terminado is not null or r.listo then otro.aciertos end;
    return next;
  end loop;
end $$;
revoke all on function public.mis_duelos() from public, anon;
grant execute on function public.mis_duelos() to authenticated;

-- Top 10 de la semana por duelos ganados (desde el lunes, hora de Lima).
-- Si el alumno que consulta no está en el top, se agrega al final con su puesto.
create or replace function public.ranking_duelos()
returns table (puesto integer, apodo text, puntaje numeric, yo boolean)
language sql stable security definer set search_path = '' as $$
  with semana as (
    select (date_trunc('week', now() at time zone 'America/Lima')) at time zone 'America/Lima' as desde
  ), ganados as (
    select (public.duelo_resultado(d)).ganador as usuario, d.creado
    from public.duelos d, semana
    where d.creado >= semana.desde and d.rival is not null
  ), cuenta as (
    select g.usuario, count(*) as ganados, min(g.creado) as primero
    from ganados g where g.usuario is not null group by g.usuario
  ), orden as (
    select c.usuario, c.ganados, (row_number() over (order by c.ganados desc, c.primero))::integer as puesto
    from cuenta c
  )
  select o.puesto, public.duelo_apodo(o.usuario), o.ganados::numeric, o.usuario = auth.uid()
  from orden o
  where o.puesto <= 10 or o.usuario = auth.uid()
  order by o.puesto;
$$;
revoke all on function public.ranking_duelos() from public, anon;
grant execute on function public.ranking_duelos() to authenticated;
