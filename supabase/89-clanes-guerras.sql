-- =========================================================
-- Modo Cachimbo · Clanes (parte 2): guerras, empujones, clanes oficiales y panel
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 88-clanes.sql.
--
--   Guerras
--   · El líder o un sublíder reta a otro clan (24 o 48 horas). El otro clan
--     tiene 24 horas para aceptar. Cada clan tiene una sola guerra a la vez.
--   · Al aceptar se anota el XP total de cada miembro. Cuenta el XP que cada
--     uno gana desde ese momento, con un tope de 3 000 XP por persona por día
--     de guerra (para que no gane uno solo). Gana el clan que suma más.
--   · Quien entra al clan después de empezar no suma en esa guerra.
--   · Cada guerra ganada suma 1 victoria al escudo del clan.
--   Empujones
--   · Un miembro puede «empujar» a otro del mismo clan 1 vez al día para
--     que se anime a estudiar. Al empujado le sale un aviso en su clan.
--   Clanes oficiales (academias, influencers): solo los crea el admin, llevan sello.
--   Panel: admin_clanes, admin_clan_cerrar, admin_clan_editar, admin_clan_oficial,
--   admin_clan_crear.
-- =========================================================

create table if not exists public.clan_guerras (
  id       bigint generated always as identity primary key,
  clan_a   bigint not null references public.clanes (id) on delete cascade,   -- el que reta
  clan_b   bigint not null references public.clanes (id) on delete cascade,   -- el retado
  horas    integer not null default 24 check (horas in (24, 48)),
  estado   text not null default 'pendiente' check (estado in ('pendiente', 'activa', 'terminada', 'rechazada', 'cancelada', 'vencida')),
  por      uuid references auth.users (id) on delete set null,
  creado   timestamptz not null default now(),
  inicio   timestamptz,
  fin      timestamptz,
  xp_a     integer not null default 0,
  xp_b     integer not null default 0,
  ganador  bigint,
  check (clan_a <> clan_b)
);
create index if not exists clan_guerras_a on public.clan_guerras (clan_a, estado);
create index if not exists clan_guerras_b on public.clan_guerras (clan_b, estado);
alter table public.clan_guerras enable row level security;

-- XP total de cada miembro al empezar la guerra
create table if not exists public.clan_guerra_base (
  guerra   bigint not null references public.clan_guerras (id) on delete cascade,
  usuario  uuid not null references auth.users (id) on delete cascade,
  clan     bigint not null,
  base     bigint not null default 0,
  primary key (guerra, usuario)
);
alter table public.clan_guerra_base enable row level security;

create table if not exists public.clan_empujones (
  de     uuid not null references auth.users (id) on delete cascade,
  para   uuid not null references auth.users (id) on delete cascade,
  fecha  date not null default (now() at time zone 'America/Lima')::date,
  primary key (de, para, fecha)
);
create index if not exists clan_empujones_para on public.clan_empujones (para, fecha);
alter table public.clan_empujones enable row level security;
-- Sin políticas: todo pasa por las funciones de abajo

-- ---------- Guerras: cálculo ----------
create or replace function public.clan_guerra_tope(h integer)
returns integer language sql immutable set search_path = '' as $$ select 3000 * greatest(1, h / 24); $$;

-- Lo que aporta un alumno en una guerra
create or replace function public.clan_guerra_aporte(g public.clan_guerras, u uuid, b bigint)
returns integer language sql stable security definer set search_path = '' as $$
  select least(public.clan_guerra_tope(g.horas), greatest(0, public.jugador_xp_total(u) - b))::integer;
$$;
revoke all on function public.clan_guerra_aporte(public.clan_guerras, uuid, bigint) from public, anon, authenticated;

create or replace function public.clan_guerra_xp(g public.clan_guerras, c bigint)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(sum(public.clan_guerra_aporte(g, b.usuario, b.base)), 0)::integer
  from public.clan_guerra_base b where b.guerra = g.id and b.clan = c;
$$;
revoke all on function public.clan_guerra_xp(public.clan_guerras, bigint) from public, anon, authenticated;

