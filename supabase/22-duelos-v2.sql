-- =========================================================
-- Modo Cachimbo · Duelos v2 (tiempo a elegir, comodines,
-- "Todo o nada", reacciones, medallas y XP por puesto)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita haber corrido antes supabase/10-duelos.sql y
-- supabase/16-corazones.sql.
--
-- Qué cambia:
--   · Tiempo por pregunta a elegir: de 15 s a 2 min (antes 60 s fijo).
--   · De 3 a 30 preguntas (antes hasta 20).
--   · Puntos: 1 por acierto; el comodín Doble da 2; la última pregunta
--     ("Todo o nada") vale 3. Gana quien tiene más puntos; si empatan,
--     el más rápido.
--   · Comodines: el duelo reparte al azar los mismos a todos (2 si son
--     hasta 10 preguntas, 3 hasta 20, 4 si son más). Cada uno se usa
--     una vez, y solo uno por pregunta:
--       mitad  (50/50)  quita 2 alternativas incorrectas
--       hielo  (Congelar) tu reloj se detiene 10 s
--       doble  (Doble)  si aciertas vale 2 (no en la última)
--       escudo (Escudo) si fallas, eliges otra vez
--       robar  (Robar tiempo) les quita 5 s a los demás
--       espia  (Espía)  ves cuántos ya respondieron y si acertaron
--   · Reacciones con caritas durante el duelo (1 cada 2 s).
--   · Medallas al final: Rayo, Racha, Remontada y Francotirador.
--   · XP por puesto (+40 / +20 / +10), una sola vez por duelo, con el
--     mismo tope diario de 4000 XP.
-- =========================================================

-- ---------- Columnas nuevas ----------
alter table public.duelos add column if not exists seg integer not null default 60;
alter table public.duelos drop constraint if exists duelos_seg_check;
alter table public.duelos add constraint duelos_seg_check check (seg between 15 and 120);
alter table public.duelos add column if not exists comodines jsonb not null default '[]';   -- ["mitad","doble",…]
alter table public.duelos add column if not exists final_x3 boolean not null default false;  -- la última vale 3
alter table public.duelos drop constraint if exists duelos_n_check;
alter table public.duelos add constraint duelos_n_check check (n between 3 and 30);

alter table public.duelo_jugadas add column if not exists puntos integer;
update public.duelo_jugadas set puntos = aciertos where puntos is null;
alter table public.duelo_jugadas alter column puntos set default 0;
alter table public.duelo_jugadas alter column puntos set not null;
alter table public.duelo_jugadas add column if not exists usados jsonb not null default '[]';  -- [{k:"mitad", i:3, quita:[0,4]}, …]
alter table public.duelo_jugadas add column if not exists activo text check (activo is null or activo in ('doble', 'escudo'));
alter table public.duelo_jugadas add column if not exists entro timestamptz default now();   -- orden de llegada (colores)
alter table public.duelo_jugadas add column if not exists xp_premio integer;                  -- XP por puesto ya cobrado

-- Lo que pasa en vivo: robos de tiempo, comodines usados y reacciones
create table if not exists public.duelo_eventos (
  id      bigserial primary key,
  duelo   uuid not null references public.duelos (id) on delete cascade,
  usuario uuid not null references auth.users (id) on delete cascade,
  tipo    text not null check (tipo in ('robar', 'comodin', 'reac')),
  dato    text not null default '' check (char_length(dato) <= 20),
  creado  timestamptz not null default now()
);
create index if not exists duelo_eventos_duelo on public.duelo_eventos (duelo, id);
create index if not exists duelo_eventos_creado on public.duelo_eventos (creado);
alter table public.duelo_eventos enable row level security;
revoke all on public.duelo_eventos from anon, authenticated;

-- ---------- Ayudas internas ----------
-- Plazo total del duelo: (tiempo + 5 s) por pregunta, más 20 s por el comodín Congelar
create or replace function public.duelo_plazo(d public.duelos)
returns interval language sql immutable set search_path = '' as $$
  select make_interval(secs => d.n * (d.seg + 5) + 20);
$$;
revoke all on function public.duelo_plazo(public.duelos) from public, anon, authenticated;

-- Aciertos seguidos al final de sus respuestas
create or replace function public.duelo_racha(r jsonb)
returns integer language plpgsql immutable set search_path = '' as $$
declare k integer := 0; i integer;
begin
  for i in reverse jsonb_array_length(r) - 1 .. 0 loop
    exit when not coalesce((r -> i ->> 'ok')::boolean, false);
    k := k + 1;
  end loop;
  return k;
