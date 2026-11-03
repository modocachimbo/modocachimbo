-- =========================================================
-- Modo Cachimbo · Descargas en PDF con marca de agua y rastreo
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 14-equipo.sql, 46-resenas.sql y 48-codigos-quitados.sql.
--
--   · ajustes 'descargas': lo que decide el panel (Panel → Descargas PDF):
--       activo      prendido/apagado para todos (apagado = el botón no se ve)
--       abierto     sin código (cualquier alumno con sesión puede descargar)
--       tipos       qué se puede descargar: libro, seminario, banqueo, fijas,
--                   falladas, simulacro, examen, vocabulario, tarjetas
--       limite_dia  descargas por alumno al día (hora de Lima). 0 = sin límite
--       limite_mes  descargas por alumno al mes. 0 = sin límite
--       ficha       si se ofrece la ficha óptica OptiCheck
--   · descargas: una fila por descarga, con su N.º único (MC-XXXX-XXXX),
--     quién, qué y cuándo. Ese N.º va impreso en cada hoja del PDF.
--   · descarga_bloqueos: alumnos a los que se les quitó la descarga.
--   · El acceso con código: el paquete descarga-VIP (o TODO-VIP) guardado
--     en la cuenta del alumno (codigos_cuenta). Los administradores y el
--     equipo con permiso "descargas" pueden descargar siempre, sin límite.
--   · Permiso nuevo para ayudantes: "descargas".
-- =========================================================

-- ---------- Permiso nuevo ----------
create or replace function public.permisos_validos()
returns text[] language sql immutable set search_path = '' as $$
  select array['reportes','editar','borrar','corr','subir','examen','vocab','cursos',
               'perfil','frases','alertas','tutorial','alumnos','simulacro','codigos','ciclos','topxp','agenda','tematicas',
               'recursos','biblioteca','regalos','resenas','descargas'];
$$;

-- ---------- Tablas ----------
create table if not exists public.descargas (
  id      bigserial primary key,
  num     text not null unique check (num ~ '^MC-[A-Z0-9]{4}-[A-Z0-9]{4}$'),
  usuario uuid not null references auth.users (id) on delete cascade,
  email   text,
  apodo   text,
  tipo    text not null,
  ref     text,
  titulo  text,
  paginas integer,
  equipo  text,
  creado  timestamptz not null default now()
);
create index if not exists descargas_usuario on public.descargas (usuario, creado desc);
create index if not exists descargas_creado on public.descargas (creado desc);
alter table public.descargas enable row level security;   -- sin políticas: solo las funciones

create table if not exists public.descarga_bloqueos (
  usuario uuid primary key references auth.users (id) on delete cascade,
  motivo  text,
  por     text,
  creado  timestamptz not null default now()
);
alter table public.descarga_bloqueos enable row level security;

-- ---------- Ajustes con valores por defecto ----------
create or replace function public.descargas_cfg()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
      'activo', false, 'abierto', false, 'ficha', true, 'limite_dia', 10, 'limite_mes', 0,
      'tipos', jsonb_build_object('libro', true, 'seminario', true, 'banqueo', true, 'fijas', true, 'falladas', true,
                                  'simulacro', true, 'examen', true, 'vocabulario', true, 'tarjetas', true))
    || coalesce((select a.valor from public.ajustes a where a.clave = 'descargas'), '{}'::jsonb)
$$;
revoke all on function public.descargas_cfg() from public, anon, authenticated;

-- ¿Tiene este alumno el paquete de descargas en su cuenta?
create or replace function public.descarga_con_codigo(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.codigos_cuenta c
    where c.usuario = uid and c.quitado is null
      and c.producto ~ '(^|,)(descarga-VIP|TODO-VIP)(,|$)'
      and (c.vence is null or c.vence = '' or c.vence >= to_char((now() at time zone 'America/Lima')::date, 'YYYY-MM-DD')))
