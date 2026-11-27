-- =========================================================
-- Modo Cachimbo · 146 · Comprar PLANES de acceso con Yape (solo web)
-- (va después de 141, 142 y 143)
--
-- Igual que las recargas de diamantes, pero el alumno compra un plan
-- de la página Planes (precios.html): Un área o Total, por mes o ciclo.
--   · El precio lo pone el servidor (Panel → Web → Planes y precios).
--     El alumno no puede cambiarlo.
--   · Monto bajo (hasta el «tope» del panel → Recargas Yape) y todo normal:
--     el plan se activa solo por su ID.
--   · Monto alto: «En revisión» + ACCESO DE PRUEBA hasta mañana para que
--     pueda estudiar ya. Te llega a Telegram con APROBAR / RECHAZAR.
--     Aprobar = plan completo. Rechazar = se le quita la prueba.
--   · Sin prueba si algo se ve raro: código repetido, tiene una recarga
--     rechazada en 30 días o ya usó una prueba en los últimos 30 días.
--   · «No me llegó» en un plan aprobado solo: le quita el acceso.
--   · Mes = 30 días, ciclo = 90 días. Si ya tenía ese plan, se suma
--     desde el día en que le vence.
--
-- Cómo correrlo: Supabase → SQL Editor → New query → pega todo → Run.
-- No hace falta tocar la Edge Function.
-- =========================================================

alter table public.yape_recargas add column if not exists plan     text;     -- null = diamantes · 'area' | 'total'
alter table public.yape_recargas add column if not exists periodo  text;     -- 'mes' | 'ciclo'
alter table public.yape_recargas add column if not exists producto text;     -- lo que abre (accesos_id.producto)
alter table public.yape_recargas add column if not exists dias     integer;
alter table public.yape_recargas add column if not exists detalle  text;     -- «Plan Total · ciclo»
alter table public.yape_recargas add column if not exists prueba   bigint;   -- accesos_id de la prueba
alter table public.yape_recargas add column if not exists acceso   bigint;   -- accesos_id del plan

-- Soles para los mensajes: 19.90 → «19.90», 5 → «5»
create or replace function public.yape_sol(m numeric)
returns text language sql immutable set search_path = '' as $$
  select regexp_replace(to_char(m, 'FM999990.00'), '\.00$', '')
$$;

-- Qué se compró, en palabras (diamantes o plan)
create or replace function public.yape_que(r public.yape_recargas)
returns text language sql immutable set search_path = '' as $$
  select coalesce(r.detalle, r.diamantes || ' diamantes')
$$;

-- ---------- Precio y producto de un plan (lo manda el servidor) ----------
create or replace function public.yape_plan_precio(p_plan text, p_periodo text, p_area text)
returns table (monto numeric, producto text, dias integer, detalle text)
language plpgsql stable security definer set search_path = '' as $$
declare
  v jsonb := coalesce((select a.valor from public.ajustes a where a.clave = 'planes'), '{}'::jsonb);
  pl jsonb; x text; m numeric; pv jsonb := coalesce(v -> 'preventa', '{}'::jsonb);
  areas text[] := array['matematica', 'ciencia-tecnologia', 'comunicacion', 'ciencias-sociales'];
  nom text[] := array['Matemática', 'Ciencia y Tecnología', 'Comunicación', 'Ciencias Sociales'];
  k integer;
begin
  if p_plan not in ('area', 'total') or p_periodo not in ('mes', 'ciclo') then return; end if;
  select e into pl from jsonb_array_elements(case when jsonb_typeof(v -> 'planes') = 'array' then v -> 'planes' else '[]'::jsonb end) e
   where e ->> 'id' = p_plan limit 1;
  x := pl ->> p_periodo;
  if x ~ '^\d+(\.\d+)?$' then m := x::numeric;
  else m := case p_plan || ':' || p_periodo when 'area:mes' then 12.90 when 'area:ciclo' then 34.90 when 'total:mes' then 19.90 else 49.90 end;
  end if;
  -- Preventa: Total por ciclo
  if p_plan = 'total' and p_periodo = 'ciclo' and coalesce(pv ->> 'activa', 'true') = 'true' then
    x := pv ->> 'precio';
    m := case when x ~ '^\d+(\.\d+)?$' then x::numeric else 39.90 end;
  end if;
  if m is null or m <= 0 then return; end if;
  dias := case p_periodo when 'mes' then 30 else 90 end;
  if p_plan = 'total' then
    producto := 'TODO-VIP,descarga-VIP';
    detalle := 'Plan Total · ' || case p_periodo when 'mes' then 'mes' else 'ciclo' end;
  else
    k := array_position(areas, p_area);
    if k is null then return; end if;
    producto := 'area-' || p_area;
    detalle := 'Plan ' || nom[k] || ' · ' || case p_periodo when 'mes' then 'mes' else 'ciclo' end;
  end if;
  monto := round(m, 2);
  return next;
