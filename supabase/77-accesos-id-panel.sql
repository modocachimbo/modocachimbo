-- =========================================================
-- Modo Cachimbo · Accesos por ID ordenados como los códigos
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 70-acceso-por-id.sql y 76-limite-descarga-por-id.sql.
--
--   · acceso_id_lista: ahora trae también los equipos de cada alumno
--     (para verlos y liberarlos desde Panel → Códigos → Por ID).
--   · acceso_id_editar: cambia paquete, fecha de fin, nota o límite de
--     descargas de un acceso sin quitarlo y volver a darlo.
--   · acceso_id_liberar: saca un equipo (o todos) de un alumno. Ese equipo
--     deja de abrir lo dado por ID; si el alumno vuelve a entrar ahí,
--     ocupa uno de sus equipos otra vez.
-- =========================================================

create or replace function public.acceso_id_lista()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.acceso_id_puede() then raise exception 'no autorizado'; end if;
  return jsonb_build_object(
    'equipos', public.acceso_id_equipos_max(),
    'hoy', public.acceso_id_hoy(),
    'lista', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', a.id, 'usuario', a.usuario, 'jid', j.codigo, 'apodo', p.apodo, 'email', u.email,
          'producto', a.producto, 'vence', a.vence, 'nota', a.nota, 'creado', a.creado, 'visto', a.visto,
          'limite_dia', a.limite_dia,
          'equipos', coalesce((select jsonb_agg(jsonb_build_object('dispositivo', e.dispositivo, 'equipo', e.equipo, 'visto', e.visto) order by e.visto desc)
                                 from public.accesos_equipos e where e.usuario = a.usuario), '[]'::jsonb))
        order by a.creado desc)
        from public.accesos_id a
        join auth.users u on u.id = a.usuario
        left join public.jugador_id j on j.usuario = a.usuario
        left join public.perfiles p on p.id = a.usuario
       where a.quitado is null
         and (a.vence is null or a.vence >= to_char((now() at time zone 'America/Lima')::date - 60, 'YYYY-MM-DD'))),
      '[]'::jsonb));
end $$;
revoke all on function public.acceso_id_lista() from public, anon;
grant execute on function public.acceso_id_lista() to authenticated;

create or replace function public.acceso_id_editar(p_id bigint, p_producto text, p_vence text default null, p_nota text default null, p_limite integer default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare lim integer := nullif(p_limite, 0);
begin
  if not public.acceso_id_puede() then raise exception 'no autorizado'; end if;
  if coalesce(p_producto, '') !~ '^[A-Za-z0-9_,-]+$' or char_length(p_producto) not between 2 and 300 then raise exception 'Elige qué le das'; end if;
  if nullif(p_vence, '') is not null and p_vence !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Fecha inválida'; end if;
  if lim is not null and (lim < 1 or lim > 500) then raise exception 'Descargas por día: de 1 a 500'; end if;
  if p_producto !~ '(^|,)descarga-VIP(,|$)' then lim := null; end if;
  update public.accesos_id
     set producto = p_producto, vence = nullif(p_vence, ''), nota = nullif(left(trim(coalesce(p_nota, '')), 120), ''), limite_dia = lim
   where id = p_id and quitado is null;
  if not found then raise exception 'Ese acceso ya no existe'; end if;
end $$;
revoke all on function public.acceso_id_editar(bigint, text, text, text, integer) from public, anon;
grant execute on function public.acceso_id_editar(bigint, text, text, text, integer) to authenticated;

-- p_dispositivo null = todos los equipos del alumno
create or replace function public.acceso_id_liberar(p_usuario uuid, p_dispositivo text default null)
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare n integer;
begin
  if not public.acceso_id_puede() then raise exception 'no autorizado'; end if;
  delete from public.accesos_equipos where usuario = p_usuario and (p_dispositivo is null or dispositivo = p_dispositivo);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.acceso_id_liberar(uuid, text) from public, anon;
grant execute on function public.acceso_id_liberar(uuid, text) to authenticated;
