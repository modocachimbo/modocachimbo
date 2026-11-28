-- 152 · Equipos por cuenta al estilo «Usar aquí»
-- Antes: un equipo nuevo sacaba en silencio al más antiguo, y como cada equipo vuelve a preguntar
-- cada 2 minutos, se iban sacando entre ellos (la cuenta se podía prestar).
-- Ahora: si la cuenta ya está en su tope de equipos (Códigos → Acceso libre y ajustes → Dispositivos),
-- el equipo nuevo NO entra solo. Ve «Tu cuenta ya está abierta en 2 equipos» y el botón «Usar aquí»,
-- que cierra el equipo usado hace más tiempo. El equipo cerrado ve lo mismo si quiere volver.
-- Va después de 86.

create or replace function public.mis_accesos_id(p_dispositivo text, p_equipo text default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); hoy text := public.acceso_id_hoy();
  mx integer; lista jsonb; usados integer := 0; ok boolean := true; lleno boolean := false; otros jsonb := '[]'::jsonb;
begin
  if uid is null then return jsonb_build_object('lista', '[]'::jsonb, 'permitido', false); end if;
  if public.suspendido(uid) then
    return jsonb_build_object('id', (select j.codigo from public.jugador_id j where j.usuario = uid),
      'permitido', false, 'suspendido', true, 'equipos', 0, 'max', 0, 'lista', '[]'::jsonb);
  end if;
  mx := public.acceso_id_equipos_de(uid);
  select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'producto', a.producto, 'vence', a.vence, 'nuevo', not a.visto) order by a.creado), '[]'::jsonb)
    into lista from public.accesos_id a
   where a.usuario = uid and a.quitado is null and (a.vence is null or a.vence >= hoy);
  if jsonb_array_length(lista) > 0 and coalesce(p_dispositivo, '') ~ '^d-[a-z0-9]{8,40}$' then
    if exists (select 1 from public.accesos_equipos e where e.usuario = uid and e.dispositivo = p_dispositivo) then
      update public.accesos_equipos set visto = now(), equipo = coalesce(left(p_equipo, 60), equipo)
       where usuario = uid and dispositivo = p_dispositivo;
    else
      select count(*) into usados from public.accesos_equipos e where e.usuario = uid;
      if mx > 0 and usados >= mx then
        lleno := true; ok := false;
      else
        insert into public.accesos_equipos (usuario, dispositivo, equipo) values (uid, p_dispositivo, left(p_equipo, 60));
      end if;
    end if;
    -- Si bajaron el tope desde el panel: quedan los usados más recientemente
    if mx > 0 then
      delete from public.accesos_equipos e where e.usuario = uid and e.dispositivo not in (
        select x.dispositivo from public.accesos_equipos x where x.usuario = uid order by x.visto desc limit mx);
    end if;
    select count(*) into usados from public.accesos_equipos e where e.usuario = uid;
    if not lleno then
      ok := exists (select 1 from public.accesos_equipos e where e.usuario = uid and e.dispositivo = p_dispositivo);
      if not ok then lleno := true; end if;
    end if;
    if lleno then
      select coalesce(jsonb_agg(jsonb_build_object('equipo', coalesce(e.equipo, 'Otro equipo'), 'visto', e.visto) order by e.visto desc), '[]'::jsonb)
        into otros from public.accesos_equipos e where e.usuario = uid;
    end if;
    if ok then update public.accesos_id set visto = true where usuario = uid and not visto and quitado is null; end if;
  end if;
  return jsonb_build_object('id', (select j.codigo from public.jugador_id j where j.usuario = uid),
    'permitido', ok, 'lleno', lleno, 'otros', otros, 'equipos', usados, 'max', mx, 'lista', lista);
end $$;
revoke all on function public.mis_accesos_id(text, text) from public, anon;
grant execute on function public.mis_accesos_id(text, text) to authenticated;

-- «Usar aquí»: cierra el equipo usado hace más tiempo y abre este
create or replace function public.acceso_usar_aqui(p_dispositivo text, p_equipo text default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); mx integer;
begin
  if uid is null then raise exception 'Entra con tu cuenta'; end if;
  if coalesce(p_dispositivo, '') !~ '^d-[a-z0-9]{8,40}$' then raise exception 'Equipo inválido'; end if;
  if public.suspendido(uid) then raise exception 'Cuenta suspendida'; end if;
  mx := public.acceso_id_equipos_de(uid);
  if mx > 0 then
    delete from public.accesos_equipos e where e.usuario = uid and e.dispositivo <> p_dispositivo and e.dispositivo not in (
      select x.dispositivo from public.accesos_equipos x where x.usuario = uid and x.dispositivo <> p_dispositivo order by x.visto desc limit greatest(mx - 1, 0));
  end if;
  insert into public.accesos_equipos (usuario, dispositivo, equipo) values (uid, p_dispositivo, left(p_equipo, 60))
  on conflict (usuario, dispositivo) do update set visto = now(), equipo = coalesce(excluded.equipo, public.accesos_equipos.equipo);
  return public.mis_accesos_id(p_dispositivo, p_equipo);
end $$;
revoke all on function public.acceso_usar_aqui(text, text) from public, anon;
grant execute on function public.acceso_usar_aqui(text, text) to authenticated;
