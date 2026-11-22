-- =========================================================
-- Modo Cachimbo · 120: ID del clan, ingreso (abierto o con aprobación, nivel y rango mínimos),
-- eslogan y etiquetas, y recompensas personales de la semana ("Para mí").
-- Correr después de 119.
-- =========================================================

-- ---------- Datos nuevos del clan ----------
alter table public.clanes add column if not exists aprobacion text not null default 'abierto';
alter table public.clanes drop constraint if exists clanes_aprobacion_check;
alter table public.clanes add constraint clanes_aprobacion_check check (aprobacion in ('abierto', 'solicitud'));
alter table public.clanes add column if not exists min_nivel integer not null default 0;
alter table public.clanes drop constraint if exists clanes_min_nivel_check;
alter table public.clanes add constraint clanes_min_nivel_check check (min_nivel between 0 and 100);
alter table public.clanes add column if not exists min_rango integer not null default 0;   -- 0 cualquiera, 1 Bronce … 7 Leyenda
alter table public.clanes drop constraint if exists clanes_min_rango_check;
alter table public.clanes add constraint clanes_min_rango_check check (min_rango between 0 and 7);
alter table public.clanes add column if not exists eslogan text not null default '';
alter table public.clanes drop constraint if exists clanes_eslogan_check;
alter table public.clanes add constraint clanes_eslogan_check check (char_length(eslogan) <= 60);
alter table public.clanes add column if not exists etiquetas text[] not null default '{}';
alter table public.clanes drop constraint if exists clanes_etiquetas_check;
alter table public.clanes add constraint clanes_etiquetas_check check (cardinality(etiquetas) <= 3 and etiquetas <@ array[
  'competitivo', 'relajado', 'ciencias', 'letras', 'ingenierias', 'salud', 'madrugadores', 'nocturnos', 'constancia', 'simulacros']::text[]);

-- ID público del clan (7 cifras, no cambia nunca)
create or replace function public.clan_id_publico(c bigint) returns integer language sql immutable as $$ select (1000000 + c)::integer $$;