end $$;
revoke all on function public.duelo_racha(jsonb) from public, anon, authenticated;

-- ---------- Tabla de posiciones (ahora por puntos) ----------
drop function if exists public.duelo_tabla(public.duelos);
create or replace function public.duelo_tabla(d public.duelos)
returns table (usuario uuid, aciertos integer, ms bigint, actual integer, terminado boolean,
               plazo boolean, inicio timestamptz, puesto integer, puntos integer)
language sql stable security definer set search_path = '' as $$
  select j.usuario, j.aciertos, j.ms + greatest(d.n - j.actual, 0)::bigint * d.seg * 1000, j.actual,
         j.terminado is not null,
         j.terminado is null and (d.empieza is not null or not d.en_sala)
           and now() >= coalesce(d.empieza, j.inicio) + public.duelo_plazo(d),
         coalesce(j.entro, j.inicio),
         (rank() over (order by j.puntos desc, j.ms + greatest(d.n - j.actual, 0)::bigint * d.seg * 1000))::integer,
         j.puntos
  from public.duelo_jugadas j where j.duelo = d.id;
$$;
revoke all on function public.duelo_tabla(public.duelos) from public, anon, authenticated;

-- ---------- Crear ----------
-- p = { titulo, curso, fuente, ciclo?, tema?, jugadores (2..4), auto, revancha_de?,
--       seg (15..120), comodines (true/false), final (true/false), preguntas:[{ref, c, k}] }
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
  cant integer;
  segs integer := 60;
  cmd jsonb := '[]';
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if (select count(*) from public.duelos x where x.creador = uid and x.creado > now() - interval '1 day') >= 40 then
    raise exception 'Ya creaste muchos duelos hoy. Intenta mañana.';
  end if;
  if jsonb_typeof(p -> 'preguntas') <> 'array' or jsonb_array_length(p -> 'preguntas') not between 3 and 30 then
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
  cant := jsonb_array_length(lista);
  if coalesce(p ->> 'seg', '') ~ '^[0-9]{1,3}$' then segs := least(greatest((p ->> 'seg')::integer, 15), 120); end if;
  if coalesce(p ->> 'comodines', '') = 'true' then
    select coalesce(jsonb_agg(k), '[]') into cmd from (
      select k from unnest(array['mitad', 'hielo', 'doble', 'escudo', 'robar', 'espia']) k
      order by random() limit case when cant <= 10 then 2 when cant <= 20 then 3 else 4 end) x;
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
                             seg, comodines, final_x3)
  values (cod, uid,
          left(coalesce(nullif(trim(p ->> 'titulo'), ''), 'Duelo'), 80),
          left(coalesce(nullif(trim(p ->> 'curso'), ''), 'todos'), 40),
          case when p ->> 'fuente' in ('mezcla', 'libro', 'fijas', 'seminarios', 'banqueo') then p ->> 'fuente' else 'mezcla' end,
          case when coalesce(p ->> 'ciclo', '') ~ '^[0-9]{4}-(I|II|III)$' then p ->> 'ciclo' end,
          left(nullif(trim(coalesce(p ->> 'tema', '')), ''), 80),
          lista, cant, previo,
          case when p ->> 'jugadores' in ('2', '3', '4') then (p ->> 'jugadores')::integer else 2 end,
          coalesce((p ->> 'auto')::boolean, false), true, now() + interval '5 minutes',
          segs, cmd, coalesce(p ->> 'final', '') = 'true')
  returning id into nuevo;
  insert into public.duelo_jugadas (duelo, usuario) values (nuevo, uid);
  delete from public.duelo_eventos e where e.creado < now() - interval '1 day';
  return cod;
end $$;
revoke all on function public.crear_duelo(jsonb) from public, anon;
grant execute on function public.crear_duelo(jsonb) to authenticated;

-- ---------- Medallas (solo cuando el resultado es final) ----------
-- Rayo: menos tiempo promedio en sus aciertos. Racha: más aciertos seguidos (3 o más).
-- Remontada: el 1.º puesto que en la 2.ª mitad del duelo llegó a estar más abajo.
-- Francotirador: respondió todo sin fallar.
create or replace function public.duelo_medallas(d public.duelos)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  rayo jsonb; racha jsonb; remonta jsonb; franco jsonb;
  gan uuid; peor integer := 1; i integer; pos integer;
