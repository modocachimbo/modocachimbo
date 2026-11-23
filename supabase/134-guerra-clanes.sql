-- =========================================================
-- Modo Cachimbo · Guerra de clanes (temporadas y rondas)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 88, 89, 104 (diamantes_dar), 121 y 133.
--
--   · Temporadas de 4 semanas. La Temporada 1 empieza el lunes
--     23/11/2026 y después siguen solas (T2, T3…), sin tocar nada.
--   · Rondas: martes y jueves de 8:00 a 20:00 (hora de Lima).
--     8 rondas por temporada.
--   · En cada ronda cada alumno con clan juega hasta 5 partidas del
--     modo guerra (guerra.html): 10 preguntas al azar del ciclo más
--     nuevo de cada curso, 20 s por pregunta, puntos por acierto,
--     rapidez y combo. Los puntos van para su clan.
--   · Cada acierto también da 5 XP (cuenta para la semana del clan).
--   · Al cerrar cada ronda: un cofre de guerra por alumno según sus
--     puntos (Bronce, Plata, Oro o Leyenda) con diamantes y XP.
--   · Al cerrar la temporada:
--       - Clanes 1.°, 2.° y 3.°: 150, 100 y 50 diamantes para cada
--         miembro que jugó, y una copa en el escudo.
--       - Top 3 individual: 80, 50 y 30 diamantes.
--       - Emblema (pin) «Guerrero T1» para todos los que jugaron y
--         «Campeón T1» para el clan ganador.
--   · Los retos 1 vs 1 de antes ya no se muestran (las salas siguen).
-- =========================================================

-- ---------- Calendario ----------
create or replace function public.guerra_ancla() returns date language sql immutable as $$ select date '2026-11-23' $$;
create or replace function public.guerra_hoy() returns date language sql stable as $$ select (now() at time zone 'America/Lima')::date $$;
create or replace function public.guerra_hora() returns time language sql stable as $$ select (now() at time zone 'America/Lima')::time $$;
-- Temporada de un día (0 = antes de la primera)
create or replace function public.guerra_temp_de(d date) returns integer language sql immutable as $$
  select case when d is null then null when d < public.guerra_ancla() then 0 else ((d - public.guerra_ancla()) / 28) + 1 end;
$$;
create or replace function public.guerra_inicio(t integer) returns date language sql immutable as $$
  select public.guerra_ancla() + (t - 1) * 28;
$$;
-- Las 8 rondas de una temporada: martes y jueves de sus 4 semanas
create or replace function public.guerra_rondas(t integer) returns date[] language sql immutable as $$
  select array_agg(public.guerra_inicio(t) + w * 7 + x order by w, x) from generate_series(0, 3) w, unnest(array[1, 3]) x;
$$;
create or replace function public.guerra_ronda_n(d date) returns integer language sql immutable as $$
  select case when d is not null then array_position(public.guerra_rondas(public.guerra_temp_de(d)), d) end;
$$;
-- ¿Hay ronda en curso ahora? (devuelve su fecha o null)
create or replace function public.guerra_ronda_viva() returns date language sql stable as $$
  select case when public.guerra_ronda_n(public.guerra_hoy()) is not null
               and public.guerra_hora() >= time '08:00' and public.guerra_hora() < time '20:00'
              then public.guerra_hoy() end;
$$;
-- ¿Esa ronda ya terminó?
create or replace function public.guerra_ronda_cerrada(d date) returns boolean language sql stable as $$
  select d < public.guerra_hoy() or (d = public.guerra_hoy() and public.guerra_hora() >= time '20:00');
$$;

-- ---------- Tablas ----------
create table if not exists public.guerra_partidas (
  id        bigint generated always as identity primary key,
  usuario   uuid not null references auth.users (id) on delete cascade,
  clan      bigint not null references public.clanes (id) on delete cascade,
  temporada integer not null,
  ronda     date not null,
  semilla   integer not null,
  empezo    timestamptz not null default now(),
  termino   timestamptz,
  puntos    integer not null default 0 check (puntos between 0 and 2500),
  correctas integer not null default 0 check (correctas between 0 and 10),
  combo     integer not null default 0
);
create index if not exists guerra_partidas_ronda on public.guerra_partidas (ronda, clan);
create index if not exists guerra_partidas_temp on public.guerra_partidas (temporada, clan);
create index if not exists guerra_partidas_usu on public.guerra_partidas (usuario, ronda);
alter table public.guerra_partidas enable row level security;

