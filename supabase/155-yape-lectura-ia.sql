-- =========================================================
-- Modo Cachimbo · Yape: la IA lee la captura antes de aprobar
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 141 a 151 (Yape) ya corridos.
--
--   · Con «Revisar captura con IA» prendido (Panel → Recargas Yape), lo que
--     antes se aprobaba solo ahora espera a que la Edge Function «leer-yape»
--     lea la captura con Gemini: monto, código de seguridad, fecha, a quién
--     se yapeó y N.º de operación.
--   · yape_lectura compara: si todo coincide → se aprueba sola (como 'ia').
--     Si algo no coincide, o esa captura (N.º de operación) ya se usó →
--     pasa a revisión con el motivo y te llega el aviso por Telegram.
--   · Si la IA no responde en 3 minutos → revisión («No se pudo leer»).
--   · El código 339 (el ejemplo de la ventana) ya no se acepta.
--   · Apagado, todo funciona como antes.
-- =========================================================

alter table public.yape_ajustes add column if not exists ia boolean not null default false;
alter table public.yape_ajustes add column if not exists destino text not null default '708';         -- últimos 3 dígitos de tu Yape
alter table public.yape_ajustes add column if not exists destino_nombre text not null default 'Javier'; -- cómo empieza tu nombre en Yape
alter table public.yape_recargas add column if not exists lectura jsonb;      -- lo que leyó la IA
alter table public.yape_recargas add column if not exists operacion text;     -- N.º de operación de la captura
alter table public.yape_recargas add column if not exists ia_pend boolean not null default false;
create index if not exists yape_recargas_op on public.yape_recargas (operacion) where operacion is not null;

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
  if cod = '339' then raise exception 'yape_ejemplo'; end if;   -- el número de ejemplo de la ventana
  if coalesce(p_captura, '') !~ ('^' || uid::text || '/') then raise exception 'yape_captura'; end if;
  if (select count(*) from public.yape_recargas r where r.usuario = uid and r.estado in ('esperando', 'revision')) >= 3 then raise exception 'yape_muchas'; end if;
  if (select count(*) from public.yape_recargas r where r.usuario = uid and r.creado > now() - interval '1 day') >= 10 then raise exception 'yape_dia'; end if;
  insert into public.yape_recargas (usuario, paquete, monto, diamantes, codigo, captura, plan, periodo, producto, dias, detalle, limite)
  values (uid, -1, pp.monto, 0, cod, left(p_captura, 200), p_plan, p_periodo, pp.producto, pp.dias, pp.detalle,
          case when p_plan = 'descarga' then substring(p_periodo from 2)::integer end) returning id into nuevo;

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

  if mot is null and aj.ia then
    -- 3) Todo normal y lectura con IA prendida: espera a que la IA lea la captura (Edge Function leer-yape)
    update public.yape_recargas set ia_pend = true where id = nuevo;
    return public.yape_ver(nuevo);
  elsif mot is null then
    perform public.yape_acreditar(nuevo, 'confianza', null);
  else
    -- Prueba hasta mañana, una vez cada 30 días
    if prueba and exists (select 1 from public.yape_recargas r where r.usuario = uid and r.id <> nuevo and r.prueba is not null and r.creado > now() - interval '30 days') then
      prueba := false; mot := mot || ' · ya usó una prueba este mes';
    end if;
    if prueba then
      insert into public.accesos_id (usuario, producto, vence, nota, limite_dia)
      values (uid, pp.producto, manana, left('Prueba Yape (en revisión) · ' || pp.detalle, 120),
              case when p_plan = 'descarga' then substring(p_periodo from 2)::integer end) returning id into pid;
    end if;
    update public.yape_recargas set estado = 'revision', motivo = mot, prueba = pid where id = nuevo;
  end if;
  perform public.yape_notificar(nuevo);
  return public.yape_ver(nuevo);