end $$;
revoke all on function public.yape_plan_precio(text, text, text) from public, anon;
grant execute on function public.yape_plan_precio(text, text, text) to authenticated;

-- ---------- Dar lo comprado (diamantes o plan), una sola vez ----------
create or replace function public.yape_acreditar(p_id bigint, p_como text, p_aviso bigint)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare r public.yape_recargas; hoy date := (now() at time zone 'America/Lima')::date; base date; acc bigint; v_vence text;
begin
  select * into r from public.yape_recargas x where x.id = p_id for update;
  if r.id is null or r.estado in ('aprobada') then return false; end if;
  if r.plan is null then
    perform public.diamantes_dar(r.usuario, r.diamantes, 'Recarga Yape S/ ' || public.yape_sol(r.monto));
  else
    -- Si ya tenía ese plan, se suma desde que le vence
    select greatest(hoy, coalesce(max(a.vence)::date, hoy)) into base from public.accesos_id a
     where a.usuario = r.usuario and a.producto = r.producto and a.quitado is null and a.vence is not null
       and a.id is distinct from r.prueba and a.vence >= to_char(hoy, 'YYYY-MM-DD');
    v_vence := to_char(coalesce(base, hoy) + r.dias, 'YYYY-MM-DD');
    if r.prueba is not null then
      update public.accesos_id set vence = v_vence, nota = left('Yape S/ ' || public.yape_sol(r.monto) || ' · ' || r.detalle, 120), visto = false
       where id = r.prueba and quitado is null returning id into acc;
    end if;
    if acc is null then
      insert into public.accesos_id (usuario, producto, vence, nota)
      values (r.usuario, r.producto, v_vence, left('Yape S/ ' || public.yape_sol(r.monto) || ' · ' || r.detalle, 120))
      returning id into acc;
    end if;
  end if;
  update public.yape_recargas set estado = 'aprobada', como = p_como, aviso = coalesce(p_aviso, aviso), resuelto = now(), acceso = coalesce(acc, acceso) where id = p_id;
  if p_aviso is not null then update public.yape_avisos set recarga = p_id where id = p_aviso; end if;
  return true;
end $$;
revoke all on function public.yape_acreditar(bigint, text, bigint) from public, anon, authenticated;

-- Rechazada (por el panel, Telegram o «No me llegó») → se quita la prueba y el plan
create or replace function public.yape_plan_rechazo()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.plan is not null and new.estado = 'rechazada' and old.estado is distinct from 'rechazada' then
    update public.accesos_id set quitado = now() where id in (new.prueba, new.acceso) and quitado is null;
  end if;
  return new;
end $$;
drop trigger if exists yape_plan_rechazo on public.yape_recargas;
create trigger yape_plan_rechazo after update of estado on public.yape_recargas
  for each row execute function public.yape_plan_rechazo();

-- «No me llegó» en algo aprobado solo
create or replace function public.yape_quitar(p_id bigint, p_nota text)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare r public.yape_recargas;
begin
  select * into r from public.yape_recargas x where x.id = p_id for update;
  if r.id is null or r.estado <> 'aprobada' then return false; end if;
  if r.plan is null then
    insert into public.diamantes_mov (usuario, cantidad, motivo) values (r.usuario, -r.diamantes, 'Yape no llegó (S/ ' || public.yape_sol(r.monto) || ')');
  end if;
  update public.yape_recargas set estado = 'rechazada', como = 'admin', resuelto = now(),
    nota = coalesce(p_nota, case when r.plan is null then 'No llegó el pago. Se quitaron los diamantes.' else 'No llegó el pago. Se quitó el acceso.' end) where id = p_id;
  return true;
end $$;
revoke all on function public.yape_quitar(bigint, text) from public, anon, authenticated;