begin
  select jsonb_build_object('quien', public.duelo_apodo(x.usuario), 'dato', round(x.prom / 1000.0, 1))
    into rayo
  from (select j.usuario, avg((e ->> 'ms')::numeric) prom
        from public.duelo_jugadas j, jsonb_array_elements(j.respuestas) e
        where j.duelo = d.id and (e ->> 'ok')::boolean group by j.usuario) x
  order by x.prom limit 1;

  select jsonb_build_object('quien', public.duelo_apodo(x.usuario), 'dato', x.mejor)
    into racha
  from (select j.usuario, max(g.largo) mejor from public.duelo_jugadas j,
          lateral (select count(*) largo from (
            select (e ->> 'ok')::boolean ok, n - row_number() over (partition by (e ->> 'ok')::boolean order by n) grp
            from jsonb_array_elements(j.respuestas) with ordinality t(e, n)) s
            where s.ok group by s.grp) g
        where j.duelo = d.id group by j.usuario) x
  where x.mejor >= 3 order by x.mejor desc limit 1;

  select coalesce(jsonb_agg(public.duelo_apodo(j.usuario)), '[]') into franco
  from public.duelo_jugadas j
  where j.duelo = d.id and jsonb_array_length(j.respuestas) = d.n
    and not exists (select 1 from jsonb_array_elements(j.respuestas) e where not (e ->> 'ok')::boolean);

  select t.usuario into gan from public.duelo_tabla(d) t where t.puesto = 1
    and (select count(*) from public.duelo_tabla(d) u where u.puesto = 1) = 1;
  if gan is not null and (select count(*) from public.duelo_jugadas j where j.duelo = d.id) >= 2 then
    for i in greatest(ceil(d.n / 2.0)::integer, 1) .. d.n - 1 loop
      -- puesto del ganador sumando los puntos de las primeras i preguntas
      select 1 + count(*) into pos from public.duelo_jugadas j
      where j.duelo = d.id and j.usuario <> gan
        and (select coalesce(sum((e ->> 'p')::integer), 0) from jsonb_array_elements(j.respuestas) with ordinality t(e, n) where n <= i)
          > (select coalesce(sum((e ->> 'p')::integer), 0) from public.duelo_jugadas g, jsonb_array_elements(g.respuestas) with ordinality t(e, n)
             where g.duelo = d.id and g.usuario = gan and n <= i);
      peor := greatest(peor, pos);
    end loop;
    if peor > 1 then remonta := jsonb_build_object('quien', public.duelo_apodo(gan), 'dato', peor); end if;
  end if;

  return jsonb_build_object('rayo', rayo, 'racha', racha, 'remontada', remonta,
                            'francotirador', case when jsonb_array_length(franco) > 0 then franco end);
end $$;
revoke all on function public.duelo_medallas(public.duelos) from public, anon, authenticated;

-- ---------- Estado del duelo ----------
-- Los puntos de todos se ven en vivo (marcador). Las correctas solo al terminar.
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
           'color', t.color
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

-- Entrar a la sala ahora guarda el orden de llegada
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
  insert into public.duelo_jugadas (duelo, usuario, entro) values (d.id, uid, now());
  if d.auto and hay + 1 >= d.max_jug then perform public.duelo_arrancar(d.id); end if;
  return public.ver_duelo(p_codigo);
end $$;
revoke all on function public.entrar_duelo(text) from public, anon;
grant execute on function public.entrar_duelo(text) to authenticated;