create table if not exists public.guerra_cofres (
  usuario uuid not null references auth.users (id) on delete cascade,
  ronda   date not null,
  nivel   text not null,
  premio  jsonb not null,
  abierto timestamptz not null default now(),
  primary key (usuario, ronda)
);
alter table public.guerra_cofres enable row level security;

create table if not exists public.guerra_cierres (
  temporada integer primary key,
  cerrado   timestamptz not null default now(),
  clanes    jsonb not null default '[]'::jsonb,
  jugadores jsonb not null default '[]'::jsonb
);
alter table public.guerra_cierres enable row level security;

create table if not exists public.guerra_copas (
  clan      bigint not null references public.clanes (id) on delete cascade,
  temporada integer not null,
  puesto    integer not null,
  primary key (clan, temporada)
);
alter table public.guerra_copas enable row level security;

-- Premios de la temporada que le tocaron a cada alumno (para mostrárselos una vez)
create table if not exists public.guerra_premios (
  usuario   uuid not null references auth.users (id) on delete cascade,
  temporada integer not null,
  premio    jsonb not null,
  visto     boolean not null default false,
  primary key (usuario, temporada)
);
alter table public.guerra_premios enable row level security;

-- ---------- Emblemas de temporada (pines de la colección) ----------
insert into public.coleccion_item (id, espacio, regla)
select 'pin-guerra-t' || t, 'pines', '{"tipo":"evento"}'::jsonb from generate_series(1, 12) t
union all
select 'pin-guerra-campeon-t' || t, 'pines', '{"tipo":"evento"}'::jsonb from generate_series(1, 12) t
on conflict (id) do nothing;

-- ---------- Cofre de guerra según los puntos de la ronda ----------
create or replace function public.guerra_cofre_nivel(p integer) returns text language sql immutable as $$
  select case when p >= 10000 then 'leyenda' when p >= 6000 then 'oro' when p >= 3000 then 'plata' when p > 0 then 'bronce' end;
$$;
create or replace function public.guerra_cofre_premio(n text) returns jsonb language sql immutable as $$
  select case n when 'leyenda' then '{"diamantes":30,"xp":250}' when 'oro' then '{"diamantes":20,"xp":150}'
                when 'plata' then '{"diamantes":10,"xp":100}' else '{"diamantes":5,"xp":50}' end::jsonb;
$$;

-- ---------- Rankings ----------
-- Clanes de una ronda (p_ronda) o de toda la temporada (p_ronda null)
create or replace function public.guerra_top_clanes(p_temp integer, p_ronda date, p_lim integer default 10)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x.j || jsonb_build_object('puesto', x.puesto) order by x.puesto), '[]'::jsonb) from (
    select row_number() over (order by sum(g.puntos) desc, min(g.termino)) as puesto,
           public.clan_mini(g.clan) || jsonb_build_object('puntos', sum(g.puntos), 'jugadores', count(distinct g.usuario),
             'mio', exists (select 1 from public.clan_miembros m where m.usuario = auth.uid() and m.clan = g.clan)) as j
      from public.guerra_partidas g join public.clanes c on c.id = g.clan and not c.cerrado
     where g.temporada = p_temp and (p_ronda is null or g.ronda = p_ronda) and g.termino is not null
     group by g.clan
  ) x where x.puesto <= p_lim;
$$;
revoke all on function public.guerra_top_clanes(integer, date, integer) from public, anon, authenticated;

create or replace function public.guerra_top_jugadores(p_temp integer, p_lim integer default 10)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x.j || jsonb_build_object('puesto', x.puesto) order by x.puesto), '[]'::jsonb) from (
    select row_number() over (order by sum(g.puntos) desc, min(g.termino)) as puesto,
           jsonb_build_object('apodo', public.duelo_apodo(g.usuario), 'codigo', public.jugador_codigo(g.usuario), 'yo', g.usuario = auth.uid(),
             'puntos', sum(g.puntos), 'partidas', count(*),
             'foto', (select p.foto_url from public.perfiles p where p.id = g.usuario and p.foto_url like 'https://%'),
             'puesto_col', coalesce((select c2.puesto from public.coleccion_puesto c2 where c2.usuario = g.usuario), '{}'::jsonb),
             'clan', (select k.nombre from public.clanes k where k.id = (array_agg(g.clan order by g.id desc))[1])) as j
      from public.guerra_partidas g
     where g.temporada = p_temp and g.termino is not null
     group by g.usuario
  ) x where x.puesto <= p_lim;
