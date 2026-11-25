-- =========================================================
-- Modo Cachimbo · 119: Cofres y misiones semanales del clan
-- Cada pregunta que responde un miembro (tabla actividad) suma a la barra del clan.
-- 5 cofres por semana (Madera, Bronce, Plata, Oro, Leyenda). La meta crece con los miembros.
-- Lo abre cada miembro que aportó al menos 30 preguntas esa semana (una vez por cofre y semana,
-- aunque cambie de clan). Las misiones del clan suman preguntas extra a la barra.
-- Se reinicia cada lunes (hora de Lima). Correr después de 118.
-- =========================================================

-- ---------- Cofres: metas y premios (se pueden cambiar aquí) ----------
create table if not exists public.clan_cofres_cfg (
  n            integer primary key check (n between 1 and 5),
  nombre       text not null,
  por_miembro  integer not null check (por_miembro between 1 and 2000),  -- preguntas por miembro (mínimo se cuentan 5 miembros)
  xp           integer not null default 0 check (xp between 0 and 2000),
  rayos        integer not null default 0 check (rayos between 0 and 1000),
  tickets      integer not null default 0 check (tickets between 0 and 10),
  item         text                                                       -- ítem de colección opcional (id de coleccion_item)
);
insert into public.clan_cofres_cfg (n, nombre, por_miembro, xp, rayos, tickets) values
  (1, 'Madera',  25,  30, 10, 0),
  (2, 'Bronce',  65,  50, 20, 0),
  (3, 'Plata',  125,  80, 30, 1),
  (4, 'Oro',    185, 120, 50, 1),
  (5, 'Leyenda', 250, 200, 80, 2)
on conflict (n) do nothing;
alter table public.clan_cofres_cfg enable row level security;

-- Mínimo de preguntas propias en la semana para poder abrir
create or replace function public.clan_cofre_minimo() returns integer language sql immutable as $$ select 30 $$;

-- Cofres abiertos (uno por alumno, semana y cofre)
create table if not exists public.clan_cofres_abiertos (
  usuario  uuid not null references auth.users (id) on delete cascade,
  semana   date not null,
  n        integer not null check (n between 1 and 5),
  clan     bigint references public.clanes (id) on delete set null,
  premio   jsonb not null default '{}'::jsonb,
  cuando   timestamptz not null default now(),
  primary key (usuario, semana, n)
);
create index if not exists clan_cofres_abiertos_clan on public.clan_cofres_abiertos (clan, cuando desc);
alter table public.clan_cofres_abiertos enable row level security;

-- Inicio de la semana como timestamptz (lunes 00:00 en Lima)
create or replace function public.cz_lunes_ts() returns timestamptz language sql stable set search_path = '' as $$
  select (public.cz_lunes()::timestamp at time zone 'America/Lima');
$$;

-- Preguntas de la semana de un alumno
create or replace function public.preguntas_semana(u uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(sum(a.preguntas), 0)::integer from public.actividad a where a.usuario = u and a.fecha >= public.cz_lunes();
$$;
revoke all on function public.preguntas_semana(uuid) from public, anon, authenticated;

-- Misiones del clan esta semana: [{id, titulo, prog, meta, bonus, hecha}]
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
    jsonb_build_object('id', 'duelos', 'titulo', 'Ganar 2 clan vs clan', 'prog', least(v_duelos, 2), 'meta', 2, 'bonus', 12 * b),
    jsonb_build_object('id', 'racha', 'titulo', k || (case when k = 1 then ' miembro cumple' else ' miembros cumplen' end) || ' su meta 3 días', 'prog', least(v_racha, k), 'meta', k, 'bonus', 8 * b),
    jsonb_build_object('id', 'simulacro', 'titulo', least(3, nm) || (case when least(3, nm) = 1 then ' miembro termina' else ' miembros terminan' end) || ' un simulacro', 'prog', least(v_sim, least(3, nm)), 'meta', least(3, nm), 'bonus', 12 * b),
    jsonb_build_object('id', 'todos', 'titulo', 'Todos responden al menos 20 preguntas', 'prog', v_todos, 'meta', nm, 'bonus', 16 * b)
  );
end $$;
revoke all on function public.clan_misiones(bigint) from public, anon, authenticated;

-- Lo que ve el alumno en Mi clan
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
  select coalesce(sum(a.preguntas), 0)::integer into v_total from public.actividad a join public.clan_miembros k on k.usuario = a.usuario and k.clan = m.clan
    where a.fecha >= lunes;
  mis := public.clan_misiones(m.clan);
  for x in select * from jsonb_array_elements(mis) loop
    if (x ->> 'prog')::integer >= (x ->> 'meta')::integer and (x ->> 'meta')::integer > 0 then v_bonus := v_bonus + (x ->> 'bonus')::integer; end if;
  end loop;
  v_mio := public.preguntas_semana(uid);
  return jsonb_build_object(
    'semana', lunes, 'cierra', ((lunes + 7)::timestamp at time zone 'America/Lima'),
    'miembros', nm, 'preguntas', v_total, 'bonus', v_bonus, 'puntos', v_total + v_bonus,
    'mio', v_mio, 'minimo', public.clan_cofre_minimo(),
    'cofres', (select jsonb_agg(jsonb_build_object('n', f.n, 'nombre', f.nombre, 'meta', f.por_miembro * b,
        'xp', f.xp, 'rayos', f.rayos, 'tickets', f.tickets, 'item', f.item,
        'item_nom', (select i.nom from public.coleccion_item i where i.id = f.item),
        'abierto', exists (select 1 from public.clan_cofres_abiertos o where o.usuario = uid and o.semana = lunes and o.n = f.n),
        'abrieron', (select count(*) from public.clan_cofres_abiertos o where o.clan = m.clan and o.semana = lunes and o.n = f.n)) order by f.n)
      from public.clan_cofres_cfg f),
    'misiones', mis,
    'aportes', coalesce((select jsonb_agg(t.j order by t.p desc) from (
        select public.amigo_mini(k.usuario) || jsonb_build_object('preguntas', public.preguntas_semana(k.usuario), 'yo', k.usuario = uid) as j,
               public.preguntas_semana(k.usuario) as p
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

-- Abrir un cofre: da los premios y devuelve lo que ganó
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
  if public.preguntas_semana(uid) < public.clan_cofre_minimo() then raise exception 'cofre_pocas_preguntas'; end if;
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
