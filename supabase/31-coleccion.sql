-- =========================================================
-- Modo Cachimbo · Mi colección (coleccion.html)
-- Correr una vez en Supabase → SQL Editor (se puede repetir sin problema).
-- Necesita 03 (es_admin), 16 (xp_semana) y 17 (calc_racha).
--
-- coleccion_item   el catálogo: qué hay y cómo se consigue (regla).
--                  Los dibujos y nombres están en assets/coleccion.js;
--                  aquí va lo que el servidor necesita para revisar.
-- coleccion_mia    lo que le dieron a cada alumno (eventos y regalos).
--                  Lo gratis, por racha o por rango no se guarda: se calcula.
-- coleccion_puesto lo que cada alumno lleva puesto.
--
-- Regalar algo a mano (por ahora, desde aquí):
--   select public.regalar_item('racha-calabaza', array['alumno@correo.com'], 'evento', '¡Feliz Halloween!');
--   select public.regalar_item('pin-calabaza', null, 'evento');   -- null = a todos los alumnos
-- =========================================================

create table if not exists public.coleccion_item (
  id       text primary key,
  espacio  text not null check (espacio in ('buho','racha','marco','titulo','pines')),
  regla    jsonb not null default '{"tipo":"gratis"}',   -- {tipo: gratis|racha|rango|evento|regalo, n}
  visible  boolean not null default true
);
alter table public.coleccion_item enable row level security;
drop policy if exists "catalogo: leer" on public.coleccion_item;
create policy "catalogo: leer" on public.coleccion_item for select to anon, authenticated using (true);

insert into public.coleccion_item (id, espacio, regla) values
  ('buho-clasico','buho','{"tipo":"gratis"}'), ('buho-al-juarismi','buho','{"tipo":"gratis"}'),
  ('buho-cervantes','buho','{"tipo":"gratis"}'), ('buho-einstein','buho','{"tipo":"gratis"}'),
  ('buho-inca','buho','{"tipo":"gratis"}'), ('buho-birrete','buho','{"tipo":"regalo"}'),
  ('racha-cielo','racha','{"tipo":"gratis"}'), ('racha-menta','racha','{"tipo":"racha","n":7}'),
  ('racha-noche','racha','{"tipo":"rango","n":2}'), ('racha-volcan','racha','{"tipo":"racha","n":30}'),
  ('racha-aurora','racha','{"tipo":"racha","n":100}'), ('racha-calabaza','racha','{"tipo":"evento"}'),
  ('marco-ninguno','marco','{"tipo":"gratis"}'), ('marco-lima','marco','{"tipo":"gratis"}'),
  ('marco-hielo','marco','{"tipo":"racha","n":7}'), ('marco-fuego','marco','{"tipo":"racha","n":30}'),
  ('marco-oro','marco','{"tipo":"rango","n":3}'), ('marco-leyenda','marco','{"tipo":"rango","n":4}'),
  ('marco-calabaza','marco','{"tipo":"evento"}'),
  ('titulo-cachimbo','titulo','{"tipo":"gratis"}'), ('titulo-constante','titulo','{"tipo":"racha","n":7}'),
  ('titulo-gemas','titulo','{"tipo":"rango","n":2}'), ('titulo-imparable','titulo','{"tipo":"racha","n":30}'),
  ('titulo-centenario','titulo','{"tipo":"racha","n":100}'), ('titulo-leyenda','titulo','{"tipo":"rango","n":4}'),
  ('titulo-brujas','titulo','{"tipo":"evento"}'),
  ('pin-superviviente','pines','{"tipo":"evento"}'), ('pin-calabaza','pines','{"tipo":"evento"}'),
  ('pin-murcielago','pines','{"tipo":"evento"}'), ('pin-fantasma','pines','{"tipo":"evento"}'),
  ('pin-telarana','pines','{"tipo":"evento"}')
on conflict (id) do update set espacio = excluded.espacio, regla = excluded.regla;

create table if not exists public.coleccion_mia (
  usuario uuid not null references auth.users (id) on delete cascade,
  item    text not null references public.coleccion_item (id) on delete cascade,
  origen  text not null default 'regalo',     -- evento | regalo | codigo
  mensaje text,
  creado  timestamptz not null default now(),
  primary key (usuario, item)
);
alter table public.coleccion_mia enable row level security;
drop policy if exists "mia: ver" on public.coleccion_mia;
create policy "mia: ver" on public.coleccion_mia for select to authenticated using ((select auth.uid()) = usuario);

