-- =========================================================
-- Modo Cachimbo · Permisos nuevos para ayudantes y Regalos por ID
-- Correr una vez en Supabase → SQL Editor (se puede repetir sin problema).
-- Necesita 41-recursos-coleccion.sql y 42-biblioteca.sql.
--
--   · Permisos nuevos para ayudantes: Recursos, Biblioteca y Regalos.
--     Las funciones del panel de Recursos y Biblioteca (y subir fotos
--     a la carpeta «recursos») ya no piden ser admin, sino ese permiso.
--   · Regalos: un admin o un ayudante con permiso «Regalos» le da a un
--     alumno, por su ID de 5 dígitos:
--       - Corazones extra (paquete): se suman a sus 5, no se pierden a
--         medianoche y se gastan primero.
--       - Corazones infinitos por un tiempo (horas o días): no pierde
--         corazones mientras dure.
--       - XP: sube su nivel y su saldo para canjear, pero no cuenta en
--         el Top de la semana (para que el ranking siga siendo justo).
--       - Un ítem de Mi colección.
--     El alumno ve un aviso la próxima vez que entra. Cada regalo queda
--     en la tabla regalos y en el Historial del panel.
-- =========================================================

-- ---------- Permisos ----------
create or replace function public.permisos_validos()
returns text[] language sql immutable set search_path = '' as $$
  select array['reportes','editar','borrar','corr','subir','examen','vocab','cursos',
               'perfil','frases','alertas','tutorial','alumnos','simulacro','codigos','ciclos','topxp','agenda','tematicas',
               'recursos','biblioteca','regalos'];
$$;

-- Fotos de la carpeta «recursos»: admins y ayudantes de Recursos o Biblioteca
drop policy if exists "recursos: subir" on storage.objects;
create policy "recursos: subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'recursos' and (public.puede('recursos') or public.puede('biblioteca')));
drop policy if exists "recursos: cambiar" on storage.objects;
create policy "recursos: cambiar" on storage.objects for update to authenticated
  using (bucket_id = 'recursos' and (public.puede('recursos') or public.puede('biblioteca')));
drop policy if exists "recursos: borrar" on storage.objects;
create policy "recursos: borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'recursos' and (public.puede('recursos') or public.puede('biblioteca')));

drop policy if exists "colecciones: ver" on public.biblioteca_coleccion;
create policy "colecciones: ver" on public.biblioteca_coleccion for select to authenticated using (visible or public.puede('biblioteca'));
drop policy if exists "libros: ver" on public.biblioteca_libro;
create policy "libros: ver" on public.biblioteca_libro for select to authenticated using (visible or public.puede('biblioteca'));

