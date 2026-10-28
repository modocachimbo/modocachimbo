-- =========================================================
-- Modo Cachimbo · Biblioteca (libros en PDF desde Google Drive)
-- Correr una vez en Supabase → SQL Editor (se puede repetir sin problema).
--
--   · Los PDF viven en tu Google Drive, compartidos como «Cualquier persona
--     con el enlace». En el panel → Biblioteca pegas el link y aquí se
--     guarda solo su id de Drive, con el título, el curso y las páginas.
--   · biblioteca.html los abre en el visor de la web (PDF.js), sin salir
--     de Modo Cachimbo, y guarda en qué página se quedó cada alumno
--     («Seguir leyendo») y sus marcadores.
-- =========================================================

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
alter table public.biblioteca_libro enable row level security;
-- Los alumnos con sesión ven los visibles; los admins ven todos
drop policy if exists "libros: ver" on public.biblioteca_libro;
create policy "libros: ver" on public.biblioteca_libro for select to authenticated using (visible or public.es_admin());

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
--   p: { id, titulo, subtitulo, curso, drive, paginas, orden, visible }
create or replace function public.guardar_libro(p jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id    text := nullif(trim(coalesce(p ->> 'id', '')), '');
  v_tit   text := left(trim(coalesce(p ->> 'titulo', '')), 80);
  v_curso text := trim(coalesce(p ->> 'curso', ''));
  v_drive text := trim(coalesce(p ->> 'drive', ''));
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  if v_tit = '' then raise exception 'falta el título'; end if;
  if v_curso !~ '^[a-z0-9-]{2,40}$' then raise exception 'curso no válido'; end if;
  if v_drive !~ '^[A-Za-z0-9_-]{20,80}$' then raise exception 'link de Drive no válido'; end if;
  if v_id is null then v_id := 'lib-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8); end if;
  if v_id !~ '^lib-[a-z0-9-]{1,40}$' then raise exception 'id no válido'; end if;
  insert into public.biblioteca_libro (id, titulo, subtitulo, curso, drive, paginas, orden, visible)
  values (v_id, v_tit, nullif(left(trim(coalesce(p ->> 'subtitulo', '')), 80), ''), v_curso, v_drive,
          nullif((p ->> 'paginas')::int, 0), coalesce((p ->> 'orden')::int, 0), coalesce((p ->> 'visible')::boolean, true))
  on conflict (id) do update set
    titulo = excluded.titulo, subtitulo = excluded.subtitulo, curso = excluded.curso, drive = excluded.drive,
    paginas = excluded.paginas, orden = excluded.orden, visible = excluded.visible;
  return jsonb_build_object('id', v_id);
end $$;
revoke all on function public.guardar_libro(jsonb) from public, anon;
grant execute on function public.guardar_libro(jsonb) to authenticated;

-- Los libros para el panel, con cuántos alumnos lo abrieron
create or replace function public.libros_admin()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', l.id, 'titulo', l.titulo, 'subtitulo', l.subtitulo, 'curso', l.curso, 'drive', l.drive,
      'paginas', l.paginas, 'orden', l.orden, 'visible', l.visible, 'creado', l.creado,
      'lectores', (select count(*) from public.biblioteca_lectura r where r.libro = l.id)
    ) order by l.curso, l.orden, l.creado)
    from public.biblioteca_libro l), '[]');
end $$;
revoke all on function public.libros_admin() from public, anon;
grant execute on function public.libros_admin() to authenticated;

create or replace function public.borrar_libro(p_id text)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  delete from public.biblioteca_libro l where l.id = p_id;
end $$;
revoke all on function public.borrar_libro(text) from public, anon;
grant execute on function public.borrar_libro(text) to authenticated;
