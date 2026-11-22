-- =========================================================
-- Modo Cachimbo · 127: Tienda (se paga con diamantes)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 104, 117, 120, 124 y 125.
--
-- Lo que se vende (precio en diamantes; se cambia en la tabla tienda_items):
--   vida1 / vida2 / vida3  Vidas ilimitadas 1 / 2 / 3 días ....... 60 / 110 / 150
--   doblexp                Doble XP por 1 día ..................... 100
--   escudo                 Protección de racha (cubre 1 día) ....... 50
--   fortuna                Fortuna 7 días (cofres personales dan diamantes) 80
--   ticket                 Ticket de sala de clan .................. 30
--   energia                +20 de energía (rayos) .................. 40
--   corazones              +5 corazones ............................ 30
--   sorpresa               Cofre sorpresa (premio al azar) ......... 70
--   revivir                Revivir racha (hueco de hasta 7 días) ... 120
--
-- Cómo se ganan diamantes:
--   · Cofres del clan: Oro 20 · Amatista 40 · Leyenda 80 (cada semana).
--   · Cofres personales, solo con Fortuna activa: 10 · 15 · 25 · 50.
--   · Recarga por ID: Panel → Regalos → Diamantes.
--   · Los cofres no reclamados del domingo también los traen (en el sobre).
-- =========================================================

-- ---------- Tablas ----------
alter table public.corazones add column if not exists doble_xp_hasta timestamptz;
alter table public.corazones add column if not exists fortuna_hasta timestamptz;

create table if not exists public.tienda_items (
  id      text primary key,
  nom     text not null,
  precio  integer not null check (precio between 1 and 100000),
  orden   integer not null default 0,
  activo  boolean not null default true
);
alter table public.tienda_items enable row level security;
insert into public.tienda_items (id, nom, precio, orden) values
  ('vida1', 'Vidas ilimitadas 1 día', 60, 1),
  ('vida2', 'Vidas ilimitadas 2 días', 110, 2),
  ('vida3', 'Vidas ilimitadas 3 días', 150, 3),
  ('doblexp', 'Doble XP 1 día', 100, 4),
  ('escudo', 'Protección de racha', 50, 5),
  ('fortuna', 'Fortuna 7 días', 80, 6),
  ('ticket', 'Ticket de sala', 30, 7),
  ('energia', 'Recarga de energía', 40, 8),
  ('corazones', '+5 corazones', 30, 9),
  ('sorpresa', 'Cofre sorpresa', 70, 10),
  ('revivir', 'Revivir racha', 120, 11)
on conflict (id) do nothing;
update public.tienda_items set nom = 'Doble XP 1 día', precio = 100 where id = 'doblexp' and nom = 'Doble XP 1 hora';

create table if not exists public.tienda_compras (
  id      bigint generated always as identity primary key,
  usuario uuid not null references auth.users (id) on delete cascade,
  item    text not null,
  precio  integer not null,
  premio  jsonb,
  creado  timestamptz not null default now()
);
create index if not exists tienda_compras_u on public.tienda_compras (usuario, creado);
alter table public.tienda_compras enable row level security;

-- Protecciones de racha compradas (cada una cubre 1 día perdido desde su compra)
create table if not exists public.racha_escudos (
  id       bigint generated always as identity primary key,
  usuario  uuid not null references auth.users (id) on delete cascade,
  comprado date not null default (now() at time zone 'America/Lima')::date,
  creado   timestamptz not null default now()
);
create index if not exists racha_escudos_u on public.racha_escudos (usuario);
alter table public.racha_escudos enable row level security;

-- Diamantes en los cofres
alter table public.clan_cofres_cfg add column if not exists diamantes integer not null default 0;
alter table public.clan_premios_yo_cfg add column if not exists diamantes integer not null default 0;
update public.clan_cofres_cfg set diamantes = v.d from (values (1, 0), (2, 0), (3, 20), (4, 40), (5, 80)) as v(n, d)
  where public.clan_cofres_cfg.n = v.n;