$$;
revoke all on function public.guerra_top_jugadores(integer, integer) from public, anon, authenticated;

-- ---------- Cierre de temporada (lo corre sola guerra_ver cuando toca) ----------
create or replace function public.guerra_cerrar(t integer)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare r record; dia integer; nom text; clanes jsonb := '[]'::jsonb; jug jsonb := '[]'::jsonb;
begin
  if t < 1 or public.guerra_hoy() <= public.guerra_inicio(t) + 27 then return; end if;
  perform pg_advisory_xact_lock(hashtext('guerra_cerrar'));
  if exists (select 1 from public.guerra_cierres where temporada = t) then return; end if;

  -- Clanes 1.°, 2.° y 3.°
  for r in select x.clan, x.puesto from (
             select g.clan, row_number() over (order by sum(g.puntos) desc, min(g.termino)) as puesto
               from public.guerra_partidas g join public.clanes c on c.id = g.clan and not c.cerrado
              where g.temporada = t and g.termino is not null group by g.clan) x
           where x.puesto <= 3 loop
    dia := case r.puesto when 1 then 150 when 2 then 100 else 50 end;
    select k.nombre into nom from public.clanes k where k.id = r.clan;
    insert into public.guerra_copas (clan, temporada, puesto) values (r.clan, t, r.puesto) on conflict do nothing;
    clanes := clanes || jsonb_build_object('clan', r.clan, 'nombre', nom, 'puesto', r.puesto);
    -- A cada miembro que jugó por ese clan esta temporada
    perform public.diamantes_dar(u.usuario, dia, left('Guerra de clanes T' || t || ': ' || r.puesto || '.° puesto con ' || nom, 80))
      from (select distinct g.usuario from public.guerra_partidas g where g.temporada = t and g.clan = r.clan and g.termino is not null) u;
    insert into public.guerra_premios (usuario, temporada, premio)
    select distinct g.usuario, t, jsonb_build_object('clan_puesto', r.puesto, 'clan', nom, 'diamantes', dia)
      from public.guerra_partidas g where g.temporada = t and g.clan = r.clan and g.termino is not null
    on conflict (usuario, temporada) do update set premio = public.guerra_premios.premio || excluded.premio;
    if r.puesto = 1 then
      insert into public.coleccion_mia (usuario, item, origen, mensaje)
      select distinct g.usuario, 'pin-guerra-campeon-t' || t, 'evento', 'Campeones de la Guerra de clanes T' || t
        from public.guerra_partidas g where g.temporada = t and g.clan = r.clan and g.termino is not null
      on conflict do nothing;
    end if;
  end loop;

  -- Top 3 individual
  for r in select x.usuario, x.puesto from (
             select g.usuario, row_number() over (order by sum(g.puntos) desc, min(g.termino)) as puesto
               from public.guerra_partidas g where g.temporada = t and g.termino is not null group by g.usuario) x
           where x.puesto <= 3 loop
    dia := case r.puesto when 1 then 80 when 2 then 50 else 30 end;
    perform public.diamantes_dar(r.usuario, dia, 'Guerra de clanes T' || t || ': ' || r.puesto || '.° individual');
    jug := jug || jsonb_build_object('codigo', public.jugador_codigo(r.usuario), 'apodo', public.duelo_apodo(r.usuario), 'puesto', r.puesto);
    insert into public.guerra_premios (usuario, temporada, premio)
    values (r.usuario, t, jsonb_build_object('ind_puesto', r.puesto, 'ind_diamantes', dia))
    on conflict (usuario, temporada) do update set premio = public.guerra_premios.premio || excluded.premio;
  end loop;

  -- Emblema para todos los que jugaron
  insert into public.coleccion_mia (usuario, item, origen, mensaje)
  select distinct g.usuario, 'pin-guerra-t' || t, 'evento', 'Jugaste la Guerra de clanes T' || t
    from public.guerra_partidas g where g.temporada = t and g.termino is not null
  on conflict do nothing;
  insert into public.guerra_premios (usuario, temporada, premio)
  select distinct g.usuario, t, '{"emblema":true}'::jsonb from public.guerra_partidas g where g.temporada = t and g.termino is not null
  on conflict (usuario, temporada) do update set premio = public.guerra_premios.premio || excluded.premio;

  insert into public.guerra_cierres (temporada, clanes, jugadores) values (t, clanes, jug);
