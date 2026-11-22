-- =========================================================
-- Modo Cachimbo · Devolver la racha a un alumno (excepción)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 17-meta-racha.sql y 104-clanes-sala.sql.
--
--   · racha_devolver(ID, nota) busca el hueco más reciente que le
--     cortó la racha (hasta 21 días seguidos sin estudiar) y lo
--     rellena como cumplido. Si el alumno ya empezó una racha nueva
--     después, se juntan las dos.
--   · Le llega un sobre: «Racha recuperada · N días» con la nota.
--   · Si no encuentra una racha que devolver, no cambia nada y avisa.
--
--   Ejemplo (al final de este archivo):
--     select public.racha_devolver(33517, '¡Recuperaste tu racha! Excepción por esta vez.');
-- =========================================================

-- El sobre ahora acepta «racha»
alter table public.regalos drop constraint if exists regalos_tipo_check;
alter table public.regalos add constraint regalos_tipo_check
  check (tipo in ('corazones', 'infinito', 'xp', 'item', 'rayos', 'ticket', 'racha'));

-- ¿Ese día cuenta para la racha? (uso interno; los días pasados con su propia meta)
create or replace function public.racha_dia_ok(u uuid, d date)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.actividad a where a.usuario = u and a.fecha = d and a.preguntas >= coalesce(a.meta, 10));
$$;
revoke all on function public.racha_dia_ok(uuid, date) from public, anon, authenticated;

create or replace function public.racha_devolver(p_codigo integer, p_nota text default null, p_max_dias integer default 21)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  u       uuid;
  hoy     date := (now() at time zone 'America/Lima')::date;
  meta_u  integer;
  antes   integer;
  despues integer;
  d       date;
  ini     date;
  fin     date;
  x       date;
  vuelta  integer := 0;
  viejos  jsonb;
  nota    text := coalesce(nullif(left(trim(coalesce(p_nota, '')), 140), ''), '¡Recuperaste tu racha! Excepción por esta vez.');
begin
  -- Desde el SQL Editor (sin sesión) o un admin con permiso de regalos
  if auth.uid() is not null and not public.puede('regalos') then raise exception 'no autorizado'; end if;
  select j.usuario into u from public.jugador_id j where j.codigo = p_codigo;
  if u is null then raise exception 'No existe el ID %', p_codigo; end if;
  meta_u := coalesce((select m.meta from public.metas_racha m where m.usuario = u), 20);
  antes := (public.calc_racha(u) ->> 'actual')::integer;
  d := hoy - 1;
  loop
    vuelta := vuelta + 1;
    exit when vuelta > 6;
    -- La racha de ahora (si ya empezó otra)
    while d > hoy - 400 and public.racha_dia_ok(u, d) loop d := d - 1; end loop;
    fin := d;
    -- El hueco
    while d > hoy - 400 and not public.racha_dia_ok(u, d) and fin - d < p_max_dias loop d := d - 1; end loop;
    ini := d + 1;
    -- Antes del hueco tiene que haber una racha; si no, no hay nada que devolver
    exit when not public.racha_dia_ok(u, d);
    -- Rellenar el hueco (guardando cómo estaba, por si no sirve)
    select coalesce(jsonb_agg(jsonb_build_object('f', a.fecha, 'p', a.preguntas, 'm', a.meta)), '[]'::jsonb) into viejos
      from public.actividad a where a.usuario = u and a.fecha between ini and fin;
    x := ini;
    while x <= fin loop
      insert into public.actividad (usuario, fecha, preguntas, meta) values (u, x, meta_u, meta_u)
      on conflict (usuario, fecha) do update
        set preguntas = greatest(public.actividad.preguntas, coalesce(public.actividad.meta, excluded.meta)),
            meta = coalesce(public.actividad.meta, excluded.meta);
      x := x + 1;
    end loop;
    despues := (public.calc_racha(u) ->> 'actual')::integer;
    -- Sirve si junta una racha de antes (no solo suma los días rellenados)
    exit when despues > antes + (fin - ini + 1);
    -- Ese hueco no era el corte (era el día de descanso): se deja como estaba y se mira más atrás
    delete from public.actividad a where a.usuario = u and a.fecha between ini and fin
      and not exists (select 1 from jsonb_array_elements(viejos) v where (v ->> 'f')::date = a.fecha);
    update public.actividad a set preguntas = (v ->> 'p')::integer, meta = (v ->> 'm')::integer
      from jsonb_array_elements(viejos) v where a.usuario = u and a.fecha = (v ->> 'f')::date;
    despues := null;
  end loop;

  if despues is null then
    raise exception 'No encontré una racha para devolver al ID % (racha actual: % días). Nada cambió.', p_codigo, antes;
  end if;

  insert into public.regalos (usuario, tipo, cantidad, item, nota, de_email, de_nombre)
  values (u, 'racha', despues, null, nota, lower(coalesce(auth.jwt() ->> 'email', 'admin')), 'Modo Cachimbo');
  perform public.anotar('Regalos', 'Devolvió la racha al ID ' || p_codigo || ' (' || antes || ' → ' || despues || ' días)',
    jsonb_build_object('codigo', p_codigo, 'antes', antes, 'despues', despues, 'desde', ini, 'hasta', fin));
  return jsonb_build_object('id', p_codigo, 'antes', antes, 'despues', despues, 'dias_rellenados', fin - ini + 1, 'desde', ini, 'hasta', fin);
end $$;
revoke all on function public.racha_devolver(integer, text, integer) from public, anon;
grant execute on function public.racha_devolver(integer, text, integer) to authenticated;

-- ---------- Devolver la racha al ID 33517 ----------
select public.racha_devolver(33517, '¡Recuperaste tu racha! Excepción por esta vez.');