-- ---------- Aviso a Javier (Telegram / WhatsApp + notificación) ----------
create or replace function public.yape_notificar(p_id bigint)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare r public.yape_recargas; quien text; jid integer; url text; t text; pr text := '';
begin
  update public.yape_recargas set avisado = true where id = p_id and not avisado returning * into r;
  if r.id is null then return; end if;
  select coalesce(nullif(trim(p.apodo), ''), nullif(trim(p.nombre), ''), 'Un alumno') into quien from public.perfiles p where p.id = r.usuario;
  select j.codigo into jid from public.jugador_id j where j.usuario = r.usuario;
  url := 'https://modocachimbo.github.io/modocachimbo/yape.html?t=' || r.token;
  if r.plan is not null and r.prueba is not null then pr := E'Ya tiene ACCESO DE PRUEBA hasta mañana.\n'; end if;
  if r.estado = 'revision' then
    begin
      perform net.http_post(
        url := 'https://tvcrhogybfxphpzpjnis.supabase.co/functions/v1/enviar-push',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := jsonb_build_object('accion', 'yape', 'id', p_id, 'secreto', (select secreto from public.push_ajustes where id = 1)));
    exception when others then null;
    end;
    t := case when r.plan is null then 'Yape EN REVISION: S/ ' else 'Compra de PLAN en revision: S/ ' end || public.yape_sol(r.monto) || E'\n' ||
         coalesce(quien, 'Un alumno') || coalesce(' (ID ' || jid || ')', '') || ' pide ' || public.yape_que(r) || '. Codigo de seguridad: ' || r.codigo || E'\n' ||
         coalesce('Motivo: ' || r.motivo || E'\n', '') || pr ||
         E'\nRevisa tu Yape y toca:\nAPROBAR: ' || url || '&a=si' || E'\nRECHAZAR: ' || url || '&a=no';
  else
    t := case when r.plan is null then 'Yape aprobado solo: S/ ' else 'Plan activado solo: S/ ' end || public.yape_sol(r.monto) || E'\n' ||
         coalesce(quien, 'Un alumno') || coalesce(' (ID ' || jid || ')', '') || ' recibio ' || public.yape_que(r) || '. Codigo de seguridad: ' || r.codigo || E'\n' ||
         E'\nSi NO te llego ese Yape, toca:\nNO ME LLEGO: ' || url || '&a=quitar';
  end if;
  perform public.yape_wsp(t);
end $$;
revoke all on function public.yape_notificar(bigint) from public, anon, authenticated;

create or replace function public.push_yape(p_secreto text, p_id bigint)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare r public.yape_recargas; quien text; adm uuid[];
begin
  if p_secreto is distinct from (select secreto from public.push_ajustes where id = 1) then raise exception 'no autorizado'; end if;
  select * into r from public.yape_recargas x where x.id = p_id;
  if r.id is null or r.estado <> 'revision' then return jsonb_build_object('mensajes', '[]'::jsonb, 'subs', '{}'::jsonb); end if;
  select coalesce(nullif(trim(p.apodo), ''), nullif(trim(p.nombre), ''), 'Un alumno') into quien from public.perfiles p where p.id = r.usuario;
  select array_agg(u.id) into adm from auth.users u join public.admins a on lower(a.email) = lower(u.email);
  return jsonb_build_object(
    'mensajes', coalesce((select jsonb_agg(jsonb_build_object('usuario', x,
      'titulo', 'Yape en revisión: S/ ' || public.yape_sol(r.monto),
      'cuerpo', coalesce(quien, 'Un alumno') || ' pide ' || public.yape_que(r) || ' (código ' || r.codigo || '). Revisa tu Yape y aprueba o rechaza.',
      'link', 'panel/index.html#yape')) from unnest(adm) x), '[]'::jsonb),
    'subs', coalesce((select jsonb_object_agg(x::text, coalesce((select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
      from public.push_subs s where s.usuario = x), '[]'::jsonb)) from unnest(adm) x), '{}'::jsonb));
end $$;
revoke all on function public.push_yape(text, bigint) from public;
grant execute on function public.push_yape(text, bigint) to anon, authenticated;

