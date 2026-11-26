-- =========================================================
-- Modo Cachimbo · 142 · Yape semiautomático + aviso por WhatsApp
-- (va después de 141-yape-recargas.sql)
--
--   · Montos BAJOS (hasta «tope», S/ 5 al inicio): se aprueban solos al
--     instante. Te llega un WhatsApp con un enlace «No me llegó» por si
--     el pago no aparece en tu Yape (quita los diamantes).
--   · Montos ALTOS, o si algo se ve raro: «En revisión». Te llega un
--     WhatsApp con dos enlaces: Aprobar / Rechazar (y la notificación
--     del celular, como antes).
--   · Se ve raro = el mismo código + monto ya se usó, el alumno ya pasó
--     su límite del día (tope_dia), o tiene una recarga rechazada en los
--     últimos 30 días.
--   · WhatsApp: servicio gratuito CallMeBot. Su clave se pega en el
--     panel → Recargas Yape.
--   · Si algún día usas MacroDroid, sigue funcionando: si el aviso de
--     Yape calza, se aprueba solo aunque sea monto alto.
--
-- Cómo correrlo: Supabase → SQL Editor → New query → pega todo → Run.
-- =========================================================

alter table public.yape_ajustes add column if not exists tope     numeric(10,2) not null default 5;
alter table public.yape_ajustes add column if not exists tope_dia numeric(10,2) not null default 10;
alter table public.yape_ajustes add column if not exists wsp_tel  text not null default '+51928030708';
alter table public.yape_ajustes add column if not exists wsp_key  text;

alter table public.yape_recargas add column if not exists token text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
create unique index if not exists yape_recargas_token on public.yape_recargas (token);
alter table public.yape_recargas add column if not exists motivo text;   -- por qué fue a revisión

-- Mandar un WhatsApp a Javier (CallMeBot). Si no hay clave, no hace nada.
create or replace function public.yape_wsp(p_texto text)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare aj public.yape_ajustes;
begin
  select * into aj from public.yape_ajustes where id = 1;
  if coalesce(aj.wsp_key, '') = '' then return; end if;
  begin
    perform net.http_get(
      url := 'https://api.callmebot.com/whatsapp.php',
      params := jsonb_build_object('phone', aj.wsp_tel, 'text', left(p_texto, 900), 'apikey', aj.wsp_key));
  exception when others then null;
  end;
end $$;
revoke all on function public.yape_wsp(text) from public, anon, authenticated;

-- Aviso a los admins: notificación al celular (si está en revisión) + WhatsApp con enlaces
create or replace function public.yape_notificar(p_id bigint)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare r public.yape_recargas; quien text; jid integer; url text; t text;
begin
  update public.yape_recargas set avisado = true where id = p_id and not avisado returning * into r;
  if r.id is null then return; end if;
  select coalesce(nullif(trim(p.apodo), ''), nullif(trim(p.nombre), ''), 'Un alumno') into quien from public.perfiles p where p.id = r.usuario;
  select j.codigo into jid from public.jugador_id j where j.usuario = r.usuario;
  url := 'https://modocachimbo.github.io/modocachimbo/yape.html?t=' || r.token;
  if r.estado = 'revision' then
    begin
      perform net.http_post(
        url := 'https://tvcrhogybfxphpzpjnis.supabase.co/functions/v1/enviar-push',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := jsonb_build_object('accion', 'yape', 'id', p_id, 'secreto', (select secreto from public.push_ajustes where id = 1)));
    exception when others then null;
    end;
    t := 'Yape EN REVISION: S/ ' || trim(to_char(r.monto, 'FM999990.##')) || E'\n' ||
         coalesce(quien, 'Un alumno') || coalesce(' (ID ' || jid || ')', '') || ' pide ' || r.diamantes || ' diamantes. Codigo de seguridad: ' || r.codigo || E'\n' ||
         coalesce('Motivo: ' || r.motivo || E'\n', '') ||
         E'\nRevisa tu Yape y toca:\nAPROBAR: ' || url || '&a=si' || E'\nRECHAZAR: ' || url || '&a=no';
  else
    t := 'Yape aprobado solo: S/ ' || trim(to_char(r.monto, 'FM999990.##')) || E'\n' ||
         coalesce(quien, 'Un alumno') || coalesce(' (ID ' || jid || ')', '') || ' recibio ' || r.diamantes || ' diamantes. Codigo de seguridad: ' || r.codigo || E'\n' ||
         E'\nSi NO te llego ese Yape, toca:\nNO ME LLEGO: ' || url || '&a=quitar';
  end if;
  perform public.yape_wsp(t);
end $$;
revoke all on function public.yape_notificar(bigint) from public, anon, authenticated;

-- ---------- Alumno: pedir la recarga ----------
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

  if mot is null then
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

-- Quitar los diamantes de una recarga que no llegó (puede dejar el saldo en negativo)
create or replace function public.yape_quitar(p_id bigint, p_nota text)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare r public.yape_recargas;
begin
  select * into r from public.yape_recargas x where x.id = p_id for update;
  if r.id is null or r.estado <> 'aprobada' then return false; end if;
  insert into public.diamantes_mov (usuario, cantidad, motivo) values (r.usuario, -r.diamantes, 'Yape no llegó (S/ ' || trim(to_char(r.monto, 'FM999990.##')) || ')');
  update public.yape_recargas set estado = 'rechazada', como = 'admin', resuelto = now(), nota = coalesce(p_nota, 'No llegó el pago. Se quitaron los diamantes.') where id = p_id;
  return true;
end $$;
revoke all on function public.yape_quitar(bigint, text) from public, anon, authenticated;

