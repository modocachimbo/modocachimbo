-- =========================================================
-- Modo Cachimbo · Biblioteca (libros en PDF desde Google Drive)
-- Correr una vez en Supabase → SQL Editor (se puede repetir sin problema).
-- Necesita 40-recursos.sql (la carpeta «recursos» del Storage, para las portadas).
--
--   · Los PDF viven en tu Google Drive, compartidos como «Cualquier persona
--     con el enlace». En el panel → Biblioteca pegas el link y aquí se
--     guarda solo su id de Drive, con el título, el curso y las páginas.
--   · biblioteca.html los abre en el visor de la web (PDF.js), sin salir
--     de Modo Cachimbo, y guarda en qué página se quedó cada alumno
--     («Seguir leyendo») y sus marcadores.
--   · La portada es una foto que subes desde el panel (Storage «recursos»,
--     carpeta portadas/, WebP 600×840). Sin foto se dibuja una con el color del curso.
--   · Colecciones: agrupan libros de varios cursos (p. ej. «Formularios»,
--     «Pack Ordinario 2027-I») y salen como estantes propios.
--   · Cada libro tiene tipo (libro, formulario, solucionario…), autor,
--     etiquetas para el buscador, destacado (sale grande arriba),
--     si se puede descargar y si pide código de alumno.
-- =========================================================

-- Colecciones de libros
create table if not exists public.biblioteca_coleccion (
  id          text primary key default 'col-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8),
  nombre      text not null,
  descripcion text,
  color       text not null default '#CE82FF',
  orden       int not null default 0,
  visible     boolean not null default true,
  creado      timestamptz not null default now()
);
alter table public.biblioteca_coleccion enable row level security;
drop policy if exists "colecciones: ver" on public.biblioteca_coleccion;
create policy "colecciones: ver" on public.biblioteca_coleccion for select to authenticated using (visible or public.puede('biblioteca'));

create table if not exists public.biblioteca_libro (
  id        text primary key default 'lib-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8),
  titulo    text not null,
  subtitulo text,
  curso     text not null,                -- id de assets/cursos.json (algebra, fisica…)
  drive     text not null,                -- id del archivo en Google Drive
  paginas   int,
  orden     int not null default 0,
  visible   boolean not null default true,
  creado    timestamptz not null default now()
);
alter table public.biblioteca_libro add column if not exists portada   text;      -- URL pública del Storage
alter table public.biblioteca_libro add column if not exists tipo      text not null default 'libro';
alter table public.biblioteca_libro add column if not exists autor     text;
alter table public.biblioteca_libro add column if not exists descr     text;
alter table public.biblioteca_libro add column if not exists coleccion text references public.biblioteca_coleccion (id) on delete set null;
alter table public.biblioteca_libro add column if not exists destacado boolean not null default false;
alter table public.biblioteca_libro add column if not exists etiquetas text[] not null default '{}';
alter table public.biblioteca_libro add column if not exists descarga  boolean not null default false;
alter table public.biblioteca_libro add column if not exists acceso    text not null default 'libre';  -- libre | codigo
alter table public.biblioteca_libro enable row level security;
-- Los alumnos con sesión ven los visibles; los admins ven todos
drop policy if exists "libros: ver" on public.biblioteca_libro;
create policy "libros: ver" on public.biblioteca_libro for select to authenticated using (visible or public.puede('biblioteca'));

-- Dónde se quedó cada alumno en cada libro, y sus marcadores
create table if not exists public.biblioteca_lectura (
  usuario    uuid not null references auth.users (id) on delete cascade,
  libro      text not null references public.biblioteca_libro (id) on delete cascade,
  pagina     int not null default 1,
  marcas     int[] not null default '{}',
  leido      timestamptz not null default now(),
  primary key (usuario, libro)
);
alter table public.biblioteca_lectura enable row level security;
drop policy if exists "lectura: mía" on public.biblioteca_lectura;
create policy "lectura: mía" on public.biblioteca_lectura for all to authenticated
  using (usuario = auth.uid()) with check (usuario = auth.uid());

