-- =========================================================
-- Modo Cachimbo · Clanes (parte 1: la base)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 16-corazones.sql (xp_semana), 17-meta-racha.sql (calc_racha)
-- y 71-amigos.sql (amigo_mini, usuario_de_codigo).
--
--   · Un alumno está en un solo clan. Máximo 20 miembros.
--   · Se entra con el código de 4 letras que comparte el clan.
--   · Roles: líder (1), sublíder (hasta 2) y miembro.
--   · El XP del clan en la semana = la suma del XP semanal (xp_semana)
--     de quienes están hoy en el clan.
--   · Meta semanal: 3 500 XP por miembro (mínimo 10 000). Cada semana
--     cumplida sube 1 nivel al clan. Cada semana en el Top 3 = 1 copa.
--   · Si sales de un clan, esperas 24 h para entrar o crear otro.
--   Funciones: clan_crear, clan_unirse, clan_salir, clan_editar,
--   clan_nuevo_codigo, clan_rol, clan_expulsar, mi_clan, ranking_clanes,
--   clan_por_codigo (vista previa antes de unirse).
-- =========================================================

create table if not exists public.clanes (
  id        bigint generated always as identity primary key,
  nombre    text not null check (char_length(nombre) between 3 and 24),
  tag       text not null check (tag ~ '^[A-Z0-9]{2,5}$'),
  codigo    text not null unique check (codigo ~ '^[A-Z2-9]{4}$'),
  forma     text not null default 'punta' check (forma in ('punta', 'redondo', 'corona', 'alas')),
  simbolo   text not null default 'rayo' check (simbolo in ('rayo', 'libro', 'buho', 'llama', 'estrella', 'montana', 'atomo')),
  color     text not null default '#C6E000' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  oficial   boolean not null default false,
  cerrado   boolean not null default false,
  creado    timestamptz not null default now()
);
create unique index if not exists clanes_nombre on public.clanes (lower(nombre)) where not cerrado;
alter table public.clanes enable row level security;

create table if not exists public.clan_miembros (
  usuario  uuid primary key references auth.users (id) on delete cascade,
  clan     bigint not null references public.clanes (id) on delete cascade,
  rol      text not null default 'miembro' check (rol in ('lider', 'sub', 'miembro')),
  unido    timestamptz not null default now()
);
create index if not exists clan_miembros_clan on public.clan_miembros (clan);
alter table public.clan_miembros enable row level security;

-- Cuándo salió cada alumno de su último clan (para la espera de 24 h)
create table if not exists public.clan_salidas (
  usuario  uuid primary key references auth.users (id) on delete cascade,
  cuando   timestamptz not null default now()
);
alter table public.clan_salidas enable row level security;

-- XP de cada clan por semana (se guarda al ver el top o el clan; la semana en curso se va actualizando)
create table if not exists public.clan_semanas (
  clan     bigint not null references public.clanes (id) on delete cascade,
  semana   date not null,
  xp       integer not null default 0,
  meta     integer not null default 0,
  miembros integer not null default 0,
  primary key (clan, semana)
);
create index if not exists clan_semanas_sem on public.clan_semanas (semana, xp desc);
alter table public.clan_semanas enable row level security;
-- Sin políticas: todo pasa por las funciones de abajo

-- ---------- Ayudantes ----------
create or replace function public.clan_meta(n integer)
returns integer language sql immutable set search_path = '' as $$
  select greatest(10000, coalesce(n, 0) * 3500);
$$;

create or replace function public.clan_codigo_nuevo()
returns text language plpgsql volatile set search_path = '' as $$
declare abc text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; c text; i integer;
begin
  loop
    c := '';
    for i in 1..4 loop c := c || substr(abc, 1 + floor(random() * length(abc))::integer, 1); end loop;
    exit when not exists (select 1 from public.clanes where codigo = c);
  end loop;
  return c;
end $$;
revoke all on function public.clan_codigo_nuevo() from public, anon, authenticated;

