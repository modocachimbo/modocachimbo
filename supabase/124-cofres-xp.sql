-- =========================================================
-- Modo Cachimbo · 124: Cofres por XP (no por preguntas)
-- Cofres del clan: XP de la semana de todos los miembros + misiones del clan.
--   Meta = XP por miembro × miembros (mínimo 5):
--   Bronce 2 500 · Plata 7 500 · Oro 15 000 · Amatista 30 000 · Leyenda 50 000 por miembro
--   10 miembros: 25 mil / 75 mil / 150 mil / 300 mil / 500 mil · 20 miembros: hasta 1 millón
--   Para abrir: al menos 1 500 XP propios en la semana.
-- Cofres personales: puntos = XP propio de la semana + 1 000 por día con meta + 2 000 por clan vs clan (máx. 5)
--   + 3 000 por simulacro (máx. 3). Metas 5 000 / 15 000 / 30 000 / 50 000.
-- Correr después de 123.
-- =========================================================

-- XP de la semana de un alumno
create or replace function public.xp_semana_de(u uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce((select x.xp from public.xp_semana x where x.usuario = u and x.semana = public.cz_lunes()), 0)::integer
$$;
revoke all on function public.xp_semana_de(uuid) from public, anon, authenticated;

alter table public.clan_cofres_cfg drop constraint if exists clan_cofres_cfg_por_miembro_check;
alter table public.clan_cofres_cfg add constraint clan_cofres_cfg_por_miembro_check check (por_miembro between 1 and 1000000);
update public.clan_cofres_cfg set por_miembro = v.pm
from (values (1, 2500), (2, 7500), (3, 15000), (4, 30000), (5, 50000)) as v(n, pm)
where public.clan_cofres_cfg.n = v.n;
update public.clan_premios_yo_cfg set meta = v.meta
from (values (1, 5000), (2, 15000), (3, 30000), (4, 50000)) as v(n, meta)
where public.clan_premios_yo_cfg.n = v.n;

create or replace function public.clan_cofre_minimo() returns integer language sql immutable as $$ select 1500 $$;

-- Misiones del clan: el extra ahora es XP
create or replace function public.clan_misiones(c bigint)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare nm integer; b integer; lunes date := public.cz_lunes(); lts timestamptz := public.cz_lunes_ts();
  v_duelos integer := 0; v_racha integer; v_sim integer; v_todos integer; d public.duelos; k integer;
begin
  select count(*) into nm from public.clan_miembros m where m.clan = c;
  b := greatest(nm, 5);
  -- 1) Ganar clan vs clan
  for d in select * from public.duelos x where x.clan_b is not null and (x.clan_a = c or x.clan_b = c) and x.empieza >= lts loop
    if (public.duelo_clan_info(d) ->> 'ganador')::bigint = c then v_duelos := v_duelos + 1; end if;
  end loop;
  -- 2) Miembros que cumplieron su meta diaria 3 días o más
  select count(*) into v_racha from (
    select a.usuario from public.actividad a join public.clan_miembros m on m.usuario = a.usuario and m.clan = c
    where a.fecha >= lunes and a.preguntas >= coalesce(a.meta, 10) group by a.usuario having count(*) >= 3) t;
  -- 3) Miembros que terminaron un simulacro
  select count(distinct s.usuario) into v_sim from public.simulacro_intentos s join public.clan_miembros m on m.usuario = s.usuario and m.clan = c
    where s.creado >= lts;
  -- 4) Miembros con 20 preguntas o más
  select count(*) into v_todos from public.clan_miembros m where m.clan = c and public.preguntas_semana(m.usuario) >= 20;
  k := least(5, nm);
  return jsonb_build_array(
    jsonb_build_object('id', 'duelos', 'titulo', 'Ganar 2 clan vs clan', 'prog', least(v_duelos, 2), 'meta', 2, 'bonus', 1200 * b),
    jsonb_build_object('id', 'racha', 'titulo', k || (case when k = 1 then ' miembro cumple' else ' miembros cumplen' end) || ' su meta 3 días', 'prog', least(v_racha, k), 'meta', k, 'bonus', 800 * b),
    jsonb_build_object('id', 'simulacro', 'titulo', least(3, nm) || (case when least(3, nm) = 1 then ' miembro termina' else ' miembros terminan' end) || ' un simulacro', 'prog', least(v_sim, least(3, nm)), 'meta', least(3, nm), 'bonus', 1200 * b),
    jsonb_build_object('id', 'todos', 'titulo', 'Todos responden al menos 20 preguntas', 'prog', v_todos, 'meta', nm, 'bonus', 1600 * b)
  );
