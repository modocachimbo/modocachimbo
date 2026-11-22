-- =========================================================
-- Modo Cachimbo · Clan vs Clan = duelo en modo clan (equipos).
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr.
-- Necesita 88/89 (clanes), 104 (tickets de sala), 111–116 (duelos v3/v4).
--
--   · El líder o un sublíder crea la sala (2 vs 2 o 3 vs 3) con los
--     comodines del duelo. Comparte el código de 6 del duelo.
--   · El primer líder o sublíder de OTRO clan que entra vuelve a su
--     clan el rival. Los miembros entran del lado de su clan.
--   · Crear es gratis; al dar «Empezar» se usa 1 ticket de sala de
--     quien la creó (si no empieza, no se gasta nada).
--   · Ataques (Glaciar, Sismo, Arenas, Llamarada, Volcán) y Botín
--     solo tocan al clan rival, nunca a tu compañero.
--   · Gana el clan con mejor PROMEDIO de puntos por jugador.
--   · El XP de cada jugador es el mismo del duelo (por su puesto).
-- =========================================================

alter table public.duelos add column if not exists clan_a bigint references public.clanes (id) on delete set null;
alter table public.duelos add column if not exists clan_b bigint references public.clanes (id) on delete set null;
alter table public.duelos add column if not exists por_lado integer check (por_lado is null or por_lado between 1 and 3);
alter table public.duelo_jugadas add column if not exists clan bigint;

-- ¿b es rival de a? En un duelo normal, todos son rivales; en modo clan, solo el otro clan.
create or replace function public.duelo_rival(d public.duelos, a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select d.clan_a is null or
    (select x.clan from public.duelo_jugadas x where x.duelo = d.id and x.usuario = a) is distinct from
    (select x.clan from public.duelo_jugadas x where x.duelo = d.id and x.usuario = b);
$$;
revoke all on function public.duelo_rival(public.duelos, uuid, uuid) from public, anon, authenticated;

-- Datos del modo clan para ver_duelo: escudos, promedio de cada lado y ganador
create or replace function public.duelo_clan_info(d public.duelos)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare pa numeric; pb numeric; listo boolean;
begin
  if d.clan_a is null then return null; end if;
  select avg(x.puntos) into pa from public.duelo_jugadas x where x.duelo = d.id and x.clan = d.clan_a;
  select avg(x.puntos) into pb from public.duelo_jugadas x where x.duelo = d.id and x.clan = d.clan_b;
  select r.listo into listo from public.duelo_resultado(d) r;
  return jsonb_build_object(
    'por_lado', d.por_lado,
    'clanes', jsonb_build_array(public.clan_mini(d.clan_a), case when d.clan_b is not null then public.clan_mini(d.clan_b) end),
    'prom', jsonb_build_array(round(coalesce(pa, 0), 1), round(coalesce(pb, 0), 1)),
    'ganador', case when listo and d.clan_b is not null then
                 case when coalesce(pa, 0) > coalesce(pb, 0) then d.clan_a when coalesce(pb, 0) > coalesce(pa, 0) then d.clan_b end end,
    'listo', coalesce(listo, false));
end $$;
revoke all on function public.duelo_clan_info(public.duelos) from public, anon, authenticated;

-- Crear la sala de clan (líder o sublíder). p = lo mismo que crear_duelo + por_lado (2 o 3)
create or replace function public.clan_duelo_crear(p jsonb)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); m public.clan_miembros; lado integer; cod text;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into m from public.clan_miembros x where x.usuario = uid;
  if m.clan is null then raise exception 'sin_clan'; end if;
  if m.rol = 'miembro' then raise exception 'no_lider'; end if;
  if public.sala_tickets_de(uid) < 1 then raise exception 'sin_ticket'; end if;
  if exists (select 1 from public.duelos x where (x.clan_a = m.clan or x.clan_b = m.clan) and x.empieza is null and x.vence > now()) then
    raise exception 'sala_abierta';
  end if;
  lado := case when p ->> 'por_lado' in ('2', '3') then (p ->> 'por_lado')::integer else 3 end;
  cod := public.crear_duelo(p || jsonb_build_object('jugadores', (lado * 2)::text, 'comodines', 'true', 'auto', false));
  update public.duelos x set clan_a = m.clan, por_lado = lado, vence = now() + interval '15 minutes' where x.codigo = cod;
  update public.duelo_jugadas j set clan = m.clan where j.duelo = (select x.id from public.duelos x where x.codigo = cod) and j.usuario = uid;
  return cod;
