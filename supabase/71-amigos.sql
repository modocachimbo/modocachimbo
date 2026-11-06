-- =========================================================
-- Modo Cachimbo · Amigos
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 36-tarjeta-jugador.sql, 38-ver-jugador.sql y 43-ayudantes-regalos.sql.
--
--   · Se agrega por el ID de 5 dígitos (sin buscador por nombre).
--   · amigo_solicitar / amigo_responder / amigo_cancelar / amigo_quitar / amigo_destacar.
--   · mis_amigos(): una sola llamada con tus amigos y tus solicitudes.
--   · ver_amigo(ID): la tarjeta completa (lo de ver_jugador). Carrera,
--     examen y colección solo los ven sus amigos (y él mismo).
--   · amigos_sugeridos(): del top de la semana, amigos de tus amigos y
--     de tu misma carrera (máximo 8).
--   · mi_tarjeta() suma 'solicitudes' para la burbuja roja del inicio.
--   Límites: 100 amigos, 20 solicitudes enviadas sin responder y, si te
--   rechazan, 7 días para volver a mandarle.
-- =========================================================

create table if not exists public.amistades (
  de          uuid not null references auth.users (id) on delete cascade,
  para        uuid not null references auth.users (id) on delete cascade,
  estado      text not null default 'pendiente' check (estado in ('pendiente', 'aceptada', 'rechazada')),
  fav_de      boolean not null default false,   -- «de» destacó a «para»
  fav_para    boolean not null default false,   -- «para» destacó a «de»
  creado      timestamptz not null default now(),
  respondido  timestamptz,
  primary key (de, para),
  check (de <> para)
);
create index if not exists amistades_para on public.amistades (para, estado);
create index if not exists amistades_de on public.amistades (de, estado);
alter table public.amistades enable row level security;
-- Sin políticas: solo se toca con las funciones de abajo

-- La fila entre dos alumnos (en cualquier sentido)
create or replace function public.amistad_entre(a uuid, b uuid)
returns public.amistades language sql stable security definer set search_path = '' as $$
  select * from public.amistades x where (x.de = a and x.para = b) or (x.de = b and x.para = a) limit 1;
$$;
revoke all on function public.amistad_entre(uuid, uuid) from public, anon, authenticated;

create or replace function public.son_amigos(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.amistades x where x.estado = 'aceptada' and ((x.de = a and x.para = b) or (x.de = b and x.para = a)));
$$;
revoke all on function public.son_amigos(uuid, uuid) from public, anon, authenticated;

create or replace function public.usuario_de_codigo(p_codigo integer)
returns uuid language sql stable security definer set search_path = '' as $$
  select j.usuario from public.jugador_id j where j.codigo = p_codigo;
$$;
revoke all on function public.usuario_de_codigo(integer) from public, anon, authenticated;

-- Lo que se muestra de un alumno en las listas (sin correo)
create or replace function public.amigo_mini(u uuid)
returns jsonb language sql volatile security definer set search_path = '' as $$
  select jsonb_build_object(
    'codigo', public.jugador_codigo(u),
    'apodo', public.duelo_apodo(u),
    'foto', (select p.foto_url from public.perfiles p where p.id = u and p.foto_url like 'https://%'),
    'puesto', coalesce((select c.puesto from public.coleccion_puesto c where c.usuario = u), '{}'::jsonb),
    'xp_total', public.jugador_xp_total(u),
    'xp_semana', coalesce((select x.xp from public.xp_semana x where x.usuario = u and x.semana = public.cz_lunes()), 0),
    'ultima', (select max(a.fecha) from public.actividad a where a.usuario = u and a.preguntas > 0)
  );
$$;
revoke all on function public.amigo_mini(uuid) from public, anon, authenticated;

-- Mandar solicitud por ID. Si el otro ya te había mandado una, quedan como amigos.
create or replace function public.amigo_solicitar(p_codigo integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); otro uuid; f public.amistades;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  otro := public.usuario_de_codigo(p_codigo);
  if otro is null then return jsonb_build_object('ok', false, 'error', 'no_existe'); end if;
  if otro = uid then return jsonb_build_object('ok', false, 'error', 'eres_tu'); end if;
  f := public.amistad_entre(uid, otro);
  if f.de is not null then
    if f.estado = 'aceptada' then return jsonb_build_object('ok', true, 'estado', 'amigos'); end if;
    if f.estado = 'pendiente' and f.de = uid then return jsonb_build_object('ok', true, 'estado', 'enviada'); end if;
    if f.estado = 'pendiente' and f.para = uid then
      -- Él ya te había mandado: se acepta
      if (select count(*) from public.amistades x where x.estado = 'aceptada' and (x.de = uid or x.para = uid)) >= 100 then
        return jsonb_build_object('ok', false, 'error', 'limite_amigos');
      end if;
      update public.amistades set estado = 'aceptada', respondido = now() where de = f.de and para = f.para;
      return jsonb_build_object('ok', true, 'estado', 'amigos');
    end if;
    -- rechazada: 7 días de espera para quien fue rechazado
    if f.de = uid and f.respondido > now() - interval '7 days' then
      return jsonb_build_object('ok', false, 'error', 'espera');
    end if;
    delete from public.amistades where de = f.de and para = f.para;
  end if;
  if (select count(*) from public.amistades x where x.estado = 'aceptada' and (x.de = uid or x.para = uid)) >= 100 then
    return jsonb_build_object('ok', false, 'error', 'limite_amigos');
  end if;
  if (select count(*) from public.amistades x where x.estado = 'pendiente' and x.de = uid) >= 20 then
    return jsonb_build_object('ok', false, 'error', 'limite_solicitudes');
  end if;
  insert into public.amistades (de, para) values (uid, otro);
  return jsonb_build_object('ok', true, 'estado', 'enviada');
