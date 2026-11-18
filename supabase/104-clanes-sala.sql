-- =========================================================
-- Modo Cachimbo · Sala de clan (clan vs clan en vivo, amistosa)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 88/89/103 (clanes), 71-amigos.sql, 97-laboratorio-rayos.sql
-- y 100-regalar-todos-rayos.sql.
--
--   Ticket de sala (como en Free Fire)
--   · Crear una sala gasta 1 ticket. Así no se crean salas sin control.
--   · Se consigue canjeando rayos (precio en sala_config, 60 ⚡ al inicio)
--     o como regalo del panel (Regalos → Ticket de sala).
--   · Si la sala se cancela o vence sin empezar, el ticket se devuelve.
--   Sala
--   · El líder o un sublíder la crea (con 1 ticket) y comparte el código de 5.
--   · El líder o sublíder de OTRO clan entra con el código: ese clan es el rival.
--   · Los miembros de los dos clanes entran con el mismo código (3, 5 o 10 por lado).
--   · Todos ven la misma pregunta al mismo tiempo. Acierto = 50 puntos + hasta
--     50 por rapidez. Gana el clan con mejor promedio por jugador.
--   · Premio de la plataforma (amistosa, nadie pone nada): +20 XP por jugar,
--     5 XP por acierto y +60 XP a cada jugador del clan ganador, si hubo al
--     menos 2 jugadores por lado. Cuenta en las 3 primeras salas del día.
--     Ese XP es de cada jugador y además suma al XP semanal del clan
--     (Top de clanes, meta y nivel), porque el clan suma el XP de sus miembros.
--   Diamantes
--   · Solo queda listo el «monedero» (diamantes_mov, diamantes_dar, mis_diamantes)
--     para conectarlo con la tienda más adelante. Todavía no se reparte nada.
-- =========================================================

-- ---------- Configuración ----------
create table if not exists public.sala_config (
  id            integer primary key default 1 check (id = 1),
  precio_rayos  integer not null default 60 check (precio_rayos between 1 and 1000),
  premio_xp_acierto integer not null default 5 check (premio_xp_acierto between 0 and 50),
  premio_xp_gana    integer not null default 60 check (premio_xp_gana between 0 and 500)
);
alter table public.sala_config add column if not exists premio_xp_jugar integer not null default 20 check (premio_xp_jugar between 0 and 200);
insert into public.sala_config (id) values (1) on conflict (id) do nothing;
alter table public.sala_config enable row level security;

-- ---------- Tickets ----------
create table if not exists public.sala_tickets (
  usuario  uuid primary key references auth.users (id) on delete cascade,
  cantidad integer not null default 0 check (cantidad between 0 and 999)
);
alter table public.sala_tickets enable row level security;