-- Nombres feos: si el nombre o el tag tienen alguna de estas raíces, no se acepta
create or replace function public.clan_nombre_feo(t text)
returns boolean language sql immutable set search_path = '' as $$
  select translate(lower(coalesce(t, '')), 'áéíóúü0134@$', 'aeiouuoieaas') ~
    '\m(put[ao]s?\M|pendej|mierd|cojud|huev[oó]n|webon|cabr[oó]n|conchatu|ctm\M|csm\M|mrd\M|verga|pinga|chuch|culo\M|maric|perra|joder|idiota|imbecil|estupid|nazi|hitler|sexo|porno|xxx)';
$$;

-- XP del clan esta semana (suma de sus miembros actuales)
create or replace function public.clan_xp_semana(c bigint)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(sum(x.xp), 0)::integer from public.clan_miembros m
  join public.xp_semana x on x.usuario = m.usuario and x.semana = public.cz_lunes()
  where m.clan = c;
$$;
revoke all on function public.clan_xp_semana(bigint) from public, anon, authenticated;

-- Guarda el XP de la semana en curso de todos los clanes abiertos
create or replace function public.clan_guardar_semana()
returns void language sql volatile security definer set search_path = '' as $$
  insert into public.clan_semanas (clan, semana, xp, meta, miembros)
  select c.id, public.cz_lunes(), public.clan_xp_semana(c.id), public.clan_meta(n.n), n.n
  from public.clanes c
  join lateral (select count(*)::integer as n from public.clan_miembros m where m.clan = c.id) n on true
  where not c.cerrado
  on conflict (clan, semana) do update set xp = excluded.xp, meta = excluded.meta, miembros = excluded.miembros;
$$;
revoke all on function public.clan_guardar_semana() from public, anon, authenticated;

-- Nivel = 1 + semanas cerradas con la meta cumplida; copas = semanas cerradas en el Top 3
create or replace function public.clan_logros(c bigint)
returns jsonb language sql stable security definer set search_path = '' as $$
  with cerradas as (
    select s.clan, s.semana, s.xp, s.meta, rank() over (partition by s.semana order by s.xp desc) as puesto
    from public.clan_semanas s where s.semana < public.cz_lunes() and s.xp > 0
  )
  select jsonb_build_object(
    'nivel', 1 + (select count(*) from cerradas k where k.clan = c and k.xp >= k.meta),
    'copas', (select count(*) from cerradas k where k.clan = c and k.puesto <= 3)
  );
$$;
revoke all on function public.clan_logros(bigint) from public, anon, authenticated;

create or replace function public.clan_espera(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.clan_salidas s where s.usuario = uid and s.cuando > now() - interval '24 hours');
$$;
revoke all on function public.clan_espera(uuid) from public, anon, authenticated;

create or replace function public.clan_validar(p_nombre text, p_tag text, p_forma text, p_simbolo text, p_color text)
returns void language plpgsql immutable set search_path = '' as $$
begin
  if char_length(trim(coalesce(p_nombre, ''))) not between 3 and 24 then raise exception 'nombre_largo'; end if;
  if upper(coalesce(p_tag, '')) !~ '^[A-Z0-9]{2,5}$' then raise exception 'tag_mal'; end if;
  if public.clan_nombre_feo(p_nombre) or public.clan_nombre_feo(p_tag) then raise exception 'nombre_feo'; end if;
  if coalesce(p_forma, '') not in ('punta', 'redondo', 'corona', 'alas') then raise exception 'forma_mal'; end if;
  if coalesce(p_simbolo, '') not in ('rayo', 'libro', 'buho', 'llama', 'estrella', 'montana', 'atomo') then raise exception 'simbolo_mal'; end if;
  if coalesce(p_color, '') !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'color_mal'; end if;
end $$;
revoke all on function public.clan_validar(text, text, text, text, text) from public, anon, authenticated;

