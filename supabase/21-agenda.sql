-- =========================================================
-- 21 · Agenda: fechas importantes con calendario
-- Correr una vez en Supabase → SQL Editor (se puede repetir sin problema).
-- Va después de 14-equipo.sql y 19-top-xp.sql.
--
--   · agenda_alumno: las fechas que anota cada alumno (solo él las ve,
--     edita y borra).
--   · agenda_general: las fechas que programa el panel para todos,
--     solo Ordinario o solo CPU. El alumno las ve con candado.
--   · La "Fecha de tu examen" del perfil pasa a la agenda como Examen.
--   · Permiso "Agenda" para ayudantes.
-- =========================================================

create table if not exists public.agenda_alumno (
  id      bigint generated always as identity primary key,
  usuario uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tipo    text not null default 'otro' check (tipo in ('examen', 'seminario', 'simulacro', 'tarea', 'otro')),
  titulo  text not null check (char_length(titulo) between 1 and 80),
  fecha   date not null,
  hora    text check (hora ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  nota    text check (char_length(nota) <= 200),
  aviso   integer not null default 3 check (aviso in (0, 1, 3, 7)),   -- el búho avisa desde X días antes
  creado  timestamptz not null default now()
);
create index if not exists agenda_alumno_usuario on public.agenda_alumno (usuario, fecha);
revoke all on public.agenda_alumno from anon;
grant select, insert, update, delete on public.agenda_alumno to authenticated;
alter table public.agenda_alumno enable row level security;
drop policy if exists "agenda propia: ver" on public.agenda_alumno;
create policy "agenda propia: ver" on public.agenda_alumno
  for select to authenticated using ((select auth.uid()) = usuario);
drop policy if exists "agenda propia: crear" on public.agenda_alumno;
create policy "agenda propia: crear" on public.agenda_alumno
  for insert to authenticated with check ((select auth.uid()) = usuario);
drop policy if exists "agenda propia: editar" on public.agenda_alumno;
create policy "agenda propia: editar" on public.agenda_alumno
  for update to authenticated using ((select auth.uid()) = usuario) with check ((select auth.uid()) = usuario);
drop policy if exists "agenda propia: borrar" on public.agenda_alumno;
create policy "agenda propia: borrar" on public.agenda_alumno
  for delete to authenticated using ((select auth.uid()) = usuario);

create table if not exists public.agenda_general (
  id      bigint generated always as identity primary key,
  tipo    text not null default 'otro' check (tipo in ('examen', 'seminario', 'simulacro', 'tarea', 'otro')),
  titulo  text not null check (char_length(titulo) between 1 and 80),
  fecha   date not null,
  hora    text check (hora ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  nota    text check (char_length(nota) <= 200),
  para    text not null default 'todos' check (para in ('todos', 'Ordinario', 'CPU')),
  creado  timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create index if not exists agenda_general_fecha on public.agenda_general (fecha);
revoke all on public.agenda_general from anon, authenticated;
grant select on public.agenda_general to authenticated;
alter table public.agenda_general enable row level security;
drop policy if exists "agenda general: ver" on public.agenda_general;
create policy "agenda general: ver" on public.agenda_general
  for select to authenticated using (true);
-- Nadie escribe directo: solo con las funciones de abajo

-- Permiso "Agenda" para ayudantes
create or replace function public.permisos_validos()
returns text[] language sql immutable set search_path = '' as $$
  select array['reportes','editar','borrar','corr','subir','examen','vocab','cursos',
               'perfil','frases','alertas','tutorial','alumnos','simulacro','codigos','ciclos','topxp','agenda'];
$$;

-- Panel: crear o cambiar una fecha para todos. p = { id?, tipo, titulo, fecha, hora, nota, para }
create or replace function public.guardar_agenda_general(p jsonb)
returns bigint language plpgsql volatile security definer set search_path = '' as $$
declare nuevo bigint;
begin
  if not public.puede('agenda') then raise exception 'no autorizado'; end if;
  if nullif(p ->> 'id', '') is null then
    insert into public.agenda_general (tipo, titulo, fecha, hora, nota, para)
    values (coalesce(p ->> 'tipo', 'otro'), trim(p ->> 'titulo'), (p ->> 'fecha')::date,
            nullif(p ->> 'hora', ''), nullif(trim(coalesce(p ->> 'nota', '')), ''), coalesce(p ->> 'para', 'todos'))
    returning id into nuevo;
  else
    update public.agenda_general set tipo = coalesce(p ->> 'tipo', 'otro'), titulo = trim(p ->> 'titulo'),
           fecha = (p ->> 'fecha')::date, hora = nullif(p ->> 'hora', ''),
           nota = nullif(trim(coalesce(p ->> 'nota', '')), ''), para = coalesce(p ->> 'para', 'todos'), actualizado = now()
     where id = (p ->> 'id')::bigint
    returning id into nuevo;
    if nuevo is null then raise exception 'no existe'; end if;
  end if;
  return nuevo;
end $$;
revoke all on function public.guardar_agenda_general(jsonb) from public, anon;
grant execute on function public.guardar_agenda_general(jsonb) to authenticated;

create or replace function public.borrar_agenda_general(p_id bigint)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.puede('agenda') then raise exception 'no autorizado'; end if;
  delete from public.agenda_general where id = p_id;
end $$;
revoke all on function public.borrar_agenda_general(bigint) from public, anon;
grant execute on function public.borrar_agenda_general(bigint) to authenticated;

-- La fecha de examen del perfil pasa a la agenda (una sola vez por alumno y fecha)
insert into public.agenda_alumno (usuario, tipo, titulo, fecha, aviso)
select p.id, 'examen', 'Examen de admisión', p.fecha_examen, 7
  from public.perfiles p
 where p.fecha_examen is not null
   and not exists (select 1 from public.agenda_alumno a
                    where a.usuario = p.id and a.tipo = 'examen' and a.fecha = p.fecha_examen);
