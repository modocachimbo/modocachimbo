-- =========================================================
-- Modo Cachimbo · Anuncios flotantes (Panel → Web → Anuncios)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 02-racha.sql (es_admin).
--
--   · anuncios: una imagen que sale en ventana al entrar al inicio.
--     Al tocarla abre el link (WhatsApp, TikTok, web…); la X la cierra.
--     tipo: propio (Modo Cachimbo) · patrocinado (academia, sale con la
--     etiqueta «Publicidad») · aviso (va primero).
--     frecuencia: una-vez · dia (una vez al día) · siempre (cada vez que entra).
--     publico: todos · sin-codigo · con-codigo · Ordinario · CPU.
--     desde / hasta: se prende y se apaga solo (fecha de Lima).
--   · anuncio_evento: una fila por alumno, anuncio y día. Así las vistas y
--     clics son de alumnos únicos por día (un reporte limpio para una academia).
--   · Imágenes en el Storage, carpeta pública «anuncios» (la sube el panel).
-- =========================================================

create table if not exists public.anuncios (
  id          bigint generated always as identity primary key,
  titulo      text not null check (char_length(titulo) between 1 and 80),
  tipo        text not null default 'propio' check (tipo in ('propio', 'patrocinado', 'aviso')),
  anunciante  text check (char_length(anunciante) <= 60),
  img         text not null,
  link        text check (char_length(link) <= 600),
  boton       text check (char_length(boton) <= 30),
  icono       text not null default 'web' check (icono in ('whatsapp', 'web', 'tiktok', 'instagram', 'facebook', 'youtube')),
  desde       date not null,
  hasta       date not null,
  frecuencia  text not null default 'dia' check (frecuencia in ('una-vez', 'dia', 'siempre')),
  publico     text not null default 'todos' check (publico in ('todos', 'sin-codigo', 'con-codigo', 'Ordinario', 'CPU')),
  activo      boolean not null default true,
  creado      timestamptz not null default now(),
  check (hasta >= desde)
);
alter table public.anuncios enable row level security;
-- Nadie lee la tabla directo: los alumnos usan anuncios_activos() y el panel anuncios_admin()

create table if not exists public.anuncio_evento (
  anuncio  bigint not null references public.anuncios (id) on delete cascade,
  usuario  uuid not null references auth.users (id) on delete cascade,
  dia      date not null,
  visto    boolean not null default false,
  clic     boolean not null default false,
  primary key (anuncio, usuario, dia)
);
alter table public.anuncio_evento enable row level security;

-- Carpeta pública del Storage: cualquiera ve las imágenes, solo los admins suben o borran
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('anuncios', 'anuncios', true, 1048576, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "anuncios: subir" on storage.objects;
create policy "anuncios: subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'anuncios' and public.es_admin());
drop policy if exists "anuncios: cambiar" on storage.objects;
create policy "anuncios: cambiar" on storage.objects for update to authenticated
  using (bucket_id = 'anuncios' and public.es_admin());
drop policy if exists "anuncios: borrar" on storage.objects;
create policy "anuncios: borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'anuncios' and public.es_admin());

-- Lo que ve el alumno: los anuncios prendidos y dentro de sus fechas.
-- El filtro por código y por modalidad lo hace la web (sabe qué códigos tiene).
create or replace function public.anuncios_activos()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', a.id, 'tipo', a.tipo, 'anunciante', a.anunciante, 'img', a.img, 'link', a.link,
      'boton', a.boton, 'icono', a.icono, 'frecuencia', a.frecuencia, 'publico', a.publico, 'hasta', a.hasta
    ) order by (a.tipo = 'aviso') desc, a.creado desc), '[]')
  from public.anuncios a
  where a.activo and (now() at time zone 'America/Lima')::date between a.desde and a.hasta;
$$;
revoke all on function public.anuncios_activos() from public, anon;
grant execute on function public.anuncios_activos() to authenticated;

-- La web avisa que el alumno vio el anuncio o lo tocó (una fila por día)
create or replace function public.anuncio_evento(p_id bigint, p_que text)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare v_dia date := (now() at time zone 'America/Lima')::date;
begin
  if auth.uid() is null then return; end if;
  if p_que not in ('vista', 'clic') then raise exception 'evento no válido'; end if;
  if not exists (select 1 from public.anuncios a where a.id = p_id) then return; end if;
  insert into public.anuncio_evento (anuncio, usuario, dia, visto, clic)
  values (p_id, auth.uid(), v_dia, true, p_que = 'clic')
  on conflict (anuncio, usuario, dia) do update set visto = true,
    clic = public.anuncio_evento.clic or excluded.clic;