update public.clan_premios_yo_cfg set diamantes = v.d from (values (1, 10), (2, 15), (3, 25), (4, 50)) as v(n, d)
  where public.clan_premios_yo_cfg.n = v.n;

-- Los sobres aceptan diamantes
alter table public.regalos drop constraint if exists regalos_tipo_check;
alter table public.regalos add constraint regalos_tipo_check
  check (tipo in ('corazones', 'infinito', 'xp', 'item', 'rayos', 'ticket', 'racha', 'diamantes'));

create or replace function public.fortuna_activa(u uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select c.fortuna_hasta > now() from public.corazones c where c.usuario = u), false);
$$;
revoke all on function public.fortuna_activa(uuid) from public, anon, authenticated;

-- ---------- Doble XP: sumar_xp (copia de 113 + tarjeta Doble XP) ----------
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

-- ---------- Racha: protecciones compradas (copia de 17 + escudos) ----------
create or replace function public.calc_racha(uid uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  hoy      date := (now() at time zone 'America/Lima')::date;
  meta_d   integer := public.meta_hoy(uid);
  desde    date;
  d        date;
  cumplido boolean;
  actual   integer := 0;
  mejor    integer := 0;
  falto_ayer boolean := false;
  semana_descanso date;          -- lunes de la semana en que se usó el descanso
  hoy_preg integer;
  ultima   date;
  m        record;
  esc      date[];               -- Tienda: protecciones de racha (fecha de compra)
  ei       integer := 1;
  esc_uso  integer := 0;
begin
  select coalesce(array_agg(e.comprado order by e.comprado, e.id), '{}') into esc from public.racha_escudos e where e.usuario = uid;
  select coalesce(preguntas, 0) into hoy_preg from public.actividad where usuario = uid and fecha = hoy;
  hoy_preg := coalesce(hoy_preg, 0);
  select min(fecha), max(fecha) into desde, ultima from public.actividad a
    where a.usuario = uid and a.preguntas >= case when a.fecha = hoy then meta_d else coalesce(a.meta, 10) end;

  if desde is not null then
    d := desde;
    while d <= hoy loop
      cumplido := exists (select 1 from public.actividad a where a.usuario = uid and a.fecha = d
        and a.preguntas >= case when d = hoy then meta_d else coalesce(a.meta, 10) end);
      if cumplido then
        actual := actual + 1;
        falto_ayer := false;
        mejor := greatest(mejor, actual);
      elsif d < hoy then
        -- Día perdido: se perdona uno por semana, nunca dos seguidos
        if actual > 0 and not falto_ayer
           and semana_descanso is distinct from date_trunc('week', d)::date then
          semana_descanso := date_trunc('week', d)::date;
          falto_ayer := true;
        elsif actual > 0 and ei <= cardinality(esc) and esc[ei] <= d then
          -- Protección de racha (comprada ese día o antes): cubre este día
          ei := ei + 1;
          esc_uso := esc_uso + 1;
        else
          actual := 0;
          falto_ayer := false;
        end if;
      end if;
      -- hoy sin cumplir todavía no rompe la racha
      d := d + 1;
    end loop;
  end if;

  select * into m from public.metas_racha where usuario = uid;
  return jsonb_build_object(
    'meta', meta_d,
    'meta_elegida', coalesce(case when m.nueva is not null and m.nueva_desde > hoy then m.nueva end, m.meta, 20),
    'meta_desde', case when m.nueva is not null and m.nueva_desde > hoy then m.nueva_desde end,
    'hoy', hoy_preg,
    'cumplido_hoy', hoy_preg >= meta_d,
    'actual', actual,
    'mejor', mejor,
    'descanso_usado', coalesce(semana_descanso = date_trunc('week', hoy)::date, false),
    'ultima', ultima,
    'escudos', cardinality(esc) - esc_uso
  );
end $$;
revoke all on function public.calc_racha(uuid) from public, anon, authenticated;

-- ---------- Diamantes en los cofres ----------
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
        'xp', f.xp, 'rayos', f.rayos, 'tickets', f.tickets, 'diamantes', f.diamantes, 'item', f.item,
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
  if f.diamantes > 0 then perform public.diamantes_dar(uid, f.diamantes, 'Cofre ' || f.nombre || ' del clan'); end if;
  if f.item is not null and exists (select 1 from public.coleccion_item i where i.id = f.item) then
    insert into public.coleccion_mia (usuario, item, origen, mensaje) values (uid, f.item, 'evento', 'Cofre ' || f.nombre || ' del clan')
    on conflict (usuario, item) do nothing;
    nuevo := found;
  end if;
  pr := jsonb_build_object('n', f.n, 'nombre', f.nombre, 'xp', f.xp, 'rayos', f.rayos, 'tickets', f.tickets, 'diamantes', f.diamantes,
    'item', case when nuevo then f.item end, 'item_nom', case when nuevo then (select i.nom from public.coleccion_item i where i.id = f.item) end);
  insert into public.clan_cofres_abiertos (usuario, semana, n, clan, premio) values (uid, lunes, p_n, m.clan, pr);
  return pr;
end $$;
revoke all on function public.clan_cofre_abrir(integer) from public, anon;
grant execute on function public.clan_cofre_abrir(integer) to authenticated;

create or replace function public.clan_premios_yo()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); lunes date := public.cz_lunes(); a jsonb; fo boolean;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if not exists (select 1 from public.clan_miembros where usuario = uid) then raise exception 'sin_clan'; end if;
  a := public.mi_actividad_clan(uid);
  fo := public.fortuna_activa(uid);
  return a || jsonb_build_object('cierra', ((lunes + 7)::timestamp at time zone 'America/Lima'), 'fortuna', fo,
    'fortuna_hasta', (select c.fortuna_hasta from public.corazones c where c.usuario = uid and c.fortuna_hasta > now()),
    'premios', (select jsonb_agg(jsonb_build_object('n', f.n, 'meta', f.meta, 'xp', f.xp, 'rayos', f.rayos, 'tickets', f.tickets,
        'diamantes', case when fo then f.diamantes else 0 end, 'diamantes_fortuna', f.diamantes,
        'abierto', exists (select 1 from public.clan_cofres_abiertos o where o.usuario = uid and o.semana = lunes and o.n = 10 + f.n)) order by f.n)
      from public.clan_premios_yo_cfg f));
