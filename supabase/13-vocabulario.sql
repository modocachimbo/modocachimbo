-- =========================================================
-- Modo Cachimbo · Vocabulario (Razonamiento Verbal)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita haber corrido antes supabase/03-novedades.sql (es_admin)
-- y supabase/11-practica.sql (claves de ajustes).
--
--   · vocabulario: el banco de palabras que se sube en
--     Panel → Vocabulario. Un solo banco para todos los cursos
--     de RV que tengan Vocabulario encendido y para todos los ciclos.
--     Cada fila es la ficha de una palabra: sus sinónimos, sus
--     antónimos y, si hay, definición y hasta 5 ejemplos.
--     En "extra" van datos opcionales: tipo (adj., sust., verbo, adv.),
--     nivel (1 a 3), examen (dónde salió), par (con qué se confunde),
--     raiz (etimología) y tip (truco). Se pueden sumar otros datos ahí
--     sin volver a correr SQL.
--     Todos lo pueden leer; solo los administradores lo cambian.
--   · vocabulario_estado: qué palabras ya domina cada alumno y
--     cuándo le toca repasarlas (Flashcards, Practicar y Reto).
--     Una fila por alumno con un objeto { "EFÍMERO#sin": [...] }.
--   · ajustes, clave 'vocabulario' = { "cursos": ["raz-verbal", …] }
--     En qué cursos aparece la tarjeta Vocabulario.
--     Se cambia en Panel → Vocabulario.
-- =========================================================

-- La primera versión de prueba guardaba una lista por tema; se reemplaza
do $$ begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'vocabulario' and column_name = 'tema') then
    drop table public.vocabulario cascade;
  end if;
end $$;
drop function if exists public.guardar_vocabulario_tema(text, jsonb);
-- Antes había un solo ejemplo (texto); ahora una lista de ejemplos
do $$ begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'vocabulario' and column_name = 'ej' and data_type = 'text') then
    alter table public.vocabulario drop constraint if exists vocabulario_ej_check;
    alter table public.vocabulario alter column ej type text[] using case when ej is null then '{}'::text[] else array[ej] end;
    alter table public.vocabulario alter column ej set default '{}';
    alter table public.vocabulario alter column ej set not null;
  end if;
end $$;
alter table if exists public.vocabulario add column if not exists extra jsonb not null default '{}'::jsonb;

create table if not exists public.vocabulario (
  orden    integer primary key,
  palabra  text not null unique check (char_length(palabra) between 1 and 60),
  sin      text[] not null default '{}',     -- sinónimos
  ant      text[] not null default '{}',     -- antónimos
  def      text check (char_length(def) <= 400),
  ej       text[] not null default '{}',      -- ejemplos (hasta 5)
  extra    jsonb not null default '{}'::jsonb, -- datos opcionales
  check (cardinality(sin) + cardinality(ant) > 0)
);
alter table public.vocabulario enable row level security;
drop policy if exists "vocabulario: ver" on public.vocabulario;
create policy "vocabulario: ver" on public.vocabulario for select to anon, authenticated using (true);
-- Nadie escribe directo: solo con guardar_vocabulario()

-- Limpia una lista: sin vacíos, máximo n de hasta l letras
drop function if exists public.vocabulario_lista(jsonb);
create or replace function public.vocabulario_lista(x jsonb, n integer default 12, l integer default 60)
returns text[] language sql immutable set search_path = '' as $$
  select coalesce(array_agg(left(btrim(e), l) order by k), '{}')
    from jsonb_array_elements_text(case when jsonb_typeof(x) = 'array' then x else '[]'::jsonb end) with ordinality s(e, k)
   where k <= n and btrim(e) <> '';
$$;
revoke all on function public.vocabulario_lista(jsonb, integer, integer) from public, anon;

-- Reemplaza todo el banco de palabras.
-- p_lista = [{ "palabra": "EFÍMERO", "sin": ["pasajero"], "ant": ["duradero"], "def": "...", "ej": ["...", "..."],
--             "extra": { "tipo": "adj.", "nivel": 2, "examen": ["UNMSM 2024-I"] } }, ...]
-- Devuelve cuántas palabras quedaron. Si una palabra se repite, queda la primera.
create or replace function public.guardar_vocabulario(p_lista jsonb)
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare
  x jsonb; n integer := 0; s text[]; a text[]; p text;
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  if jsonb_typeof(coalesce(p_lista, '[]'::jsonb)) <> 'array' then raise exception 'lista inválida'; end if;
  delete from public.vocabulario where true;
  for x in select value from jsonb_array_elements(coalesce(p_lista, '[]'::jsonb)) with ordinality a(value, i) where i <= 3000 loop
    p := left(btrim(coalesce(x ->> 'palabra', '')), 60);
    s := public.vocabulario_lista(x -> 'sin');
    a := public.vocabulario_lista(x -> 'ant');
    if p <> '' and cardinality(s) + cardinality(a) > 0
       and not exists (select 1 from public.vocabulario v where v.palabra = p) then
      n := n + 1;
      insert into public.vocabulario (orden, palabra, sin, ant, def, ej, extra)
      values (n, p, s, a,
              nullif(left(btrim(coalesce(x ->> 'def', '')), 400), ''),
              public.vocabulario_lista(x -> 'ej', 5, 300),
              case when jsonb_typeof(x -> 'extra') = 'object' and pg_column_size(x -> 'extra') <= 3000
                   then x -> 'extra' else '{}'::jsonb end);
    end if;
  end loop;
  return n;
end $$;
revoke all on function public.guardar_vocabulario(jsonb) from public, anon;
grant execute on function public.guardar_vocabulario(jsonb) to authenticated;

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