-- Cierra las guerras que ya terminaron y vence los retos sin responder
create or replace function public.clan_guerras_tick()
returns void language plpgsql volatile security definer set search_path = '' as $$
declare g public.clan_guerras; a integer; b integer;
begin
  update public.clan_guerras set estado = 'vencida' where estado = 'pendiente' and creado < now() - interval '24 hours';
  for g in select * from public.clan_guerras where estado = 'activa' and fin <= now() for update skip locked loop
    a := public.clan_guerra_xp(g, g.clan_a);
    b := public.clan_guerra_xp(g, g.clan_b);
    update public.clan_guerras set estado = 'terminada', xp_a = a, xp_b = b,
      ganador = case when a > b then g.clan_a when b > a then g.clan_b end
    where id = g.id;
  end loop;
end $$;
revoke all on function public.clan_guerras_tick() from public, anon, authenticated;

-- Victorias de un clan
create or replace function public.clan_victorias(c bigint)
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.clan_guerras where estado = 'terminada' and ganador = c;
$$;
revoke all on function public.clan_victorias(bigint) from public, anon, authenticated;

-- Nivel, copas y ahora victorias
create or replace function public.clan_logros(c bigint)
returns jsonb language sql stable security definer set search_path = '' as $$
  with cerradas as (
    select s.clan, s.semana, s.xp, s.meta, rank() over (partition by s.semana order by s.xp desc) as puesto
    from public.clan_semanas s where s.semana < public.cz_lunes() and s.xp > 0
  )
  select jsonb_build_object(
    'nivel', 1 + (select count(*) from cerradas k where k.clan = c and k.xp >= k.meta),
    'copas', (select count(*) from cerradas k where k.clan = c and k.puesto <= 3),
    'victorias', public.clan_victorias(c)
  );
$$;
revoke all on function public.clan_logros(bigint) from public, anon, authenticated;

-- La guerra pendiente o activa de un clan
create or replace function public.clan_guerra_viva(c bigint)
returns public.clan_guerras language sql stable security definer set search_path = '' as $$
  select * from public.clan_guerras where (clan_a = c or clan_b = c) and estado in ('pendiente', 'activa')
  order by (estado = 'activa') desc, creado desc limit 1;
$$;
revoke all on function public.clan_guerra_viva(bigint) from public, anon, authenticated;

create or replace function public.clan_mini(c bigint)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', k.id, 'nombre', k.nombre, 'tag', k.tag, 'forma', k.forma, 'simbolo', k.simbolo, 'color', k.color, 'oficial', k.oficial,
    'miembros', (select count(*) from public.clan_miembros m where m.clan = k.id), 'xp', public.clan_xp_semana(k.id), 'victorias', public.clan_victorias(k.id))
  from public.clanes k where k.id = c;
$$;
revoke all on function public.clan_mini(bigint) from public, anon, authenticated;

-- ---------- Guerras: lo que hace el alumno ----------
-- Clanes a los que puedes retar (sin guerra, con 3 miembros o más), los de tamaño parecido primero
create or replace function public.clan_rivales()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare m public.clan_miembros := public.clan_mi_rol(auth.uid()); v_n integer;
begin
  if m.usuario is null then raise exception 'sin_clan'; end if;
  perform public.clan_guerras_tick();
  select count(*) into v_n from public.clan_miembros where clan = m.clan;
  return coalesce((
    select jsonb_agg(public.clan_mini(x.id) order by abs(x.n - v_n), x.id desc)
    from (
      select k.id, (select count(*) from public.clan_miembros mm where mm.clan = k.id) as n
      from public.clanes k
      where not k.cerrado and k.id <> m.clan and (public.clan_guerra_viva(k.id)).id is null
    ) x where x.n >= 3 limit 30), '[]'::jsonb);
end $$;
revoke all on function public.clan_rivales() from public, anon;
grant execute on function public.clan_rivales() to authenticated;

create or replace function public.clan_retar(p_clan bigint, p_horas integer)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); m public.clan_miembros := public.clan_mi_rol(auth.uid()); g bigint;
begin
  if m.rol is null or m.rol = 'miembro' then raise exception 'no_lider'; end if;
  if p_horas not in (24, 48) then raise exception 'horas_mal'; end if;
  perform public.clan_guerras_tick();
  perform 1 from public.clanes where id in (m.clan, p_clan) order by id for update;
  if not exists (select 1 from public.clanes where id = p_clan and not cerrado) or p_clan = m.clan then raise exception 'no_existe'; end if;
  if (select count(*) from public.clan_miembros where clan = m.clan) < 3 then raise exception 'pocos'; end if;
  if (select count(*) from public.clan_miembros where clan = p_clan) < 3 then raise exception 'rival_pocos'; end if;
  if (public.clan_guerra_viva(m.clan)).id is not null then raise exception 'ya_en_guerra'; end if;
  if (public.clan_guerra_viva(p_clan)).id is not null then raise exception 'rival_en_guerra'; end if;
  insert into public.clan_guerras (clan_a, clan_b, horas, por) values (m.clan, p_clan, p_horas, uid) returning id into g;
  return jsonb_build_object('id', g);
