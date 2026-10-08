-- =========================================================
-- Modo Cachimbo · Duelos (de 2 a 4 jugadores)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema
-- (también encima de la versión anterior, la de 1 vs 1).
-- Necesita haber corrido antes supabase/01-perfiles.sql.
--
-- Cómo funciona:
--   · Un alumno crea un duelo para 2, 3 o 4 jugadores y comparte el
--     código. Los demás entran a la sala de espera.
--   · El duelo empieza para todos a la vez (cuenta 3, 2, 1): cuando
--     el creador toca Iniciar (con al menos 2 en la sala) o, si marcó
--     "inicio automático", apenas se llena la sala.
--   · Si nadie lo inicia en 5 minutos, la sala se cierra sola.
--   · Todos responden las mismas preguntas, con 60 segundos cada
--     una. El tiempo lo mide el servidor.
--   · El resultado sale cuando todos terminaron. Quien abandona se
--     queda con lo que respondió; lo que le faltó cuenta como no
--     respondido.
--   · Puestos: más aciertos primero; si empatan, el más rápido.
--     Solo el 1.º puesto suma al ranking (si dos empatan en el
--     1.º, nadie suma).
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
  rival       uuid references auth.users (id) on delete set null,   -- solo lo usaban los duelos 1 vs 1 antiguos
  titulo      text not null check (char_length(titulo) between 1 and 80),
  curso       text not null check (char_length(curso) between 1 and 40),
  fuente      text not null check (fuente in ('mezcla', 'libro', 'fijas', 'seminarios', 'banqueo')),
  preguntas   jsonb not null,               -- [{ref:"curso/libros/data/2027-I.json#01#3", c:2, k:5}, …]
  n           integer not null check (n between 3 and 20),
  revancha_de uuid references public.duelos (id) on delete set null,
  creado      timestamptz not null default now(),
  vence       timestamptz not null default now() + interval '5 minutes'   -- hasta cuándo se puede iniciar
);
-- Columnas nuevas (los duelos que ya existían quedan como 1 vs 1)
alter table public.duelos add column if not exists max_jug integer not null default 2 check (max_jug between 2 and 4);
alter table public.duelos alter column max_jug set default 4;
alter table public.duelos add column if not exists ciclo text check (ciclo is null or ciclo ~ '^[0-9]{4}-(I|II|III)$');
alter table public.duelos add column if not exists tema text check (tema is null or char_length(tema) between 1 and 80);
alter table public.duelos alter column vence set default now() + interval '5 minutes';
-- hasta 20 preguntas (antes eran 15)
alter table public.duelos drop constraint if exists duelos_n_check;
alter table public.duelos add constraint duelos_n_check check (n between 3 and 20);
alter table public.duelos add column if not exists en_sala boolean not null default false;  -- false = duelos antiguos (cada uno jugaba cuando quería)
alter table public.duelos add column if not exists auto boolean not null default false;     -- empieza solo cuando se llena la sala
alter table public.duelos add column if not exists empieza timestamptz;                     -- cuándo aparece la 1.ª pregunta para todos
create index if not exists duelos_creador on public.duelos (creador, creado desc);
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

-- Tabla de posiciones del duelo. ms = tiempo total, contando 60 s por
-- cada pregunta que le faltó. plazo = ya no le alcanza el tiempo
-- (65 s por pregunta desde que empezó), así que cuenta como terminado.
-- En la sala de espera (aún no empieza) nadie tiene plazo.
create or replace function public.duelo_tabla(d public.duelos)
returns table (usuario uuid, aciertos integer, ms bigint, actual integer, terminado boolean,
               plazo boolean, inicio timestamptz, puesto integer)
language sql stable security definer set search_path = '' as $$
  select j.usuario, j.aciertos, j.ms + greatest(d.n - j.actual, 0)::bigint * 60000, j.actual,
         j.terminado is not null,
         j.terminado is null and (d.empieza is not null or not d.en_sala)
           and now() >= coalesce(d.empieza, j.inicio) + make_interval(secs => d.n * 65),
         j.inicio,
         (rank() over (order by j.aciertos desc, j.ms + greatest(d.n - j.actual, 0)::bigint * 60000))::integer
  from public.duelo_jugadas j where j.duelo = d.id;
$$;
revoke all on function public.duelo_tabla(public.duelos) from public, anon, authenticated;