create or replace function public.sala_tickets_de(u uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce((select t.cantidad from public.sala_tickets t where t.usuario = u), 0);
$$;
revoke all on function public.sala_tickets_de(uuid) from public, anon, authenticated;

create or replace function public.sala_tickets_sumar(u uuid, n integer)
returns void language sql volatile security definer set search_path = '' as $$
  insert into public.sala_tickets (usuario, cantidad) values (u, greatest(0, least(999, n)))
  on conflict (usuario) do update set cantidad = greatest(0, least(999, public.sala_tickets.cantidad + n));
$$;
revoke all on function public.sala_tickets_sumar(uuid, integer) from public, anon, authenticated;

-- Rayos que tiene el alumno (lab_rayos: lo ganado menos lo gastado)
create or replace function public.rayos_saldo(u uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(sum(r.cantidad), 0)::integer from public.lab_rayos r where r.usuario = u;
$$;
revoke all on function public.rayos_saldo(uuid) from public, anon, authenticated;

-- Lo que ve el alumno: sus tickets, sus rayos y el precio
create or replace function public.mis_tickets()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'sin sesión'; end if;
  return jsonb_build_object('tickets', public.sala_tickets_de(uid), 'rayos', public.rayos_saldo(uid),
    'precio', (select c.precio_rayos from public.sala_config c where c.id = 1));
end $$;
revoke all on function public.mis_tickets() from public, anon;
grant execute on function public.mis_tickets() to authenticated;

-- Canjear rayos por 1 ticket
create or replace function public.canjear_ticket()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); precio integer;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select c.precio_rayos into precio from public.sala_config c where c.id = 1;
  perform pg_advisory_xact_lock(hashtext('rayos:' || uid::text));
  if public.rayos_saldo(uid) < precio then raise exception 'pocos_rayos'; end if;
  insert into public.lab_rayos (usuario, clave, cantidad) values (uid, 'ticket:' || gen_random_uuid(), -precio);
  perform public.sala_tickets_sumar(uid, 1);
  return public.mis_tickets();
end $$;
revoke all on function public.canjear_ticket() from public, anon;
grant execute on function public.canjear_ticket() to authenticated;

-- ---------- Regalos del panel: ahora también «Ticket de sala» ----------
alter table public.regalos drop constraint if exists regalos_tipo_check;
alter table public.regalos add constraint regalos_tipo_check
  check (tipo in ('corazones', 'infinito', 'xp', 'item', 'rayos', 'ticket'));

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

-- ---------- Diamantes: listo para la tienda (aún no se usa) ----------
create table if not exists public.diamantes_mov (
  id       bigint generated always as identity primary key,
  usuario  uuid not null references auth.users (id) on delete cascade,
  cantidad integer not null,
  motivo   text not null check (char_length(motivo) between 2 and 80),   -- 'liga:2026-W47', 'compra:<id>', 'tienda:<item>'…
  creado   timestamptz not null default now()
);
create index if not exists diamantes_mov_u on public.diamantes_mov (usuario, creado);
alter table public.diamantes_mov enable row level security;

-- Dar (o quitar con número negativo) diamantes. Uso interno: ligas, compras, tienda.
create or replace function public.diamantes_dar(u uuid, n integer, p_motivo text)
returns integer language plpgsql volatile security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext('diam:' || u::text));
  if n < 0 and (select coalesce(sum(d.cantidad), 0) from public.diamantes_mov d where d.usuario = u) + n < 0 then raise exception 'pocos_diamantes'; end if;
  insert into public.diamantes_mov (usuario, cantidad, motivo) values (u, n, left(p_motivo, 80));
  return (select coalesce(sum(d.cantidad), 0)::integer from public.diamantes_mov d where d.usuario = u);
end $$;
revoke all on function public.diamantes_dar(uuid, integer, text) from public, anon, authenticated;

create or replace function public.mis_diamantes()
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(sum(d.cantidad), 0)::integer from public.diamantes_mov d where d.usuario = auth.uid();
$$;
revoke all on function public.mis_diamantes() from public, anon;
grant execute on function public.mis_diamantes() to authenticated;

-- ---------- Salas ----------
create table if not exists public.clan_salas (
  id        bigint generated always as identity primary key,
  codigo    text not null unique check (codigo ~ '^[A-Z2-9]{5}$'),
  creador   uuid references auth.users (id) on delete set null,
  clan_a    bigint not null references public.clanes (id) on delete cascade,
  clan_b    bigint references public.clanes (id) on delete cascade,
  titulo    text not null check (char_length(titulo) between 1 and 80),
  preguntas jsonb not null,                -- [{ref, c, k}]
  n         integer not null check (n between 5 and 20),
  seg       integer not null check (seg between 10 and 60),
  formato   integer not null check (formato in (3, 5, 10)),
  estado    text not null default 'espera' check (estado in ('espera', 'juego', 'fin', 'cancelada')),
  inicio    timestamptz,
  ganador   bigint,
  pts_a     numeric(7,1),
  pts_b     numeric(7,1),
  ticket    boolean not null default true,  -- se gastó un ticket (para devolverlo)
  creado    timestamptz not null default now(),
  check (clan_b is null or clan_b <> clan_a)
);
create index if not exists clan_salas_a on public.clan_salas (clan_a, estado);
create index if not exists clan_salas_b on public.clan_salas (clan_b, estado);
alter table public.clan_salas enable row level security;