end $$;
revoke all on function public.clan_retar(bigint, integer) from public, anon;
grant execute on function public.clan_retar(bigint, integer) to authenticated;

create or replace function public.clan_responder_reto(p_guerra bigint, p_aceptar boolean)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare m public.clan_miembros := public.clan_mi_rol(auth.uid()); g public.clan_guerras;
begin
  if m.rol is null or m.rol = 'miembro' then raise exception 'no_lider'; end if;
  perform public.clan_guerras_tick();
  select * into g from public.clan_guerras where id = p_guerra for update;
  if g.id is null or g.clan_b <> m.clan or g.estado <> 'pendiente' then raise exception 'reto_no_existe'; end if;
  if not p_aceptar then
    update public.clan_guerras set estado = 'rechazada' where id = g.id;
    return jsonb_build_object('ok', true);
  end if;
  update public.clan_guerras set estado = 'activa', inicio = now(), fin = now() + make_interval(hours => g.horas) where id = g.id;
  insert into public.clan_guerra_base (guerra, usuario, clan, base)
  select g.id, k.usuario, k.clan, public.jugador_xp_total(k.usuario) from public.clan_miembros k where k.clan in (g.clan_a, g.clan_b)
  on conflict do nothing;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.clan_responder_reto(bigint, boolean) from public, anon;
grant execute on function public.clan_responder_reto(bigint, boolean) to authenticated;

create or replace function public.clan_cancelar_reto(p_guerra bigint)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare m public.clan_miembros := public.clan_mi_rol(auth.uid());
begin
  if m.rol is null or m.rol = 'miembro' then raise exception 'no_lider'; end if;
  update public.clan_guerras set estado = 'cancelada' where id = p_guerra and clan_a = m.clan and estado = 'pendiente';
  if not found then raise exception 'reto_no_existe'; end if;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.clan_cancelar_reto(bigint) from public, anon;
grant execute on function public.clan_cancelar_reto(bigint) to authenticated;

-- Quién aporta en una guerra, de un lado
create or replace function public.clan_guerra_lado(g public.clan_guerras, c bigint)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x order by x.xp desc) filter (where x.xp > 0), '[]'::jsonb) from (
    select public.duelo_apodo(b.usuario) as apodo, public.jugador_codigo(b.usuario) as codigo, b.usuario = auth.uid() as yo,
      public.clan_guerra_aporte(g, b.usuario, b.base) as xp,
      (select p.foto_url from public.perfiles p where p.id = b.usuario and p.foto_url like 'https://%') as foto,
      coalesce((select c2.puesto from public.coleccion_puesto c2 where c2.usuario = b.usuario), '{}'::jsonb) as puesto
    from public.clan_guerra_base b where b.guerra = g.id and b.clan = c
  ) x;
$$;
revoke all on function public.clan_guerra_lado(public.clan_guerras, bigint) from public, anon, authenticated;

