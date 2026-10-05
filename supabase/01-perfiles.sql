-- =========================================================
-- Modo Cachimbo · Etapa 1: perfiles de alumnos
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- =========================================================

create table if not exists public.perfiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  nombre        text check (char_length(nombre) <= 80),
  apodo         text check (char_length(apodo) <= 30),
  foto_url      text check (char_length(foto_url) <= 500),
  carrera       text check (char_length(carrera) <= 80),
  modalidad     text check (modalidad in ('Ordinario', 'CPU')),
  fecha_examen  date,
  celular       text check (celular ~ '^[0-9]{9}$'),
  creado        timestamptz not null default now(),
  actualizado   timestamptz not null default now()
);

-- Cada alumno solo ve y edita su propio perfil
alter table public.perfiles enable row level security;

drop policy if exists "perfil propio: ver" on public.perfiles;
create policy "perfil propio: ver" on public.perfiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "perfil propio: crear" on public.perfiles;
create policy "perfil propio: crear" on public.perfiles
  for insert to authenticated with check ((select auth.uid()) = id);

drop policy if exists "perfil propio: editar" on public.perfiles;
create policy "perfil propio: editar" on public.perfiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Fecha de última edición automática
create or replace function public.perfiles_actualizado()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.actualizado := now();
  return new;
end $$;

drop trigger if exists perfiles_actualizado on public.perfiles;
create trigger perfiles_actualizado before update on public.perfiles
  for each row execute function public.perfiles_actualizado();

-- Al registrarse alguien nuevo, se le crea su perfil con el nombre
-- y la foto que trae de Google (si entró por correo, quedan vacíos)
create or replace function public.crear_perfil()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfiles (id, nombre, foto_url)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 80),
    left(new.raw_user_meta_data ->> 'avatar_url', 500)
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists al_registrarse on auth.users;
create trigger al_registrarse after insert on auth.users
  for each row execute function public.crear_perfil();