-- ---------- Alumno: comprar un plan ----------
create or replace function public.yape_pedir_plan(p_plan text, p_periodo text, p_area text, p_codigo text, p_captura text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  aj public.yape_ajustes; pp record; nuevo bigint; mot text; prueba boolean := false; pid bigint;
  cod text := regexp_replace(coalesce(p_codigo, ''), '\D', '', 'g');
  hoy numeric; manana text := to_char((now() at time zone 'America/Lima')::date + 1, 'YYYY-MM-DD');
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into aj from public.yape_ajustes where id = 1;
  select * into pp from public.yape_plan_precio(p_plan, p_periodo, p_area);
  if pp.monto is null then raise exception 'yape_plan'; end if;
  if cod !~ '^\d{3}$' then raise exception 'yape_codigo'; end if;
  if coalesce(p_captura, '') !~ ('^' || uid::text || '/') then raise exception 'yape_captura'; end if;
  if (select count(*) from public.yape_recargas r where r.usuario = uid and r.estado in ('esperando', 'revision')) >= 3 then raise exception 'yape_muchas'; end if;
  if (select count(*) from public.yape_recargas r where r.usuario = uid and r.creado > now() - interval '1 day') >= 10 then raise exception 'yape_dia'; end if;
  insert into public.yape_recargas (usuario, paquete, monto, diamantes, codigo, captura, plan, periodo, producto, dias, detalle)
  values (uid, -1, pp.monto, 0, cod, left(p_captura, 200), p_plan, p_periodo, pp.producto, pp.dias, pp.detalle) returning id into nuevo;

  -- 1) ¿Ya llegó el aviso de Yape (MacroDroid)? → activado y verificado
  if public.yape_cruzar(nuevo) then perform public.yape_notificar(nuevo); return public.yape_ver(nuevo); end if;

  -- 2) ¿Se ve raro?
  hoy := (select coalesce(sum(r.monto), 0) from public.yape_recargas r
          where r.usuario = uid and r.id <> nuevo and r.estado = 'aprobada' and r.creado > now() - interval '1 day');
  if exists (select 1 from public.yape_recargas r where r.id <> nuevo and r.codigo = cod and r.monto = pp.monto and r.creado > now() - interval '3 days') then mot := 'Ese código ya se usó con el mismo monto';
  elsif exists (select 1 from public.yape_recargas r where r.usuario = uid and r.estado = 'rechazada' and r.creado > now() - interval '30 days') then mot := 'Tiene una recarga rechazada';
  elsif not aj.auto then mot := 'Aprobación automática apagada'; prueba := true;
  elsif pp.monto > aj.tope then mot := 'Monto alto (más de S/ ' || public.yape_sol(aj.tope) || ')'; prueba := true;
  elsif hoy + pp.monto > aj.tope_dia then mot := 'Pasó su límite del día (S/ ' || public.yape_sol(aj.tope_dia) || ')'; prueba := true;
  end if;

  if mot is null then
    perform public.yape_acreditar(nuevo, 'confianza', null);
  else
    -- Prueba hasta mañana, una vez cada 30 días
    if prueba and exists (select 1 from public.yape_recargas r where r.usuario = uid and r.id <> nuevo and r.prueba is not null and r.creado > now() - interval '30 days') then
      prueba := false; mot := mot || ' · ya usó una prueba este mes';
    end if;
    if prueba then
      insert into public.accesos_id (usuario, producto, vence, nota)
      values (uid, pp.producto, manana, left('Prueba Yape (en revisión) · ' || pp.detalle, 120)) returning id into pid;
    end if;
    update public.yape_recargas set estado = 'revision', motivo = mot, prueba = pid where id = nuevo;
  end if;
  perform public.yape_notificar(nuevo);
  return public.yape_ver(nuevo);
end $$;
revoke all on function public.yape_pedir_plan(text, text, text, text, text) from public, anon;
grant execute on function public.yape_pedir_plan(text, text, text, text, text) to authenticated;