create table if not exists public.clan_sala_jug (
  sala      bigint not null references public.clan_salas (id) on delete cascade,
  usuario   uuid not null references auth.users (id) on delete cascade,
  clan      bigint not null,
  puntos    integer not null default 0,
  aciertos  integer not null default 0,
  resp      jsonb not null default '{}'::jsonb,   -- {"i": [k, ok, puntos]}
  premio    integer,
  unido     timestamptz not null default now(),
  primary key (sala, usuario)
);
create index if not exists clan_sala_jug_u on public.clan_sala_jug (usuario, unido);
alter table public.clan_sala_jug enable row level security;

-- Cada pregunta dura seg segundos y luego 4 de pausa (se ve la respuesta)
create or replace function public.sala_paso(s public.clan_salas)
returns integer language sql immutable set search_path = '' as $$ select s.seg + 4 $$;

-- Cierra lo vencido: salas en espera de más de 30 min (devuelve el ticket) y partidas terminadas
create or replace function public.sala_tick(p_id bigint)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare s public.clan_salas; pa numeric; pb numeric; na integer; nb integer; cfg public.sala_config; j record; px integer;
begin
  select * into s from public.clan_salas where id = p_id for update;
  if s.id is null then return; end if;
  if s.estado = 'espera' and s.creado < now() - interval '30 minutes' then
    update public.clan_salas set estado = 'cancelada' where id = s.id;
    if s.ticket and s.creador is not null then perform public.sala_tickets_sumar(s.creador, 1); end if;
    return;
  end if;
  if s.estado <> 'juego' or now() < s.inicio + (s.n * public.sala_paso(s)) * interval '1 second' then return; end if;
  -- Fin: promedio por jugador de cada clan
  select coalesce(avg(puntos), 0), count(*) into pa, na from public.clan_sala_jug where sala = s.id and clan = s.clan_a;
  select coalesce(avg(puntos), 0), count(*) into pb, nb from public.clan_sala_jug where sala = s.id and clan = s.clan_b;
  update public.clan_salas set estado = 'fin', pts_a = round(pa, 1), pts_b = round(pb, 1),
    ganador = case when round(pa, 1) > round(pb, 1) then s.clan_a when round(pb, 1) > round(pa, 1) then s.clan_b end
  where id = s.id returning * into s;
  -- Premio de la plataforma (amistosa): solo si hubo al menos 2 por lado, en las 3 primeras salas del día
  select * into cfg from public.sala_config where id = 1;
  for j in select * from public.clan_sala_jug where sala = s.id loop
    px := 0;
    if na >= 2 and nb >= 2 and (select count(*) from public.clan_sala_jug k join public.clan_salas x on x.id = k.sala
         where k.usuario = j.usuario and k.premio is not null and x.estado = 'fin'
           and (k.unido at time zone 'America/Lima')::date = (now() at time zone 'America/Lima')::date) < 3 then
      px := cfg.premio_xp_jugar + j.aciertos * cfg.premio_xp_acierto + case when s.ganador = j.clan then cfg.premio_xp_gana else 0 end;
    end if;
    update public.clan_sala_jug set premio = px where sala = s.id and usuario = j.usuario;
    if px > 0 then
      perform public.cz_estado(j.usuario);
      insert into public.xp_semana (usuario, semana, xp) values (j.usuario, public.cz_lunes(), px)
      on conflict (usuario, semana) do update set xp = public.xp_semana.xp + excluded.xp;
      update public.corazones set xp_saldo = xp_saldo + px, actualizado = now() where usuario = j.usuario;
    end if;
  end loop;
end $$;
revoke all on function public.sala_tick(bigint) from public, anon, authenticated;