-- ---------- Crear, unirse, salir ----------
create or replace function public.clan_crear(p_nombre text, p_tag text, p_forma text, p_simbolo text, p_color text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); c public.clanes;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if exists (select 1 from public.clan_miembros where usuario = uid) then raise exception 'ya_en_clan'; end if;
  if public.clan_espera(uid) then raise exception 'espera'; end if;
  perform public.clan_validar(p_nombre, p_tag, p_forma, p_simbolo, p_color);
  if exists (select 1 from public.clanes where lower(nombre) = lower(trim(p_nombre)) and not cerrado) then raise exception 'nombre_usado'; end if;
  insert into public.clanes (nombre, tag, codigo, forma, simbolo, color)
  values (trim(p_nombre), upper(p_tag), public.clan_codigo_nuevo(), p_forma, p_simbolo, upper(p_color))
  returning * into c;
  insert into public.clan_miembros (usuario, clan, rol) values (uid, c.id, 'lider');
  return jsonb_build_object('id', c.id, 'codigo', c.codigo);
end $$;
revoke all on function public.clan_crear(text, text, text, text, text) from public, anon;
grant execute on function public.clan_crear(text, text, text, text, text) to authenticated;

-- Vista previa del clan antes de unirse (sin la lista de miembros)
create or replace function public.clan_por_codigo(p_codigo text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); c public.clanes; n integer;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into c from public.clanes where codigo = upper(trim(p_codigo)) and not cerrado;
  if c.id is null then return null; end if;
  select count(*) into n from public.clan_miembros where clan = c.id;
  return jsonb_build_object('nombre', c.nombre, 'tag', c.tag, 'forma', c.forma, 'simbolo', c.simbolo, 'color', c.color,
    'oficial', c.oficial, 'miembros', n, 'xp', public.clan_xp_semana(c.id)) || public.clan_logros(c.id);
end $$;
revoke all on function public.clan_por_codigo(text) from public, anon;
grant execute on function public.clan_por_codigo(text) to authenticated;

create or replace function public.clan_unirse(p_codigo text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); c public.clanes;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if exists (select 1 from public.clan_miembros where usuario = uid) then raise exception 'ya_en_clan'; end if;
  if public.clan_espera(uid) then raise exception 'espera'; end if;
  select * into c from public.clanes where codigo = upper(trim(p_codigo)) and not cerrado for update;
  if c.id is null then raise exception 'no_existe'; end if;
  if (select count(*) from public.clan_miembros where clan = c.id) >= 20 then raise exception 'lleno'; end if;
  insert into public.clan_miembros (usuario, clan, rol) values (uid, c.id, 'miembro');
  return jsonb_build_object('id', c.id, 'nombre', c.nombre);
end $$;
revoke all on function public.clan_unirse(text) from public, anon;
grant execute on function public.clan_unirse(text) to authenticated;

-- Salir. Si sale el líder, el puesto pasa al sublíder más antiguo (o al miembro más antiguo).
-- Si era el último, el clan se cierra.
create or replace function public.clan_salir()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); m public.clan_miembros; nuevo uuid;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into m from public.clan_miembros where usuario = uid;
  if m.usuario is null then raise exception 'sin_clan'; end if;
  perform 1 from public.clanes where id = m.clan for update;
  delete from public.clan_miembros where usuario = uid;
  insert into public.clan_salidas (usuario, cuando) values (uid, now()) on conflict (usuario) do update set cuando = now();
  if m.rol = 'lider' then
    select usuario into nuevo from public.clan_miembros where clan = m.clan
      order by (rol = 'sub') desc, unido limit 1;
    if nuevo is null then
      update public.clanes set cerrado = true where id = m.clan;
    else
      update public.clan_miembros set rol = 'lider' where usuario = nuevo;
    end if;
  end if;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.clan_salir() from public, anon;
grant execute on function public.clan_salir() to authenticated;

-- ---------- Lo que hace el líder ----------
create or replace function public.clan_mi_rol(uid uuid)
returns public.clan_miembros language sql stable security definer set search_path = '' as $$
  select * from public.clan_miembros where usuario = uid;
