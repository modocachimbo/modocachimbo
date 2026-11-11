-- =========================================================
-- Modo Cachimbo · Ficha del alumno y Por vencer (Panel → Alumnos)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 02, 14, 15, 36, 43, 53, 64, 70, 77 y 78.
--
--   · ficha_buscar(texto): busca por ID de 5 cifras, correo, nombre,
--     apodo, celular o código de acceso.
--   · ficha_alumno(usuario): todo de un alumno (datos, accesos por ID y
--     por código, equipos, regalos, pagos, nota, suspensión, historial).
--   · acceso_id_extender(id, días): +30 días (o los que digas) a un acceso
--     dado por ID. Si ya venció, cuenta desde hoy.
--   · codigo_cuenta_vence(código, fecha): cuando el panel alarga un código
--     en la hoja, también se corrige en las cuentas que lo guardaron.
--   · alumno_pago: lo que te pagó cada alumno (monto, medio, para qué).
--   · alumno_nota: una nota privada por alumno (solo el panel la ve).
--   · alumno_suspension: cuenta suspendida hasta una fecha (o para siempre).
--     El alumno ve un aviso y la web se le cierra (assets/auth.js) y sus
--     accesos por ID dejan de abrir. El motivo solo lo ves tú.
--   · alumno_contacto: cuándo le escribiste por WhatsApp desde el panel.
--   · por_vencer(días): accesos (por ID y por código) que vencen pronto
--     o vencieron hace poco, con el celular del alumno.
-- =========================================================

create table if not exists public.alumno_pago (
  id       bigserial primary key,
  usuario  uuid not null references auth.users (id) on delete cascade,
  monto    numeric(8, 2) not null check (monto >= 0 and monto <= 100000),
  medio    text check (medio in ('yape', 'plin', 'efectivo', 'transferencia', 'otro')),
  producto text check (char_length(producto) <= 300),
  nota     text check (char_length(nota) <= 140),
  fecha    date not null default (now() at time zone 'America/Lima')::date,
  por      text,
  creado   timestamptz not null default now()
);
create index if not exists alumno_pago_usuario on public.alumno_pago (usuario, fecha desc);
create index if not exists alumno_pago_fecha on public.alumno_pago (fecha desc);
alter table public.alumno_pago enable row level security;

create table if not exists public.alumno_nota (
  usuario     uuid primary key references auth.users (id) on delete cascade,
  nota        text not null check (char_length(nota) <= 600),
  actualizado timestamptz not null default now(),
  por         text
);
alter table public.alumno_nota enable row level security;

create table if not exists public.alumno_suspension (
  usuario uuid primary key references auth.users (id) on delete cascade,
  hasta   timestamptz,               -- null = para siempre
  motivo  text check (char_length(motivo) <= 200),
  creado  timestamptz not null default now(),
  por     text
);
alter table public.alumno_suspension enable row level security;

create table if not exists public.alumno_contacto (
  id      bigserial primary key,
  usuario uuid not null references auth.users (id) on delete cascade,
  ref     text check (char_length(ref) <= 60),   -- 'id-12' o 'cod-MC-XXXX'
  creado  timestamptz not null default now(),
  por     text
);
create index if not exists alumno_contacto_usuario on public.alumno_contacto (usuario, creado desc);
alter table public.alumno_contacto enable row level security;
-- Nadie lee ni escribe estas tablas directo: solo con las funciones de abajo

-- Quién puede ver la ficha: admins y ayudantes con «Alumnos» o «Códigos»
create or replace function public.ficha_puede()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.es_admin(), false) or coalesce(public.puede('alumnos'), false) or coalesce(public.puede('codigos'), false)
$$;
revoke all on function public.ficha_puede() from public, anon, authenticated;

-- ¿Está suspendido ahora?
create or replace function public.suspendido(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.alumno_suspension s where s.usuario = uid and (s.hasta is null or s.hasta > now()))
$$;
revoke all on function public.suspendido(uuid) from public, anon, authenticated;