-- Crear (líder o sublíder, gasta 1 ticket)
-- p = { titulo, n, seg, formato, preguntas: [{ref, c, k}] }
create or replace function public.clan_sala_crear(p jsonb)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); m public.clan_miembros; cod text; q jsonb; lista jsonb := '[]';
  letras constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; v_seg integer; v_for integer; s_id bigint;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into m from public.clan_miembros where usuario = uid;
  if m.usuario is null then raise exception 'sin_clan'; end if;
  if m.rol = 'miembro' then raise exception 'no_lider'; end if;
  for s_id in select id from public.clan_salas where (clan_a = m.clan or clan_b = m.clan) and estado in ('espera', 'juego') loop
    perform public.sala_tick(s_id);
  end loop;
  if exists (select 1 from public.clan_salas where (clan_a = m.clan or clan_b = m.clan) and estado in ('espera', 'juego')) then raise exception 'sala_abierta'; end if;
  if jsonb_typeof(p -> 'preguntas') <> 'array' or jsonb_array_length(p -> 'preguntas') not between 5 and 20 then raise exception 'preguntas no válidas'; end if;
  for q in select * from jsonb_array_elements(p -> 'preguntas') loop
    if coalesce(q ->> 'ref', '') !~ '^[a-z0-9-]{2,40}/(libros|seminarios|banqueo)/data/[0-9]{4}-(I|II|III)(-fijas)?\.json#[A-Za-z0-9._-]{1,12}#[0-9]{1,3}$'
       or jsonb_typeof(q -> 'c') <> 'number' or jsonb_typeof(q -> 'k') <> 'number'
       or (q ->> 'k')::integer not between 2 and 8 or (q ->> 'c')::integer not between 0 and (q ->> 'k')::integer - 1 then
      raise exception 'pregunta no válida';
    end if;
    lista := lista || jsonb_build_array(jsonb_build_object('ref', q ->> 'ref', 'c', (q ->> 'c')::integer, 'k', (q ->> 'k')::integer));
  end loop;
  v_seg := case when (p ->> 'seg') in ('15', '20', '30') then (p ->> 'seg')::integer else 20 end;
  v_for := case when (p ->> 'formato') in ('3', '5', '10') then (p ->> 'formato')::integer else 5 end;
  -- El ticket
  perform pg_advisory_xact_lock(hashtext('ticket:' || uid::text));
  if public.sala_tickets_de(uid) < 1 then raise exception 'sin_ticket'; end if;
  perform public.sala_tickets_sumar(uid, -1);
  loop
    cod := '';
    for i in 1..5 loop cod := cod || substr(letras, 1 + floor(random() * length(letras))::integer, 1); end loop;
    exit when not exists (select 1 from public.clan_salas x where x.codigo = cod);
  end loop;
  insert into public.clan_salas (codigo, creador, clan_a, titulo, preguntas, n, seg, formato)
  values (cod, uid, m.clan, left(coalesce(nullif(trim(p ->> 'titulo'), ''), 'Sala de clan'), 80), lista, jsonb_array_length(lista), v_seg, v_for)
  returning id into s_id;
  insert into public.clan_sala_jug (sala, usuario, clan) values (s_id, uid, m.clan);
  return cod;
end $$;
revoke all on function public.clan_sala_crear(jsonb) from public, anon;
grant execute on function public.clan_sala_crear(jsonb) to authenticated;

-- Entrar con el código. El líder/sublíder de otro clan la acepta (su clan es el rival).
create or replace function public.clan_sala_entrar(p_codigo text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); m public.clan_miembros; s public.clan_salas;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into m from public.clan_miembros where usuario = uid;
  if m.usuario is null then raise exception 'sin_clan'; end if;
  select * into s from public.clan_salas where codigo = upper(trim(p_codigo));
  if s.id is null then raise exception 'sala_no_existe'; end if;
  perform public.sala_tick(s.id);
  select * into s from public.clan_salas where id = s.id for update;
  if exists (select 1 from public.clan_sala_jug where sala = s.id and usuario = uid) then return jsonb_build_object('codigo', s.codigo); end if;
  if s.estado <> 'espera' then raise exception 'sala_cerrada'; end if;
  if m.clan <> s.clan_a and s.clan_b is null then
    if m.rol = 'miembro' then raise exception 'sala_sin_rival'; end if;
    if exists (select 1 from public.clan_salas x where (x.clan_a = m.clan or x.clan_b = m.clan) and x.estado in ('espera', 'juego') and x.id <> s.id) then raise exception 'sala_abierta'; end if;
    update public.clan_salas set clan_b = m.clan where id = s.id returning * into s;
  end if;
  if m.clan not in (s.clan_a, coalesce(s.clan_b, -1)) then raise exception 'sala_otro_clan'; end if;
  if (select count(*) from public.clan_sala_jug where sala = s.id and clan = m.clan) >= s.formato then raise exception 'sala_llena'; end if;
  insert into public.clan_sala_jug (sala, usuario, clan) values (s.id, uid, m.clan);
  return jsonb_build_object('codigo', s.codigo);
