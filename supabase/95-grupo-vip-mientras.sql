-- =========================================================
-- Modo Cachimbo · Grupo VIP: los regalos valen MIENTRAS esté en el grupo
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 93-grupo-vip.sql y 94-alumno-visto.sql.
--
--   · regalo_grupo_dado: qué le dio el grupo a cada alumno.
--   · Si quitas a un alumno del grupo (Guardar grupo), se le quita lo que
--     le dio el grupo:
--       - ítems: se le borran (y si lo tenía puesto, se le saca);
--       - corazones infinitos: se le quita el tiempo que le quedaba;
--       - corazones extra: se le quitan los que todavía no usó;
--       - XP: se le resta de esa semana y de su saldo para canjear.
--   · Si agregas a un alumno, recibe lo que el grupo tiene vigente:
--       - todos los ítems que regalaste al grupo;
--       - los infinitos que todavía no vencen (hasta la misma hora);
--       - los corazones y el XP que regalaste HOY.
--   · Los regalos al grupo de antes de este archivo no se cuentan.
-- =========================================================

alter table public.regalo_grupo_envio add column if not exists hasta timestamptz;   -- infinitos: hasta cuándo
alter table public.regalo_grupo_envio add column if not exists nuevos integer not null default 0;

create table if not exists public.regalo_grupo_dado (
  id      bigserial primary key,
  grupo   text not null,
  usuario uuid not null references auth.users (id) on delete cascade,
  envio   bigint references public.regalo_grupo_envio (id) on delete set null,
  tipo    text not null,
  cantidad integer,
  item    text,
  hasta   timestamptz,
  semana  date,
  creado  timestamptz not null default now()
);
create index if not exists regalo_grupo_dado_u on public.regalo_grupo_dado (grupo, usuario);
alter table public.regalo_grupo_dado enable row level security;
-- Nadie lee ni escribe la tabla directo: solo con las funciones de abajo

-- Le da a un alumno un regalo del grupo y lo anota. false = ya tenía ese ítem.
create or replace function public.regalo_grupo_aplicar(p_grupo text, p_envio bigint, u uuid, p_tipo text, n integer, p_item text,
                                                      p_hasta timestamptz, nota text, yo text, nom text)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare h integer := n;
begin
  perform public.cz_estado(u);
  if p_tipo = 'corazones' then
    update public.corazones set extra = least(extra + n, 999), actualizado = now() where usuario = u;
  elsif p_tipo = 'infinito' then
    -- Lo que le falta hasta que vence el regalo del grupo (para los que entran después)
    if p_hasta is not null then h := ceil(extract(epoch from (p_hasta - now())) / 3600)::integer; end if;
    if h < 1 then return false; end if;
    update public.corazones set infinito_hasta = greatest(coalesce(infinito_hasta, now()), now()) + h * interval '1 hour', actualizado = now()
     where usuario = u;
  elsif p_tipo = 'xp' then
    insert into public.xp_semana (usuario, semana, xp) values (u, public.cz_lunes(), n)
    on conflict (usuario, semana) do update set xp = public.xp_semana.xp + excluded.xp;
    update public.corazones set xp_saldo = xp_saldo + n, actualizado = now() where usuario = u;
  elsif p_tipo = 'item' then
    insert into public.coleccion_mia (usuario, item, origen, mensaje) values (u, p_item, 'grupo', nota)
    on conflict (usuario, item) do nothing;
    if not found then return false; end if;
  end if;
  insert into public.regalo_grupo_dado (grupo, usuario, envio, tipo, cantidad, item, hasta, semana)
  values (p_grupo, u, p_envio, p_tipo, case when p_tipo = 'infinito' then h when p_tipo = 'item' then null else n end,
          case when p_tipo = 'item' then p_item end,
          case when p_tipo = 'infinito' then now() + h * interval '1 hour' end,
          case when p_tipo = 'xp' then public.cz_lunes() end);
  insert into public.regalos (usuario, tipo, cantidad, item, nota, de_email, de_nombre)
  values (u, p_tipo, case when p_tipo = 'item' then null when p_tipo = 'infinito' then h else n end,
          case when p_tipo = 'item' then p_item end, nota, yo, nom);
  return true;
end $$;
revoke all on function public.regalo_grupo_aplicar(text, bigint, uuid, text, integer, text, timestamptz, text, text, text) from public, anon, authenticated;

