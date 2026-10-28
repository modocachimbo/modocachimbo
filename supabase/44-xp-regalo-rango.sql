-- =========================================================
-- Modo Cachimbo · El XP regalado también sube el rango
-- Correr una vez en Supabase → SQL Editor (se puede repetir sin problema).
-- Necesita 43-ayudantes-regalos.sql.
--
--   · Antes el XP regalado solo subía el nivel (xp_regalo) y el saldo
--     para canjear; el rango, que sale del XP de la semana, no se movía.
--   · Ahora se suma al XP de esta semana (xp_semana): sube el rango, la
--     barra, el XP que se ve en el inicio y el nivel (que es la suma de
--     todas las semanas). Como cualquier XP, el rango vuelve a empezar el
--     lunes y el nivel se queda para siempre.
--   · Lo que ya se había regalado pasa a esta semana.
-- =========================================================

-- Lo ya regalado: a la semana actual (y fuera de xp_regalo, para no contarlo dos veces)
with g as (delete from public.xp_regalo where xp > 0 returning usuario, xp)
insert into public.xp_semana (usuario, semana, xp)
select usuario, public.cz_lunes(), least(xp, 2000000000)::integer from g
on conflict (usuario, semana) do update set xp = public.xp_semana.xp + excluded.xp;

create or replace function public.regalar(p_codigo integer, p_tipo text, p_cantidad integer default null, p_item text default null, p_nota text default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  u    uuid;
  n    integer := coalesce(p_cantidad, 0);
  nota text := nullif(left(trim(coalesce(p_nota, '')), 140), '');
  yo   text := lower(auth.jwt() ->> 'email');
  nom  text;
  txt  text;
begin
  if not public.puede('regalos') then raise exception 'no autorizado'; end if;
  select j.usuario into u from public.jugador_id j where j.codigo = p_codigo;
  if u is null then raise exception 'No hay ningún alumno con el ID %', p_codigo; end if;
  select e.nombre into nom from public.equipo e where e.email = yo;
  perform public.cz_estado(u);
  if p_tipo = 'corazones' then
    if n < 1 or n > 50 then raise exception 'Elige de 1 a 50 corazones'; end if;
    update public.corazones set extra = least(extra + n, 999), actualizado = now() where usuario = u;
    txt := n || ' corazón' || case when n = 1 then '' else 'es' end;
  elsif p_tipo = 'infinito' then
    if n < 1 or n > 720 then raise exception 'Elige de 1 hora a 30 días'; end if;
    update public.corazones set infinito_hasta = greatest(coalesce(infinito_hasta, now()), now()) + n * interval '1 hour', actualizado = now()
     where usuario = u;
    txt := 'corazones infinitos por ' || case when n % 24 = 0 then (n / 24) || ' día' || case when n = 24 then '' else 's' end
                                             else n || ' hora' || case when n = 1 then '' else 's' end end;
  elsif p_tipo = 'xp' then
    if n < 1 or n > 10000 then raise exception 'Elige de 1 a 10 000 XP'; end if;
    insert into public.xp_semana (usuario, semana, xp) values (u, public.cz_lunes(), n)
    on conflict (usuario, semana) do update set xp = public.xp_semana.xp + excluded.xp;
    update public.corazones set xp_saldo = xp_saldo + n, actualizado = now() where usuario = u;
    txt := n || ' XP';
  elsif p_tipo = 'item' then
    if not exists (select 1 from public.coleccion_item i where i.id = p_item) then raise exception 'Ese ítem no existe'; end if;
    insert into public.coleccion_mia (usuario, item, origen, mensaje) values (u, p_item, 'regalo', nota)
    on conflict (usuario, item) do nothing;
    if not found then raise exception 'Ese alumno ya tiene ese ítem'; end if;
    n := null;
    txt := 'el ítem ' || coalesce((select i.nom from public.coleccion_item i where i.id = p_item), p_item);
  else
    raise exception 'tipo de regalo no válido';
  end if;
  insert into public.regalos (usuario, tipo, cantidad, item, nota, de_email, de_nombre)
  values (u, p_tipo, n, case when p_tipo = 'item' then p_item end, nota, yo, nom);
  perform public.anotar('Regalos', 'Regaló ' || txt || ' al ID ' || p_codigo,
    jsonb_build_object('codigo', p_codigo, 'tipo', p_tipo, 'cantidad', n, 'item', p_item, 'nota', nota));
  return public.regalo_buscar(p_codigo);
end $$;
revoke all on function public.regalar(integer, text, integer, text, text) from public, anon;
grant execute on function public.regalar(integer, text, integer, text, text) to authenticated;