$$;
revoke all on function public.descarga_con_codigo(uuid) from public, anon, authenticated;

-- Lo que la web necesita saber para pintar el botón y la ventana
create or replace function public.descargas_estado()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  cfg jsonb := public.descargas_cfg();
  hoy timestamptz := ((now() at time zone 'America/Lima')::date)::timestamp at time zone 'America/Lima';
  mes timestamptz := (date_trunc('month', now() at time zone 'America/Lima'))::timestamp at time zone 'America/Lima';
  equipo boolean := public.es_admin() or public.puede('descargas');
  ud integer := 0; um integer := 0; ld integer; lm integer;
begin
  ld := coalesce((cfg ->> 'limite_dia')::int, 0); lm := coalesce((cfg ->> 'limite_mes')::int, 0);
  if uid is not null then
    select count(*) filter (where d.creado >= hoy), count(*) filter (where d.creado >= mes) into ud, um
    from public.descargas d where d.usuario = uid and d.creado >= least(hoy, mes);
  end if;
  return jsonb_build_object(
    'activo', (cfg ->> 'activo')::boolean or equipo,
    'abierto', (cfg ->> 'abierto')::boolean,
    'tipos', cfg -> 'tipos', 'ficha', coalesce((cfg ->> 'ficha')::boolean, true),
    'sesion', uid is not null,
    'acceso', uid is not null and (equipo or (cfg ->> 'abierto')::boolean or public.descarga_con_codigo(uid)),
    'bloqueado', uid is not null and exists (select 1 from public.descarga_bloqueos b where b.usuario = uid),
    'equipo', equipo,
    'limite_dia', ld, 'usadas_dia', ud, 'quedan_dia', case when equipo or ld = 0 then null else greatest(ld - ud, 0) end,
    'limite_mes', lm, 'usadas_mes', um, 'quedan_mes', case when equipo or lm = 0 then null else greatest(lm - um, 0) end);
end $$;
revoke all on function public.descargas_estado() from public, anon;
grant execute on function public.descargas_estado() to anon, authenticated;

