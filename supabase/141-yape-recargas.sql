-- =========================================================
-- Modo Cachimbo · 141 · Recarga de diamantes con Yape (automática)
--
-- Cómo funciona:
--   1. El alumno yapea al 928 030 708 (Javier R.), sube su captura y
--      escribe el CÓDIGO DE SEGURIDAD (3 números) en tienda.html.
--   2. MacroDroid, en el celular de Javier, lee el aviso «Te yapearon»
--      de la app Yape y lo manda aquí (yape_aviso) con una clave secreta.
--   3. Si llega un aviso con el MISMO monto y el MISMO código, y ese aviso
--      no se usó antes → los diamantes caen solos.
--   4. Si en 10 minutos no aparece el aviso → «En revisión» y le llega una
--      notificación a los admins (Edge Function enviar-push, accion 'yape').
--      En el panel → Recargas Yape se aprueba o rechaza con un toque.
--
-- Cómo correrlo: Supabase → SQL Editor → New query → pega todo → Run.
-- Después: re-desplegar la Edge Function «enviar-push» (trae la acción 'yape').
-- =========================================================

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ---------- Ajustes (clave secreta de MacroDroid, encendido) ----------
create table if not exists public.yape_ajustes (
  id       integer primary key default 1 check (id = 1),
  secreto  text not null default replace(gen_random_uuid()::text, '-', ''),
  auto     boolean not null default true,       -- false = todo va a revisión
  espera   integer not null default 10          -- minutos antes de pasar a revisión
);
insert into public.yape_ajustes (id) values (1) on conflict (id) do nothing;
alter table public.yape_ajustes enable row level security;
revoke all on public.yape_ajustes from anon, authenticated;

-- ---------- Avisos de Yape que manda MacroDroid ----------
create table if not exists public.yape_avisos (
  id        bigint generated always as identity primary key,
  texto     text not null,
  monto     numeric(10,2),
  codigo    text,
  nombre    text,
  recibido  timestamptz not null default now(),
  recarga   bigint                               -- a qué recarga se le dio (null = libre)
);
create index if not exists yape_avisos_cruce on public.yape_avisos (monto, codigo) where recarga is null;
alter table public.yape_avisos enable row level security;
revoke all on public.yape_avisos from anon, authenticated;

-- ---------- Recargas que piden los alumnos ----------
create table if not exists public.yape_recargas (
  id         bigint generated always as identity primary key,
  usuario    uuid not null references auth.users (id) on delete cascade,
  paquete    integer not null,
  monto      numeric(10,2) not null,
  diamantes  integer not null,
  codigo     text not null,
  captura    text,                                -- ruta en Storage (carpeta yape)
  estado     text not null default 'esperando' check (estado in ('esperando', 'revision', 'aprobada', 'rechazada')),
  como       text,                                -- 'auto' | 'admin'
  nota       text,
  aviso      bigint,
  creado     timestamptz not null default now(),
  resuelto   timestamptz,
  avisado    boolean not null default false       -- ya se mandó la notificación a los admins
);
create index if not exists yape_recargas_u on public.yape_recargas (usuario, creado desc);
create index if not exists yape_recargas_e on public.yape_recargas (estado, creado);
alter table public.yape_recargas enable row level security;
revoke all on public.yape_recargas from anon, authenticated;

