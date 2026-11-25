-- =========================================================
-- Modo Cachimbo · Parches: Guerra (seguir partida cortada, anular
-- partidas sospechosas) y XP a la mitad al repetir el mismo tema
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 127, 134 y 135 (correr después del 137).
--
--   · Guerra: si la app se cierra a la mitad de una partida, al volver
--     (hasta 15 min sin responder) sigue en la misma pregunta con sus
--     puntos y no gasta otra partida. Si pasan los 15 min, la partida se
--     cierra con los puntos que llevaba (antes valía 0).
--   · Panel → Clanes: lista de las partidas más altas de la temporada con
--     botón «Anular» (la partida queda en 0 y se le restan al clan).
--   · Práctica: desde la 3.ª vez en el día que se termina el mismo tema,
--     las correctas dan la mitad de XP.
-- =========================================================

alter table public.guerra_partidas add column if not exists avance_n integer not null default 0;
alter table public.guerra_partidas add column if not exists avance_puntos integer not null default 0;
alter table public.guerra_partidas add column if not exists avance_correctas integer not null default 0;
alter table public.guerra_partidas add column if not exists avance_combo integer not null default 0;
alter table public.guerra_partidas add column if not exists avance_t timestamptz;
alter table public.guerra_partidas add column if not exists anulada boolean not null default false;

-- Cierra las partidas cortadas hace más de 15 min con lo que llevaban
create or replace function public.guerra_cerrar_viejas()
returns void language sql volatile security definer set search_path = '' as $$
  update public.guerra_partidas g
     set termino = now(),
         correctas = least(g.avance_correctas, 10),
         puntos = case when extract(epoch from coalesce(g.avance_t, g.empezo) - g.empezo) >= least(g.avance_correctas, 10) * 1.5
                       then least(g.avance_puntos, least(g.avance_correctas, 10) * 250, 2500) else 0 end,
         combo = least(g.avance_combo, 10)
   where g.termino is null and coalesce(g.avance_t, g.empezo) < now() - interval '15 minutes';
$$;
revoke all on function public.guerra_cerrar_viejas() from public, anon, authenticated;

-- Guarda el avance después de cada pregunta (para seguir si se corta)
create or replace function public.guerra_avance(p_id bigint, p_n integer, p_puntos integer, p_correctas integer, p_combo integer default 0)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); g public.guerra_partidas; n integer := least(greatest(coalesce(p_n, 0), 0), 10); c integer;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into g from public.guerra_partidas where id = p_id and usuario = uid and termino is null for update;
  if g.id is null or n < g.avance_n then return; end if;
  c := least(greatest(coalesce(p_correctas, 0), 0), n);
  update public.guerra_partidas set avance_n = n, avance_correctas = c,
         avance_puntos = least(greatest(coalesce(p_puntos, 0), 0), c * 250), avance_combo = least(greatest(coalesce(p_combo, 0), 0), 10),
         avance_t = now()
   where id = g.id;
end $$;
revoke all on function public.guerra_avance(bigint, integer, integer, integer, integer) from public, anon;
grant execute on function public.guerra_avance(bigint, integer, integer, integer, integer) to authenticated;

