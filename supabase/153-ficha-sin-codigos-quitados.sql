-- 153 · Ficha del alumno: ya no muestra los códigos quitados de su cuenta
-- (los que «Limpiar cuentas» de Panel → Códigos marcó porque se borraron, vencieron o se apagaron).
-- Solo cambia ficha_alumno(). Va después de 86 y 48.
create or replace function public.ficha_alumno(p_usuario uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r jsonb; hoy text := public.acceso_id_hoy();
begin
  if not public.ficha_puede() then raise exception 'no autorizado'; end if;
  if not exists (select 1 from auth.users u where u.id = p_usuario) then return null; end if;
  r := public.calc_racha(p_usuario);
  return jsonb_build_object(
    'usuario', p_usuario,
    'jid', (select j.codigo from public.jugador_id j where j.usuario = p_usuario),
    'email', (select lower(u.email) from auth.users u where u.id = p_usuario),
    'creado', (select u.created_at from auth.users u where u.id = p_usuario),
    'ultimo_login', (select u.last_sign_in_at from auth.users u where u.id = p_usuario),
    'apodo', public.duelo_apodo(p_usuario),
    'perfil', (select jsonb_build_object('nombre', p.nombre, 'apodo', p.apodo, 'carrera', p.carrera, 'modalidad', p.modalidad,
                  'celular', p.celular, 'foto', case when p.foto_url like 'https://%' then p.foto_url end)
                 from public.perfiles p where p.id = p_usuario),
    'racha', jsonb_build_object('actual', r -> 'actual', 'mejor', r -> 'mejor', 'hoy', r -> 'hoy'),
    'ultima_actividad', (select max(a.fecha) from public.actividad a where a.usuario = p_usuario and a.preguntas > 0),
    'hoy', hoy,
    'por_id', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'producto', a.producto, 'vence', a.vence, 'nota', a.nota,
                    'creado', a.creado, 'limite_dia', a.limite_dia, 'max_equipos', a.max_equipos) order by a.creado desc)
                  from public.accesos_id a where a.usuario = p_usuario and a.quitado is null), '[]'::jsonb),
    'codigos', coalesce((select jsonb_agg(jsonb_build_object('codigo', c.codigo, 'producto', c.producto, 'vence', c.vence, 'creado', c.creado) order by c.creado desc)
                  from public.codigos_cuenta c where c.usuario = p_usuario and c.quitado is null), '[]'::jsonb),
    'equipos', coalesce((select jsonb_agg(jsonb_build_object('dispositivo', e.dispositivo, 'equipo', e.equipo, 'visto', e.visto) order by e.visto desc)
                  from public.accesos_equipos e where e.usuario = p_usuario), '[]'::jsonb),
    'equipos_max', public.acceso_id_equipos_de(p_usuario),
    'descargas', jsonb_build_object(
        'total', (select count(*) from public.descargas d where d.usuario = p_usuario),
        'mes', (select count(*) from public.descargas d where d.usuario = p_usuario and d.creado > now() - interval '30 days')),
    'influencer', exists (select 1 from public.grupo_miembro g where g.grupo = 'influencer' and g.usuario = p_usuario),
    'nota', (select n.nota from public.alumno_nota n where n.usuario = p_usuario),
    'suspension', (select jsonb_build_object('hasta', s.hasta, 'motivo', s.motivo, 'creado', s.creado, 'por', s.por)
                     from public.alumno_suspension s where s.usuario = p_usuario and (s.hasta is null or s.hasta > now())),
    'pagado', coalesce((select sum(x.monto) from public.alumno_pago x where x.usuario = p_usuario), 0),
    'historial', coalesce((select jsonb_agg(z.h || jsonb_build_object('t', z.t) order by z.t desc) from (
        select a.creado as t, jsonb_build_object('tipo', 'id', 'txt', 'Por ID: ' || a.producto || coalesce(' hasta ' || a.vence, '')) as h
          from public.accesos_id a where a.usuario = p_usuario
        union all
        select a.quitado, jsonb_build_object('tipo', 'quitado', 'txt', 'Le quitaste ' || a.producto)
          from public.accesos_id a where a.usuario = p_usuario and a.quitado is not null
        union all
        select g.creado, jsonb_build_object('tipo', 'regalo', 'txt', 'Regalo: ' || g.tipo || coalesce(' ' || g.cantidad, '') || coalesce(' ' || g.item, ''))
          from public.regalos g where g.usuario = p_usuario
        union all
        select x.creado, jsonb_build_object('tipo', 'pago', 'txt', 'Pagó S/ ' || x.monto || coalesce(' por ' || x.medio, '') || coalesce(' · ' || x.producto, '') || coalesce(' · ' || x.nota, ''))
          from public.alumno_pago x where x.usuario = p_usuario
        union all
        select c.creado, jsonb_build_object('tipo', 'contacto', 'txt', 'Le escribiste por WhatsApp')
          from public.alumno_contacto c where c.usuario = p_usuario
        union all
        select c.creado, jsonb_build_object('tipo', 'codigo', 'txt', 'Activó el código ' || c.codigo)
          from public.codigos_cuenta c where c.usuario = p_usuario
        order by 1 desc limit 40) z), '[]'::jsonb)
  );
end $$;
revoke all on function public.ficha_alumno(uuid) from public, anon;
grant execute on function public.ficha_alumno(uuid) to authenticated;