-- ---------- Capturas: carpeta privada «yape» (cada alumno sube a la suya) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('yape', 'yape', false, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "yape: subir la mía" on storage.objects;
create policy "yape: subir la mía" on storage.objects for insert to authenticated
  with check (bucket_id = 'yape' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "yape: ver" on storage.objects;
create policy "yape: ver" on storage.objects for select to authenticated
  using (bucket_id = 'yape' and ((storage.foldername(name))[1] = auth.uid()::text or public.es_admin()));
drop policy if exists "yape: borrar admin" on storage.objects;
create policy "yape: borrar admin" on storage.objects for delete to authenticated
  using (bucket_id = 'yape' and public.es_admin());

-- Paquetes (los mismos de tienda.html → PAQ). Índice 0..5 → monto, diamantes
create or replace function public.yape_paquete(i integer)
returns table (monto numeric, diamantes integer) language sql immutable set search_path = '' as $$
  select x.m, x.d from (values (0, 1::numeric, 50), (1, 2, 110), (2, 5, 300), (3, 10, 650), (4, 15, 1050), (5, 25, 2000)) as x(i, m, d) where x.i = $1;
$$;

-- Dar los diamantes de una recarga (una sola vez)
create or replace function public.yape_acreditar(p_id bigint, p_como text, p_aviso bigint)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare r public.yape_recargas;
begin
  select * into r from public.yape_recargas x where x.id = p_id for update;
  if r.id is null or r.estado in ('aprobada') then return false; end if;
  perform public.diamantes_dar(r.usuario, r.diamantes, 'Recarga Yape S/ ' || trim(to_char(r.monto, 'FM999990.##')));
  update public.yape_recargas set estado = 'aprobada', como = p_como, aviso = coalesce(p_aviso, aviso), resuelto = now() where id = p_id;
  if p_aviso is not null then update public.yape_avisos set recarga = p_id where id = p_aviso; end if;
  return true;
end $$;
revoke all on function public.yape_acreditar(bigint, text, bigint) from public, anon, authenticated;

-- Buscar un aviso libre que calce con la recarga (mismo monto y código)
create or replace function public.yape_cruzar(p_id bigint)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare r public.yape_recargas; a bigint;
begin
  if not (select auto from public.yape_ajustes where id = 1) then return false; end if;
  select * into r from public.yape_recargas x where x.id = p_id;
  if r.id is null or r.estado not in ('esperando', 'revision') then return false; end if;
  select v.id into a from public.yape_avisos v
   where v.recarga is null and v.monto = r.monto and v.codigo = r.codigo
     and v.recibido between r.creado - interval '6 hours' and r.creado + interval '6 hours'
   order by abs(extract(epoch from v.recibido - r.creado)) limit 1 for update skip locked;
  if a is null then return false; end if;
  return public.yape_acreditar(p_id, 'auto', a);
end $$;
revoke all on function public.yape_cruzar(bigint) from public, anon, authenticated;

-- Aviso a los admins (notificación al celular) de una recarga en revisión
create or replace function public.yape_notificar(p_id bigint)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  update public.yape_recargas set avisado = true where id = p_id and not avisado;
  if not found then return; end if;
  begin
    perform net.http_post(
      url := 'https://tvcrhogybfxphpzpjnis.supabase.co/functions/v1/enviar-push',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('accion', 'yape', 'id', p_id, 'secreto', (select secreto from public.push_ajustes where id = 1)));
  exception when others then null;
  end;
end $$;
revoke all on function public.yape_notificar(bigint) from public, anon, authenticated;

-- ---------- Alumno: pedir la recarga ----------
create or replace function public.yape_pedir(p_paquete integer, p_codigo text, p_captura text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  m numeric; d integer; nuevo bigint; ok boolean; cod text := regexp_replace(coalesce(p_codigo, ''), '\D', '', 'g');
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select x.monto, x.diamantes into m, d from public.yape_paquete(p_paquete) x;
  if m is null then raise exception 'yape_paquete'; end if;
  if cod !~ '^\d{3}$' then raise exception 'yape_codigo'; end if;
  if coalesce(p_captura, '') !~ ('^' || uid::text || '/') then raise exception 'yape_captura'; end if;
  if (select count(*) from public.yape_recargas r where r.usuario = uid and r.estado in ('esperando', 'revision')) >= 3 then raise exception 'yape_muchas'; end if;
  if (select count(*) from public.yape_recargas r where r.usuario = uid and r.creado > now() - interval '1 day') >= 10 then raise exception 'yape_dia'; end if;
  insert into public.yape_recargas (usuario, paquete, monto, diamantes, codigo, captura)
  values (uid, p_paquete, m, d, cod, left(p_captura, 200)) returning id into nuevo;
  ok := public.yape_cruzar(nuevo);
  if not ok and not (select auto from public.yape_ajustes where id = 1) then
    update public.yape_recargas set estado = 'revision' where id = nuevo;
    perform public.yape_notificar(nuevo);
  end if;
  return public.yape_ver(nuevo);
end $$;
revoke all on function public.yape_pedir(integer, text, text) from public, anon;
grant execute on function public.yape_pedir(integer, text, text) to authenticated;

-- Estado de una recarga mía (la tienda pregunta cada pocos segundos)
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
    'saldo', (select coalesce(sum(m.cantidad), 0)::integer from public.diamantes_mov m where m.usuario = uid));
end $$;
revoke all on function public.yape_ver(bigint) from public, anon;
grant execute on function public.yape_ver(bigint) to authenticated;

-- Mis últimas recargas (para ver si quedó alguna en revisión)
create or replace function public.yape_mias()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'estado', r.estado, 'monto', r.monto, 'diamantes', r.diamantes, 'nota', r.nota, 'creado', r.creado) order by r.creado desc), '[]'::jsonb)
  from (select * from public.yape_recargas x where x.usuario = auth.uid() and x.creado > now() - interval '7 days' order by x.creado desc limit 5) r;