-- Precio que verá el alumno antes de pagar (el mismo que cobra el servidor)
create or replace function public.yape_plan_ver(p_plan text, p_periodo text, p_area text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('monto', x.monto, 'detalle', x.detalle, 'dias', x.dias, 'id', (select j.codigo from public.jugador_id j where j.usuario = auth.uid()))
  from public.yape_plan_precio(p_plan, p_periodo, p_area) x
$$;
revoke all on function public.yape_plan_ver(text, text, text) from public, anon;
grant execute on function public.yape_plan_ver(text, text, text) to authenticated;

-- ---------- Estado (ahora dice si es plan y si tiene prueba) ----------
create or replace function public.yape_ver(p_id bigint)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare r public.yape_recargas; uid uuid := auth.uid(); esp integer := (select espera from public.yape_ajustes where id = 1);
begin
  select * into r from public.yape_recargas x where x.id = p_id and x.usuario = uid;
  if r.id is null then return null; end if;
  if r.estado in ('esperando', 'revision') then
    perform public.yape_cruzar(r.id);
    select * into r from public.yape_recargas x where x.id = p_id;
    if r.estado = 'esperando' and r.creado < now() - make_interval(mins => esp) then
      update public.yape_recargas set estado = 'revision' where id = r.id;
      perform public.yape_notificar(r.id);
      r.estado := 'revision';
    end if;
  end if;
  return jsonb_build_object('id', r.id, 'estado', r.estado, 'monto', r.monto, 'diamantes', r.diamantes, 'nota', r.nota, 'creado', r.creado,
    'plan', r.plan, 'detalle', public.yape_que(r),
    'prueba', r.prueba is not null and r.estado = 'revision' and exists (select 1 from public.accesos_id a where a.id = r.prueba and a.quitado is null),
    'vence', (select a.vence from public.accesos_id a where a.id = coalesce(r.acceso, r.prueba) and a.quitado is null),
    'saldo', (select coalesce(sum(m.cantidad), 0)::integer from public.diamantes_mov m where m.usuario = uid));
end $$;
revoke all on function public.yape_ver(bigint) from public, anon;
grant execute on function public.yape_ver(bigint) to authenticated;

create or replace function public.yape_mias()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'estado', r.estado, 'monto', r.monto, 'diamantes', r.diamantes, 'nota', r.nota, 'creado', r.creado,
    'plan', r.plan, 'detalle', public.yape_que(r)) order by r.creado desc), '[]'::jsonb)
  from (select * from public.yape_recargas x where x.usuario = auth.uid() and x.creado > now() - interval '7 days' order by x.creado desc limit 5) r;
$$;
revoke all on function public.yape_mias() from public, anon;
grant execute on function public.yape_mias() to authenticated;

-- ---------- Página yape.html (enlace de Telegram) ----------
create or replace function public.yape_por_token(p_token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r public.yape_recargas;
begin
  select * into r from public.yape_recargas x where x.token = p_token and length(p_token) >= 40;
  if r.id is null then return null; end if;
  return jsonb_build_object('id', r.id, 'estado', r.estado, 'como', r.como, 'monto', r.monto, 'diamantes', r.diamantes, 'codigo', r.codigo,
    'motivo', r.motivo, 'nota', r.nota, 'creado', r.creado, 'plan', r.plan, 'detalle', public.yape_que(r), 'prueba', r.prueba is not null,
    'apodo', (select coalesce(nullif(trim(p.apodo), ''), p.nombre) from public.perfiles p where p.id = r.usuario),
    'jid', (select j.codigo from public.jugador_id j where j.usuario = r.usuario));
end $$;
revoke all on function public.yape_por_token(text) from public;
grant execute on function public.yape_por_token(text) to anon, authenticated;

-- ---------- Panel → Recargas Yape (ahora con planes) ----------
create or replace function public.yape_admin()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare aj public.yape_ajustes;
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  select * into aj from public.yape_ajustes where id = 1;
  return jsonb_build_object(
    'ajustes', jsonb_build_object('secreto', aj.secreto, 'auto', aj.auto, 'espera', aj.espera, 'tope', aj.tope, 'tope_dia', aj.tope_dia,
      'wsp_tel', aj.wsp_tel, 'wsp', coalesce(aj.wsp_key, '') <> '',
      'tg', coalesce(aj.tg_token, '') <> '' and coalesce(aj.tg_chat, '') <> '',
      'ultimo', (select max(v.recibido) from public.yape_avisos v)),
    'cuenta', jsonb_build_object('revision', (select count(*) from public.yape_recargas r where r.estado = 'revision'),
      'esperando', (select count(*) from public.yape_recargas r where r.estado = 'esperando'),
      'solas', (select count(*) from public.yape_recargas r where r.como = 'confianza' and r.estado = 'aprobada' and r.creado > now() - interval '7 days')),
    'recargas', coalesce((select jsonb_agg(jsonb_build_object(
        'id', r.id, 'estado', r.estado, 'como', r.como, 'monto', r.monto, 'diamantes', r.diamantes, 'codigo', r.codigo,
        'captura', r.captura, 'nota', r.nota, 'motivo', r.motivo, 'creado', r.creado, 'resuelto', r.resuelto,
        'plan', r.plan, 'detalle', public.yape_que(r), 'prueba', r.prueba is not null,
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