-- ---------- Buscar ----------
create or replace function public.ficha_buscar(p_q text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare q text := lower(trim(coalesce(p_q, ''))); n integer;
begin
  if not public.ficha_puede() then raise exception 'no autorizado'; end if;
  if char_length(q) < 2 then return '[]'::jsonb; end if;
  n := case when q ~ '^\d{5}$' then q::integer end;
  return coalesce((
    select jsonb_agg(x order by x ->> 'apodo') from (
      select distinct on (u.id) jsonb_build_object(
          'usuario', u.id, 'jid', j.codigo, 'email', lower(u.email), 'nombre', p.nombre, 'apodo', public.duelo_apodo(u.id),
          'foto', case when p.foto_url like 'https://%' then p.foto_url end) as x
        from auth.users u
        left join public.perfiles p on p.id = u.id
        left join public.jugador_id j on j.usuario = u.id
       where (n is not null and j.codigo = n)
          or lower(u.email) like '%' || q || '%'
          or lower(coalesce(p.nombre, '')) like '%' || q || '%'
          or lower(coalesce(p.apodo, '')) like '%' || q || '%'
          or (q ~ '^\d{6,9}$' and p.celular like '%' || q || '%')
          or exists (select 1 from public.codigos_cuenta c where c.usuario = u.id and lower(c.codigo) = q)
       limit 20) t), '[]'::jsonb);
end $$;
revoke all on function public.ficha_buscar(text) from public, anon;
grant execute on function public.ficha_buscar(text) to authenticated;

-- ---------- Ficha completa ----------
create or replace function public.ficha_alumno(p_usuario uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r jsonb; hoy text := public.acceso_id_hoy();
begin
  if not public.ficha_puede() then raise exception 'no autorizado'; end if;
  if not exists (select 1 from auth.users u where u.id = p_usuario) then return null; end if;
  r := public.calc_racha(p_usuario);
  return jsonb_build_object(
    'usuario', p_usuario,
    'jid', (select j.codigo from public.jugador_id j where j.usuario = p_usuario),
    'email', (select lower(u.email) from auth.users u where u.id = p_usuario),
    'creado', (select u.created_at from auth.users u where u.id = p_usuario),
    'ultimo_login', (select u.last_sign_in_at from auth.users u where u.id = p_usuario),
    'apodo', public.duelo_apodo(p_usuario),
    'perfil', (select jsonb_build_object('nombre', p.nombre, 'apodo', p.apodo, 'carrera', p.carrera, 'modalidad', p.modalidad,
                  'celular', p.celular, 'foto', case when p.foto_url like 'https://%' then p.foto_url end)
                 from public.perfiles p where p.id = p_usuario),
    'racha', jsonb_build_object('actual', r -> 'actual', 'mejor', r -> 'mejor', 'hoy', r -> 'hoy'),
    'ultima_actividad', (select max(a.fecha) from public.actividad a where a.usuario = p_usuario and a.preguntas > 0),
    'hoy', hoy,
    'por_id', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'producto', a.producto, 'vence', a.vence, 'nota', a.nota,
                    'creado', a.creado, 'limite_dia', a.limite_dia, 'max_equipos', a.max_equipos) order by a.creado desc)
                  from public.accesos_id a where a.usuario = p_usuario and a.quitado is null), '[]'::jsonb),
    'codigos', coalesce((select jsonb_agg(jsonb_build_object('codigo', c.codigo, 'producto', c.producto, 'vence', c.vence, 'creado', c.creado) order by c.creado desc)
                  from public.codigos_cuenta c where c.usuario = p_usuario), '[]'::jsonb),
    'equipos', coalesce((select jsonb_agg(jsonb_build_object('dispositivo', e.dispositivo, 'equipo', e.equipo, 'visto', e.visto) order by e.visto desc)
                  from public.accesos_equipos e where e.usuario = p_usuario), '[]'::jsonb),
    'equipos_max', public.acceso_id_equipos_de(p_usuario),
    'descargas', jsonb_build_object(
        'total', (select count(*) from public.descargas d where d.usuario = p_usuario),
        'mes', (select count(*) from public.descargas d where d.usuario = p_usuario and d.creado > now() - interval '30 days')),
    'influencer', exists (select 1 from public.grupo_miembro g where g.grupo = 'influencer' and g.usuario = p_usuario),
    'nota', (select n.nota from public.alumno_nota n where n.usuario = p_usuario),
    'suspension', (select jsonb_build_object('hasta', s.hasta, 'motivo', s.motivo, 'creado', s.creado, 'por', s.por)
                     from public.alumno_suspension s where s.usuario = p_usuario and (s.hasta is null or s.hasta > now())),
    'pagado', coalesce((select sum(x.monto) from public.alumno_pago x where x.usuario = p_usuario), 0),
    'historial', coalesce((select jsonb_agg(z.h || jsonb_build_object('t', z.t) order by z.t desc) from (
        select a.creado as t, jsonb_build_object('tipo', 'id', 'txt', 'Por ID: ' || a.producto || coalesce(' hasta ' || a.vence, '')) as h
          from public.accesos_id a where a.usuario = p_usuario
        union all
        select a.quitado, jsonb_build_object('tipo', 'quitado', 'txt', 'Le quitaste ' || a.producto)
          from public.accesos_id a where a.usuario = p_usuario and a.quitado is not null
        union all
        select g.creado, jsonb_build_object('tipo', 'regalo', 'txt', 'Regalo: ' || g.tipo || coalesce(' ' || g.cantidad, '') || coalesce(' ' || g.item, ''))
          from public.regalos g where g.usuario = p_usuario
        union all
        select x.creado, jsonb_build_object('tipo', 'pago', 'txt', 'Pagó S/ ' || x.monto || coalesce(' por ' || x.medio, '') || coalesce(' · ' || x.producto, '') || coalesce(' · ' || x.nota, ''))
          from public.alumno_pago x where x.usuario = p_usuario
        union all
        select c.creado, jsonb_build_object('tipo', 'contacto', 'txt', 'Le escribiste por WhatsApp')
          from public.alumno_contacto c where c.usuario = p_usuario
        union all
        select c.creado, jsonb_build_object('tipo', 'codigo', 'txt', 'Activó el código ' || c.codigo)
          from public.codigos_cuenta c where c.usuario = p_usuario
        order by 1 desc limit 40) z), '[]'::jsonb)
  );
