-- =========================================================
-- Modo Cachimbo · Flashcards (tarjetas)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita haber corrido antes supabase/03-novedades.sql (es_admin).
--
--   · tarjetas: las que escribe el profesor en el panel
--     (Panel → Editar → tema → Tarjetas). Se ven junto a las que
--     se arman solas con las preguntas del tema.
--     Todos las pueden leer; solo los administradores las cambian.
--   · tarjetas_estado: qué tarjetas ya domina cada alumno y cuándo
--     le toca repasarlas. Una fila por alumno y mazo
--     (curso|sección|año), con un objeto { "05#3": [caja, día] }.
-- =========================================================

create table if not exists public.tarjetas (
  curso    text not null,                  -- ej.: biologia
  seccion  text not null check (seccion in ('libros', 'seminarios', 'banqueo')),
  anio     text not null,                  -- ej.: 2027-I
  tema     text not null,                  -- ej.: 05
  orden    integer not null,
  frente   text not null check (char_length(frente) between 1 and 600),
  reverso  text not null check (char_length(reverso) between 1 and 600),
  primary key (curso, seccion, anio, tema, orden)
);
alter table public.tarjetas enable row level security;
drop policy if exists "tarjetas: ver" on public.tarjetas;
create policy "tarjetas: ver" on public.tarjetas for select to anon, authenticated using (true);
-- Nadie escribe directo: solo con guardar_tarjetas_tema()

-- Reemplaza todas las tarjetas del profesor de un tema.
-- p_lista = [{ "frente": "...", "reverso": "..." }, ...]  (vacía = borrarlas)
create or replace function public.guardar_tarjetas_tema(p_curso text, p_seccion text, p_anio text, p_tema text, p_lista jsonb)
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare
  x jsonb; n integer := 0;
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  if jsonb_typeof(coalesce(p_lista, '[]'::jsonb)) <> 'array' then raise exception 'lista inválida'; end if;
  delete from public.tarjetas t
   where t.curso = p_curso and t.seccion = p_seccion and t.anio = p_anio and t.tema = p_tema;
  for x in select value from jsonb_array_elements(coalesce(p_lista, '[]'::jsonb)) with ordinality a(value, i) where i <= 300 loop
    if btrim(coalesce(x ->> 'frente', '')) <> '' and btrim(coalesce(x ->> 'reverso', '')) <> '' then
      n := n + 1;
      insert into public.tarjetas (curso, seccion, anio, tema, orden, frente, reverso)
      values (left(p_curso, 40), p_seccion, left(p_anio, 40), left(p_tema, 6), n,
              left(btrim(x ->> 'frente'), 600), left(btrim(x ->> 'reverso'), 600));
    end if;
  end loop;
  return n;
end $$;
revoke all on function public.guardar_tarjetas_tema(text, text, text, text, jsonb) from public, anon;
grant execute on function public.guardar_tarjetas_tema(text, text, text, text, jsonb) to authenticated;

create table if not exists public.tarjetas_estado (
  usuario     uuid not null references auth.users (id) on delete cascade,
  mazo        text not null,               -- ej.: biologia|libros|2027-I
  estado      jsonb not null default '{}'::jsonb,
  actualizado timestamptz not null default now(),
  primary key (usuario, mazo)
);
alter table public.tarjetas_estado enable row level security;
drop policy if exists "tarjetas_estado propio: ver" on public.tarjetas_estado;
create policy "tarjetas_estado propio: ver" on public.tarjetas_estado
  for select to authenticated using ((select auth.uid()) = usuario);
-- Nadie escribe directo: solo con guardar_tarjetas()

-- Junta lo nuevo con lo que ya había en ese mazo
create or replace function public.guardar_tarjetas(p_mazo text, p_estado jsonb)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if coalesce(p_mazo, '') !~ '^[a-z0-9-]{1,40}\|(libros|seminarios|banqueo)\|[A-Za-z0-9-]{1,40}$' then raise exception 'mazo inválido'; end if;
  if jsonb_typeof(p_estado) <> 'object' or pg_column_size(p_estado) > 60000 then raise exception 'estado inválido'; end if;
  insert into public.tarjetas_estado as e (usuario, mazo, estado, actualizado)
  values (uid, p_mazo, p_estado, now())
  on conflict (usuario, mazo) do update set estado = e.estado || excluded.estado, actualizado = now();
  delete from public.tarjetas_estado e where e.usuario = uid and e.mazo = p_mazo and pg_column_size(e.estado) > 200000;
end $$;
revoke all on function public.guardar_tarjetas(text, jsonb) from public, anon;
grant execute on function public.guardar_tarjetas(text, jsonb) to authenticated;
