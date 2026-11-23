-- =========================================================
-- Modo Cachimbo · Sala de clan gratis (hasta 6 vs 6) y duelos que suman a la Guerra
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 118-duelo-clanes.sql y 134-guerra-clanes.sql (correr después del 134).
--
--   · Sala de clan: gratis (ya no usa ticket), cualquier miembro la crea,
--     hasta 6 por lado (12 en la sala). Las preguntas salen al azar
--     del ciclo más nuevo (no se elige nada).
--   · Cualquier miembro de otro clan puede entrar y su clan queda de rival.
--   · Si el duelo empieza en una ronda de la Guerra (mar y jue 8–20),
--     cada jugador suma a su clan: gana 3 000, empate 2 000, pierde 1 000.
--     Cuentan hasta 3 duelos por jugador en cada ronda.
--   · Los rankings, cofres y premios de la Guerra cuentan partidas + duelos.
-- =========================================================

-- ---------- Sala hasta 6 vs 6 ----------
alter table public.duelos drop constraint if exists duelos_max_jug_check;
alter table public.duelos add constraint duelos_max_jug_check check (max_jug between 2 and 12);
alter table public.duelos drop constraint if exists duelos_por_lado_check;
alter table public.duelos add constraint duelos_por_lado_check check (por_lado is null or por_lado between 1 and 6);

-- Crear la sala de clan: cualquier miembro, gratis, hasta 6 por lado
create or replace function public.clan_duelo_crear(p jsonb)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); m public.clan_miembros; lado integer; cod text;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into m from public.clan_miembros x where x.usuario = uid;
  if m.clan is null then raise exception 'sin_clan'; end if;
  if exists (select 1 from public.duelos x where (x.clan_a = m.clan or x.clan_b = m.clan) and x.empieza is null and x.vence > now()) then
    raise exception 'sala_abierta';
  end if;
  lado := case when coalesce(p ->> 'por_lado', '') ~ '^[1-6]$' then (p ->> 'por_lado')::integer else 6 end;
  cod := public.crear_duelo(p || jsonb_build_object('jugadores', '2', 'comodines', 'true', 'auto', false));
  update public.duelos x set clan_a = m.clan, por_lado = lado, max_jug = lado * 2, vence = now() + interval '15 minutes' where x.codigo = cod;
  update public.duelo_jugadas j set clan = m.clan where j.duelo = (select x.id from public.duelos x where x.codigo = cod) and j.usuario = uid;
  return cod;
end $$;
revoke all on function public.clan_duelo_crear(jsonb) from public, anon;
grant execute on function public.clan_duelo_crear(jsonb) to authenticated;