end $$;
revoke all on function public.clan_premios_yo() from public, anon;
grant execute on function public.clan_premios_yo() to authenticated;

create or replace function public.clan_premio_yo_abrir(p_n integer)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); m public.clan_miembros; f public.clan_premios_yo_cfg; lunes date := public.cz_lunes(); pr jsonb; dia integer := 0;
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
  if f.diamantes > 0 and public.fortuna_activa(uid) then
    dia := f.diamantes;
    perform public.diamantes_dar(uid, dia, 'Cofre personal ' || f.n || ' (Fortuna)');
  end if;
  pr := jsonb_build_object('n', f.n, 'nombre', 'Recompensa ' || f.n, 'xp', f.xp, 'rayos', f.rayos, 'tickets', f.tickets, 'diamantes', dia);
  insert into public.clan_cofres_abiertos (usuario, semana, n, clan, premio) values (uid, lunes, 10 + p_n, m.clan, pr);
  return pr;
end $$;
revoke all on function public.clan_premio_yo_abrir(integer) from public, anon;
grant execute on function public.clan_premio_yo_abrir(integer) to authenticated;

create or replace function public.cofres_no_reclamados()
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare lunes date := public.cz_lunes(); r record; u uuid; f record; p record; x jsonb;
  nm integer; b integer; pts integer; bonus integer; mio integer; yo_pts integer;
  vxp integer; vry integer; vtk integer; vdi integer; fo boolean; its text[]; noms text[]; pr jsonb; total integer := 0; nuevo boolean;
