-- =========================================================
-- Modo Cachimbo · Ayudantes del panel e historial
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita haber corrido antes del 02 al 13.
-- Si algún día vuelves a correr uno de esos archivos, vuelve a
-- correr este después (las funciones del panel se redefinen aquí).
--
--   · equipo: los ayudantes. Cada uno entra al panel con su propia
--     cuenta de Google (sin la contraseña) y solo ve las pestañas
--     que tú le marcas en Panel → Equipo.
--   · historial: qué hizo cada uno y cuándo (Panel → Historial).
--     Lo que se hace en Supabase se anota aquí mismo; lo que pasa
--     por el Apps Script (subir temas, corregir, códigos…) lo anota
--     el Apps Script v7.
--   · Tú (los correos de public.admins) sigues pudiendo todo.
--
-- Permisos que se pueden dar:
--   reportes  Reportes        editar   Editar preguntas y tarjetas
--   borrar    Borrar temas y años     corr     Correcciones
--   subir     Subir tema      examen   Subir examen
--   vocab     Vocabulario     cursos   Cursos
--   perfil    Perfil del alumno       frases   Frases del día
--   alertas   Alertas         tutorial Tutorial
--   alumnos   Alumnos (solo ver)      simulacro Top simulacro (solo ver)
--   codigos   Códigos
-- =========================================================

create table if not exists public.equipo (
  email           text primary key check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  nombre          text not null default '' check (char_length(nombre) <= 60),
  permisos        text[] not null default '{}',
  activo          boolean not null default true,
  creado          timestamptz not null default now(),
  actualizado     timestamptz not null default now(),
  ultimo_ingreso  timestamptz
);
alter table public.equipo enable row level security;
-- Sin políticas: solo con las funciones de abajo

create table if not exists public.historial (
  id      bigint generated always as identity primary key,
  fecha   timestamptz not null default now(),
  email   text not null,
  nombre  text,
  dueno   boolean not null default false,  -- lo hizo un administrador
  donde   text not null,                   -- pestaña: Vocabulario, Subir tema…
  accion  text not null,                   -- en palabras: "Publicó 24 palabras"
  detalle jsonb not null default '{}'::jsonb
);
create index if not exists historial_fecha on public.historial (fecha desc);
create index if not exists historial_email on public.historial (email, fecha desc);
alter table public.historial enable row level security;

-- Lista de permisos válidos
create or replace function public.permisos_validos()
returns text[] language sql immutable set search_path = '' as $$
  select array['reportes','editar','borrar','corr','subir','examen','vocab','cursos',
               'perfil','frases','alertas','tutorial','alumnos','simulacro','codigos'];
$$;

-- ¿El que está conectado puede hacer esto? (administrador o ayudante activo con ese permiso)
create or replace function public.puede(p text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.es_admin() or exists (
    select 1 from public.equipo e
     where e.email = lower(auth.jwt() ->> 'email') and e.activo and p = any (e.permisos));
$$;
revoke all on function public.puede(text) from public, anon;
grant execute on function public.puede(text) to authenticated;

-- Quién soy en el panel
create or replace function public.mi_rol()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'email', lower(auth.jwt() ->> 'email'),
    'admin', public.es_admin(),
    'ayudante', coalesce(e.activo and cardinality(e.permisos) > 0, false),
    'inactivo', coalesce(not e.activo, false),
    'nombre', coalesce(e.nombre, ''),
    'permisos', case when public.es_admin() then to_jsonb(public.permisos_validos())
                     when e.activo then to_jsonb(e.permisos) else '[]'::jsonb end)
  from (select 1) x
  left join public.equipo e on e.email = lower(auth.jwt() ->> 'email');
$$;
revoke all on function public.mi_rol() from public, anon;
grant execute on function public.mi_rol() to authenticated;

-- Anota en el historial (uso interno de las funciones de aquí)
create or replace function public.anotar(p_donde text, p_accion text, p_detalle jsonb default '{}'::jsonb)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare m text := lower(auth.jwt() ->> 'email');
begin
  if m is null then return; end if;
  insert into public.historial (email, nombre, dueno, donde, accion, detalle)
  values (m, (select e.nombre from public.equipo e where e.email = m), public.es_admin(),
          left(coalesce(p_donde, ''), 40), left(coalesce(p_accion, ''), 300),
          case when jsonb_typeof(p_detalle) = 'object' and pg_column_size(p_detalle) <= 8000 then p_detalle else '{}'::jsonb end);