-- Le quita a un alumno todo lo que le dio el grupo
create or replace function public.regalo_grupo_revocar(p_grupo text, u uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare r record; v jsonb; k text; x text; quitados text[];
begin
  perform public.cz_estado(u);
  for r in select * from public.regalo_grupo_dado d where d.grupo = p_grupo and d.usuario = u loop
    if r.tipo = 'corazones' then
      update public.corazones set extra = greatest(extra - coalesce(r.cantidad, 0), 0), actualizado = now() where usuario = u;
    elsif r.tipo = 'infinito' and r.hasta > now() then
      update public.corazones set infinito_hasta = greatest(infinito_hasta - (r.hasta - now()), now()), actualizado = now()
       where usuario = u and infinito_hasta > now();
    elsif r.tipo = 'xp' then
      update public.xp_semana set xp = greatest(xp - coalesce(r.cantidad, 0), 0) where usuario = u and semana = r.semana;
      update public.corazones set xp_saldo = greatest(xp_saldo - coalesce(r.cantidad, 0), 0), actualizado = now() where usuario = u;
    elsif r.tipo = 'item' then
      delete from public.coleccion_mia m where m.usuario = u and m.item = r.item and m.origen = 'grupo';
      quitados := array_append(quitados, r.item);
    end if;
  end loop;
  delete from public.regalo_grupo_dado d where d.grupo = p_grupo and d.usuario = u;
  -- Si tenía puesto un ítem que ya no tiene, se le saca
  if quitados is not null then
    select p.puesto into v from public.coleccion_puesto p where p.usuario = u for update;
    if v is not null then
      for k, x in select e.key, e.value #>> '{}' from jsonb_each(v) e where e.key not in ('pines', '_antes') and jsonb_typeof(e.value) = 'string' loop
        if x = any (quitados) and not coalesce(public.col_tiene(u, x), false) then v := v - k; end if;
      end loop;
      if jsonb_typeof(v -> 'pines') = 'array' then
        v := jsonb_set(v, '{pines}', coalesce((select jsonb_agg(p order by o) from jsonb_array_elements_text(v -> 'pines') with ordinality e(p, o)
                                                where not (p = any (quitados)) or coalesce(public.col_tiene(u, p), false)), '[]'));
      end if;
      update public.coleccion_puesto set puesto = v, cambiado = now() where usuario = u;
    end if;
  end if;
end $$;
revoke all on function public.regalo_grupo_revocar(text, uuid) from public, anon, authenticated;

-- Le da a un alumno que acaba de entrar lo vigente del grupo. Devuelve cuántos regalos recibió.
create or replace function public.regalo_grupo_bienvenida(p_grupo text, u uuid, yo text, nom text)
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare e record; c integer := 0; hoy date := (now() at time zone 'America/Lima')::date;
begin
  for e in select * from public.regalo_grupo_envio x where x.grupo = p_grupo and (
             x.tipo = 'item'
          or (x.tipo = 'infinito' and x.hasta > now())
          or (x.tipo in ('corazones', 'xp') and (x.creado at time zone 'America/Lima')::date = hoy))
           order by x.id loop
    if public.regalo_grupo_aplicar(p_grupo, e.id, u, e.tipo, e.cantidad, e.item, e.hasta, e.nota, yo, nom) then
      c := c + 1;
      update public.regalo_grupo_envio set nuevos = nuevos + 1 where id = e.id;
    end if;
  end loop;
  return c;
end $$;
revoke all on function public.regalo_grupo_bienvenida(text, uuid, text, text) from public, anon, authenticated;

-- ---------- Guardar la lista de IDs (reemplaza la anterior) ----------
create or replace function public.grupo_regalo_guardar(p_grupo text, p_codigos integer[])
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  yo     text := lower(auth.jwt() ->> 'email');
  nom    text;
  faltan jsonb;
  n      integer;
  u      uuid;
  sal    integer := 0;
  ent    integer := 0;
begin
  if not public.puede('regalos') then raise exception 'no autorizado'; end if;
  if p_grupo is null or char_length(p_grupo) not between 1 and 40 then raise exception 'nombre de grupo no válido'; end if;
  if coalesce(array_length(p_codigos, 1), 0) > 1000 then raise exception 'Máximo 1000 alumnos por grupo'; end if;
  select e.nombre into nom from public.equipo e where e.email = yo;
  select coalesce(jsonb_agg(c), '[]'::jsonb) into faltan
    from (select distinct c from unnest(coalesce(p_codigos, '{}')) c
           where not exists (select 1 from public.jugador_id j where j.codigo = c) order by c) t;
  -- Salen: se les quita lo que les dio el grupo
  for u in select g.usuario from public.regalo_grupo g
            where g.grupo = p_grupo
              and g.usuario not in (select j.usuario from public.jugador_id j where j.codigo = any (coalesce(p_codigos, '{}'))) loop
    perform public.regalo_grupo_revocar(p_grupo, u);
    delete from public.regalo_grupo g where g.grupo = p_grupo and g.usuario = u;
    sal := sal + 1;
  end loop;
  -- Entran: reciben lo vigente del grupo
  for u in select j.usuario from public.jugador_id j
            where j.codigo = any (coalesce(p_codigos, '{}'))
              and not exists (select 1 from public.regalo_grupo g where g.grupo = p_grupo and g.usuario = j.usuario) loop
    insert into public.regalo_grupo (grupo, usuario, por) values (p_grupo, u, yo);
    perform public.regalo_grupo_bienvenida(p_grupo, u, yo, nom);
    ent := ent + 1;
  end loop;
  select count(*) into n from public.regalo_grupo g where g.grupo = p_grupo;
  perform public.anotar('Regalos', 'Guardó el grupo ' || upper(p_grupo) || ' con ' || n || ' alumnos (entraron ' || ent || ', salieron ' || sal || ')',
    jsonb_build_object('grupo', p_grupo, 'alumnos', n, 'entraron', ent, 'salieron', sal));
  return public.grupo_regalo_ver(p_grupo) || jsonb_build_object('no_existen', faltan, 'entraron', ent, 'salieron', sal);
end $$;
revoke all on function public.grupo_regalo_guardar(text, integer[]) from public, anon;
grant execute on function public.grupo_regalo_guardar(text, integer[]) to authenticated;

-- ---------- Regalar a todo el grupo ----------
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
  env  bigint;
begin
  if not public.puede('regalos') then raise exception 'no autorizado'; end if;
  if p_tipo = 'corazones' then
    if n < 1 or n > 50 then raise exception 'Elige de 1 a 50 corazones'; end if;
    txt := n || ' corazón' || case when n = 1 then '' else 'es' end;
  elsif p_tipo = 'infinito' then
    if n < 1 or n > 720 then raise exception 'Elige de 1 hora a 30 días'; end if;
    txt := 'corazones infinitos por ' || case when n % 24 = 0 then (n / 24) || ' día' || case when n = 24 then '' else 's' end
                                             else n || ' hora' || case when n = 1 then '' else 's' end end;
  elsif p_tipo = 'xp' then
    if n < 1 or n > 10000 then raise exception 'Elige de 1 a 10 000 XP'; end if;
    txt := n || ' XP';
  elsif p_tipo = 'item' then
    if not exists (select 1 from public.coleccion_item i where i.id = p_item) then raise exception 'Ese ítem no existe'; end if;
    if exists (select 1 from public.regalo_grupo_envio x where x.grupo = p_grupo and x.tipo = 'item' and x.item = p_item) then
      raise exception 'Ese ítem ya es del grupo: lo tienen todos y lo reciben los que entran';
    end if;
    txt := 'el ítem ' || coalesce((select i.nom from public.coleccion_item i where i.id = p_item), p_item);
  else
    raise exception 'tipo de regalo no válido';
  end if;
  if not exists (select 1 from public.regalo_grupo g where g.grupo = p_grupo) then raise exception 'El grupo está vacío'; end if;
  select e.nombre into nom from public.equipo e where e.email = yo;
  insert into public.regalo_grupo_envio (grupo, tipo, cantidad, item, nota, hasta, de_email, de_nombre)
  values (p_grupo, p_tipo, case when p_tipo = 'item' then null else n end, case when p_tipo = 'item' then p_item end, nota,
          case when p_tipo = 'infinito' then now() + n * interval '1 hour' end, yo, nom)
  returning id into env;
  for u in select g.usuario from public.regalo_grupo g where g.grupo = p_grupo loop
    if public.regalo_grupo_aplicar(p_grupo, env, u, p_tipo, case when p_tipo = 'item' then null else n end,
                                   case when p_tipo = 'item' then p_item end, null, nota, yo, nom) then ok := ok + 1; else sal := sal + 1; end if;
  end loop;
  update public.regalo_grupo_envio set recibieron = ok, saltados = sal where id = env;
  perform public.anotar('Regalos', 'Regaló ' || txt || ' al grupo ' || upper(p_grupo) || ' (' || ok || ' alumnos)',
    jsonb_build_object('grupo', p_grupo, 'tipo', p_tipo, 'cantidad', n, 'item', p_item, 'nota', nota, 'recibieron', ok, 'saltados', sal));
  return public.grupo_regalo_ver(p_grupo) || jsonb_build_object('recibieron', ok, 'saltados', sal);
end $$;
revoke all on function public.grupo_regalo_dar(text, text, integer, text, text) from public, anon;
grant execute on function public.grupo_regalo_dar(text, text, integer, text, text) to authenticated;

-- ---------- Quitar un regalo del grupo (a todos) ----------
-- Para los ítems e infinitos vigentes: se les quita a todos y ya no lo reciben los que entran.
create or replace function public.grupo_regalo_anular(p_grupo text, p_envio bigint)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare e record; r record; v jsonb; k text; x text;
begin
  if not public.puede('regalos') then raise exception 'no autorizado'; end if;
  select * into e from public.regalo_grupo_envio x where x.id = p_envio and x.grupo = p_grupo;
  if e.id is null then raise exception 'Ese regalo no existe'; end if;
  for r in select * from public.regalo_grupo_dado d where d.envio = p_envio loop
    if r.tipo = 'item' then
      delete from public.coleccion_mia m where m.usuario = r.usuario and m.item = r.item and m.origen = 'grupo';
      select p.puesto into v from public.coleccion_puesto p where p.usuario = r.usuario for update;
      if v is not null then
        for k, x in select j.key, j.value #>> '{}' from jsonb_each(v) j where j.key not in ('pines', '_antes') and jsonb_typeof(j.value) = 'string' loop
          if x = r.item and not coalesce(public.col_tiene(r.usuario, x), false) then v := v - k; end if;
        end loop;
        if jsonb_typeof(v -> 'pines') = 'array' then
          v := jsonb_set(v, '{pines}', coalesce((select jsonb_agg(p order by o) from jsonb_array_elements_text(v -> 'pines') with ordinality q(p, o)
                                                  where p <> r.item or coalesce(public.col_tiene(r.usuario, p), false)), '[]'));
        end if;
        update public.coleccion_puesto set puesto = v, cambiado = now() where usuario = r.usuario;
      end if;
    elsif r.tipo = 'infinito' and r.hasta > now() then
      update public.corazones set infinito_hasta = greatest(infinito_hasta - (r.hasta - now()), now()), actualizado = now()
       where usuario = r.usuario and infinito_hasta > now();
    end if;
  end loop;
  delete from public.regalo_grupo_dado d where d.envio = p_envio and d.tipo in ('item', 'infinito');
  -- Ya no cuenta como vigente (ítem o infinito)
  update public.regalo_grupo_envio set hasta = case when tipo = 'infinito' then now() else hasta end,
         tipo = case when tipo = 'item' then 'item-quitado' else tipo end
   where id = p_envio;
  perform public.anotar('Regalos', 'Quitó un regalo del grupo ' || upper(p_grupo), jsonb_build_object('grupo', p_grupo, 'envio', p_envio));
  return public.grupo_regalo_ver(p_grupo);
end $$;
revoke all on function public.grupo_regalo_anular(text, bigint) from public, anon;
grant execute on function public.grupo_regalo_anular(text, bigint) to authenticated;

-- ---------- Ver el grupo (con lo vigente) ----------
create or replace function public.grupo_regalo_ver(p_grupo text default 'vip')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.puede('regalos') then raise exception 'no autorizado'; end if;
  return jsonb_build_object(
    'miembros', coalesce((select jsonb_agg(jsonb_build_object(
        'codigo', j.codigo, 'apodo', public.duelo_apodo(g.usuario),
        'email', (select lower(a.email) from auth.users a where a.id = g.usuario),
        'foto', (select p.foto_url from public.perfiles p where p.id = g.usuario and p.foto_url like 'https://%'),
        -- Última vez que se le vio: abrió la web, entró con Google o practicó (lo más reciente)
        'visto', greatest((select v.visto from public.alumno_visto v where v.usuario = g.usuario),
                          (select a.last_sign_in_at from auth.users a where a.id = g.usuario),
                          (select (max(x.fecha) + time '12:00') at time zone 'America/Lima' from public.actividad x where x.usuario = g.usuario and x.preguntas > 0)))
        order by g.agregado, j.codigo)
      from public.regalo_grupo g join public.jugador_id j on j.usuario = g.usuario
     where g.grupo = p_grupo), '[]'::jsonb),
    'envios', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'tipo', e.tipo, 'cantidad', e.cantidad, 'item', e.item, 'nota', e.nota,
        'recibieron', e.recibieron, 'saltados', e.saltados, 'nuevos', e.nuevos, 'hasta', e.hasta,
        'vigente', e.tipo = 'item' or (e.tipo = 'infinito' and e.hasta > now())
                   or (e.tipo in ('corazones', 'xp') and (e.creado at time zone 'America/Lima')::date = (now() at time zone 'America/Lima')::date),
        'de', coalesce(e.de_nombre, e.de_email), 'creado', e.creado) order by e.id desc)
      from (select * from public.regalo_grupo_envio x where x.grupo = p_grupo
             order by (x.tipo = 'item') desc, x.id desc limit 30) e), '[]'::jsonb));
end $$;
revoke all on function public.grupo_regalo_ver(text) from public, anon;
grant execute on function public.grupo_regalo_ver(text) to authenticated;
