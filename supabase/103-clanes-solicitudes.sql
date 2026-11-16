-- =========================================================
-- Modo Cachimbo · Clanes: pedir entrar a un clan del Top
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 88-clanes.sql, 89-clanes-guerras.sql y 71-amigos.sql (amigo_mini).
--
--   · Desde el Top, un alumno sin clan toca «Pedir entrar». Puede tener
--     hasta 3 pedidos a la vez (uno por clan). Vencen a los 3 días.
--   · El líder o un sublíder ve los pedidos en «Mi clan» y acepta o rechaza.
--   · Al aceptar entra como miembro (si hay sitio y no está en otro clan) y
--     se borran sus otros pedidos.
--   · El código de 4 letras sigue sirviendo igual que antes.
-- =========================================================

create table if not exists public.clan_solicitudes (
  usuario  uuid not null references auth.users (id) on delete cascade,
  clan     bigint not null references public.clanes (id) on delete cascade,
  creado   timestamptz not null default now(),
  primary key (usuario, clan)
);
create index if not exists clan_solicitudes_clan on public.clan_solicitudes (clan, creado);
alter table public.clan_solicitudes enable row level security;

-- Pedidos vivos: menos de 3 días
create or replace function public.clan_sol_viva(t timestamptz)
returns boolean language sql immutable set search_path = '' as $$ select t > now() - interval '3 days' $$;

-- ---------- Alumno ----------
create or replace function public.clan_pedir(p_clan bigint)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); c public.clanes;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if exists (select 1 from public.clan_miembros where usuario = uid) then raise exception 'ya_en_clan'; end if;
  if public.clan_espera(uid) then raise exception 'espera'; end if;
  select * into c from public.clanes where id = p_clan and not cerrado;
  if c.id is null then raise exception 'no_existe'; end if;
  if (select count(*) from public.clan_miembros where clan = c.id) >= 20 then raise exception 'lleno'; end if;
  delete from public.clan_solicitudes where usuario = uid and not public.clan_sol_viva(creado);
  if not exists (select 1 from public.clan_solicitudes where usuario = uid and clan = c.id)
     and (select count(*) from public.clan_solicitudes where usuario = uid) >= 3 then raise exception 'muchos_pedidos'; end if;
  insert into public.clan_solicitudes (usuario, clan) values (uid, c.id)
    on conflict (usuario, clan) do update set creado = now();
  return jsonb_build_object('ok', true, 'nombre', c.nombre);
end $$;
revoke all on function public.clan_pedir(bigint) from public, anon;
grant execute on function public.clan_pedir(bigint) to authenticated;

create or replace function public.clan_cancelar_pedido(p_clan bigint)
returns void language sql volatile security definer set search_path = '' as $$
  delete from public.clan_solicitudes where usuario = auth.uid() and clan = p_clan;
$$;
revoke all on function public.clan_cancelar_pedido(bigint) from public, anon;
grant execute on function public.clan_cancelar_pedido(bigint) to authenticated;

-- ---------- Líder y sublíderes ----------
create or replace function public.clan_solicitudes()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); m public.clan_miembros;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into m from public.clan_miembros where usuario = uid;
  if m.usuario is null or m.rol = 'miembro' then return '[]'::jsonb; end if;
  delete from public.clan_solicitudes where clan = m.clan and not public.clan_sol_viva(creado);
  return coalesce((
    select jsonb_agg(public.amigo_mini(s.usuario) || jsonb_build_object('creado', s.creado,
             'xp', coalesce(x.xp, 0), 'racha', coalesce((public.calc_racha(s.usuario) ->> 'actual')::integer, 0),
             'ocupado', exists (select 1 from public.clan_miembros k where k.usuario = s.usuario))
           order by s.creado)
    from public.clan_solicitudes s
    left join public.xp_semana x on x.usuario = s.usuario and x.semana = public.cz_lunes()
    where s.clan = m.clan), '[]'::jsonb);
end $$;
revoke all on function public.clan_solicitudes() from public, anon;
grant execute on function public.clan_solicitudes() to authenticated;

-- p_jugador: el código de jugador (como en clan_expulsar)
create or replace function public.clan_responder_pedido(p_jugador integer, p_aceptar boolean)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); m public.clan_miembros; quien uuid;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into m from public.clan_miembros where usuario = uid;
  if m.usuario is null then raise exception 'sin_clan'; end if;
  if m.rol = 'miembro' then raise exception 'no_lider'; end if;
  quien := public.usuario_de_codigo(p_jugador);
  if quien is null or not exists (select 1 from public.clan_solicitudes where usuario = quien and clan = m.clan) then raise exception 'pedido_no_existe'; end if;
  if not coalesce(p_aceptar, false) then
    delete from public.clan_solicitudes where usuario = quien and clan = m.clan;
    return jsonb_build_object('ok', true);
  end if;
  perform 1 from public.clanes where id = m.clan for update;
  if exists (select 1 from public.clan_miembros where usuario = quien) then
    delete from public.clan_solicitudes where usuario = quien;
    raise exception 'ya_tiene_clan';
  end if;
  if (select count(*) from public.clan_miembros where clan = m.clan) >= 20 then raise exception 'lleno'; end if;
  insert into public.clan_miembros (usuario, clan, rol) values (quien, m.clan, 'miembro');
  delete from public.clan_solicitudes where usuario = quien;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.clan_responder_pedido(integer, boolean) from public, anon;
grant execute on function public.clan_responder_pedido(integer, boolean) to authenticated;

-- ---------- Top de clanes: ahora con id, si está lleno y si ya le pediste ----------
create or replace function public.ranking_clanes()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); mio bigint; top jsonb; yo jsonb;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  perform public.clan_guardar_semana();
  select clan into mio from public.clan_miembros where usuario = uid;
  with orden as (
    select s.clan, s.xp, row_number() over (order by s.xp desc, s.clan) as puesto,
           (select count(*) from public.clan_miembros k where k.clan = s.clan) as miembros
    from public.clan_semanas s join public.clanes c on c.id = s.clan and not c.cerrado
    where s.semana = public.cz_lunes() and s.xp > 0
  ), filas as (
    select o.puesto, o.clan, jsonb_build_object('id', c.id, 'puesto', o.puesto, 'nombre', c.nombre, 'tag', c.tag, 'forma', c.forma,
             'simbolo', c.simbolo, 'color', c.color, 'oficial', c.oficial, 'miembros', o.miembros, 'xp', o.xp,
             'lleno', o.miembros >= 20, 'mio', coalesce(o.clan = mio, false),
             'pedido', exists (select 1 from public.clan_solicitudes q where q.usuario = uid and q.clan = c.id and public.clan_sol_viva(q.creado))) as j
    from orden o join public.clanes c on c.id = o.clan
  )
  select coalesce(jsonb_agg(f.j order by f.puesto) filter (where f.puesto <= 10), '[]'::jsonb),
         (array_agg(f.j) filter (where f.clan = mio))[1]
    into top, yo from filas f;
  return jsonb_build_object('top', top, 'mio', yo, 'tengo_clan', mio is not null,
    'pedidos', (select count(*) from public.clan_solicitudes q where q.usuario = uid and public.clan_sol_viva(q.creado)),
    'total', (select count(*) from public.clan_semanas s join public.clanes c on c.id = s.clan and not c.cerrado where s.semana = public.cz_lunes() and s.xp > 0));
end $$;
revoke all on function public.ranking_clanes() from public, anon;
grant execute on function public.ranking_clanes() to authenticated;