-- Todo lo de guerras de tu clan: la guerra viva (o la última terminada hace menos de 3 días),
-- los retos que te llegaron y las últimas 5.
create or replace function public.clan_guerra()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare m public.clan_miembros := public.clan_mi_rol(auth.uid()); g public.clan_guerras; yo_a boolean; v jsonb;
begin
  if m.usuario is null then raise exception 'sin_clan'; end if;
  perform public.clan_guerras_tick();
  select * into g from public.clan_guerras where (clan_a = m.clan or clan_b = m.clan)
    and (estado = 'activa' or (estado = 'pendiente' and clan_a = m.clan) or (estado = 'terminada' and fin > now() - interval '3 days'))
    order by (estado = 'activa') desc, (estado = 'pendiente') desc, coalesce(fin, creado) desc limit 1;
  if g.id is not null then
    yo_a := g.clan_a = m.clan;
    v := jsonb_build_object('id', g.id, 'estado', g.estado, 'horas', g.horas, 'creado', g.creado, 'inicio', g.inicio, 'fin', g.fin,
      'tope', public.clan_guerra_tope(g.horas),
      'mio', public.clan_mini(m.clan), 'rival', public.clan_mini(case when yo_a then g.clan_b else g.clan_a end),
      'xp_mio', case when g.estado = 'terminada' then (case when yo_a then g.xp_a else g.xp_b end) else public.clan_guerra_xp(g, m.clan) end,
      'xp_rival', case when g.estado = 'terminada' then (case when yo_a then g.xp_b else g.xp_a end) else public.clan_guerra_xp(g, case when yo_a then g.clan_b else g.clan_a end) end,
      'gane', case when g.estado = 'terminada' then g.ganador = m.clan end,
      'empate', g.estado = 'terminada' and g.ganador is null,
      'aporte_mio', public.clan_guerra_lado(g, m.clan),
      'aporte_rival', public.clan_guerra_lado(g, case when yo_a then g.clan_b else g.clan_a end),
      'yo_cuento', exists (select 1 from public.clan_guerra_base b where b.guerra = g.id and b.usuario = auth.uid()));
  end if;
  return jsonb_build_object(
    'rol', m.rol,
    'guerra', v,
    'retos', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'horas', r.horas, 'creado', r.creado, 'clan', public.clan_mini(r.clan_a)) order by r.creado)
      from public.clan_guerras r where r.clan_b = m.clan and r.estado = 'pendiente'), '[]'::jsonb),
    'historial', coalesce((select jsonb_agg(h order by h.fin desc) from (
      select x.fin, x.horas, (select k.nombre from public.clanes k where k.id = case when x.clan_a = m.clan then x.clan_b else x.clan_a end) as rival,
        case when x.clan_a = m.clan then x.xp_a else x.xp_b end as xp_mio, case when x.clan_a = m.clan then x.xp_b else x.xp_a end as xp_rival,
        x.ganador = m.clan as gane, x.ganador is null as empate
      from public.clan_guerras x where (x.clan_a = m.clan or x.clan_b = m.clan) and x.estado = 'terminada' order by x.fin desc limit 5) h), '[]'::jsonb),
    'victorias', public.clan_victorias(m.clan)
  );
end $$;
revoke all on function public.clan_guerra() from public, anon;
grant execute on function public.clan_guerra() to authenticated;

-- ---------- Empujones ----------
create or replace function public.clan_empujar(p_jugador integer)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); m public.clan_miembros := public.clan_mi_rol(auth.uid()); o uuid := public.usuario_de_codigo(p_jugador);
  hoy date := (now() at time zone 'America/Lima')::date;
begin
  if m.usuario is null then raise exception 'sin_clan'; end if;
  if o is null or o = uid or not exists (select 1 from public.clan_miembros where usuario = o and clan = m.clan) then raise exception 'no_miembro'; end if;
  if (select count(*) from public.clan_empujones where de = uid and fecha = hoy) >= 20 then raise exception 'muchos_empujones'; end if;
  insert into public.clan_empujones (de, para, fecha) values (uid, o, hoy) on conflict do nothing;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.clan_empujar(integer) from public, anon;
grant execute on function public.clan_empujar(integer) to authenticated;