end $$;
revoke all on function public.guerra_cerrar(integer) from public, anon, authenticated;

-- ---------- Todo lo de la guerra para la pantalla ----------
create or replace function public.guerra_ver()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); hoy date := public.guerra_hoy(); t integer; viva date; mio bigint;
  rondas date[]; prox date; ult date; d date; cof jsonb := '[]'::jsonb; p integer; pr jsonb; rl jsonb := '[]'::jsonb;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  t := greatest(1, public.guerra_temp_de(hoy));
  -- Cierra la temporada anterior si ya terminó
  if t > 1 then perform public.guerra_cerrar(t - 1); end if;
  select clan into mio from public.clan_miembros where usuario = uid;
  viva := public.guerra_ronda_viva();
  rondas := public.guerra_rondas(t);
  -- Próxima ronda (hoy si aún no abre, o la siguiente)
  select min(x) into prox from unnest(rondas || public.guerra_rondas(t + 1)) x
   where x > hoy or (x = hoy and public.guerra_hora() < time '08:00');
  -- Última ronda cerrada de esta temporada (para el resultado)
  select max(x) into ult from unnest(rondas) x where public.guerra_ronda_cerrada(x);
  foreach d in array rondas loop
    rl := rl || jsonb_build_object('fecha', d, 'n', array_position(rondas, d),
      'estado', case when d = viva then 'viva' when public.guerra_ronda_cerrada(d) then 'cerrada' else 'pendiente' end);
  end loop;
  -- Cofres por abrir (rondas cerradas en las que jugó, de las últimas 2 temporadas)
  for d, p in select g.ronda, sum(g.puntos)::integer from public.guerra_partidas g
               where g.usuario = uid and g.termino is not null and g.temporada >= t - 1
                 and not exists (select 1 from public.guerra_cofres c where c.usuario = uid and c.ronda = g.ronda)
               group by g.ronda order by g.ronda loop
    if public.guerra_ronda_cerrada(d) and public.guerra_cofre_nivel(p) is not null then
      cof := cof || jsonb_build_object('ronda', d, 'n', public.guerra_ronda_n(d), 'temporada', public.guerra_temp_de(d), 'puntos', p, 'nivel', public.guerra_cofre_nivel(p));
    end if;
  end loop;
  -- Premios de la temporada pasada que aún no vio
  select jsonb_build_object('temporada', gp.temporada) || gp.premio into pr from public.guerra_premios gp
   where gp.usuario = uid and not gp.visto order by gp.temporada desc limit 1;

  return jsonb_build_object(
    'temporada', t, 'inicio', public.guerra_inicio(t), 'fin', public.guerra_inicio(t) + 27,
    'rondas', rl, 'viva', viva, 'viva_n', public.guerra_ronda_n(viva), 'proxima', prox, 'proxima_n', public.guerra_ronda_n(prox),
    'ahora', now(), 'max_partidas', 5,
    'tengo_clan', mio is not null,
    'mi_clan', case when mio is not null then public.clan_mini(mio) || jsonb_build_object(
        'puntos_ronda', (select coalesce(sum(g.puntos), 0) from public.guerra_partidas g where g.clan = mio and g.ronda = coalesce(viva, ult) and g.termino is not null),
        'puntos_temp', (select coalesce(sum(g.puntos), 0) from public.guerra_partidas g where g.clan = mio and g.temporada = t and g.termino is not null),
        'puesto_ronda', (select (e.x ->> 'puesto')::integer from jsonb_array_elements(public.guerra_top_clanes(t, coalesce(viva, ult), 1000)) e(x) where (e.x ->> 'id')::bigint = mio),
        'puesto_temp', (select (e.x ->> 'puesto')::integer from jsonb_array_elements(public.guerra_top_clanes(t, null, 1000)) e(x) where (e.x ->> 'id')::bigint = mio),
        'aporte', (select coalesce(jsonb_agg(a order by (a ->> 'puntos')::integer desc), '[]'::jsonb) from (
            select jsonb_build_object('apodo', public.duelo_apodo(g.usuario), 'yo', g.usuario = uid, 'puntos', sum(g.puntos), 'partidas', count(*)) as a
              from public.guerra_partidas g where g.clan = mio and g.temporada = t and g.termino is not null group by g.usuario) z)) end,
    'yo', jsonb_build_object(
        'partidas_hoy', (select count(*) from public.guerra_partidas g where g.usuario = uid and g.ronda = viva),
        'puntos_ronda', (select coalesce(sum(g.puntos), 0) from public.guerra_partidas g where g.usuario = uid and g.ronda = viva and g.termino is not null),
        'puntos_temp', (select coalesce(sum(g.puntos), 0) from public.guerra_partidas g where g.usuario = uid and g.temporada = t and g.termino is not null),
        'mejor', (select coalesce(max(g.puntos), 0) from public.guerra_partidas g where g.usuario = uid and g.temporada = t)),
    'ronda_clanes', public.guerra_top_clanes(t, coalesce(viva, ult), 10),
    'ronda_de', coalesce(viva, ult), 'ronda_de_n', public.guerra_ronda_n(coalesce(viva, ult)),
    'temp_clanes', public.guerra_top_clanes(t, null, 10),
    'temp_jugadores', public.guerra_top_jugadores(t, 10),
    'cofres', cof,
    'premio', pr,
    'campeones', (select c.clanes from public.guerra_cierres c where c.temporada = t - 1)
  );
