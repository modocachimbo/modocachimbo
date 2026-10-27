-- =========================================================
-- Modo Cachimbo · Nivel e ID de cada alumno en el panel
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 36-tarjeta-jugador.sql y 14-equipo.sql.
--
--   · Da su ID de 5 dígitos a los alumnos que aún no lo tienen
--     (los que no han abierto su tarjeta).
--   · nivel_alumnos(): correo, ID y XP total de cada alumno, para
--     la pestaña Alumnos (el nivel se calcula en el panel).
-- =========================================================

do $$
declare u record; i integer;
begin
  for u in select a.id from auth.users a where not exists (select 1 from public.jugador_id j where j.usuario = a.id) loop
    i := 0;
    loop
      i := i + 1;
      begin
        insert into public.jugador_id (usuario, codigo) values (u.id, 10000 + floor(random() * 89999)::integer);
        exit;
      exception when unique_violation then
        exit when i >= 50;
      end;
    end loop;
  end loop;
end $$;

create or replace function public.nivel_alumnos()
returns table (email text, codigo integer, xp_total bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.puede('alumnos') then raise exception 'no autorizado'; end if;
  return query
    select u.email::text, j.codigo,
      coalesce((select sum(x.xp) from public.xp_semana x where x.usuario = u.id), 0)::bigint
    from auth.users u left join public.jugador_id j on j.usuario = u.id;
end $$;
revoke all on function public.nivel_alumnos() from public, anon;
grant execute on function public.nivel_alumnos() to authenticated;