-- El orden de llegada (colores) ya no depende de "inicio"
create or replace function public.duelo_arrancar(p_id uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  t timestamptz := now() + interval '4 seconds';
begin
  update public.duelos x set empieza = t where x.id = p_id and x.empieza is null;
  if found then
    update public.duelo_jugadas j set entro = coalesce(j.entro, j.inicio), inicio = t, visto = t where j.duelo = p_id;
  end if;
end $$;
revoke all on function public.duelo_arrancar(uuid) from public, anon, authenticated;

-- duelo_tabla ordena por "inicio" = orden de llegada (entro)
-- ---------- Empezar / volver a entrar ----------
create or replace function public.empezar_duelo(p_codigo text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  d public.duelos;
  j public.duelo_jugadas;
  otros integer;
  refs jsonb;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into d from public.duelos x where x.codigo = upper(trim(p_codigo)) for update;
  if d.id is null then raise exception 'No existe ese duelo.'; end if;
  select * into j from public.duelo_jugadas x where x.duelo = d.id and x.usuario = uid;
  refs := (select jsonb_agg(e ->> 'ref' order by n) from jsonb_array_elements(d.preguntas) with ordinality t(e, n));
  if d.en_sala then
    if j.duelo is null then raise exception 'No entraste a este duelo.'; end if;
    if d.empieza is null then raise exception 'El duelo aún no empieza.'; end if;
    if now() < d.empieza then
      return jsonb_build_object('espera', (extract(epoch from (d.empieza - now())) * 1000)::bigint,
        'preguntas', refs, 'seg', d.seg, 'comodines', d.comodines, 'final', d.final_x3);
    end if;
  elsif j.duelo is null then
    if now() >= d.vence then raise exception 'La sala de este duelo ya se cerró.'; end if;
    select count(*) into otros from public.duelo_jugadas x where x.duelo = d.id and x.usuario <> d.creador;
    if uid <> d.creador and otros >= d.max_jug - 1 then raise exception 'Este duelo ya está lleno.'; end if;
    insert into public.duelo_jugadas (duelo, usuario) values (d.id, uid) returning * into j;
  end if;
  return jsonb_build_object(
    'preguntas', refs, 'seg', d.seg, 'comodines', d.comodines, 'final', d.final_x3,
    'actual', j.actual, 'aciertos', j.aciertos, 'puntos', j.puntos, 'respuestas', j.respuestas,
    'usados', j.usados, 'activo', j.activo,
    'terminado', j.terminado is not null,
    -- ms que lleva viendo la pregunta (negativo si Congelar le dio tiempo extra)
    'lleva', (extract(epoch from (now() - j.visto)) * 1000)::bigint
  );
end $$;
revoke all on function public.empezar_duelo(text) from public, anon;
grant execute on function public.empezar_duelo(text) to authenticated;

-- ---------- Responder ----------
-- p_op = -1 si se acabó el tiempo. Con Escudo activo, si falla, no avanza
-- y devuelve { reintenta: true, op } para que elija otra vez.
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
  pts integer;
  lim integer;
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
  q := d.preguntas -> j.actual;
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
  update public.duelo_jugadas x set
    actual = x.actual + 1,
    visto = now() + interval '1500 milliseconds',   -- la pausa entre preguntas no cuenta
    respuestas = x.respuestas || jsonb_build_array(jsonb_build_object('op', op, 'ok', ok, 'ms', t, 'p', pts)),
    aciertos = x.aciertos + case when ok then 1 else 0 end,
    puntos = x.puntos + pts,
    activo = null,
    ms = x.ms + t,
    terminado = case when fin then now() end
  where x.duelo = d.id and x.usuario = uid
  returning * into j;
  return jsonb_build_object('ok', ok, 'correcta', (q ->> 'c')::integer, 'op', op, 'ms', t, 'p', pts,
                            'actual', j.actual, 'aciertos', j.aciertos, 'puntos', j.puntos, 'terminado', fin);
end $$;
revoke all on function public.responder_duelo(text, integer, integer) from public, anon;
grant execute on function public.responder_duelo(text, integer, integer) to authenticated;

-- ---------- Comodines ----------
-- Usa el comodín p_k en la pregunta p_i. Devuelve lo que hace falta mostrar:
--   mitad → { quita:[a,b] } (alternativas en su orden original)
--   hielo → { lleva } ;  espia → { espia:[…] } ;  robar → { robados }
create or replace function public.usar_comodin(p_codigo text, p_k text, p_i integer)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  d public.duelos;
  j public.duelo_jugadas;
  q jsonb;
  quita jsonb;
  robados integer := 0;
  extra jsonb := '{}';
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into d from public.duelos x where x.codigo = upper(trim(p_codigo));
  if d.id is null then raise exception 'No existe ese duelo.'; end if;
  select * into j from public.duelo_jugadas x where x.duelo = d.id and x.usuario = uid for update;
  if j.duelo is null or j.terminado is not null then raise exception 'No estás jugando este duelo.'; end if;
  if d.empieza is null or now() < d.empieza then raise exception 'El duelo aún no empieza.'; end if;
  if p_i is distinct from j.actual then raise exception 'Esa pregunta ya pasó.'; end if;
  if not d.comodines ? p_k then raise exception 'Ese comodín no está en este duelo.'; end if;
  if exists (select 1 from jsonb_array_elements(j.usados) e where e ->> 'k' = p_k) then raise exception 'Ya usaste ese comodín.'; end if;
  if exists (select 1 from jsonb_array_elements(j.usados) e where (e ->> 'i')::integer = j.actual) then
    raise exception 'Solo un comodín por pregunta.';
  end if;
  if now() > j.visto + make_interval(secs => d.seg) then raise exception 'Se acabó el tiempo de esta pregunta.'; end if;
  if p_k = 'doble' and d.final_x3 and j.actual = d.n - 1 then raise exception 'La última ya vale 3.'; end if;
  q := d.preguntas -> j.actual;

  if p_k = 'mitad' then
    select jsonb_agg(o) into quita from (
      select o from generate_series(0, (q ->> 'k')::integer - 1) o
      where o <> (q ->> 'c')::integer order by random() limit least(2, (q ->> 'k')::integer - 2)) x;
    extra := jsonb_build_object('quita', coalesce(quita, '[]'));
  elsif p_k = 'hielo' then
    update public.duelo_jugadas x set visto = x.visto + interval '10 seconds' where x.duelo = d.id and x.usuario = uid;
    extra := jsonb_build_object('lleva', (extract(epoch from (now() - j.visto - interval '10 seconds')) * 1000)::bigint);
  elsif p_k in ('doble', 'escudo') then
    update public.duelo_jugadas x set activo = p_k where x.duelo = d.id and x.usuario = uid;
  elsif p_k = 'robar' then
    update public.duelo_jugadas x set visto = x.visto - interval '5 seconds'
    where x.duelo = d.id and x.usuario <> uid and x.terminado is null and x.actual < d.n;
    get diagnostics robados = row_count;
    insert into public.duelo_eventos (duelo, usuario, tipo, dato) values (d.id, uid, 'robar', '5');
    extra := jsonb_build_object('robados', robados);
  elsif p_k <> 'espia' then
    raise exception 'Comodín no válido.';
  end if;

  update public.duelo_jugadas x set usados = x.usados || jsonb_build_array(
      jsonb_build_object('k', p_k, 'i', j.actual) || case when quita is not null then jsonb_build_object('quita', quita) else '{}' end)
  where x.duelo = d.id and x.usuario = uid;
  if p_k <> 'robar' then
    insert into public.duelo_eventos (duelo, usuario, tipo, dato) values (d.id, uid, 'comodin', p_k);
  end if;
  return jsonb_build_object('ok', true, 'k', p_k) || extra || case when p_k = 'espia' then jsonb_build_object('espia', public.duelo_espia(d, uid, j.actual)) else '{}' end;
end $$;
revoke all on function public.usar_comodin(text, text, integer) from public, anon;
grant execute on function public.usar_comodin(text, text, integer) to authenticated;

-- Espía: cómo van los demás en la pregunta i (si ya respondieron y si acertaron; no qué eligieron)
create or replace function public.duelo_espia(d public.duelos, uid uuid, i integer)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'apodo', public.duelo_apodo(j.usuario),
           'estado', case when j.actual > i then case when (j.respuestas -> i ->> 'ok')::boolean then 'acerto' else 'fallo' end
                          else 'pensando' end) order by coalesce(j.entro, j.inicio), j.usuario), '[]')
  from public.duelo_jugadas j where j.duelo = d.id and j.usuario <> uid;