$$;
revoke all on function public.clan_mi_rol(uuid) from public, anon, authenticated;

create or replace function public.clan_editar(p_nombre text, p_tag text, p_forma text, p_simbolo text, p_color text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); m public.clan_miembros := public.clan_mi_rol(auth.uid());
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if m.rol is distinct from 'lider' then raise exception 'no_lider'; end if;
  perform public.clan_validar(p_nombre, p_tag, p_forma, p_simbolo, p_color);
  if exists (select 1 from public.clanes where lower(nombre) = lower(trim(p_nombre)) and not cerrado and id <> m.clan) then raise exception 'nombre_usado'; end if;
  update public.clanes set nombre = trim(p_nombre), tag = upper(p_tag), forma = p_forma, simbolo = p_simbolo, color = upper(p_color)
  where id = m.clan;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.clan_editar(text, text, text, text, text) from public, anon;
grant execute on function public.clan_editar(text, text, text, text, text) to authenticated;

-- Código nuevo (el anterior deja de servir). Líder o sublíder.
create or replace function public.clan_nuevo_codigo()
returns text language plpgsql volatile security definer set search_path = '' as $$
declare m public.clan_miembros := public.clan_mi_rol(auth.uid()); c text;
begin
  if m.rol is null or m.rol = 'miembro' then raise exception 'no_lider'; end if;
  c := public.clan_codigo_nuevo();
  update public.clanes set codigo = c where id = m.clan;
  return c;
end $$;
revoke all on function public.clan_nuevo_codigo() from public, anon;
grant execute on function public.clan_nuevo_codigo() to authenticated;

-- Hacer sublíder / quitar sublíder / pasar el liderazgo ('sub', 'miembro', 'lider'). Solo el líder.
create or replace function public.clan_rol(p_jugador integer, p_rol text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); m public.clan_miembros := public.clan_mi_rol(auth.uid()); o uuid := public.usuario_de_codigo(p_jugador);
begin
  if m.rol is distinct from 'lider' then raise exception 'no_lider'; end if;
  if o is null or o = uid or not exists (select 1 from public.clan_miembros where usuario = o and clan = m.clan) then raise exception 'no_miembro'; end if;
  if p_rol = 'sub' then
    if (select count(*) from public.clan_miembros where clan = m.clan and rol = 'sub' and usuario <> o) >= 2 then raise exception 'max_sub'; end if;
    update public.clan_miembros set rol = 'sub' where usuario = o;
  elsif p_rol = 'miembro' then
    update public.clan_miembros set rol = 'miembro' where usuario = o;
  elsif p_rol = 'lider' then
    update public.clan_miembros set rol = 'sub' where usuario = uid;
    update public.clan_miembros set rol = 'lider' where usuario = o;
  else raise exception 'rol_mal'; end if;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.clan_rol(integer, text) from public, anon;
grant execute on function public.clan_rol(integer, text) to authenticated;

-- Sacar a alguien. El líder saca a cualquiera; el sublíder solo a miembros.
create or replace function public.clan_expulsar(p_jugador integer)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); m public.clan_miembros := public.clan_mi_rol(auth.uid()); o public.clan_miembros;
begin
  if m.rol is null or m.rol = 'miembro' then raise exception 'no_lider'; end if;
  select * into o from public.clan_miembros where usuario = public.usuario_de_codigo(p_jugador) and clan = m.clan;
  if o.usuario is null or o.usuario = uid then raise exception 'no_miembro'; end if;
  if m.rol = 'sub' and o.rol <> 'miembro' then raise exception 'no_lider'; end if;
  delete from public.clan_miembros where usuario = o.usuario;
  insert into public.clan_salidas (usuario, cuando) values (o.usuario, now()) on conflict (usuario) do update set cuando = now();
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.clan_expulsar(integer) from public, anon;
grant execute on function public.clan_expulsar(integer) to authenticated;

