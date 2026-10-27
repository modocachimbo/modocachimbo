-- =========================================================
-- Modo Cachimbo · Tarjeta de jugador: ID de 5 dígitos y nivel
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 16-corazones.sql (xp_semana) y 14-equipo.sql.
--
--   · Cada alumno recibe un ID de 5 dígitos (10000 a 99998) la
--     primera vez que abre su tarjeta. El 99999 es de Modo Cachimbo.
--   · El nivel sale de todo el XP acumulado (suma de xp_semana).
--   · «admin» es true para los correos de admins y del equipo activo:
--     esos llevan el pin de verificado.
-- =========================================================

create table if not exists public.jugador_id (
  usuario uuid primary key references auth.users (id) on delete cascade,
  codigo  integer not null unique check (codigo between 10000 and 99999),
  creado  timestamptz not null default now()
);
alter table public.jugador_id enable row level security;
-- Cada uno ve su ID; nadie lo escribe directo (solo mi_tarjeta)
drop policy if exists "id propio: ver" on public.jugador_id;
create policy "id propio: ver" on public.jugador_id for select to authenticated using ((select auth.uid()) = usuario);

-- El 99999 es de la cuenta de Modo Cachimbo
insert into public.jugador_id (usuario, codigo)
select u.id, 99999 from auth.users u where lower(u.email) = 'modocachimbo@gmail.com'
on conflict (usuario) do update set codigo = 99999;

-- Tu ID (lo crea si no tienes), tu XP total y si llevas el pin de verificado
create or replace function public.mi_tarjeta()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid   uuid := auth.uid();
  cod   integer;
  total bigint;
  correo text := lower(auth.jwt() ->> 'email');
  i     integer := 0;
begin
  if uid is null then return null; end if;
  select j.codigo into cod from public.jugador_id j where j.usuario = uid;
  while cod is null and i < 50 loop
    i := i + 1;
    begin
      insert into public.jugador_id (usuario, codigo)
      values (uid, 10000 + floor(random() * 89999)::integer)
      returning codigo into cod;
    exception when unique_violation then
      select j.codigo into cod from public.jugador_id j where j.usuario = uid;
    end;
  end loop;
  select coalesce(sum(x.xp), 0) into total from public.xp_semana x where x.usuario = uid;
  return jsonb_build_object(
    'codigo', cod,
    'xp_total', total,
    'admin', exists (select 1 from public.admins a where lower(a.email) = correo)
          or exists (select 1 from public.equipo e where e.email = correo and e.activo)
  );
end $$;
revoke all on function public.mi_tarjeta() from public, anon;
grant execute on function public.mi_tarjeta() to authenticated;