end $$;
revoke all on function public.anotar(text, text, jsonb) from public, anon, authenticated;

-- El Apps Script anota lo que hizo un ayudante (con la sesión de ese ayudante)
create or replace function public.registrar_accion(p_permiso text, p_donde text, p_accion text, p_detalle jsonb default '{}'::jsonb)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.puede(p_permiso) then raise exception 'no autorizado'; end if;
  perform public.anotar(p_donde, p_accion, p_detalle);
end $$;
revoke all on function public.registrar_accion(text, text, text, jsonb) from public, anon;
grant execute on function public.registrar_accion(text, text, text, jsonb) to authenticated;

-- Un ayudante abrió el panel (se anota una vez cada 30 minutos)
create or replace function public.registrar_ingreso()
returns void language plpgsql volatile security definer set search_path = '' as $$
declare m text := lower(auth.jwt() ->> 'email');
begin
  if not exists (select 1 from public.equipo e where e.email = m and e.activo) then return; end if;
  update public.equipo set ultimo_ingreso = now() where email = m;
  if not exists (select 1 from public.historial h where h.email = m and h.donde = 'Ingreso' and h.fecha > now() - interval '30 minutes') then
    perform public.anotar('Ingreso', 'Entró al panel');
  end if;
  delete from public.historial where fecha < now() - interval '1 year';
end $$;
revoke all on function public.registrar_ingreso() from public, anon;
grant execute on function public.registrar_ingreso() to authenticated;

-- ---------- Solo administradores: manejar el equipo ----------
create or replace function public.equipo_lista()
returns setof public.equipo language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  return query select * from public.equipo e order by e.activo desc, e.creado;
end $$;
revoke all on function public.equipo_lista() from public, anon;
grant execute on function public.equipo_lista() to authenticated;

create or replace function public.equipo_guardar(p_email text, p_nombre text, p_permisos text[], p_activo boolean)
returns public.equipo language plpgsql volatile security definer set search_path = '' as $$
declare m text := lower(btrim(coalesce(p_email, ''))); fila public.equipo; antes public.equipo; per text[];
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  if m !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'correo no válido'; end if;
  select coalesce(array_agg(distinct x order by x), '{}') into per
    from unnest(coalesce(p_permisos, '{}')) x where x = any (public.permisos_validos());
  select * into antes from public.equipo e where e.email = m;
  insert into public.equipo (email, nombre, permisos, activo)
  values (m, left(btrim(coalesce(p_nombre, '')), 60), per, coalesce(p_activo, true))
  on conflict (email) do update set nombre = excluded.nombre, permisos = excluded.permisos,
                                    activo = excluded.activo, actualizado = now()
  returning * into fila;
  perform public.anotar('Equipo',
    case when antes.email is null then 'Agregó a ' || m
         when antes.activo and not fila.activo then 'Desactivó a ' || m
         when not antes.activo and fila.activo then 'Reactivó a ' || m
         else 'Cambió los permisos de ' || m end,
    jsonb_build_object('email', m, 'permisos', per, 'antes', coalesce(to_jsonb(antes.permisos), '[]'::jsonb), 'activo', fila.activo));
  return fila;
end $$;
revoke all on function public.equipo_guardar(text, text, text[], boolean) from public, anon;
grant execute on function public.equipo_guardar(text, text, text[], boolean) to authenticated;

create or replace function public.equipo_borrar(p_email text)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  delete from public.equipo where email = lower(btrim(p_email));
  if found then perform public.anotar('Equipo', 'Quitó a ' || lower(btrim(p_email)), jsonb_build_object('email', lower(btrim(p_email)))); end if;
end $$;
revoke all on function public.equipo_borrar(text) from public, anon;
grant execute on function public.equipo_borrar(text) to authenticated;

-- Historial, del más nuevo al más viejo. p_email null = de todos; p_antes = para ver más
drop function if exists public.historial_ver(text, integer, bigint);
create or replace function public.historial_ver(p_email text default null, p_limite integer default 100, p_antes bigint default null)
returns setof public.historial language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  return query select * from public.historial h
   where (p_email is null or h.email = lower(p_email)) and (p_antes is null or h.id < p_antes)
   order by h.id desc limit least(greatest(coalesce(p_limite, 100), 1), 500);