end $$;
revoke all on function public.ficha_alumno(uuid) from public, anon;
grant execute on function public.ficha_alumno(uuid) to authenticated;

-- ---------- +30 días a un acceso por ID ----------
create or replace function public.acceso_id_extender(p_id bigint, p_dias integer)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare v text; hoy date := (now() at time zone 'America/Lima')::date; base date;
begin
  if not public.acceso_id_puede() then raise exception 'no autorizado'; end if;
  if p_dias is null or p_dias < 1 or p_dias > 730 then raise exception 'Días: de 1 a 730'; end if;
  select a.vence into v from public.accesos_id a where a.id = p_id and a.quitado is null;
  if not found then raise exception 'Ese acceso ya no existe'; end if;
  base := greatest(coalesce(nullif(v, '')::date, hoy), hoy);
  v := to_char(base + p_dias, 'YYYY-MM-DD');
  update public.accesos_id set vence = v where id = p_id;
  perform public.anotar('Alumnos', 'Alargó ' || p_dias || ' días un acceso por ID', jsonb_build_object('id', p_id, 'vence', v));
  return v;
end $$;
revoke all on function public.acceso_id_extender(bigint, integer) from public, anon;
grant execute on function public.acceso_id_extender(bigint, integer) to authenticated;

-- ---------- Un código alargado en la hoja: corregir la fecha en las cuentas ----------
create or replace function public.codigo_cuenta_vence(p_codigo text, p_vence text)
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare n integer;
begin
  if not public.acceso_id_puede() then raise exception 'no autorizado'; end if;
  if nullif(p_vence, '') is not null and p_vence !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Fecha inválida'; end if;
  update public.codigos_cuenta set vence = nullif(p_vence, '') where codigo = upper(p_codigo);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.codigo_cuenta_vence(text, text) from public, anon;
grant execute on function public.codigo_cuenta_vence(text, text) to authenticated;

-- ---------- Pagos ----------
create or replace function public.alumno_pagar(p_usuario uuid, p_monto numeric, p_medio text default null, p_producto text default null, p_nota text default null)
returns bigint language plpgsql volatile security definer set search_path = '' as $$
declare v bigint;
begin
  if not public.ficha_puede() then raise exception 'no autorizado'; end if;
  if p_monto is null or p_monto < 0 or p_monto > 100000 then raise exception 'Monto no válido'; end if;
  insert into public.alumno_pago (usuario, monto, medio, producto, nota, por)
  values (p_usuario, round(p_monto, 2), nullif(p_medio, ''), nullif(left(p_producto, 300), ''), nullif(left(trim(coalesce(p_nota, '')), 140), ''),
          lower(auth.jwt() ->> 'email'))
  returning id into v;
  perform public.anotar('Alumnos', 'Anotó un pago de S/ ' || round(p_monto, 2), jsonb_build_object('usuario', p_usuario, 'medio', p_medio));
  return v;
end $$;
revoke all on function public.alumno_pagar(uuid, numeric, text, text, text) from public, anon;
grant execute on function public.alumno_pagar(uuid, numeric, text, text, text) to authenticated;

create or replace function public.alumno_pago_borrar(p_id bigint)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  delete from public.alumno_pago where id = p_id;
end $$;
revoke all on function public.alumno_pago_borrar(bigint) from public, anon;
grant execute on function public.alumno_pago_borrar(bigint) to authenticated;