end $$;
revoke all on function public.clan_misiones(bigint) from public, anon, authenticated;

-- Lo que ve el alumno en Mi clan (XP)
create or replace function public.clan_cofres()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); m public.clan_miembros; nm integer; b integer; v_total integer; v_bonus integer := 0; v_mio integer;
  mis jsonb; x jsonb; lunes date := public.cz_lunes();
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into m from public.clan_miembros where usuario = uid;
  if m.clan is null then raise exception 'sin_clan'; end if;
  select count(*) into nm from public.clan_miembros k where k.clan = m.clan;
  b := greatest(nm, 5);
  v_total := public.clan_xp_semana(m.clan);
  mis := public.clan_misiones(m.clan);
  for x in select * from jsonb_array_elements(mis) loop
    if (x ->> 'prog')::integer >= (x ->> 'meta')::integer and (x ->> 'meta')::integer > 0 then v_bonus := v_bonus + (x ->> 'bonus')::integer; end if;
  end loop;
  v_mio := public.xp_semana_de(uid);
  return jsonb_build_object(
    'semana', lunes, 'cierra', ((lunes + 7)::timestamp at time zone 'America/Lima'),
    'miembros', nm, 'xp', v_total, 'bonus', v_bonus, 'puntos', v_total + v_bonus,
    'mio', v_mio, 'minimo', public.clan_cofre_minimo(),
    'cofres', (select jsonb_agg(jsonb_build_object('n', f.n, 'nombre', f.nombre, 'meta', f.por_miembro * b,
        'xp', f.xp, 'rayos', f.rayos, 'tickets', f.tickets, 'item', f.item,
        'item_nom', (select i.nom from public.coleccion_item i where i.id = f.item),
        'abierto', exists (select 1 from public.clan_cofres_abiertos o where o.usuario = uid and o.semana = lunes and o.n = f.n),
        'abrieron', (select count(*) from public.clan_cofres_abiertos o where o.clan = m.clan and o.semana = lunes and o.n = f.n)) order by f.n)
      from public.clan_cofres_cfg f),
    'misiones', mis,
    'aportes', coalesce((select jsonb_agg(t.j order by t.p desc) from (
        select public.amigo_mini(k.usuario) || jsonb_build_object('xp', public.xp_semana_de(k.usuario), 'yo', k.usuario = uid) as j,
               public.xp_semana_de(k.usuario) as p
        from public.clan_miembros k where k.clan = m.clan) t), '[]'::jsonb),
    'actividad', coalesce((select jsonb_agg(e.j order by e.cuando desc) from (
        (select public.amigo_mini(o.usuario) || jsonb_build_object('tipo', 'cofre', 'n', o.n, 'nombre', f.nombre, 'yo', o.usuario = uid, 'cuando', o.cuando) as j, o.cuando
          from public.clan_cofres_abiertos o join public.clan_cofres_cfg f on f.n = o.n
          where o.clan = m.clan and o.cuando > now() - interval '7 days' order by o.cuando desc limit 12)
        union all
        (select public.amigo_mini(a.usuario) || jsonb_build_object('tipo', 'aporte', 'preguntas', a.preguntas, 'yo', a.usuario = uid, 'fecha', a.fecha,
                 'cuando', (a.fecha::timestamp + interval '12 hours') at time zone 'America/Lima') as j,
                (a.fecha::timestamp + interval '12 hours') at time zone 'America/Lima' as cuando
          from public.actividad a join public.clan_miembros k on k.usuario = a.usuario and k.clan = m.clan
          where a.fecha >= public.cz_hoy() - 1 and a.preguntas >= 20 order by a.fecha desc, a.preguntas desc limit 8)
      ) e), '[]'::jsonb)
  );
end $$;
revoke all on function public.clan_cofres() from public, anon;
grant execute on function public.clan_cofres() to authenticated;

