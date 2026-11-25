-- =========================================================
-- Modo Cachimbo · Biblioteca universitaria
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede repetir sin problema. Necesita 42 y 43.
--
--   · Cada libro ahora dice si es preuniversitario o universitario (nivel).
--   · Los universitarios tienen un área de carrera (Ciencias básicas,
--     Ingeniería, Ciencias de la salud, Negocios y economía, Sociales y
--     humanidades) y un curso escrito libre («Cálculo I», «Anatomía Humana»…).
--   · Los libros que ya tienes quedan como preuniversitarios.
-- =========================================================

alter table public.biblioteca_libro add column if not exists nivel        text not null default 'pre';  -- pre | uni
alter table public.biblioteca_libro add column if not exists area_uni     text;                          -- u-basicas, u-ingenieria…
alter table public.biblioteca_libro add column if not exists curso_nombre text;                          -- «Cálculo I» (solo universitarios)

create or replace function public.guardar_libro(p jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id    text := nullif(trim(coalesce(p ->> 'id', '')), '');
  v_tit   text := left(trim(coalesce(p ->> 'titulo', '')), 80);
  v_curso text := trim(coalesce(p ->> 'curso', ''));
  v_drive text := trim(coalesce(p ->> 'drive', ''));
  v_por   text := nullif(trim(coalesce(p ->> 'portada', '')), '');
  v_tipo  text := coalesce(nullif(p ->> 'tipo', ''), 'libro');
  v_col   text := nullif(p ->> 'coleccion', '');
  v_acc   text := coalesce(nullif(p ->> 'acceso', ''), 'libre');
  v_niv   text := coalesce(nullif(p ->> 'nivel', ''), 'pre');
  v_area  text := nullif(p ->> 'area_uni', '');
  v_cnom  text := nullif(left(trim(coalesce(p ->> 'curso_nombre', '')), 40), '');
  v_etq   text[] := coalesce((select array_agg(distinct left(lower(trim(e)), 30)) from jsonb_array_elements_text(coalesce(p -> 'etiquetas', '[]')) e where trim(e) <> ''), '{}');
begin
  if not public.puede('biblioteca') then raise exception 'no autorizado'; end if;
  if v_tit = '' then raise exception 'falta el título'; end if;
  if v_curso !~ '^[a-z0-9-]{2,40}$' then raise exception 'curso no válido'; end if;
  if v_drive !~ '^[A-Za-z0-9_-]{20,80}$' then raise exception 'link de Drive no válido'; end if;
  if v_id is null then v_id := 'lib-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8); end if;
  if v_id !~ '^lib-[a-z0-9-]{1,40}$' then raise exception 'id no válido'; end if;
  if v_por is not null and v_por !~ '^https://[a-z0-9.-]+/storage/v1/object/public/recursos/[A-Za-z0-9/_.-]+$' then raise exception 'portada no válida'; end if;
  if v_tipo not in ('libro', 'formulario', 'solucionario', 'fichas', 'resumen', 'examenes', 'separata') then raise exception 'tipo no válido'; end if;
  if v_acc not in ('libre', 'codigo') then raise exception 'acceso no válido'; end if;
  if v_niv not in ('pre', 'uni') then raise exception 'nivel no válido'; end if;
  if v_niv = 'uni' then
    if v_area is null or v_area not in ('u-basicas', 'u-ingenieria', 'u-salud', 'u-negocios', 'u-sociales') then raise exception 'área universitaria no válida'; end if;
    if v_cnom is null then raise exception 'falta el curso universitario'; end if;
  else v_area := null; v_cnom := null; end if;
  if v_col is not null and not exists (select 1 from public.biblioteca_coleccion c where c.id = v_col) then raise exception 'esa colección no existe'; end if;
  insert into public.biblioteca_libro (id, titulo, subtitulo, curso, drive, paginas, orden, visible, portada, tipo, autor, descr, coleccion, destacado, etiquetas, descarga, acceso, nivel, area_uni, curso_nombre)
  values (v_id, v_tit, nullif(left(trim(coalesce(p ->> 'subtitulo', '')), 80), ''), v_curso, v_drive,
          nullif((p ->> 'paginas')::int, 0), coalesce((p ->> 'orden')::int, 0), coalesce((p ->> 'visible')::boolean, true),
          v_por, v_tipo, nullif(left(trim(coalesce(p ->> 'autor', '')), 80), ''), nullif(left(trim(coalesce(p ->> 'descr', '')), 400), ''),
          v_col, coalesce((p ->> 'destacado')::boolean, false), v_etq, coalesce((p ->> 'descarga')::boolean, false), v_acc, v_niv, v_area, v_cnom)
  on conflict (id) do update set
    titulo = excluded.titulo, subtitulo = excluded.subtitulo, curso = excluded.curso, drive = excluded.drive,
    paginas = excluded.paginas, orden = excluded.orden, visible = excluded.visible, portada = excluded.portada,
    tipo = excluded.tipo, autor = excluded.autor, descr = excluded.descr, coleccion = excluded.coleccion,
    destacado = excluded.destacado, etiquetas = excluded.etiquetas, descarga = excluded.descarga, acceso = excluded.acceso,
    nivel = excluded.nivel, area_uni = excluded.area_uni, curso_nombre = excluded.curso_nombre;
  return jsonb_build_object('id', v_id);
end $$;
revoke all on function public.guardar_libro(jsonb) from public, anon;
grant execute on function public.guardar_libro(jsonb) to authenticated;

create or replace function public.libros_admin()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.puede('biblioteca') then raise exception 'no autorizado'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', l.id, 'titulo', l.titulo, 'subtitulo', l.subtitulo, 'curso', l.curso, 'drive', l.drive,
      'paginas', l.paginas, 'orden', l.orden, 'visible', l.visible, 'creado', l.creado,
      'portada', l.portada, 'tipo', l.tipo, 'autor', l.autor, 'descr', l.descr, 'coleccion', l.coleccion,
      'destacado', l.destacado, 'etiquetas', l.etiquetas, 'descarga', l.descarga, 'acceso', l.acceso,
      'nivel', l.nivel, 'area_uni', l.area_uni, 'curso_nombre', l.curso_nombre,
      'lectores', (select count(*) from public.biblioteca_lectura r where r.libro = l.id)
    ) order by l.curso, l.orden, l.creado)
    from public.biblioteca_libro l), '[]');
end $$;
revoke all on function public.libros_admin() from public, anon;
grant execute on function public.libros_admin() to authenticated;