-- Entrar: el primero de otro clan (cualquier miembro) vuelve a su clan el rival
create or replace function public.entrar_duelo(p_codigo text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  d public.duelos;
  hay integer;
  m public.clan_miembros;
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
  -- Clan vs clan: entras al lado de tu clan; el primero de otro clan que entra lo vuelve rival
  if d.clan_a is not null then
    select * into m from public.clan_miembros x where x.usuario = uid;
    if m.clan is null then raise exception 'sala_sin_clan'; end if;
    if m.clan <> d.clan_a and d.clan_b is null then
      update public.duelos x set clan_b = m.clan where x.id = d.id returning * into d;
    end if;
    if m.clan <> d.clan_a and m.clan <> d.clan_b then raise exception 'sala_otro_clan'; end if;
    if (select count(*) from public.duelo_jugadas x where x.duelo = d.id and x.clan = m.clan) >= d.por_lado then raise exception 'sala_llena'; end if;
  end if;
  insert into public.duelo_jugadas (duelo, usuario, entro, clan) values (d.id, uid, now(), m.clan);
  if d.auto and hay + 1 >= d.max_jug then perform public.duelo_arrancar(d.id); end if;
  return public.ver_duelo(p_codigo);
end $$;
revoke all on function public.entrar_duelo(text) from public, anon;
grant execute on function public.entrar_duelo(text) to authenticated;

-- Empezar: ya no usa ticket
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
    if d.clan_a is not null then
      if d.clan_b is null or (select count(distinct x.clan) from public.duelo_jugadas x where x.duelo = d.id) < 2 then
        raise exception 'sala_pocos';
      end if;
    end if;
    perform public.duelo_arrancar(d.id);
  end if;
  return public.ver_duelo(p_codigo);
end $$;
revoke all on function public.iniciar_duelo(text) from public, anon;
grant execute on function public.iniciar_duelo(text) to authenticated;

-- ---------- Duelos que suman a la Guerra ----------
create table if not exists public.guerra_aportes (
  id        bigint generated always as identity primary key,
  usuario   uuid not null references auth.users (id) on delete cascade,
  clan      bigint not null references public.clanes (id) on delete cascade,
  temporada integer not null,
  ronda     date not null,
  puntos    integer not null check (puntos between 0 and 5000),
  duelo     bigint not null,
  resultado text not null,
  creado    timestamptz not null default now(),
  unique (duelo, usuario)
);
create index if not exists guerra_aportes_ronda on public.guerra_aportes (ronda, clan);
create index if not exists guerra_aportes_temp on public.guerra_aportes (temporada, clan);
create index if not exists guerra_aportes_usu on public.guerra_aportes (usuario, ronda);
alter table public.guerra_aportes enable row level security;
create table if not exists public.guerra_duelos (duelo bigint primary key, cerrado timestamptz not null default now());
alter table public.guerra_duelos enable row level security;

-- Todos los puntos de la guerra: partidas terminadas + duelos de sala
create or replace view public.guerra_puntos as
  select p.id, p.usuario, p.clan, p.temporada, p.ronda, p.puntos, p.termino, 'partida'::text as tipo
    from public.guerra_partidas p where p.termino is not null
  union all
  select -a.id, a.usuario, a.clan, a.temporada, a.ronda, a.puntos, a.creado, 'duelo'::text
    from public.guerra_aportes a;
revoke all on public.guerra_puntos from public, anon, authenticated;

-- Al terminar un duelo de clanes: si empezó en una ronda, suma a la Guerra (una sola vez)
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
             case when ganador is null then 2000 when j.clan = ganador then 3000 else 1000 end, d.id,
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

create or replace function public.guerra_top_clanes(p_temp integer, p_ronda date, p_lim integer default 10)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x.j || jsonb_build_object('puesto', x.puesto) order by x.puesto), '[]'::jsonb) from (
    select row_number() over (order by sum(g.puntos) desc, min(g.termino)) as puesto,
           public.clan_mini(g.clan) || jsonb_build_object('puntos', sum(g.puntos), 'jugadores', count(distinct g.usuario),
             'mio', exists (select 1 from public.clan_miembros m where m.usuario = auth.uid() and m.clan = g.clan)) as j
      from public.guerra_puntos g join public.clanes c on c.id = g.clan and not c.cerrado
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
             'puntos', sum(g.puntos), 'partidas', count(*) filter (where g.tipo = 'partida'), 'duelos', count(*) filter (where g.tipo = 'duelo'),
             'foto', (select p.foto_url from public.perfiles p where p.id = g.usuario and p.foto_url like 'https://%'),
             'puesto_col', coalesce((select c2.puesto from public.coleccion_puesto c2 where c2.usuario = g.usuario), '{}'::jsonb),
             'clan', (select k.nombre from public.clanes k where k.id = (array_agg(g.clan order by g.id desc))[1])) as j
      from public.guerra_puntos g
     where g.temporada = p_temp and g.termino is not null
     group by g.usuario
  ) x where x.puesto <= p_lim;
