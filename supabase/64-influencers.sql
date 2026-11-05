-- =========================================================
-- Modo Cachimbo · Influencers
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 41-recursos-coleccion.sql, 43-ayudantes-regalos.sql,
-- 61-pines-corona-top3.sql y 63-regalos-con-aviso.sql.
--
--   · grupo_miembro: quién es influencer (por ahora el único grupo).
--   · Regla nueva en Recursos: { tipo: 'grupo', g: 'influencer' }
--     «Solo influencers». Lo tiene quien está en el grupo mientras
--     esté: no se regala ni se guarda en coleccion_mia.
--   · influencer_poner(ids, mensaje): lo agrega y le llega un sobre
--     con todo lo de influencer. Si luego subes algo nuevo «Solo
--     influencers», a los que ya son les llega en otro sobre.
--   · influencer_quitar(id): lo saca; lo de influencer se le quita y
--     si lo tenía puesto vuelve a lo que usaba antes (o al de siempre).
--   · influencers_admin(): la lista para Panel → Influencers.
--   · Permiso: admins y ayudantes con «Regalos».
-- =========================================================

create table if not exists public.grupo_miembro (
  grupo   text not null check (grupo in ('influencer')),
  usuario uuid not null references auth.users (id) on delete cascade,
  desde   timestamptz not null default now(),
  primary key (grupo, usuario)
);
alter table public.grupo_miembro enable row level security;
drop policy if exists "grupo: el mío" on public.grupo_miembro;
create policy "grupo: el mío" on public.grupo_miembro for select to authenticated using (usuario = (select auth.uid()));

-- ¿Es un ítem que se tiene por estar en un grupo?
create or replace function public.item_de_grupo(p_item text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select i.regla ->> 'tipo' = 'grupo' from public.coleccion_item i where i.id = p_item), false);
$$;
revoke all on function public.item_de_grupo(text) from public, anon, authenticated;

-- ¿El alumno tiene este objeto? Igual que en 61, más la regla 'grupo'
-- (va antes que coleccion_mia: lo de influencer no se queda aunque se haya regalado)
create or replace function public.col_tiene(uid uuid, p_item text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare r jsonb; mins int[] := array[20, 1500, 4000, 8000, 12000];
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
      return coalesce((public.mis_tops(uid) ->> (r ->> 'n'))::int, 0) > 0
          or coalesce((public.mis_tops(uid) ->> 'ahora') = (r ->> 'n'), false);
    else return false;
  end case;
end $$;
revoke all on function public.col_tiene(uuid, text) from public, anon, authenticated;

-- Lo tuyo: igual que en 61, más tus grupos
create or replace function public.mi_coleccion()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'sin sesión'; end if;
  return jsonb_build_object(
    'mias', coalesce((select jsonb_agg(jsonb_build_object('item', m.item, 'origen', m.origen, 'mensaje', m.mensaje, 'creado', m.creado) order by m.creado)
                        from public.coleccion_mia m where m.usuario = uid), '[]'),
    'puesto', coalesce((select p.puesto from public.coleccion_puesto p where p.usuario = uid), '{}'),
    'tops', public.mis_tops(uid),
    'grupos', coalesce((select jsonb_agg(g.grupo) from public.grupo_miembro g where g.usuario = uid), '[]'));
end $$;
revoke all on function public.mi_coleccion() from public, anon;
grant execute on function public.mi_coleccion() to authenticated;

-- Ponerte algo: igual que en 31. Si te pones algo de influencer, se recuerda
-- lo que tenías antes en ese espacio (en «_antes») para volver a eso si te sacan.
create or replace function public.ponerme(p_espacio text, p_item text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v jsonb; pines jsonb; previo text;
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
    previo := v ->> p_espacio;
    if public.item_de_grupo(p_item) then
      if previo is not null and not public.item_de_grupo(previo) then
        v := jsonb_set(v, '{_antes}', coalesce(v -> '_antes', '{}') || jsonb_build_object(p_espacio, previo));
      end if;
    elsif v -> '_antes' ? p_espacio then
      v := jsonb_set(v, '{_antes}', (v -> '_antes') - p_espacio);
    end if;
    v := jsonb_set(v, array[p_espacio], to_jsonb(p_item));
  end if;
  insert into public.coleccion_puesto (usuario, puesto, cambiado) values (uid, v, now())
    on conflict (usuario) do update set puesto = excluded.puesto, cambiado = now();
  return public.mi_coleccion();
end $$;
revoke all on function public.ponerme(text, text) from public, anon;
grant execute on function public.ponerme(text, text) to authenticated;

-- Quita del puesto de un alumno lo que ya no tiene (después de sacarlo de un grupo)
create or replace function public.limpiar_puesto(u uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare v jsonb; k text; x text; antes jsonb;
begin
  select p.puesto into v from public.coleccion_puesto p where p.usuario = u for update;
  if v is null then return; end if;
  antes := coalesce(v -> '_antes', '{}');
  for k, x in select e.key, e.value #>> '{}' from jsonb_each(v) e where e.key not in ('pines', '_antes') and jsonb_typeof(e.value) = 'string' loop
    if public.item_de_grupo(x) and not coalesce(public.col_tiene(u, x), false) then
      if antes ? k and coalesce(public.col_tiene(u, antes ->> k), false) then v := jsonb_set(v, array[k], antes -> k);
      else v := v - k; end if;
      antes := antes - k;
    end if;
  end loop;
  v := jsonb_set(v, '{_antes}', antes);
  if jsonb_typeof(v -> 'pines') = 'array' then
    v := jsonb_set(v, '{pines}', coalesce((select jsonb_agg(p order by o) from jsonb_array_elements_text(v -> 'pines') with ordinality e(p, o)
                                            where not public.item_de_grupo(p) or coalesce(public.col_tiene(u, p), false)), '[]'));
  end if;
  update public.coleccion_puesto set puesto = v, cambiado = now() where usuario = u;
end $$;
revoke all on function public.limpiar_puesto(uuid) from public, anon, authenticated;

-- Le deja un sobre a cada miembro con los ítems del grupo que se le pasan
create or replace function public.avisar_grupo(p_usuarios uuid[], p_items text[], p_nota text)
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare n integer; yo text := lower(auth.jwt() ->> 'email'); nom text;
begin
  select e.nombre into nom from public.equipo e where e.email = yo;
  insert into public.regalos (usuario, tipo, item, nota, de_email, de_nombre)
    select u, 'item', i, p_nota, yo, nom from unnest(p_usuarios) u cross join unnest(p_items) i;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.avisar_grupo(uuid[], text[], text) from public, anon, authenticated;

-- Panel → Influencers: la lista
create or replace function public.influencers_admin()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.puede('regalos') then raise exception 'no autorizado'; end if;
  return jsonb_build_object(
    'miembros', coalesce((select jsonb_agg(jsonb_build_object(
        'codigo', j.codigo, 'apodo', public.duelo_apodo(g.usuario),
        'email', (select lower(a.email) from auth.users a where a.id = g.usuario),
        'foto', (select p.foto_url from public.perfiles p where p.id = g.usuario and p.foto_url like 'https://%'),
        'desde', g.desde) order by g.desde desc)
      from public.grupo_miembro g left join public.jugador_id j on j.usuario = g.usuario
      where g.grupo = 'influencer'), '[]'),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'espacio', i.espacio, 'nom', i.nom, 'img', i.img, 'visible', i.visible) order by i.creado)
      from public.coleccion_item i where i.regla ->> 'tipo' = 'grupo' and i.regla ->> 'g' = 'influencer'), '[]'));