$$;
revoke all on function public.yape_mias() from public, anon;
grant execute on function public.yape_mias() to authenticated;

-- ---------- MacroDroid: llega un aviso de Yape ----------
-- Texto típico: «Yape! Juan P. te envió un pago por S/ 5. El cód. de seguridad es: 339»
create or replace function public.yape_aviso(p_secreto text, p_texto text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  t text := left(coalesce(p_texto, ''), 600);
  m numeric; c text; n text; nuevo bigint; r bigint; dado bigint;
begin
  if p_secreto is distinct from (select secreto from public.yape_ajustes where id = 1) then raise exception 'no autorizado'; end if;
  m := replace(substring(t from 'S/\.?\s*([0-9]+(?:[.,][0-9]{1,2})?)'), ',', '.')::numeric;
  c := substring(t from '(?i)seguridad[^0-9]*([0-9]{3})');
  n := trim(substring(t from '(?i)^(?:yape!?\s*)?(.+?)\s+te\s+(?:envi|yape)'));
  insert into public.yape_avisos (texto, monto, codigo, nombre) values (t, m, c, left(n, 80)) returning id into nuevo;
  -- ¿Ya había una recarga esperando este pago?
  if m is not null and c is not null and (select auto from public.yape_ajustes where id = 1) then
    select x.id into r from public.yape_recargas x
     where x.estado in ('esperando', 'revision') and x.monto = m and x.codigo = c and x.creado > now() - interval '6 hours'
     order by x.creado limit 1;
    if r is not null and public.yape_acreditar(r, 'auto', nuevo) then dado := r; end if;
  end if;
  delete from public.yape_avisos v where v.recibido < now() - interval '60 days';
  return jsonb_build_object('ok', true, 'monto', m, 'codigo', c, 'recarga', dado);
end $$;
revoke all on function public.yape_aviso(text, text) from public;
grant execute on function public.yape_aviso(text, text) to anon, authenticated;

-- ---------- Reloj: cada 2 minutos pasa a revisión lo que ya esperó mucho ----------
create or replace function public.yape_reloj()
returns void language plpgsql volatile security definer set search_path = '' as $$
declare x record; esp integer := (select espera from public.yape_ajustes where id = 1);
begin
  for x in select r.id from public.yape_recargas r where r.estado = 'esperando' and r.creado < now() - make_interval(mins => esp) loop
    if not public.yape_cruzar(x.id) then
      update public.yape_recargas set estado = 'revision' where id = x.id and estado = 'esperando';
      perform public.yape_notificar(x.id);
    end if;
  end loop;
end $$;
revoke all on function public.yape_reloj() from public, anon, authenticated;

do $$ begin
  if exists (select 1 from cron.job where jobname = 'mc-yape-reloj') then perform cron.unschedule('mc-yape-reloj'); end if;
end $$;
select cron.schedule('mc-yape-reloj', '*/2 * * * *', $cron$ select public.yape_reloj(); $cron$);

-- ---------- Edge Function: a quién mandar la notificación ----------
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
      'titulo', 'Yape en revisión: S/ ' || trim(to_char(r.monto, 'FM999990.##')),
      'cuerpo', coalesce(quien, 'Un alumno') || ' pide ' || r.diamantes || ' diamantes (código ' || r.codigo || '). Revisa tu Yape y aprueba o rechaza.',
      'link', 'panel/index.html#yape')) from unnest(adm) x), '[]'::jsonb),
    'subs', coalesce((select jsonb_object_agg(x::text, coalesce((select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
      from public.push_subs s where s.usuario = x), '[]'::jsonb)) from unnest(adm) x), '{}'::jsonb));
