-- =========================================================
-- Modo Cachimbo · Clanes: el líder puede eliminar su clan
-- Correr después de 89-clanes-guerras.sql. Se puede correr varias veces.
-- Cancela su guerra o reto, deja libres a los miembros (pueden entrar a otro al instante)
-- y el líder espera 24 horas para crear o entrar a otro clan.
-- =========================================================
create or replace function public.clan_eliminar(p_nombre text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); m public.clan_miembros; c public.clanes;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into m from public.clan_miembros where usuario = uid;
  if m.usuario is null then raise exception 'sin_clan'; end if;
  if m.rol <> 'lider' then raise exception 'no_lider'; end if;
  select * into c from public.clanes where id = m.clan for update;
  if lower(trim(coalesce(p_nombre, ''))) <> lower(c.nombre) then raise exception 'nombre_no_coincide'; end if;
  update public.clan_guerras set estado = 'cancelada' where (clan_a = c.id or clan_b = c.id) and estado in ('pendiente', 'activa');
  delete from public.clan_miembros where clan = c.id;
  update public.clanes set cerrado = true where id = c.id;
  insert into public.clan_salidas (usuario, cuando) values (uid, now()) on conflict (usuario) do update set cuando = now();
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.clan_eliminar(text) from public, anon;
grant execute on function public.clan_eliminar(text) to authenticated;