end $$;
revoke all on function public.influencers_admin() from public, anon;
grant execute on function public.influencers_admin() to authenticated;

-- Panel → Influencers: agregar por ID (de 5 cifras). Al nuevo le llega un sobre.
create or replace function public.influencer_poner(p_codigos integer[], p_mensaje text default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare nuevos uuid[]; faltan integer[]; ya integer; items text[];
        nota text := coalesce(nullif(left(trim(coalesce(p_mensaje, '')), 120), ''), '¡Ahora eres influencer de Modo Cachimbo! Esto es para ti.');
begin
  if not public.puede('regalos') then raise exception 'no autorizado'; end if;
  if p_codigos is null or cardinality(p_codigos) = 0 then raise exception 'Escribe al menos un ID'; end if;
  select coalesce(array_agg(c), '{}') into faltan from unnest(p_codigos) c
   where not exists (select 1 from public.jugador_id j where j.codigo = c);
  select count(*) into ya from public.grupo_miembro g join public.jugador_id j on j.usuario = g.usuario
   where g.grupo = 'influencer' and j.codigo = any (p_codigos);
  with ins as (
    insert into public.grupo_miembro (grupo, usuario)
      select distinct 'influencer', j.usuario from public.jugador_id j where j.codigo = any (p_codigos)
      on conflict do nothing returning usuario
  ) select coalesce(array_agg(usuario), '{}') into nuevos from ins;
  select coalesce(array_agg(i.id order by i.creado), '{}') into items from public.coleccion_item i
   where i.visible and i.regla ->> 'tipo' = 'grupo' and i.regla ->> 'g' = 'influencer';
  if cardinality(nuevos) > 0 and cardinality(items) > 0 then perform public.avisar_grupo(nuevos, items, nota); end if;
  if cardinality(nuevos) > 0 and auth.uid() is not null then
    perform public.anotar('Influencers', 'Agregó ' || cardinality(nuevos) || ' influencer' || case when cardinality(nuevos) = 1 then '' else 's' end,
      jsonb_build_object('codigos', to_jsonb(p_codigos)));
  end if;
  return jsonb_build_object('agregados', cardinality(nuevos), 'ya', ya, 'sin_id', to_jsonb(faltan), 'items', cardinality(items));
end $$;
revoke all on function public.influencer_poner(integer[], text) from public, anon;
grant execute on function public.influencer_poner(integer[], text) to authenticated;

-- Panel → Influencers: sacar a alguien. Lo de influencer se le quita al toque.
create or replace function public.influencer_quitar(p_codigo integer)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare u uuid;
begin
  if not public.puede('regalos') then raise exception 'no autorizado'; end if;
  select j.usuario into u from public.jugador_id j where j.codigo = p_codigo;
  if u is null then raise exception 'No hay ningún alumno con el ID %', p_codigo; end if;
  delete from public.grupo_miembro where grupo = 'influencer' and usuario = u;
  if not found then return false; end if;
  delete from public.coleccion_mia m where m.usuario = u and public.item_de_grupo(m.item);
  perform public.limpiar_puesto(u);
  if auth.uid() is not null then
    perform public.anotar('Influencers', 'Quitó a un influencer', jsonb_build_object('codigo', p_codigo));
  end if;
  return true;
end $$;
revoke all on function public.influencer_quitar(integer) from public, anon;
grant execute on function public.influencer_quitar(integer) to authenticated;

-- Recursos: igual que en 41, más la regla «Solo influencers» ({ tipo: 'grupo', g: 'influencer' }).
-- Si un ítem pasa a ser de influencer (nuevo o cambiado), a los influencers les llega en un sobre.
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
    if v_n is null or v_n < 0 or v_n > 4 then raise exception 'rango no válido'; end if;
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