$$;
revoke all on function public.guerra_top_jugadores(integer, integer) from public, anon, authenticated;

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
               from public.guerra_puntos g join public.clanes c on c.id = g.clan and not c.cerrado
              where g.temporada = t and g.termino is not null group by g.clan) x
           where x.puesto <= 3 loop
    dia := case r.puesto when 1 then 150 when 2 then 100 else 50 end;
    select k.nombre into nom from public.clanes k where k.id = r.clan;
    insert into public.guerra_copas (clan, temporada, puesto) values (r.clan, t, r.puesto) on conflict do nothing;
    clanes := clanes || jsonb_build_object('clan', r.clan, 'nombre', nom, 'puesto', r.puesto);
    -- A cada miembro que jugó por ese clan esta temporada
    perform public.diamantes_dar(u.usuario, dia, left('Guerra de clanes T' || t || ': ' || r.puesto || '.° puesto con ' || nom, 80))
      from (select distinct g.usuario from public.guerra_puntos g where g.temporada = t and g.clan = r.clan and g.termino is not null) u;
    insert into public.guerra_premios (usuario, temporada, premio)
    select distinct g.usuario, t, jsonb_build_object('clan_puesto', r.puesto, 'clan', nom, 'diamantes', dia)
      from public.guerra_puntos g where g.temporada = t and g.clan = r.clan and g.termino is not null
    on conflict (usuario, temporada) do update set premio = public.guerra_premios.premio || excluded.premio;
    if r.puesto = 1 then
      insert into public.coleccion_mia (usuario, item, origen, mensaje)
      select distinct g.usuario, 'pin-guerra-campeon-t' || t, 'evento', 'Campeones de la Guerra de clanes T' || t
        from public.guerra_puntos g where g.temporada = t and g.clan = r.clan and g.termino is not null
      on conflict do nothing;
    end if;
  end loop;

  -- Top 3 individual
  for r in select x.usuario, x.puesto from (
             select g.usuario, row_number() over (order by sum(g.puntos) desc, min(g.termino)) as puesto
               from public.guerra_puntos g where g.temporada = t and g.termino is not null group by g.usuario) x
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
    from public.guerra_puntos g where g.temporada = t and g.termino is not null
  on conflict do nothing;
  insert into public.guerra_premios (usuario, temporada, premio)
  select distinct g.usuario, t, '{"emblema":true}'::jsonb from public.guerra_puntos g where g.temporada = t and g.termino is not null
  on conflict (usuario, temporada) do update set premio = public.guerra_premios.premio || excluded.premio;

  insert into public.guerra_cierres (temporada, clanes, jugadores) values (t, clanes, jug);