end $$;
revoke all on function public.clan_sala_entrar(text) from public, anon;
grant execute on function public.clan_sala_entrar(text) to authenticated;

-- Salir de la sala (solo en espera). Si sale el creador, la sala se cancela y vuelve su ticket.
create or replace function public.clan_sala_salir(p_codigo text)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); s public.clan_salas;
begin
  select * into s from public.clan_salas where codigo = upper(trim(p_codigo)) for update;
  if s.id is null or s.estado <> 'espera' then return; end if;
  if s.creador = uid then
    update public.clan_salas set estado = 'cancelada' where id = s.id;
    if s.ticket then perform public.sala_tickets_sumar(uid, 1); end if;
    return;
  end if;
  delete from public.clan_sala_jug where sala = s.id and usuario = uid;
  -- Si se fue el último del clan rival, la sala vuelve a esperar rival
  if s.clan_b is not null and not exists (select 1 from public.clan_sala_jug where sala = s.id and clan = s.clan_b) then
    update public.clan_salas set clan_b = null where id = s.id;
  end if;
end $$;
revoke all on function public.clan_sala_salir(text) from public, anon;
grant execute on function public.clan_sala_salir(text) to authenticated;

-- Empezar (el creador, o un líder/sublíder del clan que creó la sala)
create or replace function public.clan_sala_empezar(p_codigo text)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); s public.clan_salas; m public.clan_miembros;
begin
  select * into s from public.clan_salas where codigo = upper(trim(p_codigo)) for update;
  if s.id is null then raise exception 'sala_no_existe'; end if;
  if s.estado <> 'espera' then return; end if;
  select * into m from public.clan_miembros where usuario = uid;
  if not (s.creador = uid or (m.clan = s.clan_a and m.rol <> 'miembro')) then raise exception 'no_lider'; end if;
  if s.clan_b is null then raise exception 'sala_sin_rival'; end if;
  if (select count(*) from public.clan_sala_jug where sala = s.id and clan = s.clan_a) < 1
     or (select count(*) from public.clan_sala_jug where sala = s.id and clan = s.clan_b) < 1 then raise exception 'sala_pocos'; end if;
  update public.clan_salas set estado = 'juego', inicio = now() + interval '6 seconds' where id = s.id;
end $$;
revoke all on function public.clan_sala_empezar(text) from public, anon;
grant execute on function public.clan_sala_empezar(text) to authenticated;

-- Responder la pregunta i (k = posición original de la alternativa; -1 = no supo)
create or replace function public.clan_sala_responder(p_codigo text, p_i integer, p_k integer)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); s public.clan_salas; j public.clan_sala_jug; t0 timestamptz; q jsonb; ok boolean; pts integer := 0; quedan numeric;
begin
  select * into s from public.clan_salas where codigo = upper(trim(p_codigo));
  if s.id is null or s.estado <> 'juego' then raise exception 'sala_cerrada'; end if;
  select * into j from public.clan_sala_jug where sala = s.id and usuario = uid for update;
  if j.usuario is null then raise exception 'sala_no_juegas'; end if;
  if p_i < 0 or p_i >= s.n then raise exception 'pregunta no válida'; end if;
  if j.resp ? p_i::text then return jsonb_build_object('repetida', true); end if;
  t0 := s.inicio + (p_i * public.sala_paso(s)) * interval '1 second';
  quedan := extract(epoch from (t0 + s.seg * interval '1 second' - now()));
  if now() < t0 - interval '1 second' or quedan < -1.5 then raise exception 'fuera_de_tiempo'; end if;
  q := s.preguntas -> p_i;
  ok := p_k = (q ->> 'c')::integer;
  if ok then pts := 50 + round(50 * greatest(0, least(1, quedan / s.seg)))::integer; end if;
  update public.clan_sala_jug set resp = resp || jsonb_build_object(p_i::text, jsonb_build_array(p_k, ok, pts)),
    puntos = puntos + pts, aciertos = aciertos + case when ok then 1 else 0 end
  where sala = s.id and usuario = uid;
  return jsonb_build_object('ok', ok, 'puntos', pts);