$$;
revoke all on function public.duelo_espia(public.duelos, uuid, integer) from public, anon, authenticated;

-- ---------- Reacciones ----------
create or replace function public.reaccionar_duelo(p_codigo text, p_cara text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  d public.duelos;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if p_cara not in ('risa', 'llanto', 'enojo', 'susto', 'genial', 'aplauso') then raise exception 'Reacción no válida.'; end if;
  select * into d from public.duelos x where x.codigo = upper(trim(p_codigo));
  if d.id is null or not exists (select 1 from public.duelo_jugadas j where j.duelo = d.id and j.usuario = uid) then
    raise exception 'No estás en este duelo.';
  end if;
  if exists (select 1 from public.duelo_eventos e where e.duelo = d.id and e.usuario = uid and e.tipo = 'reac'
             and e.creado > now() - interval '2 seconds') then
    return jsonb_build_object('ok', false, 'espera', true);
  end if;
  insert into public.duelo_eventos (duelo, usuario, tipo, dato) values (d.id, uid, 'reac', p_cara);
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.reaccionar_duelo(text, text) from public, anon;
grant execute on function public.reaccionar_duelo(text, text) to authenticated;

-- ---------- En vivo (cada 2 s mientras se juega) ----------
-- Marcador de todos + eventos nuevos (desde p_desde) + mi reloj + espía activo
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
        'terminado', j.terminado is not null or now() >= coalesce(d.empieza, j.inicio) + public.duelo_plazo(d)
      ) order by coalesce(j.entro, j.inicio), j.usuario), '[]') from public.duelo_jugadas j where j.duelo = d.id),
    'eventos', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', e.id, 'tipo', e.tipo, 'dato', e.dato, 'yo', e.usuario = uid,
        'apodo', public.duelo_apodo(e.usuario)) order by e.id), '[]')
      from (select * from public.duelo_eventos e where e.duelo = d.id and e.id > coalesce(p_desde, 0) order by e.id limit 30) e),
    'ultimo', (select coalesce(max(e.id), 0) from public.duelo_eventos e where e.duelo = d.id),
    'actual', yo.actual,
    'lleva', (extract(epoch from (now() - yo.visto)) * 1000)::bigint,
    'espia', case when exists (select 1 from jsonb_array_elements(yo.usados) e where e ->> 'k' = 'espia' and (e ->> 'i')::integer = yo.actual)
                  then public.duelo_espia(d, uid, yo.actual) end
  );
