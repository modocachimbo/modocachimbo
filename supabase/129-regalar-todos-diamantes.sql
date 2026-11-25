-- =========================================================
-- Modo Cachimbo · Regalar a TODOS: diamantes y tickets de sala
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 100-regalar-todos-rayos.sql, 104-clanes-sala.sql y 127-tienda.sql.
--
--   · Error que arregla: al regalar diamantes (o tickets) a todos salía
--     «null value in column "item" of relation "coleccion_mia"…», porque
--     regalo_todos_dar trataba todo lo que no conocía como un ítem.
--   · Ahora los diamantes y los tickets llegan a todos con su sobre.
-- =========================================================

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
  elsif p_tipo = 'diamantes' then
    -- Diamantes: un movimiento por alumno (mis_diamantes los suma)
    select coalesce(array_agg(t.usuario), '{}') into ids from public.regalo_todos_ids() t;
    insert into public.diamantes_mov (usuario, cantidad, motivo)
    select x, n, left('Regalo a todos: ' || coalesce(nom, yo, 'admin'), 80) from unnest(ids) x;
  elsif p_tipo = 'ticket' then
    select coalesce(array_agg(t.usuario), '{}') into ids from public.regalo_todos_ids() t;
    foreach u in array ids loop perform public.sala_tickets_sumar(u, n); end loop;
  elsif p_tipo = 'rayos' then
    select coalesce(array_agg(t.usuario), '{}') into ids from public.regalo_todos_ids() t;
    insert into public.lab_rayos (usuario, clave, cantidad)
    select x, 'regalo-todos:' || envio, n from unnest(ids) x
    on conflict do nothing;
  elsif p_tipo = 'item' then
    -- Ítem: solo a quien aún no lo tiene
    with nuevos as (
      insert into public.coleccion_mia (usuario, item, origen, mensaje)
      select t.usuario, p_item, 'regalo', nota from public.regalo_todos_ids() t
      on conflict (usuario, item) do nothing
      returning usuario)
    select coalesce(array_agg(usuario), '{}') into ids from nuevos;
  else
    raise exception 'Ese regalo no se puede dar a todos';
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