-- ---------- Nota privada ----------
create or replace function public.alumno_nota_guardar(p_usuario uuid, p_nota text)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare t text := left(trim(coalesce(p_nota, '')), 600);
begin
  if not public.ficha_puede() then raise exception 'no autorizado'; end if;
  if t = '' then delete from public.alumno_nota where usuario = p_usuario; return; end if;
  insert into public.alumno_nota (usuario, nota, por) values (p_usuario, t, lower(auth.jwt() ->> 'email'))
  on conflict (usuario) do update set nota = excluded.nota, por = excluded.por, actualizado = now();
end $$;
revoke all on function public.alumno_nota_guardar(uuid, text) from public, anon;
grant execute on function public.alumno_nota_guardar(uuid, text) to authenticated;

-- ---------- Suspender (solo el administrador) ----------
--   p_dias: 1 a 365, o null para siempre. p_quitar = true la levanta.
create or replace function public.alumno_suspender(p_usuario uuid, p_dias integer default null, p_motivo text default null, p_quitar boolean default false)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  if p_quitar then
    delete from public.alumno_suspension where usuario = p_usuario;
    perform public.anotar('Alumnos', 'Levantó una suspensión', jsonb_build_object('usuario', p_usuario));
    return;
  end if;
  if p_dias is not null and (p_dias < 1 or p_dias > 365) then raise exception 'Días: de 1 a 365'; end if;
  if exists (select 1 from public.admins a join auth.users u on lower(u.email) = lower(a.email) where u.id = p_usuario) then
    raise exception 'No puedes suspender a un administrador';
  end if;
  insert into public.alumno_suspension (usuario, hasta, motivo, por)
  values (p_usuario, case when p_dias is null then null else now() + p_dias * interval '1 day' end,
          nullif(left(trim(coalesce(p_motivo, '')), 200), ''), lower(auth.jwt() ->> 'email'))
  on conflict (usuario) do update set hasta = excluded.hasta, motivo = excluded.motivo, por = excluded.por, creado = now();
  perform public.anotar('Alumnos', 'Suspendió una cuenta' || coalesce(' por ' || p_dias || ' días', ' para siempre'), jsonb_build_object('usuario', p_usuario));
end $$;
revoke all on function public.alumno_suspender(uuid, integer, text, boolean) from public, anon;
grant execute on function public.alumno_suspender(uuid, integer, text, boolean) to authenticated;

-- El alumno: ¿estoy suspendido? (sin el motivo)
create or replace function public.mi_suspension()
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when s.usuario is null then null else jsonb_build_object('hasta', s.hasta) end
    from (select 1) x
    left join public.alumno_suspension s on s.usuario = auth.uid() and (s.hasta is null or s.hasta > now());
$$;
revoke all on function public.mi_suspension() from public, anon;
grant execute on function public.mi_suspension() to authenticated;