end $$;
revoke all on function public.guerra_ver() from public, anon;
grant execute on function public.guerra_ver() to authenticated;

-- ---------- Jugar una partida ----------
create or replace function public.guerra_empezar()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); mio bigint; viva date := public.guerra_ronda_viva(); n integer; s integer; pid bigint;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select clan into mio from public.clan_miembros where usuario = uid;
  if mio is null then raise exception 'sin_clan'; end if;
  if viva is null then raise exception 'guerra_cerrada'; end if;
  perform pg_advisory_xact_lock(hashtext('guerra:' || uid::text));
  -- Una partida abierta sin terminar (cerró la página): se cierra con 0
  update public.guerra_partidas set termino = now() where usuario = uid and termino is null and empezo < now() - interval '15 minutes';
  select count(*) into n from public.guerra_partidas where usuario = uid and ronda = viva;
  if n >= 5 then raise exception 'sin_partidas'; end if;
  s := floor(random() * 2000000000)::integer;
  insert into public.guerra_partidas (usuario, clan, temporada, ronda, semilla)
  values (uid, mio, public.guerra_temp_de(viva), viva, s) returning id into pid;
  return jsonb_build_object('id', pid, 'semilla', s, 'ronda', viva, 'ronda_n', public.guerra_ronda_n(viva), 'quedan', 4 - n);
end $$;
revoke all on function public.guerra_empezar() from public, anon;
grant execute on function public.guerra_empezar() to authenticated;

create or replace function public.guerra_terminar(p_id bigint, p_puntos integer, p_correctas integer, p_combo integer default 0)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); g public.guerra_partidas; c integer := least(greatest(coalesce(p_correctas, 0), 0), 10);
  pts integer; seg numeric; xp integer;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into g from public.guerra_partidas where id = p_id and usuario = uid for update;
  if g.id is null then raise exception 'partida_no_existe'; end if;
  if g.termino is not null then raise exception 'partida_cerrada'; end if;
  seg := extract(epoch from now() - g.empezo);
  -- Topes: 250 por acierto; mínimo 1,5 s por pregunta respondida; máximo 15 min
  pts := least(greatest(coalesce(p_puntos, 0), 0), c * 250);
  if seg < c * 1.5 or seg > 900 then pts := 0; c := 0; end if;
  update public.guerra_partidas set termino = now(), puntos = pts, correctas = c, combo = least(greatest(coalesce(p_combo, 0), 0), 10)
   where id = g.id;
  -- 5 XP por acierto
  xp := c * 5;
  if xp > 0 then
    perform public.cz_estado(uid);
    insert into public.xp_semana (usuario, semana, xp) values (uid, public.cz_lunes(), xp)
    on conflict (usuario, semana) do update set xp = public.xp_semana.xp + excluded.xp;
    update public.corazones set xp_saldo = xp_saldo + xp, actualizado = now() where usuario = uid;
  end if;
  return public.guerra_ver() || jsonb_build_object('resultado', jsonb_build_object('puntos', pts, 'correctas', c, 'xp', xp,
    'puesto_clan', (select (e.x ->> 'puesto')::integer from jsonb_array_elements(public.guerra_top_clanes(g.temporada, g.ronda, 1000)) e(x)
                     where (e.x ->> 'id')::bigint = g.clan)));
