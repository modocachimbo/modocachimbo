-- =========================================================
-- Modo Cachimbo · Recursos para toda la colección (panel → Recursos)
-- Correr una vez en Supabase → SQL Editor (se puede repetir sin problema).
-- Necesita 40-recursos.sql.
--
-- Antes Recursos solo subía fondos de perfil. Ahora también:
--   · Fotos de perfil (avatar): imagen cuadrada 512×512.
--   · Pines (pines): imagen cuadrada 256×256 (mejor PNG sin fondo);
--     los colores del círculo salen de la imagen.
--   · Marcos (marco): una imagen (textura) o un degradado de 3 colores.
--   · Cuadros de racha (cuadro): 4 colores del cuadro y 2 del fuego.
--   · Títulos (titulo): solo el texto (el nombre).
-- Mismas reglas de siempre: para todos, racha, rango o regalo.
-- El búho y los escenarios siguen en el código: llevan varias caras y animación.
-- =========================================================

-- Los 2 colores del fuego de un cuadro de racha
alter table public.coleccion_item add column if not exists llama jsonb;

-- Guardar un recurso (nuevo o editado). Solo admins.
--   p: { id, espacio, nom, rareza, img, tema: [colores], llama: [2 colores], descr, regla: {tipo, n}, visible }
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

-- Los recursos para el panel, con a cuántos alumnos se les regaló y cuántos lo llevan
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

-- Al borrar un pin subido, sacarlo también de las vitrinas (los demás espacios vuelven solos a lo de siempre)
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