begin
  for r in select c.id from public.clanes c loop
    select count(*) into nm from public.clan_miembros k where k.clan = r.id;
    continue when nm = 0;
    b := greatest(nm, 5);
    bonus := 0;
    for x in select * from jsonb_array_elements(public.clan_misiones(r.id)) loop
      if (x ->> 'prog')::integer >= (x ->> 'meta')::integer and (x ->> 'meta')::integer > 0 then bonus := bonus + (x ->> 'bonus')::integer; end if;
    end loop;
    pts := public.clan_xp_semana(r.id) + bonus;

    for u in select k.usuario from public.clan_miembros k where k.clan = r.id loop
      perform pg_advisory_xact_lock(hashtext('cofre:' || u::text));
      vxp := 0; vry := 0; vtk := 0; vdi := 0; its := '{}'; noms := '{}';
      fo := public.fortuna_activa(u);
      mio := public.xp_semana_de(u);
      yo_pts := (public.mi_actividad_clan(u) ->> 'puntos')::integer;

      -- Cofres del clan
      if mio >= public.clan_cofre_minimo() then
        for f in select * from public.clan_cofres_cfg c where c.por_miembro * b <= pts
                   and not exists (select 1 from public.clan_cofres_abiertos o where o.usuario = u and o.semana = lunes and o.n = c.n)
                 order by c.n loop
          vxp := vxp + f.xp; vtk := vtk + f.tickets; vdi := vdi + f.diamantes;
          if f.rayos > 0 then
            insert into public.lab_rayos (usuario, clave, cantidad) values (u, 'cofre:' || lunes || ':' || f.n, f.rayos) on conflict do nothing;
            if found then vry := vry + f.rayos; end if;
          end if;
          nuevo := false;
          if f.item is not null and exists (select 1 from public.coleccion_item i where i.id = f.item) then
            insert into public.coleccion_mia (usuario, item, origen, mensaje) values (u, f.item, 'evento', 'Cofre ' || f.nombre || ' del clan')
            on conflict (usuario, item) do nothing;
            nuevo := found;
            if nuevo then its := its || f.item; end if;
          end if;
          pr := jsonb_build_object('n', f.n, 'nombre', f.nombre, 'xp', f.xp, 'rayos', f.rayos, 'tickets', f.tickets, 'diamantes', f.diamantes, 'auto', true,
            'item', case when nuevo then f.item end);
          insert into public.clan_cofres_abiertos (usuario, semana, n, clan, premio) values (u, lunes, f.n, r.id, pr);
          noms := noms || f.nombre;
        end loop;
      end if;

      -- Cofres personales
      for p in select * from public.clan_premios_yo_cfg c where c.meta <= yo_pts
                 and not exists (select 1 from public.clan_cofres_abiertos o where o.usuario = u and o.semana = lunes and o.n = 10 + c.n)
               order by c.n loop
        vxp := vxp + p.xp; vtk := vtk + p.tickets;
        if fo then vdi := vdi + p.diamantes; end if;
        if p.rayos > 0 then
          insert into public.lab_rayos (usuario, clave, cantidad) values (u, 'premioyo:' || lunes || ':' || p.n, p.rayos) on conflict do nothing;
          if found then vry := vry + p.rayos; end if;
        end if;
        pr := jsonb_build_object('n', p.n, 'nombre', 'Recompensa ' || p.n, 'xp', p.xp, 'rayos', p.rayos, 'tickets', p.tickets, 'diamantes', case when fo then p.diamantes else 0 end, 'auto', true);
        insert into public.clan_cofres_abiertos (usuario, semana, n, clan, premio) values (u, lunes, 10 + p.n, r.id, pr);
        noms := noms || ('Personal ' || p.n);
      end loop;

      continue when cardinality(noms) = 0;
      total := total + cardinality(noms);
      if vxp > 0 then
        perform public.cz_estado(u);
        insert into public.xp_semana (usuario, semana, xp) values (u, lunes, vxp)
        on conflict (usuario, semana) do update set xp = public.xp_semana.xp + excluded.xp;
        update public.corazones set xp_saldo = xp_saldo + vxp, actualizado = now() where usuario = u;
      end if;
      if vtk > 0 then perform public.sala_tickets_sumar(u, vtk); end if;
      if vdi > 0 then perform public.diamantes_dar(u, vdi, 'Cofres no reclamados'); end if;

      -- El sobre: una fila por premio, todas con la misma nota
      declare nota text := left('No abriste ' || case when cardinality(noms) = 1 then 'tu cofre ' else 'tus cofres ' end ||
          array_to_string(noms, ', ') || ' esta semana. ¡Aquí tienes tus premios!', 120);
      begin
        if vxp > 0 then insert into public.regalos (usuario, tipo, cantidad, nota, de_nombre) values (u, 'xp', vxp, nota, 'Tu clan'); end if;
        if vry > 0 then insert into public.regalos (usuario, tipo, cantidad, nota, de_nombre) values (u, 'rayos', vry, nota, 'Tu clan'); end if;
        if vtk > 0 then insert into public.regalos (usuario, tipo, cantidad, nota, de_nombre) values (u, 'ticket', vtk, nota, 'Tu clan'); end if;
        if vdi > 0 then insert into public.regalos (usuario, tipo, cantidad, nota, de_nombre) values (u, 'diamantes', vdi, nota, 'Tu clan'); end if;
        insert into public.regalos (usuario, tipo, item, nota, de_nombre) select u, 'item', i, nota, 'Tu clan' from unnest(its) i;
      end;
    end loop;
  end loop;
  return total;
