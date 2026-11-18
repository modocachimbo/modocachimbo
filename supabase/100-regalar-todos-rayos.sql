-- =========================================================
-- Modo Cachimbo · Regalar a TODOS y regalar rayos (energía)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 43-ayudantes-regalos.sql, 44-xp-regalo-rango.sql,
-- 86-ficha-alumno.sql, 93-grupo-vip.sql y 97-laboratorio-rayos.sql.
--
--   · Regalo nuevo «rayos»: la energía del Arcade y del Laboratorio
--     (tabla lab_rayos). Se suma al saldo del alumno y le llega en el
--     sobre de regalo como los demás. De 1 a 1000 por vez.
--     Vale para Un alumno, Grupo VIP y Todos.
--   · Panel → Regalos → Todos (solo admins):
--       regalo_todos_ver()  → cuántos alumnos son y los últimos envíos
--       regalo_todos_dar(tipo, cantidad, ítem, nota)
--     «Todos» = cada cuenta con ID de jugador, menos los suspendidos o
--     baneados en este momento. Cada uno ve su aviso como un regalo normal.
--     Los envíos se guardan en regalo_grupo_envio con grupo 'todos'.
-- =========================================================

-- 1) La tabla de avisos acepta el tipo nuevo
alter table public.regalos drop constraint if exists regalos_tipo_check;
alter table public.regalos add constraint regalos_tipo_check
  check (tipo in ('corazones', 'infinito', 'xp', 'item', 'rayos'));

-- 2) Texto y límites de cada regalo (uso interno). Devuelve el texto o lanza el error.
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
  elsif p_tipo = 'item' then
    if not exists (select 1 from public.coleccion_item i where i.id = p_item) then raise exception 'Ese ítem no existe'; end if;
    return 'el ítem ' || coalesce((select i.nom from public.coleccion_item i where i.id = p_item), p_item);
  end if;
  raise exception 'tipo de regalo no válido';
end $$;
revoke all on function public.regalo_validar(text, integer, text) from public, anon, authenticated;

-- 3) Dar un regalo a una cuenta (Grupo VIP lo usa): ahora también rayos
create or replace function public.regalo_aplicar(u uuid, p_tipo text, n integer, p_item text, nota text, yo text, nom text)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  if p_tipo = 'rayos' then
    insert into public.lab_rayos (usuario, clave, cantidad) values (u, 'regalo:' || gen_random_uuid(), n);
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

-- 4) Un alumno por su ID (Panel → Regalos → Un alumno)
create or replace function public.regalar(p_codigo integer, p_tipo text, p_cantidad integer default null, p_item text default null, p_nota text default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  u    uuid;
  n    integer := coalesce(p_cantidad, 0);
  nota text := nullif(left(trim(coalesce(p_nota, '')), 140), '');
  yo   text := lower(auth.jwt() ->> 'email');
  nom  text;
  txt  text;
begin
  if not public.puede('regalos') then raise exception 'no autorizado'; end if;
  select j.usuario into u from public.jugador_id j where j.codigo = p_codigo;
  if u is null then raise exception 'No hay ningún alumno con el ID %', p_codigo; end if;
  txt := public.regalo_validar(p_tipo, n, p_item);
  select e.nombre into nom from public.equipo e where e.email = yo;
  if not public.regalo_aplicar(u, p_tipo, n, case when p_tipo = 'item' then p_item end, nota, yo, nom) then
    raise exception 'Ese alumno ya tiene ese ítem';
  end if;
  perform public.anotar('Regalos', 'Regaló ' || txt || ' al ID ' || p_codigo,
    jsonb_build_object('codigo', p_codigo, 'tipo', p_tipo, 'cantidad', case when p_tipo = 'item' then null else n end, 'item', p_item, 'nota', nota));
  return public.regalo_buscar(p_codigo);
end $$;
revoke all on function public.regalar(integer, text, integer, text, text) from public, anon;
grant execute on function public.regalar(integer, text, integer, text, text) to authenticated;

-- 5) Buscar por ID: ahora dice también cuántos rayos tiene
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
    'historial', coalesce((select jsonb_agg(jsonb_build_object('tipo', x.tipo, 'cantidad', x.cantidad, 'item', x.item, 'nota', x.nota,
                    'de', coalesce(x.de_nombre, x.de_email), 'creado', x.creado) order by x.id desc)
                  from (select * from public.regalos r where r.usuario = u order by r.id desc limit 15) x), '[]'::jsonb)
  );