end $$;
revoke all on function public.amigo_solicitar(integer) from public, anon;
grant execute on function public.amigo_solicitar(integer) to authenticated;

create or replace function public.amigo_responder(p_codigo integer, p_aceptar boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); otro uuid;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  otro := public.usuario_de_codigo(p_codigo);
  if p_aceptar and (select count(*) from public.amistades x where x.estado = 'aceptada' and (x.de = uid or x.para = uid)) >= 100 then
    return jsonb_build_object('ok', false, 'error', 'limite_amigos');
  end if;
  update public.amistades set estado = case when p_aceptar then 'aceptada' else 'rechazada' end, respondido = now()
   where de = otro and para = uid and estado = 'pendiente';
  return jsonb_build_object('ok', found);
end $$;
revoke all on function public.amigo_responder(integer, boolean) from public, anon;
grant execute on function public.amigo_responder(integer, boolean) to authenticated;

create or replace function public.amigo_cancelar(p_codigo integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'sin sesión'; end if;
  delete from public.amistades where de = uid and para = public.usuario_de_codigo(p_codigo) and estado = 'pendiente';
  return jsonb_build_object('ok', found);
end $$;
revoke all on function public.amigo_cancelar(integer) from public, anon;
grant execute on function public.amigo_cancelar(integer) to authenticated;

create or replace function public.amigo_quitar(p_codigo integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); otro uuid := public.usuario_de_codigo(p_codigo);
begin
  if uid is null then raise exception 'sin sesión'; end if;
  delete from public.amistades where estado = 'aceptada' and ((de = uid and para = otro) or (de = otro and para = uid));
  return jsonb_build_object('ok', found);
end $$;
revoke all on function public.amigo_quitar(integer) from public, anon;
grant execute on function public.amigo_quitar(integer) to authenticated;

create or replace function public.amigo_destacar(p_codigo integer, p_si boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); otro uuid := public.usuario_de_codigo(p_codigo);
begin
  if uid is null then raise exception 'sin sesión'; end if;
  update public.amistades set fav_de = p_si where estado = 'aceptada' and de = uid and para = otro;
  if not found then update public.amistades set fav_para = p_si where estado = 'aceptada' and de = otro and para = uid; end if;
  return jsonb_build_object('ok', found);
end $$;
revoke all on function public.amigo_destacar(integer, boolean) from public, anon;
grant execute on function public.amigo_destacar(integer, boolean) to authenticated;

-- Todo lo de la página Amigos en una llamada
create or replace function public.mis_amigos()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'sin sesión'; end if;
  return jsonb_build_object(
    'amigos', coalesce((
      select jsonb_agg(public.amigo_mini(o.u) || jsonb_build_object('desde', o.desde, 'destacado', o.fav) order by o.fav desc, o.xs desc)
      from (
        select case when x.de = uid then x.para else x.de end as u,
               coalesce(x.respondido, x.creado) as desde,
               case when x.de = uid then x.fav_de else x.fav_para end as fav,
               coalesce((select s.xp from public.xp_semana s where s.usuario = case when x.de = uid then x.para else x.de end and s.semana = public.cz_lunes()), 0) as xs
        from public.amistades x where x.estado = 'aceptada' and (x.de = uid or x.para = uid)
      ) o), '[]'::jsonb),
    'recibidas', coalesce((
      select jsonb_agg(public.amigo_mini(x.de) || jsonb_build_object('cuando', x.creado,
               'comun', (select public.duelo_apodo(c.u) from (
                   select case when y.de = x.de then y.para else y.de end as u from public.amistades y
                   where y.estado = 'aceptada' and (y.de = x.de or y.para = x.de)) c
                 where public.son_amigos(c.u, uid) limit 1)) order by x.creado desc)
      from public.amistades x where x.para = uid and x.estado = 'pendiente'), '[]'::jsonb),
    'enviadas', coalesce((
      select jsonb_agg(public.amigo_mini(x.para) || jsonb_build_object('cuando', x.creado) order by x.creado desc)
      from public.amistades x where x.de = uid and x.estado = 'pendiente'), '[]'::jsonb)
  );
end $$;
revoke all on function public.mis_amigos() from public, anon;
grant execute on function public.mis_amigos() to authenticated;

-- La tarjeta completa de un alumno (o la tuya, sin ID)
create or replace function public.ver_amigo(p_codigo integer default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); u uuid; r jsonb; f public.amistades; amigo boolean; p record;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  u := case when p_codigo is null then uid else public.usuario_de_codigo(p_codigo) end;
  if u is null then return null; end if;
  r := public.ver_jugador(public.jugador_codigo(u));
  f := public.amistad_entre(uid, u);
  amigo := f.estado = 'aceptada';
  r := r || jsonb_build_object(
    'relacion', case when u = uid then 'yo' when amigo then 'amigo'
                     when f.estado = 'pendiente' and f.de = uid then 'enviada'
                     when f.estado = 'pendiente' then 'recibida' else 'nada' end,
    'desde', case when amigo then coalesce(f.respondido, f.creado) end,
    'destacado', case when amigo then (case when f.de = uid then f.fav_de else f.fav_para end) end);
  if u = uid or amigo then
    select pf.carrera, pf.modalidad, pf.fecha_examen into p from public.perfiles pf where pf.id = u;
    r := r || jsonb_build_object('carrera', p.carrera, 'modalidad', p.modalidad, 'fecha_examen', p.fecha_examen,
      'tiene', coalesce((select jsonb_agg(i.id) from public.coleccion_item i where public.col_tiene(u, i.id)), '[]'::jsonb),
      'mi_xp_semana', coalesce((select x.xp from public.xp_semana x where x.usuario = uid and x.semana = public.cz_lunes()), 0));
  end if;
  return r;
end $$;
revoke all on function public.ver_amigo(integer) from public, anon;
grant execute on function public.ver_amigo(integer) to authenticated;

-- Quizás los conozcas: amigos de tus amigos, de tu misma carrera y del top de la semana
create or replace function public.amigos_sugeridos()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); mi_carrera text;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select nullif(trim(p.carrera), '') into mi_carrera from public.perfiles p where p.id = uid;
  return coalesce((
    select jsonb_agg(public.amigo_mini(s.u) || jsonb_build_object('motivo', s.motivo) order by s.orden, s.xp desc)
    from (
      select distinct on (c.u) c.u, c.motivo, c.orden, c.xp from (
        -- amigos de tus amigos
        select case when y.de = m.u then y.para else y.de end as u,
               count(*) over (partition by case when y.de = m.u then y.para else y.de end) || ' amigo' ||
                 case when count(*) over (partition by case when y.de = m.u then y.para else y.de end) > 1 then 's' else '' end || ' en común' as motivo,
               1 as orden, 0 as xp
        from (select case when x.de = uid then x.para else x.de end as u from public.amistades x
              where x.estado = 'aceptada' and (x.de = uid or x.para = uid)) m
        join public.amistades y on y.estado = 'aceptada' and (y.de = m.u or y.para = m.u)
        union all
        -- top de la semana
        select t.usuario, 'Top ' || t.puesto || ' de la semana', 2, t.xp from (
          select x.usuario, x.xp, row_number() over (order by x.xp desc) as puesto
          from public.xp_semana x where x.semana = public.cz_lunes() and x.xp > 0 order by x.xp desc limit 15) t
        union all
        -- misma carrera, que estudiaron esta semana
        select k.id, 'Postula a ' || k.carrera, 3, k.xp from (
          select p.id, p.carrera, x.xp
          from public.perfiles p join public.xp_semana x on x.usuario = p.id and x.semana = public.cz_lunes() and x.xp > 0
          where mi_carrera is not null and p.carrera = mi_carrera order by x.xp desc limit 15) k
      ) c
      where c.u <> uid and public.amistad_entre(uid, c.u) is null
      order by c.u, c.orden
    ) s
    limit 8), '[]'::jsonb);