end $$;
revoke all on function public.guerra_cerrar(integer) from public, anon, authenticated;

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
  for d, p in select g.ronda, sum(g.puntos)::integer from public.guerra_puntos g
               where g.usuario = uid and g.temporada >= t - 1
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
    'ahora', now(), 'max_partidas', 5, 'max_duelos', 3,
    'tengo_clan', mio is not null,
    'mi_clan', case when mio is not null then public.clan_mini(mio) || jsonb_build_object(
        'puntos_ronda', (select coalesce(sum(g.puntos), 0) from public.guerra_puntos g where g.clan = mio and g.ronda = coalesce(viva, ult) and g.termino is not null),
        'puntos_temp', (select coalesce(sum(g.puntos), 0) from public.guerra_puntos g where g.clan = mio and g.temporada = t and g.termino is not null),
        'puesto_ronda', (select (e.x ->> 'puesto')::integer from jsonb_array_elements(public.guerra_top_clanes(t, coalesce(viva, ult), 1000)) e(x) where (e.x ->> 'id')::bigint = mio),
        'puesto_temp', (select (e.x ->> 'puesto')::integer from jsonb_array_elements(public.guerra_top_clanes(t, null, 1000)) e(x) where (e.x ->> 'id')::bigint = mio),
        'aporte', (select coalesce(jsonb_agg(a order by (a ->> 'puntos')::integer desc), '[]'::jsonb) from (
            select jsonb_build_object('apodo', public.duelo_apodo(g.usuario), 'yo', g.usuario = uid, 'puntos', sum(g.puntos), 'partidas', count(*) filter (where g.tipo = 'partida'), 'duelos', count(*) filter (where g.tipo = 'duelo')) as a
              from public.guerra_puntos g where g.clan = mio and g.temporada = t and g.termino is not null group by g.usuario) z)) end,
    'yo', jsonb_build_object(
        'partidas_hoy', (select count(*) from public.guerra_partidas g where g.usuario = uid and g.ronda = viva),
        'duelos_hoy', (select count(*) from public.guerra_aportes g where g.usuario = uid and g.ronda = viva),
        'puntos_ronda', (select coalesce(sum(g.puntos), 0) from public.guerra_puntos g where g.usuario = uid and g.ronda = viva and g.termino is not null),
        'puntos_temp', (select coalesce(sum(g.puntos), 0) from public.guerra_puntos g where g.usuario = uid and g.temporada = t and g.termino is not null),
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

create or replace function public.guerra_cofre_abrir(p_ronda date)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); p integer; n text; pr jsonb;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if p_ronda is null or not public.guerra_ronda_cerrada(p_ronda) then raise exception 'ronda_abierta'; end if;
  perform pg_advisory_xact_lock(hashtext('guerra:' || uid::text));
  if exists (select 1 from public.guerra_cofres where usuario = uid and ronda = p_ronda) then raise exception 'cofre_abierto'; end if;
  select coalesce(sum(puntos), 0) into p from public.guerra_puntos where usuario = uid and ronda = p_ronda;
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

-- ---------- Tienda: la sala ya no usa ticket ----------
-- El «Ticket de sala» sale de la tienda y el Cofre sorpresa ya no da tickets (da 300 XP en su lugar)
update public.tienda_items set activo = false where id = 'ticket';
create or replace function public.tienda_comprar(p_item text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); it public.tienda_items; pr jsonb; r integer; k text;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into it from public.tienda_items where id = p_item and activo;
  if it.id is null then raise exception 'item_no_existe'; end if;
  if it.id = 'cupo5' then raise exception 'cupo_con_id'; end if;   -- se compra con tienda_comprar_cupo
  if it.id in ('fortuna', 'ticket') and not exists (select 1 from public.clan_miembros m where m.usuario = uid) then raise exception 'sin_clan'; end if;
  perform pg_advisory_xact_lock(hashtext('tienda:' || uid::text));
  if (select coalesce(sum(d.cantidad), 0) from public.diamantes_mov d where d.usuario = uid) < it.precio then raise exception 'pocos_diamantes'; end if;
  if it.id = 'sorpresa' then
    -- 30 % 300 XP · 20 % Doble XP · 20 % 40 de energía · 15 % vidas 1 día · 10 % 300 XP · 5 % 150 diamantes
    r := floor(random() * 100)::integer;
    k := case when r < 30 then 'xp300' when r < 50 then 'doblexp' when r < 70 then 'energia40' when r < 85 then 'vida1' when r < 95 then 'xp300' else 'dia150' end;
    if k in ('doblexp', 'vida1') then
      perform public.tienda_inv_sumar(uid, k, 1);
      pr := jsonb_build_object('tipo', 'guardado', 'item', k, 'cantidad', 1);
    else
      pr := public.tienda_efecto(uid, k);
    end if;
  else
    pr := jsonb_build_object('tipo', 'guardado', 'item', it.id, 'cantidad', public.tienda_inv_sumar(uid, it.id, 1));
  end if;
  perform public.diamantes_dar(uid, -it.precio, 'Tienda: ' || it.nom);
  insert into public.tienda_compras (usuario, item, precio, premio) values (uid, it.id, it.precio, pr);
  return public.tienda_ver() || jsonb_build_object('premio', pr, 'item', it.id);
end $$;
revoke all on function public.tienda_comprar(text) from public, anon;
grant execute on function public.tienda_comprar(text) to authenticated;