-- ---------- Pedir una descarga: revisa todo y devuelve el N.º único ----------
-- p = { tipo, ref, titulo, paginas, equipo }
create or replace function public.pedir_descarga(p jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  e jsonb;
  tipo text := lower(coalesce(p ->> 'tipo', ''));
  n text;
  alfa text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   -- sin 0/O ni 1/I para que se lea bien impreso
  k integer;
  correo text; apo text;
begin
  if uid is null then return jsonb_build_object('error', 'Entra con tu cuenta de Google para descargar.'); end if;
  if tipo not in ('libro','seminario','banqueo','fijas','falladas','simulacro','examen','vocabulario','tarjetas') then
    return jsonb_build_object('error', 'Esto no se puede descargar.'); end if;
  -- Un pedido a la vez por alumno (dos pestañas no se saltan el límite)
  perform pg_advisory_xact_lock(hashtext('descarga:' || uid::text));
  e := public.descargas_estado();
  if not (e ->> 'activo')::boolean then return jsonb_build_object('error', 'Las descargas están apagadas por ahora.'); end if;
  if not (e ->> 'equipo')::boolean and coalesce(((e -> 'tipos') ->> tipo)::boolean, false) is false then
    return jsonb_build_object('error', 'Esta sección no se puede descargar por ahora.'); end if;
  if (e ->> 'bloqueado')::boolean then return jsonb_build_object('error', 'Tu cuenta no puede descargar. Escríbele a tu profe.', 'motivo', 'bloqueado'); end if;
  if not (e ->> 'acceso')::boolean then return jsonb_build_object('error', 'Necesitas el paquete Descargas PDF.', 'motivo', 'codigo'); end if;
  if (e ->> 'quedan_dia') is not null and (e ->> 'quedan_dia')::int <= 0 then
    return jsonb_build_object('error', 'Ya usaste tus ' || (e ->> 'limite_dia') || ' descargas de hoy. Mañana tienes más.', 'motivo', 'limite'); end if;
  if (e ->> 'quedan_mes') is not null and (e ->> 'quedan_mes')::int <= 0 then
    return jsonb_build_object('error', 'Ya usaste tus ' || (e ->> 'limite_mes') || ' descargas de este mes.', 'motivo', 'limite'); end if;

  select lower(a.email) into correo from auth.users a where a.id = uid;
  select coalesce(nullif(trim(pf.apodo), ''), nullif(split_part(trim(pf.nombre), ' ', 1), ''), split_part(correo, '@', 1)) into apo
  from (select 1) d left join public.perfiles pf on pf.id = uid;

  loop
    n := 'MC-';
    for k in 1..8 loop
      n := n || substr(alfa, 1 + floor(random() * length(alfa))::int, 1);
      if k = 4 then n := n || '-'; end if;
    end loop;
    exit when not exists (select 1 from public.descargas d where d.num = n);
  end loop;

  insert into public.descargas (num, usuario, email, apodo, tipo, ref, titulo, paginas, equipo)
  values (n, uid, correo, apo, tipo, left(p ->> 'ref', 200), left(p ->> 'titulo', 200),
          least(greatest(coalesce((p ->> 'paginas')::int, 0), 0), 500), left(p ->> 'equipo', 60));

  return jsonb_build_object('ok', true, 'num', n, 'email', correo, 'apodo', apo,
    'fecha', to_char(now() at time zone 'America/Lima', 'DD/MM/YYYY HH24:MI'),
    'quedan_dia', case when (e ->> 'quedan_dia') is null then null else (e ->> 'quedan_dia')::int - 1 end);
end $$;
revoke all on function public.pedir_descarga(jsonb) from public, anon;
grant execute on function public.pedir_descarga(jsonb) to authenticated;

-- ---------- Panel: guardar los ajustes ----------
create or replace function public.descargas_guardar(p jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare v jsonb; t jsonb := '{}'::jsonb; k text;
begin
  if not (public.es_admin() or public.puede('descargas')) then raise exception 'no autorizado'; end if;
  foreach k in array array['libro','seminario','banqueo','fijas','falladas','simulacro','examen','vocabulario','tarjetas'] loop
    t := t || jsonb_build_object(k, coalesce(((p -> 'tipos') ->> k)::boolean, true));
  end loop;
  v := jsonb_build_object(
    'activo', coalesce((p ->> 'activo')::boolean, false),
    'abierto', coalesce((p ->> 'abierto')::boolean, false),
    'ficha', coalesce((p ->> 'ficha')::boolean, true),
    'limite_dia', least(greatest(coalesce((p ->> 'limite_dia')::int, 10), 0), 500),
    'limite_mes', least(greatest(coalesce((p ->> 'limite_mes')::int, 0), 0), 5000),
    'tipos', t);
  insert into public.ajustes (clave, valor, actualizado) values ('descargas', v, now())
  on conflict (clave) do update set valor = excluded.valor, actualizado = now();
  perform public.anotar('Descargas PDF', 'Cambió los ajustes de descargas', v);
  return v;
end $$;
revoke all on function public.descargas_guardar(jsonb) from public, anon;
grant execute on function public.descargas_guardar(jsonb) to authenticated;

-- ---------- Panel: resumen ----------
create or replace function public.descargas_resumen()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  hoy timestamptz := ((now() at time zone 'America/Lima')::date)::timestamp at time zone 'America/Lima';
begin
  if not (public.es_admin() or public.puede('descargas')) then raise exception 'no autorizado'; end if;
  return jsonb_build_object(
    'cfg', public.descargas_cfg(),
    'hoy', (select count(*) from public.descargas d where d.creado >= hoy),
    'semana', (select count(*) from public.descargas d where d.creado >= now() - interval '7 days'),
    'total', (select count(*) from public.descargas),
    'alumnos_semana', (select count(distinct d.usuario) from public.descargas d where d.creado >= now() - interval '7 days'),
    'por_tipo', coalesce((select jsonb_object_agg(x.tipo, x.n) from (select d.tipo, count(*) n from public.descargas d where d.creado >= now() - interval '30 days' group by d.tipo) x), '{}'::jsonb),
    'top', coalesce((select jsonb_agg(x order by x.n desc) from (
        select d.usuario, max(d.email) email, max(d.apodo) apodo, count(*) n from public.descargas d
        where d.creado >= now() - interval '7 days' group by d.usuario order by count(*) desc limit 5) x), '[]'::jsonb),
    'bloqueados', coalesce((select jsonb_agg(jsonb_build_object('usuario', b.usuario, 'email', (select lower(a.email) from auth.users a where a.id = b.usuario),
        'motivo', b.motivo, 'por', b.por, 'creado', b.creado) order by b.creado desc) from public.descarga_bloqueos b), '[]'::jsonb));
end $$;
revoke all on function public.descargas_resumen() from public, anon;
grant execute on function public.descargas_resumen() to authenticated;

-- ---------- Panel: historial con buscador (N.º, correo, apodo o título) ----------
create or replace function public.descargas_buscar(p_q text default null, p_limite integer default 100)
returns table (id bigint, num text, usuario uuid, email text, apodo text, tipo text, ref text, titulo text, paginas integer, equipo text, creado timestamptz, bloqueado boolean)
language plpgsql stable security definer set search_path = '' as $$
declare q text := nullif(trim(coalesce(p_q, '')), '');
begin
  if not (public.es_admin() or public.puede('descargas')) then raise exception 'no autorizado'; end if;
  return query
    select d.id, d.num, d.usuario, d.email, d.apodo, d.tipo, d.ref, d.titulo, d.paginas, d.equipo, d.creado,
           exists (select 1 from public.descarga_bloqueos b where b.usuario = d.usuario)
    from public.descargas d
    where q is null
       or d.num ilike '%' || replace(upper(q), ' ', '') || '%'
       or d.email ilike '%' || q || '%' or d.apodo ilike '%' || q || '%' or d.titulo ilike '%' || q || '%'
    order by d.creado desc
    limit least(greatest(coalesce(p_limite, 100), 1), 500);
end $$;
revoke all on function public.descargas_buscar(text, integer) from public, anon;
grant execute on function public.descargas_buscar(text, integer) to authenticated;

-- ---------- Panel: bloquear o desbloquear a un alumno ----------
create or replace function public.descargas_bloquear(p_usuario uuid, p_bloquear boolean, p_motivo text default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare correo text;
begin
  if not (public.es_admin() or public.puede('descargas')) then raise exception 'no autorizado'; end if;
  select lower(a.email) into correo from auth.users a where a.id = p_usuario;
  if correo is null then raise exception 'No existe ese alumno.'; end if;
  if p_bloquear then
    insert into public.descarga_bloqueos (usuario, motivo, por)
    values (p_usuario, left(p_motivo, 300), (select lower(a.email) from auth.users a where a.id = auth.uid()))
    on conflict (usuario) do update set motivo = excluded.motivo, por = excluded.por, creado = now();
  else
    delete from public.descarga_bloqueos where usuario = p_usuario;
  end if;
  perform public.anotar('Descargas PDF', case when p_bloquear then 'Bloqueó las descargas de ' else 'Desbloqueó las descargas de ' end || correo,
                        jsonb_build_object('motivo', p_motivo));
  return jsonb_build_object('ok', true, 'bloqueado', p_bloquear);
end $$;
revoke all on function public.descargas_bloquear(uuid, boolean, text) from public, anon;
grant execute on function public.descargas_bloquear(uuid, boolean, text) to authenticated;