create table if not exists public.coleccion_puesto (
  usuario  uuid primary key references auth.users (id) on delete cascade,
  puesto   jsonb not null default '{}',       -- {buho, racha, marco, titulo, pines: [..hasta 3]}
  cambiado timestamptz not null default now()
);
alter table public.coleccion_puesto enable row level security;
-- Lo que llevas puesto lo ve cualquiera con sesión (para el ranking y los duelos)
drop policy if exists "puesto: ver" on public.coleccion_puesto;
create policy "puesto: ver" on public.coleccion_puesto for select to authenticated using (true);

-- ¿El alumno tiene este objeto? (regla del catálogo o se lo dieron)
create or replace function public.col_tiene(uid uuid, p_item text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare r jsonb; mins int[] := array[20, 1500, 4000, 8000, 12000];
begin
  select i.regla into r from public.coleccion_item i where i.id = p_item and i.visible;
  if r is null then return false; end if;
  if exists (select 1 from public.coleccion_mia m where m.usuario = uid and m.item = p_item) then return true; end if;
  case r ->> 'tipo'
    when 'gratis' then return true;
    when 'racha' then
      return coalesce((public.calc_racha(uid) ->> 'mejor')::int, 0) >= (r ->> 'n')::int
          or coalesce((public.calc_racha(uid) ->> 'actual')::int, 0) >= (r ->> 'n')::int;
    when 'rango' then
      return exists (select 1 from public.xp_semana x where x.usuario = uid and x.xp >= mins[(r ->> 'n')::int + 1]);
    else return false;
  end case;
end $$;
revoke all on function public.col_tiene(uuid, text) from public, anon, authenticated;

-- Lo tuyo: lo que te dieron y lo que llevas puesto
create or replace function public.mi_coleccion()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'sin sesión'; end if;
  return jsonb_build_object(
    'mias', coalesce((select jsonb_agg(jsonb_build_object('item', m.item, 'origen', m.origen, 'mensaje', m.mensaje, 'creado', m.creado) order by m.creado)
                        from public.coleccion_mia m where m.usuario = uid), '[]'),
    'puesto', coalesce((select p.puesto from public.coleccion_puesto p where p.usuario = uid), '{}'));
end $$;
revoke all on function public.mi_coleccion() from public, anon;
grant execute on function public.mi_coleccion() to authenticated;

-- Ponerte algo. En 'pines' el mismo id lo pone o lo quita (hasta 3 en la vitrina).
create or replace function public.ponerme(p_espacio text, p_item text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v jsonb; pines jsonb;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if not exists (select 1 from public.coleccion_item i where i.id = p_item and i.espacio = p_espacio) then raise exception 'no existe'; end if;
  if not public.col_tiene(uid, p_item) then raise exception 'todavía no lo tienes'; end if;
  select p.puesto into v from public.coleccion_puesto p where p.usuario = uid for update;
  v := coalesce(v, '{}');
  if p_espacio = 'pines' then
    pines := coalesce(v -> 'pines', '[]');
    if pines ? p_item then
      pines := (select coalesce(jsonb_agg(x), '[]') from jsonb_array_elements_text(pines) x where x <> p_item);
    else
      pines := pines || to_jsonb(p_item);
      if jsonb_array_length(pines) > 3 then pines := pines - 0; end if;
    end if;
    v := jsonb_set(v, '{pines}', pines);
  else
    v := jsonb_set(v, array[p_espacio], to_jsonb(p_item));
  end if;
  insert into public.coleccion_puesto (usuario, puesto, cambiado) values (uid, v, now())
    on conflict (usuario) do update set puesto = excluded.puesto, cambiado = now();
  return public.mi_coleccion();
end $$;
revoke all on function public.ponerme(text, text) from public, anon;
grant execute on function public.ponerme(text, text) to authenticated;

-- Regalar (solo admins). p_emails null = a todos los alumnos con cuenta. Devuelve a cuántos llegó.
create or replace function public.regalar_item(p_item text, p_emails text[] default null, p_origen text default 'regalo', p_mensaje text default null)
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare n integer;
begin
  -- Desde el SQL Editor no hay sesión (auth.uid() es null) y se permite; desde la web, solo admins
  if auth.uid() is not null and not public.es_admin() then raise exception 'no autorizado'; end if;
  if not exists (select 1 from public.coleccion_item i where i.id = p_item) then raise exception 'no existe %', p_item; end if;
  insert into public.coleccion_mia (usuario, item, origen, mensaje)
    select u.id, p_item, coalesce(p_origen, 'regalo'), p_mensaje from auth.users u
     where p_emails is null or lower(u.email) = any (select lower(e) from unnest(p_emails) e)
    on conflict (usuario, item) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.regalar_item(text, text[], text, text) from public, anon;
grant execute on function public.regalar_item(text, text[], text, text) to authenticated;