end $$;
revoke all on function public.regalo_buscar(integer) from public, anon;
grant execute on function public.regalo_buscar(integer) to authenticated;

-- 6) Grupo VIP: acepta rayos
create or replace function public.grupo_regalo_dar(p_grupo text, p_tipo text, p_cantidad integer default null, p_item text default null, p_nota text default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  n    integer := coalesce(p_cantidad, 0);
  nota text := nullif(left(trim(coalesce(p_nota, '')), 140), '');
  yo   text := lower(auth.jwt() ->> 'email');
  nom  text;
  ok   integer := 0;
  sal  integer := 0;
  u    uuid;
  txt  text;
begin
  if not public.puede('regalos') then raise exception 'no autorizado'; end if;
  if p_grupo = 'todos' then raise exception 'nombre de grupo no válido'; end if;
  txt := public.regalo_validar(p_tipo, n, p_item);
  if not exists (select 1 from public.regalo_grupo g where g.grupo = p_grupo) then raise exception 'El grupo está vacío'; end if;
  select e.nombre into nom from public.equipo e where e.email = yo;
  for u in select g.usuario from public.regalo_grupo g where g.grupo = p_grupo loop
    if public.regalo_aplicar(u, p_tipo, n, case when p_tipo = 'item' then p_item end, nota, yo, nom) then ok := ok + 1; else sal := sal + 1; end if;
  end loop;
  insert into public.regalo_grupo_envio (grupo, tipo, cantidad, item, nota, recibieron, saltados, de_email, de_nombre)
  values (p_grupo, p_tipo, case when p_tipo = 'item' then null else n end, case when p_tipo = 'item' then p_item end, nota, ok, sal, yo, nom);
  perform public.anotar('Regalos', 'Regaló ' || txt || ' al grupo ' || upper(p_grupo) || ' (' || ok || ' alumnos)',
    jsonb_build_object('grupo', p_grupo, 'tipo', p_tipo, 'cantidad', n, 'item', p_item, 'nota', nota, 'recibieron', ok, 'saltados', sal));
  return public.grupo_regalo_ver(p_grupo) || jsonb_build_object('recibieron', ok, 'saltados', sal);
end $$;
revoke all on function public.grupo_regalo_dar(text, text, integer, text, text) from public, anon;
grant execute on function public.grupo_regalo_dar(text, text, integer, text, text) to authenticated;

-- 7) TODOS: quiénes son (uso interno)
create or replace function public.regalo_todos_ids()
returns table (usuario uuid) language sql stable security definer set search_path = '' as $$
  select j.usuario from public.jugador_id j
   where not exists (select 1 from public.alumno_suspension s
                      where s.usuario = j.usuario and (s.hasta is null or s.hasta > now()))
$$;
revoke all on function public.regalo_todos_ids() from public, anon, authenticated;

create or replace function public.regalo_todos_ver()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  return jsonb_build_object(
    'alumnos', (select count(*) from public.regalo_todos_ids()),
    'activos', (select count(*) from public.regalo_todos_ids() t
                 where exists (select 1 from public.alumno_visto v where v.usuario = t.usuario and v.visto > now() - interval '7 days')
                    or exists (select 1 from public.actividad a where a.usuario = t.usuario and a.preguntas > 0
                                and a.fecha >= (now() at time zone 'America/Lima')::date - 7)),
    'envios', coalesce((select jsonb_agg(jsonb_build_object('tipo', e.tipo, 'cantidad', e.cantidad, 'item', e.item, 'nota', e.nota,
        'recibieron', e.recibieron, 'saltados', e.saltados, 'de', coalesce(e.de_nombre, e.de_email), 'creado', e.creado) order by e.id desc)
      from (select * from public.regalo_grupo_envio x where x.grupo = 'todos' order by x.id desc limit 10) e), '[]'::jsonb));
end $$;
revoke all on function public.regalo_todos_ver() from public, anon;
grant execute on function public.regalo_todos_ver() to authenticated;

