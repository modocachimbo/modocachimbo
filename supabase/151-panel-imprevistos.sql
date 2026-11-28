-- 151 · Herramientas del panel para lo que puede pasar con las compras
--   1. Pausar las compras con Yape (viaje, Yape caído…): el alumno ve el aviso ANTES de yapear.
--   2. Pasar un acceso a otra cuenta (el alumno compró con otro Gmail): por su ID de jugador.
--   3. Compensar a todos: +N días a todos los accesos activos (la web se cayó, mantenimiento largo…).
--   4. yape_admin() devuelve el usuario (botón «Ficha» en cada compra) y la pausa.
-- Va después de 150.

-- ---------- 1. Pausa ----------
alter table public.yape_ajustes add column if not exists pausa text;

-- Lo lee la página antes de abrir la ventana de Yape (cualquiera, sin datos privados)
create or replace function public.yape_pausa()
returns text language sql stable security definer set search_path = '' as $$
  select nullif(trim(coalesce(a.pausa, '')), '') from public.yape_ajustes a where a.id = 1
$$;
revoke all on function public.yape_pausa() from public;
grant execute on function public.yape_pausa() to anon, authenticated;

-- p_texto vacío o null = compras abiertas
create or replace function public.yape_pausa_poner(p_texto text)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare t text := nullif(left(trim(coalesce(p_texto, '')), 200), '');
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  update public.yape_ajustes set pausa = t where id = 1;
  perform public.anotar('Recargas Yape', case when t is null then 'Abrió las compras con Yape' else 'Pausó las compras con Yape' end, jsonb_build_object('texto', t));
  return t;
end $$;
revoke all on function public.yape_pausa_poner(text) from public, anon;
grant execute on function public.yape_pausa_poner(text) to authenticated;

-- Por si alguien tenía la ventana abierta: el servidor tampoco recibe compras en pausa
create or replace function public.yape_pausa_guardia()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.yape_pausa() is not null and not coalesce(public.es_admin(), false) then raise exception 'yape_pausa'; end if;
  return new;
end $$;
drop trigger if exists yape_pausa_guardia on public.yape_recargas;
create trigger yape_pausa_guardia before insert on public.yape_recargas
  for each row execute function public.yape_pausa_guardia();

-- ---------- 2. Pasar un acceso a otra cuenta ----------
create or replace function public.acceso_id_mover(p_id bigint, p_jid integer)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare dest uuid; antes uuid; nom text;
begin
  if not public.acceso_id_puede() then raise exception 'no autorizado'; end if;
  select j.usuario into dest from public.jugador_id j where j.codigo = p_jid;
  if dest is null then raise exception 'No hay ningún alumno con el ID %', p_jid; end if;
  select a.usuario into antes from public.accesos_id a where a.id = p_id and a.quitado is null;
  if not found then raise exception 'Ese acceso ya no existe'; end if;
  if antes = dest then raise exception 'Ese acceso ya es de esa cuenta'; end if;
  update public.accesos_id set usuario = dest, visto = false where id = p_id;
  update public.yape_recargas set usuario = dest where acceso = p_id or prueba = p_id;
  select coalesce(nullif(trim(p.apodo), ''), p.nombre) into nom from public.perfiles p where p.id = dest;
  perform public.anotar('Alumnos', 'Pasó un acceso a otra cuenta (ID ' || p_jid || ')', jsonb_build_object('id', p_id, 'de', antes, 'a', dest));
  return jsonb_build_object('usuario', dest, 'apodo', nom);
end $$;
revoke all on function public.acceso_id_mover(bigint, integer) from public, anon;
grant execute on function public.acceso_id_mover(bigint, integer) to authenticated;