end $$;
revoke all on function public.cofres_no_reclamados() from public, anon, authenticated;

-- ---------- Recargar diamantes por ID (Panel → Regalos) ----------
create or replace function public.regalo_validar(p_tipo text, n integer, p_item text)
returns text language plpgsql stable security definer set search_path = '' as $$
begin
  if p_tipo = 'corazones' then
    if n < 1 or n > 50 then raise exception 'Elige de 1 a 50 corazones'; end if;
    return n || ' corazón' || case when n = 1 then '' else 'es' end;
  elsif p_tipo = 'infinito' then
    if n < 1 or n > 720 then raise exception 'Elige de 1 hora a 30 días'; end if;
    return 'corazones infinitos por ' || case when n % 24 = 0 then (n / 24) || ' día' || case when n = 24 then '' else 's' end
                                             else n || ' hora' || case when n = 1 then '' else 's' end end;
  elsif p_tipo = 'xp' then
    if n < 1 or n > 10000 then raise exception 'Elige de 1 a 10 000 XP'; end if;
    return n || ' XP';
  elsif p_tipo = 'rayos' then
    if n < 1 or n > 1000 then raise exception 'Elige de 1 a 1000 rayos'; end if;
    return n || ' rayo' || case when n = 1 then '' else 's' end;
  elsif p_tipo = 'ticket' then
    if n < 1 or n > 50 then raise exception 'Elige de 1 a 50 tickets'; end if;
    return n || ' ticket' || case when n = 1 then '' else 's' end || ' de sala';
  elsif p_tipo = 'diamantes' then
    if n < 1 or n > 10000 then raise exception 'Elige de 1 a 10 000 diamantes'; end if;
    return n || ' diamante' || case when n = 1 then '' else 's' end;
  elsif p_tipo = 'item' then
    if not exists (select 1 from public.coleccion_item i where i.id = p_item) then raise exception 'Ese ítem no existe'; end if;
    return 'el ítem ' || coalesce((select i.nom from public.coleccion_item i where i.id = p_item), p_item);
  end if;
  raise exception 'tipo de regalo no válido';
end $$;
revoke all on function public.regalo_validar(text, integer, text) from public, anon, authenticated;