-- ---------- Le escribí por WhatsApp ----------
create or replace function public.alumno_contactado(p_usuario uuid, p_ref text default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.ficha_puede() then raise exception 'no autorizado'; end if;
  insert into public.alumno_contacto (usuario, ref, por) values (p_usuario, left(p_ref, 60), lower(auth.jwt() ->> 'email'));
end $$;
revoke all on function public.alumno_contactado(uuid, text) from public, anon;
grant execute on function public.alumno_contactado(uuid, text) to authenticated;

-- ---------- Por vencer ----------
--   Accesos que vencen en los próximos p_dias días o vencieron en los últimos 7.
create or replace function public.por_vencer(p_dias integer default 7)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare hoy date := (now() at time zone 'America/Lima')::date; d integer := least(greatest(coalesce(p_dias, 7), 1), 60);
begin
  if not public.ficha_puede() then raise exception 'no autorizado'; end if;
  return jsonb_build_object('hoy', to_char(hoy, 'YYYY-MM-DD'), 'lista', coalesce((
    select jsonb_agg(x order by x ->> 'vence', x ->> 'apodo') from (
      select jsonb_build_object('origen', 'id', 'ref', 'id-' || a.id, 'id', a.id, 'usuario', a.usuario, 'producto', a.producto, 'vence', a.vence,
          'jid', j.codigo, 'apodo', public.duelo_apodo(a.usuario), 'email', lower(u.email), 'celular', p.celular,
          'escribiste', (select max(c.creado) from public.alumno_contacto c where c.usuario = a.usuario and c.ref = 'id-' || a.id)) x
        from public.accesos_id a
        join auth.users u on u.id = a.usuario
        left join public.perfiles p on p.id = a.usuario
        left join public.jugador_id j on j.usuario = a.usuario
       where a.quitado is null and a.vence ~ '^\d{4}-\d{2}-\d{2}$'
         and a.vence::date between hoy - 7 and hoy + d
         and not public.suspendido(a.usuario)
      union all
      select jsonb_build_object('origen', 'codigo', 'ref', 'cod-' || c.codigo, 'codigo', c.codigo, 'usuario', c.usuario, 'producto', c.producto, 'vence', c.vence,
          'jid', j.codigo, 'apodo', public.duelo_apodo(c.usuario), 'email', lower(u.email), 'celular', p.celular,
          'escribiste', (select max(k.creado) from public.alumno_contacto k where k.usuario = c.usuario and k.ref = 'cod-' || c.codigo))
        from public.codigos_cuenta c
        join auth.users u on u.id = c.usuario
        left join public.perfiles p on p.id = c.usuario
        left join public.jugador_id j on j.usuario = c.usuario
       where c.vence ~ '^\d{4}-\d{2}-\d{2}$'
         and c.vence::date between hoy - 7 and hoy + d
         and not public.suspendido(c.usuario)
    ) t), '[]'::jsonb));
end $$;
revoke all on function public.por_vencer(integer) from public, anon;
grant execute on function public.por_vencer(integer) to authenticated;

-- ---------- Ventas del mes (para más adelante en el panel) ----------
create or replace function public.ventas_mes(p_mes text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare ini date := coalesce(to_date(nullif(p_mes, ''), 'YYYY-MM'), date_trunc('month', (now() at time zone 'America/Lima'))::date);
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  return jsonb_build_object('mes', to_char(ini, 'YYYY-MM'),
    'total', coalesce((select sum(x.monto) from public.alumno_pago x where x.fecha >= ini and x.fecha < (ini + interval '1 month')::date), 0),
    'pagos', (select count(*) from public.alumno_pago x where x.fecha >= ini and x.fecha < (ini + interval '1 month')::date));
end $$;
revoke all on function public.ventas_mes(text) from public, anon;
grant execute on function public.ventas_mes(text) to authenticated;

-- ---------- Suspendido: lo dado por ID deja de abrir ----------
-- Igual que en 78-dispositivos-por-id.sql, con la revisión de suspensión al inicio.
create or replace function public.mis_accesos_id(p_dispositivo text, p_equipo text default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); hoy text := public.acceso_id_hoy();
  mx integer; lista jsonb; usados integer := 0; ok boolean := true;
begin
  if uid is null then return jsonb_build_object('lista', '[]'::jsonb, 'permitido', false); end if;
  if public.suspendido(uid) then
    return jsonb_build_object('id', (select j.codigo from public.jugador_id j where j.usuario = uid),
      'permitido', false, 'suspendido', true, 'equipos', 0, 'max', 0, 'lista', '[]'::jsonb);
  end if;
  mx := public.acceso_id_equipos_de(uid);
  select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'producto', a.producto, 'vence', a.vence, 'nuevo', not a.visto) order by a.creado), '[]'::jsonb)
    into lista from public.accesos_id a
   where a.usuario = uid and a.quitado is null and (a.vence is null or a.vence >= hoy);
  if jsonb_array_length(lista) > 0 and coalesce(p_dispositivo, '') ~ '^d-[a-z0-9]{8,40}$' then
    insert into public.accesos_equipos (usuario, dispositivo, equipo) values (uid, p_dispositivo, left(p_equipo, 60))
    on conflict (usuario, dispositivo) do update set visto = now(), equipo = coalesce(excluded.equipo, public.accesos_equipos.equipo);
    select count(*) into usados from public.accesos_equipos e where e.usuario = uid;
    if mx > 0 and usados > mx then
      delete from public.accesos_equipos e where e.usuario = uid and e.dispositivo not in (
        select x.dispositivo from public.accesos_equipos x where x.usuario = uid order by x.visto desc limit mx);
      usados := mx;
    end if;
    ok := exists (select 1 from public.accesos_equipos e where e.usuario = uid and e.dispositivo = p_dispositivo);
    update public.accesos_id set visto = true where usuario = uid and not visto and quitado is null;
  end if;
  return jsonb_build_object('id', (select j.codigo from public.jugador_id j where j.usuario = uid),
    'permitido', ok, 'equipos', usados, 'max', mx, 'lista', lista);
end $$;
revoke all on function public.mis_accesos_id(text, text) from public, anon;
grant execute on function public.mis_accesos_id(text, text) to authenticated;