end $$;
revoke all on function public.yape_pedir_plan(text, text, text, text, text) from public, anon;
grant execute on function public.yape_pedir_plan(text, text, text, text, text) to authenticated;

create or replace function public.yape_pedir(p_paquete integer, p_codigo text, p_captura text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  aj public.yape_ajustes;
  m numeric; d integer; nuevo bigint; mot text;
  cod text := regexp_replace(coalesce(p_codigo, ''), '\D', '', 'g');
  hoy numeric;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into aj from public.yape_ajustes where id = 1;
  select x.monto, x.diamantes into m, d from public.yape_paquete(p_paquete) x;
  if m is null then raise exception 'yape_paquete'; end if;
  if cod !~ '^\d{3}$' then raise exception 'yape_codigo'; end if;
  if cod = '339' then raise exception 'yape_ejemplo'; end if;   -- el número de ejemplo de la ventana
  if coalesce(p_captura, '') !~ ('^' || uid::text || '/') then raise exception 'yape_captura'; end if;
  if (select count(*) from public.yape_recargas r where r.usuario = uid and r.estado in ('esperando', 'revision')) >= 3 then raise exception 'yape_muchas'; end if;
  if (select count(*) from public.yape_recargas r where r.usuario = uid and r.creado > now() - interval '1 day') >= 10 then raise exception 'yape_dia'; end if;
  insert into public.yape_recargas (usuario, paquete, monto, diamantes, codigo, captura)
  values (uid, p_paquete, m, d, cod, left(p_captura, 200)) returning id into nuevo;

  -- 1) ¿Ya llegó el aviso de Yape (MacroDroid)? → aprobado y verificado
  if public.yape_cruzar(nuevo) then return public.yape_ver(nuevo); end if;

  -- 2) ¿Se ve raro?
  hoy := (select coalesce(sum(r.monto), 0) from public.yape_recargas r
          where r.usuario = uid and r.id <> nuevo and r.estado = 'aprobada' and r.creado > now() - interval '1 day');
  if not aj.auto then mot := 'Aprobación automática apagada';
  elsif m > aj.tope then mot := 'Monto alto (más de S/ ' || trim(to_char(aj.tope, 'FM999990.##')) || ')';
  elsif exists (select 1 from public.yape_recargas r where r.id <> nuevo and r.codigo = cod and r.monto = m and r.creado > now() - interval '3 days') then mot := 'Ese código ya se usó con el mismo monto';
  elsif hoy + m > aj.tope_dia then mot := 'Pasó su límite del día (S/ ' || trim(to_char(aj.tope_dia, 'FM999990.##')) || ')';
  elsif exists (select 1 from public.yape_recargas r where r.usuario = uid and r.estado = 'rechazada' and r.creado > now() - interval '30 days') then mot := 'Tiene una recarga rechazada';
  end if;

  if mot is null and aj.ia then
    -- 3) Todo normal y lectura con IA prendida: espera a que la IA lea la captura (Edge Function leer-yape)
    update public.yape_recargas set ia_pend = true where id = nuevo;
    return public.yape_ver(nuevo);
  elsif mot is null then
    -- 3) Monto bajo y todo normal → aprobado al instante (te llega WhatsApp con «No me llegó»)
    perform public.yape_acreditar(nuevo, 'confianza', null);
  else
    update public.yape_recargas set estado = 'revision', motivo = mot where id = nuevo;
  end if;
  perform public.yape_notificar(nuevo);
  return public.yape_ver(nuevo);
end $$;
revoke all on function public.yape_pedir(integer, text, text) from public, anon;
grant execute on function public.yape_pedir(integer, text, text) to authenticated;