create or replace function public.regalo_aplicar(u uuid, p_tipo text, n integer, p_item text, nota text, yo text, nom text)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  if p_tipo = 'rayos' then
    insert into public.lab_rayos (usuario, clave, cantidad) values (u, 'regalo:' || gen_random_uuid(), n);
  elsif p_tipo = 'ticket' then
    perform public.sala_tickets_sumar(u, n);
  elsif p_tipo = 'diamantes' then
    perform public.diamantes_dar(u, n, 'Regalo: ' || coalesce(nom, yo, 'admin'));
  else
    perform public.cz_estado(u);
  end if;
  if p_tipo = 'corazones' then
    update public.corazones set extra = least(extra + n, 999), actualizado = now() where usuario = u;
  elsif p_tipo = 'infinito' then
    update public.corazones set infinito_hasta = greatest(coalesce(infinito_hasta, now()), now()) + n * interval '1 hour', actualizado = now()
     where usuario = u;
  elsif p_tipo = 'xp' then
    insert into public.xp_semana (usuario, semana, xp) values (u, public.cz_lunes(), n)
    on conflict (usuario, semana) do update set xp = public.xp_semana.xp + excluded.xp;
    update public.corazones set xp_saldo = xp_saldo + n, actualizado = now() where usuario = u;
  elsif p_tipo = 'item' then
    insert into public.coleccion_mia (usuario, item, origen, mensaje) values (u, p_item, 'regalo', nota)
    on conflict (usuario, item) do nothing;
    if not found then return false; end if;
  end if;
  insert into public.regalos (usuario, tipo, cantidad, item, nota, de_email, de_nombre)
  values (u, p_tipo, case when p_tipo = 'item' then null else n end, case when p_tipo = 'item' then p_item end, nota, yo, nom);
  return true;
end $$;
revoke all on function public.regalo_aplicar(uuid, text, integer, text, text, text, text) from public, anon, authenticated;

create or replace function public.regalo_buscar(p_codigo integer)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare u uuid; e jsonb;
begin
  if not public.puede('regalos') then raise exception 'no autorizado'; end if;
  select j.usuario into u from public.jugador_id j where j.codigo = p_codigo;
  if u is null then return null; end if;
  e := public.cz_estado(u);
  return jsonb_build_object(
    'codigo', p_codigo,
    'email', (select lower(a.email) from auth.users a where a.id = u),
    'apodo', public.duelo_apodo(u),
    'foto', (select p.foto_url from public.perfiles p where p.id = u and p.foto_url like 'https://%'),
    'xp_total', public.jugador_xp_total(u),
    'xp_saldo', e -> 'xp_saldo', 'quedan', e -> 'quedan', 'extra', e -> 'extra', 'infinito_hasta', e -> 'infinito_hasta',
    'rayos', (select coalesce(sum(r.cantidad), 0) from public.lab_rayos r where r.usuario = u),
    'diamantes', (select coalesce(sum(d.cantidad), 0) from public.diamantes_mov d where d.usuario = u),
    'historial', coalesce((select jsonb_agg(jsonb_build_object('tipo', x.tipo, 'cantidad', x.cantidad, 'item', x.item, 'nota', x.nota,
                    'de', coalesce(x.de_nombre, x.de_email), 'creado', x.creado) order by x.id desc)
                  from (select * from public.regalos r where r.usuario = u order by r.id desc limit 15) x), '[]'::jsonb)
  );
end $$;
revoke all on function public.regalo_buscar(integer) from public, anon;
grant execute on function public.regalo_buscar(integer) to authenticated;

-- ---------- Revivir racha (como racha_devolver, pero el propio alumno y hasta 7 días) ----------
create or replace function public.racha_revivir_u(u uuid, p_max_dias integer default 7)
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare
  hoy     date := (now() at time zone 'America/Lima')::date;
  meta_u  integer := coalesce((select m.meta from public.metas_racha m where m.usuario = u), 20);
  antes   integer := (public.calc_racha(u) ->> 'actual')::integer;
  despues integer;
  d date := hoy - 1; ini date; fin date; x date; vuelta integer := 0; viejos jsonb;
