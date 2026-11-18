-- =========================================================
-- Modo Cachimbo · Premios por rango con los rangos de ahora
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 64-influencers.sql y 73-corona-se-gana-al-cerrar.sql.
--
--   · En Panel → Recursos → «Rango semanal» ahora se elige uno de los
--     rangos de hoy (Bronce, Plata, Esmeralda, Zafiro, Amatista, Mítico,
--     Leyenda). Se gana al cerrar una semana con al menos el XP de ese rango.
--   · Los premios viejos (n = 0..4) siguen igual, con su XP de siempre.
--     Los nuevos usan n = 5..11:
--       5 Bronce I 20 · 6 Plata I 900 · 7 Esmeralda I 2 300 · 8 Zafiro I 4 700
--       9 Amatista I 9 000 · 10 Mítico I 16 000 · 11 Leyenda I 50 000
--   · El mismo cuadro está en assets/coleccion.js y panel/recursos-panel.js.
-- =========================================================

create or replace function public.col_tiene(uid uuid, p_item text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare r jsonb; mins int[] := array[20, 1500, 4000, 8000, 12000,
                                       20, 900, 2300, 4700, 9000, 16000, 50000];
begin
  select i.regla into r from public.coleccion_item i where i.id = p_item and i.visible;
  if r is null then return false; end if;
  if r ->> 'tipo' = 'grupo' then
    return exists (select 1 from public.grupo_miembro g where g.usuario = uid and g.grupo = r ->> 'g');
  end if;
  if exists (select 1 from public.coleccion_mia m where m.usuario = uid and m.item = p_item) then return true; end if;
  case r ->> 'tipo'
    when 'gratis' then return true;
    when 'racha' then
      return coalesce((public.calc_racha(uid) ->> 'mejor')::int, 0) >= (r ->> 'n')::int
          or coalesce((public.calc_racha(uid) ->> 'actual')::int, 0) >= (r ->> 'n')::int;
    when 'rango' then
      return exists (select 1 from public.xp_semana x where x.usuario = uid and x.xp >= mins[(r ->> 'n')::int + 1]);
    when 'top' then
      return coalesce((public.mis_tops(uid) ->> (r ->> 'n'))::int, 0) > 0;
    else return false;
  end case;
end $$;
revoke all on function public.col_tiene(uuid, text) from public, anon, authenticated;

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
  v_vis  boolean := coalesce((p ->> 'visible')::boolean, true);
  era    boolean;
  miembros uuid[];
begin
  if not public.puede('recursos') then raise exception 'no autorizado'; end if;
  if v_id !~ '^rec-[a-z0-9-]{1,40}$' then raise exception 'id no válido'; end if;
  if exists (select 1 from public.coleccion_item i where i.id = v_id and not i.recurso) then raise exception 'ese id es de la colección fija'; end if;
  if exists (select 1 from public.coleccion_item i where i.id = v_id and i.espacio <> v_esp) then raise exception 'no se puede cambiar el tipo'; end if;
  if v_esp not in ('racha', 'avatar', 'pines', 'marco', 'cuadro', 'titulo') then raise exception 'tipo no válido'; end if;
  if v_nom = '' then raise exception 'falta el nombre'; end if;
  if v_rar not in ('comun', 'raro', 'epico', 'legendario', 'evento') then raise exception 'rareza no válida'; end if;

  if v_img is not null and v_img !~ '^https://[a-z0-9.-]+/storage/v1/object/public/recursos/[A-Za-z0-9/_.-]+$' then raise exception 'imagen no válida'; end if;
  if v_esp in ('racha', 'avatar', 'pines') and v_img is null then raise exception 'falta la imagen'; end if;
  if v_esp in ('cuadro', 'titulo') then v_img := null; end if;
  if v_esp = 'avatar' then v_tema := null; end if;
  if v_esp = 'titulo' then v_tema := null; end if;
  if v_esp = 'marco' and v_img is not null then v_tema := null; end if;
  if v_esp <> 'cuadro' then v_lla := null; end if;

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
    if v_n is null or v_n < 0 or v_n > 11 then raise exception 'rango no válido'; end if;
    v_reg := jsonb_build_object('tipo', 'rango', 'n', v_n);
  elsif v_tipo = 'grupo' then
    if coalesce(v_reg ->> 'g', '') <> 'influencer' then raise exception 'grupo no válido'; end if;
    v_reg := jsonb_build_object('tipo', 'grupo', 'g', 'influencer');
  else
    raise exception 'regla no válida';
  end if;

  select i.regla ->> 'tipo' = 'grupo' and i.visible into era from public.coleccion_item i where i.id = v_id;

  insert into public.coleccion_item (id, espacio, regla, visible, recurso, nom, rareza, img, tema, llama, descr)
  values (v_id, v_esp, v_reg, v_vis, true, v_nom, v_rar, v_img, v_tema, v_lla,
          nullif(left(trim(coalesce(p ->> 'descr', '')), 140), ''))
  on conflict (id) do update set
    regla = excluded.regla, visible = excluded.visible, nom = excluded.nom, rareza = excluded.rareza,
    img = excluded.img, tema = excluded.tema, llama = excluded.llama, descr = excluded.descr;

  -- Nuevo de influencer (o recién pasado a influencer): les llega en un sobre a los que ya son
  if v_tipo = 'grupo' and v_vis and not coalesce(era, false) then
    select coalesce(array_agg(g.usuario), '{}') into miembros from public.grupo_miembro g where g.grupo = 'influencer';
    if cardinality(miembros) > 0 then perform public.avisar_grupo(miembros, array[v_id], 'Nuevo para influencers: ' || v_nom); end if;
  end if;
  return jsonb_build_object('id', v_id);
end $$;
revoke all on function public.guardar_recurso(jsonb) from public, anon;
grant execute on function public.guardar_recurso(jsonb) to authenticated;