-- Guardar un libro (nuevo o editado). Solo admins.
--   p: { id, titulo, subtitulo, curso, drive, paginas, orden, visible, portada, tipo, autor, descr,
--        coleccion, destacado, etiquetas: [..], descarga, acceso }
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
  if v_col is not null and not exists (select 1 from public.biblioteca_coleccion c where c.id = v_col) then raise exception 'esa colección no existe'; end if;
  insert into public.biblioteca_libro (id, titulo, subtitulo, curso, drive, paginas, orden, visible, portada, tipo, autor, descr, coleccion, destacado, etiquetas, descarga, acceso)
  values (v_id, v_tit, nullif(left(trim(coalesce(p ->> 'subtitulo', '')), 80), ''), v_curso, v_drive,
          nullif((p ->> 'paginas')::int, 0), coalesce((p ->> 'orden')::int, 0), coalesce((p ->> 'visible')::boolean, true),
          v_por, v_tipo, nullif(left(trim(coalesce(p ->> 'autor', '')), 80), ''), nullif(left(trim(coalesce(p ->> 'descr', '')), 400), ''),
          v_col, coalesce((p ->> 'destacado')::boolean, false), v_etq, coalesce((p ->> 'descarga')::boolean, false), v_acc)
  on conflict (id) do update set
    titulo = excluded.titulo, subtitulo = excluded.subtitulo, curso = excluded.curso, drive = excluded.drive,
    paginas = excluded.paginas, orden = excluded.orden, visible = excluded.visible, portada = excluded.portada,
    tipo = excluded.tipo, autor = excluded.autor, descr = excluded.descr, coleccion = excluded.coleccion,
    destacado = excluded.destacado, etiquetas = excluded.etiquetas, descarga = excluded.descarga, acceso = excluded.acceso;
  return jsonb_build_object('id', v_id);
end $$;
revoke all on function public.guardar_libro(jsonb) from public, anon;
grant execute on function public.guardar_libro(jsonb) to authenticated;

-- Los libros para el panel, con cuántos alumnos lo abrieron
create or replace function public.libros_admin()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.puede('biblioteca') then raise exception 'no autorizado'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', l.id, 'titulo', l.titulo, 'subtitulo', l.subtitulo, 'curso', l.curso, 'drive', l.drive,
      'paginas', l.paginas, 'orden', l.orden, 'visible', l.visible, 'creado', l.creado,
      'portada', l.portada, 'tipo', l.tipo, 'autor', l.autor, 'descr', l.descr, 'coleccion', l.coleccion,
      'destacado', l.destacado, 'etiquetas', l.etiquetas, 'descarga', l.descarga, 'acceso', l.acceso,
      'lectores', (select count(*) from public.biblioteca_lectura r where r.libro = l.id)
    ) order by l.curso, l.orden, l.creado)
    from public.biblioteca_libro l), '[]');
end $$;
revoke all on function public.libros_admin() from public, anon;
grant execute on function public.libros_admin() to authenticated;

create or replace function public.borrar_libro(p_id text)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.puede('biblioteca') then raise exception 'no autorizado'; end if;
  delete from public.biblioteca_libro l where l.id = p_id;
end $$;
revoke all on function public.borrar_libro(text) from public, anon;
grant execute on function public.borrar_libro(text) to authenticated;

-- Guardar una colección (nueva o editada). Solo admins.
--   p: { id, nombre, descripcion, color, orden, visible }
create or replace function public.guardar_coleccion_libros(p jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id  text := coalesce(nullif(trim(coalesce(p ->> 'id', '')), ''), 'col-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8));
  v_nom text := left(trim(coalesce(p ->> 'nombre', '')), 60);
  v_col text := coalesce(nullif(p ->> 'color', ''), '#CE82FF');
begin
  if not public.puede('biblioteca') then raise exception 'no autorizado'; end if;
  if v_id !~ '^col-[a-z0-9-]{1,40}$' then raise exception 'id no válido'; end if;
  if v_nom = '' then raise exception 'falta el nombre'; end if;
  if v_col !~ '^#[0-9a-fA-F]{6}$' then raise exception 'color no válido'; end if;
  insert into public.biblioteca_coleccion (id, nombre, descripcion, color, orden, visible)
  values (v_id, v_nom, nullif(left(trim(coalesce(p ->> 'descripcion', '')), 200), ''), v_col,
          coalesce((p ->> 'orden')::int, 0), coalesce((p ->> 'visible')::boolean, true))
  on conflict (id) do update set nombre = excluded.nombre, descripcion = excluded.descripcion,
    color = excluded.color, orden = excluded.orden, visible = excluded.visible;
  return jsonb_build_object('id', v_id);
end $$;
revoke all on function public.guardar_coleccion_libros(jsonb) from public, anon;
grant execute on function public.guardar_coleccion_libros(jsonb) to authenticated;

-- Borrar una colección: sus libros se quedan, sin colección
create or replace function public.borrar_coleccion_libros(p_id text)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.puede('biblioteca') then raise exception 'no autorizado'; end if;
  delete from public.biblioteca_coleccion c where c.id = p_id;
end $$;
revoke all on function public.borrar_coleccion_libros(text) from public, anon;
grant execute on function public.borrar_coleccion_libros(text) to authenticated;