-- Funciones de Recursos y Biblioteca, ahora con su permiso
create or replace function public.guardar_recurso(p jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id   text := lower(coalesce(nullif(trim(p ->> 'id'), ''), 'rec-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8)));
  v_esp  text := coalesce(p ->> 'espacio', 'racha');
  v_nom  text := left(trim(coalesce(p ->> 'nom', '')), 40);
  v_rar  text := coalesce(p ->> 'rareza', 'comun');
  v_img  text := nullif(trim(coalesce(p ->> 'img', '')), '');
  v_tema jsonb := case when jsonb_typeof(p -> 'tema') = 'array' then p -> 'tema' end;
  v_lla  jsonb := case when jsonb_typeof(p -> 'llama') = 'array' then p -> 'llama' end;
  v_reg  jsonb := coalesce(p -> 'regla', '{"tipo":"gratis"}');
  v_tipo text := v_reg ->> 'tipo';
  v_n    int;
begin
  if not public.puede('recursos') then raise exception 'no autorizado'; end if;
  if v_id !~ '^rec-[a-z0-9-]{1,40}$' then raise exception 'id no válido'; end if;
  if exists (select 1 from public.coleccion_item i where i.id = v_id and not i.recurso) then raise exception 'ese id es de la colección fija'; end if;
  if exists (select 1 from public.coleccion_item i where i.id = v_id and i.espacio <> v_esp) then raise exception 'no se puede cambiar el tipo'; end if;
  if v_esp not in ('racha', 'avatar', 'pines', 'marco', 'cuadro', 'titulo') then raise exception 'tipo no válido'; end if;
  if v_nom = '' then raise exception 'falta el nombre'; end if;
  if v_rar not in ('comun', 'raro', 'epico', 'legendario', 'evento') then raise exception 'rareza no válida'; end if;

  -- Imagen: solo del Storage «recursos»; la necesitan fondos, fotos y pines (los marcos, si no van con colores)
  if v_img is not null and v_img !~ '^https://[a-z0-9.-]+/storage/v1/object/public/recursos/[A-Za-z0-9/_.-]+$' then raise exception 'imagen no válida'; end if;
  if v_esp in ('racha', 'avatar', 'pines') and v_img is null then raise exception 'falta la imagen'; end if;
  if v_esp in ('cuadro', 'titulo') then v_img := null; end if;
  if v_esp = 'avatar' then v_tema := null; end if;
  if v_esp = 'titulo' then v_tema := null; end if;
  if v_esp = 'marco' and v_img is not null then v_tema := null; end if;
  if v_esp <> 'cuadro' then v_lla := null; end if;

  -- Colores: fondos, pines y cuadros llevan 4; un marco sin imagen lleva 3
  if v_esp in ('racha', 'pines', 'cuadro') or (v_esp = 'marco' and v_img is null) then
    if v_tema is null or jsonb_array_length(v_tema) <> (case when v_esp = 'marco' then 3 else 4 end)
       or exists (select 1 from jsonb_array_elements_text(v_tema) c where c !~ '^#[0-9a-fA-F]{6}$') then
      raise exception 'faltan los colores';
    end if;
  end if;
  if v_esp = 'cuadro' and (v_lla is null or jsonb_array_length(v_lla) <> 2
       or exists (select 1 from jsonb_array_elements_text(v_lla) c where c !~ '^#[0-9a-fA-F]{6}$')) then
    raise exception 'faltan los colores del fuego';
  end if;

  if v_tipo = 'gratis' or v_tipo = 'regalo' then
    v_reg := jsonb_build_object('tipo', v_tipo);
  elsif v_tipo = 'racha' then
    v_n := (v_reg ->> 'n')::int;
    if v_n is null or v_n < 1 or v_n > 1000 then raise exception 'días de racha no válidos'; end if;
    v_reg := jsonb_build_object('tipo', 'racha', 'n', v_n);
  elsif v_tipo = 'rango' then
    v_n := (v_reg ->> 'n')::int;
    if v_n is null or v_n < 0 or v_n > 4 then raise exception 'rango no válido'; end if;
    v_reg := jsonb_build_object('tipo', 'rango', 'n', v_n);
  else
    raise exception 'regla no válida';
  end if;

  insert into public.coleccion_item (id, espacio, regla, visible, recurso, nom, rareza, img, tema, llama, descr)
  values (v_id, v_esp, v_reg, coalesce((p ->> 'visible')::boolean, true), true, v_nom, v_rar, v_img, v_tema, v_lla,
          nullif(left(trim(coalesce(p ->> 'descr', '')), 140), ''))
  on conflict (id) do update set
    regla = excluded.regla, visible = excluded.visible, nom = excluded.nom, rareza = excluded.rareza,
    img = excluded.img, tema = excluded.tema, llama = excluded.llama, descr = excluded.descr;
  return jsonb_build_object('id', v_id);
end $$;
revoke all on function public.guardar_recurso(jsonb) from public, anon;
grant execute on function public.guardar_recurso(jsonb) to authenticated;

create or replace function public.recursos_admin()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.puede('recursos') then raise exception 'no autorizado'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', i.id, 'espacio', i.espacio, 'regla', i.regla, 'visible', i.visible, 'nom', i.nom, 'rareza', i.rareza,
      'img', i.img, 'tema', i.tema, 'llama', i.llama, 'descr', i.descr, 'creado', i.creado,
      'regalados', (select count(*) from public.coleccion_mia m where m.item = i.id),
      'puestos', (select count(*) from public.coleccion_puesto c
                   where case when i.espacio = 'pines' then coalesce(c.puesto -> 'pines', '[]') ? i.id else c.puesto ->> i.espacio = i.id end)
    ) order by i.creado desc)
    from public.coleccion_item i where i.recurso), '[]');