end $$;
revoke all on function public.anuncio_evento(bigint, text) from public, anon;
grant execute on function public.anuncio_evento(bigint, text) to authenticated;

-- Guardar un anuncio (nuevo si no trae id). Solo admins.
create or replace function public.guardar_anuncio(p jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id    bigint := nullif(p ->> 'id', '')::bigint;
  v_tit   text := left(trim(coalesce(p ->> 'titulo', '')), 80);
  v_img   text := trim(coalesce(p ->> 'img', ''));
  v_link  text := nullif(trim(coalesce(p ->> 'link', '')), '');
  v_tipo  text := coalesce(p ->> 'tipo', 'propio');
  v_anun  text := nullif(left(trim(coalesce(p ->> 'anunciante', '')), 60), '');
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  if v_tit = '' then raise exception 'falta el nombre'; end if;
  if v_img !~ '^https://[a-z0-9.-]+/storage/v1/object/public/anuncios/[A-Za-z0-9/_.-]+$' then raise exception 'imagen no válida'; end if;
  if v_link is not null and v_link !~ '^https://[^\s<>"]+$' then raise exception 'el link debe empezar con https://'; end if;
  if v_tipo = 'patrocinado' and v_anun is null then raise exception 'falta el nombre de la academia'; end if;
  if v_id is null then
    insert into public.anuncios (titulo, tipo, anunciante, img, link, boton, icono, desde, hasta, frecuencia, publico, activo)
    values (v_tit, v_tipo, v_anun, v_img, v_link, nullif(left(trim(coalesce(p ->> 'boton', '')), 30), ''),
            coalesce(p ->> 'icono', 'web'), (p ->> 'desde')::date, (p ->> 'hasta')::date,
            coalesce(p ->> 'frecuencia', 'dia'), coalesce(p ->> 'publico', 'todos'), coalesce((p ->> 'activo')::boolean, true))
    returning id into v_id;
  else
    update public.anuncios set titulo = v_tit, tipo = v_tipo, anunciante = v_anun, img = v_img, link = v_link,
      boton = nullif(left(trim(coalesce(p ->> 'boton', '')), 30), ''), icono = coalesce(p ->> 'icono', 'web'),
      desde = (p ->> 'desde')::date, hasta = (p ->> 'hasta')::date, frecuencia = coalesce(p ->> 'frecuencia', 'dia'),
      publico = coalesce(p ->> 'publico', 'todos'), activo = coalesce((p ->> 'activo')::boolean, true)
    where id = v_id;
    if not found then raise exception 'ese anuncio ya no existe'; end if;
  end if;
  return jsonb_build_object('id', v_id);
end $$;
revoke all on function public.guardar_anuncio(jsonb) from public, anon;
grant execute on function public.guardar_anuncio(jsonb) to authenticated;

-- Prender o apagar sin abrir el formulario
create or replace function public.activar_anuncio(p_id bigint, p_activo boolean)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  update public.anuncios set activo = p_activo where id = p_id;
end $$;
revoke all on function public.activar_anuncio(bigint, boolean) from public, anon;
grant execute on function public.activar_anuncio(bigint, boolean) to authenticated;

-- Los anuncios para el panel, con vistas, clics y alumnos únicos
create or replace function public.anuncios_admin()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  return coalesce((select jsonb_agg(to_jsonb(a) || jsonb_build_object(
      'vistas', (select count(*) from public.anuncio_evento e where e.anuncio = a.id and e.visto),
      'clics', (select count(*) from public.anuncio_evento e where e.anuncio = a.id and e.clic),
      'alumnos', (select count(distinct e.usuario) from public.anuncio_evento e where e.anuncio = a.id),
      'hoy', (select count(*) from public.anuncio_evento e where e.anuncio = a.id and e.visto
                and e.dia = (now() at time zone 'America/Lima')::date)
    ) order by a.creado desc) from public.anuncios a), '[]');
end $$;
revoke all on function public.anuncios_admin() from public, anon;
grant execute on function public.anuncios_admin() to authenticated;

-- Borrar un anuncio (con sus vistas y clics). La imagen la borra el panel del Storage.
create or replace function public.borrar_anuncio(p_id bigint)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  delete from public.anuncios where id = p_id;
end $$;
revoke all on function public.borrar_anuncio(bigint) from public, anon;
grant execute on function public.borrar_anuncio(bigint) to authenticated;