-- ---------- Lo que se ve ----------
-- Tu clan con sus miembros (o null si no tienes). 'espera' = horas que faltan para poder entrar a otro.
create or replace function public.mi_clan()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); m public.clan_miembros; c public.clanes; n integer; v_xp integer; v_puesto integer;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into m from public.clan_miembros where usuario = uid;
  if m.usuario is null then
    return jsonb_build_object('clan', null, 'espera',
      (select ceil(extract(epoch from (s.cuando + interval '24 hours' - now())) / 3600) from public.clan_salidas s
        where s.usuario = uid and s.cuando > now() - interval '24 hours'));
  end if;
  select * into c from public.clanes where id = m.clan;
  select count(*) into n from public.clan_miembros where clan = c.id;
  v_xp := public.clan_xp_semana(c.id);
  perform public.clan_guardar_semana();
  select 1 + count(*) into v_puesto from public.clan_semanas s join public.clanes k on k.id = s.clan and not k.cerrado
    where s.semana = public.cz_lunes() and s.xp > v_xp;
  return jsonb_build_object(
    'clan', jsonb_build_object('id', c.id, 'nombre', c.nombre, 'tag', c.tag, 'codigo', c.codigo, 'forma', c.forma, 'simbolo', c.simbolo,
      'color', c.color, 'oficial', c.oficial, 'creado', c.creado, 'miembros', n, 'xp', v_xp, 'meta', public.clan_meta(n),
      'puesto', case when v_xp > 0 then v_puesto end) || public.clan_logros(c.id),
    'rol', m.rol,
    'miembros', coalesce((
      select jsonb_agg(public.amigo_mini(k.usuario) || jsonb_build_object('rol', k.rol, 'unido', k.unido, 'yo', k.usuario = uid,
               'racha', coalesce((public.calc_racha(k.usuario) ->> 'actual')::integer, 0))
             order by coalesce(x.xp, 0) desc, k.unido)
      from public.clan_miembros k
      left join public.xp_semana x on x.usuario = k.usuario and x.semana = public.cz_lunes()
      where k.clan = c.id), '[]'::jsonb)
  );
end $$;
revoke all on function public.mi_clan() from public, anon;
grant execute on function public.mi_clan() to authenticated;

-- Top de clanes de la semana (10 primeros + el tuyo)
create or replace function public.ranking_clanes()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); mio bigint; top jsonb; yo jsonb;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  perform public.clan_guardar_semana();
  select clan into mio from public.clan_miembros where usuario = uid;
  with orden as (
    select s.clan, s.xp, s.miembros, row_number() over (order by s.xp desc, s.clan) as puesto
    from public.clan_semanas s join public.clanes c on c.id = s.clan and not c.cerrado
    where s.semana = public.cz_lunes() and s.xp > 0
  )
  select coalesce(jsonb_agg(jsonb_build_object('puesto', o.puesto, 'nombre', c.nombre, 'tag', c.tag, 'forma', c.forma, 'simbolo', c.simbolo,
           'color', c.color, 'oficial', c.oficial, 'miembros', o.miembros, 'xp', o.xp, 'mio', coalesce(o.clan = mio, false)) order by o.puesto)
           filter (where o.puesto <= 10), '[]'::jsonb),
         (array_agg(jsonb_build_object('puesto', o.puesto, 'nombre', c.nombre, 'tag', c.tag, 'forma', c.forma, 'simbolo', c.simbolo,
           'color', c.color, 'oficial', c.oficial, 'miembros', o.miembros, 'xp', o.xp, 'mio', true)) filter (where o.clan = mio))[1]
    into top, yo
  from orden o join public.clanes c on c.id = o.clan;
  return jsonb_build_object('top', top, 'mio', yo, 'tengo_clan', mio is not null,
    'total', (select count(*) from public.clan_semanas s join public.clanes c on c.id = s.clan and not c.cerrado where s.semana = public.cz_lunes() and s.xp > 0));
end $$;
revoke all on function public.ranking_clanes() from public, anon;
grant execute on function public.ranking_clanes() to authenticated;