end $$;
revoke all on function public.clan_sala_responder(text, integer, integer) from public, anon;
grant execute on function public.clan_sala_responder(text, integer, integer) to authenticated;

-- Todo lo que se ve de la sala (se consulta cada pocos segundos)
create or replace function public.clan_sala_ver(p_codigo text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); s public.clan_salas; yo public.clan_sala_jug; m public.clan_miembros; termino boolean;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into s from public.clan_salas where codigo = upper(trim(p_codigo));
  if s.id is null then raise exception 'sala_no_existe'; end if;
  perform public.sala_tick(s.id);
  select * into s from public.clan_salas where id = s.id;
  select * into yo from public.clan_sala_jug where sala = s.id and usuario = uid;
  select * into m from public.clan_miembros where usuario = uid;
  termino := s.estado = 'fin';
  return jsonb_build_object(
    'codigo', s.codigo, 'titulo', s.titulo, 'estado', s.estado, 'n', s.n, 'seg', s.seg, 'paso', public.sala_paso(s), 'formato', s.formato,
    'inicio', s.inicio, 'ahora', now(), 'creado', s.creado, 'ganador', s.ganador, 'pts_a', s.pts_a, 'pts_b', s.pts_b,
    'yo', case when yo.usuario is null then null else jsonb_build_object('clan', yo.clan, 'puntos', yo.puntos, 'aciertos', yo.aciertos, 'resp', yo.resp, 'premio', yo.premio) end,
    'mi_clan', m.clan, 'mi_rol', m.rol, 'creador', s.creador = uid,
    -- La clave de cada pregunta solo se manda cuando ya pasó su tiempo
    'preguntas', (select jsonb_agg(jsonb_build_object('ref', e.q ->> 'ref', 'k', (e.q ->> 'k')::integer,
                    'c', case when termino or (s.estado = 'juego' and now() > s.inicio + ((e.n - 1) * public.sala_paso(s) + s.seg) * interval '1 second') then (e.q ->> 'c')::integer end)
                    order by e.n)
                  from jsonb_array_elements(s.preguntas) with ordinality e(q, n)),
    'clanes', jsonb_build_array(
      (select public.clan_mini(s.clan_a)),
      case when s.clan_b is not null then (select public.clan_mini(s.clan_b)) end),
    'jugadores', coalesce((select jsonb_agg(public.amigo_mini(j.usuario) || jsonb_build_object('clan', j.clan, 'yo', j.usuario = uid,
                    'puntos', case when s.estado <> 'espera' then j.puntos end, 'aciertos', case when s.estado <> 'espera' then j.aciertos end,
                    'respondio', case when s.estado = 'juego' then (select count(*) from jsonb_object_keys(j.resp)) end, 'premio', j.premio)
                    order by j.puntos desc, j.unido)
                  from public.clan_sala_jug j where j.sala = s.id), '[]'::jsonb)
  );
end $$;
revoke all on function public.clan_sala_ver(text) from public, anon;
grant execute on function public.clan_sala_ver(text) to authenticated;

-- La sala abierta de mi clan (para el botón en Clanes) y mis tickets
create or replace function public.clan_sala_mia()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); m public.clan_miembros; s public.clan_salas; sid bigint;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into m from public.clan_miembros where usuario = uid;
  if m.usuario is not null then
    for sid in select id from public.clan_salas where (clan_a = m.clan or clan_b = m.clan) and estado in ('espera', 'juego') loop
      perform public.sala_tick(sid);
    end loop;
    select * into s from public.clan_salas where (clan_a = m.clan or clan_b = m.clan) and estado in ('espera', 'juego') order by creado desc limit 1;
  end if;
  return jsonb_build_object('tickets', public.sala_tickets_de(uid), 'rayos', public.rayos_saldo(uid),
    'precio', (select c.precio_rayos from public.sala_config c where c.id = 1),
    'sala', case when s.id is not null then jsonb_build_object('codigo', s.codigo, 'estado', s.estado, 'titulo', s.titulo,
      'rival', (select k.nombre from public.clanes k where k.id = case when s.clan_a = m.clan then s.clan_b else s.clan_a end)) end);
end $$;
revoke all on function public.clan_sala_mia() from public, anon;
grant execute on function public.clan_sala_mia() to authenticated;