end $$;
revoke all on function public.push_yape(text, bigint) from public;
grant execute on function public.push_yape(text, bigint) to anon, authenticated;

-- ---------- Panel ----------
create or replace function public.yape_admin()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare aj public.yape_ajustes;
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  select * into aj from public.yape_ajustes where id = 1;
  return jsonb_build_object(
    'ajustes', jsonb_build_object('secreto', aj.secreto, 'auto', aj.auto, 'espera', aj.espera,
      'ultimo', (select max(v.recibido) from public.yape_avisos v)),
    'cuenta', jsonb_build_object('revision', (select count(*) from public.yape_recargas r where r.estado = 'revision'),
      'esperando', (select count(*) from public.yape_recargas r where r.estado = 'esperando')),
    'recargas', coalesce((select jsonb_agg(jsonb_build_object(
        'id', r.id, 'estado', r.estado, 'como', r.como, 'monto', r.monto, 'diamantes', r.diamantes, 'codigo', r.codigo,
        'captura', r.captura, 'nota', r.nota, 'creado', r.creado, 'resuelto', r.resuelto,
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

-- Aprobar (da los diamantes) o rechazar
create or replace function public.yape_resolver(p_id bigint, p_aprobar boolean, p_nota text default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare r public.yape_recargas;
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  select * into r from public.yape_recargas x where x.id = p_id;
  if r.id is null then raise exception 'No existe esa recarga.'; end if;
  if r.estado = 'aprobada' then raise exception 'Esa recarga ya fue aprobada.'; end if;
  if p_aprobar then
    perform public.yape_acreditar(p_id, 'admin', null);
    update public.yape_recargas set nota = nullif(left(trim(coalesce(p_nota, '')), 140), '') where id = p_id;
  else
    update public.yape_recargas set estado = 'rechazada', como = 'admin', resuelto = now(),
      nota = coalesce(nullif(left(trim(coalesce(p_nota, '')), 140), ''), 'No llegó el pago.') where id = p_id;
  end if;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.yape_resolver(bigint, boolean, text) from public, anon;
grant execute on function public.yape_resolver(bigint, boolean, text) to authenticated;

-- Encender/apagar lo automático, minutos de espera, o una clave nueva para MacroDroid
create or replace function public.yape_config(p jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  update public.yape_ajustes set
    auto = coalesce((p ->> 'auto')::boolean, auto),
    espera = greatest(2, least(120, coalesce((p ->> 'espera')::integer, espera))),
    secreto = case when (p ->> 'nueva_clave')::boolean then replace(gen_random_uuid()::text, '-', '') else secreto end
  where id = 1;
  return public.yape_admin();
end $$;
revoke all on function public.yape_config(jsonb) from public, anon;
grant execute on function public.yape_config(jsonb) to authenticated;