-- mi_clan: lo de la parte 1 + empujones de hoy + resumen de la guerra
create or replace function public.mi_clan()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); m public.clan_miembros; c public.clanes; n integer; v_xp integer; v_puesto integer;
  hoy date := (now() at time zone 'America/Lima')::date; g public.clan_guerras; rv bigint;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into m from public.clan_miembros where usuario = uid;
  if m.usuario is null then
    return jsonb_build_object('clan', null, 'espera',
      (select ceil(extract(epoch from (s.cuando + interval '24 hours' - now())) / 3600) from public.clan_salidas s
        where s.usuario = uid and s.cuando > now() - interval '24 hours'));
  end if;
  perform public.clan_guerras_tick();
  select * into c from public.clanes where id = m.clan;
  select count(*) into n from public.clan_miembros where clan = c.id;
  v_xp := public.clan_xp_semana(c.id);
  perform public.clan_guardar_semana();
  select 1 + count(*) into v_puesto from public.clan_semanas s join public.clanes k on k.id = s.clan and not k.cerrado
    where s.semana = public.cz_lunes() and s.xp > v_xp;
  g := public.clan_guerra_viva(c.id);
  rv := case when g.clan_a = c.id then g.clan_b else g.clan_a end;
  return jsonb_build_object(
    'clan', jsonb_build_object('id', c.id, 'nombre', c.nombre, 'tag', c.tag, 'codigo', c.codigo, 'forma', c.forma, 'simbolo', c.simbolo,
      'color', c.color, 'oficial', c.oficial, 'creado', c.creado, 'miembros', n, 'xp', v_xp, 'meta', public.clan_meta(n),
      'puesto', case when v_xp > 0 then v_puesto end) || public.clan_logros(c.id),
    'rol', m.rol,
    'me_empujaron', coalesce((select jsonb_agg(public.duelo_apodo(e.de)) from public.clan_empujones e
      join public.clan_miembros k on k.usuario = e.de and k.clan = c.id where e.para = uid and e.fecha = hoy), '[]'::jsonb),
    'guerra', case when g.id is not null then jsonb_build_object('estado', g.estado, 'fin', g.fin, 'reto_mio', g.clan_a = c.id,
      'rival', (select k.nombre from public.clanes k where k.id = rv),
      'xp_mio', case when g.estado = 'activa' then public.clan_guerra_xp(g, c.id) else 0 end,
      'xp_rival', case when g.estado = 'activa' then public.clan_guerra_xp(g, rv) else 0 end) end,
    'miembros', coalesce((
      select jsonb_agg(public.amigo_mini(k.usuario) || jsonb_build_object('rol', k.rol, 'unido', k.unido, 'yo', k.usuario = uid,
               'racha', coalesce((public.calc_racha(k.usuario) ->> 'actual')::integer, 0),
               'empujado', exists (select 1 from public.clan_empujones e where e.de = uid and e.para = k.usuario and e.fecha = hoy),
               'empujones', (select count(*) from public.clan_empujones e where e.para = k.usuario and e.fecha = hoy))
             order by coalesce(x.xp, 0) desc, k.unido)
      from public.clan_miembros k
      left join public.xp_semana x on x.usuario = k.usuario and x.semana = public.cz_lunes()
      where k.clan = c.id), '[]'::jsonb)
  );
end $$;
revoke all on function public.mi_clan() from public, anon;
grant execute on function public.mi_clan() to authenticated;

-- ---------- Clanes oficiales (lista para la página de unirse) ----------
create or replace function public.clanes_oficiales()
returns jsonb language sql volatile security definer set search_path = '' as $$
  select coalesce(jsonb_agg(public.clan_mini(k.id) order by k.nombre), '[]'::jsonb)
  from public.clanes k where k.oficial and not k.cerrado and auth.uid() is not null;
$$;
revoke all on function public.clanes_oficiales() from public, anon;
grant execute on function public.clanes_oficiales() to authenticated;

-- ---------- Panel (solo admin) ----------
create or replace function public.admin_clanes()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  perform public.clan_guerras_tick();
  return jsonb_build_object(
    'clanes', coalesce((select jsonb_agg(x order by x.feo desc, x.xp desc, x.creado desc) from (
      select k.id, k.nombre, k.tag, k.codigo, k.forma, k.simbolo, k.color, k.oficial, k.creado,
        (select count(*) from public.clan_miembros m where m.clan = k.id) as miembros,
        public.clan_xp_semana(k.id) as xp, public.clan_victorias(k.id) as victorias,
        public.clan_nombre_feo(k.nombre) or public.clan_nombre_feo(k.tag) as feo,
        k.creado > now() - interval '48 hours' as nuevo,
        (select public.duelo_apodo(m.usuario) from public.clan_miembros m where m.clan = k.id and m.rol = 'lider' limit 1) as lider,
        (select u.email from public.clan_miembros m join auth.users u on u.id = m.usuario where m.clan = k.id and m.rol = 'lider' limit 1) as lider_email,
        (select public.jugador_codigo(m.usuario) from public.clan_miembros m where m.clan = k.id and m.rol = 'lider' limit 1) as lider_id,
        exists (select 1 from public.clan_guerras gg where (gg.clan_a = k.id or gg.clan_b = k.id) and gg.estado = 'activa') as en_guerra
      from public.clanes k where not k.cerrado) x), '[]'::jsonb),
    'alumnos', (select count(*) from public.clan_miembros),
    'guerras_semana', (select count(*) from public.clan_guerras where estado in ('activa', 'terminada') and inicio >= public.cz_lunes())
  );