-- Resultado: listo = ya es final. ganador = el único 1.º puesto
-- (null si empatan en el 1.º o si jugó uno solo).
drop function if exists public.duelo_resultado(public.duelos);
create or replace function public.duelo_resultado(d public.duelos, out ganador uuid, out empate boolean, out listo boolean, out jugadores integer)
language plpgsql stable security definer set search_path = '' as $$
declare
  pend integer;
  primeros integer;
begin
  ganador := null; empate := false;
  select count(*), count(*) filter (where not t.terminado and not t.plazo), count(*) filter (where t.puesto = 1)
    into jugadores, pend, primeros
  from public.duelo_tabla(d) t;
  if d.en_sala and d.empieza is null then
    listo := now() >= d.vence; jugadores := 0;   -- nadie lo inició: se canceló
    return;
  end if;
  listo := pend = 0 and (d.en_sala or now() >= d.vence or jugadores >= d.max_jug);
  if listo and jugadores >= 2 then
    if primeros = 1 then select t.usuario into ganador from public.duelo_tabla(d) t where t.puesto = 1;
    else empate := true;
    end if;
  end if;
end $$;
revoke all on function public.duelo_resultado(public.duelos) from public, anon, authenticated;

-- Crea un duelo y mete al creador en la sala.
-- p = { titulo, curso, fuente, ciclo?, tema?, jugadores (2..4), auto, revancha_de?, preguntas:[{ref, c, k}] }
-- Devuelve el código (6 letras/números) para el enlace duelo.html?d=CODIGO
create or replace function public.crear_duelo(p jsonb)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  cod text;
  letras constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  q jsonb;
  lista jsonb := '[]';
  previo uuid;
  nuevo uuid;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if (select count(*) from public.duelos x where x.creador = uid and x.creado > now() - interval '1 day') >= 40 then
    raise exception 'Ya creaste muchos duelos hoy. Intenta mañana.';
  end if;
  if jsonb_typeof(p -> 'preguntas') <> 'array' or jsonb_array_length(p -> 'preguntas') not between 3 and 20 then
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
    select x.id into previo from public.duelos x where x.codigo = p ->> 'revancha_de'
      and (x.creador = uid or exists (select 1 from public.duelo_jugadas j where j.duelo = x.id and j.usuario = uid));
  end if;

  loop
    cod := '';
    for i in 1..6 loop cod := cod || substr(letras, 1 + floor(random() * length(letras))::integer, 1); end loop;
    exit when not exists (select 1 from public.duelos x where x.codigo = cod);
  end loop;

  insert into public.duelos (codigo, creador, titulo, curso, fuente, ciclo, tema, preguntas, n, revancha_de, max_jug, auto, en_sala, vence)
  values (cod, uid,
          left(coalesce(nullif(trim(p ->> 'titulo'), ''), 'Duelo'), 80),
          left(coalesce(nullif(trim(p ->> 'curso'), ''), 'todos'), 40),
          case when p ->> 'fuente' in ('mezcla', 'libro', 'fijas', 'seminarios', 'banqueo') then p ->> 'fuente' else 'mezcla' end,
          case when coalesce(p ->> 'ciclo', '') ~ '^[0-9]{4}-(I|II|III)$' then p ->> 'ciclo' end,
          left(nullif(trim(coalesce(p ->> 'tema', '')), ''), 80),
          lista, jsonb_array_length(lista), previo,
          case when p ->> 'jugadores' in ('2', '3', '4') then (p ->> 'jugadores')::integer else 2 end,
          coalesce((p ->> 'auto')::boolean, false), true, now() + interval '5 minutes')
  returning id into nuevo;
  insert into public.duelo_jugadas (duelo, usuario) values (nuevo, uid);
  return cod;
end $$;
revoke all on function public.crear_duelo(jsonb) from public, anon;
grant execute on function public.crear_duelo(jsonb) to authenticated;