create or replace function public.yape_ver(p_id bigint)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare r public.yape_recargas; uid uuid := auth.uid(); esp integer := (select espera from public.yape_ajustes where id = 1);
begin
  select * into r from public.yape_recargas x where x.id = p_id and x.usuario = uid;
  if r.id is null then return null; end if;
  if r.estado in ('esperando', 'revision') then
    perform public.yape_cruzar(r.id);
    select * into r from public.yape_recargas x where x.id = p_id;
    if r.estado = 'esperando' and r.creado < now() - make_interval(mins => case when r.ia_pend then 3 else esp end) then
      update public.yape_recargas set estado = 'revision', ia_pend = false,
        motivo = case when r.ia_pend then 'No se pudo leer la captura' else motivo end where id = r.id;
      perform public.yape_notificar(r.id);
      r.estado := 'revision';
    end if;
  end if;
  return jsonb_build_object('id', r.id, 'estado', r.estado, 'monto', r.monto, 'diamantes', r.diamantes, 'nota', r.nota, 'creado', r.creado,
    'plan', r.plan, 'detalle', public.yape_que(r), 'leer', r.ia_pend and r.estado = 'esperando',
    'prueba', r.prueba is not null and r.estado = 'revision' and exists (select 1 from public.accesos_id a where a.id = r.prueba and a.quitado is null),
    'vence', (select a.vence from public.accesos_id a where a.id = coalesce(r.acceso, r.prueba) and a.quitado is null),
    'saldo', (select coalesce(sum(m.cantidad), 0)::integer from public.diamantes_mov m where m.usuario = uid));
end $$;
revoke all on function public.yape_ver(bigint) from public, anon;
grant execute on function public.yape_ver(bigint) to authenticated;

create or replace function public.yape_notificar(p_id bigint)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare r public.yape_recargas; quien text; jid integer; url text; t text; pr text := '';
begin
  update public.yape_recargas set avisado = true where id = p_id and not avisado returning * into r;
  if r.id is null then return; end if;
  if r.ia_pend and r.estado = 'esperando' then update public.yape_recargas set avisado = false where id = p_id; return; end if;  -- aún la lee la IA
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
         case when r.como = 'ia' then E'La IA leyo la captura y coincide (monto, codigo, destino y fecha).\n' else '' end ||
         E'\nSi NO te llego ese Yape, toca:\nNO ME LLEGO: ' || url || '&a=quitar';
  end if;
  perform public.yape_wsp(t);
end $$;
revoke all on function public.yape_notificar(bigint) from public, anon, authenticated;

create or replace function public.yape_reloj()
returns void language plpgsql volatile security definer set search_path = '' as $$
declare x record; esp integer := (select espera from public.yape_ajustes where id = 1);
begin
  for x in select r.id, r.ia_pend from public.yape_recargas r where r.estado = 'esperando' and r.creado < now() - make_interval(mins => case when r.ia_pend then 3 else esp end) loop
    if not public.yape_cruzar(x.id) then
      update public.yape_recargas set estado = 'revision', ia_pend = false,
        motivo = case when x.ia_pend then 'No se pudo leer la captura' else motivo end where id = x.id and estado = 'esperando';
      perform public.yape_notificar(x.id);
    end if;
  end loop;
end $$;
revoke all on function public.yape_reloj() from public, anon, authenticated;