-- 8) TODOS: el mismo regalo a cada alumno, de una sola vez (sin ir uno por uno)
create or replace function public.regalo_todos_dar(p_tipo text, p_cantidad integer default null, p_item text default null, p_nota text default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  n     integer := coalesce(p_cantidad, 0);
  nota  text := nullif(left(trim(coalesce(p_nota, '')), 140), '');
  yo    text := lower(auth.jwt() ->> 'email');
  nom   text;
  total integer;
  ok    integer := 0;
  txt   text;
  u     uuid;
  envio bigint;
  ids   uuid[];
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  txt := public.regalo_validar(p_tipo, n, p_item);
  -- Uno a la vez: si tocan dos veces seguidas, el segundo espera al primero
  perform pg_advisory_xact_lock(hashtext('regalo_todos'));
  select count(*) into total from public.regalo_todos_ids();
  if total = 0 then raise exception 'Aún no hay alumnos'; end if;
  select e.nombre into nom from public.equipo e where e.email = yo;
  insert into public.regalo_grupo_envio (grupo, tipo, cantidad, item, nota, de_email, de_nombre)
  values ('todos', p_tipo, case when p_tipo = 'item' then null else n end, case when p_tipo = 'item' then p_item end, nota, yo, nom)
  returning id into envio;

  if p_tipo in ('corazones', 'infinito', 'xp') then
    -- Quien nunca abrió la web aún no tiene fila de corazones: se le crea
    for u in select t.usuario from public.regalo_todos_ids() t
              where not exists (select 1 from public.corazones c where c.usuario = t.usuario) loop
      perform public.cz_estado(u);
    end loop;
    select coalesce(array_agg(t.usuario), '{}') into ids from public.regalo_todos_ids() t;
    if p_tipo = 'corazones' then
      update public.corazones c set extra = least(c.extra + n, 999), actualizado = now() where c.usuario = any (ids);
    elsif p_tipo = 'infinito' then
      update public.corazones c set infinito_hasta = greatest(coalesce(c.infinito_hasta, now()), now()) + n * interval '1 hour', actualizado = now()
       where c.usuario = any (ids);
    else
      insert into public.xp_semana (usuario, semana, xp) select x, public.cz_lunes(), n from unnest(ids) x
      on conflict (usuario, semana) do update set xp = public.xp_semana.xp + excluded.xp;
      update public.corazones c set xp_saldo = c.xp_saldo + n, actualizado = now() where c.usuario = any (ids);
    end if;
  elsif p_tipo = 'rayos' then
    select coalesce(array_agg(t.usuario), '{}') into ids from public.regalo_todos_ids() t;
    insert into public.lab_rayos (usuario, clave, cantidad)
    select x, 'regalo-todos:' || envio, n from unnest(ids) x
    on conflict do nothing;
  else
    -- Ítem: solo a quien aún no lo tiene
    with nuevos as (
      insert into public.coleccion_mia (usuario, item, origen, mensaje)
      select t.usuario, p_item, 'regalo', nota from public.regalo_todos_ids() t
      on conflict (usuario, item) do nothing
      returning usuario)
    select coalesce(array_agg(usuario), '{}') into ids from nuevos;
  end if;

  insert into public.regalos (usuario, tipo, cantidad, item, nota, de_email, de_nombre)
  select x, p_tipo, case when p_tipo = 'item' then null else n end, case when p_tipo = 'item' then p_item end, nota, yo, nom
    from unnest(ids) x;
  get diagnostics ok = row_count;

  update public.regalo_grupo_envio set recibieron = ok, saltados = total - ok where id = envio;
  perform public.anotar('Regalos', 'Regaló ' || txt || ' a TODOS (' || ok || ' alumnos)',
    jsonb_build_object('grupo', 'todos', 'tipo', p_tipo, 'cantidad', n, 'item', p_item, 'nota', nota, 'recibieron', ok, 'saltados', total - ok));
  return public.regalo_todos_ver() || jsonb_build_object('recibieron', ok, 'saltados', total - ok);
end $$;
revoke all on function public.regalo_todos_dar(text, integer, text, text) from public, anon;
grant execute on function public.regalo_todos_dar(text, integer, text, text) to authenticated;
