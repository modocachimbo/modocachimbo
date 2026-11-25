-- =========================================================
-- Modo Cachimbo · Sala de clan: 10, 20, 30 o 40 preguntas, 60 s cada una,
-- y cuenta final de 1,5 minutos cuando la mayoría ya terminó
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 135-sala-clan-guerra.sql (correr después del 135).
--
--   · Un duelo puede tener hasta 40 preguntas (antes 30).
--   · Puntos de la Guerra por duelo, según la cantidad de preguntas
--     (máximo 5 000 con 40): gana 125 · empate 75 · pierde 50 por pregunta.
--     10 preguntas: 1 250 · 750 · 500 — 20: 2 500 · 1 500 · 1 000
--     30: 3 750 · 2 250 · 1 500 — 40: 5 000 · 3 000 · 2 000.
--   · En la sala de clan, cuando más de la mitad de los jugadores ya
--     terminó, los demás tienen 1,5 minutos para acabar; después el
--     duelo se cierra solo con lo que hicieron.
-- =========================================================

alter table public.duelos add column if not exists cierre timestamptz;
alter table public.duelos drop constraint if exists duelos_n_check;
alter table public.duelos add constraint duelos_n_check check (n between 3 and 40);
alter table public.guerra_aportes drop constraint if exists guerra_aportes_puntos_check;
alter table public.guerra_aportes add constraint guerra_aportes_puntos_check check (puntos between 0 and 5000);

-- El plazo del duelo termina antes si ya corre la cuenta final
create or replace function public.duelo_plazo(d public.duelos)
returns interval language sql stable set search_path = '' as $$
  select case when d.cierre is not null and d.empieza is not null
              then least(make_interval(secs => d.n * (d.seg + 5) + 20 + case when d.cmd_cant > 0 then d.seg + 10 else 0 end), d.cierre - d.empieza)
              else make_interval(secs => d.n * (d.seg + 5) + 20 + case when d.cmd_cant > 0 then d.seg + 10 else 0 end) end;
$$;
revoke all on function public.duelo_plazo(public.duelos) from public, anon, authenticated;

-- Cuando más de la mitad terminó (sala de clan): 90 s para el resto
create or replace function public.duelo_cuenta_final()
returns trigger language plpgsql security definer set search_path = '' as $$
declare d public.duelos; tot integer; fin integer;
begin
  if new.terminado is null or old.terminado is not null then return new; end if;
  select * into d from public.duelos x where x.id = new.duelo;
  if d.id is null or d.clan_a is null or d.cierre is not null or d.empieza is null then return new; end if;
  select count(*), count(*) filter (where j.terminado is not null) into tot, fin from public.duelo_jugadas j where j.duelo = d.id;
  if tot >= 3 and fin * 2 > tot and fin < tot then
    update public.duelos x set cierre = now() + interval '90 seconds' where x.id = d.id and x.cierre is null;
  end if;
  return new;
end $$;
drop trigger if exists duelo_cuenta_final on public.duelo_jugadas;
create trigger duelo_cuenta_final after update of terminado on public.duelo_jugadas
  for each row execute function public.duelo_cuenta_final();

-- Para la pantalla: cuándo se cierra (null si aún no hay cuenta final)
create or replace function public.duelo_cierre(p_codigo text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('cierre', d.cierre, 'ahora', now(),
    'terminaron', (select count(*) from public.duelo_jugadas j where j.duelo = d.id and j.terminado is not null),
    'total', (select count(*) from public.duelo_jugadas j where j.duelo = d.id))
  from public.duelos d where d.codigo = upper(trim(coalesce(p_codigo, '')));
$$;
revoke all on function public.duelo_cierre(text) from public, anon;
grant execute on function public.duelo_cierre(text) to authenticated;

-- Hasta 40 preguntas por duelo
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
  if jsonb_typeof(p -> 'preguntas') <> 'array' or jsonb_array_length(p -> 'preguntas') not between 3 and 40 then
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
    ncmd := case when cant <= 5 then 2 when cant <= 15 then 3 when cant <= 25 then 4 else 5 end;   -- 40 preguntas → 5
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

-- Puntos de la Guerra proporcionales a las preguntas del duelo
create or replace function public.guerra_duelo_cerrar(p_codigo text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare d public.duelos; info jsonb; dia date; hora time; ganador bigint; uid uuid := auth.uid(); mio jsonb;
begin
  select * into d from public.duelos x where x.codigo = upper(trim(coalesce(p_codigo, '')));
  if d.id is null or d.clan_a is null or d.clan_b is null or d.empieza is null then return null; end if;
  dia := (d.empieza at time zone 'America/Lima')::date; hora := (d.empieza at time zone 'America/Lima')::time;
  if public.guerra_ronda_n(dia) is null or hora < time '08:00' or hora >= time '20:00' then return jsonb_build_object('cuenta', false); end if;
  if not exists (select 1 from public.guerra_duelos g where g.duelo = d.id) then
    info := public.duelo_clan_info(d);
    if not coalesce((info ->> 'listo')::boolean, false) then return jsonb_build_object('cuenta', true, 'listo', false); end if;
    perform pg_advisory_xact_lock(hashtext('guerra_duelo:' || d.id));
    if not exists (select 1 from public.guerra_duelos g where g.duelo = d.id) then
      ganador := (info ->> 'ganador')::bigint;
      insert into public.guerra_aportes (usuario, clan, temporada, ronda, puntos, duelo, resultado)
      select j.usuario, j.clan, public.guerra_temp_de(dia), dia,
             -- Por pregunta: gana 125 · empate 75 · pierde 50 (40 preguntas: 5 000 · 3 000 · 2 000)
             (case when ganador is null then 75 when j.clan = ganador then 125 else 50 end) * least(d.n, 40), d.id,
             case when ganador is null then 'empate' when j.clan = ganador then 'gana' else 'pierde' end
        from public.duelo_jugadas j
       where j.duelo = d.id and j.clan in (d.clan_a, d.clan_b) and coalesce(j.actual, 0) > 0
         -- Hasta 3 duelos por jugador en cada ronda
         and (select count(*) from public.guerra_aportes a where a.usuario = j.usuario and a.ronda = dia) < 3
      on conflict (duelo, usuario) do nothing;
      insert into public.guerra_duelos (duelo) values (d.id) on conflict do nothing;
    end if;
  end if;
  select jsonb_build_object('puntos', a.puntos, 'resultado', a.resultado) into mio from public.guerra_aportes a where a.duelo = d.id and a.usuario = uid;
  return jsonb_build_object('cuenta', true, 'listo', true, 'mio', mio, 'ronda', public.guerra_ronda_n(dia));
end $$;
revoke all on function public.guerra_duelo_cerrar(text) from public, anon;
grant execute on function public.guerra_duelo_cerrar(text) to authenticated;