end $$;
revoke all on function public.admin_clanes() from public, anon;
grant execute on function public.admin_clanes() to authenticated;

-- Ver los miembros de un clan
create or replace function public.admin_clan_miembros(p_clan bigint)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('apodo', public.duelo_apodo(m.usuario), 'id', public.jugador_codigo(m.usuario), 'rol', m.rol,
      'email', (select u.email from auth.users u where u.id = m.usuario),
      'xp', coalesce((select x.xp from public.xp_semana x where x.usuario = m.usuario and x.semana = public.cz_lunes()), 0)) order by (m.rol = 'lider') desc, (m.rol = 'sub') desc, m.unido)
    from public.clan_miembros m where m.clan = p_clan), '[]'::jsonb);
end $$;
revoke all on function public.admin_clan_miembros(bigint) from public, anon;
grant execute on function public.admin_clan_miembros(bigint) to authenticated;

-- Cerrar un clan: sus miembros quedan libres (sin la espera de 24 h)
create or replace function public.admin_clan_cerrar(p_clan bigint)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  update public.clan_guerras set estado = 'cancelada' where (clan_a = p_clan or clan_b = p_clan) and estado in ('pendiente', 'activa');
  delete from public.clan_miembros where clan = p_clan;
  update public.clanes set cerrado = true where id = p_clan;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.admin_clan_cerrar(bigint) from public, anon;
grant execute on function public.admin_clan_cerrar(bigint) to authenticated;

-- Cambiar nombre y sigla (por ejemplo si tiene groserías). El admin sí puede usar cualquier nombre.
create or replace function public.admin_clan_editar(p_clan bigint, p_nombre text, p_tag text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  if char_length(trim(coalesce(p_nombre, ''))) not between 3 and 24 then raise exception 'nombre_largo'; end if;
  if upper(coalesce(p_tag, '')) !~ '^[A-Z0-9]{2,5}$' then raise exception 'tag_mal'; end if;
  if exists (select 1 from public.clanes where lower(nombre) = lower(trim(p_nombre)) and not cerrado and id <> p_clan) then raise exception 'nombre_usado'; end if;
  update public.clanes set nombre = trim(p_nombre), tag = upper(p_tag) where id = p_clan;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.admin_clan_editar(bigint, text, text) from public, anon;
grant execute on function public.admin_clan_editar(bigint, text, text) to authenticated;

create or replace function public.admin_clan_oficial(p_clan bigint, p_si boolean)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  update public.clanes set oficial = coalesce(p_si, false) where id = p_clan;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.admin_clan_oficial(bigint, boolean) from public, anon;
grant execute on function public.admin_clan_oficial(bigint, boolean) to authenticated;

-- Crear un clan oficial con su líder (el ID de 5 dígitos de la cuenta de la academia o del influencer)
create or replace function public.admin_clan_crear(p_nombre text, p_tag text, p_forma text, p_simbolo text, p_color text, p_lider integer)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare u uuid := public.usuario_de_codigo(p_lider); c public.clanes;
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  if u is null then raise exception 'lider_no_existe'; end if;
  if exists (select 1 from public.clan_miembros where usuario = u) then raise exception 'lider_en_clan'; end if;
  if char_length(trim(coalesce(p_nombre, ''))) not between 3 and 24 then raise exception 'nombre_largo'; end if;
  if upper(coalesce(p_tag, '')) !~ '^[A-Z0-9]{2,5}$' then raise exception 'tag_mal'; end if;
  if exists (select 1 from public.clanes where lower(nombre) = lower(trim(p_nombre)) and not cerrado) then raise exception 'nombre_usado'; end if;
  insert into public.clanes (nombre, tag, codigo, forma, simbolo, color, oficial)
  values (trim(p_nombre), upper(p_tag), public.clan_codigo_nuevo(), coalesce(p_forma, 'corona'), coalesce(p_simbolo, 'buho'), upper(coalesce(p_color, '#FFC800')), true)
  returning * into c;
  insert into public.clan_miembros (usuario, clan, rol) values (u, c.id, 'lider');
  return jsonb_build_object('id', c.id, 'codigo', c.codigo);
end $$;
revoke all on function public.admin_clan_crear(text, text, text, text, text, integer) from public, anon;
grant execute on function public.admin_clan_crear(text, text, text, text, text, integer) to authenticated;