end $$;
revoke all on function public.clan_duelo_crear(jsonb) from public, anon;
grant execute on function public.clan_duelo_crear(jsonb) to authenticated;

-- La sala abierta (o en juego hace poco) de mi clan, para el botón en Clanes y la sala
create or replace function public.clan_duelo_mio()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('tickets', public.sala_tickets_de(auth.uid()), 'precio', (select c.precio_rayos from public.sala_config c where c.id = 1),
    'rayos', public.rayos_saldo(auth.uid()),
    'sala', (select jsonb_build_object('codigo', x.codigo, 'titulo', x.titulo, 'por_lado', x.por_lado,
                     'rival', (select k.nombre from public.clanes k where k.id = case when x.clan_a = m.clan then x.clan_b else x.clan_a end),
                     'empezo', x.empieza is not null)
             from public.duelos x where (x.clan_a = m.clan or x.clan_b = m.clan)
               and ((x.empieza is null and x.vence > now()) or x.empieza > now() - interval '20 minutes')
             order by x.creado desc limit 1))
  from (select (select y.clan from public.clan_miembros y where y.usuario = auth.uid()) as clan) m;
$$;
revoke all on function public.clan_duelo_mio() from public, anon;
grant execute on function public.clan_duelo_mio() to authenticated;

-- ---------- Funciones del duelo con el modo clan ----------

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
  -- Clan vs clan: entras al lado de tu clan; el primer líder o sublíder de otro clan lo vuelve rival
  if d.clan_a is not null then
    select * into m from public.clan_miembros x where x.usuario = uid;
    if m.clan is null then raise exception 'sala_sin_clan'; end if;
    if m.clan <> d.clan_a and d.clan_b is null then
      if m.rol = 'miembro' then raise exception 'sala_sin_rival'; end if;
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
      -- Crear la sala es gratis; al empezar se usa 1 ticket de quien la creó
      if public.sala_tickets_de(uid) < 1 then raise exception 'sin_ticket'; end if;
      perform public.sala_tickets_sumar(uid, -1);
    end if;
    perform public.duelo_arrancar(d.id);
  end if;
  return public.ver_duelo(p_codigo);
end $$;
revoke all on function public.iniciar_duelo(text) from public, anon;
grant execute on function public.iniciar_duelo(text) to authenticated;

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
             and public.duelo_rival(d, uid, j.usuario)
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
    if not exists (select 1 from public.duelo_jugadas o where o.duelo = d.id and o.usuario <> uid and o.puntos > j.puntos and public.duelo_rival(d, uid, o.usuario)) then
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
    for v in select * from public.duelo_jugadas o where o.duelo = d.id and o.usuario <> uid and o.puntos > j.puntos and public.duelo_rival(d, uid, o.usuario)
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
           'clan', t.clan,
           -- Los comodines de cada uno son secretos hasta la pantalla VS
           'mano', case when t.usuario = uid or d.empieza is not null then t.mano end
         ) order by case when r.listo then t.puesto end, t.color), '[]')
    into lista
  from (select u.*, j.mano, j.clan, (row_number() over (order by u.inicio, u.usuario))::integer - 1 as color
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
    'revancha', rev,
    'clan', public.duelo_clan_info(d)
  );
end $$;
revoke all on function public.ver_duelo(text) from public, anon;
grant execute on function public.ver_duelo(text) to authenticated;