-- ---------- XP: la mitad al repetir el mismo tema (3.ª vez en el día o más) ----------
create or replace function public.sumar_xp(p jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid    uuid := auth.uid();
  fuente text := coalesce(p ->> 'fuente', '');
  curso  text := coalesce(p ->> 'curso', '');
  ok     integer := least(greatest(coalesce((p ->> 'ok')::int, 0), 0), 50);
  mal    integer := least(greatest(coalesce((p ->> 'mal')::int, 0), 0), 50);
  seg    integer := least(greatest(coalesce((p ->> 'seguidas')::int, 0), 0), 100);
  xp     integer;
  b_ok   integer;
  xps    integer;
  r      public.corazones;
  m      jsonb;
  ms     jsonb := '[]'::jsonb;
  n      integer;
  auto   boolean := fuente in ('tarjetas', 'vocabulario');
  hoy    date := public.cz_hoy();
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if fuente not in ('libro', 'repaso', 'fijas', 'seminarios', 'banqueo', 'examen', 'falladas', 'vocabulario', 'tarjetas', 'duelo', 'simulacro') then
    raise exception 'fuente inválida';
  end if;
  perform public.cz_estado(uid);
  select * into r from public.corazones where usuario = uid for update;

  -- 15 donde se gasta corazón, 10 en lo demás; la incorrecta ya no da XP
  -- (marcar al azar no suma nada)
  b_ok := case when fuente in ('repaso', 'fijas', 'seminarios', 'banqueo') then 15 else 10 end;
  -- La correcta se multiplica según el rango que tiene ahora (XP de la semana)
  select coalesce(x.xp, 0) into xps from (select 1) d left join public.xp_semana x on x.usuario = uid and x.semana = public.cz_lunes();
  xp := ok * round(b_ok * public.xp_mult(xps) / 100.0)::int;
  -- Mismo tema repetido 3 veces o más hoy: la mitad de XP (lo avisa la página)
  if coalesce((p ->> 'repite')::boolean, false) then xp := xp / 2; end if;

  -- Tarjetas y Vocabulario: el alumno marca él mismo «me la sé», así que
  -- dan como máximo 1000 XP al día entre las dos.
  if r.xp_auto_dia is distinct from hoy then r.xp_auto_dia := hoy; r.xp_auto_hoy := 0; end if;
  if auto then
    xp := least(xp, greatest(1000 - r.xp_auto_hoy, 0));
  end if;

  -- Ritmo: la reserva se llena 120 XP por minuto (hasta 3000, lo que da un
  -- simulacro entero). Nadie acierta 8 por minuto por horas; un script sí.
  -- XP jugados SIN INTERNET (p.pend = true, los manda la cola del celular al
  -- volver la señal): la reserva puede juntar hasta 20000 con el tiempo que de
  -- verdad pasó desde la última vez, así no se recortan al subir todo junto.
  -- El ritmo sigue siendo 120 por minuto: un script no gana más rápido.
  r.xp_cubo := least(case when coalesce((p ->> 'pend')::boolean, false) then 20000 else 3000 end,
                     greatest(r.xp_cubo, 0) + extract(epoch from (now() - r.xp_cubo_t)) / 60 * 120);
  xp := least(xp, floor(r.xp_cubo)::int);
  r.xp_cubo := r.xp_cubo - xp;

  if auto then r.xp_auto_hoy := r.xp_auto_hoy + xp; end if;
  -- Tienda: tarjeta Doble XP activa (1 día)
  if r.doble_xp_hasta is not null and r.doble_xp_hasta > now() then xp := xp * 2; end if;

  -- Avance de misiones (+40 cada una, sin multiplicador)
  for m in select value from jsonb_array_elements(r.misiones) loop
    if m ->> 'estado' = 'pend' then
      n := (m ->> 'hecho')::int;
      if m ->> 'tipo' = 'explora' and fuente = 'libro' and (m ->> 'curso' is null or m ->> 'curso' = curso) then n := n + ok + mal;
      elsif m ->> 'tipo' = 'vocabulario' and fuente = 'vocabulario' then n := n + ok + mal;
      elsif m ->> 'tipo' = 'tarjetas' and fuente = 'tarjetas' then n := n + ok + mal;
      elsif m ->> 'tipo' = 'repaso' and fuente = 'repaso' then n := n + ok;
      elsif m ->> 'tipo' = 'seguidas' and fuente = 'libro' then n := greatest(n, seg);
      end if;
      n := least(n, (m ->> 'meta')::int);
      m := m || jsonb_build_object('hecho', n);
      if n >= (m ->> 'meta')::int then
        m := m || jsonb_build_object('estado', 'lista');
        xp := xp + 40;
      end if;
    end if;
    ms := ms || m;
  end loop;

  update public.corazones set misiones = ms, xp_cubo = r.xp_cubo, xp_cubo_t = now(), xp_auto_dia = r.xp_auto_dia, xp_auto_hoy = r.xp_auto_hoy,
    xp_hoy = xp_hoy + xp, xp_saldo = xp_saldo + xp, actualizado = now() where usuario = uid;
  if xp > 0 then
    insert into public.xp_semana (usuario, semana, xp) values (uid, public.cz_lunes(), xp)
    on conflict (usuario, semana) do update set xp = public.xp_semana.xp + excluded.xp;
  end if;
  -- Registro del envío (para Panel → Top XP → Revisar trampas)
  if ok + mal > 0 then
    insert into public.xp_envios (usuario, fuente, ok, mal, xp) values (uid, fuente, ok, mal, xp);
  end if;
  return public.cz_estado(uid) || jsonb_build_object('ganado', xp);
end $$;
revoke all on function public.sumar_xp(jsonb) from public, anon;
grant execute on function public.sumar_xp(jsonb) to authenticated;

-- ---------- Empezar: si hay una partida a medias, sigue esa ----------
create or replace function public.guerra_empezar()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); mio bigint; viva date := public.guerra_ronda_viva(); n integer; s integer; pid bigint; g public.guerra_partidas;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select clan into mio from public.clan_miembros where usuario = uid;
  if mio is null then raise exception 'sin_clan'; end if;
  perform pg_advisory_xact_lock(hashtext('guerra:' || uid::text));
  perform public.guerra_cerrar_viejas();
  -- ¿Tiene una partida a medias (se cortó hace menos de 15 min)? Sigue esa
  select * into g from public.guerra_partidas x where x.usuario = uid and x.termino is null order by x.id desc limit 1;
  if g.id is not null then
    return jsonb_build_object('id', g.id, 'semilla', g.semilla, 'ronda', g.ronda, 'ronda_n', public.guerra_ronda_n(g.ronda), 'reanudar', true,
      'n', g.avance_n, 'puntos', g.avance_puntos, 'correctas', g.avance_correctas, 'combo', g.avance_combo);
  end if;
  if viva is null then raise exception 'guerra_cerrada'; end if;
  select count(*) into n from public.guerra_partidas where usuario = uid and ronda = viva;
  if n >= 5 then raise exception 'sin_partidas'; end if;
  s := floor(random() * 2000000000)::integer;
  insert into public.guerra_partidas (usuario, clan, temporada, ronda, semilla)
  values (uid, mio, public.guerra_temp_de(viva), viva, s) returning id into pid;
  return jsonb_build_object('id', pid, 'semilla', s, 'ronda', viva, 'ronda_n', public.guerra_ronda_n(viva), 'quedan', 4 - n);