-- Nivel del alumno (igual que la tarjeta: 1 + raíz(XP total / 100))
create or replace function public.jugador_nivel(u uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select 1 + floor(sqrt(greatest(0, public.jugador_xp_total(u)) / 100.0))::integer;
$$;
revoke all on function public.jugador_nivel(uuid) from public, anon, authenticated;

-- Rango del alumno: el mejor entre esta semana y la anterior (1 Bronce … 7 Leyenda, 0 sin rango)
create or replace function public.jugador_rango_grupo(u uuid)
returns integer language sql stable security definer set search_path = '' as $$
  with x as (select coalesce(max(s.xp), 0) as xp from public.xp_semana s where s.usuario = u and s.semana >= public.cz_lunes() - 7)
  select case when x.xp >= 60000 then 7 when x.xp >= 23000 then 6 when x.xp >= 14000 then 5 when x.xp >= 7700 then 4
              when x.xp >= 4300 then 3 when x.xp >= 1900 then 2 when x.xp >= 20 then 1 else 0 end from x;
$$;
revoke all on function public.jugador_rango_grupo(uuid) from public, anon, authenticated;

-- ¿Cumple los requisitos? null = sí; si no, el motivo
create or replace function public.clan_cumple(u uuid, c public.clanes)
returns text language sql stable security definer set search_path = '' as $$
  select case when c.min_nivel > 0 and public.jugador_nivel(u) < c.min_nivel then 'nivel_bajo'
              when c.min_rango > 0 and public.jugador_rango_grupo(u) < c.min_rango then 'rango_bajo' end;
$$;
revoke all on function public.clan_cumple(uuid, public.clanes) from public, anon, authenticated;

-- clan_logros ahora también lleva ID, ingreso, eslogan y etiquetas (lo usan mi_clan, el top y las vistas previas)
create or replace function public.clan_logros(c bigint)
returns jsonb language sql stable security definer set search_path = '' as $$
  with cerradas as (
    select s.clan, s.semana, s.xp, s.meta, rank() over (partition by s.semana order by s.xp desc) as puesto
    from public.clan_semanas s where s.semana < public.cz_lunes() and s.xp > 0
  )
  select jsonb_build_object(
    'nivel', 1 + (select count(*) from cerradas k where k.clan = c and k.xp >= k.meta),
    'copas', (select count(*) from cerradas k where k.clan = c and k.puesto <= 3),
    'victorias', public.clan_victorias(c),
    'id_publico', public.clan_id_publico(c)
  ) || coalesce((select jsonb_build_object('aprobacion', k.aprobacion, 'min_nivel', k.min_nivel, 'min_rango', k.min_rango,
       'eslogan', k.eslogan, 'etiquetas', to_jsonb(k.etiquetas)) from public.clanes k where k.id = c), '{}'::jsonb);
$$;
revoke all on function public.clan_logros(bigint) from public, anon, authenticated;

-- Buscar un clan por código (4 letras) o por ID (7 cifras)
create or replace function public.clan_buscar_fila(p text)
returns public.clanes language plpgsql stable security definer set search_path = '' as $$
declare c public.clanes; t text := upper(regexp_replace(coalesce(p, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if t ~ '^[0-9]{7}$' then select * into c from public.clanes where id = t::bigint - 1000000 and not cerrado;
  else select * into c from public.clanes where codigo = t and not cerrado; end if;
  return c;
end $$;
revoke all on function public.clan_buscar_fila(text) from public, anon, authenticated;

create or replace function public.clan_por_codigo(p_codigo text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); c public.clanes; n integer;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  c := public.clan_buscar_fila(p_codigo);
  if c.id is null then return null; end if;
  select count(*) into n from public.clan_miembros where clan = c.id;
  return jsonb_build_object('id', c.id, 'nombre', c.nombre, 'tag', c.tag, 'forma', c.forma, 'simbolo', c.simbolo, 'color', c.color,
    'oficial', c.oficial, 'miembros', n, 'xp', public.clan_xp_semana(c.id), 'no_cumple', public.clan_cumple(uid, c),
    'mi_nivel', public.jugador_nivel(uid), 'mi_rango', public.jugador_rango_grupo(uid),
    'pedido', exists (select 1 from public.clan_solicitudes s where s.usuario = uid and s.clan = c.id)) || public.clan_logros(c.id);
end $$;
revoke all on function public.clan_por_codigo(text) from public, anon;
grant execute on function public.clan_por_codigo(text) to authenticated;

-- Entrar a un clan (código o ID): abierto = entra si cumple; con aprobación = queda como pedido
create or replace function public.clan_unirse(p_codigo text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); c public.clanes; x text;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if exists (select 1 from public.clan_miembros where usuario = uid) then raise exception 'ya_en_clan'; end if;
  if public.clan_espera(uid) then raise exception 'espera'; end if;
  c := public.clan_buscar_fila(p_codigo);
  if c.id is null then raise exception 'no_existe'; end if;
  perform 1 from public.clanes where id = c.id for update;
  if (select count(*) from public.clan_miembros where clan = c.id) >= 20 then raise exception 'lleno'; end if;
  x := public.clan_cumple(uid, c);
  if x is not null then raise exception '%', x; end if;
  if c.aprobacion = 'solicitud' then
    return public.clan_pedir(c.id) || jsonb_build_object('pendiente', true);
  end if;
  insert into public.clan_miembros (usuario, clan, rol) values (uid, c.id, 'miembro');
  delete from public.clan_solicitudes where usuario = uid;
  return jsonb_build_object('id', c.id, 'nombre', c.nombre);
end $$;
revoke all on function public.clan_unirse(text) from public, anon;
grant execute on function public.clan_unirse(text) to authenticated;

-- Pedir entrar desde el Top: si el clan es abierto y cumples, entras de una
create or replace function public.clan_pedir(p_clan bigint)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); c public.clanes; x text;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if exists (select 1 from public.clan_miembros where usuario = uid) then raise exception 'ya_en_clan'; end if;
  if public.clan_espera(uid) then raise exception 'espera'; end if;
  select * into c from public.clanes where id = p_clan and not cerrado;
  if c.id is null then raise exception 'no_existe'; end if;
  if (select count(*) from public.clan_miembros where clan = c.id) >= 20 then raise exception 'lleno'; end if;
  x := public.clan_cumple(uid, c);
  if x is not null then raise exception '%', x; end if;
  if c.aprobacion = 'abierto' then
    perform 1 from public.clanes where id = c.id for update;
    insert into public.clan_miembros (usuario, clan, rol) values (uid, c.id, 'miembro');
    delete from public.clan_solicitudes where usuario = uid;
    return jsonb_build_object('ok', true, 'unido', true, 'nombre', c.nombre);
  end if;
  delete from public.clan_solicitudes where usuario = uid and not public.clan_sol_viva(creado);
  if not exists (select 1 from public.clan_solicitudes where usuario = uid and clan = c.id)
     and (select count(*) from public.clan_solicitudes where usuario = uid) >= 3 then raise exception 'muchos_pedidos'; end if;
  insert into public.clan_solicitudes (usuario, clan) values (uid, c.id)
    on conflict (usuario, clan) do update set creado = now();
  return jsonb_build_object('ok', true, 'nombre', c.nombre);
end $$;
revoke all on function public.clan_pedir(bigint) from public, anon;
grant execute on function public.clan_pedir(bigint) to authenticated;

-- Ajustes del líder: ingreso, nivel y rango mínimos, eslogan y etiquetas
create or replace function public.clan_config(p jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); m public.clan_miembros; et text[];
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into m from public.clan_miembros where usuario = uid;
  if m.clan is null then raise exception 'sin_clan'; end if;
  if m.rol <> 'lider' then raise exception 'no_lider'; end if;
  select coalesce(array_agg(distinct v), '{}') into et from jsonb_array_elements_text(coalesce(p -> 'etiquetas', '[]'::jsonb)) v
    where v = any (array['competitivo', 'relajado', 'ciencias', 'letras', 'ingenierias', 'salud', 'madrugadores', 'nocturnos', 'constancia', 'simulacros']);
  if public.clan_nombre_feo(coalesce(p ->> 'eslogan', '')) then raise exception 'nombre_feo'; end if;
  update public.clanes set
    aprobacion = case when p ->> 'aprobacion' = 'solicitud' then 'solicitud' else 'abierto' end,
    min_nivel = greatest(0, least(100, coalesce((p ->> 'min_nivel')::integer, 0))),
    min_rango = greatest(0, least(7, coalesce((p ->> 'min_rango')::integer, 0))),
    eslogan = left(trim(coalesce(p ->> 'eslogan', '')), 60),
    etiquetas = et[1:3]
  where id = m.clan;
  return public.clan_logros(m.clan);
end $$;
revoke all on function public.clan_config(jsonb) from public, anon;
grant execute on function public.clan_config(jsonb) to authenticated;

-- ---------- Recompensas personales de la semana ("Para mí") ----------
create table if not exists public.clan_premios_yo_cfg (
  n        integer primary key check (n between 1 and 4),
  meta     integer not null check (meta between 1 and 100000),   -- puntos de actividad propios
  xp       integer not null default 0 check (xp between 0 and 2000),
  rayos    integer not null default 0 check (rayos between 0 and 1000),
  tickets  integer not null default 0 check (tickets between 0 and 10)
);
insert into public.clan_premios_yo_cfg (n, meta, xp, rayos, tickets) values
  (1, 100, 20, 5, 0), (2, 300, 40, 15, 0), (3, 600, 70, 25, 1), (4, 1000, 120, 40, 1)
on conflict (n) do nothing;
alter table public.clan_premios_yo_cfg enable row level security;

-- Los personales se guardan en clan_cofres_abiertos con n = 11..14
alter table public.clan_cofres_abiertos drop constraint if exists clan_cofres_abiertos_n_check;
alter table public.clan_cofres_abiertos add constraint clan_cofres_abiertos_n_check check (n between 1 and 5 or n between 11 and 14);

-- Puntos de actividad propios: 1 por pregunta, +30 por día que cumples tu meta, +60 por clan vs clan jugado (máx. 5), +80 por simulacro (máx. 3)
create or replace function public.mi_actividad_clan(u uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare lunes date := public.cz_lunes(); lts timestamptz := public.cz_lunes_ts(); p integer; d integer; v integer; s integer;
begin
  p := public.preguntas_semana(u);
  select count(*) into d from public.actividad a where a.usuario = u and a.fecha >= lunes and a.preguntas >= coalesce(a.meta, 10);
  select count(*) into v from public.duelo_jugadas j join public.duelos x on x.id = j.duelo
    where j.usuario = u and x.clan_b is not null and x.empieza >= lts;
  select count(*) into s from public.simulacro_intentos i where i.usuario = u and i.creado >= lts;
  return jsonb_build_object('puntos', p + 30 * d + 60 * least(v, 5) + 80 * least(s, 3), 'fuentes', jsonb_build_array(
    jsonb_build_object('id', 'preguntas', 'titulo', 'Responde preguntas', 'detalle', '1 punto por pregunta', 'cant', p, 'max', null, 'puntos', p),
    jsonb_build_object('id', 'meta', 'titulo', 'Cumple tu meta del día', 'detalle', '+30 por día', 'cant', d, 'max', 7, 'puntos', 30 * d),
    jsonb_build_object('id', 'clanvs', 'titulo', 'Juega clan vs clan', 'detalle', '+60 por partida', 'cant', least(v, 5), 'max', 5, 'puntos', 60 * least(v, 5)),
    jsonb_build_object('id', 'simulacro', 'titulo', 'Termina un simulacro', 'detalle', '+80 por simulacro', 'cant', least(s, 3), 'max', 3, 'puntos', 80 * least(s, 3))));
end $$;
revoke all on function public.mi_actividad_clan(uuid) from public, anon, authenticated;

-- Lo que ve el alumno en "Recompensas → Para mí"
create or replace function public.clan_premios_yo()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); lunes date := public.cz_lunes(); a jsonb;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if not exists (select 1 from public.clan_miembros where usuario = uid) then raise exception 'sin_clan'; end if;
  a := public.mi_actividad_clan(uid);
  return a || jsonb_build_object('cierra', ((lunes + 7)::timestamp at time zone 'America/Lima'),
    'premios', (select jsonb_agg(jsonb_build_object('n', f.n, 'meta', f.meta, 'xp', f.xp, 'rayos', f.rayos, 'tickets', f.tickets,
        'abierto', exists (select 1 from public.clan_cofres_abiertos o where o.usuario = uid and o.semana = lunes and o.n = 10 + f.n)) order by f.n)
      from public.clan_premios_yo_cfg f));
end $$;
revoke all on function public.clan_premios_yo() from public, anon;
grant execute on function public.clan_premios_yo() to authenticated;

create or replace function public.clan_premio_yo_abrir(p_n integer)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); m public.clan_miembros; f public.clan_premios_yo_cfg; lunes date := public.cz_lunes(); pr jsonb;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into m from public.clan_miembros where usuario = uid;
  if m.clan is null then raise exception 'sin_clan'; end if;
  select * into f from public.clan_premios_yo_cfg where n = p_n;
  if f.n is null then raise exception 'cofre_no_existe'; end if;
  perform pg_advisory_xact_lock(hashtext('cofre:' || uid::text));
  if exists (select 1 from public.clan_cofres_abiertos o where o.usuario = uid and o.semana = lunes and o.n = 10 + p_n) then raise exception 'cofre_ya_abierto'; end if;
  if (public.mi_actividad_clan(uid) ->> 'puntos')::integer < f.meta then raise exception 'premio_sin_puntos'; end if;
  if f.xp > 0 then
    perform public.cz_estado(uid);
    insert into public.xp_semana (usuario, semana, xp) values (uid, lunes, f.xp)
    on conflict (usuario, semana) do update set xp = public.xp_semana.xp + excluded.xp;
    update public.corazones set xp_saldo = xp_saldo + f.xp, actualizado = now() where usuario = uid;
  end if;
  if f.rayos > 0 then
    insert into public.lab_rayos (usuario, clave, cantidad) values (uid, 'premioyo:' || lunes || ':' || p_n, f.rayos) on conflict do nothing;
  end if;
  if f.tickets > 0 then perform public.sala_tickets_sumar(uid, f.tickets); end if;
  pr := jsonb_build_object('n', f.n, 'nombre', 'Recompensa ' || f.n, 'xp', f.xp, 'rayos', f.rayos, 'tickets', f.tickets);
  insert into public.clan_cofres_abiertos (usuario, semana, n, clan, premio) values (uid, lunes, 10 + p_n, m.clan, pr);
  return pr;
end $$;
revoke all on function public.clan_premio_yo_abrir(integer) from public, anon;
grant execute on function public.clan_premio_yo_abrir(integer) to authenticated;