begin
  loop
    vuelta := vuelta + 1;
    exit when vuelta > 6;
    while d > hoy - 400 and public.racha_dia_ok(u, d) loop d := d - 1; end loop;
    fin := d;
    while d > hoy - 400 and not public.racha_dia_ok(u, d) and fin - d < p_max_dias loop d := d - 1; end loop;
    ini := d + 1;
    exit when not public.racha_dia_ok(u, d);
    select coalesce(jsonb_agg(jsonb_build_object('f', a.fecha, 'p', a.preguntas, 'm', a.meta)), '[]'::jsonb) into viejos
      from public.actividad a where a.usuario = u and a.fecha between ini and fin;
    x := ini;
    while x <= fin loop
      insert into public.actividad (usuario, fecha, preguntas, meta) values (u, x, meta_u, meta_u)
      on conflict (usuario, fecha) do update
        set preguntas = greatest(public.actividad.preguntas, coalesce(public.actividad.meta, excluded.meta)),
            meta = coalesce(public.actividad.meta, excluded.meta);
      x := x + 1;
    end loop;
    despues := (public.calc_racha(u) ->> 'actual')::integer;
    exit when despues > antes + (fin - ini + 1);
    delete from public.actividad a where a.usuario = u and a.fecha between ini and fin
      and not exists (select 1 from jsonb_array_elements(viejos) v where (v ->> 'f')::date = a.fecha);
    update public.actividad a set preguntas = (v ->> 'p')::integer, meta = (v ->> 'm')::integer
      from jsonb_array_elements(viejos) v where a.usuario = u and a.fecha = (v ->> 'f')::date;
    despues := null;
  end loop;
  return despues;
end $$;
revoke all on function public.racha_revivir_u(uuid, integer) from public, anon, authenticated;

