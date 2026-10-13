-- =========================================================
-- Modo Cachimbo · Vocabulario (Razonamiento Verbal)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita haber corrido antes supabase/03-novedades.sql (es_admin)
-- y supabase/11-practica.sql (claves de ajustes).
--
--   · vocabulario: el banco de palabras que se sube en
--     Panel → Vocabulario. Un solo banco para todos los cursos
--     de RV que tengan Vocabulario encendido.
--     Cada fila: tema (sinonimos, antonimos), palabra, su lista
--     de sinónimos o antónimos, y opcionalmente definición y ejemplo.
--     Todos lo pueden leer; solo los administradores lo cambian.
--   · vocabulario_estado: qué palabras ya domina cada alumno y
--     cuándo le toca repasarlas (Flashcards, Practicar y Reto).
--     Una fila por alumno con un objeto { "sinonimos#EFÍMERO": [...] }.
--   · ajustes, clave 'vocabulario' = { "cursos": ["raz-verbal", …] }
--     En qué cursos aparece la tarjeta Vocabulario.
--     Se cambia en Panel → Vocabulario.
-- =========================================================

create table if not exists public.vocabulario (
  tema     text not null check (tema ~ '^[a-z]{1,30}$'),   -- sinonimos, antonimos, …
  orden    integer not null,
  palabra  text not null check (char_length(palabra) between 1 and 60),
  lista    text[] not null,                               -- sinónimos o antónimos
  def      text check (char_length(def) <= 400),
  ej       text check (char_length(ej) <= 400),
  primary key (tema, orden)
);
alter table public.vocabulario enable row level security;
drop policy if exists "vocabulario: ver" on public.vocabulario;
create policy "vocabulario: ver" on public.vocabulario for select to anon, authenticated using (true);
-- Nadie escribe directo: solo con guardar_vocabulario_tema()

-- Reemplaza todas las palabras de un tema.
-- p_lista = [{ "palabra": "EFÍMERO", "lista": ["pasajero", "fugaz"], "def": "...", "ej": "..." }, ...]
-- (vacía = borrar el tema). Devuelve cuántas palabras quedaron.
create or replace function public.guardar_vocabulario_tema(p_tema text, p_lista jsonb)
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare
  x jsonb; n integer := 0; l text[];
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  if coalesce(p_tema, '') !~ '^[a-z]{1,30}$' then raise exception 'tema inválido'; end if;
  if jsonb_typeof(coalesce(p_lista, '[]'::jsonb)) <> 'array' then raise exception 'lista inválida'; end if;
  delete from public.vocabulario v where v.tema = p_tema;
  for x in select value from jsonb_array_elements(coalesce(p_lista, '[]'::jsonb)) with ordinality a(value, i) where i <= 2000 loop
    if jsonb_typeof(x -> 'lista') = 'array' then
      select coalesce(array_agg(left(btrim(e), 60) order by k), '{}') into l
        from jsonb_array_elements_text(x -> 'lista') with ordinality s(e, k)
       where k <= 12 and btrim(e) <> '';
    else
      l := '{}';
    end if;
    if btrim(coalesce(x ->> 'palabra', '')) <> '' and cardinality(l) > 0 then
      n := n + 1;
      insert into public.vocabulario (tema, orden, palabra, lista, def, ej)
      values (p_tema, n, left(btrim(x ->> 'palabra'), 60), l,
              nullif(left(btrim(coalesce(x ->> 'def', '')), 400), ''),
              nullif(left(btrim(coalesce(x ->> 'ej', '')), 400), ''));
    end if;
  end loop;
  return n;
end $$;
revoke all on function public.guardar_vocabulario_tema(text, jsonb) from public, anon;
grant execute on function public.guardar_vocabulario_tema(text, jsonb) to authenticated;

create table if not exists public.vocabulario_estado (
  usuario     uuid not null references auth.users (id) on delete cascade primary key,
  estado      jsonb not null default '{}'::jsonb,
  actualizado timestamptz not null default now()
);
alter table public.vocabulario_estado enable row level security;
drop policy if exists "vocabulario_estado propio: ver" on public.vocabulario_estado;
create policy "vocabulario_estado propio: ver" on public.vocabulario_estado
  for select to authenticated using ((select auth.uid()) = usuario);
-- Nadie escribe directo: solo con guardar_vocabulario_estado()

-- Junta lo nuevo con lo que ya tenía el alumno
create or replace function public.guardar_vocabulario_estado(p_estado jsonb)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if jsonb_typeof(p_estado) <> 'object' or pg_column_size(p_estado) > 60000 then raise exception 'estado inválido'; end if;
  insert into public.vocabulario_estado as e (usuario, estado, actualizado)
  values (uid, p_estado, now())
  on conflict (usuario) do update set estado = e.estado || excluded.estado, actualizado = now();
  delete from public.vocabulario_estado e where e.usuario = uid and pg_column_size(e.estado) > 300000;
end $$;
revoke all on function public.guardar_vocabulario_estado(jsonb) from public, anon;
grant execute on function public.guardar_vocabulario_estado(jsonb) to authenticated;

-- Al inicio, Vocabulario solo en Razonamiento Verbal
insert into public.ajustes (clave, valor, actualizado)
values ('vocabulario', '{"cursos": ["raz-verbal"]}'::jsonb, now())
on conflict (clave) do nothing;