end $$;
revoke all on function public.amigos_sugeridos() from public, anon;
grant execute on function public.amigos_sugeridos() to authenticated;

-- Tu tarjeta: igual que en 43, más cuántas solicitudes tienes (burbuja roja)
create or replace function public.mi_tarjeta()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid   uuid := auth.uid();
  cod   integer;
  correo text := lower(auth.jwt() ->> 'email');
  i     integer := 0;
begin
  if uid is null then return null; end if;
  select j.codigo into cod from public.jugador_id j where j.usuario = uid;
  while cod is null and i < 50 loop
    i := i + 1;
    begin
      insert into public.jugador_id (usuario, codigo)
      values (uid, 10000 + floor(random() * 89999)::integer)
      returning codigo into cod;
    exception when unique_violation then
      select j.codigo into cod from public.jugador_id j where j.usuario = uid;
    end;
  end loop;
  return jsonb_build_object(
    'codigo', cod,
    'xp_total', public.jugador_xp_total(uid),
    'solicitudes', (select count(*) from public.amistades x where x.para = uid and x.estado = 'pendiente'),
    'admin', exists (select 1 from public.admins a where lower(a.email) = correo)
          or exists (select 1 from public.equipo e where e.email = correo and e.activo)
  );
end $$;
revoke all on function public.mi_tarjeta() from public, anon;
grant execute on function public.mi_tarjeta() to authenticated;
