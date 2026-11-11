-- =========================================================
-- Modo Cachimbo · Anuncios: a quién le sale y tope de vistas
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 84-anuncios.sql.
--
--   · segmento (jsonb): quién lo ve, además de "publico".
--       no_tiene: [productos]  → solo cuentas SIN ninguno de estos accesos
--       tiene:    [productos]  → solo cuentas CON alguno de estos accesos
--       modalidad: 'Ordinario' | 'CPU'
--       cuenta: 'nuevas' | 'antiguas'  (con dias: cuántos días cuenta como nueva)
--       equipo: 'celular' | 'pc' | 'app'
--     Productos: TODO-VIP, area, seminario, simulacro, duelo, examenes,
--     vocabulario, biblioteca, descarga. La web revisa los accesos del alumno.
--   · tope: vistas máximas (alumnos únicos por día). Al llegar, el anuncio
--     deja de salir solo. Sirve para vender paquetes a una academia.
-- =========================================================

alter table public.anuncios add column if not exists segmento jsonb not null default '{}'::jsonb;
alter table public.anuncios add column if not exists tope integer check (tope is null or tope > 0);

-- Lo que ve el alumno: prendidos, en sus fechas y sin pasar su tope
create or replace function public.anuncios_activos()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', a.id, 'tipo', a.tipo, 'anunciante', a.anunciante, 'img', a.img, 'link', a.link,
      'boton', a.boton, 'icono', a.icono, 'frecuencia', a.frecuencia, 'publico', a.publico, 'hasta', a.hasta,
      'segmento', a.segmento
    ) order by (a.tipo = 'aviso') desc, a.creado desc), '[]')
  from public.anuncios a
  where a.activo and (now() at time zone 'America/Lima')::date between a.desde and a.hasta
    and (a.tope is null or (select count(*) from public.anuncio_evento e where e.anuncio = a.id and e.visto) < a.tope);
$$;
revoke all on function public.anuncios_activos() from public, anon;
grant execute on function public.anuncios_activos() to authenticated;

-- Limpia el segmento: solo las llaves y valores que la web entiende
create or replace function public.anuncio_segmento_limpio(s jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare
  v_ok text[] := array['TODO-VIP', 'area', 'seminario', 'simulacro', 'duelo', 'examenes', 'vocabulario', 'biblioteca', 'descarga'];
  r jsonb := '{}'::jsonb;
  v_dias int;
begin
  if s is null or jsonb_typeof(s) <> 'object' then return r; end if;
  if jsonb_typeof(s -> 'no_tiene') = 'array' then
    r := r || jsonb_build_object('no_tiene', coalesce((select jsonb_agg(distinct x) from jsonb_array_elements_text(s -> 'no_tiene') x where x = any (v_ok)), '[]'));
  end if;
  if jsonb_typeof(s -> 'tiene') = 'array' then
    r := r || jsonb_build_object('tiene', coalesce((select jsonb_agg(distinct x) from jsonb_array_elements_text(s -> 'tiene') x where x = any (v_ok)), '[]'));
  end if;
  if s ->> 'modalidad' in ('Ordinario', 'CPU') then r := r || jsonb_build_object('modalidad', s ->> 'modalidad'); end if;
  if s ->> 'cuenta' in ('nuevas', 'antiguas') then
    v_dias := least(greatest(coalesce(nullif(s ->> 'dias', '')::int, 7), 1), 365);
    r := r || jsonb_build_object('cuenta', s ->> 'cuenta', 'dias', v_dias);
  end if;
  if s ->> 'equipo' in ('celular', 'pc', 'app') then r := r || jsonb_build_object('equipo', s ->> 'equipo'); end if;
  return r;
end $$;

-- Guardar un anuncio (nuevo si no trae id). Solo admins. Igual que en 84, más segmento y tope.
create or replace function public.guardar_anuncio(p jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id    bigint := nullif(p ->> 'id', '')::bigint;
  v_tit   text := left(trim(coalesce(p ->> 'titulo', '')), 80);
  v_img   text := trim(coalesce(p ->> 'img', ''));
  v_link  text := nullif(trim(coalesce(p ->> 'link', '')), '');
  v_tipo  text := coalesce(p ->> 'tipo', 'propio');
  v_anun  text := nullif(left(trim(coalesce(p ->> 'anunciante', '')), 60), '');
  v_seg   jsonb := public.anuncio_segmento_limpio(p -> 'segmento');
  v_tope  int := nullif(p ->> 'tope', '')::int;
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  if v_tit = '' then raise exception 'falta el nombre'; end if;
  if v_img !~ '^https://[a-z0-9.-]+/storage/v1/object/public/anuncios/[A-Za-z0-9/_.-]+$' then raise exception 'imagen no válida'; end if;
  if v_link is not null and v_link !~ '^https://[^\s<>"]+$' then raise exception 'el link debe empezar con https://'; end if;
  if v_tipo = 'patrocinado' and v_anun is null then raise exception 'falta el nombre de la academia'; end if;
  if v_tope is not null and v_tope < 1 then v_tope := null; end if;
  if v_id is null then
    insert into public.anuncios (titulo, tipo, anunciante, img, link, boton, icono, desde, hasta, frecuencia, publico, activo, segmento, tope)
    values (v_tit, v_tipo, v_anun, v_img, v_link, nullif(left(trim(coalesce(p ->> 'boton', '')), 30), ''),
            coalesce(p ->> 'icono', 'web'), (p ->> 'desde')::date, (p ->> 'hasta')::date,
            coalesce(p ->> 'frecuencia', 'dia'), coalesce(p ->> 'publico', 'todos'), coalesce((p ->> 'activo')::boolean, true), v_seg, v_tope)
    returning id into v_id;
  else
    update public.anuncios set titulo = v_tit, tipo = v_tipo, anunciante = v_anun, img = v_img, link = v_link,
      boton = nullif(left(trim(coalesce(p ->> 'boton', '')), 30), ''), icono = coalesce(p ->> 'icono', 'web'),
      desde = (p ->> 'desde')::date, hasta = (p ->> 'hasta')::date, frecuencia = coalesce(p ->> 'frecuencia', 'dia'),
      publico = coalesce(p ->> 'publico', 'todos'), activo = coalesce((p ->> 'activo')::boolean, true),
      segmento = v_seg, tope = v_tope
    where id = v_id;
    if not found then raise exception 'ese anuncio ya no existe'; end if;
  end if;
  return jsonb_build_object('id', v_id);
end $$;
revoke all on function public.guardar_anuncio(jsonb) from public, anon;
grant execute on function public.guardar_anuncio(jsonb) to authenticated;