end $$;
revoke all on function public.guerra_empezar() from public, anon;
grant execute on function public.guerra_empezar() to authenticated;

-- ---------- Terminar ----------
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
  if seg < c * 1.5 then pts := 0; c := 0; end if;
  -- Si se cortó y pasaron más de 15 min sin responder, vale lo que llevaba guardado
  if now() - coalesce(g.avance_t, g.empezo) > interval '15 minutes' then
    c := least(g.avance_correctas, 10); pts := least(g.avance_puntos, c * 250);
  end if;
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

-- ---------- Ver: cierra las partidas cortadas y dice si tienes una a medias ----------
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
  perform public.guerra_cerrar_viejas();
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
        'abierta', (select jsonb_build_object('id', x.id, 'n', x.avance_n, 'puntos', x.avance_puntos) from public.guerra_partidas x where x.usuario = uid and x.termino is null order by x.id desc limit 1),
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

-- ---------- Panel → Clanes: partidas más altas de la temporada y anularlas ----------
create or replace function public.guerra_admin_partidas(p_temp integer default null, p_lim integer default 60)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare t integer := coalesce(p_temp, greatest(1, public.guerra_temp_de(public.guerra_hoy())));
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  return jsonb_build_object('temporada', t, 'partidas', coalesce((
    select jsonb_agg(x order by (x ->> 'puntos')::integer desc, (x ->> 'id')::bigint desc) from (
      select jsonb_build_object('id', g.id, 'jugador', public.jugador_codigo(g.usuario), 'apodo', public.duelo_apodo(g.usuario),
             'clan', (select k.nombre from public.clanes k where k.id = g.clan), 'ronda', public.guerra_ronda_n(g.ronda), 'fecha', g.ronda,
             'puntos', g.puntos, 'correctas', g.correctas, 'combo', g.combo, 'anulada', g.anulada,
             'segundos', round(extract(epoch from g.termino - g.empezo))) as x
        from public.guerra_partidas g
       where g.temporada = t and g.termino is not null and (g.puntos > 0 or g.anulada)
       order by g.puntos desc, g.id desc
       limit least(greatest(coalesce(p_lim, 60), 1), 300)) z), '[]'::jsonb));
end $$;
revoke all on function public.guerra_admin_partidas(integer, integer) from public, anon;
grant execute on function public.guerra_admin_partidas(integer, integer) to authenticated;

create or replace function public.guerra_admin_anular(p_id bigint)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare g public.guerra_partidas;
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  select * into g from public.guerra_partidas where id = p_id for update;
  if g.id is null then raise exception 'No existe esa partida'; end if;
  update public.guerra_partidas set puntos = 0, correctas = 0, anulada = true where id = g.id;
  perform public.anotar('Clanes', 'Anuló una partida de la guerra (ID ' || public.jugador_codigo(g.usuario) || ', ' || g.puntos || ' pts)',
    jsonb_build_object('partida', g.id, 'jugador', public.jugador_codigo(g.usuario), 'puntos', g.puntos, 'ronda', g.ronda));
end $$;
revoke all on function public.guerra_admin_anular(bigint) from public, anon;
grant execute on function public.guerra_admin_anular(bigint) to authenticated;
