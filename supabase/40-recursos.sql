-- =========================================================
-- Modo Cachimbo · Recursos (panel → Recursos)
-- Correr una vez en Supabase → SQL Editor (se puede repetir sin problema).
-- Necesita 31-coleccion.sql (y los que lo amplían: 32 a 35).
--
-- Fondos de perfil con imagen que subes desde el panel, sin tocar código:
--   · La imagen va al Storage, en la carpeta pública «recursos»
--     (WebP 1200×300; el panel la recorta y achica antes de subir).
--   · El objeto se agrega a coleccion_item con recurso = true, con su
--     nombre, rareza, colores y regla. La web lo lee de ahí y lo suma
--     a Mi colección (assets/coleccion.js).
--   · Se gana con las reglas de siempre: gratis (para todos), racha de
--     N días, rango en una semana, o regalo (regalar_item, a todos o a
--     ciertos correos).
-- =========================================================

-- Lo que la web necesita para dibujar un recurso (los del código no lo usan)
alter table public.coleccion_item add column if not exists recurso boolean not null default false;
alter table public.coleccion_item add column if not exists nom     text;
alter table public.coleccion_item add column if not exists rareza  text;
alter table public.coleccion_item add column if not exists img     text;      -- URL pública del Storage
alter table public.coleccion_item add column if not exists tema    jsonb;     -- 4 colores sacados de la imagen
alter table public.coleccion_item add column if not exists descr   text;
alter table public.coleccion_item add column if not exists creado  timestamptz not null default now();

-- Carpeta pública del Storage: cualquiera ve las imágenes, solo los admins suben o borran
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recursos', 'recursos', true, 524288, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "recursos: subir" on storage.objects;
create policy "recursos: subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'recursos' and public.es_admin());
drop policy if exists "recursos: cambiar" on storage.objects;
create policy "recursos: cambiar" on storage.objects for update to authenticated
  using (bucket_id = 'recursos' and public.es_admin());
drop policy if exists "recursos: borrar" on storage.objects;
create policy "recursos: borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'recursos' and public.es_admin());

-- Guardar un recurso (nuevo o editado). Solo admins.
--   p: { id, espacio, nom, rareza, img, tema: [4 colores], descr, regla: {tipo, n}, visible }
create or replace function public.guardar_recurso(p jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id   text := lower(coalesce(nullif(trim(p ->> 'id'), ''), 'rec-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8)));
  v_esp  text := coalesce(p ->> 'espacio', 'racha');
  v_nom  text := left(trim(coalesce(p ->> 'nom', '')), 40);
  v_rar  text := coalesce(p ->> 'rareza', 'comun');
  v_img  text := trim(coalesce(p ->> 'img', ''));
  v_reg  jsonb := coalesce(p -> 'regla', '{"tipo":"gratis"}');
  v_tipo text := v_reg ->> 'tipo';
  v_n    int;
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  if v_id !~ '^rec-[a-z0-9-]{1,40}$' then raise exception 'id no válido'; end if;
  if exists (select 1 from public.coleccion_item i where i.id = v_id and not i.recurso) then raise exception 'ese id es de la colección fija'; end if;
  if v_esp not in ('racha') then raise exception 'por ahora solo fondos de perfil'; end if;
  if v_nom = '' then raise exception 'falta el nombre'; end if;
  if v_rar not in ('comun', 'raro', 'epico', 'legendario', 'evento') then raise exception 'rareza no válida'; end if;
  if v_img !~ '^https://[a-z0-9.-]+/storage/v1/object/public/recursos/[A-Za-z0-9/_.-]+$' then raise exception 'imagen no válida'; end if;
  if jsonb_typeof(p -> 'tema') <> 'array' or jsonb_array_length(p -> 'tema') <> 4
     or exists (select 1 from jsonb_array_elements_text(p -> 'tema') c where c !~ '^#[0-9a-fA-F]{6}$') then
    raise exception 'faltan los colores';
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

  insert into public.coleccion_item (id, espacio, regla, visible, recurso, nom, rareza, img, tema, descr)
  values (v_id, v_esp, v_reg, coalesce((p ->> 'visible')::boolean, true), true, v_nom, v_rar, v_img, p -> 'tema',
          nullif(left(trim(coalesce(p ->> 'descr', '')), 140), ''))
  on conflict (id) do update set
    regla = excluded.regla, visible = excluded.visible, nom = excluded.nom, rareza = excluded.rareza,
    img = excluded.img, tema = excluded.tema, descr = excluded.descr;
  return jsonb_build_object('id', v_id);
end $$;
revoke all on function public.guardar_recurso(jsonb) from public, anon;
grant execute on function public.guardar_recurso(jsonb) to authenticated;

-- Los recursos para el panel, con a cuántos alumnos se les regaló
create or replace function public.recursos_admin()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', i.id, 'espacio', i.espacio, 'regla', i.regla, 'visible', i.visible, 'nom', i.nom, 'rareza', i.rareza,
      'img', i.img, 'tema', i.tema, 'descr', i.descr, 'creado', i.creado,
      'regalados', (select count(*) from public.coleccion_mia m where m.item = i.id),
      'puestos', (select count(*) from public.coleccion_puesto c where c.puesto ->> i.espacio = i.id)
    ) order by i.creado desc)
    from public.coleccion_item i where i.recurso), '[]');
end $$;
revoke all on function public.recursos_admin() from public, anon;
grant execute on function public.recursos_admin() to authenticated;

-- Borrar un recurso: se le quita a todos y quien lo llevaba vuelve al de siempre.
-- La imagen la borra el panel del Storage.
create or replace function public.borrar_recurso(p_id text)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  delete from public.coleccion_item i where i.id = p_id and i.recurso;
end $$;
revoke all on function public.borrar_recurso(text) from public, anon;
grant execute on function public.borrar_recurso(text) to authenticated;