-- Estado de un duelo para la página. Los puntajes de los demás y las
-- respuestas correctas solo se muestran a quien ya terminó (o cuando
-- el resultado es final).
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
           'ms', case when mostrar or t.usuario = uid then t.ms end,
           'puesto', case when r.listo then t.puesto end
         ) order by case when r.listo then t.puesto end, t.inicio), '[]')
    into lista
  from public.duelo_tabla(d) t;

  return jsonb_build_object(
    'codigo', d.codigo, 'titulo', d.titulo, 'curso', d.curso, 'fuente', d.fuente,
    'ciclo', d.ciclo, 'tema', d.tema, 'n', d.n, 'max', d.max_jug,
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
            'actual', yo.actual, 'aciertos', yo.aciertos, 'ms', yo.ms,
            'terminado', yo.terminado is not null, 'respuestas', yo.respuestas) end,
    'resultado', case when r.listo then jsonb_build_object(
            'empate', r.empate,
            'gane', r.ganador is not null and r.ganador = uid,
            'ganador', case when r.ganador is not null then public.duelo_apodo(r.ganador) end,
            'puesto', mi_puesto,
            'jugadores', r.jugadores) end,
    'correctas', case when mostrar
            then (select jsonb_agg((e ->> 'c')::integer order by n) from jsonb_array_elements(d.preguntas) with ordinality t(e, n)) end,
    'preguntas', case when mostrar
            then (select jsonb_agg(e ->> 'ref' order by n) from jsonb_array_elements(d.preguntas) with ordinality t(e, n)) end,
    'revancha', rev
  );
end $$;
revoke all on function public.ver_duelo(text) from public, anon;
grant execute on function public.ver_duelo(text) to authenticated;