end $$;
revoke all on function public.recursos_admin() from public, anon;
grant execute on function public.recursos_admin() to authenticated;

create or replace function public.borrar_recurso(p_id text)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.puede('recursos') then raise exception 'no autorizado'; end if;
  update public.coleccion_puesto c
     set puesto = jsonb_set(c.puesto, '{pines}', (select coalesce(jsonb_agg(x), '[]') from jsonb_array_elements_text(c.puesto -> 'pines') x where x <> p_id))
   where jsonb_typeof(c.puesto -> 'pines') = 'array' and c.puesto -> 'pines' ? p_id;
  delete from public.coleccion_item i where i.id = p_id and i.recurso;
end $$;
revoke all on function public.borrar_recurso(text) from public, anon;
grant execute on function public.borrar_recurso(text) to authenticated;

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

create or replace function public.borrar_coleccion_libros(p_id text)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.puede('biblioteca') then raise exception 'no autorizado'; end if;
  delete from public.biblioteca_coleccion c where c.id = p_id;
end $$;
revoke all on function public.borrar_coleccion_libros(text) from public, anon;
grant execute on function public.borrar_coleccion_libros(text) to authenticated;

-- ---------- Regalos ----------
alter table public.corazones add column if not exists extra integer not null default 0;
alter table public.corazones add column if not exists infinito_hasta timestamptz;

-- XP regalado: cuenta para el nivel, no para el Top de la semana
create table if not exists public.xp_regalo (
  usuario uuid primary key references auth.users (id) on delete cascade,
  xp      bigint not null default 0
);
alter table public.xp_regalo enable row level security;

create table if not exists public.regalos (
  id        bigserial primary key,
  usuario   uuid not null references auth.users (id) on delete cascade,
  tipo      text not null check (tipo in ('corazones', 'infinito', 'xp', 'item')),
  cantidad  integer,                 -- corazones, horas de infinito o XP
  item      text,                    -- id del ítem de Mi colección
  nota      text,
  de_email  text,
  de_nombre text,
  visto     boolean not null default false,
  creado    timestamptz not null default now()
);
create index if not exists regalos_usuario on public.regalos (usuario, visto);
alter table public.regalos enable row level security;
drop policy if exists "regalos: míos" on public.regalos;
create policy "regalos: míos" on public.regalos for select to authenticated using (usuario = (select auth.uid()));

-- XP total (nivel) = todas las semanas + lo regalado
create or replace function public.jugador_xp_total(u uuid)
returns bigint language sql stable security definer set search_path = '' as $$
  select (coalesce((select sum(x.xp) from public.xp_semana x where x.usuario = u), 0)
        + coalesce((select g.xp from public.xp_regalo g where g.usuario = u), 0))::bigint;
$$;
revoke all on function public.jugador_xp_total(uuid) from public, anon, authenticated;

create or replace function public.mi_tarjeta()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid   uuid := auth.uid();
  cod   integer;
  correo text := lower(auth.jwt() ->> 'email');
  i     integer := 0;
begin
  if uid is null then return null; end if;
  select j.codigo into cod from public.jugador_id j where j.usuario = uid;
  while cod is null and i < 50 loop
    i := i + 1;
    begin
      insert into public.jugador_id (usuario, codigo)
      values (uid, 10000 + floor(random() * 89999)::integer)
      returning codigo into cod;
    exception when unique_violation then
      select j.codigo into cod from public.jugador_id j where j.usuario = uid;
    end;
  end loop;
  return jsonb_build_object(
    'codigo', cod,
    'xp_total', public.jugador_xp_total(uid),
    'admin', exists (select 1 from public.admins a where lower(a.email) = correo)
          or exists (select 1 from public.equipo e where e.email = correo and e.activo)
  );