-- ---------- Efecto de cada cosa (uso interno; no cobra) ----------
create or replace function public.tienda_efecto(u uuid, k text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare n integer; r integer; libres integer;
begin
  perform public.cz_estado(u);
  if k in ('vida1', 'vida2', 'vida3') then
    n := substr(k, 5)::integer;
    update public.corazones set infinito_hasta = greatest(coalesce(infinito_hasta, now()), now()) + n * interval '1 day', actualizado = now() where usuario = u;
    return jsonb_build_object('tipo', 'infinito', 'cantidad', n * 24);
  elsif k = 'doblexp' then
    update public.corazones set doble_xp_hasta = greatest(coalesce(doble_xp_hasta, now()), now()) + interval '1 day', actualizado = now() where usuario = u;
    return jsonb_build_object('tipo', 'doblexp', 'cantidad', 24);
  elsif k = 'fortuna' then
    update public.corazones set fortuna_hasta = greatest(coalesce(fortuna_hasta, now()), now()) + interval '7 days', actualizado = now() where usuario = u;
    return jsonb_build_object('tipo', 'fortuna', 'cantidad', 7);
  elsif k = 'escudo' then
    libres := coalesce((public.calc_racha(u) ->> 'escudos')::integer, 0);
    if libres >= 3 then raise exception 'escudo_tope'; end if;
    insert into public.racha_escudos (usuario) values (u);
    return jsonb_build_object('tipo', 'escudo', 'cantidad', libres + 1);
  elsif k in ('ticket', 'ticket2') then
    n := case when k = 'ticket' then 1 else 2 end;
    perform public.sala_tickets_sumar(u, n);
    return jsonb_build_object('tipo', 'ticket', 'cantidad', n);
  elsif k in ('energia', 'energia40') then
    n := case when k = 'energia' then 20 else 40 end;
    insert into public.lab_rayos (usuario, clave, cantidad) values (u, 'tienda:' || gen_random_uuid(), n);
    return jsonb_build_object('tipo', 'rayos', 'cantidad', n);
  elsif k = 'corazones' then
    update public.corazones set extra = least(extra + 5, 999), actualizado = now() where usuario = u;
    return jsonb_build_object('tipo', 'corazones', 'cantidad', 5);
  elsif k like 'xp%' then
    n := substr(k, 3)::integer;
    insert into public.xp_semana (usuario, semana, xp) values (u, public.cz_lunes(), n)
    on conflict (usuario, semana) do update set xp = public.xp_semana.xp + excluded.xp;
    update public.corazones set xp_saldo = xp_saldo + n, actualizado = now() where usuario = u;
    return jsonb_build_object('tipo', 'xp', 'cantidad', n);
  elsif k like 'dia%' then
    n := substr(k, 4)::integer;
    perform public.diamantes_dar(u, n, 'Cofre sorpresa');
    return jsonb_build_object('tipo', 'diamantes', 'cantidad', n);
  elsif k = 'sorpresa' then
    -- Premio al azar: 30 % 300 XP · 20 % Doble XP · 20 % 40 de energía · 15 % vidas 1 día · 10 % 2 tickets · 5 % 150 diamantes
    r := floor(random() * 100)::integer;
    return public.tienda_efecto(u, case when r < 30 then 'xp300' when r < 50 then 'doblexp' when r < 70 then 'energia40'
                                        when r < 85 then 'vida1' when r < 95 then 'ticket2' else 'dia150' end);
  elsif k = 'revivir' then
    n := public.racha_revivir_u(u, 7);
    if n is null then raise exception 'sin_racha_revivir'; end if;
    return jsonb_build_object('tipo', 'racha', 'cantidad', n);
  end if;
  raise exception 'item_no_existe';
end $$;
revoke all on function public.tienda_efecto(uuid, text) from public, anon, authenticated;

-- ---------- Lo que ve el alumno en la Tienda ----------
create or replace function public.tienda_ver()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); c public.corazones; rc jsonb;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  perform public.cz_estado(uid);
  select * into c from public.corazones where usuario = uid;
  rc := public.calc_racha(uid);
  return jsonb_build_object(
    'diamantes', (select coalesce(sum(d.cantidad), 0)::integer from public.diamantes_mov d where d.usuario = uid),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'nom', i.nom, 'precio', i.precio) order by i.orden)
                         from public.tienda_items i where i.activo), '[]'::jsonb),
    'infinito_hasta', case when c.infinito_hasta > now() then c.infinito_hasta end,
    'doble_xp_hasta', case when c.doble_xp_hasta > now() then c.doble_xp_hasta end,
    'fortuna_hasta', case when c.fortuna_hasta > now() then c.fortuna_hasta end,
    'escudos', coalesce((rc ->> 'escudos')::integer, 0),
    'racha', coalesce((rc ->> 'actual')::integer, 0),
    'tickets', public.sala_tickets_de(uid),
    'rayos', public.rayos_saldo(uid),
    'id', (select j.codigo from public.jugador_id j where j.usuario = uid),
    'historial', coalesce((select jsonb_agg(jsonb_build_object('cantidad', x.cantidad, 'motivo', x.motivo, 'creado', x.creado) order by x.id desc)
                           from (select * from public.diamantes_mov d where d.usuario = uid order by d.id desc limit 12) x), '[]'::jsonb)
  );
end $$;
revoke all on function public.tienda_ver() from public, anon;
grant execute on function public.tienda_ver() to authenticated;

-- ---------- Comprar ----------
create or replace function public.tienda_comprar(p_item text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); it public.tienda_items; pr jsonb; saldo integer;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into it from public.tienda_items where id = p_item and activo;
  if it.id is null then raise exception 'item_no_existe'; end if;
  perform pg_advisory_xact_lock(hashtext('tienda:' || uid::text));
  if (select coalesce(sum(d.cantidad), 0) from public.diamantes_mov d where d.usuario = uid) < it.precio then raise exception 'pocos_diamantes'; end if;
  pr := public.tienda_efecto(uid, it.id);
  saldo := public.diamantes_dar(uid, -it.precio, 'Tienda: ' || it.nom);
  insert into public.tienda_compras (usuario, item, precio, premio) values (uid, it.id, it.precio, pr);
  return public.tienda_ver() || jsonb_build_object('premio', pr, 'item', it.id);
end $$;
revoke all on function public.tienda_comprar(text) from public, anon;
grant execute on function public.tienda_comprar(text) to authenticated;