-- Entra a la sala de espera. Si el duelo es automático y con este
-- jugador se llena, arranca (3 s de cuenta regresiva).
create or replace function public.entrar_duelo(p_codigo text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  d public.duelos;
  hay integer;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into d from public.duelos x where x.codigo = upper(trim(p_codigo)) for update;
  if d.id is null then raise exception 'No existe ese duelo.'; end if;
  if exists (select 1 from public.duelo_jugadas x where x.duelo = d.id and x.usuario = uid) then return public.ver_duelo(p_codigo); end if;
  if not d.en_sala then raise exception 'Este duelo es de la versión anterior; crea uno nuevo.'; end if;
  if d.empieza is not null then raise exception 'Este duelo ya empezó.'; end if;
  if now() >= d.vence then raise exception 'La sala de este duelo ya se cerró.'; end if;
  select count(*) into hay from public.duelo_jugadas x where x.duelo = d.id;
  if hay >= d.max_jug then raise exception 'Este duelo ya está lleno.'; end if;
  insert into public.duelo_jugadas (duelo, usuario) values (d.id, uid);
  if d.auto and hay + 1 >= d.max_jug then perform public.duelo_arrancar(d.id); end if;
  return public.ver_duelo(p_codigo);
end $$;
revoke all on function public.entrar_duelo(text) from public, anon;
grant execute on function public.entrar_duelo(text) to authenticated;

-- Arranca el duelo para todos: la 1.ª pregunta aparece en 4 s (3, 2, 1, ¡ya!)
create or replace function public.duelo_arrancar(p_id uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  t timestamptz := now() + interval '4 seconds';
begin
  update public.duelos x set empieza = t where x.id = p_id and x.empieza is null;
  if found then
    update public.duelo_jugadas j set inicio = t, visto = t where j.duelo = p_id;
  end if;
end $$;
revoke all on function public.duelo_arrancar(uuid) from public, anon, authenticated;

-- El creador inicia el duelo con los que estén en la sala (al menos 2)
create or replace function public.iniciar_duelo(p_codigo text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  d public.duelos;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into d from public.duelos x where x.codigo = upper(trim(p_codigo)) for update;
  if d.id is null then raise exception 'No existe ese duelo.'; end if;
  if d.creador <> uid then raise exception 'Solo quien creó el duelo puede iniciarlo.'; end if;
  if d.empieza is null then
    if now() >= d.vence then raise exception 'La sala de este duelo ya se cerró.'; end if;
    if (select count(*) from public.duelo_jugadas x where x.duelo = d.id) < 2 then
      raise exception 'Espera a que entre al menos un amigo.';
    end if;
    perform public.duelo_arrancar(d.id);
  end if;
  return public.ver_duelo(p_codigo);
end $$;
revoke all on function public.iniciar_duelo(text) from public, anon;
grant execute on function public.iniciar_duelo(text) to authenticated;

-- Preguntas del jugador (sin la correcta), la que le toca y cuántos
-- milisegundos lleva viéndola. Si aún no empieza: { espera: ms, preguntas }
-- (las preguntas sin la correcta, para que se vayan cargando).
create or replace function public.empezar_duelo(p_codigo text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  d public.duelos;
  j public.duelo_jugadas;
  otros integer;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into d from public.duelos x where x.codigo = upper(trim(p_codigo)) for update;
  if d.id is null then raise exception 'No existe ese duelo.'; end if;
  select * into j from public.duelo_jugadas x where x.duelo = d.id and x.usuario = uid;
  if d.en_sala then
    if j.duelo is null then raise exception 'No entraste a este duelo.'; end if;
    if d.empieza is null then raise exception 'El duelo aún no empieza.'; end if;
    if now() < d.empieza then
      return jsonb_build_object('espera', (extract(epoch from (d.empieza - now())) * 1000)::bigint,
        'preguntas', (select jsonb_agg(e ->> 'ref' order by n) from jsonb_array_elements(d.preguntas) with ordinality t(e, n)));
    end if;
  elsif j.duelo is null then
    -- duelos antiguos: entrar = empezar
    if now() >= d.vence then raise exception 'La sala de este duelo ya se cerró.'; end if;
    select count(*) into otros from public.duelo_jugadas x where x.duelo = d.id and x.usuario <> d.creador;
    if uid <> d.creador and otros >= d.max_jug - 1 then raise exception 'Este duelo ya está lleno.'; end if;
    insert into public.duelo_jugadas (duelo, usuario) values (d.id, uid) returning * into j;
  end if;
  return jsonb_build_object(
    'preguntas', (select jsonb_agg(e ->> 'ref' order by n) from jsonb_array_elements(d.preguntas) with ordinality t(e, n)),
    'actual', j.actual, 'aciertos', j.aciertos, 'respuestas', j.respuestas,
    'terminado', j.terminado is not null,
    'lleva', greatest((extract(epoch from (now() - j.visto)) * 1000)::bigint, 0)
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
  if d.en_sala and (d.empieza is null or now() < d.empieza) then raise exception 'El duelo aún no empieza.'; end if;
  if p_i is distinct from j.actual then
    -- respuesta repetida o vieja (p. ej. doble clic): se devuelve el estado sin cambiar nada
    return jsonb_build_object('repetida', true, 'actual', j.actual, 'aciertos', j.aciertos);
  end if;
  q := d.preguntas -> j.actual;
  t := least((extract(epoch from (now() - j.visto)) * 1000)::bigint, 600000)::integer;
  -- fuera de tiempo: la pregunta pasó los 63 s, o ya se acabó su plazo total
  if t > 63000 or now() >= coalesce(d.empieza, j.inicio) + make_interval(secs => d.n * 65) or op is null or op < 0 or op >= (q ->> 'k')::integer then
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

-- Mis últimos 20 duelos (creados por mí o en los que jugué).
-- rival = los nombres de los demás jugadores.
drop function if exists public.mis_duelos();
create or replace function public.mis_duelos()
returns table (codigo text, titulo text, rival text, creado timestamptz, estado text,
               mis_aciertos integer, n integer, puesto integer, jugadores integer)
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  d public.duelos;
  r record;
  yo public.duelo_jugadas;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  for d in select * from public.duelos x
           where x.creador = uid or exists (select 1 from public.duelo_jugadas j where j.duelo = x.id and j.usuario = uid)
           order by x.creado desc limit 20 loop
    yo := null;
    select * into yo from public.duelo_jugadas j where j.duelo = d.id and j.usuario = uid;
    select * into r from public.duelo_resultado(d);
    codigo := d.codigo; titulo := d.titulo; creado := d.creado; n := d.n; jugadores := r.jugadores;
    select string_agg(public.duelo_apodo(t.usuario), ', ' order by t.inicio) into rival
      from public.duelo_tabla(d) t where t.usuario <> uid;
    puesto := null;
    if r.listo then select t.puesto into puesto from public.duelo_tabla(d) t where t.usuario = uid; end if;
    estado := case
      when d.en_sala and d.empieza is null and r.listo then 'cancelado'
      when d.en_sala and d.empieza is null then 'en-sala'
      when r.listo and yo.duelo is null then 'no-jugaste'
      when r.listo and r.ganador = uid then 'ganaste'
      when r.listo and r.empate and puesto = 1 then 'empate'
      when r.listo and r.jugadores >= 2 then 'perdiste'
      when r.listo then 'sin-resultado'
      when yo.duelo is null and now() < d.vence then 'te-toca'
      when yo.duelo is null then 'no-jugaste'
      when yo.terminado is null then 'a-medias'
      else 'esperando' end;
    mis_aciertos := yo.aciertos;
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
    where d.creado >= semana.desde
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
