-- =========================================================
-- Modo Cachimbo · Eliminar lo que viene con la web (Panel → Recursos)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 43-ayudantes-regalos.sql (puede) y 64-influencers.sql.
--
--   · Lo que viene en el código de la web (búhos, fondos, pines como
--     las coronas…) no se puede borrar del código desde el panel, así
--     que «Eliminar» lo apaga: deja de salir en Mi colección, nadie lo
--     tiene y a quien lo llevaba puesto se le quita (vuelve a lo de
--     siempre).
--   · Se puede devolver con «Restaurar» (lo que la gente tenía regalado
--     vuelve a ser suyo).
--   · Lo que viene por defecto (búho clásico, Galaxia, sin marco…) no se
--     puede eliminar: es lo que se pone cuando no hay nada.
-- =========================================================

create or replace function public.web_item_eliminar(p_id text, p_espacio text, p_regla jsonb, p_eliminar boolean default true)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.puede('recursos') then raise exception 'no autorizado'; end if;
  if p_id is null or p_id !~ '^[a-z0-9-]{2,60}$' or p_id like 'rec-%' then raise exception 'id no válido'; end if;
  if p_espacio not in ('buho','avatar','escena','racha','cuadro','marco','titulo','pines') then raise exception 'espacio no válido'; end if;
  if p_id in ('buho-clasico','avatar-foto','avatar-buho','escena-galaxia','racha-galaxia','cuadro-galaxia','marco-ninguno','titulo-cachimbo') then
    raise exception 'es lo que viene por defecto: no se puede eliminar';
  end if;
  if exists (select 1 from public.coleccion_item i where i.id = p_id and i.recurso) then raise exception 'es un recurso: bórralo con Borrar'; end if;
  -- La regla solo se usa si aún no estaba en la tabla (la misma que trae la web)
  if coalesce(jsonb_typeof(p_regla), '') <> 'object' or coalesce(p_regla ->> 'tipo', '') not in ('gratis','racha','rango','top','evento','regalo') then
    p_regla := '{"tipo":"regalo"}';
  end if;

  insert into public.coleccion_item (id, espacio, regla, visible)
  values (p_id, p_espacio, p_regla, not p_eliminar)
  on conflict (id) do update set visible = excluded.visible;

  if p_eliminar then
    -- A quien lo llevaba puesto se le quita: los pines salen de su vitrina y lo demás vuelve a lo de siempre
    update public.coleccion_puesto c
       set puesto = jsonb_set(c.puesto, '{pines}', (select coalesce(jsonb_agg(x), '[]') from jsonb_array_elements_text(c.puesto -> 'pines') x where x <> p_id))
     where jsonb_typeof(c.puesto -> 'pines') = 'array' and c.puesto -> 'pines' ? p_id;
    if p_espacio <> 'pines' then
      update public.coleccion_puesto c set puesto = c.puesto - p_espacio where c.puesto ->> p_espacio = p_id;
    end if;
  end if;
end $$;
revoke all on function public.web_item_eliminar(text, text, jsonb, boolean) from public, anon;
grant execute on function public.web_item_eliminar(text, text, jsonb, boolean) to authenticated;
