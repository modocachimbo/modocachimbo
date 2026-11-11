-- =========================================================
-- Modo Cachimbo · 87 · Códigos: quién usa cada código
-- Panel → Códigos muestra en cada código qué alumno(s) lo metieron
-- en su cuenta, con enlace a su ficha. Necesita 15, 48 y 86.
-- También: Por vencer ya no muestra códigos que el alumno quitó.
-- =========================================================

-- { "MC-7KQ2": { "n": 2, "lista": [ {usuario, jid, apodo, email}, … todos ] }, … }
create or replace function public.codigos_duenos()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.ficha_puede() then raise exception 'no autorizado'; end if;
  return coalesce((
    select jsonb_object_agg(t.codigo, jsonb_build_object('n', t.n, 'lista', t.lista))
      from (
        select c.codigo, count(*) as n,
               jsonb_agg(jsonb_build_object('usuario', c.usuario, 'jid', j.codigo, 'apodo', public.duelo_apodo(c.usuario), 'email', lower(u.email))
                  order by c.creado) as lista
          from public.codigos_cuenta c
          join auth.users u on u.id = c.usuario
          left join public.jugador_id j on j.usuario = c.usuario
         where c.quitado is null
         group by c.codigo
      ) t), '{}'::jsonb);
end $$;
revoke all on function public.codigos_duenos() from public, anon;
grant execute on function public.codigos_duenos() to authenticated;

-- Por vencer: igual que en 86, pero sin los códigos que el alumno quitó de su cuenta
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
       where c.quitado is null and c.vence ~ '^\d{4}-\d{2}-\d{2}$'
         and c.vence::date between hoy - 7 and hoy + d
         and not public.suspendido(c.usuario)
    ) t), '[]'::jsonb));
end $$;
revoke all on function public.por_vencer(integer) from public, anon;
grant execute on function public.por_vencer(integer) to authenticated;