create or replace function public.clan_cofre_abrir(p_n integer)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); m public.clan_miembros; f public.clan_cofres_cfg; d jsonb; meta integer; lunes date := public.cz_lunes(); pr jsonb; nuevo boolean := false;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into m from public.clan_miembros where usuario = uid;
  if m.clan is null then raise exception 'sin_clan'; end if;
  select * into f from public.clan_cofres_cfg where n = p_n;
  if f.n is null then raise exception 'cofre_no_existe'; end if;
  perform pg_advisory_xact_lock(hashtext('cofre:' || uid::text));
  if exists (select 1 from public.clan_cofres_abiertos o where o.usuario = uid and o.semana = lunes and o.n = p_n) then raise exception 'cofre_ya_abierto'; end if;
  if public.xp_semana_de(uid) < public.clan_cofre_minimo() then raise exception 'cofre_poco_xp'; end if;
  d := public.clan_cofres();
  meta := (d -> 'cofres' -> (p_n - 1) ->> 'meta')::integer;
  if (d ->> 'puntos')::integer < meta then raise exception 'cofre_cerrado'; end if;

  if f.xp > 0 then
    perform public.cz_estado(uid);
    insert into public.xp_semana (usuario, semana, xp) values (uid, lunes, f.xp)
    on conflict (usuario, semana) do update set xp = public.xp_semana.xp + excluded.xp;
    update public.corazones set xp_saldo = xp_saldo + f.xp, actualizado = now() where usuario = uid;
  end if;
  if f.rayos > 0 then
    insert into public.lab_rayos (usuario, clave, cantidad) values (uid, 'cofre:' || lunes || ':' || p_n, f.rayos) on conflict do nothing;
  end if;
  if f.tickets > 0 then perform public.sala_tickets_sumar(uid, f.tickets); end if;
  if f.item is not null and exists (select 1 from public.coleccion_item i where i.id = f.item) then
    insert into public.coleccion_mia (usuario, item, origen, mensaje) values (uid, f.item, 'evento', 'Cofre ' || f.nombre || ' del clan')
    on conflict (usuario, item) do nothing;
    nuevo := found;
  end if;
  pr := jsonb_build_object('n', f.n, 'nombre', f.nombre, 'xp', f.xp, 'rayos', f.rayos, 'tickets', f.tickets,
    'item', case when nuevo then f.item end, 'item_nom', case when nuevo then (select i.nom from public.coleccion_item i where i.id = f.item) end);
  insert into public.clan_cofres_abiertos (usuario, semana, n, clan, premio) values (uid, lunes, p_n, m.clan, pr);
  return pr;
end $$;
revoke all on function public.clan_cofre_abrir(integer) from public, anon;
grant execute on function public.clan_cofre_abrir(integer) to authenticated;

-- Puntos personales por XP
create or replace function public.mi_actividad_clan(u uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare lunes date := public.cz_lunes(); lts timestamptz := public.cz_lunes_ts(); p integer; d integer; v integer; s integer;
begin
  p := public.xp_semana_de(u);
  select count(*) into d from public.actividad a where a.usuario = u and a.fecha >= lunes and a.preguntas >= coalesce(a.meta, 10);
  select count(*) into v from public.duelo_jugadas j join public.duelos x on x.id = j.duelo
    where j.usuario = u and x.clan_b is not null and x.empieza >= lts;
  select count(*) into s from public.simulacro_intentos i where i.usuario = u and i.creado >= lts;
  return jsonb_build_object('puntos', p + 1000 * d + 2000 * least(v, 5) + 3000 * least(s, 3), 'fuentes', jsonb_build_array(
    jsonb_build_object('id', 'preguntas', 'titulo', 'Gana XP', 'detalle', '1 punto por cada XP', 'cant', p, 'max', null, 'puntos', p),
    jsonb_build_object('id', 'meta', 'titulo', 'Cumple tu meta del día', 'detalle', '+1 000 por día', 'cant', d, 'max', 7, 'puntos', 1000 * d),
    jsonb_build_object('id', 'clanvs', 'titulo', 'Juega clan vs clan', 'detalle', '+2 000 por partida', 'cant', least(v, 5), 'max', 5, 'puntos', 2000 * least(v, 5)),
    jsonb_build_object('id', 'simulacro', 'titulo', 'Termina un simulacro', 'detalle', '+3 000 por simulacro', 'cant', least(s, 3), 'max', 3, 'puntos', 3000 * least(s, 3))));
end $$;
revoke all on function public.mi_actividad_clan(uuid) from public, anon, authenticated;