end $$;
revoke all on function public.historial_ver(text, integer, bigint) from public, anon;
grant execute on function public.historial_ver(text, integer, bigint) to authenticated;

-- =========================================================
-- Funciones del panel: ahora piden el permiso de su pestaña
-- (antes solo el administrador). El contenido es el mismo de
-- su archivo original; solo cambia la primera revisión y se
-- anota en el historial lo que cambia algo.
-- =========================================================

-- 02 · Alumnos
create or replace function public.racha_alumnos()
returns table (
  email text, nombre text, apodo text, carrera text, foto_url text,
  actual integer, mejor integer, hoy integer, ultima date, registrado timestamptz
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.puede('alumnos') then raise exception 'no autorizado'; end if;
  return query
    select u.email::text, p.nombre, p.apodo, p.carrera, p.foto_url,
           (r ->> 'actual')::integer, (r ->> 'mejor')::integer, (r ->> 'hoy')::integer,
           (r ->> 'ultima')::date, u.created_at
    from auth.users u
    left join public.perfiles p on p.id = u.id
    cross join lateral public.calc_racha(u.id) r
    order by (r ->> 'actual')::integer desc, u.created_at desc;
end $$;

-- 04 · Alumnos
create or replace function public.progreso_alumnos()
returns table (email text, practicas integer, promedio integer, falladas integer, ultima timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.puede('alumnos') then raise exception 'no autorizado'; end if;
  return query
    select u.email::text,
           coalesce(sum(g.intentos), 0)::integer,
           coalesce(round(avg(g.mejor)), 0)::integer,
           (select count(*) from public.falladas f where f.usuario = u.id)::integer,
           max(g.actualizado)
    from auth.users u
    left join public.progreso g on g.usuario = u.id
    group by u.id, u.email;
end $$;

-- 05 · Alumnos
create or replace function public.alumnos_extra()
returns table (email text, extra jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.puede('alumnos') then raise exception 'no autorizado'; end if;
  return query
    select u.email::text, coalesce(p.extra, '{}'::jsonb)
    from auth.users u left join public.perfiles p on p.id = u.id;
end $$;

-- 05 · Ajustes: cada clave pide el permiso de su pestaña
create or replace function public.guardar_ajuste(p_clave text, p_valor jsonb)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare per text; nom text;
begin
  per := case p_clave when 'perfil' then 'perfil' when 'frases' then 'frases'
                      when 'practica' then 'cursos' when 'vocabulario' then 'vocab' end;
  nom := case p_clave when 'perfil' then 'Perfil del alumno' when 'frases' then 'Frases del día'
                      when 'practica' then 'Cursos' when 'vocabulario' then 'Vocabulario' else p_clave end;
  if not (public.es_admin() or (per is not null and public.puede(per))) then raise exception 'no autorizado'; end if;
  if pg_column_size(p_valor) > 60000 then raise exception 'demasiado grande'; end if;
  insert into public.ajustes (clave, valor, actualizado) values (p_clave, p_valor, now())
  on conflict (clave) do update set valor = excluded.valor, actualizado = now();
  perform public.anotar(nom,
    case p_clave when 'practica' then 'Cambió los ajustes de la práctica'
                 when 'vocabulario' then 'Cambió en qué cursos sale Vocabulario o su candado'
                 else 'Guardó cambios' end,
    case when p_clave = 'vocabulario' then p_valor else '{}'::jsonb end);
end $$;

-- 07 · Reportes
create or replace function public.reportes_recibidos()
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare n integer;
begin
  if not public.puede('reportes') then raise exception 'no autorizado'; end if;
  update public.reportes_alumno set estado = 'Recibido', actualizado = now() where estado = 'Enviado';
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.estado_reporte(p_carpeta text, p_anio text, p_tema text, p_pregunta integer, p_estado text)
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare n integer;
begin
  if not (public.puede('reportes') or public.puede('editar')) then raise exception 'no autorizado'; end if;
  if p_estado not in ('Corregido', 'Denegado', 'Recibido') then raise exception 'estado no válido'; end if;
  update public.reportes_alumno r set estado = p_estado, actualizado = now()
   where r.carpeta = p_carpeta and r.anio = p_anio and ltrim(r.tema, '0') = ltrim(p_tema, '0') and r.pregunta = p_pregunta
     and (case when p_estado = 'Recibido' then r.estado <> 'Recibido' else r.estado in ('Enviado', 'Recibido') end);
  get diagnostics n = row_count;
  return n;
end $$;

-- 08 · Reportes
create or replace function public.reportes_autores()
returns table (carpeta text, anio text, tema text, pregunta integer, creado timestamptz,
               email text, nombre text, apodo text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.puede('reportes') then raise exception 'no autorizado'; end if;
  return query
    select r.carpeta, r.anio, r.tema, r.pregunta, r.creado,
           u.email::text, p.nombre, p.apodo
    from public.reportes_alumno r
    join auth.users u on u.id = r.usuario
    left join public.perfiles p on p.id = r.usuario
    where r.creado > now() - interval '180 days'
    order by r.creado desc
    limit 3000;
end $$;

-- 03 · Subir tema (aviso "Nuevo" para los alumnos)
create or replace function public.crear_novedad(
  p_tipo text, p_carpeta text, p_curso text, p_area text, p_anio text, p_tema text, p_nombre text)
returns bigint language plpgsql volatile security definer set search_path = '' as $$
declare nuevo bigint;
begin
  if not public.puede('subir') then raise exception 'no autorizado'; end if;
  delete from public.novedades n
   where n.carpeta = p_carpeta
     and ((p_tipo = 'curso' and n.tipo = 'curso')
       or (n.tipo = 'tema' and n.anio is not distinct from p_anio and n.tema is not distinct from p_tema));
  insert into public.novedades (tipo, carpeta, curso, area, anio, tema, nombre)
  values (p_tipo, left(p_carpeta, 40), left(p_curso, 60), left(p_area, 40), left(p_anio, 12), left(p_tema, 6), left(p_nombre, 120))
  returning id into nuevo;
  return nuevo;
end $$;

create or replace function public.borrar_novedad(p_id bigint)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.puede('subir') then raise exception 'no autorizado'; end if;
  delete from public.novedades where id = p_id;
end $$;

-- 09 · Top simulacro
create or replace function public.ranking_simulacro_admin(p_dia date default null)
returns table (puesto integer, nombre text, apodo text, email text, carrera text, bloque text,
               puntaje numeric, maximo numeric, simulacro text, intentos integer, fecha timestamptz, desde date)
language plpgsql stable security definer set search_path = '' as $$
declare
  ini timestamptz;
begin
  if not public.puede('simulacro') then raise exception 'no autorizado'; end if;
  ini := (date_trunc('week', coalesce(p_dia::timestamp, now() at time zone 'America/Lima'))) at time zone 'America/Lima';
  return query
    with sem as (
      select x.* from public.simulacro_intentos x
      where x.creado >= ini and x.creado < ini + interval '7 days'
    ), mejor as (
      select distinct on (x.usuario) x.usuario, x.puntaje, x.maximo, x.bloque, x.simulacro, x.creado
      from sem x where x.primero
      order by x.usuario, x.puntaje desc, x.creado
    ), orden as (
      select m.*, (row_number() over (order by m.puntaje desc, m.creado))::integer as puesto from mejor m
    )
    select o.puesto, p.nombre, p.apodo, u.email::text, p.carrera, o.bloque, o.puntaje, o.maximo, s.nombre,
           (select count(*) from sem y where y.usuario = o.usuario)::integer, o.creado, (ini at time zone 'America/Lima')::date
    from orden o
    join auth.users u on u.id = o.usuario
    left join public.perfiles p on p.id = o.usuario
    left join public.simulacros s on s.id = o.simulacro
    where o.puesto <= 10
    order by o.puesto;
end $$;

-- 12 · Editar preguntas → Tarjetas
create or replace function public.guardar_tarjetas_tema(p_curso text, p_seccion text, p_anio text, p_tema text, p_lista jsonb)
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare
  x jsonb; n integer := 0;
begin
  if not public.puede('editar') then raise exception 'no autorizado'; end if;
  if jsonb_typeof(coalesce(p_lista, '[]'::jsonb)) <> 'array' then raise exception 'lista inválida'; end if;
  delete from public.tarjetas t
   where t.curso = p_curso and t.seccion = p_seccion and t.anio = p_anio and t.tema = p_tema;
  for x in select value from jsonb_array_elements(coalesce(p_lista, '[]'::jsonb)) with ordinality a(value, i) where i <= 300 loop
    if btrim(coalesce(x ->> 'frente', '')) <> '' and btrim(coalesce(x ->> 'reverso', '')) <> '' then
      n := n + 1;
      insert into public.tarjetas (curso, seccion, anio, tema, orden, frente, reverso)
      values (left(p_curso, 40), p_seccion, left(p_anio, 40), left(p_tema, 6), n,
              left(btrim(x ->> 'frente'), 600), left(btrim(x ->> 'reverso'), 600));
    end if;
  end loop;
  perform public.anotar('Editar preguntas', 'Guardó ' || n || ' tarjeta' || case when n = 1 then '' else 's' end
    || ' de ' || p_curso || ' ' || p_anio || ' tema ' || p_tema,
    jsonb_build_object('curso', p_curso, 'seccion', p_seccion, 'anio', p_anio, 'tema', p_tema, 'tarjetas', n));
  return n;
end $$;

-- 13 · Vocabulario (anota qué palabras se agregaron, cambiaron o quitaron)
create or replace function public.guardar_vocabulario(p_lista jsonb)
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare
  x jsonb; n integer := 0; s text[]; a text[]; p text; antes jsonb; ahora jsonb;
begin
  if not public.puede('vocab') then raise exception 'no autorizado'; end if;
  if jsonb_typeof(coalesce(p_lista, '[]'::jsonb)) <> 'array' then raise exception 'lista inválida'; end if;
  select coalesce(jsonb_object_agg(v.palabra, jsonb_build_array(v.sin, v.ant, v.def, v.ej, v.extra)), '{}') into antes from public.vocabulario v;
  delete from public.vocabulario where true;
  for x in select value from jsonb_array_elements(coalesce(p_lista, '[]'::jsonb)) with ordinality a(value, i) where i <= 3000 loop
    p := left(btrim(coalesce(x ->> 'palabra', '')), 60);
    s := public.vocabulario_lista(x -> 'sin');
    a := public.vocabulario_lista(x -> 'ant');
    if p <> '' and cardinality(s) + cardinality(a) > 0
       and not exists (select 1 from public.vocabulario v where v.palabra = p) then
      n := n + 1;
      insert into public.vocabulario (orden, palabra, sin, ant, def, ej, extra)
      values (n, p, s, a,
              nullif(left(btrim(coalesce(x ->> 'def', '')), 400), ''),
              public.vocabulario_lista(x -> 'ej', 5, 300),
              case when jsonb_typeof(x -> 'extra') = 'object' and pg_column_size(x -> 'extra') <= 3000
                   then x -> 'extra' else '{}'::jsonb end);
    end if;
  end loop;
  select coalesce(jsonb_object_agg(v.palabra, jsonb_build_array(v.sin, v.ant, v.def, v.ej, v.extra)), '{}') into ahora from public.vocabulario v;
  declare
    nuevas text[] := array(select k from jsonb_object_keys(ahora) k where not antes ? k order by k);
    quitadas text[] := array(select k from jsonb_object_keys(antes) k where not ahora ? k order by k);
    cambiadas text[] := array(select k from jsonb_object_keys(ahora) k where antes ? k and antes -> k <> ahora -> k order by k);
    t text := concat_ws(', ',
      case when cardinality(nuevas) > 0 then 'agregó ' || cardinality(nuevas) end,
      case when cardinality(cambiadas) > 0 then 'corrigió ' || cardinality(cambiadas) end,
      case when cardinality(quitadas) > 0 then 'borró ' || cardinality(quitadas) end);
  begin
    if t <> '' then
      perform public.anotar('Vocabulario', upper(left(t, 1)) || substr(t, 2) || ' · quedan ' || n,
        jsonb_build_object('nuevas', nuevas[1:60], 'corregidas', cambiadas[1:60], 'borradas', quitadas[1:60], 'total', n));
    end if;
  end;
  return n;
end $$;