end $$;
revoke all on function public.duelo_vivo(text, bigint) from public, anon;
grant execute on function public.duelo_vivo(text, bigint) to authenticated;

-- ---------- XP por puesto (+40 / +20 / +10), una vez ----------
create or replace function public.premio_duelo(p_codigo text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  d public.duelos;
  yo public.duelo_jugadas;
  r record;
  pos integer;
  xp integer;
  hoy integer;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into d from public.duelos x where x.codigo = upper(trim(p_codigo));
  if d.id is null then raise exception 'No existe ese duelo.'; end if;
  select * into yo from public.duelo_jugadas j where j.duelo = d.id and j.usuario = uid for update;
  if yo.duelo is null then raise exception 'No jugaste este duelo.'; end if;
  if yo.xp_premio is not null then return jsonb_build_object('xp', yo.xp_premio, 'ya', true); end if;
  select * into r from public.duelo_resultado(d);
  if not r.listo then return jsonb_build_object('xp', 0, 'listo', false); end if;
  select t.puesto into pos from public.duelo_tabla(d) t where t.usuario = uid;
  xp := case when r.jugadores < 2 or yo.actual = 0 then 0 when pos = 1 then 40 when pos = 2 then 20 when pos = 3 then 10 else 0 end;
  if xp > 0 then
    perform public.cz_estado(uid);
    select c.xp_hoy into hoy from public.corazones c where c.usuario = uid for update;
    xp := least(xp, greatest(4000 - coalesce(hoy, 0), 0));
  end if;
  if xp > 0 then
    update public.corazones c set xp_hoy = c.xp_hoy + xp, xp_saldo = c.xp_saldo + xp, actualizado = now() where c.usuario = uid;
    insert into public.xp_semana (usuario, semana, xp) values (uid, public.cz_lunes(), xp)
    on conflict (usuario, semana) do update set xp = public.xp_semana.xp + excluded.xp;
  end if;
  update public.duelo_jugadas j set xp_premio = xp where j.duelo = d.id and j.usuario = uid;
  return jsonb_build_object('xp', xp, 'puesto', pos);
end $$;
revoke all on function public.premio_duelo(text) from public, anon;
grant execute on function public.premio_duelo(text) to authenticated;

-- ---------- Mis duelos (ahora con el tiempo por pregunta y mis puntos) ----------
drop function if exists public.mis_duelos();
create or replace function public.mis_duelos()
returns table (codigo text, titulo text, rival text, creado timestamptz, estado text,
               mis_aciertos integer, n integer, puesto integer, jugadores integer, seg integer, mis_puntos integer)
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
    codigo := d.codigo; titulo := d.titulo; creado := d.creado; n := d.n; jugadores := r.jugadores; seg := d.seg;
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
    mis_aciertos := yo.aciertos; mis_puntos := yo.puntos;
    return next;
  end loop;
end $$;
revoke all on function public.mis_duelos() from public, anon;
grant execute on function public.mis_duelos() to authenticated;
