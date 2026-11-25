-- =========================================================
-- Modo Cachimbo · Clanes: ver TODOS los clanes
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 103-clanes-solicitudes.sql y 120-clan-ingreso-recompensas.sql.
--
--   · clanes_todos(buscar, desde): lista de todos los clanes abiertos
--     (no cerrados), de 30 en 30, ordenados por XP de esta semana y
--     luego por miembros.
--   · buscar: parte del nombre, la sigla o el ID de 7 números.
--   · Cada clan trae su puesto de la semana (si sumó XP), su ID,
--     miembros, si está lleno, si es el tuyo y si ya le pediste entrar.
-- =========================================================

create or replace function public.clanes_todos(p_buscar text default null, p_desde integer default 0)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid  uuid := auth.uid();
  mio  bigint;
  b    text := nullif(trim(coalesce(p_buscar, '')), '');
  idb  bigint;
  pat  text;
  desde integer := greatest(coalesce(p_desde, 0), 0);
  filas jsonb;
  total integer;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  perform public.clan_guardar_semana();
  select clan into mio from public.clan_miembros where usuario = uid;
  if b ~ '^\d{7}$' then idb := b::bigint - 1000000; end if;
  if b is not null then pat := '%' || replace(replace(replace(left(b, 30), '\', '\\'), '%', '\%'), '_', '\_') || '%'; end if;

  with base as (
    select c.*, coalesce(s.xp, 0) as xp_s,
           (select count(*) from public.clan_miembros k where k.clan = c.id) as n
      from public.clanes c
      left join public.clan_semanas s on s.clan = c.id and s.semana = public.cz_lunes()
     where not c.cerrado
  ), orden as (
    select b2.*, case when b2.xp_s > 0 then row_number() over (order by b2.xp_s desc, b2.id) end as puesto_s
      from base b2
  ), elegidos as (
    select o.* from orden o
     where pat is null or o.id = idb or o.nombre ilike pat or o.tag ilike pat
  )
  select (select count(*) from elegidos),
         coalesce((select jsonb_agg(j order by r) from (
           select row_number() over (order by (e.id = idb) desc, e.xp_s desc, e.n desc, e.id) as r,
                  jsonb_build_object('id', e.id, 'id_publico', public.clan_id_publico(e.id), 'nombre', e.nombre, 'tag', e.tag,
                    'forma', e.forma, 'simbolo', e.simbolo, 'color', e.color, 'oficial', e.oficial,
                    'miembros', e.n, 'xp', e.xp_s, 'puesto', e.puesto_s, 'lleno', e.n >= 20,
                    'aprobacion', e.aprobacion, 'mio', coalesce(e.id = mio, false),
                    'pedido', exists (select 1 from public.clan_solicitudes q where q.usuario = uid and q.clan = e.id and public.clan_sol_viva(q.creado))) as j
             from elegidos e
            order by (e.id = idb) desc, e.xp_s desc, e.n desc, e.id
            offset desde limit 30) x), '[]'::jsonb)
    into total, filas;

  return jsonb_build_object('clanes', filas, 'total', total, 'mas', total > desde + 30, 'desde', desde,
    'tengo_clan', mio is not null);
end $$;
revoke all on function public.clanes_todos(text, integer) from public, anon;
grant execute on function public.clanes_todos(text, integer) to authenticated;