-- ---------- Página yape.html (enlace del WhatsApp) ----------
create or replace function public.yape_por_token(p_token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r public.yape_recargas;
begin
  select * into r from public.yape_recargas x where x.token = p_token and length(p_token) >= 40;
  if r.id is null then return null; end if;
  return jsonb_build_object('id', r.id, 'estado', r.estado, 'como', r.como, 'monto', r.monto, 'diamantes', r.diamantes, 'codigo', r.codigo,
    'motivo', r.motivo, 'nota', r.nota, 'creado', r.creado,
    'apodo', (select coalesce(nullif(trim(p.apodo), ''), p.nombre) from public.perfiles p where p.id = r.usuario),
    'jid', (select j.codigo from public.jugador_id j where j.usuario = r.usuario));
end $$;
revoke all on function public.yape_por_token(text) from public;
grant execute on function public.yape_por_token(text) to anon, authenticated;

create or replace function public.yape_por_token_resolver(p_token text, p_accion text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare r public.yape_recargas;
begin
  select * into r from public.yape_recargas x where x.token = p_token and length(p_token) >= 40;
  if r.id is null then raise exception 'No existe esa recarga.'; end if;
  if p_accion = 'si' then
    if r.estado not in ('esperando', 'revision', 'rechazada') then raise exception 'Esa recarga ya estaba aprobada.'; end if;
    perform public.yape_acreditar(r.id, 'admin', null);
  elsif p_accion = 'no' then
    if r.estado not in ('esperando', 'revision') then raise exception 'Esa recarga ya no está en revisión.'; end if;
    update public.yape_recargas set estado = 'rechazada', como = 'admin', resuelto = now(), nota = 'No llegó el pago.' where id = r.id;
  elsif p_accion = 'quitar' then
    if r.estado <> 'aprobada' then raise exception 'Esa recarga no está aprobada.'; end if;
    perform public.yape_quitar(r.id, null);
  else raise exception 'Acción no válida.';
  end if;
  return public.yape_por_token(p_token);
end $$;
revoke all on function public.yape_por_token_resolver(text, text) from public;
grant execute on function public.yape_por_token_resolver(text, text) to anon, authenticated;

-- ---------- Panel ----------
create or replace function public.yape_admin()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare aj public.yape_ajustes;
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  select * into aj from public.yape_ajustes where id = 1;
  return jsonb_build_object(
    'ajustes', jsonb_build_object('secreto', aj.secreto, 'auto', aj.auto, 'espera', aj.espera, 'tope', aj.tope, 'tope_dia', aj.tope_dia,
      'wsp_tel', aj.wsp_tel, 'wsp', coalesce(aj.wsp_key, '') <> '',
      'ultimo', (select max(v.recibido) from public.yape_avisos v)),
    'cuenta', jsonb_build_object('revision', (select count(*) from public.yape_recargas r where r.estado = 'revision'),
      'esperando', (select count(*) from public.yape_recargas r where r.estado = 'esperando'),
      'solas', (select count(*) from public.yape_recargas r where r.como = 'confianza' and r.estado = 'aprobada' and r.creado > now() - interval '7 days')),
    'recargas', coalesce((select jsonb_agg(jsonb_build_object(
        'id', r.id, 'estado', r.estado, 'como', r.como, 'monto', r.monto, 'diamantes', r.diamantes, 'codigo', r.codigo,
        'captura', r.captura, 'nota', r.nota, 'motivo', r.motivo, 'creado', r.creado, 'resuelto', r.resuelto,
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

-- Aprobar / rechazar / quitar desde el panel
create or replace function public.yape_resolver(p_id bigint, p_aprobar boolean, p_nota text default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare r public.yape_recargas;
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  select * into r from public.yape_recargas x where x.id = p_id;
  if r.id is null then raise exception 'No existe esa recarga.'; end if;
  if p_aprobar then
    if r.estado = 'aprobada' then raise exception 'Esa recarga ya fue aprobada.'; end if;
    perform public.yape_acreditar(p_id, 'admin', null);
  elsif r.estado = 'aprobada' then
    perform public.yape_quitar(p_id, nullif(left(trim(coalesce(p_nota, '')), 140), ''));
  else
    update public.yape_recargas set estado = 'rechazada', como = 'admin', resuelto = now(),
      nota = coalesce(nullif(left(trim(coalesce(p_nota, '')), 140), ''), 'No llegó el pago.') where id = p_id;
  end if;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.yape_resolver(bigint, boolean, text) from public, anon;
grant execute on function public.yape_resolver(bigint, boolean, text) to authenticated;

create or replace function public.yape_config(p jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  update public.yape_ajustes set
    auto = coalesce((p ->> 'auto')::boolean, auto),
    espera = greatest(2, least(120, coalesce((p ->> 'espera')::integer, espera))),
    tope = greatest(0, least(100, coalesce((p ->> 'tope')::numeric, tope))),
    tope_dia = greatest(0, least(500, coalesce((p ->> 'tope_dia')::numeric, tope_dia))),
    wsp_tel = coalesce(nullif(regexp_replace(p ->> 'wsp_tel', '[^0-9+]', '', 'g'), ''), wsp_tel),
    wsp_key = case when p ? 'wsp_key' then nullif(trim(p ->> 'wsp_key'), '') else wsp_key end,
    secreto = case when (p ->> 'nueva_clave')::boolean then replace(gen_random_uuid()::text, '-', '') else secreto end
  where id = 1;
  if (p ->> 'probar')::boolean then perform public.yape_wsp('Modo Cachimbo: prueba de avisos de Yape. Si lees esto, ya te llegan los WhatsApp.'); end if;
  return public.yape_admin();
end $$;
revoke all on function public.yape_config(jsonb) from public, anon;
grant execute on function public.yape_config(jsonb) to authenticated;
