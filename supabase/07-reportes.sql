-- =========================================================
-- Modo Cachimbo · Mis reportes de claves (en Mi perfil)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita haber corrido antes supabase/03-novedades.sql (es_admin).
--
-- Cuando un alumno reporta una clave, además de llegar a la hoja
-- de Google se guarda aquí, para que vea en su perfil cómo va:
--   Enviado → Recibido (abriste Reportes en el panel)
--           → Corregido (corregiste la pregunta) o Denegado (Descartar)
-- =========================================================

create table if not exists public.reportes_alumno (
  id          bigint generated always as identity primary key,
  usuario     uuid not null references auth.users (id) on delete cascade,
  carpeta     text not null,
  anio        text not null,
  tema        text not null,
  pregunta    integer not null,
  extracto    text,
  sugerida    text,
  estado      text not null default 'Enviado' check (estado in ('Enviado', 'Recibido', 'Corregido', 'Denegado')),
  creado      timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create index if not exists reportes_alumno_usuario on public.reportes_alumno (usuario, creado desc);
create index if not exists reportes_alumno_pregunta on public.reportes_alumno (carpeta, anio, tema, pregunta);
alter table public.reportes_alumno enable row level security;
drop policy if exists "reportes propios: ver" on public.reportes_alumno;
create policy "reportes propios: ver" on public.reportes_alumno
  for select to authenticated using ((select auth.uid()) = usuario);
-- Nadie escribe directo: solo con las funciones de abajo

-- El alumno guarda su reporte (máximo 30 por día)
create or replace function public.crear_reporte(p jsonb)
returns bigint language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); nuevo bigint;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if (select count(*) from public.reportes_alumno r where r.usuario = uid and r.creado > now() - interval '1 day') >= 30 then
    raise exception 'demasiados reportes hoy';
  end if;
  if coalesce(p ->> 'carpeta', '') !~ '^[a-z0-9-]{2,40}$' or coalesce(p ->> 'pregunta', '') !~ '^\d{1,4}$' then
    raise exception 'datos incompletos';
  end if;
  insert into public.reportes_alumno (usuario, carpeta, anio, tema, pregunta, extracto, sugerida)
  values (uid, p ->> 'carpeta', left(coalesce(p ->> 'anio', ''), 40), left(coalesce(p ->> 'tema', ''), 6),
          (p ->> 'pregunta')::integer, left(p ->> 'extracto', 220), left(p ->> 'sugerida', 160))
  returning id into nuevo;
  return nuevo;
end $$;
revoke all on function public.crear_reporte(jsonb) from public, anon;
grant execute on function public.crear_reporte(jsonb) to authenticated;

-- Panel: abriste Reportes → los enviados pasan a Recibido
create or replace function public.reportes_recibidos()
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare n integer;
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  update public.reportes_alumno set estado = 'Recibido', actualizado = now() where estado = 'Enviado';
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.reportes_recibidos() from public, anon;
grant execute on function public.reportes_recibidos() to authenticated;

-- Panel: corregiste o descartaste una pregunta → cambia el estado de sus reportes abiertos
-- p_estado: 'Corregido' | 'Denegado' | 'Recibido' (volver a pendiente)
create or replace function public.estado_reporte(p_carpeta text, p_anio text, p_tema text, p_pregunta integer, p_estado text)
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare n integer;
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  if p_estado not in ('Corregido', 'Denegado', 'Recibido') then raise exception 'estado no válido'; end if;
  update public.reportes_alumno r set estado = p_estado, actualizado = now()
   where r.carpeta = p_carpeta and r.anio = p_anio and ltrim(r.tema, '0') = ltrim(p_tema, '0') and r.pregunta = p_pregunta
     and (case when p_estado = 'Recibido' then r.estado <> 'Recibido' else r.estado in ('Enviado', 'Recibido') end);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.estado_reporte(text, text, text, integer, text) from public, anon;
grant execute on function public.estado_reporte(text, text, text, integer, text) to authenticated;