end $$;
revoke all on function public.guerra_terminar(bigint, integer, integer, integer) from public, anon;
grant execute on function public.guerra_terminar(bigint, integer, integer, integer) to authenticated;

-- ---------- Abrir el cofre de una ronda ----------
create or replace function public.guerra_cofre_abrir(p_ronda date)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); p integer; n text; pr jsonb;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if p_ronda is null or not public.guerra_ronda_cerrada(p_ronda) then raise exception 'ronda_abierta'; end if;
  perform pg_advisory_xact_lock(hashtext('guerra:' || uid::text));
  if exists (select 1 from public.guerra_cofres where usuario = uid and ronda = p_ronda) then raise exception 'cofre_abierto'; end if;
  select coalesce(sum(puntos), 0) into p from public.guerra_partidas where usuario = uid and ronda = p_ronda and termino is not null;
  n := public.guerra_cofre_nivel(p);
  if n is null then raise exception 'sin_cofre'; end if;
  pr := public.guerra_cofre_premio(n);
  insert into public.guerra_cofres (usuario, ronda, nivel, premio) values (uid, p_ronda, n, pr);
  perform public.diamantes_dar(uid, (pr ->> 'diamantes')::integer, 'Cofre de guerra ' || n || ' (ronda ' || public.guerra_ronda_n(p_ronda) || ')');
  perform public.cz_estado(uid);
  insert into public.xp_semana (usuario, semana, xp) values (uid, public.cz_lunes(), (pr ->> 'xp')::integer)
  on conflict (usuario, semana) do update set xp = public.xp_semana.xp + excluded.xp;
  update public.corazones set xp_saldo = xp_saldo + (pr ->> 'xp')::integer, actualizado = now() where usuario = uid;
  return public.guerra_ver() || jsonb_build_object('abierto', jsonb_build_object('nivel', n, 'puntos', p) || pr);
end $$;
revoke all on function public.guerra_cofre_abrir(date) from public, anon;
grant execute on function public.guerra_cofre_abrir(date) to authenticated;

-- Ya vio los premios de la temporada
create or replace function public.guerra_premio_visto(p_temp integer)
returns void language sql volatile security definer set search_path = '' as $$
  update public.guerra_premios set visto = true where usuario = auth.uid() and temporada = p_temp;
$$;
revoke all on function public.guerra_premio_visto(integer) from public, anon;
grant execute on function public.guerra_premio_visto(integer) to authenticated;

-- ---------- Copas de la guerra en el escudo (se suman a las del Top semanal) ----------
create or replace function public.clan_logros(c bigint)
returns jsonb language sql stable security definer set search_path = '' as $$
  with cerradas as (
    select s.clan, s.semana, s.xp, s.meta, rank() over (partition by s.semana order by s.xp desc) as puesto
    from public.clan_semanas s where s.semana < public.cz_lunes() and s.xp > 0
  ), pts as (
    select coalesce((select sum(s.xp) from public.clan_semanas s where s.clan = c and s.semana < public.cz_lunes()), 0)::bigint
           + public.clan_xp_semana(c) as p
  ), viejo as (
    select least(5, 1 + (select count(*) from cerradas k where k.clan = c and k.xp >= k.meta))::integer as n
  ), nuevo as (
    select (select count(*) from unnest(public.clan_niveles()) u where u <= pts.p)::integer as n from pts
  )
  select jsonb_build_object(
    'nivel', greatest(viejo.n, nuevo.n),
    'puntos', pts.p,
    'niveles', to_jsonb(public.clan_niveles()),
    'copas', (select count(*) from cerradas k where k.clan = c and k.puesto <= 3) + (select count(*) from public.guerra_copas gc where gc.clan = c),
    'copas_guerra', (select count(*) from public.guerra_copas gc where gc.clan = c),
    'victorias', public.clan_victorias(c),
    'id_publico', public.clan_id_publico(c)
  ) || coalesce((select jsonb_build_object('aprobacion', k.aprobacion, 'min_nivel', k.min_nivel, 'min_rango', k.min_rango,
       'eslogan', k.eslogan, 'cupo', coalesce(k.cupo, 20), 'etiquetas', to_jsonb(k.etiquetas)) from public.clanes k where k.id = c), '{}'::jsonb)
  from pts, viejo, nuevo;
$$;
revoke all on function public.clan_logros(bigint) from public, anon, authenticated;
