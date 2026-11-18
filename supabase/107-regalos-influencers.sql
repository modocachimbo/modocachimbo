-- =========================================================
-- Modo Cachimbo · Panel → Regalos: botón «Influencers»
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 64-influencers.sql, 93-grupo-vip.sql, 94-alumno-visto.sql
-- y 100-regalar-todos-rayos.sql.
--
--   · El grupo «influencer» no se arma a mano: son los mismos de
--     Panel → Influencers (tabla grupo_miembro). grupo_regalo_ver y
--     grupo_regalo_dar ahora lo entienden; el resto de grupos (VIP)
--     sigue igual que antes.
--   · grupo_regalo_guardar no deja tocar ese grupo desde Regalos.
-- =========================================================

-- Quién está en un grupo de regalos (y desde cuándo)
create or replace function public.regalo_grupo_de(p_grupo text)
returns table (usuario uuid, agregado timestamptz) language sql stable security definer set search_path = '' as $$
  select g.usuario, g.desde from public.grupo_miembro g where p_grupo = 'influencer' and g.grupo = 'influencer'
  union all
  select g.usuario, g.agregado from public.regalo_grupo g where p_grupo <> 'influencer' and g.grupo = p_grupo;
$$;
revoke all on function public.regalo_grupo_de(text) from public, anon, authenticated;

create or replace function public.grupo_regalo_ver(p_grupo text default 'vip')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.puede('regalos') then raise exception 'no autorizado'; end if;
  return jsonb_build_object(
    'miembros', coalesce((select jsonb_agg(jsonb_build_object(
        'codigo', j.codigo, 'apodo', public.duelo_apodo(g.usuario),
        'email', (select lower(a.email) from auth.users a where a.id = g.usuario),
        'foto', (select p.foto_url from public.perfiles p where p.id = g.usuario and p.foto_url like 'https://%'),
        'visto', greatest((select v.visto from public.alumno_visto v where v.usuario = g.usuario),
                          (select a.last_sign_in_at from auth.users a where a.id = g.usuario),
                          (select (max(x.fecha) + time '12:00') at time zone 'America/Lima' from public.actividad x where x.usuario = g.usuario and x.preguntas > 0)))
        order by g.agregado, j.codigo)
      from public.regalo_grupo_de(p_grupo) g join public.jugador_id j on j.usuario = g.usuario), '[]'::jsonb),
    'envios', coalesce((select jsonb_agg(jsonb_build_object('tipo', e.tipo, 'cantidad', e.cantidad, 'item', e.item, 'nota', e.nota,
        'recibieron', e.recibieron, 'saltados', e.saltados, 'de', coalesce(e.de_nombre, e.de_email), 'creado', e.creado) order by e.id desc)
      from (select * from public.regalo_grupo_envio x where x.grupo = p_grupo order by x.id desc limit 10) e), '[]'::jsonb));
end $$;
revoke all on function public.grupo_regalo_ver(text) from public, anon;
grant execute on function public.grupo_regalo_ver(text) to authenticated;

create or replace function public.grupo_regalo_dar(p_grupo text, p_tipo text, p_cantidad integer default null, p_item text default null, p_nota text default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  n    integer := coalesce(p_cantidad, 0);
  nota text := nullif(left(trim(coalesce(p_nota, '')), 140), '');
  yo   text := lower(auth.jwt() ->> 'email');
  nom  text;
  ok   integer := 0;
  sal  integer := 0;
  u    uuid;
  txt  text;
begin
  if not public.puede('regalos') then raise exception 'no autorizado'; end if;
  if p_grupo = 'todos' then raise exception 'nombre de grupo no válido'; end if;
  txt := public.regalo_validar(p_tipo, n, p_item);
  if not exists (select 1 from public.regalo_grupo_de(p_grupo)) then raise exception 'El grupo está vacío'; end if;
  select e.nombre into nom from public.equipo e where e.email = yo;
  for u in select g.usuario from public.regalo_grupo_de(p_grupo) g loop
    if public.regalo_aplicar(u, p_tipo, n, case when p_tipo = 'item' then p_item end, nota, yo, nom) then ok := ok + 1; else sal := sal + 1; end if;
  end loop;
  insert into public.regalo_grupo_envio (grupo, tipo, cantidad, item, nota, recibieron, saltados, de_email, de_nombre)
  values (p_grupo, p_tipo, case when p_tipo = 'item' then null else n end, case when p_tipo = 'item' then p_item end, nota, ok, sal, yo, nom);
  perform public.anotar('Regalos', 'Regaló ' || txt || ' al grupo ' || upper(p_grupo) || ' (' || ok || ' alumnos)',
    jsonb_build_object('grupo', p_grupo, 'tipo', p_tipo, 'cantidad', n, 'item', p_item, 'nota', nota, 'recibieron', ok, 'saltados', sal));
  return public.grupo_regalo_ver(p_grupo) || jsonb_build_object('recibieron', ok, 'saltados', sal);
end $$;
revoke all on function public.grupo_regalo_dar(text, text, integer, text, text) from public, anon;
grant execute on function public.grupo_regalo_dar(text, text, integer, text, text) to authenticated;

-- Los influencers se manejan en Panel → Influencers, no desde Regalos
create or replace function public.regalo_grupo_no_influencer()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.grupo = 'influencer' then raise exception 'Los influencers se agregan en Panel → Influencers'; end if;
  return new;
end $$;
drop trigger if exists regalo_grupo_no_influencer on public.regalo_grupo;
create trigger regalo_grupo_no_influencer before insert or update on public.regalo_grupo
  for each row execute function public.regalo_grupo_no_influencer();