end $$;
revoke all on function public.mi_tarjeta() from public, anon;
grant execute on function public.mi_tarjeta() to authenticated;

create or replace function public.nivel_alumnos()
returns table (email text, codigo integer, xp_total bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.puede('alumnos') then raise exception 'no autorizado'; end if;
  return query
    select u.email::text, j.codigo, public.jugador_xp_total(u.id)
    from auth.users u left join public.jugador_id j on j.usuario = u.id;
end $$;
revoke all on function public.nivel_alumnos() from public, anon;
grant execute on function public.nivel_alumnos() to authenticated;

-- Estado del día (igual que en 20-misiones-canjes.sql) + corazones extra e infinitos.
--   quedan: los del día más los extra (en infinito, al menos 5)
create or replace function public.cz_estado(uid uuid, p_cursos text[] default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  hoy    date := public.cz_hoy();
  desde  timestamptz := (public.cz_hoy())::timestamp at time zone 'America/Lima';
  r      public.corazones;
  k      integer;
  m      jsonb;
  ms     jsonb := '[]'::jsonb;
  nuevas text[] := '{}';
  xps    integer;
  inf    boolean;
begin
  insert into public.corazones (usuario, dia, misiones) values (uid, hoy, public.cz_generar(uid, p_cursos))
  on conflict (usuario) do nothing;
  select * into r from public.corazones where usuario = uid for update;

  if r.dia <> hoy then
    r.dia := hoy; r.quedan := 5; r.recarga := now(); r.simulacro := 'pend'; r.canjes := 0; r.xp_hoy := 0;
    r.misiones := public.cz_generar(uid, p_cursos);
  elsif p_cursos is not null and array_length(p_cursos, 1) > 0
        and exists (select 1 from jsonb_array_elements(r.misiones) e where e ->> 'tipo' = 'explora' and e ->> 'curso' is null) then
    select jsonb_agg(case when e ->> 'tipo' = 'explora'
                          then jsonb_set(e, '{curso}', to_jsonb((public.cz_generar(uid, p_cursos) -> 0) ->> 'curso')) else e end)
      into r.misiones from jsonb_array_elements(r.misiones) e;
  end if;

  if r.quedan < 5 then
    k := floor(extract(epoch from now() - r.recarga) / 10800)::int;
    if k > 0 then
      r.quedan := least(5, r.quedan + k);
      r.recarga := case when r.quedan >= 5 then now() else r.recarga + k * interval '3 hours' end;
    end if;
  end if;

  for m in select value from jsonb_array_elements(r.misiones) loop
    if m ->> 'tipo' = 'duelo' and m ->> 'estado' = 'pend'
       and exists (select 1 from public.duelo_jugadas j where j.usuario = uid and j.terminado >= desde) then
      m := m || jsonb_build_object('hecho', 1, 'estado', 'lista');
      r.xp_saldo := r.xp_saldo + 20;
      insert into public.xp_semana (usuario, semana, xp) values (uid, public.cz_lunes(), 20)
      on conflict (usuario, semana) do update set xp = public.xp_semana.xp + 20;
    end if;
    if m ->> 'estado' = 'lista' and r.quedan < 5 then
      r.quedan := r.quedan + 1;
      m := m || jsonb_build_object('estado', 'cobrada');
      nuevas := nuevas || (m ->> 'tipo');
    end if;
    ms := ms || m;
  end loop;
  r.misiones := ms;

  if r.simulacro = 'pend' and exists (select 1 from public.simulacro_intentos s where s.usuario = uid and s.creado >= desde) then
    r.simulacro := 'lista';
  end if;
  if r.simulacro = 'lista' and r.quedan < 5 then
    r.quedan := 5; r.recarga := now(); r.simulacro := 'cobrada'; nuevas := nuevas || 'simulacro'::text;
  end if;

  update public.corazones set dia = r.dia, quedan = r.quedan, recarga = r.recarga, misiones = r.misiones, simulacro = r.simulacro,
    canjes = r.canjes, xp_hoy = r.xp_hoy, xp_saldo = r.xp_saldo, actualizado = now() where usuario = uid;
  select coalesce(x.xp, 0) into xps from (select 1) d left join public.xp_semana x on x.usuario = uid and x.semana = public.cz_lunes();
  inf := r.infinito_hasta is not null and r.infinito_hasta > now();

  return jsonb_build_object(
    'quedan', case when inf then greatest(5, r.quedan + r.extra) else r.quedan + r.extra end, 'max', 5,
    'extra', r.extra, 'infinito', inf, 'infinito_hasta', case when inf then r.infinito_hasta end,
    'proximo', case when r.quedan < 5 then greatest(0, ceil(10800 - extract(epoch from now() - r.recarga)))::int end,
    'misiones', r.misiones, 'simulacro', r.simulacro, 'nuevas', to_jsonb(nuevas),
    'xp_semana', xps, 'xp_saldo', r.xp_saldo, 'canjes', r.canjes, 'canjes_max', 5, 'precio', 150
  );
end $$;
revoke all on function public.cz_estado(uuid, text[]) from public, anon, authenticated;

-- Un error: con infinito no pasa nada; si tiene extra, se gasta uno de esos primero
create or replace function public.perder_corazon()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); r public.corazones;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  perform public.cz_estado(uid);
  select * into r from public.corazones where usuario = uid for update;
  if r.infinito_hasta is not null and r.infinito_hasta > now() then return public.cz_estado(uid); end if;
  if r.extra > 0 then
    update public.corazones set extra = extra - 1, actualizado = now() where usuario = uid;
    return public.cz_estado(uid);
  end if;
  update public.corazones set recarga = case when quedan = 5 then now() else recarga end,
    quedan = greatest(quedan - 1, 0), actualizado = now() where usuario = uid;
  update public.corazones set misiones = (
      select jsonb_agg(case when e ->> 'tipo' = 'repaso' and e ->> 'estado' = 'pend' then e || '{"hecho":0}'::jsonb else e end)
      from jsonb_array_elements(misiones) e)
    where usuario = uid and quedan = 0 and jsonb_array_length(misiones) > 0;
  return public.cz_estado(uid);
end $$;
revoke all on function public.perder_corazon() from public, anon;
grant execute on function public.perder_corazon() to authenticated;

-- Lo que pide la web: estado del día y los regalos que aún no vio
create or replace function public.mis_corazones(p_cursos text[] default null, p_repaso boolean default false)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v jsonb; g jsonb;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  perform set_config('mc.repaso', coalesce(p_repaso, false)::text, true);
  v := public.cz_estado(uid, (select array_agg(x) from unnest(p_cursos) with ordinality u(x, i) where i <= 80));
  select jsonb_agg(jsonb_build_object('tipo', x.tipo, 'cantidad', x.cantidad, 'item', x.item, 'nota', x.nota, 'de', x.de_nombre) order by x.id)
    into g from public.regalos x where x.usuario = uid and not x.visto;
  update public.regalos set visto = true where usuario = uid and not visto;
  return v || jsonb_build_object('regalos', coalesce(g, '[]'::jsonb));
end $$;
revoke all on function public.mis_corazones(text[], boolean) from public, anon;
grant execute on function public.mis_corazones(text[], boolean) to authenticated;

-- Panel → Regalos: buscar un alumno por su ID
create or replace function public.regalo_buscar(p_codigo integer)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare u uuid; e jsonb;
begin
  if not public.puede('regalos') then raise exception 'no autorizado'; end if;
  select j.usuario into u from public.jugador_id j where j.codigo = p_codigo;
  if u is null then return null; end if;
  e := public.cz_estado(u);
  return jsonb_build_object(
    'codigo', p_codigo,
    'email', (select lower(a.email) from auth.users a where a.id = u),
    'apodo', public.duelo_apodo(u),
    'foto', (select p.foto_url from public.perfiles p where p.id = u and p.foto_url like 'https://%'),
    'xp_total', public.jugador_xp_total(u),
    'xp_saldo', e -> 'xp_saldo', 'quedan', e -> 'quedan', 'extra', e -> 'extra', 'infinito_hasta', e -> 'infinito_hasta',
    'historial', coalesce((select jsonb_agg(jsonb_build_object('tipo', x.tipo, 'cantidad', x.cantidad, 'item', x.item, 'nota', x.nota,
                    'de', coalesce(x.de_nombre, x.de_email), 'creado', x.creado) order by x.id desc)
                  from (select * from public.regalos r where r.usuario = u order by r.id desc limit 15) x), '[]'::jsonb)
  );
end $$;
revoke all on function public.regalo_buscar(integer) from public, anon;
grant execute on function public.regalo_buscar(integer) to authenticated;

-- Panel → Regalos: dar un regalo a un alumno por su ID
--   p_tipo: corazones (1 a 50) | infinito (horas, 1 a 720) | xp (1 a 10000) | item (p_item)
create or replace function public.regalar(p_codigo integer, p_tipo text, p_cantidad integer default null, p_item text default null, p_nota text default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  u    uuid;
  n    integer := coalesce(p_cantidad, 0);
  nota text := nullif(left(trim(coalesce(p_nota, '')), 140), '');
  yo   text := lower(auth.jwt() ->> 'email');
  nom  text;
  txt  text;
begin
  if not public.puede('regalos') then raise exception 'no autorizado'; end if;
  select j.usuario into u from public.jugador_id j where j.codigo = p_codigo;
  if u is null then raise exception 'No hay ningún alumno con el ID %', p_codigo; end if;
  select e.nombre into nom from public.equipo e where e.email = yo;
  perform public.cz_estado(u);
  if p_tipo = 'corazones' then
    if n < 1 or n > 50 then raise exception 'Elige de 1 a 50 corazones'; end if;
    update public.corazones set extra = least(extra + n, 999), actualizado = now() where usuario = u;
    txt := n || ' corazón' || case when n = 1 then '' else 'es' end;
  elsif p_tipo = 'infinito' then
    if n < 1 or n > 720 then raise exception 'Elige de 1 hora a 30 días'; end if;
    update public.corazones set infinito_hasta = greatest(coalesce(infinito_hasta, now()), now()) + n * interval '1 hour', actualizado = now()
     where usuario = u;
    txt := 'corazones infinitos por ' || case when n % 24 = 0 then (n / 24) || ' día' || case when n = 24 then '' else 's' end
                                             else n || ' hora' || case when n = 1 then '' else 's' end end;
  elsif p_tipo = 'xp' then
    if n < 1 or n > 10000 then raise exception 'Elige de 1 a 10 000 XP'; end if;
    insert into public.xp_regalo (usuario, xp) values (u, n) on conflict (usuario) do update set xp = public.xp_regalo.xp + excluded.xp;
    update public.corazones set xp_saldo = xp_saldo + n, actualizado = now() where usuario = u;
    txt := n || ' XP';
  elsif p_tipo = 'item' then
    if not exists (select 1 from public.coleccion_item i where i.id = p_item) then raise exception 'Ese ítem no existe'; end if;
    insert into public.coleccion_mia (usuario, item, origen, mensaje) values (u, p_item, 'regalo', nota)
    on conflict (usuario, item) do nothing;
    if not found then raise exception 'Ese alumno ya tiene ese ítem'; end if;
    n := null;
    txt := 'el ítem ' || coalesce((select i.nom from public.coleccion_item i where i.id = p_item), p_item);
  else
    raise exception 'tipo de regalo no válido';
  end if;
  insert into public.regalos (usuario, tipo, cantidad, item, nota, de_email, de_nombre)
  values (u, p_tipo, n, case when p_tipo = 'item' then p_item end, nota, yo, nom);
  perform public.anotar('Regalos', 'Regaló ' || txt || ' al ID ' || p_codigo,
    jsonb_build_object('codigo', p_codigo, 'tipo', p_tipo, 'cantidad', n, 'item', p_item, 'nota', nota));
  return public.regalo_buscar(p_codigo);
end $$;
revoke all on function public.regalar(integer, text, integer, text, text) from public, anon;
grant execute on function public.regalar(integer, text, integer, text, text) to authenticated;