create or replace function public.yape_admin()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare aj public.yape_ajustes;
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  select * into aj from public.yape_ajustes where id = 1;
  return jsonb_build_object(
    'ajustes', jsonb_build_object('secreto', aj.secreto, 'auto', aj.auto, 'espera', aj.espera, 'tope', aj.tope, 'tope_dia', aj.tope_dia,
      'wsp_tel', aj.wsp_tel, 'wsp', coalesce(aj.wsp_key, '') <> '',
      'tg', coalesce(aj.tg_token, '') <> '' and coalesce(aj.tg_chat, '') <> '', 'pausa', nullif(trim(coalesce(aj.pausa, '')), ''), 'ia', aj.ia,
      'ia_hoy', (select count(*) from public.yape_recargas r where r.lectura is not null and r.creado > now() - interval '1 day'),
      'ultimo', (select max(v.recibido) from public.yape_avisos v)),
    'cuenta', jsonb_build_object('revision', (select count(*) from public.yape_recargas r where r.estado = 'revision'),
      'esperando', (select count(*) from public.yape_recargas r where r.estado = 'esperando'),
      'solas', (select count(*) from public.yape_recargas r where r.como in ('confianza', 'ia') and r.estado = 'aprobada' and r.creado > now() - interval '7 days')),
    'recargas', coalesce((select jsonb_agg(jsonb_build_object(
        'id', r.id, 'estado', r.estado, 'como', r.como, 'monto', r.monto, 'diamantes', r.diamantes, 'codigo', r.codigo,
        'captura', r.captura, 'nota', r.nota, 'motivo', r.motivo, 'creado', r.creado, 'resuelto', r.resuelto,
        'plan', r.plan, 'detalle', public.yape_que(r), 'prueba', r.prueba is not null,
        'vence', (select a.vence from public.accesos_id a where a.id = r.acceso), 'quitado', (select a.quitado from public.accesos_id a where a.id = r.acceso),
        'limite', r.limite, 'usuario', r.usuario, 'lectura', r.lectura, 'ia_pend', r.ia_pend,
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

create or replace function public.yape_config(p jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  update public.yape_ajustes set
    auto = coalesce((p ->> 'auto')::boolean, auto),
    ia = coalesce((p ->> 'ia')::boolean, ia),
    espera = greatest(2, least(120, coalesce((p ->> 'espera')::integer, espera))),
    tope = greatest(0, least(100, coalesce((p ->> 'tope')::numeric, tope))),
    tope_dia = greatest(0, least(500, coalesce((p ->> 'tope_dia')::numeric, tope_dia))),
    wsp_tel = coalesce(nullif(regexp_replace(p ->> 'wsp_tel', '[^0-9+]', '', 'g'), ''), wsp_tel),
    wsp_key = case when p ? 'wsp_key' then nullif(trim(p ->> 'wsp_key'), '') else wsp_key end,
    tg_token = case when p ? 'tg_token' then nullif(trim(p ->> 'tg_token'), '') else tg_token end,
    tg_chat = case when p ? 'tg_chat' then nullif(trim(p ->> 'tg_chat'), '') else tg_chat end,
    secreto = case when (p ->> 'nueva_clave')::boolean then replace(gen_random_uuid()::text, '-', '') else secreto end
  where id = 1;
  if (p ->> 'probar')::boolean then perform public.yape_wsp('Modo Cachimbo: prueba de avisos de Yape. Si lees esto, ya te llegan los avisos.'); end if;
  return public.yape_admin();
end $$;
revoke all on function public.yape_config(jsonb) from public, anon;
grant execute on function public.yape_config(jsonb) to authenticated;

-- ---------- Resultado de la IA (solo la Edge Function leer-yape, con la clave de servicio) ----------
-- p_datos = { es_yape, monto, codigo, fecha 'YYYY-MM-DD', hora, destino_digitos, destinatario, operacion, error? }
create or replace function public.yape_lectura(p_id bigint, p_usuario uuid, p_datos jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  r public.yape_recargas; aj public.yape_ajustes; malo text[] := '{}';
  m numeric; c text; f date; dd text; dn text; op text; otro bigint; dia date;
begin
  select * into r from public.yape_recargas x where x.id = p_id for update;
  -- p_usuario null = un administrador la vuelve a leer desde el panel (solo anota, no decide si ya estaba decidida)
  if r.id is null or (p_usuario is not null and r.usuario is distinct from p_usuario) then raise exception 'yape_no_es_tuya'; end if;
  select * into aj from public.yape_ajustes where id = 1;
  p_datos := coalesce(p_datos, '{}'::jsonb);
  op := nullif(regexp_replace(coalesce(p_datos ->> 'operacion', ''), '\D', '', 'g'), '');
  update public.yape_recargas set lectura = p_datos || jsonb_build_object('leido', now()), operacion = coalesce(op, operacion) where id = r.id;

  if p_datos ? 'error' then
    malo := malo || ('No se pudo leer la captura (' || left(p_datos ->> 'error', 60) || ')');
  else
    begin m := replace(nullif(p_datos ->> 'monto', ''), ',', '.')::numeric; exception when others then m := null; end;
    c := nullif(regexp_replace(coalesce(p_datos ->> 'codigo', ''), '\D', '', 'g'), '');
    begin f := (p_datos ->> 'fecha')::date; exception when others then f := null; end;
    dd := nullif(regexp_replace(coalesce(p_datos ->> 'destino_digitos', ''), '\D', '', 'g'), '');
    dn := nullif(trim(coalesce(p_datos ->> 'destinatario', '')), '');
    dia := (r.creado at time zone 'America/Lima')::date;
    if coalesce((p_datos ->> 'es_yape')::boolean, true) = false then malo := malo || 'No parece una captura de Yape'::text; end if;
    if m is null then malo := malo || 'No se leyó el monto'::text;
    elsif abs(m - r.monto) > 0.001 then malo := malo || ('La captura dice S/ ' || public.yape_sol(m) || ', pidió S/ ' || public.yape_sol(r.monto)); end if;
    if c is null then malo := malo || 'No se leyó el código de seguridad'::text;
    elsif c <> r.codigo then malo := malo || ('Código en la captura: ' || c || ' (escribió ' || r.codigo || ')'); end if;
    if dd is not null and right(dd, 3) <> aj.destino then malo := malo || ('Yapeó a otro número (***' || right(dd, 3) || ')');
    elsif dd is null and dn is not null and dn not ilike (aj.destino_nombre || '%') then malo := malo || ('Yapeó a otra persona (' || left(dn, 30) || ')'); end if;
    if f is not null and (f > dia + 1 or f < dia - 2) then malo := malo || ('Captura de otra fecha (' || to_char(f, 'DD/MM/YYYY') || ')'); end if;
    if op is not null then
      select x.id into otro from public.yape_recargas x where x.id <> r.id and x.operacion = op and x.estado <> 'rechazada' limit 1;
      if otro is not null then malo := malo || ('Esa captura ya se usó en la compra #' || otro); end if;
    end if;
  end if;

  if r.ia_pend and r.estado = 'esperando' then
    update public.yape_recargas set ia_pend = false where id = r.id;
    if cardinality(malo) = 0 then
      perform public.yape_acreditar(r.id, 'ia', null);
    else
      update public.yape_recargas set estado = 'revision', motivo = 'IA: ' || array_to_string(malo, ' · ') where id = r.id;
    end if;
    perform public.yape_notificar(r.id);
  elsif cardinality(malo) > 0 and r.estado in ('esperando', 'revision') then
    update public.yape_recargas set motivo = left(coalesce(nullif(regexp_replace(coalesce(motivo, ''), '( · )?IA: .*$', ''), '') || ' · ', '') || 'IA: ' || array_to_string(malo, ' · '), 300) where id = r.id;
  end if;
  return jsonb_build_object('ok', true, 'problemas', to_jsonb(malo));
end $$;
revoke all on function public.yape_lectura(bigint, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.yape_lectura(bigint, uuid, jsonb) to service_role;

-- La Edge Function pregunta qué leer (ruta de la captura) antes de llamar a Gemini
create or replace function public.yape_para_leer(p_id bigint, p_usuario uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', r.id, 'usuario', r.usuario, 'captura', r.captura, 'estado', r.estado, 'ia_pend', r.ia_pend, 'leida', r.lectura is not null)
  from public.yape_recargas r where r.id = p_id and (p_usuario is null or r.usuario = p_usuario);
$$;
revoke all on function public.yape_para_leer(bigint, uuid) from public, anon, authenticated;
grant execute on function public.yape_para_leer(bigint, uuid) to service_role;