-- ---------- 3. Compensar a todos ----------
-- Suma p_dias a todos los accesos por ID activos que tienen fecha. p_solo_yape: solo los comprados con Yape
create or replace function public.accesos_compensar(p_dias integer, p_solo_yape boolean default false)
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare hoy text := to_char((now() at time zone 'America/Lima')::date, 'YYYY-MM-DD'); n integer;
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  if p_dias is null or p_dias < 1 or p_dias > 60 then raise exception 'Días: de 1 a 60'; end if;
  update public.accesos_id a set vence = to_char(a.vence::date + p_dias, 'YYYY-MM-DD')
   where a.quitado is null and a.vence ~ '^\d{4}-\d{2}-\d{2}$' and a.vence >= hoy
     and (not coalesce(p_solo_yape, false) or exists (select 1 from public.yape_recargas r where r.acceso = a.id and r.estado = 'aprobada'));
  get diagnostics n = row_count;
  perform public.anotar('Recargas Yape', 'Compensó ' || p_dias || ' días a ' || n || ' accesos', jsonb_build_object('dias', p_dias, 'solo_yape', p_solo_yape));
  return n;
end $$;
revoke all on function public.accesos_compensar(integer, boolean) from public, anon;
grant execute on function public.accesos_compensar(integer, boolean) to authenticated;

-- ---------- 4. Panel ----------
create or replace function public.yape_admin()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare aj public.yape_ajustes;
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  select * into aj from public.yape_ajustes where id = 1;
  return jsonb_build_object(
    'ajustes', jsonb_build_object('secreto', aj.secreto, 'auto', aj.auto, 'espera', aj.espera, 'tope', aj.tope, 'tope_dia', aj.tope_dia,
      'wsp_tel', aj.wsp_tel, 'wsp', coalesce(aj.wsp_key, '') <> '',
      'tg', coalesce(aj.tg_token, '') <> '' and coalesce(aj.tg_chat, '') <> '', 'pausa', nullif(trim(coalesce(aj.pausa, '')), ''),
      'ultimo', (select max(v.recibido) from public.yape_avisos v)),
    'cuenta', jsonb_build_object('revision', (select count(*) from public.yape_recargas r where r.estado = 'revision'),
      'esperando', (select count(*) from public.yape_recargas r where r.estado = 'esperando'),
      'solas', (select count(*) from public.yape_recargas r where r.como = 'confianza' and r.estado = 'aprobada' and r.creado > now() - interval '7 days')),
    'recargas', coalesce((select jsonb_agg(jsonb_build_object(
        'id', r.id, 'estado', r.estado, 'como', r.como, 'monto', r.monto, 'diamantes', r.diamantes, 'codigo', r.codigo,
        'captura', r.captura, 'nota', r.nota, 'motivo', r.motivo, 'creado', r.creado, 'resuelto', r.resuelto,
        'plan', r.plan, 'detalle', public.yape_que(r), 'prueba', r.prueba is not null,
        'vence', (select a.vence from public.accesos_id a where a.id = r.acceso), 'quitado', (select a.quitado from public.accesos_id a where a.id = r.acceso),
        'limite', r.limite, 'usuario', r.usuario,
        'apodo', (select coalesce(nullif(trim(p.apodo), ''), p.nombre) from public.perfiles p where p.id = r.usuario),
        'email', (select u.email from auth.users u where u.id = r.usuario),
        'jid', (select j.codigo from public.jugador_id j where j.usuario = r.usuario),
        'aviso', (select v.texto from public.yape_avisos v where v.id = r.aviso))
      order by (r.estado = 'revision') desc, r.creado desc)
      from (select * from public.yape_recargas x order by x.creado desc limit 80) r), '[]'::jsonb),
    'avisos', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'texto', v.texto, 'monto', v.monto, 'codigo', v.codigo, 'recibido', v.recibido, 'recarga', v.recarga) order by v.recibido desc)
      from (select * from public.yape_avisos x order by x.recibido desc limit 30) v), '[]'::jsonb));
end $$;
revoke all on function public.yape_admin() from public, anon;
grant execute on function public.yape_admin() to authenticated;
